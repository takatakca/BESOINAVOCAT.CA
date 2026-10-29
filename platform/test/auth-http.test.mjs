import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';
import { createBrowserSessions } from '../lib/browser-session.mjs';

const ORIGIN = 'https://portal.example.test';
const SUBJECT = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const PASSWORD = 'SYNTHETIC_PASSWORD_ONLY';
const alice = { subject: SUBJECT, tenantId: 'synthetic-a', product: 'besoinavocat', active: true };
const bob = { subject: OTHER, tenantId: 'synthetic-b', product: 'besoinavocat', active: true };
const csrf = { Origin: ORIGIN, 'X-Requested-With': 'XMLHttpRequest' };
const providerJson = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

test('cookie-authenticated communication writes require the same origin and AJAX guard', async t => {
  const f = await fixture(t);
  const signedIn = await f.login();
  const item = f.app.store.createCase(alice, { title: 'Synthetic communications', reference: 'TEST' });
  f.app.store.provisionMembership({ tenantId: alice.tenantId, caseId: item.id, subject: alice.subject, role: 'owner' });
  const route = `/api/cases/${item.id}/communications`;
  const body = { kind: 'phone', title: 'Synthetic appointment', scheduledAt: '2026-11-01T14:00:00Z' };
  const key = { 'Idempotency-Key': 'synthetic-cookie-0001' };
  for (const headers of [key, { ...key, Origin: ORIGIN }, { ...key, ...csrf, Origin: 'https://attacker.example.test' }]) {
    assert.equal((await f.request(route, { method: 'POST', body, cookie: signedIn.cookie, headers })).status, 403);
  }
  const added = await f.request(route, { method: 'POST', body, cookie: signedIn.cookie, headers: { ...key, ...csrf } });
  assert.equal(added.status, 201, added.text);
  const start = `${route}/${added.json.session.id}/start`;
  assert.equal((await f.request(start, { method: 'POST', body: {}, cookie: signedIn.cookie })).status, 403);
  assert.equal((await f.request(start, { method: 'POST', body: {}, cookie: signedIn.cookie, headers: csrf })).status, 200);
});

