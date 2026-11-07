import { HttpError, invalid } from './validation.mjs';

// Vérification d'une décision citée, par l'API de CanLII (métadonnées seulement, https://api.canlii.org/v1).
// A lawyer pastes a neutral citation (« 2020 QCCS 1234 ») or a canlii.org address; the portal returns the official
// title, date, docket number, the canlii.org link, and how many decisions cite it. Nothing of a case is sent to
// CanLII: only the citation typed. Answers are kept 7 days to stay well under CanLII's request limits. The portal
// never says a decision is still good law: the lawyer reads it. Off unless BESOINAVOCAT_CANLII_API_KEY is set.
const API = 'https://api.canlii.org/v1';
const TIMEOUT_MS = 10000;
const MAX_RESPONSE = 512 * 1024;
const CACHE_MS = 7 * 86400000;
const PER_HOUR = 60;
const MANAGERS = ['owner', 'lawyer'];
// Neutral-citation court codes whose CanLII database id is not simply the lowercase code.
const DATABASES = Object.freeze({ scc: 'csc-scc', csc: 'csc-scc', fc: 'fct', cf: 'fct', fca: 'fca', caf: 'fca', tcc: 'tcc', cci: 'tcc' });
const LANGS = ['fr', 'en'];

// « 2020 QCCS 1234 », « 2019 CSC 65 », or https://www.canlii.org/fr/qc/qccs/doc/2020/2020qccs1234/2020qccs1234.html
export function parseCitation(input, lang = 'fr') {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  if (!value || value.length > 300) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || !['www.canlii.org', 'canlii.org'].includes(u.hostname)) return null;
    const m = /^\/(fr|en)\/[a-z]{2,4}\/([a-z0-9-]{2,20})\/doc\/\d{4}\/([a-z0-9-]{3,40})\//u.exec(u.pathname);
    return m ? { lang: m[1], databaseId: m[2], caseId: m[3] } : null;
  } catch { /* not a URL */ }
  const m = /^(\d{4})\s+([A-Za-zÀ-ÿ]{2,10})\s+(\d{1,6})$/u.exec(value.replace(/\s+/gu, ' '));
  if (!m) return null;
  const year = Number(m[1]);
  if (year < 1990 || year > 2100) return null;
  const code = m[2].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/gu, '');
  if (!/^[a-z]{2,10}$/u.test(code)) return null;
  const databaseId = DATABASES[code] ?? code;
  // CanLII case ids use the English code for the federal courts (2019scc65, 2020fc12).
  const idCode = { csc: 'scc', cf: 'fc', caf: 'fca', cci: 'tcc' }[code] ?? code;
  return { lang: LANGS.includes(lang) ? lang : 'fr', databaseId, caseId: `${year}${idCode}${m[3]}` };
}

