// Clio Manage flow against a local fake Clio: no network, no real account.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../lib/store.mjs';
import { createIntegrations, integrationConfiguration } from '../lib/integrations.mjs';
import { createClio } from '../lib/clio.mjs';

const users = Object.fromEntries(['client', 'lawyer', 'owner'].map(subject => [subject, { subject, tenantId: 'tenant-a' }]));
const API = 'https://ca.app.clio.com/api/v4';
const rejects = (promise, status) => assert.rejects(promise, error => error.status === status);

function fixture(t, extra = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ba-clio-'));
  const keyFile = join(dir, 'integrations.key');
  writeFileSync(keyFile, randomBytes(32), { mode: 0o600, flag: 'wx' });
  const store = createStore({ dbPath: join(dir, 'db.sqlite'), blobDir: join(dir, 'blobs') });
  const caseId = store.createCase(users.client, { title: 'Bail commercial', reference: 'SYN-7' }).id;
  for (const role of ['owner', 'lawyer']) store.provisionMembership({ ...users[role], caseId, role });
  const calls = [], routes = new Map();
  async function fetch(url, options = {}) {
    const parsed = new URL(url), method = options.method || 'GET';
    const request = { url: parsed, method, headers: options.headers || {}, json: options.headers?.['Content-Type'] === 'application/json' ? JSON.parse(options.body) : null };
    calls.push(request);
    const handler = routes.get(`${method} ${parsed.origin}${parsed.pathname}`);
    if (!handler) throw new Error(`Unexpected call ${method} ${parsed.href}`);
    const { status = 200, body = null } = await handler(request);
    return new Response(body === null ? null : JSON.stringify(body), { status, headers: body === null ? {} : { 'content-type': 'application/json' } });
  }
  const on = (key, handler) => routes.set(key, handler);
  on('POST https://ca.app.clio.com/oauth/token', () => ({ body: { access_token: 'clio-access', refresh_token: 'clio-refresh', token_type: 'bearer', expires_in: 3600 } }));
  on(`GET ${API}/users/who_am_i`, () => ({ body: { data: { id: 345, email: 'avocate@clio.example.test' } } }));
  const env = { APP_ORIGIN: 'https://portail.example.test', BESOINAVOCAT_INTEGRATIONS_KEY_FILE: keyFile, BESOINAVOCAT_CLIO_CLIENT_ID: 'clio-client', BESOINAVOCAT_CLIO_CLIENT_SECRET: 'clio-secret-value', ...extra };
  const integrations = createIntegrations({ db: store.db, access: store.access, audit: store.audit, config: integrationConfiguration(env), fetch });
  const clio = createClio({ db: store.db, access: store.access, audit: store.audit, clio: integrations.clio });
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  const connect = async user => {
    const state = new URL(integrations.connect(user, 'clio').authorizationUrl).searchParams.get('state');
    return integrations.complete(user, { state, code: 'code-clio' });
  };
  return { store, caseId, clio, on, calls, connect };
}

test('create the client and matter in Clio, then send each approved time entry exactly once', async t => {
  const f = fixture(t);
  assert.deepEqual(f.clio.status(users.lawyer, f.caseId), { configured: true, connected: false, matter: null, pendingTime: 0 });
  assert.throws(() => f.clio.status(users.client, f.caseId), error => error.status === 403);
  await f.connect(users.lawyer);
  f.on(`POST ${API}/contacts.json`, request => {
    assert.deepEqual(request.json.data, { type: 'Person', first_name: 'Marie', last_name: 'Tremblay', email_addresses: [{ name: 'Work', address: 'marie@example.test', default_email: true }] });
    return { status: 201, body: { data: { id: 9001 } } };
  });
  f.on(`POST ${API}/matters.json`, request => {
    assert.deepEqual(request.json.data, { client: { id: 9001 }, description: 'SYN-7 · Bail commercial', status: 'Open' });
    return { status: 201, body: { data: { id: 7001, display_number: '00042-Tremblay' } } };
  });
  await rejects(f.clio.exportTime(users.lawyer, f.caseId), 409);
  const made = await f.clio.createMatter(users.lawyer, f.caseId, { firstName: 'Marie', lastName: 'Tremblay', email: 'marie@example.test' });
  assert.equal(made.matter.displayNumber, '00042-Tremblay');
  assert.equal(made.matter.url, 'https://ca.app.clio.com/nc/#/matters/7001');
  await rejects(f.clio.createMatter(users.lawyer, f.caseId, { firstName: 'Marie', lastName: 'Tremblay' }), 409);

  // Only approved entries go, as Clio time entries in seconds, once each.
  const a = f.store.submitTime(users.owner, f.caseId, { description: 'Analyse du bail', minutes: 45 });
  f.store.submitTime(users.owner, f.caseId, { description: 'Non approuvée', minutes: 30 });
  f.store.approveTime(users.lawyer, f.caseId, a.id);
  assert.equal(f.clio.status(users.lawyer, f.caseId).pendingTime, 1);
  let activities = 0;
  f.on(`POST ${API}/activities.json`, request => {
    assert.equal(request.json.data.type, 'TimeEntry');
    assert.equal(request.json.data.quantity, 2700);
    assert.equal(request.json.data.note, 'Analyse du bail');
    assert.deepEqual(request.json.data.matter, { id: 7001 });
    return { status: 201, body: { data: { id: 5000 + ++activities } } };
  });
  assert.deepEqual(await f.clio.exportTime(users.lawyer, f.caseId), { sent: 1, remaining: 0 });
  assert.deepEqual(await f.clio.exportTime(users.lawyer, f.caseId), { sent: 0, remaining: 0 });
  assert.equal(activities, 1);
  assert.ok(f.calls.every(c => c.headers.Authorization === 'Bearer clio-access' || c.url.pathname === '/oauth/token'));
  const audit = f.store.listAudit(users.lawyer, f.caseId).map(e => e.action);
  for (const action of ['clio.matter_created', 'clio.time_exported']) assert.ok(audit.includes(action), action);
});

test('a refused time entry is not marked sent and can be retried; without keys nothing is called', async t => {
  const f = fixture(t);
  await f.connect(users.lawyer);
  f.on(`POST ${API}/contacts.json`, () => ({ status: 201, body: { data: { id: 1 } } }));
  f.on(`POST ${API}/matters.json`, () => ({ status: 201, body: { data: { id: 2, display_number: '1' } } }));
  await f.clio.createMatter(users.lawyer, f.caseId, { firstName: 'A', lastName: 'B' });
  const entry = f.store.submitTime(users.owner, f.caseId, { description: 'Appel', minutes: 10 });
  f.store.approveTime(users.lawyer, f.caseId, entry.id);
  f.on(`POST ${API}/activities.json`, () => ({ status: 422, body: { error: { message: 'invalid' } } }));
  await rejects(f.clio.exportTime(users.lawyer, f.caseId), 502);
  assert.equal(f.clio.status(users.lawyer, f.caseId).pendingTime, 1);
  f.on(`POST ${API}/activities.json`, () => ({ status: 201, body: { data: { id: 3 } } }));
  assert.equal((await f.clio.exportTime(users.lawyer, f.caseId)).sent, 1);

  const bare = fixture(t, { BESOINAVOCAT_CLIO_CLIENT_ID: undefined });
  assert.equal(bare.clio.status(users.lawyer, bare.caseId).configured, false);
  await rejects(bare.clio.createMatter(users.lawyer, bare.caseId, { firstName: 'A', lastName: 'B' }), 503);
  assert.equal(bare.calls.length, 0);
});
