import { createServer } from 'node:http';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createStore } from './lib/store.mjs';
import { loadBlobKey } from './lib/blob-crypto.mjs';
import { authenticateRequest, createIntrospection, identityConfiguration, validIdentity } from './lib/identity.mjs';
import { BROWSER_SESSION_COOKIE, createBrowserSessions, browserSessionConfiguration } from './lib/browser-session.mjs';
import { publicCatalog } from './lib/catalog.mjs';
import { createIntake, intakeConfiguration } from './lib/intake.mjs';
import { readiness, report } from './tools/deploy-readiness.mjs';
import { createCommunications, COMMUNICATION_PROVIDERS } from './lib/communications.mjs';
import { publicAddonCatalog } from './lib/addon-catalog.mjs';
import { createIntegrations, integrationConfiguration, readWebhookBody, WEBHOOK_PROVIDERS } from './lib/integrations.mjs';
import { createTelephony, telephonyConfiguration, teamMembers } from './lib/telephony.mjs';
import { createIceServers, createVideoRooms, iceConfiguration } from './lib/video-room.mjs';
import { createDocumentRequests } from './lib/document-requests.mjs';
import { createDeadlines } from './lib/deadlines.mjs';
import { calendarFeedConfiguration, createCalendarFeed } from './lib/calendar-feed.mjs';
import { createSignatures } from './lib/signatures.mjs';
import { createMembership, membershipConfiguration } from './lib/membership.mjs';
import { createAuditSeal } from './lib/audit-seal.mjs';
import { createDocumentGenerator } from './lib/document-generator.mjs';
import { HttpError, fields, text, invalid, identifier, caseInput, documentInput, documentHeaderInput, readJson, readRawBody, MAX_DOCUMENT_JSON_BYTES, MAX_DOCUMENT_BYTES, CASE_STORAGE_QUOTA_BYTES } from './lib/validation.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(HERE, 'public');
// A JSON/base64 upload temporarily needs several representations in memory.
// Bound body readers across every app instance in this Node process.
let uploadsInFlight = 0;
const MAX_CONCURRENT_UPLOADS = 1;
let intakesInFlight = 0;
// Contact fields plus the detailed request's bounded summary (1 500 characters, UTF-8 and JSON escapes).
const MAX_INTAKE_JSON_BYTES = 12288;
const MAX_CONCURRENT_INTAKES = 4;
// Signed provider notifications, read as raw bytes before any parsing.
let webhooksInFlight = 0;
const MAX_CONCURRENT_WEBHOOKS = 8;
// media-src and frame-src blob: let the workspace play a recorded video and preview a PDF from the case's own
// downloaded bytes (object URLs made by the portal's script); nothing is loaded from another origin.
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; frame-src blob:; connect-src 'self'; font-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'";
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/dictation.js', ['dictation.js', 'text/javascript; charset=utf-8']],
  ['/workspace.js', ['workspace.js', 'text/javascript; charset=utf-8']],
  ['/live.js', ['live.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  // Public request page; it posts only to the same-origin /api/intake.
  ['/demande', ['demande.html', 'text/html; charset=utf-8']],
  ['/demande/', ['demande.html', 'text/html; charset=utf-8']],
  ['/demande.js', ['demande.js', 'text/javascript; charset=utf-8']],
  ['/demande.css', ['demande.css', 'text/css; charset=utf-8']],
  // BesoinAvocat logo, as recoloured for the storefront copy (www/dist).
  ['/brand/besoinavocat-logo.png', ['brand/besoinavocat-logo.png', 'image/png']],
  // BesoinAvocat staff inbox of public requests; the data comes only from the reviewer-restricted /api/intakes.
  ['/demandes', ['demandes.html', 'text/html; charset=utf-8']],
  ['/demandes.js', ['demandes.js', 'text/javascript; charset=utf-8']],
  ['/demandes.css', ['demandes.css', 'text/css; charset=utf-8']],
  // Return address registered with each OAuth provider; the page posts the code to /api/integrations/complete.
  ['/integrations/callback', ['integrations-callback.html', 'text/html; charset=utf-8']],
  ['/integrations-callback.js', ['integrations-callback.js', 'text/javascript; charset=utf-8']],
  // Self-hosted fonts of the request page (SIL Open Font License, see public/fonts/LICENSE.txt).
  ['/fonts/inter-latin.woff2', ['fonts/inter-latin.woff2', 'font/woff2']],
  ['/fonts/montserrat-latin.woff2', ['fonts/montserrat-latin.woff2', 'font/woff2']],
  ['/fonts/jetbrains-mono-latin.woff2', ['fonts/jetbrains-mono-latin.woff2', 'font/woff2']],
]);

function securityHeaders(res, requestUrl = '') {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  const portalPage = ['/', '/index.html'].includes(requestUrl.split('?')[0]);
  // The workspace records video messages (camera) and dictation (microphone); other pages get neither.
  res.setHeader('Permissions-Policy', `camera=${portalPage ? '(self)' : '()'}, microphone=${portalPage ? '(self)' : '()'}, geolocation=()`);
  res.setHeader('Cache-Control', 'no-store');
}

// Call recordings, fetched by the server through a fresh MIMT signed link for an authorized member; never cached.
function audio(res, { bytes, type }) {
  res.statusCode = 200;
  res.setHeader('Content-Type', type);
  res.setHeader('Content-Length', bytes.length);
  res.setHeader('Content-Disposition', 'inline; filename="enregistrement"');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(bytes);
}

function json(res, status, value) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(value));
}

