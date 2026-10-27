#!/usr/bin/env node
// Local preparation only. Deliberately no HTTP client, bearer token, or upload mode.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SHA256 = /^[a-f0-9]{64}$/i;
const MAX_CORPUS_BYTES = 128 * 1024 * 1024;
const USAGE = 'node platform/tools/import-corpus.mjs --corpus <corpus.json> --root <racine des pièces> --output <manifeste privé.json> [--case <nom exact>] [--dry-run]';

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}

export function safeRelative(value) {
  if (typeof value !== 'string' || !value || /[\x00-\x1f:]/u.test(value) || path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) {
    throw new Error('Référence de pièce invalide : chemin relatif requis.');
  }
  const normalized = value.replaceAll('\\', '/');
  const parts = normalized.split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || /^\.git$/i.test(part) || /^\.env(?:\.|$)/i.test(part))) {
    throw new Error('Référence de pièce interdite : sortie de racine ou fichier de configuration.');
  }
  return normalized;
}

async function sha256File(filename) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest('hex');
}

export function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help') return { help: true };
    if (arg === '--execute') throw new Error('Import réel indisponible : cette version produit uniquement un manifeste local; aucun envoi API.');
    if (arg === '--dry-run') continue;
    const key = { '--corpus': 'corpusPath', '--root': 'sourceRoot', '--output': 'outputPath', '--case': 'caseName' }[arg];
    if (!key || options[key] !== undefined || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Argument invalide. ' + USAGE);
    options[key] = args[++i];
  }
  if (!options.corpusPath || !options.sourceRoot || !options.outputPath) throw new Error(USAGE);
  return options;
}

// Refuse tracked/unignored outputs anywhere inside a Git work tree, including a
// different parent repository. The parent directory must already exist.
export async function assertPrivateOutput(outputPath) {
  const output = path.resolve(outputPath);
  if (path.extname(output).toLowerCase() !== '.json') throw new Error('Le manifeste doit être un fichier .json.');
  const parent = await realpath(path.dirname(output));
  const resolved = path.join(parent, path.basename(output));
  const git = spawnSync('git', ['-C', parent, 'rev-parse', '--show-toplevel'], { encoding: 'utf8', windowsHide: true });
  if (git.error) throw new Error('Git est requis pour contrôler que le manifeste restera hors versionnement.');
  if (git.status === 0) {
    const repo = git.stdout.trim();
    const relative = path.relative(repo, resolved).split(path.sep).join('/');
    const tracked = spawnSync('git', ['-C', repo, 'ls-files', '--error-unmatch', '--', relative], { encoding: 'utf8', windowsHide: true });
    const ignored = spawnSync('git', ['-C', repo, 'check-ignore', '--quiet', '--no-index', '--', relative], { encoding: 'utf8', windowsHide: true });
    if (tracked.status === 0 || ignored.status !== 0) throw new Error('Sortie refusée : utiliser un emplacement exclu de Git, jamais un fichier versionné.');
  } else if (!/not a git repository/i.test(git.stderr)) {
    throw new Error('Impossible de vérifier le statut Git du dossier de sortie.');
  }
  return resolved;
}

