import { createServer } from 'node:http';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createStore } from './lib/store.mjs';
import { authenticateRequest, createIntrospection, identityConfiguration, validIdentity } from './lib/identity.mjs';
import { BROWSER_SESSION_COOKIE, createBrowserSessions, browserSessionConfiguration } from './lib/browser-session.mjs';
import { publicCatalog } from './lib/catalog.mjs';
import { createIntake, intakeConfiguration } from './lib/intake.mjs';
import { createCommunications, COMMUNICATION_PROVIDERS } from './lib/communications.mjs';
import { publicAddonCatalog } from './lib/addon-catalog.mjs';
import { HttpError, fields, text, invalid, identifier, caseInput, documentInput, readJson, MAX_DOCUMENT_JSON_BYTES, MAX_DOCUMENT_BYTES, CASE_STORAGE_QUOTA_BYTES } from './lib/validation.mjs';

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
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'";
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/dictation.js', ['dictation.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  // Public request page; it posts only to the same-origin /api/intake.
  ['/demande', ['demande.html', 'text/html; charset=utf-8']],
  ['/demande/', ['demande.html', 'text/html; charset=utf-8']],
  ['/demande.js', ['demande.js', 'text/javascript; charset=utf-8']],
  ['/demande.css', ['demande.css', 'text/css; charset=utf-8']],
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
  res.setHeader('Permissions-Policy', `camera=(), microphone=${portalPage ? '(self)' : '()'}, geolocation=()`);
  res.setHeader('Cache-Control', 'no-store');
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
 * app.store is a trusted in-process provisioning surface, never browser-exposed.
 */
