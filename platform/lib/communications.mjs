import { createHash, randomUUID } from 'node:crypto';
import { fields, HttpError, identifier, invalid, text } from './validation.mjs';

const MANAGERS = ['owner', 'lawyer'];
const conflict = message => new HttpError(409, 'COMMUNICATION_CONFLICT', message);
const forbidden = () => new HttpError(403, 'FORBIDDEN', 'Une autre personne habilitée doit valider cette durée.');
const missing = () => new HttpError(404, 'NOT_FOUND', 'Communication introuvable ou non accessible.');
export const COMMUNICATION_PROVIDERS = Object.freeze({ video: 'external_zoom_link_only', phone: 'not_connected' });

// Only participant links, never host start URLs or arbitrary third-party URLs.
export function zoomJoinUrl(value) {
  if (value === undefined || value === null || value === '') return null;
  text(value, 'Lien Zoom', 1024);
  if (value !== value.trim() || /[\\\s]/u.test(value)) throw invalid('Lien Zoom invalide.');
  let url;
  try { url = new URL(value); } catch { throw invalid('Lien Zoom invalide.'); }
  const host = url.hostname;
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash ||
      !(host === 'zoom.us' || /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+zoom\.us$/u.test(host)) ||
      !/^\/j\/[0-9]{9,11}$/u.test(url.pathname) ||
      [...url.searchParams.keys()].some(key => key !== 'pwd') || url.searchParams.getAll('pwd').length > 1 ||
      (url.searchParams.has('pwd') && !/^[A-Za-z0-9._~-]{1,256}$/u.test(url.searchParams.get('pwd')))) {
    throw invalid('Utilisez un lien de participation HTTPS Zoom au format /j/numéro.');
  }
  return url.href;
}

export function communicationInput(body) {
  fields(body, ['kind', 'title', 'scheduledAt', 'joinUrl'], ['kind', 'title', 'scheduledAt']);
  if (!['video', 'phone'].includes(body.kind)) throw invalid('Type de communication invalide.');
  const title = text(body.title, 'Titre', 160).trim();
  const scheduledAt = text(body.scheduledAt, 'Date du rendez-vous', 30);
  const timestamp = Date.parse(scheduledAt);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(scheduledAt) ||
      !Number.isFinite(timestamp) || new Date(timestamp).toISOString().replace('.000Z', 'Z') !== scheduledAt.replace('.000Z', 'Z')) {
    throw invalid('La date doit être une date UTC ISO valide.');
  }
  const joinUrl = zoomJoinUrl(body.joinUrl);
  if (body.kind === 'phone' && joinUrl) throw invalid('Un rendez-vous téléphonique ne reçoit pas de lien Zoom.');
  return { kind: body.kind, title, scheduledAt: new Date(timestamp).toISOString(), joinUrl };
}

function idempotency(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{16,80}$/u.test(value)) throw invalid('Clé d’idempotence invalide.');
  return value;
}
function rate(value) {
  if (value === undefined || value === null) return null;
  if (!Number.isSafeInteger(value) || value < 0 || value > 1000000) throw new Error('Invalid communication rate');
  return value;
}

