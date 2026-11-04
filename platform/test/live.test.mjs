import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';
import { createHmac } from 'node:crypto';
import { normalizePhone, teamMembers, memberExternalId, verifyMimtSignature, mimtLink, mimtSignature } from '../lib/telephony.mjs';
import { chainEvents } from '../lib/audit-seal.mjs';
import { createPdf, winAnsi } from '../lib/pdf.mjs';

const users = {
  client: { subject: 'client-1', tenantId: 'tenant-a', product: 'besoinavocat', active: true },
  lawyer: { subject: 'lawyer-1', tenantId: 'tenant-a', product: 'besoinavocat', active: true },
  lawyer2: { subject: 'lawyer-2', tenantId: 'tenant-a', product: 'besoinavocat', active: true },
  stranger: { subject: 'stranger', tenantId: 'tenant-a', product: 'besoinavocat', active: true },
  other: { subject: 'client-1', tenantId: 'tenant-b', product: 'besoinavocat', active: true },
};
const API = 'https://api.mimt.test';
const KEY = `mimt_pk_${'k'.repeat(40)}`;
const SECRET = `whsec_${'s'.repeat(32)}`;
const ENV = { APP_ORIGIN: 'https://portail.example.test', BESOINAVOCAT_MIMT_API_KEY: KEY, BESOINAVOCAT_MIMT_WEBHOOK_SECRET: SECRET, BESOINAVOCAT_MIMT_API_BASE: API,
  BESOINAVOCAT_MIMT_PUBLIC_NUMBER: '450 999 3999', BESOINAVOCAT_TEAM_MEMBERS: JSON.stringify(['tenant-a/lawyer-1', 'tenant-a/lawyer-2']),
  BESOINAVOCAT_TURN_URLS: 'turn:turn.example.test:3478?transport=udp,turns:turn.example.test:5349', BESOINAVOCAT_TURN_SECRET: 'synthetic-turn-secret-0123456789' };
const OWNED = '+15145550177';

