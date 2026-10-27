// Builds the static besoinavocat.ca storefront from www/content into www/dist. No dependency.
//   node www/build.mjs            BA_REQUEST_URL overrides the request page (default: portal /demande)
// Content: content/pages/*.html (imported from WordPress, see tools/import-wordpress.mjs),
// content/overrides/*.html (hand-written, take precedence) and content/site.json (logo, site map).
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

const ROOT = new URL('./', import.meta.url);
const DIST = new URL('dist/', ROOT);
const SITE = 'https://besoinavocat.ca';
const REQUEST_URL = process.env.BA_REQUEST_URL || 'https://portail.besoinavocat.ca/demande';
const PORTAL = new URL('/', REQUEST_URL).href;
const PHONE = { label: '514 825-2825', href: 'tel:+15148252825' };
const POLICIES = [['Conditions d’utilisation des justiciables', '/conditions-dutilisation-des-justiciables/'],
  ['Conditions d’utilisation des professionnels', '/conditions-dutilisation-des-professionnels/'], ['Politique de confidentialité', '/politique-de-confidentialite/']];
// WordPress domain groups → domain identifiers of the portal request page. Unlisted groups preselect nothing.
const DOMAIN_IDS = { 'Criminel et pénal': 'criminal', 'Affaires': 'business', 'Famille et jeunesse': 'family', 'Immigration et citoyenneté': 'immigration',
  'Immobilier': 'civil', 'Travail': 'employment', 'Succession': 'civil', 'Responsabilité civile': 'civil', 'Civil (général)': 'civil', 'Logement': 'housing', 'Autres': 'other' };

// Live links whose target is not a page (WordPress attachment, plugin script): same text, working destination.
const LINK_FIXES = { '/avocat-aide-juridique': '/avocat-aide-juridique-2/', '/avocat-aide-juridique/': '/avocat-aide-juridique-2/',
  '/wp-content/plugins/complianz-terms-conditions/download.php': '/wp-content/uploads/complianz/terms-and-conditions.pdf' };

// The stylesheet is cached for a week; its address changes with its content so a deploy is seen at once.
const CSS_VERSION = createHash('sha256').update(readFileSync(new URL('public/assets/site.css', ROOT))).digest('hex').slice(0, 10);

const escape = (value) => String(value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const plain = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function readPages() {
  const pages = new Map();
  for (const dir of ['content/pages/', 'content/overrides/']) {
    const folder = new URL(dir, ROOT);
    if (!existsSync(folder)) continue;
    for (const file of readdirSync(folder).filter((name) => name.endsWith('.html')).sort()) {
      const source = readFileSync(new URL(file, folder), 'utf8');
      const match = source.match(/^<!--\n([\s\S]*?)\n-->\n?/);
      if (!match) throw new Error(`${dir}${file}: missing header comment`);
      const meta = Object.fromEntries(match[1].split('\n').map((line) => { const i = line.indexOf(':'); return [line.slice(0, i).trim(), line.slice(i + 1).trim()]; }));
      if (!meta.path || !meta.path.startsWith('/') || !meta.path.endsWith('/')) throw new Error(`${dir}${file}: path must start and end with /`);
      pages.set(meta.path, { ...meta, file: dir + file, body: source.slice(match[0].length).trim(), override: dir.includes('overrides') });
    }
  }
  return pages;
}

// Site map from the WordPress footer: main links, domain groups with their articles, regions.
function siteMap(site) {
  const top = [], groups = [];
  let current = null;
  for (const item of site.footer) {
    if (item.heading) { current = item.heading === 'Domaines de droit' ? null : { title: item.heading, links: [] }; if (current) groups.push(current); continue; }
    (current ? current.links : top).push(item);
  }
  const regions = groups.find((group) => /région/i.test(group.title));
  return { top, domains: groups.filter((group) => group !== regions), regions };
}

// Internal paths gain the trailing slash WordPress used, when that page exists.
function internal(href, paths) {
  const [, path, rest] = href.match(/^([^#?]*)(.*)$/);
  if (LINK_FIXES[path]) return LINK_FIXES[path] + rest;
  if (path.startsWith('/wp-content/') || path.endsWith('/')) return href;
  return paths.has(path + '/') ? `${path}/${rest}` : href;
}

function requestHref(domainId, extra = '') {
  const url = new URL(REQUEST_URL);
  if (domainId) url.searchParams.set('domaine', domainId);
  return url.href + extra;
}

// Hand-written pages can use {{request}}, {{request:<domain>}}, {{portal}}, {{phone}} and {{phone-label}}.
function tokens(body) {
  return body.replace(/\{\{(request(?::([a-z]+))?|portal|phone|phone-label)\}\}/g, (m, name, domain) => {
    if (name.startsWith('request')) return escape(requestHref(domain));
    return escape({ portal: PORTAL, phone: PHONE.href, 'phone-label': PHONE.label }[name]);
  });
}

function rewrite(body, page, paths, report) {
  const domainId = page.domain ? DOMAIN_IDS[page.domain.title] : undefined;
  return tokens(body)
    // Links to the old domain with or without www become internal.
    .replace(/href="https?:\/\/(?:www\.)?besoinavocat\.ca(\/[^"]*)?"/g, (m, path) => `href="${path || '/'}"`)
    // Request buttons go to the portal request page; empty ones get a real destination.
    .replace(/<a class="button" href="([^"]*)">([^<]*)<\/a>/g, (m, href, label) => {
      if (/trouver mon avocat|find my lawyer/i.test(label) && ['/demande', '/demande/', '#missing'].includes(href)) return `<a class="button" href="${escape(requestHref(domainId))}">${label}</a>`;
      if (/parler à un avocat|obtenir des offres/i.test(label) && href === '#missing') return `<a class="button" href="${PHONE.href}">${label} · ${PHONE.label}</a>`;
      if (href === '#missing') { report.missing.push(`${page.path} « ${label} »`); return `<a class="button" href="${escape(requestHref(domainId))}">${label}</a>`; }
      return m;
    })
    .replace(/href="(\/[^"]*)"/g, (m, href) => `href="${internal(href, paths)}"`)
    // Notes sit inside the article, not as separate landmarks; wide tables scroll with the keyboard too.
    .replace(/<aside class="note">([\s\S]*?)<\/aside>/g, '<div class="note">$1</div>')
    .replace(/<table>/g, '<table tabindex="0">')
    .replace(/<div data-ba-form="professional-interest"><\/div>/g, () => `<div class="card card--accent"><h2>Signaler votre intérêt</h2><p>Inscription professionnelle proposée à 100 $ CA par semaine ou 300 $ CA par mois, crédits IA en supplément. Souscription non ouverte : laissez vos coordonnées sur le portail, nous vous recontactons.</p><p class="cta"><a class="button" href="${escape(new URL('/demande?role=professional', PORTAL).href)}">Signaler mon intérêt</a></p></div>`);
}

