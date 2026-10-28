import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';
import { Worker } from 'node:worker_threads';
import { createStore } from '../lib/store.mjs';
import { createCommunications, communicationInput, zoomJoinUrl } from '../lib/communications.mjs';

const users = Object.fromEntries(['client', 'lawyer', 'owner', 'stranger'].map(subject => [subject, { subject, tenantId: 'tenant-a' }]));
const body = { title: 'Synthetic consultation', kind: 'video', scheduledAt: '2026-11-01T18:00:00Z', joinUrl: 'https://us02web.zoom.us/j/12345678901?pwd=synthetic' };
const fails = (fn, status) => assert.throws(fn, error => error.status === status);
function fixture(t, rates = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ba-communications-'));
  const dbPath = join(dir, 'db.sqlite'); const blobDir = join(dir, 'blobs');
  const store = createStore({ dbPath, blobDir });
  const caseId = store.createCase(users.client, { title: 'Synthetic', reference: 'SYNTHETIC' }).id;
  for (const role of ['owner', 'lawyer']) store.provisionMembership({ ...users[role], caseId, role });
  const audit = (user, caseId, action, id = null, details = {}) => store.db.prepare('INSERT INTO audit_events VALUES (?,?,?,?,?,?,?,?)').run(randomUUID(), user.tenantId, user.subject, caseId, action, id, new Date().toISOString(), JSON.stringify(details));
  let time = Date.parse('2026-11-01T18:00:00Z');
  const api = createCommunications({ db: store.db, access: store.access, audit, clock: () => time, rates });
  t.after(() => { store.close(); assert.equal(dirname(dir), resolve(tmpdir())); assert.ok(basename(dir).startsWith('ba-communications-')); rmSync(dir, { recursive: true, force: true }); });
  const schedule = (value = body, key = randomUUID()) => api.schedule(users.lawyer, caseId, value, key);
  return { api, store, caseId, schedule, advance: ms => { time += ms; }, getTime: () => time, dbPath, blobDir };
}

test('only participant Zoom HTTPS links; malformed inputs and provider claims rejected', () => {
  assert.equal(zoomJoinUrl('https://zoom.us/j/123456789'), 'https://zoom.us/j/123456789');
  assert.equal(zoomJoinUrl(''), null);
  for (const url of ['http://zoom.us/j/123456789', 'https://zoom.us.evil.test/j/123456789', 'https://evil.test/zoom.us/j/123456789',
    'https://zoom.us@evil.test/j/123456789', 'https://user@zoom.us/j/123456789', 'https://zoom.us:8443/j/123456789',
    'https://zoom.us./j/123456789', 'https://zoom.us/j/123456789#x', 'https://zoom.us/s/123456789?zak=host',
    'https://zoom.us/j/123456789?redirect=https://evil.test', 'https://zoom.us/j/123456789?pwd=a&pwd=b', 'https://zoom.us\\@evil.test/j/123456789']) fails(() => zoomJoinUrl(url), 400);
  fails(() => communicationInput({ ...body, providerVerified: true }), 400);
  fails(() => communicationInput({ ...body, rateCentsPerMinute: 1 }), 400);
  fails(() => communicationInput({ ...body, kind: 'phone' }), 400);
  fails(() => communicationInput({ ...body, scheduledAt: '2026-02-30T12:00:00Z' }), 400);
});

test('case permissions, tenant isolation and scheduling idempotence', t => {
  const f = fixture(t); const key = randomUUID();
  fails(() => f.api.schedule(users.client, f.caseId, body, key), 403);
  const session = f.schedule(body, key);
  assert.equal(f.schedule(body, key).id, session.id);
  fails(() => f.schedule({ ...body, title: 'Changed' }, key), 409);
  assert.equal(f.api.list(users.client, f.caseId).sessions.length, 1);
  const second = f.store.createCase(users.client, { title: 'Other', reference: '' }).id;
  fails(() => f.api.start(users.client, second, session.id), 404);
  for (const outsider of [users.stranger, { ...users.client, tenantId: 'tenant-b' }]) {
    fails(() => f.api.list(outsider, f.caseId), 404);
    fails(() => f.api.start(outsider, f.caseId, session.id), 404);
    fails(() => f.api.listUsage(outsider, f.caseId), 404);
  }
  assert.equal(f.store.db.prepare("SELECT count(*) n FROM audit_events WHERE action='communication.scheduled'").get().n, 1);
  const details = f.store.db.prepare("SELECT details FROM audit_events WHERE action LIKE 'communication.%'").all();
  assert.equal(JSON.stringify(details).includes('pwd'), false);
});