// A faithful stand-in for MIMT Connect (docs/MIMT-CONNECT.md in takatakca/mimtcaapp): same routes, bodies and errors.
function fakeMimt() {
  const members = new Map(), dialed = [], groups = [], requests = [];
  let n = 0;
  const partnerCalls = [];
  const dto = (id, m) => ({ externalId: id, name: m.name, phone: m.phone, active: m.active, linked: m.linked, lineNumber: m.lineNumber, extension: '2000',
    chooseNumberUrl: m.lineNumber ? null : 'https://app.mimt.ca/numero?partner=besoinavocat' });
  const err = (status, error, extra = {}) => Response.json({ error, message: error, ...extra }, { status });
  const fetch = async (url, options = {}) => {
    requests.push({ url, method: options.method || 'GET' });
    const u = new URL(url);
    if (u.pathname.endsWith('/audio')) { assert.equal(u.searchParams.get('token'), 'signed'); return new Response(Buffer.from('ID3synthetic-audio'), { headers: { 'Content-Type': 'audio/mpeg' } }); }
    assert.equal(options.headers.Authorization, `Bearer ${KEY}`);
    assert.equal(options.redirect, 'error');
    const body = options.body ? JSON.parse(options.body) : null;
    const path = u.pathname, method = options.method || 'GET';
    let m;
    if ((m = /^\/v1\/partner\/members\/([^/]+)$/u.exec(path))) {
      const id = m[1];
      if (method === 'PUT') { const existing = members.get(id); members.set(id, { ...(existing || { linked: false, lineNumber: null }), name: body.name, phone: body.phone, active: true, availability: existing?.availability || null }); return Response.json(dto(id, members.get(id)), { status: existing ? 200 : 201 }); }
      if (!members.has(id)) return err(404, 'member_not_found');
      if (method === 'DELETE') { members.get(id).active = false; return Response.json(dto(id, members.get(id))); }
      return Response.json(dto(id, members.get(id)));
    }
    if ((m = /^\/v1\/partner\/members\/([^/]+)\/(link-requests|link|numbers|number|subscription|port-ins|availability|calls)$/u.exec(path))) {
      const member = members.get(m[1]);
      if (!member) return err(404, 'member_not_found');
      const action = m[2];
      if (action === 'link-requests') return Response.json({ requestId: 'r-1', code: 'K7QM4XPA', url: 'https://app.mimt.ca/lier?code=K7QM4XPA&r=r-1', expiresAt: '2030-01-01T00:15:00.000Z' }, { status: 201 });
      if (action === 'availability') {
        if (method === 'PUT') member.availability = body;
        const status = member.availability?.status || 'available';
        return Response.json({ externalId: m[1], status, until: member.availability?.until || null, weekly: null, userStatus: null, effectiveStatus: status, source: member.availability ? 'partner' : 'default', updatedAt: null });
      }
      if (!member.linked) return err(409, 'member_not_linked', { chooseNumberUrl: 'https://app.mimt.ca/numero?partner=besoinavocat' });
      if (action === 'link') { member.linked = false; member.lineNumber = null; return new Response(null, { status: 204 }); }
      if (action === 'numbers') return Response.json({ numbers: [{ e164: OWNED }], current: member.lineNumber, chooseNumberUrl: null });
      if (action === 'number') { if (body.e164 !== OWNED) return err(403, 'number_not_owned'); member.lineNumber = body.e164; return Response.json({ numbers: [{ e164: OWNED }], current: OWNED, chooseNumberUrl: null }); }
      if (action === 'subscription') return Response.json({ plan: 'premium', status: 'active', currentPeriodEnd: '2030-01-31T00:00:00.000Z', canCall: true, planUrl: 'https://app.mimt.ca/compte?partner=besoinavocat#forfait' });
      if (action === 'port-ins') return Response.json({ portIns: [{ id: 'p1', e164: '+14505550123', numbers: [], status: 'foc_scheduled', updatedAt: '2030-01-01T00:00:00.000Z', expectedDate: '2030-01-18' }], portUrl: 'https://app.mimt.ca/services/transfert?partner=besoinavocat' });
      if (action === 'calls') {
        if (!member.lineNumber) return err(409, 'member_number_required', { chooseNumberUrl: 'https://app.mimt.ca/numero?partner=besoinavocat' });
        if (body.to === '+19005550000') return err(400, 'destination_not_allowed');
        n += 1; dialed.push({ member: m[1], ...body, callId: `mc-${n}` });
        return Response.json({ callId: `mc-${n}` }, { status: 201 });
      }
    }
    if ((m = /^\/v1\/partner\/hunt-groups\/([a-z0-9_-]+)$/u.exec(path)) && method === 'PUT') { groups.push({ key: m[1], ...body }); return Response.json({ key: m[1], ...body }); }
    if (path === '/v1/partner/calls') return Response.json({ calls: partnerCalls, nextSince: null });
    if ((m = /^\/v1\/partner\/recordings\/([^/]+)$/u.exec(path))) return Response.json({ recordingId: m[1], url: `${API}/v1/business/b1/recordings/${m[1]}/audio?token=signed`, expiresAt: '2030-01-01T00:15:00.000Z' });
    if (path === '/v1/partner/credits') return Response.json({ balance: 4820, creditPerMinute: 2, ledger: [] });
    return err(404, 'not_found');
  };
  return { fetch, members, dialed, groups, requests, partnerCalls, link: id => { members.get(id).linked = true; } };
}

async function fixture(t, { env = ENV } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'besoinavocat-live-test-'));
  const mimt = fakeMimt();
  const app = createApp({ dbPath: path.join(directory, 'db.sqlite'), blobDir: path.join(directory, 'blobs'), env, telephonyFetch: mimt.fetch,
    authenticate: async token => users[token] ?? null });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  const base = `http://127.0.0.1:${app.address().port}`;
  t.after(async () => { await new Promise(r => app.close(r)); await rm(directory, { recursive: true, force: true }); });
  async function request(route, { token = 'client', method = 'GET', body } = {}) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(base + route, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const bytes = Buffer.from(await response.arrayBuffer());
    const text = bytes.toString('latin1');
    return { status: response.status, type: response.headers.get('content-type') || '', bytes, text, json: /json/u.test(response.headers.get('content-type') || '') ? JSON.parse(bytes.toString('utf8')) : null };
  }
  let seq = 0;
  async function webhook(type, data, { id = `evt-${++seq}`, secret = SECRET, at = Math.floor(Date.now() / 1000) } = {}) {
    const raw = JSON.stringify({ id, type, created_at: new Date().toISOString(), data });
    const response = await fetch(`${base}/api/mimt/webhook`, { method: 'POST', body: raw,
      headers: { 'Content-Type': 'application/json', 'X-MIMT-Signature': `t=${at},v1=${createHmac('sha256', secret).update(`${at}.${raw}`).digest('hex')}`, 'X-MIMT-Event': type, 'X-MIMT-Delivery': id } });
    return { status: response.status, json: await response.json().catch(() => null) };
  }
  async function caseWithLawyer() {
    const created = await request('/api/cases', { method: 'POST', body: { title: 'Dossier synthétique', reference: 'SYN-1' } });
    assert.equal(created.status, 201, created.text);
    app.store.provisionMembership({ tenantId: 'tenant-a', caseId: created.json.case.id, subject: 'lawyer-1', role: 'lawyer' });
    return created.json.case.id;
  }
  // The full lawyer onboarding: MIMT profile, account link approved in MIMT (webhook), line chosen among the lawyer's numbers.
  async function readyLawyer(token = 'lawyer', subject = 'lawyer-1') {
    assert.equal((await request('/api/telephony/member', { token, method: 'POST', body: { displayName: `Me ${subject}`, mobile: '514 555 0199' } })).status, 200);
    const ext = memberExternalId('tenant-a', subject);
    mimt.link(ext);
    assert.equal((await webhook('member.linked', { member_external_id: ext, linked_at: new Date().toISOString() })).status, 200);
    assert.equal((await request('/api/telephony/member/line', { token, method: 'POST', body: { e164: OWNED } })).status, 200);
    return ext;
  }
  return { app, request, webhook, mimt, caseWithLawyer, readyLawyer };
}

