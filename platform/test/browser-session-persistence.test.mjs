import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, readdir, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createBrowserSessions, browserSessionConfiguration } from '../lib/browser-session.mjs';

const SUBJECT = '11111111-1111-4111-8111-111111111111';
const IDENTITY = { subject: SUBJECT, tenantId: 'synthetic-private-tenant', product: 'besoinavocat', active: true };
const TOKEN = 'SYNTHETIC_PRIVATE_ACCESS_TOKEN_NOT_FOR_NETWORK';
const USER = { id: SUBJECT, email_confirmed_at: '2026-01-01T00:00:00Z' };
const cookie = value => value.setCookie.split(';')[0];
const status = expected => error => error.status === expected;
const response = (value, code = 200) => new Response(JSON.stringify(value), { status: code, headers: { 'Content-Type': 'application/json' } });

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'ba-persistent-session-'));
  const config = { supabaseUrl: 'https://auth.example.test', appOrigin: 'https://portal.example.test', publishableKey: 'sb_publishable_SYNTHETIC_PUBLIC_ONLY',
    grantsFile: path.join(directory, 'grants.json'), sessionDbPath: path.join(directory, 'sessions.sqlite'), sessionKeyFile: path.join(directory, 'key.bin'), requirePersistent: true };
  await writeFile(config.sessionKeyFile, randomBytes(32), { mode: 0o600 });
  await writeFile(config.grantsFile, JSON.stringify({ version: 1, grants: { [SUBJECT]: { tenantId: IDENTITY.tenantId, product: 'besoinavocat', active: true } } }), { mode: 0o600 });
  let time = Date.parse('2026-10-26T12:00:00Z');
  const instances = [], calls = [];
  let fetch = async url => response(url.includes('/token?') ? { access_token: TOKEN, refresh_token: 'SYNTHETIC_DISCARDED_REFRESH', token_type: 'bearer', expires_in: 3600, user: { id: SUBJECT } } : USER);
  const create = overrides => {
    const app = createBrowserSessions({ config: { ...config, ...overrides }, now: () => time,
      fetchImpl: async (url, options) => { calls.push({ url, options }); return fetch(url, options); } });
    instances.push(app); return app;
  };
  const a = create(), b = create();
  assert.equal(a.configured, true); assert.equal(b.configured, true);
  t.after(async () => {
    instances.forEach(app => app.clear());
    assert.equal(path.dirname(directory), path.resolve(tmpdir())); assert.match(path.basename(directory), /^ba-persistent-session-/);
    await rm(directory, { recursive: true, force: true });
  });
  return { directory, config, create, a, b, calls, now: () => time, advance: ms => { time += ms; }, setFetch: handler => { fetch = handler; },
    login: (app = a) => app.login('synthetic@example.test', 'SYNTHETIC_PASSWORD', { clientKey: 'test-client' }) };
}

test('production configuration requires both private persistence paths', async t => {
  const f = await fixture(t);
  const env = { NODE_ENV: 'production', TAKATAK_SUPABASE_URL: f.config.supabaseUrl,
    TAKATAK_SUPABASE_PUBLISHABLE_KEY: f.config.publishableKey, BESOINAVOCAT_GRANTS_FILE: f.config.grantsFile, APP_ORIGIN: f.config.appOrigin };
  assert.equal(browserSessionConfiguration(env), null);
  assert.equal(browserSessionConfiguration({ ...env, BESOINAVOCAT_SESSION_DB_PATH: f.config.sessionDbPath }), null);
  const configured = browserSessionConfiguration({ ...env, BESOINAVOCAT_SESSION_DB_PATH: f.config.sessionDbPath, BESOINAVOCAT_SESSION_KEY_FILE: f.config.sessionKeyFile });
  assert.equal(configured.requirePersistent, true);
});

test('two instances share session resolution and logout; closing one worker preserves other sessions', async t => {
  const f = await fixture(t);
  const logged = await f.login();
  assert.deepEqual(await f.b.resolve(cookie(logged)), IDENTITY);
  f.a.clear();
  assert.deepEqual(await f.b.resolve(cookie(logged)), IDENTITY);
  const c = f.create();
  assert.deepEqual(await c.resolve(cookie(logged)), IDENTITY);
  f.b.logout(cookie(logged));
  await assert.rejects(c.resolve(cookie(logged)), status(401));
});

test('a separate Node process can resolve and revoke the same encrypted session', async t => {
  const f = await fixture(t);
  const logged = await f.login();
  const script = `import {createBrowserSessions} from ${JSON.stringify(new URL('../lib/browser-session.mjs', import.meta.url).href)};
const sessions=createBrowserSessions({config:${JSON.stringify(f.config)},now:()=>${f.now()},fetchImpl:async()=>new Response(${JSON.stringify(JSON.stringify(USER))},{headers:{'Content-Type':'application/json'}})});
try {const identity=await sessions.resolve(${JSON.stringify(cookie(logged))}); if(identity.subject!==${JSON.stringify(SUBJECT)})throw new Error('identity mismatch');sessions.logout(${JSON.stringify(cookie(logged))});process.stdout.write('shared-session-ok');} finally {sessions.clear();}`;
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', windowsHide: true, timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] });
  assert.equal(output, 'shared-session-ok');
  await assert.rejects(f.a.resolve(cookie(logged)), status(401));
});

