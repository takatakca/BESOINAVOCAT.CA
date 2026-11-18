// « Continuer avec Google » (PKCE côté serveur) : inscription avec consentement, connexion d'un compte existant,
// parcours à usage unique, refus sans consentement, rien d'activé sans BESOINAVOCAT_GOOGLE_SIGNIN_ENABLED=true.
// Fournisseur d'identité simulé; aucun compte Google réel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';

const ORIGIN = 'https://portal.example.test';
const TENANT = 'synthetic-tenant';
const OWNER = '11111111-1111-4111-8111-111111111111';
const CLIENT = '22222222-2222-4222-8222-222222222222';
const csrf = { Origin: ORIGIN, 'X-Requested-With': 'XMLHttpRequest' };
const providerJson = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

async function fixture(t, { enabled = true } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'ba-google-'));
  const grantsFile = path.join(directory, 'grants.json');
  await writeFile(grantsFile, JSON.stringify({ version: 1, grants: { [OWNER]: { tenantId: TENANT, product: 'besoinavocat', active: true } } }), { mode: 0o600 });
  const users = { [OWNER]: { email: 'owner@example.test', name: 'Propriétaire' }, [CLIENT]: { email: 'cliente@example.test', name: 'Cliente Google' } };
  // Codes d'autorisation remis par le « fournisseur » : code -> { subject, challenge attendu }.
  const provider = { codes: new Map(), exchanges: [] };
  const identityFetch = async (url, options) => {
    if (url.includes('/token?grant_type=pkce')) {
      const body = JSON.parse(options.body);
      provider.exchanges.push(body);
      const grant = provider.codes.get(body.auth_code);
      const challenge = createHash('sha256').update(body.code_verifier ?? '').digest('base64url');
      if (!grant || grant.challenge !== challenge) return providerJson({ error: 'private invalid grant' }, 400);
      provider.codes.delete(body.auth_code);
      return providerJson({ access_token: `SYNTHETIC_ACCESS_${grant.subject}`, refresh_token: 'SYNTHETIC_REFRESH', token_type: 'bearer', expires_in: 3600, user: { id: grant.subject } });
    }
    if (url.endsWith('/user')) {
      const subject = (options.headers.Authorization || '').replace('Bearer SYNTHETIC_ACCESS_', '');
      const user = users[subject];
      return user ? providerJson({ id: subject, email: user.email, email_confirmed_at: '2026-01-01T00:00:00Z', user_metadata: { full_name: user.name } }) : providerJson({ error: 'no' }, 401);
    }
    throw new Error(`Unexpected provider call ${url}`);
  };
  const env = { TAKATAK_SUPABASE_URL: 'https://auth.example.test', TAKATAK_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_SYNTHETIC_NOT_A_REAL_KEY', BESOINAVOCAT_GRANTS_FILE: grantsFile,
    APP_ORIGIN: ORIGIN, BESOINAVOCAT_LAWYER_TENANT: TENANT, ...(enabled ? { BESOINAVOCAT_GOOGLE_SIGNIN_ENABLED: 'true' } : {}) };
  const app = createApp({ dbPath: path.join(directory, 'db.sqlite'), blobDir: path.join(directory, 'blobs'), env, identityFetch,
    paymentsFetch: async () => { throw new Error('Stripe must not be called'); }, authenticate: async () => null, clock: () => Date.parse('2026-11-18T06:00:00Z') });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  const base = `http://127.0.0.1:${app.address().port}`;
  t.after(async () => { await new Promise(r => app.close(r)); await rm(directory, { recursive: true, force: true }); });
  async function request(route, { method = 'GET', body, cookie, headers = {} } = {}) {
    const h = { ...headers };
    if (body !== undefined) h['Content-Type'] = 'application/json';
    if (cookie) h.Cookie = cookie;
    const response = await fetch(base + route, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
    const text = await response.text();
    let json = null; try { json = JSON.parse(text); } catch { json = null; }
    return { status: response.status, json, text, headers: response.headers };
  }
  // Le navigateur part chez Google; le fournisseur simulé remet un code lié au challenge reçu.
  async function start(body) {
    const started = await request('/api/auth/google/start', { method: 'POST', headers: csrf, body });
    if (started.status !== 200) return { started };
    const location = new URL(started.json.location);
    const flowCookie = started.headers.get('set-cookie').split(';')[0];
    return { started, location, flowCookie };
  }
  function authorize(location, subject) {
    const code = `code-${subject.slice(0, 8)}-${provider.codes.size + provider.exchanges.length}`;
    provider.codes.set(code, { subject, challenge: location.searchParams.get('code_challenge') });
    return code;
  }
  return { request, start, authorize, provider };
}
const sessionCookie = response => response.headers.getSetCookie().find(value => value.startsWith('__Host-ba_session='))?.split(';')[0];

test('health announces Google only when explicitly enabled; start is refused otherwise', async t => {
  const off = await fixture(t, { enabled: false });
  const health = (await off.request('/api/health')).json;
  assert.equal(health.googleSignIn, false); assert.equal(health.clientSignup, false);
  assert.equal((await off.request('/api/auth/google/start', { method: 'POST', headers: csrf, body: { mode: 'login' } })).status, 503);
  const callback = await off.request('/auth/callback?code=abcdefgh1234');
  assert.equal(callback.status, 303); assert.equal(callback.headers.get('location'), '/?google=indisponible');
  const on = await fixture(t);
  const ready = (await on.request('/api/health')).json;
  assert.equal(ready.googleSignIn, true); assert.equal(ready.clientSignup, true);
});

