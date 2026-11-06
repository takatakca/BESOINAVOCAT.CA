// DocuSign signature flow against a local fake DocuSign: no network, no real account.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../lib/store.mjs';
import { createIntegrations, integrationConfiguration } from '../lib/integrations.mjs';
import { createSignatures, docusignBaseUri } from '../lib/signatures.mjs';

const ORIGIN = 'https://portail.example.test';
const users = Object.fromEntries(['client', 'lawyer', 'owner'].map(subject => [subject, { subject, tenantId: 'tenant-a' }]));
const ACCOUNT = '11111111-2222-4333-8444-555555555555';
const ENVELOPE = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const REST = `https://demo.docusign.net/restapi/v2.1/accounts/${ACCOUNT}`;
const rejects = (promise, status) => assert.rejects(promise, error => error.status === status);

function fixture(t, extra = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ba-signatures-'));
  const keyFile = join(dir, 'integrations.key');
  writeFileSync(keyFile, randomBytes(32), { mode: 0o600, flag: 'wx' });
  const store = createStore({ dbPath: join(dir, 'db.sqlite'), blobDir: join(dir, 'blobs') });
  const caseId = store.createCase(users.client, { title: 'Synthetic', reference: 'SYN-1' }).id;
  for (const role of ['owner', 'lawyer']) store.provisionMembership({ ...users[role], caseId, role });
  const calls = [], routes = new Map();
  async function fetch(url, options = {}) {
    const parsed = new URL(url), method = options.method || 'GET';
    const request = { url: parsed, method, headers: options.headers || {}, json: options.headers?.['Content-Type'] === 'application/json' ? JSON.parse(options.body) : null };
    calls.push(request);
    const handler = routes.get(`${method} ${parsed.origin}${parsed.pathname}`);
    if (!handler) throw new Error(`Unexpected call ${method} ${parsed.href}`);
    const { status = 200, body = null, bytes = null } = await handler(request);
    if (bytes) return new Response(bytes, { status, headers: { 'content-type': 'application/pdf' } });
    return new Response(body === null ? null : JSON.stringify(body), { status, headers: body === null ? {} : { 'content-type': 'application/json' } });
  }
  const on = (key, handler) => routes.set(key, handler);
  let issued = 0;
  on('POST https://account-d.docusign.com/oauth/token', () => ({ body: { access_token: `ds-access-${++issued}`, refresh_token: 'ds-refresh', token_type: 'Bearer', expires_in: 3600 } }));
  on('GET https://account-d.docusign.com/oauth/userinfo', () => ({ body: { sub: 'ds-user', email: 'avocate@example.test',
    accounts: [{ account_id: '99999999-2222-4333-8444-555555555555', is_default: false, base_uri: 'https://evil.example.test' }, { account_id: ACCOUNT, is_default: true, base_uri: 'https://demo.docusign.net' }] } }));
  const env = { APP_ORIGIN: ORIGIN, BESOINAVOCAT_INTEGRATIONS_KEY_FILE: keyFile, BESOINAVOCAT_DOCUSIGN_CLIENT_ID: 'ds-client', BESOINAVOCAT_DOCUSIGN_CLIENT_SECRET: 'ds-secret-value',
    BESOINAVOCAT_DOCUSIGN_CONNECT_HMAC_KEY: 'docusign-hmac-key', ...extra };
  const integrations = createIntegrations({ db: store.db, access: store.access, audit: store.audit, config: integrationConfiguration(env), fetch });
  const signatures = createSignatures({ db: store.db, access: store.access, audit: store.audit, store, docusign: integrations.docusign });
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  const doc = store.addDocument(users.lawyer, caseId, { name: 'Convention de mandat.pdf', mimeType: 'application/pdf', bytes: Buffer.from('%PDF-1.4 synthetic mandate'),
    sourceType: 'original', sourceReference: 'Pièce synthétique', extractedText: '', reviewStatus: 'a_verifier', versionOf: null });
  const connect = async user => {
    const state = new URL(integrations.connect(user, 'docusign').authorizationUrl).searchParams.get('state');
    return integrations.complete(user, { state, code: 'code-docusign' });
  };
  return { store, caseId, integrations, signatures, on, calls, doc, connect };
}

