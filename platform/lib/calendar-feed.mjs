import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { HttpError, fields, invalid } from './validation.mjs';
import { KINDS, fold, ics } from './deadlines.mjs';

// Abonnement agenda privé : each person may hold one secret iCal link that Outlook, Google Agenda or Apple
// Calendrier read on their own schedule. It lists the open deadlines and the scheduled appointments of every case
// the person is a member of, with what their role may see, re-checked at every read: a person removed from a case
// stops receiving it at the next refresh. Only the SHA-256 of the token is stored; the link is shown once, at
// creation. « discret » (default) shows the type and the case reference only, because the calendar provider keeps a
// copy; « complet » adds titles and notes. Off unless BESOINAVOCAT_CALENDAR_FEED_ENABLED=true and APP_ORIGIN is set.
const DETAILS = ['discreet', 'full'];
const TOKEN = /^[A-Za-z0-9_-]{43}$/u;
const PAST_DAYS = 30, FUTURE_DAYS = 365, MAX_ITEMS = 500;
const SESSION_KIND = Object.freeze({ video: 'Rendez-vous vidéo', phone: 'Rendez-vous téléphonique' });
const hash = token => createHash('sha256').update(token, 'utf8').digest('hex');
const icsStamp = iso => iso.replace(/[-:]/gu, '').replace(/\.\d{3}/u, '');

export function calendarFeedConfiguration(env = process.env) {
  let origin = null;
  try { const u = new URL(env.APP_ORIGIN || ''); if (u.protocol === 'https:' || u.hostname === '127.0.0.1' || u.hostname === 'localhost') origin = u.origin; } catch { origin = null; }
  const enabled = env.BESOINAVOCAT_CALENDAR_FEED_ENABLED === 'true';
  const missing = [!enabled && 'BESOINAVOCAT_CALENDAR_FEED_ENABLED=true', !origin && 'APP_ORIGIN'].filter(Boolean);
  return Object.freeze({ enabled: enabled && Boolean(origin), origin, missing });
}

