import { HttpError, externalIdentifier } from './validation.mjs';

// Dedicated TAKATAK product introspection contract; not a second identity authority.
// POST HTTPS, Authorization: Bearer <service token>, JSON {token, product}.
// No redirects, token persistence, cookies, JWT decoding or fallback identity.
export function validIdentity(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === 4 && ['subject', 'tenantId', 'product', 'active'].every(k => Object.hasOwn(value, k)) &&
    externalIdentifier(value.subject) && externalIdentifier(value.tenantId) &&
    value.product === 'besoinavocat' && value.active === true);
}

export function identityConfiguration(env = process.env) {
  try {
    const url = new URL(env.TAKATAK_IDENTITY_URL);
    const serviceToken = env.TAKATAK_SERVICE_TOKEN;
    if (url.protocol !== 'https:' || url.username || url.password || url.hash ||
        typeof serviceToken !== 'string' || serviceToken.length < 1 || serviceToken.length > 8192 || /[\s\u0000-\u001f\u007f]/u.test(serviceToken)) return null;
    return { url: url.href, serviceToken };
  } catch { return null; }
}

export function createIntrospection(config = identityConfiguration()) {
  return async function introspect(token) {
    if (!config) throw new HttpError(503, 'IDENTITY_UNAVAILABLE', 'La connexion TAKATAK dédiée à ce produit n’est pas configurée.');
    try {
      const response = await fetch(config.url, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', Authorization: `Bearer ${config.serviceToken}` },
        body: JSON.stringify({ token, product: 'besoinavocat' }),
      });
      if (response.status === 401 || response.status === 403) throw new HttpError(401, 'UNAUTHENTICATED', 'Session non valide.');
      if (!response.ok || !/^application\/json(?:\s*;|$)/iu.test(response.headers.get('content-type') || '')) throw new Error('Invalid introspection response');
      let size = 0;
      const chunks = [];
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > 16384) throw new Error('Oversized identity response');
        chunks.push(chunk);
      }
      const identity = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!validIdentity(identity)) throw new HttpError(401, 'UNAUTHENTICATED', 'Session non valide pour ce produit.');
      return identity;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(503, 'IDENTITY_UNAVAILABLE', 'Le service d’identité TAKATAK est indisponible.');
    }
  };
}

export async function authenticateRequest(req, authenticate) {
  const count = req.rawHeaders.reduce((sum, value, i) => sum + (i % 2 === 0 && value.toLowerCase() === 'authorization' ? 1 : 0), 0);
  const header = req.headers.authorization;
  if (count !== 1 || typeof header !== 'string' || header.length > 8200 || !/^Bearer [A-Za-z0-9._~+\/-]+=*$/u.test(header)) {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Une session TAKATAK est requise.');
  }
  let identity;
  try { identity = await authenticate(header.slice(7), req); }
  catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, 'IDENTITY_UNAVAILABLE', 'Le service d’identité est indisponible.');
  }
  if (!validIdentity(identity)) throw new HttpError(401, 'UNAUTHENTICATED', 'Session non valide pour ce produit.');
  return Object.freeze({ subject: identity.subject, tenantId: identity.tenantId, product: 'besoinavocat', active: true });
}