test('only DocuSign REST hosts are accepted as an account base address', () => {
  assert.equal(docusignBaseUri('https://na3.docusign.net/'), 'https://na3.docusign.net');
  for (const bad of ['http://demo.docusign.net', 'https://docusign.net.evil.test', 'https://user@demo.docusign.net', 'https://demo.docusign.net:8443', 'nope']) assert.equal(docusignBaseUri(bad), null, bad);
});

test('send a case document for signature, follow it by Connect, and file the signed version with its certificate', async t => {
  const f = fixture(t);
  const before = f.signatures.list(users.lawyer, f.caseId);
  assert.deepEqual([before.configured, before.connected], [true, false]);
  assert.deepEqual(before.documents.map(d => d.name), ['Convention de mandat.pdf']);
  await rejects(f.signatures.send(users.lawyer, f.caseId, { documentId: f.doc.id, signerName: 'Client', signerEmail: 'client@example.test' }), 409);
  assert.throws(() => f.signatures.list(users.client, f.caseId), error => error.status === 403);

  await f.connect(users.lawyer);
  assert.equal(f.signatures.list(users.lawyer, f.caseId).connected, true);
  f.on(`POST ${REST}/envelopes`, request => ({ status: 201, body: { envelopeId: ENVELOPE, status: 'sent' }, request }));
  await rejects(f.signatures.send(users.lawyer, f.caseId, { documentId: f.doc.id, signerName: 'Client', signerEmail: 'pas un courriel' }), 400);
  await rejects(f.signatures.send(users.client, f.caseId, { documentId: f.doc.id, signerName: 'Client', signerEmail: 'client@example.test' }), 403);
  const sent = await f.signatures.send(users.lawyer, f.caseId, { documentId: f.doc.id, signerName: 'Marie Client', signerEmail: 'marie@example.test', message: 'Merci de signer.' });
  assert.equal(sent.envelope.status, 'sent');
  const call = f.calls.find(c => c.url.pathname.endsWith('/envelopes'));
  assert.equal(call.url.origin, 'https://demo.docusign.net', 'the default account, never the untrusted base_uri');
  assert.equal(call.headers.Authorization, 'Bearer ds-access-1');
  assert.equal(Buffer.from(call.json.documents[0].documentBase64, 'base64').toString(), '%PDF-1.4 synthetic mandate');
  assert.deepEqual(call.json.recipients.signers, [{ recipientId: '1', routingOrder: '1', name: 'Marie Client', email: 'marie@example.test' }]);
  assert.equal(call.json.emailBlurb, 'Merci de signer.');
  assert.equal(call.json.status, 'sent');

  // The other lawyer of the case sees the envelope but cannot act with someone else's DocuSign account.
  const owner = f.signatures.list(users.owner, f.caseId);
  assert.equal(owner.envelopes[0].mine, false);
  await rejects(f.signatures.refresh(users.owner, f.caseId, sent.envelope.id), 403);

  // A verified Connect notification moves the status; a foreign account or unknown envelope is ignored.
  const raw = body => Buffer.from(JSON.stringify(body));
  const sign = body => ({ 'x-docusign-signature-1': createHmac('sha256', 'docusign-hmac-key').update(body).digest('base64') });
  const deliver = raw({ event: 'envelope-delivered', data: { envelopeId: ENVELOPE, accountId: ACCOUNT } });
  const delivered = f.integrations.webhook('docusign', { headers: sign(deliver), raw: deliver, url: '/' });
  assert.equal(f.signatures.connectEvent(delivered.event), true);
  assert.equal(f.signatures.list(users.lawyer, f.caseId).envelopes[0].status, 'delivered');
  assert.equal(f.signatures.connectEvent({ event: 'envelope-completed', data: { envelopeId: ENVELOPE, accountId: '99999999-2222-4333-8444-555555555555' } }), false);
  assert.equal(f.signatures.connectEvent({ event: 'envelope-sent', data: { envelopeId: ENVELOPE } }), true);
  assert.equal(f.signatures.list(users.lawyer, f.caseId).envelopes[0].status, 'delivered', 'never goes back to sent');
  await rejects(f.signatures.retrieve(users.lawyer, f.caseId, sent.envelope.id), 409);

  // « Actualiser » reads the status; once completed, the signed PDF becomes version 2 of the original.
  f.on(`GET ${REST}/envelopes/${ENVELOPE}`, () => ({ body: { envelopeId: ENVELOPE, status: 'completed' } }));
  assert.equal((await f.signatures.refresh(users.lawyer, f.caseId, sent.envelope.id)).envelope.canRetrieve, true);
  f.on(`GET ${REST}/envelopes/${ENVELOPE}/documents/combined`, request => { assert.equal(request.url.searchParams.get('certificate'), 'true'); return { bytes: Buffer.from('%PDF-1.7 signed with certificate') }; });
  const filed = await f.signatures.retrieve(users.lawyer, f.caseId, sent.envelope.id);
  assert.equal(filed.created, true);
  assert.equal(filed.document.name, 'Convention de mandat (signé).pdf');
  assert.equal(filed.document.versionNumber, 2);
  assert.equal((await f.signatures.retrieve(users.lawyer, f.caseId, sent.envelope.id)).created, false);
  assert.equal(f.signatures.connectEvent({ event: 'envelope-voided', data: { envelopeId: ENVELOPE } }), true);
  assert.equal(f.signatures.list(users.lawyer, f.caseId).envelopes[0].status, 'completed', 'a final state never changes');

  const history = f.signatures.history(users.lawyer, f.caseId, sent.envelope.id).events.map(e => `${e.status}:${e.source}`);
  assert.deepEqual(history, ['sent:send', 'delivered:connect', 'completed:refresh', 'completed:retrieve']);
  assert.throws(() => f.store.db.prepare('DELETE FROM signature_envelope_events').run(), /append-only/u);
  const audit = f.store.listAudit(users.lawyer, f.caseId).map(e => e.action);
  for (const a of ['signature.sent', 'signature.delivered', 'signature.completed', 'signature.retrieved']) assert.ok(audit.includes(a), a);
});

