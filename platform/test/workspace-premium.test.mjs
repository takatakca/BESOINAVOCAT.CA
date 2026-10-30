// Workspace lot (D-029): files as tiles, quick upload queue, the call card and call requests, workspace saves bound to
// their case, and the Office files produced in the browser. Browser rendering is covered by the Chromium QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import vm from 'node:vm';
import { createApp } from '../server.mjs';

const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const workspaceSource = readFileSync(new URL('../public/workspace.js', import.meta.url), 'utf8');
const exported = ['state', 'start', 'render', 'documentsView', 'casesView', 'contactCard', 'openCall', 'submitCall', 'enqueueFiles', 'saveFromWorkspace', 'uploadsHtml', 'cleanName'];
assert.equal(source.split('  void start();').length, 2, 'The harness must replace exactly one bootstrap call.');

function harness(demo = false) {
  const nodes = new Map(), requests = [];
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {
      id, innerHTML: '', textContent: '', hidden: false, disabled: false, dataset: {}, open: false, isConnected: true,
      classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {}, removeAttribute() {}, addEventListener() {}, focus() {},
      close() { this.open = false; }, showModal() { this.open = true; }, querySelector() { return null; },
    });
    return nodes.get(id);
  };
  const h = { nodes, node, requests, handler: null };
  const context = vm.createContext({
    URL, URLSearchParams, Intl, Date, console, AbortSignal, crypto: { randomUUID }, btoa,
    window: { location: { search: demo ? '?demo=1' : '', hash: '' }, setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, 5)), clearTimeout },
    document: { getElementById: node, querySelectorAll: () => [], addEventListener() {} },
    FormData: class { constructor(form) { this.data = form.data; } get(key) { return this.data[key] ?? null; } },
    fetch: async (path, options) => {
      requests.push({ path, options, body: options?.body ? JSON.parse(options.body) : null });
      if (!h.handler) throw new Error('Unexpected HTTP request');
      return h.handler(path, options);
    },
  });
  vm.runInContext(source.replace('  void start();', `  globalThis.UI = { ${exported.join(',')} };`), context);
  h.ui = context.UI;
  h.main = () => node('main-content').innerHTML;
  return h;
}
const response = (data, status = 200) => ({ status, ok: status < 400, json: async () => data });
const file = (name, size, type = '', text = 'synthetic') => ({ name, size, type, arrayBuffer: async () => new TextEncoder().encode(text).buffer });
function fixture(h, { role = 'client', sessions = [] } = {}) {
  const item = { id: 'case-a', title: 'Dossier fictif A', reference: 'EXEMPLE', role };
  const documents = [
    { id: 'doc-photo', name: 'entree.jpg', mimeType: 'image/jpeg', bytes: 1200, sourceType: 'original', reviewStatus: 'a_verifier', versionNumber: 1, createdAt: '2026-10-29T10:00:00Z' },
    { id: 'doc-video', name: 'Message vidéo — essai.webm', mimeType: 'video/webm', bytes: 9000, sourceType: 'declaration', reviewStatus: 'a_verifier', versionNumber: 1, createdAt: '2026-10-29T11:00:00Z' },
    { id: 'doc-word', name: 'chronologie.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', bytes: 7000, sourceType: 'declaration', reviewStatus: 'a_verifier', versionNumber: 2, createdAt: '2026-10-29T12:00:00Z' },
  ];
  const detail = () => ({ case: item, documents, messages: [], timeEntries: [], communications: { sessions, hasMore: false }, usage: { entries: [], hasMore: false, billingEnabled: false } });
  Object.assign(h.ui.state, { mode: 'authenticated', demo: false, user: { active: true, subject: 'client-a' }, selectedId: item.id, cases: [item], detail: detail(), view: 'documents', caseLoading: false, busy: false, capabilities: { maxDocumentBytes: 1024 } });
  return { item, detail };
}