test('phone numbers, team members, member identifiers, signatures and MIMT links are validated strictly', () => {
  assert.equal(normalizePhone('(450) 999-3999'), '+14509993999');
  assert.equal(normalizePhone('1 514 555 0199'), '+15145550199');
  for (const bad of ['+33 1 23 45 67 89', '911', '+1 011 555 0199', '450-999-399']) assert.throws(() => normalizePhone(bad));
  assert.deepEqual(teamMembers('["t/a","t/b"]'), [{ tenantId: 't', subject: 'a' }, { tenantId: 't', subject: 'b' }]);
  assert.deepEqual(teamMembers('["no-slash"]'), []);
  assert.deepEqual(teamMembers('not json'), []);
  const ext = memberExternalId('tenant-a', 'lawyer-1');
  assert.match(ext, /^ba-[0-9a-f]{32}$/u);
  assert.notEqual(ext, memberExternalId('tenant-b', 'lawyer-1'));
  const raw = Buffer.from('{"id":"e"}'), now = Date.now(), t = Math.floor(now / 1000);
  assert.equal(verifyMimtSignature(raw, `t=${t},v1=${mimtSignature(SECRET, t, raw)}`, SECRET, now), true);
  assert.equal(verifyMimtSignature(raw, `t=${t},v1=${mimtSignature('whsec_other-secret-000000', t, raw)}`, SECRET, now), false);
  assert.equal(verifyMimtSignature(raw, `t=${t - 600},v1=${mimtSignature(SECRET, t - 600, raw)}`, SECRET, now), false, 'replays are refused');
  assert.equal(mimtLink('https://app.mimt.ca/lier?code=X'), 'https://app.mimt.ca/lier?code=X');
  for (const bad of ['http://app.mimt.ca/', 'https://mimt.ca.evil.test/', 'https://evil.test/?mimt.ca', 'javascript:alert(1)']) assert.equal(mimtLink(bad), null);
});

test('without the MIMT key and webhook secret, telephony says so and never calls out', async t => {
  const f = await fixture(t, { env: { APP_ORIGIN: ENV.APP_ORIGIN } });
  const overview = await f.request('/api/telephony', { token: 'lawyer' });
  assert.equal(overview.json.configured, false);
  assert.equal(overview.json.provider, 'mimt');
  assert.deepEqual(overview.json.missing, ['BESOINAVOCAT_MIMT_API_KEY', 'BESOINAVOCAT_MIMT_WEBHOOK_SECRET']);
  const caseId = await f.caseWithLawyer();
  assert.equal((await f.request('/api/telephony/member', { token: 'lawyer', method: 'POST', body: { displayName: 'Me A' } })).status, 503);
  assert.equal((await f.request(`/api/cases/${caseId}/calls`, { token: 'lawyer', method: 'POST', body: { calleeSubject: 'client-1' } })).status, 503);
  assert.equal((await f.webhook('call.ringing', { call_id: 'x' })).status, 503);
  assert.equal(f.mimt.requests.length, 0);
  assert.equal((await f.request('/api/capabilities')).json.telephony.configured, false);
});

