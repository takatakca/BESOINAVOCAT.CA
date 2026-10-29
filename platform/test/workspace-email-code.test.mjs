// Behavioral controller tests with a DOM facade and injected HTTP; no real account or email.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const exported = ['state', 'start', 'render', 'signedOut', 'requestEmailCode', 'verifyEmailCode', 'login', 'clearSession'];
assert.equal(source.split('  void start();').length, 2);
function harness(demo = false) {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { id, innerHTML: '', textContent: '', hidden: false, disabled: false, dataset: {}, open: false, isConnected: true,
      classList: { toggle() {} }, setAttribute() {}, removeAttribute() {}, addEventListener() {}, focus() {}, close() { this.open = false; }, querySelector() { return null; } });
    return nodes.get(id);
  };
  const h = { node, requests: [], handler: null };
  const context = vm.createContext({ URL, URLSearchParams, Intl, Date, console, AbortSignal,
    window: { location: { search: demo ? '?demo=1' : '' }, setTimeout: () => 1, clearTimeout() {} },
    document: { getElementById: node, querySelectorAll: () => [], addEventListener() {} },
    fetch: async (path, options) => { h.requests.push({ path, options }); if (!h.handler) throw new Error('Unexpected HTTP'); return h.handler(path, options); } });
  vm.runInContext(source.replace('  void start();', `  globalThis.UI = { ${exported.join(',')} };`), context);
  h.ui = context.UI; h.main = () => node('main-content').innerHTML;
  Object.assign(h.ui.state, { mode: 'signedout', health: { loginConfigured: true, emailCodeConfigured: true } });
  return h;
}
const response = (data, status = 200) => ({ status, ok: status >= 200 && status < 300, json: async () => data });
const form = (values = {}) => ({ elements: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value }])), button: { disabled: false }, querySelector() { return this.button; } });
function codeState(h) { h.ui.state.loginEmail = 'member@example.test'; h.ui.state.loginStep = 'code'; }

test('preview makes zero HTTP calls even when code/password functions are invoked', async () => {
  const h = harness(true); await h.ui.start();
  await h.ui.requestEmailCode(form({ email: 'member@example.test' }));
  codeState(h); await h.ui.verifyEmailCode(form({ code: '00123456' }));
  await h.ui.login(form({ email: 'member@example.test', password: 'synthetic' }));
  assert.equal(h.requests.length, 0);
});

test('activation is truthful: code controls stay absent and inert before the server readiness flag', async () => {
  const h = harness(); h.ui.state.health.emailCodeConfigured = false;
  h.ui.render();
  assert.ok(h.main().includes('connexion par code courriel est en préparation'));
  assert.ok(!h.main().includes('id="email-code-request-form"'));
  await h.ui.requestEmailCode(form({ email: 'member@example.test' }));
  codeState(h); await h.ui.verifyEmailCode(form({ code: '00123456' }));
  assert.equal(h.requests.length, 0);
});

test('request advances to code entry only after a generic response, without reading private APIs', async () => {
  const h = harness(); h.handler = async () => response({ accepted: true, message: 'Si le compte existe, consultez votre courriel.' });
  await h.ui.requestEmailCode(form({ email: ' member@example.test ' }));
  assert.equal(h.requests.length, 1); assert.equal(h.requests[0].path, '/api/auth/email/request');
  assert.deepEqual(JSON.parse(h.requests[0].options.body), { email: 'member@example.test' });
  assert.equal(h.requests[0].options.credentials, 'same-origin');
  assert.equal(h.requests[0].options.headers['X-Requested-With'], 'XMLHttpRequest');
  assert.equal(h.ui.state.mode, 'signedout'); assert.equal(h.ui.state.loginStep, 'code');
  assert.ok(h.main().includes('pattern="[0-9]{6,10}"'));
  assert.ok(h.main().includes('autocomplete="one-time-code"')); assert.ok(h.main().includes('Si le compte existe'));
  assert.ok(!h.main().includes('value="00123456"'));
});

