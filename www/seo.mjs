// Search metadata for the copy. WordPress published no description, no social preview, no structured data and
// declared every page as English (lang="en-US"). These additions live in <head> or change a tag name only:
// the visible text stays word for word (tools/check-site.mjs) and the layout does not change.

export const ORIGIN = 'https://besoinavocat.ca';
const SITE_NAME = 'BesoinAvocat';
const LOGO = `${ORIGIN}/wp-content/uploads/2025/09/besoinavocat.ca_-e1758915704782.png`;
const PHONE = '+1-514-825-2825';

// Key pages get a written summary, taken from the site's own wording, instead of their first paragraph.
const DESCRIPTIONS = {
  '/': 'Besoin d’un avocat au Québec? Répondez à quelques questions pour trouver un avocat répondant à vos besoins et préparez votre dossier avec BesoinAvocat. Demande gratuite.',
  '/faq/': 'Réponses aux questions fréquentes sur BesoinAvocat, son fonctionnement et ses services pour les clients et les avocats.',
  '/professionnels/': 'Avocats et cabinets : devenez partenaire de BesoinAvocat pour gagner du temps, servir une clientèle sur mesure et augmenter votre visibilité.',
};

const decode = (text) => text.replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'");
const attr = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const plain = (html) => decode(html.replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// The page's own content, between the Elementor header and footer templates.
function contentOf(html) {
  const start = html.search(/data-elementor-type="(?:wp-page|wp-post|single-post|single-page|single)"/);
  if (start < 0) return '';
  const footer = html.indexOf('data-elementor-type="footer"', start);
  return html.slice(start, footer < 0 ? undefined : footer);
}

export function pageTitle(html) {
  const raw = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '';
  return plain(raw).replace(/\s+[–-]\s+BesoinAvocat\s*$/i, '').trim() || SITE_NAME;
}

// The first real paragraph of the page, cut on a word near 155 characters.
export function describe(html) {
  const content = contentOf(html);
  for (const [, inner] of content.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = plain(inner);
    if (text.length < 60 || /^(?:©|copyright)/i.test(text)) continue;
    if (text.length <= 160) return text;
    const cut = text.slice(0, 155);
    return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:.–-]+$/, '')}…`;
  }
  return '';
}

// French unless the page's own text is clearly English (a handful of guides are written in English).
export function languageOf(html) {
  const words = plain(contentOf(html)).toLowerCase().match(/\p{L}+/gu) || [];
  const count = (set) => words.filter((w) => set.has(w)).length;
  const en = count(new Set(['the', 'and', 'of', 'to', 'is', 'you', 'your', 'for', 'with', 'are']));
  const fr = count(new Set(['le', 'la', 'les', 'et', 'des', 'du', 'est', 'vous', 'pour', 'une', 'dans']));
  return en > fr * 2 && en >= 20 ? 'en-CA' : 'fr-CA';
}

// WordPress put every title in an <h2>. The first heading of the page's content becomes its <h1>.
export function withMainHeading(html) {
  if (/<h1\b/i.test(html)) return html;
  const start = html.search(/data-elementor-type="(?:wp-page|wp-post|single-post|single-page|single)"/);
  if (start < 0) return html;
  const rest = html.slice(start);
  const match = /<h2(\s[^>]*\belementor-heading-title\b[^>]*)>([\s\S]*?)<\/h2>/i.exec(rest);
  if (!match || !plain(match[2])) return html;
  const at = start + match.index;
  return `${html.slice(0, at)}<h1${match[1]}>${match[2]}</h1>${html.slice(at + match[0].length)}`;
}

function structuredData(path, title, description, lang) {
  const url = `${ORIGIN}${path}`;
  const organization = { '@type': 'Organization', '@id': `${ORIGIN}/#organization`, name: SITE_NAME, url: `${ORIGIN}/`, logo: LOGO,
    telephone: PHONE, areaServed: { '@type': 'AdministrativeArea', name: 'Québec' } };
  const website = { '@type': 'WebSite', '@id': `${ORIGIN}/#website`, url: `${ORIGIN}/`, name: SITE_NAME, inLanguage: 'fr-CA', publisher: { '@id': `${ORIGIN}/#organization` } };
  const page = { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: title, inLanguage: lang, isPartOf: { '@id': `${ORIGIN}/#website` } };
  if (description) page.description = description;
  if (path !== '/') page.breadcrumb = { '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${ORIGIN}/` },
    { '@type': 'ListItem', position: 2, name: title, item: url },
  ] };
  const graph = path === '/' ? [organization, website, page] : [page];
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

export function withSearchMetadata(html, path) {
  if (!/<\/head>/i.test(html)) return html;
  const lang = languageOf(html);
  let out = html.replace(/<html\b([^>]*)\blang="[^"]*"/i, `<html$1lang="${lang}"`);
  out = withMainHeading(out);
  const title = pageTitle(out);
  const description = /<meta\s+name=["']description["']/i.test(out) ? '' : DESCRIPTIONS[path] || describe(out);
  const url = `${ORIGIN}${path}`;
  const tags = [
    description && `<meta name="description" content="${attr(description)}">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:locale" content="${lang.replace('-', '_')}">`,
    `<meta property="og:type" content="${path === '/' ? 'website' : 'article'}">`,
    `<meta property="og:title" content="${attr(title)}">`,
    description && `<meta property="og:description" content="${attr(description)}">`,
    `<meta property="og:url" content="${attr(url)}">`,
    `<meta property="og:image" content="${LOGO}">`,
    '<meta name="twitter:card" content="summary">',
    `<script type="application/ld+json">${structuredData(path, title, description, lang)}</script>`,
  ].filter(Boolean).join('\n');
  return out.replace(/<\/head>/i, `${tags}\n</head>`);
}