test('start keeps the PKCE verifier on the server and requires consent and the origin guard for a signup', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/auth/google/start', { method: 'POST', body: { mode: 'login' } })).status, 403, 'origin guard');
  assert.equal((await f.request('/api/auth/google/start', { method: 'POST', headers: csrf, body: { mode: 'signup', name: 'X' } })).status, 400, 'consent required');
  assert.equal((await f.request('/api/auth/google/start', { method: 'POST', headers: csrf, body: { mode: 'admin' } })).status, 400);
  assert.equal((await f.request('/api/auth/google/start', { method: 'POST', headers: csrf, body: { mode: 'login', extra: 1 } })).status, 400);
  const { started, location, flowCookie } = await f.start({ mode: 'signup', name: 'Personne', consent: true });
  assert.deepEqual(Object.keys(started.json), ['location']);
  assert.equal(location.origin, 'https://auth.example.test');
  assert.equal(location.pathname, '/auth/v1/authorize');
  assert.equal(location.searchParams.get('provider'), 'google');
  assert.equal(location.searchParams.get('redirect_to'), `${ORIGIN}/auth/callback`);
  assert.equal(location.searchParams.get('code_challenge_method'), 's256');
  assert.match(location.searchParams.get('code_challenge'), /^[A-Za-z0-9_-]{43}$/u);
  assert.match(flowCookie, /^__Host-ba_oauth=[A-Za-z0-9_-]{43}$/u);
  const attributes = started.headers.get('set-cookie');
  for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/', 'Max-Age=600']) assert.ok(attributes.includes(attribute), attribute);
  assert.doesNotMatch(started.text, /verifier/u);
});

test('a person creates their dashboard with Google, then signs in again with Google; each flow is single use', async t => {
  const f = await fixture(t);
  const { location, flowCookie } = await f.start({ mode: 'signup', name: 'Personne Google', consent: true });
  const code = f.authorize(location, CLIENT);
  const back = await f.request(`/auth/callback?code=${code}`, { cookie: flowCookie });
  assert.equal(back.status, 303, back.text);
  assert.equal(back.headers.get('location'), '/?google=connecte');
  const cookie = sessionCookie(back);
  assert.ok(cookie, 'session cookie');
  assert.ok(back.headers.getSetCookie().some(value => value.startsWith('__Host-ba_oauth=;') && value.includes('Max-Age=0')), 'flow cookie cleared');
  assert.equal(f.provider.exchanges.at(-1).auth_code, code);
  const me = await f.request('/api/me', { cookie });
  assert.equal(me.status, 200, me.text);
  // Le même parcours ne peut pas servir deux fois.
  const replay = await f.request(`/auth/callback?code=${code}`, { cookie: flowCookie });
  assert.equal(replay.headers.get('location'), '/?google=erreur');
  assert.equal(sessionCookie(replay), undefined);
  // Connexion suivante sans inscription : le compte client existe déjà.
  const again = await f.start({ mode: 'login' });
  const second = await f.request(`/auth/callback?code=${f.authorize(again.location, CLIENT)}`, { cookie: again.flowCookie });
  assert.equal(second.headers.get('location'), '/?google=connecte');
  assert.ok(sessionCookie(second));
});

test('a Google login without a dashboard is sent to the signup screen; the owner grant still works', async t => {
  const f = await fixture(t);
  const stranger = await f.start({ mode: 'login' });
  const refused = await f.request(`/auth/callback?code=${f.authorize(stranger.location, CLIENT)}`, { cookie: stranger.flowCookie });
  assert.equal(refused.headers.get('location'), '/?signup=1&google=nouveau');
  assert.equal(sessionCookie(refused), undefined);
  const owner = await f.start({ mode: 'login' });
  const ok = await f.request(`/auth/callback?code=${f.authorize(owner.location, OWNER)}`, { cookie: owner.flowCookie });
  assert.equal(ok.headers.get('location'), '/?google=connecte');
  assert.ok(sessionCookie(ok));
});

test('callback without the flow cookie, with a provider error or a wrong verifier opens no session', async t => {
  const f = await fixture(t);
  const flow = await f.start({ mode: 'login' });
  const code = f.authorize(flow.location, OWNER);
  assert.equal((await f.request(`/auth/callback?code=${code}`)).headers.get('location'), '/?google=erreur', 'no flow cookie');
  assert.equal((await f.request('/auth/callback?error=access_denied&error_description=private', { cookie: flow.flowCookie })).headers.get('location'), '/?google=annule');
  const other = await f.start({ mode: 'login' });
  f.provider.codes.set('code-mismatch-1', { subject: OWNER, challenge: 'not-the-challenge' });
  const mismatch = await f.request('/auth/callback?code=code-mismatch-1', { cookie: other.flowCookie });
  assert.equal(mismatch.headers.get('location'), '/?google=erreur');
  assert.equal(sessionCookie(mismatch), undefined);
  assert.equal((await f.request('/auth/callback?code=x', { method: 'POST' })).status, 405);
});
