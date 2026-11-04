// Prices are an expression of interest, not an activated checkout or contract.
// Publish a new version when amounts, consent or the selection schema change.
import { publicQuestionnaire } from './questionnaire.mjs';
export const CATALOG_VERSION = '2026-11-04.1';
export const CONSENT_VERSION = '2026-10-26.1';
// Detailed client request (situation, urgency, deadline). Separate consent; disabled unless configured.
export const REQUEST_CONSENT_VERSION = '2026-10-27.1';
export const SUMMARY_LIMITS = Object.freeze({ min: 20, max: 1500 });
export const DEADLINE_MAX_DAYS = 1830;
const PROFESSIONAL_AMOUNTS = Object.freeze({ weekly: 10000, monthly: 30000 });
const labels = (id, fr, en) => ({ id, label: { fr, en } });
// Display order of the guided request. The ids of the first eight areas are unchanged since 2026-10-26.
export const DOMAINS = [
  labels('family', 'Famille et jeunesse', 'Family and youth'), labels('business', 'Affaires et entreprises', 'Business'),
  labels('criminal', 'Criminel et pénal', 'Criminal and penal'), labels('real-estate', 'Immobilier', 'Real estate'),
  labels('immigration', 'Immigration et citoyenneté', 'Immigration and citizenship'),
  labels('administrative', 'Administratif (organismes publics)', 'Administrative (public bodies)'),
  labels('liability', 'Responsabilité civile et dommages', 'Civil liability and damages'), labels('employment', 'Travail et emploi', 'Employment'),
  labels('civil', 'Civil et contrats', 'Civil and contracts'), labels('tax', 'Fiscalité', 'Tax'),
  labels('housing', 'Logement et bail', 'Housing and leases'), labels('estates', 'Successions et testaments', 'Estates and wills'),
  labels('rights', 'Droits et libertés', 'Rights and freedoms'), labels('insolvency', 'Faillite et dettes', 'Bankruptcy and debt'),
  labels('municipal', 'Municipal', 'Municipal'), labels('other', 'Autre / je ne sais pas', 'Other / I do not know'),
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
  labels('ontario', 'Ontario', 'Ontario'),
  labels('outside-quebec', 'Autre province ou territoire', 'Other province or territory'),
];
export const STAGES = [
  labels('none', 'Aucune procédure en cours', 'No proceeding under way'),
  labels('considering', 'Une procédure est envisagée', 'A proceeding is being considered'),
  labels('ongoing', 'Une procédure est en cours', 'A proceeding is under way'),
  labels('decided', 'Une décision a été rendue', 'A decision has been rendered'),
  labels('unknown', 'Je ne sais pas', 'I do not know'),
];
export const OBJECTIVES = [
  labels('understand', 'Comprendre mes options', 'Understand my options'),
  labels('represent', 'Être représenté·e', 'Be represented'),
  labels('document', 'Faire préparer ou réviser un document', 'Have a document prepared or reviewed'),
  labels('settle', 'Négocier ou régler un différend', 'Negotiate or settle a dispute'),
  labels('other', 'Autre', 'Other'),
];
export const URGENCIES = [
  labels('immediate', 'Moins de 48 heures', 'Within 48 hours'),
  labels('week', 'Dans la semaine', 'Within a week'),
  labels('month', 'Dans le mois', 'Within a month'),
  labels('flexible', 'Pas d’urgence particulière', 'No particular urgency'),
  labels('unknown', 'Je ne sais pas', 'I do not know'),
];
export const CONTACT_PREFERENCES = [labels('email', 'Par courriel', 'By email'), labels('phone', 'Par téléphone', 'By phone')];
export const CONSENT_TEXT = {
  fr: 'Je consens à ce que BesoinAvocat conserve ces coordonnées et catégories pour traiter ma demande de contact. Je ne transmets aucun récit juridique ni document. Cet envoi ne crée ni mandat, ni abonnement, ni paiement.',
  en: 'I consent to BesoinAvocat storing these contact details and categories to process my contact request. I am not submitting a legal account or document. This submission does not create a legal engagement, subscription or payment.',
};

// Requires legal and privacy review before activation; a changed purpose needs a new version.
export const REQUEST_CONSENT_TEXT = {
  fr: 'Je consens à ce que BesoinAvocat conserve ces coordonnées, ces catégories et le résumé de ma situation pour traiter ma demande et me recontacter à son sujet. Je n’inclus aucun document, numéro d’identification ou renseignement de santé non nécessaire. Cet envoi ne crée ni mandat, ni relation avocat-client, ni abonnement, ni paiement.',
  en: 'I consent to BesoinAvocat storing these contact details, categories and the summary of my situation to process my request and contact me about it. I am not including any document, identification number or unnecessary health information. This submission does not create a legal mandate, lawyer-client relationship, subscription or payment.',
};

export function interestPrice(role, periodicity) {
  return { currency: 'CAD', amountMinor: role === 'client' ? 0 : PROFESSIONAL_AMOUNTS[periodicity],
    periodicity: role === 'client' ? null : periodicity, purchaseAvailable: false, aiCreditsIncluded: false };
}

export function publicCatalog({ intakeConfigured = false, requestEnabled = false } = {}) {
  return {
    version: CATALOG_VERSION, currency: 'CAD', amountUnit: 'minor', purchaseAvailable: false,
    client: { amountMinor: 0, label: { fr: 'Demande initiale de contact gratuite', en: 'Free initial contact request' },
      paidServices: { pricingStatus: 'not_configured', purchaseAvailable: false, chargingBasis: 'usage_volume',
        label: { fr: 'Les futurs services du dossier et de l’IA pourront être payants selon le volume; tarifs et conditions à définir avant toute activation.', en: 'Future case and AI services may be paid according to usage volume; prices and terms must be defined before activation.' } } },
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
      consent: { version: CONSENT_VERSION, text: { ...CONSENT_TEXT } },
      request: { enabled: intakeConfigured === true && requestEnabled === true, audience: 'client', status: 'request_only',
        consent: { version: REQUEST_CONSENT_VERSION, text: { ...REQUEST_CONSENT_TEXT } },
        summary: { minLength: SUMMARY_LIMITS.min, maxLength: SUMMARY_LIMITS.max }, deadline: { format: 'YYYY-MM-DD', maxDays: DEADLINE_MAX_DAYS },
        questionnaire: publicQuestionnaire() } },
    choices: { roles: [labels('client', 'Client', 'Client'), labels('professional', 'Avocat', 'Lawyer')],
      languages: ['fr', 'en'], domains: structuredClone(DOMAINS), regions: structuredClone(REGIONS),
      stages: structuredClone(STAGES), objectives: structuredClone(OBJECTIVES), urgencies: structuredClone(URGENCIES),
      contactPreferences: structuredClone(CONTACT_PREFERENCES) },
  };
}
