// Description OpenAPI 3.1 de l'API du portail, servie sur GET /api/openapi.json. Elle décrit ce que le serveur
// fait réellement : les routes publiques du site, les routes à clé d'API de plateforme (/api/v1) et les routes
// de session du portail. Aucun exemple ne contient de donnée réelle. Mettre à jour ce fichier quand une route
// publique ou à clé change; docs/API.md est le guide en français.
import { CATALOG_VERSION, DOMAINS, REGIONS } from './catalog.mjs';
import { API_SCOPES } from './api-keys.mjs';

export const API_VERSION = '1.0.0';
const IDEMPOTENCY = { name: 'Idempotency-Key', in: 'header', required: true, description: 'UUID v4 aléatoire, nouveau pour chaque demande; la même clé rejoue le même reçu.', schema: { type: 'string', format: 'uuid' } };

function errorResponse(description, codes) {
  return { description, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, examples: Object.fromEntries(codes.map(code => [code, { value: { error: { code, message: '…' } } }])) } } };
}

const intakeRequest = {
  type: 'object', additionalProperties: false,
  required: ['name', 'email', 'role', 'language', 'domain', 'region', 'consent', 'consentVersion'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 120 },
    email: { type: 'string', format: 'email', maxLength: 254 },
    phone: { type: 'string', maxLength: 32, description: 'Facultatif; 7 à 15 chiffres.' },
    role: { type: 'string', enum: ['client', 'professional'] },
    language: { type: 'string', enum: ['fr', 'en'] },
    domain: { type: 'string', enum: DOMAINS.map(item => item.id) },
    region: { type: 'string', enum: REGIONS.map(item => item.id) },
    periodicity: { type: 'string', enum: ['weekly', 'monthly'], description: 'Obligatoire pour `professional`, absent pour `client`.' },
    consent: { type: 'boolean', const: true },
    consentVersion: { type: 'string', description: 'Version exacte du consentement en vigueur (voir GET /api/catalog).' },
    website: { type: 'string', maxLength: 0, description: 'Pot de miel : toujours vide.' },
  },
};

