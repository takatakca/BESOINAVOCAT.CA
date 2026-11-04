import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { readiness, report } from '../tools/deploy-readiness.mjs';

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'ba-ready-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const data = path.join(root, 'data'); mkdirSync(data, { mode: 0o700 }); mkdirSync(path.join(data, 'blobs'));
  const db = new DatabaseSync(path.join(data, 'platform.sqlite'));
  db.exec(`CREATE TABLE cases (id TEXT); CREATE TABLE members (id TEXT); CREATE TABLE documents (id TEXT);
    INSERT INTO cases VALUES ('a'),('b'),('c'); INSERT INTO members VALUES ('m'); INSERT INTO documents VALUES ('d');`);
  db.close();
  const key = randomBytes(32);
  writeFileSync(path.join(data, 'session.key'), key, { mode: 0o600 });
  writeFileSync(path.join(data, 'grants.json'), JSON.stringify({ grants: { 'owner-subject': {} } }), { mode: 0o600 });
  const env = {
    NODE_ENV: 'production', BESOINAVOCAT_TRUST_PROXY: '1', APP_ORIGIN: 'https://portail.example.test',
    DATABASE_PATH: path.join(data, 'platform.sqlite'), BLOB_DIR: path.join(data, 'blobs'),
    TAKATAK_SUPABASE_URL: 'https://id.example.test', TAKATAK_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_secretvalue',
    BESOINAVOCAT_EMAIL_OTP_ENABLED: 'true', BESOINAVOCAT_GRANTS_FILE: path.join(data, 'grants.json'),
    BESOINAVOCAT_SESSION_KEY_FILE: path.join(data, 'session.key'), BESOINAVOCAT_SESSION_DB_PATH: path.join(data, 'sessions.sqlite'),
    BESOINAVOCAT_INTAKE_ALLOWED_ORIGINS: '["https://portail.example.test"]', BESOINAVOCAT_INTAKE_DB_PATH: path.join(data, 'intake.sqlite'),
    BESOINAVOCAT_INTAKE_REVIEWERS: '["owner-subject"]',
  };
  const sessions = binding => {
    const s = new DatabaseSync(env.BESOINAVOCAT_SESSION_DB_PATH);
    s.exec('CREATE TABLE IF NOT EXISTS ba_session_meta (name TEXT PRIMARY KEY, value TEXT NOT NULL)');
    s.prepare('INSERT OR REPLACE INTO ba_session_meta VALUES (?,?)').run('binding', binding);
    s.prepare('INSERT OR REPLACE INTO ba_session_meta VALUES (?,?)').run('key_fingerprint', createHash('sha256').update(key).digest('hex'));
    s.close();
  };
  return { env, data, sessions };
}

const fails = items => items.filter(item => item.level === 'fail');

test('a complete configuration has no blocking item and counts the cases', t => {
  const { env } = fixture(t);
  const items = readiness(env);
  assert.deepEqual(fails(items), []);
  assert.match(report(items), /3 case\(s\), 1 document\(s\), 1 membership\(s\)/u);
  assert.match(report(items), /No blocking item/u);
});

test('the report never prints a secret value', t => {
  const { env } = fixture(t);
  assert.doesNotMatch(report(readiness(env)), /secretvalue/u);
});

test('a session database bound to another origin is named as the sign-in blocker', t => {
  const { env, sessions } = fixture(t);
  sessions(JSON.stringify([env.TAKATAK_SUPABASE_URL, 'https://old-portal.example.test']));
  const blocker = fails(readiness(env));
  assert.equal(blocker.length, 1);
  assert.match(blocker[0].message, /created for https:\/\/old-portal\.example\.test.*BESOINAVOCAT_SESSION_DB_PATH/u);
});

test('a session database matching origin and key is accepted', t => {
  const { env, sessions } = fixture(t);
  sessions(JSON.stringify([env.TAKATAK_SUPABASE_URL, env.APP_ORIGIN]));
  assert.deepEqual(fails(readiness(env)), []);
});

test('missing login settings, grants and an open request directory each fail', t => {
  const { env, data } = fixture(t);
  chmodSync(data, 0o755);
  const items = fails(readiness({ ...env, TAKATAK_SUPABASE_URL: '', BESOINAVOCAT_GRANTS_FILE: path.join(data, 'none.json') }));
  const text = items.map(item => item.message).join('\n');
  assert.match(text, /TAKATAK_SUPABASE_URL/u);
  assert.match(text, /Access grants not found/u);
  assert.match(text, /must be 0700/u);
});

test('the reviewer list is validated like the server does: one bad entry blocks, named entries are counted', t => {
  const { env } = fixture(t);
  const bad = fails(readiness({ ...env, BESOINAVOCAT_INTAKE_REVIEWERS: '["owner-subject", {"subject": "second-subject", "name": "<b>Me</b>"}]' }));
  assert.equal(bad.length, 1);
  assert.match(bad[0].message, /invalid or duplicate entry.*nobody can read/u);
  const good = readiness({ ...env, BESOINAVOCAT_INTAKE_REVIEWERS: '["owner-subject", {"subject": "second-subject", "name": "Me Untel"}]' });
  assert.deepEqual(fails(good), []);
  assert.match(report(good), /2 team member\(s\) can read received requests at \/demandes \(1 with a display name\)/u);
});

