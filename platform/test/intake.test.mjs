import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createApp } from '../server.mjs';
import { createIntake, intakeConfiguration } from '../lib/intake.mjs';

const ORIGIN = 'https://portal.example.test', WP = 'https://www.example.test';
const contact = () => ({ name: 'Personne Synthétique', email: 'synthetic@example.test', role: 'client', language: 'fr',
  domain: 'civil', region: 'montreal', consent: true, consentVersion: '2026-10-26.1', website: '' });
const headers = key => ({ Origin: WP, 'X-Requested-With': 'XMLHttpRequest', 'Idempotency-Key': key ?? randomUUID() });
function inspect(file, query = 'SELECT * FROM ba_intakes', params = []) {
  const db = new DatabaseSync(file, { readOnly: true });
  try { return db.prepare(query).all(...params); } finally { db.close(); }
}

async function fixture(t, override = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'ba-intake-test-'));
  const file = path.join(root, 'intake.sqlite'), apps = [];
  const env = { BESOINAVOCAT_INTAKE_DB_PATH: file, BESOINAVOCAT_INTAKE_ALLOWED_ORIGINS: JSON.stringify([WP, ORIGIN]), ...override };
  const start = async (options = {}) => {
    const app = createApp({ dbPath: path.join(root, 'cases.sqlite'), blobDir: path.join(root, 'blobs'), env, ...options });
    apps.push(app); app.listen(0, '127.0.0.1'); await once(app, 'listening');
    const base = `http://127.0.0.1:${app.address().port}`;
    const request = async (route, { method = 'GET', body, raw, headers: extra = {} } = {}) => {
      const response = await fetch(base + route, { method, headers: { ...(body !== undefined ? {'Content-Type':'application/json'} : {}), ...extra },
        body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
      const text = await response.text();
      return { status: response.status, text, json: text ? JSON.parse(text) : null, headers: response.headers };
    };
    const post = (body = contact(), options = {}) => request('/api/intake', { method:'POST', body, ...options, headers: options.headers ?? headers() });
    return { app, base, request, post };
  };
  t.after(async () => {
    for (const app of apps) if (app.listening) await new Promise(resolve => app.close(resolve));
    assert.equal(path.dirname(root), path.resolve(tmpdir())); assert.match(path.basename(root), /^ba-intake-test-/);
    await rm(root, { recursive:true, force:true });
  });
  return { root, file, env, start, ...(await start()) };
}

test('public versioned catalogue has exact CAD prices, free clients and separate inactive AI credits', async t => {
  const f = await fixture(t);
  const result = await f.request('/api/catalog', { headers: { Origin: WP } });
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('access-control-allow-origin'), WP);
  assert.equal(result.headers.get('access-control-allow-credentials'), null);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  const value = result.json;
  assert.equal(value.version, '2026-10-27.1'); assert.equal(value.currency, 'CAD'); assert.equal(value.amountUnit, 'minor');
  assert.equal(value.purchaseAvailable, false); assert.equal(value.client.amountMinor, 0);
  assert.deepEqual(value.professional.plans.map(item => [item.id,item.amountMinor,item.interval]), [['weekly',10000,'week'],['monthly',30000,'month']]);
  assert.equal(value.professional.subscriptionActive, false);
  assert.equal(value.aiCredits.includedInProfessionalPlan, false); assert.equal(value.aiCredits.purchaseAvailable, false);
  assert.equal(value.intake.enabled, true);
  for (const group of ['domains','regions','roles']) for (const choice of value.choices[group]) {
    assert.ok(choice.label.fr); assert.ok(choice.label.en);
  }
  assert.equal(value.choices.domains.length, 8); assert.equal(value.choices.regions.length, 18);
  assert.ok(value.intake.consent.text.fr); assert.ok(value.intake.consent.text.en);
  assert.equal(value.intake.request.enabled, false); assert.equal(value.intake.request.consent.version, '2026-10-27.1');
  assert.equal((await f.request('/api/catalog?price=1')).status, 400);
  assert.equal((await f.request('/api/catalog', { method:'POST', body:{} })).status, 405);
  assert.deepEqual(inspect(f.file), []);
});

