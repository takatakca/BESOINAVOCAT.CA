import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';
import { intakeReviewers } from '../lib/intake.mjs';
import { QUESTIONNAIRE_CONSENT_VERSION } from '../lib/questionnaire.mjs';
import { REQUEST_CONSENT_VERSION } from '../lib/catalog.mjs';

const WP = 'https://www.example.test';
const REVIEWER = { subject: 'synthetic-reviewer', tenantId: 'synthetic-tenant', product: 'besoinavocat', active: true };
const SECOND = { subject: 'synthetic-reviewer-2', tenantId: 'synthetic-tenant', product: 'besoinavocat', active: true };
const LAWYER = { subject: 'synthetic-lawyer', tenantId: 'synthetic-tenant', product: 'besoinavocat', active: true };
const people = { reviewer: REVIEWER, second: SECOND, lawyer: LAWYER };
const contact = (extra = {}) => ({ name: 'Personne Synthétique', email: `synthetic-${randomUUID().slice(0, 8)}@example.test`, role: 'client', language: 'fr',
  domain: 'family', region: 'montreal', consent: true, consentVersion: '2026-10-26.1', website: '', ...extra });
const detailed = () => ({ ...contact(), phone: '514 555 0100', contactPreference: 'email', stage: 'considering', objective: 'understand',
  summary: 'Résumé synthétique de la situation, sans renseignement réel, assez long pour être accepté.', urgency: 'week', consentVersion: REQUEST_CONSENT_VERSION });

