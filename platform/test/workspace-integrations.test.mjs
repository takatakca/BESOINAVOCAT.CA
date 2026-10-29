// Browser-controller behaviour of the Intégrations view and appointment buttons, with an isolated DOM facade.
// No network or real account; this does not replace visual browser QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const exported = ['state', 'start', 'render', 'integrationsView', 'communicationsView', 'connectIntegration', 'linkAppointment'];
assert.equal(source.split('  void start();').length, 2, 'The harness must replace exactly one bootstrap call.');

function harness(demo = false) {
  const nodes = new Map(), requests = [], assigned = [];
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {
      id, innerHTML: '', textContent: '', hidden: false, disabled: false, dataset: {}, open: false, isConnected: true,
      classList: { toggle() {} }, setAttribute() {}, removeAttribute() {}, addEventListener() {}, focus() {},
      close() { this.open = false; }, showModal() { this.open = true; }, querySelector() { return null; },
    });
    return nodes.get(id);
  };
  const h = { node, requests, assigned, handler: null };
  const context = vm.createContext({
    URL, URLSearchParams, Intl, Date, console, AbortSignal, crypto: { randomUUID },
    window: { location: { search: demo ? '?demo=1' : '', hash: '', assign: url => assigned.push(url) }, setTimeout: () => 1, clearTimeout() {} },
    document: { getElementById: node, querySelectorAll: () => [], addEventListener() {} },
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
const provider = (id, state, extra = {}) => ({ id, label: { zoom: 'Zoom', microsoft365: 'Outlook · Microsoft 365', google: 'Google Agenda', notarius: 'Notarius' }[id] || id,
  category: { zoom: 'video', microsoft365: 'calendar', google: 'calendar', notarius: 'signature' }[id] || 'practice', connectionType: id === 'notarius' ? 'partnership' : 'oauth',
  status: id === 'notarius' ? 'planned' : 'implemented', actions: id === 'notarius' ? [] : [id === 'zoom' ? 'meeting' : 'calendar_event'], routine: `Routine ${id}`, state,
  connection: null, ...extra });
const connectedAs = account => ({ connection: { status: 'connected', account, connectedAt: '2026-10-29T12:00:00.000Z', scopes: [] } });
function signedIn(h, role = 'lawyer', providers = []) {
  const item = { id: 'case-a', title: 'Dossier fictif A', reference: 'EXEMPLE', role };
  const session = { id: 'session-a', kind: 'video', title: 'Échange fictif', scheduledAt: '2026-10-30T14:00:00Z', status: 'scheduled', joinUrl: null, ownTimer: null };
  const detail = { case: item, documents: [], messages: [], timeEntries: [], communications: { sessions: [session], hasMore: false }, usage: { entries: [], hasMore: false, billingEnabled: false }, integrationLinks: [] };
  Object.assign(h.ui.state, { mode: 'authenticated', demo: false, user: { active: true, subject: 'member-a' }, selectedId: item.id, cases: [item], detail,
    integrations: { version: 'test', engine: { ready: true, reason: null, redirectUri: 'https://portail.example.test/integrations/callback' }, providers }, caseLoading: false, busy: false });
  return { item, session, detail };
}
const button = html => [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gu)].map(match => ({ attrs: match[1], text: match[2].replace(/<[^>]+>/gu, '') }));

test('the Intégrations view shows each real state, with buttons only where a connection is possible', () => {
  const h = harness();
  signedIn(h, 'lawyer', [provider('zoom', 'connected', connectedAs('avocate@example.test')), provider('microsoft365', 'available'),
    provider('google', 'not_configured'), provider('notarius', 'planned')]);
  h.ui.state.view = 'integrations'; h.ui.render();
  const html = h.main();
  assert.match(html, /Compte relié : avocate@example\.test/u);
  assert.match(html, /Prêt à connecter/u); assert.match(html, /Accès développeur à configurer/u); assert.match(html, /À venir/u);
  const buttons = button(html).filter(entry => /integration-/u.test(entry.attrs));
  assert.deepEqual(buttons.map(entry => [entry.attrs.match(/data-action="([^"]+)"/u)[1], entry.attrs.match(/data-id="([^"]+)"/u)[1]]),
    [['integration-disconnect', 'zoom'], ['integration-connect', 'microsoft365']]);
  assert.equal(h.requests.length, 0);
  // Before the server is ready, the view says so plainly.
  h.ui.state.integrations.engine = { ready: false, reason: 'key_not_configured', redirectUri: null }; h.ui.render();
  assert.match(h.main(), /Connexions pas encore ouvertes sur ce serveur/u);
});

test('the preview shows no account and sends nothing', async () => {
  const h = harness(true);
  await h.ui.start();
  h.ui.state.view = 'integrations'; h.ui.render();
  assert.match(h.main(), /Aucun compte réel dans l’aperçu/u);
  assert.equal(button(h.main()).filter(entry => /integration-connect/u.test(entry.attrs)).length, 0);
  assert.equal(h.requests.length, 0);
});

test('appointment buttons appear for a lawyer with a connected account, never for a client', () => {
  const h = harness();
  signedIn(h, 'lawyer', [provider('zoom', 'connected', connectedAs('a@example.test')), provider('microsoft365', 'connected', connectedAs('a@example.test')), provider('google', 'available')]);
  h.ui.state.view = 'communications'; h.ui.render();
  const labels = button(h.main()).filter(entry => /appointment-link/u.test(entry.attrs)).map(entry => entry.text.trim());
  assert.deepEqual(labels, ['Créer la réunion Zoom', 'Ajouter à Outlook']);
  // A meeting created through the connector becomes the appointment's Zoom link, for every member.
  h.ui.state.detail.integrationLinks = [{ id: 'l1', sessionId: 'session-a', provider: 'zoom', kind: 'meeting', url: 'https://us06web.zoom.us/j/81234567890?pwd=abc', mine: true }];
  h.ui.render();
  assert.match(h.main(), /href="https:\/\/us06web\.zoom\.us\/j\/81234567890\?pwd=abc"/u);
  assert.match(h.main(), /Réunion Zoom créée/u);
  assert.ok(button(h.main()).some(entry => /appointment-unlink/u.test(entry.attrs) && /data-provider="zoom"/u.test(entry.attrs)));
  const client = harness();
  signedIn(client, 'client', [provider('zoom', 'connected', connectedAs('c@example.test'))]);
  client.ui.state.view = 'communications'; client.ui.render();
  assert.equal(button(client.main()).filter(entry => /appointment-(link|unlink)/u.test(entry.attrs)).length, 0);
});

test('connecting opens the provider’s HTTPS consent page only; appointment actions post to the server route', async () => {
  const h = harness();
  signedIn(h, 'lawyer', [provider('zoom', 'connected', connectedAs('a@example.test'))]);
  h.handler = async path => response(path.endsWith('/connect') ? { authorizationUrl: 'https://zoom.us/oauth/authorize?state=abc' } : {});
  await h.ui.connectIntegration('zoom', h.node('trigger'));
  assert.deepEqual(h.assigned, ['https://zoom.us/oauth/authorize?state=abc']);
  const unsafe = harness();
  signedIn(unsafe, 'lawyer', []);
  unsafe.handler = async () => response({ authorizationUrl: 'javascript:alert(1)' });
  await unsafe.ui.connectIntegration('zoom', unsafe.node('trigger'));
  assert.deepEqual(unsafe.assigned, []);
  const posts = [];
  h.ui.state.busy = false;
  h.handler = async (path, options) => { if (options?.method === 'POST') posts.push(path); return response(path === '/api/cases/case-a' ? h.ui.state.detail : {}); };
  await h.ui.linkAppointment('session-a', 'zoom', h.node('link-trigger'));
  assert.deepEqual(posts, ['/api/cases/case-a/communications/session-a/integrations/zoom']);
  await h.ui.linkAppointment('session-a', 'evil', h.node('link-trigger'));
  assert.equal(posts.length, 1, 'only known providers');
});