test('unconfigured or invalid private storage fails closed with no false receipt', async t => {
  const f = await fixture(t, { BESOINAVOCAT_INTAKE_DB_PATH: '' });
  assert.equal((await f.request('/api/catalog')).json.intake.enabled, false);
  assert.equal((await f.request('/api/health')).json.intakeConfigured, false);
  const result = await f.post();
  assert.equal(result.status, 503); assert.equal(result.json.error.code, 'INTAKE_UNAVAILABLE');
  assert.doesNotMatch(result.text, /received|BA-|synthetic@/);
  assert.equal(f.app.store.db.prepare('SELECT COUNT(*) AS n FROM cases').get().n, 0);
});

test('only exact configured HTTPS origins and noncredentialed mutation headers are accepted', async t => {
  const f = await fixture(t);
  const variants = [{}, { ...headers(), Origin:'null' }, { ...headers(), Origin:'https://evil.example.test' },
    { ...headers(), Origin:WP+'/' }, { ...headers(), Origin:WP+'.evil.test' }, { Origin:WP,'Idempotency-Key':randomUUID() },
    { ...headers(), 'X-Requested-With':'fetch' }, { ...headers(), Authorization:'Bearer synthetic' },
    { ...headers(), Cookie:'anything=synthetic' }, { ...headers(), 'Idempotency-Key':'not-random' }];
  for (const variant of variants) {
    const result = await f.post(contact(), { headers:variant });
    assert.ok([400,403].includes(result.status), result.text);
  }
  assert.equal((await f.request('/api/catalog', { headers:{ Origin:'https://evil.example.test' } })).status, 403);
  assert.equal(inspect(f.file).length, 0);
});