async function fixture(t, reviewers = [REVIEWER.subject, SECOND.subject]) {
  const root = await mkdtemp(path.join(tmpdir(), 'ba-intake-review-'));
  const file = path.join(root, 'intake.sqlite');
  const env = { BESOINAVOCAT_INTAKE_DB_PATH: file, BESOINAVOCAT_INTAKE_ALLOWED_ORIGINS: JSON.stringify([WP]), BESOINAVOCAT_INTAKE_REQUEST_ENABLED: 'true',
    BESOINAVOCAT_INTAKE_REVIEWERS: JSON.stringify(reviewers) };
  const app = createApp({ dbPath: path.join(root, 'cases.sqlite'), blobDir: path.join(root, 'blobs'), env,
    authenticate: async token => people[token] ?? (() => { throw Object.assign(new Error('no'), { status: 401 }); })() });
  app.listen(0, '127.0.0.1'); await once(app, 'listening');
  const base = `http://127.0.0.1:${app.address().port}`;
  t.after(async () => { await new Promise(resolve => app.close(resolve)); await rm(root, { recursive: true, force: true }); });
  const request = async (route, { as, method = 'GET', body, headers = {} } = {}) => {
    const response = await fetch(base + route, { method, headers: { ...(as ? { Authorization: `Bearer ${as}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    return { status: response.status, text, json: text ? JSON.parse(text) : null };
  };
  const submit = body => request('/api/intake', { method: 'POST', body, headers: { Origin: WP, 'X-Requested-With': 'XMLHttpRequest', 'Idempotency-Key': randomUUID() } });
  return { file, request, submit };
}

test('reviewer list configuration accepts only a clean list of subjects', () => {
  assert.deepEqual(intakeReviewers('["a","b"]'), ['a', 'b']);
  for (const raw of [undefined, '', 'nope', '{}', '["a","a"]', '[" a"]', '[1]', JSON.stringify(Array.from({ length: 33 }, (_, i) => `s${i}`))]) assert.deepEqual(intakeReviewers(raw), []);
});

test('only named reviewers see the inbox; others get the same 404 as an unknown route', async t => {
  const f = await fixture(t);
  const created = await f.submit(detailed()); assert.equal(created.status, 201);
  for (const route of ['/api/intakes', `/api/intakes/${created.json.reference}`]) {
    assert.equal((await f.request(route)).status, 401);
    const lawyer = await f.request(route, { as: 'lawyer' });
    assert.equal(lawyer.status, 404); assert.doesNotMatch(lawyer.text, /Synth|BA-|example\.test/);
  }
  assert.equal((await f.request(`/api/intakes/${created.json.reference}/status`, { as: 'lawyer', method: 'POST', body: { status: 'closed' } })).status, 404);
  assert.equal((await f.request('/api/capabilities', { as: 'lawyer' })).json.intakeReview, false);
  assert.equal((await f.request('/api/capabilities', { as: 'reviewer' })).json.intakeReview, true);
});

test('the list triages without contact details; the detail view is complete and every read is logged', async t => {
  const f = await fixture(t);
  const first = await f.submit(contact()), second = await f.submit(detailed());
  const list = await f.request('/api/intakes', { as: 'reviewer' });
  assert.equal(list.status, 200);
  assert.equal(list.json.requests.length, 2); assert.equal(list.json.counts.received, 2);
  assert.doesNotMatch(list.text, /@example\.test|514 555|Résumé synthétique/);
  const item = list.json.requests.find(row => row.reference === second.json.reference);
  assert.deepEqual(item.domain, { id: 'family', label: { fr: 'Famille', en: 'Family' } });
  assert.equal(item.detailed, true); assert.equal(item.status, 'received');
  const detail = await f.request(`/api/intakes/${second.json.reference}`, { as: 'reviewer' });
  assert.equal(detail.status, 200);
  assert.match(detail.json.request.contact.email, /@example\.test$/);
  assert.equal(detail.json.request.contact.phone, '514 555 0100');
  assert.match(detail.json.request.summary, /^Résumé synthétique/);
  assert.match(detail.json.request.consent.text, /BesoinAvocat conserve/);
  assert.equal((await f.request('/api/intakes/BA-unknown', { as: 'reviewer' })).status, 404);
  assert.equal((await f.request(`/api/intakes/BA-${'A'.repeat(24)}`, { as: 'reviewer' })).status, 404);
  assert.equal((await f.request('/api/intakes?limit=500', { as: 'reviewer' })).status, 400);
  assert.equal((await f.request('/api/intakes?status=archived', { as: 'reviewer' })).status, 400);
  const paged = await f.request('/api/intakes?limit=1', { as: 'reviewer' });
  assert.equal(paged.json.requests.length, 1); assert.equal(paged.json.hasMore, true); assert.equal(paged.json.nextOffset, 1);
  const db = new DatabaseSync(f.file, { readOnly: true });
  try {
    const log = db.prepare('SELECT reference,action,subject FROM ba_intake_access ORDER BY rowid').all().map(row => ({ ...row }));
    assert.deepEqual(log.filter(row => row.action === 'read'), [{ reference: second.json.reference, action: 'read', subject: REVIEWER.subject }]);
    assert.ok(log.filter(row => row.action === 'list').length >= 2);
    assert.throws(() => db.prepare('DELETE FROM ba_intake_access').run());
  } finally { db.close(); }
  assert.ok(first.json.reference);
});

test('status changes are tracked, conflict-safe and filterable; notes are append-only', async t => {
  const f = await fixture(t);
  const { json: { reference } } = await f.submit(detailed());
  const route = `/api/intakes/${reference}`;
  const moved = await f.request(`${route}/status`, { as: 'reviewer', method: 'POST', body: { status: 'in_review', expected: 'received' } });
  assert.equal(moved.status, 200); assert.equal(moved.json.changed, true);
  const stale = await f.request(`${route}/status`, { as: 'second', method: 'POST', body: { status: 'closed', expected: 'received' } });
  assert.equal(stale.status, 409); assert.equal(stale.json.error.code, 'STATUS_CONFLICT');
  assert.equal((await f.request(`${route}/status`, { as: 'second', method: 'POST', body: { status: 'in_review' } })).json.changed, false);
  assert.equal((await f.request(`${route}/status`, { as: 'reviewer', method: 'POST', body: { status: 'assigned' } })).status, 400);
  assert.equal((await f.request(`${route}/status`, { as: 'reviewer', method: 'POST', body: { status: 'closed', extra: 1 } })).status, 400);
  const note = await f.request(`${route}/notes`, { as: 'second', method: 'POST', body: { body: '  Rappel prévu demain.\r\nDeuxième ligne.  ' } });
  assert.equal(note.status, 201); assert.equal(note.json.note.body, 'Rappel prévu demain.\nDeuxième ligne.');
  for (const body of [{ body: '' }, { body: 'x'.repeat(4001) }, { body: 'a\u0000b' }, { text: 'x' }]) assert.equal((await f.request(`${route}/notes`, { as: 'second', method: 'POST', body })).status, 400);
  const detail = await f.request(route, { as: 'reviewer' });
  assert.equal(detail.json.request.status, 'in_review');
  assert.deepEqual(detail.json.history.map(item => [item.kind, item.body, item.mine]), [['status', 'received → in_review', true], ['note', 'Rappel prévu demain.\nDeuxième ligne.', false]]);
  assert.equal((await f.request('/api/intakes?status=in_review', { as: 'reviewer' })).json.requests.length, 1);
  assert.equal((await f.request('/api/intakes?status=received', { as: 'reviewer' })).json.requests.length, 0);
  assert.equal((await f.request('/api/intakes', { as: 'reviewer' })).json.counts.in_review, 1);
});

test('without configured reviewers the inbox does not exist, even for an authenticated person', async t => {
  const f = await fixture(t, []);
  await f.submit(contact());
  assert.equal((await f.request('/api/intakes', { as: 'reviewer' })).status, 404);
  assert.equal((await f.request('/api/capabilities', { as: 'reviewer' })).json.intakeReview, false);
});

test('a version 1 queue is upgraded in place and keeps every request', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'ba-intake-v1-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const file = path.join(root, 'intake.sqlite');
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA application_id=${0x4241494e}; PRAGMA journal_mode=WAL;
    CREATE TABLE ba_intake_meta (name TEXT PRIMARY KEY,value TEXT NOT NULL) STRICT;
    CREATE TABLE ba_intakes (reference TEXT PRIMARY KEY,idempotencyHash TEXT NOT NULL UNIQUE,payloadHash TEXT NOT NULL,payloadJson TEXT NOT NULL,origin TEXT NOT NULL,catalogVersion TEXT NOT NULL,consentText TEXT NOT NULL,priceJson TEXT NOT NULL,createdAt TEXT NOT NULL,status TEXT NOT NULL CHECK(status='received')) STRICT;
    CREATE TABLE ba_intake_limits (id TEXT PRIMARY KEY,count INTEGER NOT NULL,expiresAt INTEGER NOT NULL) STRICT;
    INSERT INTO ba_intake_meta VALUES('schema_version','1');`);
  db.prepare('INSERT INTO ba_intakes VALUES(?,?,?,?,?,?,?,?,?,?)').run(`BA-${'b'.repeat(24)}`, 'k', 'p', JSON.stringify(contact()), WP, 'v', 'c', '{}', '2026-10-30T00:00:00.000Z', 'received');
  db.close();
  const { chmod } = await import('node:fs/promises');
  await chmod(file, 0o600);
  const { createIntake } = await import('../lib/intake.mjs');
  const intake = createIntake({ config: { origins: [WP], dbPath: file, requestEnabled: false, reviewers: [REVIEWER.subject] } });
  t.after(() => intake.clear());
  assert.equal(intake.configured, true);
  assert.equal(intake.reviewList(REVIEWER, {}).requests[0].reference, `BA-${'b'.repeat(24)}`);
  assert.equal(intake.reviewStatus(REVIEWER, `BA-${'b'.repeat(24)}`, { status: 'contacted' }).status, 'contacted');
});
