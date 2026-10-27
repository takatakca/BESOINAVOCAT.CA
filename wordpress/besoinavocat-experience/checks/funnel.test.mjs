import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { CONSENT_VERSION as SERVER_CONSENT_VERSION, CONSENT_TEXT, DOMAINS as SERVER_DOMAINS, REGIONS as SERVER_REGIONS, publicCatalog } from '../../../platform/lib/catalog.mjs';

const script = fs.readFileSync(new URL('../assets/funnel.js', import.meta.url), 'utf8');
const context = { module: { exports: {} }, URL, Uint8Array, TextDecoder, AbortController, setTimeout, clearTimeout };
vm.runInNewContext(script, context, { filename: 'funnel.js' });
const api = context.module.exports;
const plain = (value) => JSON.parse(JSON.stringify(value));
function valid(role = 'client') {
  return { ...api.initialState(role, 'fr'), name: 'Nom de test', email: 'test@example.test', domain: 'civil', region: 'montreal', consent: true };
}
function reply(status, value, headers = {}) {
  return new Response(typeof value === 'string' ? value : JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

test('loading the module performs no fetch and exposes only explicit browser entry points', () => {
  let calls = 0;
  const isolated = { module: { exports: {} }, fetch() { calls++; } };
  vm.runInNewContext(script, isolated);
  assert.equal(calls, 0);
  assert.deepEqual(Object.keys(isolated.BAIntakeFunnel).sort(), ['init', 'open']);
  assert.equal(isolated.BAIntakeFunnel.open('not-a-page'), false);
  assert.doesNotMatch(script, /localStorage|sessionStorage|document\.cookie|sendBeacon/);
});

test('the endpoint must be explicit HTTPS with the exact intake path and no secrets or URL payload', () => {
  assert.equal(api.safeEndpoint('', 'https://besoinavocat.ca'), '');
  assert.equal(api.safeEndpoint('/api/intake', 'https://besoinavocat.ca'), 'https://besoinavocat.ca/api/intake');
  assert.equal(api.safeEndpoint('https://portal.example.test/api/intake', 'https://besoinavocat.ca'), 'https://portal.example.test/api/intake');
  for (const value of ['http://portal.example.test/api/intake', '//portal.example.test/api/intake', '/other', 'https://u:p@portal.example.test/api/intake', 'https://portal.example.test/api/intake?email=x', 'https://portal.example.test/api/intake#test', 'javascript:alert(1)']) {
    assert.equal(api.safeEndpoint(value, 'https://besoinavocat.ca'), '', value);
  }
  assert.equal(api.safeEndpoint('/api/intake', 'http://localhost'), '');
});

test('client payload is minimal, has explicit consent, and never sends a professional plan', () => {
  const state = valid();
  state.name = '  Nom de test  '; state.phone = ' '; state.periodicity = 'weekly'; state.story = 'Must not be sent';
  const payload = plain(api.payloadFrom(state));
  assert.deepEqual(payload, { name: 'Nom de test', email: 'test@example.test', role: 'client', language: 'fr', domain: 'civil', region: 'montreal', consent: true, consentVersion: '2026-10-26.1', website: '' });
  assert.equal('periodicity' in payload, false);
  assert.equal('story' in payload, false);
  assert.equal('source' in payload, false);
});

test('professional selection and weekly/monthly plan are retained through a language change', () => {
  const state = valid('professional'); state.periodicity = 'weekly'; state.phone = '+1 (514) 555-1234';
  state.language = 'en';
  const payload = api.payloadFrom(state);
  assert.equal(payload.role, 'professional'); assert.equal(payload.periodicity, 'weekly'); assert.equal(payload.language, 'en');
  assert.equal(payload.phone, '+1 (514) 555-1234');
  state.periodicity = 'monthly'; assert.equal(api.payloadFrom(state).periodicity, 'monthly');
  state.periodicity = 'yearly'; assert.equal(api.validate(state).key, 'missingPlan');
});

test('staged validation allows exploration without collecting contact details', () => {
  const state = api.initialState('client', 'fr');
  assert.equal(api.validate(state, 0), null);
  assert.equal(api.validate(state, 1).field, 'domain');
  state.domain = 'housing'; state.region = 'laval';
  assert.equal(api.validate(state, 1), null);
  assert.equal(api.validate(state, 2).field, 'name');
});

test('choice enums reject arbitrary and inherited properties; catalogue has eight domains and nineteen regions (Ontario included)', () => {
  assert.equal(Object.keys(api.DOMAINS).length, 8); assert.equal(Object.keys(api.REGIONS).length, 19);
  const state = valid(); state.domain = '__proto__'; assert.equal(api.validate(state).key, 'missingDomain');
  state.domain = 'civil'; state.region = 'constructor'; assert.equal(api.validate(state).key, 'missingRegion');
});

test('contact validation matches bounded intake fields and explicit consent', () => {
  for (const name of ['', 'x'.repeat(121), '<script>', 'Nom\u0000']) assert.equal(api.validate({ ...valid(), name }).key, 'invalidName');
  assert.equal(api.validate({ ...valid(), name: 'Élodie O’Connor' }), null);
  for (const email of ['bad', 'a..b@example.test', '.a@example.test', 'a.@example.test', 'a'.repeat(65) + '@example.test', '<a>@example.test']) assert.equal(api.validate({ ...valid(), email }).key, 'invalidEmail');
  for (const phone of ['123', '1'.repeat(16), '+1 514 AAAAAAA', '+1 514 555 1234 ext. 2']) assert.equal(api.validate({ ...valid(), phone }).key, 'invalidPhone');
  assert.equal(api.validate({ ...valid(), consent: 'true' }).key, 'consentRequired');
  assert.equal(api.validate({ ...valid(), consent: false }).key, 'consentRequired');
  assert.equal(api.validate({ ...valid(), website: 'spam.example' }).key, 'invalidInput');
});

test('idempotency retains one key and exact body for a retry, changes only for a different payload', () => {
  const attempts = api.createAttempt(webcrypto);
  const first = attempts.prepare(api.payloadFrom(valid())); const retry = attempts.prepare(api.payloadFrom(valid()));
  assert.deepEqual(plain(retry), plain(first));
  assert.match(first.key, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  const changed = attempts.prepare(api.payloadFrom({ ...valid(), region: 'laval' }));
  assert.notEqual(first.key, changed.key);
  attempts.clear(); assert.notEqual(changed.key, attempts.prepare(api.payloadFrom({ ...valid(), region: 'laval' })).key);
});

test('changing display language after a lost response preserves follow-up language and the retry body/key', () => {
  const state = valid('professional');
  const attempts = api.createAttempt(webcrypto);
  const first = attempts.prepare(api.payloadFrom(state));
  state.requestLanguage = state.language;
  state.language = 'en';
  const retry = attempts.prepare(api.payloadFrom(state));
  assert.deepEqual(plain(retry), plain(first));
  assert.equal(JSON.parse(retry.body).language, 'fr');
  assert.equal(state.language, 'en');
  assert.ok(api.COPY.en.retryLanguage);
});

test('changed data after an uncertain attempt is identified as a new request with explicit duplicate warning', () => {
  const state = valid(); state.requestLanguage = 'fr'; state.uncertainBody = JSON.stringify(api.payloadFrom(state));
  assert.equal(api.changedUncertainAttempt(state), false);
  state.language = 'en'; assert.equal(api.changedUncertainAttempt(state), false);
  state.region = 'laval'; assert.equal(api.changedUncertainAttempt(state), true);
  assert.match(api.COPY.fr.changedAttempt, /peut faire doublon/);
  assert.match(api.COPY.en.changedAttempt, /may duplicate/);
  assert.equal(api.COPY.fr.submitChanged, 'Envoyer la demande modifiée');
});

test('no insecure randomness fallback is used when secure browser crypto is missing', () => {
  assert.throws(() => api.createAttempt(null).prepare({}), /secureUnavailable/);
  assert.doesNotMatch(script, /Math\.random/);
});

test('receipt requires exact received contract and never accepts a fabricated or malformed response', () => {
  const value = { reference: 'BA-abcdefghijklmnopqrstuvwx', status: 'received' };
  assert.equal(api.receiptFrom(201, value), value.reference);
  for (const [status, body] of [[200, value], [201, { ...value, status: 'paid' }], [201, { ...value, token: 'secret' }], [201, { reference: '<script>', status: 'received' }], [201, { status: 'received' }]]) assert.equal(api.receiptFrom(status, body), '');
});

test('submission uses credential-free POST, explicit intent headers, exact body and no redirect', async () => {
  const attempt = api.createAttempt(webcrypto).prepare(api.payloadFrom(valid('professional')));
  let observed;
  const result = await api.sendRequest('https://portal.example.test/api/intake', attempt, async (url, init) => {
    observed = { url, init }; return reply(201, { reference: 'BA-abcdefghijklmnopqrstuvwx', status: 'received' });
  });
  assert.equal(result.reference, 'BA-abcdefghijklmnopqrstuvwx');
  assert.equal(observed.init.credentials, 'omit'); assert.equal(observed.init.redirect, 'error');
  assert.equal(observed.init.method, 'POST'); assert.equal(observed.init.body, attempt.body);
  assert.equal(observed.init.headers['Idempotency-Key'], attempt.key);
  assert.equal(observed.init.headers['X-Requested-With'], 'XMLHttpRequest');
  assert.equal('Authorization' in observed.init.headers, false); assert.equal('Cookie' in observed.init.headers, false);
});

test('network failures, unknown errors and non-201 successes never display received', async () => {
  const attempt = { key: '00000000-0000-4000-8000-000000000000', body: '{}' };
  for (const fetchImpl of [async () => { throw new Error('private provider detail'); }, async () => reply(200, { reference: 'BA-abcdefghijklmnopqrstuvwx', status: 'received' }), async () => reply(503, { error: { code: 'UNKNOWN', message: '<script>untrusted</script>' } })]) {
    const result = await api.sendRequest('https://portal.example.test/api/intake', attempt, fetchImpl);
    assert.equal(result.error, 'uncertain'); assert.equal(result.reference, undefined);
  }
});

test('known server errors are mapped to fixed bilingual messages, not echoed provider messages', async () => {
  for (const [code, key] of Object.entries(api.ERROR_KEYS)) {
    const result = await api.sendRequest('https://portal.example.test/api/intake', { body: '{}', key: 'test' }, async () => reply(400, { error: { code, message: 'DO NOT DISPLAY' } }));
    assert.equal(result.error, key); assert.ok(api.COPY.fr[key]); assert.ok(api.COPY.en[key]);
  }
});

test('oversized declared or streamed responses fail closed', async () => {
  for (const response of [reply(201, '{}', { 'Content-Length': '20000' }), reply(201, ' '.repeat(20000))]) {
    const result = await api.sendRequest('https://portal.example.test/api/intake', { body: '{}', key: 'test' }, async () => response);
    assert.equal(result.error, 'uncertain');
  }
});

test('every UI/error key has both languages and all choices have two labels', () => {
  assert.deepEqual(Object.keys(api.COPY.fr).sort(), Object.keys(api.COPY.en).sort());
  for (const [key, value] of Object.entries(api.COPY.fr)) {
    assert.ok(value.length, key); assert.ok(api.COPY.en[key].length, key);
  }
  for (const pair of Object.values({ ...api.DOMAINS, ...api.REGIONS })) assert.equal(pair.length, 2);
  assert.match(api.COPY.fr.weekly, /100 CAD/); assert.match(api.COPY.en.monthly, /300 CAD/);
  assert.match(api.COPY.fr.uncertain, /ne pouvons pas confirmer/);
});

test('version, exact displayed consent, choices and prices agree with the server catalogue', () => {
  assert.equal(api.CONSENT_VERSION, SERVER_CONSENT_VERSION);
  assert.equal(api.COPY.fr.consent, CONSENT_TEXT.fr);
  assert.equal(api.COPY.en.consent, CONSENT_TEXT.en);
  for (const [server, client] of [[SERVER_DOMAINS, api.DOMAINS], [SERVER_REGIONS, api.REGIONS]]) {
    assert.deepEqual(Object.keys(client).sort(), server.map((choice) => choice.id).sort());
    for (const choice of server) assert.deepEqual(plain(client[choice.id]), [choice.label.fr, choice.label.en]);
  }
  const catalog = publicCatalog();
  assert.equal(catalog.client.amountMinor, 0);
  assert.equal(catalog.professional.plans.find((plan) => plan.id === 'weekly').amountMinor, 10000);
  assert.equal(catalog.professional.plans.find((plan) => plan.id === 'monthly').amountMinor, 30000);
  assert.equal(catalog.purchaseAvailable, false);
});

test('user-controlled values are escaped, sensitive controls and automatic opening are absent', () => {
  assert.equal(api.escapeHtml('<img src=x onerror="alert(1)">&\''), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;');
  assert.doesNotMatch(script, /<textarea|type="file"|type="password"/);
  assert.match(script, /if \(!dialog\.open\)/);
  assert.match(script, /event\.key === 'Escape'/);
  assert.match(script, /event\.key !== 'Tab'/);
  const css = fs.readFileSync(new URL('../assets/funnel.css', import.meta.url), 'utf8');
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /dialog:not\(\[open\]\)/);
  assert.match(css, /focus-visible/);
});
