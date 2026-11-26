// Monétisation (D-041, grille A de D-043) : grille publique, essai Premium de 14 jours, limites du forfait Découverte (vidéo, dossiers,
// espace), paiement par Stripe Checkout, notifications signées, modules d'intégration. Stripe et le fournisseur
// d'identité sont simulés; aucun compte, courriel ni paiement réel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';
import { billingConfiguration } from '../lib/billing.mjs';
import { CLIENT_PLANS, GB, INTEGRATIONS_SUBSCRIPTION, PLUGIN_ACTIVATION, STORAGE_PACK, formatMoney, publicPricing } from '../lib/pricing.mjs';

const ORIGIN = 'https://portal.example.test';
const TENANT = 'synthetic-tenant';
const OWNER = '11111111-1111-4111-8111-111111111111';
const CLIENT = '22222222-2222-4222-8222-222222222222';
const LAWYER = '33333333-3333-4333-8333-333333333333';
const WEBHOOK_SECRET = `whsec_${'w'.repeat(32)}`;
const STRIPE_ENV = {
  BESOINAVOCAT_STRIPE_SECRET_KEY: `sk_test_${'a'.repeat(24)}`, BESOINAVOCAT_STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
  BESOINAVOCAT_STRIPE_PRICE_CLIENT_MEMBER_MONTHLY: 'price_memberM001', BESOINAVOCAT_STRIPE_PRICE_CLIENT_MEMBER_YEARLY: 'price_memberY001',
  BESOINAVOCAT_STRIPE_PRICE_CLIENT_PREMIUM_MONTHLY: 'price_premiumM01', BESOINAVOCAT_STRIPE_PRICE_CLIENT_PREMIUM_YEARLY: 'price_premiumY01',
  BESOINAVOCAT_STRIPE_PRICE_STORAGE_PACK_MONTHLY: 'price_storage001', BESOINAVOCAT_STRIPE_PRICE_PLUGIN_ACTIVATION: 'price_plugin0001',
  BESOINAVOCAT_STRIPE_PRICE_INTEGRATIONS_MONTHLY: 'price_integra001', BESOINAVOCAT_STRIPE_PRICE_INTEGRATIONS_YEARLY: 'price_integraY01', BESOINAVOCAT_STRIPE_TAX_RATES: 'txr_tpsTPS0001,txr_tvqTVQ0001',
};
const csrf = { Origin: ORIGIN, 'X-Requested-With': 'XMLHttpRequest' };
const providerJson = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const VIDEO = { name: 'visite.mp4', mimeType: 'video/mp4', contentBase64: Buffer.from('synthetic video bytes').toString('base64'), sourceType: 'original', reviewStatus: 'a_verifier' };
const PDF = { name: 'bail.pdf', mimeType: 'application/pdf', contentBase64: Buffer.from('%PDF-1.4 synthetic').toString('base64'), sourceType: 'original', reviewStatus: 'a_verifier' };

