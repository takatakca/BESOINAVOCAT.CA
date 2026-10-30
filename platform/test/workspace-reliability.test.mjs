import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/workspace.js', import.meta.url), 'utf8');
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

// Small DOM double: the actual workspace handlers run unchanged, including their asynchronous lifecycles.
function browser() {
  let activeElement = null;
  class Node {
    constructor(tag = '#text', text = '') {
      this.tagName = tag.toUpperCase(); this.nodeType = tag === '#text' ? 3 : tag === '#fragment' ? 11 : 1;
      this.nodeValue = text; this.childNodes = []; this.attrs = {}; this.dataset = {}; this.listeners = {};
      this.style = {}; this.disabled = false; this.hidden = false; this.value = ''; this.checked = false;
      const classes = new Set();
      this.classList = { add: (...v) => v.forEach(x => classes.add(x)), remove: (...v) => v.forEach(x => classes.delete(x)), toggle: (v, on) => { if (on === undefined) on = !classes.has(v); on ? classes.add(v) : classes.delete(v); }, contains: v => classes.has(v) };
    }
    get children() { return this.childNodes.filter(n => n.nodeType === 1); }
    get lastChild() { return this.childNodes.at(-1); }
    get isConnected() { return this === body || Boolean(this.parentNode?.isConnected); }
    get textContent() { return this.nodeType === 3 ? this.nodeValue : this.childNodes.map(n => n.textContent).join(''); }
    set textContent(text) { this.replaceChildren(new Node('#text', String(text))); }
    get innerText() { return this.textContent; }
    set innerHTML(html) { this.textContent = html.replace(/<[^>]*>/gu, ''); }
    setAttribute(k, value) { this.attrs[k] = String(value); if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-([a-z])/gu, (_, c) => c.toUpperCase())] = String(value); if (k === 'disabled') this.disabled = true; if (k === 'hidden') this.hidden = true; if (k === 'value') this.value = String(value); }
    getAttribute(k) { return this.attrs[k] ?? null; }
    removeAttribute(k) { delete this.attrs[k]; if (k === 'disabled') this.disabled = false; }
    append(...items) { for (let n of items) { if (typeof n === 'string') n = new Node('#text', n); if (n.nodeType === 11) { this.append(...n.childNodes); continue; } n.parentNode = this; this.childNodes.push(n); } }
    replaceChildren(...nodes) { for (const n of this.childNodes) n.parentNode = null; this.childNodes = []; this.append(...nodes); }
    remove() { if (this.parentNode) this.parentNode.childNodes = this.parentNode.childNodes.filter(n => n !== this); this.parentNode = null; }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    async fire(type, event = {}) { for (const fn of this.listeners[type] || []) await fn({ target: this, preventDefault() {}, ...event }); }
    focus() { activeElement = this; }
    querySelectorAll(selector) {
      const match = node => selector.startsWith('.') ? node.className?.split(' ').includes(selector.slice(1)) : selector.startsWith('#') ? node.attrs.id === selector.slice(1) : selector.startsWith('[') ? node.getAttribute(selector.slice(1, -1).split('=')[0]) !== null : node.tagName === selector.toUpperCase();
      return this.children.flatMap(n => [...(match(n) ? [n] : []), ...n.querySelectorAll(selector)]);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  }
  const body = new Node('body');
  const document = { body, get activeElement() { return activeElement; }, createElement: tag => new Node(tag), createDocumentFragment: () => new Node('#fragment'), createTextNode: text => new Node('#text', text), getElementById: id => body.querySelector(`#${id}`), addEventListener() {}, querySelectorAll: selector => body.querySelectorAll(selector), execCommand() {}, queryCommandState: () => false, queryCommandValue: () => 'p' };
  const media = deferred(), download = deferred(), saves = [], notifications = [], h = { saveHandler: null };
  class Recorder {
    static isTypeSupported() { return true; }
    constructor() { this.mimeType = 'video/webm'; this.state = 'inactive'; this.handlers = {}; }
    addEventListener(type, fn) { this.handlers[type] = fn; }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; this.handlers.dataavailable?.({ data: new Blob(['synthetic recording']) }); this.handlers.stop?.(); }
  }
  const context = vm.createContext({ window: { MediaRecorder: Recorder, matchMedia: () => ({ matches: false }), confirm: () => true, setTimeout, clearTimeout, setInterval, clearInterval }, MediaRecorder: Recorder, document, navigator: { mediaDevices: { getUserMedia: () => media.promise } }, TextEncoder, TextDecoder, Blob, Response, DecompressionStream, URL, console });
  vm.runInContext(source, context);
  const api = context.window.BAWorkspace;
  api.init({ icon: () => '', esc: s => s, caseId: () => 'case-a', canSave: () => true, isDemo: () => false, sourceLabel: () => 'Déclaration', bytes: () => '10 octets', fetchBlob: () => download.promise, save: (...args) => { saves.push(args); return h.saveHandler ? h.saveHandler(...args) : Promise.resolve({ id: 'saved', versionNumber: 2 }); }, notify: (...args) => notifications.push(args) });
  const button = text => body.querySelectorAll('button').find(n => n.textContent === text);
  return Object.assign(h, { api, body, media, download, saves, button, document });
}