async function fixture(t, { configured = true, emailCodeEnabled = false } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'ba-auth-http-'));
  const grantsFile = path.join(directory, 'grants.json');
  const grants = { version: 1, grants: {
    [SUBJECT]: { tenantId: alice.tenantId, product: 'besoinavocat', active: true },
    [OTHER]: { tenantId: bob.tenantId, product: 'besoinavocat', active: true },
  } };
  const saveGrants = () => writeFile(grantsFile, JSON.stringify(grants), { mode: 0o600 });
  await saveGrants();
  let calls = 0;
  let time = Date.parse('2026-10-26T12:00:00Z');
  const config = configured ? { supabaseUrl: 'https://auth.example.test', publishableKey: 'sb_publishable_SYNTHETIC_NOT_A_REAL_KEY', appOrigin: ORIGIN, grantsFile, emailCodeEnabled } : null;
  const sessions = createBrowserSessions({ config, now: () => time, fetchImpl: async (url, options) => {
    calls++;
    if (url.endsWith('/otp')) {
      assert.equal(JSON.parse(options.body).create_user, false);
      return providerJson({});
    }
    if (url.endsWith('/verify')) {
      const body = JSON.parse(options.body);
      assert.equal(body.type, 'email');
      if (body.token !== '00123456' || body.email !== 'alice@example.test') return providerJson({ error: 'private wrong code' }, 403);
      return providerJson({ access_token: `SYNTHETIC_ACCESS_${SUBJECT}`, token_type: 'bearer', expires_in: 3600, user: { id: SUBJECT } });
    }
    if (url.includes('/token?')) {
      const body = JSON.parse(options.body);
      if (body.password !== PASSWORD || !['alice@example.test', 'bob@example.test'].includes(body.email)) return providerJson({ error: 'synthetic provider diagnostic, never public' }, 400);
      const id = body.email.startsWith('alice') ? SUBJECT : OTHER;
      return providerJson({ access_token: `SYNTHETIC_ACCESS_${id}`, refresh_token: 'SYNTHETIC_REFRESH', token_type: 'bearer', expires_in: 3600, user: { id } });
    }
    const id = options.headers.Authorization.slice('Bearer SYNTHETIC_ACCESS_'.length);
    return providerJson({ id, email: id === SUBJECT ? 'alice@example.test' : 'bob@example.test', email_confirmed_at: '2026-01-01T00:00:00Z', user_metadata: { role: 'owner', tenantId: 'forged' } });
  } });
  const app = createApp({ dbPath: path.join(directory, 'data.sqlite'), blobDir: path.join(directory, 'blobs'), browserSessions: sessions, env: {},
    authenticate: async token => token === 'synthetic-legacy' ? alice : null });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  const base = `http://127.0.0.1:${app.address().port}`;
  t.after(async () => {
    if (app.listening) await new Promise((resolve, reject) => app.close(error => error ? reject(error) : resolve()));
    else app.dispose();
    assert.equal(path.dirname(directory), path.resolve(tmpdir()));
    assert.match(path.basename(directory), /^ba-auth-http-/);
    await rm(directory, { recursive: true, force: true });
  });
  async function request(route, { method = 'GET', body, headers = {}, cookie, raw } = {}) {
    const outgoing = { ...headers };
    if (cookie) outgoing.Cookie = cookie;
    if (body !== undefined || raw !== undefined) outgoing['Content-Type'] = 'application/json';
    const response = await fetch(base + route, { method, headers: outgoing, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
    const text = await response.text();
    return { status: response.status, headers: response.headers, text,
      json: /^application\/json/.test(response.headers.get('content-type') ?? '') ? JSON.parse(text) : null,
      cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }
  async function login(email = 'alice@example.test', cookie) {
    const result = await request('/api/auth/login', { method: 'POST', headers: csrf, cookie, body: { email, password: PASSWORD } });
    assert.equal(result.status, 200, result.text);
    assert.ok(result.cookie);
    return result;
  }
  return { app, request, login, sessions, grants, grantsFile, directory, saveGrants, callCount: () => calls, advance: ms => { time += ms; } };
}

test('browser login configuration is reported separately and an unconfigured login fails closed', async t => {
  const f = await fixture(t);
  const health = (await f.request('/api/health')).json;
  assert.equal(health.loginConfigured, true);
  assert.equal(health.identityConfigured, false);
  const unavailable = await fixture(t, { configured: false });
  assert.equal((await unavailable.request('/api/health')).json.loginConfigured, false);
  assert.equal((await unavailable.request('/api/auth/login', { method: 'POST', headers: csrf, body: { email: 'alice@example.test', password: PASSWORD } })).status, 403);
  assert.equal(unavailable.callCount(), 0);
  assert.equal((await unavailable.request('/api/me')).status, 401);
});

test('createApp reads both authentication configurations from its injected environment', async t => {
  const f = await fixture(t);
  const env = { TAKATAK_SUPABASE_URL: 'https://auth.example.test', TAKATAK_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_SYNTHETIC_NOT_A_REAL_KEY',
    BESOINAVOCAT_GRANTS_FILE: f.grantsFile, APP_ORIGIN: ORIGIN,
    TAKATAK_IDENTITY_URL: 'https://identity.example.test/introspect', TAKATAK_SERVICE_TOKEN: 'SYNTHETIC_SERVICE_ONLY' };
  const app = createApp({ dbPath: ':memory:', blobDir: path.join(f.directory, 'env-blobs'), env });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${app.address().port}/api/health`);
    assert.deepEqual(await response.json(), { status: 'ok', mode: 'pilot', identityConfigured: true, loginConfigured: true, emailCodeConfigured: false, intakeConfigured: false });
  } finally { await new Promise((resolve, reject) => app.close(error => error ? reject(error) : resolve())); }
});

test('login requires exact Origin and X-Requested-With before any provider call', async t => {
  const f = await fixture(t);
  for (const headers of [{}, { Origin: ORIGIN }, { 'X-Requested-With': 'XMLHttpRequest' }, { ...csrf, Origin: 'https://evil.example.test' }, { ...csrf, Origin: 'null' }, { ...csrf, 'X-Requested-With': 'fetch' }]) {
    const result = await f.request('/api/auth/login', { method: 'POST', headers, body: { email: 'alice@example.test', password: PASSWORD } });
    assert.equal(result.status, 403);
    assert.equal(result.headers.has('set-cookie'), false);
  }
  assert.equal(f.callCount(), 0);
  assert.equal((await f.request('/api/auth/login')).status, 405);
  assert.equal((await f.request('/api/auth/login?email=anything', { method: 'POST', headers: csrf, body: {} })).status, 400);
});

test('login input is bounded and strict; failures do not echo credentials or provider diagnostics', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/auth/login', { method: 'POST', headers: csrf, body: { email: 'alice@example.test', password: PASSWORD, role: 'owner' } })).status, 400);
  assert.equal((await f.request('/api/auth/login', { method: 'POST', headers: csrf, raw: JSON.stringify({ email: 'alice@example.test', password: 'x'.repeat(4096) }) })).status, 413);
  assert.equal(f.callCount(), 0);
  const failed = await f.request('/api/auth/login', { method: 'POST', headers: csrf, body: { email: 'alice@example.test', password: 'WRONG_SYNTHETIC_PASSWORD' } });
  assert.equal(failed.status, 401);
  assert.doesNotMatch(failed.text, /alice@example|PASSWORD|provider diagnostic|SYNTHETIC_ACCESS/);
  assert.equal(failed.headers.has('set-cookie'), false);
});

test('login returns identity and expiry only, using an opaque Secure HttpOnly Strict cookie', async t => {
  const f = await fixture(t);
  const login = await f.login();
  assert.deepEqual(Object.keys(login.json).sort(), ['expiresAt', 'user']);
  assert.deepEqual(login.json.user, alice);
  assert.equal(login.json.expiresAt, '2026-10-26T13:00:00.000Z');
  assert.match(login.headers.get('set-cookie'), /^__Host-ba_session=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600$/);
  assert.equal(login.headers.get('cache-control'), 'no-store');
  assert.doesNotMatch(login.text, /SYNTHETIC_ACCESS|SYNTHETIC_REFRESH|PASSWORD|setCookie|forged|owner/);
  assert.deepEqual((await f.request('/api/me', { cookie: login.cookie })).json.user, alice);
});

test('ambiguous cookie and Bearer credentials are rejected, including browser auth routes', async t => {
  const f = await fixture(t);
  const login = await f.login();
  for (const route of ['/api/me', '/api/cases', '/api/auth/logout']) {
    const result = await f.request(route, { cookie: login.cookie, headers: { ...csrf, Authorization: 'Bearer synthetic-legacy' }, ...(route.endsWith('/logout') ? { method: 'POST', body: {} } : {}) });
    assert.equal(result.status, 400);
    assert.equal(result.json.error.code, 'AMBIGUOUS_AUTHENTICATION');
  }
  assert.equal((await f.request('/api/me', { cookie: login.cookie + '; ' + login.cookie })).status, 401);
  assert.equal((await f.request('/api/me', { cookie: login.cookie.replace('=', ' ='), headers: { Authorization: 'Bearer synthetic-legacy' } })).status, 400);
  assert.equal((await f.request('/api/me', { cookie: '__Host-ba_session=invented' })).status, 401);
  assert.equal((await f.request('/api/auth/login', { method: 'POST', headers: { ...csrf, Authorization: 'Bearer synthetic-legacy' }, body: {} })).status, 400);
});

test('cookie mutations enforce CSRF while legacy Bearer APIs remain independent', async t => {
  const f = await fixture(t);
  const login = await f.login();
  const before = f.callCount();
  for (const headers of [{}, { ...csrf, Origin: 'https://evil.example.test' }]) {
    assert.equal((await f.request('/api/cases', { method: 'POST', cookie: login.cookie, headers, body: { title: 'Synthetic blocked case' } })).status, 403);
  }
  assert.equal(f.callCount(), before);
  assert.equal(f.app.store.db.prepare('SELECT COUNT(*) AS n FROM cases').get().n, 0);
  const created = await f.request('/api/cases', { method: 'POST', cookie: login.cookie, headers: csrf, body: { title: 'Synthetic cookie case' } });
  assert.equal(created.status, 201);
  assert.equal(created.json.case.role, 'client');
  const legacy = await f.request('/api/cases', { method: 'POST', headers: { Authorization: 'Bearer synthetic-legacy' }, body: { title: 'Synthetic legacy case' } });
  assert.equal(legacy.status, 201);
  assert.equal((await f.request('/api/cases', { cookie: login.cookie })).json.cases.length, 2);
});

test('cookie identities preserve tenant isolation and reread local product grants', async t => {
  const f = await fixture(t);
  const first = await f.login();
  const second = await f.login('bob@example.test');
  const created = await f.request('/api/cases', { method: 'POST', cookie: first.cookie, headers: csrf, body: { title: 'Synthetic private case' } });
  const caseId = created.json.case.id;
  assert.deepEqual((await f.request('/api/cases', { cookie: second.cookie })).json.cases, []);
  assert.equal((await f.request(`/api/cases/${caseId}`, { cookie: second.cookie })).status, 404);
  f.grants.grants[SUBJECT].active = false;
  await f.saveGrants();
  assert.equal((await f.request('/api/me', { cookie: first.cookie })).status, 403);
  assert.equal((await f.request('/api/me', { cookie: first.cookie })).status, 401);
});

test('logout requires CSRF, clears server state and cookie, and remains idempotent', async t => {
  const f = await fixture(t);
  const login = await f.login();
  assert.equal((await f.request('/api/auth/logout', { method: 'POST', cookie: login.cookie, body: {} })).status, 403);
  assert.equal((await f.request('/api/me', { cookie: login.cookie })).status, 200);
  const out = await f.request('/api/auth/logout', { method: 'POST', cookie: login.cookie, headers: csrf, body: {} });
  assert.deepEqual(out.json, { loggedOut: true });
  assert.match(out.headers.get('set-cookie'), /^__Host-ba_session=; Path=\/; HttpOnly; Secure; SameSite=Strict; Max-Age=0$/);
  assert.equal((await f.request('/api/me', { cookie: login.cookie })).status, 401);
  assert.equal((await f.request('/api/auth/logout', { method: 'POST', headers: csrf, body: {} })).status, 200);
});

test('a replacement login rotates the browser session and expiry fails closed', async t => {
  const f = await fixture(t);
  const first = await f.login();
  const replacement = await f.login('alice@example.test', first.cookie);
  assert.notEqual(first.cookie, replacement.cookie);
  assert.equal((await f.request('/api/me', { cookie: first.cookie })).status, 401);
  assert.equal((await f.request('/api/me', { cookie: replacement.cookie })).status, 200);
  f.advance(3600001);
  assert.equal((await f.request('/api/me', { cookie: replacement.cookie })).status, 401);
});

test('closing the HTTP app clears browser session state', async t => {
  const f = await fixture(t);
  const login = await f.login();
  await new Promise((resolve, reject) => f.app.close(error => error ? reject(error) : resolve()));
  await assert.rejects(f.sessions.resolve(login.cookie), error => error.status === 401);
});

test('the shipped browser auth has no token storage, posts logout, and guards demo before any API', async () => {
  const code = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(code, /localStorage|sessionStorage|state\.token|Authorization\s*:/);
  assert.match(code, /credentials: 'same-origin'/);
  assert.match(code, /'X-Requested-With': 'XMLHttpRequest'/);
  assert.match(code, /api\('\/api\/auth\/logout', \{ method: 'POST'/);
  assert.match(code, /if \(state\.demo\).*throw new Error\('L’aperçu/);
  assert.match(code, /if \(state\.demo\) \{ examples = demoData\(\).*return; \}/);
  assert.ok(code.indexOf('if (state.demo) { examples = demoData();') < code.indexOf('state.health = await publicHealth();'));
  assert.match(code, /state\.health\?\.loginConfigured === true/);
  assert.match(code, /form\.elements\.password\.value = ''/);
});

test('email code routes remain disabled until explicitly activated, with truthful health', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/health')).json.emailCodeConfigured, false);
  for (const route of ['/api/auth/email/request', '/api/auth/email/verify']) {
    const result = await f.request(route, { method: 'POST', headers: csrf, body: { email: 'alice@example.test', code: '00123456' } });
    assert.equal(result.status, 503); assert.equal(result.headers.has('set-cookie'), false);
  }
  assert.equal(f.callCount(), 0);
});

test('email request and verification require POST, exact origin and strict bounded bodies', async t => {
  const f = await fixture(t, { emailCodeEnabled: true });
  assert.equal((await f.request('/api/health')).json.emailCodeConfigured, true);
  for (const route of ['/api/auth/email/request', '/api/auth/email/verify']) {
    for (const headers of [{}, { Origin: ORIGIN }, { ...csrf, Origin: 'https://evil.example.test' }]) {
      assert.equal((await f.request(route, { method: 'POST', headers, body: {} })).status, 403);
    }
    assert.equal((await f.request(route)).status, 405);
    assert.equal((await f.request(route + '?code=000000', { method: 'POST', headers: csrf, body: {} })).status, 400);
    assert.equal((await f.request(route, { method: 'POST', headers: { ...csrf, Authorization: 'Bearer synthetic-legacy' }, body: {} })).status, 400);
    assert.equal((await f.request(route, { method: 'POST', headers: csrf, body: { email: 'alice@example.test', create_user: true } })).status, 400);
    assert.equal((await f.request(route, { method: 'POST', headers: csrf, raw: JSON.stringify({ email: 'x'.repeat(1100) }) })).status, 413);
  }
  assert.equal(f.callCount(), 0);
});

test('request does not sign in; wrong code stays private; successful verification rotates a granted session', async t => {
  const f = await fixture(t, { emailCodeEnabled: true });
  const old = await f.login();
  const request = await f.request('/api/auth/email/request', { method: 'POST', headers: csrf, cookie: old.cookie, body: { email: 'alice@example.test' } });
  assert.equal(request.status, 200); assert.equal(request.json.accepted, true);
  assert.equal(request.headers.has('set-cookie'), false); assert.equal(request.headers.get('cache-control'), 'no-store');
  assert.equal((await f.request('/api/me')).status, 401);
  const bad = await f.request('/api/auth/email/verify', { method: 'POST', headers: csrf, body: { email: 'alice@example.test', code: '00000000' } });
  assert.equal(bad.status, 401); assert.equal(bad.headers.has('set-cookie'), false);
  assert.doesNotMatch(bad.text, /private|alice@example|00000000/u);
  const good = await f.request('/api/auth/email/verify', { method: 'POST', headers: csrf, cookie: old.cookie, body: { email: 'alice@example.test', code: '00123456' } });
  assert.equal(good.status, 200, good.text); assert.deepEqual(good.json.user, alice);
  assert.deepEqual(Object.keys(good.json).sort(), ['expiresAt', 'user']);
  assert.match(good.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Strict/u);
  assert.doesNotMatch(good.text, /SYNTHETIC_ACCESS|00123456/u);
  assert.equal((await f.request('/api/me', { cookie: old.cookie })).status, 401);
  assert.equal((await f.request('/api/me', { cookie: good.cookie })).status, 200);
  f.grants.grants[SUBJECT].active = false; await f.saveGrants();
  const denied = await f.request('/api/auth/email/verify', { method: 'POST', headers: csrf, body: { email: 'alice@example.test', code: '00123456' } });
  assert.equal(denied.status, 403); assert.equal(denied.headers.has('set-cookie'), false);
});
