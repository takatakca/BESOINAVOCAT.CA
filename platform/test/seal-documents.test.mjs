import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { isSealed, loadBlobKey } from '../lib/blob-crypto.mjs';
import { createStore } from '../lib/store.mjs';
import { documentInput } from '../lib/validation.mjs';
import { parseArgs, sealDocuments, summary } from '../tools/seal-documents.mjs';

const owner = { tenantId: 'tenant-a', subject: 'owner-a', product: 'besoinavocat', active: true };
const sha = value => createHash('sha256').update(value).digest('hex');

function setup(t) {
  const dir = mkdtempSync(join(tmpdir(), 'ba-seal-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const keyFile = join(dir, 'documents.key');
  writeFileSync(keyFile, randomBytes(32), { mode: 0o600 });
  const paths = { dbPath: join(dir, 'db.sqlite'), blobDir: join(dir, 'blobs') };
  const plain = createStore(paths);
  const caseId = plain.createCase(owner, { title: 'Dossier fictif', reference: 'SYN-2' }).id;
  const docs = ['Première pièce fictive.', 'Deuxième pièce fictive.'].map(text => plain.addDocument(owner, caseId, documentInput({
    name: 'note.txt', mimeType: 'text/plain', contentBase64: Buffer.from(text).toString('base64'), sourceType: 'original', reviewStatus: 'a_verifier' })));
  plain.close?.();
  const blobFile = hash => join(paths.blobDir, sha('tenant-a'), hash);
  return { dir, keyFile, paths, caseId, docs, blobFile };
}

test('dry run changes nothing and says what would be encrypted', t => {
  const { keyFile, paths, docs, blobFile } = setup(t);
  const before = docs.map(doc => readFileSync(blobFile(doc.sha256)));
  const result = sealDocuments({ ...paths, keyFile });
  assert.equal(result.mode, 'dry-run');
  assert.equal(result.toSeal, 2);
  assert.equal(result.sealed, 0);
  docs.forEach((doc, i) => assert.deepEqual(readFileSync(blobFile(doc.sha256)), before[i]));
  assert.match(summary(result), /Would encrypt: 2/u);
});

test('execute seals every plain document, downloads still work, and a second run is a no-op', t => {
  const { keyFile, paths, caseId, docs, blobFile } = setup(t);
  const result = sealDocuments({ ...paths, keyFile, execute: true });
  assert.equal(result.sealed, 2);
  assert.deepEqual(result.problems, []);
  for (const doc of docs) assert.ok(isSealed(readFileSync(blobFile(doc.sha256))));
  assert.equal(readdirSync(join(paths.blobDir, sha('tenant-a'))).length, 2);
  const store = createStore({ ...paths, blobKey: loadBlobKey(keyFile) });
  t.after(() => store.close?.());
  assert.equal(store.download(owner, caseId, docs[0].id).content.toString(), 'Première pièce fictive.');
  const again = sealDocuments({ ...paths, keyFile, execute: true });
  assert.equal(again.alreadySealed, 2);
  assert.equal(again.sealed, 0);
});

test('a damaged plain file or a file sealed with another key is reported, never rewritten', t => {
  const { dir, keyFile, paths, docs, blobFile } = setup(t);
  writeFileSync(blobFile(docs[0].sha256), 'altéré');
  const otherKey = join(dir, 'other.key');
  writeFileSync(otherKey, randomBytes(32), { mode: 0o600 });
  sealDocuments({ ...paths, keyFile: otherKey, execute: true });
  const result = sealDocuments({ ...paths, keyFile, execute: true });
  assert.equal(result.sealed, 0);
  assert.deepEqual(result.problems.map(item => item.reason).sort(), ['plain file does not match its recorded hash', 'sealed with another key or damaged']);
  assert.equal(readFileSync(blobFile(docs[0].sha256)).toString(), 'altéré');
  assert.doesNotMatch(summary(result), /fictive|note\.txt|tenant-a/u);
});

test('arguments are strict and the key is mandatory', () => {
  assert.throws(() => parseArgs(['--database', 'a']), /--blobs is required/u);
  assert.throws(() => parseArgs(['--database', 'a', '--blobs', 'b', '--blob-key', 'c', '--execute', '--execute']), /Duplicate/u);
  assert.throws(() => parseArgs(['--nope']), /Unknown/u);
  assert.equal(parseArgs(['--database', 'a', '--blobs', 'b', '--blob-key', 'c']).execute, false);
});
