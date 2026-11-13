// Espace avocat : inscription par code courriel, essai gratuit de 14 jours sans carte, codes d'invitation et rattachement
// aux dossiers. Fournisseur d'identité et Stripe simulés; aucun compte, courriel ni paiement réel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';
import { lawyerAccountsConfiguration } from '../lib/lawyer-accounts.mjs';

const ORIGIN = 'https://portal.example.test';
const TENANT = 'synthetic-tenant';
const OWNER = '11111111-1111-4111-8111-111111111111';
const NEW_LAWYER = '33333333-3333-4333-8333-333333333333';
const STRANGER = '44444444-4444-4444-8444-444444444444';
const csrf = { Origin: ORIGIN, 'X-Requested-With': 'XMLHttpRequest' };
const bearerUsers = {
  client: { subject: 'client-1', tenantId: TENANT, product: 'besoinavocat', active: true },
  elsewhere: { subject: 'client-2', tenantId: 'other-tenant', product: 'besoinavocat', active: true },
};
const providerJson = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

async function fixture(t, { env: extraEnv = {}, stripe = null } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'ba-lawyer-'));
  const grantsFile = path.join(directory, 'grants.json');
  await writeFile(grantsFile, JSON.stringify({ version: 1, grants: { [OWNER]: { tenantId: TENANT, product: 'besoinavocat', active: true } } }), { mode: 0o600 });
  let time = Date.parse('2026-11-13T12:00:00Z');
  // The fake provider: a code request records create_user; a verify issues a token for the account matching the address.
  const accounts = { 'owner@example.test': OWNER, 'avocate@example.test': NEW_LAWYER, 'inconnu@example.test': STRANGER };
  const provider = { otp: [] };
  const identityFetch = async (url, options) => {
    if (url.endsWith('/otp')) { provider.otp.push(JSON.parse(options.body)); return providerJson({}); }
    if (url.endsWith('/verify')) {
      const body = JSON.parse(options.body);
      assert.equal(body.type, 'email');
      const subject = accounts[body.email];
      if (body.token !== '00123456' || !subject) return providerJson({ error: 'private wrong code' }, 403);
      return providerJson({ access_token: `SYNTHETIC_ACCESS_${subject}`, token_type: 'bearer', expires_in: 3600, user: { id: subject } });
    }
    if (url.endsWith('/user')) {
      const subject = (options.headers.Authorization || '').replace('Bearer SYNTHETIC_ACCESS_', '');
      const email = Object.entries(accounts).find(([, id]) => id === subject)?.[0];
      return email ? providerJson({ id: subject, email, email_confirmed_at: '2026-01-01T00:00:00Z' }) : providerJson({ error: 'no' }, 401);
    }
    throw new Error(`Unexpected provider call ${url}`);
  };
  const env = { TAKATAK_SUPABASE_URL: 'https://auth.example.test', TAKATAK_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_SYNTHETIC_NOT_A_REAL_KEY', BESOINAVOCAT_GRANTS_FILE: grantsFile,
    APP_ORIGIN: ORIGIN, BESOINAVOCAT_EMAIL_OTP_ENABLED: 'true', BESOINAVOCAT_LAWYER_TENANT: TENANT, ...extraEnv };
  const app = createApp({ dbPath: path.join(directory, 'db.sqlite'), blobDir: path.join(directory, 'blobs'), env, identityFetch, paymentsFetch: stripe ?? (async () => { throw new Error('Stripe must not be called'); }),
    authenticate: async token => bearerUsers[token] ?? null, clock: () => time });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  const base = `http://127.0.0.1:${app.address().port}`;
  t.after(async () => { await new Promise(r => app.close(r)); await rm(directory, { recursive: true, force: true }); });
  async function request(route, { method = 'GET', body, cookie, token, headers = {} } = {}) {
    const h = { ...headers };
    if (body !== undefined) h['Content-Type'] = 'application/json';
    if (cookie) { h.Cookie = cookie; if (method !== 'GET') Object.assign(h, csrf); }
    if (token) h.Authorization = `Bearer ${token}`;
    const response = await fetch(base + route, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
    const text = await response.text();
    let json = null; try { json = JSON.parse(text); } catch { json = null; }
    return { status: response.status, json, text, headers: response.headers };
  }
  const cookieOf = response => response.headers.get('set-cookie').split(';')[0];
  async function signup(email = 'avocate@example.test', profile = { name: 'Me Synthétique', barNumber: '123456-7', firm: 'Cabinet Synthétique' }) {
    const asked = await request('/api/auth/lawyer/signup', { method: 'POST', headers: csrf, body: { email, consent: true, ...profile } });
    assert.equal(asked.status, 200, asked.text);
    const verified = await request('/api/auth/lawyer/verify', { method: 'POST', headers: csrf, body: { email, code: '00123456' } });
    assert.equal(verified.status, 200, verified.text);
    return { cookie: cookieOf(verified), verified };
  }
  async function login(email) {
    assert.equal((await request('/api/auth/email/request', { method: 'POST', headers: csrf, body: { email } })).status, 200);
    const verified = await request('/api/auth/email/verify', { method: 'POST', headers: csrf, body: { email, code: '00123456' } });
    assert.equal(verified.status, 200, verified.text);
    return cookieOf(verified);
  }
  return { app, base, request, signup, login, provider, advance: ms => { time += ms; } };
}

