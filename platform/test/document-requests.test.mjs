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

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'besoinavocat-requests-test-'));
  const app = createApp({ dbPath: path.join(directory, 'db.sqlite'), blobDir: path.join(directory, 'blobs'), env: { APP_ORIGIN: 'https://portail.example.test' }, authenticate: async token => users[token] ?? null });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  const base = `http://127.0.0.1:${app.address().port}`;
  t.after(async () => { await new Promise(r => app.close(r)); await rm(directory, { recursive: true, force: true }); });
  async function request(route, { token = 'lawyer', method = 'GET', body } = {}) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(base + route, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const raw = await response.text();
    return { status: response.status, json: raw ? JSON.parse(raw) : null };
  }
  // The client opens the case (client role); the lawyer is provisioned on it.
  const created = await request('/api/cases', { token: 'client', method: 'POST', body: { title: 'Dossier synthétique', reference: 'SYN-2' } });
  assert.equal(created.status, 201);
  const caseId = created.json.case.id;
  app.store.provisionMembership({ tenantId: 'tenant-a', caseId, subject: 'lawyer-1', role: 'lawyer' });
  return { app, request, caseId, base: `/api/cases/${caseId}` };
}

const upload = (f, token, name) => f.request(`${f.base}/documents`, { token, method: 'POST', body: { name, mimeType: 'text/plain', contentBase64: Buffer.from(`contenu ${name}`).toString('base64'), sourceType: 'original', reviewStatus: 'a_verifier' } });

test('the lawyer requests a piece, the client answers with a case document, the lawyer accepts; every step is journaled', async t => {
  const f = await fixture(t);
  const made = await f.request(`${f.base}/requests`, { method: 'POST', body: { title: 'Bail signé', note: 'Les deux pages, signées.', dueDate: '2026-11-20' } });
  assert.equal(made.status, 201);
  const id = made.json.request.id;
  assert.equal(made.json.request.status, 'requested');

  const seen = await f.request(`${f.base}/requests`, { token: 'client' });
  assert.equal(seen.status, 200);
  assert.equal(seen.json.canRequest, false);
  assert.equal(seen.json.open, 1);
  assert.equal(seen.json.requests[0].title, 'Bail signé');

  // The client cannot create requests or decide; nobody outside the case sees anything.
  assert.equal((await f.request(`${f.base}/requests`, { token: 'client', method: 'POST', body: { title: 'x' } })).status, 403);
  assert.equal((await f.request(`${f.base}/requests/${id}/decide`, { token: 'client', method: 'POST', body: { decision: 'accept' } })).status, 403);
  assert.equal((await f.request(`${f.base}/requests`, { token: 'stranger' })).status, 404);
  assert.equal((await f.request(`${f.base}/requests`, { token: 'other' })).status, 404);

  // Only a document of this case can be attached; an empty answer is refused; nothing can be accepted before an answer.
  assert.equal((await f.request(`${f.base}/requests/${id}/provide`, { token: 'client', method: 'POST', body: {} })).status, 400);
  assert.equal((await f.request(`${f.base}/requests/${id}/provide`, { token: 'client', method: 'POST', body: { documentId: '00000000-0000-4000-8000-000000000000' } })).status, 400);
  assert.equal((await f.request(`${f.base}/requests/${id}/decide`, { method: 'POST', body: { decision: 'accept' } })).status, 409);

  const doc = await upload(f, 'client', 'bail.txt');
  assert.equal(doc.status, 201);
  const provided = await f.request(`${f.base}/requests/${id}/provide`, { token: 'client', method: 'POST', body: { documentId: doc.json.document.id, answer: 'Voici le bail.' } });
  assert.equal(provided.status, 200);
  assert.equal(provided.json.request.status, 'provided');
  assert.equal(provided.json.request.documentName, 'bail.txt');

  const lawyerView = await f.request(`${f.base}/requests`);
  assert.equal(lawyerView.json.toReview, 1);
  assert.equal((await f.request(`${f.base}/requests/${id}/decide`, { method: 'POST', body: { decision: 'reopen', note: 'Il manque la page 2.' } })).json.request.status, 'requested');
  await f.request(`${f.base}/requests/${id}/provide`, { token: 'client', method: 'POST', body: { documentId: doc.json.document.id } });
  const accepted = await f.request(`${f.base}/requests/${id}/decide`, { method: 'POST', body: { decision: 'accept' } });
  assert.equal(accepted.json.request.status, 'accepted');
  assert.equal((await f.request(`${f.base}/requests/${id}/provide`, { token: 'client', method: 'POST', body: { answer: 'encore' } })).status, 409, 'closed requests stay closed');

  const history = await f.request(`${f.base}/requests/${id}/history`, { token: 'client' });
  assert.deepEqual(history.json.events.map(e => e.action), ['requested', 'provided', 'reopened', 'provided', 'accepted']);
  assert.ok(history.json.events.every(e => /^\d{4}-\d{2}-\d{2}T/u.test(e.at)));

  // The history is append-only at the database level.
  assert.throws(() => f.app.store.db.prepare('UPDATE document_request_events SET detail = ?').run('modifié'), /append-only/u);
  assert.throws(() => f.app.store.db.prepare('DELETE FROM document_request_events').run(), /append-only/u);

  // The sealed journal of the case carries every step.
  const audit = await f.request(`${f.base}/audit`);
  const actions = audit.json.events.map(e => e.action);
  for (const a of ['document_request.created', 'document_request.provided', 'document_request.reopened', 'document_request.accepted']) assert.ok(actions.includes(a), a);
});

