import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';
import { createStore } from '../lib/store.mjs';
import { documentInput } from '../lib/validation.mjs';
import { structuredSearchInput } from '../lib/search.mjs';

const alice = { tenantId: 'tenant-a', subject: 'alice' };
function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'ba-search-'));
  const store = createStore({ dbPath: join(directory, 'db.sqlite'), blobDir: join(directory, 'blobs') });
  t.after(() => { store.close(); assert.equal(dirname(directory), resolve(tmpdir())); assert.ok(basename(directory).startsWith('ba-search-')); rmSync(directory, { recursive: true, force: true }); });
  function addCase(user = alice, title = 'Synthetic case') { return store.createCase(user, { title, reference: 'SYNTHETIC' }); }
  function addDocument(user, caseId, { name = 'Synthetic.pdf', mimeType = 'application/pdf', extractedText = '', pages = [] } = {}) {
    const doc = store.addDocument(user, caseId, documentInput({ name, mimeType, sourceType: 'original', reviewStatus: 'a_verifier',
      contentBase64: Buffer.from(`Synthetic ${name}`).toString('base64'), extractedText, sourceReference: 'Synthetic source only' }));
    pages.forEach((page, index) => store.db.prepare('INSERT INTO document_pages VALUES (?,?,?,?,?,?,?,?)').run(user.tenantId, caseId, doc.id, index + 1, page.page ?? index + 1,
      page.text, page.method || 'synthetic_text', JSON.stringify({ page: page.page ?? index + 1 })));
    return doc;
  }
  return { store, addCase, addDocument };
}

test('French command text becomes explicit useful terms; invalid and oversized options fail closed', () => {
  assert.deepEqual(structuredSearchInput('Montre-moi les factures de FournisseurDemo').terms, ['facture', 'fournisseurdemo']);
  assert.deepEqual(structuredSearchInput('Réparations   factures factures').terms, ['reparation', 'facture']);
  assert.deepEqual(structuredSearchInput('MontrÉ   moi', { mode: 'literal' }).terms, ['montre moi']);
  for (const query of ['', '   ', '\u0301', '???', 'montre moi les', 'a'.repeat(201)]) assert.throws(() => structuredSearchInput(query), e => e.status === 400);
  for (const options of [{ mode: 'semantic' }, { limit: 51 }, { limit: 0 }, { offset: -1 }, { offset: 100001 }, { caseId: '' }, { tenantId: 'other' }]) {
    assert.throws(() => structuredSearchInput('FournisseurDemo', options), e => e.status === 400);
  }
});

test('terms can match title plus page text, with accurate page citation and legacy literal behavior preserved', t => {
  const f = fixture(t), c = f.addCase();
  const doc = f.addDocument(alice, c.id, { name: 'Facture réparations.pdf', pages: [{ page: 7, text: 'La société FournisseurDemo est mentionnée ici.', method: 'ocr_a_controler' }] });
  assert.equal(f.store.search(alice, c.id, 'facture fournisseurdemo').length, 0);
  const result = f.store.searchStructured(alice, 'Montre-moi les factures de FournisseurDemo', { caseId: c.id });
  assert.equal(result.ai, false); assert.deepEqual(result.terms, ['facture', 'fournisseurdemo']);
  assert.equal(result.results.length, 1);
  const hit = result.results[0];
  assert.equal(hit.id, doc.id); assert.equal(hit.documentId, doc.id); assert.equal(hit.caseId, c.id); assert.equal(hit.caseTitle, c.title);
  assert.deepEqual(hit.matchSources, ['name', 'page_text']);
  assert.equal(hit.citation.page, 7); assert.equal(hit.citation.ordinal, 1); assert.equal(hit.citation.unitKind, 'pdf_page');
  assert.equal(hit.citation.ocrToVerify, true); assert.equal(hit.citation.extractionVerified, false);
  assert.equal(hit.citation.sha256, doc.sha256); assert.equal(hit.citation.pagesUrl, `/api/cases/${c.id}/documents/${doc.id}/pages?offset=0&limit=1`);
  assert.equal(f.store.documentPages(alice, c.id, doc.id).pages[0].text, 'La société FournisseurDemo est mentionnée ici.');
  assert.equal(f.store.searchStructured(alice, 'facture fournisseurdemo', { mode: 'literal' }).results.length, 0);
});

