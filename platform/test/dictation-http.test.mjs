import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { createApp } from '../server.mjs';

test('only portal documents allow same-origin microphone and the dictation asset is served under CSP', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'besoinavocat-dictation-'));
  const app = createApp({ dbPath: join(directory, 'test.sqlite'), blobDir: join(directory, 'blobs'), env: {}, authenticate: async () => null });
  app.listen(0, '127.0.0.1'); await once(app, 'listening');
  t.after(async () => {
    await new Promise((resolve, reject) => app.close(error => error ? reject(error) : resolve()));
    assert.equal(dirname(directory), resolve(tmpdir())); assert.ok(basename(directory).startsWith('besoinavocat-dictation-'));
    await rm(directory, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${app.address().port}`;
  for (const route of ['/', '/index.html', '/?demo=1']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('permissions-policy'), 'camera=(self), microphone=(self), geolocation=()');
    assert.ok(response.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
    const html = await response.text();
    assert.ok(html.indexOf('dictation.js') >= 0 && html.indexOf('dictation.js') < html.indexOf('app.js'));
  }
  for (const route of ['/demande', '/api/health', '/not-found']) {
    const response = await fetch(base + route);
    assert.equal(response.headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()');
  }
  const script = await fetch(base + '/dictation.js'); assert.equal(script.status, 200);
  assert.ok(script.headers.get('content-type').startsWith('text/javascript'));
  assert.ok((await script.text()).includes('BesoinAvocatDictation'));
  assert.equal((await fetch(base + '/api/search?q=facture')).status, 401);
});
