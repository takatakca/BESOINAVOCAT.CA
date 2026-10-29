// Connector engine against local fake providers: no network, no real account. Provider behaviour follows the
// official documentation cited in docs/INTEGRATIONS.md; real accounts must still be tested once configured.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { createStore } from '../lib/store.mjs';
import { createCommunications } from '../lib/communications.mjs';
import { createIntegrations, integrationConfiguration } from '../lib/integrations.mjs';

const ORIGIN = 'https://portail.example.test';
const users = Object.fromEntries(['client', 'lawyer', 'owner', 'stranger'].map(subject => [subject, { subject, tenantId: 'tenant-a' }]));
const rejects = (promise, status, code) => assert.rejects(promise, error => error.status === status && (!code || error.code === code));
const throws = (fn, status, code) => assert.throws(fn, error => error.status === status && (!code || error.code === code));
const base = 'BESOINAVOCAT_';
const credentials = {
  [`${base}ZOOM_CLIENT_ID`]: 'zoom-client', [`${base}ZOOM_CLIENT_SECRET`]: 'zoom-secret-value',
  [`${base}MICROSOFT_CLIENT_ID`]: 'ms-client', [`${base}MICROSOFT_CLIENT_SECRET`]: 'ms-secret-value',
  [`${base}GOOGLE_CLIENT_ID`]: 'google-client', [`${base}GOOGLE_CLIENT_SECRET`]: 'google-secret-value',
  [`${base}CLIO_CLIENT_ID`]: 'clio-client', [`${base}CLIO_CLIENT_SECRET`]: 'clio-secret-value',
};

// Everything SQLite holds on disk, including recent writes still in the WAL file.
const onDisk = f => Buffer.concat(['db.sqlite', 'db.sqlite-wal'].map(name => join(f.dir, name)).filter(existsSync).map(file => readFileSync(file)));

function providers() {
  const calls = [], routes = new Map();
  async function fetch(url, options = {}) {
    const parsed = new URL(url), method = options.method || 'GET', type = options.headers?.['Content-Type'];
    const request = { url: parsed, method, headers: options.headers || {}, redirect: options.redirect,
      form: type === 'application/x-www-form-urlencoded' ? Object.fromEntries(new URLSearchParams(options.body)) : null,
      json: type === 'application/json' ? JSON.parse(options.body) : null };
    calls.push(request);
    const handler = routes.get(`${method} ${parsed.origin}${parsed.pathname}`);
    if (!handler) throw new Error(`Unexpected provider call ${method} ${parsed.href}`);
    const { status = 200, body = null } = await handler(request);
    return new Response(body === null ? null : JSON.stringify(body), { status, headers: body === null ? {} : { 'content-type': 'application/json' } });
  }
  return { calls, fetch, on: (key, handler) => routes.set(key, handler), count: key => calls.filter(call => `${call.method} ${call.url.origin}${call.url.pathname}` === key).length };
}

function fixture(t, extra = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ba-integrations-'));
  const keyFile = join(dir, 'integrations.key');
  writeFileSync(keyFile, randomBytes(32), { mode: 0o600, flag: 'wx' });
  const store = createStore({ dbPath: join(dir, 'db.sqlite'), blobDir: join(dir, 'blobs') });
  const caseId = store.createCase(users.client, { title: 'Synthetic', reference: 'SYNTHETIC' }).id;
  for (const role of ['owner', 'lawyer']) store.provisionMembership({ ...users[role], caseId, role });
  let time = Date.parse('2026-11-01T15:00:00Z');
  const clock = () => time;
  const communications = createCommunications({ db: store.db, access: store.access, audit: store.audit, clock });
  const fake = providers();
  const env = { APP_ORIGIN: ORIGIN, [`${base}INTEGRATIONS_KEY_FILE`]: keyFile, ...credentials, ...extra };
  const make = (overrides = {}) => createIntegrations({ db: store.db, access: store.access, audit: store.audit, config: integrationConfiguration({ ...env, ...overrides }), fetch: fake.fetch, clock });
  t.after(() => { store.close(); assert.equal(dirname(dir), resolve(tmpdir())); assert.ok(basename(dir).startsWith('ba-integrations-')); rmSync(dir, { recursive: true, force: true }); });
  const appointment = (kind = 'video') => communications.schedule(users.lawyer, caseId, { kind, title: 'Consultation synthétique', scheduledAt: '2026-11-03T15:00:00Z' }, randomUUID());
  return { dir, keyFile, store, caseId, api: make(), make, fake, communications, appointment, advance: ms => { time += ms; }, now: () => time };
}

