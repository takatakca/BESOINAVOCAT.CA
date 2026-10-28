// Local preservation inventory only. No network, build, import or content mutation.
// node www/tools/inventory-content.mjs [--check] [--output docs/FILE.json]
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const REPO = path.dirname(ROOT);
const ORIGIN = 'https://besoinavocat.ca';
const DEFAULT_OUTPUT = 'docs/CONTENT_INVENTORY_2026-10-28.json';
const sha256 = data => createHash('sha256').update(data).digest('hex');
const slash = value => value.split(path.sep).join('/');
const relative = filename => slash(path.relative(REPO, filename));
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const fail = message => { throw new Error(message); };
const utf8 = data => new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(data).replace(/\r\n?/g, '\n');

function walk(folder) {
  if (!existsSync(folder) || !lstatSync(folder).isDirectory() || lstatSync(folder).isSymbolicLink()) fail(`Missing directory or unsupported link: ${relative(folder)}`);
  const result = [];
  for (const name of readdirSync(folder).sort(compare)) {
    const filename = path.join(folder, name), stat = lstatSync(filename);
    if (stat.isSymbolicLink()) fail(`Unsupported symbolic link: ${relative(filename)}`);
    if (stat.isDirectory()) result.push(...walk(filename));
    else if (stat.isFile()) result.push(filename);
    else fail(`Unsupported filesystem entry: ${relative(filename)}`);
  }
  return result;
}

function textFile(filename) {
  if (!lstatSync(filename).isFile() || lstatSync(filename).isSymbolicLink()) fail(`Not a regular file: ${relative(filename)}`);
  const text = utf8(readFileSync(filename));
  return { text, fingerprint: { exists: true, status: 'present', bytesUtf8LF: Buffer.byteLength(text, 'utf8'), sha256Utf8LF: sha256(Buffer.from(text, 'utf8')) } };
}