test('a lawyer links their own MIMT account, chooses one of their numbers and sets their availability', async t => {
  const f = await fixture(t);
  const caseId = await f.caseWithLawyer();
  assert.equal((await f.request('/api/telephony/member', { method: 'POST', body: { displayName: 'Client' } })).status, 403, 'clients are not MIMT members');
  const registered = await f.request('/api/telephony/member', { token: 'lawyer', method: 'POST', body: { displayName: 'Me Julie Tremblay', mobile: '514 555 0199' } });
  assert.equal(registered.status, 200, registered.text);
  const ext = memberExternalId('tenant-a', 'lawyer-1');
  assert.deepEqual(f.mimt.members.get(ext).name, 'Me Julie Tremblay');
  assert.equal(f.mimt.members.get(ext).phone, '+15145550199');
  assert.ok(![...f.mimt.members.keys()].some(k => k.includes('lawyer-1') || k.includes('tenant-a')), 'MIMT never sees the portal identity');
  assert.equal(registered.json.member.linked, false);
  assert.equal(registered.json.member.mobile, '•••-•••-0199');

  const link = await f.request('/api/telephony/member/link', { token: 'lawyer', method: 'POST', body: {} });
  assert.equal(link.status, 201, link.text);
  assert.equal(link.json.code, 'K7QM4XPA');
  assert.equal(link.json.url, 'https://app.mimt.ca/lier?code=K7QM4XPA&r=r-1');
  const audit = JSON.stringify((await f.request(`/api/cases/${caseId}/audit`, { token: 'lawyer' })).json);
  assert.ok(!audit.includes('K7QM4XPA'), 'the one-time code is never logged');

  const early = await f.request('/api/telephony/member/line', { token: 'lawyer', method: 'POST', body: { e164: OWNED } });
  assert.equal(early.json.error.code, 'MIMT_NOT_LINKED');
  assert.equal(early.json.error.link, 'https://app.mimt.ca/numero?partner=besoinavocat');

  f.mimt.link(ext);
  assert.equal((await f.webhook('member.linked', { member_external_id: ext }, { secret: 'whsec_wrong-secret-000000000000' })).status, 401);
  assert.equal((await f.webhook('member.linked', { member_external_id: ext }, { at: Math.floor(Date.now() / 1000) - 900 })).status, 401);
  assert.equal((await f.webhook('member.linked', { member_external_id: ext, linked_at: '2030-01-01T00:00:00.000Z' }, { id: 'evt-link' })).status, 200);
  assert.equal((await f.webhook('member.linked', { member_external_id: ext }, { id: 'evt-link' })).json.duplicate, true);

  const refreshed = await f.request('/api/telephony/member/refresh', { token: 'lawyer', method: 'POST', body: {} });
  assert.equal(refreshed.status, 200, refreshed.text);
  const member = refreshed.json.member;
  assert.equal(member.linked, true);
  assert.deepEqual(member.numbers.map(n => n.e164), [OWNED]);
  assert.equal(member.subscription.status, 'active');
  assert.equal(member.portIns[0].status, 'foc_scheduled');
  assert.equal(member.links.planUrl, 'https://app.mimt.ca/compte?partner=besoinavocat#forfait');
  assert.equal(member.readyToCall, false);

  assert.equal((await f.request('/api/telephony/member/line', { token: 'lawyer', method: 'POST', body: { e164: '+14385550100' } })).json.error.code, 'MIMT_NUMBER_NOT_OWNED');
  const chosen = await f.request('/api/telephony/member/line', { token: 'lawyer', method: 'POST', body: { e164: OWNED } });
  assert.equal(chosen.json.member.lineNumber, '514 555-0177');
  assert.equal(chosen.json.member.readyToCall, true);

  assert.equal((await f.request('/api/telephony/member/availability', { token: 'lawyer', method: 'POST', body: { status: 'nap' } })).status, 400);
  const busy = await f.request('/api/telephony/member/availability', { token: 'lawyer', method: 'POST', body: { status: 'busy', until: new Date(Date.now() + 3600e3).toISOString() } });
  assert.equal(busy.json.member.availability.effectiveStatus, 'busy');
  assert.equal(f.mimt.members.get(ext).availability.status, 'busy');
  await f.webhook('member.availability_changed', { member_external_id: ext, effective_status: 'offline', source: 'user', partner_status: 'busy', user_status: 'offline', until: null });
  assert.equal((await f.request('/api/telephony', { token: 'lawyer' })).json.member.availability.effectiveStatus, 'offline', 'the lawyer’s own choice in MIMT wins');
  await f.webhook('member.unlinked', { member_external_id: ext, by: 'user' });
  assert.equal((await f.request('/api/telephony', { token: 'lawyer' })).json.member.readyToCall, false);
});

