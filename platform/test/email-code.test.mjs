import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createBrowserSessions, browserSessionConfiguration } from '../lib/browser-session.mjs';

const SUBJECT = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const EMAIL = 'member@example.test';
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const hasStatus = status => error => error.status === status;
async function fixture(t, { enabled = true, persistent = false } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'ba-email-code-'));
  const grants = { version: 1, grants: { [SUBJECT]: { tenantId: 'synthetic-tenant', product: 'besoinavocat', active: true } } };
  const config = { supabaseUrl: 'https://auth.example.test', appOrigin: 'https://portal.example.test', publishableKey: 'sb_publishable_SYNTHETIC_NOT_A_REAL_KEY', grantsFile: path.join(root, 'grants.json'), emailCodeEnabled: enabled };
  const save = () => writeFile(config.grantsFile, JSON.stringify(grants), { mode: 0o600 });
  await save();
  if (persistent) {
    config.sessionDbPath = path.join(root, 'sessions.sqlite'); config.sessionKeyFile = path.join(root, 'session.key');
    await writeFile(config.sessionKeyFile, Buffer.alloc(32, 7), { mode: 0o600 });
  }
  const f = { config, grants, save, calls: [], time: Date.parse('2026-10-29T05:00:00Z'),
    user: { id: SUBJECT, email: EMAIL, email_confirmed_at: '2026-01-01T00:00:00Z' },
    token: { access_token: 'SYNTHETIC_ACCESS', refresh_token: 'SYNTHETIC_REFRESH', token_type: 'bearer', expires_in: 3600, user: { id: SUBJECT } } };
  f.handler = (url) => json(url.endsWith('/otp') ? {} : url.endsWith('/verify') || url.includes('/token?') ? f.token : f.user);
  f.create = () => createBrowserSessions({ config, now: () => f.time, fetchImpl: async (url, options) => { f.calls.push({ url, options }); return f.handler(url, options); } });
  f.sessions = f.create();
  t.after(async () => { f.sessions.clear(); f.second?.clear(); assert.equal(path.dirname(root), path.resolve(tmpdir())); assert.match(path.basename(root), /^ba-email-code-/u); await rm(root, { recursive: true, force: true }); });
  return f;
}

test('email-code activation is explicit, disabled by default and does not disable password auth', async t => {
  const f = await fixture(t, { enabled: false });
  assert.equal(f.sessions.configured, true); assert.equal(f.sessions.emailCodeConfigured, false);
  await assert.rejects(f.sessions.requestEmailCode(EMAIL), hasStatus(503));
  await assert.rejects(f.sessions.verifyEmailCode(EMAIL, '00123456'), hasStatus(503));
  assert.equal(f.calls.length, 0);
  await f.sessions.login(EMAIL, 'synthetic-password');
  const env = { TAKATAK_SUPABASE_URL: f.config.supabaseUrl, APP_ORIGIN: f.config.appOrigin, TAKATAK_SUPABASE_PUBLISHABLE_KEY: f.config.publishableKey, BESOINAVOCAT_GRANTS_FILE: f.config.grantsFile };
  for (const value of [undefined, 'false', '1', 'TRUE']) assert.equal(browserSessionConfiguration({ ...env, BESOINAVOCAT_EMAIL_OTP_ENABLED: value }).emailCodeEnabled, false);
  assert.equal(browserSessionConfiguration({ ...env, BESOINAVOCAT_EMAIL_OTP_ENABLED: 'true' }).emailCodeEnabled, true);
});

test('request normalizes email, forbids account creation and returns no identity, cookie or token', async t => {
  const f = await fixture(t);
  const result = await f.sessions.requestEmailCode('  MEMBER@EXAMPLE.TEST  ');
  assert.deepEqual(Object.keys(result).sort(), ['accepted', 'message']); assert.equal(result.accepted, true);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].url, 'https://auth.example.test/auth/v1/otp');
  assert.deepEqual(JSON.parse(f.calls[0].options.body), { email: EMAIL, create_user: false });
  assert.equal(f.calls[0].options.redirect, 'error');
  assert.ok(f.calls[0].options.signal);
  await assert.rejects(f.sessions.resolve('__Host-ba_session=invented'), hasStatus(401));
});

test('unknown, banned and provider-throttled requests have the same generic acceptance as a known account', async t => {
  const f = await fixture(t); const results = [];
  for (const status of [200, 400, 403, 422, 429]) {
    f.handler = () => new Response(status === 200 ? '{}' : 'private provider detail', { status, headers: { 'Content-Type': 'application/json' } });
    results.push(await f.sessions.requestEmailCode(EMAIL));
  }
  for (const result of results) assert.deepEqual(result, results[0]);
  assert.doesNotMatch(JSON.stringify(results), /private provider|SYNTHETIC|member@example/u);
});

test('provider outage and malformed replies fail bounded and generic without creating a session', async t => {
  for (const handler of [() => json({}, 500), () => { throw new Error('private timeout details'); }, () => new Response('<html>private detail</html>'), () => json({ value: 'x'.repeat(65536) })]) {
    const f = await fixture(t); f.handler = handler;
    await assert.rejects(f.sessions.requestEmailCode(EMAIL), error => error.status === 503 && !/private|html|detail/u.test(error.message));
  }
});

