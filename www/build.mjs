// Builds the static besoinavocat.ca storefront from www/content into www/dist. No dependency.
//   node www/build.mjs            BA_REQUEST_URL overrides the request page (default: portal /demande)
// Content: content/pages/*.html (imported from WordPress, see tools/import-wordpress.mjs),
// content/overrides/*.html (hand-written, take precedence) and content/site.json (logo, site map).
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
    .replace(/<div data-ba-form="professional-interest"><\/div>/g, () => `<div class="card card--accent"><h2>Signaler votre intérêt</h2><p>Inscription professionnelle proposée à 100 $ CA par semaine ou 300 $ CA par mois, crédits IA en supplément. Souscription non ouverte : laissez vos coordonnées sur le portail, nous vous recontactons.</p><p class="cta"><a class="button" href="${escape(new URL('/demande?role=professional', PORTAL).href)}">Signaler mon intérêt</a></p></div>`);
}

function description(body, title) {
  const first = (body.match(/<p>([\s\S]*?)<\/p>/g) || []).map((p) => plain(p)).find((text) => text.length > 40) || title;
  return first.length > 158 ? first.slice(0, 155).replace(/\s+\S*$/, '') + '…' : first;
}

function header(page, logo) {
  const links = [['Domaines de droit', '/demande/'], ['Consultation', '/consultations/'], ['Professionnels', '/professionnels/'], ['Questions', '/faq/'], ['Trouver mon avocat', REQUEST_URL, true]];
  const nav = links.map(([label, href, primary]) => `<a${primary ? ' class="nav-primary"' : ''}${href === page.path ? ' aria-current="page"' : ''} href="${escape(href)}">${label}</a>`).join('');
  const brand = logo ? `<img src="${escape(logo)}" alt="BesoinAvocat.ca" width="1024" height="181">` : '<span class="brand-text">Besoin<strong>avocat</strong>.ca</span>';
  return `<header class="site-header"><div class="wrap header-inner"><a class="brand" href="/" aria-label="BesoinAvocat.ca — accueil">${brand}</a><nav class="nav-desktop" aria-label="Navigation principale">${nav}</nav><a class="header-phone" href="${PHONE.href}">${PHONE.label}</a><details class="nav-mobile"><summary>Menu</summary><nav aria-label="Navigation principale">${nav}<a href="${PHONE.href}">${PHONE.label}</a></nav></details></div></header>`;
}

function footer(map, paths) {
  const list = (links) => `<ul>${links.map((link) => `<li><a href="${escape(/^https?:/.test(link.href) ? link.href : internal(link.href, paths))}">${escape(link.label)}</a></li>`).join('')}</ul>`;
  const domains = map.domains.map((group) => `<details><summary>${escape(group.title)}</summary>${list(group.links)}</details>`).join('');
  return `<footer class="site-footer"><div class="wrap"><div class="footer-top"><div><p><a class="brand-text" href="/">Besoin<strong>avocat</strong>.ca</a></p><p>Des repères pour préparer votre dossier et trouver l’avocat qui correspond à votre situation. Demande toujours gratuite pour les clients.</p><p><a class="button button--light" href="${escape(REQUEST_URL)}">Trouver mon avocat</a></p><p><a href="${PHONE.href}">${PHONE.label}</a></p></div><nav aria-label="Liens principaux">${list(map.top.map((link) => (/^\/demande\/?$/.test(link.href) ? { ...link, href: REQUEST_URL } : link)))}</nav></div><h2 class="footer-title">Domaines de droit</h2><div class="footer-domains">${domains}</div>${map.regions ? `<h2 class="footer-title">${escape(map.regions.title)}</h2>${list(map.regions.links).replace('<ul>', '<ul class="footer-regions">')}` : ''}<div class="footer-bottom"><p>BesoinAvocat est un service de préparation et d’orientation, pas un cabinet d’avocats. Les renseignements du site sont généraux et ne remplacent pas l’avis d’un avocat. En cas de danger immédiat, composez le 911.</p><nav aria-label="Politiques">${POLICIES.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</nav><p>© BesoinAvocat.ca</p></div></div></footer>`;
}

function layout(page, body, map, logo, paths) {
  const isHome = page.path === '/';
  const title = isHome ? page.title : `${page.title} – BesoinAvocat`;
  const hasH1 = /<h1[\s>]/.test(body);
  const crumbs = page.domain && !isHome ? `<nav class="crumbs" aria-label="Fil d’Ariane"><a href="/">Accueil</a><span aria-hidden="true">›</span>${page.domain.home !== page.path ? `<a href="${escape(page.domain.home)}">${escape(page.domain.title)}</a><span aria-hidden="true">›</span>` : ''}<span>${escape(page.title)}</span></nav>` : '';
  const domainId = page.domain ? DOMAIN_IDS[page.domain.title] : undefined;
  const full = page.layout === 'full';
  const aside = full || page.aside === 'none' ? '' : `<aside class="card card--cta"><h2>Besoin d’un avocat${page.domain ? ` en ${escape(page.domain.title.toLowerCase())}` : ''} ?</h2><p>Décrivez votre situation en quelques minutes. La demande est gratuite; les honoraires de l’avocat restent distincts.</p><p class="cta"><a class="button" href="${escape(requestHref(domainId))}">Trouver mon avocat</a> <a class="text-link" href="${PHONE.href}">ou appelez le ${PHONE.label}</a></p></aside>`;
  const desc = description(body, page.title);
  const canonical = SITE + page.path;
  return `<!doctype html>
<html lang="${page.lang === 'en' ? 'en-CA' : 'fr-CA'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)}</title>
<meta name="description" content="${escape(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="${isHome ? 'website' : 'article'}">
<meta property="og:locale" content="fr_CA">
<meta property="og:site_name" content="BesoinAvocat">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(desc)}">
<meta property="og:url" content="${canonical}">
${logo ? `<meta property="og:image" content="${SITE}${logo}">` : ''}
<meta name="theme-color" content="#172d38">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body${full ? ' class="full"' : ''}>
<a class="skip-link" href="#contenu">Aller au contenu</a>
${header(page, logo)}
<main id="contenu"${full ? '' : ' class="page"'}>${full ? body : `<div class="wrap page-grid${aside ? '' : ' page-grid--single'}"><article class="prose">${crumbs}${hasH1 ? '' : `<h1>${escape(page.title)}</h1>`}${body}</article>${aside}</div>`}</main>
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
  writeFileSync(new URL('index.html', out), layout(page, rewrite(page.body, page, paths, report), map, site.logo, paths));
}
const notFound = { path: '/404/', title: 'Page introuvable', aside: 'none' };
writeFileSync(new URL('404.html', DIST), layout(notFound, `<h1>Page introuvable</h1><p>Cette page n’existe pas ou a été déplacée.</p><p class="cta"><a class="button" href="/">Retour à l’accueil</a> <a class="text-link" href="${escape(REQUEST_URL)}">Trouver mon avocat</a></p>`, map, site.logo, paths));
const today = new Date().toISOString().slice(0, 10);
writeFileSync(new URL('sitemap.xml', DIST), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...paths].sort().map((path) => `<url><loc>${SITE}${path}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(new URL('robots.txt', DIST), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(JSON.stringify({ pages: pages.size, overrides: [...pages.values()].filter((p) => p.override).length, missingButtons: report.missing, requestUrl: REQUEST_URL }));
