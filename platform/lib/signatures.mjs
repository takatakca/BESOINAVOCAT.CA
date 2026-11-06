import { randomUUID } from 'node:crypto';
import { HttpError, fields, identifier, invalid, text } from './validation.mjs';

// Signature électronique par DocuSign (eSignature REST API v2.1), avec le compte DocuSign de l'avocat lui-même.
// The lawyer picks one case document and types the signer's name and email; nothing else of the case leaves the
// portal. DocuSign Connect notifications (HMAC-verified in lib/integrations.mjs) and a manual « Actualiser » keep
// the status; once completed, the signed PDF and its certificate of completion are added to the case as a new
// version of the original document. Every step is timestamped, append-only and written to the case audit.
// The portal never decides that a signature is legally sufficient: that remains the lawyer's assessment.
const MANAGERS = ['owner', 'lawyer'];
const STATUSES = ['sent', 'delivered', 'completed', 'declined', 'voided'];
const OPEN = ['sent', 'delivered'];
const CONNECT_EVENTS = Object.freeze({ 'envelope-sent': 'sent', 'envelope-delivered': 'delivered', 'envelope-completed': 'completed', 'envelope-declined': 'declined', 'envelope-voided': 'voided' });
const LABELS = Object.freeze({ sent: 'Envoyé', delivered: 'Ouvert par le signataire', completed: 'Signé', declined: 'Refusé', voided: 'Annulé' });
const MAX_SIGN_BYTES = 25 * 1024 * 1024; // DocuSign's per-document limit.
const MAX_SIGNED_BYTES = 40 * 1024 * 1024;
const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/u;
const ENVELOPE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const ACCOUNT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const missing = () => new HttpError(404, 'NOT_FOUND', 'Envoi pour signature introuvable.');
const rejected = () => new HttpError(502, 'PROVIDER_REJECTED', 'DocuSign a refusé la demande. Vérifiez votre compte DocuSign.');
const notReady = () => new HttpError(503, 'SIGNATURE_UNAVAILABLE', 'DocuSign n’est pas configuré sur ce serveur.');

// Only DocuSign's own REST hosts are accepted as the account's base address (demo.docusign.net, na3.docusign.net…).
export function docusignBaseUri(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password || u.port || !/^[a-z0-9-]+\.docusign\.net$/u.test(u.hostname)) return null;
    return u.origin;
  } catch { return null; }
}

