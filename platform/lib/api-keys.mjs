// Clés d'API de plateforme : elles servent aux systèmes du propriétaire (site besoinavocat.ca, vitrine www/,
// WordPress chez MochaHost, outils TAKATAK) pour parler au portail de serveur à serveur, sans navigateur ni
// session de personne. Une clé n'ouvre jamais un dossier : les routes /api/v1 n'exposent que le catalogue,
// le dépôt d'une demande de contact et des totaux sans donnée personnelle.
//
// Configuration (Coolify) : BESOINAVOCAT_API_KEYS = tableau JSON de
//   { "id": "site-wordpress", "name": "Site besoinavocat.ca", "sha256": "<empreinte hex de la clé>", "scopes": ["intake:write"] }
// La clé elle-même (`ba_<id>_<secret>`) n'est jamais stockée : seule son empreinte SHA-256 l'est. Une seule
// entrée malformée désactive toute la liste, comme pour les réviseurs des demandes.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { HttpError } from './validation.mjs';

export const API_SCOPES = ['catalog:read', 'intake:write', 'intakes:read'];
export const API_KEY_PREFIX = 'ba';
const ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/u;
const SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const MAX_KEYS = 32, MAX_NAME = 80;
// Per key: 60 calls per minute and 2 000 per day. The browser form has its own limits in lib/intake.mjs.
const LIMITS = [[60, 60_000], [2000, 86_400_000]];

const sha256 = value => createHash('sha256').update(value, 'utf8').digest('hex');
const missing = () => { const error = new HttpError(401, 'API_KEY_REQUIRED', 'Une clé d’API de plateforme est requise.'); error.challenge = true; return error; };
const invalidKey = () => new HttpError(403, 'API_KEY_INVALID', 'Clé d’API refusée.');
const scopeMissing = scope => new HttpError(403, 'API_SCOPE_MISSING', `Cette clé n’a pas la permission ${scope}.`);
const limited = () => new HttpError(429, 'API_RATE_LIMIT', 'Trop d’appels avec cette clé. Réessayez plus tard.');

function name(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_NAME && value.isWellFormed() && value.trim() === value && !/[\u0000-\u001f\u007f<>]/u.test(value);
}

/** Génère une nouvelle clé pour un identifiant : la clé est montrée une seule fois, l'empreinte va dans la configuration. */
export function generateApiKey(id) {
  if (!ID_PATTERN.test(id ?? '')) throw new Error('Identifiant de clé invalide : lettres minuscules, chiffres et tirets, 40 caractères au plus.');
  const secret = randomBytes(32).toString('base64url');
  const key = `${API_KEY_PREFIX}_${id}_${secret}`;
  return { id, key, sha256: sha256(key) };
}

/** Lit BESOINAVOCAT_API_KEYS. Retourne toujours une liste; vide si absente ou malformée. */
export function apiKeyConfiguration(env = process.env) {
  const raw = env.BESOINAVOCAT_API_KEYS;
  if (raw === undefined || raw === '') return { keys: [], configured: false, malformed: false };
  const malformed = { keys: [], configured: false, malformed: true };
  try {
    if (typeof raw !== 'string' || raw.length > 16_000) return malformed;
    const list = JSON.parse(raw);
    if (!Array.isArray(list) || list.length < 1 || list.length > MAX_KEYS) return malformed;
    const keys = list.map(entry => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      if (Object.keys(entry).some(field => !['id', 'name', 'sha256', 'scopes'].includes(field))) return null;
      if (!ID_PATTERN.test(entry.id ?? '') || !SHA256_PATTERN.test(entry.sha256 ?? '')) return null;
      if (entry.name !== undefined && !name(entry.name)) return null;
      const scopes = entry.scopes;
      if (!Array.isArray(scopes) || scopes.length < 1 || scopes.some(scope => !API_SCOPES.includes(scope)) || new Set(scopes).size !== scopes.length) return null;
      return { id: entry.id, name: entry.name ?? entry.id, sha256: entry.sha256, scopes: [...scopes] };
    });
    if (keys.some(entry => !entry)) return malformed;
    if (new Set(keys.map(entry => entry.id)).size !== keys.length || new Set(keys.map(entry => entry.sha256)).size !== keys.length) return malformed;
    return { keys, configured: true, malformed: false };
  } catch { return malformed; }
}

/** Authentification et limites des clés; aucune base : tout est en mémoire du processus. */
export function createApiKeys({ config, now = Date.now } = {}) {
  const keys = new Map((config?.keys ?? []).map(entry => [entry.id, entry]));
  const usage = new Map(); // `${id}:${window}` -> { count, expiresAt }

  function uniqueHeader(req, header) {
    if (Array.isArray(req.rawHeaders) && req.rawHeaders.filter((value, index) => index % 2 === 0 && value.toLowerCase() === header).length > 1) throw invalidKey();
    const value = req.headers[header];
    if (value !== undefined && typeof value !== 'string') throw invalidKey();
    return value;
  }

  function authenticate(req) {
    // A platform key is for servers: a browser request (Origin, Cookie) is refused rather than silently accepted.
    if (req.headers.cookie !== undefined || req.headers.origin !== undefined) throw invalidKey();
    const header = uniqueHeader(req, 'authorization');
    if (header === undefined) throw missing();
    const match = /^Bearer\s+(\S+)$/u.exec(header);
    if (!match || match[1].length > 200) throw invalidKey();
    // The secret is base64url and may itself contain `_`: the id is everything between the prefix and the last 43 characters.
    const parts = new RegExp(`^${API_KEY_PREFIX}_([a-z0-9-]{1,40})_([A-Za-z0-9_-]{43})$`, 'u').exec(match[1]);
    if (!parts || !ID_PATTERN.test(parts[1]) || !SECRET_PATTERN.test(parts[2])) throw invalidKey();
    const entry = keys.get(parts[1]);
    // Compare against a real or a dummy digest so a missing id costs the same as a wrong secret.
    const expected = Buffer.from(entry?.sha256 ?? sha256(`absent:${parts[1]}`), 'hex');
    const supplied = Buffer.from(sha256(match[1]), 'hex');
    if (!entry || expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw invalidKey();
    return { id: entry.id, name: entry.name, scopes: [...entry.scopes] };
  }

  function require(client, scope) {
    if (!API_SCOPES.includes(scope)) throw new Error(`Unknown API scope ${scope}`);
    if (!client?.scopes?.includes(scope)) throw scopeMissing(scope);
    return client;
  }

  function reserve(client) {
    const time = now();
    const slots = LIMITS.map(([max, window], index) => {
      const id = `${client.id}:${index}`;
      const slot = usage.get(id);
      if (!slot || slot.expiresAt <= time) return { id, slot: { count: 0, expiresAt: time + window }, max };
      return { id, slot, max };
    });
    if (slots.some(({ slot, max }) => slot.count >= max)) throw limited();
    for (const { id, slot } of slots) { slot.count++; usage.set(id, slot); }
    if (usage.size > 4096) for (const [id, slot] of usage) if (slot.expiresAt <= time) usage.delete(id);
  }

  return {
    get configured() { return keys.size > 0; },
    authenticate,
    require,
    reserve,
    describe(client) { return { id: client.id, name: client.name, scopes: client.scopes }; },
  };
}
