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

test('Google Play app: /.well-known/assetlinks.json is served only once a valid signing fingerprint is configured', async t => {
  const { androidAssetLinks } = await import('../server.mjs');
  const fingerprint = Array.from({ length: 32 }, (_, i) => i.toString(16).padStart(2, '0').toUpperCase()).join(':');
  assert.equal(androidAssetLinks({}), null);
  assert.equal(androidAssetLinks({ BESOINAVOCAT_ANDROID_CERT_SHA256: 'not-a-fingerprint' }), null);
  assert.equal(androidAssetLinks({ BESOINAVOCAT_ANDROID_CERT_SHA256: fingerprint, BESOINAVOCAT_ANDROID_PACKAGE: 'Bad Package' }), null);
  const links = androidAssetLinks({ BESOINAVOCAT_ANDROID_CERT_SHA256: fingerprint.toLowerCase() });
  assert.deepEqual(links[0].target, { namespace: 'android_app', package_name: 'ca.besoinavocat.portail', sha256_cert_fingerprints: [fingerprint] });
  for (const [env, status] of [[{}, 404], [{ BESOINAVOCAT_ANDROID_CERT_SHA256: fingerprint }, 200]]) {
    const directory = await mkdtemp(join(tmpdir(), 'besoinavocat-pwa-'));
    const app = createApp({ dbPath: join(directory, 'test.sqlite'), blobDir: join(directory, 'blobs'), env, authenticate: async () => null });
    app.listen(0, '127.0.0.1'); await once(app, 'listening');
    const response = await fetch(`http://127.0.0.1:${app.address().port}/.well-known/assetlinks.json`);
    assert.equal(response.status, status);
    if (status === 200) assert.equal((await response.json())[0].target.sha256_cert_fingerprints[0], fingerprint);
    await new Promise((done, fail) => app.close(error => error ? fail(error) : done()));
    await rm(directory, { recursive: true, force: true });
  }
});

test('store screenshots listed in the manifest are served with their declared size', async t => {
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
  assert.ok(manifest.screenshots.some(s => s.form_factor === 'wide') && manifest.screenshots.some(s => s.form_factor === 'narrow'));
  const directory = await mkdtemp(join(tmpdir(), 'besoinavocat-pwa-'));
  const app = createApp({ dbPath: join(directory, 'test.sqlite'), blobDir: join(directory, 'blobs'), env: {}, authenticate: async () => null });
  app.listen(0, '127.0.0.1'); await once(app, 'listening');
  t.after(async () => { await new Promise((done, fail) => app.close(error => error ? fail(error) : done())); await rm(directory, { recursive: true, force: true }); });
  for (const shot of manifest.screenshots) {
    const response = await fetch(`http://127.0.0.1:${app.address().port}${shot.src}`);
    assert.equal(response.status, 200, shot.src);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, shot.sizes);
  }
});

test('pwa.js offers TV remote navigation only on TVs or with ?tv=1', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../public/pwa.js', import.meta.url), 'utf8');
  assert.match(source, /Tizen/u); assert.match(source, /Web0S/u); assert.match(source, /AFT/u);
  assert.match(source, /10009/u); assert.match(source, /461/u);
  assert.match(source, /classList\.add\('tv-mode'\)/u);
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.tv-mode/u);
});
