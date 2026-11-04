import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { once } from 'node:events';
import { randomUUID, webcrypto } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';
import { createIntake } from '../lib/intake.mjs';
import { CONSENT_VERSION, CONSENT_TEXT, REQUEST_CONSENT_VERSION, REQUEST_CONSENT_TEXT, DOMAINS, REGIONS, STAGES, OBJECTIVES, URGENCIES,
  CONTACT_PREFERENCES, publicCatalog } from '../lib/catalog.mjs';
import { QUESTIONNAIRE_SCHEMA, QUESTIONNAIRE_VERSION, QUESTIONNAIRE_CONSENT_TEXT } from '../lib/questionnaire.mjs';

const script = fs.readFileSync(new URL('../public/demande.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../public/demande.html', import.meta.url), 'utf8');
const context = { module: { exports: {} }, URL, URLSearchParams, Uint8Array, TextDecoder, AbortController, setTimeout, clearTimeout };
vm.runInNewContext(script, context, { filename: 'demande.js' });
const api = context.module.exports;
const plain = (value) => JSON.parse(JSON.stringify(value));
const PORTAL = 'https://portail.example.test';
const in30days = () => { const d = new Date(Date.now() + 30 * 86_400_000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function detailedState(overrides = {}) {
  return { ...api.initialState('client', 'fr', true), questionnaireSchema: plain(QUESTIONNAIRE_SCHEMA), domain: 'housing', region: 'laval',
    answers: { topic: 'repairs', housingRole: 'tenant', repairNotice: 'no' }, reviewed: true, stage: 'considering', objective: 'understand',
    summary: '  Avis reçu du propriétaire.\r\nJe veux connaître mes options.  ', urgency: 'week', hasDeadline: 'no',
    otherPartiesStatus: 'named', otherPartiesNames: '  Gestion   Synthétique inc.  ', legalAidInterest: 'check', household: 'single', income: 'under_30000',
    availabilityMode: 'asap', contactTimes: ['evening', 'morning'], acceptRemote: true,
    name: 'Personne Synthétique', email: 'synthetic@example.test', consent: true, ...overrides };
}

test('loading the page script performs no request and uses no browser storage, cookies or beacons', () => {
  let calls = 0;
  vm.runInNewContext(script, { module: { exports: {} }, fetch() { calls++; } });
  assert.equal(calls, 0);
  assert.doesNotMatch(script, /localStorage|sessionStorage|indexedDB|document\.cookie|sendBeacon|Math\.random/);
  assert.match(script, /credentials: 'omit'/);
  assert.match(script, /const ENDPOINT = '\/api\/intake', CATALOG = '\/api\/catalog'/);
});

test('choices, consent versions and exact consent texts match the server catalogue', () => {
  assert.equal(api.CONSENT_VERSION, CONSENT_VERSION); assert.equal(api.REQUEST_CONSENT_VERSION, REQUEST_CONSENT_VERSION);
  assert.equal(api.QUESTIONNAIRE_VERSION, QUESTIONNAIRE_VERSION);
  for (const language of ['fr', 'en']) {
    assert.equal(api.COPY[language].consent, CONSENT_TEXT[language]);
    assert.equal(api.COPY[language].flowConsent, QUESTIONNAIRE_CONSENT_TEXT[language]);
  }
  const flow = QUESTIONNAIRE_SCHEMA.flow;
  for (const [server, client] of [[flow.otherParties.statuses, api.OTHER_PARTY_STATUSES], [flow.legalAid.interest, api.LEGAL_AID_INTEREST],
    [flow.legalAid.household, api.HOUSEHOLDS], [flow.legalAid.income, api.INCOMES], [flow.availability.periods, api.PERIODS], [flow.contactTimes, api.CONTACT_TIMES]]) {
    assert.deepEqual(Object.keys(client), server.map((item) => item.id));
    for (const item of server) assert.deepEqual(plain(client[item.id]), [item.label.fr, item.label.en]);
  }
  assert.deepEqual(plain(api.SKIP_PARTIES), [...flow.otherParties.skipFor]); assert.deepEqual(plain(api.SKIP_LEGAL_AID), [...flow.legalAid.skipFor]);
  assert.equal(Object.keys(api.DOMAINS).length, 16);
  for (const [server, client] of [[DOMAINS, api.DOMAINS], [REGIONS, api.REGIONS], [STAGES, api.STAGES], [OBJECTIVES, api.OBJECTIVES],
    [URGENCIES, api.URGENCIES], [CONTACT_PREFERENCES, api.CONTACT_PREFERENCES]]) {
    assert.deepEqual(Object.keys(client).sort(), server.map((item) => item.id).sort());
    for (const item of server) assert.deepEqual(plain(client[item.id]), [item.label.fr, item.label.en]);
  }
  const plans = publicCatalog().professional.plans;
  assert.deepEqual(Object.keys(api.PLANS).sort(), plans.map((plan) => plan.id).sort());
  assert.deepEqual(Object.keys(api.COPY.fr).sort(), Object.keys(api.COPY.en).sort());
  for (const [key, value] of Object.entries(api.COPY.fr)) { assert.ok(value.length, key); assert.ok(api.COPY.en[key].length, key); }
});

test('the guided path follows the domain: conflict check and legal aid are skipped where they do not apply', () => {
  const steps = (domain, extra = {}) => plain(api.stepsFor(detailedState({ domain, ...extra })));
  assert.deepEqual(steps('housing'), ['domain', 'details', 'situation', 'parties', 'timing', 'legalAid', 'availability', 'contact', 'review']);
  assert.deepEqual(steps('criminal'), ['domain', 'details', 'situation', 'timing', 'legalAid', 'availability', 'contact', 'review']);
  assert.deepEqual(steps('immigration'), ['domain', 'details', 'situation', 'timing', 'legalAid', 'availability', 'contact', 'review']);
  assert.deepEqual(steps('business'), ['domain', 'details', 'situation', 'parties', 'timing', 'availability', 'contact', 'review']);
  assert.deepEqual(steps('municipal'), ['domain', 'situation', 'parties', 'timing', 'legalAid', 'availability', 'contact', 'review'], 'no domain questions, no details step');
  assert.deepEqual(plain(api.stepsFor(api.initialState('client', 'fr', false))), ['domain', 'contact', 'review']);
  assert.deepEqual(plain(api.stepsFor(api.initialState('professional', 'fr', true))), ['domain', 'preferences', 'contact', 'review']);
  assert.equal(api.consentVersionFor(api.initialState('client', 'fr', true)), QUESTIONNAIRE_VERSION);
  assert.equal(api.consentVersionFor(api.initialState('client', 'fr', false)), CONSENT_VERSION);
  assert.equal(api.consentVersionFor(api.initialState('professional', 'fr', true)), CONSENT_VERSION);
});

test('staged validation stops at the requested step and names the field to fix', () => {
  const state = { ...api.initialState('client', 'fr', true), questionnaireSchema: plain(QUESTIONNAIRE_SCHEMA) };
  assert.equal(api.validate(state, 'domain').field, 'domain');
  state.domain = 'family';
  assert.equal(api.validate(state, 'domain'), null);
  assert.equal(api.validate(state, 'details').key, 'missingQuestionnaire');
  state.answers = { topic: 'separation', relationship: 'unsure', arrangement: 'yes', agreementGoal: 'understand' };
  assert.equal(api.validate(state, 'details'), null);
  assert.equal(api.validate(state, 'situation').field, 'stage');
  Object.assign(state, { stage: 'none', objective: 'other', summary: 'x'.repeat(19) });
  assert.equal(api.validate(state, 'situation').key, 'invalidSummary');
  state.summary = 'Résumé synthétique suffisant <script>';
  assert.equal(api.validate(state, 'situation').key, 'invalidSummary');
  state.summary = 'Résumé synthétique suffisamment long.';
  assert.equal(api.validate(state, 'parties').key, 'missingParties');
  state.otherPartiesStatus = 'named';
  assert.equal(api.validate(state, 'parties').key, 'invalidPartyNames');
  state.otherPartiesNames = 'Nom <b>';
  assert.equal(api.validate(state, 'parties').key, 'invalidPartyNames');
  state.otherPartiesNames = 'x'.repeat(301);
  assert.equal(api.validate(state, 'parties').key, 'invalidPartyNames');
  state.otherPartiesNames = 'Partie Synthétique';
  assert.equal(api.validate(state, 'timing').field, 'urgency');
  Object.assign(state, { urgency: 'immediate', hasDeadline: 'yes', deadline: '2020-01-01' });
  assert.equal(api.validate(state, 'timing').key, 'invalidDeadline');
  state.deadline = in30days();
  assert.equal(api.validate(state, 'timing'), null);
  assert.equal(api.validate(state, 'legalAid').key, 'missingLegalAid');
  state.legalAidInterest = 'check';
  assert.equal(api.validate(state, 'legalAid').key, 'missingHousehold');
  state.household = 'couple_children';
  assert.equal(api.validate(state, 'legalAid').key, 'missingIncome');
  state.income = 'undisclosed';
  assert.equal(api.validate(state, 'availability').key, 'missingAvailability');
  state.availabilityMode = 'slots';
  assert.equal(api.validate(state, 'availability').key, 'invalidSlots');
  const days = plain(api.availabilityDays());
  assert.equal(days.length, 14);
  state.slots = days.slice(0, 11).map((day) => day + ':morning');
  assert.equal(api.validate(state, 'availability').key, 'invalidSlots', 'more than ten slots');
  state.slots = ['2020-01-01:morning'];
  assert.equal(api.validate(state, 'availability').key, 'invalidSlots', 'past slot');
  state.slots = [days[0] + ':midnight'];
  assert.equal(api.validate(state, 'availability').key, 'invalidSlots', 'unknown period');
  state.slots = [days[0] + ':morning', days[0] + ':evening', days[3] + ':noon'];
  assert.equal(api.validate(state, 'availability'), null);
  assert.equal(api.validate(state, 'contact').field, 'region');
  state.region = 'montreal';
  assert.equal(api.validate(state, 'contact').field, 'name');
  Object.assign(state, { name: 'Nom', email: 'nom@example.test', contactPreference: 'phone' });
  assert.equal(api.validate(state, 'contact').key, 'phoneMissing');
  state.phone = '514 555 0100';
  assert.equal(api.validate(state, 'contact').key, 'consentRequired');
  state.consent = true;
  assert.equal(api.validate(state, 'contact'), null);
  assert.equal(api.validate(state).key, 'reviewRequired');
  state.reviewed = true;
  assert.equal(api.validate(state), null);
  for (const [field, value] of [['stage', '__proto__'], ['objective', 'constructor'], ['urgency', 'hasOwnProperty'], ['region', 'toString'],
    ['otherPartiesStatus', '__proto__'], ['household', 'constructor'], ['income', 'toString'], ['availabilityMode', 'valueOf']]) {
    assert.ok(api.validate({ ...state, [field]: value }), field);
  }
  const business = { ...state, domain: 'business', answers: { topic: 'corporate', businessRole: 'owner', businessStage: 'planning' }, legalAidInterest: '' };
  assert.equal(api.validate(business), null, 'legal aid is not asked for business');
  const criminal = { ...state, domain: 'criminal', answers: { topic: 'ticket', documentAvailable: 'yes', ticketStep: 'none' }, otherPartiesStatus: '' };
  assert.equal(api.validate(criminal), null, 'other parties are not asked in criminal matters');
});

test('deadline bounds use the visitor’s day and reject impossible or out-of-range dates', () => {
  const now = new Date(2026, 9, 26, 23, 0, 0);
  assert.deepEqual(plain(api.deadlineBounds(now)), { min: '2026-10-26', max: '2031-10-29' });
  for (const value of ['2026-10-26', '2031-10-29']) assert.equal(api.validDeadline(value, now), true, value);
  for (const value of ['2026-10-25', '2031-10-30', '2026-02-30', '0000-01-01', '26-10-2026', '']) assert.equal(api.validDeadline(value, now), false, value);
});

test('every payload the page builds is accepted unchanged by the real intake service', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'ba-demande-test-'));
  const service = createIntake({ config: { origins: [PORTAL], dbPath: path.join(root, 'intake.sqlite'), requestEnabled: true } });
  t.after(async () => { service.clear(); await rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 }); });
  const detailed = plain(api.payloadFrom(detailedState({ hasDeadline: 'yes', deadline: in30days(), contactPreference: 'phone', phone: '+1 514 555 0100' })));
  assert.deepEqual(Object.keys(detailed).sort(), ['acceptRemote', 'availability', 'consent', 'consentVersion', 'contactPreference', 'contactTimes', 'deadline', 'domain',
    'email', 'language', 'legalAid', 'name', 'objective', 'otherParties', 'phone', 'questionnaire', 'region', 'role', 'stage', 'summary', 'urgency', 'website'].sort());
  assert.equal(detailed.summary, 'Avis reçu du propriétaire.\nJe veux connaître mes options.');
  assert.deepEqual(detailed.otherParties, { status: 'named', names: 'Gestion Synthétique inc.' });
  assert.deepEqual(detailed.legalAid, { interest: 'check', household: 'single', income: 'under_30000' });
  assert.deepEqual(detailed.availability, { asap: true });
  assert.deepEqual(detailed.contactTimes, ['morning', 'evening'], 'contact times are sent in the catalogue order');
  assert.equal(detailed.acceptRemote, true);
  const noDeadline = plain(api.payloadFrom(detailedState({ email: 'other@example.test' })));
  assert.equal('deadline' in noDeadline, false);
  const days = plain(api.availabilityDays());
  const slots = plain(api.payloadFrom(detailedState({ email: 'slots@example.test', availabilityMode: 'slots', slots: [days[2] + ':evening', days[0] + ':noon'] })));
  assert.deepEqual(slots.availability, { slots: [days[0] + ':noon', days[2] + ':evening'] });
  const criminal = plain(api.payloadFrom(detailedState({ email: 'criminal@example.test', domain: 'criminal', answers: { topic: 'ticket', documentAvailable: 'yes', ticketStep: 'none' } })));
  assert.equal('otherParties' in criminal, false, 'no names are collected for criminal matters');
  const business = plain(api.payloadFrom(detailedState({ email: 'business@example.test', domain: 'business', answers: { topic: 'corporate', businessRole: 'owner', businessStage: 'planning' } })));
  assert.equal('legalAid' in business, false);
  const municipal = plain(api.payloadFrom(detailedState({ email: 'municipal@example.test', domain: 'municipal', answers: {}, otherPartiesStatus: 'unknown' })));
  assert.deepEqual(municipal.questionnaire.answers, {}); assert.deepEqual(municipal.otherParties, { status: 'unknown' });
  const contact = plain(api.payloadFrom({ ...api.initialState('client', 'en', false), domain: 'civil', region: 'estrie', name: 'Synthetic', email: 'contact@example.test', consent: true }));
  assert.equal(contact.consentVersion, CONSENT_VERSION); assert.equal('summary' in contact, false);
  const lawyer = plain(api.payloadFrom({ ...api.initialState('professional', 'fr', true), domain: 'business', region: 'montreal', periodicity: 'weekly', name: 'Avocate', email: 'lawyer@example.test', consent: true }));
  assert.equal(lawyer.periodicity, 'weekly'); assert.equal('summary' in lawyer, false);
  for (const payload of [detailed, noDeadline, slots, criminal, business, municipal, contact, lawyer]) assert.equal(service.receive(payload, randomUUID(), PORTAL).status, 'received');
});