test('preflight permits only exact routes, methods and listed headers without credentials', async t => {
  const f = await fixture(t);
  const preflight = { Origin:WP,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type, x-requested-with, idempotency-key' };
  const result = await f.request('/api/intake', { method:'OPTIONS', headers:preflight });
  assert.equal(result.status, 204); assert.equal(result.text, '');
  assert.equal(result.headers.get('access-control-allow-origin'), WP);
  assert.equal(result.headers.get('access-control-allow-methods'), 'POST');
  assert.equal(result.headers.get('access-control-allow-credentials'), null);
  for (const variant of [{...preflight,Origin:'https://evil.test'}, {...preflight,'Access-Control-Request-Method':'DELETE'}, {...preflight,'Access-Control-Request-Headers':'authorization'}]) {
    assert.equal((await f.request('/api/intake', {method:'OPTIONS',headers:variant})).status,403);
  }
  const privateRoute = await f.request('/api/cases', {method:'OPTIONS',headers:preflight});
  assert.equal(privateRoute.status,401); assert.equal(privateRoute.headers.get('access-control-allow-origin'),null);
  assert.equal(inspect(f.file).length,0);
});

test('client receipt is emitted only after separate private storage with consent and no case creation', async t => {
  const f = await fixture(t), body = { ...contact(), phone:'+1 (555) 123-4567' };
  const result = await f.post(body);
  assert.equal(result.status,201,result.text);
  assert.deepEqual(Object.keys(result.json).sort(), ['reference','status']);
  assert.match(result.json.reference,/^BA-[A-Za-z0-9_-]{24}$/u); assert.equal(result.json.status,'received');
  assert.doesNotMatch(result.text,/Personne|synthetic|555|email|phone/);
  const rows = inspect(f.file); assert.equal(rows.length,1);
  assert.equal(rows[0].reference,result.json.reference); assert.equal(rows[0].origin,WP);
  const stored = JSON.parse(rows[0].payloadJson); assert.equal(stored.consent,true); assert.equal(stored.consentVersion,'2026-10-26.1');
  assert.equal(stored.name,body.name); assert.equal(stored.phone,body.phone); assert.equal(stored.website,undefined);
  assert.match(rows[0].createdAt,/Z$/u); assert.match(rows[0].consentText,/ni abonnement/u);
  assert.equal(JSON.parse(rows[0].priceJson).amountMinor,0); assert.equal(rows[0].catalogVersion,'2026-10-27.1');
  assert.equal(f.app.store.db.prepare('SELECT COUNT(*) AS n FROM cases').get().n,0);
  assert.equal(f.app.store.db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name LIKE 'ba_intake%'").get().n,0);
  const limits = inspect(f.file,'SELECT * FROM ba_intake_limits');
  assert.ok(limits.every(row => !row.id.includes('@') && !row.id.includes('127.0.0.1')));
});

test('professional periodicity records catalogue snapshot and bilingual consent without buying anything', async t => {
  const f = await fixture(t);
  for (const [periodicity,language,amount] of [['weekly','fr',10000],['monthly','en',30000]]) {
    const result = await f.post({...contact(),role:'professional',periodicity,language});
    assert.equal(result.status,201);
    const [row] = inspect(f.file,'SELECT * FROM ba_intakes WHERE reference=?',[result.json.reference]);
    assert.equal(JSON.parse(row.payloadJson).periodicity,periodicity);
    const price=JSON.parse(row.priceJson); assert.equal(price.amountMinor,amount); assert.equal(price.currency,'CAD');
    assert.equal(price.purchaseAvailable,false); assert.equal(price.aiCreditsIncluded,false);
    assert.match(row.consentText,language==='fr'?/Je consens/u:/I consent/u);
  }
  assert.equal(f.app.store.db.prepare('SELECT COUNT(*) AS n FROM cases').get().n,0);
});

test('consent must be explicit boolean true with the current version', async t => {
  const f=await fixture(t);
  for (const delta of [{consent:false},{consent:'true'},{consent:1},{consent:null},{consentVersion:'old'}]) {
    const result=await f.post({...contact(),...delta}); assert.equal(result.status,400); assert.equal(result.json.error.code,'INTAKE_CONSENT_REQUIRED');
  }
  const body=contact(); delete body.consent;
  assert.equal((await f.post(body)).status,400);
  assert.equal(inspect(f.file).length,0);
});

test('bounded contact fields reject scripts, bad addresses, invalid phone and non-enumerated choices', async t => {
  const f=await fixture(t);
  for (const delta of [{name:''},{name:'x'.repeat(121)},{name:'<script>alert(1)</script>'},{name:'one\ntwo'},
    {email:'not an email'},{email:'a'.repeat(65)+'@example.test'},{email:'x@example.test\r\nBcc:x'},
    {phone:'123'},{phone:'x'.repeat(33)},{phone:'1'.repeat(16)},{language:'de'},{region:'anywhere'},{domain:'invented'},{role:'admin'}]) {
    const result=await f.post({...contact(),...delta}); assert.equal(result.status,400,result.text);
    assert.doesNotMatch(result.text,/alert\(1\)|Bcc|invented|anywhere/);
  }
  assert.equal(inspect(f.file).length,0);
});

test('no narratives, files, permissions, prices or client subscription fields are accepted; honeypot rejects honestly', async t => {
  const f=await fixture(t);
  for (const delta of [{story:'Private legal story'},{file:'base64'},{source:'campaign'},{tenantId:'forged'},
    {amount:1},{periodicity:'weekly'},{website:'https://spam.test'},{role:'professional'},{role:'professional',periodicity:'yearly'}]) {
    const result=await f.post({...contact(),...delta}); assert.equal(result.status,400,result.text); assert.doesNotMatch(result.text,/received|Private legal story/);
  }
  assert.equal(inspect(f.file).length,0);
});

test('transport bounds and strict JSON reject oversized, malformed and compressed bodies before storage', async t => {
  const f=await fixture(t);
  const tooLarge=await f.post({...contact(),name:'x'.repeat(13000)}); assert.equal(tooLarge.status,413);
  const malformed=await f.request('/api/intake',{method:'POST',headers:{...headers(),'Content-Type':'application/json'},raw:'{"oops"'}); assert.equal(malformed.status,400);
  const compressed=await f.post(contact(),{headers:{...headers(),'Content-Encoding':'gzip'}}); assert.equal(compressed.status,415);
  const nonJson=await f.request('/api/intake',{method:'POST',headers:{...headers(),'Content-Type':'text/plain'},raw:'x'}); assert.equal(nonJson.status,415);
  assert.equal((await f.request('/api/intake?email=private',{method:'POST',headers:headers(),body:contact()})).status,400);
  assert.equal(inspect(f.file).length,0);
});

test('a retried idempotency key returns the committed reference; changed body or origin conflicts', async t => {
  const f=await fixture(t), key=randomUUID(), h=headers(key), body=contact();
  const first=await f.post(body,{headers:h}), retry=await f.post(body,{headers:h});
  assert.equal(first.status,201); assert.deepEqual(retry.json,first.json);
  const conflict=await f.post({...body,name:'Other synthetic person'},{headers:h});
  assert.equal(conflict.status,409); assert.equal(conflict.json.error.code,'IDEMPOTENCY_CONFLICT');
  assert.doesNotMatch(conflict.text,/Other synthetic|BA-/);
  assert.equal((await f.post(body,{headers:{...h,Origin:ORIGIN}})).status,409);
  assert.equal(inspect(f.file).length,1);
  const [row]=inspect(f.file); assert.notEqual(row.idempotencyHash,key); assert.match(row.idempotencyHash,/^[a-f0-9]{64}$/);
});

test('two app instances share atomic idempotence; restarting preserves the receipt without public retrieval', async t => {
  const f=await fixture(t), second=await f.start(), key=randomUUID(), body=contact();
  const results=await Promise.all([f.post(body,{headers:headers(key)}),second.post(body,{headers:headers(key)})]);
  assert.ok(results.every(result=>result.status===201)); assert.deepEqual(results[0].json,results[1].json); assert.equal(inspect(f.file).length,1);
  await new Promise(resolve=>f.app.close(resolve));
  const third=await f.start();
  assert.deepEqual((await third.post(body,{headers:headers(key)})).json,results[0].json);
  assert.equal(inspect(f.file).length,1);
});

test('database write failure never produces a receipt or leaks the storage diagnostic', async t => {
  const f=await fixture(t), admin=new DatabaseSync(f.file);
  admin.exec("CREATE TRIGGER synthetic_failure BEFORE INSERT ON ba_intakes BEGIN SELECT RAISE(ABORT,'PRIVATE_DIAGNOSTIC'); END;"); admin.close();
  const result=await f.post(); assert.equal(result.status,503); assert.equal(result.json.error.code,'INTAKE_UNAVAILABLE');
  assert.doesNotMatch(result.text,/received|PRIVATE_DIAGNOSTIC|sqlite|synthetic@/);
  assert.equal(inspect(f.file).length,0);
});

test('shared contact and client rate limits stop additional writes, including across app instances', async t => {
  const f=await fixture(t), second=await f.start();
  for(let i=0;i<3;i++) assert.equal((await f.post({...contact(),name:`Synthetic ${i}`})).status,201);
  const denied=await second.post({...contact(),name:'Synthetic fourth'});
  assert.equal(denied.status,429); assert.equal(denied.json.error.code,'INTAKE_RATE_LIMIT'); assert.equal(inspect(f.file).length,3);
  for(let i=4;i<20;i++) assert.equal((await second.post({...contact(),email:`synthetic${i}@example.test`})).status,201);
  assert.equal((await f.post({...contact(),email:'syntheticlast@example.test'})).status,429);
  assert.equal(inspect(f.file).length,19);
});

test('public reads and guessed receipt URLs expose neither leads nor their existence', async t => {
  const f=await fixture(t), created=await f.post();
  for(const route of ['/api/intake','/api/intake/'+created.json.reference,'/api/intake/not-a-reference','/api/leads','/api/intakes']) {
    const result=await f.request(route); assert.ok([401,404,405].includes(result.status));
    assert.doesNotMatch(result.text,/synthetic@example|Personne|BA-|received/);
  }
  const catalog=await f.request('/api/catalog'); assert.doesNotMatch(catalog.text,/synthetic@example|Personne|BA-/);
  const owner=await f.start({authenticate:async()=>({subject:'synthetic-owner',tenantId:'synthetic-tenant',product:'besoinavocat',active:true})});
  const denied=await owner.request('/api/intake',{headers:{Authorization:'Bearer synthetic-owner'}}); assert.equal(denied.status,405);
});

test('duplicate security headers are refused before any lead is written', async t => {
  const f=await fixture(t), bytes=Buffer.from(JSON.stringify(contact()));
  for(const duplicated of ['Origin','X-Requested-With','Idempotency-Key']) {
    const hs=['Host',new URL(f.base).host,'Content-Type','application/json','Content-Length',String(bytes.length),...Object.entries(headers()).flat(),duplicated,duplicated==='Origin'?WP:duplicated==='X-Requested-With'?'XMLHttpRequest':randomUUID()];
    const result=await new Promise((resolve,reject)=>{
      const req=http.request(f.base+'/api/intake',{method:'POST',headers:hs},res=>{let text='';res.setEncoding('utf8');res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,text}));});
      req.on('error',reject);req.end(bytes);
    });
    assert.equal(result.status,403,result.text);
  }
  assert.equal(inspect(f.file).length,0);
});

