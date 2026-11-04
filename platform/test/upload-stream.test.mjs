import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import http from 'node:http';
import { createApp } from '../server.mjs';

const users = {
  alice: { tenantId: 'tenant-a', subject: 'alice', product: 'besoinavocat', active: true },
  mallory: { tenantId: 'tenant-b', subject: 'mallory', product: 'besoinavocat', active: true },
};
const sha = value => createHash('sha256').update(value).digest('hex');
const header = meta => encodeURIComponent(JSON.stringify(meta));
const meta = { name: 'pièce.pdf', mimeType: 'application/pdf', sourceType: 'original', reviewStatus: 'a_verifier' };

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'besoinavocat-stream-test-'));
  const app = createApp({ dbPath: path.join(directory, 'database.sqlite'), blobDir: path.join(directory, 'blobs'),
    authenticate: async token => users[token] ?? null });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  const base = `http://127.0.0.1:${app.address().port}`;
  t.after(async () => {
    await new Promise((resolve, reject) => app.close(error => error ? reject(error) : resolve()));
    await rm(directory, { recursive: true, force: true });
  });
  const request = async (route, { token = 'alice', method = 'GET', headers = {}, body } = {}) => {
    const response = await fetch(base + route, { method, headers: { Authorization: `Bearer ${token}`, ...headers }, body });
    const bytes = Buffer.from(await response.arrayBuffer());
    const json = /^application\/json/u.test(response.headers.get('content-type') || '') ? JSON.parse(bytes.toString('utf8')) : null;
    return { status: response.status, json, bytes, text: bytes.toString('utf8') };
  };
  const created = await request('/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Dossier fictif' }) });
  assert.equal(created.status, 201, created.text);
  const caseId = created.json.case.id;
  const stream = (bytes, extra = {}, token = 'alice') => request(`/api/cases/${caseId}/documents/stream`, { method: 'PUT', token,
    headers: { 'Content-Type': 'application/octet-stream', 'X-BesoinAvocat-Document': header(meta), ...extra }, body: bytes });
  const oversized = id => new Promise((resolve, reject) => {
    const req = http.request(`${base}/api/cases/${id}/documents/stream`, { method: 'PUT', headers: { Authorization: 'Bearer alice',
      'Content-Type': 'application/octet-stream', 'X-BesoinAvocat-Document': header(meta), 'Content-Length': String(200 * 1024 * 1024) } },
    response => { response.resume(); response.on('end', () => resolve(response.statusCode)); });
    req.on('error', reject);
    req.flushHeaders();
  });
  return { request, caseId, stream, oversized };
}

test('a raw upload is stored, hashed and downloadable exactly like a JSON upload', async t => {
  const { request, caseId, stream } = await fixture(t);
  const bytes = Buffer.concat([Buffer.from('%PDF-1.4 fictif\n'), randomBytes(300000)]);
  const result = await stream(bytes);
  assert.equal(result.status, 201, result.text);
  const document = result.json.document;
  assert.equal(document.name, 'pièce.pdf');
  assert.equal(document.sha256, sha(bytes));
  assert.equal(document.bytes, bytes.length);
  const got = await request(document.downloadUrl);
  assert.equal(got.status, 200);
  assert.ok(got.bytes.equals(bytes), 'the downloaded bytes are the uploaded bytes');
  const detail = await request(`/api/cases/${caseId}`);
  assert.equal(detail.json.documents.length, 1);
  assert.equal(detail.json.documents[0].id, document.id);
  // A second copy of the same bytes is accepted and linked as the same content, as with the JSON route.
  const again = await stream(bytes, { 'X-BesoinAvocat-Document': header({ ...meta, name: 'copie.pdf' }) });
  assert.equal(again.status, 201);
  assert.deepEqual(again.json.document.sameHashDocumentIds, [document.id]);
  // The JSON route still works unchanged and gives the same hash for the same bytes.
  const viaJson = await request(`/api/cases/${caseId}/documents`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...meta, name: 'json.pdf', contentBase64: bytes.toString('base64') }) });
  assert.equal(viaJson.status, 201, viaJson.text);
  assert.equal(viaJson.json.document.sha256, document.sha256);
});

test('the streaming route enforces the same limits and access rules', async t => {
  const { caseId, stream, request, oversized } = await fixture(t);
  const small = Buffer.from('contenu fictif');
  assert.equal((await stream(small, { 'Content-Type': 'application/json' })).status, 415);
  assert.equal((await stream(small, { 'Content-Encoding': 'gzip' })).status, 415);
  assert.equal((await stream(Buffer.alloc(0))).status, 400);
  assert.equal((await stream(small, { 'X-BesoinAvocat-Document': '' })).status, 400);
  assert.equal((await stream(small, { 'X-BesoinAvocat-Document': header({ ...meta, mimeType: 'text/html' }) })).status, 400);
  assert.equal((await stream(small, { 'X-BesoinAvocat-Document': header({ ...meta, extra: 1 }) })).status, 400);
  assert.equal((await stream(small, { 'X-BesoinAvocat-Document': header({ ...meta, contentBase64: 'QQ==' }) })).status, 400);
  assert.equal((await stream(small, { 'X-BesoinAvocat-Document': 'not%json' })).status, 400);
  assert.equal((await stream(small, { 'X-BesoinAvocat-Document': 'x'.repeat(9000) })).status, 400);
  assert.equal((await stream(small, {}, 'mallory')).status, 404, 'another tenant never learns the case exists');
  // A declared length above the limit is refused on the headers alone, before any byte is read.
  const tooLarge = await oversized(caseId);
  assert.equal(tooLarge, 413);
  const after = await request(`/api/cases/${caseId}`);
  assert.equal(after.json.documents.length, 0, 'no refused upload left a document behind');
});

test('a new version through the streaming route keeps the version chain', async t => {
  const { stream } = await fixture(t);
  const first = await stream(Buffer.from('version 1 fictive'));
  assert.equal(first.status, 201);
  const second = await stream(Buffer.from('version 2 fictive'), { 'X-BesoinAvocat-Document': header({ ...meta, versionOf: first.json.document.id }) });
  assert.equal(second.status, 201, second.text);
  assert.equal(second.json.document.versionNumber, 2);
  assert.equal(second.json.document.rootDocumentId, first.json.document.id);
  const stale = await stream(Buffer.from('version 3 fictive'), { 'X-BesoinAvocat-Document': header({ ...meta, versionOf: first.json.document.id }) });
  assert.equal(stale.status, 409);
});
