import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { createStore } from '../lib/store.mjs';
import { documentInput } from '../lib/validation.mjs';

const owner = { tenantId: 'tenant-a', subject: 'owner-a', product: 'besoinavocat', active: true };
const other = { tenantId: 'tenant-b', subject: 'owner-b', product: 'besoinavocat', active: true };

function setup(t) {
  const dir = mkdtempSync(join(tmpdir(), 'ba-search-'));
  const paths = { dbPath: join(dir, 'db.sqlite'), blobDir: join(dir, 'blobs') };
  const stores = [];
  const open = () => { const store = createStore(paths); stores.push(store); return store; };
  t.after(() => { for (const store of stores) store.close?.(); rmSync(dir, { recursive: true, force: true }); });
  return { paths, open };
}
const add = (store, user, caseId, name, extractedText) => store.addDocument(user, caseId, documentInput({ name, mimeType: 'text/plain',
  contentBase64: Buffer.from(`${name}:${extractedText}`).toString('base64'), sourceType: 'original', reviewStatus: 'a_verifier', extractedText }));
const names = result => result.results.map(item => item.name).sort();

test('the folded cache follows new documents and pages, stays accent-insensitive and per tenant', t => {
  const { paths, open } = setup(t);
  const store = open();
  const caseId = store.createCase(owner, { title: 'Dossier fictif', reference: 'SYN-3' }).id;
  add(store, owner, caseId, 'a.txt', 'Réparation de l’Équipement fictif.');
  assert.deepEqual(names(store.searchStructured(owner, 'reparation equipement')), ['a.txt']);
  add(store, owner, caseId, 'b.txt', 'Deuxième RÉPARATION fictive.');
  assert.deepEqual(names(store.searchStructured(owner, 'réparations')), ['a.txt', 'b.txt']);
  const page = add(store, owner, caseId, 'c.txt', '');
  // Another connection without the ba_fold function can still add pages (no trigger depends on it).
  const raw = new DatabaseSync(paths.dbPath);
  raw.prepare('INSERT INTO document_pages VALUES (?,?,?,?,?,?,?,?)').run('tenant-a', caseId, page.id, 1, 1, 'Page fictive : Bail résilié.', 'text', '{}');
  raw.close();
  const hit = store.searchStructured(owner, 'bail resilie');
  assert.deepEqual(names(hit), ['c.txt']);
  assert.equal(hit.results[0].citation.page, 1);
  const otherCase = store.createCase(other, { title: 'Autre fictif', reference: 'SYN-4' }).id;
  add(store, other, otherCase, 'z.txt', 'Réparation chez un autre client fictif.');
  assert.deepEqual(names(store.searchStructured(owner, 'reparation')), ['a.txt', 'b.txt']);
  assert.deepEqual(names(store.searchStructured(other, 'reparation')), ['z.txt']);
});

test('a cache built by an older normalization is discarded at start', t => {
  const { paths, open } = setup(t);
  const first = open();
  const caseId = first.createCase(owner, { title: 'Dossier fictif', reference: 'SYN-5' }).id;
  add(first, owner, caseId, 'a.txt', 'Contrat fictif.');
  first.searchStructured(owner, 'contrat');
  first.close();
  const raw = new DatabaseSync(paths.dbPath);
  raw.exec("UPDATE search_folded_documents SET version=0, body='perime'");
  raw.close();
  const second = open();
  assert.deepEqual(names(second.searchStructured(owner, 'contrat')), ['a.txt']);
  assert.equal(second.searchStructured(owner, 'perime').results.length, 0);
});
