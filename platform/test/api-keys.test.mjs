import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';
import { API_SCOPES, apiKeyConfiguration, createApiKeys, generateApiKey } from '../lib/api-keys.mjs';
import { createKeyEntry, parseArguments, render } from '../tools/api-key.mjs';

const WP = 'https://www.example.test';
const contact = () => ({ name: 'Personne Synthétique', email: 'synthetic@example.test', role: 'client', language: 'fr',
  domain: 'civil', region: 'montreal', consent: true, consentVersion: '2026-10-26.1', website: '' });
const sha = value => createHash('sha256').update(value).digest('hex');

function keyset(...entries) {
  return JSON.stringify(entries.map(([key, scopes, extra]) => ({ id: key.split('_')[1], sha256: sha(key), scopes, ...extra })));
}

async function fixture(t, override = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'ba-apikey-test-'));
  const file = path.join(root, 'intake.sqlite');
  const site = generateApiKey('site-wordpress').key, reader = generateApiKey('takatak-tableau').key;
  const env = { BESOINAVOCAT_INTAKE_DB_PATH: file, BESOINAVOCAT_INTAKE_ALLOWED_ORIGINS: JSON.stringify([WP]),
    BESOINAVOCAT_API_KEYS: keyset([site, ['intake:write', 'catalog:read'], { name: 'Site besoinavocat.ca' }], [reader, ['intakes:read']]), ...override };
  const app = createApp({ dbPath: path.join(root, 'cases.sqlite'), blobDir: path.join(root, 'blobs'), env });
  app.listen(0, '127.0.0.1'); await once(app, 'listening');
  const base = `http://127.0.0.1:${app.address().port}`;
  const request = async (route, { method = 'GET', body, headers = {} } = {}) => {
    const response = await fetch(base + route, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    return { status: response.status, json: text ? JSON.parse(text) : null, headers: response.headers };
  };
  const bearer = key => ({ Authorization: `Bearer ${key}` });
  const rows = () => { const db = new DatabaseSync(file, { readOnly: true }); try { return db.prepare('SELECT reference,origin FROM ba_intakes').all(); } finally { db.close(); } };
  t.after(async () => {
    if (app.listening) await new Promise(resolve => app.close(resolve));
    assert.match(path.basename(root), /^ba-apikey-test-/);
    await rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
  });
  return { app, request, bearer, site, reader, rows, file };
}

test('a generated key has the documented shape and only its digest is configured', () => {
  const generated = generateApiKey('site-wordpress');
  assert.match(generated.key, /^ba_site-wordpress_[A-Za-z0-9_-]{43}$/u);
  assert.equal(generated.sha256, sha(generated.key));
  assert.throws(() => generateApiKey('Site WordPress'), /Identifiant/u);
  const config = apiKeyConfiguration({ BESOINAVOCAT_API_KEYS: JSON.stringify([{ id: generated.id, sha256: generated.sha256, scopes: ['intake:write'] }]) });
  assert.equal(config.configured, true); assert.deepEqual(config.keys[0], { id: 'site-wordpress', name: 'site-wordpress', sha256: generated.sha256, scopes: ['intake:write'] });
});

test('one malformed entry disables every key; absent variable means not configured', () => {
  assert.deepEqual(apiKeyConfiguration({}), { keys: [], configured: false, malformed: false });
  const good = { id: 'ok', sha256: sha('x'), scopes: ['catalog:read'] };
  for (const bad of [{ ...good, scopes: [] }, { ...good, scopes: ['cases:read'] }, { ...good, sha256: 'abc' }, { ...good, id: 'Bad Id' }, { ...good, extra: 1 }, { ...good, name: '<b>' }, 'ba_x_y', null]) {
    const config = apiKeyConfiguration({ BESOINAVOCAT_API_KEYS: JSON.stringify([good, bad]) });
    assert.deepEqual(config.keys, []); assert.equal(config.malformed, true);
  }
  assert.equal(apiKeyConfiguration({ BESOINAVOCAT_API_KEYS: JSON.stringify([good, { ...good, sha256: sha('y') }]) }).malformed, true, 'duplicate id');
  assert.equal(apiKeyConfiguration({ BESOINAVOCAT_API_KEYS: '{' }).malformed, true);
  assert.equal(apiKeyConfiguration({ BESOINAVOCAT_API_KEYS: '[]' }).malformed, true);
});

