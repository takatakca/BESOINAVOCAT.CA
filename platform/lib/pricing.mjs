// Grille de prix de BesoinAvocat (D-041 du 18 novembre 2026; grille A à trois paliers choisie par le propriétaire le
// 20 novembre 2026, D-043).
//
// Direction du propriétaire (18 novembre 2026) : un minimum gratuit pour le client, une adhésion d'environ 15 $ par
// mois pour aller plus loin (surtout les vidéos), environ 30 $ par module d'intégration, un essai de 14 jours des
// forfaits payants, des forfaits mensuels et annuels, et un abonnement mensuel pour intégrer les modules au portail.
// Calcul des coûts et des revenus pour 1 000 puis 10 000 clients : docs/MONETISATION.md.
//
// Ces montants sont l'affichage et le contrat : les prix créés dans Stripe (compte ALKAO.CA) doivent avoir
// exactement les mêmes montants. Montants en cents, CAD, taxes en sus. Aucun paiement n'est possible tant que les
// identifiants de prix et la clé Stripe ne sont pas posés dans Coolify (lib/billing.mjs).
export const PRICING_VERSION = '2026-11-20.2';
export const GB = 1024 ** 3;
export const TRIAL_DAYS = 14;

// Grille A, choisie par le propriétaire le 20 novembre 2026 (docs/TARIFICATION-2026-11-19.md, D-043) : trois paliers.
// L'identifiant « free » du palier gratuit est conservé (il n'est jamais stocké; seuls les abonnements « member » et
// « premium » le sont).
export const CLIENT_PLANS = Object.freeze({
  free: Object.freeze({
    id: 'free', label: 'Découverte', rank: 0, tagline: 'Préparer son dossier, gratuitement.',
    storageBytes: 1 * GB, maxCases: 1, video: false,
    prices: Object.freeze({}),
    features: Object.freeze(['1 dossier', '1 Go d’espace pour vos pièces', 'Documents PDF, images et notes vocales', 'Messages et rendez-vous avec votre avocat', 'Appels vidéo avec votre avocat']),
  }),
  member: Object.freeze({
    id: 'member', label: 'Membre', rank: 1, tagline: 'Votre dossier au complet, vidéos comprises.',
    storageBytes: 25 * GB, maxCases: 5, video: true,
    prices: Object.freeze({ month: 1500, year: 15000 }),
    features: Object.freeze(['5 dossiers', '25 Go d’espace', 'Vidéos dans vos pièces', 'Dossier proposé en priorité aux avocats', 'Tout ce que comprend Découverte']),
  }),
  premium: Object.freeze({
    id: 'premium', label: 'Premium', rank: 2, tagline: 'Sans limite de dossiers, avec un soutien prioritaire.',
    storageBytes: 100 * GB, maxCases: null, video: true,
    prices: Object.freeze({ month: 3900, year: 39000 }),
    features: Object.freeze(['Dossiers illimités', '100 Go d’espace', 'Vidéos dans vos pièces', 'Soutien prioritaire', 'Essai gratuit de 14 jours, sans carte']),
  }),
});
export const PAID_PLAN_IDS = Object.freeze(['member', 'premium']);

// Espace en plus, par tranche de 50 Go, pour un compte client Membre ou Premium. Jusqu'à 20 tranches.
export const STORAGE_PACK = Object.freeze({ id: 'storage', label: 'Espace additionnel', bytes: 50 * GB, prices: Object.freeze({ month: 500 }), maxQuantity: 20, forPlans: PAID_PLAN_IDS });

// Modules d'intégration : chacun s'active une fois (30 $), puis l'abonnement « Intégrations » (19 $ par mois ou 190 $ par
// an) les garde branchés au portail. Les connexions restent celles du compte de la personne chez chaque fournisseur (OAuth).
export const PLUGIN_ACTIVATION = Object.freeze({ id: 'plugin', label: 'Activation d’un module', prices: Object.freeze({ once: 3000 }) });
export const INTEGRATIONS_SUBSCRIPTION = Object.freeze({ id: 'integrations', label: 'Abonnement Intégrations', prices: Object.freeze({ month: 1900, year: 19000 }) });
export const PLUGINS = Object.freeze([
  { id: 'zoom', label: 'Zoom' },
  { id: 'google', label: 'Google Agenda' },
  { id: 'microsoft365', label: 'Outlook · Microsoft 365' },
  { id: 'docusign', label: 'DocuSign' },
  { id: 'clio', label: 'Clio Manage' },
  { id: 'quickbooks', label: 'QuickBooks Online' },
].map(Object.freeze));
export const PLUGIN_IDS = Object.freeze(PLUGINS.map(p => p.id));

// Accès des avocats (propriétaire, 20 novembre 2026, D-044) : 14 jours gratuits, puis 100 $ par semaine sans
// engagement, ou 300 $ par mois avec engagement d'un an (facturé chaque mois d'avance). Les prix réels sont lus chez
// Stripe (lib/membership.mjs, BESOINAVOCAT_STRIPE_PRICE_WEEKLY / _MONTHLY) et doivent avoir ces montants. Tant que Stripe
// n'est pas raccordé, rien n'est bloqué; BESOINAVOCAT_LAWYER_ACCESS=free rend l'accès gratuit, =paid le bloque même sans Stripe.
export const LAWYER_PLANS = Object.freeze({
  weekly: Object.freeze({ id: 'weekly', label: 'À la semaine', amount: 10000, interval: 'week', commitmentMonths: 0, tagline: 'Sans engagement, arrêt quand vous voulez.' }),
  monthly: Object.freeze({ id: 'monthly', label: 'Au mois, engagement d’un an', amount: 30000, interval: 'month', commitmentMonths: 12, tagline: 'Facturé chaque mois d’avance, engagement de douze mois.' }),
});
export const LAWYER_ACCESS = Object.freeze({ status: 'paid', trialDays: TRIAL_DAYS, label: '14 jours gratuits, puis 100 $ par semaine ou 300 $ par mois avec engagement d’un an',
  plans: Object.freeze(Object.values(LAWYER_PLANS).map(p => ({ ...p }))) });

const formatMoney = cents => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100);
export { formatMoney };

// Description publique de la grille, sans état de compte. Lue par /api/pricing et la page /forfaits.
export function publicPricing({ available = {} } = {}) {
  const plan = p => ({ id: p.id, label: p.label, rank: p.rank, tagline: p.tagline, storageBytes: p.storageBytes, maxCases: p.maxCases, video: p.video,
    prices: { ...p.prices }, features: [...p.features] });
  return {
    version: PRICING_VERSION, currency: 'CAD', amountUnit: 'cents', taxes: 'en sus', trialDays: TRIAL_DAYS,
    client: { plans: [plan(CLIENT_PLANS.free), plan(CLIENT_PLANS.member), plan(CLIENT_PLANS.premium)], storagePack: { ...STORAGE_PACK, forPlans: [...STORAGE_PACK.forPlans], prices: { ...STORAGE_PACK.prices } } },
    plugins: { activation: { ...PLUGIN_ACTIVATION.prices }, subscription: { ...INTEGRATIONS_SUBSCRIPTION.prices }, items: PLUGINS.map(p => ({ ...p })) },
    lawyer: { ...LAWYER_ACCESS, plans: LAWYER_ACCESS.plans.map(p => ({ ...p })) },
    purchaseAvailable: { member: Boolean(available.member), memberYear: Boolean(available.memberYear), premium: Boolean(available.premium), premiumYear: Boolean(available.premiumYear), storage: Boolean(available.storage), plugin: Boolean(available.plugin), integrationsYear: Boolean(available.integrationsYear) },
  };
}