function description(body, title) {
  const first = (body.match(/<p>([\s\S]*?)<\/p>/g) || []).map((p) => plain(p)).find((text) => text.length > 40) || title;
  return first.length > 158 ? first.slice(0, 155).replace(/\s+\S*$/, '') + '…' : first;
}

// The BesoinAvocat arrow, drawn inline so the header needs no image request.
const MARK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.5 17.5 17 7M9.5 6.5H17.5V14.5" fill="none" stroke="#ff751f" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const WORDMARK = `<span class="brand-mark">${MARK}</span><span class="brand-word">Besoin<b>avocat</b><small>.ca</small></span>`;

function header(page) {
  const links = [['Domaines de droit', '/demande/'], ['Consultation', '/consultations/'], ['Professionnels', '/professionnels/'], ['Questions', '/faq/']];
  const nav = links.map(([label, href]) => `<a${href === page.path ? ' aria-current="page"' : ''} href="${escape(href)}">${label}</a>`).join('');
  const primary = `<a class="nav-primary" href="${escape(REQUEST_URL)}">Trouver mon avocat</a>`;
  return `<header class="site-header"><div class="wrap header-inner"><a class="brand" href="/" aria-label="BesoinAvocat.ca — accueil">${WORDMARK}</a><nav class="nav-desktop" aria-label="Navigation principale">${nav}${primary}</nav><a class="header-phone" href="${PHONE.href}">${PHONE.label}</a><details class="nav-mobile"><summary>Menu</summary><nav aria-label="Navigation principale">${nav}<a href="${PHONE.href}">${PHONE.label}</a>${primary}</nav></details></div></header>`;
}