// Token endpoints of the fake providers. Each refresh rotates the refresh token, as Zoom does.
function oauthProviders(fake, { expiresIn = 3600 } = {}) {
  const issued = { zoom: 0, microsoft365: 0, google: 0, clio: 0 };
  const token = id => request => {
    issued[id]++;
    return { body: { access_token: `${id}-access-${issued[id]}`, refresh_token: `${id}-refresh-${issued[id]}`, token_type: 'bearer', expires_in: expiresIn, scope: `${id}:scope` } };
  };
  fake.on('POST https://zoom.us/oauth/token', token('zoom'));
  fake.on('POST https://login.microsoftonline.com/organizations/oauth2/v2.0/token', token('microsoft365'));
  fake.on('POST https://oauth2.googleapis.com/token', token('google'));
  fake.on('POST https://ca.app.clio.com/oauth/token', token('clio'));
  fake.on('GET https://api.zoom.us/v2/users/me', () => ({ body: { id: 'zoom-user', email: 'avocate@example.test' } }));
  fake.on('GET https://graph.microsoft.com/v1.0/me', () => ({ body: { id: 'ms-user', mail: null, userPrincipalName: 'avocate@cabinet.example.test' } }));
  fake.on('GET https://openidconnect.googleapis.com/v1/userinfo', () => ({ body: { sub: 'google-user', email: 'avocate@gmail.example.test' } }));
  fake.on('GET https://ca.app.clio.com/api/v4/users/who_am_i', () => ({ body: { data: { id: 345, email: 'avocate@clio.example.test' } } }));
  return issued;
}
async function connected(f, user, id) {
  const state = new URL(f.api.connect(user, id).authorizationUrl).searchParams.get('state');
  return f.api.complete(user, { state, code: `code-${id}` });
}

test('without server configuration every connector reports its real state and nothing can be started', t => {
  const f = fixture(t);
  const bare = f.make({ APP_ORIGIN: undefined, [`${base}INTEGRATIONS_KEY_FILE`]: undefined, ...Object.fromEntries(Object.keys(credentials).map(key => [key, undefined])) });
  const list = bare.list(users.lawyer);
  assert.deepEqual(list.engine, { ready: false, reason: 'origin_not_configured', redirectUri: null });
  const state = Object.fromEntries(list.providers.map(item => [item.id, item.state]));
  assert.deepEqual(state, { zoom: 'not_configured', microsoft365: 'not_configured', google: 'not_configured', docusign: 'not_configured', clio: 'not_configured',
    stripe: 'not_configured', twilio: 'not_configured', canlii: 'not_configured', notarius: 'planned', quickbooks: 'planned' });
  throws(() => bare.connect(users.lawyer, 'zoom'), 503, 'INTEGRATION_NOT_CONFIGURED');
  throws(() => bare.connect(users.lawyer, 'quickbooks'), 404);
  throws(() => bare.connect(users.lawyer, 'stripe'), 404);
  throws(() => bare.connect(users.lawyer, '__proto__'), 404);
  // Credentials alone are not enough: without the vault key no token could be stored.
  const keyless = f.make({ [`${base}INTEGRATIONS_KEY_FILE`]: undefined });
  assert.equal(keyless.list(users.lawyer).engine.reason, 'key_not_configured');
  throws(() => keyless.connect(users.lawyer, 'zoom'), 503);
  const serialized = JSON.stringify(f.api.list(users.lawyer));
  for (const value of Object.values(credentials).filter(value => value.includes('secret'))) assert.ok(!serialized.includes(value));
  assert.equal(f.api.list(users.lawyer).engine.redirectUri, `${ORIGIN}/integrations/callback`);
  assert.equal(f.fake.calls.length, 0);
});

test('connection starts with an exact provider URL, PKCE where supported and a hashed, bounded, single-use state', t => {
  const f = fixture(t);
  const zoom = new URL(f.api.connect(users.lawyer, 'zoom').authorizationUrl);
  assert.equal(`${zoom.origin}${zoom.pathname}`, 'https://zoom.us/oauth/authorize');
  assert.equal(zoom.searchParams.get('client_id'), 'zoom-client');
  assert.equal(zoom.searchParams.get('redirect_uri'), `${ORIGIN}/integrations/callback`);
  assert.equal(zoom.searchParams.get('response_type'), 'code');
  assert.equal(zoom.searchParams.get('code_challenge_method'), 'S256');
  assert.match(zoom.searchParams.get('state'), /^[A-Za-z0-9_-]{43}$/u);
  assert.equal(zoom.searchParams.has('client_secret'), false);
  const google = new URL(f.api.connect(users.lawyer, 'google').authorizationUrl).searchParams;
  assert.equal(google.get('scope'), 'openid email https://www.googleapis.com/auth/calendar.events');
  assert.equal(google.get('access_type'), 'offline');
  const microsoft = new URL(f.api.connect(users.lawyer, 'microsoft365').authorizationUrl);
  assert.equal(microsoft.host, 'login.microsoftonline.com');
  assert.match(microsoft.searchParams.get('scope'), /offline_access/u);
  const clio = new URL(f.api.connect(users.lawyer, 'clio').authorizationUrl);
  assert.equal(clio.host, 'ca.app.clio.com');
  assert.equal(clio.searchParams.has('code_challenge'), false);
  const stored = f.store.db.prepare('SELECT * FROM integration_states').all();
  assert.equal(stored.length, 4);
  assert.ok(stored.every(row => row.stateHash !== zoom.searchParams.get('state') && /^[0-9a-f]{64}$/u.test(row.stateHash)));
  assert.ok(!onDisk(f).includes(zoom.searchParams.get('state')));
  f.api.connect(users.lawyer, 'zoom');
  throws(() => f.api.connect(users.lawyer, 'zoom'), 429, 'INTEGRATION_RATE_LIMIT');
  f.advance(10 * 60 * 1000);
  assert.ok(f.api.connect(users.lawyer, 'zoom').authorizationUrl);
});