export function createApp({
  dbPath = join(HERE, '.data', 'platform.sqlite'),
  blobDir = join(HERE, '.data', 'blobs'),
  authenticate,
  env = process.env,
  browserSessions = createBrowserSessions({ config: browserSessionConfiguration(env) }),
} = {}) {
  const config = identityConfiguration(env);
  const identityConfigured = Boolean(config);
  const trustProxy = env.BESOINAVOCAT_TRUST_PROXY === '1';
  const verifyIdentity = authenticate ?? createIntrospection(config);
  if (typeof verifyIdentity !== 'function') throw new TypeError('authenticate must be a function');
  if (!browserSessions || ['login', 'resolve', 'logout', 'assertMutation', 'clear'].some(name => typeof browserSessions[name] !== 'function')) throw new TypeError('Invalid browser session adapter');
  const loginConfigured = browserSessions.configured === true;
  // Neither configuration path may be placed within the public asset directory.
  const insidePublic = path => { const rel = relative(PUBLIC, resolve(path)); return !rel || (!rel.startsWith('..') && !isAbsolute(rel)); };
  if ((dbPath !== ':memory:' && insidePublic(dbPath)) || insidePublic(blobDir)) throw new Error('Private storage cannot be inside public/');
  const store = createStore({ dbPath, blobDir });
  const communications = createCommunications({ db: store.db, access: store.access, audit: store.audit });
  const intake = createIntake({ config: intakeConfiguration(env), excludedDirs: [blobDir],
    excludedPaths: [dbPath, env.BESOINAVOCAT_SESSION_DB_PATH, env.BESOINAVOCAT_SESSION_KEY_FILE, env.BESOINAVOCAT_GRANTS_FILE] });

  async function route(req, res) {
    if (!req.url || req.url.length > 4096 || !req.url.startsWith('/') || req.url.startsWith('//')) throw invalid('URL invalide.');
    const rawPath = req.url.split('?')[0];
    if (/\\|%(?:2e|2f|5c|00)/iu.test(rawPath) || rawPath.split('/').some(s => s === '.' || s === '..')) throw invalid('Chemin invalide.');
    const url = new URL(req.url, 'http://local.invalid');
    const path = url.pathname;
    const method = req.method;
    if (path === '/api/health' && method === 'GET') return json(res, 200, { status: 'ok', mode: 'pilot', identityConfigured, loginConfigured, intakeConfigured: intake.configured });
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
    if (path === '/api/auth/login' || path === '/api/auth/logout') {
      if (method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Méthode non autorisée.');
      if (url.search) throw invalid('Paramètre URL non autorisé.');
      if (hasAuthorization) throw new HttpError(400, 'AMBIGUOUS_AUTHENTICATION', 'Cette connexion utilise une session de navigateur.');
      browserSessions.assertMutation(req);
      if (path === '/api/auth/login') {
        const body = fields(await readJson(req, 4096), ['email', 'password'], ['email', 'password']);
        const email = text(body.email, 'Adresse courriel', 320).trim();
        const password = text(body.password, 'Mot de passe', 4096);
        // Only the socket address is trusted for rate limiting; forwarded client
        // headers are arbitrary unless a separate proxy policy is configured.
        const session = await browserSessions.login(email, password, { clientKey: clientAddress(req, trustProxy) });
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
    if ([...url.searchParams.keys()].some(k => !((path.endsWith('/search') && k === 'q') || (path.endsWith('/pages') && ['offset','limit'].includes(k)))) || [...url.searchParams.keys()].some(k => url.searchParams.getAll(k).length > 1)) throw invalid('Paramètre URL non autorisé.');
    if (path === '/api/me' && method === 'GET') return json(res, 200, { user });
    if (path === '/api/addons' && method === 'GET') return json(res, 200, publicAddonCatalog());
    if (path === '/api/capabilities' && method === 'GET') return json(res, 200, { ai: false, structuredSearch: true, twilio: false, payments: false, addons: publicAddonCatalog(), communications: { appointments: true, manualServerTimer: true, providers: COMMUNICATION_PROVIDERS, billingEnabled: false }, maxDocumentBytes: MAX_DOCUMENT_BYTES, caseStorageQuotaBytes: CASE_STORAGE_QUOTA_BYTES, pageCitations: true });
    if (path === '/api/cases') {
      if (method === 'GET') return json(res, 200, { cases: store.listCases(user) });
      if (method === 'POST') return json(res, 201, { case: store.createCase(user, caseInput(await readJson(req, 4096))) });
    }
    const match = /^\/api\/cases\/([^/]+)(.*)$/u.exec(path);
    if (!match) throw new HttpError(404, 'NOT_FOUND', 'Ressource introuvable.');
    const caseId = identifier(match[1]), suffix = match[2];
    store.access(user, caseId);
    if (!suffix && method === 'GET') return json(res, 200, { ...store.details(user, caseId), communications: communications.list(user, caseId), usage: communications.listUsage(user, caseId) });
    if (suffix === '/communications') {
      if (method === 'GET') return json(res, 200, communications.list(user, caseId));
      if (method === 'POST') return json(res, 201, { session: communications.schedule(user, caseId, await readJson(req, 4096), req.headers['idempotency-key']) });
    }
    const communicationAction = /^\/communications\/([^/]+)\/(start|end|cancel)$/u.exec(suffix);
    if (communicationAction && method === 'POST') {
      fields(await readJson(req, 128, { allowEmpty: true }), []);
      const sessionId = identifier(communicationAction[1]), action = communicationAction[2];
      const result = communications[action](user, caseId, sessionId);
      return json(res, 200, { [action === 'cancel' ? 'session' : 'timer']: result });
    }
    if (suffix === '/usage' && method === 'GET') return json(res, 200, communications.listUsage(user, caseId));
    const usageApproval = /^\/usage\/([^/]+)\/approve$/u.exec(suffix);
    if (usageApproval && method === 'POST') {
      fields(await readJson(req, 128, { allowEmpty: true }), []);
      return json(res, 200, { usage: communications.approveUsage(user, caseId, identifier(usageApproval[1])) });
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
    throw new HttpError(404, 'NOT_FOUND', 'Ressource introuvable.');
  }

  const app = createServer({ maxHeaderSize: 16384, requestTimeout: 30000, headersTimeout: 15000 }, (req, res) => {
    securityHeaders(res, req.url || '');
    route(req, res).catch(error => {
      if (res.headersSent) return res.destroy();
      const safe = error instanceof HttpError ? error : new HttpError(500, 'INTERNAL_ERROR', 'Une erreur interne empêche cette opération.');
      json(res, safe.status, { error: { code: safe.code, message: safe.message } });
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

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535');
  const app = createApp({ dbPath: process.env.DATABASE_PATH || join(HERE, '.data', 'platform.sqlite'), blobDir: process.env.BLOB_DIR || join(HERE, '.data', 'blobs') });
  app.listen(port, host, () => console.log(`BESOINAVOCAT pilote : http://${host}:${port}; connexion TAKATAK ${identityConfiguration() ? 'configurée, contrat à valider' : 'indisponible'}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => app.close());
}
