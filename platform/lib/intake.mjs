import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { closeSync, existsSync, lstatSync, openSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { HttpError, externalIdentifier } from './validation.mjs';
import { QUESTIONNAIRE_CONSENT_VERSION, QUESTIONNAIRE_CONSENT_TEXT, validateQuestionnaire, validateFlow, QuestionnaireError, publicQuestionnaire } from './questionnaire.mjs';
import { CATALOG_VERSION, CONSENT_VERSION, CONSENT_TEXT, DOMAINS, REGIONS, interestPrice,
  REQUEST_CONSENT_VERSION, REQUEST_CONSENT_TEXT, SUMMARY_LIMITS, DEADLINE_MAX_DAYS, STAGES, OBJECTIVES, URGENCIES, CONTACT_PREFERENCES } from './catalog.mjs';

const APP_ROOT = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const REPO_ROOT = path.dirname(APP_ROOT);
const EXCLUDED_ROOTS = [APP_ROOT, ...(existsSync(path.join(REPO_ROOT, '.git')) ? [REPO_ROOT] : [])];
const APP_ID = 0x4241494e;
const MAX_LEADS = 10000, MAX_COUNTERS = 4096;
const INTAKE_TABLES = ['ba_intake_meta','ba_intakes','ba_intake_limits','ba_intake_reviews','ba_intake_notes','ba_intake_access','ba_intake_assignments'];
const MAX_REVIEWER_NAME = 80;
export const INTAKE_STATUSES = ['received','in_review','contacted','closed','spam'];
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

// BesoinAvocat staff who process requests, by TAKATAK subject. The consent covers BesoinAvocat processing the request
// and contacting the person; it does not cover sharing it with lawyers, so only these named reviewers can read it.
// Each entry is either a subject, or {"subject": "...", "name": "Me Untel"} so the inbox can show a name beside an
// assignment. One malformed entry disables the whole list: nobody reads requests by accident.
function reviewerName(value) {
  return typeof value === 'string' && value.length <= MAX_REVIEWER_NAME && value.isWellFormed() && !/[\u0000-\u001f\u007f<>]/u.test(value) && value.trim() === value && value.length > 0;
}
export function reviewerDirectory(raw) {
  try {
    if (typeof raw !== 'string' || !raw || raw.length > 8000) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list) || list.length > 32) return [];
    const entries = list.map(value => {
      if (externalIdentifier(value)) return { subject: value, name: null };
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['subject','name'].includes(key)) || !externalIdentifier(value.subject)) return null;
      if (value.name !== undefined && !reviewerName(value.name)) return null;
      return { subject: value.subject, name: value.name ?? null };
    });
    if (entries.some(entry => !entry) || new Set(entries.map(entry => entry.subject)).size !== entries.length) return [];
    return entries;
  } catch { return []; }
}
export function intakeReviewers(raw) { return reviewerDirectory(raw).map(entry => entry.subject); }