async function fixture(t, { env: extraEnv = {} } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'ba-billing-'));
  const grantsFile = path.join(directory, 'grants.json');
  await writeFile(grantsFile, JSON.stringify({ version: 1, grants: { [OWNER]: { tenantId: TENANT, product: 'besoinavocat', active: true } } }), { mode: 0o600 });
  let time = Date.parse('2026-11-18T12:00:00Z');
  const accounts = { 'owner@example.test': OWNER, 'cliente@example.test': CLIENT, 'avocate@example.test': LAWYER };
  const identityFetch = async (url, options) => {
    if (url.endsWith('/otp')) return providerJson({});
    if (url.endsWith('/verify')) {
      const body = JSON.parse(options.body);
      const subject = accounts[body.email];
      if (body.token !== '00123456' || !subject) return providerJson({ error: 'wrong code' }, 403);
      return providerJson({ access_token: `SYNTHETIC_ACCESS_${subject}`, token_type: 'bearer', expires_in: 3600, user: { id: subject } });
    }
    if (url.endsWith('/user')) {
      const subject = (options.headers.Authorization || '').replace('Bearer SYNTHETIC_ACCESS_', '');
      const email = Object.entries(accounts).find(([, id]) => id === subject)?.[0];
      return email ? providerJson({ id: subject, email, email_confirmed_at: '2026-01-01T00:00:00Z' }) : providerJson({ error: 'no' }, 401);
    }
    throw new Error(`Unexpected provider call ${url}`);
  };
  const stripeCalls = [];
  const paymentsFetch = async (url, options = {}) => {
    const u = new URL(url);
    stripeCalls.push({ path: u.pathname, form: options.body ? Object.fromEntries(new URLSearchParams(options.body)) : null });
    if (u.pathname === '/v1/checkout/sessions') return Response.json({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
    if (u.pathname === '/v1/billing_portal/sessions') return Response.json({ id: 'bps_1', url: 'https://billing.stripe.com/p/session/bps_1' });
    return Response.json({}, { status: 404 });
  };
  const dbPath = path.join(directory, 'db.sqlite');
  const env = { TAKATAK_SUPABASE_URL: 'https://auth.example.test', TAKATAK_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_SYNTHETIC_NOT_A_REAL_KEY', BESOINAVOCAT_GRANTS_FILE: grantsFile,
    APP_ORIGIN: ORIGIN, BESOINAVOCAT_EMAIL_OTP_ENABLED: 'true', BESOINAVOCAT_LAWYER_TENANT: TENANT, ...extraEnv };
  const app = createApp({ dbPath, blobDir: path.join(directory, 'blobs'), env, identityFetch, paymentsFetch, authenticate: async () => null, clock: () => time });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  const base = `http://127.0.0.1:${app.address().port}`;
  t.after(async () => { await new Promise(r => app.close(r)); await rm(directory, { recursive: true, force: true }); });
  async function request(route, { method = 'GET', body, cookie, headers = {}, raw } = {}) {
    const h = { ...headers };
    if (body !== undefined) h['Content-Type'] = 'application/json';
    if (cookie) { h.Cookie = cookie; if (method !== 'GET') Object.assign(h, csrf); }
    const response = await fetch(base + route, { method, headers: h, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)), redirect: 'manual' });
    const text = await response.text();
    let json = null; try { json = JSON.parse(text); } catch { json = null; }
    return { status: response.status, json, text, headers: response.headers };
  }
  const cookieOf = response => response.headers.get('set-cookie').split(';')[0];
  async function login(email) {
    assert.equal((await request('/api/auth/email/request', { method: 'POST', headers: csrf, body: { email } })).status, 200);
    return cookieOf(await request('/api/auth/email/verify', { method: 'POST', headers: csrf, body: { email, code: '00123456' } }));
  }
  async function clientSignup(email = 'cliente@example.test') {
    assert.equal((await request('/api/auth/client/signup', { method: 'POST', headers: csrf, body: { email, name: 'Personne Cliente', consent: true } })).status, 200);
    const verified = await request('/api/auth/client/verify', { method: 'POST', headers: csrf, body: { email, code: '00123456' } });
    assert.equal(verified.status, 200, verified.text);
    return cookieOf(verified);
  }
  async function lawyerSignup(email = 'avocate@example.test') {
    assert.equal((await request('/api/auth/lawyer/signup', { method: 'POST', headers: csrf, body: { email, consent: true, name: 'Me Avocate', domains: ['family'] } })).status, 200);
    return cookieOf(await request('/api/auth/lawyer/verify', { method: 'POST', headers: csrf, body: { email, code: '00123456' } }));
  }
  // Stripe signs « t.payload » with the endpoint secret (lib/integrations.mjs checks it).
  async function stripeEvent(event) {
    const raw = JSON.stringify(event), ts = Math.floor(Date.now() / 1000);
    const signature = createHmac('sha256', WEBHOOK_SECRET).update(`${ts}.${raw}`).digest('hex');
    return request('/api/webhooks/stripe', { method: 'POST', raw, headers: { 'Content-Type': 'application/json', 'Stripe-Signature': `t=${ts},v1=${signature}` } });
  }
  return { request, login, clientSignup, lawyerSignup, stripeEvent, stripeCalls, dbPath, advance: ms => { time += ms; } };
}

