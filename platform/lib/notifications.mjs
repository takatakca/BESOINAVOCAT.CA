import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { HttpError, fields, invalid, text } from './validation.mjs';

// Courriels d'avis. The portal knows people only by their identity subject, so each person who wants email notices
// gives an address in Réglages, consents, and confirms it with a six-digit code sent to it. Notices say only that
// something is waiting in the portal: no client name, no case title, no document name, nothing of the file. They are
// sent through an email API (Resend), never more than one notice of a kind per case and person every 10 minutes, and
// never more than 20 per person per day. Each send is recorded (kind, case, status, never the content). Off unless
// BESOINAVOCAT_EMAIL_PROVIDER, _EMAIL_API_KEY, _EMAIL_FROM and APP_ORIGIN are set.
const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/u;
const FROM = /^(?:[^<>\r\n"]{1,80} )?<?[^\s@<>]{1,64}@[A-Za-z0-9.-]{3,253}>?$/u;
const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const MAX_CODES_PER_HOUR = 3;
const DEDUPE_MS = 10 * 60 * 1000;
const MAX_PER_DAY = 20;
const SEND_TIMEOUT_MS = 10000;
const MANAGERS = ['owner', 'lawyer'];
export const NOTICE_KINDS = Object.freeze({
  document_requested: { audience: 'clients', subject: 'Une pièce vous est demandée', body: 'Votre avocat vous demande une pièce dans votre dossier BesoinAvocat.' },
  deadline_shared: { audience: 'clients', subject: 'Une nouvelle date dans votre dossier', body: 'Votre avocat a ajouté une date à votre dossier BesoinAvocat.' },
  document_provided: { audience: 'managers', subject: 'Une pièce demandée est arrivée', body: 'Une pièce que vous aviez demandée a été déposée dans un dossier BesoinAvocat.' },
  signature_completed: { audience: 'sender', subject: 'Un document a été signé', body: 'Un document que vous avez envoyé pour signature est signé. Versez la version signée au dossier depuis le portail.' },
});
const hash = value => createHash('sha256').update(value, 'utf8').digest('hex');
const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const mask = email => { const [local, domain] = email.split('@'); return `${local.slice(0, 1)}${'•'.repeat(Math.max(1, Math.min(6, local.length - 1)))}@${domain}`; };

export function notificationConfiguration(env = process.env) {
  let origin = null;
  try { const u = new URL(env.APP_ORIGIN || ''); if (u.protocol === 'https:' || u.hostname === '127.0.0.1' || u.hostname === 'localhost') origin = u.origin; } catch { origin = null; }
  const provider = env.BESOINAVOCAT_EMAIL_PROVIDER === 'resend' ? 'resend' : null;
  const apiKey = typeof env.BESOINAVOCAT_EMAIL_API_KEY === 'string' && /^[\x21-\x7e]{8,512}$/u.test(env.BESOINAVOCAT_EMAIL_API_KEY) ? env.BESOINAVOCAT_EMAIL_API_KEY : null;
  const from = typeof env.BESOINAVOCAT_EMAIL_FROM === 'string' && FROM.test(env.BESOINAVOCAT_EMAIL_FROM.trim()) ? env.BESOINAVOCAT_EMAIL_FROM.trim() : null;
  const missing = [!provider && 'BESOINAVOCAT_EMAIL_PROVIDER=resend', !apiKey && 'BESOINAVOCAT_EMAIL_API_KEY', !from && 'BESOINAVOCAT_EMAIL_FROM', !origin && 'APP_ORIGIN'].filter(Boolean);
  return Object.freeze({ configured: missing.length === 0, provider, apiKey, from, origin, missing });
}

export function createNotifications({ db, audit, config = notificationConfiguration({}), fetch: fetchImpl = globalThis.fetch, clock = Date.now, log = () => {} }) {
  if (!db || typeof audit !== 'function') throw new Error('Notifications require db and audit');
  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_contacts (
      tenantId TEXT NOT NULL, subject TEXT NOT NULL, email TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending','verified')), paused INTEGER NOT NULL DEFAULT 0 CHECK(paused IN (0,1)),
      codeHash TEXT, codeExpiresAt INTEGER, attempts INTEGER NOT NULL DEFAULT 0,
      consentAt TEXT NOT NULL, verifiedAt TEXT, updatedAt TEXT NOT NULL,
      PRIMARY KEY(tenantId,subject)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS notification_log (
      id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, subject TEXT NOT NULL, caseId TEXT, kind TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('queued','sent','failed','skipped')), detail TEXT NOT NULL, createdAt TEXT NOT NULL, at INTEGER NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS notification_log_recent ON notification_log(tenantId,subject,kind,at);
  `);
  const sql = query => db.prepare(query);
  const iso = () => new Date(clock()).toISOString();
  const contact = user => sql('SELECT * FROM notification_contacts WHERE tenantId=? AND subject=?').get(user.tenantId, user.subject);
  const unavailable = () => new HttpError(503, 'EMAIL_UNAVAILABLE', 'Les courriels d’avis ne sont pas activés sur ce serveur.');
  const publicContact = row => row ? { email: mask(row.email), status: row.status, paused: Boolean(row.paused), consentAt: row.consentAt, verifiedAt: row.verifiedAt } : null;
  const record = (row, caseId, kind, status, detail = '') => sql('INSERT INTO notification_log VALUES (?,?,?,?,?,?,?,?,?)').run(randomUUID(), row.tenantId, row.subject, caseId, kind, status, detail, iso(), clock());

  async function deliver(to, subject, lines) {
    const portal = `${config.origin}/`;
    const textBody = `${lines.join('\n\n')}\n\nOuvrir le portail : ${portal}\n\n—\nBesoinAvocat n’est pas un cabinet d’avocats et ne donne pas d’avis juridique. Pour ne plus recevoir ces avis : Réglages, « Courriels d’avis », dans le portail.`;
    let response;
    try {
      response = await fetchImpl('https://api.resend.com/emails', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ from: config.from, to: [to], subject, text: textBody }) });
    } catch { return { ok: false, detail: 'unreachable' }; }
    let id = null;
    try { const body = await response.json(); id = typeof body?.id === 'string' ? body.id.slice(0, 100) : null; } catch { id = null; }
    return response.status >= 200 && response.status < 300 ? { ok: true, detail: id ? `id ${id}` : '' } : { ok: false, detail: `http ${response.status}` };
  }

  // Recipients of a case event, with their role re-read now. Never the person who caused the event.
  function recipients(actor, caseId, kind, sender) {
    const audience = NOTICE_KINDS[kind].audience;
    const rows = audience === 'sender' ? sql('SELECT subject, role FROM members WHERE tenantId=? AND caseId=? AND subject=?').all(actor.tenantId, caseId, sender)
      : sql('SELECT subject, role FROM members WHERE tenantId=? AND caseId=?').all(actor.tenantId, caseId)
        .filter(m => (audience === 'clients' ? !MANAGERS.includes(m.role) : MANAGERS.includes(m.role)) && m.subject !== actor.subject);
    return rows.map(m => sql("SELECT * FROM notification_contacts WHERE tenantId=? AND subject=? AND status='verified' AND paused=0").get(actor.tenantId, m.subject)).filter(Boolean);
  }

  async function caseEvent(actor, caseId, kind, { sender } = {}) {
    if (!config.configured || !Object.hasOwn(NOTICE_KINDS, kind)) return { sent: 0 };
    const notice = NOTICE_KINDS[kind];
    let sent = 0;
    for (const row of recipients(actor, caseId, kind, sender)) {
      const time = clock();
      const recent = sql('SELECT COUNT(*) AS n FROM notification_log WHERE tenantId=? AND subject=? AND caseId=? AND kind=? AND status=? AND at>?').get(row.tenantId, row.subject, caseId, kind, 'sent', time - DEDUPE_MS).n;
      const today = sql("SELECT COUNT(*) AS n FROM notification_log WHERE tenantId=? AND subject=? AND status='sent' AND at>?").get(row.tenantId, row.subject, time - 86400000).n;
      if (recent || today >= MAX_PER_DAY) { record(row, caseId, kind, 'skipped', recent ? 'déjà avisé' : 'limite quotidienne'); continue; }
      const result = await deliver(row.email, `BesoinAvocat · ${notice.subject}`, [notice.body]);
      record(row, caseId, kind, result.ok ? 'sent' : 'failed', result.detail);
      if (result.ok) sent++;
      else log(`notification ${kind} failed: ${result.detail}`);
    }
    return { sent };
  }

  return {
    configured: () => config.configured,
    status(user) {
      const row = config.configured ? contact(user) : null;
      const recent = row ? sql('SELECT kind, status, createdAt FROM notification_log WHERE tenantId=? AND subject=? ORDER BY at DESC, rowid DESC LIMIT 10').all(user.tenantId, user.subject) : [];
      return { configured: config.configured, missing: config.missing, contact: publicContact(row), recent, kinds: Object.fromEntries(Object.entries(NOTICE_KINDS).map(([k, v]) => [k, v.subject])) };
    },
    // Records the address with the person's consent and sends a confirmation code to it.
    async register(user, body) {
      if (!config.configured) throw unavailable();
      const value = fields(body, ['email', 'consent'], ['email', 'consent']);
      const email = text(value.email, 'Adresse courriel', 254).trim().toLowerCase();
      if (!EMAIL.test(email)) throw invalid('Adresse courriel invalide.');
      if (value.consent !== true) throw invalid('Le consentement est requis pour recevoir des courriels d’avis.');
      const time = clock();
      const codes = sql("SELECT COUNT(*) AS n FROM notification_log WHERE tenantId=? AND subject=? AND kind='verification' AND at>?").get(user.tenantId, user.subject, time - 3600000).n;
      if (codes >= MAX_CODES_PER_HOUR) throw new HttpError(429, 'TOO_MANY_CODES', 'Trop de codes envoyés. Réessayez dans une heure.');
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      const at = iso();
      sql(`INSERT INTO notification_contacts (tenantId,subject,email,status,paused,codeHash,codeExpiresAt,attempts,consentAt,verifiedAt,updatedAt) VALUES (?,?,?,'pending',0,?,?,0,?,NULL,?)
        ON CONFLICT(tenantId,subject) DO UPDATE SET email=excluded.email, status='pending', paused=0, codeHash=excluded.codeHash, codeExpiresAt=excluded.codeExpiresAt, attempts=0, consentAt=excluded.consentAt, verifiedAt=NULL, updatedAt=excluded.updatedAt`)
        .run(user.tenantId, user.subject, email, hash(`${user.tenantId}\n${user.subject}\n${code}`), time + CODE_TTL_MS, at, at);
      const result = await deliver(email, 'BesoinAvocat · Code de confirmation', [`Votre code de confirmation : ${code}`, 'Saisissez-le dans Réglages, « Courriels d’avis ». Il expire dans 15 minutes. Si vous n’avez rien demandé, ignorez ce message.']);
      record({ tenantId: user.tenantId, subject: user.subject }, null, 'verification', result.ok ? 'sent' : 'failed', result.detail);
      audit(user, null, 'notifications.email_registered', null, { sent: result.ok });
      if (!result.ok) throw new HttpError(502, 'EMAIL_NOT_SENT', 'Le code n’a pas pu être envoyé. Vérifiez l’adresse, puis réessayez.');
      return { contact: publicContact(contact(user)) };
    },
    verify(user, body) {
      if (!config.configured) throw unavailable();
      const value = fields(body, ['code'], ['code']);
      const code = text(value.code, 'Code', 10).trim();
      const row = contact(user);
      if (!row || row.status !== 'pending' || !row.codeHash) throw new HttpError(409, 'NO_PENDING_CODE', 'Aucun code en attente. Demandez un nouveau code.');
      if (row.codeExpiresAt <= clock() || row.attempts >= MAX_CODE_ATTEMPTS) throw new HttpError(410, 'CODE_EXPIRED', 'Ce code a expiré. Demandez un nouveau code.');
      if (!/^[0-9]{6}$/u.test(code) || !same(hash(`${user.tenantId}\n${user.subject}\n${code}`), row.codeHash)) {
        sql('UPDATE notification_contacts SET attempts=attempts+1, updatedAt=? WHERE tenantId=? AND subject=?').run(iso(), user.tenantId, user.subject);
        throw invalid('Code incorrect.');
      }
      const at = iso();
      sql("UPDATE notification_contacts SET status='verified', codeHash=NULL, codeExpiresAt=NULL, attempts=0, verifiedAt=?, updatedAt=? WHERE tenantId=? AND subject=?").run(at, at, user.tenantId, user.subject);
      audit(user, null, 'notifications.email_verified', null, {});
      return { contact: publicContact(contact(user)) };
    },
    pause(user, body) {
      if (!config.configured) throw unavailable();
      const value = fields(body, ['paused'], ['paused']);
      if (typeof value.paused !== 'boolean') throw invalid('Valeur invalide.');
      const changes = sql('UPDATE notification_contacts SET paused=?, updatedAt=? WHERE tenantId=? AND subject=?').run(value.paused ? 1 : 0, iso(), user.tenantId, user.subject).changes;
      if (!changes) throw new HttpError(404, 'NOT_FOUND', 'Aucune adresse enregistrée.');
      audit(user, null, value.paused ? 'notifications.paused' : 'notifications.resumed', null, {});
      return { contact: publicContact(contact(user)) };
    },
    remove(user) {
      const changes = sql('DELETE FROM notification_contacts WHERE tenantId=? AND subject=?').run(user.tenantId, user.subject).changes;
      if (changes) audit(user, null, 'notifications.email_removed', null, {});
      return { removed: changes > 0, contact: null };
    },
    caseEvent,
  };
}