test('manual timers are personal, server-timed, persistent and never automatically billed', t => {
  const f = fixture(t); const session = f.schedule();
  const first = f.api.start(users.client, f.caseId, session.id);
  assert.equal(f.api.start(users.client, f.caseId, session.id).id, first.id);
  fails(() => f.api.end(users.lawyer, f.caseId, session.id), 409);
  f.advance(61234);
  const ended = f.api.end(users.client, f.caseId, session.id);
  assert.equal(ended.seconds, 61);
  assert.equal(ended.providerVerified, false);
  f.advance(60000);
  assert.deepEqual(f.api.end(users.client, f.caseId, session.id), ended);
  assert.deepEqual(f.api.start(users.client, f.caseId, session.id), ended);
  const usage = f.api.listUsage(users.lawyer, f.caseId).entries;
  assert.equal(usage.length, 1);
  assert.equal(usage[0].estimateCents, null);
  assert.equal(usage[0].billed, false);
  assert.equal(usage[0].durationSource, 'manual_server_timer');
  fails(() => f.store.db.prepare('UPDATE communication_usage SET seconds=1').run(), undefined);
  fails(() => f.api.cancel(users.lawyer, f.caseId, session.id), 409);
});

test('at most one active timer per identity; each participant has a separate timer', t => {
  const f = fixture(t); const one = f.schedule(); const two = f.schedule();
  f.api.start(users.client, f.caseId, one.id);
  fails(() => f.api.start(users.client, f.caseId, two.id), 409);
  f.api.start(users.lawyer, f.caseId, one.id);
  const c = f.api.list(users.client, f.caseId).sessions.find(s => s.id === one.id).ownTimer;
  const l = f.api.list(users.lawyer, f.caseId).sessions.find(s => s.id === one.id).ownTimer;
  assert.notEqual(c.id, l.id);
  assert.equal(f.api.list(users.owner, f.caseId).sessions.find(s => s.id === one.id).ownTimer, null);
});

test('the caller can still find and stop an active timer beyond 200 later appointments', t => {
  const f = fixture(t);
  const old = f.schedule({ ...body, scheduledAt: '2026-10-01T10:00:00Z' });
  f.api.start(users.client, f.caseId, old.id);
  for (let index = 0; index < 200; index++) f.schedule({ ...body, title: `Later synthetic appointment ${index}` });
  const list = f.api.list(users.client, f.caseId);
  assert.equal(list.sessions.length, 200);
  assert.equal(list.hasMore, true);
  assert.equal(list.sessions[0].id, old.id);
  assert.equal(list.sessions[0].ownTimer.status, 'running');
  // Another member neither sees that timer nor has their ordering changed by it.
  const other = f.api.list(users.owner, f.caseId);
  assert.equal(other.sessions.some(session => session.id === old.id), false);
  assert.ok(other.sessions.every(session => session.ownTimer === null));
  f.advance(61000);
  assert.equal(f.api.end(users.client, f.caseId, list.sessions[0].id).seconds, 61);
  const stopped = f.api.list(users.client, f.caseId);
  assert.equal(stopped.sessions.some(session => session.id === old.id), false);
  assert.equal(f.api.start(users.client, f.caseId, stopped.sessions[0].id).status, 'running');
});