test('the code is exchanged on the server only, tokens are sealed and never returned, and a state works once for its owner', async t => {
  const f = fixture(t);
  oauthProviders(f.fake);
  const start = new URL(f.api.connect(users.lawyer, 'zoom').authorizationUrl);
  const state = start.searchParams.get('state');
  await rejects(f.api.complete(users.owner, { state, code: 'stolen' }), 400, 'AUTHORIZATION_EXPIRED');
  assert.equal(f.fake.calls.length, 0, 'another person cannot use a state, and it is consumed');
  const again = new URL(f.api.connect(users.lawyer, 'zoom').authorizationUrl);
  const result = await f.api.complete(users.lawyer, { state: again.searchParams.get('state'), code: 'code-zoom' });
  assert.deepEqual(result.connection, { status: 'connected', account: 'avocate@example.test', connectedAt: '2026-11-01T15:00:00.000Z', scopes: ['zoom:scope'] });
  const exchange = f.fake.calls[0];
  assert.equal(exchange.redirect, 'error');
  assert.equal(exchange.headers.Authorization, `Basic ${Buffer.from('zoom-client:zoom-secret-value').toString('base64')}`);
  assert.equal(exchange.form.grant_type, 'authorization_code');
  assert.equal(exchange.form.redirect_uri, `${ORIGIN}/integrations/callback`);
  assert.equal(createHash('sha256').update(exchange.form.code_verifier).digest('base64url'), again.searchParams.get('code_challenge'));
  assert.equal(exchange.form.client_secret, undefined);
  await rejects(f.api.complete(users.lawyer, { state: again.searchParams.get('state'), code: 'code-zoom' }), 400, 'AUTHORIZATION_EXPIRED');
  const database = onDisk(f);
  for (const secret of ['zoom-access-1', 'zoom-refresh-1']) assert.ok(!database.includes(secret), `${secret} must be sealed`);
  const listed = JSON.stringify(f.api.list(users.lawyer));
  assert.ok(!listed.includes('zoom-access-1') && !listed.includes('zoom-refresh-1'));
  const listedZoom = f.api.list(users.lawyer).providers.find(item => item.id === 'zoom');
  assert.equal(listedZoom.state, 'connected');
  assert.equal(listedZoom.connectionType, 'oauth', 'the kind of connection is not overwritten by the account');
  assert.equal(listedZoom.connection.account, 'avocate@example.test');
  assert.equal(f.api.list(users.owner).providers.find(item => item.id === 'zoom').state, 'available', 'a connection belongs to one person');
  const audit = f.store.db.prepare("SELECT details FROM audit_events WHERE action LIKE 'integration.%'").all().map(row => row.details).join('\n');
  assert.ok(!audit.includes('zoom-access') && !audit.includes('code-zoom'));
  // Clio sends its secret in the form and has no PKCE.
  await connected(f, users.lawyer, 'clio');
  const clio = f.fake.calls.find(call => call.url.host === 'ca.app.clio.com' && call.method === 'POST');
  assert.equal(clio.form.client_secret, 'clio-secret-value');
  assert.equal(clio.form.code_verifier, undefined);
  assert.equal(f.api.list(users.lawyer).providers.find(item => item.id === 'clio').connection.account, 'avocate@clio.example.test');
});

test('expired, refused and malformed authorizations are rejected without a provider call', async t => {
  const f = fixture(t);
  oauthProviders(f.fake);
  const state = () => new URL(f.api.connect(users.lawyer, 'google').authorizationUrl).searchParams.get('state');
  const late = state();
  f.advance(10 * 60 * 1000 + 1);
  await rejects(f.api.complete(users.lawyer, { state: late, code: 'x' }), 400, 'AUTHORIZATION_EXPIRED');
  await rejects(f.api.complete(users.lawyer, { state: state(), error: 'access_denied' }), 400, 'CONSENT_REFUSED');
  await rejects(f.api.complete(users.lawyer, { state: 'short', code: 'x' }), 400);
  await rejects(f.api.complete(users.lawyer, { state: state(), code: 'x', extra: 1 }), 400);
  await rejects(f.api.complete(users.lawyer, { state: state(), code: 'bad code' }), 400);
  assert.equal(f.fake.calls.length, 0);
  // A provider refusing the code (400) asks for a new connection; an outage (503) says so.
  f.fake.on('POST https://oauth2.googleapis.com/token', () => ({ status: 400, body: { error: 'invalid_grant' } }));
  await rejects(f.api.complete(users.lawyer, { state: state(), code: 'x' }), 400, 'AUTHORIZATION_EXPIRED');
  f.fake.on('POST https://oauth2.googleapis.com/token', () => ({ status: 503, body: { error: 'unavailable' } }));
  await rejects(f.api.complete(users.lawyer, { state: state(), code: 'x' }), 502, 'PROVIDER_UNAVAILABLE');
  f.fake.on('POST https://oauth2.googleapis.com/token', () => ({ body: { access_token: 'a b', token_type: 'bearer' } }));
  await rejects(f.api.complete(users.lawyer, { state: state(), code: 'x' }), 502, 'PROVIDER_REJECTED');
  assert.equal(f.api.list(users.lawyer).providers.find(item => item.id === 'google').state, 'available');
});

