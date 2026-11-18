import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { createApp } from '../server.mjs';

test('the portal is installable on every device: manifest, service worker, icons and offline page', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'besoinavocat-pwa-'));
  const app = createApp({ dbPath: join(directory, 'test.sqlite'), blobDir: join(directory, 'blobs'), env: {}, authenticate: async () => null });
  app.listen(0, '127.0.0.1'); await once(app, 'listening');
  t.after(async () => {
    await new Promise((done, fail) => app.close(error => error ? fail(error) : done()));
    assert.equal(dirname(directory), resolve(tmpdir())); assert.ok(basename(directory).startsWith('besoinavocat-pwa-'));
    await rm(directory, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${app.address().port}`;
  const manifestResponse = await fetch(`${base}/manifest.webmanifest`);
  assert.equal(manifestResponse.status, 200);
  assert.match(manifestResponse.headers.get('content-type'), /^application\/manifest\+json/u);
  const csp = manifestResponse.headers.get('content-security-policy');
  assert.match(csp, /manifest-src 'self'/u); assert.match(csp, /worker-src 'self'/u); assert.match(csp, /script-src 'self'/u);
  const manifest = await manifestResponse.json();
  assert.equal(manifest.display, 'standalone'); assert.equal(manifest.start_url, '/'); assert.equal(manifest.scope, '/');
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'));
  for (const icon of manifest.icons) {
    const response = await fetch(base + icon.src);
    assert.equal(response.status, 200, icon.src); assert.equal(response.headers.get('content-type'), 'image/png');
    const bytes = Buffer.from(await response.arrayBuffer());
    const [width, height] = [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
    assert.equal(`${width}x${height}`, icon.sizes);
  }
  for (const route of ['/sw.js', '/pwa.js', '/offline.html', '/icons/apple-touch-icon.png', '/icons/favicon-32.png']) {
    assert.equal((await fetch(base + route)).status, 200, route);
  }
  for (const route of ['/', '/avocat', '/demande']) {
    const html = await (await fetch(base + route)).text();
    assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest">/u, route);
    assert.match(html, /<script src="\/pwa\.js" defer><\/script>/u, route);
    assert.match(html, /rel="apple-touch-icon"/u, route);
  }
});

test('the service worker never stores private data: no /api/, no OAuth return, no non-GET, pages always from the network', async () => {
  const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert.match(source, /pathname\.startsWith\('\/api\/'\)/u);
  assert.match(source, /pathname\.startsWith\('\/integrations\/'\)/u);
  assert.match(source, /request\.method !== 'GET'/u);
  assert.match(source, /request\.mode === 'navigate'[\s\S]*fetch\(request\)\.catch/u);
  assert.doesNotMatch(source, /cache\.put\(request[^)]*\)\s*;?\s*\}\s*\)\s*;?\s*\n\s*if \(request\.mode/u);
});
