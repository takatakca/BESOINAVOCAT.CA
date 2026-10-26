// Prices are an expression of interest, not an activated checkout or contract.
// Publish a new version when amounts, consent or the selection schema change.
export const CATALOG_VERSION = '2026-10-26.1';
export const CONSENT_VERSION = '2026-10-26.1';
const PROFESSIONAL_AMOUNTS = Object.freeze({ weekly: 10000, monthly: 30000 });
const labels = (id, fr, en) => ({ id, label: { fr, en } });
export const DOMAINS = [
  labels('family', 'Famille', 'Family'), labels('employment', 'Travail', 'Employment'),
  labels('housing', 'Logement', 'Housing'), labels('civil', 'Civil', 'Civil'),
  labels('criminal', 'Criminel et pénal', 'Criminal and penal'), labels('business', 'Affaires', 'Business'),
  labels('immigration', 'Immigration', 'Immigration'), labels('other', 'Autre / à déterminer', 'Other / to be determined'),
];
export const REGIONS = [
  labels('montreal', 'Montréal', 'Montréal'), labels('laval', 'Laval', 'Laval'),
  labels('monteregie', 'Montérégie', 'Montérégie'), labels('capitale-nationale', 'Capitale-Nationale', 'Capitale-Nationale'),
  labels('outaouais', 'Outaouais', 'Outaouais'), labels('laurentides', 'Laurentides', 'Laurentides'),
  labels('lanaudiere', 'Lanaudière', 'Lanaudière'), labels('estrie', 'Estrie', 'Estrie'),
  labels('mauricie', 'Mauricie', 'Mauricie'), labels('chaudiere-appalaches', 'Chaudière-Appalaches', 'Chaudière-Appalaches'),
  labels('centre-du-quebec', 'Centre-du-Québec', 'Centre-du-Québec'),
  labels('saguenay-lac-saint-jean', 'Saguenay–Lac-Saint-Jean', 'Saguenay–Lac-Saint-Jean'),
  labels('bas-saint-laurent', 'Bas-Saint-Laurent', 'Bas-Saint-Laurent'),
  labels('abitibi-temiscamingue', 'Abitibi-Témiscamingue', 'Abitibi-Témiscamingue'),
  labels('cote-nord', 'Côte-Nord', 'Côte-Nord'), labels('nord-du-quebec', 'Nord-du-Québec', 'Nord-du-Québec'),
  labels('gaspesie-iles-de-la-madeleine', 'Gaspésie–Îles-de-la-Madeleine', 'Gaspésie–Îles-de-la-Madeleine'),
  labels('outside-quebec', 'Hors Québec', 'Outside Québec'),
];
export const CONSENT_TEXT = {
  fr: 'Je consens à ce que BesoinAvocat conserve ces coordonnées et catégories pour traiter ma demande de contact. Je ne transmets aucun récit juridique ni document. Cet envoi ne crée ni mandat, ni abonnement, ni paiement.',
  en: 'I consent to BesoinAvocat storing these contact details and categories to process my contact request. I am not submitting a legal account or document. This submission does not create a legal engagement, subscription or payment.',
};

export function interestPrice(role, periodicity) {
  return { currency: 'CAD', amountMinor: role === 'client' ? 0 : PROFESSIONAL_AMOUNTS[periodicity],
    periodicity: role === 'client' ? null : periodicity, purchaseAvailable: false, aiCreditsIncluded: false };
}

export function publicCatalog({ intakeConfigured = false } = {}) {
  return {
    version: CATALOG_VERSION, currency: 'CAD', amountUnit: 'minor', purchaseAvailable: false,
    client: { amountMinor: 0, label: { fr: 'Demande client gratuite', en: 'Free client request' } },
    professional: {
      audience: 'lawyer', pricingStatus: 'announced', subscriptionActive: false, taxTreatment: 'not_configured',
      plans: [
        { id: 'weekly', amountMinor: PROFESSIONAL_AMOUNTS.weekly, interval: 'week', intervalCount: 1, label: { fr: '100 CAD par semaine', en: 'CAD 100 per week' } },
        { id: 'monthly', amountMinor: PROFESSIONAL_AMOUNTS.monthly, interval: 'month', intervalCount: 1, label: { fr: '300 CAD par mois', en: 'CAD 300 per month' } },
      ],
    },
    aiCredits: { includedInProfessionalPlan: false, pricingStatus: 'not_configured', purchaseAvailable: false,
      label: { fr: 'Crédits IA séparés; prix à définir', en: 'Separate AI credits; pricing to be defined' } },
    intake: { enabled: intakeConfigured === true, endpoint: '/api/intake', status: 'interest_only',
      consent: { version: CONSENT_VERSION, text: { ...CONSENT_TEXT } } },
    choices: { roles: [labels('client', 'Client', 'Client'), labels('professional', 'Avocat', 'Lawyer')],
      languages: ['fr', 'en'], domains: structuredClone(DOMAINS), regions: structuredClone(REGIONS) },
  };
}
