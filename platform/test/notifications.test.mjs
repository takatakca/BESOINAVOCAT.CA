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
};
const ENV = { APP_ORIGIN: 'https://portail.example.test', BESOINAVOCAT_EMAIL_PROVIDER: 'resend', BESOINAVOCAT_EMAIL_API_KEY: 're_synthetic_key_123', BESOINAVOCAT_EMAIL_FROM: 'BesoinAvocat <avis@besoinavocat.example.test>' };

async function fixture(t, env = ENV) {
  const directory = await mkdtemp(path.join(tmpdir(), 'besoinavocat-notices-test-'));
  const sent = [];
  let time = Date.parse('2026-11-04T15:00:00Z');
  const notificationFetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.headers.Authorization, 'Bearer re_synthetic_key_123');
    sent.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ id: `email-${sent.length}` }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const app = createApp({ dbPath: path.join(directory, 'db.sqlite'), blobDir: path.join(directory, 'blobs'), clock: () => time, env, notificationFetch, authenticate: async token => users[token] ?? null });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  const base = `http://127.0.0.1:${app.address().port}`;
  t.after(async () => { await new Promise(r => app.close(r)); await rm(directory, { recursive: true, force: true }); });
  async function request(route, { token = 'lawyer', method = 'GET', body } = {}) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(base + route, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    return { status: response.status, json: text ? JSON.parse(text) : null };
  }
  const created = await request('/api/cases', { token: 'client', method: 'POST', body: { title: 'Divorce Tremblay', reference: 'SYN-5' } });
  const caseId = created.json.case.id;
  app.store.provisionMembership({ tenantId: 'tenant-a', caseId, subject: 'lawyer-1', role: 'lawyer' });
  const settle = async count => { for (let i = 0; i < 50 && sent.length < count; i++) await new Promise(r => setTimeout(r, 10)); };
  return { request, caseId, base: `/api/cases/${caseId}`, sent, settle, advance: ms => { time += ms; } };
}
const codeOf = mail => /code de confirmation : ([0-9]{6})/u.exec(mail.text)[1];

test('an address is confirmed by code, then notices say only that something waits in the portal', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/notifications/email', { token: 'client', method: 'POST', body: { email: 'marie@example.test', consent: false } })).status, 400);
  const registered = await f.request('/api/notifications/email', { token: 'client', method: 'POST', body: { email: 'Marie@Example.test', consent: true } });
  assert.equal(registered.status, 200);
  assert.equal(registered.json.contact.status, 'pending');
  assert.equal(registered.json.contact.email, 'm••••@example.test');
  assert.deepEqual(f.sent[0].to, ['marie@example.test']);
  const code = codeOf(f.sent[0]);
  // Nothing is sent to an unconfirmed address.
  await f.request(`${f.base}/requests`, { method: 'POST', body: { title: 'Relevé bancaire de mars' } });
  await new Promise(r => setTimeout(r, 50));
  assert.equal(f.sent.length, 1);
  const wrong = code === '000000' ? '111111' : '000000';
  assert.equal((await f.request('/api/notifications/verify', { token: 'client', method: 'POST', body: { code: wrong } })).status, 400);
  assert.equal((await f.request('/api/notifications/verify', { token: 'client', method: 'POST', body: { code } })).json.contact.status, 'verified');

  f.advance(11 * 60 * 1000);
  await f.request(`${f.base}/requests`, { method: 'POST', body: { title: 'Bail signé' } });
  await f.settle(2);
  assert.equal(f.sent.length, 2);
  const notice = f.sent[1];
  assert.equal(notice.subject, 'BesoinAvocat · Une pièce vous est demandée');
  assert.ok(notice.text.includes('https://portail.example.test/'));
  for (const secret of ['Bail', 'Tremblay', 'SYN-5', 'Relevé']) assert.ok(!notice.text.includes(secret) && !notice.subject.includes(secret), secret);
  // Same kind, same case, within 10 minutes: skipped. A shared deadline is a different kind; an internal one sends nothing.
  await f.request(`${f.base}/requests`, { method: 'POST', body: { title: 'Autre pièce' } });
  await f.request(`${f.base}/deadlines`, { method: 'POST', body: { title: 'Note interne', kind: 'autre', dueDate: '2026-11-20' } });
  await f.request(`${f.base}/deadlines`, { method: 'POST', body: { title: 'Audience', kind: 'audience', dueDate: '2026-11-20', visibleToClient: true } });
  await f.settle(3);
  await new Promise(r => setTimeout(r, 50));
  assert.deepEqual(f.sent.slice(2).map(m => m.subject), ['BesoinAvocat · Une nouvelle date dans votre dossier']);
  const status = await f.request('/api/notifications', { token: 'client' });
  assert.deepEqual(status.json.recent.map(r => `${r.kind}:${r.status}`).slice(0, 3), ['deadline_shared:sent', 'document_requested:skipped', 'document_requested:sent']);

  // Paused, then removed: nothing more is sent.
  await f.request('/api/notifications/pause', { token: 'client', method: 'POST', body: { paused: true } });
  f.advance(11 * 60 * 1000);
  await f.request(`${f.base}/requests`, { method: 'POST', body: { title: 'Encore une' } });
  await new Promise(r => setTimeout(r, 50));
  assert.equal(f.sent.length, 3);
  assert.equal((await f.request('/api/notifications/remove', { token: 'client', method: 'POST' })).json.removed, true);
  assert.equal((await f.request('/api/notifications', { token: 'client' })).json.contact, null);
});

test('email notices are off without the provider settings, and the action still succeeds', async t => {
  const f = await fixture(t, { APP_ORIGIN: 'https://portail.example.test' });
  const status = await f.request('/api/notifications');
  assert.equal(status.json.configured, false);
  assert.deepEqual(status.json.missing, ['BESOINAVOCAT_EMAIL_PROVIDER=resend', 'BESOINAVOCAT_EMAIL_API_KEY', 'BESOINAVOCAT_EMAIL_FROM']);
  assert.equal((await f.request('/api/notifications/email', { method: 'POST', body: { email: 'a@example.test', consent: true } })).status, 503);
  assert.equal((await f.request(`${f.base}/requests`, { method: 'POST', body: { title: 'Pièce' } })).status, 201);
  assert.equal(f.sent.length, 0);
});