test('a case call goes through MIMT click-to-call and MIMT’s signed webhooks timestamp it in the case', async t => {
  const f = await fixture(t);
  const caseId = await f.caseWithLawyer();
  assert.equal((await f.request('/api/telephony/phone', { method: 'POST', body: { phone: '450 555 0101', consent: false } })).status, 400);
  const saved = await f.request('/api/telephony/phone', { method: 'POST', body: { phone: '450 555 0101', consent: true } });
  assert.equal(saved.json.phone.phone, '•••-•••-0101');
  assert.equal((await f.request(`/api/cases/${caseId}/calls`, { method: 'POST', body: { calleeSubject: 'lawyer-1' } })).status, 403, 'clients do not place calls');
  assert.equal((await f.request(`/api/cases/${caseId}/calls`, { token: 'lawyer', method: 'POST', body: { calleeSubject: 'client-1' } })).json.error.code, 'MIMT_MEMBER_REQUIRED');
  await f.request('/api/telephony/member', { token: 'lawyer', method: 'POST', body: { displayName: 'Me A' } });
  const unlinked = await f.request(`/api/cases/${caseId}/calls`, { token: 'lawyer', method: 'POST', body: { calleeSubject: 'client-1' } });
  assert.equal(unlinked.json.error.code, 'MIMT_NOT_LINKED');
  assert.equal(unlinked.json.error.link, 'https://app.mimt.ca/numero?partner=besoinavocat');
  await f.readyLawyer();
  assert.equal((await f.request(`/api/cases/${caseId}/calls`, { token: 'lawyer', method: 'POST', body: { calleeSubject: 'stranger' } })).status, 400);
  assert.equal((await f.request(`/api/cases/${caseId}/calls`, { token: 'lawyer', method: 'POST', body: { calleeSubject: 'client-1', via: 'pigeon' } })).status, 400);
  const parts = await f.request(`/api/cases/${caseId}/participants`, { token: 'lawyer' });
  assert.equal(parts.json.canCall, true);
  assert.equal(parts.json.selfReady, true);
  assert.deepEqual(parts.json.participants.map(p => [p.subject, p.reachable]).sort(), [['client-1', true], ['lawyer-1', true]]);
  assert.ok(!JSON.stringify(parts.json).includes('5550101'));

  const started = await f.request(`/api/cases/${caseId}/calls`, { token: 'lawyer', method: 'POST', body: { calleeSubject: 'client-1', via: 'mobile' } });
  assert.equal(started.status, 201, started.text);
  const call = started.json.call;
  assert.deepEqual(f.mimt.dialed[0], { member: memberExternalId('tenant-a', 'lawyer-1'), to: '+14505550101', reference: call.id, via: 'mobile', callId: 'mc-1' });
  assert.equal(call.status, 'initiated');

  await f.webhook('call.ringing', { call_id: 'mc-1', direction: 'outbound', member_external_id: memberExternalId('tenant-a', 'lawyer-1'), reference: call.id, started_at: '2030-01-01T15:00:00.000Z' });
  await f.webhook('call.answered', { call_id: 'mc-1', direction: 'outbound', reference: call.id, answered_at: '2030-01-01T15:00:20.000Z' }, { id: 'evt-answer' });
  assert.equal((await f.webhook('call.answered', { call_id: 'mc-1' }, { id: 'evt-answer' })).json.duplicate, true);
  await f.webhook('call.completed', { call_id: 'mc-1', direction: 'outbound', reference: call.id, answered_at: '2030-01-01T15:00:20.000Z', ended_at: '2030-01-01T15:02:25.000Z', duration_s: 125, credits: 6, billing: 'billed', unbilled_credits: 0 });
  await f.webhook('recording.ready', { call_id: 'mc-1', recording_id: 'rec-1', duration_s: 120 });

  const listed = (await f.request(`/api/cases/${caseId}/calls`, { token: 'lawyer' })).json.calls[0];
  assert.equal(listed.status, 'completed');
  assert.equal(listed.durationSeconds, 125);
  assert.equal(listed.credits, 6);
  assert.equal(listed.billing, 'billed');
  assert.equal(listed.durationSource, 'mimt_signed_webhook');
  assert.equal(listed.answeredAt, '2030-01-01T15:00:20.000Z');
  assert.equal(listed.endedAt, '2030-01-01T15:02:25.000Z');
  assert.equal(listed.hasRecording, true);
  const events = (await f.request(`/api/cases/${caseId}/calls/${call.id}/events`, { token: 'lawyer' })).json.events;
  assert.deepEqual(events.map(e => e.status), ['initiated', 'ringing', 'answered', 'completed', 'recording-ready']);

  assert.equal((await f.request(`/api/cases/${caseId}/calls/${call.id}/recording`)).status, 403, 'clients do not listen to recordings');
  const audio = await f.request(`/api/cases/${caseId}/calls/${call.id}/recording`, { token: 'lawyer' });
  assert.equal(audio.status, 200);
  assert.equal(audio.type, 'audio/mpeg');
  assert.equal(audio.text, 'ID3synthetic-audio');

  const time = await f.request(`/api/cases/${caseId}/calls/${call.id}/time`, { token: 'lawyer', method: 'POST', body: {} });
  assert.equal(time.status, 201, time.text);
  assert.equal(time.json.timeEntry.minutes, 3);
  assert.match(time.json.timeEntry.description, /attestée par MIMT : 125 s/u);
  assert.equal((await f.request(`/api/cases/${caseId}/calls/${call.id}/time`, { token: 'lawyer', method: 'POST', body: {} })).status, 409);
  const record = await f.request(`/api/cases/${caseId}/generate`, { token: 'lawyer', method: 'POST', body: { kind: 'call_record', callId: call.id } });
  assert.equal(record.status, 201, record.text);
  assert.match((await f.request(record.json.document.downloadUrl, { token: 'lawyer' })).text, /Notification sign\xe9e de MIMT/u);

  const auditLog = (await f.request(`/api/cases/${caseId}/audit`, { token: 'lawyer' })).json.events.map(e => e.action);
  for (const action of ['call.requested', 'call.answered', 'call.ended', 'call.recording_ready', 'call.recording_listened', 'time.submitted']) assert.ok(auditLog.includes(action), action);
  assert.equal((await f.request('/api/telephony/phone/remove', { method: 'POST', body: {} })).json.phone, null);
});