export function intakeConfiguration(env = process.env) {
  try {
    const raw = env.BESOINAVOCAT_INTAKE_ALLOWED_ORIGINS;
    if (typeof raw !== 'string' || raw.length > 3000) return null;
    const origins = JSON.parse(raw);
    if (!Array.isArray(origins) || origins.length < 1 || origins.length > 8 || origins.some(value => !origin(value)) || new Set(origins).size !== origins.length) return null;
    const dbPath = env.BESOINAVOCAT_INTAKE_DB_PATH;
    // The detailed request stores a free-text summary; it stays closed unless explicitly enabled.
    return { origins, dbPath: typeof dbPath === 'string' && dbPath ? dbPath : null, requestEnabled: env.BESOINAVOCAT_INTAKE_REQUEST_ENABLED === 'true',
      reviewers: reviewerDirectory(env.BESOINAVOCAT_INTAKE_REVIEWERS) };
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
  // The guided request adds the shared steps; validateFlow decides which of them each area of law requires.
  const extra = withQuestionnaire ? ['questionnaire','otherParties','legalAid','availability','contactTimes','acceptRemote'] : [];
  shape(body, ['name','email','phone','role','language','domain','region','contactPreference','stage','objective','summary','urgency','deadline','consent','consentVersion','website', ...extra],
    ['name','email','role','language','domain','region','contactPreference','stage','objective','summary','urgency','consent','consentVersion',
      ...(withQuestionnaire ? ['questionnaire','availability','contactTimes','acceptRemote'] : [])]);
  const contact = contactFields(body);
  if (body.role !== 'client') throw invalid();
  const consentVersion = withQuestionnaire ? QUESTIONNAIRE_CONSENT_VERSION : REQUEST_CONSENT_VERSION;
  if (body.consent !== true || body.consentVersion !== consentVersion) throw consentRequired();
  if (!choice(CONTACT_PREFERENCES, body.contactPreference) || (body.contactPreference === 'phone' && !contact.phone)) throw invalid();
  if (!choice(STAGES, body.stage) || !choice(OBJECTIVES, body.objective) || !choice(URGENCIES, body.urgency)) throw invalid();
  const summary = summaryText(body.summary), deadline = body.deadline === undefined ? null : deadlineDate(body.deadline, time);
  const { name, email, phone, language, domain, region } = contact;
  let questionnaire, flow = {};
  if (withQuestionnaire) {
    try { questionnaire = validateQuestionnaire(domain, body.questionnaire); flow = validateFlow(domain, body, time); }
    catch (error) { if (error instanceof QuestionnaireError) throw new HttpError(error.status, error.code, error.message); throw error; }
  }
  return { name, email, phone, role: 'client', language, domain, region, contactPreference: body.contactPreference,
    stage: body.stage, objective: body.objective, summary, urgency: body.urgency, ...(deadline ? { deadline } : {}),
    ...(withQuestionnaire ? { questionnaire, ...flow } : {}), consent: true, consentVersion };
}

// The consent version selects the contract: contact only, or the detailed client request.
function input(body, { requestEnabled, time }) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw invalid();
  const withQuestionnaire = body.consentVersion === QUESTIONNAIRE_CONSENT_VERSION;
  if (!withQuestionnaire && body.consentVersion !== REQUEST_CONSENT_VERSION) return contactInput(body);
  if (!requestEnabled) throw requestClosed();
  return requestInput(body, time, withQuestionnaire);
}