test('configured rates produce explicit estimates; approval requires another manager', t => {
  const f = fixture(t, { videoCentsPerMinute: 101 }); const s = f.schedule();
  f.api.start(users.lawyer, f.caseId, s.id); f.advance(61000); f.api.end(users.lawyer, f.caseId, s.id);
  const usage = f.api.listUsage(users.client, f.caseId).entries[0];
  assert.equal(usage.estimateCents, 103);
  assert.equal(usage.rateCentsPerMinute, 101);
  fails(() => f.api.approveUsage(users.lawyer, f.caseId, usage.id), 403);
  fails(() => f.api.approveUsage(users.client, f.caseId, usage.id), 403);
  const approved = f.api.approveUsage(users.owner, f.caseId, usage.id);
  assert.equal(approved.status, 'approved_internal_only');
  assert.equal(approved.billed, false);
  assert.deepEqual(f.api.approveUsage(users.owner, f.caseId, usage.id), approved);
  assert.equal(f.store.db.prepare('SELECT count(*) n FROM communication_usage_approvals').get().n, 1);
});

test('clock reversal refuses closing; forgotten timers keep full evidence with review flag', t => {
  const f = fixture(t, { phoneCentsPerMinute: 50 }); const s = f.schedule({ ...body, kind: 'phone', joinUrl: null });
  assert.equal(s.providerState, 'not_connected');
  f.api.start(users.client, f.caseId, s.id); f.advance(-1000);
  fails(() => f.api.end(users.client, f.caseId, s.id), 409);
  f.advance(86402000); f.api.end(users.client, f.caseId, s.id);
  const usage = f.api.listUsage(users.client, f.caseId).entries[0];
  assert.equal(usage.seconds, 86401); assert.equal(usage.needsReview, true); assert.equal(usage.estimateCents, null);
  fails(() => f.api.approveUsage(users.owner, f.caseId, usage.id), 409);
});

test('cancellation is idempotent and prohibits starting a cancelled appointment', t => {
  const f = fixture(t); const s = f.schedule();
  fails(() => f.api.cancel(users.client, f.caseId, s.id), 403);
  const cancelled = f.api.cancel(users.owner, f.caseId, s.id);
  assert.equal(cancelled.status, 'cancelled');
  assert.deepEqual(f.api.cancel(users.owner, f.caseId, s.id), cancelled);
  fails(() => f.api.start(users.client, f.caseId, s.id), 409);
});

test('concurrent SQLite connections close once and append a single usage event', async t => {
  const f = fixture(t); const s = f.schedule(); f.api.start(users.client, f.caseId, s.id); f.advance(60000);
  const workerCode = `const {parentPort,workerData:d}=require('node:worker_threads');
    (async()=>{const {createStore}=await import(d.storeModule);const {createCommunications}=await import(d.module);
      const store=createStore({dbPath:d.dbPath,blobDir:d.blobDir});
      const audit=(u,c,a,id=null,details={})=>store.db.prepare('INSERT INTO audit_events VALUES (?,?,?,?,?,?,?,?)').run(require('node:crypto').randomUUID(),u.tenantId,u.subject,c,a,id,new Date().toISOString(),JSON.stringify(details));
      const api=createCommunications({db:store.db,access:store.access,audit,clock:()=>d.time});
      parentPort.postMessage(api.end(d.user,d.caseId,d.sessionId));store.close();
    })().catch(e=>{parentPort.postMessage({error:e.message});process.exitCode=1;});`;
  const run = () => new Promise((resolve, reject) => {
    const worker = new Worker(workerCode, { eval: true, workerData: {
      storeModule: new URL('../lib/store.mjs', import.meta.url).href, module: new URL('../lib/communications.mjs', import.meta.url).href,
      dbPath: f.dbPath, blobDir: f.blobDir, user: users.client, caseId: f.caseId, sessionId: s.id, time: f.getTime(),
    } });
    let result;
    worker.on('message', message => { result = message; }); worker.on('error', reject);
    worker.on('exit', code => code ? reject(new Error(result?.error || `worker exit ${code}`)) : resolve(result));
  });
  const [one, two] = await Promise.all([run(), run()]);
  assert.deepEqual(one, two); assert.equal(one.seconds, 60);
  assert.equal(f.api.listUsage(users.client, f.caseId).entries.length, 1);
  assert.equal(f.store.db.prepare("SELECT count(*) n FROM audit_events WHERE action='communication.timer_ended'").get().n, 1);
});
