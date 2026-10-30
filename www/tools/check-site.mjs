// Checks the built copy in www/dist against the WordPress mirror in www/site. No dependency; run after node www/build.mjs.
//   node www/tools/check-site.mjs        exits 1 when a rule below is broken
// Rules: every mirrored page is built; its visible text is identical, word for word, to the mirror;
// internal links and files resolve (WordPress-only endpoints that the copy has no file for are listed apart); no file is loaded from another
// site; no orange colour is left in stylesheets or inline styles; no HTML character (&#039;…) is damaged.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SITE = join(ROOT, 'site'), DIST = join(ROOT, 'dist');
const manifest = JSON.parse(readFileSync(join(SITE, 'manifest.json'), 'utf8'));
const errors = [], wordpressOnly = new Map(), warnings = [];
const WORDPRESS = /^\/(wp-admin|wp-login\.php|wp-json|xmlrpc\.php|feed|comments\/feed|wp-content\/plugins\/[^?]*\.php)(\/|\?|$)|^\/\?s=/;

const decode = (text) => text.replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'");
// The only added text allowed by the migration is the explicit portal notice before inactive historical forms.
const withoutMigrationNotices = (html) => html.replace(/<aside\b[^>]*data-ba-migration-notice="true"[^>]*>[\s\S]*?<\/aside>/gi, '');
const visibleText = (html) => decode(html.replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// Validate real legacy wrappers independently of the markers added by the build: omitted preparation must fail too.
function validateLegacyForms(html) {
  const problems = [];
  const attribute = (attrs, name) => (attrs.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*["']([^"']*)["']`, 'i')) || [])[1] || '';
  const markup = html.replace(/<(script|style|template)\b[\s\S]*?<\/\1>/gi, '');
  const notices = [...markup.matchAll(/<aside\b([^>]*data-ba-migration-notice="true"[^>]*)>[\s\S]*?<\/aside>/g)];
  const noticeIds = notices.map(m => attribute(m[1], 'id'));
  if (noticeIds.some(id => !id) || new Set(noticeIds).size !== noticeIds.length) problems.push('missing or duplicate migration notice id');
  let forms = 0;
  for (const match of markup.matchAll(/<(div|form)\b([^>]*)>/gi)) {
    const [, tag, attrs] = match;
    const classes = attribute(attrs, 'class'), id = attribute(attrs, 'id');
    const legacy = tag.toLowerCase() === 'div' ? /(?:^|\s)mf-form-wrapper(?:\s|$)/.test(classes)
      : /(?:^|\s)(?:elementor-login|elementor-form)(?:\s|$)/.test(classes) || id === 'lostpasswordform';
    if (!legacy) continue;
    forms++;
    if (attribute(attrs, 'data-ba-legacy-form') !== 'true' || !/(?:^|\s)inert(?:\s|$)/.test(attrs) || attribute(attrs, 'aria-disabled') !== 'true') problems.push('historical form is not inactive');
    const describedBy = attribute(attrs, 'aria-describedby');
    const notice = notices.find(m => attribute(m[1], 'id') === describedBy);
    if (!notice || notice.index + notice[0].length > match.index || !/<a\b[^>]*href="https?:\/\//.test(notice[0])) problems.push('historical form has no preceding linked notice');
  }
  if (forms !== notices.length) problems.push('historical form and notice counts differ');
  return problems;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) { const file = join(dir, name); if (statSync(file).isDirectory()) walk(file, out); else out.push(file); }
  return out;
}
// Old WordPress addresses that nginx.conf redirects to a page of the copy.
const REDIRECTED = new Set(['/avocat-aide-juridique', '/avocat-aide-juridique/', '/wp-sitemap.xml', '/sitemap_index.xml']);
const existenceCache = new Map();
const exists = (ref) => {
  const path = decodeURIComponent(ref.split(/[?#]/)[0]);
  if (existenceCache.has(path)) return existenceCache.get(path);
  if (REDIRECTED.has(path)) return true;
  if (path === '' || path.includes('..')) return false;
  const file = join(DIST, path);
  const found = path.endsWith('/') ? existsSync(join(file, 'index.html')) : existsSync(file) && statSync(file).isFile() || existsSync(join(file, 'index.html'));
  existenceCache.set(path, found);
  return found;
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
  const built = visibleText(withoutMigrationNotices(readFileSync(join(DIST, file), 'utf8')));
  // Characters written as HTML entities (the quotes of font names in inline styles, &#038; in addresses) are not
  // damaged by the build: a recoloured "&#039;" would become "&#112d5e", a broken entity.
  const broken = (html) => (html.match(/&#\d+(?![\d;])/g) || []).length;
  const damaged = broken(readFileSync(join(DIST, file), 'utf8')) - broken(readFileSync(join(SITE, file), 'utf8'));
  if (damaged > 0) errors.push(`${page.path}: ${damaged} HTML character(s) like &#039; damaged by the build`);
  if (source !== built) {
    let i = 0; while (i < source.length && source[i] === built[i]) i++;
    errors.push(`${page.path}: text differs from WordPress near « ${source.slice(Math.max(0, i - 40), i + 40)} »`);
  }
  compared++;
}
if (!existsSync(join(DIST, '404.html'))) errors.push('missing 404.html');

for (const file of walk(DIST)) {
  const path = '/' + relative(DIST, file).split(sep).join('/');
  if (path.endsWith('.html')) {
    const html = readFileSync(file, 'utf8');
    for (const [, ref] of html.matchAll(/\s(?:href|src)=["'](\/(?!\/)[^"']*)["']/g)) {
      const clean = decode(ref);
      if (WORDPRESS.test(clean) && !exists(clean)) { wordpressOnly.set(clean.split('?')[0], (wordpressOnly.get(clean.split('?')[0]) || 0) + 1); continue; }
      if (!exists(clean)) errors.push(`${path}: missing ${clean}`);
    }
    for (const match of html.matchAll(/<(?:script|img|source|iframe)\b[^>]*\ssrc=["'](https?:\/\/[^"']+)["']|<link\b[^>]*rel=["']stylesheet["'][^>]*href=["'](https?:\/\/[^"']+)["']/gi)) errors.push(`${path}: third-party file ${match[1] || match[2]}`);
    for (const problem of validateLegacyForms(html)) errors.push(`${path}: ${problem}`);
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
