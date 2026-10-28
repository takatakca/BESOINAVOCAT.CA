import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { randomUUID, webcrypto } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { QUESTIONNAIRE_SCHEMA, QUESTIONNAIRE_VERSION, QUESTIONNAIRE_CONSENT_VERSION, QUESTIONNAIRE_CONSENT_TEXT,
  activeQuestions, pruneQuestionnaireAnswers, validateQuestionnaire, publicQuestionnaire } from '../lib/questionnaire.mjs';
import { publicCatalog } from '../lib/catalog.mjs';
import { createIntake } from '../lib/intake.mjs';

const script = readFileSync(new URL('../public/demande.js', import.meta.url), 'utf8');
const context = { module: { exports: {} }, URL, URLSearchParams, Uint8Array, TextDecoder, AbortController, setTimeout, clearTimeout };
vm.runInNewContext(script, context, { filename: 'demande.js' });
const ui = context.module.exports, plain = value => JSON.parse(JSON.stringify(value));
const ORIGIN = 'https://portal.example.test';
const examples = {
  family: { topic: 'separation', relationship: 'unsure', arrangement: 'yes', agreementGoal: 'understand' },
  employment: { topic: 'dismissal', workRole: 'employee', noticeForm: 'written' },
  housing: { topic: 'repairs', housingRole: 'tenant', repairNotice: 'no' },
  civil: { topic: 'insurance', notice: 'sent', amountBand: 'unsure' },
  criminal: { topic: 'ticket', documentAvailable: 'yes', ticketStep: 'none' },
  business: { topic: 'corporate', businessRole: 'owner', businessStage: 'planning' },
  immigration: { topic: 'decision', applicationStage: 'decision', decisionAvailable: 'yes' },
  other: { topic: 'identify', context: 'personal', documentAvailable: 'unsure' },
};
const questionnaire = (answers, extra = {}) => ({ version: QUESTIONNAIRE_VERSION, answers: { ...answers }, reviewed: true, ...extra });
function stateFor(domain = 'housing') {
  return { ...ui.initialState('client', 'fr', true), questionnaireSchema: plain(QUESTIONNAIRE_SCHEMA), domain, region: 'ontario',
    answers: { ...examples[domain] }, reviewed: true, name: 'Personne Synthétique', email: 'synthetic@example.test',
    summary: 'Résumé synthétique pour vérifier le parcours de préparation.', stage: 'considering', objective: 'understand', urgency: 'week',
    hasDeadline: 'no', contactPreference: 'email', consent: true };
}

for (const [domain, answers] of Object.entries(examples)) {
  test(`${domain}: complete active branch is accepted and mandatory answers cannot be omitted`, () => {
    const result = validateQuestionnaire(domain, questionnaire(answers));
    assert.deepEqual(result.answers, answers);
    assert.deepEqual(activeQuestions(domain, answers).map(item => item.id), Object.keys(result.answers));
    for (const key of Object.keys(answers)) {
      const missing = { ...answers }; delete missing[key];
      assert.throws(() => validateQuestionnaire(domain, questionnaire(missing)), { code: 'QUESTIONNAIRE_INVALID_INPUT' });
    }
    const state = stateFor(domain);
    assert.equal(ui.validate(state), null);
    const body = plain(ui.payloadFrom(state));
    assert.deepEqual(body.questionnaire, result);
    assert.equal(body.consentVersion, QUESTIONNAIRE_CONSENT_VERSION);
    assert.equal(body.summary, state.summary); assert.equal(body.region, 'ontario');
  });
}

test('all declared conditional branches can be reached with valid enum values', () => {
  let reached = 0;
  for (const [domain, definition] of Object.entries(QUESTIONNAIRE_SCHEMA.domains)) {
    for (const target of definition.questions.filter(item => item.when)) for (const value of target.when.values) {
      const answers = {};
      for (const item of definition.questions) {
        if (item.when && !item.when.values.includes(answers[item.when.field])) continue;
        answers[item.id] = item.id === target.when.field ? value : item.options[0].id;
      }
      // Some dependencies (e.g. arrangement) appear after another conditional question.
      answers[target.when.field] = value;
      for (const item of activeQuestions(domain, answers)) if (!(item.id in answers)) answers[item.id] = item.options[0].id;
      const clean = pruneQuestionnaireAnswers(domain, answers);
      assert.ok(Object.hasOwn(clean, target.id), `${domain}.${target.id}`);
      assert.equal(validateQuestionnaire(domain, questionnaire(clean)).reviewed, true); reached++;
    }
  }
  assert.ok(reached >= 12);
});