test('a Zoom meeting is created once per appointment, with only the participant link and safe defaults', async t => {
  const f = fixture(t);
  oauthProviders(f.fake);
  const session = f.appointment();
  f.fake.on('POST https://api.zoom.us/v2/users/me/meetings', request => {
    assert.equal(request.headers.Authorization, 'Bearer zoom-access-1');
    return { status: 201, body: { id: 81234567890, join_url: 'https://us06web.zoom.us/j/81234567890?pwd=Synthetic.1', start_url: 'https://us06web.zoom.us/s/81234567890?zak=HOST-SECRET' } };
  });
  await rejects(f.api.linkAppointment(users.lawyer, f.caseId, session.id, 'zoom'), 409, 'NOT_CONNECTED');
  assert.equal(f.store.db.prepare('SELECT count(*) n FROM integration_links').get().n, 0, 'a failed creation leaves no reservation');
  await connected(f, users.lawyer, 'zoom');
  const created = await f.api.linkAppointment(users.lawyer, f.caseId, session.id, 'zoom', { durationMinutes: 45 });
  assert.equal(created.created, true);
  assert.deepEqual({ provider: created.link.provider, kind: created.link.kind, url: created.link.url, mine: created.link.mine },
    { provider: 'zoom', kind: 'meeting', url: 'https://us06web.zoom.us/j/81234567890?pwd=Synthetic.1', mine: true });
  const sent = f.fake.calls.find(call => call.url.pathname === '/v2/users/me/meetings').json;
  assert.deepEqual(sent, { topic: 'Consultation synthétique', type: 2, start_time: '2026-11-03T15:00:00Z', duration: 45, timezone: 'UTC', agenda: 'Rendez-vous planifié depuis BesoinAvocat.',
    settings: { waiting_room: true, join_before_host: false, mute_upon_entry: true, auto_recording: 'none' } });
  assert.equal((await f.api.linkAppointment(users.lawyer, f.caseId, session.id, 'zoom')).created, false);
  assert.equal(f.fake.count('POST https://api.zoom.us/v2/users/me/meetings'), 1);
  assert.ok(!onDisk(f).includes('HOST-SECRET'), 'the host start URL is never stored');
  // Every member of the case sees the meeting link; people outside it do not reach the case.
  assert.deepEqual(f.api.linksFor(users.client, f.caseId).map(link => [link.url, link.mine]), [['https://us06web.zoom.us/j/81234567890?pwd=Synthetic.1', false]]);
  await rejects(f.api.linkAppointment(users.client, f.caseId, session.id, 'zoom'), 403);
  await rejects(f.api.linkAppointment(users.stranger, f.caseId, session.id, 'zoom'), 404);
  await rejects(f.api.linkAppointment({ ...users.lawyer, tenantId: 'tenant-b' }, f.caseId, session.id, 'zoom'), 404);
  await rejects(f.api.linkAppointment(users.lawyer, f.caseId, randomUUID(), 'zoom'), 404);
  await rejects(f.api.linkAppointment(users.lawyer, f.caseId, session.id, 'zoom', { durationMinutes: 5 }), 400);
  await rejects(f.api.linkAppointment(users.lawyer, f.caseId, session.id, 'docusign'), 404);
  const phone = f.appointment('phone');
  await rejects(f.api.linkAppointment(users.lawyer, f.caseId, phone.id, 'zoom'), 409);
  // An unexpected join URL is not shown: the meeting is deleted and the creation fails.
  const other = f.appointment();
  f.fake.on('POST https://api.zoom.us/v2/users/me/meetings', () => ({ status: 201, body: { id: 81234567891, join_url: 'https://evil.example.test/j/81234567891' } }));
  f.fake.on('DELETE https://api.zoom.us/v2/meetings/81234567891', () => ({ status: 204 }));
  await rejects(f.api.linkAppointment(users.lawyer, f.caseId, other.id, 'zoom'), 502, 'PROVIDER_REJECTED');
  assert.equal(f.fake.count('DELETE https://api.zoom.us/v2/meetings/81234567891'), 1);
  // A cancelled appointment gets no new meeting.
  f.communications.cancel(users.lawyer, f.caseId, other.id);
  await rejects(f.api.linkAppointment(users.lawyer, f.caseId, other.id, 'zoom'), 409);
});

