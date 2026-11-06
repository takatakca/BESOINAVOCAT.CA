import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';

const users = {
  lawyer: { subject: 'lawyer-1', tenantId: 'tenant-a', product: 'besoinavocat', active: true },
  client: { subject: 'client-1', tenantId: 'tenant-a', product: 'besoinavocat', active: true },
  stranger: { subject: 'stranger', tenantId: 'tenant-a', product: 'besoinavocat', active: true },
};
const NOW = Date.parse('2026-11-04T15:00:00Z');

async function fixture(t, env = { APP_ORIGIN: 'https://portail.example.test', BESOINAVOCAT_CALENDAR_FEED_ENABLED: 'true' }) {
  const directory = await mkdtemp(path.join(tmpdir(), 'besoinavocat-feed-test-'));
  const app = createApp({ dbPath: path.join(directory, 'db.sqlite'), blobDir: path.join(directory, 'blobs'), clock: () => NOW, env, authenticate: async token => users[token] ?? null });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  const base = `http://127.0.0.1:${app.address().port}`;
  t.after(async () => { await new Promise(r => app.close(r)); await rm(directory, { recursive: true, force: true }); });
  async function request(route, { token = 'lawyer', method = 'GET', body, key } = {}) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (key) headers['Idempotency-Key'] = key;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(base + route, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    let json = null; try { json = JSON.parse(text); } catch { json = null; }
    return { status: response.status, headers: response.headers, text, json };
  }
  const created = await request('/api/cases', { token: 'client', method: 'POST', body: { title: 'Succession Tremblay', reference: 'SYN-9' } });
  const caseId = created.json.case.id;
  app.store.provisionMembership({ tenantId: 'tenant-a', caseId, subject: 'lawyer-1', role: 'lawyer' });
  return { app, request, caseId, base: `/api/cases/${caseId}`, origin: base };
}
const feedPath = url => new URL(url).pathname;

test('private calendar link: discreet by default, role-filtered, revocable, and the token is stored only as a hash', async t => {
  const f = await fixture(t);
  await f.request(`${f.base}/deadlines`, { method: 'POST', body: { title: 'Audience au fond', kind: 'audience', dueDate: '2026-11-06', dueTime: '09:30', note: 'Salle 2.12', visibleToClient: true } });
  await f.request(`${f.base}/deadlines`, { method: 'POST', body: { title: 'Vérifier la prescription', kind: 'prescription', dueDate: '2026-11-20' } });
  const meeting = await f.request(`${f.base}/communications`, { method: 'POST', key: 'feed-test-meeting-0001', body: { title: 'Rencontre Tremblay', kind: 'video', scheduledAt: '2026-11-10T18:00:00Z', joinUrl: 'https://us02web.zoom.us/j/12345678901?pwd=synthetic' } });
  assert.equal(meeting.status, 201);

  assert.deepEqual((await f.request('/api/calendar-feed')).json.feed, null);
  const made = await f.request('/api/calendar-feed', { method: 'POST', body: {} });
  assert.equal(made.status, 201);
  assert.match(made.json.url, /^https:\/\/portail\.example\.test\/api\/calendar\/[A-Za-z0-9_-]{43}\.ics$/u);
  assert.ok(made.json.webcalUrl.startsWith('webcal://'));
  const token = made.json.url.split('/').pop().slice(0, -4);
  const stored = f.app.store.db.prepare('SELECT tokenHash FROM calendar_feeds').all();
  assert.equal(stored.length, 1);
  assert.notEqual(stored[0].tokenHash, token);
  assert.ok(!JSON.stringify((await f.request('/api/calendar-feed')).json).includes(token));

  // The calendar provider reads without any session.
  const lawyerFeed = await f.request(feedPath(made.json.url), { token: null });
  assert.equal(lawyerFeed.status, 200);
  assert.match(lawyerFeed.headers.get('content-type'), /^text\/calendar/u);
  const unfolded = lawyerFeed.text.replace(/\r\n /gu, '');
  assert.ok(unfolded.includes('SUMMARY:Audience · SYN-9'));
  assert.ok(unfolded.includes('SUMMARY:Prescription · SYN-9'));
  assert.ok(unfolded.includes('DTSTART;TZID=America/Toronto:20261106T093000'));
  assert.ok(unfolded.includes('SUMMARY:Rendez-vous vidéo · SYN-9'));
  assert.ok(unfolded.includes('DTSTART:20261110T180000Z'));
  assert.ok(!unfolded.includes('zoom.us'), 'join links never reach the calendar');
  assert.ok(!unfolded.includes('Salle 2.12') && !unfolded.includes('Succession Tremblay') && !unfolded.includes('Audience au fond'), 'discreet mode leaks no title or note');
  assert.equal((await f.request('/api/calendar-feed')).json.feed.fetchCount, 1);

  // The client's link only carries what the client may see; full detail adds titles and notes.
  const clientMade = await f.request('/api/calendar-feed', { token: 'client', method: 'POST', body: { detail: 'full' } });
  const clientFeed = (await f.request(feedPath(clientMade.json.url), { token: null })).text.replace(/\r\n /gu, '');
  assert.ok(clientFeed.includes('Audience : Audience au fond · SYN-9'));
  assert.ok(clientFeed.includes('Salle 2.12'));
  assert.ok(!clientFeed.includes('Prescription'));
  // A stranger's link shows nothing of this case.
  const strangerMade = await f.request('/api/calendar-feed', { token: 'stranger', method: 'POST' });
  assert.ok(!(await f.request(feedPath(strangerMade.json.url), { token: null })).text.includes('SYN-9'));

  // Replacing the link kills the old one at once; revoking kills the new one. Bad tokens are a plain 404.
  const rotated = await f.request('/api/calendar-feed', { method: 'POST', body: { detail: 'discreet' } });
  assert.equal((await f.request(feedPath(made.json.url), { token: null })).status, 404);
  assert.equal((await f.request(feedPath(rotated.json.url), { token: null })).status, 200);
  assert.equal((await f.request('/api/calendar-feed/revoke', { method: 'POST' })).json.revoked, true);
  assert.equal((await f.request(feedPath(rotated.json.url), { token: null })).status, 404);
  assert.equal((await f.request('/api/calendar/court.ics', { token: null })).status, 404);
  assert.equal((await f.request(`${feedPath(rotated.json.url)}?x=1`, { token: null })).status, 400);
  assert.equal((await f.request('/api/calendar-feed', { method: 'POST', body: { detail: 'everything' } })).status, 400);
});

test('calendar link is off without the flag, and says which variables are missing', async t => {
  const f = await fixture(t, { APP_ORIGIN: 'https://portail.example.test' });
  const status = await f.request('/api/calendar-feed');
  assert.equal(status.json.enabled, false);
  assert.deepEqual(status.json.missing, ['BESOINAVOCAT_CALENDAR_FEED_ENABLED=true']);
  assert.equal((await f.request('/api/calendar-feed', { method: 'POST' })).status, 503);
  assert.equal((await f.request('/api/capabilities')).json.calendarFeed, false);
});