test('a late camera permission after replacing the recorder stops its tracks', async () => {
  const h = browser(); let stopped = 0;
  h.api.recordVideo();
  const permission = h.button('Activer la caméra et le micro').fire('click');
  h.api.closeDock(true);
  await h.api.openEditor();
  h.media.resolve({ getTracks: () => [{ stop: () => { stopped += 1; } }] });
  await permission;
  assert.equal(stopped, 1, 'the closed recorder must not retain a camera or microphone stream');
  assert.equal(h.body.querySelector('[data-kind]').dataset.kind, 'editor');
});

test('normal camera acquisition remains active until its own recorder closes', async () => {
  const h = browser(); let stopped = 0;
  h.api.recordVideo();
  const permission = h.button('Activer la caméra et le micro').fire('click');
  h.media.resolve({ getTracks: () => [{ stop: () => { stopped += 1; } }] });
  await permission;
  assert.equal(stopped, 0);
  h.api.closeDock(true);
  assert.equal(stopped, 1);
});

const textDoc = { id: 'doc-a', name: 'Notes.txt', mimeType: 'text/plain' };
test('source editor stays locked until the original text has loaded, then edits and saves normally', async () => {
  const h = browser();
  const opening = h.api.openEditor(textDoc);
  const page = h.body.querySelector('.doc-page'), save = h.button('Enregistrer dans le dossier'), download = h.button('Télécharger .docx');
  assert.equal(page.getAttribute('contenteditable'), 'false');
  assert.equal(save.disabled, true);
  assert.equal(download.disabled, true);
  await save.fire('click'); // Defend the handler as well as the disabled DOM control.
  assert.equal(h.saves.length, 0);
  h.download.resolve(new Blob(['Original intact'], { type: 'text/plain' }));
  await opening;
  assert.equal(page.textContent, 'Original intact');
  assert.equal(page.getAttribute('contenteditable'), 'true');
  assert.equal(save.disabled, false);
  assert.equal(download.disabled, false);
  page.textContent = 'Version modifiée'; await page.fire('input');
  await save.fire('click');
  assert.equal(h.saves.length, 1);
  assert.equal(h.saves[0][1].extractedText, 'Version modifiée');
  assert.equal(h.saves[0][1].versionOf, 'doc-a');
});

test('failed source load cannot produce a replacement and does not unlock the editor', async () => {
  const h = browser(); const opening = h.api.openEditor(textDoc);
  h.download.reject(new Error('Lecture impossible'));
  await opening;
  assert.match(h.body.querySelector('.doc-status').textContent, /Lecture impossible/u);
  assert.equal(h.body.querySelector('.doc-page').getAttribute('contenteditable'), 'false');
  assert.equal(h.button('Enregistrer dans le dossier').disabled, true);
  assert.equal(h.button('Télécharger .docx').disabled, true);
  await h.button('Enregistrer dans le dossier').fire('click');
  assert.equal(h.saves.length, 0);
});

test('late loading of a closed editor cannot steal focus from the replacement', async () => {
  const h = browser(); const opening = h.api.openEditor(textDoc);
  h.api.closeDock(true); await h.api.openEditor();
  const active = h.document.activeElement;
  h.download.resolve(new Blob(['Ancien document'])); await opening;
  assert.equal(h.document.activeElement, active);
  assert.equal(h.body.querySelector('.doc-page').textContent, '');
});

