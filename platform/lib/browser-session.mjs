import { createHash, randomBytes } from 'node:crypto';
import { open, lstat, realpath } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HttpError, externalIdentifier } from './validation.mjs';
import { createSessionStore } from './browser-session-store.mjs';

export const BROWSER_SESSION_COOKIE = '__Host-ba_session';
const APP_ROOT = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const REPO_PARENT = path.dirname(APP_ROOT);
const PRIVATE_EXCLUSIONS = [APP_ROOT, ...(existsSync(path.join(REPO_PARENT, '.git')) ? [REPO_PARENT] : [])];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SESSION_TTL_MS = 60 * 60_000;
const COOKIE_ATTRIBUTES = 'Path=/; HttpOnly; Secure; SameSite=Strict';
const MAX_PROVIDER_BYTES = 65536;
const MAX_GRANTS_BYTES = 1024 * 1024;
const unavailable = () => new HttpError(503, 'IDENTITY_UNAVAILABLE', 'La connexion TAKATAK est indisponible.');
const unauthenticated = () => new HttpError(401, 'UNAUTHENTICATED', 'Connexion ou session non valide.');
const denied = () => new HttpError(403, 'PRODUCT_ACCESS_DENIED', 'Cet accès au portail n’est pas autorisé.');
const limited = () => new HttpError(429, 'LOGIN_RATE_LIMIT', 'Trop de tentatives. Réessayez plus tard.');
const hash = value => createHash('sha256').update(value).digest('hex');

export function httpsOrigin(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash &&
      url.pathname === '/' && (value === url.origin || value === url.origin + '/') ? url.origin : null;
  } catch { return null; }
}

function publicProviderKey(key) {
  if (typeof key !== 'string' || key.length > 8192) return false;
  if (/^sb_publishable_[A-Za-z0-9_-]{16,}$/u.test(key)) return true;
  // Legacy anon keys are public configuration. Never accept a service-role key.
  // This is key classification only; no user is authenticated by decoding a JWT.
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u.test(key)) return false;
  try { return JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'anon'; }
  catch { return false; }
}

function normalizeConfiguration(config) {
  const supabaseUrl = httpsOrigin(config?.supabaseUrl);
  const appOrigin = httpsOrigin(config?.appOrigin);
  if (!supabaseUrl || !appOrigin || !publicProviderKey(config?.publishableKey) ||
      typeof config?.grantsFile !== 'string' || !path.isAbsolute(config.grantsFile)) return null;
  const grantsFile = path.resolve(config.grantsFile);
  for (const root of PRIVATE_EXCLUSIONS) {
    const relative = path.relative(root, grantsFile);
    if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) return null;
  }
  const persistent = Boolean(config.sessionDbPath || config.sessionKeyFile);
  if ((config.requirePersistent || process.env.NODE_ENV === 'production') && !persistent) return null;
  if (persistent && (typeof config.sessionDbPath !== 'string' || !path.isAbsolute(config.sessionDbPath) ||
      typeof config.sessionKeyFile !== 'string' || !path.isAbsolute(config.sessionKeyFile))) return null;
  return Object.freeze({ supabaseUrl, appOrigin, publishableKey: config.publishableKey, grantsFile, emailCodeEnabled: config.emailCodeEnabled === true,
    ...(persistent ? { sessionDbPath: path.resolve(config.sessionDbPath), sessionKeyFile: path.resolve(config.sessionKeyFile) } : {}),
    requirePersistent: Boolean(config.requirePersistent) });
}

export function browserSessionConfiguration(env = process.env) {
  return normalizeConfiguration({ supabaseUrl: env.TAKATAK_SUPABASE_URL,
    publishableKey: env.TAKATAK_SUPABASE_PUBLISHABLE_KEY,
    grantsFile: env.BESOINAVOCAT_GRANTS_FILE, appOrigin: env.APP_ORIGIN,
    sessionDbPath: env.BESOINAVOCAT_SESSION_DB_PATH, sessionKeyFile: env.BESOINAVOCAT_SESSION_KEY_FILE,
    requirePersistent: env.NODE_ENV === 'production', emailCodeEnabled: env.BESOINAVOCAT_EMAIL_OTP_ENABLED === 'true' });
}

function cookieToken(header) {
  if (typeof header !== 'string' || header.length > 16384) return null;
  const matches = header.split(';').map(part => part.trim()).filter(part => part.split('=', 1)[0].trim() === BROWSER_SESSION_COOKIE);
  if (matches.length !== 1) return null;
  const match = matches[0].match(/^__Host-ba_session=([A-Za-z0-9_-]{43})$/u);
  if (!match || Buffer.from(match[1], 'base64url').toString('base64url') !== match[1]) return null;
  return match[1];
}

function headerValue(req, name) {
  if (Array.isArray(req.rawHeaders)) {
    const count = req.rawHeaders.filter((value, index) => index % 2 === 0 && value.toLowerCase() === name).length;
    if (count !== 1) return null;
  }
  const value = req.headers?.get ? req.headers.get(name) : req.headers?.[name];
  return typeof value === 'string' ? value : null;
}

