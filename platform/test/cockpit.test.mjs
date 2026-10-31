// Centre de commandement (cockpit, 30 October 2026): dials from loaded data only, « bientôt » states, honest status
// lights, the integration pop-up and the guided tour, with an isolated DOM facade. Synthetic data only; no network.
// Visual rendering, Escape on native dialogs and focus trapping are covered by the Chromium QA (docs/COCKPIT-2026-10-30.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const index = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
const exported = ['state', 'start', 'render', 'navigate', 'statusLights', 'workItems', 'activityEntries', 'openIntegrationModal', 'startTour', 'endTour', 'showTourStep', 'tutorialMemory', 'localResults', 'TOUR_STEPS', 'ACADEMY_URL', 'MIMT_STEPS', 'mimtMemory', 'instruments', 'guideMemory', 'helpMemory', 'GUIDE_TEXT', 'GUIDE_DISCLAIMER', 'workspaceView', 'wsMemory'];
assert.equal(source.split('  void start();').length, 2, 'The harness must replace exactly one bootstrap call.');

function harness(demo = false) {
  const nodes = new Map(), requests = [], assigned = [], listeners = {};
  const makeNode = id => ({
    id, innerHTML: '', textContent: '', hidden: false, disabled: false, dataset: {}, open: false, isConnected: true, focused: 0, value: '',
    listeners: {}, classes: new Set(),
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    setAttribute() {}, removeAttribute() {}, focus() { this.focused += 1; },
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
    close() { this.open = false; (this.listeners.close || []).forEach(fn => fn({})); }, showModal() { this.open = true; },
    querySelector() { return null; }, querySelectorAll() { return []; }, contains() { return false; },
  });
  const node = id => { if (!nodes.has(id)) nodes.set(id, makeNode(id)); return nodes.get(id); };
  // Zones the tour highlights: visible fake elements that record the highlight class.
  const zones = new Map();
  const zone = selector => {
    if (!zones.has(selector)) zones.set(selector, { selector, classes: new Set(), getClientRects: () => [1], scrollIntoView() {}, focus() { h.focused.push(selector); }, getBoundingClientRect: () => ({ top: 100, left: 100, right: 400, bottom: 200, width: 300, height: 100 }),
      classList: { add(c) { this.owner.classes.add(c); }, remove(c) { this.owner.classes.delete(c); } } });
    const z = zones.get(selector); z.classList.owner = z; return z;
  };
  const h = { node, nodes, requests, assigned, listeners, zones, handler: null, focused: [], lists: {} };
  const context = vm.createContext({
    URL, URLSearchParams, Intl, Date, console, AbortSignal, crypto: { randomUUID },
    window: { location: { search: demo ? '?demo=1' : '', hash: '', assign: url => assigned.push(url) }, setTimeout: () => 1, clearTimeout() {}, innerHeight: 900, innerWidth: 1440 },
    document: { getElementById: node, querySelectorAll: selector => h.lists[selector] || [], querySelector: selector => selector === 'dialog[open]' ? null : zone(selector), addEventListener(type, fn) { (listeners[type] ||= []).push(fn); }, body: { classList: { add() {}, remove() {} } }, activeElement: null },
    fetch: async (path, options) => {
      requests.push({ path, options });
      if (!h.handler) throw new Error('Unexpected HTTP request');
      return h.handler(path, options);
    },
  });
  vm.runInContext(source.replace('  void start();', `  globalThis.UI = { ${exported.join(',')} };`), context);
  h.ui = context.UI;
  h.main = () => node('main-content').innerHTML;
  // A click on a fake button: dataset drives the handler; inModal mimics a button inside the pop-up.
  h.click = (dataset, { inModal = false, id = '' } = {}) => {
    const button = { dataset, id, disabled: false, isConnected: true, focus() {}, classList: { contains: () => false },
      closest(selector) { return selector === 'button' ? this : selector === '#cockpit-modal' && inModal ? {} : null; } };
    for (const fn of listeners.click || []) fn({ target: button });
    return button;
  };
  return h;
}
const response = data => ({ status: 200, ok: true, json: async () => data });
const provider = (id, state, extra = {}) => ({ id, label: { zoom: 'Zoom', google: 'Google Agenda', notarius: 'Notarius', twilio: 'Twilio' }[id] || id,
  category: { zoom: 'video', google: 'calendar', notarius: 'signature', twilio: 'telephony' }[id] || 'practice', connectionType: id === 'notarius' ? 'partnership' : id === 'twilio' ? 'platform' : 'oauth',
  status: id === 'notarius' ? 'planned' : id === 'twilio' ? 'platform' : 'implemented', routine: `Routine ${id}`, state, connection: null, ...extra });