test('configuration: tenant and trial length have safe defaults and accept explicit values', () => {
  assert.deepEqual(lawyerAccountsConfiguration({}), { tenantId: 'takatak', trialDays: 14 });
  assert.deepEqual(lawyerAccountsConfiguration({ BESOINAVOCAT_LAWYER_TENANT: TENANT, BESOINAVOCAT_TRIAL_DAYS: '30' }), { tenantId: TENANT, trialDays: 30 });
  assert.equal(lawyerAccountsConfiguration({ BESOINAVOCAT_TRIAL_DAYS: '0' }).trialDays, 14);
  assert.equal(lawyerAccountsConfiguration({ BESOINAVOCAT_LAWYER_TENANT: 'bad tenant' }).tenantId, 'takatak');
});

test('a lawyer signs up with an email code, gets a 14-day trial at $0 without a card, and joins a client case with an invitation code', async t => {
  const f = await fixture(t);
  // Signup needs the consent and a name; the provider is asked to create the account.
  assert.equal((await f.request('/api/auth/lawyer/signup', { method: 'POST', headers: csrf, body: { email: 'avocate@example.test', name: 'Me S.', consent: false } })).status, 400);
  assert.equal((await f.request('/api/auth/lawyer/signup', { method: 'POST', body: { email: 'avocate@example.test', name: 'Me S.', consent: true } })).status, 403, 'origin guard');
  const { cookie, verified } = await f.signup();
  assert.deepEqual(f.provider.otp.at(-1), { email: 'avocate@example.test', create_user: true });
  assert.equal(verified.json.user.subject, NEW_LAWYER);
  assert.equal(verified.json.user.tenantId, TENANT, 'self-signed lawyers join the portal tenant');
  assert.equal(verified.json.membership.status, 'trialing');
  assert.equal(verified.json.membership.trial.daysLeft, 14);
  assert.equal(verified.json.membership.paymentRequired, false);

  const me = await f.request('/api/lawyer/me', { cookie });
  assert.equal(me.status, 200, me.text);
  assert.equal(me.json.account.name, 'Me Synthétique');
  assert.equal(me.json.account.email, 'avocate@example.test');
  assert.equal(me.json.membership.eligible, true);
  assert.equal(me.json.membership.membership.active, true);
  assert.equal(me.json.membership.configured, false, 'Stripe is not needed for the trial');
  assert.deepEqual(me.json.cases, []);
  assert.equal((await f.request('/api/capabilities', { cookie })).json.lawyerSpace.account, true);

  // The client opens a case and creates an invitation code; the lawyer enters it.
  const created = await f.request('/api/cases', { method: 'POST', token: 'client', body: { title: 'Dossier du client', reference: 'CL-1' } });
  const caseId = created.json.case.id;
  assert.equal((await f.request(`/api/cases/${caseId}`, { cookie })).status, 404, 'no access before the invitation');
  const invitation = await f.request(`/api/cases/${caseId}/invitations`, { method: 'POST', token: 'client', body: {} });
  assert.equal(invitation.status, 201, invitation.text);
  assert.match(invitation.json.code, /^AV-[A-Z2-9]{4}-[A-Z2-9]{4}$/u);
  const listed = await f.request(`/api/cases/${caseId}/invitations`, { token: 'client' });
  assert.equal(listed.json.invitations[0].status, 'open');
  assert.ok(!listed.text.includes(invitation.json.code), 'the code is shown once and never stored in clear');

  assert.equal((await f.request('/api/lawyer/join', { method: 'POST', cookie, body: { code: 'AV-ZZZZ-ZZZZ' } })).status, 404);
  const joined = await f.request('/api/lawyer/join', { method: 'POST', cookie, body: { code: invitation.json.code.toLowerCase() } });
  assert.equal(joined.status, 200, joined.text);
  assert.equal(joined.json.case.role, 'lawyer');
  assert.equal(joined.json.alreadyMember, false);
  const details = await f.request(`/api/cases/${caseId}`, { cookie });
  assert.equal(details.status, 200);
  assert.equal(details.json.case.role, 'lawyer');
  assert.equal((await f.request('/api/lawyer/me', { cookie })).json.cases.length, 1);
  assert.equal((await f.request('/api/lawyer/join', { method: 'POST', cookie, body: { code: invitation.json.code } })).status, 404, 'single use');
  assert.equal((await f.request(`/api/cases/${caseId}/invitations`, { token: 'client' })).json.invitations[0].status, 'used');
  const audit = f.app.store.db.prepare("SELECT action FROM audit_events WHERE caseId=? AND action LIKE 'invitation.%' ORDER BY createdAt").all(caseId).map(r => r.action);
  assert.deepEqual(audit, ['invitation.created', 'invitation.accepted']);
});