export async function buildManifest({ corpusPath, sourceRoot, caseName }) {
  const root = await realpath(sourceRoot);
  if (!(await stat(root)).isDirectory()) throw new Error('Racine des pièces invalide.');
  const input = await realpath(corpusPath);
  const size = (await stat(input)).size;
  if (size > MAX_CORPUS_BYTES) throw new Error('Corpus trop volumineux (maximum 128 Mio).');
  const corpusBytes = await readFile(input);
  const corpus = JSON.parse(corpusBytes.toString('utf8'));
  if (!corpus || !Array.isArray(corpus.documents) || corpus.documents.length > 50000) throw new Error('Structure du corpus invalide.');
  const selected = corpus.documents.filter(doc => !caseName || doc.case === caseName || doc.cases?.includes(caseName));
  if (caseName && selected.length === 0) throw new Error('Aucun document pour le nom exact de dossier demandé.');
  const verified = new Map();
  async function verifyReference(relativePath, expectedHash) {
    const relative = safeRelative(relativePath);
    if (typeof expectedHash !== 'string' || !SHA256.test(expectedHash)) throw new Error('Empreinte SHA-256 absente ou invalide dans le corpus.');
    if (verified.has(relative)) {
      const cached = verified.get(relative);
      if (cached.sha256 !== expectedHash.toLowerCase()) throw new Error('Empreintes contradictoires pour une même référence.');
      return cached;
    }
    const absolute = await realpath(path.resolve(root, ...relative.split('/')));
    if (!inside(root, absolute)) throw new Error('Référence refusée : lien sortant de la racine des pièces.');
    const information = await stat(absolute);
    if (!information.isFile()) throw new Error('Une pièce référencée n’est pas un fichier.');
    const digest = await sha256File(absolute);
    if (digest !== expectedHash.toLowerCase()) throw new Error('Empreinte différente du corpus : manifeste non produit.');
    const result = { path: relative, sha256: digest, bytes: information.size };
    verified.set(relative, result);
    return result;
  }
  async function evidence(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || JSON.stringify(value).length > 65536) throw new Error('Preuve de provenance invalide.');
    for (const [pathKey, hashKey] of [['manifest_path', 'manifest_sha256'], ['source_path', 'source_sha256'], ['image_path_in_manifest', 'image_sha256']]) {
      if (value[pathKey] !== undefined || value[hashKey] !== undefined) await verifyReference(value[pathKey], value[hashKey]);
    }
    return structuredClone(value);
  }
  const entries = [];
  const groups = new Map();
  for (const doc of selected) {
    if (!doc || typeof doc !== 'object') throw new Error('Document invalide.');
    const source = await verifyReference(doc.path, doc.sha256);
    const aliases = [];
    if (doc.aliases !== undefined && !Array.isArray(doc.aliases)) throw new Error('Références alternatives invalides.');
    for (const alias of doc.aliases ?? []) aliases.push(await verifyReference(alias, doc.sha256));
    const provenance = {
      source_nature_code: typeof doc.source_nature_code === 'string' ? doc.source_nature_code : null,
      source_nature: typeof doc.source_nature === 'string' ? doc.source_nature : null,
      extraction_status: typeof doc.extraction_status === 'string' ? doc.extraction_status : null,
      counts_as_independent_source: typeof doc.counts_as_independent_source === 'boolean' ? doc.counts_as_independent_source : null,
    };
    if (doc.derived_from) {
      const ref = await verifyReference(doc.derived_from.path, doc.derived_from.sha256);
      provenance.derived_from = { ...ref };
      for (const key of ['page', 'kind', 'source_format']) {
        if (typeof doc.derived_from[key] === 'string' || Number.isSafeInteger(doc.derived_from[key])) provenance.derived_from[key] = doc.derived_from[key];
      }
      if (doc.derived_from.transform) provenance.derived_from.transform = structuredClone(doc.derived_from.transform);
    }
    if (doc.derived_relation_evidence) provenance.derived_relation_evidence = await evidence(doc.derived_relation_evidence);
    if (typeof doc.derived_source_page_has_text === 'boolean') provenance.derived_source_page_has_text = doc.derived_source_page_has_text;
    if (doc.text_extraction) {
      const ref = await verifyReference(doc.text_extraction.path, doc.text_extraction.sha256);
      provenance.text_extraction = { ...ref, method: doc.text_extraction.method ?? null,
        limitations: Array.isArray(doc.text_extraction.limitations) ? doc.text_extraction.limitations.filter(v => typeof v === 'string') : [] };
      if (doc.text_extraction.evidence) provenance.text_extraction.evidence = await evidence(doc.text_extraction.evidence);
    }
    provenance.non_documentary_units = [];
    for (const page of Array.isArray(doc.pages) ? doc.pages : []) {
      if (page.non_documentary_unit) provenance.non_documentary_units.push({ page: page.page, kind: page.non_documentary_unit.kind,
        evidence: await evidence(page.non_documentary_unit.evidence) });
    }
    for (const key of ['missing_text_pages_unresolved', 'low_text_pages_to_verify', 'ocr_pages_to_verify']) {
      if (Array.isArray(doc[key])) provenance[key] = structuredClone(doc[key]);
    }
    const entry = {
      source_id: typeof doc.id === 'string' ? doc.id : null,
      name: typeof doc.title === 'string' ? doc.title : path.posix.basename(source.path),
      ...source, aliases,
      cases: Array.isArray(doc.cases) ? doc.cases.filter(v => typeof v === 'string') : (typeof doc.case === 'string' ? [doc.case] : []),
      provenance,
    };
    entries.push(entry);
    const group = groups.get(source.sha256) ?? [];
    group.push(source.path, ...aliases.map(alias => alias.path));
    groups.set(source.sha256, group);
  }
  return {
    schema_version: 1, mode: 'dry_run_manifest_only', created_at_utc: new Date().toISOString(),
    source_corpus: { path: input, sha256: createHash('sha256').update(corpusBytes).digest('hex'), schema_version: corpus.schema_version ?? null, generated_at: corpus.generated_at ?? null },
    source_root: root, case_filter: caseName ?? null,
    network_requests: 0, uploads_performed: 0, originals_modified: false,
    summary: { documents: entries.length, unique_hashes: groups.size, verified_path_references: verified.size },
    duplicate_groups: [...groups].filter(([, paths]) => new Set(paths).size > 1).map(([sha256, paths]) => ({ sha256, paths: [...new Set(paths)] })),
    limitations: [
      'Préparation locale uniquement : aucune pièce envoyée, aucun dossier ni droit créé dans la plateforme.',
      'Empreintes vérifiées sur les fichiers présents lors du contrôle; ce manifeste ne certifie pas leur authenticité ni leur portée juridique.',
      'Les copies de même empreinte ne sont pas des dépenses ou preuves indépendantes. Les fichiers différents ne deviennent pas automatiquement des versions liées.',
      'Le statut de provenance du corpus est conservé; un OCR ou une déclaration ne devient pas une pièce vérifiée.',
      'Sélection de métadonnées de préparation, pas une migration complète : le texte, les contrôles visuels détaillés de chaque page et les autres propriétés du corpus ne sont pas tous reproduits. Le corpus source et son empreinte restent la référence complète.',
      'Ce manifeste contient des noms et chemins privés : conserver hors Git et hors du site public.',
    ], entries,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) { console.log(USAGE); return; }
  const output = await assertPrivateOutput(options.outputPath);
  const manifest = await buildManifest(options);
  await writeFile(output, JSON.stringify(manifest, null, 2) + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ mode: manifest.mode, documents: manifest.summary.documents, output, uploads_performed: 0 }));
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error('Préparation refusée : ' + error.message); process.exitCode = 1; });
}