export function openApiDocument({ origin = 'https://portail.besoinavocat.ca' } = {}) {
  return {
    openapi: '3.1.0',
    info: {
      title: 'BesoinAvocat — API du portail',
      version: API_VERSION,
      summary: 'Routes publiques du site, clés d’API de plateforme et API de session du portail.',
      description: 'Le portail ne fournit aucun conseil juridique et ne vend aucun service d’avocat. Les routes /api/v1 sont réservées aux systèmes du propriétaire (site besoinavocat.ca, outils TAKATAK) avec une clé d’API de plateforme; elles n’ouvrent jamais un dossier.',
      'x-catalog-version': CATALOG_VERSION,
    },
    servers: [{ url: origin, description: 'Portail BesoinAvocat' }],
    tags: [
      { name: 'public', description: 'Sans authentification; CORS limité aux origines du site.' },
      { name: 'platform', description: 'Clé d’API de plateforme (Authorization: Bearer ba_…), de serveur à serveur.' },
      { name: 'session', description: 'Session du portail (cookie) : dossiers, pièces, intégrations. Décrites ici en résumé; voir platform/README.md.' },
    ],
    paths: {
      '/api/health': { get: { tags: ['public'], summary: 'État technique', operationId: 'health', responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { status: { const: 'ok' }, mode: { type: 'string' }, intakeConfigured: { type: 'boolean' }, apiKeysConfigured: { type: 'boolean' } } } } } } } } },
      '/api/openapi.json': { get: { tags: ['public'], summary: 'Cette description', operationId: 'openapi', responses: { 200: { description: 'Document OpenAPI 3.1' } } } },
      '/api/catalog': { get: { tags: ['public'], summary: 'Catalogue versionné (prix en cents CAD, domaines, régions, consentement)', operationId: 'catalog',
        parameters: [{ name: 'Origin', in: 'header', required: false, schema: { type: 'string' }, description: 'Origine HTTPS autorisée pour obtenir les en-têtes CORS.' }],
        responses: { 200: { description: 'Catalogue', content: { 'application/json': { schema: { $ref: '#/components/schemas/Catalog' } } } } } } },
      '/api/intake': { post: { tags: ['public'], summary: 'Demande de contact depuis le navigateur du site', operationId: 'intakeBrowser',
        description: 'Requiert `Origin` autorisé, `X-Requested-With: XMLHttpRequest` et `Idempotency-Key`; sans Cookie ni Authorization.',
        parameters: [IDEMPOTENCY, { name: 'X-Requested-With', in: 'header', required: true, schema: { const: 'XMLHttpRequest' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/IntakeRequest' } } } },
        responses: { 201: { description: 'Reçu', content: { 'application/json': { schema: { $ref: '#/components/schemas/IntakeReceipt' } } } },
          400: errorResponse('Champs ou consentement invalides', ['INTAKE_INVALID_INPUT', 'INTAKE_CONSENT_REQUIRED']), 403: errorResponse('Origine ou en-têtes refusés', ['INTAKE_FORBIDDEN']),
          409: errorResponse('Clé déjà utilisée pour un autre contenu', ['IDEMPOTENCY_CONFLICT']), 429: errorResponse('Limite atteinte', ['INTAKE_RATE_LIMIT']), 503: errorResponse('Formulaire fermé', ['INTAKE_UNAVAILABLE']) } } },
      '/api/v1/me': { get: { tags: ['platform'], summary: 'Vérifier une clé : identifiant, nom et permissions', operationId: 'platformMe', security: [{ platformKey: [] }],
        responses: { 200: { description: 'Clé reconnue', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiClient' } } } }, 401: errorResponse('Clé absente', ['API_KEY_REQUIRED']), 403: errorResponse('Clé refusée', ['API_KEY_INVALID']) } } },
      '/api/v1/catalog': { get: { tags: ['platform'], summary: 'Catalogue (permission catalog:read)', operationId: 'platformCatalog', security: [{ platformKey: ['catalog:read'] }],
        responses: { 200: { description: 'Catalogue', content: { 'application/json': { schema: { $ref: '#/components/schemas/Catalog' } } } }, 403: errorResponse('Permission manquante', ['API_SCOPE_MISSING']) } } },
      '/api/v1/intake': { post: { tags: ['platform'], summary: 'Déposer une demande de contact de serveur à serveur (permission intake:write)', operationId: 'platformIntake', security: [{ platformKey: ['intake:write'] }],
        description: 'Même contenu et mêmes règles que /api/intake, sans Origin ni X-Requested-With : le site WordPress ou un outil du propriétaire transmet la demande depuis son serveur. L’origine enregistrée est `apikey:<id>`.',
        parameters: [IDEMPOTENCY],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/IntakeRequest' } } } },
        responses: { 201: { description: 'Reçu', content: { 'application/json': { schema: { $ref: '#/components/schemas/IntakeReceipt' } } } },
          400: errorResponse('Champs ou consentement invalides', ['INTAKE_INVALID_INPUT', 'INTAKE_CONSENT_REQUIRED']), 403: errorResponse('Clé ou permission refusée', ['API_KEY_INVALID', 'API_SCOPE_MISSING']),
          409: errorResponse('Clé d’idempotence réutilisée', ['IDEMPOTENCY_CONFLICT']), 429: errorResponse('Limite de la clé ou du formulaire', ['API_RATE_LIMIT', 'INTAKE_RATE_LIMIT']), 503: errorResponse('Formulaire fermé', ['INTAKE_UNAVAILABLE']) } } },
      '/api/v1/intakes/summary': { get: { tags: ['platform'], summary: 'Totaux des demandes par statut, sans donnée personnelle (permission intakes:read)', operationId: 'platformIntakeSummary', security: [{ platformKey: ['intakes:read'] }],
        responses: { 200: { description: 'Totaux', content: { 'application/json': { schema: { $ref: '#/components/schemas/IntakeSummary' } } } }, 403: errorResponse('Permission manquante', ['API_SCOPE_MISSING']), 503: errorResponse('File fermée', ['INTAKE_UNAVAILABLE']) } } },
      '/api/me': { get: { tags: ['session'], summary: 'Identité de la session', security: [{ portalSession: [] }], responses: { 200: { description: 'Personne connectée' }, 401: { description: 'Sans session' } } } },
      '/api/capabilities': { get: { tags: ['session'], summary: 'Fonctions actives du portail', security: [{ portalSession: [] }], responses: { 200: { description: 'Capacités' } } } },
      '/api/cases': { get: { tags: ['session'], summary: 'Dossiers accessibles', security: [{ portalSession: [] }], responses: { 200: { description: 'Liste' } } }, post: { tags: ['session'], summary: 'Créer un dossier (rôle client)', security: [{ portalSession: [] }], responses: { 201: { description: 'Dossier' } } } },
      '/api/cases/{caseId}': { get: { tags: ['session'], summary: 'Pièces, échanges, temps et rendez-vous du dossier', security: [{ portalSession: [] }], parameters: [{ name: 'caseId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Dossier' }, 404: { description: 'Inconnu ou sans accès' } } } },
      '/api/integrations': { get: { tags: ['session'], summary: 'Connecteurs de la personne (Zoom, Microsoft 365, Google, DocuSign, Clio, QuickBooks) et leur état', security: [{ portalSession: [] }], responses: { 200: { description: 'Connecteurs' } } } },
      '/api/webhooks/{provider}': { post: { tags: ['public'], summary: 'Notifications signées des fournisseurs (zoom, stripe, twilio, docusign)', parameters: [{ name: 'provider', in: 'path', required: true, schema: { type: 'string', enum: ['zoom', 'stripe', 'twilio', 'docusign'] } }], responses: { 200: { description: 'Acceptée' }, 401: { description: 'Signature invalide' } } } },
      '/api/mimt/webhook': { post: { tags: ['public'], summary: 'Notifications signées de MIMT Connect (appels, enregistrements)', responses: { 200: { description: 'Acceptée' }, 401: { description: 'Signature invalide' } } } },
    },
    components: {
      securitySchemes: {
        platformKey: { type: 'http', scheme: 'bearer', bearerFormat: 'ba_<id>_<secret>', description: `Clé d’API de plateforme. Permissions : ${API_SCOPES.join(', ')}. Jamais depuis un navigateur.` },
        portalSession: { type: 'apiKey', in: 'cookie', name: '__Host-ba_session', description: 'Session du portail ouverte par /api/auth/login ou le code par courriel.' },
      },
      schemas: {
        Error: { type: 'object', required: ['error'], properties: { error: { type: 'object', required: ['code', 'message'], properties: { code: { type: 'string' }, message: { type: 'string' } } } } },
        Catalog: { type: 'object', description: `Catalogue versionné ${CATALOG_VERSION}; montants en cents CAD.`, properties: { version: { type: 'string' }, currency: { const: 'CAD' }, amountUnit: { const: 'minor' }, purchaseAvailable: { type: 'boolean' }, client: { type: 'object' }, professional: { type: 'object' }, domains: { type: 'array' }, regions: { type: 'array' }, intake: { type: 'object' } } },
        IntakeRequest: intakeRequest,
        IntakeReceipt: { type: 'object', required: ['reference', 'status'], properties: { reference: { type: 'string', pattern: '^BA-[A-Za-z0-9_-]{24}$' }, status: { const: 'received' } } },
        ApiClient: { type: 'object', required: ['id', 'name', 'scopes'], properties: { id: { type: 'string' }, name: { type: 'string' }, scopes: { type: 'array', items: { type: 'string', enum: API_SCOPES } } } },
        IntakeSummary: { type: 'object', required: ['total', 'counts', 'open'], properties: { total: { type: 'integer' }, counts: { type: 'object', additionalProperties: { type: 'integer' } }, open: { type: 'integer', description: 'received + in_review' }, lastReceivedAt: { type: ['string', 'null'], format: 'date-time' }, generatedAt: { type: 'string', format: 'date-time' } } },
      },
    },
  };
}
