import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';
import { parseCitation } from '../lib/canlii.mjs';

const users = {
  lawyer: { subject: 'lawyer-1', tenantId: 'tenant-a', product: 'besoinavocat', active: true },
  client: { subject: 'client-1', tenantId: 'tenant-a', product: 'besoinavocat', active: true },
};

test('neutral citations and canlii.org addresses map to CanLII database and case ids', () => {
  assert.deepEqual(parseCitation('2020 QCCS 1234'), { lang: 'fr', databaseId: 'qccs', caseId: '2020qccs1234' });
  assert.deepEqual(parseCitation('2019 CSC 65'), { lang: 'fr', databaseId: 'csc-scc', caseId: '2019scc65' });
  assert.deepEqual(parseCitation('2019 SCC 65', 'en'), { lang: 'en', databaseId: 'csc-scc', caseId: '2019scc65' });
  assert.deepEqual(parseCitation('2021 CF 12'), { lang: 'fr', databaseId: 'fct', caseId: '2021fc12' });
  assert.deepEqual(parseCitation('https://www.canlii.org/fr/qc/qcca/doc/2018/2018qcca1700/2018qcca1700.html'), { lang: 'fr', databaseId: 'qcca', caseId: '2018qcca1700' });
  for (const bad of ['', 'Tremblay c. Gagnon', '1850 QCCS 1', 'https://evil.test/fr/qc/qccs/doc/2020/2020qccs1/x.html', 'http://www.canlii.org/fr/qc/qccs/doc/2020/2020qccs1/x.html']) assert.equal(parseCitation(bad), null, bad);
});

test('a lawyer checks a cited decision; the key never reaches the browser and answers are cached', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'besoinavocat-canlii-test-'));
  const calls = [];
  const researchFetch = async url => {
    const u = new URL(url);
    calls.push(u);
    assert.equal(u.searchParams.get('api_key'), 'canlii-synthetic-key');
    if (u.pathname === '/v1/caseBrowse/fr/qccs/2020qccs1234/') return Response.json({ databaseId: 'qccs', caseId: { fr: '2020qccs1234' }, url: 'https://www.canlii.org/fr/qc/qccs/doc/2020/2020qccs1234/2020qccs1234.html',
      title: 'Tremblay c. Gagnon', citation: '2020 QCCS 1234 (CanLII)', language: 'fr', docketNumber: '500-17-000000-201', decisionDate: '2020-04-20', keywords: 'bail — résiliation' });
    if (u.pathname === '/v1/caseCitator/fr/qccs/2020qccs1234/citingCases') return Response.json({ citingCases: [{ title: 'Roy c. Côté', citation: '2022 QCCA 9 (CanLII)' }, { title: 'X c. Y', citation: '2023 QCCQ 5 (CanLII)' }] });
    return new Response('[{"error":"NOT_FOUND"}]', { status: 404 });
  };
  const app = createApp({ dbPath: path.join(directory, 'db.sqlite'), blobDir: path.join(directory, 'blobs'), researchFetch,
    env: { APP_ORIGIN: 'https://portail.example.test', BESOINAVOCAT_CANLII_API_KEY: 'canlii-synthetic-key' }, authenticate: async token => users[token] ?? null });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  t.after(async () => { await new Promise(r => app.close(r)); await rm(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${app.address().port}`;
  const get = async (route, token = 'lawyer') => { const r = await fetch(base + route, { headers: { Authorization: `Bearer ${token}` } }); const text = await r.text(); return { status: r.status, text, json: JSON.parse(text) }; };
  const created = await fetch(`${base}/api/cases`, { method: 'POST', headers: { Authorization: 'Bearer client', 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Synthetic', reference: 'SYN' }) }).then(r => r.json());
  app.store.provisionMembership({ tenantId: 'tenant-a', caseId: created.case.id, subject: 'lawyer-1', role: 'lawyer' });

  assert.equal((await get('/api/capabilities')).json.canlii, true);
  assert.equal((await get('/api/research/canlii?citation=2020%20QCCS%201234', 'client')).status, 403);
  assert.equal((await get('/api/research/canlii?citation=Tremblay')).status, 400);
  const found = await get('/api/research/canlii?citation=2020%20QCCS%201234');
  assert.equal(found.status, 200, found.text);
  assert.equal(found.json.decision.title, 'Tremblay c. Gagnon');
  assert.equal(found.json.decision.decisionDate, '2020-04-20');
  assert.equal(found.json.citing.count, 2);
  assert.ok(!found.text.includes('canlii-synthetic-key'));
  const again = await get('/api/research/canlii?citation=2020%20QCCS%201234');
  assert.equal(again.json.cached, true);
  assert.equal(calls.filter(u => u.pathname.startsWith('/v1/caseBrowse')).length, 1);
  const missing = await get('/api/research/canlii?citation=2020%20QCCS%209999');
  assert.deepEqual([missing.status, missing.json.found], [200, false]);
});