test('service state comes only from matching consent versions; preselection reads only enumerated values', () => {
  const open = publicCatalog({ intakeConfigured: true, requestEnabled: true });
  assert.deepEqual(plain(api.serviceFrom(open)), { open: true, requestMode: true });
  assert.deepEqual(plain(api.serviceFrom(publicCatalog({ intakeConfigured: true }))), { open: true, requestMode: false });
  assert.deepEqual(plain(api.serviceFrom(publicCatalog())), { open: false, requestMode: false });
  const stale = structuredClone(open); stale.intake.request.questionnaire.consent.version = 'other';
  assert.deepEqual(plain(api.serviceFrom(stale)), { open: true, requestMode: false });
  for (const bad of [null, {}, { intake: { enabled: 'true' } }, 'x']) assert.deepEqual(plain(api.serviceFrom(bad)), { open: false, requestMode: false });
  assert.deepEqual(plain(api.preselection('?domaine=family&lang=en')), { domain: 'family', language: 'en' });
  assert.deepEqual(plain(api.preselection('?role=professional&formule=weekly')), { role: 'professional', periodicity: 'weekly' });
  assert.deepEqual(plain(api.preselection('?domaine=__proto__&email=a@b.c&name=x&lang=de&formule=yearly')), {});
});

test('idempotent attempts keep one key per exact body and receipts must match the exact contract', () => {
  const attempts = api.createAttempt(webcrypto);
  const body = api.payloadFrom(detailedState());
  const first = attempts.prepare(body), retry = attempts.prepare(body);
  assert.deepEqual(plain(retry), plain(first));
  assert.notEqual(attempts.prepare({ ...body, region: 'montreal' }).key, first.key);
  assert.throws(() => api.createAttempt(null).prepare({}), /secureUnavailable/);
  assert.equal(api.receiptFrom(201, { reference: 'BA-abcdefghijklmnopqrstuvwx', status: 'received' }), 'BA-abcdefghijklmnopqrstuvwx');
  for (const [status, value] of [[200, { reference: 'BA-abcdefghijklmnopqrstuvwx', status: 'received' }], [201, { reference: '<b>', status: 'received' }], [201, { status: 'received' }]]) {
    assert.equal(api.receiptFrom(status, value), '');
  }
});