test('cross-domain, inactive, arbitrary, object and markup answers are refused', () => {
  const base = examples.housing;
  const invalid = [
    { ...base, workRole: 'employee' }, { ...base, writtenNotice: 'yes' }, { ...base, lawyerId: 'arbitrary' },
    { ...base, repairNotice: {} }, { ...base, repairNotice: ['yes'] }, { ...base, repairNotice: '<script>' },
    { ...base, repairNotice: 'YES' }, JSON.parse('{"topic":"repairs","housingRole":"tenant","repairNotice":"no","__proto__":"yes"}')
  ];
  for (const answers of invalid) assert.throws(() => validateQuestionnaire('housing', questionnaire(answers)), { code: 'QUESTIONNAIRE_INVALID_INPUT' });
  for (const value of [null, [], '', { ...questionnaire(base), version: 'future' }, { ...questionnaire(base), extra: true },
    { ...questionnaire(base), answers: [] }, { ...questionnaire(base), answers: Object.create({ topic: 'repairs' }) }]) {
    assert.throws(() => validateQuestionnaire('housing', value), { code: 'QUESTIONNAIRE_INVALID_INPUT' });
  }
  assert.throws(() => validateQuestionnaire('__proto__', questionnaire(base)), { code: 'QUESTIONNAIRE_INVALID_INPUT' });
});

test('review confirmation is strict and both consent texts come from the versioned catalogue', () => {
  for (const reviewed of [false, undefined, 'true', 1]) assert.throws(() => validateQuestionnaire('housing', questionnaire(examples.housing, { reviewed })), { code: 'QUESTIONNAIRE_REVIEW_REQUIRED' });
  const state = stateFor(); state.reviewed = false;
  assert.equal(ui.validate(state, 'contact'), null);
  assert.equal(ui.validate(state).key, 'reviewRequired');
  assert.throws(() => ui.payloadFrom(state));
  const catalog = publicCatalog({ intakeConfigured: true, requestEnabled: true });
  const schema = ui.questionnaireFrom(catalog);
  assert.deepEqual(plain(schema.consent.text), QUESTIONNAIRE_CONSENT_TEXT);
  assert.equal(schema.consent.version, QUESTIONNAIRE_CONSENT_VERSION);
  assert.equal(schema.version, QUESTIONNAIRE_VERSION);
  assert.equal(catalog.client.paidServices.pricingStatus, 'not_configured');
  assert.equal(catalog.client.paidServices.purchaseAvailable, false);
  assert.equal(catalog.client.amountMinor, 0);
});

test('a changed parent prunes inactive answers and a changed domain never reuses an answer', () => {
  const state = stateFor();
  ui.setBranchAnswer(state, 'topic', 'departure');
  assert.deepEqual(plain(state.answers), { topic: 'departure', housingRole: 'tenant' });
  assert.equal(state.reviewed, false); assert.equal(ui.validate(state, 'details').question, 'writtenNotice');
  assert.equal(ui.setBranchAnswer(state, 'repairNotice', 'yes'), false);
  ui.setBranchAnswer(state, 'writtenNotice', 'yes');
  assert.equal(ui.validate(state, 'details'), null);
  state.reviewed = true; ui.setDomain(state, 'employment');
  assert.deepEqual(plain(state.answers), {}); assert.equal(state.reviewed, false);
  assert.equal(ui.validate(state, 'details').question, 'topic');
  assert.deepEqual(pruneQuestionnaireAnswers('housing', { ...examples.housing, topic: 'rent' }), { topic: 'rent', housingRole: 'tenant' });
});

test('questionnaire steps apply only to enabled client requests and catalogue clones cannot alter validation', () => {
  const state = stateFor();
  assert.deepEqual(plain(ui.stepsFor(state)), ['role','preferences','details','situation','timing','contact','review']);
  state.role = 'professional'; assert.equal(ui.stepsFor(state).includes('details'), false);
  assert.equal(ui.consentVersionFor(state), '2026-10-26.1');
  state.role = 'client'; state.questionnaireSchema = null;
  assert.equal(ui.stepsFor(state).includes('details'), false); assert.equal(ui.consentVersionFor(state), '2026-10-27.1');
  const copy = publicQuestionnaire(); copy.domains.housing.questions[0].options[0].id = 'injected';
  assert.notEqual(QUESTIONNAIRE_SCHEMA.domains.housing.questions[0].options[0].id, 'injected');
  const catalog = publicCatalog({ intakeConfigured: true, requestEnabled: true });
  catalog.intake.request.questionnaire.domains.housing.questions[0].options[0].id = '<script>';
  assert.equal(ui.questionnaireFrom(catalog), null);
});