export function createSignatures({ db, access, audit, store, docusign, clock = Date.now }) {
  if (!db || typeof access !== 'function' || typeof audit !== 'function' || !store || !docusign) throw new Error('Signatures require db, access, audit, store and the DocuSign handle');
  db.exec(`
    CREATE TABLE IF NOT EXISTS signature_envelopes (
      id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, caseId TEXT NOT NULL, documentId TEXT NOT NULL,
      provider TEXT NOT NULL CHECK(provider IN ('docusign')), subject TEXT NOT NULL, accountId TEXT NOT NULL, baseUri TEXT NOT NULL,
      envelopeId TEXT NOT NULL UNIQUE, documentName TEXT NOT NULL, signerName TEXT NOT NULL, signerEmail TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('sent','delivered','completed','declined','voided')),
      signedDocumentId TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS signature_envelopes_case ON signature_envelopes(tenantId,caseId,createdAt);
    CREATE TABLE IF NOT EXISTS signature_envelope_events (
      seq INTEGER PRIMARY KEY AUTOINCREMENT, envelopeRowId TEXT NOT NULL, tenantId TEXT NOT NULL, caseId TEXT NOT NULL,
      status TEXT NOT NULL, source TEXT NOT NULL CHECK(source IN ('send','refresh','connect','void','retrieve')), at TEXT NOT NULL
    ) STRICT;
    CREATE TRIGGER IF NOT EXISTS signature_envelope_events_no_update BEFORE UPDATE ON signature_envelope_events BEGIN SELECT RAISE(ABORT, 'append-only'); END;
    CREATE TRIGGER IF NOT EXISTS signature_envelope_events_no_delete BEFORE DELETE ON signature_envelope_events BEGIN SELECT RAISE(ABORT, 'append-only'); END;
  `);
  const sql = query => db.prepare(query);
  const now = () => new Date(clock()).toISOString();
  const event = (row, status, source) => sql('INSERT INTO signature_envelope_events (envelopeRowId,tenantId,caseId,status,source,at) VALUES (?,?,?,?,?,?)').run(row.id, row.tenantId, row.caseId, status, source, now());
  const publicRow = row => ({ id: row.id, documentId: row.documentId, documentName: row.documentName, signerName: row.signerName, signerEmail: row.signerEmail,
    status: row.status, statusLabel: LABELS[row.status], open: OPEN.includes(row.status), signedDocumentId: row.signedDocumentId,
    canRetrieve: row.status === 'completed' && !row.signedDocumentId, mine: false, createdAt: row.createdAt, updatedAt: row.updatedAt });
  const find = (user, caseId, id) => {
    identifier(id);
    const row = sql('SELECT * FROM signature_envelopes WHERE id=? AND tenantId=? AND caseId=?').get(id, user.tenantId, caseId);
    if (!row) throw missing();
    return row;
  };
  const envelopeUrl = row => `${row.baseUri}/restapi/v2.1/accounts/${encodeURIComponent(row.accountId)}/envelopes/${encodeURIComponent(row.envelopeId)}`;
  // Only the sender's own DocuSign token can act on an envelope; another lawyer of the case sees it but cannot act.
  const sender = (user, row) => { if (row.subject !== user.subject) throw new HttpError(403, 'NOT_SENDER', 'Seule la personne qui a envoyé ce document peut agir chez DocuSign.'); return user; };
  function setStatus(row, status, source) {
    // A final state never changes, and « ouvert » never goes back to « envoyé » (notifications can arrive out of order).
    if (!STATUSES.includes(status) || status === row.status || !OPEN.includes(row.status) || (row.status === 'delivered' && status === 'sent')) return row;
    const at = now();
    sql('UPDATE signature_envelopes SET status=?, updatedAt=? WHERE id=?').run(status, at, row.id);
    event(row, status, source);
    audit({ tenantId: row.tenantId, subject: source === 'connect' ? 'docusign' : row.subject }, row.caseId, `signature.${status}`, row.id, { source });
    return { ...row, status, updatedAt: at };
  }

  async function account(user) {
    const url = docusign.userinfoUrl();
    const response = await docusign.api(user, url, {});
    const accounts = Array.isArray(response.body?.accounts) ? response.body.accounts : [];
    const chosen = accounts.find(a => a?.is_default === true || a?.is_default === 'true') ?? accounts[0];
    const accountId = typeof chosen?.account_id === 'string' && ACCOUNT_ID.test(chosen.account_id) ? chosen.account_id : null;
    const baseUri = chosen ? docusignBaseUri(chosen.base_uri) : null;
    if (response.status !== 200 || !accountId || !baseUri) throw rejected();
    return { accountId, baseUri };
  }

  return {
    ready: () => docusign.ready(),
    list(user, caseId) {
      access(user, caseId, MANAGERS);
      const rows = sql('SELECT * FROM signature_envelopes WHERE tenantId=? AND caseId=? ORDER BY createdAt DESC LIMIT 200').all(user.tenantId, caseId);
      const documents = sql(`SELECT d.id, d.name, d.bytes FROM documents d WHERE d.tenantId=? AND d.caseId=?
        AND d.versionNumber=(SELECT MAX(v.versionNumber) FROM documents v WHERE v.tenantId=d.tenantId AND v.caseId=d.caseId AND v.rootDocumentId=d.rootDocumentId)
        ORDER BY d.createdAt DESC LIMIT 200`).all(user.tenantId, caseId).filter(d => d.bytes <= MAX_SIGN_BYTES).map(d => ({ id: d.id, name: d.name }));
      return { configured: docusign.ready(), connected: docusign.ready() && docusign.connected(user), envelopes: rows.map(row => ({ ...publicRow(row), mine: row.subject === user.subject })), documents };
    },
    async send(user, caseId, body) {
      access(user, caseId, MANAGERS);
      if (!docusign.ready()) throw notReady();
      const value = fields(body, ['documentId', 'signerName', 'signerEmail', 'message'], ['documentId', 'signerName', 'signerEmail']);
      identifier(value.documentId);
      const signerName = text(value.signerName, 'Nom du signataire', 100).trim();
      const signerEmail = text(value.signerEmail, 'Courriel du signataire', 254).trim();
      if (!signerName) throw invalid('Nom du signataire requis.');
      if (!EMAIL.test(signerEmail)) throw invalid('Courriel du signataire invalide.');
      const message = value.message === undefined ? '' : text(value.message, 'Message', 1000, { optional: true, multiline: true }).trim();
      const { document, content } = store.download(user, caseId, value.documentId);
      if (content.length > MAX_SIGN_BYTES) throw new HttpError(413, 'DOCUMENT_TOO_LARGE', 'DocuSign accepte au plus 25 Mo par document.');
      const extension = /\.([A-Za-z0-9]{1,8})$/u.exec(document.name)?.[1]?.toLowerCase() || 'pdf';
      const { accountId, baseUri } = await account(user);
      const response = await docusign.api(user, `${baseUri}/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes`, { method: 'POST', json: {
        emailSubject: `Document à signer : ${document.name}`.slice(0, 100),
        ...(message ? { emailBlurb: message } : {}),
        documents: [{ documentId: '1', name: document.name.slice(0, 100), fileExtension: extension, documentBase64: content.toString('base64') }],
        recipients: { signers: [{ recipientId: '1', routingOrder: '1', name: signerName, email: signerEmail }] },
        status: 'sent',
      } });
      const envelopeId = response.status === 201 && typeof response.body?.envelopeId === 'string' && ENVELOPE_ID.test(response.body.envelopeId) ? response.body.envelopeId : null;
      if (!envelopeId) throw rejected();
      const at = now();
      const row = { id: randomUUID(), tenantId: user.tenantId, caseId, documentId: document.id, provider: 'docusign', subject: user.subject, accountId, baseUri,
        envelopeId, documentName: document.name, signerName, signerEmail, status: 'sent', signedDocumentId: null, createdAt: at, updatedAt: at };
      sql('INSERT INTO signature_envelopes VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(row.id, row.tenantId, row.caseId, row.documentId, row.provider, row.subject,
        row.accountId, row.baseUri, row.envelopeId, row.documentName, row.signerName, row.signerEmail, row.status, row.signedDocumentId, row.createdAt, row.updatedAt);
      event(row, 'sent', 'send');
      audit(user, caseId, 'signature.sent', row.id, { provider: 'docusign', documentId: document.id });
      return { envelope: { ...publicRow(row), mine: true } };
    },
    async refresh(user, caseId, id) {
      access(user, caseId, MANAGERS);
      if (!docusign.ready()) throw notReady();
      let row = find(user, caseId, id);
      sender(user, row);
      const response = await docusign.api(user, envelopeUrl(row), {});
      const status = response.status === 200 && STATUSES.includes(response.body?.status) ? response.body.status : null;
      if (!status) throw rejected();
      row = setStatus(row, status, 'refresh');
      return { envelope: { ...publicRow(row), mine: true } };
    },
    async void(user, caseId, id, body) {
      access(user, caseId, MANAGERS);
      if (!docusign.ready()) throw notReady();
      const value = fields(body, ['reason'], ['reason']);
      const reason = text(value.reason, 'Motif', 200).trim();
      if (!reason) throw invalid('Motif de l’annulation requis.');
      let row = find(user, caseId, id);
      sender(user, row);
      if (!OPEN.includes(row.status)) throw new HttpError(409, 'ENVELOPE_CLOSED', 'Cet envoi n’est plus en cours.');
      const response = await docusign.api(user, envelopeUrl(row), { method: 'PUT', json: { status: 'voided', voidedReason: reason } });
      if (response.status !== 200) throw rejected();
      row = setStatus(row, 'voided', 'void');
      return { envelope: { ...publicRow(row), mine: true } };
    },
    // Adds the signed PDF, with DocuSign's certificate of completion, as a new version of the original document.
    async retrieve(user, caseId, id) {
      access(user, caseId, MANAGERS);
      if (!docusign.ready()) throw notReady();
      const row = find(user, caseId, id);
      sender(user, row);
      if (row.status !== 'completed') throw new HttpError(409, 'NOT_COMPLETED', 'Le document n’est pas encore signé.');
      if (row.signedDocumentId) return { envelope: { ...publicRow(row), mine: true }, created: false };
      const response = await docusign.api(user, `${envelopeUrl(row)}/documents/combined?certificate=true`, { binary: true, limit: MAX_SIGNED_BYTES, headers: { Accept: 'application/pdf' } });
      if (response.status !== 200 || !response.bytes?.length || response.bytes.subarray(0, 5).toString('latin1') !== '%PDF-') throw rejected();
      const original = sql('SELECT rootDocumentId, versionNumber FROM documents WHERE id=? AND tenantId=? AND caseId=?').get(row.documentId, row.tenantId, row.caseId);
      const latest = original ? sql('SELECT MAX(versionNumber) AS n FROM documents WHERE tenantId=? AND caseId=? AND rootDocumentId=?').get(row.tenantId, row.caseId, original.rootDocumentId).n : null;
      const base = row.documentName.replace(/\.[A-Za-z0-9]{1,8}$/u, '');
      const saved = store.addDocument(user, caseId, { name: `${base} (signé).pdf`.slice(0, 255), mimeType: 'application/pdf', bytes: response.bytes, sourceType: 'original',
        sourceReference: `Signé par DocuSign, enveloppe ${row.envelopeId}, avec certificat de signature`, extractedText: '', reviewStatus: 'a_verifier',
        versionOf: original && latest === original.versionNumber ? row.documentId : null });
      sql('UPDATE signature_envelopes SET signedDocumentId=?, updatedAt=? WHERE id=?').run(saved.id, now(), row.id);
      event(row, 'completed', 'retrieve');
      audit(user, caseId, 'signature.retrieved', row.id, { documentId: saved.id });
      return { envelope: { ...publicRow({ ...row, signedDocumentId: saved.id }), mine: true }, document: saved, created: true };
    },
    history(user, caseId, id) {
      access(user, caseId, MANAGERS);
      const row = find(user, caseId, id);
      return { events: sql('SELECT seq, status, source, at FROM signature_envelope_events WHERE envelopeRowId=? ORDER BY seq').all(row.id) };
    },
    // A verified DocuSign Connect notification (signature checked in lib/integrations.mjs).
    connectEvent(event) {
      const status = CONNECT_EVENTS[event?.event];
      const envelopeId = event?.data?.envelopeId;
      if (!status || typeof envelopeId !== 'string' || !ENVELOPE_ID.test(envelopeId)) return false;
      const row = sql('SELECT * FROM signature_envelopes WHERE envelopeId=?').get(envelopeId);
      if (!row) return false;
      if (typeof event.data.accountId === 'string' && event.data.accountId.toLowerCase() !== row.accountId.toLowerCase()) return false;
      const next = setStatus(row, status, 'connect');
      return { tenantId: row.tenantId, caseId: row.caseId, sender: row.subject, status: next.status, changed: next.status !== row.status };
    },
  };
}
