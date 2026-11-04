// Contract of the staff inbox page (/demandes): the script talks to the same-origin API only, escapes every value it
// shows, and renders the states a reviewer meets. No browser: the script runs in a vm with a minimal fake document.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';

const script = fs.readFileSync(new URL('../public/demandes.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../public/demandes.html', import.meta.url), 'utf8');
const settle = () => new Promise(resolve => setTimeout(resolve, 10));
const ME = 'synthetic-reviewer', OTHER = 'synthetic-reviewer-2', REF = 'BA-SYNTH-0001';
const label = fr => ({ fr, en: fr });
const row = (extra = {}) => ({ reference: REF, name: 'Personne <b>Synthétique</b>', status: 'received', role: 'client', detailed: true, assignee: null,
  domain: { id: 'family', label: label('Droit de la famille') }, region: { id: 'montreal', label: label('Montréal') }, urgency: { id: 'week', label: label('Cette semaine') },
  createdAt: '2026-11-01T14:00:00.000Z', ...extra });
const detail = (extra = {}) => ({ request: { ...row(), contact: { name: 'Personne <b>Synthétique</b>', email: 'synthetic@example.test', phone: '514 555-0100' },
  language: 'fr', summary: 'Résumé <script>alert(1)</script> synthétique.', consent: { version: '2026-10-26.1', text: 'Texte de consentement.' },
  assignment: { assignee: null, assignedAt: null }, answers: [], ...extra },
  history: [{ kind: 'status', body: 'received → in_review', createdAt: '2026-11-02T10:00:00.000Z', mine: true }, { kind: 'note', body: 'Note <i>interne</i>.', createdAt: '2026-11-02T11:00:00.000Z', mine: false }] });

// A page: fake document, recorded fetches, and the handler each route answers with.
function page(routes) {
  const nodes = new Map(), listeners = {}, calls = [];
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { id, innerHTML: '', textContent: '', hidden: false, value: '', classes: new Set(),
      classList: { toggle(name, on) { on ? this.owner.classes.add(name) : this.owner.classes.delete(name); } }, scrollIntoView() {} });
    const n = nodes.get(id); n.classList.owner = n; return n;
  };
  const context = {
    document: { getElementById: node, addEventListener: (type, fn) => { listeners[type] = fn; } },
    window: { matchMedia: () => ({ matches: false }) },
    async fetch(url, init) {
      calls.push({ url, init });
      const handler = routes[`${init.method || 'GET'} ${url.split('?')[0]}`];
      const [status, body] = handler ? handler(init, url) : [500, { error: { message: 'Route non simulée : ' + url } }];
      return { ok: status < 400, status, json: async () => body };
    },
  };
  vm.runInNewContext(script, context, { filename: 'demandes.js' });
  const target = (selector, attributes = {}) => ({ closest: s => (s === selector ? { getAttribute: name => attributes[name] ?? null } : null) });
  return { node, calls, listeners, click: (selector, attributes) => listeners.click({ target: target(selector, attributes) }),
    submit: id => listeners.submit({ target: { id }, preventDefault() {} }) };
}

const directory = () => [200, { reviewers: [{ subject: ME, name: 'Me Synthétique', me: true }, { subject: OTHER, name: null, me: false }] }];
const list = (rows = [row()]) => [200, { requests: rows, counts: { received: rows.length, in_review: 2 }, assignedToMe: 1, hasMore: false, nextOffset: null }];

