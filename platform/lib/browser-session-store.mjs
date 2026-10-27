import { createCipheriv, createDecipheriv, createHash, createSecretKey, randomBytes } from 'node:crypto';
import { closeSync, existsSync, lstatSync, openSync, readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { HttpError } from './validation.mjs';

const APP_ROOT = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const REPO_PARENT = path.dirname(APP_ROOT);
const PRIVATE_EXCLUSIONS = [APP_ROOT, ...(existsSync(path.join(REPO_PARENT, '.git')) ? [REPO_PARENT] : [])];
const MAX_SESSIONS = 1000;
const MAX_COUNTERS = 4096;
const LEASE_MS = 30_000;
const hash = value => createHash('sha256').update(value).digest('hex');
const unavailable = () => new HttpError(503, 'IDENTITY_UNAVAILABLE', 'Le stockage des sessions est indisponible.');
const limited = () => new HttpError(429, 'LOGIN_RATE_LIMIT', 'Trop de tentatives. Réessayez plus tard.');

function privatePath(file, { mayCreate = false } = {}) {
  if (typeof file !== 'string' || !path.isAbsolute(file)) throw unavailable();
  const parent = realpathSync(path.dirname(file));
  const resolved = path.join(parent, path.basename(file));
  for (const root of PRIVATE_EXCLUSIONS) {
    const relative = path.relative(realpathSync(root), resolved);
    if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) throw unavailable();
  }
  if (resolved.split(path.sep).some(part => /^(?:public_html|htdocs|wwwroot)$/iu.test(part))) throw unavailable();
  const parentStat = statSync(parent);
  if (!parentStat.isDirectory() || (process.platform !== 'win32' && (parentStat.mode & 0o077) !== 0)) throw unavailable();
  if (mayCreate) {
    try { closeSync(openSync(resolved, 'wx', 0o600)); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
  const stat = lstatSync(resolved);
  if (!stat.isFile() || stat.isSymbolicLink() || (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)) throw unavailable();
  return resolved;
}

function memoryStore() {
  const sessions = new Map(), counters = new Map(), leases = new Map();
  let closed = false;
  function prune(time) {
    if (closed) throw unavailable();
    for (const [key, value] of sessions) if (value.expiresAt <= time) sessions.delete(key);
    for (const [key, value] of counters) if (value.expires <= time) counters.delete(key);
    for (const [key, value] of leases) if (value.expires <= time) leases.delete(key);
  }
  const leaseCount = kind => [...leases.values()].filter(value => value.kind === kind).length;
  function lease(kind, time) {
    const id = randomBytes(16).toString('hex'); leases.set(id, { kind, expires: time + LEASE_MS }); return id;
  }
  return {
    prune,
    reserveLogin(email, client, time) {
      prune(time);
      const keys = [[`email:${hash(email)}`, 5, 900_000], [`client:${hash(client)}`, 10, 900_000], ['global', 60, 60_000]];
      if (leaseCount('login') >= 4 || sessions.size + leaseCount('login') >= MAX_SESSIONS || counters.size + 3 > MAX_COUNTERS) throw limited();
      for (const [key, max] of keys) if ((counters.get(key)?.count ?? 0) >= max) throw limited();
      for (const [key, , ttl] of keys) { const entry = counters.get(key) ?? { count: 0, expires: time + ttl }; entry.count++; counters.set(key, entry); }
      return lease('login', time);
    },
    reserveResolve(time) { prune(time); if (leaseCount('resolve') >= 32) throw unavailable(); return lease('resolve', time); },
    release(id) { leases.delete(id); },
    set(id, value, time, reservation) {
      prune(time);
      if (leases.get(reservation)?.kind !== 'login') throw unavailable();
      sessions.set(id, value);
    },
    get(id, time) { if (closed) return null; prune(time); return sessions.get(id) ?? null; },
    isCurrent(id, value, time) { if (closed) return false; prune(time); return sessions.get(id) === value; },
    delete(id) { sessions.delete(id); },
    close() { sessions.clear(); counters.clear(); leases.clear(); closed = true; },
  };
}

function sqliteStore(config) {
  let db, secret;
  try {
    const keyPath = privatePath(config.sessionKeyFile);
    if (statSync(keyPath).size !== 32) throw unavailable();
    const keyBytes = readFileSync(keyPath);
    if (keyBytes.length !== 32) { keyBytes.fill(0); throw unavailable(); }
    const fingerprint = hash(keyBytes);
    secret = createSecretKey(keyBytes); keyBytes.fill(0);
    const dbPath = privatePath(config.sessionDbPath, { mayCreate: true });
    if ((process.platform === 'win32' ? dbPath.toLowerCase() === keyPath.toLowerCase() : dbPath === keyPath)) throw unavailable();
    const binding = JSON.stringify([config.supabaseUrl, config.appOrigin]);
    db = new DatabaseSync(dbPath);
    db.exec('PRAGMA busy_timeout=2000; PRAGMA synchronous=FULL; PRAGMA secure_delete=ON;');
    if (db.prepare('PRAGMA journal_mode=WAL').get().journal_mode !== 'wal') throw unavailable();
    db.exec(`
      CREATE TABLE IF NOT EXISTS ba_session_meta (name TEXT PRIMARY KEY,value TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS ba_sessions (idHash TEXT PRIMARY KEY,payload BLOB NOT NULL,revision TEXT NOT NULL,expiresAt INTEGER NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS ba_session_limits (id TEXT PRIMARY KEY,count INTEGER NOT NULL,expiresAt INTEGER NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS ba_session_leases (id TEXT PRIMARY KEY,kind TEXT NOT NULL,expiresAt INTEGER NOT NULL) STRICT;
    `);
    db.exec('BEGIN IMMEDIATE');
    try {
      const expected = { key_fingerprint: fingerprint, binding, schema_version: '1' };
      for (const [name, value] of Object.entries(expected)) {
        db.prepare('INSERT OR IGNORE INTO ba_session_meta(name,value) VALUES(?,?)').run(name, value);
        if (db.prepare('SELECT value FROM ba_session_meta WHERE name=?').get(name)?.value !== value) throw unavailable();
      }
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }

    const safe = action => (...args) => {
      try { if (!db) throw unavailable(); return action(...args); }
      catch (error) { if (error instanceof HttpError) throw error; throw unavailable(); }
    };
    function transaction(action) {
      db.exec('BEGIN IMMEDIATE');
      try { const value = action(); db.exec('COMMIT'); return value; }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    }
    function prune(time) {
      for (const table of ['ba_sessions', 'ba_session_limits', 'ba_session_leases']) db.prepare(`DELETE FROM ${table} WHERE expiresAt<=?`).run(time);
    }
    const countLease = kind => db.prepare('SELECT COUNT(*) AS n FROM ba_session_leases WHERE kind=?').get(kind).n;
    function lease(kind, time) {
      const id = randomBytes(16).toString('hex');
      db.prepare('INSERT INTO ba_session_leases VALUES(?,?,?)').run(id, kind, time + LEASE_MS); return id;
    }
    const aad = (id, revision, expiry) => Buffer.from(JSON.stringify([binding, id, revision, expiry]));
    function seal(id, value, revision) {
      const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', secret, iv);
      cipher.setAAD(aad(id, revision, value.expiresAt));
      const bytes = Buffer.from(JSON.stringify({ accessToken: value.accessToken, subject: value.subject, tenantId: value.tenantId }));
      try { const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]); return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]); }
      finally { bytes.fill(0); }
    }
    function unseal(row) {
      const bytes = Buffer.from(row.payload);
      if (bytes.length < 29) throw unavailable();
      const decipher = createDecipheriv('aes-256-gcm', secret, bytes.subarray(0, 12));
      decipher.setAAD(aad(row.idHash, row.revision, row.expiresAt)); decipher.setAuthTag(bytes.subarray(12, 28));
      const plaintext = Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]);
      try { return { ...JSON.parse(plaintext.toString('utf8')), expiresAt: row.expiresAt, revision: row.revision }; }
      finally { plaintext.fill(0); }
    }
    return {
      prune: safe(prune),
      reserveLogin: safe((email, client, time) => transaction(() => {
        prune(time);
        const keys = [[`email:${hash(email)}`, 5, 900_000], [`client:${hash(client)}`, 10, 900_000], ['global', 60, 60_000]];
        if (countLease('login') >= 4 || db.prepare('SELECT COUNT(*) AS n FROM ba_sessions').get().n + countLease('login') >= MAX_SESSIONS ||
            db.prepare('SELECT COUNT(*) AS n FROM ba_session_limits').get().n + 3 > MAX_COUNTERS) throw limited();
        for (const [id, max] of keys) if ((db.prepare('SELECT count FROM ba_session_limits WHERE id=?').get(id)?.count ?? 0) >= max) throw limited();
        for (const [id, , ttl] of keys) db.prepare('INSERT INTO ba_session_limits VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1').run(id, time + ttl);
        return lease('login', time);
      })),
      reserveResolve: safe(time => transaction(() => { prune(time); if (countLease('resolve') >= 32) throw unavailable(); return lease('resolve', time); })),
      release: safe(id => { db.prepare('DELETE FROM ba_session_leases WHERE id=?').run(id); }),
      set: safe((id, value, time, reservation) => transaction(() => {
        prune(time);
        if (db.prepare('SELECT kind FROM ba_session_leases WHERE id=?').get(reservation)?.kind !== 'login') throw unavailable();
        const revision = randomBytes(16).toString('hex');
        db.prepare('INSERT INTO ba_sessions VALUES(?,?,?,?)').run(id, seal(id, value, revision), revision, value.expiresAt);
      })),
      get: safe((id, time) => { prune(time); const row = db.prepare('SELECT * FROM ba_sessions WHERE idHash=?').get(id); return row ? unseal(row) : null; }),
      isCurrent: safe((id, value, time) => Boolean(db.prepare('SELECT idHash FROM ba_sessions WHERE idHash=? AND revision=? AND expiresAt>?').get(id, value.revision, time))),
      delete: safe(id => { db.prepare('DELETE FROM ba_sessions WHERE idHash=?').run(id); }),
      close() { if (db) { db.close(); db = null; secret = null; } },
    };
  } catch (error) {
    try { db?.close(); } catch { /* no sensitive detail logged */ }
    secret = null;
    throw unavailable();
  }
}

export function createSessionStore(config) {
  return config.sessionDbPath ? sqliteStore(config) : memoryStore();
}