test('configuration rejects wildcard, HTTP, paths and duplicates; storage cannot reuse cases, blobs or a public root', async t => {
  for(const origins of ['*',JSON.stringify(['*']),JSON.stringify(['http://example.test']),JSON.stringify([WP+'/path']),JSON.stringify([WP,WP]),JSON.stringify(['https://user:pass@example.test'])]) {
    assert.equal(intakeConfiguration({BESOINAVOCAT_INTAKE_ALLOWED_ORIGINS:origins}),null);
  }
  const f=await fixture(t);
  const config={origins:[WP],dbPath:path.join(f.root,'cases.sqlite')};
  const refused=createIntake({config,excludedPaths:[config.dbPath]}); assert.equal(refused.configured,false); refused.clear();
  const unrelated=createIntake({config}); assert.equal(unrelated.configured,false); unrelated.clear();
  await mkdir(path.join(f.root,'public_html'));
  const publicDb=createIntake({config:{...config,dbPath:path.join(f.root,'public_html','leads.sqlite')}}); assert.equal(publicDb.configured,false); publicDb.clear();
  const blobDb=createIntake({config:{...config,dbPath:path.join(f.root,'blobs','leads.sqlite')},excludedDirs:[path.join(f.root,'blobs')]}); assert.equal(blobDb.configured,false); blobDb.clear();
  await writeFile(path.join(f.root,'not-database.bin'),'synthetic private key bytes');
  const bytesDb=createIntake({config:{...config,dbPath:path.join(f.root,'not-database.bin')}}); assert.equal(bytesDb.configured,false); bytesDb.clear();
  assert.equal(f.app.store.db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name LIKE 'ba_intake%'").get().n,0);
});

test('expiry clears only rate counters and never deletes stored interest requests', async t => {
  const f=await fixture(t); let time=Date.parse('2026-10-26T12:00:00Z');
  const service=createIntake({config:{origins:[WP],dbPath:f.file},now:()=>time});
  t.after(()=>service.clear());
  for(let i=0;i<3;i++) service.receive({...contact(),name:`Synthetic ${i}`},randomUUID(),WP);
  assert.throws(()=>service.receive(contact(),randomUUID(),WP),error=>error.status===429);
  time+=86_400_001;
  const result=service.receive(contact(),randomUUID(),WP); assert.equal(result.status,'received'); assert.equal(inspect(f.file).length,4);
  service.clear(); assert.throws(()=>service.receive(contact(),randomUUID(),WP),error=>error.status===503);
});

// Detailed client request: separate consent, bounded summary, disabled unless explicitly enabled.
const REQUEST = { BESOINAVOCAT_INTAKE_REQUEST_ENABLED: 'true' };
const day = offset => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const request = () => ({ name: 'Personne Synthétique', email: 'synthetic@example.test', role: 'client', language: 'fr',
  domain: 'housing', region: 'laval', contactPreference: 'email', stage: 'considering', objective: 'understand',
  summary: 'Situation synthétique de test : un avis reçu, sans document joint.', urgency: 'week',
  consent: true, consentVersion: '2026-10-27.1', website: '' });

test('detailed request stays closed by default and stores nothing, even with a valid body', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/catalog')).json.intake.request.enabled, false);
  const result = await f.post(request());
  assert.equal(result.status, 503); assert.equal(result.json.error.code, 'INTAKE_UNAVAILABLE');
  assert.doesNotMatch(result.text, /Situation synthétique|BA-|received/);
  assert.equal(inspect(f.file).length, 0);
  for (const value of ['1', 'TRUE', 'yes', ' true']) assert.equal(intakeConfiguration({ BESOINAVOCAT_INTAKE_ALLOWED_ORIGINS: JSON.stringify([WP]), BESOINAVOCAT_INTAKE_REQUEST_ENABLED: value }).requestEnabled, false);
});