test('the page is static, script-free in markup and served with the strict CSP', async (t) => {
  assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/i, 'no inline script');
  assert.doesNotMatch(html, /\sstyle=|\son[a-z]+=/i, 'no inline style or handler');
  assert.match(html, /<script src="\/demande\.js" defer><\/script>/);
  assert.match(html, /data-ba-request[\s>]/);
  const root = await mkdtemp(path.join(tmpdir(), 'ba-demande-http-'));
  const app = createApp({ dbPath: path.join(root, 'cases.sqlite'), blobDir: path.join(root, 'blobs'), env: {} });
  t.after(async () => { if (app.listening) await new Promise((resolve) => app.close(resolve)); await rm(root, { recursive: true, force: true }); });
  app.listen(0, '127.0.0.1'); await once(app, 'listening');
  const base = `http://127.0.0.1:${app.address().port}`;
  for (const [route, type] of [['/demande', 'text/html'], ['/demande/', 'text/html'], ['/demande.js', 'text/javascript'], ['/demande.css', 'text/css'], ['/fonts/inter-latin.woff2', 'font/woff2'], ['/fonts/montserrat-latin.woff2', 'font/woff2'], ['/fonts/jetbrains-mono-latin.woff2', 'font/woff2'], ['/brand/besoinavocat-logo.png', 'image/png']]) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get('content-type'), new RegExp(type));
    assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    await response.arrayBuffer();
  }
  assert.equal((await fetch(base + '/demande.html')).status, 404);
  assert.equal((await fetch(base + '/demande', { method: 'POST' })).status, 405);
});