test('loading the script performs no request by itself, uses no storage, cookies or beacons, and only same-origin calls', () => {
  assert.doesNotMatch(script, /localStorage|sessionStorage|indexedDB|document\.cookie|sendBeacon|Math\.random|eval\(|new Function|https?:\/\//);
  assert.match(script, /credentials: 'same-origin'/);
  assert.match(script, /headers\['X-Requested-With'\] = 'XMLHttpRequest'/);
  assert.match(script, /cache: 'no-store'/);
  // Every element the script looks up exists in the page or is rendered by the script itself.
  const rendered = new Set([...script.matchAll(/id="([a-z-]+)"/g)].map(m => m[1]));
  const inPage = new Set([...html.matchAll(/id="([a-z-]+)"/g)].map(m => m[1]));
  for (const [, id] of script.matchAll(/\$\('([a-z-]+)'\)/g)) assert.ok(rendered.has(id) || inPage.has(id), `#${id} is looked up but never exists`);
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(html, /<meta name="referrer" content="same-origin">/);
  assert.doesNotMatch(html, /<script[^>]*>[^<]/, 'no inline script');
  assert.doesNotMatch(html, /\son[a-z]+=/, 'no inline handler');
});

test('a signed-out visitor and a non-reviewer get a plain explanation, and nothing is listed', async () => {
  const out = page({ 'GET /api/intakes/reviewers': () => [401, { error: { code: 'UNAUTHORIZED', message: 'Session requise.' } }] });
  await settle();
  assert.match(out.node('inbox-state').textContent, /Connectez-vous d’abord/);
  assert.ok(out.node('inbox-state').classes.has('is-error'));
  assert.equal(out.node('inbox-layout').hidden, true);
  assert.equal(out.node('inbox-rows').innerHTML, '');
  const lawyer = page({ 'GET /api/intakes/reviewers': () => [404, { error: { code: 'NOT_FOUND', message: 'Introuvable.' } }] });
  await settle();
  assert.match(lawyer.node('inbox-state').textContent, /réservée aux personnes de l’équipe/);
  assert.equal(lawyer.calls.length, 1, 'the list is not even requested');
});

test('the queue renders the rows and filters with every value escaped, and a selected request shows its detail, history and actions', async () => {
  const out = page({ 'GET /api/intakes/reviewers': directory, 'GET /api/intakes': () => list(), [`GET /api/intakes/${REF}`]: () => [200, detail()] });
  await settle();
  assert.equal(out.node('inbox-layout').hidden, false);
  assert.equal(out.node('inbox-state').textContent, '');
  const rows = out.node('inbox-rows').innerHTML;
  assert.match(rows, /Personne &lt;b&gt;Synthétique&lt;\/b&gt;/); assert.doesNotMatch(rows, /<b>/);
  assert.match(rows, /data-reference="BA-SYNTH-0001"/); assert.match(rows, /Droit de la famille · Montréal/); assert.match(rows, /Demande détaillée · Cette semaine/);
  assert.match(rows, /data-status="received">Reçue</);
  const filters = out.node('inbox-filters').innerHTML;
  assert.match(filters, /data-filter="" aria-pressed="true">Toutes · 3</); assert.match(filters, /data-filter="in_review" aria-pressed="false">En traitement · 2</);
  assert.match(filters, /data-assigned="me" aria-pressed="false">À moi · 1</);
  assert.equal(out.node('inbox-more').hidden, true);
  assert.deepEqual(out.calls.map(c => c.url), ['/api/intakes/reviewers', '/api/intakes?limit=25&offset=0']);
  for (const call of out.calls) { assert.equal(call.init.credentials, 'same-origin'); assert.equal(call.init.cache, 'no-store'); assert.equal(call.init.headers['X-Requested-With'], undefined); }

  out.click('[data-reference]', { 'data-reference': REF }); await settle();
  assert.equal(out.calls.at(-1).url, `/api/intakes/${REF}`);
  const box = out.node('inbox-detail').innerHTML;
  assert.match(box, /<h2 id="inbox-detail-title">Personne &lt;b&gt;Synthétique&lt;\/b&gt;<\/h2>/);
  assert.match(box, /Résumé &lt;script&gt;alert\(1\)&lt;\/script&gt; synthétique\./); assert.doesNotMatch(box, /<script/);
  assert.match(box, /<a href="mailto:synthetic@example.test">synthetic@example.test<\/a>/); assert.match(box, /<a href="tel:+5145550100">514 555-0100<\/a>/);
  assert.match(box, /<dt>Responsable<\/dt><dd>Personne pour l’instant<\/dd>/);
  assert.match(box, /<option value="received" selected>Reçue<\/option>/); assert.match(box, /<option value="synthetic-reviewer">vous<\/option>/);
  assert.match(box, /<option value="synthetic-reviewer-2">syntheti…<\/option>/, 'a reviewer without a display name is shown by a short form of the identifier');
  assert.match(box, /id="inbox-assign-me"/); assert.match(box, /id="inbox-note-form"/); assert.match(box, /id="inbox-trail-load"/);
  assert.match(box, /<li data-kind="status"><small>[^<]* · vous<\/small><p>Reçue → En traitement<\/p><\/li>/);
  assert.match(box, /<li data-kind="note"><small>[^<]*<\/small><p>Note &lt;i&gt;interne&lt;\/i&gt;\.<\/p><\/li>/);
  assert.match(box, /Consentement 2026-10-26\.1 : « Texte de consentement\. »/);
  assert.match(out.node('inbox-rows').innerHTML, /aria-current="true"/);
});

test('status, assignment, note and access trail go through POST or GET on the request route with the CSRF header, then the view reloads', async () => {
  const posts = [];
  let current = detail();
  const out = page({ 'GET /api/intakes/reviewers': directory, 'GET /api/intakes': () => list(), [`GET /api/intakes/${REF}`]: () => [200, current],
    [`POST /api/intakes/${REF}/status`]: init => { posts.push(JSON.parse(init.body)); current = detail({ status: 'in_review' }); return [200, { status: 'in_review' }]; },
    [`POST /api/intakes/${REF}/assign`]: init => { posts.push(JSON.parse(init.body)); current = detail({ assignment: { assignee: { subject: ME, name: 'Me Synthétique' }, assignedAt: '2026-11-03T09:00:00.000Z' } }); return [200, {}]; },
    [`POST /api/intakes/${REF}/notes`]: init => { posts.push(JSON.parse(init.body)); return [201, {}]; },
    [`GET /api/intakes/${REF}/access`]: () => [200, { reference: REF, truncated: true, access: [
      { id: 'a1', action: 'trail', subject: { subject: ME, name: 'Me Synthétique' }, mine: true, createdAt: '2026-11-03T10:00:00.000Z' },
      { id: 'a2', action: 'read', subject: { subject: OTHER, name: null }, mine: false, createdAt: '2026-11-03T09:30:00.000Z' }] }] });
  await settle();
  out.click('[data-reference]', { 'data-reference': REF }); await settle();

  out.node('inbox-status-select').value = 'in_review';
  out.click('#inbox-status-save'); await settle();
  assert.deepEqual(posts.at(-1), { status: 'in_review', expected: 'received' });
  assert.match(out.node('inbox-detail').innerHTML, /<option value="in_review" selected>/);

  out.click('#inbox-assign-me'); await settle();
  assert.deepEqual(posts.at(-1), { assignee: ME, expected: null });
  assert.match(out.node('inbox-detail').innerHTML, /<dt>Responsable<\/dt><dd>vous · depuis le /);
  assert.doesNotMatch(out.node('inbox-detail').innerHTML, /id="inbox-assign-me"/, 'already mine');

  out.node('inbox-note-text').value = '  ';
  out.submit('inbox-note-form'); await settle();
  assert.equal(posts.filter(p => 'body' in p).length, 0, 'a blank note is not sent');
  out.node('inbox-note-text').value = 'Rappeler la personne.';
  out.submit('inbox-note-form'); await settle();
  assert.deepEqual(posts.at(-1), { body: 'Rappeler la personne.' });

  out.click('#inbox-trail-load'); await settle();
  assert.equal(out.calls.at(-1).url, `/api/intakes/${REF}/access`);
  const trail = out.node('inbox-trail').innerHTML;
  assert.match(trail, /<li data-kind="access"><small>[^<]* · vous<\/small><p>Consultation des accès · vous<\/p><\/li>/);
  assert.match(trail, /<p>Lecture du détail · syntheti…<\/p>/);
  assert.match(trail, /Seuls les 200 accès les plus récents/);

  for (const call of out.calls.filter(c => c.init.method === 'POST')) {
    assert.equal(call.init.headers['X-Requested-With'], 'XMLHttpRequest'); assert.equal(call.init.headers['Content-Type'], 'application/json');
    assert.equal(call.init.credentials, 'same-origin');
  }
  const reloads = out.calls.filter(c => c.url.startsWith('/api/intakes?')).length;
  assert.ok(reloads >= 3, 'the queue is reloaded after each status or assignment change');
});

test('a status conflict re-reads the request and shows the server message without retrying', async () => {
  const out = page({ 'GET /api/intakes/reviewers': directory, 'GET /api/intakes': () => list(), [`GET /api/intakes/${REF}`]: () => [200, detail({ status: 'closed' })],
    [`POST /api/intakes/${REF}/status`]: () => [409, { error: { code: 'STATUS_CONFLICT', message: 'Le statut a changé entre-temps.' } }] });
  await settle();
  out.click('[data-reference]', { 'data-reference': REF }); await settle();
  out.node('inbox-status-select').value = 'spam';
  out.click('#inbox-status-save'); await settle();
  assert.equal(out.calls.filter(c => c.init.method === 'POST').length, 1);
  assert.equal(out.node('inbox-state').textContent, 'Le statut a changé entre-temps.');
  assert.ok(out.node('inbox-state').classes.has('is-error'));
});

test('filters and pagination drive the list query', async () => {
  const seen = [];
  const out = page({ 'GET /api/intakes/reviewers': directory, 'GET /api/intakes': (init, url) => { seen.push(url); return url.includes('offset=0') && !url.includes('status=')
    ? [200, { requests: [row()], counts: { received: 30 }, assignedToMe: 0, hasMore: true, nextOffset: 25 }] : list([]); } });
  await settle();
  assert.equal(out.node('inbox-more').hidden, false);
  out.click('#inbox-more'); await settle();
  assert.equal(seen.at(-1), '/api/intakes?limit=25&offset=25');
  out.click('[data-filter]', { 'data-filter': 'spam' }); await settle();
  assert.equal(seen.at(-1), '/api/intakes?limit=25&offset=0&status=spam');
  out.click('[data-assigned]', { 'data-assigned': 'none' }); await settle();
  assert.equal(seen.at(-1), '/api/intakes?limit=25&offset=0&status=spam&assigned=none');
  assert.match(out.node('inbox-rows').innerHTML, /Aucune demande dans cette vue\./);
  out.click('[data-assigned]', { 'data-assigned': 'none' }); await settle();
  assert.equal(seen.at(-1), '/api/intakes?limit=25&offset=0&status=spam', 'pressing the same assignment filter again clears it');
});

test('the page and its script and style are served with the strict CSP, no caching and no index', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'ba-demandes-page-'));
  const app = createApp({ dbPath: path.join(root, 'cases.sqlite'), blobDir: path.join(root, 'blobs'), env: {} });
  t.after(async () => { if (app.listening) await new Promise(resolve => app.close(resolve)); await rm(root, { recursive: true, force: true }); });
  app.listen(0, '127.0.0.1'); await once(app, 'listening');
  const base = `http://127.0.0.1:${app.address().port}`;
  for (const [route, type] of [['/demandes', 'text/html'], ['/demandes.js', 'text/javascript'], ['/demandes.css', 'text/css']]) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get('content-type'), new RegExp(type));
    assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.equal((await fetch(base + '/demandes.html')).status, 404);
  assert.equal((await fetch(base + '/demandes', { method: 'POST' })).status, 405);
  assert.equal((await fetch(base + '/api/intakes')).status, 401, 'the API behind the page needs a session');
});