test('Outlook and Google entries carry the meeting link, belong to their creator and can be removed', async t => {
  const f = fixture(t);
  oauthProviders(f.fake);
  const session = f.appointment();
  f.fake.on('POST https://api.zoom.us/v2/users/me/meetings', () => ({ status: 201, body: { id: 81234567890, join_url: 'https://us06web.zoom.us/j/81234567890?pwd=abc' } }));
  f.fake.on('POST https://graph.microsoft.com/v1.0/me/events', () => ({ status: 201, body: { id: 'AAMkAGI2THVSAAA=', webLink: 'https://outlook.office365.com/owa/?itemid=AAMkAGI2THVSAAA%3D' } }));
  f.fake.on('POST https://www.googleapis.com/calendar/v3/calendars/primary/events', () => ({ status: 200, body: { id: 'synthetic0event', htmlLink: 'https://www.google.com/calendar/event?eid=abc' } }));
  for (const id of ['zoom', 'microsoft365', 'google']) await connected(f, users.lawyer, id);
  await connected(f, users.owner, 'google');
  await f.api.linkAppointment(users.lawyer, f.caseId, session.id, 'zoom');
  const outlook = await f.api.linkAppointment(users.lawyer, f.caseId, session.id, 'microsoft365');
  assert.equal(outlook.link.url, 'https://outlook.office365.com/owa/?itemid=AAMkAGI2THVSAAA%3D');
  const event = f.fake.calls.find(call => call.url.host === 'graph.microsoft.com' && call.method === 'POST').json;
  assert.deepEqual(event.start, { dateTime: '2026-11-03T15:00:00.000', timeZone: 'UTC' });
  assert.deepEqual(event.end, { dateTime: '2026-11-03T16:00:00.000', timeZone: 'UTC' });
  assert.match(event.body.content, /Réunion Zoom : https:\/\/us06web\.zoom\.us\/j\/81234567890\?pwd=abc/u);
  await f.api.linkAppointment(users.lawyer, f.caseId, session.id, 'google');
  const google = f.fake.calls.find(call => call.url.host === 'www.googleapis.com').json;
  assert.equal(google.start.dateTime, '2026-11-03T15:00:00.000Z');
  assert.equal(google.location, 'https://us06web.zoom.us/j/81234567890?pwd=abc');
  // An owner adds the same appointment to their own Google Agenda, with their own account.
  f.fake.on('POST https://www.googleapis.com/calendar/v3/calendars/primary/events', request => {
    assert.equal(request.headers.Authorization, 'Bearer google-access-2');
    return { status: 200, body: { id: 'owner0event', htmlLink: 'https://evil.example.test/phish' } };
  });
  const own = await f.api.linkAppointment(users.owner, f.caseId, session.id, 'google');
  assert.equal(own.link.url, null, 'a link outside the provider is dropped');
  assert.deepEqual(f.api.linksFor(users.owner, f.caseId).map(link => [link.provider, link.mine]).sort(), [['google', true], ['zoom', false]]);
  assert.equal(f.api.linksFor(users.lawyer, f.caseId).length, 3);
  // Removal deletes the entry at the provider; an entry already deleted there counts as removed.
  f.fake.on('DELETE https://graph.microsoft.com/v1.0/me/events/AAMkAGI2THVSAAA%3D', () => ({ status: 404, body: { error: { code: 'ErrorItemNotFound' } } }));
  assert.deepEqual(await f.api.unlinkAppointment(users.lawyer, f.caseId, session.id, 'microsoft365'), { removed: true });
  await rejects(f.api.unlinkAppointment(users.owner, f.caseId, session.id, 'microsoft365'), 404);
  f.fake.on('DELETE https://www.googleapis.com/calendar/v3/calendars/primary/events/synthetic0event', () => ({ status: 500, body: { error: 'backend' } }));
  await rejects(f.api.unlinkAppointment(users.lawyer, f.caseId, session.id, 'google'), 502);
  assert.equal(f.api.linksFor(users.lawyer, f.caseId).filter(link => link.provider === 'google').length, 1, 'kept while the provider fails');
  const actions = f.store.db.prepare("SELECT action FROM audit_events WHERE action LIKE 'integration.link%'").all().map(row => row.action);
  assert.deepEqual(actions, ['integration.link_created', 'integration.link_created', 'integration.link_created', 'integration.link_created', 'integration.link_removed']);
});

test('an expiring token is refreshed once for concurrent actions, and a refused refresh asks to reconnect', async t => {
  const f = fixture(t);
  const issued = oauthProviders(f.fake, { expiresIn: 600 });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await connected(f, users.lawyer, 'zoom');
  f.fake.on('POST https://zoom.us/oauth/token', async request => {
    assert.equal(request.form.grant_type, 'refresh_token');
    assert.equal(request.form.refresh_token, `zoom-refresh-${issued.zoom}`);
    await gate;
    issued.zoom++;
    return { body: { access_token: `zoom-access-${issued.zoom}`, refresh_token: `zoom-refresh-${issued.zoom}`, token_type: 'bearer', expires_in: 3600 } };
  });
  let meeting = 81234567890;
  f.fake.on('POST https://api.zoom.us/v2/users/me/meetings', request => {
    assert.equal(request.headers.Authorization, 'Bearer zoom-access-2');
    meeting++;
    return { status: 201, body: { id: meeting, join_url: `https://zoom.us/j/${meeting}` } };
  });
  f.advance(10 * 60 * 1000);
  const first = f.api.linkAppointment(users.lawyer, f.caseId, f.appointment().id, 'zoom');
  const second = f.api.linkAppointment(users.lawyer, f.caseId, f.appointment().id, 'zoom');
  await new Promise(resolve => setImmediate(resolve));
  release();
  await Promise.all([first, second]);
  assert.equal(f.fake.count('POST https://zoom.us/oauth/token'), 2, 'one exchange, then one refresh for both actions');
  // The provider later refuses the rotated refresh token: the person reconnects; nothing else changes.
  f.advance(2 * 3600 * 1000);
  f.fake.on('POST https://zoom.us/oauth/token', () => ({ status: 400, body: { reason: 'Invalid Token!', error: 'invalid_request' } }));
  await rejects(f.api.linkAppointment(users.lawyer, f.caseId, f.appointment().id, 'zoom'), 409, 'RECONNECT_REQUIRED');
  const zoom = f.api.list(users.lawyer).providers.find(item => item.id === 'zoom');
  assert.equal(zoom.state, 'reconnect_required');
  assert.equal(f.store.db.prepare("SELECT length(tokens) n FROM integration_connections WHERE provider='zoom'").get().n, 0);
  assert.equal(f.api.linksFor(users.lawyer, f.caseId).length, 2, 'meetings already created remain');
});