test('global scope never crosses tenant or membership and revocation removes results and citation access', t => {
  const f = fixture(t), own = f.addCase(), otherOwn = f.addCase(alice, 'Second authorized case');
  const outsider = { ...alice, subject: 'outsider' }, otherTenant = { ...alice, tenantId: 'tenant-b' };
  const privateCase = f.addCase(outsider), otherTenantCase = f.addCase(otherTenant);
  for (const [user, item] of [[alice, own], [alice, otherOwn], [outsider, privateCase], [otherTenant, otherTenantCase]]) {
    f.addDocument(user, item.id, { pages: [{ text: 'Réparation FournisseurDemo' }] });
  }
  const result = f.store.searchStructured(alice, 'fournisseurdemo');
  assert.equal(result.results.length, 2);
  assert.deepEqual(result.scope.caseIds.sort(), [own.id, otherOwn.id].sort());
  assert.equal(f.store.searchStructured(alice, 'fournisseurdemo', { caseId: own.id }).results.length, 1);
  assert.throws(() => f.store.searchStructured(alice, 'fournisseurdemo', { caseId: privateCase.id }), e => e.status === 404);
  const hit = result.results.find(r => r.caseId === own.id);
  f.store.db.prepare('DELETE FROM members WHERE tenantId=? AND caseId=? AND subject=?').run(alice.tenantId, own.id, alice.subject);
  assert.equal(f.store.searchStructured(alice, 'fournisseurdemo').results.length, 1);
  assert.throws(() => f.store.documentPages(alice, own.id, hit.id), e => e.status === 404);
  assert.throws(() => f.store.download(alice, own.id, hit.id), e => e.status === 404);
});

test('pagination reports the limit and exposes all matches beyond the former silent 100 result cap', t => {
  const f = fixture(t), c = f.addCase();
  f.addDocument(alice, c.id, { pages: Array.from({ length: 130 }, (_, index) => ({ text: `FournisseurDemo facture numéro ${index + 1}` })) });
  const image = f.addDocument(alice, c.id, { name: 'Facture FournisseurDemo.png', mimeType: 'image/png' });
  const collected = []; let offset = 0;
  for (let page = 0; page < 10; page++) {
    const result = f.store.searchStructured(alice, 'factures fournisseurdemo', { limit: 25, offset });
    assert.equal(result.offset, offset); assert.ok(result.results.length <= 25); collected.push(...result.results);
    if (!result.hasMore) { assert.equal(result.nextOffset, null); break; }
    assert.equal(result.nextOffset, offset + 25); offset = result.nextOffset;
  }
  assert.equal(collected.length, 131);
  assert.equal(new Set(collected.map(hit => `${hit.id}:${hit.citation?.ordinal || 'metadata'}`)).size, 131);
  assert.equal(collected.find(hit => hit.id === image.id).citation, null);
});

test('decomposed accents, ligatures and repeated whitespace keep excerpts on original source characters', t => {
  const f = fixture(t), c = f.addCase();
  const source = `${'e\u0301\t '.repeat(300)} Le coût des œuvres a été noté. FournisseurDemo\n\n   réparation: ORIGINAL-MATCH ${'suffixe '.repeat(100)}`;
  f.addDocument(alice, c.id, { pages: [{ text: source }] });
  const hit = f.store.searchStructured(alice, 'FournisseurDemo réparation', { mode: 'literal' }).results[0];
  assert.ok(hit); assert.match(hit.excerpt, /ORIGINAL-MATCH/u); assert.match(hit.excerpt, /FournisseurDemo\n\n   réparation/u);
  assert.equal(f.store.searchStructured(alice, 'oeuvres').results.length, 1);
});

test('unpaginated uploads match near the actual extracted text hit without inventing a page citation', t => {
  const f = fixture(t), c = f.addCase();
  f.addDocument(alice, c.id, { name: 'upload.txt', mimeType: 'text/plain', extractedText: `${'Intro '.repeat(1000)}FournisseurDemo réparation FIN` });
  const hit = f.store.searchStructured(alice, 'fournisseurdemo reparations').results[0];
  assert.ok(hit); assert.equal(hit.citation, null); assert.match(hit.excerpt, /FournisseurDemo réparation FIN/u);
  assert.deepEqual(hit.matchSources, ['extracted_text']);
});

test('non-PDF page numbers are labeled logical units and source metadata never fabricates text matches', t => {
  const f = fixture(t), c = f.addCase();
  f.addDocument(alice, c.id, { name: 'FournisseurDemo.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pages: [{ text: 'Feuille FournisseurDemo' }, { text: '' }] });
  const results = f.store.searchStructured(alice, 'fournisseurdemo').results;
  assert.equal(results.length, 1); assert.equal(results[0].citation.unitKind, 'logical_unit');
  const audit = f.store.db.prepare("SELECT details FROM audit_events WHERE action='documents.structured_search'").all();
  assert.equal(JSON.stringify(audit).includes('fournisseurdemo'), false);
});