test('files render as tiles with quick actions, a drop zone, the call card and the case videos; the list stays available', () => {
  const h = harness();
  fixture(h);
  h.ui.render();
  const html = h.main();
  assert.equal((html.match(/class="file-tile"/gu) || []).length, 3);
  assert.match(html, /data-thumb="doc-photo"/u);
  assert.match(html, /data-action="annotate" data-id="doc-photo"/u);
  assert.match(html, /data-action="edit-doc" data-id="doc-word"/u);
  assert.match(html, /id="drop-input"[^>]*multiple/u);
  assert.match(html, /data-dropzone/u);
  assert.match(html, /Appeler mon avocat/u);
  assert.match(html, /class="button call" data-action="call-lawyer"/u);
  assert.match(html, /class="media-item" data-action="open-file" data-id="doc-video"/u);
  assert.ok(!/class="media-item"[^>]*data-id="doc-photo"/u.test(html), 'only videos and voice messages are listed under the call card');
  assert.match(html, /aria-pressed="true">[^<]*<svg[\s\S]*?Tuiles/u);
  h.ui.state.docLayout = 'list'; h.ui.render();
  assert.match(h.main(), /<table>/u);
  assert.match(h.main(), /data-action="open-file" data-id="doc-word"/u);
  assert.equal(h.requests.length, 0);
});

test('a lawyer sees the client side of the call card; a planned Zoom meeting becomes the call', () => {
  const h = harness();
  const scheduledAt = new Date(Date.now() + 3600 * 1000).toISOString();
  fixture(h, { role: 'lawyer', sessions: [{ id: 's1', kind: 'video', title: 'Rencontre fictive', scheduledAt, status: 'scheduled', joinUrl: 'https://us06web.zoom.us/j/81234567890?pwd=Exemple1', ownTimer: null }] });
  h.ui.render();
  assert.match(h.main(), /Joindre la personne cliente/u);
  assert.match(h.main(), /Rejoindre la réunion Zoom prévue/u);
  h.ui.openCall();
  const dialog = h.node('dialog-content').innerHTML;
  assert.match(dialog, /href="https:\/\/us06web\.zoom\.us\/j\/81234567890\?pwd=Exemple1"/u);
  assert.match(dialog, /rel="noopener noreferrer"/u);
  assert.match(dialog, /id="call-form"/u);
});

test('a call request is a case message with the chosen moment; a malformed number is refused without any request', async () => {
  const h = harness();
  const { detail } = fixture(h);
  h.handler = async (path, options) => response(path.endsWith('/messages') ? { message: { id: 'm1' } } : detail(), path.endsWith('/messages') ? 201 : 200);
  const form = data => ({ id: 'call-form', isConnected: true, data, button: h.node('call-submit'), error: h.node('call-error'), querySelector(selector) { return selector === '[type="submit"]' ? this.button : this.error; } });
  await h.ui.submitCall(form({ when: 'En soirée', phone: '<script>', topic: '' }));
  assert.equal(h.requests.length, 0);
  assert.equal(h.node('call-error').hidden, false);
  await h.ui.submitCall(form({ when: 'En soirée', phone: '+1 514 555-0100 poste 12', topic: 'la lettre reçue hier' }));
  const posted = h.requests.find(item => item.path.endsWith('/messages'));
  assert.equal(posted.options.method, 'POST');
  assert.equal(posted.options.headers['X-Requested-With'], 'XMLHttpRequest');
  assert.equal(posted.body.body, 'Demande d’appel — moment souhaité : En soirée · numéro : +1 514 555-0100 poste 12 · sujet : la lettre reçue hier');
  assert.ok(h.requests.at(-1).path.endsWith('/api/cases/case-a'), 'the case is refreshed after the request');
});

test('the preview shows the call card and opens the call window, but sends nothing', async () => {
  const h = harness(true);
  await h.ui.start();
  h.ui.state.view = 'documents'; h.ui.render();
  assert.match(h.main(), /data-action="call-lawyer">/u, 'the call button stays clickable in the preview');
  assert.ok(!h.main().includes('id="drop-input"'), 'no drop zone in the read-only preview');
  h.ui.openCall();
  assert.match(h.node('dialog-content').innerHTML, /Aperçu : aucune demande n’est envoyée/u);
  await h.ui.submitCall({ id: 'call-form', isConnected: true, data: { when: 'Demain' }, querySelector: () => h.node('x') });
  h.ui.enqueueFiles([file('photo.jpg', 10, 'image/jpeg')]);
  await assert.rejects(h.ui.saveFromWorkspace({}, { caseId: 'demo-preparation', name: 'x.png', mimeType: 'image/png', sourceType: 'analyse' }));
  assert.equal(h.requests.length, 0);
});

