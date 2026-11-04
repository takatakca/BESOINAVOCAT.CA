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
  assert.deepEqual(item.domain, { id: 'family', label: { fr: 'Famille et jeunesse', en: 'Family and youth' } });
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

test('a guided request shows the conflict-check names, legal aid answers and availability with their labels', async t => {
  const f = await fixture(t);
  const tomorrow = new Date(Date.now() + 86_400_000);
  const day = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  const body = { ...detailed(), consentVersion: QUESTIONNAIRE_CONSENT_VERSION, hasDeadline: undefined,
    questionnaire: { version: QUESTIONNAIRE_CONSENT_VERSION, answers: { topic: 'separation', relationship: 'unsure', arrangement: 'yes', agreementGoal: 'understand' }, reviewed: true },
    otherParties: { status: 'named', names: 'Partie Synthétique' }, legalAid: { interest: 'check', household: 'single_children', income: '30000_44999' },
    availability: { slots: [`${day}:evening`] }, contactTimes: ['asap', 'evening'], acceptRemote: true };
  delete body.hasDeadline;
  const created = await f.submit(body);
  assert.equal(created.status, 201, created.text);
  const list = await f.request('/api/intakes', { as: 'reviewer' });
  assert.doesNotMatch(list.text, /Partie Synthétique/, 'names stay out of the list');
  const { json: { request } } = await f.request(`/api/intakes/${created.json.reference}`, { as: 'reviewer' });
  assert.deepEqual(request.otherParties, { status: { id: 'named', label: { fr: 'Je connais le nom', en: 'I know the name' } }, names: 'Partie Synthétique' });
  assert.equal(request.legalAid.household.label.fr, 'Personne seule avec enfant(s) à charge');
  assert.equal(request.legalAid.income.label.fr, '30 000 $ à 44 999 $');
  assert.deepEqual(request.availability, { asap: false, slots: [{ date: day, period: { id: 'evening', label: { fr: 'Soir', en: 'Evening' } } }] });
  assert.deepEqual(request.contactTimes.map(item => item.id), ['asap', 'evening']);
  assert.equal(request.acceptRemote, true);
  const legacy = await f.submit(detailed());
  const old = (await f.request(`/api/intakes/${legacy.json.reference}`, { as: 'reviewer' })).json.request;
  assert.equal(old.otherParties, null); assert.equal(old.availability, null); assert.equal(old.acceptRemote, null);
});

test('the reviewer directory accepts subjects or {subject, name} entries and nothing else', async () => {
  const { reviewerDirectory } = await import('../lib/intake.mjs');
  assert.deepEqual(reviewerDirectory('["a",{"subject":"b","name":"Me B"}]'), [{ subject: 'a', name: null }, { subject: 'b', name: 'Me B' }]);
  assert.deepEqual(intakeReviewers('["a",{"subject":"b","name":"Me B"}]'), ['a', 'b']);
  for (const raw of ['[{"subject":"b","name":"<b>"}]', '[{"subject":"b","extra":1}]', '[{"name":"x"}]', '["a",{"subject":"a"}]', '[{"subject":"b","name":" x"}]', '[{"subject":"b","name":""}]'])
    assert.deepEqual(reviewerDirectory(raw), [], raw);
});