// The public side only writes. Reading is limited to the named BesoinAvocat reviewers (intakeReviewers), every read is
// logged, and an intake never creates a user, case, subscription or lawyer assignment.
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
    if ((id !== 0 && id !== APP_ID) || tables.some(name => !INTAKE_TABLES.includes(name)) || (tables.length && id !== APP_ID)) throw unavailable();
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
    // Version 2 adds the staff review: status, notes and a log of every read, all beside the untouched requests.
    db.exec(`CREATE TABLE IF NOT EXISTS ba_intake_reviews (
        reference TEXT PRIMARY KEY REFERENCES ba_intakes(reference),
        status TEXT NOT NULL CHECK(status IN ('received','in_review','contacted','closed','spam')),
        updatedAt TEXT NOT NULL,updatedBy TEXT NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS ba_intake_notes (
        id TEXT PRIMARY KEY,reference TEXT NOT NULL REFERENCES ba_intakes(reference),
        kind TEXT NOT NULL CHECK(kind IN ('note','status')),body TEXT NOT NULL,author TEXT NOT NULL,createdAt TEXT NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS ba_intake_access (
        id TEXT PRIMARY KEY,reference TEXT,action TEXT NOT NULL,subject TEXT NOT NULL,createdAt TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS ba_intake_notes_reference ON ba_intake_notes(reference,createdAt);
      CREATE TRIGGER IF NOT EXISTS ba_intake_notes_append_only_update BEFORE UPDATE ON ba_intake_notes BEGIN SELECT RAISE(ABORT,'intake_notes_are_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS ba_intake_notes_append_only_delete BEFORE DELETE ON ba_intake_notes BEGIN SELECT RAISE(ABORT,'intake_notes_are_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS ba_intake_access_append_only_update BEFORE UPDATE ON ba_intake_access BEGIN SELECT RAISE(ABORT,'intake_access_is_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS ba_intake_access_append_only_delete BEFORE DELETE ON ba_intake_access BEGIN SELECT RAISE(ABORT,'intake_access_is_append_only'); END;`);
    // Version 3 adds the human assignment of a request to a named reviewer, as an append-only history; the latest
    // row is the current assignment and a row with an empty assignee removes it.
    db.exec(`CREATE TABLE IF NOT EXISTS ba_intake_assignments (
        id TEXT PRIMARY KEY,reference TEXT NOT NULL REFERENCES ba_intakes(reference),
        assignee TEXT NOT NULL,assignedBy TEXT NOT NULL,createdAt TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS ba_intake_assignments_reference ON ba_intake_assignments(reference,createdAt);
      CREATE TRIGGER IF NOT EXISTS ba_intake_assignments_append_only_update BEFORE UPDATE ON ba_intake_assignments BEGIN SELECT RAISE(ABORT,'intake_assignments_are_append_only'); END;
      CREATE TRIGGER IF NOT EXISTS ba_intake_assignments_append_only_delete BEFORE DELETE ON ba_intake_assignments BEGIN SELECT RAISE(ABORT,'intake_assignments_are_append_only'); END;`);
    db.prepare("INSERT OR IGNORE INTO ba_intake_meta VALUES('schema_version','3')").run();
    db.prepare("UPDATE ba_intake_meta SET value='3' WHERE name='schema_version' AND value IN ('1','2')").run();
    if (db.prepare("SELECT value FROM ba_intake_meta WHERE name='schema_version'").get()?.value !== '3') throw unavailable();
  } catch { try { db?.close(); } catch {} db = null; }

  const ready = () => { if (!db) throw unavailable(); };
  // Reviewers come as subjects or as {subject, name} entries (reviewerDirectory).
  const directory = new Map();
  for (const entry of Array.isArray(config?.reviewers) ? config.reviewers : []) {
    if (externalIdentifier(entry)) directory.set(entry, null);
    else if (entry && typeof entry === 'object' && externalIdentifier(entry.subject)) directory.set(entry.subject, reviewerName(entry.name) ? entry.name : null);
  }
  const reviewers = new Set(directory.keys());
  const person = subject => subject ? { subject, name: directory.get(subject) ?? null } : null;
  // A person who is not a reviewer learns nothing, not even that the queue exists.
  const review = user => { if (!db || !reviewers.has(user?.subject) || user?.active !== true) throw new HttpError(404, 'NOT_FOUND', 'Ressource introuvable.'); };
  const label = (list, id) => list.find(item => item.id === id)?.label ?? null;
  const logAccess = (user, reference, action) => db.prepare('INSERT INTO ba_intake_access VALUES(?,?,?,?,?)')
    .run(randomUUID(), reference, action, user.subject, new Date(now()).toISOString());
  const statusOf = reference => db.prepare('SELECT status,updatedAt,updatedBy FROM ba_intake_reviews WHERE reference=?').get(reference)
    ?? { status: 'received', updatedAt: null, updatedBy: null };
  // The latest assignment row wins; an empty assignee means the request is back in the shared queue.
  const assignmentOf = reference => {
    const row = db.prepare('SELECT assignee,assignedBy,createdAt FROM ba_intake_assignments WHERE reference=? ORDER BY createdAt DESC,id DESC LIMIT 1').get(reference);
    return row?.assignee ? { assignee: person(row.assignee), assignedBy: row.assignedBy, assignedAt: row.createdAt } : { assignee: null, assignedBy: null, assignedAt: null };
  };
  const ASSIGNED_FILTERS = ['me', 'none'];
  const referenceOf = value => {
    if (typeof value !== 'string' || !/^BA-[A-Za-z0-9_-]{24}$/u.test(value)) throw new HttpError(404, 'NOT_FOUND', 'Demande introuvable.');
    if (!db.prepare('SELECT 1 FROM ba_intakes WHERE reference=?').get(value)) throw new HttpError(404, 'NOT_FOUND', 'Demande introuvable.');
    return value;
  };
  // The list shows what is needed to triage; contact details and the summary are only in the logged detail view.
  function overview(row) {
    const data = JSON.parse(row.payloadJson), state = statusOf(row.reference);
    return { reference: row.reference, createdAt: row.createdAt, status: state.status, statusUpdatedAt: state.updatedAt,
      assignee: assignmentOf(row.reference).assignee, role: data.role, language: data.language, name: data.name,
      domain: { id: data.domain, label: label(DOMAINS, data.domain) }, region: { id: data.region, label: label(REGIONS, data.region) },
      urgency: data.urgency ? { id: data.urgency, label: label(URGENCIES, data.urgency) } : null,
      detailed: Boolean(data.summary), questionnaire: Boolean(data.questionnaire), deadline: data.deadline ?? null };
  }
  function listRequests(user, query) {
    const { status = null, assigned = null, offset = 0, limit = 25 } = query;
    if ((status !== null && !INTAKE_STATUSES.includes(status)) || (assigned !== null && !ASSIGNED_FILTERS.includes(assigned)) ||
        !Number.isSafeInteger(offset) || offset < 0 || offset > MAX_LEADS || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw invalid();
    // `assigned=me` keeps the requests whose latest assignment names this reviewer; `assigned=none` those with no current assignee.
    const current = `(SELECT a.assignee FROM ba_intake_assignments a WHERE a.reference=i.reference ORDER BY a.createdAt DESC,a.id DESC LIMIT 1)`;
    const assignedClause = assigned === 'me' ? `AND ${current}=?` : assigned === 'none' ? `AND COALESCE(${current},'')=''` : '';
    const params = [status, status, ...(assigned === 'me' ? [user.subject] : [])];
    const rows = db.prepare(`SELECT i.reference,i.payloadJson,i.createdAt FROM ba_intakes i LEFT JOIN ba_intake_reviews r ON r.reference=i.reference
      WHERE (? IS NULL OR COALESCE(r.status,'received')=?) ${assignedClause} ORDER BY i.createdAt DESC,i.reference LIMIT ? OFFSET ?`).all(...params, limit + 1, offset);
    const counts = Object.fromEntries(INTAKE_STATUSES.map(name => [name, 0]));
    for (const row of db.prepare(`SELECT COALESCE(r.status,'received') AS status,COUNT(*) AS n FROM ba_intakes i
      LEFT JOIN ba_intake_reviews r ON r.reference=i.reference GROUP BY 1`).all()) counts[row.status] = row.n;
    // Open requests assigned to this reviewer, whatever the status filter: the inbox shows it as « À moi ».
    const mine = db.prepare(`SELECT COUNT(*) AS n FROM ba_intakes i LEFT JOIN ba_intake_reviews r ON r.reference=i.reference
      WHERE COALESCE(r.status,'received') IN ('received','in_review') AND ${current}=?`).get(user.subject).n;
    logAccess(user, null, 'list');
    return { requests: rows.slice(0, limit).map(overview), counts, assignedToMe: mine, offset, limit, hasMore: rows.length > limit, nextOffset: rows.length > limit ? offset + limit : null };
  }
  // Questionnaire answers with their questions, in the order they were asked.
  function answersOf(data) {
    const questions = publicQuestionnaire().domains[data.domain]?.questions ?? [], answers = data.questionnaire?.answers ?? {};
    return questions.filter(item => Object.hasOwn(answers, item.id)).map(item => ({ id: item.id, question: item.label,
      answer: { id: answers[item.id], label: item.options.find(choice => choice.id === answers[item.id])?.label ?? null } }));
  }
  // Shared steps of the guided request, labelled for the reviewer. Absent for older requests.
  function flowOf(data) {
    const flow = publicQuestionnaire().flow, pick = (list, id) => list.find(item => item.id === id)?.label ?? null;
    return {
      otherParties: data.otherParties ? { status: { id: data.otherParties.status, label: pick(flow.otherParties.statuses, data.otherParties.status) }, names: data.otherParties.names ?? null } : null,
      legalAid: data.legalAid ? { interest: { id: data.legalAid.interest, label: pick(flow.legalAid.interest, data.legalAid.interest) },
        household: { id: data.legalAid.household, label: pick(flow.legalAid.household, data.legalAid.household) },
        income: { id: data.legalAid.income, label: pick(flow.legalAid.income, data.legalAid.income) } } : null,
      availability: data.availability ? (data.availability.asap ? { asap: true, slots: [] } : { asap: false,
        slots: data.availability.slots.map(slot => ({ date: slot.slice(0, 10), period: { id: slot.slice(11), label: pick(flow.availability.periods, slot.slice(11)) } })) }) : null,
      contactTimes: Array.isArray(data.contactTimes) ? data.contactTimes.map(id => ({ id, label: pick(flow.contactTimes, id) })) : null,
      acceptRemote: typeof data.acceptRemote === 'boolean' ? data.acceptRemote : null,
    };
  }
  // Who did what on a request, newest first: the reviewers' lists are not included (they name no request). The
  // read of the trail is itself logged, so the trail accounts for its own readers.
  const MAX_TRAIL = 200;
  function accessTrail(user, value) {
    const reference = referenceOf(value);
    logAccess(user, reference, 'trail');
    const rows = db.prepare('SELECT id,action,subject,createdAt FROM ba_intake_access WHERE reference=? ORDER BY createdAt DESC,id DESC LIMIT ?').all(reference, MAX_TRAIL + 1);
    return { reference, access: rows.slice(0, MAX_TRAIL).map(row => ({ id: row.id, action: row.action, subject: person(row.subject), mine: row.subject === user.subject, createdAt: row.createdAt })),
      truncated: rows.length > MAX_TRAIL };
  }
  function readRequest(user, value) {
    const reference = referenceOf(value);
    const row = db.prepare('SELECT * FROM ba_intakes WHERE reference=?').get(reference);
    const data = JSON.parse(row.payloadJson);
    logAccess(user, reference, 'read');
    return { request: { ...overview(row), contact: { name: data.name, email: data.email, phone: data.phone || null, preference: data.contactPreference ?? null },
      stage: data.stage ? { id: data.stage, label: label(STAGES, data.stage) } : null,
      objective: data.objective ? { id: data.objective, label: label(OBJECTIVES, data.objective) } : null,
      contactPreferenceLabel: data.contactPreference ? label(CONTACT_PREFERENCES, data.contactPreference) : null,
      summary: data.summary ?? null, questionnaire: data.questionnaire ?? null, answers: answersOf(data), ...flowOf(data),
      periodicity: data.periodicity ?? null, consent: { version: data.consentVersion, text: row.consentText }, catalogVersion: row.catalogVersion, origin: row.origin,
      assignment: assignmentOf(reference) },
      history: [
        ...db.prepare('SELECT id,kind,body,author,createdAt FROM ba_intake_notes WHERE reference=? ORDER BY createdAt,id').all(reference),
        ...db.prepare('SELECT id,assignee,assignedBy AS author,createdAt FROM ba_intake_assignments WHERE reference=? ORDER BY createdAt,id').all(reference)
          .map(row => ({ id: row.id, kind: 'assignment', body: row.assignee, assignee: person(row.assignee), author: row.author, createdAt: row.createdAt })),
      ].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)).map(note => ({ ...note, mine: note.author === user.subject })) };
  }
  // Assigning a request to a reviewer (or to nobody) is logged like a status change; a newly assigned request that is still
  // « received » moves to « in_review », so the queue counts show who is working on what.
  function assign(user, value, body) {
    const reference = referenceOf(value);
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['assignee','expected'].includes(key)) || !Object.hasOwn(body, 'assignee') ||
        (body.assignee !== null && !reviewers.has(body.assignee)) || (body.expected !== undefined && body.expected !== null && !externalIdentifier(body.expected))) throw invalid();
    return transaction(() => {
      const before = assignmentOf(reference), current = before.assignee?.subject ?? null;
      if (body.expected !== undefined && body.expected !== current) throw new HttpError(409, 'ASSIGNMENT_CONFLICT', 'L’attribution a été modifiée par une autre personne. Rechargez la demande.');
      if (current === body.assignee) return { reference, assignment: before, changed: false, status: statusOf(reference).status };
      const time = new Date(now()).toISOString();
      db.prepare('INSERT INTO ba_intake_assignments VALUES(?,?,?,?,?)').run(randomUUID(), reference, body.assignee ?? '', user.subject, time);
      let status = statusOf(reference).status;
      if (body.assignee && status === 'received') {
        db.prepare(`INSERT INTO ba_intake_reviews VALUES(?,?,?,?) ON CONFLICT(reference) DO UPDATE SET status=excluded.status,updatedAt=excluded.updatedAt,updatedBy=excluded.updatedBy`)
          .run(reference, 'in_review', time, user.subject);
        db.prepare('INSERT INTO ba_intake_notes VALUES(?,?,?,?,?,?)').run(randomUUID(), reference, 'status', 'received → in_review', user.subject, time);
        status = 'in_review';
      }
      logAccess(user, reference, 'assign');
      return { reference, assignment: assignmentOf(reference), changed: true, status };
    });
  }
  function changeStatus(user, value, body) {
    const reference = referenceOf(value);
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['status','expected'].includes(key)) ||
        !INTAKE_STATUSES.includes(body.status) || (body.expected !== undefined && !INTAKE_STATUSES.includes(body.expected))) throw invalid();
    return transaction(() => {
      const current = statusOf(reference).status;
      if (body.expected !== undefined && body.expected !== current) throw new HttpError(409, 'STATUS_CONFLICT', 'Le statut a été modifié par une autre personne. Rechargez la demande.');
      if (current === body.status) return { reference, status: current, changed: false };
      const time = new Date(now()).toISOString();
      db.prepare(`INSERT INTO ba_intake_reviews VALUES(?,?,?,?) ON CONFLICT(reference) DO UPDATE SET status=excluded.status,updatedAt=excluded.updatedAt,updatedBy=excluded.updatedBy`)
        .run(reference, body.status, time, user.subject);
      db.prepare('INSERT INTO ba_intake_notes VALUES(?,?,?,?,?,?)').run(randomUUID(), reference, 'status', `${current} → ${body.status}`, user.subject, time);
      logAccess(user, reference, 'status');
      return { reference, status: body.status, changed: true, updatedAt: time };
    });
  }
  function addNote(user, value, body) {
    const reference = referenceOf(value);
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || typeof body.body !== 'string') throw invalid();
    const text = body.body.replace(/\r\n?/gu, '\n').trim().normalize('NFC');
    if (!text || text.length > 4000 || !text.isWellFormed() || /[\u0000-\u0008\u000b-\u001f\u007f]/u.test(text)) throw invalid();
    return transaction(() => {
      const note = { id: randomUUID(), kind: 'note', body: text, author: user.subject, createdAt: new Date(now()).toISOString() };
      db.prepare('INSERT INTO ba_intake_notes VALUES(?,?,?,?,?,?)').run(note.id, reference, note.kind, note.body, note.author, note.createdAt);
      logAccess(user, reference, 'note');
      return { note: { ...note, mine: true } };
    });
  }
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
    get reviewEnabled() { return Boolean(db) && reviewers.size > 0; },
    isReviewer(user) { return Boolean(db) && reviewers.has(user?.subject) && user?.active === true; },
    reviewList: safe((user, query = {}) => { review(user); return listRequests(user, query); }),
    reviewRead: safe((user, reference) => { review(user); return readRequest(user, reference); }),
    reviewStatus: safe((user, reference, body) => { review(user); return changeStatus(user, reference, body); }),
    reviewNote: safe((user, reference, body) => { review(user); return addNote(user, reference, body); }),
    reviewAssign: safe((user, reference, body) => { review(user); return assign(user, reference, body); }),
    reviewTrail: safe((user, reference) => { review(user); return accessTrail(user, reference); }),
    // The people a request can be assigned to: the configured reviewers, the caller marked.
    reviewDirectory: safe(user => { review(user); return { reviewers: [...directory.keys()].map(subject => ({ ...person(subject), me: subject === user.subject })) }; }),
    clear() { if (db) { db.close(); db = null; } },
  };
}