test('the price grid is public, consistent and matches the /forfaits page', async t => {
  const f = await fixture(t);
  const pricing = await f.request('/api/pricing');
  assert.equal(pricing.status, 200);
  assert.deepEqual(pricing.json, publicPricing({ available: {} }));
  assert.deepEqual(pricing.json.client.plans.map(x => x.id), ['free', 'member', 'premium']);
  assert.equal(pricing.json.client.plans[1].prices.month, 1500);
  assert.equal(pricing.json.client.plans[1].prices.year, 15000);
  assert.equal(pricing.json.client.plans[2].prices.month, 3900);
  assert.equal(pricing.json.client.plans[2].prices.year, 39000);
  assert.equal(pricing.json.client.plans[1].maxCases, 5);
  assert.equal(pricing.json.client.plans[2].maxCases, null);
  assert.deepEqual(pricing.json.client.storagePack.forPlans, ['member', 'premium']);
  assert.equal(pricing.json.trialDays, 14);
  assert.equal(pricing.json.lawyer.status, 'paid');
  assert.deepEqual(pricing.json.lawyer.plans.map(p => [p.id, p.amount, p.interval, p.commitmentMonths]), [['weekly', 10000, 'week', 0], ['monthly', 30000, 'month', 12]]);
  assert.equal((await f.request('/api/pricing?x=1')).status, 400);
  assert.equal((await f.request('/api/pricing', { method: 'POST', headers: csrf, body: {} })).status, 405);
  // The page shows exactly the grid's amounts and never the TAKATAK name.
  const page = await f.request('/forfaits');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/u);
  const spaces = value => value.replace(/&nbsp;|[\u00a0\u202f]/gu, ' ');
  const html = spaces(await readFile(new URL('../public/forfaits.html', import.meta.url), 'utf8'));
  for (const cents of [CLIENT_PLANS.member.prices.month, CLIENT_PLANS.member.prices.year, CLIENT_PLANS.premium.prices.month, CLIENT_PLANS.premium.prices.year, STORAGE_PACK.prices.month, PLUGIN_ACTIVATION.prices.once, INTEGRATIONS_SUBSCRIPTION.prices.month, INTEGRATIONS_SUBSCRIPTION.prices.year]) {
    assert.ok(html.includes(spaces(formatMoney(cents))), `the page shows ${formatMoney(cents)}`);
  }
  for (const bytes of [CLIENT_PLANS.free.storageBytes, CLIENT_PLANS.member.storageBytes, CLIENT_PLANS.premium.storageBytes, STORAGE_PACK.bytes]) assert.ok(html.includes(`${bytes / GB} Go`), `the page shows ${bytes / GB} Go`);
  for (const label of ['Découverte', 'Membre', 'Premium']) assert.ok(html.includes(`<h2>${label}</h2>`), `the page names ${label}`);
  for (const cents of [10000, 30000]) assert.ok(html.includes(spaces(formatMoney(cents))), `the page shows the lawyer price ${formatMoney(cents)}`);
  assert.doesNotMatch(html, /takatak/iu);
  assert.doesNotMatch(html, /<script/iu);
});

test('configuration: payments open only with the key, the monthly Premium price, the webhook secret and the origin', () => {
  assert.equal(billingConfiguration({}).configured, false);
  assert.equal(billingConfiguration({}).enforced, false);
  const full = billingConfiguration({ ...STRIPE_ENV, APP_ORIGIN: ORIGIN });
  assert.equal(full.configured, true);
  assert.equal(full.enforced, true);
  assert.deepEqual({ ...full.available }, { member: true, memberYear: true, premium: true, premiumYear: true, storage: true, plugin: true, integrationsYear: true });
  const noYear = billingConfiguration({ ...STRIPE_ENV, APP_ORIGIN: ORIGIN, BESOINAVOCAT_STRIPE_PRICE_INTEGRATIONS_YEARLY: '', BESOINAVOCAT_STRIPE_PRICE_CLIENT_MEMBER_YEARLY: '' });
  assert.equal(noYear.configured, true);
  assert.deepEqual({ ...noYear.available }, { member: true, memberYear: false, premium: true, premiumYear: true, storage: true, plugin: true, integrationsYear: false });
  assert.deepEqual([...full.taxRates], ['txr_tpsTPS0001', 'txr_tvqTVQ0001']);
  assert.equal(billingConfiguration({ ...STRIPE_ENV, APP_ORIGIN: ORIGIN, BESOINAVOCAT_BILLING_ENFORCED: 'false' }).enforced, false);
  const noPlugin = billingConfiguration({ ...STRIPE_ENV, APP_ORIGIN: ORIGIN, BESOINAVOCAT_STRIPE_PRICE_PLUGIN_ACTIVATION: '' });
  assert.equal(noPlugin.available.plugin, false);
  assert.ok(billingConfiguration({ ...STRIPE_ENV, APP_ORIGIN: ORIGIN, BESOINAVOCAT_STRIPE_PRICE_CLIENT_MEMBER_MONTHLY: 'nope' }).missing.includes('BESOINAVOCAT_STRIPE_PRICE_CLIENT_MEMBER_MONTHLY'));
});

