// Checks the built copy in www/dist against the WordPress mirror in www/site. No dependency; run after node www/build.mjs.
//   node www/tools/check-site.mjs        exits 1 when a rule below is broken
// Rules: every mirrored page is built; its visible text is identical, word for word, to the mirror;
// internal links and files resolve (WordPress-only endpoints that the copy has no file for are listed apart); no file is loaded from another
// site; no orange colour is left in stylesheets or inline styles.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const SITE = join(ROOT, 'site'), DIST = join(ROOT, 'dist');
const manifest = JSON.parse(readFileSync(join(SITE, 'manifest.json'), 'utf8'));
const errors = [], wordpressOnly = new Map(), warnings = [];
const WORDPRESS = /^\/(wp-admin|wp-login\.php|wp-json|xmlrpc\.php|feed|comments\/feed|wp-content\/plugins\/[^?]*\.php)(\/|\?|$)|^\/\?s=/;

const decode = (text) => text.replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'");
const visibleText = (html) => decode(html.replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) { const file = join(dir, name); if (statSync(file).isDirectory()) walk(file, out); else out.push(file); }
  return out;
}
// Kept exactly as on WordPress and reported, not fixed: a link that is already dead there, images it loads from jurigo.ca.
const KNOWN_DEAD = new Set(['/contact/']);
const KNOWN_EXTERNAL = /^https:\/\/jurigo\.ca\/images\//;
// Old WordPress addresses that nginx.conf redirects to a page of the copy.
const REDIRECTED = new Set(['/avocat-aide-juridique', '/avocat-aide-juridique/', '/wp-sitemap.xml', '/sitemap_index.xml']);
const exists = (ref) => {
  const path = decodeURIComponent(ref.split(/[?#]/)[0]);
  if (REDIRECTED.has(path)) return true;
  if (path === '' || path.includes('..')) return false;
  const file = join(DIST, path);
  return path.endsWith('/') ? existsSync(join(file, 'index.html')) : existsSync(file) && statSync(file).isFile() || existsSync(join(file, 'index.html'));
};
const orange = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return false;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = (max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  return h >= 8 && h <= 42 && s >= 0.45 && l >= 0.2 && l <= 0.88;
};
const oranges = (css) => [...css.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})(?![0-9a-z_-])/gi)].map((m) => (m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1]))
  .filter((hex) => orange(...[0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))));

let compared = 0;
for (const page of manifest.pages) {
  const file = join(page.path, 'index.html');
  if (!existsSync(join(DIST, file))) { errors.push(`${page.path}: not built`); continue; }
  const source = visibleText(readFileSync(join(SITE, file), 'utf8'));
  const built = visibleText(readFileSync(join(DIST, file), 'utf8'));
  if (source !== built) {
    let i = 0; while (i < source.length && source[i] === built[i]) i++;
    errors.push(`${page.path}: text differs from WordPress near « ${source.slice(Math.max(0, i - 40), i + 40)} »`);
  }
  compared++;
}
if (!existsSync(join(DIST, '404.html'))) errors.push('missing 404.html');

for (const file of walk(DIST)) {
  const path = '/' + relative(DIST, file);
  if (path.endsWith('.html')) {
    const html = readFileSync(file, 'utf8');
    for (const [, ref] of html.matchAll(/\s(?:href|src)=["'](\/(?!\/)[^"']*)["']/g)) {
      const clean = decode(ref);
      if (WORDPRESS.test(clean) && !exists(clean)) { wordpressOnly.set(clean.split('?')[0], (wordpressOnly.get(clean.split('?')[0]) || 0) + 1); continue; }
      if (KNOWN_DEAD.has(clean.split(/[?#]/)[0])) { warnings.push(`${path}: link ${clean} is dead on WordPress too`); continue; }
      if (!exists(clean)) errors.push(`${path}: missing ${clean}`);
    }
    for (const [, ref] of html.matchAll(/<(?:script|img|source|iframe)\b[^>]*\ssrc=["'](https?:\/\/[^"']+)["']|<link\b[^>]*rel=["']stylesheet["'][^>]*href=["'](https?:\/\/[^"']+)["']/gi)) if (ref) (KNOWN_EXTERNAL.test(ref) ? warnings : errors).push(`${path}: third-party file ${ref}`);
    const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>|\sstyle="([^"]*)"/gi)].map((m) => m[1] || m[2]).join('\n');
    const left = oranges(styles); if (left.length) errors.push(`${path}: orange left in inline styles ${[...new Set(left)].slice(0, 4).join(' ')}`);
  } else if (path.endsWith('.css')) {
    const css = readFileSync(file, 'utf8');
    const left = oranges(css); if (left.length) errors.push(`${path}: orange left ${[...new Set(left)].slice(0, 4).join(' ')}`);
    for (const [, ref] of css.matchAll(/url\(\s*['"]?(https?:\/\/[^'")]+)/g)) errors.push(`${path}: third-party file ${ref}`);
  }
}
if (manifest.failed.length) warnings.push(`${manifest.failed.length} file(s) the WordPress site itself did not serve: ${manifest.failed.slice(0, 5).map((f) => f.url).join(', ')}`);

console.log(JSON.stringify({ pages: manifest.pages.length, textComparedWordForWord: compared, errors: errors.length, wordpressOnlyLinks: Object.fromEntries(wordpressOnly), warnings }));
// Errors grouped by kind (the same missing file on every page is one line).
const kinds = new Map();
for (const line of errors) { const kind = line.replace(/^[^:]+: /, ''); kinds.set(kind, [...(kinds.get(kind) || []), line.split(':')[0]]); }
for (const [kind, where] of kinds) console.log(`error ${kind} — ${where.length} page(s): ${where.slice(0, 3).join(', ')}${where.length > 3 ? ', …' : ''}`);
process.exit(errors.length ? 1 : 0);
