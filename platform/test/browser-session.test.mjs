import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createBrowserSessions, browserSessionConfiguration, assertBrowserMutation } from '../lib/browser-session.mjs';

const SUBJECT = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const KEY = 'sb_publishable_SYNTHETIC_NOT_A_REAL_KEY';
const ORIGIN = 'https://portal.example.test';
const identity = { subject: SUBJECT, tenantId: 'synthetic-tenant', product: 'besoinavocat', active: true };
const errorStatus = status => error => error.status === status;
const cookie = login => login.setCookie.split(';')[0];
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

async function fixture(t, customize = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'ba-browser-session-'));
  const grantsFile = path.join(directory, 'grants.json');
  const grants = { version: 1, grants: { [SUBJECT]: { tenantId: 'synthetic-tenant', product: 'besoinavocat', active: true } } };
  const save = value => writeFile(grantsFile, JSON.stringify(value), { mode: 0o600 });
  await save(grants);
  let time = Date.parse('2026-10-26T12:00:00Z');
  const calls = [];
  const user = { id: SUBJECT, email_confirmed_at: '2026-01-01T00:00:00Z', user_metadata: { role: 'owner', tenantId: 'forged' } };
  const token = { access_token: 'SYNTHETIC_ACCESS', refresh_token: 'SYNTHETIC_REFRESH', token_type: 'bearer', expires_in: 3600, user: { id: SUBJECT } };
  let handler = async url => json(url.includes('/token?') ? token : user);
  const fetchImpl = async (url, options) => { calls.push({ url, options }); return handler(url, options); };
  const config = { supabaseUrl: 'https://auth.example.test', appOrigin: ORIGIN, publishableKey: KEY, grantsFile };
  const sessions = createBrowserSessions({ config, fetchImpl, now: () => time, ...customize });
  t.after(async () => { sessions.clear(); assert.equal(path.dirname(directory), path.resolve(tmpdir())); assert.match(path.basename(directory), /^ba-browser-session-/); await rm(directory, { recursive: true, force: true }); });
  return { directory, grantsFile, config, sessions, calls, user, token, grants, save,
    advance: ms => { time += ms; }, setHandler: next => { handler = next; }, now: () => time,
    login: (email = 'synthetic@example.test', clientKey = 'synthetic-client') => sessions.login(email, 'SYNTHETIC_PASSWORD', { clientKey }) };
}