export function assertBrowserMutation(req, appOrigin) {
  if (!httpsOrigin(appOrigin) || headerValue(req, 'origin') !== appOrigin ||
      headerValue(req, 'x-requested-with') !== 'XMLHttpRequest') {
    throw new HttpError(403, 'CSRF_REJECTED', 'Origine de la demande non autorisée.');
  }
}

async function readGrant(config, subject) {
  let handle;
  try {
    const target = await realpath(config.grantsFile);
    for (const root of PRIVATE_EXCLUSIONS) {
      const relative = path.relative(await realpath(root), target);
      if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) throw unavailable();
    }
    if ((await lstat(config.grantsFile)).isSymbolicLink()) throw unavailable();
    handle = await open(config.grantsFile, 'r');
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > MAX_GRANTS_BYTES ||
        (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)) throw unavailable();
    const buffer = Buffer.alloc(MAX_GRANTS_BYTES + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > MAX_GRANTS_BYTES) throw unavailable();
    const payload = JSON.parse(buffer.subarray(0, bytesRead).toString('utf8'));
    if (!payload || Object.keys(payload).length !== 2 || payload.version !== 1 ||
        !payload.grants || typeof payload.grants !== 'object' || Array.isArray(payload.grants) ||
        Object.keys(payload.grants).length > 2048) throw unavailable();
    for (const [id, grant] of Object.entries(payload.grants)) {
      if (!UUID.test(id) || !grant || Object.keys(grant).length !== 3 ||
          !externalIdentifier(grant.tenantId) || grant.product !== 'besoinavocat' || typeof grant.active !== 'boolean') throw unavailable();
    }
    const grant = Object.hasOwn(payload.grants, subject) ? payload.grants[subject] : null;
    if (!grant || !grant.active) throw denied();
    return Object.freeze({ subject, tenantId: grant.tenantId, product: 'besoinavocat', active: true });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unavailable();
  } finally { await handle?.close(); }
}