test('requests validate their input, can be cancelled and reopened, and the client screens are wired', async t => {
  const f = await fixture(t);
  assert.equal((await f.request(`${f.base}/requests`, { method: 'POST', body: { title: '   ' } })).status, 400);
  assert.equal((await f.request(`${f.base}/requests`, { method: 'POST', body: { title: 'Relevé', dueDate: '20-11-2026' } })).status, 400);
  assert.equal((await f.request(`${f.base}/requests`, { method: 'POST', body: { title: 'Relevé', extra: 1 } })).status, 400);
  const late = await f.request(`${f.base}/requests`, { method: 'POST', body: { title: 'Relevé bancaire', dueDate: '2020-01-01' } });
  assert.equal(late.json.request.overdue, true);
  const id = late.json.request.id;
  assert.equal((await f.request(`${f.base}/requests/${id}/decide`, { method: 'POST', body: { decision: 'cancel' } })).json.request.status, 'cancelled');
  assert.equal((await f.request(`${f.base}/requests/${id}/decide`, { method: 'POST', body: { decision: 'accept' } })).status, 409);
  assert.equal((await f.request(`${f.base}/requests/${id}/decide`, { method: 'POST', body: { decision: 'reopen' } })).json.request.status, 'requested');
  assert.equal((await f.request(`${f.base}/requests/${id}/decide`, { method: 'POST', body: { decision: 'delete' } })).status, 400);
  const answered = await f.request(`${f.base}/requests/${id}/provide`, { token: 'client', method: 'POST', body: { answer: 'Je ne l’ai pas, je le demande à la banque.' } });
  assert.equal(answered.json.request.status, 'provided');
  assert.equal(answered.json.request.documentId, null);
  assert.equal((await f.request('/api/capabilities')).json.documentRequests, true);

  const live = await readFile(new URL('../public/live.js', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(live, /'case-requests': paintRequests, 'client-home': paintClientHome/u);
  assert.match(live, /VOTRE PROCHAINE ÉTAPE/u);
  assert.match(app, /data-live="client-home"/u);
  assert.match(app, /!state\.demo && isClientSide\(\)/u, 'the client view is only for real client accounts');
});
