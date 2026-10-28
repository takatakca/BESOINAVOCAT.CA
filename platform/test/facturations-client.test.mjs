import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { createFacturationsClient, prepareFacturationsDraft } from '../lib/facturations-client.mjs';

const user = { subject: 'synthetic-user', tenantId: 'tenant-a' };
const secret = Buffer.alloc(32, 0x53); // Synthetic test material, never a deployment secret.
const account = { masterIdentityId: 'master-synthetic', businessId: 'business-a', role: 'STAFF' };
const dashboard = { status: 'DRAFTS_ONLY', currency: 'CAD', draftCount: '3', draftTotalCents: '12345', customerCount: '2',
  issuedInvoicesAvailable: false, paymentsAvailable: false, revenueAvailable: false };
const envelope = (data, businessId = account.businessId) => ({ version: 1, requestId: randomUUID(), businessId, data });
const response = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
function fixture(overrides = {}) {
  const calls = [];
  const client = createFacturationsClient({ enabled: true, origin: 'https://facturations.example.invalid', secret,
    issuer: 'takatak-test', audience: 'facturations-test', resolveAccount: async () => account,
    clock: () => 1800000000000, fetchImpl: async (url, options) => { calls.push({ url, options }); return response(envelope(dashboard)); }, ...overrides });
  return { client, calls };
}

test('disabled by default and missing verified mapping fails before any request', async () => {
  const disabled = createFacturationsClient();
  assert.deepEqual(disabled.status(), { configured: false, mode: 'disabled', writesEnabled: false });
  await assert.rejects(disabled.dashboard(user), e => e.status === 503);
  for (const mapping of [null, { ...account, role: 'lawyer' }, { ...account, businessId: '' }]) {
    const f = fixture({ resolveAccount: async () => mapping });
    await assert.rejects(f.client.dashboard(user), e => e.status === 403);
    assert.equal(f.calls.length, 0);
  }
});