export function createBrowserSessions({ config = browserSessionConfiguration(), fetchImpl = fetch, now = Date.now } = {}) {
  const settings = normalizeConfiguration(config);
  let sessions = null;
  try { if (settings) sessions = createSessionStore(settings); } catch { /* fail closed; no private paths or provider details logged */ }

  async function provider(endpoint, options) {
    if (!settings || !sessions) throw unavailable();
    try {
      const response = await fetchImpl(settings.supabaseUrl + endpoint, {
        ...options, redirect: 'error', signal: AbortSignal.timeout(5000),
        headers: { Accept: 'application/json', apikey: settings.publishableKey, ...options.headers },
      });
      if ([400, 401, 403, 422].includes(response.status)) { await response.body?.cancel(); throw unauthenticated(); }
      if (response.status === 429) { await response.body?.cancel(); throw limited(); }
      if (!response.ok || !/^application\/json(?:\s*;|$)/iu.test(response.headers.get('content-type') ?? '') ||
          Number(response.headers.get('content-length') ?? 0) > MAX_PROVIDER_BYTES) {
        await response.body?.cancel(); throw unavailable();
      }
      const chunks = []; let length = 0;
      for await (const chunk of response.body) {
        length += chunk.length;
        if (length > MAX_PROVIDER_BYTES) throw unavailable();
        chunks.push(chunk);
      }
      const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!result || typeof result !== 'object' || Array.isArray(result)) throw unavailable();
      return result;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw unavailable();
    }
  }

  async function verifiedSubject(accessToken, expectedEmail) {
    const user = await provider('/auth/v1/user', { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } });
    if (typeof user.id !== 'string' || !UUID.test(user.id) || user.is_anonymous === true ||
        typeof user.email_confirmed_at !== 'string' || !Number.isFinite(Date.parse(user.email_confirmed_at)) ||
        (user.banned_until && (!Number.isFinite(Date.parse(user.banned_until)) || Date.parse(user.banned_until) > now())) ||
        (expectedEmail !== undefined && (typeof user.email !== 'string' || user.email.trim().toLowerCase() !== expectedEmail))) throw unauthenticated();
    return user.id;
  }

  function loginEmail(email, clientKey) {
    if (!settings || !sessions) throw unavailable();
    if (typeof email !== 'string' || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email.trim()) ||
        typeof clientKey !== 'string' || clientKey.length > 256) throw unauthenticated();
    return email.trim().toLowerCase();
  }

  async function establishSession(result, startedAt, reservation, expectedEmail) {
    // The refresh token is deliberately discarded; no automatic renewal or persistence.
    delete result.refresh_token;
    const accessToken = result.access_token;
    if (typeof accessToken !== 'string' || accessToken.length > 8192 || !/^[A-Za-z0-9._~+\/-]+=*$/u.test(accessToken) ||
        typeof result.token_type !== 'string' || result.token_type.toLowerCase() !== 'bearer' || !Number.isSafeInteger(result.expires_in) || result.expires_in <= 0 ||
        (result.expires_at !== undefined && (!Number.isSafeInteger(result.expires_at) || result.expires_at <= 0))) throw unavailable();
    const expiresAt = Math.min(startedAt + SESSION_TTL_MS, startedAt + result.expires_in * 1000,
      result.expires_at === undefined ? Infinity : result.expires_at * 1000);
    const subject = await verifiedSubject(accessToken, expectedEmail);
    if (result.user?.id !== subject || expiresAt <= now()) throw unauthenticated();
    const identity = await readGrant(settings, subject);
    if (expiresAt <= now()) throw unauthenticated();
    const token = randomBytes(32).toString('base64url');
    sessions.set(hash(token), { accessToken, subject, tenantId: identity.tenantId, expiresAt }, now(), reservation);
    return Object.freeze({ identity, expiresAt,
      setCookie: `${BROWSER_SESSION_COOKIE}=${token}; ${COOKIE_ATTRIBUTES}; Max-Age=${Math.max(0, Math.floor((expiresAt - now()) / 1000))}` });
  }

  async function login(email, password, { clientKey = 'unknown' } = {}) {
    const normalizedEmail = loginEmail(email, clientKey);
    if (typeof password !== 'string' || password.length < 1 || password.length > 4096) throw unauthenticated();
    const reservation = sessions.reserveLogin(normalizedEmail, clientKey, now());
    try {
      const startedAt = now();
      const result = await provider('/auth/v1/token?grant_type=password', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: normalizedEmail, password }) });
      return await establishSession(result, startedAt, reservation);
    } finally { sessions.release(reservation); }
  }

  async function requestEmailCode(email, { clientKey = 'unknown' } = {}) {
    if (settings?.emailCodeEnabled !== true) throw unavailable();
    const normalizedEmail = loginEmail(email, clientKey);
    // Share the same durable account/client/global budgets with verification and password login.
    const reservation = sessions.reserveLogin(normalizedEmail, clientKey, now());
    try {
      try {
        await provider('/auth/v1/otp', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, create_user: false }) });
      } catch (error) {
        // Provider account-specific rejection/rate limits must not enumerate accounts.
        // Local admission limits above remain a genuine, uniform 429 response.
        if (!(error instanceof HttpError) || ![401, 429].includes(error.status)) throw error;
      }
      return Object.freeze({ accepted: true,
        message: 'Si cette adresse correspond à un compte TAKATAK existant, un code pourra être envoyé. Consultez votre courriel et vos indésirables.' });
    } finally { sessions.release(reservation); }
  }

  async function verifyEmailCode(email, code, { clientKey = 'unknown' } = {}) {
    if (settings?.emailCodeEnabled !== true) throw unavailable();
    const normalizedEmail = loginEmail(email, clientKey);
    // Preserve leading zeroes and accept the provider-configured length (6–10 digits).
    if (typeof code !== 'string' || !/^[0-9]{6,10}$/u.test(code)) throw unauthenticated();
    const reservation = sessions.reserveLogin(normalizedEmail, clientKey, now());
    try {
      const startedAt = now();
      const result = await provider('/auth/v1/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, token: code, type: 'email' }) });
      return await establishSession(result, startedAt, reservation, normalizedEmail);
    } finally { sessions.release(reservation); }
  }

  async function resolve(cookieHeader) {
    if (!settings || !sessions) throw unavailable();
    const token = cookieToken(cookieHeader);
    const key = token ? hash(token) : null;
    const session = key ? sessions.get(key, now()) : null;
    if (!session) throw unauthenticated();
    const reservation = sessions.reserveResolve(now());
    try {
      const subject = await verifiedSubject(session.accessToken);
      if (subject !== session.subject) throw unauthenticated();
      const identity = await readGrant(settings, subject);
      if (identity.tenantId !== session.tenantId) throw unauthenticated();
      // Logout or expiry during a provider request must not revive a session.
      if (!sessions.isCurrent(key, session, now())) throw unauthenticated();
      return identity;
    } catch (error) {
      if (error instanceof HttpError && [401, 403].includes(error.status)) sessions.delete(key);
      throw error;
    } finally { sessions.release(reservation); }
  }

  function logout(cookieHeader) {
    const token = cookieToken(cookieHeader);
    if (token && sessions) sessions.delete(hash(token));
    return { setCookie: `${BROWSER_SESSION_COOKIE}=; ${COOKIE_ATTRIBUTES}; Max-Age=0` };
  }

  return Object.freeze({ configured: Boolean(settings && sessions), emailCodeConfigured: Boolean(settings && sessions && settings.emailCodeEnabled), login, requestEmailCode, verifyEmailCode, resolve, logout,
    assertMutation: req => assertBrowserMutation(req, settings?.appOrigin),
    clear: () => sessions?.close() });
}