test('enabled detailed request is received only after storage, with its own consent text and no case', async t => {
  const f = await fixture(t, REQUEST);
  const catalog = (await f.request('/api/catalog')).json;
  assert.equal(catalog.intake.request.enabled, true); assert.equal(catalog.intake.request.audience, 'client');
  assert.deepEqual([catalog.intake.request.summary.minLength, catalog.intake.request.summary.maxLength], [20, 1500]);
  for (const [group, size] of [['stages', 5], ['objectives', 5], ['urgencies', 5], ['contactPreferences', 2]]) {
    assert.equal(catalog.choices[group].length, size);
    for (const item of catalog.choices[group]) { assert.ok(item.label.fr); assert.ok(item.label.en); }
  }
  const body = { ...request(), summary: '  Première ligne.\r\nDeuxième ligne\tavec tabulation.  ', deadline: day(30), phone: '+1 514 555 0100', contactPreference: 'phone', language: 'en' };
  const result = await f.post(body);
  assert.equal(result.status, 201, result.text); assert.deepEqual(Object.keys(result.json).sort(), ['reference', 'status']);
  assert.doesNotMatch(result.text, /Première|synthetic@|555/);
  const [row] = inspect(f.file); const stored = JSON.parse(row.payloadJson);
  assert.equal(stored.summary, 'Première ligne.\nDeuxième ligne\tavec tabulation.');
  assert.equal(stored.deadline, body.deadline); assert.equal(stored.contactPreference, 'phone'); assert.equal(stored.website, undefined);
  assert.equal(stored.consentVersion, '2026-10-27.1'); assert.match(row.consentText, /summary of my situation/u);
  assert.equal(JSON.parse(row.priceJson).amountMinor, 0); assert.equal(row.catalogVersion, '2026-10-27.1');
  assert.equal(f.app.store.db.prepare('SELECT COUNT(*) AS n FROM cases').get().n, 0);
});

