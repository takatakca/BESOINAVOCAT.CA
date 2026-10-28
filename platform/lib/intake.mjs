import { createHash, randomBytes } from 'node:crypto';
import { closeSync, existsSync, lstatSync, openSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { HttpError } from './validation.mjs';
import { QUESTIONNAIRE_CONSENT_VERSION, QUESTIONNAIRE_CONSENT_TEXT, validateQuestionnaire, QuestionnaireError } from './questionnaire.mjs';
import { CATALOG_VERSION, CONSENT_VERSION, CONSENT_TEXT, DOMAINS, REGIONS, interestPrice,
  REQUEST_CONSENT_VERSION, REQUEST_CONSENT_TEXT, SUMMARY_LIMITS, DEADLINE_MAX_DAYS, STAGES, OBJECTIVES, URGENCIES, CONTACT_PREFERENCES } from './catalog.mjs';

const APP_ROOT = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const REPO_ROOT = path.dirname(APP_ROOT);
const EXCLUDED_ROOTS = [APP_ROOT, ...(existsSync(path.join(REPO_ROOT, '.git')) ? [REPO_ROOT] : [])];
const APP_ID = 0x4241494e;
const MAX_LEADS = 10000, MAX_COUNTERS = 4096;
const hash = value => createHash('sha256').update(value).digest('hex');
const unavailable = () => new HttpError(503, 'INTAKE_UNAVAILABLE', 'Le formulaire est temporairement indisponible.');
const forbidden = () => new HttpError(403, 'INTAKE_FORBIDDEN', 'Origine ou en-têtes du formulaire non autorisés.');
const invalid = () => new HttpError(400, 'INTAKE_INVALID_INPUT', 'Vérifiez les champs du formulaire.');
const limited = () => new HttpError(429, 'INTAKE_RATE_LIMIT', 'Trop de demandes. Réessayez plus tard.');
const requestClosed = () => new HttpError(503, 'INTAKE_UNAVAILABLE', 'La demande détaillée n’est pas ouverte.');
const consentRequired = () => new HttpError(400, 'INTAKE_CONSENT_REQUIRED', 'Le consentement explicite à la version actuelle est requis.');
const choice = (list, value) => list.some(item => item.id === value);
const inside = (root, target) => { const rel = path.relative(root, target); return !rel || (rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel)); };

function origin(value) {
  if (typeof value !== 'string' || value.length > 300) return null;
  try { const url = new URL(value); return url.protocol === 'https:' && url.origin === value && !url.username && !url.password ? value : null; }
  catch { return null; }
}

export function intakeConfiguration(env = process.env) {
  try {
    const raw = env.BESOINAVOCAT_INTAKE_ALLOWED_ORIGINS;
    if (typeof raw !== 'string' || raw.length > 3000) return null;
    const origins = JSON.parse(raw);
    if (!Array.isArray(origins) || origins.length < 1 || origins.length > 8 || origins.some(value => !origin(value)) || new Set(origins).size !== origins.length) return null;
    const dbPath = env.BESOINAVOCAT_INTAKE_DB_PATH;
    // The detailed request stores a free-text summary; it stays closed unless explicitly enabled.
    return { origins, dbPath: typeof dbPath === 'string' && dbPath ? dbPath : null, requestEnabled: env.BESOINAVOCAT_INTAKE_REQUEST_ENABLED === 'true' };
  } catch { return null; }
}

