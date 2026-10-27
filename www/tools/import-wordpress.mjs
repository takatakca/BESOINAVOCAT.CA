// One-time import of the public WordPress pages into clean, editable HTML content files.
// Reads a local snapshot (no network): node www/tools/import-wordpress.mjs <snapshot-dir>
// The snapshot holds index.json and raw/*.html, saved from the live site in read-only mode.
// Writes www/content/pages/*.html, www/content/site.json and www/content/assets.json.
// Requires Playwright (npm install --no-save playwright); JavaScript of the pages is not executed.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const snapshot = process.argv[2];
if (!snapshot) throw new Error('Usage: node www/tools/import-wordpress.mjs <snapshot-dir>');
const contentDir = new URL('../content/', import.meta.url);
const pagesDir = new URL('pages/', contentDir);
const index = JSON.parse(readFileSync(`${snapshot}/index.json`, 'utf8'));

// Runs inside the page. Converts Elementor widgets, in document order, to clean HTML.
function extract() {
  const ORIGIN = 'https://besoinavocat.ca';
  const KEEP = { P: [], BR: [], STRONG: [], EM: [], U: [], A: ['href'], UL: [], OL: [], LI: [], H2: [], H3: [], H4: [], H5: [], H6: [],
    BLOCKQUOTE: [], TABLE: [], THEAD: [], TBODY: [], TR: [], TH: ['colspan', 'rowspan'], TD: ['colspan', 'rowspan'], IMG: ['src', 'alt'],
    SUP: [], SUB: [], HR: [], FIGURE: [], FIGCAPTION: [], CODE: [] };
  // A heading level 1 inside body text becomes level 2: the page keeps one h1.
  const RENAME = { B: 'STRONG', I: 'EM', H1: 'H2' };
  const DROP = new Set(['SCRIPT', 'STYLE', 'SVG', 'NOSCRIPT', 'IFRAME', 'FORM', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'LINK', 'META']);
  const SHARE = /^(partager|épingler|tweeter|share|pin|tweet)$/i;
  const assets = new Set(), unknown = {};
  let h1Used = false;
  const escape = (value) => String(value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const text = (node) => (node ? node.textContent : '').replace(/\s+/g, ' ').trim();
  function link(href) {
    if (!href) return '';
    const value = href.trim();
    if (/^(mailto:|tel:)/i.test(value)) return value;
    if (/^javascript:/i.test(value) || value === '#') return '';
    try {
      const url = new URL(value, ORIGIN + '/');
      if (url.origin === ORIGIN) return (url.pathname || '/') + url.search + url.hash;
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
    } catch (_) { return ''; }
  }
  function image(src) {
    if (!src) return '';
    try {
      const url = new URL(src, ORIGIN + '/');
      if (url.origin === ORIGIN && url.pathname.startsWith('/wp-content/uploads/')) { assets.add(url.pathname); return url.pathname; }
      return url.protocol === 'https:' ? url.href : '';
    } catch (_) { return ''; }
  }
  function clean(node) {
    if (node.nodeType === 3) return escape(node.textContent.replace(/ /g, ' '));
    if (node.nodeType !== 1) return '';
    const tag = RENAME[node.tagName] || node.tagName;
    if (DROP.has(tag)) return '';
    const inner = Array.from(node.childNodes).map(clean).join('');
    if (!KEEP[tag]) return inner;
    if (tag === 'A') { const href = link(node.getAttribute('href')); return href ? `<a href="${escape(href)}">${inner}</a>` : inner; }
    if (tag === 'IMG') { const src = image(node.getAttribute('src')); return src ? `<img src="${escape(src)}" alt="${escape(node.getAttribute('alt') || '')}" loading="lazy">` : ''; }
    const attrs = KEEP[tag].filter((name) => node.hasAttribute(name)).map((name) => ` ${name}="${escape(node.getAttribute(name))}"`).join('');
    if (['BR', 'HR'].includes(tag)) return `<${tag.toLowerCase()}>`;
    if (!inner.replace(/<br>/g, '').trim() && !['TD', 'TH'].includes(tag)) return '';
    return `<${tag.toLowerCase()}${attrs}>${inner}</${tag.toLowerCase()}>`;
  }
  const tidy = (html) => html.replace(/\s+/g, ' ').replace(/> </g, '><').replace(/<p>\s*<\/p>/g, '').trim();
  function widget(node) {
    const type = (node.getAttribute('data-widget_type') || '').replace(/\.default$/, '');
    if (type === 'heading') {
      const title = node.querySelector('.elementor-heading-title');
      if (!title || !text(title)) return '';
      let level = /^H[1-6]$/.test(title.tagName) ? title.tagName.toLowerCase() : 'p';
      // Elementor headings are often styled sentences: long or period-ended ones become paragraphs.
      const words = text(title);
      if (level !== 'p' && (words.length > 110 || /[.:;,]$/u.test(words))) level = 'p';
      if (level === 'h1') { if (h1Used) level = 'h2'; h1Used = true; }
      return `<${level}>${tidy(Array.from(title.childNodes).map(clean).join(''))}</${level}>`;
    }
    if (type === 'text-editor') return tidy(Array.from((node.querySelector('.elementor-widget-container') || node).childNodes).map(clean).join(''));
    if (type === 'button') {
      const anchor = node.querySelector('a.elementor-button, .elementor-button');
      const label = text(anchor);
      if (!label) return '';
      return `<p class="cta"><a class="button" href="${escape(link(anchor.getAttribute('href')) || '#missing')}">${escape(label)}</a></p>`;
    }
    if (type === 'image') {
      const img = node.querySelector('img');
      const src = img && image(img.getAttribute('src'));
      if (!src) return '';
      const href = node.querySelector('a') && link(node.querySelector('a').getAttribute('href'));
      const tag = `<img src="${escape(src)}" alt="${escape(img.getAttribute('alt') || '')}" loading="lazy">`;
      const caption = text(node.querySelector('figcaption'));
      return `<figure>${href ? `<a href="${escape(href)}">${tag}</a>` : tag}${caption ? `<figcaption>${escape(caption)}</figcaption>` : ''}</figure>`;
    }
    if (type === 'icon') { const anchor = node.querySelector('a[href]'); const href = anchor && link(anchor.getAttribute('href')); return href ? `<p><a href="${escape(href)}">${escape(anchor.getAttribute('aria-label') || href)}</a></p>` : ''; }
    if (type === 'icon-box') {
      const title = text(node.querySelector('.elementor-icon-box-title'));
      if (!title || SHARE.test(title)) return '';
      const description = node.querySelector('.elementor-icon-box-description');
      const anchor = node.querySelector('a[href]');
      const href = anchor && link(anchor.getAttribute('href'));
      return `<div class="box"><h3>${href ? `<a href="${escape(href)}">${escape(title)}</a>` : escape(title)}</h3>${description ? tidy(`<p>${Array.from(description.childNodes).map(clean).join('')}</p>`) : ''}</div>`;
    }
    if (type === 'nested-accordion') {
      return `<div class="faq">${Array.from(node.querySelectorAll('details')).map((item) => {
        const summary = text(item.querySelector('.e-n-accordion-item-title-text') || item.querySelector('summary'));
        const body = Array.from(item.querySelectorAll('.elementor-widget')).filter((child) => !child.parentElement.closest('.elementor-widget') || child.parentElement.closest('.elementor-widget') === node).map(widget).join('');
        return summary ? `<details><summary>${escape(summary)}</summary>${body}</details>` : '';
      }).join('')}</div>`;
    }
    if (type === 'metform') return `<div data-ba-form="professional-interest"></div>`;
    if (type.startsWith('mf-')) return '';
    unknown[type] = (unknown[type] || 0) + 1;
    return tidy(clean(node));
  }
  const root = document.querySelector('[data-elementor-type="wp-page"], [data-elementor-type="wp-post"]');
  if (!root) {
    // Classic (non-Elementor) page: keep its theme content, if any. An empty page is reported, never invented.
    const classic = document.querySelector('#content .entry-content, #content .ast-container');
    const body = classic && text(classic) ? tidy(clean(classic)) : '';
    return { title: document.title.replace(/\s*[–-]\s*BesoinAvocat\s*$/u, '').trim(), canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
      body, assets: Array.from(assets), unknown: {}, footerItems: [], logo: '', classic: true };
  }
  const parts = [];
  for (const node of root.querySelectorAll('.elementor-widget')) {
    const owner = node.parentElement.closest('.elementor-widget');
    if (owner && root.contains(owner)) continue; // nested widgets are converted by their owner (accordion)
    parts.push(widget(node));
  }
  // Notes added by the storefront plugin outside Elementor widgets are kept as notes.
  document.querySelectorAll('.ba-integrity-note').forEach((note) => parts.push(`<aside class="note">${tidy(clean(note))}</aside>`));
  let body = parts.filter(Boolean).join('\n');
  // A page without a level 1 heading gets its first heading promoted.
  if (!/<h1>/.test(body)) body = body.replace(/<h([2-6])>([\s\S]*?)<\/h\1>/, '<h1>$2</h1>');
  const footer = document.querySelector('[data-elementor-type="footer"]');
  const footerItems = [];
  if (footer) footer.querySelectorAll('.elementor-heading-title, a[href]').forEach((node) => {
    if (node.matches('.elementor-heading-title')) footerItems.push({ heading: text(node) });
    else { const href = link(node.getAttribute('href')); const label = text(node); if (href && label) footerItems.push({ href, label }); }
  });
  return {
    title: document.title.replace(/\s*[–-]\s*BesoinAvocat\s*$/u, '').trim(),
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
    body, assets: Array.from(assets), unknown, footerItems,
    logo: image(document.querySelector('[data-elementor-type="header"] img')?.getAttribute('src')),
  };
}

const browser = await chromium.launch();
const context = await browser.newContext({ javaScriptEnabled: false });
await context.route('**/*', (route) => route.abort());
const page = await context.newPage();
rmSync(pagesDir, { recursive: true, force: true });
mkdirSync(pagesDir, { recursive: true });
const assets = new Set(), unknown = {}, report = [];
let site = null;
for (const entry of index.pages) {
  if (entry.error || entry.status !== 200) { report.push({ path: entry.path, error: entry.error || entry.status }); continue; }
  await page.setContent(readFileSync(`${snapshot}/raw/${entry.file}`, 'utf8'), { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(extract);
  result.assets.forEach((asset) => assets.add(asset));
  for (const [type, count] of Object.entries(result.unknown)) unknown[type] = (unknown[type] || 0) + count;
  if (result.logo) assets.add(result.logo);
  if (entry.path === '/') site = { logo: result.logo, footer: result.footerItems };
  const header = ['<!--', `path: ${entry.path}`, `title: ${result.title.replace(/-->/g, '')}`, `source: ${result.canonical || 'https://besoinavocat.ca' + entry.path}`, '-->'].join('\n');
  writeFileSync(new URL(entry.file, pagesDir), `${header}\n${result.body}\n`);
  report.push({ path: entry.path, bytes: result.body.length });
}
await browser.close();
writeFileSync(new URL('site.json', contentDir), JSON.stringify(site, null, 1) + '\n');
writeFileSync(new URL('assets.json', contentDir), JSON.stringify([...assets].sort(), null, 1) + '\n');
console.log(JSON.stringify({ pages: report.filter((r) => !r.error).length, errors: report.filter((r) => r.error), assets: assets.size, unknownWidgets: unknown, empty: report.filter((r) => r.bytes === 0).map((r) => r.path) }, null, 1));
