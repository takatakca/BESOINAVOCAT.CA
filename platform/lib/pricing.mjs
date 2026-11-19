// Grille de prix de BesoinAvocat (fil « Construire la monétisation complète du portail », 18 novembre 2026, D-041).
//
// Direction du propriétaire (18 novembre 2026) : un minimum gratuit pour le client, une adhésion d'environ 15 $ par
// mois pour aller plus loin (surtout les vidéos), environ 30 $ par module d'intégration, un essai de 14 jours des
// forfaits payants, des forfaits mensuels et annuels, et un abonnement mensuel pour intégrer les modules au portail.
// Calcul des coûts et des revenus pour 1 000 puis 10 000 clients : docs/MONETISATION.md.
//
// Ces montants sont l'affichage et le contrat : les prix créés dans Stripe (compte ALKAO.CA) doivent avoir
// exactement les mêmes montants. Montants en cents, CAD, taxes en sus. Aucun paiement n'est possible tant que les
// identifiants de prix et la clé Stripe ne sont pas posés dans Coolify (lib/billing.mjs).
export const PRICING_VERSION = '2026-11-18.1';
export const GB = 1024 ** 3;
export const TRIAL_DAYS = 14;

export const CLIENT_PLANS = Object.freeze({
  free: Object.freeze({
    id: 'free', label: 'Essentiel', tagline: 'Préparer son dossier, gratuitement.',
    storageBytes: 1 * GB, maxCases: 1, video: false,
    prices: Object.freeze({}),
    features: Object.freeze(['1 dossier', '1 Go d’espace pour vos pièces', 'Documents PDF, images et notes vocales', 'Messages et rendez-vous avec votre avocat', 'Appels vidéo avec votre avocat']),
  }),
  premium: Object.freeze({
    id: 'premium', label: 'Premium', tagline: 'Tout votre dossier, vidéos comprises.',
    storageBytes: 50 * GB, maxCases: null, video: true,
    prices: Object.freeze({ month: 1500, year: 15000 }),
    features: Object.freeze(['Dossiers illimités', '50 Go d’espace', 'Vidéos dans vos pièces', 'Tout ce que comprend Essentiel', 'Essai gratuit de 14 jours, sans carte']),
  }),
});

// Espace en plus, par tranche, pour un compte client (Essentiel ou Premium). Jusqu'à 10 tranches.
export const STORAGE_PACK = Object.freeze({ id: 'storage', label: 'Espace supplémentaire', bytes: 100 * GB, prices: Object.freeze({ month: 500 }), maxQuantity: 10 });

// Modules d'intégration : chacun s'active une fois (30 $), puis l'abonnement « Intégrations » (9 $ par mois) les garde
// branchés au portail. Les connexions restent celles du compte de la personne chez chaque fournisseur (OAuth).
export const PLUGIN_ACTIVATION = Object.freeze({ id: 'plugin', label: 'Activation d’un module', prices: Object.freeze({ once: 3000 }) });
export const INTEGRATIONS_SUBSCRIPTION = Object.freeze({ id: 'integrations', label: 'Abonnement Intégrations', prices: Object.freeze({ month: 900 }) });
export const PLUGINS = Object.freeze([
  { id: 'zoom', label: 'Zoom' },
  { id: 'google', label: 'Google Agenda' },
  { id: 'microsoft365', label: 'Outlook · Microsoft 365' },
  { id: 'docusign', label: 'DocuSign' },
  { id: 'clio', label: 'Clio Manage' },
  { id: 'quickbooks', label: 'QuickBooks Online' },
].map(Object.freeze));
export const PLUGIN_IDS = Object.freeze(PLUGINS.map(p => p.id));

// Accès des avocats : gratuit pour le moment (propriétaire, 13 novembre 2026). L'abonnement avocat existant
// (lib/membership.mjs) reste prêt, réglé par BESOINAVOCAT_LAWYER_ACCESS=paid le jour où le propriétaire le décide.
export const LAWYER_ACCESS = Object.freeze({ status: 'free', label: 'Accès avocat gratuit pour le moment' });

const formatMoney = cents => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100);
export { formatMoney };

// Description publique de la grille, sans état de compte. Lue par /api/pricing et la page /forfaits.
export function publicPricing({ available = {} } = {}) {
  const plan = p => ({ id: p.id, label: p.label, tagline: p.tagline, storageBytes: p.storageBytes, maxCases: p.maxCases, video: p.video,
    prices: { ...p.prices }, features: [...p.features] });
  return {
    version: PRICING_VERSION, currency: 'CAD', amountUnit: 'cents', taxes: 'en sus', trialDays: TRIAL_DAYS,
    client: { plans: [plan(CLIENT_PLANS.free), plan(CLIENT_PLANS.premium)], storagePack: { ...STORAGE_PACK, prices: { ...STORAGE_PACK.prices } } },
    plugins: { activation: { ...PLUGIN_ACTIVATION.prices }, subscription: { ...INTEGRATIONS_SUBSCRIPTION.prices }, items: PLUGINS.map(p => ({ ...p })) },
    lawyer: { ...LAWYER_ACCESS },
    purchaseAvailable: { premium: Boolean(available.premium), storage: Boolean(available.storage), plugin: Boolean(available.plugin) },
  };
}
