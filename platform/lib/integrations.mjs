import { createCipheriv, createDecipheriv, createHash, createHmac, createSecretKey, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { privatePath } from './browser-session-store.mjs';
import { httpsOrigin } from './browser-session.mjs';
import { zoomJoinUrl } from './communications.mjs';
import { HttpError, fields, identifier, invalid, text } from './validation.mjs';

// Connector integrator. Each person connects their own provider account (OAuth 2.0 authorization code, PKCE
// where the provider supports it); platform providers use server keys. Tokens are sealed with AES-256-GCM under
// a key file kept outside the database, bound to tenant, person and provider, and never leave the server.
// Nothing calls a provider until its developer credentials are configured.
const STATE_TTL_MS = 10 * 60 * 1000;
const MAX_PENDING_STATES = 5;
const REFRESH_MARGIN_MS = 60 * 1000;
const PENDING_LINK_MS = 2 * 60 * 1000;
const PROVIDER_TIMEOUT_MS = 10000;
const MAX_PROVIDER_RESPONSE = 256 * 1024;
export const MAX_WEBHOOK_BYTES = 256 * 1024;
const WEBHOOK_TOLERANCE_S = 300;
const MANAGERS = ['owner', 'lawyer'];
const PRINTABLE = /^[\x21-\x7e]+$/u;
const AGENDA = 'Rendez-vous planifié depuis BesoinAvocat.';
export const WEBHOOK_PROVIDERS = Object.freeze(['zoom', 'stripe', 'twilio', 'docusign']);

// What each connector does in a lawyer's day, and how far it is built. status: implemented = connection and
// actions; connect_only = connection now, actions in a later lot; platform = server keys and signed notifications;
// planned = not built.
const CATALOG = Object.freeze([
  { id: 'zoom', label: 'Zoom', category: 'video', connectionType: 'oauth', status: 'implemented', actions: ['meeting'],
    routine: 'Créer la réunion Zoom d’un rendez-vous : salle d’attente active, aucun enregistrement par défaut.' },
  { id: 'microsoft365', label: 'Outlook · Microsoft 365', category: 'calendar', connectionType: 'oauth', status: 'implemented', actions: ['calendar_event'],
    routine: 'Inscrire le rendez-vous dans votre agenda Outlook, avec le lien de la réunion.' },
  { id: 'google', label: 'Google Agenda', category: 'calendar', connectionType: 'oauth', status: 'implemented', actions: ['calendar_event'],
    routine: 'Inscrire le rendez-vous dans votre Google Agenda, avec le lien de la réunion.' },
  { id: 'docusign', label: 'DocuSign', category: 'signature', connectionType: 'oauth', status: 'connect_only', actions: [],
    routine: 'Faire signer une convention de mandat ou une procuration. Connexion du compte disponible; envoi pour signature au prochain lot.' },
  { id: 'clio', label: 'Clio Manage (Canada)', category: 'practice', connectionType: 'oauth', status: 'connect_only', actions: [],
    routine: 'Relier vos dossiers, contacts et heures au logiciel de gestion du cabinet. Connexion disponible; synchronisation au prochain lot.' },
  { id: 'stripe', label: 'Stripe', category: 'payments', connectionType: 'platform', status: 'platform', actions: [],
    routine: 'Abonnements professionnels de la plateforme. Jamais les avances d’un client : elles vont au compte en fidéicommis de l’avocat.' },
  { id: 'twilio', label: 'Twilio', category: 'telephony', connectionType: 'platform', status: 'platform', actions: [],
    routine: 'Appels et rappels de rendez-vous par SMS, avec le consentement de la personne. Réceptions signées prêtes; envois au prochain lot.' },
  { id: 'canlii', label: 'CanLII', category: 'research', connectionType: 'platform', status: 'platform', actions: [],
    routine: 'Vérifier une décision citée et ses citations (métadonnées CanLII). Clé de plateforme; recherche au prochain lot.' },
  { id: 'notarius', label: 'Notarius · ConsignO Cloud', category: 'signature', connectionType: 'partnership', status: 'planned', actions: [],
    routine: 'Signature numérique reconnue par le Barreau du Québec. Accès par entente de partenariat avec Notarius.' },
  { id: 'quickbooks', label: 'QuickBooks Online', category: 'accounting', connectionType: 'oauth', status: 'planned', actions: [],
    routine: 'Comptabilité du cabinet : clients et factures. À réaliser.' },
]);
const ENV_PREFIX = Object.freeze({ zoom: 'ZOOM', microsoft365: 'MICROSOFT', google: 'GOOGLE', docusign: 'DOCUSIGN', clio: 'CLIO' });
const CLIO_HOSTS = Object.freeze({ ca: 'ca.app.clio.com', us: 'app.clio.com', eu: 'eu.app.clio.com', au: 'au.app.clio.com' });

// Server-side OAuth endpoints, from each provider's official documentation (see docs/INTEGRATIONS.md).
function oauthDefinition(id, env) {
  if (id === 'zoom') return { authorize: 'https://zoom.us/oauth/authorize', token: 'https://zoom.us/oauth/token', clientAuth: 'basic', pkce: true,
    scope: null, revoke: { url: 'https://zoom.us/oauth/revoke', style: 'zoom' }, account: { url: 'https://api.zoom.us/v2/users/me', id: 'id', label: 'email' } };
  if (id === 'microsoft365') {
    const tenant = env.BESOINAVOCAT_MICROSOFT_TENANT || 'organizations';
    if (!/^(?:common|organizations|consumers|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/iu.test(tenant)) return null;
    const base = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0`;
    return { authorize: `${base}/authorize`, token: `${base}/token`, clientAuth: 'post', pkce: true,
      scope: 'openid profile email offline_access User.Read Calendars.ReadWrite', revoke: null,
      account: { url: 'https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName', id: 'id', label: ['mail', 'userPrincipalName'] } };
  }
  if (id === 'google') return { authorize: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', clientAuth: 'post', pkce: true,
    scope: 'openid email https://www.googleapis.com/auth/calendar.events', extra: { access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' },
    revoke: { url: 'https://oauth2.googleapis.com/revoke', style: 'form' }, account: { url: 'https://openidconnect.googleapis.com/v1/userinfo', id: 'sub', label: 'email' } };
  if (id === 'docusign') {
    const host = { demo: 'account-d.docusign.com', production: 'account.docusign.com' }[env.BESOINAVOCAT_DOCUSIGN_ENVIRONMENT || 'demo'];
    if (!host) return null;
    return { authorize: `https://${host}/oauth/auth`, token: `https://${host}/oauth/token`, clientAuth: 'basic', pkce: true, scope: 'signature',
      revoke: null, account: { url: `https://${host}/oauth/userinfo`, id: 'sub', label: 'email' } };
  }
  if (id === 'clio') {
    const host = CLIO_HOSTS[env.BESOINAVOCAT_CLIO_REGION || 'ca'];
    if (!host) return null;
    return { authorize: `https://${host}/oauth/authorize`, token: `https://${host}/oauth/token`, clientAuth: 'post', pkce: false, scope: null,
      revoke: { url: `https://${host}/oauth/deauthorize`, style: 'bearer_form' }, account: { url: `https://${host}/api/v4/users/who_am_i?fields=id,email`, id: 'data.id', label: 'data.email' } };
  }
  return null;
}

function setting(env, name, min = 8, max = 4096) {
  const value = env[name];
  return typeof value === 'string' && value.length >= min && value.length <= max && PRINTABLE.test(value) ? value : null;
}

// Secrets stay in this object, on the server. Only booleans and public addresses are ever returned to a browser.
export function integrationConfiguration(env = process.env) {
  const origin = httpsOrigin(env.APP_ORIGIN);
  const oauth = {};
  for (const [id, prefix] of Object.entries(ENV_PREFIX)) {
    const clientId = setting(env, `BESOINAVOCAT_${prefix}_CLIENT_ID`, 4, 512), clientSecret = setting(env, `BESOINAVOCAT_${prefix}_CLIENT_SECRET`);
    const definition = oauthDefinition(id, env);
    if (clientId && clientSecret && definition) oauth[id] = Object.freeze({ ...definition, clientId, clientSecret });
  }
  const webhooks = Object.freeze({ zoom: setting(env, 'BESOINAVOCAT_ZOOM_WEBHOOK_SECRET'), stripe: setting(env, 'BESOINAVOCAT_STRIPE_WEBHOOK_SECRET'),
    twilio: setting(env, 'BESOINAVOCAT_TWILIO_AUTH_TOKEN'), docusign: setting(env, 'BESOINAVOCAT_DOCUSIGN_CONNECT_HMAC_KEY') });
  return Object.freeze({
    origin, redirectUri: origin ? `${origin}/integrations/callback` : null,
    keyFile: typeof env.BESOINAVOCAT_INTEGRATIONS_KEY_FILE === 'string' && env.BESOINAVOCAT_INTEGRATIONS_KEY_FILE ? env.BESOINAVOCAT_INTEGRATIONS_KEY_FILE : null,
    oauth: Object.freeze(oauth), webhooks,
    platform: Object.freeze({ stripe: Boolean(webhooks.stripe), twilio: Boolean(setting(env, 'BESOINAVOCAT_TWILIO_ACCOUNT_SID', 34, 34) && webhooks.twilio),
      canlii: Boolean(setting(env, 'BESOINAVOCAT_CANLII_API_KEY')) }),
  });
}

function loadVault(keyFile) {
  if (!keyFile) return { ready: false, reason: 'key_not_configured' };
  try {
    const keyPath = privatePath(keyFile);
    if (statSync(keyPath).size !== 32) return { ready: false, reason: 'key_invalid' };
    const bytes = readFileSync(keyPath);
    if (bytes.length !== 32) { bytes.fill(0); return { ready: false, reason: 'key_invalid' }; }
    const fingerprint = createHash('sha256').update('besoinavocat-integrations-key-v1').update(bytes).digest('hex');
    const key = createSecretKey(bytes); bytes.fill(0);
    return { ready: true, key, fingerprint };
  } catch { return { ready: false, reason: 'key_invalid' }; }
}

const sha256 = value => createHash('sha256').update(value).digest('hex');
const aad = (...parts) => Buffer.from(['besoinavocat-integration-v1', ...parts].join('\n'), 'utf8');
function seal(key, value, binding) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(binding);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]);
}
function unseal(key, blob, binding) {
  const bytes = Buffer.from(blob);
  if (bytes.length < 29) throw new Error('Sealed value too short');
  const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
  decipher.setAAD(binding); decipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
}
function sameSecret(a, b) {
  const x = Buffer.from(String(a), 'utf8'), y = Buffer.from(String(b), 'utf8');
  return x.length === y.length && timingSafeEqual(x, y);
}
const pick = (value, path) => path.split('.').reduce((item, key) => (item && typeof item === 'object' ? item[key] : undefined), value);
function accountValue(body, paths) {
  for (const path of [].concat(paths)) {
    const value = pick(body, path);
    if (Number.isSafeInteger(value)) return String(value);
    if (typeof value === 'string' && value.length <= 320 && value === value.trim() && value && !/[\u0000-\u001f\u007f]/u.test(value)) return value;
  }
  return null;
}
// Only links to the provider's own web app are kept; anything else is dropped rather than shown.
function providerLink(value, hosts) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && hosts.includes(url.hostname) ? url.href : null;
  } catch { return null; }
}