test('without Stripe nothing is blocked: the client sees the 14-day Premium trial and no payment is possible', async t => {
  const f = await fixture(t);
  const client = await f.clientSignup();
  const overview = await f.request('/api/billing', { cookie: client });
  assert.equal(overview.status, 200, overview.text);
  assert.equal(overview.json.billed, true);
  assert.equal(overview.json.enforced, false);
  assert.deepEqual(overview.json.plan, { id: 'premium', label: 'Premium', source: 'trial' });
  assert.equal(overview.json.trial.daysLeft, 14);
  assert.equal(overview.json.usage.quotaBytes, 100 * GB);
  f.advance(20 * 86_400_000);
  const later = await f.login('cliente@example.test');
  assert.equal((await f.request('/api/billing', { cookie: later })).json.plan.id, 'free');
  // Free plan, but payments are not open: two cases and a video still go through.
  const one = (await f.request('/api/cases', { method: 'POST', cookie: later, body: { title: 'Un' } })).json.case;
  assert.equal((await f.request('/api/cases', { method: 'POST', cookie: later, body: { title: 'Deux' } })).status, 201);
  assert.equal((await f.request(`/api/cases/${one.id}/documents`, { method: 'POST', cookie: later, body: VIDEO })).status, 201);
  const refused = await f.request('/api/billing/checkout', { method: 'POST', cookie: later, body: { item: 'premium', interval: 'month' } });
  assert.equal(refused.status, 503);
  assert.equal(refused.json.error.code, 'PAYMENTS_NOT_CONFIGURED');
  assert.equal(f.stripeCalls.length, 0);
});