test('a same-origin page submission is received without any cookie or credentials', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'ba-demande-post-'));
  const env = { BESOINAVOCAT_INTAKE_DB_PATH: path.join(root, 'intake.sqlite'), BESOINAVOCAT_INTAKE_ALLOWED_ORIGINS: JSON.stringify([PORTAL]), BESOINAVOCAT_INTAKE_REQUEST_ENABLED: 'true' };
  const app = createApp({ dbPath: path.join(root, 'cases.sqlite'), blobDir: path.join(root, 'blobs'), env });
  t.after(async () => { if (app.listening) await new Promise((resolve) => app.close(resolve)); await rm(root, { recursive: true, force: true }); });
  app.listen(0, '127.0.0.1'); await once(app, 'listening');
  const base = `http://127.0.0.1:${app.address().port}`;
  const service = await api.loadService(async (url, init) => fetch(base + url, init));
  assert.equal(service.open, true); assert.equal(service.requestMode, true);
  assert.deepEqual(plain(service.questionnaireSchema), publicCatalog().intake.request.questionnaire);
  const attempt = api.createAttempt(webcrypto).prepare(api.payloadFrom(detailedState()));
  // Node fetch sends no Origin; the browser adds the page origin, which is what the server checks.
  const result = await api.sendRequest(attempt, async (url, init) => fetch(base + url, { ...init, headers: { ...init.headers, Origin: PORTAL } }));
  assert.match(result.reference, /^BA-[A-Za-z0-9_-]{24}$/);
  const withCookie = await fetch(base + '/api/intake', { method: 'POST', body: attempt.body,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'Idempotency-Key': randomUUID(), Origin: PORTAL, Cookie: '__Host-ba_session=synthetic' } });
  assert.equal(withCookie.status, 403);
});
