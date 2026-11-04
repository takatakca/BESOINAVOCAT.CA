import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHmac } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';
import { membershipConfiguration } from '../lib/membership.mjs';

const users = {
  lawyer: { subject: 'lawyer-1', tenantId: 'tenant-a', product: 'besoinavocat', active: true },
  client: { subject: 'client-1', tenantId: 'tenant-a', product: 'besoinavocat', active: true },
};
const WHSEC = `whsec_${'w'.repeat(32)}`;
const ENV = { APP_ORIGIN: 'https://portail.example.test', BESOINAVOCAT_STRIPE_SECRET_KEY: `sk_test_${'a'.repeat(24)}`, BESOINAVOCAT_STRIPE_PRICE_WEEKLY: 'price_weekly0001', BESOINAVOCAT_STRIPE_PRICE_MONTHLY: 'price_monthly001', BESOINAVOCAT_STRIPE_WEBHOOK_SECRET: WHSEC };

// A stand-in for the three Stripe endpoints used: prices, Checkout sessions and the billing portal.
function fakeStripe() {
  const calls = [];
  const fetch = async (url, options = {}) => {
    const u = new URL(url);
    assert.equal(u.origin, 'https://api.stripe.com');
    assert.equal(options.headers.Authorization, `Bearer ${ENV.BESOINAVOCAT_STRIPE_SECRET_KEY}`);
    const form = options.body ? Object.fromEntries(new URLSearchParams(options.body)) : null;
    calls.push({ path: u.pathname, method: options.method || 'GET', form });
    if (u.pathname === '/v1/prices/price_weekly0001') return Response.json({ id: 'price_weekly0001', unit_amount: 10000, currency: 'cad', recurring: { interval: 'week', interval_count: 1 }, active: true });
    if (u.pathname === '/v1/prices/price_monthly001') return Response.json({ id: 'price_monthly001', unit_amount: 30000, currency: 'cad', recurring: { interval: 'month', interval_count: 1 }, active: true });
    if (u.pathname === '/v1/checkout/sessions') return Response.json({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
    if (u.pathname === '/v1/billing_portal/sessions') return Response.json({ id: 'bps_1', url: 'https://billing.stripe.com/p/session/test_1' });
    return Response.json({ error: { message: 'no' } }, { status: 404 });
  };
  return { fetch, calls };
}

async function fixture(t, env = ENV) {
  const directory = await mkdtemp(path.join(tmpdir(), 'besoinavocat-membership-test-'));
  const stripe = fakeStripe();
  const app = createApp({ dbPath: path.join(directory, 'db.sqlite'), blobDir: path.join(directory, 'blobs'), env, paymentsFetch: stripe.fetch, authenticate: async token => users[token] ?? null });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  const base = `http://127.0.0.1:${app.address().port}`;
  t.after(async () => { await new Promise(r => app.close(r)); await rm(directory, { recursive: true, force: true }); });
  async function request(route, { token = 'lawyer', method = 'GET', body } = {}) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(base + route, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const raw = await response.text();
    return { status: response.status, json: raw ? JSON.parse(raw) : null };
  }
  async function stripeEvent(event, secret = WHSEC) {
    const raw = JSON.stringify(event), t0 = Math.floor(Date.now() / 1000);
    const sig = createHmac('sha256', secret).update(`${t0}.${raw}`).digest('hex');
    const response = await fetch(`${base}/api/webhooks/stripe`, { method: 'POST', body: raw, headers: { 'Content-Type': 'application/json', 'Stripe-Signature': `t=${t0},v1=${sig}` } });
    return { status: response.status, json: await response.json().catch(() => null) };
  }
  // The client opens a case and the lawyer is provisioned on it: the lawyer becomes eligible, the client is not.
  const created = await request('/api/cases', { token: 'client', method: 'POST', body: { title: 'Dossier', reference: 'SYN-3' } });
  app.store.provisionMembership({ tenantId: 'tenant-a', caseId: created.json.case.id, subject: 'lawyer-1', role: 'lawyer' });
  return { app, request, stripeEvent, stripe };
}

test('configuration accepts only Stripe-shaped keys and price ids, and names what is missing', () => {
  assert.equal(membershipConfiguration(ENV).configured, true);
  assert.equal(membershipConfiguration(ENV).mode, 'test');
  const none = membershipConfiguration({ APP_ORIGIN: 'https://portail.example.test' });
  assert.equal(none.configured, false);
  assert.deepEqual(none.missing, ['BESOINAVOCAT_STRIPE_SECRET_KEY', 'BESOINAVOCAT_STRIPE_PRICE_WEEKLY ou _MONTHLY', 'BESOINAVOCAT_STRIPE_WEBHOOK_SECRET']);
  assert.equal(membershipConfiguration({ ...ENV, BESOINAVOCAT_STRIPE_SECRET_KEY: 'pk_test_abcdefabcdefabcdef' }).secretKey, null, 'a publishable key is refused');
  assert.equal(membershipConfiguration({ ...ENV, BESOINAVOCAT_STRIPE_PRICE_WEEKLY: '100' }).prices.weekly, undefined, 'an amount is never accepted in place of a Stripe price');
});

test('a lawyer subscribes through Stripe Checkout; only signed Stripe events activate the membership', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/membership', { token: 'client' })).json.eligible, false);
  assert.equal((await f.request('/api/membership/checkout', { token: 'client', method: 'POST', body: { plan: 'monthly' } })).status, 403, 'clients never pay through BesoinAvocat');

  const overview = await f.request('/api/membership');
  assert.equal(overview.json.eligible, true);
  assert.equal(overview.json.membership.status, 'none');
  assert.deepEqual(overview.json.plans.map(p => [p.plan, p.amountCents, p.currency, p.interval]), [['weekly', 10000, 'CAD', 'week'], ['monthly', 30000, 'CAD', 'month']], 'amounts come from Stripe');

  assert.equal((await f.request('/api/membership/checkout', { method: 'POST', body: { plan: 'yearly' } })).status, 400);
  const checkout = await f.request('/api/membership/checkout', { method: 'POST', body: { plan: 'monthly' } });
  assert.equal(checkout.status, 201);
  assert.equal(checkout.json.url, 'https://checkout.stripe.com/c/pay/cs_test_1');
  const session = f.stripe.calls.find(c => c.path === '/v1/checkout/sessions').form;
  assert.equal(session.mode, 'subscription');
  assert.equal(session['line_items[0][price]'], 'price_monthly001');
  assert.match(session.client_reference_id, /^ba_[0-9a-f]{32}$/u);
  assert.ok(!JSON.stringify(session).includes('lawyer-1') && !JSON.stringify(session).includes('tenant-a'), 'Stripe never receives the TAKATAK identity');
  const key = session.client_reference_id;

  // The return page proves nothing: still not active until Stripe's signed events arrive.
  assert.equal((await f.request('/api/membership')).json.membership.active, false);
  assert.equal((await f.stripeEvent({ id: 'evt_forged', type: 'customer.subscription.updated', data: { object: { id: 'sub_1', status: 'active', metadata: { ba_member: key } } } }, `whsec_${'x'.repeat(32)}`)).status, 401);
  assert.equal((await f.request('/api/membership')).json.membership.active, false);

  assert.equal((await f.stripeEvent({ id: 'evt_1', type: 'checkout.session.completed', data: { object: { mode: 'subscription', client_reference_id: key, customer: 'cus_1', subscription: 'sub_1' } } })).status, 200);
  const period = Math.floor(Date.now() / 1000) + 30 * 86400;
  const active = { id: 'evt_2', type: 'customer.subscription.updated', data: { object: { id: 'sub_1', customer: 'cus_1', status: 'active', current_period_end: period, cancel_at_period_end: false, metadata: { ba_member: key }, items: { data: [{ price: { id: 'price_monthly001' } }] } } } };
  assert.equal((await f.stripeEvent(active)).status, 200);
  let state = (await f.request('/api/membership')).json.membership;
  assert.equal(state.active, true);
  assert.equal(state.plan, 'monthly');
  assert.equal(state.canManage, true);
  assert.equal((await f.request('/api/membership/checkout', { method: 'POST', body: { plan: 'weekly' } })).status, 409);

  // Duplicates change nothing; cancellation is applied; the history is append-only.
  assert.equal((await f.stripeEvent(active)).json.duplicate, true);
  await f.stripeEvent({ id: 'evt_3', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1', customer: 'cus_1', status: 'canceled', metadata: { ba_member: key } } } });
  state = (await f.request('/api/membership')).json.membership;
  assert.equal(state.status, 'canceled');
  assert.equal(state.active, false);
  assert.throws(() => f.app.store.db.prepare('DELETE FROM lawyer_membership_events').run(), /append-only/u);

  const portal = await f.request('/api/membership/portal', { method: 'POST' });
  assert.equal(portal.json.url, 'https://billing.stripe.com/p/session/test_1');
});

test('without Stripe keys nothing is charged and the settings screen says what to connect', async t => {
  const f = await fixture(t, { APP_ORIGIN: 'https://portail.example.test' });
  const overview = await f.request('/api/membership');
  assert.equal(overview.json.configured, false);
  assert.equal((await f.request('/api/membership/checkout', { method: 'POST', body: { plan: 'monthly' } })).status, 503);
  assert.equal(f.stripe.calls.length, 0);
  assert.equal((await f.request('/api/capabilities')).json.lawyerSubscription, false);
  const live = await readFile(new URL('../public/live.js', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(live, /membership: paintMembership/u);
  assert.match(live, /Aucun paiement de client, aucune avance d’honoraires et aucune commission/u);
  assert.match(app, /data-live="membership"/u);
});