function pages(directory, category) {
  return walk(path.join(ROOT, directory)).map(filename => {
    if (!filename.endsWith('.html')) fail(`Unexpected page file: ${relative(filename)}`);
    const { text, fingerprint } = textFile(filename);
    const header = text.match(/^\uFEFF?<!--\n([\s\S]*?)\n-->(?:\n|$)/);
    if (!header) fail(`Missing page metadata: ${relative(filename)}`);
    const meta = {};
    for (const line of header[1].split('\n')) {
      const colon = line.indexOf(':');
      if (colon < 1) fail(`Malformed page metadata: ${relative(filename)}`);
      const key = line.slice(0, colon).trim();
      if (Object.hasOwn(meta, key)) fail(`Duplicate page metadata: ${relative(filename)}`);
      meta[key] = line.slice(colon + 1).trim();
    }
    if (!meta.path?.startsWith('/') || !meta.path.endsWith('/') || /[?#\\\s]/u.test(meta.path) || meta.path.includes('//') || meta.path.split('/').some(part => ['.', '..'].includes(part)) || !meta.title || !meta.source) fail(`Invalid page metadata: ${relative(filename)}`);
    const sourceUrl = meta.source.match(/https?:\/\/[^\s)]+/u)?.[0] || null;
    const parsed = sourceUrl ? new URL(sourceUrl) : null;
    const sourcePathMatches = Boolean(parsed && parsed.origin === ORIGIN && parsed.pathname === meta.path && !parsed.search && !parsed.hash);
    if (!sourcePathMatches) fail(`Source URL does not match page address: ${relative(filename)}`);
    return { file: relative(filename), category, path: meta.path, title: meta.title, source: meta.source, sourceUrl, sourcePathMatches, ...fingerprint };
  }).sort((a, b) => compare(a.path, b.path) || compare(a.file, b.file));
}

function uniquePaths(entries, label) {
  const found = new Set();
  for (const entry of entries) {
    if (found.has(entry.path)) fail(`Duplicate ${label} address: ${entry.path}`);
    found.add(entry.path);
  }
  return found;
}

function inventory() {
  const importedPages = pages('content/pages', 'imported_wordpress_page');
  const overrides = pages('content/overrides', 'render_override');
  const importedPaths = uniquePaths(importedPages, 'imported'), overridePaths = uniquePaths(overrides, 'override');
  if (importedPages.length !== 348 || overrides.length !== 10) fail(`Expected 348 imported pages and 10 overrides; found ${importedPages.length} and ${overrides.length}. Review this baseline before accepting a new count.`);
  for (const item of importedPages) item.effectiveFile = overrides.find(other => other.path === item.path)?.file || item.file;
  for (const item of overrides) item.replacesFile = importedPages.find(other => other.path === item.path)?.file || null;

  const wpContent = walk(path.join(ROOT, 'public/wp-content')).map(filename => {
    const data = readFileSync(filename), webPath = '/' + slash(path.relative(path.join(ROOT, 'public'), filename));
    return { file: relative(filename), category: 'copied_wp_content_file', path: webPath, title: path.basename(filename), source: new URL(webPath, ORIGIN).href, exists: true, status: 'present', bytes: data.length, sha256Binary: sha256(data) };
  }).sort((a, b) => compare(a.path, b.path));
  const supportFiles = ['content/site.json', 'content/assets.json'].map(name => {
    const filename = path.join(ROOT, name), { fingerprint } = textFile(filename);
    return { file: relative(filename), category: 'import_support_metadata', ...fingerprint };
  });
  const declared = JSON.parse(textFile(path.join(ROOT, 'content/assets.json')).text.replace(/^\uFEFF/, ''));
  if (!Array.isArray(declared) || declared.some(value => typeof value !== 'string')) fail('The declared asset list must be an array of paths.');
  const declaredAssets = [...new Set(declared)].sort(compare).map(webPath => {
    const match = wpContent.find(item => item.path === webPath);
    return { path: webPath, file: match?.file || null, exists: Boolean(match), status: match ? 'present' : 'missing' };
  });
  const missing = declaredAssets.filter(item => !item.exists);
  if (missing.length) fail(`Declared copied assets missing: ${missing.map(item => item.path).join(', ')}`);
  const records = [...importedPages, ...overrides, ...wpContent, ...supportFiles].map(item => ({ file: item.file, sha256: item.sha256Utf8LF || item.sha256Binary }));
  return {
    format: 'besoinavocat-content-inventory', version: 1, baseline: '2026-10-28', siteOrigin: ORIGIN,
    hashPolicy: { text: 'SHA-256 of strict UTF-8 text after CRLF and lone CR to LF; no other normalization, including spaces, Unicode or BOM', binary: 'SHA-256 of every byte, without modification', ordering: 'code-point order of source paths; no filesystem timestamps or absolute paths' },
    scope: ['www/content/pages', 'www/content/overrides', 'www/public/wp-content', 'www/content/site.json', 'www/content/assets.json'],
    limitations: ['Inventory of current repository files, not a WordPress database or full media-library backup.', 'Source URLs are checked against metadata, without an HTTP request.', 'The WordPress HTML snapshot of 27 October is not read by this command; visible-text comparison is a separate review.', 'Imported content retained in the repository may be replaced in rendered output by the listed overrides.', 'Files outside the explicit scope, including www/public/assets and unused remote media, are not inventoried here.'],
    counts: { importedPages: importedPages.length, overrides: overrides.length, overridesReplacingImportedPages: overrides.filter(item => item.replacesFile).length, additionalPageAddresses: overrides.filter(item => !item.replacesFile).length, effectivePageAddresses: new Set([...importedPaths, ...overridePaths]).size, wpContentFiles: wpContent.length, wpContentBytes: wpContent.reduce((sum, item) => sum + item.bytes, 0), supportFiles: supportFiles.length, declaredAssetPaths: declaredAssets.length, missingDeclaredAssets: missing.length, importedSourceUrlsMatchingPaths: importedPages.filter(item => item.sourcePathMatches).length, inventoryFiles: records.length },
    preservation: { importedFilesPresent: true, importedAddressesRetained: importedPages.every(item => importedPaths.has(item.path)), sourceContentModifiedByThisCommand: false, snapshotComparison: 'not_executed_by_this_command', wordpressDatabaseBackup: 'outside_scope', unusedRemoteAssets: 'not_verified' },
    contentFingerprintSha256: sha256(Buffer.from(JSON.stringify(records), 'utf8')),
    importedPages, overrides, wpContent, supportFiles, declaredAssets,
  };
}

try {
  const args = process.argv.slice(2);
  let check = false, output = DEFAULT_OUTPUT;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--check' && !check) check = true;
    else if (args[i] === '--output' && args[i + 1]) output = args[++i];
    else fail('Usage: node www/tools/inventory-content.mjs [--check] [--output docs/FILE.json]');
  }
  // Outputs stay in the repository docs directory; source content is never a target.
  if (path.isAbsolute(output) || !/^docs\/[^/\\]+\.json$/u.test(output)) fail('Output must be docs/<filename>.json, relative to the repository.');
  const target = path.join(REPO, output), docs = path.join(REPO, 'docs');
  if (realpathSync(docs) !== docs || (existsSync(target) && lstatSync(target).isSymbolicLink())) fail('Refusing an output path through a symbolic link.');
  const data = inventory(), serialized = JSON.stringify(data, null, 2) + '\n';
  if (check) {
    if (!existsSync(target) || utf8(readFileSync(target)) !== serialized) fail(`Inventory missing or changed: ${output}. Review the content changes before regenerating it.`);
  } else writeFileSync(target, serialized, 'utf8');
  console.log(JSON.stringify({ ok: true, mode: check ? 'check' : 'write', output, counts: data.counts, contentFingerprintSha256: data.contentFingerprintSha256, inventorySha256Utf8LF: sha256(Buffer.from(serialized, 'utf8')) }, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