test('with Stripe: the Découverte plan limits videos, cases and space; Premium bought by Checkout lifts them after the signed notification', async t => {
  const f = await fixture(t, { env: STRIPE_ENV });
  const client = await f.clientSignup();
  const caps = (await f.request('/api/capabilities', { cookie: client })).json;
  assert.deepEqual(caps.billing, { configured: true, enforced: true });
  // During the trial: Premium, videos allowed, several cases.
  const first = (await f.request('/api/cases', { method: 'POST', cookie: client, body: { title: 'Sinistre' } })).json.case;
  assert.equal((await f.request(`/api/cases/${first.id}/documents`, { method: 'POST', cookie: client, body: VIDEO })).status, 201);
  assert.equal((await f.request('/api/cases', { method: 'POST', cookie: client, body: { title: 'Deuxième' } })).status, 201);

  // Checkout during the trial keeps the remaining days; Stripe receives an opaque key, never the identity.
  const checkout = await f.request('/api/billing/checkout', { method: 'POST', cookie: client, body: { item: 'premium', interval: 'year' } });
  assert.equal(checkout.status, 201, checkout.text);
  assert.equal(checkout.json.url, 'https://checkout.stripe.com/c/pay/cs_test_1');
  const form = f.stripeCalls.at(-1).form;
  assert.equal(form.mode, 'subscription');
  assert.equal(form['line_items[0][price]'], 'price_premiumY01');
  assert.equal(form['line_items[0][tax_rates][1]'], 'txr_tvqTVQ0001');
  assert.match(form['metadata[bc_account]'], /^bc_[0-9a-f]{32}$/u);
  assert.equal(form['subscription_data[metadata][bc_item]'], 'premium');
  assert.equal(form['subscription_data[trial_end]'], String(Math.floor(Date.parse('2026-12-02T12:00:00Z') / 1000)));
  assert.equal(form.locale, 'fr-CA');
  assert.ok(!JSON.stringify(form).includes(CLIENT), 'no TAKATAK identity sent to Stripe');
  assert.equal((await f.request('/api/billing/checkout', { method: 'POST', cookie: client, body: { item: 'premium', interval: 'week' } })).status, 400);
  assert.equal((await f.request('/api/billing/checkout', { method: 'POST', cookie: client, body: { item: 'premium', interval: 'month', extra: 1 } })).status, 400);
  assert.equal((await f.request('/api/billing/portal', { method: 'POST', cookie: client, body: {} })).status, 409, 'no customer yet');

  // The trial ends without payment: Découverte. Videos and a new case are refused with a clear message.
  f.advance(15 * 86_400_000);
  const later = await f.login('cliente@example.test');
  const free = (await f.request('/api/billing', { cookie: later })).json;
  assert.deepEqual(free.plan, { id: 'free', label: 'Découverte', source: 'free' });
  assert.equal(free.usage.quotaBytes, 1 * GB);
  assert.equal(free.usage.cases, 2);
  const video = await f.request(`/api/cases/${first.id}/documents`, { method: 'POST', cookie: later, body: { ...VIDEO, contentBase64: Buffer.from('another video').toString('base64') } });
  assert.equal(video.status, 402);
  assert.equal(video.json.error.code, 'PLAN_REQUIRED');
  assert.equal((await f.request(`/api/cases/${first.id}/documents`, { method: 'POST', cookie: later, body: PDF })).status, 201, 'documents still go in');
  const third = await f.request('/api/cases', { method: 'POST', cookie: later, body: { title: 'Troisième' } });
  assert.equal(third.status, 402);
  // Space is counted on the account: a full 1 Go refuses a new piece (synthetic usage row, no real gigabyte).
  const db = new DatabaseSync(f.dbPath);
  db.prepare('INSERT INTO documents VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('aaaaaaaa-0000-4000-8000-000000000001', TENANT, first.id, 'aaaaaaaa-0000-4000-8000-000000000001', null, 1, 'grand.pdf', 'application/pdf', 'f'.repeat(64), GB, 'original', '', '', 'a_verifier', new Date().toISOString(), CLIENT);
  db.close();
  const full = await f.request(`/api/cases/${first.id}/documents`, { method: 'POST', cookie: later, body: { ...PDF, contentBase64: Buffer.from('%PDF-1.4 other').toString('base64') } });
  assert.equal(full.status, 402);
  assert.equal(full.json.error.code, 'STORAGE_LIMIT');
  assert.equal((await f.request('/api/billing', { cookie: later })).json.usage.percent, 100);

  // Stripe's signed notifications: the customer, then the active Premium subscription.
  const key = form['metadata[bc_account]'];
  assert.equal((await f.stripeEvent({ id: 'evt_session1', type: 'checkout.session.completed', data: { object: { id: 'cs_test_1', mode: 'subscription', client_reference_id: key, customer: 'cus_Client001', payment_status: 'paid', metadata: { bc_account: key, bc_item: 'premium' } } } })).status, 200);
  const subscription = { id: 'sub_Premium001', customer: 'cus_Client001', status: 'active', cancel_at_period_end: false, metadata: { bc_account: key, bc_item: 'premium' }, items: { data: [{ quantity: 1, price: { id: 'price_premiumY01' }, current_period_end: Math.floor(Date.parse('2027-12-03T12:00:00Z') / 1000) }] } };
  assert.equal((await f.stripeEvent({ id: 'evt_sub1', type: 'customer.subscription.created', data: { object: subscription } })).status, 200);
  const paid = (await f.request('/api/billing', { cookie: later })).json;
  assert.deepEqual(paid.plan, { id: 'premium', label: 'Premium', source: 'subscription' });
  assert.equal(paid.subscriptions.premium.currentPeriodEnd, '2027-12-03T12:00:00.000Z');
  assert.equal(paid.canManage, true);
  assert.equal((await f.request(`/api/cases/${first.id}/documents`, { method: 'POST', cookie: later, body: { ...VIDEO, contentBase64: Buffer.from('another video').toString('base64') } })).status, 201);
  assert.equal((await f.request('/api/cases', { method: 'POST', cookie: later, body: { title: 'Troisième' } })).status, 201);
  assert.equal((await f.request('/api/billing/checkout', { method: 'POST', cookie: later, body: { item: 'premium', interval: 'month' } })).status, 409);
  const portal = await f.request('/api/billing/portal', { method: 'POST', cookie: later, body: {} });
  assert.equal(portal.json.url, 'https://billing.stripe.com/p/session/bps_1');
  assert.equal(f.stripeCalls.at(-1).form.customer, 'cus_Client001');

  // A storage pack adds 50 Go per slice; quantity is checked.
  assert.equal((await f.request('/api/billing/checkout', { method: 'POST', cookie: later, body: { item: 'storage', quantity: 21 } })).status, 400);
  assert.equal((await f.request('/api/billing/checkout', { method: 'POST', cookie: later, body: { item: 'storage', quantity: 2 } })).status, 201);
  assert.equal(f.stripeCalls.at(-1).form['line_items[0][quantity]'], '2');
  await f.stripeEvent({ id: 'evt_sub2', type: 'customer.subscription.created', data: { object: { ...subscription, id: 'sub_Storage001', metadata: { bc_account: key, bc_item: 'storage' }, items: { data: [{ quantity: 2, price: { id: 'price_storage001' } }] } } } });
  assert.equal((await f.request('/api/billing', { cookie: later })).json.usage.quotaBytes, 200 * GB);

  // Cancellation (deleted) brings the account back to Découverte; a replayed event changes nothing.
  await f.stripeEvent({ id: 'evt_sub3', type: 'customer.subscription.deleted', data: { object: { ...subscription, status: 'canceled' } } });
  assert.equal((await f.request('/api/billing', { cookie: later })).json.plan.id, 'free');
  assert.equal((await f.stripeEvent({ id: 'evt_sub1', type: 'customer.subscription.created', data: { object: subscription } })).json.duplicate, true);
  assert.equal((await f.request('/api/billing', { cookie: later })).json.plan.id, 'free');
  // An unknown key or a forged signature never changes an account.
  await f.stripeEvent({ id: 'evt_sub4', type: 'customer.subscription.created', data: { object: { ...subscription, id: 'sub_X', metadata: { bc_account: `bc_${'0'.repeat(32)}`, bc_item: 'premium' } } } });
  assert.equal((await f.request('/api/billing', { cookie: later })).json.plan.id, 'free');
  const forged = await f.request('/api/webhooks/stripe', { method: 'POST', raw: JSON.stringify({ id: 'evt_f', type: 'customer.subscription.created', data: { object: subscription } }), headers: { 'Content-Type': 'application/json', 'Stripe-Signature': `t=${Math.floor(Date.now() / 1000)},v1=${'0'.repeat(64)}` } });
  assert.equal(forged.status, 401);
});

test('Membre (grid A): 15 $ a month, 5 cases, 25 Go, videos; storage packs only on a paid plan; the yearly Integrations price is optional', async t => {
  const f = await fixture(t, { env: STRIPE_ENV });
  const client = await f.clientSignup();
  // No storage pack during the trial: it comes with a paid plan.
  const pack = await f.request('/api/billing/checkout', { method: 'POST', cookie: client, body: { item: 'storage' } });
  assert.equal(pack.status, 409);
  assert.equal(pack.json.error.code, 'PLAN_REQUIRED');
  const checkout = await f.request('/api/billing/checkout', { method: 'POST', cookie: client, body: { item: 'member', interval: 'month' } });
  assert.equal(checkout.status, 201, checkout.text);
  const form = f.stripeCalls.at(-1).form;
  assert.equal(form['line_items[0][price]'], 'price_memberM001');
  assert.equal(form['subscription_data[metadata][bc_item]'], 'member');
  const key = form['metadata[bc_account]'];
  await f.stripeEvent({ id: 'evt_m0', type: 'checkout.session.completed', data: { object: { id: 'cs_test_1', mode: 'subscription', client_reference_id: key, customer: 'cus_Member001', payment_status: 'paid', metadata: { bc_account: key, bc_item: 'member' } } } });
  const subscription = { id: 'sub_Member001', customer: 'cus_Member001', status: 'active', cancel_at_period_end: false, metadata: { bc_account: key, bc_item: 'member' }, items: { data: [{ quantity: 1, price: { id: 'price_memberM001' }, current_period_end: Math.floor(Date.parse('2026-12-20T12:00:00Z') / 1000) }] } };
  await f.stripeEvent({ id: 'evt_m1', type: 'customer.subscription.created', data: { object: subscription } });
  const paid = (await f.request('/api/billing', { cookie: client })).json;
  assert.deepEqual(paid.plan, { id: 'member', label: 'Membre', source: 'subscription' });
  assert.equal(paid.usage.quotaBytes, 25 * GB);
  assert.equal(paid.usage.maxCases, 5);
  assert.equal(paid.features.video, true);
  assert.equal(paid.subscriptions.member.live, true);
  // Five cases, then a clear refusal pointing to Premium.
  for (const n of [1, 2, 3, 4, 5]) assert.equal((await f.request('/api/cases', { method: 'POST', cookie: client, body: { title: `Dossier ${n}` } })).status, 201);
  const sixth = await f.request('/api/cases', { method: 'POST', cookie: client, body: { title: 'Six' } });
  assert.equal(sixth.status, 402);
  assert.match(sixth.json.error.message, /Premium/u);
  // Premium cannot be bought on top: the change goes through the Stripe portal.
  assert.equal((await f.request('/api/billing/checkout', { method: 'POST', cookie: client, body: { item: 'premium', interval: 'month' } })).json.error.code, 'ALREADY_SUBSCRIBED');
  // Paid plan: the storage pack is available, 50 Go per slice.
  assert.equal((await f.request('/api/billing/checkout', { method: 'POST', cookie: client, body: { item: 'storage', quantity: 3 } })).status, 201);
  await f.stripeEvent({ id: 'evt_m2', type: 'customer.subscription.created', data: { object: { ...subscription, id: 'sub_Storage002', metadata: { bc_account: key, bc_item: 'storage' }, items: { data: [{ quantity: 3, price: { id: 'price_storage001' } }] } } } });
  assert.equal((await f.request('/api/billing', { cookie: client })).json.usage.quotaBytes, (25 + 3 * 50) * GB);
  // Cancelled Membre: the remaining trial days still apply, then Découverte; packs still paid for keep counting.
  await f.stripeEvent({ id: 'evt_m3', type: 'customer.subscription.deleted', data: { object: { ...subscription, status: 'canceled' } } });
  assert.equal((await f.request('/api/billing', { cookie: client })).json.plan.source, 'trial');
  f.advance(15 * 86_400_000);
  const after = (await f.request('/api/billing', { cookie: await f.login('cliente@example.test') })).json;
  assert.equal(after.plan.id, 'free');
  assert.equal(after.usage.quotaBytes, (1 + 3 * 50) * GB);
  await f.stripeEvent({ id: 'evt_m4', type: 'customer.subscription.deleted', data: { object: { ...subscription, id: 'sub_Storage002', status: 'canceled', metadata: { bc_account: key, bc_item: 'storage' }, items: { data: [{ quantity: 3 }] } } } });
  assert.equal((await f.request('/api/billing', { cookie: await f.login('cliente@example.test') })).json.usage.quotaBytes, 1 * GB);
});

test('integration plugins: activated one by one, kept by the monthly Integrations subscription; staff accounts are never billed', async t => {
  const f = await fixture(t, { env: STRIPE_ENV });
  const lawyer = await f.lawyerSignup();
  const overview = (await f.request('/api/billing', { cookie: lawyer })).json;
  assert.equal(overview.kind, 'lawyer');
  assert.equal(overview.usage, null, 'lawyers have no client storage plan');
  assert.equal(overview.plugins.find(p => p.id === 'zoom').active, false);
  const blocked = await f.request('/api/integrations/zoom/connect', { method: 'POST', cookie: lawyer, body: {} });
  assert.equal(blocked.status, 402);
  assert.equal(blocked.json.error.code, 'PLUGIN_REQUIRED');
  assert.equal((await f.request('/api/billing/checkout', { method: 'POST', cookie: lawyer, body: { item: 'premium', interval: 'month' } })).status, 403);
  assert.equal((await f.request('/api/billing/checkout', { method: 'POST', cookie: lawyer, body: { item: 'plugin', plugin: 'nope' } })).status, 400);

  // First plugin: the Integrations subscription and the one-time activation in one Checkout.
  assert.equal((await f.request('/api/billing/checkout', { method: 'POST', cookie: lawyer, body: { item: 'plugin', plugin: 'zoom' } })).status, 201);
  const form = f.stripeCalls.at(-1).form;
  assert.equal(form.mode, 'subscription');
  assert.equal(form['line_items[0][price]'], 'price_integra001');
  assert.equal(form['line_items[1][price]'], 'price_plugin0001');
  assert.equal(form['metadata[bc_plugin]'], 'zoom');
  assert.equal(form['subscription_data[metadata][bc_item]'], 'integrations');
  const key = form['metadata[bc_account]'];
  await f.stripeEvent({ id: 'evt_p1', type: 'checkout.session.completed', data: { object: { id: 'cs_p1', mode: 'subscription', customer: 'cus_Lawyer001', payment_status: 'paid', metadata: { bc_account: key, bc_item: 'plugin', bc_plugin: 'zoom' } } } });
  await f.stripeEvent({ id: 'evt_p2', type: 'customer.subscription.created', data: { object: { id: 'sub_Integr001', customer: 'cus_Lawyer001', status: 'active', metadata: { bc_account: key, bc_item: 'integrations' }, items: { data: [{ quantity: 1, price: { id: 'price_integra001' } }] } } } });
  const after = (await f.request('/api/billing', { cookie: lawyer })).json;
  assert.equal(after.plugins.find(p => p.id === 'zoom').active, true);
  assert.notEqual((await f.request('/api/integrations/zoom/connect', { method: 'POST', cookie: lawyer, body: {} })).status, 402, 'the plugin is paid: the connection goes on to the provider step');
  assert.equal((await f.request('/api/billing/checkout', { method: 'POST', cookie: lawyer, body: { item: 'plugin', plugin: 'zoom' } })).status, 409);

  // Second plugin while the subscription runs: a one-time payment only.
  assert.equal((await f.request('/api/billing/checkout', { method: 'POST', cookie: lawyer, body: { item: 'plugin', plugin: 'docusign' } })).status, 201);
  const second = f.stripeCalls.at(-1).form;
  assert.equal(second.mode, 'payment');
  assert.equal(second['line_items[0][price]'], 'price_plugin0001');
  assert.equal(second['line_items[1][price]'], undefined);
  assert.equal(second.customer, 'cus_Lawyer001');
  // An unpaid session never activates a plugin.
  await f.stripeEvent({ id: 'evt_p3', type: 'checkout.session.completed', data: { object: { id: 'cs_p2', mode: 'payment', customer: 'cus_Lawyer001', payment_status: 'unpaid', metadata: { bc_account: key, bc_plugin: 'docusign' } } } });
  assert.equal((await f.request('/api/billing', { cookie: lawyer })).json.plugins.find(p => p.id === 'docusign').activated, false);

  // The subscription stops: activated plugins stay owned but are switched off until it is renewed.
  await f.stripeEvent({ id: 'evt_p4', type: 'customer.subscription.deleted', data: { object: { id: 'sub_Integr001', customer: 'cus_Lawyer001', status: 'canceled', metadata: { bc_account: key, bc_item: 'integrations' }, items: { data: [{ quantity: 1 }] } } } });
  const stopped = (await f.request('/api/billing', { cookie: lawyer })).json.plugins.find(p => p.id === 'zoom');
  assert.deepEqual([stopped.activated, stopped.active], [true, false]);
  assert.equal((await f.request('/api/integrations/zoom/connect', { method: 'POST', cookie: lawyer, body: {} })).status, 402);
  assert.equal((await f.request('/api/billing/checkout', { method: 'POST', cookie: lawyer, body: { item: 'integrations' } })).status, 201);
  assert.equal(f.stripeCalls.at(-1).form['line_items[0][price]'], 'price_integra001');

  // The owner (grants file) is never billed nor limited.
  const owner = await f.login('owner@example.test');
  assert.equal((await f.request('/api/billing', { cookie: owner })).json.billed, false);
  assert.notEqual((await f.request('/api/integrations/zoom/connect', { method: 'POST', cookie: owner, body: {} })).status, 402);
  assert.equal((await f.request('/api/billing/checkout', { method: 'POST', cookie: owner, body: { item: 'premium', interval: 'month' } })).status, 403);
  const ownerCase = (await f.request('/api/cases', { method: 'POST', cookie: owner, body: { title: 'Cabinet' } })).json.case;
  assert.equal((await f.request(`/api/cases/${ownerCase.id}/documents`, { method: 'POST', cookie: owner, body: VIDEO })).status, 201);
});
