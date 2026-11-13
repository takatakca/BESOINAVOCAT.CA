// Adds to the WordPress mirror (www/site) what the sitemap-based mirror (mirror-wordpress.mjs) does not reach, and refreshes www/parity/ (D-032):
//   node www/tools/mirror-parity.mjs
//  - pages WordPress serves but does not list in wp-sitemap-posts-page (author page, category page, MetForm form pages), with their stylesheets;
//  - WordPress's own robots.txt, sitemaps and feeds (copied to the built site by build.mjs; nginx.conf serves them as WordPress does).
// Read-only on besoinavocat.ca; waits when the host answers with its "One moment, please" check.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SITE = join(ROOT, 'site'), PAR = join(ROOT, 'parity');
const ORIGIN = 'https://besoinavocat.ca';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 BesoinAvocat-mirror';
const sha = (d) => createHash('sha256').update(d).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, binary = false) {
  for (let i = 0; i < 12; i++) {
    const r = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': UA } });
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.slice(0, 3000).toString().includes('One moment, please')) { await sleep(6000); continue; }
    return { status: r.status, type: r.headers.get('content-type') || '', location: r.headers.get('location'), buf };
  }
  throw new Error('challenge ' + url);
}
const manifest = JSON.parse(readFileSync(join(SITE, 'manifest.json'), 'utf8'));
const pages = ['/author/admin/', '/category/uncategorized/', '/metform-form/become-a-partner/', '/metform-form/find-a-lawyer/', '/metform-form/new-form-1759089507/'];
const need = new Set();
for (const p of pages) {
  const r = await get(ORIGIN + p); console.log(p, r.status, r.buf.length);
  if (r.status !== 200) continue;
  const file = join(SITE, p, 'index.html'); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, r.buf);
  const html = r.buf.toString('utf8');
  if (!manifest.pages.some((x) => x.path === p)) manifest.pages.push({ path: p, status: 200, finalUrl: ORIGIN + p, bytes: r.buf.length, sha256: sha(r.buf) });
  const text = html.replace(/\\\//g, '/').replace(/&#038;|&amp;/g, '&');
  for (const m of text.matchAll(/(?:https?:)?\/\/(?:www\.)?besoinavocat\.ca(\/(?:wp-content|wp-includes)\/[^"'\s)<>\\]+)/g)) need.add(m[1].replace(/[.,;]+$/, ''));
  await sleep(1500);
}
let missing = 0;
for (const a of need) { const path = a.split('?')[0]; if (!existsSync(join(SITE, decodeURIComponent(path)))) { missing++; console.log('missing asset', a); } }
console.log('assets referenced', need.size, 'missing', missing);
writeFileSync(join(SITE, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
// static WordPress endpoints
mkdirSync(PAR, { recursive: true });
const statics = { '/robots.txt': 'robots.txt', '/wp-sitemap.xml': 'wp-sitemap.xml', '/wp-sitemap-index.xsl': 'wp-sitemap-index.xsl', '/wp-sitemap-posts-page-1.xml': 'wp-sitemap-posts-page-1.xml',
  '/wp-sitemap-posts-metform-form-1.xml': 'wp-sitemap-posts-metform-form-1.xml', '/wp-sitemap-users-1.xml': 'wp-sitemap-users-1.xml', '/feed/': '_wp/feed.rss', '/comments/feed/': '_wp/comments-feed.rss' };
// Feeds are kept under _wp/ (nginx.conf answers /feed/ and /comments/feed/ with them).
for (const [u, f] of Object.entries(statics)) { const r = await get(ORIGIN + u); console.log(u, r.status, r.type, r.buf.length); if (r.status === 200) { mkdirSync(dirname(join(PAR, f)), { recursive: true }); writeFileSync(join(PAR, f), r.buf); } await sleep(1200); }