export function createCommunications({ db, access, audit, clock = Date.now, rates = {} }) {
  if (!db || typeof access !== 'function' || typeof audit !== 'function') throw new Error('Communications require db, access and audit');
  const configuredRates = Object.freeze({ video: rate(rates.videoCentsPerMinute), phone: rate(rates.phoneCentsPerMinute) });
  const timestamp = () => {
    const value = clock();
    if (!Number.isSafeInteger(value) || value < 0 || !Number.isFinite(new Date(value).getTime())) throw new Error('Invalid server clock');
    return new Date(value).toISOString();
  };
  db.exec(`
    CREATE TABLE IF NOT EXISTS communication_sessions (
      id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, caseId TEXT NOT NULL,
      kind TEXT NOT NULL CHECK(kind IN ('video','phone')), title TEXT NOT NULL,
      scheduledAt TEXT NOT NULL, joinUrl TEXT,
      status TEXT NOT NULL CHECK(status IN ('scheduled','cancelled')),
      createdBy TEXT NOT NULL, createdAt TEXT NOT NULL, cancelledAt TEXT,
      idempotencyKey TEXT NOT NULL, inputHash TEXT NOT NULL,
      UNIQUE(tenantId,caseId,id), UNIQUE(tenantId,caseId,createdBy,idempotencyKey),
      FOREIGN KEY(tenantId,caseId) REFERENCES cases(tenantId,id)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS communication_timers (
      id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, caseId TEXT NOT NULL, sessionId TEXT NOT NULL,
      authorSubject TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('running','ended')),
      startedAt TEXT NOT NULL, endedAt TEXT, seconds INTEGER CHECK(seconds>=0),
      rateCentsPerMinute INTEGER CHECK(rateCentsPerMinute>=0),
      UNIQUE(tenantId,caseId,sessionId,authorSubject), UNIQUE(tenantId,caseId,id),
      CHECK((status='running' AND endedAt IS NULL AND seconds IS NULL) OR
            (status='ended' AND endedAt IS NOT NULL AND seconds IS NOT NULL)),
      FOREIGN KEY(tenantId,caseId,sessionId) REFERENCES communication_sessions(tenantId,caseId,id)
    ) STRICT;
    CREATE UNIQUE INDEX IF NOT EXISTS communication_one_active_timer ON communication_timers(tenantId,authorSubject) WHERE status='running';
    CREATE TABLE IF NOT EXISTS communication_usage (
      id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, caseId TEXT NOT NULL,
      sessionId TEXT NOT NULL, timerId TEXT NOT NULL UNIQUE, authorSubject TEXT NOT NULL,
      kind TEXT NOT NULL, seconds INTEGER NOT NULL CHECK(seconds>=0),
      durationSource TEXT NOT NULL CHECK(durationSource='manual_server_timer'),
      rateCentsPerMinute INTEGER, estimateCents INTEGER, needsReview INTEGER NOT NULL CHECK(needsReview IN (0,1)),
      createdAt TEXT NOT NULL, UNIQUE(tenantId,caseId,id),
      FOREIGN KEY(tenantId,caseId,timerId) REFERENCES communication_timers(tenantId,caseId,id)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS communication_usage_approvals (
      usageId TEXT PRIMARY KEY, tenantId TEXT NOT NULL, caseId TEXT NOT NULL,
      approvedBy TEXT NOT NULL, approvedAt TEXT NOT NULL,
      FOREIGN KEY(tenantId,caseId,usageId) REFERENCES communication_usage(tenantId,caseId,id)
    ) STRICT;
    CREATE TRIGGER IF NOT EXISTS communication_usage_no_update BEFORE UPDATE ON communication_usage BEGIN SELECT RAISE(ABORT,'usage_is_append_only'); END;
    CREATE TRIGGER IF NOT EXISTS communication_usage_no_delete BEFORE DELETE ON communication_usage BEGIN SELECT RAISE(ABORT,'usage_is_append_only'); END;
    CREATE TRIGGER IF NOT EXISTS communication_approval_no_update BEFORE UPDATE ON communication_usage_approvals BEGIN SELECT RAISE(ABORT,'approval_is_append_only'); END;
    CREATE TRIGGER IF NOT EXISTS communication_approval_no_delete BEFORE DELETE ON communication_usage_approvals BEGIN SELECT RAISE(ABORT,'approval_is_append_only'); END;
  `);
  const sql = query => db.prepare(query);
  const transaction = fn => {
    db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  const session = (user, caseId, sessionId) => {
    identifier(sessionId);
    const row = sql('SELECT * FROM communication_sessions WHERE tenantId=? AND caseId=? AND id=?').get(user.tenantId, caseId, sessionId);
    if (!row) throw missing();
    return row;
  };
  const ownTimer = (user, caseId, sessionId) => sql('SELECT * FROM communication_timers WHERE tenantId=? AND caseId=? AND sessionId=? AND authorSubject=?').get(user.tenantId, caseId, sessionId, user.subject);
  const publicTimer = row => row ? { id: row.id, status: row.status, startedAt: row.startedAt, endedAt: row.endedAt, seconds: row.seconds,
    durationSource: 'manual_server_timer', providerVerified: false, rateCentsPerMinute: row.rateCentsPerMinute, currency: 'CAD' } : null;
  const publicSession = (user, row) => ({ id: row.id, caseId: row.caseId, kind: row.kind, title: row.title, scheduledAt: row.scheduledAt,
    joinUrl: row.joinUrl, status: row.status, createdBy: row.createdBy, createdAt: row.createdAt, cancelledAt: row.cancelledAt,
    ownTimer: publicTimer(ownTimer(user, row.caseId, row.id)), providerState: COMMUNICATION_PROVIDERS[row.kind] });
  const usageQuery = `SELECT u.*,a.approvedBy,a.approvedAt FROM communication_usage u LEFT JOIN communication_usage_approvals a ON a.usageId=u.id AND a.tenantId=u.tenantId AND a.caseId=u.caseId`;
  const publicUsage = row => { const { tenantId, needsReview, ...rest } = row; return { ...rest, needsReview: Boolean(needsReview),
    status: row.approvedAt ? 'approved_internal_only' : 'submitted', providerVerified: false, billed: false, currency: 'CAD', amountMode: 'estimate_only' }; };
  return {
    list(user, caseId) {
      access(user, caseId);
      // Keep the caller's running timer reachable even when older appointments
      // fall outside the bounded list. Other members' timers do not change it.
      const rows = sql(`SELECT s.* FROM communication_sessions s WHERE s.tenantId=? AND s.caseId=?
        ORDER BY EXISTS(SELECT 1 FROM communication_timers t
          WHERE t.tenantId=s.tenantId AND t.caseId=s.caseId AND t.sessionId=s.id
            AND t.authorSubject=? AND t.status='running') DESC, s.scheduledAt DESC,s.id LIMIT 201`)
        .all(user.tenantId, caseId, user.subject);
      return { sessions: rows.slice(0, 200).map(row => publicSession(user, row)), hasMore: rows.length > 200, providers: COMMUNICATION_PROVIDERS };
    },
    schedule(user, caseId, body, key) {
      access(user, caseId, MANAGERS);
      const input = communicationInput(body); idempotency(key);
      const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
      return transaction(() => {
        const prior = sql('SELECT * FROM communication_sessions WHERE tenantId=? AND caseId=? AND createdBy=? AND idempotencyKey=?').get(user.tenantId, caseId, user.subject, key);
        if (prior) {
          if (prior.inputHash !== hash) throw conflict('Cette clé a déjà servi pour un autre rendez-vous.');
          return publicSession(user, prior);
        }
        const id = randomUUID();
        sql(`INSERT INTO communication_sessions VALUES (?,?,?,?,?,?,?,'scheduled',?,?,NULL,?,?)`).run(id, user.tenantId, caseId, input.kind, input.title, input.scheduledAt, input.joinUrl, user.subject, timestamp(), key, hash);
        audit(user, caseId, 'communication.scheduled', id, { kind: input.kind });
        return publicSession(user, session(user, caseId, id));
      });
    },
    start(user, caseId, sessionId) {
      access(user, caseId);
      return transaction(() => {
        const row = session(user, caseId, sessionId);
        if (row.status === 'cancelled') throw conflict('Ce rendez-vous est annulé.');
        const prior = ownTimer(user, caseId, sessionId);
        if (prior) return publicTimer(prior);
        if (sql("SELECT id FROM communication_timers WHERE tenantId=? AND authorSubject=? AND status='running'").get(user.tenantId, user.subject)) throw conflict('Arrêtez votre chronomètre actif avant d’en ouvrir un autre.');
        sql("INSERT INTO communication_timers VALUES (?,?,?,?,?,'running',?,NULL,NULL,?)").run(randomUUID(), user.tenantId, caseId, sessionId, user.subject, timestamp(), configuredRates[row.kind]);
        audit(user, caseId, 'communication.timer_started', sessionId, { durationSource: 'manual_server_timer' });
        return publicTimer(ownTimer(user, caseId, sessionId));
      });
    },
    end(user, caseId, sessionId) {
      access(user, caseId);
      return transaction(() => {
        const row = session(user, caseId, sessionId);
        const timer = ownTimer(user, caseId, sessionId);
        if (!timer) throw conflict('Vous n’avez pas démarré de chronomètre pour ce rendez-vous.');
        if (timer.status === 'ended') return publicTimer(timer);
        const endedAt = timestamp();
        const elapsed = Date.parse(endedAt) - Date.parse(timer.startedAt);
        if (elapsed < 0) throw conflict('L’horloge serveur doit être contrôlée avant de clôturer cette durée.');
        const seconds = Math.floor(elapsed / 1000);
        // Forgotten timers retain the full elapsed duration, but cannot be approved or priced.
        const needsReview = seconds > 86400;
        const estimate = timer.rateCentsPerMinute === null || needsReview ? null : Number((BigInt(seconds) * BigInt(timer.rateCentsPerMinute) + 59n) / 60n);
        sql("UPDATE communication_timers SET status='ended',endedAt=?,seconds=? WHERE id=? AND status='running'").run(endedAt, seconds, timer.id);
        sql("INSERT INTO communication_usage VALUES (?,?,?,?,?,?,?,?,'manual_server_timer',?,?,?,?)").run(randomUUID(), user.tenantId, caseId, sessionId, timer.id, user.subject, row.kind, seconds, timer.rateCentsPerMinute, estimate, Number(needsReview), endedAt);
        audit(user, caseId, 'communication.timer_ended', sessionId, { seconds, needsReview, providerVerified: false });
        return publicTimer(ownTimer(user, caseId, sessionId));
      });
    },
    cancel(user, caseId, sessionId) {
      access(user, caseId, MANAGERS);
      return transaction(() => {
        const row = session(user, caseId, sessionId);
        if (row.status === 'cancelled') return publicSession(user, row);
        if (sql('SELECT id FROM communication_timers WHERE tenantId=? AND caseId=? AND sessionId=?').get(user.tenantId, caseId, sessionId)) throw conflict('Un rendez-vous déjà chronométré ne peut pas être annulé.');
        sql("UPDATE communication_sessions SET status='cancelled',cancelledAt=? WHERE id=?").run(timestamp(), row.id);
        audit(user, caseId, 'communication.cancelled', row.id);
        return publicSession(user, session(user, caseId, row.id));
      });
    },
    listUsage(user, caseId) {
      access(user, caseId);
      const rows = sql(`${usageQuery} WHERE u.tenantId=? AND u.caseId=? ORDER BY u.createdAt DESC,u.id LIMIT 201`).all(user.tenantId, caseId);
      return { entries: rows.slice(0, 200).map(publicUsage), hasMore: rows.length > 200, billingEnabled: false };
    },
    approveUsage(user, caseId, usageId) {
      access(user, caseId, MANAGERS); identifier(usageId);
      return transaction(() => {
        const row = sql(`${usageQuery} WHERE u.tenantId=? AND u.caseId=? AND u.id=?`).get(user.tenantId, caseId, usageId);
        if (!row) throw missing();
        if (row.authorSubject === user.subject) throw forbidden();
        if (row.needsReview) throw conflict('Cette durée dépasse 24 heures et exige une correction documentée.');
        if (row.approvedAt) return publicUsage(row);
        sql('INSERT INTO communication_usage_approvals VALUES (?,?,?,?,?)').run(usageId, user.tenantId, caseId, user.subject, timestamp());
        audit(user, caseId, 'communication.usage_approved_internal', usageId, { billed: false });
        return publicUsage(sql(`${usageQuery} WHERE u.id=?`).get(usageId));
      });
    },
  };
}
