import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SEAL_OVERHEAD, isSealed, loadBlobKey } from '../lib/blob-crypto.mjs';
import { createStore } from '../lib/store.mjs';
import { documentInput } from '../lib/validation.mjs';

const owner = { tenantId: 'tenant-a', subject: 'owner-a', product: 'besoinavocat', active: true };
const sha = value => createHash('sha256').update(value).digest('hex');

function setup(t) {
  const dir = mkdtempSync(join(tmpdir(), 'ba-blob-'));
  const stores = [];
  t.after(() => { for (const store of stores) store.close?.(); rmSync(dir, { recursive: true, force: true }); });
  const keyFile = join(dir, 'documents.key');
  writeFileSync(keyFile, randomBytes(32), { mode: 0o600 });
  const open = blobKey => { const store = createStore({ dbPath: join(dir, 'db.sqlite'), blobDir: join(dir, 'blobs'), blobKey }); stores.push(store); return store; };
  const blobFile = hash => join(dir, 'blobs', sha('tenant-a'), hash);
  return { dir, keyFile, open, blobFile };
}

const newCase = store => store.createCase(owner, { title: 'Dossier fictif', reference: 'SYN-1' }).id;

const upload = (store, caseId, text) => store.addDocument(owner, caseId, documentInput({
  name: 'note.txt', mimeType: 'text/plain', contentBase64: Buffer.from(text).toString('base64'), sourceType: 'original', reviewStatus: 'a_verifier' }));

test('with a key, documents are sealed on disk and download returns the original bytes', t => {
  const { keyFile, open, blobFile } = setup(t);
  const store = open(loadBlobKey(keyFile));
  const caseId = newCase(store);
  const text = 'Pièce confidentielle fictive : aucune donnée réelle.';
  const doc = upload(store, caseId, text);
  const onDisk = readFileSync(blobFile(doc.sha256));
  assert.ok(isSealed(onDisk));
  assert.equal(onDisk.length, Buffer.byteLength(text) + SEAL_OVERHEAD);
  assert.equal(onDisk.includes(Buffer.from('confidentielle')), false);
  assert.equal(store.download(owner, caseId, doc.id).content.toString(), text);
});

test('documents stored before encryption stay readable once the key is set', t => {
  const { keyFile, open } = setup(t);
  const plain = open(null);
  const caseId = newCase(plain);
  const doc = upload(plain, caseId, 'Ancienne pièce en clair.');
  plain.close?.();
  const sealed = open(loadBlobKey(keyFile));
  assert.equal(sealed.download(owner, caseId, doc.id).content.toString(), 'Ancienne pièce en clair.');
});

test('a sealed document without the key, with another key or tampered is refused', t => {
  const { dir, keyFile, open, blobFile } = setup(t);
  const store = open(loadBlobKey(keyFile));
  const caseId = newCase(store);
  const doc = upload(store, caseId, 'Contenu scellé fictif.');
  store.close?.();
  assert.throws(() => open(null).download(owner, caseId, doc.id), { code: 'DOCUMENT_KEY_UNAVAILABLE' });
  const otherKey = join(dir, 'other.key');
  writeFileSync(otherKey, randomBytes(32), { mode: 0o600 });
  assert.throws(() => open(loadBlobKey(otherKey)).download(owner, caseId, doc.id), { code: 'INTEGRITY_ERROR' });
  const file = blobFile(doc.sha256), bytes = readFileSync(file);
  bytes[20] ^= 1;
  writeFileSync(file, bytes);
  assert.throws(() => open(loadBlobKey(keyFile)).download(owner, caseId, doc.id), { code: 'INTEGRITY_ERROR' });
});

test('an unusable key file stops the start instead of writing plaintext', t => {
  const { dir } = setup(t);
  assert.equal(loadBlobKey(undefined), null);
  assert.equal(loadBlobKey(''), null);
  const short = join(dir, 'short.key');
  writeFileSync(short, randomBytes(16), { mode: 0o600 });
  assert.throws(() => loadBlobKey(short), /32-byte/u);
  const open = join(dir, 'open.key');
  writeFileSync(open, randomBytes(32), { mode: 0o644 });
  if (process.platform !== 'win32') assert.throws(() => loadBlobKey(open), /0600/u);
  assert.throws(() => loadBlobKey('relative.key'), /absolute/u);
  assert.throws(() => loadBlobKey(join(dir, 'missing.key')));
  assert.ok(readdirSync(dir).length > 0);
});