test('the Équipe hunt group is synced to MIMT; webhooks show who answered; missed calls are called back', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/telephony/team', { token: 'client' })).status, 404, 'only team members see the console');
  const ext1 = await f.readyLawyer('lawyer', 'lawyer-1');
  const ext2 = await f.readyLawyer('lawyer2', 'lawyer-2');
  const synced = await f.request('/api/telephony/team/sync', { token: 'lawyer', method: 'POST', body: {} });
  assert.equal(synced.status, 200, synced.text);
  assert.deepEqual(f.mimt.groups.at(-1), { key: 'trouver-un-avocat', name: 'Équipe BesoinAvocat', members: [ext1, ext2], strategy: 'simultaneous', ringTimeoutS: 25, fallback: 'voicemail', did: '+14509993999' });
  assert.equal(synced.json.group.members, 2);
  assert.equal(synced.json.publicNumber, '450 999-3999');

  await f.webhook('call.ringing', { call_id: 'in-1', direction: 'inbound', hunt_group: 'trouver-un-avocat', from: '+15145550123', to: '+14509993999', started_at: '2030-01-01T16:00:00.000Z' });
  await f.webhook('call.answered', { call_id: 'in-1', direction: 'inbound', member_external_id: ext2, hunt_group: 'trouver-un-avocat', answered_at: '2030-01-01T16:00:09.000Z' });
  await f.webhook('call.completed', { call_id: 'in-1', direction: 'inbound', member_external_id: ext2, duration_s: 412, credits: 14, billing: 'billed', ended_at: '2030-01-01T16:07:01.000Z' });
  await f.webhook('call.ringing', { call_id: 'in-2', direction: 'inbound', hunt_group: 'trouver-un-avocat', from: '+15145550124', started_at: '2030-01-01T17:00:00.000Z' });
  await f.webhook('call.completed', { call_id: 'in-2', direction: 'inbound', duration_s: 0, credits: 0, billing: 'free', ended_at: '2030-01-01T17:00:30.000Z' });
  const view = (await f.request('/api/telephony/team', { token: 'lawyer' })).json;
  const answered = view.calls.find(c => c.externalNumber === '•••-•••-0123');
  assert.equal(answered.answeredBy, 'lawyer-2');
  assert.equal(answered.durationSeconds, 412);
  const missed = view.calls.find(c => c.externalNumber === '•••-•••-0124');
  assert.equal(missed.status, 'missed');
  assert.ok(!JSON.stringify(view).includes('5550124'));

  const back = await f.request(`/api/telephony/team/calls/${missed.id}/callback`, { token: 'lawyer', method: 'POST', body: {} });
  assert.equal(back.status, 201, back.text);
  assert.equal(f.mimt.dialed.at(-1).to, '+15145550124');
  assert.equal(f.mimt.dialed.at(-1).member, ext1);
  assert.equal((await f.request(`/api/telephony/team/calls/${missed.id}/callback`, { token: 'client', method: 'POST', body: {} })).status, 404);

  assert.equal((await f.request('/api/telephony/team/credits', { token: 'lawyer', method: 'POST', body: {} })).json.credits.balance, 4820);
  f.mimt.partnerCalls.push({ id: 'in-3', direction: 'inbound', reference: null, huntGroup: 'trouver-un-avocat', externalId: ext1, from: '+14385550111', to: '+14509993999',
    startedAt: '2030-01-02T10:00:00.000Z', answeredAt: '2030-01-02T10:00:05.000Z', endedAt: '2030-01-02T10:01:05.000Z', durationS: 60, credits: 2, billing: 'billed' });
  const reconciled = (await f.request('/api/telephony/team/calls/sync', { token: 'lawyer', method: 'POST', body: {} })).json;
  const late = reconciled.calls.find(c => c.externalNumber === '•••-•••-0111');
  assert.equal(late.answeredBy, 'lawyer-1', 'a lost webhook is recovered from GET /v1/partner/calls');
  assert.equal(late.status, 'completed');
});

