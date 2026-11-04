#!/usr/bin/env node
// Read-only deploy readiness report for the portal container: `node tools/deploy-readiness.mjs`.
// It reads the same environment and /data files as the server and says, line by line, what is ready,
// what is missing and why the cases or the login would not appear. It never prints a secret value,
// never writes, and opens every database read-only. Exit code 1 when a blocking item fails.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';

function httpsOrigin(value) {
  if (typeof value !== 'string' || value.length > 300) return null;
  try { const url = new URL(value); return url.protocol === 'https:' && url.origin === value && !url.username && !url.password ? value : null; }
  catch { return null; }
}

function mode(file) { return statSync(file).mode & 0o777; }
const octal = value => '0' + value.toString(8);

function readOnly(file) { return new DatabaseSync(file, { readOnly: true }); }

export function readiness(env = process.env) {
  const items = [];
  const add = (level, area, message) => items.push({ level, area, message });

  // Runtime
  if (env.NODE_ENV !== 'production') add('warn', 'runtime', 'NODE_ENV is not "production": sessions are not required to persist.');
  if (env.BESOINAVOCAT_TRUST_PROXY !== '1') add('warn', 'runtime', 'BESOINAVOCAT_TRUST_PROXY is not 1: behind the Coolify proxy every visitor shares one rate limit.');
  const appOrigin = httpsOrigin(env.APP_ORIGIN);
  if (appOrigin) add('ok', 'runtime', `APP_ORIGIN is ${appOrigin}.`);
  else add('fail', 'runtime', 'APP_ORIGIN must be the portal https origin, for example https://portail.besoinavocat.ca (no path, no trailing slash).');

  // Cases: the corpus database and its files.
  const dbPath = env.DATABASE_PATH, blobDir = env.BLOB_DIR;
  if (!dbPath || !existsSync(dbPath)) add('fail', 'cases', `Case database not found at DATABASE_PATH (${dbPath || 'unset'}).`);
  else {
    try {
      const db = readOnly(dbPath);
      try {
        const count = sql => { try { return db.prepare(sql).get().n; } catch { return null; } };
        const cases = count('SELECT count(*) AS n FROM cases'), members = count('SELECT count(*) AS n FROM members'),
          documents = count('SELECT count(*) AS n FROM documents');
        if (cases === null) add('fail', 'cases', `${dbPath} has no cases table: wrong file?`);
        else add(cases > 0 ? 'ok' : 'warn', 'cases', `${cases} case(s), ${documents ?? 0} document(s), ${members ?? 0} membership(s) in ${dbPath}.`);
      } finally { db.close(); }
    } catch { add('fail', 'cases', `Case database at ${dbPath} cannot be opened read-only.`); }
  }
  if (!blobDir || !existsSync(blobDir)) add('fail', 'cases', `Document storage not found at BLOB_DIR (${blobDir || 'unset'}).`);

  // Login: Supabase identity, grants, persistent sessions bound to (Supabase URL, APP_ORIGIN).
  const supabaseUrl = httpsOrigin(env.TAKATAK_SUPABASE_URL);
  if (!supabaseUrl) add('fail', 'login', 'TAKATAK_SUPABASE_URL is missing or not an https origin: nobody can sign in.');
  if (!env.TAKATAK_SUPABASE_PUBLISHABLE_KEY) add('fail', 'login', 'TAKATAK_SUPABASE_PUBLISHABLE_KEY is missing (publishable key only, never service_role).');
  if (env.BESOINAVOCAT_EMAIL_OTP_ENABLED === 'true') add('ok', 'login', 'Email login code is enabled. Delivery still depends on the Supabase SMTP sender (domain verified, recipient allowed).');
  else add('warn', 'login', 'BESOINAVOCAT_EMAIL_OTP_ENABLED is not true: only the password form is offered.');

  const grantsFile = env.BESOINAVOCAT_GRANTS_FILE;
  if (!grantsFile || !existsSync(grantsFile)) add('fail', 'login', `Access grants not found at BESOINAVOCAT_GRANTS_FILE (${grantsFile || 'unset'}): a signed-in person sees no case.`);
  else {
    try {
      const payload = JSON.parse(readFileSync(grantsFile, 'utf8'));
      const count = payload && typeof payload.grants === 'object' && !Array.isArray(payload.grants) ? Object.keys(payload.grants).length : 0;
      add(count > 0 ? 'ok' : 'fail', 'login', `${count} person(s) granted access in ${grantsFile}.`);
      if (mode(grantsFile) & 0o077) add('warn', 'login', `${grantsFile} is ${octal(mode(grantsFile))}; expected 0600.`);
    } catch { add('fail', 'login', `${grantsFile} is not valid JSON.`); }
  }

  const keyFile = env.BESOINAVOCAT_SESSION_KEY_FILE, sessionDb = env.BESOINAVOCAT_SESSION_DB_PATH;
  let fingerprint = null;
  if (!keyFile || !existsSync(keyFile)) add('fail', 'login', `Session key not found at BESOINAVOCAT_SESSION_KEY_FILE (${keyFile || 'unset'}). Create it once (docs/COOLIFY.md); never recreate it.`);
  else {
    const bytes = readFileSync(keyFile);
    if (bytes.length !== 32) add('fail', 'login', `Session key at ${keyFile} is ${bytes.length} bytes; expected 32.`);
    else fingerprint = createHash('sha256').update(bytes).digest('hex');
    bytes.fill(0);
    if (mode(keyFile) & 0o077) add('warn', 'login', `${keyFile} is ${octal(mode(keyFile))}; expected 0600.`);
  }
  if (sessionDb && existsSync(sessionDb) && supabaseUrl && appOrigin) {
    try {
      const db = readOnly(sessionDb);
      try {
        const meta = Object.fromEntries(db.prepare('SELECT name,value FROM ba_session_meta').all().map(row => [row.name, row.value]));
        const expected = JSON.stringify([supabaseUrl, appOrigin]);
        if (meta.binding && meta.binding !== expected) {
          let origin = '';
          try { origin = JSON.parse(meta.binding)[1]; } catch { /* unreadable binding */ }
          add('fail', 'login', `Session database ${sessionDb} was created for ${origin || 'another origin'}, not ${appOrigin}: sign-in answers 503. ` +
            'Point BESOINAVOCAT_SESSION_DB_PATH to a new file (for example /data/sessions-portail.sqlite); the old one is kept.');
        } else if (meta.key_fingerprint && fingerprint && meta.key_fingerprint !== fingerprint) {
          add('fail', 'login', `Session database ${sessionDb} was created with another session key: sign-in answers 503. Restore the original key or use a new session database file.`);
        } else add('ok', 'login', `Session database ${sessionDb} matches this origin and key.`);
      } finally { db.close(); }
    } catch { add('warn', 'login', `Session database ${sessionDb} could not be read (it is created on first start).`); }
  } else if (sessionDb) add('ok', 'login', `Session database ${sessionDb} will be created on first sign-in.`);
  else add('fail', 'login', 'BESOINAVOCAT_SESSION_DB_PATH is unset.');

  // Requests from the website (intake).
  let origins = null;
  try { origins = JSON.parse(env.BESOINAVOCAT_INTAKE_ALLOWED_ORIGINS || 'null'); } catch { origins = null; }
  if (!Array.isArray(origins) || !origins.length || origins.some(value => !httpsOrigin(value)))
    add('warn', 'requests', 'BESOINAVOCAT_INTAKE_ALLOWED_ORIGINS is not a JSON array of https origins: the request page is closed.');
  else {
    add('ok', 'requests', `Requests accepted from ${origins.join(', ')}.`);
    if (appOrigin && !origins.includes(appOrigin)) add('warn', 'requests', `${appOrigin} is not in BESOINAVOCAT_INTAKE_ALLOWED_ORIGINS: the portal's own /demande page cannot submit.`);
  }
  const intakeDb = env.BESOINAVOCAT_INTAKE_DB_PATH;
  if (intakeDb && existsSync(path.dirname(intakeDb)) && mode(path.dirname(intakeDb)) & 0o077)
    add('fail', 'requests', `${path.dirname(intakeDb)} is ${octal(mode(path.dirname(intakeDb)))}; the request database directory must be 0700.`);
  if (env.BESOINAVOCAT_INTAKE_REQUEST_ENABLED === 'true') add('ok', 'requests', 'The detailed request form is open.');
  else add('warn', 'requests', 'BESOINAVOCAT_INTAKE_REQUEST_ENABLED is not true: only the short request is open (open it after the consent text is reviewed).');
  let reviewers = [];
  try { reviewers = JSON.parse(env.BESOINAVOCAT_INTAKE_REVIEWERS || '[]'); } catch { reviewers = null; }
  if (!Array.isArray(reviewers)) add('warn', 'requests', 'BESOINAVOCAT_INTAKE_REVIEWERS is not a JSON array: nobody can read received requests at /demandes.');
  else add(reviewers.length ? 'ok' : 'warn', 'requests', `${reviewers.length} team member(s) can read received requests at /demandes.`);

  // Connectors are optional; report only whether the encryption key exists.
  const integrationsKey = env.BESOINAVOCAT_INTEGRATIONS_KEY_FILE;
  if (!integrationsKey || !existsSync(integrationsKey)) add('warn', 'connectors', 'No connector key file: Zoom, Outlook, Google and the other connectors stay off.');

  // Phone calls through MIMT and the built-in video room. Only names and counts are reported.
  const mimtMissing = ['BESOINAVOCAT_MIMT_API_KEY', 'BESOINAVOCAT_MIMT_WEBHOOK_SECRET'].filter(name => !env[name]);
  if (mimtMissing.length) add('warn', 'calls', `Phone calls are off: ${mimtMissing.join(' and ')} not set.`);
  else add('ok', 'calls', 'MIMT key and webhook secret are set (MIMT still checks their validity on the first call).');
  if (!env.BESOINAVOCAT_MIMT_PUBLIC_NUMBER) add('warn', 'calls', 'BESOINAVOCAT_MIMT_PUBLIC_NUMBER is not set: the public line does not ring the team.');
  let team = [];
  try { team = JSON.parse(env.BESOINAVOCAT_TEAM_MEMBERS || '[]'); } catch { team = null; }
  if (!Array.isArray(team)) add('warn', 'calls', 'BESOINAVOCAT_TEAM_MEMBERS is not a JSON array of "tenantId/subject".');
  else add(team.length ? 'ok' : 'warn', 'calls', `${team.length} lawyer(s) answer the public line (BESOINAVOCAT_TEAM_MEMBERS).`);
  if (!env.BESOINAVOCAT_TURN_URLS || !env.BESOINAVOCAT_TURN_SECRET)
    add('warn', 'video', 'No TURN relay (BESOINAVOCAT_TURN_URLS and BESOINAVOCAT_TURN_SECRET): video may fail on strict office or mobile networks.');
  else add('ok', 'video', 'TURN relay configured for video.');

  return items;
}

export function report(items) {
  const mark = { ok: 'OK  ', warn: 'WARN', fail: 'FAIL' };
  const lines = items.map(item => `${mark[item.level]} ${item.area.padEnd(10)} ${item.message}`);
  const fails = items.filter(item => item.level === 'fail').length;
  lines.push('', fails ? `${fails} blocking item(s).` : 'No blocking item.');
  return lines.join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const items = readiness();
  console.log(report(items));
  process.exitCode = items.some(item => item.level === 'fail') ? 1 : 0;
}
