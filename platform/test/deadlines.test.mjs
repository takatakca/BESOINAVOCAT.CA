import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';

const users = {
  lawyer: { subject: 'lawyer-1', tenantId: 'tenant-a', product: 'besoinavocat', active: true },
  client: { subject: 'client-1', tenantId: 'tenant-a', product: 'besoinavocat', active: true },
  stranger: { subject: 'stranger', tenantId: 'tenant-a', product: 'besoinavocat', active: true },
  other: { subject: 'client-1', tenantId: 'tenant-b', product: 'besoinavocat', active: true },
};
// 2026-11-04 15:00 UTC = 10:00 in Montréal.
const NOW = Date.parse('2026-11-04T15:00:00Z');

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'besoinavocat-deadlines-test-'));
  const app = createApp({ dbPath: path.join(directory, 'db.sqlite'), blobDir: path.join(directory, 'blobs'), clock: () => NOW, env: { APP_ORIGIN: 'https://portail.example.test' }, authenticate: async token => users[token] ?? null });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  const base = `http://127.0.0.1:${app.address().port}`;
  t.after(async () => { await new Promise(r => app.close(r)); await rm(directory, { recursive: true, force: true }); });
  async function request(route, { token = 'lawyer', method = 'GET', body, raw = false } = {}) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(base + route, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    return { status: response.status, headers: response.headers, text, json: !raw && text ? JSON.parse(text) : null };
  }
  const created = await request('/api/cases', { token: 'client', method: 'POST', body: { title: 'Dossier synthétique', reference: 'SYN-4' } });
  assert.equal(created.status, 201);
  const caseId = created.json.case.id;
  app.store.provisionMembership({ tenantId: 'tenant-a', caseId, subject: 'lawyer-1', role: 'lawyer' });
  return { app, request, caseId, base: `/api/cases/${caseId}` };
}

test('the lawyer records deadlines; the client sees only shared ones; every step is journaled and append-only', async t => {
  const f = await fixture(t);
  const hearing = await f.request(`${f.base}/deadlines`, { method: 'POST', body: { title: 'Audience au fond', kind: 'audience', dueDate: '2026-11-06', dueTime: '09:30', note: 'Salle 2.12, palais de justice', visibleToClient: true } });
  assert.equal(hearing.status, 201);
  assert.equal(hearing.json.deadline.daysLeft, 2);
  assert.equal(hearing.json.deadline.kindLabel, 'Audience');
  const internal = await f.request(`${f.base}/deadlines`, { method: 'POST', body: { title: 'Vérifier la prescription', kind: 'prescription', dueDate: '2026-11-01' } });
  assert.equal(internal.json.deadline.overdue, true);
  assert.equal(internal.json.deadline.visibleToClient, false);

  const lawyerList = await f.request(`${f.base}/deadlines`);
  assert.equal(lawyerList.json.canEdit, true);
  assert.deepEqual(lawyerList.json.deadlines.map(d => d.title), ['Vérifier la prescription', 'Audience au fond']);
  const clientList = await f.request(`${f.base}/deadlines`, { token: 'client' });
  assert.equal(clientList.json.canEdit, false);
  assert.deepEqual(clientList.json.deadlines.map(d => d.title), ['Audience au fond']);
  // The client cannot read an internal deadline, even by id, nor write anything; strangers see nothing.
  assert.equal((await f.request(`${f.base}/deadlines/${internal.json.deadline.id}/history`, { token: 'client' })).status, 404);
  assert.equal((await f.request(`${f.base}/deadlines`, { token: 'client', method: 'POST', body: { title: 'x', kind: 'autre', dueDate: '2026-12-01' } })).status, 403);
  assert.equal((await f.request(`${f.base}/deadlines/${hearing.json.deadline.id}/done`, { token: 'client', method: 'POST' })).status, 403);
  assert.equal((await f.request(`${f.base}/deadlines`, { token: 'stranger' })).status, 404);
  assert.equal((await f.request(`${f.base}/deadlines`, { token: 'other' })).status, 404);

  // Update, then close and reopen; a closed deadline cannot be edited.
  const id = hearing.json.deadline.id;
  const moved = await f.request(`${f.base}/deadlines/${id}`, { method: 'POST', body: { dueDate: '2026-11-10' } });
  assert.equal(moved.json.deadline.dueDate, '2026-11-10');
  assert.equal((await f.request(`${f.base}/deadlines/${id}/done`, { method: 'POST' })).json.deadline.status, 'done');
  assert.equal((await f.request(`${f.base}/deadlines/${id}/done`, { method: 'POST' })).status, 409);
  assert.equal((await f.request(`${f.base}/deadlines/${id}`, { method: 'POST', body: { title: 'Autre' } })).status, 409);
  assert.equal((await f.request(`${f.base}/deadlines/${id}/reopen`, { method: 'POST' })).json.deadline.status, 'open');
  const history = await f.request(`${f.base}/deadlines/${id}/history`, { token: 'client' });
  assert.deepEqual(history.json.events.map(e => e.action), ['created', 'updated', 'done', 'reopened']);
  assert.match(history.json.events[1].detail, /2026-11-06 → 2026-11-10/u);
  assert.throws(() => f.app.store.db.prepare('UPDATE case_deadline_events SET detail = ?').run('modifié'), /append-only/u);
  assert.throws(() => f.app.store.db.prepare('DELETE FROM case_deadline_events').run(), /append-only/u);

  const audit = await f.request(`${f.base}/audit`);
  const actions = audit.json.events.map(e => e.action);
  for (const a of ['deadline.created', 'deadline.updated', 'deadline.done', 'deadline.reopened']) assert.ok(actions.includes(a), a);
});

