import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { httpsOrigin } from './browser-session.mjs';
import { HttpError, externalIdentifier, fields, identifier, invalid, text } from './validation.mjs';

// Telephony of the portal, entirely through MIMT Connect (mimt.ca, Groupe TAKATAK), the partner API documented in
// takatakca/mimtcaapp docs/MIMT-CONNECT.md. The portal never talks to a carrier itself.
//
// - Lawyers: each lawyer is a MIMT Connect member under an opaque identifier derived from the portal identity (no name,
//   email or subject leaves the portal unless the lawyer types it). The lawyer links their own MIMT account (one-time
//   code approved in MIMT), chooses one of their MIMT numbers as their BesoinAvocat line, and sets their availability.
//   Plan, number and transfer are chosen and paid in MIMT by the lawyer: the portal only shows the status and the link.
// - Case calls: a lawyer clicks « Appeler » on a member of the case. MIMT rings the lawyer's MIMT apps (or cellphone),
//   then dials the other person with the lawyer's line as caller ID (click-to-call). The other person's number never
//   appears in the browser.
// - Équipe: the platform's public MIMT number hunts the team lawyers simultaneously; the first who presses 1 takes the
//   call. The team console shows each call, who answered, the duration and credits from MIMT's signed webhooks.
// - Webhooks: X-MIMT-Signature (HMAC-SHA256 of "<t>.<raw body>"), five-minute tolerance, deduplicated on the event id.
//   Every step is timestamped and stored with the case; a recording is fetched through a fresh 15-minute signed link.
//
// Secrets stay in the server's environment (pasted in Coolify by the owner). Nothing calls MIMT until the API key and
// the webhook secret are configured; until then every action answers 503 and nothing is simulated.
const PROVIDER_TIMEOUT_MS = 10000;
const MAX_CALLS_PER_HOUR = 20;
const RING_SECONDS = 25;
const MAX_TEAM = 50;
const MAX_RECORDING_BYTES = 64 * 1024 * 1024;
const TOLERANCE_S = 300;
const MANAGERS = ['owner', 'lawyer'];
const NANP = /^\+1[2-9][0-9]{2}[2-9][0-9]{6}$/u;
const E164 = /^\+[1-9][0-9]{6,14}$/u;
const HUNT_KEY = /^[a-z0-9][a-z0-9_-]{0,59}$/u;
const MIMT_ID = /^[A-Za-z0-9._:@-]{1,100}$/u;
const AVAILABILITY = ['available', 'busy', 'offline'];
const PRINTABLE = /^[\x21-\x7e]+$/u;

const sha256 = value => createHash('sha256').update(value).digest('hex');
const missing = () => new HttpError(404, 'NOT_FOUND', 'Appel introuvable ou non accessible.');
const notConfigured = () => new HttpError(503, 'TELEPHONY_NOT_CONFIGURED', 'La téléphonie MIMT n’est pas encore raccordée : la clé MIMT Connect et le secret de webhook ne sont pas configurés sur le serveur.');
const badSignature = () => new HttpError(401, 'INVALID_SIGNATURE', 'Signature non valide.');
const providerError = () => new HttpError(502, 'TELEPHONY_PROVIDER_ERROR', 'MIMT n’a pas confirmé l’opération. Réessayez plus tard.');

// MIMT Connect error codes (docs/MIMT-CONNECT.md) and what the portal tells the person.
const MIMT_ERRORS = {
  member_not_linked: [409, 'MIMT_NOT_LINKED', 'Reliez d’abord votre compte MIMT dans Réglages, téléphone.'],
  member_number_required: [409, 'MIMT_LINE_REQUIRED', 'Choisissez d’abord votre ligne MIMT dans Réglages, téléphone.'],
  member_not_found: [409, 'MIMT_MEMBER_REQUIRED', 'Activez d’abord la téléphonie MIMT dans Réglages, téléphone.'],
  member_inactive: [409, 'MIMT_MEMBER_INACTIVE', 'Votre profil MIMT est désactivé. Réactivez-le dans Réglages, téléphone.'],
  member_already_linked: [409, 'MIMT_ALREADY_LINKED', 'Votre compte MIMT est déjà relié.'],
  already_linked_to_partner: [409, 'MIMT_ALREADY_LINKED', 'Ce compte MIMT est déjà relié à un autre profil BesoinAvocat.'],
  link_not_found: [409, 'MIMT_NOT_LINKED', 'Aucun compte MIMT n’est relié.'],
  number_not_owned: [422, 'MIMT_NUMBER_NOT_OWNED', 'Ce numéro n’appartient pas à votre compte MIMT.'],
  insufficient_credits: [409, 'MIMT_NO_CREDITS', 'Le solde de crédits MIMT de la plateforme ne permet pas cet appel. L’administration a été avisée.'],
  destination_not_allowed: [422, 'MIMT_DESTINATION_REFUSED', 'MIMT refuse ce numéro (Canada et États-Unis seulement, jamais les numéros spéciaux ou surtaxés).'],
  call_in_progress: [409, 'MIMT_CALL_IN_PROGRESS', 'Un appel est déjà en cours sur votre ligne.'],
  account_restricted: [409, 'MIMT_ACCOUNT_RESTRICTED', 'Votre compte MIMT ne peut pas appeler pour le moment. Vérifiez-le dans MIMT.'],
  plan_required: [409, 'MIMT_PLAN_REQUIRED', 'Le forfait MIMT Affaires de la plateforme est requis pour le groupe Équipe.'],
  rate_limited: [429, 'MIMT_RATE_LIMITED', 'Trop de demandes à MIMT. Réessayez dans une minute.'],
  partner_suspended: [503, 'MIMT_SUSPENDED', 'Le compte partenaire MIMT de la plateforme est suspendu.'],
  invalid_api_key: [503, 'MIMT_KEY_REFUSED', 'MIMT refuse la clé MIMT Connect configurée sur le serveur.'],
  not_found: [503, 'MIMT_CONNECT_OFF', 'MIMT Connect n’est pas encore activé chez MIMT (PARTNERS=on).'],
};

function setting(env, name, pattern) {
  const value = env[name];
  return typeof value === 'string' && value.length <= 4096 && PRINTABLE.test(value) && pattern.test(value) ? value : null;
}

// BESOINAVOCAT_TEAM_MEMBERS: JSON array of "tenantId/subject" for the lawyers who answer the public line (Équipe).
export function teamMembers(raw) {
  try {
    if (typeof raw !== 'string' || !raw || raw.length > 16000) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list) || list.length > MAX_TEAM) return [];
    const parsed = list.map(item => {
      if (typeof item !== 'string') return null;
      const slash = item.indexOf('/');
      const tenantId = item.slice(0, slash), subject = item.slice(slash + 1);
      return slash > 0 && externalIdentifier(tenantId) && externalIdentifier(subject) ? { tenantId, subject } : null;
    });
    if (parsed.some(item => !item)) return [];
    return parsed;
  } catch { return []; }
}