test('authentication compares digests, refuses browsers and unknown ids, and enforces scopes and limits', () => {
  const generated = generateApiKey('site-wordpress');
  let time = 1_000_000;
  const keys = createApiKeys({ config: apiKeyConfiguration({ BESOINAVOCAT_API_KEYS: JSON.stringify([{ id: 'site-wordpress', sha256: generated.sha256, scopes: ['intake:write'] }]) }), now: () => time });
  const req = (headers, rawHeaders) => ({ headers, rawHeaders: rawHeaders ?? Object.entries(headers).flat() });
  const client = keys.authenticate(req({ authorization: `Bearer ${generated.key}` }));
  assert.deepEqual(client, { id: 'site-wordpress', name: 'site-wordpress', scopes: ['intake:write'] });
  assert.throws(() => keys.authenticate(req({})), { status: 401, code: 'API_KEY_REQUIRED' });
  for (const headers of [{ authorization: 'Bearer ba_site-wordpress_' + 'a'.repeat(43) }, { authorization: 'Bearer ba_other_' + generated.key.split('_')[2] }, { authorization: 'Basic abc' },
    { authorization: `Bearer ${generated.key}`, cookie: 'x=1' }, { authorization: `Bearer ${generated.key}`, origin: WP }]) {
    assert.throws(() => keys.authenticate(req(headers)), { status: 403, code: 'API_KEY_INVALID' });
  }
  assert.throws(() => keys.authenticate(req({ authorization: `Bearer ${generated.key}` }, ['Authorization', 'Bearer a', 'Authorization', 'Bearer b'])), { status: 403 });
  assert.throws(() => keys.require(client, 'intakes:read'), { status: 403, code: 'API_SCOPE_MISSING' });
  assert.equal(keys.require(client, 'intake:write'), client);
  assert.throws(() => keys.require(client, 'root'), /Unknown API scope/u);
  for (let index = 0; index < 60; index++) keys.reserve(client);
  assert.throws(() => keys.reserve(client), { status: 429, code: 'API_RATE_LIMIT' });
  time += 61_000;
  keys.reserve(client);
  assert.deepEqual(API_SCOPES, ['catalog:read', 'intake:write', 'intakes:read']);
});

