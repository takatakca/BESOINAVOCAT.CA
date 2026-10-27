import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertPrivateOutput, buildManifest, main, parseArgs, safeRelative } from '../tools/import-corpus.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'besoinavocat-import-test-'));
  t.after(async () => {
    assert.equal(path.dirname(directory), path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith('besoinavocat-import-test-'));
    await rm(directory, { recursive: true, force: true });
  });
  const root = path.join(directory, 'sources');
  await mkdir(root);
  const corpusPath = path.join(directory, 'corpus.json');
  const docs = [];
  async function add(relative, content, extra = {}) {
    const file = path.join(root, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
    const doc = { id: 'SYNTHETIC-' + docs.length, title: path.basename(file), path: relative, sha256: hash(content),
      case: 'Synthetic case', cases: ['Synthetic case'], aliases: [], source_nature_code: 'piece_originale',
      source_nature: 'Synthetic test source', extraction_status: 'texte_natif_disponible',
      text: 'PRIVATE BODY MUST NOT BE COPIED', pages: [{ text: 'PAGE CONTENT MUST NOT BE COPIED' }], ...extra };
    docs.push(doc);
    return doc;
  }
  async function save() {
    await writeFile(corpusPath, JSON.stringify({ schema_version: 1, documents: docs }));
    return { sourceRoot: root, corpusPath };
  }
  return { directory, root, corpusPath, docs, add, save };
}

test('importer is dry-run only and refuses execute, credentials and ambiguous arguments', () => {
  assert.deepEqual(parseArgs(['--corpus', 'c', '--root', 'r', '--output', 'o']), { corpusPath: 'c', sourceRoot: 'r', outputPath: 'o' });
  assert.throws(() => parseArgs(['--execute']), /uniquement un manifeste/);
  assert.throws(() => parseArgs(['--api-url', 'https://invalid.example']), /Argument invalide/);
  assert.throws(() => parseArgs(['--token', 'never-a-real-token']), /Argument invalide/);
  assert.throws(() => parseArgs(['--corpus', 'c', '--corpus', 'other']), /Argument invalide/);
});

test('manifest verifies files, preserves provenance, records copies once and omits extracted body', async t => {
  const f = await fixture(t);
  const original = await f.add('case/original.txt', 'synthetic evidence', { aliases: ['case/copy.txt'] });
  await writeFile(path.join(f.root, 'case/copy.txt'), 'synthetic evidence');
  await f.add('case/analysis.txt', 'synthetic analysis', { source_nature_code: 'analyse_ou_document_de_travail', counts_as_independent_source: false,
    derived_from: { path: original.path, sha256: original.sha256, page: 1 } });
  const manifest = await buildManifest(await f.save());
  assert.equal(manifest.uploads_performed, 0);
  assert.equal(manifest.network_requests, 0);
  assert.equal(manifest.originals_modified, false);
  assert.deepEqual(manifest.summary, { documents: 2, unique_hashes: 2, verified_path_references: 3 });
  assert.equal(manifest.duplicate_groups.length, 1);
  assert.equal(manifest.duplicate_groups[0].paths.length, 2);
  assert.equal(manifest.entries[1].provenance.counts_as_independent_source, false);
  assert.equal(manifest.entries[1].provenance.derived_from.sha256, original.sha256);
  assert.doesNotMatch(JSON.stringify(manifest), /PRIVATE BODY|PAGE CONTENT/);
  assert.equal(await readFile(path.join(f.root, original.path), 'utf8'), 'synthetic evidence');
});

test('different hashes with the same name remain distinct, without inventing a version relationship', async t => {
  const f = await fixture(t);
  await f.add('one/invoice.txt', 'version one');
  await f.add('two/invoice.txt', 'version two');
  const manifest = await buildManifest(await f.save());
  assert.equal(manifest.summary.unique_hashes, 2);
  assert.equal(manifest.duplicate_groups.length, 0);
  assert.ok(manifest.entries.every(entry => !('versionOf' in entry)));
});

test('crop transforms and reviewed-unit evidence retain their references and require unchanged proof files', async t => {
  const f = await fixture(t);
  const source = await f.add('source.txt', 'source');
  const proof = await f.add('provenance.json', '{"synthetic":true}');
  const evidence = { manifest_path: proof.path, manifest_sha256: proof.sha256, entry_id: 'SYNTHETIC-ENTRY' };
  const transform = { source_frame: 1, rotate_degrees_counterclockwise: 90, expand: true, crop_after_rotation: [1, 2, 3, 4] };
  await f.add('crop.txt', 'derived', { derived_from: { path: source.path, sha256: source.sha256, page: 1, kind: 'image_crop', transform },
    derived_relation_evidence: evidence,
    pages: [{ page: 2, text: '', non_documentary_unit: { kind: 'graphic_only_reviewed', evidence } }] });
  const options = await f.save();
  const manifest = await buildManifest(options);
  assert.deepEqual(manifest.entries[2].provenance.derived_from.transform, transform);
  assert.deepEqual(manifest.entries[2].provenance.derived_relation_evidence, evidence);
  assert.equal(manifest.entries[2].provenance.non_documentary_units[0].page, 2);
  await writeFile(path.join(f.root, proof.path), '{"changed":true}');
  await assert.rejects(buildManifest(options), /Empreinte différente/);
});