test('a wrong or expired code clears the input, leaves a retryable form, and does not load dossiers', async () => {
  const h = harness(); codeState(h); h.handler = async () => response({ error: { message: 'hidden' } }, 401);
  const first = form({ code: '00123456' }); await h.ui.verifyEmailCode(first);
  assert.equal(first.elements.code.value, ''); assert.equal(h.ui.state.busy, false);
  assert.equal(h.ui.state.mode, 'signedout'); assert.equal(h.ui.state.loginStep, 'code');
  assert.ok(h.main().includes('Code non valide ou expiré'));
  const verifyButton = h.main().match(/<button class="button" type="submit"([^>]*)>Vérifier le code/u);
  assert.ok(verifyButton); assert.ok(!verifyButton[1].includes('disabled'));
  await h.ui.verifyEmailCode(form({ code: '00000001' }));
  assert.equal(h.requests.length, 2); assert.ok(h.requests.every(item => item.path === '/api/auth/email/verify'));
});

test('valid code authenticates, loads only granted APIs, and removes email/code from the login state', async () => {
  const h = harness(); codeState(h);
  h.handler = async path => response(path === '/api/me' ? { user: { active: true, subject: 'synthetic' } } : path === '/api/cases' ? { cases: [] } : {});
  const draft = form({ code: '0012345678' }); await h.ui.verifyEmailCode(draft);
  assert.deepEqual(JSON.parse(h.requests[0].options.body), { email: 'member@example.test', code: '0012345678' });
  assert.equal(h.requests[0].path, '/api/auth/email/verify'); assert.equal(draft.elements.code.value, '');
  assert.equal(h.ui.state.mode, 'authenticated'); assert.equal(h.ui.state.loginEmail, ''); assert.equal(h.ui.state.loginStep, 'email');
  assert.ok(h.requests.some(item => item.path === '/api/cases'));
  assert.ok(!h.main().includes('0012345678'));
});

test('malformed code cannot invoke HTTP; rate limit and outage leave usable retry controls', async () => {
  const h = harness(); codeState(h);
  for (const code of ['12345', '12345678901', '123 456']) await h.ui.verifyEmailCode(form({ code }));
  assert.equal(h.requests.length, 0);
  h.handler = async () => response({ error: { message: 'Réessayez plus tard.' } }, 429);
  await h.ui.verifyEmailCode(form({ code: '00123456' }));
  assert.equal(h.ui.state.busy, false); assert.ok(h.main().includes('Réessayez plus tard.'));
  h.ui.state.loginStep = 'email'; h.handler = async () => response({ error: { message: 'Service indisponible.' } }, 503);
  await h.ui.requestEmailCode(form({ email: 'member@example.test' }));
  assert.equal(h.ui.state.loginStep, 'email'); assert.equal(h.ui.state.busy, false);
  assert.ok(h.main().includes('Service indisponible.'));
});

test('session changes discard pending request/verification results without reopening a dossier', async () => {
  for (const verify of [false, true]) {
    const h = harness(); if (verify) codeState(h);
    let release;
    h.handler = async () => new Promise(resolve => { release = () => resolve(response({ accepted: true })); });
    const pending = verify ? h.ui.verifyEmailCode(form({ code: '00123456' })) : h.ui.requestEmailCode(form({ email: 'member@example.test' }));
    await Promise.resolve(); h.ui.clearSession(); release(); await pending;
    assert.equal(h.requests.length, 1); assert.equal(h.ui.state.mode, 'signedout'); assert.equal(h.ui.state.detail, null);
    assert.equal(h.ui.state.busy, false);
    if (!verify) assert.equal(h.ui.state.loginStep, 'email');
  }
});

test('an untrusted email is escaped in the code step and no code is stored in the app state', () => {
  const h = harness(); codeState(h); h.ui.state.loginEmail = '<img src=x>@example.test'; h.ui.render();
  assert.ok(!h.main().includes('<img src=x>')); assert.ok(h.main().includes('&lt;img'));
  assert.equal(Object.hasOwn(h.ui.state, 'code'), false);
});