// Behind exactly one trusted reverse proxy (Coolify's Traefik), the visitor is the rightmost
// X-Forwarded-For entry: the proxy appends it; anything to its left is supplied by the client.
// Only enable when the container is reachable through that proxy alone.
function clientAddress(req, trustProxy) {
  const peer = req.socket.remoteAddress || 'unknown';
  if (!trustProxy) return peer;
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded !== 'string' || forwarded.length > 2048) return peer;
  const last = forwarded.split(',').pop().trim();
  return /^[0-9A-Fa-f:.]{2,45}$/u.test(last) ? last : peer;
}

function pathOutside(parent, child) {
  const rel = relative(parent, child);
  return !rel || rel.startsWith('..') || isAbsolute(rel);
}

/**
 * Returns an unbound http.Server. Tests may inject authenticate(token, req),
 * returning the exact verified identity contract. No environment or HTTP bypass.
 * integrationFetch replaces fetch for provider calls only (tests use local fakes).
 * app.store is a trusted in-process provisioning surface, never browser-exposed.
 */
export function createApp({
  dbPath = join(HERE, '.data', 'platform.sqlite'),
  blobDir = join(HERE, '.data', 'blobs'),
  authenticate,
  env = process.env,
  browserSessions = createBrowserSessions({ config: browserSessionConfiguration(env) }),
  integrationFetch = globalThis.fetch,
  telephonyFetch = globalThis.fetch,
  paymentsFetch = globalThis.fetch,
  clock = Date.now,
} = {}) {
  const config = identityConfiguration(env);
  const identityConfigured = Boolean(config);
  const trustProxy = env.BESOINAVOCAT_TRUST_PROXY === '1';
  const verifyIdentity = authenticate ?? createIntrospection(config);
  if (typeof verifyIdentity !== 'function') throw new TypeError('authenticate must be a function');
  if (!browserSessions || ['login', 'resolve', 'logout', 'assertMutation', 'clear'].some(name => typeof browserSessions[name] !== 'function')) throw new TypeError('Invalid browser session adapter');
  const loginConfigured = browserSessions.configured === true;
  const emailCodeConfigured = loginConfigured && browserSessions.emailCodeConfigured === true;
  // Neither configuration path may be placed within the public asset directory.
  const insidePublic = path => { const rel = relative(PUBLIC, resolve(path)); return !rel || (!rel.startsWith('..') && !isAbsolute(rel)); };
  if ((dbPath !== ':memory:' && insidePublic(dbPath)) || insidePublic(blobDir)) throw new Error('Private storage cannot be inside public/');
  // Optional encryption at rest of case documents; a configured but unusable key stops the start.
  const store = createStore({ dbPath, blobDir, blobKey: loadBlobKey(env.BESOINAVOCAT_BLOB_KEY_FILE) });
  const communications = createCommunications({ db: store.db, access: store.access, audit: store.audit });
  const integrations = createIntegrations({ db: store.db, access: store.access, audit: store.audit, config: integrationConfiguration(env), fetch: integrationFetch });
  const telephony = createTelephony({ db: store.db, access: store.access, audit: store.audit, store, config: telephonyConfiguration(env), fetch: telephonyFetch, clock });
  const video = createVideoRooms({ db: store.db, access: store.access, audit: store.audit, iceServers: createIceServers(iceConfiguration(env), clock), clock });
  const membership = createMembership({ db: store.db, config: membershipConfiguration(env), fetch: paymentsFetch, clock, teamMembers: teamMembers(env.BESOINAVOCAT_TEAM_MEMBERS) });
  const documentRequests = createDocumentRequests({ db: store.db, access: store.access, audit: store.audit, clock });
  const deadlines = createDeadlines({ db: store.db, access: store.access, audit: store.audit, clock });
  const signatures = createSignatures({ db: store.db, access: store.access, audit: store.audit, store, docusign: integrations.docusign, clock });
  const calendarFeed = createCalendarFeed({ db: store.db, audit: store.audit, config: calendarFeedConfiguration(env), clock });
  const auditSeal = createAuditSeal({ db: store.db, access: store.access, audit: store.audit, clock });
  const generator = createDocumentGenerator({ db: store.db, access: store.access, store, communications, telephony, video, auditSeal, clock });
  const intake = createIntake({ config: intakeConfiguration(env), excludedDirs: [blobDir],
    excludedPaths: [dbPath, env.BESOINAVOCAT_SESSION_DB_PATH, env.BESOINAVOCAT_SESSION_KEY_FILE, env.BESOINAVOCAT_GRANTS_FILE] });

  async function route(req, res) {
    if (!req.url || req.url.length > 4096 || !req.url.startsWith('/') || req.url.startsWith('//')) throw invalid('URL invalide.');
    const rawPath = req.url.split('?')[0];
    if (/\\|%(?:2e|2f|5c|00)/iu.test(rawPath) || rawPath.split('/').some(s => s === '.' || s === '..')) throw invalid('Chemin invalide.');
    const url = new URL(req.url, 'http://local.invalid');
    const path = url.pathname;
    const method = req.method;
    if (path === '/api/health' && method === 'GET') return json(res, 200, { status: 'ok', mode: 'pilot', identityConfigured, loginConfigured, emailCodeConfigured, intakeConfigured: intake.configured });
    if (!path.startsWith('/api/')) {
      if (!['GET', 'HEAD'].includes(method)) throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Méthode non autorisée.');
      const asset = assets.get(path);
      if (!asset) throw new HttpError(404, 'NOT_FOUND', 'Page introuvable.');
      try {
        const root = realpathSync(PUBLIC), file = realpathSync(join(PUBLIC, asset[0]));
        if (pathOutside(root, file)) throw new Error('Asset escapes root');
        const data = readFileSync(file);
        res.statusCode = 200;
        res.setHeader('Content-Type', asset[1]);
        res.setHeader('Content-Length', data.length);
        return res.end(method === 'HEAD' ? undefined : data);
      } catch { throw new HttpError(404, 'NOT_FOUND', 'Page introuvable.'); }
    }

    // Provider notifications carry no session: each is accepted only with the provider's valid signature.
    const webhook = /^\/api\/webhooks\/([a-z0-9]+)$/u.exec(path);
    if (webhook) {
      if (method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Méthode non autorisée.');
      if (!WEBHOOK_PROVIDERS.includes(webhook[1])) throw new HttpError(404, 'NOT_FOUND', 'Ressource introuvable.');
      if (webhooksInFlight >= MAX_CONCURRENT_WEBHOOKS) {
        res.setHeader('Retry-After', '1');
        throw new HttpError(429, 'WEBHOOK_BUSY', 'Réessayez dans un instant.');
      }
      webhooksInFlight++;
      try {
        const result = integrations.webhook(webhook[1], { headers: req.headers, raw: await readWebhookBody(req), url: req.url });
        if (webhook[1] === 'stripe' && result.event && !result.body.duplicate) membership.stripeEvent(result.event);
        if (webhook[1] === 'docusign' && result.event && !result.body.duplicate) signatures.connectEvent(result.event);
        return json(res, result.status, result.body);
      } finally { webhooksInFlight--; }
    }

    // MIMT Connect webhooks (calls, recordings, account links): no session, accepted only with MIMT's valid
    // X-MIMT-Signature over the raw body, deduplicated on the event id (see lib/telephony.mjs).
    if (path === '/api/mimt/webhook') {
      if (method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Méthode non autorisée.');
      if (url.search) throw invalid('Paramètre URL non autorisé.');
      if (webhooksInFlight >= MAX_CONCURRENT_WEBHOOKS) { res.setHeader('Retry-After', '1'); throw new HttpError(429, 'WEBHOOK_BUSY', 'Réessayez dans un instant.'); }
      webhooksInFlight++;
      try {
        const result = telephony.webhook({ headers: req.headers, raw: await readWebhookBody(req) });
        return json(res, result.status, result.body);
      } finally { webhooksInFlight--; }
    }

    // Private calendar subscription read by Outlook, Google or Apple: no session, the secret token is the only key
    // (lib/calendar-feed.mjs). Every failure answers the same 404.
    const feed = /^\/api\/calendar\/([^/]+)\.ics$/u.exec(path);
    if (feed) {
      if (method !== 'GET' && method !== 'HEAD') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Méthode non autorisée.');
      if (url.search) throw invalid('Paramètre URL non autorisé.');
      const calendar = calendarFeed.read(feed[1]);
      if (calendar === null) throw new HttpError(404, 'NOT_FOUND', 'Ressource introuvable.');
      const body = Buffer.from(calendar, 'utf8');
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Length', body.length);
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.setHeader('Referrer-Policy', 'no-referrer');
      return res.end(method === 'HEAD' ? undefined : body);
    }

    // Public contact intake is isolated from client identity and case storage.
    // CORS is confined to these two exact routes, never private dossier APIs.
    if (path === '/api/catalog' || path === '/api/intake') {
      if (url.search) throw invalid('Paramètre URL non autorisé.');
      const expected = path === '/api/catalog' ? 'GET' : 'POST';
      if (method !== expected && method !== 'OPTIONS') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Méthode non autorisée.');
      if (expected === 'POST') intake.requireReady();
      const requestOrigin = intake.cors(req, res, { required: expected === 'POST' || method === 'OPTIONS' });
      if (method === 'OPTIONS') {
        intake.preflight(req, res, expected);
        res.statusCode = 204; return res.end();
      }
      if (expected === 'GET') return json(res, 200, publicCatalog({ intakeConfigured: intake.configured, requestEnabled: intake.requestEnabled }));
      const key = intake.mutation(req);
      intake.reserve(clientAddress(req, trustProxy));
      if (intakesInFlight >= MAX_CONCURRENT_INTAKES) {
        res.setHeader('Retry-After', '1');
        throw new HttpError(429, 'INTAKE_RATE_LIMIT', 'Trop de demandes. Réessayez plus tard.');
      }
      intakesInFlight++;
      try {
        return json(res, 201, intake.receive(await readJson(req, MAX_INTAKE_JSON_BYTES), key, requestOrigin));
      } finally { intakesInFlight--; }
    }

    // Browser cookies and API bearer credentials are separate authentication paths.
    // Never choose one silently when a request presents both.
    const cookieHeader = req.headers.cookie;
    const hasSessionCookie = typeof cookieHeader === 'string' && cookieHeader.split(';').some(part => part.trim().split('=', 1)[0].trim() === BROWSER_SESSION_COOKIE);
    const hasAuthorization = Object.hasOwn(req.headers, 'authorization');
    if (hasSessionCookie && hasAuthorization) throw new HttpError(400, 'AMBIGUOUS_AUTHENTICATION', 'Utilisez une seule méthode de connexion.');
    if (['/api/auth/login', '/api/auth/logout', '/api/auth/email/request', '/api/auth/email/verify'].includes(path)) {
      if (method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Méthode non autorisée.');
      if (url.search) throw invalid('Paramètre URL non autorisé.');
      if (hasAuthorization) throw new HttpError(400, 'AMBIGUOUS_AUTHENTICATION', 'Cette connexion utilise une session de navigateur.');
      browserSessions.assertMutation(req);
      if (path.startsWith('/api/auth/email/') && !emailCodeConfigured) throw new HttpError(503, 'EMAIL_CODE_UNAVAILABLE', 'La connexion par code courriel n’est pas activée.');
      if (path === '/api/auth/email/request') {
        const body = fields(await readJson(req, 1024), ['email'], ['email']);
        if (typeof browserSessions.requestEmailCode !== 'function') throw new HttpError(503, 'IDENTITY_UNAVAILABLE', 'La connexion TAKATAK est indisponible.');
        return json(res, 200, await browserSessions.requestEmailCode(text(body.email, 'Adresse courriel', 320), { clientKey: clientAddress(req, trustProxy) }));
      }
      if (path === '/api/auth/login' || path === '/api/auth/email/verify') {
        const otp = path === '/api/auth/email/verify';
        const allowed = otp ? ['email', 'code'] : ['email', 'password'];
        const body = fields(await readJson(req, otp ? 1024 : 4096), allowed, allowed);
        const email = text(body.email, 'Adresse courriel', 320).trim();
        // Only the socket address is trusted for rate limiting; forwarded client
        // headers are arbitrary unless a separate proxy policy is configured.
        if (otp && typeof browserSessions.verifyEmailCode !== 'function') throw new HttpError(503, 'IDENTITY_UNAVAILABLE', 'La connexion TAKATAK est indisponible.');
        const session = otp
          ? await browserSessions.verifyEmailCode(email, text(body.code, 'Code', 10), { clientKey: clientAddress(req, trustProxy) })
          : await browserSessions.login(email, text(body.password, 'Mot de passe', 4096), { clientKey: clientAddress(req, trustProxy) });
        if (!validIdentity(session.identity) || !Number.isFinite(session.expiresAt)) throw new HttpError(503, 'IDENTITY_UNAVAILABLE', 'La connexion TAKATAK est indisponible.');
        if (hasSessionCookie) browserSessions.logout(cookieHeader);
        res.setHeader('Set-Cookie', session.setCookie);
        return json(res, 200, { user: session.identity, expiresAt: new Date(session.expiresAt).toISOString() });
      }
      fields(await readJson(req, 128, { allowEmpty: true }), []);
      const session = browserSessions.logout(cookieHeader);
      res.setHeader('Set-Cookie', session.setCookie);
      return json(res, 200, { loggedOut: true });
    }
    let user;
    if (hasSessionCookie) {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) browserSessions.assertMutation(req);
      user = await browserSessions.resolve(cookieHeader);
      if (!validIdentity(user)) throw new HttpError(401, 'UNAUTHENTICATED', 'Session non valide pour ce produit.');
    } else {
      user = await authenticateRequest(req, verifyIdentity);
    }
    // BesoinAvocat staff inbox of public requests. Anyone who is not a named reviewer gets 404, as for any unknown route.
    if (path === '/api/intakes' || path.startsWith('/api/intakes/')) {
      const parts = path.split('/').slice(3);
      if (parts.length === 0) {
        if (method !== 'GET') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Méthode non autorisée.');
        const allowed = ['status', 'assigned', 'offset', 'limit'];
        if ([...url.searchParams.keys()].some(key => !allowed.includes(key) || url.searchParams.getAll(key).length !== 1)) throw invalid('Paramètre URL non autorisé.');
        const number = (key, fallback) => {
          const value = url.searchParams.get(key);
          if (value === null) return fallback;
          if (!/^(?:0|[1-9][0-9]{0,5})$/u.test(value)) throw invalid('Pagination invalide.');
          return Number(value);
        };
        return json(res, 200, intake.reviewList(user, { status: url.searchParams.get('status'), assigned: url.searchParams.get('assigned'), offset: number('offset', 0), limit: number('limit', 25) }));
      }
      if (url.search) throw invalid('Paramètre URL non autorisé.');
      if (parts.length === 1 && parts[0] === 'reviewers' && method === 'GET') return json(res, 200, intake.reviewDirectory(user));
      if (parts.length === 1 && method === 'GET') return json(res, 200, intake.reviewRead(user, parts[0]));
      if (parts.length === 2 && parts[1] === 'access' && method === 'GET') return json(res, 200, intake.reviewTrail(user, parts[0]));
      if (parts.length === 2 && parts[1] === 'assign' && method === 'POST') return json(res, 200, intake.reviewAssign(user, parts[0], await readJson(req, 512)));
      if (parts.length === 2 && parts[1] === 'status' && method === 'POST') return json(res, 200, intake.reviewStatus(user, parts[0], await readJson(req, 512)));
      if (parts.length === 2 && parts[1] === 'notes' && method === 'POST') return json(res, 201, intake.reviewNote(user, parts[0], await readJson(req, 20000)));
      throw new HttpError(404, 'NOT_FOUND', 'Ressource introuvable.');
    }
    if (path === '/api/search') {
      if (method !== 'GET') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Méthode non autorisée.');
      const allowed = ['q', 'caseId', 'mode', 'offset', 'limit'];
      if ([...url.searchParams.keys()].some(key => !allowed.includes(key) || url.searchParams.getAll(key).length !== 1)) throw invalid('Paramètre URL non autorisé.');
      const number = (key, fallback) => {
        const value = url.searchParams.get(key);
        if (value === null) return fallback;
        if (!/^(?:0|[1-9][0-9]*)$/u.test(value) || !Number.isSafeInteger(Number(value))) throw invalid('Pagination invalide.');
        return Number(value);
      };
      return json(res, 200, store.searchStructured(user, text(url.searchParams.get('q'), 'Recherche', 200), {
        caseId: url.searchParams.get('caseId'), mode: url.searchParams.get('mode') ?? 'terms',
        offset: number('offset', 0), limit: number('limit', 25),
      }));
    }
    // Open deadlines of every case of the user in the next days (lib/deadlines.mjs).
    if (path === '/api/deadlines/upcoming' && method === 'GET') {
      for (const key of url.searchParams.keys()) if (key !== 'days') throw invalid('Paramètre URL non autorisé.');
      const raw = url.searchParams.get('days') ?? '7';
      if (!/^[0-9]{1,2}$/u.test(raw)) throw invalid('Période attendue entre 1 et 90 jours.');
      return json(res, 200, deadlines.upcoming(user, Number(raw)));
    }
    // The person's own private calendar link (lib/calendar-feed.mjs).
    if (path === '/api/calendar-feed' || path === '/api/calendar-feed/revoke') {
      if (url.search) throw invalid('Paramètre URL non autorisé.');
      if (path === '/api/calendar-feed' && method === 'GET') return json(res, 200, calendarFeed.status(user));
      if (path === '/api/calendar-feed' && method === 'POST') return json(res, 201, calendarFeed.create(user, await readJson(req, 256, { allowEmpty: true })));
      if (path === '/api/calendar-feed/revoke' && method === 'POST') { fields(await readJson(req, 128, { allowEmpty: true }), []); return json(res, 200, calendarFeed.revoke(user)); }
      throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Méthode non autorisée.');
    }
    // Lawyer subscription to the platform, by Stripe Checkout (lib/membership.mjs). Never a client payment.
    if (path === '/api/membership' || path.startsWith('/api/membership/')) {
      if (url.search) throw invalid('Paramètre URL non autorisé.');
        if (path === '/api/membership' && method === 'GET') return json(res, 200, await membership.overview(user));
        if (path === '/api/membership/checkout' && method === 'POST') return json(res, 201, await membership.checkout(user, await readJson(req, 256)));
        if (path === '/api/membership/portal' && method === 'POST') { fields(await readJson(req, 128, { allowEmpty: true }), []); return json(res, 201, await membership.portal(user)); }
      throw new HttpError(404, 'NOT_FOUND', 'Ressource introuvable.');
    }
    // Phone on file, the lawyer's MIMT Connect profile (link, line, availability) and the Équipe console.
    if (path === '/api/telephony' || path.startsWith('/api/telephony/')) {
      if (url.search) throw invalid('Paramètre URL non autorisé.');
      const empty = async () => fields(await readJson(req, 128, { allowEmpty: true }), []);
      if (path === '/api/telephony' && method === 'GET') return json(res, 200, telephony.overview(user));
      if (method === 'POST') {
        if (path === '/api/telephony/phone') return json(res, 200, telephony.savePhone(user, await readJson(req, 256)));
        if (path === '/api/telephony/phone/remove') { await empty(); return json(res, 200, telephony.removePhone(user)); }
        if (path === '/api/telephony/member') return json(res, 200, await telephony.registerMember(user, await readJson(req, 512)));
        if (path === '/api/telephony/member/link') { await empty(); return json(res, 201, await telephony.requestLink(user)); }
        if (path === '/api/telephony/member/refresh') { await empty(); return json(res, 200, await telephony.refreshMember(user)); }
        if (path === '/api/telephony/member/line') return json(res, 200, await telephony.chooseLine(user, await readJson(req, 256)));
        if (path === '/api/telephony/member/availability') return json(res, 200, await telephony.setAvailability(user, await readJson(req, 256)));
        if (path === '/api/telephony/member/unlink') { await empty(); return json(res, 200, await telephony.unlink(user)); }
        if (path === '/api/telephony/member/deactivate') { await empty(); return json(res, 200, await telephony.deactivate(user)); }
        if (path === '/api/telephony/team/sync') { await empty(); return json(res, 200, await telephony.syncHuntGroup(user)); }
        if (path === '/api/telephony/team/calls/sync') { await empty(); return json(res, 200, await telephony.syncCalls(user)); }
        if (path === '/api/telephony/team/credits') { await empty(); return json(res, 200, await telephony.refreshCredits(user)); }
      }
      if (path === '/api/telephony/team' && method === 'GET') return json(res, 200, telephony.teamConsole(user));
      const team = /^\/api\/telephony\/team\/calls\/([^/]+)\/(callback|recording)$/u.exec(path);
      if (team && team[2] === 'callback' && method === 'POST') { await empty(); return json(res, 201, await telephony.teamCallback(user, team[1])); }
      if (team && team[2] === 'recording' && method === 'GET') return audio(res, await telephony.teamRecording(user, team[1]));
      throw new HttpError(404, 'NOT_FOUND', 'Ressource introuvable.');
    }
    if ([...url.searchParams.keys()].some(k => !((path.endsWith('/search') && k === 'q') || (path.endsWith('/pages') && ['offset','limit'].includes(k)))) || [...url.searchParams.keys()].some(k => url.searchParams.getAll(k).length > 1)) throw invalid('Paramètre URL non autorisé.');
    if (path === '/api/me' && method === 'GET') return json(res, 200, { user });
    if (path === '/api/addons' && method === 'GET') return json(res, 200, publicAddonCatalog());
    // Connectors belong to the person, not to a case: each lawyer connects their own Zoom, Outlook or Google account.
    if (path === '/api/integrations' && method === 'GET') return json(res, 200, integrations.list(user));
    if (path === '/api/integrations/complete' && method === 'POST') return json(res, 200, await integrations.complete(user, await readJson(req, 8192)));
    const integration = /^\/api\/integrations\/([a-z0-9]+)\/(connect|disconnect)$/u.exec(path);
    if (integration && method === 'POST') {
      fields(await readJson(req, 128, { allowEmpty: true }), []);
      return json(res, 200, integration[2] === 'connect' ? integrations.connect(user, integration[1]) : await integrations.disconnect(user, integration[1]));
    }
    if (path === '/api/capabilities' && method === 'GET') return json(res, 200, { intakeReview: intake.isReviewer(user), ai: false, structuredSearch: true, telephony: telephony.overview(user), video: { builtIn: true }, documentGeneration: true, documentRequests: true, deadlines: true, calendarFeed: calendarFeed.configured(), signatures: signatures.ready(), auditSeal: true, payments: false, lawyerSubscription: membershipConfiguration(env).configured, addons: publicAddonCatalog(), communications: { appointments: true, manualServerTimer: true, providers: COMMUNICATION_PROVIDERS, billingEnabled: false }, integrations: { engineReady: integrations.engineReady() }, maxDocumentBytes: MAX_DOCUMENT_BYTES, caseStorageQuotaBytes: CASE_STORAGE_QUOTA_BYTES, pageCitations: true });
    if (path === '/api/cases') {
      if (method === 'GET') return json(res, 200, { cases: store.listCases(user) });
      if (method === 'POST') return json(res, 201, { case: store.createCase(user, caseInput(await readJson(req, 4096))) });
    }
    const match = /^\/api\/cases\/([^/]+)(.*)$/u.exec(path);
    if (!match) throw new HttpError(404, 'NOT_FOUND', 'Ressource introuvable.');
    const caseId = identifier(match[1]), suffix = match[2];
    store.access(user, caseId);
    if (!suffix && method === 'GET') return json(res, 200, { ...store.details(user, caseId), communications: communications.list(user, caseId), usage: communications.listUsage(user, caseId), integrationLinks: integrations.linksFor(user, caseId) });
    // Older appointments and usages, page by page (?offset=200&limit=200).
    const pageQuery = () => {
      if ([...url.searchParams.keys()].some(key => !['offset', 'limit'].includes(key) || url.searchParams.getAll(key).length !== 1)) throw invalid('Paramètre URL non autorisé.');
      const read = (key, fallback) => { const value = url.searchParams.get(key); if (value === null) return fallback; if (!/^(?:0|[1-9][0-9]{0,6})$/u.test(value)) throw invalid('Pagination invalide.'); return Number(value); };
      return { offset: read('offset', 0), limit: read('limit', 200) };
    };
    if (suffix === '/communications') {
      if (method === 'GET') return json(res, 200, communications.list(user, caseId, pageQuery()));
      if (method === 'POST') return json(res, 201, { session: communications.schedule(user, caseId, await readJson(req, 4096), req.headers['idempotency-key']) });
    }
    // Create (or remove) the Zoom meeting or calendar entry of an appointment through the person's own connector.
    const appointmentIntegration = /^\/communications\/([^/]+)\/integrations\/([a-z0-9]+)(\/remove)?$/u.exec(suffix);
    if (appointmentIntegration && method === 'POST') {
      const sessionId = identifier(appointmentIntegration[1]), provider = appointmentIntegration[2];
      if (appointmentIntegration[3]) {
        fields(await readJson(req, 128, { allowEmpty: true }), []);
        return json(res, 200, await integrations.unlinkAppointment(user, caseId, sessionId, provider));
      }
      const result = await integrations.linkAppointment(user, caseId, sessionId, provider, await readJson(req, 1024, { allowEmpty: true }));
      return json(res, result.created ? 201 : 200, result);
    }
    const communicationAction = /^\/communications\/([^/]+)\/(start|end|cancel)$/u.exec(suffix);
    if (communicationAction && method === 'POST') {
      fields(await readJson(req, 128, { allowEmpty: true }), []);
      const sessionId = identifier(communicationAction[1]), action = communicationAction[2];
      const result = communications[action](user, caseId, sessionId);
      return json(res, 200, { [action === 'cancel' ? 'session' : 'timer']: result });
    }
    if (suffix === '/usage' && method === 'GET') return json(res, 200, communications.listUsage(user, caseId, pageQuery()));
    const usageApproval = /^\/usage\/([^/]+)\/approve$/u.exec(suffix);
    if (usageApproval && method === 'POST') {
      fields(await readJson(req, 128, { allowEmpty: true }), []);
      return json(res, 200, { usage: communications.approveUsage(user, caseId, identifier(usageApproval[1])) });
    }
    // Streaming upload: the file travels as raw bytes, the description in one header. Same checks,
    // same storage and same result as the JSON route, without the base64 and JSON overhead.
    if (suffix === '/documents/stream' && method === 'PUT') {
      const declaredLength = req.headers['content-length'];
      if (declaredLength !== undefined && (!/^\d+$/u.test(declaredLength) || Number(declaredLength) > MAX_DOCUMENT_BYTES)) throw new HttpError(413, 'FILE_TOO_LARGE', 'Le fichier dépasse la limite configurée.');
      const metadata = documentHeaderInput(req);
      store.access(user, caseId);
      if (uploadsInFlight >= MAX_CONCURRENT_UPLOADS) {
        res.setHeader('Retry-After', '1');
        throw new HttpError(429, 'UPLOAD_BUSY', 'Un fichier est déjà en cours de traitement. Réessayez dans un instant.');
      }
      uploadsInFlight++;
      try {
        return json(res, 201, { document: store.addDocument(user, caseId, { ...metadata, bytes: await readRawBody(req, MAX_DOCUMENT_BYTES) }) });
      } finally { uploadsInFlight--; }
    }
    if (suffix === '/documents' && method === 'POST') {
      const declaredLength = req.headers['content-length'];
      if (declaredLength !== undefined && (!/^\d+$/u.test(declaredLength) || Number(declaredLength) > MAX_DOCUMENT_JSON_BYTES)) throw new HttpError(413, 'BODY_TOO_LARGE', 'La requête est trop volumineuse.');
      if (uploadsInFlight >= MAX_CONCURRENT_UPLOADS) {
        res.setHeader('Retry-After', '1');
        throw new HttpError(429, 'UPLOAD_BUSY', 'Un fichier est déjà en cours de traitement. Réessayez dans un instant.');
      }
      uploadsInFlight++;
      try {
        return json(res, 201, { document: store.addDocument(user, caseId, documentInput(await readJson(req, MAX_DOCUMENT_JSON_BYTES))) });
      } finally { uploadsInFlight--; }
    }
    const pages = /^\/documents\/([^/]+)\/pages$/u.exec(suffix);
    if (pages && method === 'GET') {
      const parsePage = (name, fallback) => {
        const raw = url.searchParams.get(name);
        if (raw === null) return fallback;
        if (!/^[0-9]+$/u.test(raw)) throw invalid('Pagination invalide.');
        return Number(raw);
      };
      return json(res,200,store.documentPages(user,caseId,identifier(pages[1]),{offset:parsePage('offset',0),limit:parsePage('limit',5)}));
    }
    const download = /^\/documents\/([^/]+)\/download$/u.exec(suffix);
    if (download && method === 'GET') {
      const { document, content } = store.download(user, caseId, identifier(download[1]));
      // Always an attachment: declared MIME and extracted text are untrusted inputs.
      const fallback = document.name.replace(/[^a-zA-Z0-9._-]/gu, '_').slice(0, 100) || 'document';
      const encoded = encodeURIComponent(document.name).replace(/[!'()*]/gu, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`);
      res.setHeader('Content-Length', content.length);
      res.setHeader('X-Content-SHA256', document.sha256);
      return res.end(content);
    }
    if (suffix === '/search' && method === 'GET') {
      const query = text(url.searchParams.get('q'), 'Recherche', 200).trim();
      return json(res, 200, { results: store.search(user, caseId, query) });
    }
    if (suffix === '/messages' && method === 'POST') {
      const body = fields(await readJson(req), ['body'], ['body']);
      return json(res, 201, { message: store.addMessage(user, caseId, text(body.body, 'Message', 20000, { multiline: true })) });
    }
    if (suffix === '/time' && method === 'POST') {
      const body = fields(await readJson(req, 16384), ['description', 'minutes'], ['description', 'minutes']);
      const description = text(body.description, 'Description', 2000, { multiline: true });
      if (!Number.isSafeInteger(body.minutes) || body.minutes < 1 || body.minutes > 1440) throw invalid('Durée entière attendue entre 1 et 1440 minutes.');
      return json(res, 201, { timeEntry: store.submitTime(user, caseId, { description, minutes: body.minutes }) });
    }
    const approve = /^\/time\/([^/]+)\/approve$/u.exec(suffix);
    if (approve && method === 'POST') {
      fields(await readJson(req, 128, { allowEmpty: true }), []);
      return json(res, 200, { timeEntry: store.approveTime(user, caseId, identifier(approve[1])) });
    }
    if (suffix === '/audit' && method === 'GET') return json(res, 200, { events: store.listAudit(user, caseId) });
    // Calls, video room, sealed journal and generated documents of the case.
    if (suffix === '/participants' && method === 'GET') return json(res, 200, telephony.participants(user, caseId));
    if (suffix === '/calls' && method === 'GET') return json(res, 200, telephony.listCalls(user, caseId));
    if (suffix === '/calls' && method === 'POST') return json(res, 201, await telephony.startCaseCall(user, caseId, await readJson(req, 512)));
    const callAction = /^\/calls\/([^/]+)\/(time|recording|events)$/u.exec(suffix);
    if (callAction && callAction[2] === 'time' && method === 'POST') { fields(await readJson(req, 128, { allowEmpty: true }), []); return json(res, 201, telephony.addCallTime(user, caseId, callAction[1])); }
    if (callAction && callAction[2] === 'recording' && method === 'GET') return audio(res, await telephony.recording(user, caseId, callAction[1]));
    if (callAction && callAction[2] === 'events' && method === 'GET') return json(res, 200, telephony.callEvents(user, caseId, callAction[1]));
    if (suffix === '/video' && method === 'GET') return json(res, 200, video.status(user, caseId));
    if (suffix === '/video' && method === 'POST') { fields(await readJson(req, 128, { allowEmpty: true }), []); return json(res, 200, video.open(user, caseId)); }
    if (suffix === '/video/history' && method === 'GET') return json(res, 200, { rooms: video.history(user, caseId) });
    const room = /^\/video\/([^/]+)\/(join|signal|poll|leave|end)$/u.exec(suffix);
    if (room && method === 'POST') {
      const body = await readJson(req, room[2] === 'signal' ? 72 * 1024 : 256, { allowEmpty: !['signal', 'poll'].includes(room[2]) });
      if (room[2] === 'join') { fields(body, []); return json(res, 200, await video.join(user, caseId, room[1])); }
      if (room[2] === 'signal') return json(res, 200, video.signal(user, caseId, room[1], body));
      if (room[2] === 'poll') return json(res, 200, video.poll(user, caseId, room[1], body));
      fields(body, []);
      return json(res, 200, room[2] === 'leave' ? video.leave(user, caseId, room[1]) : video.end(user, caseId, room[1]));
    }
    // Signature électronique par DocuSign, avec le compte de l'avocat (lib/signatures.mjs).
    if (suffix === '/signatures' && method === 'GET') return json(res, 200, signatures.list(user, caseId));
    if (suffix === '/signatures' && method === 'POST') return json(res, 201, await signatures.send(user, caseId, await readJson(req, 4096)));
    const signature = /^\/signatures\/([^/]+)\/(refresh|void|retrieve|history)$/u.exec(suffix);
    if (signature && signature[2] === 'history' && method === 'GET') return json(res, 200, signatures.history(user, caseId, signature[1]));
    if (signature && signature[2] === 'void' && method === 'POST') return json(res, 200, await signatures.void(user, caseId, signature[1], await readJson(req, 1024)));
    if (signature && ['refresh', 'retrieve'].includes(signature[2]) && method === 'POST') {
      fields(await readJson(req, 128, { allowEmpty: true }), []);
      if (signature[2] === 'refresh') return json(res, 200, await signatures.refresh(user, caseId, signature[1]));
      const result = await signatures.retrieve(user, caseId, signature[1]);
      return json(res, result.created ? 201 : 200, result);
    }
    // Échéances du dossier, saisies par l'avocat (lib/deadlines.mjs).
    if (suffix === '/deadlines' && method === 'GET') return json(res, 200, deadlines.list(user, caseId));
    if (suffix === '/deadlines' && method === 'POST') return json(res, 201, deadlines.create(user, caseId, await readJson(req, 8192)));
    if (suffix === '/deadlines.ics' && method === 'GET') {
      const body = Buffer.from(deadlines.calendar(user, caseId), 'utf8');
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="echeances.ics"');
      res.setHeader('Content-Length', body.length);
      return res.end(body);
    }
    const deadline = /^\/deadlines\/([^/]+)(?:\/(done|reopen|cancel|history))?$/u.exec(suffix);
    if (deadline && !deadline[2] && method === 'POST') return json(res, 200, deadlines.update(user, caseId, deadline[1], await readJson(req, 8192)));
    if (deadline && deadline[2] === 'history' && method === 'GET') return json(res, 200, deadlines.history(user, caseId, deadline[1]));
    if (deadline && deadline[2] && deadline[2] !== 'history' && method === 'POST') { fields(await readJson(req, 128, { allowEmpty: true }), []); return json(res, 200, deadlines.transition(user, caseId, deadline[1], deadline[2])); }
    // Pièces demandées au client (lib/document-requests.mjs).
    if (suffix === '/requests' && method === 'GET') return json(res, 200, documentRequests.list(user, caseId));
    if (suffix === '/requests' && method === 'POST') return json(res, 201, documentRequests.create(user, caseId, await readJson(req, 8192)));
    const docRequest = /^\/requests\/([^/]+)\/(provide|decide|history)$/u.exec(suffix);
    if (docRequest && docRequest[2] === 'history' && method === 'GET') return json(res, 200, documentRequests.history(user, caseId, docRequest[1]));
    if (docRequest && docRequest[2] === 'provide' && method === 'POST') return json(res, 200, documentRequests.provide(user, caseId, docRequest[1], await readJson(req, 8192)));
    if (docRequest && docRequest[2] === 'decide' && method === 'POST') return json(res, 200, documentRequests.decide(user, caseId, docRequest[1], await readJson(req, 8192)));
    if (suffix === '/journal' && method === 'GET') return json(res, 200, auditSeal.timeline(user, caseId));
    if (suffix === '/journal/verify' && method === 'GET') return json(res, 200, auditSeal.verify(user, caseId));
    if (suffix === '/journal/seal' && method === 'POST') { fields(await readJson(req, 128, { allowEmpty: true }), []); return json(res, 201, auditSeal.seal(user, caseId)); }
    if (suffix === '/generate' && method === 'GET') return json(res, 200, generator.catalog(user, caseId));
    if (suffix === '/generate' && method === 'POST') return json(res, 201, generator.generate(user, caseId, await readJson(req, 24 * 1024)));
    throw new HttpError(404, 'NOT_FOUND', 'Ressource introuvable.');
  }

  const app = createServer({ maxHeaderSize: 16384, requestTimeout: 30000, headersTimeout: 15000 }, (req, res) => {
    securityHeaders(res, req.url || '');
    route(req, res).catch(error => {
      if (res.headersSent) return res.destroy();
      const safe = error instanceof HttpError ? error : new HttpError(500, 'INTERNAL_ERROR', 'Une erreur interne empêche cette opération.');
      json(res, safe.status, { error: { code: safe.code, message: safe.message, ...(safe.link ? { link: safe.link } : {}) } });
    });
  });
  app.keepAliveTimeout = 5000;
  app.maxRequestsPerSocket = 100;
  const dispose = () => { intake.clear(); browserSessions.clear(); store.close(); };
  app.on('close', dispose);
  app.store = store;
  app.dispose = dispose;
  return app;
}

// Printed once at start, after the server listens: the same read-only report as `node tools/deploy-readiness.mjs`,
// so the deployment logs say what is missing without anyone opening a terminal. It never prints a secret value
// and never stops the server: a blocking item is a line in the log, the start itself is not refused here.
export function startupReport(env = process.env, log = console.log) {
  try { log(`Préparation au déploiement (lecture seule) :\n${report(readiness(env))}`); }
  catch (error) { log(`Préparation au déploiement : rapport indisponible (${error.message})`); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535');
  const app = createApp({ dbPath: process.env.DATABASE_PATH || join(HERE, '.data', 'platform.sqlite'), blobDir: process.env.BLOB_DIR || join(HERE, '.data', 'blobs') });
  app.listen(port, host, () => {
    console.log(`BESOINAVOCAT pilote : http://${host}:${port}; connexion TAKATAK ${identityConfiguration() ? 'configurée, contrat à valider' : 'indisponible'}`);
    startupReport();
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => app.close());
}