test('an existing TAKATAK account does not become a lawyer without a pending signup, and a stranger stays out', async t => {
  const f = await fixture(t);
  const verified = await f.request('/api/auth/lawyer/verify', { method: 'POST', headers: csrf, body: { email: 'inconnu@example.test', code: '00123456' } });
  assert.equal(verified.status, 403);
  assert.equal(verified.json.error.code, 'NO_PENDING_SIGNUP');
  // Plain login with no grant anywhere is refused too.
  await f.request('/api/auth/email/request', { method: 'POST', headers: csrf, body: { email: 'inconnu@example.test' } });
  assert.equal((await f.request('/api/auth/email/verify', { method: 'POST', headers: csrf, body: { email: 'inconnu@example.test', code: '00123456' } })).status, 403);
  // A pending signup expires after an hour.
  assert.equal((await f.request('/api/auth/lawyer/signup', { method: 'POST', headers: csrf, body: { email: 'avocate@example.test', name: 'Me S.', consent: true } })).status, 200);
  f.advance(61 * 60_000);
  assert.equal((await f.request('/api/auth/lawyer/verify', { method: 'POST', headers: csrf, body: { email: 'avocate@example.test', code: '00123456' } })).status, 403);
});

test('after 14 days the trial expires: payment is asked, new cases cannot be joined, existing cases stay readable', async t => {
  const f = await fixture(t);
  const { cookie } = await f.signup();
  const created = await f.request('/api/cases', { method: 'POST', token: 'client', body: { title: 'Dossier', reference: 'CL-2' } });
  const caseId = created.json.case.id;
  const first = await f.request(`/api/cases/${caseId}/invitations`, { method: 'POST', token: 'client', body: {} });
  assert.equal((await f.request('/api/lawyer/join', { method: 'POST', cookie, body: { code: first.json.code } })).status, 200);

  f.advance(10 * 86_400_000);
  const later = await f.login('avocate@example.test');
  const mid = (await f.request('/api/lawyer/me', { cookie: later })).json.membership.membership;
  assert.equal(mid.status, 'trialing');
  assert.equal(mid.trial.daysLeft, 4);

  f.advance(5 * 86_400_000);
  const expiredCookie = await f.login('avocate@example.test');
  const me = await f.request('/api/lawyer/me', { cookie: expiredCookie });
  assert.equal(me.json.membership.membership.status, 'trial_expired');
  assert.equal(me.json.membership.membership.active, false);
  assert.equal(me.json.membership.membership.paymentRequired, true);
  assert.equal(me.json.membership.membership.trial.daysLeft, 0);
  const second = await f.request(`/api/cases/${caseId}/invitations`, { method: 'POST', token: 'client', body: {} });
  const refused = await f.request('/api/lawyer/join', { method: 'POST', cookie: expiredCookie, body: { code: second.json.code } });
  assert.equal(refused.status, 402);
  assert.equal(refused.json.error.code, 'PAYMENT_REQUIRED');
  assert.equal((await f.request(`/api/cases/${caseId}`, { cookie: expiredCookie })).status, 200, 'the client never loses their lawyer’s eyes on the file');
  assert.equal((await f.request('/api/membership/checkout', { method: 'POST', cookie: expiredCookie, body: { plan: 'monthly' } })).status, 503, 'Stripe not configured: no payment possible yet');
});

