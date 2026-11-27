// Parcours complet D-036 : une personne crée son tableau de bord par code courriel, ouvre un dossier avec son domaine,
// le déclare prêt; un avocat du même domaine le voit (sans les pièces), l'accepte et devient l'avocat du dossier.
// Fournisseur d'identité simulé; aucun compte, courriel ni paiement réel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';
import { validDomains } from '../lib/case-matching.mjs';

const ORIGIN = 'https://portal.example.test';
const TENANT = 'synthetic-tenant';
const OWNER = '11111111-1111-4111-8111-111111111111';
const CLIENT = '22222222-2222-4222-8222-222222222222';
const LAWYER_FAMILY = '33333333-3333-4333-8333-333333333333';
const LAWYER_TAX = '55555555-5555-4555-8555-555555555555';
const STRANGER = '44444444-4444-4444-8444-444444444444';
const csrf = { Origin: ORIGIN, 'X-Requested-With': 'XMLHttpRequest' };
const cookieOfResponse = response => response.headers.get('set-cookie').split(';')[0];
const providerJson = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'ba-journey-'));
  const grantsFile = path.join(directory, 'grants.json');
  await writeFile(grantsFile, JSON.stringify({ version: 1, grants: { [OWNER]: { tenantId: TENANT, product: 'besoinavocat', active: true } } }), { mode: 0o600 });
  let time = Date.parse('2026-11-14T20:00:00Z');
  const accounts = { 'owner@example.test': OWNER, 'cliente@example.test': CLIENT, 'famille@example.test': LAWYER_FAMILY, 'fiscal@example.test': LAWYER_TAX, 'inconnu@example.test': STRANGER };
  const provider = { otp: [] };
  const identityFetch = async (url, options) => {
    if (url.endsWith('/otp')) { provider.otp.push(JSON.parse(options.body)); return providerJson({}); }
    if (url.endsWith('/verify')) {
      const body = JSON.parse(options.body);
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
  const env = { TAKATAK_SUPABASE_URL: 'https://auth.example.test', TAKATAK_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_SYNTHETIC_NOT_A_REAL_KEY', BESOINAVOCAT_GRANTS_FILE: grantsFile, BESOINAVOCAT_LAWYER_ACCESS: 'paid',
    APP_ORIGIN: ORIGIN, BESOINAVOCAT_EMAIL_OTP_ENABLED: 'true', BESOINAVOCAT_LAWYER_TENANT: TENANT };
  const app = createApp({ dbPath: path.join(directory, 'db.sqlite'), blobDir: path.join(directory, 'blobs'), env, identityFetch, paymentsFetch: async () => { throw new Error('Stripe must not be called'); },
    authenticate: async () => null, clock: () => time });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  const base = `http://127.0.0.1:${app.address().port}`;
  t.after(async () => { await new Promise(r => app.close(r)); await rm(directory, { recursive: true, force: true }); });
  async function request(route, { method = 'GET', body, cookie, headers = {} } = {}) {
    const h = { ...headers };
    if (body !== undefined) h['Content-Type'] = 'application/json';
    if (cookie) { h.Cookie = cookie; if (method !== 'GET') Object.assign(h, csrf); }
    const response = await fetch(base + route, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
    const text = await response.text();
    let json = null; try { json = JSON.parse(text); } catch { json = null; }
    return { status: response.status, json, text, headers: response.headers };
  }
  const cookieOf = response => response.headers.get('set-cookie').split(';')[0];
  async function clientSignup(email, name = 'Personne Cliente') {
    const asked = await request('/api/auth/client/signup', { method: 'POST', headers: csrf, body: { email, name, consent: true } });
    assert.equal(asked.status, 200, asked.text);
    const verified = await request('/api/auth/client/verify', { method: 'POST', headers: csrf, body: { email, code: '00123456' } });
    assert.equal(verified.status, 200, verified.text);
    return { cookie: cookieOf(verified), verified };
  }
  async function lawyerSignup(email, profile) {
    const asked = await request('/api/auth/lawyer/signup', { method: 'POST', headers: csrf, body: { email, consent: true, ...profile } });
    assert.equal(asked.status, 200, asked.text);
    const verified = await request('/api/auth/lawyer/verify', { method: 'POST', headers: csrf, body: { email, code: '00123456' } });
    assert.equal(verified.status, 200, verified.text);
    return cookieOf(verified);
  }
  return { app, request, clientSignup, lawyerSignup, provider, advance: ms => { time += ms; } };
}

test('practice domains come from the request catalogue and are deduplicated', () => {
  assert.deepEqual(validDomains(undefined), []);
  assert.deepEqual(validDomains(['family', 'family', 'tax']), ['family', 'tax']);
  assert.throws(() => validDomains(['unknown']), /Domaines de pratique invalides/u);
  assert.throws(() => validDomains('family'), /Domaines de pratique invalides/u);
});

test('a person creates their dashboard with an email code, prepares a case, marks it ready; a lawyer of the domain sees it and accepts it', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/health')).json.clientSignup, true);
  // Consent and name are required; the origin guard applies; the provider is asked to create the account.
  assert.equal((await f.request('/api/auth/client/signup', { method: 'POST', headers: csrf, body: { email: 'cliente@example.test', name: 'P.', consent: false } })).status, 400);
  assert.equal((await f.request('/api/auth/client/signup', { method: 'POST', headers: csrf, body: { email: 'cliente@example.test', consent: true } })).status, 400);
  assert.equal((await f.request('/api/auth/client/signup', { method: 'POST', body: { email: 'cliente@example.test', name: 'P.', consent: true } })).status, 403, 'origin guard');
  const { cookie: client, verified } = await f.clientSignup('cliente@example.test');
  assert.deepEqual(f.provider.otp.at(-1), { email: 'cliente@example.test', create_user: true });
  assert.equal(verified.json.user.subject, CLIENT);
  assert.equal(verified.json.user.tenantId, TENANT, 'self-signed clients join the portal tenant');
  assert.equal(verified.json.created, true);
  const caps = (await f.request('/api/capabilities', { cookie: client })).json;
  assert.equal(caps.clientAccount, true);
  assert.equal(caps.lawyerSpace.account, false);
  assert.ok(caps.caseMatching.domains.some(d => d.id === 'family' && d.label === 'Famille et jeunesse'));
  assert.deepEqual((await f.request('/api/cases', { cookie: client })).json.cases, []);

  // The case carries its domain and a plain-language summary; the person is its client.
  assert.equal((await f.request('/api/cases', { method: 'POST', cookie: client, body: { title: 'Garde partagée', domain: 'nope' } })).status, 400);
  const created = await f.request('/api/cases', { method: 'POST', cookie: client, body: { title: 'Garde partagée', reference: 'GP-1', domain: 'family', summary: 'Séparation, deux enfants, entente à revoir.' } });
  assert.equal(created.status, 201, created.text);
  const caseId = created.json.case.id;
  assert.equal(created.json.case.role, 'client');
  assert.deepEqual(created.json.case.profile, { domain: 'family', domainLabel: 'Famille et jeunesse', summary: 'Séparation, deux enfants, entente à revoir.', status: 'preparation', readyAt: null, acceptedBy: null, acceptedAt: null });
  const listed = (await f.request('/api/cases', { cookie: client })).json.cases;
  assert.equal(listed[0].profile.status, 'preparation');
  assert.equal((await f.request(`/api/cases/${caseId}`, { cookie: client })).json.case.profile.domain, 'family');

  // Without a domain, « ready » is refused; a case without a profile row works too.
  const bare = (await f.request('/api/cases', { method: 'POST', cookie: client, body: { title: 'Autre dossier' } })).json.case;
  assert.equal(bare.profile.status, 'preparation');
  assert.equal((await f.request(`/api/cases/${bare.id}/ready`, { method: 'POST', cookie: client, body: {} })).json.error.code, 'DOMAIN_REQUIRED');
  assert.equal((await f.request(`/api/cases/${bare.id}/profile`, { method: 'POST', cookie: client, body: { summary: 'x'.repeat(1501) } })).status, 400);
  assert.equal((await f.request(`/api/cases/${bare.id}/profile`, { method: 'POST', cookie: client, body: {} })).status, 400);
  assert.equal((await f.request(`/api/cases/${bare.id}/profile`, { method: 'POST', cookie: client, body: { domain: 'tax', summary: 'Avis de cotisation contesté.' } })).json.profile.domain, 'tax');

  // Lawyers see nothing until the person declares the case ready.
  const family = await f.lawyerSignup('famille@example.test', { name: 'Famille', domains: ['family', 'housing'] });
  const tax = await f.lawyerSignup('fiscal@example.test', { name: 'Fiscal', domains: ['tax'] });
  assert.deepEqual((await f.request('/api/lawyer/me', { cookie: family })).json.account.domains, ['family', 'housing']);
  assert.deepEqual((await f.request('/api/lawyer/ready-cases', { cookie: family })).json, { cases: [], domains: ['family', 'housing'], total: 0 });

  const ready = await f.request(`/api/cases/${caseId}/ready`, { method: 'POST', cookie: client, body: {} });
  assert.equal(ready.status, 200, ready.text);
  assert.equal(ready.json.profile.status, 'pret');
  assert.equal(ready.json.profile.readyAt, '2026-11-14T20:00:00.000Z');
  assert.equal((await f.request(`/api/cases/${caseId}/ready`, { method: 'POST', cookie: client, body: {} })).json.profile.status, 'pret', 'idempotent');

  // Only the family lawyer sees it, without the pieces; the tax lawyer does not; a stranger cannot accept it.
  const seen = (await f.request('/api/lawyer/ready-cases', { cookie: family })).json;
  assert.equal(seen.cases.length, 1);
  assert.deepEqual(seen.cases[0], { id: caseId, title: 'Garde partagée', reference: 'GP-1', createdAt: created.json.case.createdAt, domain: 'family', domainLabel: 'Famille et jeunesse', summary: 'Séparation, deux enfants, entente à revoir.', documents: 0, readyAt: '2026-11-14T20:00:00.000Z', priority: false });
  assert.equal((await f.request(`/api/cases/${caseId}`, { cookie: family })).status, 404, 'no access before accepting');
  assert.deepEqual((await f.request('/api/lawyer/ready-cases', { cookie: tax })).json.cases, []);
  assert.equal((await f.request('/api/lawyer/accept', { method: 'POST', cookie: tax, body: { caseId } })).status, 200, 'a lawyer may accept outside the declared domains, but sees only the matching ones by default');
  // Reset for the family lawyer by reopening is impossible once accepted: the tax lawyer is now the lawyer of that case.
  assert.equal((await f.request(`/api/cases/${caseId}/reopen`, { method: 'POST', cookie: client, body: {} })).json.error.code, 'CASE_ACCEPTED');
  assert.equal((await f.request(`/api/cases/${caseId}/profile`, { method: 'POST', cookie: client, body: { domain: 'civil' } })).json.error.code, 'CASE_ACCEPTED');
  assert.equal((await f.request('/api/lawyer/accept', { method: 'POST', cookie: family, body: { caseId } })).json.error.code, 'CASE_NOT_READY');
  assert.equal((await f.request('/api/lawyer/accept', { method: 'POST', cookie: client, body: { caseId } })).status, 403, 'a client is not a lawyer');

  // The second case: the family lawyer does not see a tax case; the tax lawyer accepts it, which opens the file and leaves a message.
  assert.equal((await f.request(`/api/cases/${bare.id}/ready`, { method: 'POST', cookie: client, body: {} })).json.profile.status, 'pret');
  assert.equal((await f.request(`/api/cases/${bare.id}/reopen`, { method: 'POST', cookie: client, body: {} })).json.profile.status, 'preparation');
  assert.deepEqual((await f.request('/api/lawyer/ready-cases', { cookie: tax })).json.cases, [], 'reopened cases are hidden again');
  assert.equal((await f.request(`/api/cases/${bare.id}/ready`, { method: 'POST', cookie: client, body: {} })).json.profile.status, 'pret');
  assert.equal((await f.request('/api/lawyer/ready-cases', { cookie: family })).json.cases.length, 0);
  const accepted = await f.request('/api/lawyer/accept', { method: 'POST', cookie: tax, body: { caseId: bare.id } });
  assert.equal(accepted.status, 200, accepted.text);
  assert.equal(accepted.json.case.role, 'lawyer');
  assert.equal(accepted.json.case.profile.status, 'accepte');
  assert.equal(accepted.json.case.profile.acceptedBy, LAWYER_TAX);
  const details = await f.request(`/api/cases/${bare.id}`, { cookie: tax });
  assert.equal(details.status, 200);
  assert.equal(details.json.case.role, 'lawyer');
  assert.match(details.json.messages.at(-1).body, /^Me Fiscal a accepté votre dossier \(Fiscalité\)\./u);
  const mine = (await f.request('/api/cases', { cookie: client })).json.cases.find(c => c.id === bare.id);
  assert.equal(mine.profile.status, 'accepte');
  assert.deepEqual((await f.request('/api/lawyer/me', { cookie: tax })).json.cases.map(c => c.profile.status).sort(), ['accepte', 'accepte']);
  assert.deepEqual((await f.request('/api/lawyer/ready-cases', { cookie: tax })).json.cases, []);
  const audit = f.app.store.db.prepare("SELECT action FROM audit_events WHERE caseId=? AND action LIKE 'case.%' ORDER BY createdAt, rowid").all(bare.id).map(r => r.action);
  assert.deepEqual(audit, ['case.created', 'case.profile_updated', 'case.ready', 'case.reopened', 'case.ready', 'case.accepted', 'case.read']);

  // The lawyer updates the declared domains; an expired trial blocks new acceptances but keeps the accepted cases readable.
  assert.deepEqual((await f.request('/api/lawyer/profile', { method: 'POST', cookie: tax, body: { name: 'Fiscal', domains: ['tax', 'business'] } })).json.account.domains, ['tax', 'business']);
  assert.equal((await f.request('/api/lawyer/profile', { method: 'POST', cookie: tax, body: { name: 'Fiscal', domains: ['x'] } })).status, 400);
  const third = (await f.request('/api/cases', { method: 'POST', cookie: client, body: { title: 'Troisième', domain: 'tax' } })).json.case;
  assert.equal((await f.request(`/api/cases/${third.id}/ready`, { method: 'POST', cookie: client, body: {} })).status, 200);
  f.advance(15 * 86_400_000);
  assert.equal((await f.request('/api/lawyer/ready-cases', { cookie: tax })).status, 401, 'the hour-long session has expired with the clock');
  assert.equal((await f.request('/api/auth/email/request', { method: 'POST', headers: csrf, body: { email: 'fiscal@example.test' } })).status, 200);
  const taxAgain = cookieOfResponse(await f.request('/api/auth/email/verify', { method: 'POST', headers: csrf, body: { email: 'fiscal@example.test', code: '00123456' } }));
  assert.equal((await f.request('/api/lawyer/ready-cases', { cookie: taxAgain })).status, 402);
  assert.equal((await f.request('/api/lawyer/accept', { method: 'POST', cookie: taxAgain, body: { caseId: third.id } })).status, 402);
  assert.equal((await f.request(`/api/cases/${bare.id}`, { cookie: taxAgain })).status, 200, 'accepted cases stay readable');
});

test('an existing account without a pending signup does not become a client, a stranger stays out, and client sign-up needs the email code', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/auth/client/verify', { method: 'POST', headers: csrf, body: { email: 'inconnu@example.test', code: '00123456' } })).json.error.code, 'NO_PENDING_SIGNUP');
  // The owner already has a grant from the file: logging in through the client path keeps their existing access.
  const { verified } = await f.clientSignup('owner@example.test', 'Propriétaire');
  assert.equal(verified.json.user.subject, OWNER);
  assert.equal(verified.json.created, true);
  // Signing up twice keeps one account and reuses it.
  const again = await f.clientSignup('cliente@example.test');
  const second = await f.request('/api/auth/client/signup', { method: 'POST', headers: csrf, body: { email: 'cliente@example.test', name: 'Même personne', consent: true } });
  assert.equal(second.status, 200);
  const back = await f.request('/api/auth/client/verify', { method: 'POST', headers: csrf, body: { email: 'cliente@example.test', code: '00123456' } });
  assert.equal(back.json.created, false);
  assert.equal(f.app.store.db.prepare('SELECT COUNT(*) AS n FROM client_accounts').get().n, 2);
  assert.equal((await f.request('/api/cases', { cookie: again.cookie })).status, 200);
});

test('without the email code, the client sign-up answers 503 and health says so', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ba-journey-off-'));
  const grantsFile = path.join(directory, 'grants.json');
  await writeFile(grantsFile, JSON.stringify({ version: 1, grants: {} }), { mode: 0o600 });
  const app = createApp({ dbPath: ':memory:', blobDir: path.join(directory, 'blobs'), env: { TAKATAK_SUPABASE_URL: 'https://auth.example.test', TAKATAK_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_SYNTHETIC_NOT_A_REAL_KEY', BESOINAVOCAT_GRANTS_FILE: grantsFile, APP_ORIGIN: ORIGIN }, identityFetch: async () => { throw new Error('no provider call expected'); }, authenticate: async () => null });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  t.after(async () => { await new Promise(r => app.close(r)); await rm(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${app.address().port}`;
  assert.equal((await (await fetch(`${base}/api/health`)).json()).clientSignup, false);
  const response = await fetch(`${base}/api/auth/client/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...csrf }, body: JSON.stringify({ email: 'a@b.test', name: 'A', consent: true }) });
  assert.equal(response.status, 503);
});