test('void an open envelope; a rejected or malformed DocuSign answer changes nothing', async t => {
  const f = fixture(t);
  await f.connect(users.lawyer);
  f.on(`POST ${REST}/envelopes`, () => ({ status: 400, body: { errorCode: 'INVALID_EMAIL_ADDRESS_FOR_RECIPIENT' } }));
  await rejects(f.signatures.send(users.lawyer, f.caseId, { documentId: f.doc.id, signerName: 'Client', signerEmail: 'client@example.test' }), 502);
  assert.equal(f.signatures.list(users.lawyer, f.caseId).envelopes.length, 0);
  f.on(`POST ${REST}/envelopes`, () => ({ status: 201, body: { envelopeId: ENVELOPE, status: 'sent' } }));
  const sent = await f.signatures.send(users.lawyer, f.caseId, { documentId: f.doc.id, signerName: 'Client', signerEmail: 'client@example.test' });
  await rejects(f.signatures.void(users.lawyer, f.caseId, sent.envelope.id, { reason: '' }), 400);
  f.on(`PUT ${REST}/envelopes/${ENVELOPE}`, request => { assert.deepEqual(request.json, { status: 'voided', voidedReason: 'Mauvaise version' }); return { body: {} }; });
  assert.equal((await f.signatures.void(users.lawyer, f.caseId, sent.envelope.id, { reason: 'Mauvaise version' })).envelope.status, 'voided');
  await rejects(f.signatures.void(users.lawyer, f.caseId, sent.envelope.id, { reason: 'Encore' }), 409);
});

test('without DocuSign keys the panel says so and nothing is sent', async t => {
  const f = fixture(t, { BESOINAVOCAT_DOCUSIGN_CLIENT_ID: undefined });
  assert.equal(f.signatures.list(users.lawyer, f.caseId).configured, false);
  await rejects(f.signatures.send(users.lawyer, f.caseId, { documentId: f.doc.id, signerName: 'Client', signerEmail: 'client@example.test' }), 503);
  assert.equal(f.calls.length, 0);
});