export function createCanlii({ db, config = { apiKey: null }, fetch: fetchImpl = globalThis.fetch, clock = Date.now }) {
  if (!db) throw new Error('CanLII requires db');
  db.exec(`
    CREATE TABLE IF NOT EXISTS canlii_cache (key TEXT PRIMARY KEY, body TEXT NOT NULL, fetchedAt INTEGER NOT NULL) STRICT;
    CREATE TABLE IF NOT EXISTS canlii_usage (tenantId TEXT NOT NULL, subject TEXT NOT NULL, at INTEGER NOT NULL) STRICT;
    CREATE INDEX IF NOT EXISTS canlii_usage_recent ON canlii_usage(tenantId,subject,at);
  `);
  const sql = query => db.prepare(query);
  const configured = () => Boolean(config.apiKey);
  const unavailable = () => new HttpError(503, 'CANLII_UNAVAILABLE', 'CanLII ne répond pas pour l’instant. Réessayez plus tard.');

  async function get(path) {
    const key = path;
    const cached = sql('SELECT body, fetchedAt FROM canlii_cache WHERE key=?').get(key);
    if (cached && cached.fetchedAt > clock() - CACHE_MS) return { status: 200, body: JSON.parse(cached.body), cached: true };
    let response;
    try {
      response = await fetchImpl(`${API}${path}${path.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(config.apiKey)}`, { redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: 'application/json' } });
    } catch { throw unavailable(); }
    if (response.status === 404) return { status: 404, body: null };
    if (response.status === 429) throw new HttpError(429, 'CANLII_RATE_LIMIT', 'CanLII limite le nombre de demandes. Réessayez dans un moment.');
    if (response.status !== 200) throw unavailable();
    const raw = Buffer.from(await response.arrayBuffer());
    if (raw.length > MAX_RESPONSE) throw unavailable();
    let body;
    try { body = JSON.parse(raw.toString('utf8')); } catch { throw unavailable(); }
    // CanLII answers an unknown decision with 200 and an error list on some endpoints.
    if (Array.isArray(body) && body[0]?.error) return { status: 404, body: null };
    sql('INSERT INTO canlii_cache(key,body,fetchedAt) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET body=excluded.body, fetchedAt=excluded.fetchedAt').run(key, JSON.stringify(body), clock());
    return { status: 200, body, cached: false };
  }
  const str = (value, max = 500) => (typeof value === 'string' ? value.slice(0, max) : null);
  const canliiLink = value => { try { const u = new URL(value); return u.protocol === 'https:' && ['www.canlii.org', 'canlii.org'].includes(u.hostname) ? u.href : null; } catch { return null; } };

  return {
    configured,
    async verify(user, { citation, lang = 'fr' }) {
      if (!configured()) throw new HttpError(503, 'CANLII_NOT_CONFIGURED', 'La clé CanLII n’est pas configurée sur ce serveur.');
      const isLawyer = sql(`SELECT 1 FROM members WHERE tenantId=? AND subject=? AND role IN (${MANAGERS.map(() => '?').join(',')}) LIMIT 1`).get(user.tenantId, user.subject, ...MANAGERS);
      if (!isLawyer) throw new HttpError(403, 'FORBIDDEN', 'La vérification CanLII est réservée aux avocats.');
      const ref = parseCitation(citation, lang);
      if (!ref) throw invalid('Citation non reconnue. Exemples : « 2020 QCCS 1234 » ou une adresse canlii.org.');
      const time = clock();
      if (sql('SELECT COUNT(*) AS n FROM canlii_usage WHERE tenantId=? AND subject=? AND at>?').get(user.tenantId, user.subject, time - 3600000).n >= PER_HOUR) throw new HttpError(429, 'CANLII_RATE_LIMIT', 'Limite de 60 vérifications par heure atteinte.');
      sql('INSERT INTO canlii_usage VALUES (?,?,?)').run(user.tenantId, user.subject, time);
      sql('DELETE FROM canlii_usage WHERE at<?').run(time - 86400000);
      const base = `/${encodeURIComponent(ref.lang)}/${encodeURIComponent(ref.databaseId)}/${encodeURIComponent(ref.caseId)}/`;
      const browse = await get(`/caseBrowse${base}`);
      if (browse.status === 404 || !browse.body) return { found: false, reference: ref };
      const b = browse.body;
      let citing = null;
      try {
        const cited = await get(`/caseCitator${base}citingCases`);
        const list = Array.isArray(cited.body?.citingCases) ? cited.body.citingCases : null;
        if (list) citing = { count: list.length, sample: list.slice(0, 10).map(c => ({ title: str(c.title, 300), citation: str(c.citation, 200) })) };
      } catch { citing = null; }
      return { found: true, reference: ref, cached: browse.cached, decision: {
        title: str(b.title, 500), citation: str(b.citation, 200), decisionDate: str(b.decisionDate, 20), docketNumber: str(b.docketNumber, 200),
        language: str(b.language, 5), keywords: str(b.keywords, 1000), url: canliiLink(b.url) }, citing };
    },
  };
}
