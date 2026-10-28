// Builds the deployable besoinavocat.ca from www/site, the exact copy of the WordPress site (tools/mirror-wordpress.mjs).
//   node www/build.mjs           BA_REQUEST_URL overrides the request page (default: portal /demande)
// The owner's design and every word stay as built on WordPress. Only these changes are made:
//  - colours move to legal tones (palette.mjs), and the recoloured logo and icon come from overrides/;
//  - links to the site work on any host (canonical and sharing tags keep the real address);
//  - "Trouver mon avocat" leads to the portal request page, with the page's law domain preselected;
//    buttons that had no destination on WordPress get one;
//  - WordPress-only parts that cannot work without WordPress are bridged (forms, login) or removed (REST, feeds).
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { keepReadable, recolour } from './palette.mjs';

const ROOT = new URL('./', import.meta.url).pathname;
const SITE = join(ROOT, 'site'), DIST = join(ROOT, 'dist'), OVERRIDES = join(ROOT, 'overrides');
const ORIGIN = 'https://besoinavocat.ca';
const REQUEST_URL = process.env.BA_REQUEST_URL || 'https://portail.besoinavocat.ca/demande';
const PORTAL = new URL('/', REQUEST_URL).href;
const PHONE = 'tel:+15148252825';
// Footer domain groups of the WordPress site -> domain identifiers of the portal request page.
const DOMAIN_IDS = { 'Criminel et pénal': 'criminal', 'Affaires': 'business', 'Famille et jeunesse': 'family', 'Immigration et citoyenneté': 'immigration',
  'Immobilier': 'civil', 'Travail': 'employment', 'Succession': 'civil', 'Responsabilité civile': 'civil', 'Civil (général)': 'civil', 'Logement': 'housing', 'Autres': 'other' };

const manifest = JSON.parse(readFileSync(join(SITE, 'manifest.json'), 'utf8'));
const decode = (text) => text.replace(/&#0?38;|&amp;/g, '&').replace(/&#8217;/g, '’').replace(/&#8211;/g, '–').replace(/&nbsp;/g, ' ');
const plain = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const report = { pages: 0, css: 0, buttons: [] };

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    if (statSync(file).isDirectory()) walk(file, out); else out.push(file);
  }
  return out;
}

// Domain of each page, from the footer of the home page: a heading, then the links of that group.
function domainsOf(home) {
  const start = home.indexOf('data-elementor-type="footer"');
  const footer = start < 0 ? '' : home.slice(start);
  const byPath = new Map();
  let group = null;
  for (const m of footer.matchAll(/elementor-heading-title[^>]*>([^<]+)<|<a\b[^>]*href="([^"]+)"/g)) {
    if (m[1]) { group = decode(m[1]).trim(); continue; }
    if (!group || !DOMAIN_IDS[group]) continue;
    const path = m[2].replace(/^https?:\/\/(www\.)?besoinavocat\.ca/, '').replace(/([^/])$/, '$1/');
    if (!byPath.has(path)) byPath.set(path, DOMAIN_IDS[group]);
  }
  return byPath;
}

function requestHref(domainId) {
  const url = new URL(REQUEST_URL);
  if (domainId) url.searchParams.set('domaine', domainId);
  return url.href;
}

// Same-site addresses become root-relative so the copy works on any host; plain and JSON-escaped forms.
function relativeLinks(html) {
  const kept = [];
  const protect = (m) => { kept.push(m); return `\u0000${kept.length - 1}\u0000`; };
  html = html.replace(/<link[^>]+rel=["']canonical["'][^>]*>|<meta[^>]+(?:property|name)=["'](?:og|twitter):[^>]*>|<script[^>]+application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi, protect);
  html = html.replace(/(?:https?:)?(\\?\/)\1(?:www\.)?besoinavocat\.ca(\\?\/)/g, '$2')
    .replace(/(?:https?:)?(\\?\/)\1(?:www\.)?besoinavocat\.ca(?![\w.-])/g, '$1');
  return html.replace(/\u0000(\d+)\u0000/g, (m, i) => kept[Number(i)]);
}