test('editor locks during saving and unlocks without losing its text on success or failure', async () => {
  for (const success of [true, false]) {
    const h = browser(), saved = deferred(); h.saveHandler = () => saved.promise;
    await h.api.openEditor();
    const page = h.body.querySelector('.doc-page'), title = h.body.querySelector('.doc-title');
    page.textContent = 'Texte à conserver'; await page.fire('input');
    const saving = h.button('Enregistrer dans le dossier').fire('click');
    assert.equal(page.getAttribute('contenteditable'), 'false');
    assert.equal(title.disabled, true);
    assert.equal(h.button('Télécharger .docx').disabled, true);
    await h.button('Enregistrer dans le dossier').fire('click');
    assert.equal(h.saves.length, 1, 'a pending save cannot be submitted twice');
    if (success) saved.resolve({ id: 'saved', versionNumber: 1 }); else saved.reject(new Error('Envoi interrompu'));
    await saving;
    assert.equal(page.getAttribute('contenteditable'), 'true');
    assert.equal(title.disabled, false);
    assert.equal(h.button('Enregistrer dans le dossier').disabled, false);
    assert.equal(page.textContent, 'Texte à conserver');
    assert.match(h.body.querySelector('.doc-status').textContent, success ? /Enregistré/u : /Envoi interrompu/u);
    page.textContent += ' puis complété'; await page.fire('input');
    assert.match(h.body.querySelector('.doc-status').textContent, /modifications non enregistrées/u);
  }
});

test('a late video save cannot close a replacement editor or discard its changes', async () => {
  const h = browser(), saved = deferred(); let stopped = 0; h.saveHandler = () => saved.promise;
  h.api.recordVideo();
  const permission = h.button('Activer la caméra et le micro').fire('click');
  h.media.resolve({ getTracks: () => [{ stop: () => { stopped += 1; } }] }); await permission;
  await h.button('Démarrer l’enregistrement').fire('click');
  await h.button('Arrêter').fire('click');
  const sending = h.button('Envoyer au dossier').fire('click');
  h.api.closeDock(true); await h.api.openEditor();
  const page = h.body.querySelector('.doc-page'); page.textContent = 'Travail en cours'; await page.fire('input');
  saved.resolve({ id: 'video-new', name: 'Message.webm', mimeType: 'video/webm', versionNumber: 1 });
  await sending;
  assert.equal(stopped, 1);
  assert.equal(h.body.querySelector('[data-kind]').dataset.kind, 'editor');
  assert.equal(h.body.querySelector('.doc-page'), page);
  assert.equal(page.textContent, 'Travail en cours');
  assert.match(h.body.querySelector('.doc-status').textContent, /modifications non enregistrées/u);
});

function office() {
  const context = vm.createContext({ window: {}, TextEncoder, TextDecoder, Blob, Response, DecompressionStream, URL });
  vm.runInContext(source, context); return context.window.BAWorkspace.internals;
}
function compressedZip(W, text, claimedSize = Buffer.byteLength(text)) {
  const name = Buffer.from('word/document.xml'), raw = Buffer.from(text), compressed = deflateRawSync(raw);
  const local = Buffer.alloc(30), central = Buffer.alloc(46), end = Buffer.alloc(22);
  local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8); local.writeUInt32LE(W.crc32(raw), 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(claimedSize, 22); local.writeUInt16LE(name.length, 26);
  central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 6); central.writeUInt16LE(8, 10); central.writeUInt32LE(W.crc32(raw), 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(claimedSize, 24); central.writeUInt16LE(name.length, 28);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(central.length + name.length, 12); end.writeUInt32LE(local.length + name.length + compressed.length, 16);
  return new Uint8Array(Buffer.concat([local, name, compressed, central, name, end]));
}

test('Office reader accepts valid deflate and stored entries', async () => {
  const W = office(); const text = '<document>Texte valide</document>';
  for (const archive of [compressedZip(W, text), W.zipStore([{ name: 'word/document.xml', data: text }])]) {
    const entries = await W.unzip(archive, ['word/document.xml']);
    assert.equal(new TextDecoder().decode(entries.get('word/document.xml')), text);
  }
});

test('Office reader rejects oversized declared XML and expansion hidden by a false size', async () => {
  const W = office();
  await assert.rejects(W.unzip(compressedZip(W, 'small', 9 * 1024 * 1024)), /limite|volumineux|taille/iu);
  await assert.rejects(W.unzip(compressedZip(W, 'x'.repeat(1024 * 1024), 4)), /limite|volumineux|taille/iu);
});

test('Office reader rejects truncated directories, duplicate target entries and bad checksums', async () => {
  const W = office(); const good = W.zipStore([{ name: 'word/document.xml', data: 'text' }]);
  await assert.rejects(W.unzip(good.slice(0, -5)), /archive|document|illisible/iu);
  await assert.rejects(W.unzip(W.zipStore([{ name: 'word/document.xml', data: 'a' }, { name: 'word/document.xml', data: 'b' }])), /archive|document|doublon|illisible/iu);
  const bad = new Uint8Array(good); bad[30 + 'word/document.xml'.length] ^= 1;
  await assert.rejects(W.unzip(bad), /archive|document|intégrité|illisible/iu);
});