function signedIn(h, { role = 'lawyer', providers = [], health = { status: 'ok' } } = {}) {
  const cases = [{ id: 'case-a', title: 'Dossier fictif A', reference: 'FICTIF-A', role }, { id: 'case-b', title: 'Dossier fictif B', reference: 'FICTIF-B', role }];
  const soon = new Date(Date.now() + 2 * 86400000).toISOString(), later = new Date(Date.now() + 20 * 86400000).toISOString();
  const detail = {
    case: cases[0],
    documents: [
      { id: 'doc-1', name: 'bail-fictif.pdf', mimeType: 'application/pdf', sourceType: 'original', reviewStatus: 'a_verifier', versionNumber: 1, createdAt: '2026-10-29T10:00:00Z' },
      { id: 'doc-2', name: 'courriel-fictif.eml', mimeType: 'message/rfc822', sourceType: 'original', reviewStatus: 'a_verifier', versionNumber: 1, createdAt: '2026-10-29T11:00:00Z' },
      { id: 'doc-3', name: 'photo-fictive.jpg', mimeType: 'image/jpeg', sourceType: 'original', reviewStatus: 'controle_visuel', versionNumber: 1, createdAt: '2026-10-29T12:00:00Z' },
    ],
    messages: [{ id: 'm1', authorSubject: 'client-fictif', body: 'Message fictif', createdAt: '2026-10-30T09:00:00Z' }],
    timeEntries: [{ id: 't1', description: 'Lecture fictive', minutes: 45, authorSubject: 'client-fictif', status: 'submitted', createdAt: '2026-10-30T08:00:00Z' }],
    communications: { sessions: [{ id: 's1', kind: 'video', title: 'Rencontre fictive', scheduledAt: soon, status: 'scheduled', ownTimer: null }, { id: 's2', kind: 'phone', title: 'Plus tard fictif', scheduledAt: later, status: 'scheduled', ownTimer: null }], hasMore: false },
    usage: { entries: [], hasMore: false, billingEnabled: false }, integrationLinks: [],
  };
  Object.assign(h.ui.state, { mode: 'authenticated', demo: false, user: { active: true, subject: 'avocate-fictive' }, selectedId: 'case-a', cases, detail, view: 'home', health,
    integrations: { engine: { ready: true }, providers }, caseLoading: false, busy: false });
  return { cases, detail };
}
const chipOf = (html, label) => html.match(new RegExp(`<button type="button" class="chip[^"]*"[^>]*>(?:(?!</button>).)*${label}(?:(?!</button>).)*</button>`, 'su'))?.[0] || '';
const keydown = (h, event) => { for (const fn of h.listeners.keydown) fn(event); };

