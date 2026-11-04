// The cookie banner came from the WordPress CookieAdmin plugin, in English, on a French-language site.
// Approved migration change: its own labels are translated to Quebec French (« témoins », OQLF), nothing else.
// Both the build and tools/check-site.mjs apply this same table, so the word-for-word check stays exact
// for every page text and accepts only these translations, inside the banner and its settings.

const TEXT = [
  ['Necessary cookies enable essential site features like secure log-ins and consent preference adjustments. They do not store personal data.',
    'Les témoins nécessaires permettent les fonctions essentielles du site, comme les connexions sécurisées et l’enregistrement de vos préférences de consentement. Ils ne conservent aucune donnée personnelle.'],
  ['Functional cookies support features like content sharing on social media, collecting feedback, and enabling third-party tools.',
    'Les témoins fonctionnels permettent notamment le partage de contenu sur les réseaux sociaux, la collecte de commentaires et l’utilisation d’outils tiers.'],
  ['Analytical cookies track visitor interactions, providing insights on metrics like visitor count, bounce rate, and traffic sources.',
    'Les témoins analytiques suivent les interactions des visiteurs et fournissent des indicateurs comme le nombre de visiteurs, le taux de rebond et les sources de trafic.'],
  ['Advertisement cookies deliver personalized ads based on your previous visits and analyze the effectiveness of ad campaigns.',
    'Les témoins publicitaires présentent des publicités personnalisées selon vos visites précédentes et mesurent l’efficacité des campagnes.'],
  ['Unclassified cookies are cookies that we are in the process of classifying, together with the providers of individual cookies.',
    'Les témoins non classés sont en cours de classement, avec les fournisseurs des témoins concernés.'],
  ['Necessary Cookies', 'Témoins nécessaires'],
  ['Functional Cookies', 'Témoins fonctionnels'],
  ['Analytical Cookies', 'Témoins analytiques'],
  ['Advertisement Cookies', 'Témoins publicitaires'],
  ['Unclassified Cookies', 'Témoins non classés'],
  ['Always Active', 'Toujours actifs'],
  ['Save My Preferences', 'Enregistrer mes préférences'],
  ['Customize', 'Personnaliser'],
  ['Reject All', 'Tout refuser'],
  ['Accept All', 'Tout accepter'],
  ['Powered by', 'Propulsé par'],
  ['None', 'Aucun'],
];

const POLICY = {
  cookieadmin_notice_title: 'Nous respectons votre vie privée',
  cookieadmin_notice: 'Les témoins (cookies) nous aident à améliorer votre expérience, à personnaliser le contenu et à analyser la fréquentation. Vous pouvez choisir les témoins autorisés en cliquant sur <b>Personnaliser</b>. Cliquez sur <b>Tout accepter</b> pour consentir ou sur <b>Tout refuser</b> pour refuser les témoins non essentiels.',
  cookieadmin_preference_title: 'Personnalisez vos préférences en matière de témoins',
  cookieadmin_preference: 'Nous utilisons des témoins pour assurer une navigation fluide et activer les fonctions essentielles du site. Vous trouverez ci-dessous le détail de chaque catégorie. <br />Les témoins <b>nécessaires</b> sont enregistrés dans votre navigateur, car ils sont essentiels au fonctionnement de base du site. <b>Ces témoins ne requièrent pas votre consentement.</b> <br />Nous utilisons aussi des témoins tiers pour analyser l’utilisation du site, mémoriser vos préférences et présenter du contenu et des publicités pertinents. Ils ne sont activés qu’avec votre consentement. Vous pouvez les activer ou les désactiver; la désactivation de certains types peut toutefois nuire à votre navigation.',
  reConsent_title: 'Modifier mes préférences en matière de témoins',
  cookieadmin_customize_btn: 'Personnaliser',
  cookieadmin_reject_btn: 'Tout refuser',
  cookieadmin_accept_btn: 'Tout accepter',
  cookieadmin_save_btn: 'Enregistrer mes préférences',
};
const POLICY_LANG = { show_less: 'Afficher moins', duration: 'Durée', session: 'Session', days: 'jours' };

const START = '<div class="cookieadmin_law_container"';
const END_MARKER = 'cookieadmin_re_consent';

// Returns [start, end) of the banner and settings markup, or null when the page has no banner.
function bannerRange(html) {
  const start = html.indexOf(START);
  if (start < 0) return null;
  const marker = html.indexOf(END_MARKER, start);
  if (marker < 0) return null;
  const end = html.indexOf('</div>', marker);
  return end < 0 ? null : [start, end + 6];
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function frenchConsentMarkup(html) {
  const range = bannerRange(html);
  if (!range) return html;
  let block = html.slice(...range);
  for (const [en, fr] of TEXT) block = block.replace(new RegExp(`>(\\s*)${escapeRegExp(en)}(\\s*)<`, 'g'), `>$1${fr}$2<`);
  block = block.replace('aria-label="Cookie Consent"', 'aria-label="Consentement aux témoins" lang="fr-CA"');
  return html.slice(0, range[0]) + block + html.slice(range[1]);
}

// The plugin settings are a JSON object in an inline script; only its display strings change.
export function frenchConsentSettings(html) {
  return html.replace(/(cookieadmin_policy = )(\{.*?\});/s, (match, lead, raw) => {
    let policy;
    try { policy = JSON.parse(raw); } catch { return match; }
    for (const [key, value] of Object.entries(POLICY)) if (typeof policy[key] === 'string') policy[key] = value;
    if (policy.lang && typeof policy.lang === 'object') for (const [key, value] of Object.entries(POLICY_LANG)) if (key in policy.lang) policy.lang[key] = value;
    // Same escaping as WordPress: no raw "<" inside the inline script.
    return `${lead}${JSON.stringify(policy).replace(/</g, '\\u003C').replace(/\//g, '\\/')};`;
  });
}

export const frenchConsent = (html) => frenchConsentSettings(frenchConsentMarkup(html));