test('database and WAL never contain access token, refresh token, password, tenant, subject or raw session ID in plaintext', async t => {
  const f = await fixture(t);
  const logged = await f.login();
  const rawSession = cookie(logged).split('=')[1];
  const files = (await readdir(f.directory)).filter(name => name.startsWith('sessions.sqlite'));
  assert.ok(files.includes('sessions.sqlite'));
  for (const name of files) {
    const bytes = await readFile(path.join(f.directory, name));
    for (const secret of [TOKEN, 'SYNTHETIC_DISCARDED_REFRESH', 'SYNTHETIC_PASSWORD', SUBJECT, IDENTITY.tenantId, rawSession]) assert.equal(bytes.includes(Buffer.from(secret)), false, `${name} exposes ${secret}`);
  }
  const db = new DatabaseSync(f.config.sessionDbPath);
  try {
    const row = db.prepare('SELECT * FROM ba_sessions').get();
    assert.match(row.idHash, /^[a-f0-9]{64}$/);
    assert.ok(row.payload.length > 28);
  } finally { db.close(); }
});

test('wrong key, changed provider binding, missing key and malformed key fail closed without corrupting a live session', async t => {
  const f = await fixture(t);
  const logged = await f.login();
  const wrongKey = path.join(f.directory, 'wrong-key.bin');
  await writeFile(wrongKey, randomBytes(32), { mode: 0o600 });
  const shortKey = path.join(f.directory, 'short-key.bin');
  await writeFile(shortKey, 'short', { mode: 0o600 });
  for (const overrides of [{ sessionKeyFile: wrongKey }, { appOrigin: 'https://other.example.test' },
    { sessionKeyFile: path.join(f.directory, 'missing.bin') }, { sessionKeyFile: shortKey }]) {
    const invalid = f.create(overrides);
    assert.equal(invalid.configured, false);
    await assert.rejects(invalid.resolve(cookie(logged)), status(503));
  }
  assert.deepEqual(await f.b.resolve(cookie(logged)), IDENTITY);
});

test('authenticated ciphertext detects payload and expiry tampering before calling the identity provider', async t => {
  const f = await fixture(t);
  const logged = await f.login();
  const db = new DatabaseSync(f.config.sessionDbPath);
  try { db.prepare('UPDATE ba_sessions SET expiresAt=expiresAt+1000').run(); } finally { db.close(); }
  const before = f.calls.length;
  await assert.rejects(f.b.resolve(cookie(logged)), status(503));
  assert.equal(f.calls.length, before);
});

test('cross-worker logout during provider verification stays revoked', async t => {
  const f = await fixture(t);
  const logged = await f.login();
  let release;
  f.setFetch(async () => new Promise(resolve => { release = () => resolve(response(USER)); }));
  const pending = f.a.resolve(cookie(logged));
  await new Promise(resolve => setImmediate(resolve));
  f.b.logout(cookie(logged));
  release();
  await assert.rejects(pending, status(401));
});

test('rate and concurrent login limits are shared transactionally between workers', async t => {
  const f = await fixture(t);
  f.setFetch(async () => response({}, 400));
  for (let i = 0; i < 5; i++) await assert.rejects(f.login(i % 2 ? f.a : f.b), status(401));
  await assert.rejects(f.login(f.b), status(429));
  assert.equal(f.calls.length, 5);
  f.advance(16 * 60_000);
  const releases = [];
  f.setFetch(async () => new Promise(resolve => releases.push(() => resolve(response({}, 400)))));
  const pending = Array.from({ length: 4 }, (_, i) => assert.rejects(f.login(i % 2 ? f.a : f.b), status(401)));
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(f.login(f.b), status(429));
  releases.forEach(release => release()); await Promise.all(pending);
});

test('expired shared sessions are pruned and cannot survive a new worker', async t => {
  const f = await fixture(t);
  const logged = await f.login();
  f.advance(3600_001);
  await assert.rejects(f.create().resolve(cookie(logged)), status(401));
  const db = new DatabaseSync(f.config.sessionDbPath);
  try { assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ba_sessions').get().n, 0); } finally { db.close(); }
});

test('deployed ZIP layout permits private sibling storage while refusing files inside its application', async t => {
  const f = await fixture(t);
  const appRoot = path.join(f.directory, 'application');
  await mkdir(path.join(appRoot, 'lib'), { recursive: true });
  for (const name of ['browser-session.mjs', 'browser-session-store.mjs', 'validation.mjs']) {
    await copyFile(new URL('../lib/' + name, import.meta.url), path.join(appRoot, 'lib', name));
  }
  const deployed = await import(pathToFileURL(path.join(appRoot, 'lib/browser-session.mjs')).href);
  const config = { ...f.config, sessionDbPath: path.join(f.directory, 'deployed-sessions.sqlite') };
  const session = deployed.createBrowserSessions({ config, now: f.now, fetchImpl: async url => response(url.includes('/token?') ? {
    access_token: TOKEN, token_type: 'bearer', expires_in: 3600, user: { id: SUBJECT },
  } : USER) });
  try {
    assert.equal(session.configured, true);
    const logged = await session.login('synthetic@example.test', 'SYNTHETIC_PASSWORD');
    assert.deepEqual(await session.resolve(cookie(logged)), IDENTITY);
    const invalid = deployed.createBrowserSessions({ config: { ...config, sessionDbPath: path.join(appRoot, 'forbidden.sqlite') } });
    assert.equal(invalid.configured, false); invalid.clear();
    const invalidGrant = deployed.createBrowserSessions({ config: { ...config, grantsFile: path.join(appRoot, 'forbidden.json') } });
    assert.equal(invalidGrant.configured, false); invalidGrant.clear();
  } finally { session.clear(); }
});