test('detailed request rejects lawyers, plans, files, unknown choices, unsafe or out-of-bounds summaries', async t => {
  const f = await fixture(t, REQUEST);
  // Validation matrix through the service: the HTTP per-client limit (20 / 15 min) is tested elsewhere.
  const service = createIntake({ config: { origins: [WP], dbPath: f.file, requestEnabled: true } });
  t.after(() => service.clear());
  const missing = request(); delete missing.summary;
  const noStage = request(); delete noStage.stage;
  for (const body of [missing, noStage, { ...request(), role: 'professional' }, { ...request(), periodicity: 'monthly' },
    { ...request(), file: 'base64' }, { ...request(), story: 'extra' }, { ...request(), tenantId: 'forged' },
    { ...request(), stage: 'invented' }, { ...request(), objective: 'win' }, { ...request(), urgency: 'yesterday' },
    { ...request(), contactPreference: 'fax' }, { ...request(), contactPreference: 'phone' },
    { ...request(), summary: 'x'.repeat(19) }, { ...request(), summary: '   ' + 'x'.repeat(15) + '   ' }, { ...request(), summary: 'x'.repeat(1501) },
    { ...request(), summary: 'Texte suffisamment long <script>alert(1)</script>' }, { ...request(), summary: 'Texte suffisamment long\u0000 avec nul' },
    { ...request(), summary: 42 }, { ...request(), website: 'https://spam.test' }, { ...contact(), summary: 'Un récit ne passe pas par le contrat de contact.' }]) {
    assert.throws(() => service.receive(body, randomUUID(), WP), error => error.status === 400 && error.code === 'INTAKE_INVALID_INPUT', JSON.stringify(body).slice(0, 120));
  }
  for (const delta of [{ consent: false }, { consent: 'true' }]) assert.throws(() => service.receive({ ...request(), ...delta }, randomUUID(), WP), error => error.code === 'INTAKE_CONSENT_REQUIRED');
  const unsafe = await f.post({ ...request(), summary: 'Texte suffisamment long <script>alert(1)</script>' });
  assert.equal(unsafe.status, 400); assert.doesNotMatch(unsafe.text, /alert\(1\)|received|BA-/);
  assert.equal(inspect(f.file).length, 0);
});