function footer(map, paths) {
  const list = (links) => `<ul>${links.map((link) => `<li><a href="${escape(/^https?:/.test(link.href) ? link.href : internal(link.href, paths))}">${escape(link.label)}</a></li>`).join('')}</ul>`;
  const domains = map.domains.map((group) => `<details><summary>${escape(group.title)}</summary>${list(group.links)}</details>`).join('');
  const top = map.top.map((link) => (/^\/demande\/?$/.test(link.href) ? { ...link, href: REQUEST_URL } : link));
  return `<footer class="site-footer"><div class="wrap"><div class="footer-top"><div><p><a class="brand" href="/" aria-label="BesoinAvocat.ca — accueil">${WORDMARK}</a></p><p>Des repères pour préparer votre dossier et trouver l’avocat qui correspond à votre situation. Demande toujours gratuite pour les clients.</p><p class="cta"><a class="button" href="${escape(REQUEST_URL)}">Trouver mon avocat</a> <a class="phone-link" href="${PHONE.href}">${PHONE.label}</a></p></div><nav aria-label="Liens principaux">${list(top)}</nav></div><h2 class="footer-title">Domaines de droit</h2><div class="footer-domains">${domains}</div>${map.regions ? `<h2 class="footer-title">${escape(map.regions.title)}</h2>${list(map.regions.links).replace('<ul>', '<ul class="footer-regions">')}` : ''}<div class="footer-bottom"><p class="footer-legal">BesoinAvocat est un service de préparation et d’orientation, pas un cabinet d’avocats. Les renseignements du site sont généraux et ne remplacent pas l’avis d’un avocat. En cas de danger immédiat, composez le 911.</p><nav aria-label="Politiques">${POLICIES.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</nav><p>© BesoinAvocat.ca · Plateforme indépendante, raccordée à la technologie <a href="https://takatak.ca/">TAKATAK</a></p></div></div></footer>`;
}