test('the video room relays signaling only between present members and timestamps attendance', async t => {
  const f = await fixture(t);
  const caseId = await f.caseWithLawyer();
  const opened = await f.request(`/api/cases/${caseId}/video`, { method: 'POST', body: {} });
  assert.equal(opened.json.created, true);
  assert.equal((await f.request(`/api/cases/${caseId}/video`, { token: 'lawyer', method: 'POST', body: {} })).json.created, false);
  const roomId = opened.json.room.id;
  const base = `/api/cases/${caseId}/video/${roomId}`;
  assert.equal((await f.request(`${base}/join`, { token: 'stranger', method: 'POST', body: {} })).status, 404);
  assert.equal((await f.request(`/api/cases/${caseId}/video`, { token: 'other' })).status, 404);
  const a = await f.request(`${base}/join`, { method: 'POST', body: {} });
  assert.equal(a.status, 200, a.text);
  const turn = a.json.iceServers.find(s => Array.isArray(s.urls));
  assert.deepEqual(turn.urls, ['turn:turn.example.test:3478?transport=udp', 'turns:turn.example.test:5349'], 'the platform’s own TURN relay is offered');
  assert.match(turn.username, /^[0-9]{10}:ba$/u);
  assert.equal(turn.credential, createHmac('sha1', ENV.BESOINAVOCAT_TURN_SECRET).update(turn.username).digest('base64'));
  assert.equal(a.json.relay, true);
  assert.equal((await f.request(`${base}/signal`, { method: 'POST', body: { to: 'lawyer-1', kind: 'offer', payload: 'x' } })).json.error.code, 'PEER_GONE');
  const b = await f.request(`${base}/join`, { token: 'lawyer', method: 'POST', body: {} });
  assert.equal(b.json.room.participants.length, 2);
  assert.equal((await f.request(`${base}/signal`, { method: 'POST', body: { to: 'lawyer-1', kind: 'offer', payload: '{"sdp":"v=0"}' } })).status, 200);
  assert.equal((await f.request(`${base}/signal`, { method: 'POST', body: { to: 'lawyer-1', kind: 'evil', payload: '' } })).status, 400);
  const polled = await f.request(`${base}/poll`, { token: 'lawyer', method: 'POST', body: { after: b.json.after } });
  assert.equal(polled.json.signals.length, 1);
  assert.equal(polled.json.signals[0].fromSubject, 'client-1');
  assert.equal((await f.request(`${base}/poll`, { method: 'POST', body: { after: 0 } })).json.signals.length, 0, 'a member only receives what is addressed to them');
  assert.equal((await f.request(`${base}/end`, { method: 'POST', body: {} })).status, 403, 'a client cannot end the room');
  assert.equal((await f.request(`${base}/leave`, { method: 'POST', body: {} })).json.left, true);
  const ended = await f.request(`${base}/end`, { token: 'lawyer', method: 'POST', body: {} });
  assert.equal(ended.json.ended, true);
  assert.equal((await f.request(`${base}/poll`, { token: 'lawyer', method: 'POST', body: { after: 0 } })).json.ended, true);
  const history = (await f.request(`/api/cases/${caseId}/video/history`)).json.rooms;
  assert.equal(history[0].attendance.length, 2);
  const audit = (await f.request(`/api/cases/${caseId}/audit`, { token: 'lawyer' })).json.events.map(e => e.action);
  for (const action of ['video.room_opened', 'video.joined', 'video.left', 'video.room_ended']) assert.ok(audit.includes(action), action);
});

test('the sealed journal chains every event and detects a tampered database row', async t => {
  const f = await fixture(t);
  const caseId = await f.caseWithLawyer();
  assert.equal((await f.request(`/api/cases/${caseId}/journal`)).status, 403);
  const sealed = await f.request(`/api/cases/${caseId}/journal/seal`, { token: 'lawyer', method: 'POST', body: {} });
  assert.equal(sealed.status, 201);
  const { events, seal, genesis } = sealed.json;
  assert.equal(seal.eventCount, events.length);
  assert.equal(seal.headDigest, events.at(-1).chain);
  assert.notEqual(genesis, seal.headDigest);
  await f.request(`/api/cases/${caseId}/messages`, { method: 'POST', body: { body: 'Nouvelle question' } });
  assert.equal((await f.request(`/api/cases/${caseId}/journal/verify`, { token: 'lawyer' })).json.intact, true, 'new events do not break older seals');
  const db = f.app.store.db;
  db.exec('DROP TRIGGER immutable_audit_update');
  db.prepare("UPDATE audit_events SET subject='someone-else' WHERE action='case.created'").run();
  const verdict = (await f.request(`/api/cases/${caseId}/journal/verify`, { token: 'lawyer' })).json;
  assert.equal(verdict.intact, false);
  assert.equal(verdict.seals[0].intact, false);
  const rows = [{ id: '1', subject: 'a', action: 'x', targetId: null, createdAt: 't', details: '{}' }];
  assert.notEqual(chainEvents('t', 'c', rows)[0].chain, chainEvents('t', 'c2', rows)[0].chain, 'the chain is bound to the case');
});

