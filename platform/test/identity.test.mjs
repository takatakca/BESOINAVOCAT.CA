import test from 'node:test';
import assert from 'node:assert/strict';
import { createIntrospection, identityConfiguration, validIdentity } from '../lib/identity.mjs';

const identity = { subject: 'synthetic-client', tenantId: 'synthetic-tenant', product: 'besoinavocat', active: true };
const config = { url: 'https://identity.invalid.example/introspect', serviceToken: 'synthetic-service-token' };

test('identity requires a verified active product-specific identity and no injected roles', () => {
  assert.equal(validIdentity(identity), true);
  for (const value of [null, {}, [], { ...identity, active: false }, { ...identity, product: 'other' },
    { ...identity, role: 'owner' }, { ...identity, tenantId: '' }, { ...identity, subject: ' client ' },
    { ...identity, active: 'true' }]) assert.equal(validIdentity(value), false);
});

test('missing or unsafe TAKATAK configuration fails closed without contacting any server', async t => {
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => { requests++; throw new Error('Unexpected request'); });
  for (const env of [{}, { TAKATAK_IDENTITY_URL: 'http://identity.invalid.example', TAKATAK_SERVICE_TOKEN: 'synthetic' },
    { TAKATAK_IDENTITY_URL: 'https://user:password@identity.invalid.example', TAKATAK_SERVICE_TOKEN: 'synthetic' },
    { TAKATAK_IDENTITY_URL: 'https://identity.invalid.example/#fragment', TAKATAK_SERVICE_TOKEN: 'synthetic' },
    { TAKATAK_IDENTITY_URL: config.url, TAKATAK_SERVICE_TOKEN: 'has whitespace' }]) {
    assert.equal(identityConfiguration(env), null);
    await assert.rejects(createIntrospection(identityConfiguration(env))('synthetic-token'), error => error.status === 503 && error.code === 'IDENTITY_UNAVAILABLE');
  }
  assert.equal(requests, 0);
});

test('introspection uses the dedicated product contract, denies redirects and does not trust token contents', async t => {
  let seen;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    seen = { url, options };
    return new Response(JSON.stringify(identity), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  const verified = await createIntrospection(config)('arbitrary-not-decoded-as-a-jwt');
  assert.deepEqual(verified, identity);
  assert.equal(seen.url, config.url);
  assert.equal(seen.options.method, 'POST');
  assert.equal(seen.options.redirect, 'error');
  assert.equal(seen.options.headers.Authorization, 'Bearer synthetic-service-token');
  assert.deepEqual(JSON.parse(seen.options.body), { token: 'arbitrary-not-decoded-as-a-jwt', product: 'besoinavocat' });
  assert.ok(seen.options.signal instanceof AbortSignal);
});

test('introspection refuses inactive, malformed, oversized and unavailable identity responses', async t => {
  const cases = [
    [new Response('{}', { status: 401 }), 401],
    [new Response('{}', { status: 403 }), 401],
    [new Response('{}', { status: 500 }), 503],
    [new Response(JSON.stringify(identity), { status: 200, headers: { 'Content-Type': 'text/html' } }), 503],
    [new Response(JSON.stringify({ ...identity, role: 'owner' }), { headers: { 'Content-Type': 'application/json' } }), 401],
    [new Response(JSON.stringify({ ...identity, active: false }), { headers: { 'Content-Type': 'application/json' } }), 401],
    [new Response('invalid-json', { headers: { 'Content-Type': 'application/json' } }), 503],
    [new Response(' '.repeat(17000), { headers: { 'Content-Type': 'application/json' } }), 503],
  ];
  for (const [response, status] of cases) {
    const mocked = t.mock.method(globalThis, 'fetch', async () => response);
    await assert.rejects(createIntrospection(config)('synthetic-user-token'), error => error.status === status && !error.message.includes('synthetic-user-token'));
    mocked.mock.restore();
  }
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('network detail with synthetic-user-token'); });
  await assert.rejects(createIntrospection(config)('synthetic-user-token'), error => error.status === 503 && !error.message.includes('synthetic-user-token'));
});
