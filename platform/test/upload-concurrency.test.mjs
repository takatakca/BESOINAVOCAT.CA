import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';
import { documentInput, MAX_DOCUMENT_JSON_BYTES } from '../lib/validation.mjs';

const user = { subject: 'synthetic-user', tenantId: 'synthetic-tenant', product: 'besoinavocat', active: true };
const uploadBody = { name: 'synthetic.txt', mimeType: 'text/plain', sourceType: 'original', reviewStatus: 'a_verifier', contentBase64: Buffer.from('Synthetic bytes').toString('base64') };

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'ba-upload-limit-'));
  let heldAuthenticated;
  const authenticated = new Promise(resolve => { heldAuthenticated = resolve; });
  const app = createApp({ dbPath: path.join(directory, 'store.sqlite'), blobDir: path.join(directory, 'blobs'), env: {},
    authenticate: async (_token, req) => { if (req.headers['x-held-upload']) heldAuthenticated(); return user; } });
  app.listen(0, '127.0.0.1'); await once(app, 'listening');
  const base = `http://127.0.0.1:${app.address().port}`;
  const caseId = app.store.createCase(user, { title: 'Synthetic concurrency test', reference: 'TEST' }).id;
  const route = `/api/cases/${caseId}/documents`;
  const requests = [];
  t.after(async () => {
    for (const request of requests) request.destroy();
    app.closeAllConnections();
    await new Promise((resolve, reject) => app.close(error => error ? reject(error) : resolve()));
    assert.equal(path.dirname(directory), path.resolve(tmpdir()));
    assert.match(path.basename(directory), /^ba-upload-limit-/);
    await rm(directory, { recursive: true, force: true });
  });
  function raw(headers = {}) {
    let req;
    const response = new Promise((resolve, reject) => {
      req = http.request(base + route, { method: 'POST', headers: { Authorization: 'Bearer synthetic', 'Content-Type': 'application/json', ...headers } }, res => {
        const chunks = []; res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, json: JSON.parse(Buffer.concat(chunks)) }));
        res.on('error', reject);
      });
      req.on('error', reject); requests.push(req);
    });
    return { req, response };
  }
  async function upload(body = uploadBody) {
    const res = await fetch(base + route, { method: 'POST', headers: { Authorization: 'Bearer synthetic', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: res.status, headers: res.headers, json: await res.json() };
  }
  return { app, raw, upload, authenticated };
}

test('an unfinished upload reserves the single reader slot; a simultaneous upload is refused and later retry succeeds', async t => {
  const f = await fixture(t);
  const held = f.raw({ 'X-Held-Upload': '1' });
  const body = JSON.stringify(uploadBody);
  held.req.write(body.slice(0, 8));
  await f.authenticated;
  await new Promise(resolve => setImmediate(resolve));
  const second = await f.upload();
  assert.equal(second.status, 429);
  assert.equal(second.json.error.code, 'UPLOAD_BUSY');
  assert.equal(second.headers.get('retry-after'), '1');
  assert.equal(f.app.store.db.prepare('SELECT COUNT(*) AS n FROM documents').get().n, 0);
  // An excessive declared length is rejected before waiting for a body or a slot.
  const oversized = f.raw({ 'Content-Length': String(MAX_DOCUMENT_JSON_BYTES + 1) });
  oversized.req.flushHeaders();
  assert.equal((await oversized.response).status, 413);
  oversized.req.destroy();
  held.req.end(body.slice(8));
  assert.equal((await held.response).status, 201);
  assert.equal((await f.upload()).status, 201);
  assert.equal(f.app.store.db.prepare('SELECT COUNT(*) AS n FROM documents').get().n, 2);
});

test('invalid JSON and an aborted body release the upload slot', async t => {
  const f = await fixture(t);
  const bad = f.raw(); bad.req.end('{broken');
  assert.equal((await bad.response).status, 400);
  const held = f.raw({ 'X-Held-Upload': '1' });
  // Observe rejection explicitly so abort cannot become an unhandled promise.
  const aborted = held.response.catch(error => error);
  held.req.write('{');
  await f.authenticated;
  await new Promise(resolve => setImmediate(resolve));
  held.req.destroy(); await aborted;
  // The server must observe the socket close before a retry is expected to win.
  let result;
  for (let i = 0; i < 20; i++) {
    result = await f.upload();
    if (result.status !== 429) break;
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.equal(result.status, 201);
});

test('base64 canonical padding is checked without re-encoding a full upload', () => {
  for (const contentBase64 of ['AA==', 'AAA=', 'AAAA', 'YQ==', 'YWI=']) assert.ok(documentInput({ ...uploadBody, contentBase64 }).bytes.length);
  for (const contentBase64 of ['AB==', 'AAB=', 'YR==', 'YWJ=', 'A===', '====']) {
    assert.throws(() => documentInput({ ...uploadBody, contentBase64 }), error => error.status === 400);
  }
});