test('JWT exact claims, 60 second lifetime, fresh jti and exclusively server-owned mapping', async () => {
  const f = fixture();
  const first = await f.client.dashboard({ ...user, businessId: 'evil', role: 'OWNER', issuer: 'evil' });
  await f.client.dashboard(user);
  assert.equal(first.data.status, 'DRAFTS_ONLY'); assert.equal(first.data.paymentsAvailable, false);
  const tokens = f.calls.map(call => call.options.headers.Authorization.slice(7));
  const claims = tokens.map(token => JSON.parse(Buffer.from(token.split('.')[1], 'base64url')));
  assert.deepEqual(Object.keys(claims[0]).sort(), ['version', 'iss', 'aud', 'sub', 'business_id', 'roles', 'iat', 'exp', 'jti'].sort());
  assert.equal(claims[0].sub, account.masterIdentityId); assert.equal(claims[0].business_id, account.businessId);
  assert.deepEqual(claims[0].roles, ['STAFF']); assert.equal(claims[0].exp - claims[0].iat, 60);
  assert.notEqual(claims[0].jti, claims[1].jti);
  for (const token of tokens) {
    const [header, body, signature] = token.split('.');
    assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url')), { alg: 'HS256', typ: 'JWT' });
    assert.equal(signature, createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url'));
  }
  for (const call of f.calls) {
    assert.equal(call.url, 'https://facturations.example.invalid/integration/v1/dashboard');
    assert.equal(call.options.method, 'GET'); assert.equal(call.options.redirect, 'error');
    assert.equal(call.options.body, undefined);
  }
  assert.equal(f.client.createDraft, undefined); assert.equal(f.client.pay, undefined); assert.equal(f.client.status().writesEnabled, false);
});

test('configuration forbids insecure URLs, credentials in URLs and weak keys', () => {
  for (const origin of ['http://billing.example.invalid', 'https://user:pass@billing.example.invalid', 'https://billing.example.invalid/path', 'https://billing.example.invalid?key=x']) {
    assert.throws(() => fixture({ origin }), /Invalid Facturations/u);
  }
  assert.throws(() => fixture({ secret: Buffer.alloc(8) }), /configuration/u);
  assert.throws(() => fixture({ timeoutMs: 50000 }), /configuration/u);
});

test('cross-business and non-draft-only responses rejected without reflecting payloads', async () => {
  const wrong = fixture({ fetchImpl: async () => response(envelope(dashboard, 'business-b')) });
  await assert.rejects(wrong.client.dashboard(user), e => e.status === 502 && !e.message.includes('business-b'));
  for (const changed of [{ ...dashboard, revenueAvailable: true }, { ...dashboard, draftTotalCents: 12345 }, { ...dashboard, currency: 'USD' }]) {
    const f = fixture({ fetchImpl: async () => response(envelope(changed)) });
    await assert.rejects(f.client.dashboard(user), e => e.status === 502);
  }
  const extra = fixture({ fetchImpl: async () => response({ ...envelope({ ...dashboard, internalSecret: 'DO_NOT_FORWARD' }), dbCredentials: 'DO_NOT_FORWARD' }) });
  assert.equal(JSON.stringify(await extra.client.dashboard(user)).includes('DO_NOT_FORWARD'), false);
});

test('timeout covers fetch and streamed body; hanging requests do not run indefinitely', async () => {
  let signal;
  const f = fixture({ timeoutMs: 20, fetchImpl: (_url, options) => { signal = options.signal; return new Promise(() => {}); } });
  await assert.rejects(f.client.dashboard(user), e => e.status === 503);
  assert.equal(signal.aborted, true);
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{')); } });
  const g = fixture({ timeoutMs: 20, fetchImpl: async () => new Response(stream, { headers: { 'Content-Type': 'application/json' } }) });
  await assert.rejects(g.client.dashboard(user), e => e.status === 503);
});

test('bounded response, content type, malformed JSON and provider errors fail closed', async () => {
  const providers = [
    async () => new Response('DO_NOT_LEAK', { status: 403 }),
    async () => new Response('<h1>DO_NOT_LEAK</h1>', { headers: { 'Content-Type': 'text/html' } }),
    async () => new Response('oops', { headers: { 'Content-Type': 'application/json' } }),
    async () => new Response('x'.repeat(65537), { headers: { 'Content-Type': 'application/json' } }),
    async () => { throw new Error('DO_NOT_LEAK signed token or provider URL'); },
  ];
  for (const fetchImpl of providers) {
    await assert.rejects(fixture({ fetchImpl }).client.dashboard(user), e => [502, 503].includes(e.status) && !e.message.includes('DO_NOT_LEAK'));
  }
});

test('bounded pagination is encoded by the server and summaries are projected', async () => {
  let called;
  const draft = { id: randomUUID(), customerName: 'Synthetic', invoiceDate: '2026-11-01', dueDate: '2026-11-30', totalCents: '12345', currency: 'CAD', status: 'DRAFT', secret: 'NO' };
  const f = fixture({ fetchImpl: async (url, options) => { called = { url, options }; return response(envelope({ status: 'DRAFTS_ONLY', page: 2, pageSize: 5, drafts: [draft] })); } });
  const result = await f.client.drafts(user, { page: 2, pageSize: 5 });
  assert.equal(called.url, 'https://facturations.example.invalid/integration/v1/drafts?page=2&pageSize=5');
  assert.equal(result.data.drafts[0].secret, undefined);
  for (const query of [{ pageSize: 51 }, { page: '1&business_id=evil' }, { role: 'OWNER' }]) assert.throws(() => f.client.drafts(user, query), e => e.status === 400);
});

test('capabilities validate native financial actions remain false even when draftWrite is advertised', async () => {
  const data = { service: 'facturations', integrationVersion: 1, capabilities: {}, standalone: { staffWorkspace: true, clientPortal: true, bilingual: ['fr', 'en'] } };
  for (const name of ['capabilitiesRead', 'dashboardRead', 'draftsRead', 'draftDetailsRead', 'draftApprovalStatusRead', 'draftWorkflowRead', 'customersRead', 'approvalsRead', 'draftWrite', 'ownerReviewHandoffRead']) data.capabilities[name] = true;
  for (const name of ['ownerApprovalWrite', 'issuanceAuthorizationWrite', 'deliveryAuthorizationWrite', 'portalPublicationWrite']) data.capabilities[name] = false;
  const f = fixture({ fetchImpl: async () => response(envelope(data)) });
  assert.equal((await f.client.capabilities(user)).data.capabilities.draftWrite, true);
  assert.equal(f.client.status().writesEnabled, false);
  data.capabilities.issuanceAuthorizationWrite = true;
  await assert.rejects(f.client.capabilities(user), e => e.status === 502);
});

const draftInput = () => ({ currency: 'CAD', customer: { name: 'Synthetic Customer', email: 'synthetic@example.test' },
  invoiceDate: '2026-11-01', dueDate: '2026-11-30',
  lines: [{ description: 'Synthetic service', quantity: 1, unitPriceCents: 103, taxable: false }], taxes: [] });
test('local draft preparation requires explicit cents and taxes, no implicit free or invented rates', () => {
  const prepared = prepareFacturationsDraft(draftInput());
  assert.equal(prepared.lines[0].unitPriceCents, 103); assert.equal(prepared.lines[0].discountCents, 0);
  assert.deepEqual(prepared.taxes, []);
  for (const price of [null, undefined, 1.25, -1, '100']) {
    const input = draftInput(); input.lines[0].unitPriceCents = price;
    assert.throws(() => prepareFacturationsDraft(input), e => e.status === 400);
  }
  const discount = draftInput(); discount.lines[0].discountCents = 104;
  assert.throws(() => prepareFacturationsDraft(discount), e => e.status === 400);
  const unknown = draftInput(); unknown.business_id = 'caller-supplied';
  assert.throws(() => prepareFacturationsDraft(unknown), e => e.status === 400);
  const noTaxes = draftInput(); delete noTaxes.taxes;
  assert.throws(() => prepareFacturationsDraft(noTaxes), e => e.status === 400);
});
