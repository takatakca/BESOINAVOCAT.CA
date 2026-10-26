import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createApp } from '../server.mjs';
import { createIntrospection } from '../lib/identity.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const users = {
  alice: { subject: 'alice', tenantId: 'tenant-a', product: 'besoinavocat', active: true },
  colleague: { subject: 'colleague', tenantId: 'tenant-a', product: 'besoinavocat', active: true },
  lawyer: { subject: 'lawyer', tenantId: 'tenant-a', product: 'besoinavocat', active: true },
  owner: { subject: 'owner', tenantId: 'tenant-a', product: 'besoinavocat', active: true },
  stranger: { subject: 'stranger', tenantId: 'tenant-a', product: 'besoinavocat', active: true },
  otherTenant: { subject: 'alice', tenantId: 'tenant-b', product: 'besoinavocat', active: true },
};

async function fixture(t, options = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'besoinavocat-api-test-'));
  const blobDir = path.join(directory, 'blobs');
  const app = createApp({ dbPath: path.join(directory, 'database.sqlite'), blobDir,
    authenticate: options.authenticate ?? (async token => users[token] ?? null) });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  const base = `http://127.0.0.1:${app.address().port}`;
  t.after(async () => {
    await new Promise((resolve, reject) => app.close(error => error ? reject(error) : resolve()));
    assert.equal(path.dirname(directory), path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith('besoinavocat-api-test-'));
    await rm(directory, { recursive: true, force: true });
  });
  async function request(route, { token = 'alice', method = 'GET', body, headers = {}, raw } = {}) {
    const outgoing = { ...headers };
    if (token !== null) outgoing.Authorization = `Bearer ${token}`;
    if (body !== undefined) outgoing['Content-Type'] = 'application/json';
    const response = await fetch(base + route, { method, headers: outgoing,
      body: raw === undefined ? (body === undefined ? undefined : JSON.stringify(body)) : raw });
    const bytes = Buffer.from(await response.arrayBuffer());
    const text = bytes.toString('utf8');
    return { status: response.status, headers: response.headers, bytes, text,
      json: /^application\/json/.test(response.headers.get('content-type') || '') ? JSON.parse(text) : null };
  }
  async function createCase(token = 'alice', title = 'Synthetic case') {
    const result = await request('/api/cases', { token, method: 'POST', body: { title, reference: 'SYNTHETIC' } });
    assert.equal(result.status, 201, result.text);
    return result.json.case;
  }
  function member(caseId, token, role = 'client') {
    app.store.provisionMembership({ tenantId: users[token].tenantId, caseId, subject: users[token].subject, role });
  }
  async function upload(caseId, content = 'Synthetic source bytes', extra = {}, token = 'alice') {
    return request(`/api/cases/${caseId}/documents`, { method: 'POST', token,
      body: { name: 'piece.txt', mimeType: 'text/plain', contentBase64: Buffer.from(content).toString('base64'),
        sourceType: 'original', reviewStatus: 'a_verifier', sourceReference: 'Synthetic test fixture', ...extra } });
  }
  return { app, directory, blobDir, base, request, createCase, member, upload };
}

test('protected endpoints require bearer identity; cookies, query tokens and claimed headers grant nothing', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/health', { token: null })).status, 200);
  for (const [route, headers] of [['/api/me', {}], ['/api/cases', { Cookie: 'session=alice', 'X-Role': 'owner', 'X-Tenant-Id': 'tenant-a' }], ['/api/cases?token=alice', {}]]) {
    assert.equal((await f.request(route, { token: null, headers })).status, 401);
  }
  assert.equal((await f.request('/api/me', { token: 'unrecognized' })).status, 401);
  const me = await f.request('/api/me');
  assert.equal(me.status, 200);
  assert.deepEqual(me.json.user, users.alice);
});

test('unconfigured identity returns 503 with bearer, and 401 without; never creates a local fallback identity', async t => {
  const f = await fixture(t, { authenticate: createIntrospection(null) });
  assert.equal((await f.request('/api/cases', { token: null })).status, 401);
  const result = await f.request('/api/cases');
  assert.equal(result.status, 503);
  assert.equal(result.json.error.code, 'IDENTITY_UNAVAILABLE');
  assert.equal(f.app.store.db.prepare('SELECT COUNT(*) AS n FROM cases').get().n, 0);
});