function privateDatabase(file, excludedPaths, excludedDirs) {
  if (typeof file !== 'string' || !path.isAbsolute(file) || /[\u0000-\u001f]/u.test(file) || file.split(/[\\/]/u).includes('..')) throw unavailable();
  const parent = realpathSync(path.dirname(file)), target = path.join(parent, path.basename(file));
  const parentStat = statSync(parent);
  if (!parentStat.isDirectory() || (process.platform !== 'win32' && (parentStat.mode & 0o077))) throw unavailable();
  if (target.split(path.sep).some(part => /^(?:public|public_html|htdocs|wwwroot|\.git)$/iu.test(part))) throw unavailable();
  for (const root of EXCLUDED_ROOTS) if (inside(realpathSync(root), target)) throw unavailable();
  const canonical = value => {
    let cursor = path.resolve(value), tail = [];
    while (!existsSync(cursor)) { tail.unshift(path.basename(cursor)); const up = path.dirname(cursor); if (cursor === up) throw unavailable(); cursor = up; }
    return path.join(realpathSync(cursor), ...tail);
  };
  for (const directory of excludedDirs.filter(Boolean)) if (inside(canonical(directory), target)) throw unavailable();
  for (const filePath of excludedPaths.filter(value => value && value !== ':memory:')) {
    const other = canonical(filePath);
    if (inside(other, target)) throw unavailable();
    if (existsSync(target) && existsSync(other)) {
      const a = lstatSync(target), b = statSync(other);
      if (a.dev === b.dev && a.ino === b.ino) throw unavailable();
    }
  }
  try { closeSync(openSync(target, 'wx', 0o600)); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  const info = lstatSync(target);
  if (!info.isFile() || info.isSymbolicLink() || (process.platform !== 'win32' && (info.mode & 0o077))) throw unavailable();
  return target;
}

function clean(value, max) {
  if (typeof value !== 'string' || value.length > max || !value.isWellFormed() || /[\u0000-\u001f\u007f<>]/u.test(value)) throw invalid();
  return value.trim().normalize('NFC');
}

function contactFields(body) {
  const name = clean(body.name, 120), email = clean(body.email, 254), phone = body.phone === undefined ? '' : clean(body.phone, 32);
  if (!name || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/u.test(email) || email.split('@')[0].length > 64) throw invalid();
  if (phone && (!/^[+0-9(). -]+$/u.test(phone) || phone.replace(/\D/gu, '').length < 7 || phone.replace(/\D/gu, '').length > 15)) throw invalid();
  if (!['fr','en'].includes(body.language) || !choice(DOMAINS, body.domain) || !choice(REGIONS, body.region)) throw invalid();
  if (body.website !== undefined && (typeof body.website !== 'string' || body.website !== '')) throw invalid();
  return { name, email, phone, language: body.language, domain: body.domain, region: body.region };
}

function shape(body, allowed, required) {
  if (Object.keys(body).some(key => !allowed.includes(key)) || required.some(key => !Object.hasOwn(body, key))) throw invalid();
}

function contactInput(body) {
  shape(body, ['name','email','phone','role','language','domain','region','periodicity','consent','consentVersion','website'],
    ['name','email','role','language','domain','region','consent','consentVersion']);
  const contact = contactFields(body);
  if (!['client','professional'].includes(body.role)) throw invalid();
  if (body.consent !== true || body.consentVersion !== CONSENT_VERSION) throw consentRequired();
  if ((body.role === 'professional' && !['weekly','monthly'].includes(body.periodicity)) || (body.role === 'client' && body.periodicity !== undefined)) throw invalid();
  const { name, email, phone, language, domain, region } = contact;
  return { name, email, phone, role: body.role, language, domain, region,
    ...(body.role === 'professional' ? { periodicity: body.periodicity } : {}), consent: true, consentVersion: CONSENT_VERSION };
}

function summaryText(value) {
  if (typeof value !== 'string' || value.length > SUMMARY_LIMITS.max * 2 || !value.isWellFormed()) throw invalid();
  // Line breaks and tabs are kept; other controls and markup characters are refused.
  const text = value.replace(/\r\n?/gu, '\n');
  if (/[\u0000-\u0008\u000b-\u001f\u007f<>]/u.test(text)) throw invalid();
  const summary = text.trim().normalize('NFC');
  if (summary.length < SUMMARY_LIMITS.min || summary.length > SUMMARY_LIMITS.max) throw invalid();
  return summary;
}

function deadlineDate(value, time) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) throw invalid();
  const [year, month, day] = value.split('-').map(Number), date = Date.UTC(year, month - 1, day);
  if (new Date(date).toISOString().slice(0, 10) !== value) throw invalid();
  const today = Math.floor(time / 86_400_000), target = date / 86_400_000;
  // One day of tolerance for time zones west of UTC; no past or far-future deadlines.
  if (target < today - 1 || target > today + DEADLINE_MAX_DAYS) throw invalid();
  return value;
}