test('a request is assigned to a named reviewer, filtered by assignment, and the history keeps every change', async t => {
  const f = await fixture(t, [REVIEWER.subject, { subject: SECOND.subject, name: 'Collègue Synthétique' }]);
  const { json: { reference } } = await f.submit(detailed());
  const other = (await f.submit(contact())).json.reference;
  const route = `/api/intakes/${reference}`;
  const directory = await f.request('/api/intakes/reviewers', { as: 'reviewer' });
  assert.equal(directory.status, 200);
  assert.deepEqual(directory.json.reviewers, [{ subject: REVIEWER.subject, name: null, me: true }, { subject: SECOND.subject, name: 'Collègue Synthétique', me: false }]);
  assert.equal((await f.request('/api/intakes/reviewers', { as: 'lawyer' })).status, 404);
  // Only a configured reviewer can be named; the body is closed.
  for (const body of [{ assignee: LAWYER.subject }, { assignee: 'x', extra: 1 }, {}, { assignee: 1 }, { assignee: null, expected: 5 }])
    assert.equal((await f.request(`${route}/assign`, { as: 'reviewer', method: 'POST', body })).status, 400);
  assert.equal((await f.request(`${route}/assign`, { as: 'lawyer', method: 'POST', body: { assignee: REVIEWER.subject } })).status, 404);
  const assigned = await f.request(`${route}/assign`, { as: 'reviewer', method: 'POST', body: { assignee: SECOND.subject, expected: null } });
  assert.equal(assigned.status, 200, assigned.text);
  assert.equal(assigned.json.changed, true); assert.equal(assigned.json.status, 'in_review', 'a received request moves to in_review when someone takes it');
  assert.deepEqual(assigned.json.assignment.assignee, { subject: SECOND.subject, name: 'Collègue Synthétique' });
  assert.equal((await f.request(`${route}/assign`, { as: 'second', method: 'POST', body: { assignee: SECOND.subject } })).json.changed, false);
  const stale = await f.request(`${route}/assign`, { as: 'second', method: 'POST', body: { assignee: REVIEWER.subject, expected: null } });
  assert.equal(stale.status, 409); assert.equal(stale.json.error.code, 'ASSIGNMENT_CONFLICT');
  // Lists: the assignee sees it under « me », the other reviewer does not; the second request has no assignee.
  const mine = await f.request('/api/intakes?assigned=me', { as: 'second' });
  assert.deepEqual(mine.json.requests.map(row => row.reference), [reference]); assert.equal(mine.json.assignedToMe, 1);
  assert.deepEqual(mine.json.requests[0].assignee, { subject: SECOND.subject, name: 'Collègue Synthétique' });
  assert.equal((await f.request('/api/intakes?assigned=me', { as: 'reviewer' })).json.requests.length, 0);
  assert.deepEqual((await f.request('/api/intakes?assigned=none', { as: 'reviewer' })).json.requests.map(row => row.reference), [other]);
  assert.equal((await f.request('/api/intakes?assigned=me&status=in_review', { as: 'second' })).json.requests.length, 1);
  assert.equal((await f.request('/api/intakes?assigned=all', { as: 'reviewer' })).status, 400);
  const counts = (await f.request('/api/intakes?status=received&limit=1', { as: 'reviewer' })).json.counts;
  assert.deepEqual(counts, { received: 1, in_review: 1, contacted: 0, closed: 0, spam: 0 }, 'the cockpit dial keeps reading the same counts');
  // Taking it back to the shared queue keeps the status and the whole history.
  const released = await f.request(`${route}/assign`, { as: 'reviewer', method: 'POST', body: { assignee: null, expected: SECOND.subject } });
  assert.equal(released.status, 200); assert.equal(released.json.assignment.assignee, null); assert.equal(released.json.status, 'in_review');
  const detail = await f.request(route, { as: 'second' });
  assert.deepEqual(detail.json.request.assignment, { assignee: null, assignedBy: null, assignedAt: null });
  assert.deepEqual(detail.json.history.map(item => [item.kind, item.body, item.mine]).sort(),
    [['assignment', '', false], ['assignment', SECOND.subject, false], ['status', 'received → in_review', false]].sort());
  assert.equal(detail.json.history.find(item => item.kind === 'assignment' && item.body)?.assignee.name, 'Collègue Synthétique');
  const db = new DatabaseSync(f.file, { readOnly: true });
  try {
    assert.equal(db.prepare("SELECT value FROM ba_intake_meta WHERE name='schema_version'").get().value, '3');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ba_intake_assignments').get().n, 2);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM ba_intake_access WHERE action='assign'").get().n, 2);
  } finally { db.close(); }
  const rw = new DatabaseSync(f.file);
  try { assert.throws(() => rw.prepare('DELETE FROM ba_intake_assignments').run()); assert.throws(() => rw.prepare("UPDATE ba_intake_assignments SET assignee='x'").run()); }
  finally { rw.close(); }
});

test('the access trail of a request is readable by the inbox, newest first, and its reading is logged too', async t => {
  const f = await fixture(t, [REVIEWER.subject, { subject: SECOND.subject, name: 'Me Synthétique' }]);
  const { json: { reference } } = await f.submit(detailed());
  await f.request(`/api/intakes/${reference}`, { as: 'reviewer' });
  await f.request(`/api/intakes/${reference}/status`, { as: 'second', method: 'POST', body: { status: 'in_review', expected: 'received' } });
  await f.request(`/api/intakes/${reference}/notes`, { as: 'second', method: 'POST', body: { body: 'Note synthétique.' } });
  await f.request('/api/intakes', { as: 'reviewer' });
  const trail = await f.request(`/api/intakes/${reference}/access`, { as: 'reviewer' });
  assert.equal(trail.status, 200);
  assert.equal(trail.json.reference, reference); assert.equal(trail.json.truncated, false);
  assert.deepEqual(trail.json.access.map(row => [row.action, row.subject.subject, row.subject.name, row.mine]),
    [['trail', REVIEWER.subject, null, true], ['note', SECOND.subject, 'Me Synthétique', false], ['status', SECOND.subject, 'Me Synthétique', false], ['read', REVIEWER.subject, null, true]],
    'newest first, the trail read included, the list excluded');
  assert.ok(trail.json.access.every(row => typeof row.id === 'string' && /^\d{4}-/u.test(row.createdAt)));
  assert.doesNotMatch(trail.text, /@example\.test|Résumé synthétique/);
  // A second read shows the first one; the lawyer and an unknown reference get the usual 404.
  assert.equal((await f.request(`/api/intakes/${reference}/access`, { as: 'reviewer' })).json.access.filter(row => row.action === 'trail').length, 2);
  assert.equal((await f.request(`/api/intakes/${reference}/access`, { as: 'lawyer' })).status, 404);
  assert.equal((await f.request(`/api/intakes/BA-${'A'.repeat(24)}/access`, { as: 'reviewer' })).status, 404);
  assert.equal((await f.request(`/api/intakes/${reference}/access`, { as: 'reviewer', method: 'POST', body: {} })).status, 404);
});
