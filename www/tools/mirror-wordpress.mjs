// Read-only mirror of the public besoinavocat.ca WordPress site, exactly as served: every page of the sitemap,
// the 404 page, and every stylesheet, script, font, image and document they use (CSS url() and @import followed).
//   node www/tools/mirror-wordpress.mjs [out-dir]       default out-dir: www/site
// Nothing is changed in the files: www/build.mjs makes the deployable copy from them. Google Fonts are kept
// under vendor/ so the copy makes no third-party request. manifest.json records each file with its SHA-256.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://besoinavocat.ca';
const OUT = process.argv[2] || fileURLToPath(new URL('../site', import.meta.url));
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 BesoinAvocat-mirror';
const sha = (data) => createHash('sha256').update(data).digest('hex');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(url, binary = false) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': UA } });
      const body = binary ? Buffer.from(await response.arrayBuffer()) : await response.text();
      return { status: response.status, url: response.url, type: response.headers.get('content-type') || '', body };
    } catch (error) {
      if (attempt === 4) throw error;
      await sleep(1000 * attempt);
    }
  }
}

// Local path of a mirrored URL: same path as on the site; other hosts under vendor/<host>/.
function localPath(url) {
  const u = new URL(url);
  let path = decodeURIComponent(u.pathname);
  if (u.hostname === 'fonts.googleapis.com') path = `/css-${sha(u.search).slice(0, 12)}.css`;
  if (path.endsWith('/')) path += 'index.html';
  const base = u.hostname === 'besoinavocat.ca' || u.hostname === 'www.besoinavocat.ca' ? '' : `/vendor/${u.hostname}`;
  if (path.split('/').includes('..')) throw new Error(`unsafe path ${url}`);
  return base + path;
}

function save(path, body) {
  const file = join(OUT, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
}

// Asset references in a page, including JSON-escaped ones (Elementor settings) and inline styles.
function pageAssets(html) {
  const found = new Set();
  const text = html.replace(/\\\//g, '/').replace(/&#038;|&amp;/g, '&');
  for (const m of text.matchAll(/(?:https?:)?\/\/(?:www\.)?besoinavocat\.ca(\/(?:wp-content|wp-includes)\/[^"'\s)<>\\]+)/g)) found.add(ORIGIN + m[1]);
  for (const m of text.matchAll(/["'(\s,](\/(?:wp-content|wp-includes)\/[^"'\s)<>\\]+)/g)) found.add(ORIGIN + m[1]);
  for (const m of text.matchAll(/https:\/\/fonts\.googleapis\.com\/css2?\?[^"'\s<>]+/g)) found.add(m[0]);
  for (const m of text.matchAll(/<link[^>]+rel=["'](?:icon|apple-touch-icon|shortcut icon)["'][^>]*>/g)) {
    const href = m[0].match(/href=["']([^"']+)/); if (href) found.add(new URL(href[1], ORIGIN).href);
  }
  return [...found].map((url) => url.replace(/[.,;]+$/, ''));
}

function cssAssets(css, base) {
  const found = new Set();
  for (const m of css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)|@import\s+(['"])([^'"]+)\3/g)) {
    const ref = (m[2] || m[4] || '').trim();
    if (!ref || ref.startsWith('data:') || ref.startsWith('#')) continue;
    try { found.add(new URL(ref, base).href); } catch { /* ignored */ }
  }
  return [...found];
}

const allowed = (url) => /^https:\/\/((www\.)?besoinavocat\.ca|fonts\.googleapis\.com|fonts\.gstatic\.com)\//.test(url);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const manifest = { origin: ORIGIN, takenAt: new Date().toISOString(), pages: [], assets: [], failed: [] };

// 1. Pages of the sitemap, then the 404 page.
const index = (await get(`${ORIGIN}/wp-sitemap.xml`)).body;
const pageMaps = [...index.matchAll(/<loc>([^<]+wp-sitemap-posts-page-\d+\.xml)<\/loc>/g)].map((m) => m[1]);
const pageUrls = [];
for (const map of pageMaps) for (const m of (await get(map)).body.matchAll(/<loc>([^<]+)<\/loc>/g)) pageUrls.push(m[1]);
const queue = new Set();
for (const [i, url] of pageUrls.entries()) {
  const page = await get(url);
  const path = new URL(url).pathname;
  save(path.endsWith('/') ? `${path}index.html` : `${path}/index.html`, page.body);
  manifest.pages.push({ path, status: page.status, finalUrl: page.url, bytes: Buffer.byteLength(page.body), sha256: sha(page.body) });
  pageAssets(page.body).forEach((asset) => queue.add(asset));
  if ((i + 1) % 50 === 0) console.log(`pages ${i + 1}/${pageUrls.length}`);
  await sleep(120);
}
const missing = await get(`${ORIGIN}/page-introuvable-besoinavocat-mirror/`);
save('/404.html', missing.body);
manifest.notFound = { status: missing.status, bytes: Buffer.byteLength(missing.body), sha256: sha(missing.body) };
pageAssets(missing.body).forEach((asset) => queue.add(asset));

// 2. Assets, following stylesheets recursively.
const done = new Set();
while (queue.size) {
  const [url] = queue; queue.delete(url);
  const key = url.split('#')[0];
  if (done.has(key) || !allowed(key)) continue;
  done.add(key);
  try {
    const css = /\.css(\?|$)/.test(key) || key.startsWith('https://fonts.googleapis.com/');
    const asset = await get(key, !css);
    if (asset.status !== 200) { manifest.failed.push({ url: key, status: asset.status }); continue; }
    const path = localPath(key);
    save(path, asset.body);
    manifest.assets.push({ url: key, path, status: asset.status, type: asset.type, bytes: Buffer.byteLength(asset.body), sha256: sha(asset.body) });
    if (css) cssAssets(asset.body, key).forEach((ref) => queue.add(ref));
  } catch (error) { manifest.failed.push({ url: key, error: String(error) }); }
  if (done.size % 100 === 0) console.log(`assets ${done.size}`);
  await sleep(40);
}
manifest.assets.sort((a, b) => a.path.localeCompare(b.path));
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(JSON.stringify({ pages: manifest.pages.length, notFound: manifest.notFound.status, assets: manifest.assets.length, failed: manifest.failed.length,
  bytes: [...manifest.pages, ...manifest.assets].reduce((n, f) => n + f.bytes, 0) }));