export function normalizePhone(value) {
  text(value, 'Numéro de téléphone', 40);
  let digits = value.replace(/[\s().-]/gu, '');
  if (/^1[0-9]{10}$/u.test(digits)) digits = `+${digits}`;
  else if (/^[0-9]{10}$/u.test(digits)) digits = `+1${digits}`;
  if (!NANP.test(digits)) throw invalid('Entrez un numéro canadien ou américain à 10 chiffres.');
  return digits;
}
export const maskPhone = phone => (typeof phone === 'string' && phone.length >= 4 ? `•••-•••-${phone.slice(-4)}` : null);
export const formatPhone = phone => (typeof phone === 'string' && NANP.test(phone) ? `${phone.slice(2, 5)} ${phone.slice(5, 8)}-${phone.slice(8)}` : null);

// Opaque, stable MIMT member identifier for a portal identity: MIMT never learns the tenant or the subject.
export function memberExternalId(tenantId, subject) { return `ba-${sha256(`besoinavocat-mimt-member-v1\n${tenantId}\n${subject}`).slice(0, 32)}`; }

export function telephonyConfiguration(env = process.env) {
  const apiKey = setting(env, 'BESOINAVOCAT_MIMT_API_KEY', /^mimt_pk_[A-Za-z0-9_-]{16,200}$/u);
  const webhookSecret = setting(env, 'BESOINAVOCAT_MIMT_WEBHOOK_SECRET', /^whsec_[A-Za-z0-9_+/=-]{16,300}$/u);
  const apiBase = httpsOrigin(env.BESOINAVOCAT_MIMT_API_BASE || 'https://api.mimt.ca');
  const huntGroup = typeof env.BESOINAVOCAT_MIMT_HUNT_GROUP === 'string' && HUNT_KEY.test(env.BESOINAVOCAT_MIMT_HUNT_GROUP) ? env.BESOINAVOCAT_MIMT_HUNT_GROUP : 'trouver-un-avocat';
  let publicNumber = null;
  try { publicNumber = env.BESOINAVOCAT_MIMT_PUBLIC_NUMBER ? normalizePhone(env.BESOINAVOCAT_MIMT_PUBLIC_NUMBER) : null; } catch { publicNumber = null; }
  const ready = Boolean(apiKey && webhookSecret && apiBase);
  return Object.freeze({ ready, provider: 'mimt', apiKey: ready ? apiKey : null, webhookSecret: ready ? webhookSecret : null, apiBase,
    huntGroup, publicNumber, team: Object.freeze(teamMembers(env.BESOINAVOCAT_TEAM_MEMBERS)),
    missing: Object.freeze([!apiKey && 'BESOINAVOCAT_MIMT_API_KEY', !webhookSecret && 'BESOINAVOCAT_MIMT_WEBHOOK_SECRET', !apiBase && 'BESOINAVOCAT_MIMT_API_BASE'].filter(Boolean)) });
}

// X-MIMT-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>"> (docs/MIMT-CONNECT.md, « Vérifier la signature »).
export function mimtSignature(secret, timestamp, raw) { return createHmac('sha256', secret).update(`${timestamp}.`).update(raw).digest('hex'); }
export function verifyMimtSignature(raw, header, secret, nowMs = Date.now(), toleranceS = TOLERANCE_S) {
  const match = /^t=(\d{1,12}),v1=([0-9a-f]{64})$/u.exec(typeof header === 'string' ? header : '');
  if (!match || !secret) return false;
  if (Math.abs(nowMs / 1000 - Number(match[1])) > toleranceS) return false;
  const expected = Buffer.from(mimtSignature(secret, match[1], raw), 'hex');
  const given = Buffer.from(match[2], 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}
// Only links to MIMT's own pages are passed to the browser (choose a number, plan, number transfer, account link).
export function mimtLink(value) {
  if (typeof value !== 'string' || value.length > 500) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && (url.hostname === 'mimt.ca' || url.hostname.endsWith('.mimt.ca')) ? url.href : null;
  } catch { return null; }
}