// Google Fonts and their files are served from the copy (vendor/), so no page calls a third party.
const fonts = new Map(manifest.assets.filter((a) => a.url.startsWith('https://fonts.googleapis.com/')).map((a) => [a.url, a.path]));
function localFonts(html) {
  return html
    .replace(/(href=["'])(https:\/\/fonts\.googleapis\.com\/[^"']+)(["'])/g, (m, a, url, b) => (fonts.has(decode(url)) ? `${a}${fonts.get(decode(url))}${b}` : m))
    .replace(/<link[^>]+rel=["'](?:dns-prefetch|preconnect)["'][^>]+(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>\s*/g, '');
}

// WordPress endpoints that do not exist in the copy: REST discovery, XML-RPC, oEmbed, feeds, short links.
function withoutWordPressEndpoints(html) {
  return html.replace(/<link[^>]+(?:rel=["'](?:https:\/\/api\.w\.org\/|EditURI|shortlink|pingback)["']|type=["']application\/(?:json|json\+oembed|rss\+xml)["']|type=["']text\/xml\+oembed["'])[^>]*>\s*/gi, '');
}

// Buttons: words unchanged, destinations made to work.
function wireButtons(html, domainId, page) {
  return html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/g, (m, attrs, inner) => {
    const label = plain(inner).toLowerCase();
    const href = (attrs.match(/\shref=["']([^"']*)["']/) || [])[1];
    const target = (url) => (href === undefined ? `<a${attrs} href="${url}">${inner}</a>` : `<a${attrs.replace(/\shref=["'][^"']*["']/, ` href="${url}"`)}>${inner}</a>`);
    if (/^(trouver mon avocat|find my lawyer)$/.test(label) && [undefined, '', '#', '/demande', '/demande/'].includes(href)) return target(requestHref(domainId));
    if (href !== undefined && href !== '' && href !== '#') return m;
    if (!/elementor-button/.test(attrs)) return m;
    if (/^(parler à un avocat|obtenir des offres)/.test(label)) return target(PHONE);
    if (/^contacte-nous$/.test(label)) return target(new URL('/demande?role=professional', PORTAL).href);
    report.buttons.push(`${page} « ${plain(inner)} »`);
    return m;
  });
}

// Colours of inline styles, style blocks and SVG attributes.
function recolourHtml(html) {
  return html
    .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, a, css, b) => a + keepReadable(recolour(css)) + b)
    .replace(/(\sstyle=")([^"]*)(")/gi, (m, a, css, b) => a + recolour(css) + b)
    .replace(/(\s(?:fill|stroke|stop-color|color)=")([^"]*)(")/gi, (m, a, value, b) => a + recolour(value) + b)
    // Colour settings of scripts (the cookie banner reads its colours from its settings object).
    .replace(/("[a-z_]*color[a-z_]*"\s*:\s*")(#[0-9a-f]{3,8})(")/gi, (m, a, value, b) => a + recolour(value) + b);
}

// Readability fixes of the colour change, loaded after every other stylesheet.
const withPaletteFixes = (html) => html.replace(/<\/head>/i, '<link rel="stylesheet" href="/assets/palette-fixes.css">\n</head>');

// Forms and login depend on WordPress; a small script sends them to the portal instead.
function bridge(html) {
  if (!/metform|elementor-login|elementor-form|lostpasswordform/i.test(html)) return html;
  const tag = `<script src="/assets/static-bridge.js" data-professional="${new URL('/demande?role=professional', PORTAL).href}" data-portal="${PORTAL}" defer></script>`;
  return html.replace(/<\/body>/i, `${tag}\n</body>`);
}

// WordPress sent its styles and images with a one-year cache. Every file the copy changes gets a new address
// (?ba=<hash of its content>), so a browser that visited the WordPress site does not reuse the orange version.
const fresh = new Map();
const stamp = (path, content) => fresh.set(path, createHash('sha256').update(content).digest('hex').slice(0, 10));
const withFreshAddresses = (text) => text.replace(/(^|["'\s,(=])(\/(?!\/)[^"'\s,()?#]+)(\?[^"'\s,()#]*)?/g,
  (m, lead, path, query) => (fresh.has(path) ? `${lead}${path}${query ? `${query}&` : '?'}ba=${fresh.get(path)}` : m));

rmSync(DIST, { recursive: true, force: true });
cpSync(SITE, DIST, { recursive: true, filter: (src) => relative(SITE, src) !== 'manifest.json' });
if (existsSync(OVERRIDES)) cpSync(OVERRIDES, DIST, { recursive: true });
const domains = domainsOf(readFileSync(join(SITE, 'index.html'), 'utf8'));
const files = walk(DIST).map((file) => ({ file, path: '/' + relative(DIST, file) }));
const changedFrom = (path, content) => { const source = join(SITE, path); return !existsSync(source) || !readFileSync(source).equals(Buffer.from(content)); };

// Images first (stylesheets point to them), then stylesheets, then pages.
for (const { file, path } of files) {
  if (existsSync(join(OVERRIDES, path))) { stamp(path, readFileSync(file)); continue; }
  if (!/\.svg$/i.test(file) || path.startsWith('/vendor/')) continue;
  const svg = recolour(readFileSync(file, 'utf8'));
  writeFileSync(file, svg);
  if (changedFrom(path, svg)) stamp(path, svg);
}
for (const { file, path } of files) {
  if (!/\.css$/i.test(file) || existsSync(join(OVERRIDES, path))) continue;
  const css = keepReadable(recolour(readFileSync(file, 'utf8'))).replace(/https:\/\/fonts\.gstatic\.com\//g, '/vendor/fonts.gstatic.com/').replace(/https?:\/\/(?:www\.)?besoinavocat\.ca\//g, '/');
  const out = withFreshAddresses(css);
  writeFileSync(file, out);
  if (changedFrom(path, out)) stamp(path, out);
  report.css++;
}
for (const { file, path } of files) {
  if (!/\.html$/i.test(file)) continue;
  const pagePath = path.replace(/index\.html$/, '');
  let html = readFileSync(file, 'utf8');
  html = withoutWordPressEndpoints(localFonts(relativeLinks(html)));
  html = withPaletteFixes(bridge(recolourHtml(wireButtons(html, domains.get(pagePath), pagePath))));
  writeFileSync(file, withFreshAddresses(html));
  report.pages++;
}
const today = new Date().toISOString().slice(0, 10);
const pages = manifest.pages.filter((p) => p.status === 200).map((p) => p.path).sort();
writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `<url><loc>${ORIGIN}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
const digest = createHash('sha256').update(JSON.stringify(manifest.pages.map((p) => p.sha256))).digest('hex').slice(0, 12);
console.log(JSON.stringify({ pages: report.pages, stylesheets: report.css, filesWithNewAddress: fresh.size, mirroredAt: manifest.takenAt, mirrorDigest: digest, buttonsWithoutDestination: report.buttons, requestUrl: REQUEST_URL }));
