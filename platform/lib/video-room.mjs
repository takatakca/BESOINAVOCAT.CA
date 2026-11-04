import { createHmac, randomUUID } from 'node:crypto';
import { HttpError, externalIdentifier, fields, identifier, invalid } from './validation.mjs';

// Built-in video room of a case: browser-to-browser WebRTC (audio and video never pass through the portal), with the
// signaling messages (offer, answer, network candidates) relayed by the portal to the members of the case only.
// Network traversal: STUN by default, plus the platform's own TURN relay (coturn, « use-auth-secret ») when configured,
// with short-lived credentials signed per person. No third-party video service is involved.
// Every join, leave and end is timestamped by the server and written to the case's audit trail.
const MAX_PRESENT = 4;
const PRESENCE_MS = 20000;
const SIGNAL_TTL_MS = 120000;
const MAX_SIGNAL_BYTES = 64 * 1024;
const KINDS = ['offer', 'answer', 'candidate', 'bye'];
const MANAGERS = ['owner', 'lawyer'];
const missing = () => new HttpError(404, 'NOT_FOUND', 'Salle vidéo introuvable ou fermée.');
const ICE_URL = /^(?:stuns?|turns?):[A-Za-z0-9.-]{1,253}(?::[0-9]{1,5})?(?:\?transport=(?:udp|tcp))?$/u;

// BESOINAVOCAT_STUN_URLS, BESOINAVOCAT_TURN_URLS (comma-separated) and BESOINAVOCAT_TURN_SECRET (coturn static-auth-secret).
export function iceConfiguration(env = process.env) {
  const list = (value, fallback) => (typeof value === 'string' && value.trim() ? value.split(',').map(v => v.trim()).filter(v => ICE_URL.test(v)).slice(0, 4) : fallback);
  const stun = list(env.BESOINAVOCAT_STUN_URLS, ['stun:stun.cloudflare.com:3478']).filter(v => v.startsWith('stun'));
  const turn = list(env.BESOINAVOCAT_TURN_URLS, []).filter(v => v.startsWith('turn'));
  const secret = typeof env.BESOINAVOCAT_TURN_SECRET === 'string' && /^[\x21-\x7e]{16,512}$/u.test(env.BESOINAVOCAT_TURN_SECRET) ? env.BESOINAVOCAT_TURN_SECRET : null;
  return Object.freeze({ stun: Object.freeze(stun), turn: Object.freeze(secret ? turn : []), secret: turn.length ? secret : null });
}
// TURN REST credentials (draft-uberti-behave-turn-rest): username "<expiry>:<label>", password base64(HMAC-SHA1(secret, username)).
export function createIceServers(config = iceConfiguration(), clock = Date.now) {
  return async (label = 'ba') => {
    const servers = config.stun.map(urls => ({ urls }));
    if (!config.secret || !config.turn.length) return { iceServers: servers, relay: false };
    const username = `${Math.floor(clock() / 1000) + 3600}:${String(label).replace(/[^A-Za-z0-9-]/gu, '').slice(0, 32) || 'ba'}`;
    const credential = createHmac('sha1', config.secret).update(username).digest('base64');
    return { iceServers: [...servers, { urls: [...config.turn], username, credential }], relay: true };
  };
}