const slug = (text) => plain(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'section';
const isEnglish = (body) => { const t = ` ${plain(body).toLowerCase()} `; return (t.match(/ the /g) || []).length > (t.match(/ (le|la|les|des) /g) || []).length; };

// Article pages: the opening (title, "Répondez à quelques questions…", short line, buttons) becomes a header block,
// section titles get anchors for the table of contents. Text and order are unchanged.
function enhance(body, page) {
  const used = new Set();
  const toc = [];
  // A heading never skips a level (h2 then h4 becomes h2 then h3), so the outline stays valid for screen readers.
  let previous = 1;
  body = body.replace(/<(\/?)h([1-6])\b/g, (m, closing, digit) => {
    let level = Number(digit);
    if (!closing) { if (level > previous + 1) level = previous + 1; previous = level; return `<h${level}`; }
    return `</h${previous}`;
  });
  let out = body.replace(/<h2>([\s\S]*?)<\/h2>/g, (m, inner) => {
    let id = slug(inner); for (let n = 2; used.has(id); n++) id = `${slug(inner)}-${n}`;
    used.add(id);
    toc.push({ id, label: plain(inner) });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  const words = plain(body).split(' ').length;
  const minutes = Math.max(1, Math.round(words / 220));
  const opening = out.match(/^(\s*<figure>[\s\S]*?<\/figure>\s*)?(<span class="eyebrow">[^<]*<\/span>\s*)?<h1>([\s\S]*?)<\/h1>\s*(?:<h2 id="[^"]*">((?:Répondez|Answer)[\s\S]*?)<\/h2>\s*)?(?:<p( class="lead")?>([^<]{0,240})<\/p>\s*)?((?:<p class="cta">[\s\S]*?<\/p>\s*)*)/);
  let hero = '';
  if (opening) {
    const [whole, figure = '', eyebrow = '', h1, sub, lead, line, ctas = ''] = opening;
    if (sub) toc.shift();
    const english = page.lang === 'en';
    // Guides (an article of a law domain, or the usual opening) show their domain and reading time.
    const guide = Boolean(page.domain || sub);
    const chips = guide ? `<div class="article-meta">${[page.domain ? `<span class="chip chip--info">${escape(page.domain.title)}</span>` : '', `<span class="chip">${english ? 'Reading' : 'Lecture'} · ${minutes} min</span>`, `<span class="chip chip--ok">${english ? 'Free request' : 'Demande gratuite'}</span>`].join('')}</div>` : '';
    hero = `${figure}<header class="article-hero">${eyebrow}<h1>${h1}</h1>${sub ? `<p class="article-sub">${sub}</p>` : ''}${line ? `<p${lead ? ' class="lead"' : ''}>${line}</p>` : ''}${ctas}${chips}</header>`;
    out = out.slice(whole.length);
  }
  return { hero, body: out, toc: toc.filter((item) => item.label.length > 2).slice(0, 14) };
}

function rail(page, toc) {
  const domainId = page.domain ? DOMAIN_IDS[page.domain.title] : undefined;
  const english = page.lang === 'en';
  const contents = toc.length >= 3 ? `<nav class="toc" aria-label="${english ? 'On this page' : 'Sur cette page'}"><h2>${english ? 'On this page' : 'Sur cette page'}</h2><ol>${toc.map((item) => `<li><a href="#${item.id}">${escape(item.label)}</a></li>`).join('')}</ol></nav>` : '';
  return `<aside class="rail"><div class="rail-cta"><div class="rail-cta-inner"><span class="eyebrow">Demande gratuite</span><h2>Besoin d’un avocat${page.domain ? ` en ${escape(page.domain.title.toLowerCase())}` : ''} ?</h2><p>Décrivez votre situation en quelques minutes. La demande est gratuite; les honoraires de l’avocat restent distincts.</p><ul class="check-list"><li>Questionnaire guidé, en français ou en anglais</li><li>Faits, dates et questions organisés pour l’avocat</li><li>Aucun mandat créé par la demande</li></ul><a class="button" href="${escape(requestHref(domainId))}">Trouver mon avocat</a><a class="phone-link" href="${PHONE.href}">ou appelez le ${PHONE.label}</a></div></div>${contents}</aside>`;
}

function layout(page, body, map, paths) {
  const isHome = page.path === '/';
  const title = isHome ? page.title : `${page.title} – BesoinAvocat`;
  const full = page.layout === 'full';
  const crumbs = page.domain && !isHome ? `<nav class="crumbs" aria-label="Fil d’Ariane"><a href="/">Accueil</a><span aria-hidden="true">/</span>${page.domain.home !== page.path ? `<a href="${escape(page.domain.home)}">${escape(page.domain.title)}</a><span aria-hidden="true">/</span>` : ''}<span>${escape(page.title)}</span></nav>` : '';
  let main;
  if (full) main = body;
  else {
    const withTitle = /<h1[\s>]/.test(body) ? body : `<h1>${escape(page.title)}</h1>${body}`;
    const { hero, body: rest, toc } = enhance(withTitle, page);
    const side = page.aside === 'none' ? '' : rail(page, toc);
    main = `<div class="wrap">${crumbs}${hero}<div class="page-grid${side ? '' : ' page-grid--single'}"><article class="prose">${rest}</article>${side}</div></div>`;
  }
  const desc = description(body, page.title);
  const canonical = SITE + page.path;
  const english = page.lang === 'en';
  return `<!doctype html>
<html lang="${english ? 'en-CA' : 'fr-CA'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)}</title>
<meta name="description" content="${escape(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="${isHome ? 'website' : 'article'}">
<meta property="og:locale" content="${english ? 'en_CA' : 'fr_CA'}">
<meta property="og:site_name" content="BesoinAvocat">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#050b18">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/montserrat-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css?v=${CSS_VERSION}">
</head>
<body${full ? ' class="full"' : ''}>
<a class="skip-link" href="#contenu">Aller au contenu</a>
${header(page)}
<main id="contenu"${full ? '' : ' class="page"'}>${main}</main>
${footer(map, paths)}
</body>
</html>
`;
}

const site = JSON.parse(readFileSync(new URL('content/site.json', ROOT), 'utf8'));
const pages = readPages();
const map = siteMap(site);
// Each article belongs to the domain group that lists it; the group's first link is its home page.
for (const group of map.domains) {
  const home = group.links[0] && group.links[0].href.replace(/([^/])$/, '$1/');
  for (const link of group.links) {
    const page = pages.get(link.href.replace(/([^/])$/, '$1/'));
    if (page && !page.domain) page.domain = { title: group.title, home };
  }
}
const paths = new Set(pages.keys());
const report = { missing: [] };
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
cpSync(new URL('public/', ROOT), DIST, { recursive: true });
for (const page of pages.values()) {
  const out = new URL('.' + page.path, DIST);
  mkdirSync(out, { recursive: true });
  if (!page.lang && isEnglish(page.body)) page.lang = 'en';
  writeFileSync(new URL('index.html', out), layout(page, rewrite(page.body, page, paths, report), map, paths));
}
const notFound = { path: '/404/', title: 'Page introuvable', aside: 'none', layout: '' };
writeFileSync(new URL('404.html', DIST), layout(notFound, `<h1>Page introuvable</h1><p>Cette page n’existe pas ou a été déplacée.</p><p class="cta"><a class="button" href="/">Retour à l’accueil</a> <a class="text-link" href="${escape(REQUEST_URL)}">Trouver mon avocat</a></p>`, map, paths));
const today = new Date().toISOString().slice(0, 10);
writeFileSync(new URL('sitemap.xml', DIST), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...paths].sort().map((path) => `<url><loc>${SITE}${path}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(new URL('robots.txt', DIST), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(JSON.stringify({ pages: pages.size, overrides: [...pages.values()].filter((p) => p.override).length, missingButtons: report.missing, requestUrl: REQUEST_URL }));
