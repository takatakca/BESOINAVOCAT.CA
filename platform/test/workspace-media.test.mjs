// Server side of the workspace media: recorded videos are accepted as case documents, HTML stays refused, and the
// portal page may use the camera and play local object URLs without loosening the script policy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { createApp } from '../server.mjs';

test('video and voice messages are case documents; HTML is still refused; the portal page may record and play local media', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'ba-workspace-media-'));
  const app = createApp({ dbPath: join(dir, 'db.sqlite'), blobDir: join(dir, 'blobs'), env: {},
    authenticate: async token => (token === 'client' ? { subject: 'client', tenantId: 't', product: 'besoinavocat', active: true } : null) });
  app.listen(0, '127.0.0.1');
  await new Promise(resolve => app.once('listening', resolve));
  t.after(async () => { await new Promise(resolve => app.close(resolve)); assert.ok(basename(dir).startsWith('ba-workspace-media-')); rmSync(dir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${app.address().port}`;
  const post = (path, body) => fetch(base + path, { method: 'POST', headers: { Authorization: 'Bearer client', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const created = await (await post('/api/cases', { title: 'Synthetic', reference: 'SYNTHETIC' })).json();
  const upload = (name, mimeType) => post(`/api/cases/${created.case.id}/documents`, { name, mimeType, contentBase64: Buffer.from('synthetic media bytes').toString('base64'), sourceType: 'declaration', reviewStatus: 'a_verifier', sourceReference: 'Message vidéo enregistré dans le portail' });
  for (const [name, type] of [['message.webm', 'video/webm'], ['message.mp4', 'video/mp4'], ['note.webm', 'audio/webm'], ['note.m4a', 'audio/mp4'], ['note.mp3', 'audio/mpeg']]) {
    const response = await upload(name, type);
    assert.equal(response.status, 201, `${type} accepted`);
  }
  assert.equal((await upload('page.html', 'text/html')).status, 400);
  assert.equal((await upload('image.svg', 'image/svg+xml')).status, 400);
  const portal = await fetch(`${base}/`);
  const csp = portal.headers.get('content-security-policy');
  assert.match(csp, /media-src 'self' blob:/u);
  assert.match(csp, /frame-src blob:/u);
  assert.match(csp, /script-src 'self';/u);
  assert.ok(!csp.includes('unsafe-inline') && !csp.includes('unsafe-eval'));
  assert.equal(portal.headers.get('permissions-policy'), 'camera=(self), microphone=(self), geolocation=()');
  assert.equal((await fetch(`${base}/demande`)).headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()');
});