test('deadlines validate input, list the week across cases and export an iCalendar file', async t => {
  const f = await fixture(t);
  for (const body of [{ title: ' ', kind: 'autre', dueDate: '2026-12-01' }, { title: 'x', kind: 'delai', dueDate: '2026-12-01' }, { title: 'x', kind: 'autre', dueDate: '2026-02-30' },
    { title: 'x', kind: 'autre', dueDate: '2026-12-01', dueTime: '25:00' }, { title: 'x', kind: 'autre', dueDate: '2026-12-01', visibleToClient: 'oui' }, { title: 'x', kind: 'autre', dueDate: '2026-12-01', extra: 1 }]) {
    assert.equal((await f.request(`${f.base}/deadlines`, { method: 'POST', body })).status, 400, JSON.stringify(body));
  }
  await f.request(`${f.base}/deadlines`, { method: 'POST', body: { title: 'Dépôt de la défense, pièces; annexes', kind: 'depot', dueDate: '2026-11-09', visibleToClient: true } });
  await f.request(`${f.base}/deadlines`, { method: 'POST', body: { title: 'Rencontre préparatoire', kind: 'rencontre', dueDate: '2026-11-05', dueTime: '14:00' } });
  await f.request(`${f.base}/deadlines`, { method: 'POST', body: { title: 'Plus tard', kind: 'autre', dueDate: '2026-12-20', visibleToClient: true } });

  const week = await f.request('/api/deadlines/upcoming?days=7');
  assert.deepEqual(week.json.deadlines.map(d => d.title), ['Rencontre préparatoire', 'Dépôt de la défense, pièces; annexes']);
  assert.equal(week.json.deadlines[0].caseReference, 'SYN-4');
  const clientWeek = await f.request('/api/deadlines/upcoming', { token: 'client' });
  assert.deepEqual(clientWeek.json.deadlines.map(d => d.title), ['Dépôt de la défense, pièces; annexes']);
  assert.equal((await f.request('/api/deadlines/upcoming?days=0')).status, 400);
  assert.equal((await f.request('/api/deadlines/upcoming?days=7&x=1')).status, 400);
  assert.equal((await f.request('/api/deadlines/upcoming', { token: 'stranger' })).json.deadlines.length, 0);

  const ics = await f.request(`${f.base}/deadlines.ics`, { raw: true });
  assert.equal(ics.status, 200);
  assert.match(ics.headers.get('content-type'), /^text\/calendar/u);
  assert.match(ics.text, /^BEGIN:VCALENDAR\r\n/u);
  assert.match(ics.text, /DTSTART;TZID=America\/Toronto:20261105T140000/u);
  assert.match(ics.text, /DTSTART;VALUE=DATE:20261109\r\nDTEND;VALUE=DATE:20261110/u);
  assert.ok(ics.text.replace(/\r\n /gu, '').includes('SUMMARY:Dépôt : Dépôt de la défense\\, pièces\\; annexes'), 'text is escaped');
  assert.ok(ics.text.split('\r\n').every(line => Buffer.byteLength(line) <= 75), 'lines are folded');
  const clientIcs = await f.request(`${f.base}/deadlines.ics`, { token: 'client', raw: true });
  assert.doesNotMatch(clientIcs.text, /Rencontre préparatoire/u, 'internal deadlines never reach the client calendar');
  assert.ok((await f.request(`${f.base}/audit`)).json.events.some(e => e.action === 'deadline.calendar_exported'));
  assert.equal((await f.request('/api/capabilities')).json.deadlines, true);

  const live = await readFile(new URL('../public/live.js', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(live, /'case-deadlines': paintDeadlines, 'deadline-week': paintWeek/u);
  assert.match(live, /deadlineWeek: \(\) =>/u);
  assert.match(app, /data-live="case-deadlines"/u);
  assert.match(app, /window\.BALive\?\.deadlineWeek\?\.\(\) \?\? null/u, 'the dial stays « bientôt » until the count is read');
});

test('the « Nouvelles demandes » dial is real only for the intake team and links to the queue', async () => {
  const live = await readFile(new URL('../public/live.js', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /function intakeReviewer\(\) \{ return !state\.demo && state\.capabilities\?\.intakeReview === true; \}/u);
  assert.match(app, /label: 'Nouvelles demandes', value: intakeReviewer\(\) \? window\.BALive\?\.intakeCount\?\.\(\) \?\? null : null/u);
  assert.match(live, /'intake-counts': paintIntakes/u);
  assert.match(live, /\/api\/intakes\?status=received&limit=1/u, 'only the counts are read, never a contact');
  assert.match(live, /href="\/demandes"/u);
});

test('the appointment and usage lists offer « older » buttons instead of a dead end', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /data-action="more-communications"/u);
  assert.match(app, /data-action="more-usage"/u);
  assert.match(app, /\?offset=\$\{offset\}/u);
  assert.doesNotMatch(app, /d’autres rendez-vous ne sont pas affichés/u);
});