function requestInput(body, time, withQuestionnaire = false) {
  const extra = withQuestionnaire ? ['questionnaire'] : [];
  shape(body, ['name','email','phone','role','language','domain','region','contactPreference','stage','objective','summary','urgency','deadline','consent','consentVersion','website', ...extra],
    ['name','email','role','language','domain','region','contactPreference','stage','objective','summary','urgency','consent','consentVersion', ...extra]);
  const contact = contactFields(body);
  if (body.role !== 'client') throw invalid();
  const consentVersion = withQuestionnaire ? QUESTIONNAIRE_CONSENT_VERSION : REQUEST_CONSENT_VERSION;
  if (body.consent !== true || body.consentVersion !== consentVersion) throw consentRequired();
  if (!choice(CONTACT_PREFERENCES, body.contactPreference) || (body.contactPreference === 'phone' && !contact.phone)) throw invalid();
  if (!choice(STAGES, body.stage) || !choice(OBJECTIVES, body.objective) || !choice(URGENCIES, body.urgency)) throw invalid();
  const summary = summaryText(body.summary), deadline = body.deadline === undefined ? null : deadlineDate(body.deadline, time);
  const { name, email, phone, language, domain, region } = contact;
  let questionnaire;
  if (withQuestionnaire) {
    try { questionnaire = validateQuestionnaire(domain, body.questionnaire); }
    catch (error) { if (error instanceof QuestionnaireError) throw new HttpError(error.status, error.code, error.message); throw error; }
  }
  return { name, email, phone, role: 'client', language, domain, region, contactPreference: body.contactPreference,
    stage: body.stage, objective: body.objective, summary, urgency: body.urgency, ...(deadline ? { deadline } : {}),
    ...(withQuestionnaire ? { questionnaire } : {}), consent: true, consentVersion };
}

// The consent version selects the contract: contact only, or the detailed client request.
function input(body, { requestEnabled, time }) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw invalid();
  const withQuestionnaire = body.consentVersion === QUESTIONNAIRE_CONSENT_VERSION;
  if (!withQuestionnaire && body.consentVersion !== REQUEST_CONSENT_VERSION) return contactInput(body);
  if (!requestEnabled) throw requestClosed();
  return requestInput(body, time, withQuestionnaire);
}