test('/api/v1 deposits a request server to server, replays idempotently and keeps browser routes separate', async t => {
  const f = await fixture(t);
  const health = await f.request('/api/health');
  assert.equal(health.json.apiKeysConfigured, true);
  const me = await f.request('/api/v1/me', { headers: f.bearer(f.site) });
  assert.equal(me.status, 200); assert.deepEqual(me.json, { id: 'site-wordpress', name: 'Site besoinavocat.ca', scopes: ['intake:write', 'catalog:read'] });
  assert.equal(me.headers.get('access-control-allow-origin'), null);
  assert.equal(me.headers.get('cache-control'), 'no-store');
  const anonymous = await f.request('/api/v1/me');
  assert.equal(anonymous.status, 401); assert.equal(anonymous.json.error.code, 'API_KEY_REQUIRED');
  assert.match(anonymous.headers.get('www-authenticate'), /^Bearer realm="besoinavocat"/u);
  const wrong = await f.request('/api/v1/me', { headers: f.bearer('ba_site-wordpress_' + 'b'.repeat(43)) });
  assert.equal(wrong.status, 403); assert.equal(wrong.json.error.code, 'API_KEY_INVALID');
  const browserLike = await f.request('/api/v1/me', { headers: { ...f.bearer(f.site), Origin: WP } });
  assert.equal(browserLike.status, 403);

  const key = randomUUID();
  const created = await f.request('/api/v1/intake', { method: 'POST', body: contact(), headers: { ...f.bearer(f.site), 'Idempotency-Key': key } });
  assert.equal(created.status, 201); assert.match(created.json.reference, /^BA-[A-Za-z0-9_-]{24}$/u); assert.equal(created.json.status, 'received');
  const replay = await f.request('/api/v1/intake', { method: 'POST', body: contact(), headers: { ...f.bearer(f.site), 'Idempotency-Key': key } });
  assert.equal(replay.status, 201); assert.equal(replay.json.reference, created.json.reference);
  const conflict = await f.request('/api/v1/intake', { method: 'POST', body: { ...contact(), name: 'Autre Personne' }, headers: { ...f.bearer(f.site), 'Idempotency-Key': key } });
  assert.equal(conflict.status, 409); assert.equal(conflict.json.error.code, 'IDEMPOTENCY_CONFLICT');
  assert.deepEqual(f.rows().map(row => row.origin), ['apikey:site-wordpress']);
  const noKey = await f.request('/api/v1/intake', { method: 'POST', body: contact(), headers: f.bearer(f.site) });
  assert.equal(noKey.status, 400);
  const badKey = await f.request('/api/v1/intake', { method: 'POST', body: contact(), headers: { ...f.bearer(f.site), 'Idempotency-Key': 'not-a-uuid' } });
  assert.equal(badKey.status, 400); assert.equal(badKey.json.error.code, 'INTAKE_INVALID_INPUT');
  const invalidBody = await f.request('/api/v1/intake', { method: 'POST', body: { ...contact(), consent: false }, headers: { ...f.bearer(f.site), 'Idempotency-Key': randomUUID() } });
  assert.equal(invalidBody.status, 400); assert.equal(invalidBody.json.error.code, 'INTAKE_CONSENT_REQUIRED');
  // A browser idempotency key never collides with a platform one: same key, different origin -> conflict, no second row.
  const browser = await f.request('/api/intake', { method: 'POST', body: contact(), headers: { Origin: WP, 'X-Requested-With': 'XMLHttpRequest', 'Idempotency-Key': key } });
  assert.equal(browser.status, 409);
  assert.equal(f.rows().length, 1);

  const scoped = await f.request('/api/v1/intakes/summary', { headers: f.bearer(f.site) });
  assert.equal(scoped.status, 403); assert.equal(scoped.json.error.code, 'API_SCOPE_MISSING');
  const summary = await f.request('/api/v1/intakes/summary', { headers: f.bearer(f.reader) });
  assert.equal(summary.status, 200);
  assert.equal(summary.json.total, 1); assert.equal(summary.json.open, 1); assert.equal(summary.json.counts.received, 1);
  assert.equal(typeof summary.json.lastReceivedAt, 'string');
  assert.deepEqual(Object.keys(summary.json).sort(), ['counts', 'generatedAt', 'lastReceivedAt', 'open', 'total']);
  const readerIntake = await f.request('/api/v1/intake', { method: 'POST', body: contact(), headers: { ...f.bearer(f.reader), 'Idempotency-Key': randomUUID() } });
  assert.equal(readerIntake.status, 403); assert.equal(readerIntake.json.error.code, 'API_SCOPE_MISSING');
  const catalog = await f.request('/api/v1/catalog', { headers: f.bearer(f.site) });
  assert.equal(catalog.status, 200); assert.equal(catalog.json.version, '2026-11-04.1');
  assert.equal((await f.request('/api/v1/unknown', { headers: f.bearer(f.site) })).status, 404);
  assert.equal((await f.request('/api/v1/catalog', { method: 'POST', body: {}, headers: f.bearer(f.site) })).status, 405);
  assert.equal((await f.request('/api/v1/me?x=1', { headers: f.bearer(f.site) })).status, 400);
});

test('without BESOINAVOCAT_API_KEYS every /api/v1 call is refused and the browser form still works', async t => {
  const f = await fixture(t, { BESOINAVOCAT_API_KEYS: '' });
  assert.equal((await f.request('/api/health')).json.apiKeysConfigured, false);
  const refused = await f.request('/api/v1/me', { headers: f.bearer(f.site) });
  assert.equal(refused.status, 403);
  const browser = await f.request('/api/intake', { method: 'POST', body: contact(), headers: { Origin: WP, 'X-Requested-With': 'XMLHttpRequest', 'Idempotency-Key': randomUUID() } });
  assert.equal(browser.status, 201);
});

test('the command line tool prints the key once and a configuration entry with its digest only', () => {
  const options = parseArguments(['--id', 'site-wordpress', '--name', 'Site besoinavocat.ca', '--scopes', 'intake:write,catalog:read']);
  const result = createKeyEntry(options);
  assert.equal(result.entry.sha256, sha(result.key));
  assert.deepEqual(result.entry, { id: 'site-wordpress', name: 'Site besoinavocat.ca', sha256: sha(result.key), scopes: ['intake:write', 'catalog:read'] });
  const output = render(result);
  assert.ok(output.includes(result.key)); assert.ok(output.includes(JSON.stringify(result.entry)));
  assert.throws(() => parseArguments(['--scopes', 'x']), /--id/u);
  assert.throws(() => parseArguments(['--id', 'a', '--scopes', 'cases:read']), /--scopes/u);
  assert.throws(() => parseArguments(['--id', 'a', '--bogus']), /inconnue/u);
  assert.deepEqual(parseArguments(['--id', 'a']).scopes, ['intake:write']);
});
