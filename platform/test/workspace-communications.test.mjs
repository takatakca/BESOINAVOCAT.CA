// Browser-controller behavior with an isolated DOM facade; no network or real account.
// This does not replace visual/browser QA or the server's authorization tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import vm from 'node:vm';
import { publicAddonCatalog } from '../lib/addon-catalog.mjs';

const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const exported = ['state', 'start', 'render', 'api', 'communicationsView', 'usageView', 'safeZoomUrl', 'elapsed', 'rateLabel', 'submitCommunication', 'bindCommunicationForm', 'mutateCommunication', 'refreshCommunications', 'loadCase', 'clearSession'];
assert.equal(source.split('  void start();').length, 2, 'The harness must replace exactly one bootstrap call.');

function harness(demo = false) {
  const nodes = new Map(), requests = [];
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {
      id, innerHTML: '', textContent: '', hidden: false, disabled: false, dataset: {}, open: false, isConnected: true,
      classList: { toggle() {} }, setAttribute() {}, removeAttribute() {}, addEventListener() {}, focus() {},
      close() { this.open = false; }, showModal() { this.open = true; }, querySelector() { return null; },
    });
    return nodes.get(id);
  };
  const h = { nodes, node, requests, handler: null };
  const context = vm.createContext({
    URL, URLSearchParams, Intl, Date, console, AbortSignal, crypto: { randomUUID },
    window: { location: { search: demo ? '?demo=1' : '' }, setTimeout: () => 1, clearTimeout() {} },
    document: { getElementById: node, querySelectorAll: () => [], addEventListener() {} },
    FormData: class { constructor(form) { this.data = form.data; } get(key) { return this.data[key] ?? null; } },
    fetch: async (path, options) => {
      requests.push({ path, options });
      if (!h.handler) throw new Error('Unexpected HTTP request');
      return h.handler(path, options);
    },
  });
  vm.runInContext(source.replace('  void start();', `  globalThis.UI = { ${exported.join(',')} };`), context);
  h.ui = context.UI;
  h.main = () => node('main-content').innerHTML;
  return h;
}

const response = data => ({ status: 200, ok: true, json: async () => data });
function fixture(h, role = 'owner') {
  const item = { id: 'case-a', title: 'Dossier fictif A', reference: 'EXEMPLE', role };
  const session = { id: 'session-a', kind: 'video', title: 'Échange fictif', scheduledAt: '2026-10-30T14:00:00Z', status: 'scheduled', joinUrl: null, ownTimer: null };
  const detail = () => ({ case: item, documents: [], messages: [], timeEntries: [], communications: { sessions: [session], hasMore: false }, usage: { entries: [], hasMore: false, billingEnabled: false } });
  Object.assign(h.ui.state, { mode: 'authenticated', demo: false, user: { active: true, subject: 'member-a' }, selectedId: item.id, cases: [item], detail: detail(), view: 'communications', caseLoading: false, busy: false });
  h.handler = async path => response(path === '/api/cases/case-a' ? detail() : {});
  return { item, session, detail };
}
function form(h, id = 'communication-form') {
  const result = {
    id, dataset: {}, isConnected: true,
    data: { kind: 'video', title: 'Planification fictive', scheduledAt: '2026-10-30T10:00', joinUrl: 'https://zoom.us/j/12345678901' },
    button: h.node('submit'), error: h.node('error'),
    querySelector(selector) { return selector === '[type="submit"]' ? this.button : this.error; },
  };
  h.ui.bindCommunicationForm(result);
  return result;
}
function actionEnabled(html, action, id) {
  const buttons = [...html.matchAll(/<button\b([^>]*)>/gu)].map(match => match[1]);
  const button = buttons.find(attrs => attrs.includes(`data-action="${action}"`) && attrs.includes(`data-id="${id}"`));
  return button !== undefined && !/\bdisabled\b/u.test(button);
}

test('preview renders local communications and usage with zero HTTP, including attempted actions', async () => {
  const h = harness(true);
  await h.ui.start();
  h.ui.state.view = 'communications'; h.ui.render();
  assert.ok(h.main().includes('Aperçu en lecture seule'));
  assert.equal(actionEnabled(h.main(), 'communication-start', 'demo-rdv-1'), false);
  await h.ui.mutateCommunication('start', 'demo-rdv-1', h.node('trigger'));
  await h.ui.refreshCommunications(h.node('trigger'));
  const draft = form(h);
  await h.ui.submitCommunication(draft);
  h.ui.state.view = 'usage'; h.ui.render();
  assert.ok(h.main().includes('Tarif non configuré'));
  assert.ok(!h.main().includes('0,00'));
  assert.equal(h.requests.length, 0);
});