// No list/read endpoint or role provisioning is exposed. The operator owns this
// separate private queue; an intake never creates a user, case or subscription.
export function createIntake({ config, excludedPaths = [], excludedDirs = [], now = Date.now } = {}) {
  let db = null;
  const origins = new Set(Array.isArray(config?.origins) ? config.origins.filter(value => origin(value)) : []);
  const requestEnabled = config?.requestEnabled === true;
  try {
    if (!config || origins.size !== config.origins.length || origins.size < 1 || origins.size > 8) throw unavailable();
    const file = privateDatabase(config.dbPath, excludedPaths, excludedDirs);
    db = new DatabaseSync(file);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(row => row.name);
    const id = db.prepare('PRAGMA application_id').get().application_id;
    if ((id !== 0 && id !== APP_ID) || tables.some(name => !['ba_intake_meta','ba_intakes','ba_intake_limits'].includes(name)) || (tables.length && id !== APP_ID)) throw unavailable();
    db.exec('PRAGMA busy_timeout=2000; PRAGMA synchronous=FULL; PRAGMA secure_delete=ON;');
    if (db.prepare('PRAGMA journal_mode=WAL').get().journal_mode !== 'wal') throw unavailable();
    db.exec(`PRAGMA application_id=${APP_ID};
      CREATE TABLE IF NOT EXISTS ba_intake_meta (name TEXT PRIMARY KEY,value TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS ba_intakes (
        reference TEXT PRIMARY KEY,idempotencyHash TEXT NOT NULL UNIQUE,payloadHash TEXT NOT NULL,
        payloadJson TEXT NOT NULL,origin TEXT NOT NULL,catalogVersion TEXT NOT NULL,consentText TEXT NOT NULL,
        priceJson TEXT NOT NULL,createdAt TEXT NOT NULL,status TEXT NOT NULL CHECK(status='received')
      ) STRICT;
      CREATE TABLE IF NOT EXISTS ba_intake_limits (id TEXT PRIMARY KEY,count INTEGER NOT NULL,expiresAt INTEGER NOT NULL) STRICT;
    `);
    db.prepare("INSERT OR IGNORE INTO ba_intake_meta VALUES('schema_version','1')").run();
    if (db.prepare("SELECT value FROM ba_intake_meta WHERE name='schema_version'").get()?.value !== '1') throw unavailable();
  } catch { try { db?.close(); } catch {} db = null; }

  const ready = () => { if (!db) throw unavailable(); };
  const safe = action => (...args) => { try { ready(); return action(...args); } catch (error) { if (error instanceof HttpError) throw error; throw unavailable(); } };
  const transaction = action => {
    db.exec('BEGIN IMMEDIATE');
    try { const result = action(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  function consume(keys, time) {
    db.prepare('DELETE FROM ba_intake_limits WHERE expiresAt<=?').run(time);
    if (db.prepare('SELECT COUNT(*) AS n FROM ba_intake_limits').get().n + keys.length > MAX_COUNTERS) throw limited();
    for (const [id, maximum] of keys) if ((db.prepare('SELECT count FROM ba_intake_limits WHERE id=?').get(id)?.count ?? 0) >= maximum) throw limited();
    for (const [id, , ttl] of keys) db.prepare('INSERT INTO ba_intake_limits VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1').run(id, time + ttl);
  }
  function uniqueHeader(req, name) {
    if (Array.isArray(req.rawHeaders) && req.rawHeaders.filter((value, index) => index % 2 === 0 && value.toLowerCase() === name).length > 1) throw forbidden();
    const value = req.headers[name];
    if (value !== undefined && typeof value !== 'string') throw forbidden();
    return value;
  }
  return {
    get configured() { return Boolean(db); },
    get requestEnabled() { return Boolean(db) && requestEnabled; },
    requireReady: ready,
    cors(req, res, { required = false } = {}) {
      const supplied = uniqueHeader(req, 'origin');
      if (supplied === undefined && !required) return null;
      if (!origins.has(supplied)) throw forbidden();
      res.setHeader('Access-Control-Allow-Origin', supplied);
      res.setHeader('Vary', 'Origin');
      return supplied;
    },
    preflight(req, res, method) {
      if (method === 'POST') ready();
      if (uniqueHeader(req, 'access-control-request-method') !== method) throw forbidden();
      const raw = uniqueHeader(req, 'access-control-request-headers') ?? '';
      const headers = raw ? raw.toLowerCase().split(',').map(value => value.trim()) : [];
      if (headers.some(value => !['content-type','x-requested-with','idempotency-key'].includes(value)) || new Set(headers).size !== headers.length) throw forbidden();
      res.setHeader('Access-Control-Allow-Methods', method);
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Idempotency-Key');
      // Deliberately no Access-Control-Allow-Credentials: this is a public intake.
    },
    mutation(req) {
      ready();
      if (uniqueHeader(req, 'x-requested-with') !== 'XMLHttpRequest') throw forbidden();
      const key = uniqueHeader(req, 'idempotency-key');
      if (typeof key !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(key)) throw invalid();
      if (req.headers.authorization !== undefined || req.headers.cookie !== undefined) throw forbidden();
      return key.toLowerCase();
    },
    reserve: safe(client => transaction(() => consume([[`client:${hash(String(client))}`,20,900_000],['global',120,60_000]], now()))),
    receive: safe((body, key, requestOrigin) => {
      if (!origins.has(requestOrigin)) throw forbidden();
      const data = input(body, { requestEnabled, time: now() }), payload = JSON.stringify(data);
      const digest = hash(payload), keyHash = hash(key);
      return transaction(() => {
        const prior = db.prepare('SELECT reference,payloadHash,origin FROM ba_intakes WHERE idempotencyHash=?').get(keyHash);
        if (prior) {
          if (prior.payloadHash !== digest || prior.origin !== requestOrigin) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT', 'Cette clé a déjà servi à une autre demande.');
          return { reference: prior.reference, status: 'received' };
        }
        if (db.prepare('SELECT COUNT(*) AS n FROM ba_intakes').get().n >= MAX_LEADS) throw unavailable();
        const time = now();
        consume([[`email:${hash(data.email.toLowerCase())}`,3,86_400_000]], time);
        const reference = 'BA-' + randomBytes(18).toString('base64url');
        const price = interestPrice(data.role, data.periodicity);
        const consentText = (data.consentVersion === QUESTIONNAIRE_CONSENT_VERSION ? QUESTIONNAIRE_CONSENT_TEXT : data.consentVersion === REQUEST_CONSENT_VERSION ? REQUEST_CONSENT_TEXT : CONSENT_TEXT)[data.language];
        db.prepare('INSERT INTO ba_intakes VALUES(?,?,?,?,?,?,?,?,?,?)').run(reference,keyHash,digest,payload,requestOrigin,CATALOG_VERSION,consentText,JSON.stringify(price),new Date(time).toISOString(),'received');
        return { reference, status:'received' };
      });
    }),
    clear() { if (db) { db.close(); db = null; } },
  };
}