test('an identity with injected owner role is invalid even when returned by an authenticator', async t => {
  const f = await fixture(t, { authenticate: async () => ({ ...users.alice, role: 'owner' }) });
  assert.equal((await f.request('/api/cases')).status, 401);
});

test('duplicate Authorization headers fail closed', async t => {
  const f = await fixture(t);
  const status = await new Promise((resolve, reject) => {
    const req = http.request(f.base + '/api/me', { headers: { Authorization: ['Bearer alice', 'Bearer owner'] } }, res => {
      res.resume(); res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject); req.end();
  });
  assert.equal(status, 401);
});

test('a new case grants client role only, and public membership/role escalation is unavailable', async t => {
  const f = await fixture(t);
  const item = await f.createCase();
  assert.equal(item.role, 'client');
  assert.equal((await f.request(`/api/cases/${item.id}/audit`)).status, 403);
  assert.equal((await f.request('/api/cases', { method: 'POST', body: { title: 'Forbidden', role: 'owner', tenantId: 'tenant-b' } })).status, 400);
  const grant = await f.request(`/api/cases/${item.id}/members`, { method: 'POST', body: { subject: 'alice', role: 'owner' } });
  assert.equal(grant.status, 404);
  assert.equal((await f.request(`/api/cases/${item.id}`)).json.case.role, 'client');
});

test('tenant isolation applies to lists, detail, download, search, writes and audit even for the same subject', async t => {
  const f = await fixture(t);
  const item = await f.createCase();
  const doc = (await f.upload(item.id, 'TENANT-A-ONLY', { extractedText: 'TENANT-A-ONLY' })).json.document;
  assert.deepEqual((await f.request('/api/cases', { token: 'otherTenant' })).json.cases, []);
  for (const route of [`/api/cases/${item.id}`, doc.downloadUrl, `/api/cases/${item.id}/search?q=TENANT`, `/api/cases/${item.id}/audit`]) {
    const result = await f.request(route, { token: 'otherTenant' });
    assert.equal(result.status, 404);
    assert.doesNotMatch(result.text, /TENANT-A-ONLY/);
  }
  assert.equal((await f.upload(item.id, 'attack', {}, 'otherTenant')).status, 404);
  assert.equal((await f.request(`/api/cases/${item.id}/messages`, { token: 'otherTenant', method: 'POST', body: { body: 'attack' } })).status, 404);
  assert.equal((await f.request(`/api/cases/${item.id}`)).json.documents.length, 1);
});

test('same-tenant membership is required; membership on another case does not confer access', async t => {
  const f = await fixture(t);
  const first = await f.createCase();
  const other = await f.createCase('stranger');
  const doc = (await f.upload(first.id)).json.document;
  assert.equal((await f.request(`/api/cases/${first.id}`, { token: 'stranger' })).status, 404);
  assert.equal((await f.request(doc.downloadUrl, { token: 'stranger' })).status, 404);
  f.member(first.id, 'colleague');
  assert.equal((await f.request(`/api/cases/${first.id}`, { token: 'colleague' })).status, 200);
  assert.equal((await f.request(`/api/cases/${other.id}`, { token: 'colleague' })).status, 404);
  assert.equal((await f.request(`/api/cases/${other.id}/documents/${doc.id}/download`, { token: 'stranger' })).status, 404);
});

test('uploads preserve original bytes and SHA; metadata versions are immutable and branching from old version conflicts', async t => {
  const f = await fixture(t);
  const item = await f.createCase();
  const first = await f.upload(item.id, 'First original');
  assert.equal(first.status, 201, first.text);
  const a = first.json.document;
  assert.equal(a.sha256, hash('First original'));
  assert.equal(a.versionNumber, 1);
  const second = await f.upload(item.id, 'Second supplied version', { versionOf: a.id });
  assert.equal(second.status, 201, second.text);
  const b = second.json.document;
  assert.equal(b.versionNumber, 2);
  assert.equal(b.versionOf, a.id);
  assert.equal(b.rootDocumentId, a.rootDocumentId);
  assert.equal((await f.upload(item.id, 'Conflicting branch', { versionOf: a.id })).status, 409);
  for (const [doc, content] of [[a, 'First original'], [b, 'Second supplied version']]) {
    const download = await f.request(doc.downloadUrl);
    assert.equal(download.status, 200);
    assert.equal(download.text, content);
    assert.equal(download.headers.get('x-content-sha256'), hash(content));
    assert.equal(download.headers.get('content-type'), 'application/octet-stream');
    assert.match(download.headers.get('content-disposition'), /^attachment;/);
    assert.equal(download.headers.get('x-content-type-options'), 'nosniff');
  }
  assert.equal((await f.request(`/api/cases/${item.id}/documents/${a.id}`, { method: 'PATCH', body: { name: 'changed' } })).status, 404);
  assert.equal((await f.request(`/api/cases/${item.id}/documents/${a.id}`, { method: 'DELETE' })).status, 404);
  assert.throws(() => f.app.store.db.prepare('UPDATE documents SET name=? WHERE id=?').run('changed', a.id), /immutable/);
  assert.throws(() => f.app.store.db.prepare('DELETE FROM documents WHERE id=?').run(a.id), /immutable/);
  assert.equal((await f.request(a.downloadUrl)).text, 'First original');
});

test('identical bytes have one stored blob per tenant; occurrences retain provenance and do not imply a new version', async t => {
  const f = await fixture(t);
  const item = await f.createCase();
  const a = (await f.upload(item.id, 'Same bytes', { sourceReference: 'First collection' })).json.document;
  const b = (await f.upload(item.id, 'Same bytes', { sourceReference: 'Second collection' })).json.document;
  assert.equal(a.sha256, b.sha256);
  assert.notEqual(a.id, b.id);
  assert.equal(a.versionNumber, 1);
  assert.equal(b.versionNumber, 1);
  assert.notEqual(a.rootDocumentId, b.rootDocumentId);
  assert.equal(a.duplicateOf, null);
  assert.equal(b.duplicateOf, a.id);
  assert.deepEqual(b.sameHashDocumentIds, [a.id]);
  assert.equal(b.deduplicationScope, 'same_bytes_in_this_case_only');
  const details = (await f.request(`/api/cases/${item.id}`)).json;
  assert.equal(details.documents.length, 2);
  assert.deepEqual(new Set(details.documents.map(d => d.sourceReference)), new Set(['First collection', 'Second collection']));
  const tenantBlobDir = path.join(f.blobDir, hash('tenant-a'));
  assert.deepEqual(await readdir(tenantBlobDir), [a.sha256]);
  const otherCase = await f.createCase();
  const unrelated = (await f.upload(otherCase.id, 'Same bytes')).json.document;
  assert.equal(unrelated.duplicateOf, null);
  assert.deepEqual(unrelated.sameHashDocumentIds, []);
  const otherTenantCase = await f.createCase('otherTenant');
  const isolated = (await f.upload(otherTenantCase.id, 'Same bytes', {}, 'otherTenant')).json.document;
  assert.equal(isolated.duplicateOf, null);
  assert.deepEqual(isolated.sameHashDocumentIds, []);
  assert.deepEqual(await readdir(path.join(f.blobDir, hash('tenant-b'))), [a.sha256]);
});

test('a version cannot reference another case or tenant document', async t => {
  const f = await fixture(t);
  const a = await f.createCase();
  const b = await f.createCase();
  const doc = (await f.upload(a.id)).json.document;
  assert.equal((await f.upload(b.id, 'Another', { versionOf: doc.id })).status, 404);
  const c = await f.createCase('otherTenant');
  assert.equal((await f.upload(c.id, 'Another', { versionOf: doc.id }, 'otherTenant')).status, 404);
  assert.equal((await f.request(`/api/cases/${b.id}`)).json.documents.length, 0);
});

test('tampered stored bytes are not returned as verified originals', async t => {
  const f = await fixture(t);
  const item = await f.createCase();
  const doc = (await f.upload(item.id, 'immutable')).json.document;
  const file = path.join(f.blobDir, hash('tenant-a'), doc.sha256);
  assert.equal((await readFile(file)).toString(), 'immutable');
  await writeFile(file, 'tampered');
  const result = await f.request(doc.downloadUrl);
  assert.equal(result.status, 409);
  assert.equal(result.json.error.code, 'INTEGRITY_ERROR');
  assert.doesNotMatch(result.text, /tampered/);
});

test('untrusted XSS strings remain JSON text; downloads cannot execute declared content', async t => {
  const f = await fixture(t);
  const payload = '<script>globalThis.compromised=true</script><img src=x onerror=alert(1)>';
  const item = await f.createCase('alice', payload);
  const message = await f.request(`/api/cases/${item.id}/messages`, { method: 'POST', body: { body: payload } });
  assert.equal(message.status, 201);
  assert.equal(message.json.message.body, payload);
  const uploaded = await f.upload(item.id, payload, { extractedText: payload, sourceType: 'ocr', reviewStatus: 'controle_visuel' });
  assert.equal(uploaded.status, 201);
  assert.equal(uploaded.json.document.extractionVerified, false);
  assert.equal(uploaded.json.document.reviewIsCertification, false);
  const result = await f.request(`/api/cases/${item.id}/search?q=compromised`);
  assert.equal(result.status, 200);
  assert.match(result.headers.get('content-type'), /^application\/json/);
  assert.match(result.headers.get('content-security-policy'), /default-src 'none'/);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(result.json.results[0].excerpt, payload);
  const download = await f.request(uploaded.json.document.downloadUrl);
  assert.equal(download.headers.get('content-type'), 'application/octet-stream');
  assert.match(download.headers.get('content-disposition'), /^attachment;/);
  assert.equal(globalThis.compromised, undefined);
});

test('search escapes SQL LIKE wildcard characters and remains confined to the current case', async t => {
  const f = await fixture(t);
  const item = await f.createCase();
  await f.upload(item.id, 'one', { extractedText: '100%_literal' });
  await f.upload(item.id, 'two', { name: 'other.txt', extractedText: 'ordinary' });
  const result = await f.request(`/api/cases/${item.id}/search?q=${encodeURIComponent('%_')}`);
  assert.equal(result.status, 200);
  assert.equal(result.json.results.length, 1);
  assert.equal((await f.request(`/api/cases/${item.id}/search?q=${encodeURIComponent("' OR 1=1 --")}`)).json.results.length, 0);
});

test('path traversal, filename injection and private storage paths are not exposed', async t => {
  const f = await fixture(t);
  const item = await f.createCase();
  for (const name of ['../escape.txt', '..\\escape.txt', 'C:\\escape.txt', 'name:stream', 'bad\r\nheader.txt']) {
    assert.equal((await f.upload(item.id, 'test', { name })).status, 400);
  }
  for (const route of ['/%2e%2e/server.mjs', '/.data/platform.sqlite', '/lib/store.mjs', '/blobs/', '/api/cases/%2e%2e/download', '/api/cases/%2fetc%2fpasswd']) {
    const result = await f.request(route);
    assert.ok([400, 404].includes(result.status), route + ' ' + result.status);
    assert.doesNotMatch(result.text, /CREATE TABLE|SQLite format|TAKATAK_SERVICE_TOKEN/);
  }
  assert.equal((await f.request(`/api/cases/${item.id}`)).json.documents.length, 0);
});

test('uploads reject malformed JSON/base64, disallowed MIME, extra authority fields and oversized files', async t => {
  const f = await fixture(t);
  const item = await f.createCase();
  const route = `/api/cases/${item.id}/documents`;
  for (const encoded of ['', '***', 'AB==', 'YQ', 'YQ==\n']) assert.equal((await f.upload(item.id, 'x', { contentBase64: encoded })).status, 400);
  assert.equal((await f.upload(item.id, 'x', { mimeType: 'text/html' })).status, 400);
  assert.equal((await f.upload(item.id, 'x', { sha256: '0'.repeat(64) })).status, 400);
  assert.equal((await f.upload(item.id, 'x', { tenantId: 'tenant-b' })).status, 400);
  assert.equal((await f.request(route, { method: 'POST', raw: '{"broken":', headers: { 'Content-Type': 'application/json' } })).status, 400);
  assert.equal((await f.request(route, { method: 'POST', raw: '{}', headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await f.request(route, { method: 'POST', raw: '{}', headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' } })).status, 415);
  assert.equal((await f.upload(item.id, Buffer.alloc(5 * 1024 * 1024 + 1))).status, 413);
  assert.equal((await f.request(`/api/cases/${item.id}`)).json.documents.length, 0);
});

test('time durations are bounded integers and only an independent owner/lawyer may approve', async t => {
  const f = await fixture(t);
  const item = await f.createCase();
  f.member(item.id, 'colleague'); f.member(item.id, 'lawyer', 'lawyer'); f.member(item.id, 'owner', 'owner');
  const route = `/api/cases/${item.id}/time`;
  for (const minutes of [0, -1, 1441, 1.5, '60', null]) {
    assert.equal((await f.request(route, { method: 'POST', body: { description: 'Synthetic work', minutes } })).status, 400);
  }
  assert.equal((await f.request(route, { method: 'POST', body: { description: 'Synthetic work', minutes: 60, status: 'approved' } })).status, 400);
  const submitted = await f.request(route, { method: 'POST', body: { description: 'Synthetic work', minutes: 1440 } });
  assert.equal(submitted.status, 201);
  const entry = submitted.json.timeEntry;
  assert.equal(entry.status, 'submitted');
  const approve = `${route}/${entry.id}/approve`;
  assert.equal((await f.request(approve, { method: 'POST', body: {} })).status, 403);
  assert.equal((await f.request(approve, { token: 'colleague', method: 'POST', body: {} })).status, 403);
  assert.equal((await f.request(approve, { token: 'otherTenant', method: 'POST', body: {} })).status, 404);
  const approved = await f.request(approve, { token: 'lawyer', method: 'POST', body: {} });
  assert.equal(approved.status, 200, approved.text);
  assert.equal(approved.json.timeEntry.status, 'approved');
  assert.equal(approved.json.timeEntry.approvedBy, 'lawyer');
  assert.equal((await f.request(approve, { token: 'owner', method: 'POST', body: {} })).status, 409);
  const self = (await f.request(route, { token: 'owner', method: 'POST', body: { description: 'Owner work', minutes: 1 } })).json.timeEntry;
  assert.equal((await f.request(`${route}/${self.id}/approve`, { token: 'owner', method: 'POST', body: {} })).status, 403);
  assert.equal((await f.request(`${route}/${self.id}/approve`, { token: 'lawyer', method: 'POST', body: { approvedBy: 'owner' } })).status, 400);
});

test('audit access is role-restricted, append-only, and does not copy message or extracted contents', async t => {
  const f = await fixture(t);
  const item = await f.createCase();
  f.member(item.id, 'owner', 'owner');
  await f.upload(item.id, 'source', { extractedText: 'SENSITIVE_SYNTHETIC_OCR' });
  await f.request(`/api/cases/${item.id}/messages`, { method: 'POST', body: { body: 'SENSITIVE_SYNTHETIC_MESSAGE' } });
  assert.equal((await f.request(`/api/cases/${item.id}/audit`)).status, 403);
  const audit = await f.request(`/api/cases/${item.id}/audit`, { token: 'owner' });
  assert.equal(audit.status, 200);
  assert.ok(audit.json.events.some(event => event.action === 'document.version_added'));
  assert.doesNotMatch(audit.text, /SENSITIVE_SYNTHETIC/);
  const event = audit.json.events[0];
  assert.throws(() => f.app.store.db.prepare('UPDATE audit_events SET action=? WHERE id=?').run('forged', event.id), /append_only/);
  assert.throws(() => f.app.store.db.prepare('DELETE FROM audit_events WHERE id=?').run(event.id), /append_only/);
});