test('deadline must be a real calendar date from yesterday up to five years ahead', async t => {
  const f = await fixture(t); let time = Date.parse('2026-10-27T03:00:00Z');
  const service = createIntake({ config: { origins: [WP], dbPath: f.file, requestEnabled: true }, now: () => time });
  t.after(() => service.clear());
  for (const deadline of ['2026-10-26', '2026-10-27', '2031-10-31']) {
    assert.equal(service.receive({ ...request(), deadline, email: `ok-${deadline}@example.test` }, randomUUID(), WP).status, 'received');
  }
  for (const deadline of ['2026-10-25', '2031-11-01', '2026-02-30', '27/10/2026', '2026-10-27T00:00:00Z', '', null, 20261027]) {
    assert.throws(() => service.receive({ ...request(), deadline }, randomUUID(), WP), error => error.status === 400, String(deadline));
  }
  assert.equal(inspect(f.file).length, 3);
});

test('detailed request keeps idempotent retries and fits a full multibyte summary in the body limit', async t => {
  const f = await fixture(t, REQUEST), key = randomUUID(), h = headers(key);
  const body = { ...request(), summary: 'é'.repeat(1500) };
  const first = await f.post(body, { headers: h }), retry = await f.post(body, { headers: h });
  assert.equal(first.status, 201, first.text); assert.deepEqual(retry.json, first.json);
  const changed = await f.post({ ...body, summary: 'Autre résumé synthétique assez long.' }, { headers: h });
  assert.equal(changed.status, 409); assert.equal(inspect(f.file).length, 1);
  const oversized = await f.post({ ...request(), summary: '🙂'.repeat(3100) });
  assert.equal(oversized.status, 413);
  assert.equal(inspect(f.file).length, 1);
});