test('the cockpit home shows compact instruments from loaded data; unknown figures say « bientôt »', () => {
  const h = harness();
  signedIn(h);
  h.ui.render();
  const html = h.main();
  assert.match(html, /class="widget-rail" id="cockpit-dials" role="group"[^>]*data-no-swipe/u, 'horizontal swipes on the rail never change section');
  assert.match(chipOf(html, 'Dossiers accessibles'), /<span class="chip-value">2<\/span>/u);
  assert.match(chipOf(html, 'Pièces à vérifier'), /<span class="chip-value">2<\/span>/u, 'two of three documents are « à vérifier »');
  assert.match(chipOf(html, 'Temps soumis'), /<span class="chip-value">45 min<\/span>/u);
  assert.match(chipOf(html, 'Messages'), /<span class="chip-value">1<\/span>/u);
  assert.match(chipOf(html, '>Dossier<'), /FICTIF-A/u);
  assert.match(chipOf(html, 'Connexion'), /data-tone="ok"/u);
  assert.match(html, /data-clock>\d{1,2}\s?h\s?\d{2}</u, 'live clock instrument');
  for (const label of ['Nouvelles demandes', 'Échéances · 7 jours']) {
    const tile = chipOf(html, label);
    assert.match(tile, /class="chip-soon">bientôt</u);
    assert.doesNotMatch(tile, /chip-value/u, `${label} shows no invented number`);
  }
  assert.match(chipOf(html, 'Téléphonie MIMT'), /data-action="mimt-board"/u);
  for (const chip of html.match(/<button type="button" class="chip[^>]*>/gu)) assert.match(chip, /data-action="(cockpit-drawer|mimt-board)"/u, 'every instrument is a control');
  assert.match(html, /id="work-queue"/u); assert.match(html, /id="activity-feed"/u); assert.match(html, /id="cockpit-integrations"/u);
  assert.match(html, /dashboard-search-form/u, 'the full-text search stays reachable from the dashboard');
  assert.equal(h.requests.length, 0);
});

test('an instrument opens its content in the drawer under the bar, toggles, and closes with Escape', () => {
  const h = harness();
  signedIn(h); h.ui.render();
  assert.match(h.main(), /id="cockpit-drawer"[^>]*hidden/u);
  h.click({ action: 'cockpit-drawer', panel: 'pieces' });
  let html = h.main();
  assert.equal(h.ui.state.view, 'home', 'no page change');
  assert.match(html, /class="cockpit-drawer is-open" id="cockpit-drawer"/u);
  assert.match(html, /Pièces du dossier sélectionné/u);
  for (const name of ['bail-fictif.pdf', 'courriel-fictif.eml', 'photo-fictive.jpg']) assert.match(html, new RegExp(name.replace('.', '\\.'), 'u'));
  assert.match(chipOf(html, 'Pièces à vérifier'), /aria-expanded="true"/u);
  assert.ok(h.focused.includes('#cockpit-dials [data-panel="pieces"]'), 'focus stays on the instrument');
  for (const [panel, expected] of [['temps', /Lecture fictive/u], ['rendezvous', /Rencontre fictive/u], ['messages', /Message fictif/u], ['dossiers', /cockpit-select-case" data-id="case-b"/u], ['etat', /Sauvegarde : inconnu/u], ['demandes', /bientôt/u]]) {
    h.click({ action: 'cockpit-drawer', panel });
    assert.match(h.main(), expected, panel);
  }
  h.click({ action: 'cockpit-drawer', panel: 'demandes' });
  assert.equal(h.ui.state.cockpitPanel, null, 'a second click closes it');
  h.click({ action: 'cockpit-drawer', panel: 'temps' });
  keydown(h, { key: 'Escape', target: { closest: selector => selector === '#instrument-deck' ? {} : null }, preventDefault() {} });
  assert.equal(h.ui.state.cockpitPanel, null);
  h.click({ action: 'cockpit-drawer', panel: 'temps' });
  h.ui.navigate('cases'); h.ui.navigate('home');
  assert.equal(h.ui.state.cockpitPanel, null, 'leaving the cockpit closes the drawer');
  assert.equal(h.requests.length, 0);
});

test('rail keyboard: arrows, Home and End move between instruments; arrow buttons scroll the rail', () => {
  const h = harness();
  signedIn(h); h.ui.render();
  const focused = [];
  const chips = [0, 1, 2, 3].map(i => ({ i, focus() { focused.push(i); }, scrollIntoView() {} }));
  h.lists['#cockpit-dials .chip'] = chips;
  const press = (key, at) => { let prevented = false; keydown(h, { key, target: Object.assign(chips[at], { closest: selector => selector === '#cockpit-dials' ? {} : null }), preventDefault() { prevented = true; } }); return prevented; };
  assert.equal(press('ArrowRight', 0), true); assert.deepEqual([...focused], [1]);
  press('ArrowLeft', 1); press('End', 0); press('Home', 3); press('ArrowLeft', 0); press('ArrowRight', 3);
  assert.deepEqual([...focused], [1, 0, 3, 0, 0, 3]);
  const rail = h.node('cockpit-dials'); rail.clientWidth = 1000; const scrolls = []; rail.scrollBy = options => scrolls.push(options.left);
  h.click({ action: 'rail-next' }); h.click({ action: 'rail-prev' });
  assert.deepEqual([...scrolls], [800, -800]);
});

test('the work queue lists one line per item with a direct action, from the selected dossier only', () => {
  const h = harness();
  signedIn(h, { providers: [provider('google', 'reconnect_required')] });
  const items = h.ui.workItems();
  const titles = items.map(item => item.title);
  assert.ok(titles.includes('Reconnecter Google Agenda'));
  assert.ok(titles.includes('Rendez-vous : Rencontre fictive'));
  assert.ok(!titles.some(title => title.includes('Plus tard fictif')), 'appointments beyond 7 days are not in the queue');
  assert.ok(titles.includes('Temps à valider : Lecture fictive'));
  assert.deepEqual([...titles.filter(title => title.startsWith('Pièce à vérifier'))], ['Pièce à vérifier : bail-fictif.pdf', 'Pièce à vérifier : courriel-fictif.eml']);
  for (const item of items) assert.match(item.button, /<button [^>]*(data-action|data-view)=/u);
  // A client cannot validate time: no validation line.
  const client = harness(); signedIn(client, { role: 'client' });
  assert.ok(!client.ui.workItems().some(item => item.title.startsWith('Temps à valider')));
  // Without dossiers the queue proposes the first one, and the feed says it is empty.
  const empty = harness(); signedIn(empty); Object.assign(empty.ui.state, { cases: [], detail: null, selectedId: null }); empty.ui.render();
  assert.match(empty.main(), /Créer votre premier dossier/u);
  assert.match(empty.main(), /Aucune activité enregistrée dans le dossier sélectionné/u);
});

test('recent activity is built from existing records, newest first', () => {
  const h = harness();
  signedIn(h, { providers: [provider('zoom', 'connected', { connection: { account: 'a@example.test', connectedAt: '2026-10-30T10:00:00Z' } })] });
  const entries = h.ui.activityEntries();
  assert.equal(entries[0].text, 'Compte relié : Zoom');
  assert.ok(entries.some(entry => entry.text === 'Message au dossier' && entry.sub === 'Par client-fictif'));
  const times = [...entries.map(entry => new Date(entry.at).getTime())];
  assert.deepEqual(times, [...times].sort((a, b) => b - a));
});

test('status lights never show green for what the portal cannot verify', () => {
  const h = harness();
  signedIn(h, { health: { status: 'ok', emailCodeConfigured: true } });
  const lights = Object.fromEntries(h.ui.statusLights().map(light => [light.id, light]));
  assert.equal(lights.connexion.tone, 'ok');
  assert.equal(lights.courriel.tone, 'warn'); assert.match(lights.courriel.state, /non vérifiée/u);
  assert.equal(lights.sauvegarde.tone, 'unknown'); assert.equal(lights.sauvegarde.state, 'inconnu');
  h.ui.state.health = {}; assert.equal(h.ui.statusLights()[1].state, 'inconnu');
  Object.assign(h.ui.state, { mode: 'signedout', health: null });
  assert.equal(h.ui.statusLights()[0].tone, 'bad');
  const demo = harness(true); demo.ui.state.demo = true; demo.ui.state.mode = 'demo';
  assert.ok(demo.ui.statusLights().every(light => light.tone !== 'ok'), 'the preview has no verified connection');
});

test('calling and partner-lawyer tiles stay in « bientôt » mode without fake lawyers or calls', () => {
  const h = harness();
  signedIn(h); h.ui.render();
  const html = h.main();
  assert.match(html, /Téléphonie MIMT <span class="badge neutral">à venir<\/span>/u);
  assert.match(html, /Équipe · Appel de groupe <span class="badge neutral">bientôt<\/span>/u);
  assert.doesNotMatch(html, /Appeler un avocat/u, 'the old placeholder tile is replaced by the MIMT card');
  assert.doesNotMatch(html, /href="tel:/u);
  assert.doesNotMatch(html, /Me [A-Z]|disponible maintenant|en ligne maintenant|★/u);
  // No Academy address is documented: the link is a labelled placeholder, never an invented URL.
  assert.equal(h.ui.ACADEMY_URL, '');
  assert.match(html, /Formation TAKATAK Academy · lien à confirmer/u);
  assert.doesNotMatch(html, /academy[^"]*\.(?:ca|com)/iu);
  assert.match(index, /Assistant IA : bientôt/u);
  assert.doesNotMatch(source, /openai|anthropic|\/api\/ai\b|localStorage|sessionStorage/iu, 'no AI call and no browser storage in the portal script');
});

test('integration pop-up: explains what is shared, then asks for consent before the existing OAuth start', async () => {
  const h = harness();
  signedIn(h, { providers: [provider('zoom', 'available'), provider('notarius', 'planned'), provider('twilio', 'not_configured')] });
  h.ui.render();
  const modal = h.node('cockpit-modal'), content = h.node('cockpit-modal-content');
  // A « Connecter » click anywhere opens the pop-up first; nothing is requested yet.
  const trigger = h.click({ action: 'integration-connect', id: 'zoom' });
  assert.equal(modal.open, true);
  assert.equal(h.requests.length, 0);
  assert.match(content.innerHTML, /Ce qui est partagé/u);
  assert.match(content.innerHTML, /Aucun nom de client, aucune pièce et aucun message du dossier/u);
  assert.match(content.innerHTML, /id="cockpit-consent"/u);
  assert.match(content.innerHTML, /id="cockpit-confirm" data-action="integration-connect" data-id="zoom" disabled/u, 'confirmation waits for consent');
  // Closing returns focus to the card that opened it.
  h.click({ action: 'cockpit-modal-close' }, { inModal: true });
  assert.equal(modal.open, false);
  // The confirm button inside the pop-up starts the existing flow: POST /connect, then the provider's HTTPS page.
  h.ui.openIntegrationModal('zoom', trigger);
  h.handler = async () => response({ authorizationUrl: 'https://zoom.us/oauth/authorize?state=fictif' });
  h.click({ action: 'integration-connect', id: 'zoom' }, { inModal: true });
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.deepEqual(JSON.parse(JSON.stringify(h.requests.map(request => [request.path, request.options.method]))), [['/api/integrations/zoom/connect', 'POST']]);
  assert.deepEqual(h.assigned, ['https://zoom.us/oauth/authorize?state=fictif']);
  // Planned and unconfigured services say « bientôt » and offer no connection.
  h.ui.openIntegrationModal('notarius');
  assert.match(content.innerHTML, /Bientôt : cette intégration n’est pas encore réalisée/u);
  assert.doesNotMatch(content.innerHTML, /integration-connect/u);
  h.ui.openIntegrationModal('twilio');
  assert.match(content.innerHTML, /Bientôt : l’accès développeur de ce service n’est pas encore configuré/u);
  assert.doesNotMatch(content.innerHTML, /integration-connect/u);
});

test('the preview lists the connector catalog without any account and cannot connect', async () => {
  const h = harness(true);
  await h.ui.start();
  assert.equal(h.ui.state.view, 'home');
  const html = h.main();
  assert.match(html, /data-action="cockpit-integration" data-id="zoom"/u);
  assert.match(html, /Aperçu en lecture seule/u);
  h.ui.openIntegrationModal('zoom');
  const content = h.node('cockpit-modal-content').innerHTML;
  assert.match(content, /Aperçu : aucune connexion réelle/u);
  assert.doesNotMatch(content, /integration-connect/u);
  assert.equal(h.requests.length, 0);
});

test('guided tour: steps, highlighted zone, skip remembered for the page and never tied to dossier data', () => {
  const h = harness();
  signedIn(h); h.ui.render();
  assert.match(h.main(), /class="tour-banner"/u);
  h.click({ action: 'tutorial-start' });
  const tour = h.node('cockpit-tour'), content = h.node('cockpit-tour-content');
  assert.equal(tour.open, true);
  assert.match(content.innerHTML, /1 \/ 7/u);
  assert.match(content.innerHTML, /Une seule recherche/u);
  assert.ok(h.zones.get('#cockpit-search-form').classes.has('tour-target'));
  h.click({ action: 'tour-next' });
  assert.match(content.innerHTML, /2 \/ 7/u);
  assert.ok(!h.zones.get('#cockpit-search-form').classes.has('tour-target'), 'the previous highlight is removed');
  assert.ok(h.zones.get('#status-lights').classes.has('tour-target'));
  h.click({ action: 'tour-prev' });
  assert.match(content.innerHTML, /1 \/ 7/u);
  assert.match(content.innerHTML, /Seule votre progression dans la visite est retenue, jamais une donnée de dossier/u);
  h.click({ action: 'tour-skip' });
  assert.equal(tour.open, false);
  assert.equal(h.ui.tutorialMemory.status, 'skipped');
  assert.doesNotMatch(h.main(), /class="tour-banner"/u, 'a skipped tour does not come back on its own');
  h.ui.navigate('cases'); h.ui.navigate('home');
  assert.doesNotMatch(h.main(), /class="tour-banner"/u);
  assert.match(h.main(), /Revoir la visite/u);
  assert.deepEqual([...Object.keys(h.ui.tutorialMemory)].sort(), ['status', 'step'], 'only progress is remembered');
  h.ui.navigate('settings');
  assert.match(h.main(), /État : passée/u);
  // Escape (the dialog's cancel event) also skips.
  const again = harness(); signedIn(again); again.ui.render(); again.ui.startTour();
  for (const fn of again.node('cockpit-tour').listeners.cancel) fn({ preventDefault() {} });
  assert.equal(again.ui.tutorialMemory.status, 'skipped');
  // Finishing every step marks the tour as done.
  const done = harness(); signedIn(done); done.ui.render(); done.ui.startTour();
  for (let i = 0; i < done.ui.TOUR_STEPS.length; i += 1) done.click({ action: 'tour-next' });
  assert.equal(done.ui.tutorialMemory.status, 'done');
  assert.equal(done.node('cockpit-tour').open, false);
});

test('local search looks only at loaded names, sends nothing, and labels clients as « bientôt »', () => {
  const h = harness();
  signedIn(h);
  const found = h.ui.localResults('FICTIF');
  assert.deepEqual([...found.cases.map(item => item.id)], ['case-a', 'case-b']);
  assert.deepEqual([...h.ui.localResults('courriel').docs.map(doc => doc.id)], ['doc-2']);
  assert.equal(h.ui.localResults('   '), null);
  const input = h.node('cockpit-search'); input.value = 'bail';
  for (const fn of h.listeners.input) fn({ target: input });
  const box = h.node('cockpit-search-results');
  assert.equal(box.hidden, false);
  assert.match(box.innerHTML, /data-action="preview" data-id="doc-1"/u);
  assert.match(box.innerHTML, /Annuaire des clients : bientôt/u);
  assert.match(box.innerHTML, /Recherche locale dans les données déjà chargées\. Aucune IA n’est utilisée/u);
  assert.equal(h.requests.length, 0);
});

test('the page shell has the cockpit navigation, accessible dialogs and no inline code', () => {
  for (const view of ['home', 'cases', 'documents', 'clients', 'integrations', 'settings']) assert.match(index, new RegExp(`class="primary-nav"[\\s\\S]*data-view="${view}"`, 'u'));
  assert.match(index, /<dialog id="cockpit-modal" class="cockpit-modal" aria-labelledby="cockpit-modal-title" aria-describedby="cockpit-modal-desc">/u);
  assert.match(index, /<dialog id="cockpit-tour" class="cockpit-tour" aria-labelledby="cockpit-tour-title"/u);
  assert.match(index, /<label class="sr-only" for="cockpit-search">Recherche locale/u);
  assert.match(index, /class="tabbar"[\s\S]*data-view="home"[\s\S]*data-view="documents"[\s\S]*id="tabbar-more"/u);
  assert.ok(!/<script>(?!<\/script>)|style="/u.test(index), 'no inline script or style attribute');
  assert.doesNotMatch(styles, /@import|url\(["']?https?:/u, 'no external stylesheet or font');
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/u);
});

test('MIMT telephony: card, six-step board with real MIMT links, honest status, and nothing sent', () => {
  const h = harness();
  signedIn(h, { providers: [provider('zoom', 'available')] });
  h.ui.render();
  const html = h.main();
  assert.match(html, /class="integration-tile mimt-integration" data-action="mimt-board"/u, 'MIMT is the first integration tile');
  assert.ok(html.indexOf('mimt-integration') < html.indexOf('data-id="zoom"'));
  const modal = h.node('cockpit-modal'), content = h.node('cockpit-modal-content');
  h.click({ action: 'mimt-board' });
  assert.equal(modal.open, true);
  assert.equal(h.ui.MIMT_STEPS.length, 6);
  const titles = [...h.ui.MIMT_STEPS.map(step => step.title)];
  assert.deepEqual(titles, ['Créer ou ouvrir son compte MIMT', 'Choisir son numéro', 'Choisir le forfait et payer sur MIMT', 'Transférer son numéro existant (portage)', 'Relier le compte MIMT au profil BesoinAvocat', 'Appels et vidéo dans le portail']);
  const seen = [];
  for (let i = 0; i < 6; i += 1) {
    const page = content.innerHTML;
    assert.match(page, new RegExp(`Étape ${i + 1} / 6`, 'u'));
    assert.match(page, /À venir — MIMT Connect pas encore activé/u);
    assert.match(page, /Ce qui est partagé avec BesoinAvocat/u);
    assert.match(page, /aria-current="step"/u);
    for (const [, href] of page.matchAll(/<a [^>]*href="([^"]+)"/gu)) seen.push(href);
    if (i < 5) h.click({ action: 'mimt-next' }, { inModal: true });
  }
  assert.ok(seen.length >= 6);
  for (const href of seen) assert.match(href, /^https:\/\/(?:app\.)?mimt\.ca\/[a-z0-9/-]*$/u, `only public MIMT pages: ${href}`);
  for (const path of ['https://app.mimt.ca/connexion', 'https://app.mimt.ca/numero', 'https://mimt.ca/forfaits/', 'https://app.mimt.ca/services/transfert', 'https://mimt.ca/affaires/', 'https://mimt.ca/app-web/']) assert.ok(seen.includes(path), path);
  // The last step states the MIMT Connect contract: metadata only, no audio or transcript.
  assert.match(content.innerHTML, /call\.ringing, call\.answered, call\.completed, recording\.ready/u);
  assert.match(content.innerHTML, /Jamais d’audio ni de transcription/u);
  assert.doesNotMatch(content.innerHTML, /data-action="mimt-next"/u, 'no « Suivant » on the last step');
  h.click({ action: 'mimt-step', step: '4' }, { inModal: true });
  assert.equal(h.ui.mimtMemory.step, 4);
  assert.match(content.innerHTML, /PUT \/v1\/partner\/members\/:externalId/u);
  h.click({ action: 'mimt-prev' }, { inModal: true });
  assert.equal(h.ui.mimtMemory.step, 3);
  h.click({ action: 'cockpit-modal-close' }, { inModal: true });
  assert.equal(modal.open, false);
  assert.equal(h.requests.length, 0, 'the board calls nothing');
});

test('group calling explains the coming flow without any lawyer, call or amount', () => {
  const h = harness();
  signedIn(h); h.ui.render();
  h.click({ action: 'mimt-group' });
  const page = h.node('cockpit-modal-content').innerHTML;
  assert.match(page, /Équipe · Appel de groupe/u);
  assert.match(page, /bientôt/u);
  assert.match(page, /sonnent en même temps/u);
  assert.match(page, /Le premier qui accepte prend l’appel/u);
  assert.match(page, /Stripe/u); assert.match(page, /commission/u);
  assert.match(page, /revue déontologique/u);
  assert.doesNotMatch(page, /\d+\s?\$|CAD|%|Me [A-Z]|href="tel:/u, 'no amount, rate, lawyer name or phone link');
  assert.equal(h.requests.length, 0);
});

test('« Besoin d’aide ? » button: menu with the MIMT board, call-back, group calling and tour; Escape closes', () => {
  const h = harness();
  signedIn(h); h.ui.render();
  assert.equal(h.node('help-dock').hidden, false);
  h.click({}, { id: 'help-fab' });
  const menu = h.node('help-menu');
  assert.equal(menu.hidden, false); assert.equal(h.ui.helpMemory.menuOpen, true); assert.equal(h.ui.helpMemory.used, true);
  assert.match(menu.innerHTML, /data-action="mimt-board"[^>]*>.*Appeler · Téléphonie MIMT.*à venir/su);
  assert.match(menu.innerHTML, /data-action="call-lawyer">/u, 'the existing message-in-dossier call-back');
  assert.match(menu.innerHTML, /data-action="mimt-group"[^>]*>.*Équipe · appel de groupe.*bientôt/su);
  assert.match(menu.innerHTML, /data-action="tutorial-start"/u);
  assert.doesNotMatch(menu.innerHTML, /href="tel:/u);
  keydown(h, { key: 'Escape', target: { closest: () => null }, preventDefault() {} });
  assert.equal(menu.hidden, true);
  // Choosing an action closes the menu and runs it.
  h.click({}, { id: 'help-fab' });
  h.click({ action: 'mimt-group' }, { inModal: false });
  assert.equal(h.ui.helpMemory.menuOpen, false);
  assert.equal(h.node('cockpit-modal').open, true);
  assert.equal(h.requests.length, 0);
  // Without a dossier the call-back is disabled.
  const empty = harness(); signedIn(empty); Object.assign(empty.ui.state, { detail: null, selectedId: null }); empty.ui.render();
  empty.click({}, { id: 'help-fab' });
  assert.match(empty.node('help-menu').innerHTML, /data-action="call-lawyer" disabled/u);
});

test('the pulse is slow and switched off by reduced motion and after first use', () => {
  const pulse = styles.match(/\.help-fab \{[^}]*animation: fab-pulse ([\d.]+)s/u);
  assert.ok(pulse, 'pulse animation declared');
  assert.ok(1 / Number(pulse[1]) < 3, 'well under 3 flashes per second');
  assert.ok(Number(pulse[1]) >= 2, 'slow glow');
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\) \{ \.help-fab \{ animation: none !important; \}/u);
  assert.match(styles, /\.help-fab\.is-quiet \{ animation: none; \}/u);
});

test('BesoinAvocat guide: exact text, disclaimer, existing actions only, once per session, no network', async () => {
  const h = harness();
  signedIn(h); h.ui.render();
  const guide = h.node('cockpit-guide');
  assert.equal(guide.hidden, false, 'opens by itself the first time');
  assert.equal(h.ui.guideMemory.autoShown, true);
  const html = guide.innerHTML;
  assert.ok(html.includes('« Je suis là pour vous aider et vous guider. Pas vous conseiller, mais bien vous guider à préparer votre dossier pour votre avocat. »'));
  assert.equal(h.ui.GUIDE_TEXT, '« Je suis là pour vous aider et vous guider. Pas vous conseiller, mais bien vous guider à préparer votre dossier pour votre avocat. »');
  assert.ok(html.includes(h.ui.GUIDE_DISCLAIMER));
  assert.match(h.ui.GUIDE_DISCLAIMER, /pas un cabinet d’avocats et ne donne aucun conseil juridique/u);
  assert.match(html, /Assistant IA : réponses automatiques bientôt — aucun conseil juridique/u);
  assert.match(html, /<svg class="guide-robot large"[^>]*role="img"/u, 'original inline illustration');
  for (const control of ['data-action="tutorial-start"', 'data-action="upload"', 'data-view="messages"', 'data-view="communications"']) assert.ok(html.includes(control), control);
  assert.doesNotMatch(html, /<input|<textarea|<form/u, 'no free-text question box: nothing is sent to an AI');
  // Escape minimises it to the robot button; it does not reopen by itself.
  keydown(h, { key: 'Escape', target: { closest: selector => selector === '#cockpit-guide' ? {} : null }, preventDefault() {} });
  assert.equal(guide.hidden, true); assert.equal(h.node('guide-avatar').hidden, false);
  assert.ok(h.node('guide-avatar').focused >= 1, 'focus returns to the robot button');
  h.ui.navigate('cases'); h.ui.navigate('home');
  assert.equal(guide.hidden, true, 'once per session');
  h.click({}, { id: 'guide-avatar' });
  assert.equal(guide.hidden, false);
  h.click({ action: 'guide-close' });
  assert.equal(guide.hidden, true);
  // In the preview, adding a piece points to the Pièces page (no upload).
  const demo = harness(true); await demo.ui.start();
  assert.match(demo.node('cockpit-guide').innerHTML, /data-view="documents"/u);
  assert.equal(h.requests.length, 0); assert.equal(demo.requests.length, 0);
  assert.deepEqual(source.match(/\bfetch\([^,)]*/gu), ['fetch(path', "fetch('/api/health'"], 'same-origin api() and health only: no other network call');
});

// Desktop workspace (31 October 2026): three panes on wide screens, built from loaded data only.
test('desktop workspace: dossiers list, selected dossier stage with tabs, guide and MIMT calls; nothing invented', () => {
  const h = harness();
  signedIn(h);
  const html = h.ui.workspaceView();
  assert.match(html, /<div class="ws" id="ws">/u);
  assert.equal((html.match(/class="ws-case[^"]*" data-action="ws-select"/gu) || []).length, 2, 'one row per accessible dossier');
  assert.match(html, /class="ws-case is-active" data-action="ws-select" data-id="case-a"[^>]*aria-current="true"/u);
  assert.doesNotMatch(html, /style="/u, 'the CSP forbids style attributes');
  assert.match(html, /class="ws-ring" data-p="33"/u, "one of three documents has a visual check");
  assert.match(html, /Vérifier 2 pièces/u);
  for (const view of ['documents', 'messages', 'communications', 'time', 'search']) assert.match(html, new RegExp(`class="ws-tab" data-view="${view}"`, 'u'));
  assert.match(html, /id="cockpit-dials"/u, 'the instruments stay on the stage');
  assert.match(html, /id="work-queue"/u); assert.match(html, /id="activity-feed"/u);
  assert.match(html, /data-action="mimt-board"[^>]*>.*?à venir/su, 'calls come from MIMT only and say « à venir »');
  assert.match(html, /data-action="mimt-group"/u);
  assert.match(html, /IA bientôt/u, 'no AI answer is pretended');
  assert.ok(html.includes(h.ui.GUIDE_DISCLAIMER.replace(/’/gu, '&#39;').slice(0, 30)) || html.includes(h.ui.GUIDE_DISCLAIMER.slice(0, 30)));
  assert.match(html, /Rencontre fictive/u, 'upcoming meeting from the loaded dossier');
  assert.equal(h.requests.length, 0);
});

test('desktop workspace: the dossier filter is local and an empty list says so', () => {
  const h = harness();
  signedIn(h);
  h.ui.wsMemory.query = 'fictif b';
  let html = h.ui.workspaceView();
  assert.equal((html.match(/data-action="ws-select"/gu) || []).length, 1);
  h.ui.wsMemory.query = 'introuvable';
  html = h.ui.workspaceView();
  assert.match(html, /Aucun dossier ne correspond au filtre/u);
  h.ui.wsMemory.query = '';
  assert.equal(h.requests.length, 0);
});

test('without a wide screen (or matchMedia) the home stays the cockpit', () => {
  const h = harness();
  signedIn(h); h.ui.render();
  assert.doesNotMatch(h.main(), /id="ws"/u);
  assert.match(h.main(), /class="cockpit"/u);
});