export function createVideoRooms({ db, access, audit, iceServers = async () => ({ iceServers: [], relay: false }), clock = Date.now }) {
  if (!db || typeof access !== 'function' || typeof audit !== 'function') throw new Error('Video rooms require db, access and audit');
  db.exec(`
    CREATE TABLE IF NOT EXISTS video_rooms (
      id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, caseId TEXT NOT NULL, createdBy TEXT NOT NULL,
      createdAt TEXT NOT NULL, endedAt TEXT, endedBy TEXT
    ) STRICT;
    CREATE UNIQUE INDEX IF NOT EXISTS video_one_open_room ON video_rooms(tenantId,caseId) WHERE endedAt IS NULL;
    CREATE TABLE IF NOT EXISTS video_presence (
      roomId TEXT NOT NULL, subject TEXT NOT NULL, joinedAt TEXT NOT NULL, lastSeenAt TEXT NOT NULL, leftAt TEXT,
      totalSeconds INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(roomId,subject)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS video_signals (
      seq INTEGER PRIMARY KEY AUTOINCREMENT, roomId TEXT NOT NULL, fromSubject TEXT NOT NULL, toSubject TEXT NOT NULL,
      kind TEXT NOT NULL, payload TEXT NOT NULL, createdAt INTEGER NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS video_signals_to ON video_signals(roomId,toSubject,seq);
  `);
  const sql = query => db.prepare(query);
  const iso = (ms = clock()) => new Date(ms).toISOString();
  const transaction = fn => {
    db.exec('BEGIN IMMEDIATE');
    try { const value = fn(); db.exec('COMMIT'); return value; } catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  const openRoom = (user, caseId) => sql('SELECT * FROM video_rooms WHERE tenantId=? AND caseId=? AND endedAt IS NULL').get(user.tenantId, caseId);
  function room(user, caseId, roomId) {
    identifier(roomId);
    const row = sql('SELECT * FROM video_rooms WHERE id=? AND tenantId=? AND caseId=?').get(roomId, user.tenantId, caseId);
    if (!row || row.endedAt) throw missing();
    return row;
  }
  const present = roomId => sql('SELECT * FROM video_presence WHERE roomId=? AND leftAt IS NULL AND lastSeenAt>?').all(roomId, iso(clock() - PRESENCE_MS));
  const roleOf = (user, caseId, subject) => sql('SELECT role FROM members WHERE tenantId=? AND caseId=? AND subject=?').get(user.tenantId, caseId, subject)?.role || null;
  const publicRoom = (user, row) => row ? { id: row.id, caseId: row.caseId, createdBy: row.createdBy, createdAt: row.createdAt,
    participants: present(row.id).map(p => ({ subject: p.subject, role: roleOf(user, row.caseId, p.subject), joinedAt: p.joinedAt, self: p.subject === user.subject })) } : null;

  function status(user, caseId) {
    access(user, caseId);
    return { room: publicRoom(user, openRoom(user, caseId)) };
  }
  function open(user, caseId) {
    access(user, caseId);
    return transaction(() => {
      const existing = openRoom(user, caseId);
      if (existing) return { room: publicRoom(user, existing), created: false };
      const id = randomUUID();
      sql('INSERT INTO video_rooms VALUES (?,?,?,?,?,NULL,NULL)').run(id, user.tenantId, caseId, user.subject, iso());
      audit(user, caseId, 'video.room_opened', id, {});
      return { room: publicRoom(user, openRoom(user, caseId)), created: true };
    });
  }
  async function join(user, caseId, roomId) {
    access(user, caseId);
    const result = transaction(() => {
      const row = room(user, caseId, roomId);
      const others = present(row.id).filter(p => p.subject !== user.subject);
      if (others.length >= MAX_PRESENT) throw new HttpError(409, 'ROOM_FULL', 'La salle compte déjà quatre personnes.');
      const prior = sql('SELECT * FROM video_presence WHERE roomId=? AND subject=?').get(row.id, user.subject);
      const now = iso();
      const fresh = !prior || prior.leftAt || Date.parse(prior.lastSeenAt) < clock() - PRESENCE_MS;
      if (!prior) sql('INSERT INTO video_presence VALUES (?,?,?,?,NULL,0)').run(row.id, user.subject, now, now);
      else if (fresh) sql('UPDATE video_presence SET joinedAt=?,lastSeenAt=?,leftAt=NULL WHERE roomId=? AND subject=?').run(now, now, row.id, user.subject);
      else sql('UPDATE video_presence SET lastSeenAt=? WHERE roomId=? AND subject=?').run(now, row.id, user.subject);
      if (fresh) audit(user, caseId, 'video.joined', row.id, {});
      const after = sql('SELECT COALESCE(MAX(seq),0) AS n FROM video_signals').get().n;
      // Stale messages addressed to a person who left are dropped when they come back.
      sql('DELETE FROM video_signals WHERE roomId=? AND toSubject=?').run(row.id, user.subject);
      return { room: publicRoom(user, row), after, self: user.subject };
    });
    return { ...result, ...(await iceServers()) };
  }
  function signal(user, caseId, roomId, body) {
    access(user, caseId);
    fields(body, ['to', 'kind', 'payload'], ['to', 'kind', 'payload']);
    if (!externalIdentifier(body.to) || body.to === user.subject) throw invalid('Destinataire invalide.');
    if (!KINDS.includes(body.kind)) throw invalid('Type de message invalide.');
    if (typeof body.payload !== 'string' || Buffer.byteLength(body.payload) > MAX_SIGNAL_BYTES) throw invalid('Message trop volumineux.');
    const row = room(user, caseId, roomId);
    const people = present(row.id).map(p => p.subject);
    if (!people.includes(user.subject)) throw new HttpError(409, 'NOT_IN_ROOM', 'Rejoignez d’abord la salle.');
    if (!people.includes(body.to)) throw new HttpError(409, 'PEER_GONE', 'Cette personne a quitté la salle.');
    sql('INSERT INTO video_signals (roomId,fromSubject,toSubject,kind,payload,createdAt) VALUES (?,?,?,?,?,?)').run(row.id, user.subject, body.to, body.kind, body.payload, clock());
    return { sent: true };
  }
  function poll(user, caseId, roomId, body) {
    access(user, caseId);
    fields(body, ['after'], ['after']);
    if (!Number.isSafeInteger(body.after) || body.after < 0) throw invalid('Position invalide.');
    const row = sql('SELECT * FROM video_rooms WHERE id=? AND tenantId=? AND caseId=?').get(identifier(roomId), user.tenantId, caseId);
    if (!row) throw missing();
    if (row.endedAt) return { ended: true, signals: [], participants: [], after: body.after };
    sql('UPDATE video_presence SET lastSeenAt=? WHERE roomId=? AND subject=? AND leftAt IS NULL').run(iso(), row.id, user.subject);
    sql('DELETE FROM video_signals WHERE createdAt<?').run(clock() - SIGNAL_TTL_MS);
    const signals = sql('SELECT seq, fromSubject, kind, payload FROM video_signals WHERE roomId=? AND toSubject=? AND seq>? ORDER BY seq LIMIT 100').all(row.id, user.subject, body.after);
    return { ended: false, signals, after: signals.length ? signals.at(-1).seq : body.after, participants: publicRoom(user, row).participants };
  }
  function leave(user, caseId, roomId) {
    access(user, caseId); identifier(roomId);
    return transaction(() => {
      const prior = sql('SELECT p.* FROM video_presence p JOIN video_rooms r ON r.id=p.roomId WHERE p.roomId=? AND p.subject=? AND r.tenantId=? AND r.caseId=?').get(roomId, user.subject, user.tenantId, caseId);
      if (!prior || prior.leftAt) return { left: true, seconds: 0 };
      const seconds = Math.max(0, Math.floor((clock() - Date.parse(prior.joinedAt)) / 1000));
      sql('UPDATE video_presence SET leftAt=?,totalSeconds=totalSeconds+? WHERE roomId=? AND subject=?').run(iso(), seconds, roomId, user.subject);
      audit(user, caseId, 'video.left', roomId, { seconds, durationSource: 'portal_server_clock' });
      return { left: true, seconds };
    });
  }
  function end(user, caseId, roomId) {
    access(user, caseId, MANAGERS);
    return transaction(() => {
      const row = room(user, caseId, roomId);
      const now = clock();
      for (const p of sql('SELECT * FROM video_presence WHERE roomId=? AND leftAt IS NULL').all(row.id)) {
        const seconds = Math.max(0, Math.floor((Math.min(now, Date.parse(p.lastSeenAt) + PRESENCE_MS) - Date.parse(p.joinedAt)) / 1000));
        sql('UPDATE video_presence SET leftAt=?,totalSeconds=totalSeconds+? WHERE roomId=? AND subject=?').run(iso(now), seconds, row.id, p.subject);
      }
      sql('UPDATE video_rooms SET endedAt=?,endedBy=? WHERE id=?').run(iso(now), user.subject, row.id);
      sql('DELETE FROM video_signals WHERE roomId=?').run(row.id);
      const attendance = sql('SELECT subject, totalSeconds FROM video_presence WHERE roomId=?').all(row.id).map(r => ({ ...r }));
      audit(user, caseId, 'video.room_ended', row.id, { attendance, durationSource: 'portal_server_clock' });
      return { ended: true, attendance };
    });
  }
  function history(user, caseId) {
    access(user, caseId);
    return sql('SELECT * FROM video_rooms WHERE tenantId=? AND caseId=? ORDER BY createdAt').all(user.tenantId, caseId).map(row => ({
      id: row.id, createdBy: row.createdBy, createdAt: row.createdAt, endedAt: row.endedAt,
      attendance: sql('SELECT subject, joinedAt, leftAt, totalSeconds FROM video_presence WHERE roomId=? ORDER BY joinedAt').all(row.id).map(r => ({ ...r })),
    }));
  }
  return Object.freeze({ status, open, join, signal, poll, leave, end, history });
}