test('disconnection revokes at the provider when it allows it, then deletes the tokens', async t => {
  const f = fixture(t);
  oauthProviders(f.fake);
  await connected(f, users.lawyer, 'zoom');
  await connected(f, users.lawyer, 'microsoft365');
  await connected(f, users.lawyer, 'google');
  f.fake.on('POST https://zoom.us/oauth/revoke', request => {
    assert.equal(request.form.token, 'zoom-access-1');
    assert.match(request.headers.Authorization, /^Basic /u);
    return { body: { status: 'success' } };
  });
  f.fake.on('POST https://oauth2.googleapis.com/revoke', request => { assert.equal(request.form.token, 'google-refresh-1'); return { status: 200 }; });
  assert.deepEqual(await f.api.disconnect(users.lawyer, 'zoom'), { provider: 'zoom', disconnected: true, revocation: 'revoked' });
  assert.deepEqual(await f.api.disconnect(users.lawyer, 'microsoft365'), { provider: 'microsoft365', disconnected: true, revocation: 'not_supported_by_provider' });
  assert.deepEqual(await f.api.disconnect(users.lawyer, 'google'), { provider: 'google', disconnected: true, revocation: 'revoked' });
  assert.deepEqual(await f.api.disconnect(users.lawyer, 'google'), { provider: 'google', disconnected: false });
  await rejects(f.api.disconnect(users.lawyer, 'stripe'), 404);
  assert.equal(f.store.db.prepare('SELECT count(*) n FROM integration_connections').get().n, 0);
});

test('a different vault key cannot open stored tokens: those accounts are asked to reconnect', async t => {
  const f = fixture(t);
  oauthProviders(f.fake);
  await connected(f, users.lawyer, 'zoom');
  const otherKey = join(f.dir, 'rotated.key');
  writeFileSync(otherKey, randomBytes(32), { mode: 0o600, flag: 'wx' });
  const rotated = f.make({ [`${base}INTEGRATIONS_KEY_FILE`]: otherKey });
  assert.equal(rotated.list(users.lawyer).providers.find(item => item.id === 'zoom').state, 'reconnect_required');
  await rejects(rotated.linkAppointment(users.lawyer, f.caseId, f.appointment().id, 'zoom'), 409, 'RECONNECT_REQUIRED');
  // A key file that others can read is refused.
  const open = join(f.dir, 'open.key');
  writeFileSync(open, randomBytes(32), { mode: 0o644, flag: 'wx' });
  assert.equal(f.make({ [`${base}INTEGRATIONS_KEY_FILE`]: open }).list(users.lawyer).engine.reason, 'key_invalid');
});