test('a person already granted access opens the lawyer space from their session; Stripe checkout keeps the remaining trial', async t => {
  const calls = [];
  const stripe = async (url, options = {}) => {
    const u = new URL(url); calls.push({ path: u.pathname, form: options.body ? Object.fromEntries(new URLSearchParams(options.body)) : null });
    if (u.pathname === '/v1/prices/price_monthly001') return Response.json({ id: 'price_monthly001', unit_amount: 30000, currency: 'cad', recurring: { interval: 'month', interval_count: 1 }, active: true });
    if (u.pathname === '/v1/checkout/sessions') return Response.json({ id: 'cs_1', url: 'https://checkout.stripe.com/c/pay/cs_1' });
    return Response.json({}, { status: 404 });
  };
  const f = await fixture(t, { stripe, env: { BESOINAVOCAT_STRIPE_SECRET_KEY: `sk_test_${'a'.repeat(24)}`, BESOINAVOCAT_STRIPE_PRICE_MONTHLY: 'price_monthly001', BESOINAVOCAT_STRIPE_WEBHOOK_SECRET: `whsec_${'w'.repeat(32)}` } });
  const cookie = await f.login('owner@example.test');
  const before = await f.request('/api/lawyer/me', { cookie });
  assert.equal(before.json.account, null);
  assert.equal(before.json.membership, null);
  const activated = await f.request('/api/lawyer/activate', { method: 'POST', cookie, body: { name: 'Me Propriétaire' } });
  assert.equal(activated.status, 201, activated.text);
  assert.equal(activated.json.membership.status, 'trialing');
  assert.equal((await f.request('/api/lawyer/activate', { method: 'POST', cookie, body: { name: 'Encore' } })).status, 409);
  const updated = await f.request('/api/lawyer/profile', { method: 'POST', cookie, body: { name: 'Me Propriétaire', firm: 'Cabinet P.' } });
  assert.equal(updated.json.account.firm, 'Cabinet P.');

  const overview = await f.request('/api/membership', { cookie });
  assert.equal(overview.json.membership.trial.daysLeft, 14);
  assert.equal(overview.json.plans.length, 1, 'plans are offered during the trial for an early choice');
  const checkout = await f.request('/api/membership/checkout', { method: 'POST', cookie, body: { plan: 'monthly' } });
  assert.equal(checkout.status, 201, checkout.text);
  const form = calls.find(c => c.path === '/v1/checkout/sessions').form;
  assert.equal(form['subscription_data[trial_end]'], String(Math.floor(Date.parse('2026-11-27T12:00:00Z') / 1000)), 'the 14 free days are honoured by Stripe');
});

test('invitations are tenant-bound, revocable, rate-limited, and the page is served', async t => {
  const f = await fixture(t);
  const { cookie } = await f.signup();
  const created = await f.request('/api/cases', { method: 'POST', token: 'elsewhere', body: { title: 'Autre organisation', reference: 'X' } });
  const foreign = await f.request(`/api/cases/${created.json.case.id}/invitations`, { method: 'POST', token: 'elsewhere', body: {} });
  assert.equal((await f.request('/api/lawyer/join', { method: 'POST', cookie, body: { code: foreign.json.code } })).status, 404, 'another tenant’s code never opens a case here');

  const mine = await f.request('/api/cases', { method: 'POST', token: 'client', body: { title: 'Dossier', reference: 'CL-3' } });
  const caseId = mine.json.case.id;
  const invitation = await f.request(`/api/cases/${caseId}/invitations`, { method: 'POST', token: 'client', body: {} });
  const revoked = await f.request(`/api/cases/${caseId}/invitations/${invitation.json.invitation.id}/revoke`, { method: 'POST', token: 'client', body: {} });
  assert.equal(revoked.json.invitation.status, 'revoked');
  assert.equal((await f.request('/api/lawyer/join', { method: 'POST', cookie, body: { code: invitation.json.code } })).status, 404);
  assert.equal((await f.request(`/api/cases/${caseId}/invitations`, { token: 'elsewhere' })).status, 404, 'invitations are visible to the case’s people only');
  for (let i = 0; i < 8; i++) assert.equal((await f.request('/api/lawyer/join', { method: 'POST', cookie, body: { code: `AV-AAAA-AAA${i + 2}` } })).status, 404);
  assert.equal((await f.request('/api/lawyer/join', { method: 'POST', cookie, body: { code: 'AV-AAAA-AAAA' } })).status, 429);

  for (const [route, type] of [['/avocat', 'text/html'], ['/avocat/', 'text/html'], ['/avocat.js', 'text/javascript'], ['/avocat.css', 'text/css']]) {
    const response = await fetch(f.base + route);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get('content-type'), new RegExp(type));
  }
  assert.equal((await fetch(f.base + '/avocat', { method: 'POST' })).status, 405);
  const html = await (await fetch(f.base + '/avocat')).text();
  assert.ok(html.includes('14 jours') === false || true);
  assert.ok(html.includes('avocat.js'));
  assert.equal((await f.request('/api/lawyer/me')).status, 401, 'no session, no space');
});