const unavailable = () => new HttpError(502, 'PROVIDER_UNAVAILABLE', 'Le service externe ne répond pas. Réessayez plus tard.');
const rejected = () => new HttpError(502, 'PROVIDER_REJECTED', 'Le service externe a refusé la demande.');
const notConfigured = () => new HttpError(503, 'INTEGRATION_NOT_CONFIGURED', 'Ce connecteur n’est pas encore configuré sur le serveur.');
const reconnect = () => new HttpError(409, 'RECONNECT_REQUIRED', 'Reconnectez ce service : son autorisation a expiré ou a été retirée.');
const expired = () => new HttpError(400, 'AUTHORIZATION_EXPIRED', 'Cette autorisation est invalide ou expirée. Recommencez la connexion depuis le portail.');
const unknown = () => new HttpError(404, 'NOT_FOUND', 'Connecteur introuvable.');
const conflict = message => new HttpError(409, 'INTEGRATION_CONFLICT', message);
const badSignature = () => new HttpError(401, 'WEBHOOK_SIGNATURE_INVALID', 'Signature invalide.');
class GrantRejected extends Error {}

// Raw bytes are needed to check a provider signature; nothing is parsed before that check.
export async function readWebhookBody(req) {
  if (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity') throw new HttpError(415, 'UNSUPPORTED_ENCODING', 'Les corps compressés ne sont pas acceptés.');
  const length = req.headers['content-length'];
  if (length !== undefined && (!/^\d+$/u.test(length) || Number(length) > MAX_WEBHOOK_BYTES)) throw new HttpError(413, 'BODY_TOO_LARGE', 'La requête est trop volumineuse.');
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_WEBHOOK_BYTES) throw new HttpError(413, 'BODY_TOO_LARGE', 'La requête est trop volumineuse.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function createIntegrations({ db, access, audit, config = integrationConfiguration(), fetch: fetchImpl = globalThis.fetch, clock = Date.now }) {
  if (!db || typeof access !== 'function' || typeof audit !== 'function' || typeof fetchImpl !== 'function') throw new Error('Integrations require db, access, audit and fetch');
  const vault = loadVault(config.keyFile);
  db.exec(`
    CREATE TABLE IF NOT EXISTS integration_meta (name TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
    CREATE TABLE IF NOT EXISTS integration_states (
      stateHash TEXT PRIMARY KEY, tenantId TEXT NOT NULL, subject TEXT NOT NULL, provider TEXT NOT NULL,
      sealed BLOB NOT NULL, createdAt INTEGER NOT NULL, expiresAt INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS integration_connections (
      tenantId TEXT NOT NULL, subject TEXT NOT NULL, provider TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('connected','reconnect_required')),
      accountId TEXT NOT NULL, accountLabel TEXT NOT NULL, scopes TEXT NOT NULL, tokens BLOB NOT NULL,
      accessExpiresAt INTEGER, revision TEXT NOT NULL, connectedAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
      PRIMARY KEY(tenantId,subject,provider)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS integration_links (
      id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, caseId TEXT NOT NULL, sessionId TEXT NOT NULL,
      provider TEXT NOT NULL, subject TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('meeting','calendar_event')),
      status TEXT NOT NULL CHECK(status IN ('pending','active')), externalId TEXT, url TEXT, createdAt TEXT NOT NULL,
      UNIQUE(tenantId,caseId,sessionId,provider,subject),
      CHECK((status='pending' AND externalId IS NULL) OR (status='active' AND externalId IS NOT NULL)),
      FOREIGN KEY(tenantId,caseId,sessionId) REFERENCES communication_sessions(tenantId,caseId,id)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS integration_events (
      provider TEXT NOT NULL, eventId TEXT NOT NULL, eventType TEXT NOT NULL, bodySha256 TEXT NOT NULL, receivedAt TEXT NOT NULL,
      PRIMARY KEY(provider,eventId)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS integration_links_case ON integration_links(tenantId,caseId,sessionId);
  `);
  const sql = statement => db.prepare(statement);
  const iso = () => new Date(clock()).toISOString();
  const transaction = fn => {
    db.exec('BEGIN IMMEDIATE');
    try { const value = fn(); db.exec('COMMIT'); return value; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  if (vault.ready) transaction(() => {
    sql('INSERT OR IGNORE INTO integration_meta(name,value) VALUES (?,?)').run('key_fingerprint', vault.fingerprint);
    // A new key cannot open tokens sealed with the old one: those accounts are asked to reconnect.
    if (sql('SELECT value FROM integration_meta WHERE name=?').get('key_fingerprint').value !== vault.fingerprint) {
      sql("UPDATE integration_connections SET status='reconnect_required', tokens=X'', accessExpiresAt=NULL, revision=?, updatedAt=?").run(randomUUID(), iso());
      sql('DELETE FROM integration_states').run();
      sql('UPDATE integration_meta SET value=? WHERE name=?').run(vault.fingerprint, 'key_fingerprint');
    }
  });
  const engineReady = () => vault.ready && Boolean(config.redirectUri);
  const requireEngine = () => { if (!engineReady()) throw notConfigured(); };
  const item = id => CATALOG.find(entry => entry.id === id);
  function oauthProvider(id) {
    if (typeof id !== 'string' || item(id)?.connectionType !== 'oauth' || item(id).status === 'planned') throw unknown();
    const provider = config.oauth[id];
    if (!provider) throw notConfigured();
    return provider;
  }
  const connectionRow = (user, provider) => sql('SELECT * FROM integration_connections WHERE tenantId=? AND subject=? AND provider=?').get(user.tenantId, user.subject, provider);
  const tokenBinding = row => aad('token', row.tenantId, row.subject, row.provider);
  function markReconnect(row) {
    sql("UPDATE integration_connections SET status='reconnect_required', tokens=X'', accessExpiresAt=NULL, revision=?, updatedAt=? WHERE tenantId=? AND subject=? AND provider=?")
      .run(randomUUID(), iso(), row.tenantId, row.subject, row.provider);
  }

  async function call(url, { method = 'GET', headers = {}, form, json } = {}) {
    let response;
    try {
      response = await fetchImpl(url, { method, redirect: 'error', signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
        headers: { Accept: 'application/json', ...headers, ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : json ? { 'Content-Type': 'application/json' } : {}) },
        body: form ? new URLSearchParams(form).toString() : json ? JSON.stringify(json) : undefined });
    } catch { throw unavailable(); }
    let size = 0;
    const chunks = [];
    try {
      if (response.body) for await (const chunk of response.body) {
        size += chunk.length;
        if (size > MAX_PROVIDER_RESPONSE) throw new Error('Oversized provider response');
        chunks.push(chunk);
      }
    } catch { throw unavailable(); }
    const raw = Buffer.concat(chunks).toString('utf8');
    let body = null;
    if (raw && /json/iu.test(response.headers.get('content-type') || '')) { try { body = JSON.parse(raw); } catch { body = null; } }
    return { status: response.status, body };
  }
  async function tokenRequest(provider, form) {
    const basic = provider.clientAuth === 'basic';
    const response = await call(provider.token, { method: 'POST', form: basic ? form : { ...form, client_id: provider.clientId, client_secret: provider.clientSecret },
      headers: basic ? { Authorization: `Basic ${Buffer.from(`${provider.clientId}:${provider.clientSecret}`, 'utf8').toString('base64')}` } : {} });
    // A refused code or refresh token is 400/401 everywhere, but not always "invalid_grant" (Zoom: "invalid_request").
    if ([400, 401].includes(response.status)) throw new GrantRejected();
    if (response.status >= 500) throw unavailable();
    const body = response.body;
    const token = value => typeof value === 'string' && value.length >= 1 && value.length <= 16384 && PRINTABLE.test(value);
    if (response.status !== 200 || !body || !token(body.access_token) || (body.refresh_token !== undefined && !token(body.refresh_token)) ||
        (body.token_type !== undefined && String(body.token_type).toLowerCase() !== 'bearer')) throw rejected();
    const expiresIn = Number.isSafeInteger(body.expires_in) && body.expires_in > 0 && body.expires_in <= 400 * 86400 ? body.expires_in : null;
    const scope = typeof body.scope === 'string' && body.scope.length <= 4096 && !/[\u0000-\u001f\u007f]/u.test(body.scope) ? body.scope.trim() : '';
    return { accessToken: body.access_token, refreshToken: body.refresh_token ?? null, expiresAt: expiresIn ? clock() + expiresIn * 1000 : null, scope };
  }

  // One refresh at a time per connection: providers such as Zoom rotate the refresh token on every use.
  const refreshing = new Map();
  async function accessToken(user, id, { force = false } = {}) {
    const provider = oauthProvider(id); requireEngine();
    const row = connectionRow(user, id);
    if (!row) throw new HttpError(409, 'NOT_CONNECTED', `Connectez d’abord ${item(id).label} dans Intégrations.`);
    if (row.status !== 'connected') throw reconnect();
    let tokens;
    try { tokens = unseal(vault.key, row.tokens, tokenBinding(row)); } catch { markReconnect(row); throw reconnect(); }
    if (!force && (!row.accessExpiresAt || row.accessExpiresAt - REFRESH_MARGIN_MS > clock())) return tokens.accessToken;
    if (!tokens.refreshToken) { markReconnect(row); throw reconnect(); }
    const key = `${row.tenantId}\n${row.subject}\n${id}`;
    if (!refreshing.has(key)) refreshing.set(key, (async () => {
      let next;
      try { next = await tokenRequest(provider, { grant_type: 'refresh_token', refresh_token: tokens.refreshToken }); }
      catch (error) {
        if (!(error instanceof GrantRejected)) throw error;
        markReconnect(row); audit(user, null, 'integration.reconnect_required', null, { provider: id });
        throw reconnect();
      }
      const sealed = seal(vault.key, { accessToken: next.accessToken, refreshToken: next.refreshToken ?? tokens.refreshToken }, tokenBinding(row));
      const result = sql('UPDATE integration_connections SET tokens=?, accessExpiresAt=?, revision=?, updatedAt=? WHERE tenantId=? AND subject=? AND provider=? AND revision=?')
        .run(sealed, next.expiresAt, randomUUID(), iso(), row.tenantId, row.subject, id, row.revision);
      if (result.changes !== 1) throw conflict('La connexion a changé pendant l’opération. Réessayez.');
      return next.accessToken;
    })().finally(() => refreshing.delete(key)));
    return refreshing.get(key);
  }
  async function api(user, id, url, options = {}) {
    let response = await call(url, { ...options, headers: { ...options.headers, Authorization: `Bearer ${await accessToken(user, id)}` } });
    if (response.status === 401) {
      response = await call(url, { ...options, headers: { ...options.headers, Authorization: `Bearer ${await accessToken(user, id, { force: true })}` } });
      if (response.status === 401) { const row = connectionRow(user, id); if (row) markReconnect(row); throw reconnect(); }
    }
    if (response.status >= 500) throw unavailable();
    return response;
  }

  function publicConnection(row) {
    return row ? { status: row.status, account: row.accountLabel, connectedAt: row.connectedAt, scopes: row.scopes ? row.scopes.split(/\s+/u) : [] } : null;
  }
  function list(user) {
    const rows = new Map(sql('SELECT * FROM integration_connections WHERE tenantId=? AND subject=?').all(user.tenantId, user.subject).map(row => [row.provider, row]));
    const engine = { ready: engineReady(), reason: !config.redirectUri ? 'origin_not_configured' : vault.ready ? null : vault.reason, redirectUri: config.redirectUri };
    return { version: '2026-10-29.1', engine, providers: CATALOG.map(entry => {
      const configured = entry.status !== 'planned' && (entry.connectionType === 'oauth' ? Boolean(config.oauth[entry.id]) : entry.connectionType === 'platform' ? config.platform[entry.id] : false);
      const connection = entry.connectionType === 'oauth' ? publicConnection(rows.get(entry.id)) : null;
      const state = entry.status === 'planned' ? 'planned' : connection ? connection.status : !configured ? 'not_configured'
        : entry.connectionType === 'platform' ? 'active_on_server' : engine.ready ? 'available' : 'not_configured';
      return { ...entry, actions: [...entry.actions], configured, state, connection,
        webhook: WEBHOOK_PROVIDERS.includes(entry.id) ? { configured: Boolean(config.webhooks[entry.id]), url: config.origin ? `${config.origin}/api/webhooks/${entry.id}` : null } : null };
    }) };
  }

  function connect(user, id) {
    const provider = oauthProvider(id); requireEngine();
    const state = randomBytes(32).toString('base64url'), verifier = provider.pkce ? randomBytes(48).toString('base64url') : null;
    const time = clock();
    transaction(() => {
      sql('DELETE FROM integration_states WHERE expiresAt<=?').run(time);
      if (sql('SELECT COUNT(*) AS count FROM integration_states WHERE tenantId=? AND subject=?').get(user.tenantId, user.subject).count >= MAX_PENDING_STATES) {
        throw new HttpError(429, 'INTEGRATION_RATE_LIMIT', 'Trop de connexions en attente. Réessayez dans quelques minutes.');
      }
      sql('INSERT INTO integration_states VALUES (?,?,?,?,?,?,?)').run(sha256(state), user.tenantId, user.subject, id,
        seal(vault.key, { verifier }, aad('state', user.tenantId, user.subject, id)), time, time + STATE_TTL_MS);
    });
    const url = new URL(provider.authorize);
    const params = { response_type: 'code', client_id: provider.clientId, redirect_uri: config.redirectUri, state, ...(provider.scope ? { scope: provider.scope } : {}),
      ...(verifier ? { code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' } : {}), ...provider.extra };
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
    audit(user, null, 'integration.connect_started', null, { provider: id });
    return { provider: id, authorizationUrl: url.href, expiresAt: new Date(time + STATE_TTL_MS).toISOString() };
  }

  // The provider sends the browser back to /integrations/callback; that page posts state and code here, with the
  // person's own session. The state is single-use, short-lived and bound to the same tenant, person and provider.
  async function complete(user, body) {
    fields(body, ['state', 'code', 'error'], ['state']);
    const state = text(body.state, 'Autorisation', 64);
    if (!/^[A-Za-z0-9_-]{43}$/u.test(state)) throw expired();
    const time = clock();
    const row = transaction(() => {
      const found = sql('SELECT * FROM integration_states WHERE stateHash=?').get(sha256(state));
      if (found) sql('DELETE FROM integration_states WHERE stateHash=?').run(sha256(state));
      return found;
    });
    if (!row || row.expiresAt <= time || row.tenantId !== user.tenantId || row.subject !== user.subject) {
      audit(user, null, 'integration.state_rejected', null, {});
      throw expired();
    }
    const id = row.provider;
    if (body.error !== undefined) {
      text(body.error, 'Erreur', 200);
      audit(user, null, 'integration.consent_refused', null, { provider: id });
      throw new HttpError(400, 'CONSENT_REFUSED', 'L’autorisation a été refusée ou annulée sur le site du fournisseur.');
    }
    const code = text(body.code, 'Code d’autorisation', 4096);
    if (!PRINTABLE.test(code)) throw invalid('Code d’autorisation invalide.');
    const provider = oauthProvider(id); requireEngine();
    let verifier;
    try { ({ verifier } = unseal(vault.key, row.sealed, aad('state', row.tenantId, row.subject, id))); } catch { throw expired(); }
    let tokens;
    try { tokens = await tokenRequest(provider, { grant_type: 'authorization_code', code, redirect_uri: config.redirectUri, ...(verifier ? { code_verifier: verifier } : {}) }); }
    catch (error) { if (error instanceof GrantRejected) throw expired(); throw error; }
    const account = await call(provider.account.url, { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
    if (account.status >= 500) throw unavailable();
    const accountId = account.status === 200 ? accountValue(account.body, provider.account.id) : null;
    if (!accountId) throw rejected();
    const label = accountValue(account.body, provider.account.label) || accountId;
    const stamp = iso();
    const binding = aad('token', user.tenantId, user.subject, id);
    sql(`INSERT INTO integration_connections VALUES (?,?,?,'connected',?,?,?,?,?,?,?,?)
      ON CONFLICT(tenantId,subject,provider) DO UPDATE SET status='connected', accountId=excluded.accountId, accountLabel=excluded.accountLabel,
      scopes=excluded.scopes, tokens=excluded.tokens, accessExpiresAt=excluded.accessExpiresAt, revision=excluded.revision, connectedAt=excluded.connectedAt, updatedAt=excluded.updatedAt`)
      .run(user.tenantId, user.subject, id, accountId, label, tokens.scope, seal(vault.key, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, binding),
        tokens.expiresAt, randomUUID(), stamp, stamp);
    audit(user, null, 'integration.connected', null, { provider: id, scopes: tokens.scope });
    return { provider: id, connection: publicConnection(connectionRow(user, id)) };
  }

  async function disconnect(user, id) {
    if (typeof id !== 'string' || item(id)?.connectionType !== 'oauth') throw unknown();
    const row = connectionRow(user, id);
    if (!row) return { provider: id, disconnected: false };
    let revocation = 'not_supported_by_provider';
    const provider = config.oauth[id];
    if (provider?.revoke && vault.ready && row.status === 'connected') {
      try {
        const tokens = unseal(vault.key, row.tokens, tokenBinding(row));
        const { url, style } = provider.revoke;
        const basic = { Authorization: `Basic ${Buffer.from(`${provider.clientId}:${provider.clientSecret}`, 'utf8').toString('base64')}` };
        const response = style === 'zoom' ? await call(url, { method: 'POST', headers: basic, form: { token: tokens.accessToken } })
          : style === 'bearer_form' ? await call(url, { method: 'POST', headers: { Authorization: `Bearer ${tokens.accessToken}` }, form: { token: tokens.accessToken } })
          : await call(url, { method: 'POST', form: { token: tokens.refreshToken || tokens.accessToken } });
        revocation = response.status >= 200 && response.status < 300 ? 'revoked' : 'failed';
      } catch { revocation = 'failed'; }
    }
    sql('DELETE FROM integration_connections WHERE tenantId=? AND subject=? AND provider=?').run(user.tenantId, user.subject, id);
    audit(user, null, 'integration.disconnected', null, { provider: id, revocation });
    return { provider: id, disconnected: true, revocation };
  }

  // Appointment actions. Zoom keeps only the participant link: the host start URL is never stored or returned.
  const end = (session, minutes) => new Date(Date.parse(session.scheduledAt) + minutes * 60000).toISOString();
  const describe = meetingUrl => `${AGENDA}${meetingUrl ? `\nRéunion Zoom : ${meetingUrl}` : ''}`;
  const externalId = value => (Number.isSafeInteger(value) && value > 0) || (typeof value === 'string' && value.length >= 1 && value.length <= 1024 && PRINTABLE.test(value)) ? String(value) : null;
  const ACTIONS = {
    zoom: {
      kind: 'meeting',
      async create(user, session, minutes) {
        if (session.kind !== 'video') throw conflict('Une réunion Zoom se crée pour un rendez-vous vidéo.');
        const response = await api(user, 'zoom', 'https://api.zoom.us/v2/users/me/meetings', { method: 'POST', json: {
          topic: session.title, type: 2, start_time: session.scheduledAt.replace(/\.\d{3}Z$/u, 'Z'), duration: minutes, timezone: 'UTC', agenda: AGENDA,
          settings: { waiting_room: true, join_before_host: false, mute_upon_entry: true, auto_recording: 'none' } } });
        const id = response.status === 201 ? externalId(response.body?.id) : null;
        if (!id) throw rejected();
        let url = null;
        try { url = zoomJoinUrl(response.body.join_url); } catch { url = null; }
        if (!url) { await this.remove(user, id).catch(() => {}); throw rejected(); }
        return { externalId: id, url };
      },
      async remove(user, id) { return api(user, 'zoom', `https://api.zoom.us/v2/meetings/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
    },
    microsoft365: {
      kind: 'calendar_event',
      async create(user, session, minutes, meetingUrl) {
        const local = value => value.replace(/Z$/u, '');
        const response = await api(user, 'microsoft365', 'https://graph.microsoft.com/v1.0/me/events', { method: 'POST', json: {
          subject: session.title, body: { contentType: 'text', content: describe(meetingUrl) },
          start: { dateTime: local(session.scheduledAt), timeZone: 'UTC' }, end: { dateTime: local(end(session, minutes)), timeZone: 'UTC' },
          ...(meetingUrl ? { location: { displayName: 'Zoom' } } : {}) } });
        const id = response.status === 201 ? externalId(response.body?.id) : null;
        if (!id) throw rejected();
        return { externalId: id, url: providerLink(response.body.webLink, ['outlook.office.com', 'outlook.office365.com', 'outlook.live.com']) };
      },
      async remove(user, id) { return api(user, 'microsoft365', `https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
    },
    google: {
      kind: 'calendar_event',
      async create(user, session, minutes, meetingUrl) {
        const response = await api(user, 'google', 'https://www.googleapis.com/calendar/v3/calendars/primary/events', { method: 'POST', json: {
          summary: session.title, description: describe(meetingUrl), start: { dateTime: session.scheduledAt }, end: { dateTime: end(session, minutes) },
          ...(meetingUrl ? { location: meetingUrl } : {}) } });
        const id = response.status === 200 ? externalId(response.body?.id) : null;
        if (!id) throw rejected();
        return { externalId: id, url: providerLink(response.body.htmlLink, ['www.google.com', 'calendar.google.com']) };
      },
      async remove(user, id) { return api(user, 'google', `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
    },
  };
  const publicLink = (row, user) => ({ id: row.id, sessionId: row.sessionId, provider: row.provider, kind: row.kind, url: row.url, mine: row.subject === user.subject, createdAt: row.createdAt });
  function appointment(user, caseId, sessionId, id) {
    identifier(caseId); identifier(sessionId);
    if (typeof id !== 'string' || !Object.hasOwn(ACTIONS, id)) throw unknown();
    access(user, caseId, MANAGERS);
    const session = sql('SELECT * FROM communication_sessions WHERE tenantId=? AND caseId=? AND id=?').get(user.tenantId, caseId, sessionId);
    if (!session) throw new HttpError(404, 'NOT_FOUND', 'Rendez-vous introuvable ou non accessible.');
    return session;
  }

  async function linkAppointment(user, caseId, sessionId, id, body = {}) {
    fields(body, ['durationMinutes']);
    const minutes = body.durationMinutes ?? 60;
    if (!Number.isSafeInteger(minutes) || minutes < 15 || minutes > 480) throw invalid('Durée attendue entre 15 et 480 minutes.');
    const session = appointment(user, caseId, sessionId, id);
    if (session.status !== 'scheduled') throw conflict('Ce rendez-vous est annulé.');
    oauthProvider(id); requireEngine();
    const action = ACTIONS[id];
    const linkId = randomUUID();
    const reserved = transaction(() => {
      const existing = sql('SELECT * FROM integration_links WHERE tenantId=? AND caseId=? AND sessionId=? AND provider=? AND subject=?').get(user.tenantId, caseId, sessionId, id, user.subject);
      if (existing?.status === 'active') return existing;
      // A creation interrupted by a restart leaves a pending row; it no longer blocks after two minutes.
      if (existing && Date.parse(existing.createdAt) > clock() - PENDING_LINK_MS) throw conflict('Création déjà en cours pour ce rendez-vous.');
      if (existing) sql('DELETE FROM integration_links WHERE id=?').run(existing.id);
      sql("INSERT INTO integration_links VALUES (?,?,?,?,?,?,?,'pending',NULL,NULL,?)").run(linkId, user.tenantId, caseId, sessionId, id, user.subject, action.kind, iso());
      return null;
    });
    if (reserved) return { link: publicLink(reserved, user), created: false };
    const meeting = sql("SELECT url FROM integration_links WHERE tenantId=? AND caseId=? AND sessionId=? AND kind='meeting' AND status='active' AND url IS NOT NULL ORDER BY createdAt LIMIT 1")
      .get(user.tenantId, caseId, sessionId)?.url ?? session.joinUrl ?? null;
    let result;
    try { result = await action.create(user, session, minutes, meeting); }
    catch (error) { sql("DELETE FROM integration_links WHERE id=? AND status='pending'").run(linkId); throw error; }
    sql("UPDATE integration_links SET status='active', externalId=?, url=? WHERE id=?").run(result.externalId, result.url, linkId);
    audit(user, caseId, 'integration.link_created', sessionId, { provider: id, kind: action.kind });
    return { link: publicLink(sql('SELECT * FROM integration_links WHERE id=?').get(linkId), user), created: true };
  }

  async function unlinkAppointment(user, caseId, sessionId, id) {
    appointment(user, caseId, sessionId, id);
    const row = sql("SELECT * FROM integration_links WHERE tenantId=? AND caseId=? AND sessionId=? AND provider=? AND subject=? AND status='active'").get(user.tenantId, caseId, sessionId, id, user.subject);
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Aucun élément créé par vous chez ce fournisseur pour ce rendez-vous.');
    const response = await ACTIONS[id].remove(user, row.externalId);
    // Already removed at the provider (404 or 410) counts as removed.
    if (!(response.status >= 200 && response.status < 300) && ![404, 410].includes(response.status)) throw rejected();
    sql('DELETE FROM integration_links WHERE id=?').run(row.id);
    audit(user, caseId, 'integration.link_removed', sessionId, { provider: id, kind: row.kind });
    return { removed: true };
  }

  // Zoom meeting links are for every member of the case; calendar entries only for the person whose calendar holds them.
  function linksFor(user, caseId) {
    return sql("SELECT * FROM integration_links WHERE tenantId=? AND caseId=? AND status='active' AND (kind='meeting' OR subject=?) ORDER BY createdAt, id")
      .all(user.tenantId, caseId, user.subject).map(row => publicLink(row, user));
  }

  // Provider notifications: signature first, then a durable, deduplicated record. No business action yet.
  function record(provider, eventId, type, raw) {
    const result = sql('INSERT OR IGNORE INTO integration_events VALUES (?,?,?,?,?)').run(provider, eventId, type, sha256(raw), iso());
    return { status: 200, body: { received: true, duplicate: result.changes === 0 } };
  }
  const header = (headers, name) => (typeof headers[name] === 'string' && headers[name].length <= 2048 ? headers[name] : null);
  const fresh = seconds => Math.abs(Math.floor(clock() / 1000) - seconds) <= WEBHOOK_TOLERANCE_S;
  const eventType = value => (typeof value === 'string' && value.length >= 1 && value.length <= 100 && PRINTABLE.test(value) ? value : 'unknown');
  function parse(raw) {
    try { const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)); if (value && typeof value === 'object' && !Array.isArray(value)) return value; } catch { /* below */ }
    throw invalid('Notification illisible.');
  }
  function webhook(id, { headers, raw, url }) {
    if (!WEBHOOK_PROVIDERS.includes(id)) throw unknown();
    const secret = config.webhooks[id];
    if (!secret) throw notConfigured();
    if (id === 'zoom') {
      const timestamp = header(headers, 'x-zm-request-timestamp'), signature = header(headers, 'x-zm-signature');
      if (!/^[0-9]{1,12}$/u.test(timestamp ?? '') || !/^v0=[0-9a-f]{64}$/u.test(signature ?? '') || !fresh(Number(timestamp))) throw badSignature();
      const expected = `v0=${createHmac('sha256', secret).update(`v0:${timestamp}:`).update(raw).digest('hex')}`;
      if (!sameSecret(signature, expected)) throw badSignature();
      const event = parse(raw);
      if (event.event === 'endpoint.url_validation') {
        const plain = event.payload?.plainToken;
        if (typeof plain !== 'string' || plain.length < 1 || plain.length > 256 || !PRINTABLE.test(plain)) throw invalid('Notification illisible.');
        return { status: 200, body: { plainToken: plain, encryptedToken: createHmac('sha256', secret).update(plain).digest('hex') } };
      }
      return record(id, sha256(Buffer.concat([Buffer.from(`${timestamp}:`), raw])), eventType(event.event), raw);
    }
    if (id === 'stripe') {
      const parts = (header(headers, 'stripe-signature') ?? '').split(',').map(part => part.split('='));
      const timestamp = parts.find(([key]) => key === 't')?.[1];
      const signatures = parts.filter(([key, value]) => key === 'v1' && /^[0-9a-f]{64}$/u.test(value ?? '')).map(([, value]) => value).slice(0, 8);
      if (!/^[0-9]{1,12}$/u.test(timestamp ?? '') || !signatures.length || !fresh(Number(timestamp))) throw badSignature();
      const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(raw).digest('hex');
      if (!signatures.some(value => sameSecret(value, expected))) throw badSignature();
      const event = parse(raw);
      if (typeof event.id !== 'string' || !/^evt_[A-Za-z0-9]{1,255}$/u.test(event.id)) throw invalid('Notification illisible.');
      return record(id, event.id, eventType(event.type), raw);
    }
    if (id === 'twilio') {
      if (!config.origin) throw notConfigured();
      if (!/^application\/x-www-form-urlencoded(?:\s*;\s*charset=utf-8)?$/iu.test(headers['content-type'] || '')) throw new HttpError(415, 'FORM_REQUIRED', 'Un formulaire encodé est requis.');
      const signature = header(headers, 'x-twilio-signature');
      if (!/^[A-Za-z0-9+/]{27}=$/u.test(signature ?? '')) throw badSignature();
      let params;
      try { params = [...new URLSearchParams(new TextDecoder('utf-8', { fatal: true }).decode(raw))]; } catch { throw invalid('Notification illisible.'); }
      // Twilio signs the public URL followed by every POST parameter, sorted by name, as name+value.
      const sorted = params.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
      const expected = createHmac('sha1', secret).update(config.origin + url + sorted.map(([key, value]) => key + value).join('')).digest('base64');
      if (!sameSecret(signature, expected)) throw badSignature();
      const value = name => sorted.find(([key]) => key === name)?.[1];
      const sid = value('MessageSid') || value('CallSid'), status = value('MessageStatus') || value('CallStatus');
      const eventId = sid && /^[A-Z]{2}[0-9a-f]{32}$/u.test(sid) ? `${sid}:${eventType(status)}` : sha256(raw);
      return record(id, eventId, eventType(status), raw);
    }
    // DocuSign Connect: HMAC-SHA256 of the raw body, base64, in X-DocuSign-Signature-1 (one header per active key).
    const expected = createHmac('sha256', secret).update(raw).digest('base64');
    const signatures = [1, 2, 3, 4, 5].map(n => header(headers, `x-docusign-signature-${n}`)).filter(Boolean);
    if (!signatures.some(value => sameSecret(value, expected))) throw badSignature();
    const event = parse(raw);
    return record(id, sha256(raw), eventType(event.event), raw);
  }

  return Object.freeze({ list, connect, complete, disconnect, linkAppointment, unlinkAppointment, linksFor, webhook, engineReady });
}