test('uncertain retry keeps exact body and key across display languages; changed data warns before reconfirmation', () => {
  const state = stateFor(), attempt = ui.createAttempt(webcrypto);
  const first = attempt.prepare(ui.payloadFrom(state));
  state.requestLanguage = 'fr'; state.uncertainBody = first.body; state.language = 'en';
  assert.deepEqual(plain(attempt.prepare(ui.payloadFrom(state))), plain(first));
  assert.equal(ui.changedUncertainAttempt(state), false);
  ui.setBranchAnswer(state, 'repairNotice', 'yes');
  assert.equal(state.reviewed, false);
  assert.equal(ui.changedUncertainAttempt(state), true, 'warning is visible before confirming the changed request');
  assert.throws(() => ui.payloadFrom(state));
  state.reviewed = true;
  const changed = attempt.prepare(ui.payloadFrom(state));
  assert.notEqual(changed.key, first.key);
  assert.equal(JSON.parse(changed.body).language, 'fr');
});

test('bounded catalogue loading fails closed on malformed schema and successful receipt needs HTTP 201', async () => {
  const catalogue = publicCatalog({ intakeConfigured: true, requestEnabled: true });
  const result = await ui.loadService(async () => new Response(JSON.stringify(catalogue), { status: 200 }));
  assert.equal(result.open, true); assert.equal(result.questionnaireSchema.version, QUESTIONNAIRE_VERSION);
  catalogue.intake.request.questionnaire.version = 'unknown';
  assert.equal((await ui.loadService(async () => new Response(JSON.stringify(catalogue), { status: 200 }))).open, false);
  assert.equal((await ui.loadService(async () => new Response('x'.repeat(131073), { status: 200 }))).open, false);
  assert.equal(ui.receiptFrom(200, { status: 'received', reference: 'BA-' + 'x'.repeat(24) }), '');
});

test('private queue stores reviewed answers and exact consent, rejects injected permissions, and preserves legacy requests', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ba-questionnaire-'));
  const dbPath = path.join(dir, 'intake.sqlite');
  const intake = createIntake({ config: { dbPath, origins: [ORIGIN], requestEnabled: true } });
  t.after(async () => { intake.clear(); await rm(dir, { recursive: true, force: true }); });
  assert.equal(intake.configured, true);
  const body = plain(ui.payloadFrom(stateFor())); const key = randomUUID();
  const first = intake.receive(body, key, ORIGIN);
  assert.match(first.reference, /^BA-[A-Za-z0-9_-]{24}$/);
  assert.deepEqual(intake.receive(body, key, ORIGIN), first);
  assert.throws(() => intake.receive({ ...body, questionnaire: { ...body.questionnaire, reviewed: false } }, randomUUID(), ORIGIN), { code: 'QUESTIONNAIRE_REVIEW_REQUIRED' });
  for (const extra of [{ tenantId: 'other' }, { owner: true }, { role: 'professional' }, { lawyerId: 'synthetic' }]) {
    assert.throws(() => intake.receive({ ...body, ...extra }, randomUUID(), ORIGIN), { status: 400 });
  }
  const changed = structuredClone(body); changed.questionnaire.answers.repairNotice = 'yes';
  assert.throws(() => intake.receive(changed, key, ORIGIN), { code: 'IDEMPOTENCY_CONFLICT' });
  const oldDetailed = { ...body, email: 'detailed@example.test', consentVersion: '2026-10-27.1' }; delete oldDetailed.questionnaire;
  intake.receive(oldDetailed, randomUUID(), ORIGIN);
  intake.receive({ name: 'Contact Synthétique', email: 'contact@example.test', role: 'client', language: 'en', domain: 'housing', region: 'montreal', consent: true, consentVersion: '2026-10-26.1' }, randomUUID(), ORIGIN);
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const rows = db.prepare('SELECT * FROM ba_intakes ORDER BY createdAt, reference').all(); assert.equal(rows.length, 3);
    const row = rows.find(item => item.reference === first.reference);
    assert.deepEqual(JSON.parse(row.payloadJson).questionnaire, body.questionnaire);
    assert.equal(row.consentText, QUESTIONNAIRE_CONSENT_TEXT.fr);
    assert.equal(JSON.parse(row.priceJson).amountMinor, 0);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE type='table' AND name IN ('cases','members','users','subscriptions')").get().n, 0);
  } finally { db.close(); }
});

test('questionnaire cannot bypass a disabled detailed intake', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ba-questionnaire-off-'));
  const intake = createIntake({ config: { dbPath: path.join(dir, 'intake.sqlite'), origins: [ORIGIN], requestEnabled: false } });
  t.after(async () => { intake.clear(); await rm(dir, { recursive: true, force: true }); });
  assert.throws(() => intake.receive(plain(ui.payloadFrom(stateFor())), randomUUID(), ORIGIN), { status: 503 });
  assert.doesNotMatch(script, /localStorage|sessionStorage|document\.cookie|sendBeacon/);
  assert.match(script, /credentials: 'omit'/);
});