test('only Zoom participation URLs are exposed; an absent rate never becomes zero', () => {
  const { ui } = harness();
  assert.equal(ui.safeZoomUrl('https://company.zoom.us/j/12345678901?pwd=abc'), 'https://company.zoom.us/j/12345678901?pwd=abc');
  for (const value of ['javascript:alert(1)', 'https://zoom.us.evil.test/j/12345678901', 'https://zoom.us@evil.test/j/12345678901', 'https://zoom.us/s/12345678901', 'https://zoom.us/j/12345678901?token=x', 'https://zoom.us/j/12345678901#host', 'https://zoom.us/j/12345678901?pwd=x&pwd=y']) assert.equal(ui.safeZoomUrl(value), null, value);
  assert.equal(ui.rateLabel(null), 'Tarif non configuré');
  assert.equal(ui.rateLabel(undefined), 'Tarif non configuré');
  assert.equal(ui.elapsed(750), '12 min 30 s');
});

test('server addon descriptions render as a read-only catalogue, without prices or payment controls', () => {
  const h = harness(); fixture(h);
  h.ui.state.capabilities = { addons: publicAddonCatalog() };
  h.ui.render();
  assert.ok(h.main().includes('Messagerie du dossier'));
  assert.ok(h.main().includes('La connexion OAuth'));
  assert.ok(h.main().includes('Aucun achat ni connexion fournisseur depuis cette liste.'));
  assert.ok(!/data-action="(?:checkout|purchase|connect|install)/u.test(h.main()));
  assert.equal(h.requests.length, 0);
});

test('schedule retry keeps its idempotency key and mandatory headers; a changed payload gets a new key', async () => {
  const h = harness(), { detail } = fixture(h), draft = form(h);
  let fail = true;
  h.handler = async path => {
    if (path.endsWith('/communications') && fail) { fail = false; throw new Error('Temporary network failure'); }
    return response(path === '/api/cases/case-a' ? detail() : {});
  };
  await h.ui.submitCommunication(draft);
  assert.ok(draft.error.textContent.includes('Temporary network failure'));
  await h.ui.submitCommunication(draft);
  const writes = h.requests.filter(request => request.path.endsWith('/communications'));
  assert.equal(writes.length, 2);
  const key = writes[0].options.headers['Idempotency-Key'];
  assert.equal(writes[1].options.headers['Idempotency-Key'], key);
  assert.equal(writes[1].options.headers['X-Requested-With'], 'XMLHttpRequest');
  assert.equal(writes[1].options.headers['Content-Type'], 'application/json');
  const payload = JSON.parse(writes[1].options.body);
  assert.equal(payload.scheduledAt, new Date(draft.data.scheduledAt).toISOString());
  assert.equal(payload.joinUrl, draft.data.joinUrl);
  draft.data.title = 'Autre objet fictif';
  await h.ui.submitCommunication(draft);
  assert.notEqual(h.requests.filter(request => request.path.endsWith('/communications'))[2].options.headers['Idempotency-Key'], key);
  assert.equal(h.ui.state.busy, false);
});

test('a member can start only their own timer; refreshed controls offer stop and no automatic billing', async () => {
  const h = harness(), { session, detail } = fixture(h, 'client');
  h.handler = async path => {
    if (path.endsWith('/start')) session.ownTimer = { status: 'running', startedAt: '2026-10-28T12:00:00Z', rateCentsPerMinute: null };
    return response(path === '/api/cases/case-a' ? detail() : {});
  };
  await h.ui.mutateCommunication('start', session.id, h.node('trigger'));
  assert.equal(h.requests[0].path, '/api/cases/case-a/communications/session-a/start');
  assert.equal(h.requests[0].options.body, '{}');
  assert.equal(actionEnabled(h.main(), 'communication-end', session.id), true);
  assert.ok(h.main().includes('Tarif non configuré'));
  assert.equal(h.ui.state.busy, false);
  const count = h.requests.length;
  await h.ui.mutateCommunication('start', session.id, h.node('trigger'));
  assert.equal(h.requests.length, count);
});

test('client scheduling, own usage approval and flagged durations are blocked before HTTP', async () => {
  const h = harness(), { item } = fixture(h, 'client');
  await h.ui.submitCommunication(form(h));
  item.role = 'owner';
  h.ui.state.detail.usage.entries = [{ id: 'own', authorSubject: 'member-a', status: 'submitted' }];
  await h.ui.mutateCommunication('approve', 'own', h.node('trigger'));
  h.ui.state.detail.usage.entries = [{ id: 'long', authorSubject: 'member-b', status: 'submitted', needsReview: true }];
  await h.ui.mutateCommunication('approve', 'long', h.node('trigger'));
  assert.equal(h.requests.length, 0);
  h.ui.state.detail.usage.entries = [{ id: 'other', authorSubject: 'member-b', status: 'submitted', needsReview: false }];
  await h.ui.mutateCommunication('approve', 'other', h.node('trigger'));
  assert.equal(h.requests[0].path, '/api/cases/case-a/usage/other/approve');
  assert.ok(h.node('toast').textContent.includes('Aucune facture'));
});

test('case change discards an in-flight action response and re-enables the new case controls', async () => {
  const h = harness(); fixture(h, 'client');
  let release;
  const b = { case: { id: 'case-b', title: 'Dossier fictif B', role: 'client' }, documents: [], communications: { sessions: [{ id: 'session-b', title: 'Autre rendez-vous', kind: 'phone', scheduledAt: '2026-10-30T10:00:00Z', status: 'scheduled', ownTimer: null }] }, usage: { entries: [] } };
  h.ui.state.cases.push(b.case);
  h.handler = async path => path.endsWith('/start') ? new Promise(resolve => { release = () => resolve(response({})); }) : response(b);
  const pending = h.ui.mutateCommunication('start', 'session-a', h.node('trigger'));
  await Promise.resolve(); await h.ui.loadCase('case-b');
  assert.equal(actionEnabled(h.main(), 'communication-start', 'session-b'), false);
  release(); await pending;
  assert.equal(h.ui.state.detail.case.id, 'case-b');
  assert.equal(actionEnabled(h.main(), 'communication-start', 'session-b'), true);
  assert.equal(h.ui.state.busy, false);
  assert.deepEqual(h.requests.map(item => item.path), ['/api/cases/case-a/communications/session-a/start', '/api/cases/case-b']);
});

test('session closure discards a pending reply, and a form from an older request cannot submit', async () => {
  const h = harness(); fixture(h);
  const stale = form(h); h.ui.state.requestVersion++;
  await h.ui.submitCommunication(stale);
  assert.equal(h.requests.length, 0);
  let release;
  h.handler = async () => new Promise(resolve => { release = () => resolve(response({})); });
  const pending = h.ui.mutateCommunication('start', 'session-a', h.node('trigger'));
  await Promise.resolve(); h.ui.clearSession(); release(); await pending;
  assert.equal(h.ui.state.mode, 'signedout');
  assert.equal(h.ui.state.detail, null);
  assert.equal(h.requests.length, 1);
});

test('phone scheduling sends no URL and an already timed session cannot be cancelled', async () => {
  const h = harness(), { session } = fixture(h), draft = form(h);
  draft.data.kind = 'phone';
  await h.ui.submitCommunication(draft);
  assert.equal(JSON.parse(h.requests[0].options.body).joinUrl, null);
  const cancel = form(h, 'communication-cancel-form'); cancel.dataset.id = session.id;
  session.ownTimer = { status: 'ended' };
  const count = h.requests.length;
  await h.ui.submitCommunication(cancel);
  assert.equal(h.requests.length, count);
  assert.ok(cancel.error.textContent.includes('ne peut plus être annulé'));
});

test('untrusted labels are escaped and long lists disclose the truncation', () => {
  const h = harness(), { session } = fixture(h);
  session.title = '<img src=x onerror=alert(1)>';
  session.joinUrl = 'javascript:alert(1)';
  h.ui.state.detail.communications.hasMore = true;
  h.ui.render();
  assert.ok(!h.main().includes('<img src=x'));
  assert.ok(h.main().includes('&lt;img'));
  assert.ok(!h.main().includes('href="javascript:'));
  assert.ok(h.main().includes('200 rendez-vous'));
});
