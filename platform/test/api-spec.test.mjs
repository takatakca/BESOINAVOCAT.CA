import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';
import { API_VERSION, openApiDocument } from '../lib/api-spec.mjs';
import { CATALOG_VERSION } from '../lib/catalog.mjs';
import { API_SCOPES } from '../lib/api-keys.mjs';

test('the OpenAPI document describes the public, platform and session routes without any secret or data', () => {
  const doc = openApiDocument();
  assert.equal(doc.openapi, '3.1.0'); assert.equal(doc.info.version, API_VERSION); assert.equal(doc.info['x-catalog-version'], CATALOG_VERSION);
  assert.deepEqual(doc.servers, [{ url: 'https://portail.besoinavocat.ca', description: 'Portail BesoinAvocat' }]);
  for (const route of ['/api/health', '/api/openapi.json', '/api/catalog', '/api/intake', '/api/v1/me', '/api/v1/catalog', '/api/v1/intake', '/api/v1/intakes/summary', '/api/me', '/api/cases', '/api/integrations', '/api/webhooks/{provider}', '/api/mimt/webhook']) {
    assert.ok(doc.paths[route], `${route} documented`);
  }
  assert.deepEqual(doc.paths['/api/v1/intake'].post.security, [{ platformKey: ['intake:write'] }]);
  assert.equal(doc.components.securitySchemes.platformKey.scheme, 'bearer');
  assert.deepEqual(doc.components.schemas.ApiClient.properties.scopes.items.enum, API_SCOPES);
  const text = JSON.stringify(doc);
  assert.doesNotMatch(text, /ba_[a-z0-9-]+_[A-Za-z0-9_-]{43}/u, 'no key value');
  assert.doesNotMatch(text, /@(?!example)/u, 'no address');
  assert.equal(openApiDocument({ origin: 'https://portal.example.test' }).servers[0].url, 'https://portal.example.test');
});

test('GET /api/openapi.json serves the document publicly, cacheable, with no query and no other method', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'ba-openapi-test-'));
  const app = createApp({ dbPath: path.join(root, 'cases.sqlite'), blobDir: path.join(root, 'blobs'), env: { APP_ORIGIN: 'https://portal.example.test' } });
  app.listen(0, '127.0.0.1'); await once(app, 'listening');
  const base = `http://127.0.0.1:${app.address().port}`;
  t.after(async () => { await new Promise(resolve => app.close(resolve)); await rm(root, { recursive: true, force: true }); });
  const response = await fetch(`${base}/api/openapi.json`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(response.headers.get('cache-control'), 'public, max-age=300');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  const doc = await response.json();
  assert.equal(doc.servers[0].url, 'https://portal.example.test');
  assert.equal(doc.info.title, 'BesoinAvocat — API du portail');
  const head = await fetch(`${base}/api/openapi.json`, { method: 'HEAD' });
  assert.equal(head.status, 200); assert.equal(head.headers.get('content-length'), String(Buffer.byteLength(JSON.stringify(openApiDocument({ origin: 'https://portal.example.test' })))));
  assert.equal((await fetch(`${base}/api/openapi.json`, { method: 'POST' })).status, 405);
  assert.equal((await fetch(`${base}/api/openapi.json?x=1`)).status, 400);
});