test('generated documents are real PDFs saved in the case, factual, searchable and limited to lawyers', async t => {
  const f = await fixture(t);
  const caseId = await f.caseWithLawyer();
  await f.request(`/api/cases/${caseId}/documents`, { method: 'POST', body: { name: 'Bail.pdf', mimeType: 'application/pdf', contentBase64: Buffer.from('%PDF-synthetic').toString('base64'), sourceType: 'original', reviewStatus: 'a_verifier' } });
  assert.equal((await f.request(`/api/cases/${caseId}/generate`, { method: 'POST', body: { kind: 'exhibit_list' } })).status, 403);
  assert.equal((await f.request(`/api/cases/${caseId}/generate`)).json.canGenerate, false);
  for (const kind of ['exhibit_list', 'case_summary', 'audit_journal', 'time_statement']) {
    const made = await f.request(`/api/cases/${caseId}/generate`, { token: 'lawyer', method: 'POST', body: { kind } });
    assert.equal(made.status, 201, `${kind}: ${made.text}`);
    assert.equal(made.json.document.mimeType, 'application/pdf');
    assert.equal(made.json.document.sourceType, 'analyse');
    assert.equal(made.json.document.reviewStatus, 'a_verifier');
    const file = await f.request(made.json.document.downloadUrl, { token: 'lawyer' });
    assert.ok(file.text.startsWith('%PDF-1.4'), kind);
    assert.ok(file.text.trimEnd().endsWith('%%EOF'), kind);
    assert.match(file.text, /\/Count [1-9]/u);
  }
  const template = await f.request(`/api/cases/${caseId}/generate`, { token: 'lawyer', method: 'POST', body: { kind: 'template', title: 'Lettre de suivi', body: 'Dossier {{dossier.titre}} ({{dossier.reference}}), le {{date}}.\n\nPièces :\n{{pieces}}\n\n{{inconnu}}' } });
  assert.equal(template.status, 201, template.text);
  const found = await f.request(`/api/cases/${caseId}/search?q=${encodeURIComponent('SYN-1')}`, { token: 'lawyer' });
  assert.equal(found.status, 200);
  const pdf = (await f.request(template.json.document.downloadUrl, { token: 'lawyer' })).text;
  assert.match(pdf, /Dossier synth\xe9tique \\\(SYN-1\\\)/u);
  assert.match(pdf, /\{\{inconnu\}\}/u);
  assert.equal((await f.request(`/api/cases/${caseId}/generate`, { token: 'lawyer', method: 'POST', body: { kind: 'nope' } })).status, 400);
  assert.equal((await f.request(`/api/cases/${caseId}/generate`, { token: 'lawyer', method: 'POST', body: { kind: 'call_record', callId: '00000000-0000-4000-8000-000000000000' } })).status, 404);
});

test('the PDF writer encodes French text in WinAnsi, escapes delimiters and produces a valid cross-reference table', () => {
  assert.equal(winAnsi('é’(a)\\'), '\xe9\x92\\(a\\)\\\\');
  const doc = createPdf({ title: 'Essai', meta: [['Clé', 'valeur']], footer: 'pied' });
  for (let i = 0; i < 120; i += 1) doc.paragraph(`Ligne ${i} avec du texte accentué : à, è, ç, « guillemets ».`);
  const bytes = doc.toBuffer();
  const text = bytes.toString('latin1');
  assert.match(text, /\/Count [2-9]/u, 'long content spans several pages');
  const xref = Number(/startxref\n([0-9]+)/u.exec(text)[1]);
  assert.equal(text.slice(xref, xref + 4), 'xref');
  const offsets = [...text.slice(xref).matchAll(/^([0-9]{10}) 00000 n $/gmu)].map(m => Number(m[1]));
  offsets.forEach((offset, i) => assert.ok(text.startsWith(`${i + 1} 0 obj`, offset), `object ${i + 1} offset`));
});
