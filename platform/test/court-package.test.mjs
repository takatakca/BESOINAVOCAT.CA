import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { crc32 } from 'node:zlib';
import { createApp } from '../server.mjs';
import { exhibitName, safeFileName } from '../lib/court-package.mjs';

const users = {
  alice: { tenantId: 'tenant-a', subject: 'alice', product: 'besoinavocat', active: true },
  mallory: { tenantId: 'tenant-b', subject: 'mallory', product: 'besoinavocat', active: true },
};
const sha = value => createHash('sha256').update(value).digest('hex');

// Lit le répertoire central d'une archive ZIP sans compression et rend { nom: contenu }.
function unzip(buffer) {
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(end >= 0, 'fin de répertoire central');
  const count = buffer.readUInt16LE(end + 10);
  let at = buffer.readUInt32LE(end + 16);
  const files = {};
  for (let i = 0; i < count; i++) {
    assert.equal(buffer.readUInt32LE(at), 0x02014b50);
    const crc = buffer.readUInt32LE(at + 16), size = buffer.readUInt32LE(at + 24), nameLength = buffer.readUInt16LE(at + 28);
    const extra = buffer.readUInt16LE(at + 30), comment = buffer.readUInt16LE(at + 32), local = buffer.readUInt32LE(at + 42);
    const name = buffer.subarray(at + 46, at + 46 + nameLength).toString('utf8');
    assert.equal(buffer.readUInt32LE(local), 0x04034b50);
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const content = buffer.subarray(start, start + size);
    assert.equal(crc32(content) >>> 0, crc, `CRC de ${name}`);
    files[name] = content;
    at += 46 + nameLength + extra + comment;
  }
  return files;
}

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'besoinavocat-package-test-'));
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
    return { status: response.status, json, bytes, headers: response.headers, text: bytes.toString('utf8') };
  };
  const created = await request('/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Dossier fictif', reference: 'TEST-01' }) });
  assert.equal(created.status, 201, created.text);
  const caseId = created.json.case.id;
  const upload = async (name, bytes, versionOf) => {
    const result = await request(`/api/cases/${caseId}/documents`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: 'application/pdf', sourceType: 'original', reviewStatus: 'a_verifier', contentBase64: bytes.toString('base64'), ...(versionOf ? { versionOf } : {}) }) });
    assert.equal(result.status, 201, result.text);
    return result.json.document;
  };
  return { request, caseId, upload };
}

test('file names are safe and exhibits are numbered P-1, P-2…', () => {
  assert.equal(safeFileName('a/b\\c:d*e?.pdf'), 'a b c d e .pdf');
  assert.equal(safeFileName('   '), 'piece');
  assert.equal(exhibitName(0, 'Bail signé.pdf'), 'P-1 - Bail signé.pdf');
  const long = safeFileName(`${'x'.repeat(200)}.pdf`);
  assert.equal(long.length, 120);
  assert.ok(long.endsWith('.pdf'));
});

test('the court package holds the bordereau, the latest version of each piece and a readme', async t => {
  const { request, caseId, upload } = await fixture(t);
  const empty = await request(`/api/cases/${caseId}/court-package`);
  assert.equal(empty.status, 409);
  const first = await upload('Bail.pdf', Buffer.from('%PDF-1.4 bail v1'));
  const second = await upload('Photo dégât.pdf', Buffer.from('%PDF-1.4 photo'));
  const firstV2 = Buffer.from('%PDF-1.4 bail v2');
  await upload('Bail.pdf', firstV2, first.id);
  const got = await request(`/api/cases/${caseId}/court-package`);
  assert.equal(got.status, 200, got.text);
  assert.equal(got.headers.get('content-type'), 'application/zip');
  assert.match(got.headers.get('content-disposition'), /attachment; filename="Paquet depot - TEST-01\.zip"/u);
  const files = unzip(got.bytes);
  assert.deepEqual(Object.keys(files), ['00 - Bordereau des pieces.pdf', 'P-1 - Bail.pdf', 'P-2 - Photo dégât.pdf', 'LISEZ-MOI.txt']);
  assert.ok(files['P-1 - Bail.pdf'].equals(firstV2), 'the latest version of the first piece');
  assert.equal(sha(files['P-2 - Photo dégât.pdf']), second.sha256);
  assert.match(files['00 - Bordereau des pieces.pdf'].subarray(0, 8).toString('latin1'), /^%PDF-1\.4/u);
  assert.ok(files['00 - Bordereau des pieces.pdf'].toString('latin1').includes(sha(firstV2).slice(0, 16)), 'the bordereau carries each SHA-256');
  const readme = files['LISEZ-MOI.txt'].toString('utf8');
  assert.match(readme, /https:\/\/lexius\.justice\.gouv\.qc\.ca\//u);
  assert.match(readme, /P-2 - Photo dégât\.pdf/u);
});

test('another tenant cannot download the package', async t => {
  const { request, caseId, upload } = await fixture(t);
  await upload('Bail.pdf', Buffer.from('%PDF-1.4 bail'));
  const denied = await request(`/api/cases/${caseId}/court-package`, { token: 'mallory' });
  assert.equal(denied.status, 404);
});
