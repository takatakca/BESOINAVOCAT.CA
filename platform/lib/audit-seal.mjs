import { createHash, randomUUID } from 'node:crypto';

// Timestamped, tamper-evident journal of a case. The audit table is already append-only (database triggers). On top of
// it, each event is chained to the previous one with SHA-256, in insertion order, so changing, removing or reordering
// any past event changes every digest after it. A seal records the chain head at a moment in time; verification
// recomputes the chain and compares it with every seal ever taken. Read-only on audit_events.
const MANAGERS = ['owner', 'lawyer'];
const sha256 = value => createHash('sha256').update(value).digest('hex');

export function genesis(tenantId, caseId) { return sha256(`besoinavocat-audit-chain-v1\n${tenantId}\n${caseId}`); }
export function chainEvents(tenantId, caseId, rows) {
  let previous = genesis(tenantId, caseId);
  return rows.map((row, index) => {
    const canonical = JSON.stringify([row.id, row.subject, row.action, row.targetId ?? null, row.createdAt, row.details]);
    previous = sha256(`${previous}\n${canonical}`);
    return { position: index + 1, id: row.id, subject: row.subject, action: row.action, targetId: row.targetId, createdAt: row.createdAt,
      details: (() => { try { return JSON.parse(row.details); } catch { return {}; } })(), chain: previous };
  });
}

export function createAuditSeal({ db, access, audit, clock = Date.now }) {
  if (!db || typeof access !== 'function' || typeof audit !== 'function') throw new Error('Audit seal requires db, access and audit');
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_seals (
      id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, caseId TEXT NOT NULL, sealedBy TEXT NOT NULL, sealedAt TEXT NOT NULL,
      eventCount INTEGER NOT NULL CHECK(eventCount>=0), lastEventId TEXT, headDigest TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS audit_seals_case ON audit_seals(tenantId,caseId,sealedAt);
    CREATE TRIGGER IF NOT EXISTS audit_seals_no_update BEFORE UPDATE ON audit_seals BEGIN SELECT RAISE(ABORT,'audit_seals_are_append_only'); END;
    CREATE TRIGGER IF NOT EXISTS audit_seals_no_delete BEFORE DELETE ON audit_seals BEGIN SELECT RAISE(ABORT,'audit_seals_are_append_only'); END;
  `);
  const sql = query => db.prepare(query);
  const rows = (tenantId, caseId) => sql('SELECT id, subject, action, targetId, createdAt, details FROM audit_events WHERE tenantId=? AND caseId=? ORDER BY rowid').all(tenantId, caseId);

  function timeline(user, caseId, { limit = 200 } = {}) {
    access(user, caseId, MANAGERS);
    const chained = chainEvents(user.tenantId, caseId, rows(user.tenantId, caseId));
    return { total: chained.length, head: chained.at(-1)?.chain ?? genesis(user.tenantId, caseId), events: chained.slice(-limit).reverse() };
  }
  function seal(user, caseId) {
    access(user, caseId, MANAGERS);
    audit(user, caseId, 'audit.sealed', caseId, {});
    const chained = chainEvents(user.tenantId, caseId, rows(user.tenantId, caseId));
    const head = chained.at(-1)?.chain ?? genesis(user.tenantId, caseId);
    const record = { id: randomUUID(), sealedAt: new Date(clock()).toISOString(), eventCount: chained.length, lastEventId: chained.at(-1)?.id ?? null, headDigest: head };
    sql('INSERT INTO audit_seals VALUES (?,?,?,?,?,?,?,?)').run(record.id, user.tenantId, caseId, user.subject, record.sealedAt, record.eventCount, record.lastEventId, record.headDigest);
    return { seal: { ...record, sealedBy: user.subject }, events: chained, genesis: genesis(user.tenantId, caseId), algorithm: 'SHA-256, chaîne dans l’ordre d’insertion' };
  }
  function verify(user, caseId) {
    access(user, caseId, MANAGERS);
    const chained = chainEvents(user.tenantId, caseId, rows(user.tenantId, caseId));
    const seals = sql('SELECT * FROM audit_seals WHERE tenantId=? AND caseId=? ORDER BY sealedAt, rowid').all(user.tenantId, caseId).map(s => {
      const at = s.eventCount === 0 ? genesis(user.tenantId, caseId) : chained[s.eventCount - 1]?.chain;
      return { id: s.id, sealedAt: s.sealedAt, sealedBy: s.sealedBy, eventCount: s.eventCount, headDigest: s.headDigest, intact: at === s.headDigest };
    });
    audit(user, caseId, 'audit.verified', caseId, { seals: seals.length, intact: seals.every(s => s.intact) });
    return { intact: seals.every(s => s.intact), total: chained.length, head: chained.at(-1)?.chain ?? genesis(user.tenantId, caseId), seals };
  }
  function chainFor(user, caseId) {
    access(user, caseId, MANAGERS);
    return chainEvents(user.tenantId, caseId, rows(user.tenantId, caseId));
  }
  return Object.freeze({ timeline, seal, verify, chainFor });
}