test('quick uploads go one at a time, retry when the server is busy, keep honest provenance and refresh the case once', async () => {
  const h = harness();
  const { detail } = fixture(h);
  let active = 0, maxActive = 0, busyOnce = true;
  h.handler = async (path, options) => {
    if (path.endsWith('/documents') && options.method === 'POST') {
      active += 1; maxActive = Math.max(maxActive, active);
      await new Promise(resolve => setTimeout(resolve, 3));
      active -= 1;
      if (busyOnce) { busyOnce = false; return response({ error: { message: 'Un fichier est déjà en cours de traitement.' } }, 429); }
      return response({ document: { id: randomUUID() } }, 201);
    }
    return response(detail());
  };
  h.ui.enqueueFiles([file('rapport: final?.pdf', 10, 'application/pdf'), file('vide.txt', 0), file('enorme.mp4', 5000, 'video/mp4'), file('photo.JPG', 12, '')]);
  assert.match(h.ui.uploadsHtml(), /Fichier vide/u);
  assert.match(h.ui.uploadsHtml(), /Fichier trop volumineux/u);
  await new Promise(resolve => setTimeout(resolve, 120));
  const posts = h.requests.filter(item => item.path.endsWith('/documents'));
  assert.equal(maxActive, 1, 'never two uploads at the same time');
  assert.equal(posts.length, 3, 'two files, one of them retried after 429');
  assert.deepEqual(posts.map(item => item.body.name), ['rapport final.pdf', 'rapport final.pdf', 'photo.JPG']);
  assert.deepEqual(posts.map(item => item.body.mimeType), ['application/pdf', 'application/pdf', 'image/jpeg']);
  for (const post of posts) {
    assert.equal(post.body.sourceType, 'original');
    assert.equal(post.body.reviewStatus, 'a_verifier');
    assert.match(post.body.sourceReference, /provenance à préciser/u);
    assert.equal(post.body.contentBase64, btoa('synthetic'));
  }
  assert.equal(h.requests.filter(item => item.path === '/api/cases/case-a').length, 1, 'one refresh after the batch');
  assert.match(h.ui.uploadsHtml(), /upload-item done/u);
});