test('changed original or copied alias stops the manifest', async t => {
  const f = await fixture(t);
  await f.add('original.txt', 'first', { aliases: ['copy.txt'] });
  await writeFile(path.join(f.root, 'copy.txt'), 'different');
  const opts = await f.save();
  await assert.rejects(buildManifest(opts), /Empreinte différente/);
  await writeFile(path.join(f.root, 'copy.txt'), 'first');
  await writeFile(path.join(f.root, 'original.txt'), 'changed');
  await assert.rejects(buildManifest(opts), /Empreinte différente/);
});

test('traversal, absolute paths, alternate streams, .git and environment files are refused', () => {
  for (const name of ['../secret', 'folder/../../secret', 'C:\\secret', '\\\\host\\secret', '/secret', 'file:stream', '.git/config', 'nested/.env', 'nested/.env.production', 'folder//name']) {
    assert.throws(() => safeRelative(name));
  }
  assert.equal(safeRelative('Pièces/Facture 01.pdf'), 'Pièces/Facture 01.pdf');
});

test('a directory link outside the authorized source root is refused', async t => {
  const f = await fixture(t);
  const outside = path.join(f.directory, 'outside');
  await mkdir(outside);
  await writeFile(path.join(outside, 'private.txt'), 'outside');
  await symlink(outside, path.join(f.root, 'link'), process.platform === 'win32' ? 'junction' : 'dir');
  f.docs.push({ path: 'link/private.txt', sha256: hash('outside') });
  await assert.rejects(buildManifest(await f.save()), /lien sortant/);
});

test('missing sources, malformed hashes and missing related evidence fail closed', async t => {
  const f = await fixture(t);
  const doc = await f.add('piece.txt', 'piece');
  doc.sha256 = 'not-a-sha';
  await assert.rejects(buildManifest(await f.save()), /SHA-256/);
  doc.sha256 = hash('piece');
  doc.text_extraction = { path: 'missing.txt', sha256: hash('missing'), method: 'structured_doc_text' };
  await assert.rejects(buildManifest(await f.save()), /ENOENT/);
});

test('exact case filtering excludes other cases and never treats an unknown case as all', async t => {
  const f = await fixture(t);
  await f.add('a.txt', 'a');
  await f.add('b.txt', 'b', { case: 'Other case', cases: ['Other case'] });
  const opts = await f.save();
  assert.equal((await buildManifest({ ...opts, caseName: 'Synthetic case' })).entries.length, 1);
  await assert.rejects(buildManifest({ ...opts, caseName: 'synthetic case' }), /Aucun document/);
});

test('Git output guard refuses unignored and tracked paths, including ignored tracked files', async t => {
  const f = await fixture(t);
  const git = args => {
    const result = spawnSync('git', ['-C', f.directory, ...args], { encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
  };
  git(['init', '--quiet']);
  await writeFile(path.join(f.directory, '.gitignore'), 'private.json\ntracked.json\n');
  await assert.rejects(assertPrivateOutput(path.join(f.directory, 'public.json')), /Sortie refusée/);
  assert.equal(await assertPrivateOutput(path.join(f.directory, 'private.json')), path.join(f.directory, 'private.json'));
  await writeFile(path.join(f.directory, 'tracked.json'), '{}');
  git(['add', '--force', 'tracked.json']);
  await assert.rejects(assertPrivateOutput(path.join(f.directory, 'tracked.json')), /Sortie refusée/);
});

test('CLI preparation requires an explicit destination and never overwrites a prior manifest', async t => {
  const f = await fixture(t);
  await f.add('source.txt', 'source');
  await f.save();
  const outputPath = path.join(f.directory, 'private-manifest.json');
  const args = ['--corpus', f.corpusPath, '--root', f.root, '--output', outputPath];
  await main(args);
  const first = await readFile(outputPath, 'utf8');
  assert.equal(JSON.parse(first).mode, 'dry_run_manifest_only');
  await assert.rejects(main(args), /EEXIST/);
  assert.equal(await readFile(outputPath, 'utf8'), first);
});