export function createCalendarFeed({ db, audit, config = calendarFeedConfiguration({}), clock = Date.now }) {
  if (!db || typeof audit !== 'function') throw new Error('Calendar feed requires db and audit');
  db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_feeds (
      id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, subject TEXT NOT NULL, tokenHash TEXT NOT NULL UNIQUE,
      detail TEXT NOT NULL CHECK(detail IN ('discreet','full')), createdAt TEXT NOT NULL, revokedAt TEXT,
      lastFetchedAt TEXT, fetchCount INTEGER NOT NULL DEFAULT 0
    ) STRICT;
    CREATE INDEX IF NOT EXISTS calendar_feeds_owner ON calendar_feeds(tenantId,subject,revokedAt);
  `);
  const sql = query => db.prepare(query);
  const now = () => new Date(clock()).toISOString();
  const tx = fn => {
    db.exec('BEGIN IMMEDIATE');
    try { const value = fn(); db.exec('COMMIT'); return value; } catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  const unavailable = () => new HttpError(503, 'CALENDAR_FEED_DISABLED', 'L’abonnement agenda n’est pas activé sur ce serveur.');
  const active = user => sql('SELECT * FROM calendar_feeds WHERE tenantId=? AND subject=? AND revokedAt IS NULL').get(user.tenantId, user.subject);
  const publicFeed = row => row ? { createdAt: row.createdAt, detail: row.detail, lastFetchedAt: row.lastFetchedAt, fetchCount: row.fetchCount } : null;

  function render(row) {
    const user = { tenantId: row.tenantId, subject: row.subject };
    const full = row.detail === 'full';
    const time = clock();
    const today = new Date(time).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
    const day = offset => new Date(Date.parse(`${today}T00:00:00Z`) + offset * 86400000).toISOString().slice(0, 10);
    const deadlines = sql(`SELECT d.*, c.title AS caseTitle, c.reference AS caseReference FROM case_deadlines d
      JOIN members m ON m.tenantId=d.tenantId AND m.caseId=d.caseId AND m.subject=?
      JOIN cases c ON c.tenantId=d.tenantId AND c.id=d.caseId
      WHERE d.tenantId=? AND d.status='open' AND d.dueDate BETWEEN ? AND ? AND (m.role IN ('owner','lawyer') OR d.visibleToClient=1)
      ORDER BY d.dueDate LIMIT ${MAX_ITEMS}`).all(user.subject, user.tenantId, day(-PAST_DAYS), day(FUTURE_DAYS));
    const sessions = sql(`SELECT s.id, s.kind, s.title, s.scheduledAt, c.title AS caseTitle, c.reference AS caseReference FROM communication_sessions s
      JOIN members m ON m.tenantId=s.tenantId AND m.caseId=s.caseId AND m.subject=?
      JOIN cases c ON c.tenantId=s.tenantId AND c.id=s.caseId
      WHERE s.tenantId=? AND s.status='scheduled' AND s.scheduledAt BETWEEN ? AND ?
      ORDER BY s.scheduledAt LIMIT ${MAX_ITEMS}`).all(user.subject, user.tenantId,
      new Date(time - PAST_DAYS * 86400000).toISOString(), new Date(time + FUTURE_DAYS * 86400000).toISOString());
    const ref = r => r.caseReference || 'dossier';
    const portal = `${config.origin}/`;
    const stamp = icsStamp(now());
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BesoinAvocat//Agenda//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'X-WR-CALNAME:BesoinAvocat', 'X-WR-TIMEZONE:America/Toronto', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H'];
    for (const d of deadlines) {
      const date = d.dueDate.replace(/-/gu, '');
      const next = new Date(Date.parse(`${d.dueDate}T00:00:00Z`) + 86400000).toISOString().slice(0, 10).replace(/-/gu, '');
      const summary = full ? `${KINDS[d.kind]} : ${d.title} · ${ref(d)}` : `${KINDS[d.kind]} · ${ref(d)}`;
      const description = full ? [d.caseTitle, d.note].filter(Boolean).join('\n') : 'Détails dans le portail BesoinAvocat.';
      lines.push('BEGIN:VEVENT', `UID:deadline-${d.id}@besoinavocat.ca`, `DTSTAMP:${stamp}`,
        ...(d.dueTime ? [`DTSTART;TZID=America/Toronto:${date}T${d.dueTime.replace(':', '')}00`, 'DURATION:PT1H'] : [`DTSTART;VALUE=DATE:${date}`, `DTEND;VALUE=DATE:${next}`]),
        `SUMMARY:${ics(summary)}`, `DESCRIPTION:${ics(description)}`, `URL:${portal}`, 'CLASS:PRIVATE', 'TRANSP:TRANSPARENT', 'END:VEVENT');
    }
    for (const s of sessions) {
      const summary = full ? `${SESSION_KIND[s.kind]} : ${s.title} · ${ref(s)}` : `${SESSION_KIND[s.kind]} · ${ref(s)}`;
      // The join link is never written to the calendar: it is opened from the portal, behind the session.
      lines.push('BEGIN:VEVENT', `UID:session-${s.id}@besoinavocat.ca`, `DTSTAMP:${stamp}`, `DTSTART:${icsStamp(s.scheduledAt)}`, 'DURATION:PT1H',
        `SUMMARY:${ics(summary)}`, `DESCRIPTION:${ics(full ? `${s.caseTitle}\nRejoindre depuis le portail.` : 'Rejoindre depuis le portail BesoinAvocat.')}`,
        `URL:${portal}`, 'CLASS:PRIVATE', 'TRANSP:OPAQUE', 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return { body: `${lines.map(fold).join('\r\n')}\r\n`, count: deadlines.length + sessions.length };
  }

  return {
    configured: () => config.enabled,
    status(user) {
      return { enabled: config.enabled, missing: config.missing, feed: config.enabled ? publicFeed(active(user)) : null, details: DETAILS };
    },
    // Creates the link, or replaces the current one (the old link stops at once). The token is returned only here.
    create(user, body) {
      if (!config.enabled) throw unavailable();
      const value = fields(body, ['detail'], []);
      const detail = value.detail ?? 'discreet';
      if (!DETAILS.includes(detail)) throw invalid('Niveau de détail inconnu.');
      const token = randomBytes(32).toString('base64url');
      const at = now();
      const replaced = tx(() => {
        const previous = sql('UPDATE calendar_feeds SET revokedAt=? WHERE tenantId=? AND subject=? AND revokedAt IS NULL').run(at, user.tenantId, user.subject).changes;
        sql('INSERT INTO calendar_feeds (id,tenantId,subject,tokenHash,detail,createdAt) VALUES (?,?,?,?,?,?)').run(randomUUID(), user.tenantId, user.subject, hash(token), detail, at);
        return previous > 0;
      });
      audit(user, null, replaced ? 'calendar_feed.rotated' : 'calendar_feed.created', null, { detail });
      const url = `${config.origin}/api/calendar/${token}.ics`;
      return { url, webcalUrl: url.replace(/^https?:/u, 'webcal:'), feed: publicFeed(active(user)) };
    },
    revoke(user) {
      if (!config.enabled) throw unavailable();
      const changes = sql('UPDATE calendar_feeds SET revokedAt=? WHERE tenantId=? AND subject=? AND revokedAt IS NULL').run(now(), user.tenantId, user.subject).changes;
      if (changes) audit(user, null, 'calendar_feed.revoked', null, {});
      return { revoked: changes > 0, feed: null };
    },
    // Public read by the calendar provider. Unknown, revoked or malformed tokens all answer the same 404.
    read(token) {
      if (!config.enabled || typeof token !== 'string' || !TOKEN.test(token)) return null;
      const row = sql('SELECT * FROM calendar_feeds WHERE tokenHash=? AND revokedAt IS NULL').get(hash(token));
      if (!row) return null;
      const result = render(row);
      sql('UPDATE calendar_feeds SET lastFetchedAt=?, fetchCount=fetchCount+1 WHERE id=?').run(now(), row.id);
      return result.body;
    },
  };
}
