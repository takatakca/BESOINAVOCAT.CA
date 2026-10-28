// Checks the built storefront in www/dist. No dependency; run after node www/build.mjs.
//   node www/tools/check-site.mjs        exits 1 when a page breaks a rule below
// Rules: one h1, a title and a description per page; every internal link and image resolves;
// no button without a destination; the text of each imported page is present in its built page.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const DIST = new URL('dist/', ROOT);
const errors = [], warnings = [];
const decode = (text) => text.replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'");
const words = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
// Text blocks (paragraphs, headings, list items, cells, buttons), split into sentences.
const sentences = (html) => html.split(/<\/?(?:p|h[1-6]|li|td|th|summary|div|aside|figcaption|blockquote|br)\b[^>]*>/)
  .map(words).flatMap((block) => block.split(/(?<=[.!?])\s+/)).filter((sentence) => sentence.length > 25);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) walk(path, out); else out.push(path);
  }
  return out;
}

const distPath = fileURLToPath(DIST).replace(/\\/g, '/').replace(/\/$/, '');
const files = walk(distPath);
const htmlFiles = files.filter((file) => file.endsWith('.html'));
const exists = (path) => {
  const clean = decodeURIComponent(path.split(/[?#]/)[0]);
  if (clean.endsWith('/')) return existsSync(distPath + clean + 'index.html');
  return existsSync(distPath + clean) && statSync(distPath + clean).isFile();
};

const titles = new Map();
for (const file of htmlFiles) {
  const page = file.slice(distPath.length).replace(/index\.html$/, '');
  const html = readFileSync(file, 'utf8');
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) errors.push(`${page}: ${h1} h1`);
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  if (!title) errors.push(`${page}: no title`); else titles.set(title, [...(titles.get(title) || []), page]);
  if (!/<meta name="description" content="[^"]{20,}">/.test(html)) errors.push(`${page}: no description`);
  if (html.includes('#missing')) errors.push(`${page}: button without destination`);
  for (const [, href] of html.matchAll(/href="(\/[^"]*)"/g)) if (!exists(href)) errors.push(`${page}: broken link ${href}`);
  for (const [, src] of html.matchAll(/src="(\/[^"]*)"/g)) if (!exists(src)) errors.push(`${page}: missing image ${src}`);
  for (const [, href] of html.matchAll(/<a [^>]*href="(https?:\/\/(?:www\.)?besoinavocat\.ca[^"]*)"/g)) warnings.push(`${page}: absolute link ${href}`);
}
for (const [title, pages] of titles) if (pages.length > 1) warnings.push(`duplicate title « ${title} »: ${pages.join(', ')}`);

// Imported text must survive the build, except where a hand-written page replaces it.
const contentDir = new URL('content/', ROOT);
const overrides = new Set(existsSync(new URL('overrides/', contentDir)) ? readdirSync(new URL('overrides/', contentDir)) : []);
let compared = 0;
for (const name of readdirSync(new URL('pages/', contentDir))) {
  const source = readFileSync(new URL(`pages/${name}`, contentDir), 'utf8');
  const path = source.match(/^path: (.*)$/m)[1].trim();
  const built = `${distPath}${path}index.html`;
  if (!existsSync(built)) { errors.push(`${path}: not built`); continue; }
  const original = sentences(source.replace(/^<!--[\s\S]*?-->/, ''));
  if (overrides.has(name)) {
    // A replacement page keeps the original text; report the sentences it no longer carries.
    const kept = words(readFileSync(built, 'utf8'));
    const lost = original.filter((sentence) => !kept.includes(sentence));
    if (lost.length) warnings.push(`${path}: replaced page drops ${lost.length} sentence(s): ${lost.slice(0, 3).map((s) => `« ${s.slice(0, 70)} »`).join(' ')}`);
    continue;
  }
  const page = words(readFileSync(built, 'utf8'));
  const missing = original.filter((sentence) => !page.includes(sentence));
  if (missing.length) errors.push(`${path}: ${missing.length} imported sentence(s) missing, e.g. « ${missing[0].slice(0, 80)} »`);
  compared++;
}
for (const required of ['404.html', 'sitemap.xml', 'robots.txt', 'favicon.svg', 'assets/site.css']) if (!existsSync(`${distPath}/${required}`)) errors.push(`missing ${required}`);

console.log(JSON.stringify({ pages: htmlFiles.length, textCompared: compared, errors: errors.length, warnings: warnings.length }));
for (const line of warnings) console.log(`warning ${line}`);
for (const line of errors) console.log(`error ${line}`);
process.exit(errors.length ? 1 : 0);