test('6, 8 and 10 digit strings preserve initial zeroes and establish only a verified granted session', async t => {
  const f = await fixture(t);
  for (const code of ['001234', '00123456', '0012345678']) {
    const session = await f.sessions.verifyEmailCode('MEMBER@EXAMPLE.TEST', code);
    const call = f.calls.findLast(item => item.url.endsWith('/verify'));
    assert.deepEqual(JSON.parse(call.options.body), { email: EMAIL, token: code, type: 'email' });
    assert.deepEqual(session.identity, { subject: SUBJECT, tenantId: 'synthetic-tenant', product: 'besoinavocat', active: true });
    assert.match(session.setCookie, /^__Host-ba_session=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600$/u);
    assert.doesNotMatch(JSON.stringify(session), /SYNTHETIC_ACCESS|SYNTHETIC_REFRESH/u);
    assert.deepEqual(await f.sessions.resolve(session.setCookie.split(';')[0]), session.identity);
  }
});

test('invalid email and code formats are rejected before contacting the provider', async t => {
  const f = await fixture(t);
  for (const email of ['', 'no-at-sign', 'a@b', 'a@b.test\nforged', 'x'.repeat(321)]) await assert.rejects(f.sessions.requestEmailCode(email), hasStatus(401));
  for (const code of [123456, '12345', '12345678901', '123 456', '１２３４５６', '1e12345', '123456\n', null]) await assert.rejects(f.sessions.verifyEmailCode(EMAIL, code), hasStatus(401));
  assert.equal(f.calls.length, 0);
});

test('wrong, expired and reused codes fail without a /user call or session', async t => {
  const f = await fixture(t);
  for (const reason of ['otp_expired', 'invalid_token', 'already_used']) {
    f.handler = () => json({ error: reason, secret: 'private diagnostic' }, 403);
    await assert.rejects(f.sessions.verifyEmailCode(EMAIL, '00123456'), error => error.status === 401 && !error.message.includes(reason));
  }
  assert.ok(f.calls.every(call => call.url.endsWith('/verify')));
});

test('verified provider email and UUID must match the requested identity, with confirmation and no ban', async t => {
  for (const patch of [{ email: 'other@example.test' }, { email: undefined }, { id: OTHER }, { email_confirmed_at: null }, { is_anonymous: true }, { banned_until: '2099-01-01T00:00:00Z' }]) {
    const f = await fixture(t); Object.assign(f.user, patch);
    await assert.rejects(f.sessions.verifyEmailCode(EMAIL, '00123456'), hasStatus(401));
  }
});

test('a valid code cannot grant access, extend provider expiry or trust user metadata', async t => {
  const f = await fixture(t);
  f.user.user_metadata = { tenantId: 'forged', role: 'owner' };
  f.grants.grants[SUBJECT].active = false; await f.save();
  await assert.rejects(f.sessions.verifyEmailCode(EMAIL, '00123456'), hasStatus(403));
  f.grants.grants[SUBJECT].active = true; await f.save(); f.token.expires_at = f.time / 1000 - 1;
  await assert.rejects(f.sessions.verifyEmailCode(EMAIL, '00123456'), hasStatus(401));
});

test('request, verify and password attempts share the same durable email budget across workers', async t => {
  const f = await fixture(t, { persistent: true }); f.second = f.create();
  await f.sessions.requestEmailCode(EMAIL, { clientKey: 'ip-a' });
  await f.second.verifyEmailCode(EMAIL, '00123456', { clientKey: 'ip-b' });
  await f.sessions.login(EMAIL, 'synthetic-password', { clientKey: 'ip-c' });
  await f.second.requestEmailCode(EMAIL, { clientKey: 'ip-d' });
  await f.sessions.verifyEmailCode(EMAIL, '00123456', { clientKey: 'ip-e' });
  const before = f.calls.length;
  await assert.rejects(f.second.requestEmailCode(EMAIL, { clientKey: 'ip-f' }), hasStatus(429));
  await assert.rejects(f.sessions.verifyEmailCode(EMAIL, '00123456', { clientKey: 'ip-g' }), hasStatus(429));
  assert.equal(f.calls.length, before);
  f.time += 15 * 60_000 + 1;
  assert.equal((await f.second.requestEmailCode(EMAIL)).accepted, true);
});

test('email-code requests respect client and global budgets before provider calls', async t => {
  const f = await fixture(t);
  for (let i = 0; i < 10; i++) await f.sessions.requestEmailCode(`member${i}@example.test`, { clientKey: 'one-client' });
  await assert.rejects(f.sessions.requestEmailCode('another@example.test', { clientKey: 'one-client' }), hasStatus(429));
  for (let i = 10; i < 60; i++) await f.sessions.requestEmailCode(`member${i}@example.test`, { clientKey: `client-${i}` });
  await assert.rejects(f.sessions.requestEmailCode('last@example.test', { clientKey: 'last' }), hasStatus(429));
  assert.equal(f.calls.length, 60);
});

test('only four email requests may call the provider concurrently', async t => {
  const f = await fixture(t); const releases = [];
  f.handler = () => new Promise(resolve => releases.push(() => resolve(json({}))));
  const pending = Array.from({ length: 4 }, (_, i) => f.sessions.requestEmailCode(`member${i}@example.test`));
  await assert.rejects(f.sessions.requestEmailCode('fifth@example.test'), hasStatus(429));
  releases.forEach(release => release()); await Promise.all(pending);
  assert.equal(f.calls.length, 4);
});