test('configuration fails closed for incomplete, non-HTTPS, path/query origins and privileged keys', async t => {
  const f = await fixture(t);
  const env = { TAKATAK_SUPABASE_URL: f.config.supabaseUrl, TAKATAK_SUPABASE_PUBLISHABLE_KEY: KEY,
    BESOINAVOCAT_GRANTS_FILE: f.grantsFile, APP_ORIGIN: ORIGIN };
  assert.ok(browserSessionConfiguration(env));
  const roleKey = role => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.synthetic`;
  assert.ok(browserSessionConfiguration({ ...env, TAKATAK_SUPABASE_PUBLISHABLE_KEY: roleKey('anon') }));
  for (const patch of [{ APP_ORIGIN: 'http://portal.example.test' }, { APP_ORIGIN: ORIGIN + '/path' },
    { TAKATAK_SUPABASE_URL: 'https://user:pass@auth.example.test' }, { TAKATAK_SUPABASE_URL: 'https://auth.example.test/?x=1' },
    { TAKATAK_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_SYNTHETIC' }, { TAKATAK_SUPABASE_PUBLISHABLE_KEY: roleKey('service_role') },
    { BESOINAVOCAT_GRANTS_FILE: 'relative.json' }]) assert.equal(browserSessionConfiguration({ ...env, ...patch }), null);
  const unavailable = createBrowserSessions({ config: null });
  assert.equal(unavailable.configured, false);
  await assert.rejects(unavailable.login('synthetic@example.test', 'synthetic'), errorStatus(503));
  await assert.rejects(unavailable.resolve('anything'), errorStatus(503));
});

test('login authenticates with the provider and returns only an opaque secure cookie and locally authorized identity', async t => {
  const f = await fixture(t);
  const logged = await f.login();
  assert.deepEqual(logged.identity, identity);
  assert.deepEqual(Object.keys(logged).sort(), ['expiresAt', 'identity', 'setCookie']);
  assert.match(logged.setCookie, /^__Host-ba_session=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600$/);
  assert.doesNotMatch(JSON.stringify(logged), /SYNTHETIC_ACCESS|SYNTHETIC_REFRESH|SYNTHETIC_PASSWORD|forged|owner/);
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[0].url, 'https://auth.example.test/auth/v1/token?grant_type=password');
  assert.equal(f.calls[1].url, 'https://auth.example.test/auth/v1/user');
  for (const call of f.calls) { assert.equal(call.options.redirect, 'error'); assert.ok(call.options.signal instanceof AbortSignal); assert.equal(call.options.headers.apikey, KEY); }
  assert.deepEqual(JSON.parse(f.calls[0].options.body), { email: 'synthetic@example.test', password: 'SYNTHETIC_PASSWORD' });
  assert.equal(f.calls[1].options.headers.Authorization, 'Bearer SYNTHETIC_ACCESS');
  assert.deepEqual(await f.sessions.resolve(cookie(logged)), identity);
  assert.equal(f.calls.length, 3);
});

test('grants are reread on every request; revocation and tenant changes invalidate existing sessions', async t => {
  const f = await fixture(t);
  const first = await f.login();
  f.grants.grants[SUBJECT].active = false;
  await f.save(f.grants);
  await assert.rejects(f.sessions.resolve(cookie(first)), errorStatus(403));
  f.grants.grants[SUBJECT].active = true;
  await f.save(f.grants);
  await assert.rejects(f.sessions.resolve(cookie(first)), errorStatus(401));
  const second = await f.login();
  f.grants.grants[SUBJECT].tenantId = 'other-tenant';
  await f.save(f.grants);
  await assert.rejects(f.sessions.resolve(cookie(second)), errorStatus(401));
});

test('missing, malformed and role-bearing grant files grant no access and disclose no paths', async t => {
  const f = await fixture(t);
  await f.save({ version: 1, grants: {} });
  await assert.rejects(f.login(), errorStatus(403));
  f.grants.grants[SUBJECT].role = 'owner';
  await f.save(f.grants);
  await assert.rejects(f.login(), errorStatus(503));
  await writeFile(f.grantsFile, '{broken');
  await assert.rejects(f.login(), error => { assert.equal(error.status, 503); assert.ok(!error.message.includes(f.directory)); return true; });
  await rm(f.grantsFile);
  await assert.rejects(f.login(), errorStatus(503));
});

test('user confirmation, UUID, account status and matching provider subject are enforced', async t => {
  for (const changes of [{ id: 'not-uuid' }, { email_confirmed_at: null }, { email_confirmed_at: 'not-a-date' },
    { is_anonymous: true }, { banned_until: '2099-01-01T00:00:00Z' }, { id: OTHER }]) {
    const f = await fixture(t);
    Object.assign(f.user, changes);
    await assert.rejects(f.login(), errorStatus(401));
  }
});

test('cookie ambiguity, encoding tricks and invented session IDs cannot authenticate', async t => {
  const f = await fixture(t);
  const logged = await f.login();
  for (const value of [null, '', cookie(logged) + '; ' + cookie(logged), cookie(logged) + '; __Host-ba_session =other', '__Host-ba_session=%41',
    '__Host-ba_session=' + 'a'.repeat(43), '__Host-ba_session="' + cookie(logged).split('=')[1] + '"', ['unexpected']]) {
    await assert.rejects(f.sessions.resolve(value), errorStatus(401));
  }
  assert.equal(f.calls.length, 2);
  assert.deepEqual(await f.sessions.resolve('other=irrelevant; ' + cookie(logged)), identity);
});

test('expiry uses the smaller provider expiry and one-hour cap; refresh is never requested', async t => {
  const f = await fixture(t);
  f.token.expires_in = 8 * 3600;
  const long = await f.login();
  assert.equal(long.expiresAt - f.now(), 3600_000);
  f.token.expires_in = 600;
  f.token.expires_at = Math.floor(f.now() / 1000) + 30;
  const short = await f.login();
  assert.equal(short.expiresAt - f.now(), 30_000);
  f.advance(30_001);
  await assert.rejects(f.sessions.resolve(cookie(short)), errorStatus(401));
  f.advance(3600_000);
  await assert.rejects(f.sessions.resolve(cookie(long)), errorStatus(401));
  assert.equal(f.calls.length, 4);
  assert.ok(f.calls.every(call => !call.url.includes('refresh_token')));
});

test('logout invalidates only the selected local session, clears the browser cookie and never calls provider logout', async t => {
  const f = await fixture(t);
  const one = await f.login(); const two = await f.login();
  assert.notEqual(cookie(one), cookie(two));
  const logout = f.sessions.logout(cookie(one));
  assert.match(logout.setCookie, /__Host-ba_session=;.*Max-Age=0$/);
  await assert.rejects(f.sessions.resolve(cookie(one)), errorStatus(401));
  assert.deepEqual(await f.sessions.resolve(cookie(two)), identity);
  assert.match(f.sessions.logout(null).setCookie, /Max-Age=0/);
  assert.ok(f.calls.every(call => !call.url.includes('logout')));
});

test('logout while /user is pending cannot resurrect an identity', async t => {
  const f = await fixture(t);
  const logged = await f.login();
  let release;
  f.setHandler(async () => new Promise(resolve => { release = () => resolve(json(f.user)); }));
  const pending = f.sessions.resolve(cookie(logged));
  await new Promise(resolve => setImmediate(resolve));
  f.sessions.logout(cookie(logged));
  release();
  await assert.rejects(pending, errorStatus(401));
});

test('mutations require exact HTTPS origin and explicit X-Requested-With, rejecting duplicate headers', async t => {
  const f = await fixture(t);
  const valid = { headers: { origin: ORIGIN, 'x-requested-with': 'XMLHttpRequest' },
    rawHeaders: ['Origin', ORIGIN, 'X-Requested-With', 'XMLHttpRequest'] };
  assert.doesNotThrow(() => f.sessions.assertMutation(valid));
  for (const req of [{ headers: {} }, { headers: { origin: 'null', 'x-requested-with': 'XMLHttpRequest' } },
    { headers: { origin: ORIGIN + '.evil.test', 'x-requested-with': 'XMLHttpRequest' } },
    { headers: { origin: ORIGIN } }, { ...valid, rawHeaders: [...valid.rawHeaders, 'Origin', ORIGIN] }]) {
    assert.throws(() => f.sessions.assertMutation(req), errorStatus(403));
  }
  assert.throws(() => assertBrowserMutation(valid, 'http://portal.example.test'), errorStatus(403));
});

test('provider errors are generic, bounded, redirect-safe and do not disclose supplied credentials or response bodies', async t => {
  const f = await fixture(t);
  for (const status of [400, 401, 403, 422]) {
    f.setHandler(async () => json({ error: 'SENSITIVE_PROVIDER_DETAILS' }, status));
    await assert.rejects(f.login(), error => { assert.equal(error.status, 401); assert.doesNotMatch(error.message, /SENSITIVE|SYNTHETIC/); return true; });
  }
  const cases = [async () => json({ error: 'private' }, 500), async () => new Response('<html>private</html>'),
    async () => new Response('{broken', { headers: { 'Content-Type': 'application/json' } }),
    async () => json({ value: 'x'.repeat(65537) }), async () => { throw new Error('secret-network-details'); }];
  for (const handler of cases) {
    f.advance(16 * 60_000); f.setHandler(handler);
    await assert.rejects(f.login(), error => { assert.equal(error.status, 503); assert.doesNotMatch(error.message, /private|secret-network/); return true; });
  }
});

test('provider denial after login invalidates the local session instead of trusting cached identity', async t => {
  const f = await fixture(t);
  const logged = await f.login();
  f.setHandler(async () => json({}, 401));
  await assert.rejects(f.sessions.resolve(cookie(logged)), errorStatus(401));
  f.setHandler(async () => json(f.user));
  const before = f.calls.length;
  await assert.rejects(f.sessions.resolve(cookie(logged)), errorStatus(401));
  assert.equal(f.calls.length, before);
});

test('per-account, client and global login limits block attempts before provider calls and expire predictably', async t => {
  const f = await fixture(t);
  f.setHandler(async () => json({}, 400));
  for (let i = 0; i < 5; i++) await assert.rejects(f.login('one@example.test', 'client-' + i), errorStatus(401));
  await assert.rejects(f.login('one@example.test', 'new-client'), errorStatus(429));
  assert.equal(f.calls.length, 5);
  for (let i = 0; i < 10; i++) await assert.rejects(f.login(`x${i}@example.test`, 'same-client'), errorStatus(401));
  await assert.rejects(f.login('new@example.test', 'same-client'), errorStatus(429));
  for (let i = 0; i < 45; i++) await assert.rejects(f.login(`g${i}@example.test`, `g${i}`), errorStatus(401));
  await assert.rejects(f.login('global@example.test', 'global'), errorStatus(429));
  assert.equal(f.calls.length, 60);
  f.advance(16 * 60_000);
  await assert.rejects(f.login('one@example.test', 'same-client'), errorStatus(401));
});

test('concurrent login requests are bounded without storing a fifth set of credentials', async t => {
  const f = await fixture(t);
  const releases = [];
  f.setHandler(async () => new Promise(resolve => releases.push(() => resolve(json({}, 400)))));
  const pending = Array.from({ length: 4 }, (_, i) => assert.rejects(f.login(`parallel${i}@example.test`, `p${i}`), errorStatus(401)));
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(f.login('fifth@example.test', 'p5'), errorStatus(429));
  assert.equal(f.calls.length, 4);
  releases.forEach(release => release());
  await Promise.all(pending);
});