test('a file made in the workspace is saved only to the case it was opened from', async () => {
  const h = harness();
  const { detail } = fixture(h);
  h.handler = async (path, options) => (options?.method === 'POST' ? response({ document: { id: 'new-doc', versionNumber: 3 } }, 201) : response(detail()));
  await assert.rejects(h.ui.saveFromWorkspace(file('x', 4), { caseId: 'other-case', name: 'Dessin.png', mimeType: 'image/png', sourceType: 'analyse' }), /dossier concerné/u);
  assert.equal(h.requests.length, 0);
  const created = await h.ui.saveFromWorkspace(file('x', 4), { caseId: 'case-a', name: 'Chronologie: v2.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sourceType: 'declaration', versionOf: 'doc-word', extractedText: 'Texte', sourceReference: 'Rédigé dans le portail.' });
  assert.equal(created.id, 'new-doc');
  const post = h.requests.find(item => item.options?.method === 'POST');
  assert.equal(post.body.name, 'Chronologie v2.docx');
  assert.equal(post.body.versionOf, 'doc-word');
  assert.equal(post.body.extractedText, 'Texte');
  assert.equal(post.body.reviewStatus, 'a_verifier');
});

function loadWorkspace() {
  const context = vm.createContext({ window: {}, TextEncoder, TextDecoder, Blob, Response, DecompressionStream, URL });
  vm.runInContext(workspaceSource, context);
  return context.window.BAWorkspace.internals;
}
function python(script, args) {
  const result = spawnSync('python3', ['-I', '-c', script, ...args], { encoding: 'utf8' });
  return result.error ? null : result;
}
const CHECK_ZIP = `
import sys, zipfile, xml.dom.minidom
z = zipfile.ZipFile(sys.argv[1])
assert z.testzip() is None
for name in z.namelist():
    if name.endswith('.xml') or name.endswith('.rels'):
        xml.dom.minidom.parseString(z.read(name))
print('\\n'.join(z.namelist()))
`;

test('documents and presentations made in the browser are valid Office packages', async t => {
  const W = loadWorkspace();
  assert.equal(W.crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  assert.equal(W.safeName('Rapport: "final" / v2?.', 'docx'), 'Rapport final v2.docx');
  assert.equal(W.safeName('...', 'pptx'), 'Document.pptx');
  const blocks = [
    { type: 'h1', runs: [{ text: 'Chronologie & faits <essai>' }] },
    { type: 'p', runs: [{ text: 'Le 12 mars, ' }, { text: 'j’étais', b: true }, { text: ' ici.', i: true, u: true }] },
    { type: 'li', list: 'number', listId: '1', runs: [{ text: 'Premier' }] },
    { type: 'li', list: 'number', listId: '2', runs: [{ text: 'Autre liste' }] },
    { type: 'li', list: 'bullet', listId: '3', runs: [{ text: 'Puce\nsuite' }] },
  ];
  const docx = W.docxFromBlocks(blocks, { title: 'Essai' });
  const entries = await W.unzip(docx);
  const documentXml = new TextDecoder().decode(entries.get('word/document.xml'));
  assert.match(documentXml, /<w:pStyle w:val="Heading1"\/>/u);
  assert.match(documentXml, /Chronologie &amp; faits &lt;essai&gt;/u);
  assert.match(documentXml, /<w:rPr><w:b\/><\/w:rPr><w:t xml:space="preserve">j’étais/u);
  assert.match(documentXml, /<w:rPr><w:i\/><w:u w:val="single"\/><\/w:rPr>/u);
  assert.match(documentXml, /<w:t xml:space="preserve">Puce<\/w:t><w:br\/><w:t xml:space="preserve">suite/u);
  const numbering = new TextDecoder().decode(entries.get('word/numbering.xml'));
  assert.equal((numbering.match(/<w:startOverride w:val="1"\/>/gu) || []).length, 2, 'each numbered list restarts at 1');
  assert.equal(W.blocksText(blocks), 'Chronologie & faits <essai>\nLe 12 mars, j’étais ici.\nPremier\nAutre liste\nPuce\nsuite');
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);
  const pptx = W.pptxFromSlides([{ title: 'Annotation', caption: ['1 — J’étais ici'], image: { data: jpeg, ext: 'jpeg', width: 1600, height: 1000 } }, { title: 'Sans image', caption: [] }], { title: 'Présentation & essai' });
  const slides = await W.unzip(pptx);
  assert.ok(slides.has('ppt/media/image1.jpeg'));
  assert.deepEqual([...slides.get('ppt/media/image1.jpeg')], [...jpeg]);
  const presentation = new TextDecoder().decode(slides.get('ppt/presentation.xml'));
  assert.equal((presentation.match(/<p:sldId /gu) || []).length, 3, 'a cover slide plus one slide per entry');
  const dir = mkdtempSync(join(tmpdir(), 'ba-office-'));
  t.after(() => { assert.ok(basename(dir).startsWith('ba-office-')); rmSync(dir, { recursive: true, force: true }); });
  writeFileSync(join(dir, 'a.docx'), docx); writeFileSync(join(dir, 'a.pptx'), pptx);
  const checked = python(CHECK_ZIP, [join(dir, 'a.docx')]);
  if (!checked) { t.diagnostic('python3 unavailable: ZIP and XML parsed by the module only'); return; }
  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout, /^\[Content_Types\]\.xml$/mu);
  const checkedSlides = python(CHECK_ZIP, [join(dir, 'a.pptx')]);
  assert.equal(checkedSlides.status, 0, checkedSlides.stderr);
  assert.match(checkedSlides.stdout, /^ppt\/slides\/slide3\.xml$/mu);
});

test('the portal page loads the workspace tools before app.js, with the mobile shell and no inline script', async t => {
  const index = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.ok(index.indexOf('./dictation.js') < index.indexOf('./workspace.js') && index.indexOf('./workspace.js') < index.indexOf('./app.js'));
  assert.match(index, /id="menu-button"[^>]*aria-controls="workspace-nav"/u);
  assert.match(index, /class="tabbar"[\s\S]*data-view="documents"[\s\S]*id="tabbar-more"/u);
  assert.match(index, /id="drawer-scrim"/u);
  assert.ok(!/<script>(?!<\/script>)|style="/u.test(index), 'no inline script or style attribute');
  assert.ok(!/localStorage|sessionStorage|fetch\(/u.test(workspaceSource), 'the tools keep nothing in browser storage and never call the network themselves');
  const dir = mkdtempSync(join(tmpdir(), 'ba-workspace-static-'));
  const app = createApp({ dbPath: join(dir, 'db.sqlite'), blobDir: join(dir, 'blobs'), env: {}, authenticate: async () => null });
  app.listen(0, '127.0.0.1');
  await new Promise(resolve => app.once('listening', resolve));
  t.after(async () => { await new Promise(resolve => app.close(resolve)); assert.ok(basename(dir).startsWith('ba-workspace-static-')); rmSync(dir, { recursive: true, force: true }); });
  const served = await fetch(`http://127.0.0.1:${app.address().port}/workspace.js`);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get('content-type'), 'text/javascript; charset=utf-8');
  assert.match(served.headers.get('content-security-policy'), /script-src 'self';/u);
  assert.equal(await served.text(), workspaceSource);
});