export function createTelephony({ db, access, audit, store, config = telephonyConfiguration(), fetch: fetchImpl = globalThis.fetch, clock = Date.now }) {
  if (!db || typeof access !== 'function' || typeof audit !== 'function' || typeof fetchImpl !== 'function') throw new Error('Telephony requires db, access, audit and fetch');
  db.exec(`
    CREATE TABLE IF NOT EXISTS telephony_phones (
      tenantId TEXT NOT NULL, subject TEXT NOT NULL, phone TEXT NOT NULL, consentAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
      PRIMARY KEY(tenantId,subject)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS telephony_members (
      tenantId TEXT NOT NULL, subject TEXT NOT NULL, externalId TEXT NOT NULL UNIQUE, displayName TEXT NOT NULL, mobile TEXT,
      active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), linked INTEGER NOT NULL DEFAULT 0 CHECK(linked IN (0,1)),
      lineNumber TEXT, extension TEXT, numbers TEXT NOT NULL DEFAULT '[]', availability TEXT, subscription TEXT, portIns TEXT,
      links TEXT NOT NULL DEFAULT '{}', linkRequestExpiresAt TEXT, linkedAt TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
      syncedAt TEXT, PRIMARY KEY(tenantId,subject)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS telephony_calls (
      id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, caseId TEXT,
      kind TEXT NOT NULL CHECK(kind IN ('case_call','team_inbound','team_callback')),
      callerSubject TEXT, calleeSubject TEXT, answeredBy TEXT, externalNumber TEXT, via TEXT,
      mimtCallId TEXT UNIQUE, status TEXT NOT NULL, huntGroup TEXT,
      createdAt TEXT NOT NULL, ringingAt TEXT, answeredAt TEXT, endedAt TEXT,
      durationSeconds INTEGER, credits INTEGER, billing TEXT, recordingId TEXT, recordingSeconds INTEGER,
      timeEntryId TEXT, parentCallId TEXT
    ) STRICT;
    CREATE INDEX IF NOT EXISTS telephony_calls_case ON telephony_calls(tenantId,caseId,createdAt);
    CREATE INDEX IF NOT EXISTS telephony_calls_kind ON telephony_calls(kind,createdAt);
    CREATE TABLE IF NOT EXISTS telephony_events (
      eventKey TEXT PRIMARY KEY, callId TEXT NOT NULL, status TEXT NOT NULL, at TEXT NOT NULL, source TEXT NOT NULL, details TEXT NOT NULL
    ) STRICT;
    CREATE TRIGGER IF NOT EXISTS telephony_events_no_update BEFORE UPDATE ON telephony_events BEGIN SELECT RAISE(ABORT,'telephony_events_are_append_only'); END;
    CREATE TRIGGER IF NOT EXISTS telephony_events_no_delete BEFORE DELETE ON telephony_events BEGIN SELECT RAISE(ABORT,'telephony_events_are_append_only'); END;
    CREATE TABLE IF NOT EXISTS mimt_webhook_events (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, receivedAt TEXT NOT NULL, signedAt TEXT NOT NULL
    ) STRICT;
    CREATE TRIGGER IF NOT EXISTS mimt_webhook_events_no_update BEFORE UPDATE ON mimt_webhook_events BEGIN SELECT RAISE(ABORT,'mimt_webhook_events_are_append_only'); END;
    CREATE TRIGGER IF NOT EXISTS mimt_webhook_events_no_delete BEFORE DELETE ON mimt_webhook_events BEGIN SELECT RAISE(ABORT,'mimt_webhook_events_are_append_only'); END;
    CREATE TABLE IF NOT EXISTS telephony_state (key TEXT PRIMARY KEY, value TEXT NOT NULL, updatedAt TEXT NOT NULL) STRICT;
  `);
  const sql = query => db.prepare(query);
  const iso = () => new Date(clock()).toISOString();
  const transaction = fn => {
    db.exec('BEGIN IMMEDIATE');
    try { const value = fn(); db.exec('COMMIT'); return value; } catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  const requireReady = () => { if (!config.ready) throw notConfigured(); };
  const phoneRow = (tenantId, subject) => sql('SELECT * FROM telephony_phones WHERE tenantId=? AND subject=?').get(tenantId, subject);
  const memberRow = (tenantId, subject) => sql('SELECT * FROM telephony_members WHERE tenantId=? AND subject=?').get(tenantId, subject);
  const memberByExternal = externalId => sql('SELECT * FROM telephony_members WHERE externalId=?').get(externalId);
  const isTeam = user => config.team.some(m => m.tenantId === user.tenantId && m.subject === user.subject);
  const caseRole = (tenantId, caseId, subject) => sql('SELECT role FROM members WHERE tenantId=? AND caseId=? AND subject=?').get(tenantId, caseId, subject)?.role || null;
  const isLawyer = user => isTeam(user) || Boolean(sql("SELECT 1 FROM members WHERE tenantId=? AND subject=? AND role IN ('owner','lawyer') LIMIT 1").get(user.tenantId, user.subject));
  const state = key => sql('SELECT value FROM telephony_state WHERE key=?').get(key)?.value ?? null;
  const setState = (key, value) => sql('INSERT INTO telephony_state VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updatedAt=excluded.updatedAt').run(key, value, iso());
  const json = (value, fallback = null) => { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
  const when = value => (typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value)) ? new Date(Date.parse(value)).toISOString() : null);
  const count = value => (Number.isSafeInteger(value) && value >= 0 && value <= 10_000_000 ? value : null);
  const phoneOrNull = value => (typeof value === 'string' && E164.test(value) ? value : null);
  const clean = (value, max = 40) => (typeof value === 'string' && value.length <= max && /^[A-Za-z0-9 ._:-]*$/u.test(value) ? value : null);

  async function mimt(path, { method = 'GET', body, raw = false, absolute = null } = {}) {
    requireReady();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
    let response;
    try {
      response = await fetchImpl(absolute || `${config.apiBase}${path}`, {
        method, signal: controller.signal, redirect: 'error',
        headers: { ...(absolute ? {} : { Authorization: `Bearer ${config.apiKey}` }), Accept: raw ? 'audio/*' : 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (raw && response.ok) {
        const type = String(response.headers?.get?.('content-type') || 'audio/mpeg').split(';')[0].trim().toLowerCase();
        const bytes = Buffer.from(await response.arrayBuffer());
        if (!bytes.length || bytes.length > MAX_RECORDING_BYTES || !/^audio\/[a-z0-9.+-]{1,40}$/u.test(type)) throw providerError();
        return { bytes, type };
      }
      if (response.status === 204) return null;
      let payload = null;
      try { payload = await response.json(); } catch { payload = null; }
      if (!response.ok) {
        const known = MIMT_ERRORS[payload?.error] || (response.status === 404 && !payload?.error ? MIMT_ERRORS.not_found : null);
        const error = known ? new HttpError(...known) : providerError();
        const link = mimtLink(payload?.chooseNumberUrl) || mimtLink(payload?.planUrl);
        if (link) error.link = link;
        throw error;
      }
      return payload;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw providerError();
    } finally { clearTimeout(timer); }
  }

  // ---------- Public views ----------
  function publicMember(row, self) {
    if (!row) return null;
    const availability = json(row.availability), subscription = json(row.subscription), links = json(row.links, {});
    return { registered: true, active: Boolean(row.active), displayName: self ? row.displayName : null, mobile: maskPhone(row.mobile),
      linked: Boolean(row.linked), linkedAt: row.linkedAt, lineNumber: self ? formatPhone(row.lineNumber) || row.lineNumber : maskPhone(row.lineNumber),
      lineE164: self ? row.lineNumber : null, numbers: self ? json(row.numbers, []).map(n => ({ e164: n, label: formatPhone(n) || n })) : [],
      availability: availability ? { status: availability.status, effectiveStatus: availability.effectiveStatus, source: availability.source, until: availability.until } : null,
      subscription: subscription ? { plan: subscription.plan, status: subscription.status, canCall: Boolean(subscription.canCall), currentPeriodEnd: subscription.currentPeriodEnd } : null,
      portIns: self ? json(row.portIns, []) : [], links: self ? links : {},
      linkRequestExpiresAt: self ? row.linkRequestExpiresAt : null, syncedAt: row.syncedAt,
      readyToCall: Boolean(row.active && row.linked && row.lineNumber && (!subscription || subscription.canCall !== false)) };
  }
  function publicCall(row, viewer) {
    const own = viewer && [row.callerSubject, row.calleeSubject, row.answeredBy].includes(viewer.subject);
    return { id: row.id, caseId: row.caseId, kind: row.kind, callerSubject: row.callerSubject, calleeSubject: row.calleeSubject,
      answeredBy: row.answeredBy, status: row.status, via: row.via, huntGroup: row.huntGroup, hasRecording: Boolean(row.recordingId), recordingSeconds: row.recordingSeconds,
      externalNumber: row.kind === 'case_call' ? null : maskPhone(row.externalNumber),
      createdAt: row.createdAt, ringingAt: row.ringingAt, answeredAt: row.answeredAt, endedAt: row.endedAt,
      durationSeconds: row.durationSeconds, credits: row.credits, billing: row.billing,
      durationSource: row.durationSeconds === null ? null : 'mimt_signed_webhook',
      timeEntryId: row.timeEntryId, canAddTime: Boolean(own && row.caseId && row.durationSeconds > 0 && !row.timeEntryId) };
  }
  function event(callId, status, source, details = {}, key = null) {
    sql('INSERT OR IGNORE INTO telephony_events VALUES (?,?,?,?,?,?)').run(key || `${callId}:${source}:${status}:${randomUUID()}`, callId, status, iso(), source, JSON.stringify(details));
  }
  function systemAudit(row, action, details = {}) {
    if (!row.caseId) return;
    audit({ tenantId: row.tenantId, subject: 'system:mimt' }, row.caseId, action, row.id, details);
  }
  const callById = id => sql('SELECT * FROM telephony_calls WHERE id=?').get(id);

  // ---------- Overview and phone on file ----------
  function overview(user) {
    const member = memberRow(user.tenantId, user.subject);
    const phone = phoneRow(user.tenantId, user.subject);
    return { provider: 'mimt', configured: config.ready, missing: config.missing, publicNumber: config.publicNumber ? formatPhone(config.publicNumber) : null,
      phone: phone ? { phone: maskPhone(phone.phone), consentAt: phone.consentAt } : null,
      canBeMember: isLawyer(user), member: publicMember(member, true), team: isTeam(user) };
  }
  // Anyone (client included) may give the number where the case's lawyer may call them through MIMT, with consent.
  function savePhone(user, body) {
    fields(body, ['phone', 'consent'], ['phone', 'consent']);
    if (body.consent !== true) throw invalid('Cochez la case de consentement pour enregistrer votre numéro.');
    const phone = normalizePhone(body.phone);
    sql('INSERT INTO telephony_phones VALUES (?,?,?,?,?) ON CONFLICT(tenantId,subject) DO UPDATE SET phone=excluded.phone, consentAt=excluded.consentAt, updatedAt=excluded.updatedAt')
      .run(user.tenantId, user.subject, phone, iso(), iso());
    audit(user, null, 'telephony.phone_saved', null, { phone: maskPhone(phone) });
    return overview(user);
  }
  function removePhone(user) {
    sql('DELETE FROM telephony_phones WHERE tenantId=? AND subject=?').run(user.tenantId, user.subject);
    audit(user, null, 'telephony.phone_removed', null, {});
    return overview(user);
  }

  // ---------- Lawyer as a MIMT Connect member ----------
  function requireLawyer(user) { if (!isLawyer(user)) throw new HttpError(403, 'LAWYERS_ONLY', 'La téléphonie MIMT est réservée aux avocats et à l’équipe.'); }
  function requireMember(user) {
    const row = memberRow(user.tenantId, user.subject);
    if (!row) throw new HttpError(409, 'MIMT_MEMBER_REQUIRED', 'Activez d’abord la téléphonie MIMT dans Réglages, téléphone.');
    return row;
  }
  function applyMember(row, dto) {
    if (!dto || typeof dto !== 'object') return;
    const links = { ...json(row.links, {}) };
    const link = mimtLink(dto.chooseNumberUrl);
    if (link) links.chooseNumberUrl = link;
    sql('UPDATE telephony_members SET active=?, linked=?, lineNumber=?, extension=COALESCE(?,extension), links=?, updatedAt=? WHERE externalId=?')
      .run(dto.active === false ? 0 : 1, dto.linked ? 1 : 0, phoneOrNull(dto.lineNumber), clean(dto.extension, 10), JSON.stringify(links), iso(), row.externalId);
  }
  async function registerMember(user, body) {
    requireReady(); requireLawyer(user);
    fields(body, ['displayName', 'mobile'], ['displayName']);
    const displayName = text(body.displayName, 'Nom affiché', 80).trim();
    if (!displayName) throw invalid('Entrez le nom à afficher chez MIMT.');
    const mobile = body.mobile ? normalizePhone(body.mobile) : null;
    const externalId = memberExternalId(user.tenantId, user.subject);
    const dto = await mimt(`/v1/partner/members/${externalId}`, { method: 'PUT', body: { name: displayName, phone: mobile, language: 'fr', active: true } });
    sql(`INSERT INTO telephony_members (tenantId,subject,externalId,displayName,mobile,active,createdAt,updatedAt) VALUES (?,?,?,?,?,1,?,?)
      ON CONFLICT(tenantId,subject) DO UPDATE SET displayName=excluded.displayName, mobile=excluded.mobile, active=1, updatedAt=excluded.updatedAt`)
      .run(user.tenantId, user.subject, externalId, displayName, mobile, iso(), iso());
    applyMember(memberRow(user.tenantId, user.subject), dto);
    audit(user, null, 'telephony.member_registered', null, { mobile: maskPhone(mobile) });
    if (isTeam(user)) await syncHuntGroup(user).catch(() => {});
    return overview(user);
  }
  async function requestLink(user) {
    requireReady(); requireLawyer(user);
    const row = requireMember(user);
    const created = await mimt(`/v1/partner/members/${row.externalId}/link-requests`, { method: 'POST' });
    const url = mimtLink(created?.url);
    const code = typeof created?.code === 'string' && /^[A-Z2-9]{6,12}$/u.test(created.code) ? created.code : null;
    if (!url || !code) throw providerError();
    const expiresAt = when(created.expiresAt);
    sql('UPDATE telephony_members SET linkRequestExpiresAt=?, updatedAt=? WHERE externalId=?').run(expiresAt, iso(), row.externalId);
    audit(user, null, 'telephony.link_requested', null, { expiresAt });
    // The one-time code is shown to the lawyer only: it is never stored or written to the audit trail.
    return { code, url, expiresAt };
  }
  async function refreshMember(user) {
    requireReady(); requireLawyer(user);
    const row = requireMember(user);
    const base = `/v1/partner/members/${row.externalId}`;
    const dto = await mimt(base);
    applyMember(row, dto);
    const updates = {};
    const availability = await mimt(`${base}/availability`).catch(() => null);
    if (availability && AVAILABILITY.includes(availability.effectiveStatus)) {
      updates.availability = JSON.stringify({ status: AVAILABILITY.includes(availability.status) ? availability.status : null, effectiveStatus: availability.effectiveStatus,
        source: clean(availability.source, 20), until: when(availability.until) });
    }
    const links = { ...json(memberRow(user.tenantId, user.subject).links, {}) };
    if (dto?.linked) {
      const numbers = await mimt(`${base}/numbers`).catch(() => null);
      if (numbers) {
        updates.numbers = JSON.stringify((Array.isArray(numbers.numbers) ? numbers.numbers : []).map(n => phoneOrNull(n?.e164)).filter(Boolean).slice(0, 20));
        const link = mimtLink(numbers.chooseNumberUrl); if (link) links.chooseNumberUrl = link;
      }
      const subscription = await mimt(`${base}/subscription`).catch(() => null);
      if (subscription) {
        updates.subscription = JSON.stringify({ plan: clean(subscription.plan, 30), status: clean(subscription.status, 20), canCall: subscription.canCall === true, currentPeriodEnd: when(subscription.currentPeriodEnd) });
        const link = mimtLink(subscription.planUrl); if (link) links.planUrl = link;
      }
      const ports = await mimt(`${base}/port-ins`).catch(() => null);
      if (ports) {
        updates.portIns = JSON.stringify((Array.isArray(ports.portIns) ? ports.portIns : []).slice(0, 10).map(p => ({ e164: phoneOrNull(p?.e164), status: clean(p?.status, 40), expectedDate: when(p?.expectedDate), updatedAt: when(p?.updatedAt) })));
        const link = mimtLink(ports.portUrl); if (link) links.portUrl = link;
      }
    }
    sql(`UPDATE telephony_members SET numbers=COALESCE(?,numbers), availability=COALESCE(?,availability), subscription=COALESCE(?,subscription),
      portIns=COALESCE(?,portIns), links=?, syncedAt=?, updatedAt=? WHERE externalId=?`)
      .run(updates.numbers ?? null, updates.availability ?? null, updates.subscription ?? null, updates.portIns ?? null, JSON.stringify(links), iso(), iso(), row.externalId);
    return overview(user);
  }
  async function chooseLine(user, body) {
    requireReady(); requireLawyer(user);
    fields(body, ['e164'], ['e164']);
    const e164 = body.e164 === null ? null : normalizePhone(body.e164);
    const row = requireMember(user);
    const result = await mimt(`/v1/partner/members/${row.externalId}/number`, { method: 'PUT', body: { e164 } });
    sql('UPDATE telephony_members SET lineNumber=?, updatedAt=? WHERE externalId=?').run(phoneOrNull(result?.current) ?? e164, iso(), row.externalId);
    audit(user, null, 'telephony.line_chosen', null, { line: maskPhone(e164) });
    return overview(user);
  }
  async function setAvailability(user, body) {
    requireReady(); requireLawyer(user);
    fields(body, ['status', 'until'], ['status']);
    if (!AVAILABILITY.includes(body.status)) throw invalid('Disponibilité : disponible, occupé ou hors ligne.');
    let until = null;
    if (body.until !== undefined && body.until !== null) {
      until = when(body.until);
      if (!until || Date.parse(until) <= clock() || Date.parse(until) > clock() + 365 * 86400000) throw invalid('Date de fin non valide (dans le futur, au plus un an).');
    }
    const row = requireMember(user);
    const result = await mimt(`/v1/partner/members/${row.externalId}/availability`, { method: 'PUT', body: { status: body.status, until } });
    const effective = AVAILABILITY.includes(result?.effectiveStatus) ? result.effectiveStatus : body.status;
    sql('UPDATE telephony_members SET availability=?, updatedAt=? WHERE externalId=?')
      .run(JSON.stringify({ status: body.status, effectiveStatus: effective, source: clean(result?.source, 20) || 'partner', until }), iso(), row.externalId);
    audit(user, null, 'telephony.availability_changed', null, { status: body.status, effectiveStatus: effective, until });
    return overview(user);
  }
  async function unlink(user) {
    requireReady(); requireLawyer(user);
    const row = requireMember(user);
    await mimt(`/v1/partner/members/${row.externalId}/link`, { method: 'DELETE' });
    sql('UPDATE telephony_members SET linked=0, lineNumber=NULL, numbers=\'[]\', subscription=NULL, portIns=NULL, linkedAt=NULL, updatedAt=? WHERE externalId=?').run(iso(), row.externalId);
    audit(user, null, 'telephony.member_unlinked', null, { by: 'partner' });
    return overview(user);
  }
  async function deactivate(user) {
    requireReady(); requireLawyer(user);
    const row = requireMember(user);
    await mimt(`/v1/partner/members/${row.externalId}`, { method: 'DELETE' });
    sql('UPDATE telephony_members SET active=0, updatedAt=? WHERE externalId=?').run(iso(), row.externalId);
    audit(user, null, 'telephony.member_deactivated', null, {});
    if (isTeam(user)) await syncHuntGroup(user).catch(() => {});
    return overview(user);
  }

  // ---------- Case calls (click-to-call through MIMT) ----------
  function reachableNumber(tenantId, subject) {
    return phoneRow(tenantId, subject)?.phone || memberRow(tenantId, subject)?.lineNumber || null;
  }
  function participants(user, caseId) {
    access(user, caseId);
    const role = caseRole(user.tenantId, caseId, user.subject);
    const self = memberRow(user.tenantId, user.subject);
    const rows = sql('SELECT subject, role FROM members WHERE tenantId=? AND caseId=? ORDER BY role, subject').all(user.tenantId, caseId);
    return { configured: config.ready, canCall: MANAGERS.includes(role), selfReady: Boolean(publicMember(self, true)?.readyToCall),
      participants: rows.map(row => ({ subject: row.subject, role: row.role, self: row.subject === user.subject, reachable: Boolean(reachableNumber(user.tenantId, row.subject)) })) };
  }
  function listCalls(user, caseId) {
    access(user, caseId);
    return { calls: sql('SELECT * FROM telephony_calls WHERE tenantId=? AND caseId=? ORDER BY createdAt DESC LIMIT 100').all(user.tenantId, caseId).map(row => publicCall(row, user)), configured: config.ready };
  }
  function rateLimit(user) {
    const since = new Date(clock() - 3600 * 1000).toISOString();
    const n = sql("SELECT COUNT(*) AS n FROM telephony_calls WHERE tenantId=? AND callerSubject=? AND createdAt>? AND kind<>'team_inbound'").get(user.tenantId, user.subject, since).n;
    if (n >= MAX_CALLS_PER_HOUR) throw new HttpError(429, 'TOO_MANY_CALLS', 'Limite d’appels atteinte pour l’heure. Réessayez plus tard.');
  }
  function viaOf(body) {
    if (body.via === undefined) return 'app';
    if (body.via !== 'app' && body.via !== 'mobile') throw invalid('Sonnerie : application MIMT ou cellulaire.');
    return body.via;
  }
  async function dial(row, member, to, via) {
    const result = await mimt(`/v1/partner/members/${member.externalId}/calls`, { method: 'POST', body: { to, reference: row.id, via } }).catch(error => {
      sql("UPDATE telephony_calls SET status='failed', endedAt=? WHERE id=?").run(iso(), row.id);
      event(row.id, 'failed', 'api', { reason: error.code || 'provider_error' });
      throw error;
    });
    const callId = typeof result?.callId === 'string' && MIMT_ID.test(result.callId) ? result.callId : null;
    if (!callId) throw providerError();
    sql("UPDATE telephony_calls SET mimtCallId=COALESCE(mimtCallId,?), status=CASE WHEN status='queued' THEN 'initiated' ELSE status END WHERE id=?").run(callId, row.id);
    event(row.id, 'initiated', 'api', { via }, `${row.id}:initiated`);
  }
  async function startCaseCall(user, caseId, body) {
    requireReady();
    access(user, caseId, MANAGERS);
    fields(body, ['calleeSubject', 'via'], ['calleeSubject']);
    if (!externalIdentifier(body.calleeSubject) || body.calleeSubject === user.subject) throw invalid('Choisissez une autre personne du dossier.');
    const via = viaOf(body);
    if (!caseRole(user.tenantId, caseId, body.calleeSubject)) throw invalid('Cette personne ne fait pas partie du dossier.');
    const member = requireMember(user);
    const to = reachableNumber(user.tenantId, body.calleeSubject);
    if (!to) throw new HttpError(409, 'CALLEE_UNREACHABLE', 'Cette personne n’a pas encore donné de numéro pour être appelée.');
    rateLimit(user);
    const row = { id: randomUUID(), tenantId: user.tenantId, caseId };
    sql("INSERT INTO telephony_calls (id,tenantId,caseId,kind,callerSubject,calleeSubject,via,status,createdAt) VALUES (?,?,?,'case_call',?,?,?,'queued',?)")
      .run(row.id, user.tenantId, caseId, user.subject, body.calleeSubject, via, iso());
    audit(user, caseId, 'call.requested', row.id, { calleeSubject: body.calleeSubject, via, provider: 'mimt' });
    await dial(row, member, to, via);
    return { call: publicCall(callById(row.id), user) };
  }
  function addCallTime(user, caseId, callId) {
    access(user, caseId); identifier(callId);
    if (!store) throw notConfigured();
    // Synchronous from the check to the update (no await): the store's own transaction records the time entry.
    const row = sql('SELECT * FROM telephony_calls WHERE id=? AND tenantId=? AND caseId=?').get(callId, user.tenantId, caseId);
    if (!row) throw missing();
    if (!publicCall(row, user).canAddTime) throw new HttpError(409, 'TIME_NOT_ALLOWED', 'Cet appel ne peut pas être ajouté au temps.');
    const minutes = Math.min(1440, Math.max(1, Math.ceil(row.durationSeconds / 60)));
    const at = new Intl.DateTimeFormat('fr-CA', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Toronto' }).format(new Date(row.answeredAt || row.createdAt));
    const entry = store.submitTime(user, caseId, { description: `Appel téléphonique MIMT du ${at} (durée attestée par MIMT : ${row.durationSeconds} s)`, minutes });
    sql('UPDATE telephony_calls SET timeEntryId=? WHERE id=? AND timeEntryId IS NULL').run(entry.id, row.id);
    return { timeEntry: entry, call: publicCall(callById(row.id), user) };
  }
  async function fetchRecording(user, row) {
    if (!row?.recordingId) throw missing();
    const fresh = await mimt(`/v1/partner/recordings/${encodeURIComponent(row.recordingId)}`);
    const link = typeof fresh?.url === 'string' ? fresh.url : '';
    let sameOrigin = false;
    try { sameOrigin = new URL(link).origin === config.apiBase; } catch { sameOrigin = false; }
    if (!sameOrigin) throw providerError();
    const audio = await mimt(null, { raw: true, absolute: link });
    if (row.caseId) audit(user, row.caseId, 'call.recording_listened', row.id, { provider: 'mimt' });
    else audit(user, null, 'telephony.team_recording_listened', row.id, {});
    return audio;
  }
  async function recording(user, caseId, callId) {
    access(user, caseId, MANAGERS); identifier(callId);
    return fetchRecording(user, sql('SELECT * FROM telephony_calls WHERE id=? AND tenantId=? AND caseId=?').get(callId, user.tenantId, caseId));
  }

  // ---------- Équipe (MIMT hunt group on the public number) ----------
  function teamOnly(user) { if (!isTeam(user)) throw new HttpError(404, 'NOT_FOUND', 'Ressource introuvable.'); }
  async function syncHuntGroup(user) {
    teamOnly(user); requireReady();
    const members = config.team.map(m => memberRow(m.tenantId, m.subject)).filter(row => row?.active).map(row => row.externalId).slice(0, MAX_TEAM);
    const result = await mimt(`/v1/partner/hunt-groups/${config.huntGroup}`, { method: 'PUT', body: { name: 'Équipe BesoinAvocat', members, strategy: 'simultaneous',
      ringTimeoutS: RING_SECONDS, fallback: 'voicemail', ...(config.publicNumber ? { did: config.publicNumber } : {}) } });
    setState('huntGroup', JSON.stringify({ members: members.length, syncedAt: iso(), did: phoneOrNull(result?.did) || config.publicNumber }));
    audit(user, null, 'telephony.team_synced', null, { members: members.length });
    return teamConsole(user);
  }
  function teamConsole(user) {
    teamOnly(user);
    const members = config.team.map(m => {
      const row = memberRow(m.tenantId, m.subject);
      const pub = publicMember(row, false);
      return { subject: m.subject, self: m.subject === user.subject && m.tenantId === user.tenantId, registered: Boolean(row), active: Boolean(row?.active),
        linked: Boolean(row?.linked), mobile: pub?.mobile ?? null, availability: pub?.availability?.effectiveStatus ?? (row ? 'available' : null) };
    });
    const calls = sql("SELECT * FROM telephony_calls WHERE kind IN ('team_inbound','team_callback') ORDER BY createdAt DESC LIMIT 50").all();
    return { configured: config.ready, huntGroup: config.huntGroup, publicNumber: config.publicNumber ? formatPhone(config.publicNumber) : null,
      group: json(state('huntGroup')), credits: json(state('credits')), lastSync: state('callsSince'),
      members, availableNow: members.filter(m => m.active && m.availability === 'available').length,
      calls: calls.map(row => publicCall(row, user)) };
  }
  async function teamCallback(user, callId) {
    teamOnly(user); requireReady(); identifier(callId);
    const original = sql("SELECT * FROM telephony_calls WHERE id=? AND kind='team_inbound'").get(callId);
    if (!original?.externalNumber || !NANP.test(original.externalNumber)) throw missing();
    const member = requireMember(user);
    rateLimit(user);
    const row = { id: randomUUID(), tenantId: user.tenantId, caseId: null };
    sql("INSERT INTO telephony_calls (id,tenantId,caseId,kind,callerSubject,externalNumber,via,status,createdAt,parentCallId) VALUES (?,?,NULL,'team_callback',?,?,'app','queued',?,?)")
      .run(row.id, user.tenantId, user.subject, original.externalNumber, iso(), original.id);
    audit(user, null, 'telephony.team_callback', row.id, { parentCallId: original.id });
    await dial(row, member, original.externalNumber, 'app');
    return { call: publicCall(callById(row.id), user) };
  }
  async function teamRecording(user, callId) {
    teamOnly(user); identifier(callId);
    return fetchRecording(user, sql("SELECT * FROM telephony_calls WHERE id=? AND kind IN ('team_inbound','team_callback')").get(callId));
  }
  async function refreshCredits(user) {
    teamOnly(user);
    const credits = await mimt('/v1/partner/credits');
    setState('credits', JSON.stringify({ balance: count(credits?.balance), creditPerMinute: count(credits?.creditPerMinute), at: iso() }));
    return teamConsole(user);
  }
  // Reconciliation with GET /v1/partner/calls (in case a webhook was lost): fills in what the webhooks did not bring.
  async function syncCalls(user) {
    teamOnly(user); requireReady();
    let since = state('callsSince') || new Date(clock() - 7 * 86400000).toISOString();
    for (let page = 0; page < 10; page++) {
      const result = await mimt(`/v1/partner/calls?since=${encodeURIComponent(since)}&limit=200`);
      const calls = Array.isArray(result?.calls) ? result.calls : [];
      transaction(() => { for (const call of calls) reconcile(call); });
      const next = when(result?.nextSince);
      const last = calls.length ? when(calls.at(-1)?.startedAt) : null;
      if (last) since = last;
      if (!next) break;
      since = next;
    }
    setState('callsSince', since);
    return teamConsole(user);
  }
  function reconcile(call) {
    const callId = typeof call?.id === 'string' && MIMT_ID.test(call.id) ? call.id : null;
    if (!callId) return;
    let row = sql('SELECT * FROM telephony_calls WHERE mimtCallId=?').get(callId);
    if (!row && typeof call.reference === 'string') {
      row = callById(call.reference);
      if (row && row.mimtCallId && row.mimtCallId !== callId) row = null;
      if (row) sql('UPDATE telephony_calls SET mimtCallId=? WHERE id=?').run(callId, row.id);
    }
    if (!row) {
      if (call.direction !== 'inbound') return;
      row = insertInbound(callId, call.from, call.huntGroup, when(call.startedAt));
    }
    const answeredBy = typeof call.externalId === 'string' ? memberByExternal(call.externalId)?.subject ?? null : null;
    const ended = when(call.endedAt);
    sql(`UPDATE telephony_calls SET answeredBy=COALESCE(answeredBy,?), answeredAt=COALESCE(answeredAt,?), endedAt=COALESCE(endedAt,?),
      durationSeconds=COALESCE(?,durationSeconds), credits=COALESCE(?,credits), billing=COALESCE(?,billing),
      status=CASE WHEN ? IS NULL THEN status WHEN ? IS NOT NULL OR answeredAt IS NOT NULL THEN 'completed' ELSE 'missed' END WHERE id=?`)
      .run(answeredBy, when(call.answeredAt), ended, count(call.durationS), count(call.credits), clean(call.billing, 20), ended, when(call.answeredAt), row.id);
    event(row.id, 'reconciled', 'mimt-api', { billing: clean(call.billing, 20) }, `${callId}:reconciled:${ended || 'open'}`);
  }
  function insertInbound(callId, from, huntGroup, at) {
    const id = randomUUID();
    const tenantId = config.team[0]?.tenantId || 'public';
    sql("INSERT INTO telephony_calls (id,tenantId,caseId,kind,externalNumber,mimtCallId,huntGroup,status,createdAt,ringingAt) VALUES (?,?,NULL,'team_inbound',?,?,?,'ringing',?,?)")
      .run(id, tenantId, phoneOrNull(from), callId, clean(huntGroup, 60), at || iso(), at || iso());
    return callById(id);
  }

  // ---------- Signed MIMT webhooks (no session) ----------
  function webhook({ headers, raw }) {
    if (!config.ready) throw notConfigured();
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/iu.test(headers['content-type'] || '')) throw new HttpError(415, 'JSON_REQUIRED', 'Un corps JSON est requis.');
    if (!verifyMimtSignature(raw, headers['x-mimt-signature'], config.webhookSecret, clock())) throw badSignature();
    let body;
    try { body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)); } catch { throw invalid('Notification illisible.'); }
    const id = typeof body?.id === 'string' && MIMT_ID.test(body.id) ? body.id : null;
    const type = typeof body?.type === 'string' && /^[a-z_.]{3,60}$/u.test(body.type) ? body.type : null;
    const data = body?.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data : null;
    if (!id || !type || !data) throw invalid('Notification illisible.');
    const signedAt = /t=(\d+)/u.exec(headers['x-mimt-signature'])[1];
    return transaction(() => {
      if (!sql('INSERT OR IGNORE INTO mimt_webhook_events VALUES (?,?,?,?)').run(id, type, iso(), new Date(Number(signedAt) * 1000).toISOString()).changes) return { status: 200, body: { received: true, duplicate: true } };
      if (type.startsWith('call.') || type === 'recording.ready') callEvent(id, type, data);
      else if (type.startsWith('member.')) memberEvent(type, data);
      return { status: 200, body: { received: true } };
    });
  }
  function callRowFor(data) {
    const callId = typeof data.call_id === 'string' && MIMT_ID.test(data.call_id) ? data.call_id : null;
    if (!callId) return { callId: null, row: null };
    let row = sql('SELECT * FROM telephony_calls WHERE mimtCallId=?').get(callId);
    if (!row && typeof data.reference === 'string' && data.reference.length <= 100) {
      const ref = callById(data.reference);
      if (ref && !ref.mimtCallId) { sql('UPDATE telephony_calls SET mimtCallId=? WHERE id=?').run(callId, ref.id); row = callById(ref.id); }
    }
    return { callId, row };
  }
  function callEvent(eventId, type, data) {
    let { callId, row } = callRowFor(data);
    if (!callId) return;
    if (!row) {
      if (type !== 'call.ringing' || data.direction === 'outbound') return;
      row = insertInbound(callId, data.from, data.hunt_group, when(data.started_at));
      event(row.id, 'inbound', 'mimt', { from: maskPhone(phoneOrNull(data.from)), huntGroup: clean(data.hunt_group, 60) }, `mimt:${eventId}`);
      return;
    }
    const memberSubject = typeof data.member_external_id === 'string' ? memberByExternal(data.member_external_id)?.subject ?? null : null;
    if (type === 'call.ringing') {
      sql("UPDATE telephony_calls SET ringingAt=COALESCE(ringingAt,?), status=CASE WHEN status IN ('queued','initiated') THEN 'ringing' ELSE status END WHERE id=?").run(when(data.started_at) || iso(), row.id);
      event(row.id, 'ringing', 'mimt', {}, `mimt:${eventId}`);
    } else if (type === 'call.answered') {
      sql("UPDATE telephony_calls SET answeredAt=COALESCE(answeredAt,?), answeredBy=COALESCE(answeredBy,?), status=CASE WHEN status IN ('completed','missed','failed') THEN status ELSE 'answered' END WHERE id=?")
        .run(when(data.answered_at) || iso(), row.kind === 'team_inbound' ? memberSubject : null, row.id);
      event(row.id, 'answered', 'mimt', { answeredBy: row.kind === 'team_inbound' ? memberSubject : null }, `mimt:${eventId}`);
      systemAudit(row, 'call.answered', { provider: 'mimt' });
    } else if (type === 'call.completed') {
      const duration = count(data.duration_s);
      const answered = Boolean(row.answeredAt || when(data.answered_at) || duration > 0);
      sql(`UPDATE telephony_calls SET endedAt=COALESCE(?,endedAt,?), answeredAt=COALESCE(answeredAt,?), durationSeconds=COALESCE(?,durationSeconds),
        credits=COALESCE(?,credits), billing=COALESCE(?,billing), status=? WHERE id=?`)
        .run(when(data.ended_at), iso(), when(data.answered_at), duration, count(data.credits), clean(data.billing, 20), answered ? 'completed' : 'missed', row.id);
      event(row.id, answered ? 'completed' : 'missed', 'mimt', { durationSeconds: duration, credits: count(data.credits), billing: clean(data.billing, 20), unbilledCredits: count(data.unbilled_credits) }, `mimt:${eventId}`);
      systemAudit(row, 'call.ended', { status: answered ? 'completed' : 'missed', durationSeconds: duration, durationSource: 'mimt_signed_webhook' });
    } else if (type === 'recording.ready') {
      const recordingId = typeof data.recording_id === 'string' && MIMT_ID.test(data.recording_id) ? data.recording_id : null;
      if (!recordingId) return;
      sql('UPDATE telephony_calls SET recordingId=?, recordingSeconds=? WHERE id=?').run(recordingId, count(data.duration_s), row.id);
      event(row.id, 'recording-ready', 'mimt', { seconds: count(data.duration_s) }, `mimt:${eventId}`);
      systemAudit(row, 'call.recording_ready', { recordingSeconds: count(data.duration_s) });
    }
  }
  function memberEvent(type, data) {
    const row = typeof data.member_external_id === 'string' ? memberByExternal(data.member_external_id) : null;
    if (!row) return;
    const actor = { tenantId: row.tenantId, subject: 'system:mimt' };
    if (type === 'member.linked') {
      sql('UPDATE telephony_members SET linked=1, linkedAt=?, linkRequestExpiresAt=NULL, updatedAt=? WHERE externalId=?').run(when(data.linked_at) || iso(), iso(), row.externalId);
      audit(actor, null, 'telephony.member_linked', null, { member: row.subject });
    } else if (type === 'member.unlinked') {
      sql('UPDATE telephony_members SET linked=0, lineNumber=NULL, numbers=\'[]\', subscription=NULL, portIns=NULL, linkedAt=NULL, updatedAt=? WHERE externalId=?').run(iso(), row.externalId);
      audit(actor, null, 'telephony.member_unlinked', null, { member: row.subject, by: data.by === 'user' ? 'user' : 'partner' });
    } else if (type === 'member.number_changed') {
      sql('UPDATE telephony_members SET lineNumber=?, updatedAt=? WHERE externalId=?').run(phoneOrNull(data.number), iso(), row.externalId);
    } else if (type === 'member.subscription_changed') {
      sql('UPDATE telephony_members SET subscription=?, updatedAt=? WHERE externalId=?')
        .run(JSON.stringify({ plan: clean(data.plan, 30), status: clean(data.status, 20), canCall: data.can_call === true, currentPeriodEnd: when(data.current_period_end) }), iso(), row.externalId);
    } else if (type === 'member.availability_changed') {
      const current = json(row.availability, {});
      sql('UPDATE telephony_members SET availability=?, updatedAt=? WHERE externalId=?')
        .run(JSON.stringify({ status: AVAILABILITY.includes(data.partner_status) ? data.partner_status : current.status ?? null,
          effectiveStatus: AVAILABILITY.includes(data.effective_status) ? data.effective_status : current.effectiveStatus ?? null,
          source: clean(data.source, 20), until: when(data.until) }), iso(), row.externalId);
    } else if (type === 'member.port_in_updated') {
      const list = json(row.portIns, []).filter(p => p.e164 !== phoneOrNull(data.e164));
      list.unshift({ e164: phoneOrNull(data.e164), status: clean(data.status, 40), expectedDate: when(data.expected_date), updatedAt: when(data.updated_at) });
      sql('UPDATE telephony_members SET portIns=?, updatedAt=? WHERE externalId=?').run(JSON.stringify(list.slice(0, 10)), iso(), row.externalId);
    }
  }

  function callsForDocument(user, caseId) {
    access(user, caseId);
    return sql('SELECT * FROM telephony_calls WHERE tenantId=? AND caseId=? ORDER BY createdAt').all(user.tenantId, caseId).map(row => publicCall(row, user));
  }
  function callEvents(user, caseId, callId) {
    access(user, caseId); identifier(callId);
    const row = sql('SELECT * FROM telephony_calls WHERE id=? AND tenantId=? AND caseId=?').get(callId, user.tenantId, caseId);
    if (!row) throw missing();
    return { call: publicCall(row, user), events: sql('SELECT status, at, source, details FROM telephony_events WHERE callId=? ORDER BY at, rowid').all(row.id).map(e => ({ ...e, details: json(e.details, {}) })) };
  }

  return Object.freeze({ configured: () => config.ready, overview, savePhone, removePhone,
    registerMember, requestLink, refreshMember, chooseLine, setAvailability, unlink, deactivate,
    participants, listCalls, startCaseCall, addCallTime, recording,
    teamConsole, syncHuntGroup, teamCallback, teamRecording, refreshCredits, syncCalls,
    webhook, callsForDocument, callEvents, isTeam });
}
