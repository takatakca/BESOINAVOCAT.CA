import { randomUUID } from 'node:crypto';
import { HttpError, fields, identifier, invalid, text } from './validation.mjs';

// Pièces demandées : the lawyer asks the client for a specific document; the client answers by attaching a piece
// already uploaded to the same case (or a note); the lawyer accepts it or asks again. Nothing is sent outside the
// portal. Every step is timestamped by the server, kept in an append-only event table and written to the case audit.
const MANAGERS = ['owner', 'lawyer'];
const MAX_OPEN = 100;
const STATUSES = new Set(['requested', 'provided', 'accepted', 'cancelled']);
const missing = () => new HttpError(404, 'NOT_FOUND', 'Demande de pièce introuvable.');

export function createDocumentRequests({ db, access, audit, clock = Date.now }) {
  if (!db || typeof access !== 'function' || typeof audit !== 'function') throw new Error('Document requests require db, access and audit');
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_requests (
      id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, caseId TEXT NOT NULL,
      title TEXT NOT NULL, note TEXT NOT NULL, dueDate TEXT,
      status TEXT NOT NULL CHECK(status IN ('requested','provided','accepted','cancelled')),
      documentId TEXT, answer TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL, createdBy TEXT NOT NULL, updatedAt TEXT NOT NULL, updatedBy TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS document_requests_case ON document_requests(tenantId,caseId,createdAt);
    CREATE TABLE IF NOT EXISTS document_request_events (
      seq INTEGER PRIMARY KEY AUTOINCREMENT, requestId TEXT NOT NULL, tenantId TEXT NOT NULL, caseId TEXT NOT NULL,
      action TEXT NOT NULL, subject TEXT NOT NULL, documentId TEXT, detail TEXT NOT NULL, at TEXT NOT NULL
    ) STRICT;
    CREATE TRIGGER IF NOT EXISTS document_request_events_no_update BEFORE UPDATE ON document_request_events BEGIN SELECT RAISE(ABORT, 'append-only'); END;
    CREATE TRIGGER IF NOT EXISTS document_request_events_no_delete BEFORE DELETE ON document_request_events BEGIN SELECT RAISE(ABORT, 'append-only'); END;
  `);
  const sql = query => db.prepare(query);
  const now = () => new Date(clock()).toISOString();
  const tx = fn => {
    db.exec('BEGIN IMMEDIATE');
    try { const value = fn(); db.exec('COMMIT'); return value; } catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  const event = (user, row, action, documentId = null, detail = '') =>
    sql('INSERT INTO document_request_events (requestId,tenantId,caseId,action,subject,documentId,detail,at) VALUES (?,?,?,?,?,?,?,?)')
      .run(row.id, row.tenantId, row.caseId, action, user.subject, documentId, detail, now());
  const find = (user, caseId, id) => {
    identifier(id);
    const row = sql('SELECT * FROM document_requests WHERE id=? AND tenantId=? AND caseId=?').get(id, user.tenantId, caseId);
    if (!row) throw missing();
    return row;
  };
  const documentName = (user, caseId, documentId) => documentId
    ? sql('SELECT name FROM documents WHERE id=? AND tenantId=? AND caseId=?').get(documentId, user.tenantId, caseId)?.name ?? null : null;
  const publicRow = (user, row) => ({
    id: row.id, title: row.title, note: row.note, dueDate: row.dueDate, status: row.status,
    documentId: row.documentId, documentName: documentName(user, row.caseId, row.documentId), answer: row.answer,
    createdAt: row.createdAt, createdBy: row.createdBy, updatedAt: row.updatedAt, updatedBy: row.updatedBy,
    overdue: row.status === 'requested' && Boolean(row.dueDate) && row.dueDate < now().slice(0, 10),
  });
  const dueDate = value => {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) throw invalid('Échéance attendue au format AAAA-MM-JJ.');
    return value;
  };

  return {
    list(user, caseId) {
      const membership = access(user, caseId);
      const rows = sql(`SELECT * FROM document_requests WHERE tenantId=? AND caseId=? ORDER BY
        CASE status WHEN 'requested' THEN 0 WHEN 'provided' THEN 1 WHEN 'accepted' THEN 2 ELSE 3 END, createdAt DESC`).all(user.tenantId, caseId);
      const items = rows.map(row => publicRow(user, row));
      return { requests: items, canRequest: MANAGERS.includes(membership.role),
        open: items.filter(item => item.status === 'requested').length, toReview: items.filter(item => item.status === 'provided').length };
    },
    create(user, caseId, body) {
      access(user, caseId, MANAGERS);
      const input = fields(body, ['title', 'note', 'dueDate'], ['title']);
      const title = text(input.title, 'Pièce demandée', 200).trim();
      if (!title) throw invalid('Nommez la pièce demandée.');
      const note = input.note === undefined ? '' : text(input.note, 'Précisions', 2000, { optional: true, multiline: true }).trim();
      const due = dueDate(input.dueDate);
      return tx(() => {
        const open = sql("SELECT COUNT(*) AS n FROM document_requests WHERE tenantId=? AND caseId=? AND status IN ('requested','provided')").get(user.tenantId, caseId).n;
        if (open >= MAX_OPEN) throw new HttpError(409, 'TOO_MANY_REQUESTS', 'Ce dossier compte déjà 100 demandes ouvertes.');
        const at = now();
        const row = { id: randomUUID(), tenantId: user.tenantId, caseId, title, note, dueDate: due, status: 'requested', documentId: null, answer: '', createdAt: at, createdBy: user.subject, updatedAt: at, updatedBy: user.subject };
        sql('INSERT INTO document_requests VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(row.id, row.tenantId, row.caseId, row.title, row.note, row.dueDate, row.status, row.documentId, row.answer, row.createdAt, row.createdBy, row.updatedAt, row.updatedBy);
        event(user, row, 'requested', null, title);
        audit(user, caseId, 'document_request.created', row.id, { dueDate: due });
        return { request: publicRow(user, row) };
      });
    },
    provide(user, caseId, id, body) {
      access(user, caseId);
      const input = fields(body, ['documentId', 'answer']);
      const answer = input.answer === undefined ? '' : text(input.answer, 'Réponse', 2000, { optional: true, multiline: true }).trim();
      let documentId = null;
      if (input.documentId !== undefined && input.documentId !== null && input.documentId !== '') {
        documentId = identifier(input.documentId);
        if (!documentName(user, caseId, documentId)) throw invalid('Cette pièce n’est pas dans ce dossier.');
      }
      if (!documentId && !answer) throw invalid('Joignez une pièce du dossier ou écrivez une réponse.');
      return tx(() => {
        const row = find(user, caseId, id);
        if (!['requested', 'provided'].includes(row.status)) throw new HttpError(409, 'REQUEST_CLOSED', 'Cette demande est fermée.');
        const at = now();
        sql("UPDATE document_requests SET status='provided', documentId=?, answer=?, updatedAt=?, updatedBy=? WHERE id=?").run(documentId, answer, at, user.subject, row.id);
        event(user, row, 'provided', documentId, answer);
        audit(user, caseId, 'document_request.provided', row.id, { documentId });
        return { request: publicRow(user, { ...row, status: 'provided', documentId, answer, updatedAt: at, updatedBy: user.subject }) };
      });
    },
    decide(user, caseId, id, body) {
      access(user, caseId, MANAGERS);
      const input = fields(body, ['decision', 'note'], ['decision']);
      const next = { accept: 'accepted', reopen: 'requested', cancel: 'cancelled' }[input.decision];
      if (!next) throw invalid('Décision attendue : accept, reopen ou cancel.');
      const note = input.note === undefined ? '' : text(input.note, 'Précisions', 2000, { optional: true, multiline: true }).trim();
      return tx(() => {
        const row = find(user, caseId, id);
        const allowed = { accepted: ['provided'], requested: ['provided', 'cancelled'], cancelled: ['requested', 'provided'] }[next];
        if (!allowed.includes(row.status)) throw new HttpError(409, 'INVALID_TRANSITION', 'Cette décision ne s’applique pas à l’état actuel de la demande.');
        const at = now();
        sql('UPDATE document_requests SET status=?, updatedAt=?, updatedBy=? WHERE id=?').run(next, at, user.subject, row.id);
        event(user, row, next === 'requested' ? 'reopened' : next, row.documentId, note);
        audit(user, caseId, `document_request.${next === 'requested' ? 'reopened' : next}`, row.id, {});
        return { request: publicRow(user, { ...row, status: next, updatedAt: at, updatedBy: user.subject }) };
      });
    },
    history(user, caseId, id) {
      access(user, caseId);
      const row = find(user, caseId, id);
      return { events: sql('SELECT seq, action, subject, documentId, detail, at FROM document_request_events WHERE requestId=? AND tenantId=? ORDER BY seq').all(row.id, user.tenantId) };
    },
    statuses: STATUSES,
  };
}