test('a wrong case database path is reported', t => {
  const { env } = fixture(t);
  assert.match(fails(readiness({ ...env, DATABASE_PATH: '/nonexistent/platform.sqlite' }))[0].message, /Case database not found/u);
});

test('phone calls and video report MIMT and TURN settings by name only', t => {
  const { env } = fixture(t);
  const off = report(readiness(env));
  assert.match(off, /Phone calls are off: BESOINAVOCAT_MIMT_API_KEY and BESOINAVOCAT_MIMT_WEBHOOK_SECRET not set/u);
  assert.match(off, /No TURN relay/u);
  assert.doesNotMatch(off, /Twilio/u);
  const on = report(readiness({ ...env, BESOINAVOCAT_MIMT_API_KEY: 'mimt_pk_hiddenhiddenhidden', BESOINAVOCAT_MIMT_WEBHOOK_SECRET: 'whsec_hiddenhiddenhidden',
    BESOINAVOCAT_MIMT_PUBLIC_NUMBER: '+15145550100', BESOINAVOCAT_TEAM_MEMBERS: '["t1/s1","t1/s2"]',
    BESOINAVOCAT_TURN_URLS: 'turn:turn.example.test:3478', BESOINAVOCAT_TURN_SECRET: 'turnsecrethiddenvalue' }));
  assert.match(on, /2 lawyer\(s\) answer the public line/u);
  assert.match(on, /TURN relay configured/u);
  assert.doesNotMatch(on, /hidden|5550100/u);
});

test('the document key is reported without blocking when absent and blocks when unusable', t => {
  const { env, data } = fixture(t);
  assert.match(report(readiness(env)), /stored unencrypted/u);
  const key = path.join(data, 'documents.key');
  writeFileSync(key, randomBytes(32), { mode: 0o600 });
  assert.match(report(readiness({ ...env, BESOINAVOCAT_BLOB_KEY_FILE: key })), /New documents are encrypted/u);
  chmodSync(key, 0o644);
  assert.match(fails(readiness({ ...env, BESOINAVOCAT_BLOB_KEY_FILE: key }))[0].message, /must be 0600/u);
});

test('the request database is counted by status, and a missing, foreign or unset one is said plainly', async t => {
  const { env, data } = fixture(t);
  const { createIntake } = await import('../lib/intake.mjs');
  const warns = items => items.filter(item => item.level === 'warn').map(item => item.message);
  assert.match(report(readiness(env)), /will be created at first start/u);
  assert.match(warns(readiness({ ...env, BESOINAVOCAT_INTAKE_DB_PATH: '' })).join('\n'), /BESOINAVOCAT_INTAKE_DB_PATH is unset/u);
  assert.match(fails(readiness({ ...env, BESOINAVOCAT_INTAKE_DB_PATH: path.join(data, 'absent', 'intake.sqlite') }))[0].message, /does not exist/u);
  const reviewer = { subject: 'owner-subject', tenantId: 'synthetic-tenant', product: 'besoinavocat', active: true };
  const intake = createIntake({ config: { origins: ['https://portail.example.test'], dbPath: env.BESOINAVOCAT_INTAKE_DB_PATH, requestEnabled: false, reviewers: [reviewer.subject] } });
  assert.equal(intake.configured, true);
  const contact = () => ({ name: 'Personne Synthétique', email: `synthetic-${randomBytes(4).toString('hex')}@example.test`, role: 'client', language: 'fr',
    domain: 'family', region: 'montreal', consent: true, consentVersion: '2026-10-26.1', website: '' });
  const first = intake.receive(contact(), 'a1b2c3d4-0000-4000-8000-000000000001', 'https://portail.example.test').reference;
  intake.receive(contact(), 'a1b2c3d4-0000-4000-8000-000000000002', 'https://portail.example.test');
  intake.reviewStatus(reviewer, first, { status: 'closed' });
  intake.clear();
  const counted = readiness(env);
  assert.deepEqual(fails(counted), []);
  assert.match(warns(counted).join('\n'), /2 request\(s\) in .*intake\.sqlite: 1 waiting, 0 in review, 0 contacted, 1 closed, 0 spam\./u);
  assert.doesNotMatch(report(counted), /Synthétique|example\.test@|BA-[A-Za-z0-9_-]{24}/u, 'no request content is printed');
  const foreign = new DatabaseSync(path.join(data, 'foreign.sqlite'));
  foreign.exec('PRAGMA application_id=7; CREATE TABLE ba_intakes(reference TEXT)'); foreign.close();
  assert.match(fails(readiness({ ...env, BESOINAVOCAT_INTAKE_DB_PATH: path.join(data, 'foreign.sqlite') }))[0].message, /not the request database/u);
});