test('provider notifications are accepted once, and only with a valid, recent signature', t => {
  const secrets = { [`${base}ZOOM_WEBHOOK_SECRET`]: 'zoom-webhook-secret', [`${base}STRIPE_WEBHOOK_SECRET`]: 'whsec_synthetic',
    [`${base}TWILIO_AUTH_TOKEN`]: 'twilio-auth-token', [`${base}TWILIO_ACCOUNT_SID`]: `AC${'0'.repeat(32)}`, [`${base}DOCUSIGN_CONNECT_HMAC_KEY`]: 'docusign-hmac-key' };
  const f = fixture(t, secrets);
  const seconds = Math.floor(f.now() / 1000);
  const hmac = (algorithm, key, value, encoding = 'hex') => createHmac(algorithm, key).update(value).digest(encoding);
  const receive = (id, headers, body, url = `/api/webhooks/${id}`) => f.api.webhook(id, { headers, raw: Buffer.from(body), url });
  // Zoom endpoint validation, then an event.
  const validation = JSON.stringify({ event: 'endpoint.url_validation', payload: { plainToken: 'qgg8vlvZRS6UYooatFL8Aw' }, event_ts: 1 });
  const zoomHeaders = body => ({ 'x-zm-request-timestamp': String(seconds), 'x-zm-signature': `v0=${hmac('sha256', 'zoom-webhook-secret', `v0:${seconds}:${body}`)}` });
  assert.deepEqual(receive('zoom', zoomHeaders(validation), validation).body, { plainToken: 'qgg8vlvZRS6UYooatFL8Aw', encryptedToken: hmac('sha256', 'zoom-webhook-secret', 'qgg8vlvZRS6UYooatFL8Aw') });
  const ended = JSON.stringify({ event: 'meeting.ended', payload: { object: { id: '81234567890' } } });
  assert.deepEqual(receive('zoom', zoomHeaders(ended), ended).body, { received: true, duplicate: false });
  assert.deepEqual(receive('zoom', zoomHeaders(ended), ended).body, { received: true, duplicate: true });
  throws(() => receive('zoom', { ...zoomHeaders(ended), 'x-zm-signature': `v0=${'0'.repeat(64)}` }, ended), 401);
  throws(() => receive('zoom', zoomHeaders(ended), `${ended} `), 401);
  const stale = seconds - 301;
  throws(() => receive('zoom', { 'x-zm-request-timestamp': String(stale), 'x-zm-signature': `v0=${hmac('sha256', 'zoom-webhook-secret', `v0:${stale}:${ended}`)}` }, ended), 401);
  // Stripe: t and v1 over "t.body"; several v1 values are allowed during secret rotation.
  const paid = JSON.stringify({ id: 'evt_Synthetic123', type: 'checkout.session.completed' });
  const stripe = body => ({ 'stripe-signature': `t=${seconds},v1=${'f'.repeat(64)},v1=${hmac('sha256', 'whsec_synthetic', `${seconds}.${body}`)}` });
  assert.deepEqual(receive('stripe', stripe(paid), paid).body, { received: true, duplicate: false });
  throws(() => receive('stripe', { 'stripe-signature': `t=${seconds},v1=${'f'.repeat(64)}` }, paid), 401);
  // Twilio: HMAC-SHA1 of the public URL and the sorted form parameters.
  const form = 'MessageStatus=delivered&MessageSid=SM0123456789abcdef0123456789abcdef&AccountSid=AC00000000000000000000000000000000';
  const signed = `${ORIGIN}/api/webhooks/twilio?callback=1AccountSidAC00000000000000000000000000000000MessageSidSM0123456789abcdef0123456789abcdefMessageStatusdelivered`;
  const twilio = { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': hmac('sha1', 'twilio-auth-token', signed, 'base64') };
  assert.deepEqual(receive('twilio', twilio, form, '/api/webhooks/twilio?callback=1').body, { received: true, duplicate: false });
  throws(() => receive('twilio', twilio, form, '/api/webhooks/twilio'), 401);
  // DocuSign Connect: base64 HMAC-SHA256 of the raw body.
  const envelope = JSON.stringify({ event: 'envelope-completed', data: { envelopeId: 'synthetic' } });
  assert.deepEqual(receive('docusign', { 'x-docusign-signature-1': hmac('sha256', 'docusign-hmac-key', envelope, 'base64') }, envelope).body, { received: true, duplicate: false });
  throws(() => receive('docusign', { 'x-docusign-signature-1': hmac('sha256', 'wrong', envelope, 'base64') }, envelope), 401);
  throws(() => f.make({ [`${base}DOCUSIGN_CONNECT_HMAC_KEY`]: undefined }).webhook('docusign', { headers: {}, raw: Buffer.from('{}'), url: '/' }), 503);
  const events = f.store.db.prepare('SELECT provider, eventType FROM integration_events ORDER BY rowid').all().map(row => `${row.provider}:${row.eventType}`);
  assert.deepEqual(events, ['zoom:meeting.ended', 'stripe:checkout.session.completed', 'twilio:delivered', 'docusign:envelope-completed']);
  assert.equal(f.api.list(users.lawyer).providers.find(item => item.id === 'twilio').state, 'active_on_server');
});

test('over HTTP: account connectors, appointment actions, signed notifications and the return page', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'ba-integrations-http-'));
  const keyFile = join(dir, 'integrations.key');
  writeFileSync(keyFile, randomBytes(32), { mode: 0o600, flag: 'wx' });
  const fake = providers();
  oauthProviders(fake);
  fake.on('POST https://api.zoom.us/v2/users/me/meetings', () => ({ status: 201, body: { id: 81234567890, join_url: 'https://zoom.us/j/81234567890' } }));
  fake.on('DELETE https://api.zoom.us/v2/meetings/81234567890', () => ({ status: 204 }));
  const { createApp } = await import('../server.mjs');
  const app = createApp({ dbPath: join(dir, 'db.sqlite'), blobDir: join(dir, 'blobs'), integrationFetch: fake.fetch,
    authenticate: async token => (['client', 'lawyer', 'stranger'].includes(token) ? { subject: token, tenantId: 'tenant-a', product: 'besoinavocat', active: true } : null),
    env: { APP_ORIGIN: ORIGIN, [`${base}INTEGRATIONS_KEY_FILE`]: keyFile, ...credentials, [`${base}ZOOM_WEBHOOK_SECRET`]: 'zoom-webhook-secret' } });
  app.listen(0, '127.0.0.1');
  await new Promise(resolve => app.once('listening', resolve));
  t.after(async () => {
    await new Promise(resolve => app.close(resolve));
    assert.ok(basename(dir).startsWith('ba-integrations-http-'));
    rmSync(dir, { recursive: true, force: true });
  });
  const request = async (path, { token = 'lawyer', method = 'GET', body, headers = {} } = {}) => {
    const response = await fetch(`http://127.0.0.1:${app.address().port}${path}`, { method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    const text = await response.text();
    return { status: response.status, headers: response.headers, text, json: /json/u.test(response.headers.get('content-type') || '') ? JSON.parse(text) : null };
  };
  assert.equal((await request('/api/integrations', { token: null })).status, 401);
  const list = await request('/api/integrations');
  assert.equal(list.status, 200);
  assert.equal(list.json.engine.ready, true);
  assert.equal((await request('/api/capabilities')).json.integrations.engineReady, true);
  const start = await request('/api/integrations/zoom/connect', { method: 'POST', body: {} });
  assert.equal(start.status, 200, start.text);
  const state = new URL(start.json.authorizationUrl).searchParams.get('state');
  assert.equal((await request('/api/integrations/complete', { token: 'stranger', method: 'POST', body: { state, code: 'x' } })).status, 400);
  const again = new URL((await request('/api/integrations/zoom/connect', { method: 'POST', body: {} })).json.authorizationUrl).searchParams.get('state');
  const done = await request('/api/integrations/complete', { method: 'POST', body: { state: again, code: 'code-zoom' } });
  assert.equal(done.status, 200, done.text);
  assert.equal(done.json.connection.account, 'avocate@example.test');
  assert.equal((await request('/api/integrations/unknown/connect', { method: 'POST', body: {} })).status, 404);
  // A case is opened by its client; the lawyer is added by the operator, as in the pilot.
  const created = await request('/api/cases', { token: 'client', method: 'POST', body: { title: 'Synthetic', reference: 'SYNTHETIC' } });
  const caseId = created.json.case.id;
  app.store.provisionMembership({ tenantId: 'tenant-a', caseId, subject: 'lawyer', role: 'lawyer' });
  assert.equal((await request(`/api/cases/${caseId}/communications/${randomUUID()}/integrations/zoom`, { token: 'client', method: 'POST', body: {} })).status, 403);
  const session = await request(`/api/cases/${caseId}/communications`, { method: 'POST', headers: { 'Idempotency-Key': randomUUID() },
    body: { kind: 'video', title: 'Consultation synthétique', scheduledAt: '2026-11-03T15:00:00Z' } });
  assert.equal(session.status, 201, session.text);
  const route = `/api/cases/${caseId}/communications/${session.json.session.id}/integrations/zoom`;
  assert.equal((await request(route, { method: 'POST', body: {} })).status, 201);
  assert.equal((await request(route, { method: 'POST', body: {} })).status, 200);
  assert.equal((await request(route, { token: 'stranger', method: 'POST', body: {} })).status, 404);
  assert.deepEqual((await request(`/api/cases/${caseId}`)).json.integrationLinks.map(link => link.url), ['https://zoom.us/j/81234567890']);
  assert.equal((await request(`${route}/remove`, { method: 'POST', body: {} })).status, 200);
  assert.deepEqual((await request(`/api/cases/${caseId}`)).json.integrationLinks, []);
  // Notifications need no session, only the provider's signature.
  const body = JSON.stringify({ event: 'endpoint.url_validation', payload: { plainToken: 'synthetic-plain-token' } });
  const seconds = String(Math.floor(Date.now() / 1000));
  const signature = `v0=${createHmac('sha256', 'zoom-webhook-secret').update(`v0:${seconds}:${body}`).digest('hex')}`;
  const validated = await request('/api/webhooks/zoom', { token: null, method: 'POST', body, headers: { 'x-zm-request-timestamp': seconds, 'x-zm-signature': signature } });
  assert.equal(validated.status, 200, validated.text);
  assert.equal(validated.json.encryptedToken, createHmac('sha256', 'zoom-webhook-secret').update('synthetic-plain-token').digest('hex'));
  assert.equal((await request('/api/webhooks/zoom', { token: null, method: 'POST', body, headers: { 'x-zm-request-timestamp': seconds, 'x-zm-signature': `v0=${'0'.repeat(64)}` } })).status, 401);
  assert.equal((await request('/api/webhooks/zoom', { token: null })).status, 405);
  assert.equal((await request('/api/webhooks/unknown', { token: null, method: 'POST', body: '{}' })).status, 404);
  assert.equal((await request('/api/webhooks/stripe', { token: null, method: 'POST', body: '{}' })).status, 503);
  // The return page is a plain same-origin page under the portal's strict CSP.
  const page = await request('/integrations/callback?code=abc&state=def', { token: null });
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /^text\/html/u);
  assert.match(page.headers.get('content-security-policy'), /script-src 'self'/u);
  assert.equal(page.headers.get('referrer-policy'), 'no-referrer');
  assert.equal((await request('/integrations-callback.js', { token: null })).status, 200);
});
