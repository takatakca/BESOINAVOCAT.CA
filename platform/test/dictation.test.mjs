import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/dictation.js', import.meta.url), 'utf8');
function setup({ supported = true, lang = 'fr-CA', failStart = false } = {}) {
  const timers = new Map(), events = [], instances = [];
  let accept = true;
  class Recognition {
    constructor() { instances.push(this); this.started = 0; this.stopped = 0; this.aborted = 0; }
    start() { this.started++; if (failStart) throw new Error('provider details must stay private'); }
    stop() { this.stopped++; }
    abort() { this.aborted++; }
  }
  const context = vm.createContext({ setTimeout, clearTimeout });
  vm.runInContext(source, context);
  const controller = context.BesoinAvocatDictation.create({ Recognition: supported ? Recognition : undefined, lang,
    shouldAccept: () => accept, onState: state => events.push(['state', state]),
    onResult: text => events.push(['result', text]), onError: (message, code) => events.push(['error', code, message]),
    setTimer: (fn, ms) => { assert.equal(ms, 45000); timers.set(1, fn); return 1; }, clearTimer: id => timers.delete(id) });
  return { controller, events, instances, timers, reject: () => { accept = false; } };
}
const final = transcript => ({ isFinal: true, 0: { transcript } });
test('no microphone starts before an explicit call; final text is delivered once at the end', () => {
  const h = setup(); assert.equal(h.instances.length, 0); assert.equal(h.events.length, 0);
  assert.equal(h.controller.start(), true); assert.equal(h.controller.start(), false);
  const r = h.instances[0]; r.onstart();
  assert.equal(r.lang, 'fr-CA'); assert.equal(r.continuous, false); assert.equal(r.interimResults, false);
  r.onresult({ resultIndex: 0, results: [final('  Factures  AtelierExemple ')] });
  r.onresult({ resultIndex: 0, results: [final('  Factures  AtelierExemple ')] });
  assert.equal(h.events.filter(e => e[0] === 'result').length, 0);
  const ended = r.onend; ended(); ended();
  assert.deepEqual(h.events.filter(e => e[0] === 'result'), [['result', 'Factures AtelierExemple']]);
  assert.equal(h.timers.size, 0);
});
test('abort and invalidated context discard partial text and stale recognition events', () => {
  for (const invalidate of [false, true]) {
    const h = setup(); h.controller.start(); const r = h.instances[0];
    const ended = r.onend, result = r.onresult;
    result({ resultIndex: 0, results: [final('Confidentiel fictif')] });
    if (invalidate) h.reject(); else h.controller.abort();
    ended(); result({ resultIndex: 0, results: [final('Late')] });
    assert.equal(h.events.filter(e => e[0] === 'result').length, 0);
    assert.equal(h.timers.size, 0);
  }
});
test('permission failure, missing service and timeout use fixed messages and stop capture', () => {
  for (const error of ['not-allowed', 'audio-capture', 'network', 'secret-provider-error']) {
    const h = setup(); h.controller.start(); const r = h.instances[0]; r.onerror({ error });
    assert.equal(r.aborted, 1); assert.equal(h.events.filter(e => e[0] === 'result').length, 0);
    assert.equal(h.events.at(-1)[1], error === 'secret-provider-error' ? 'failed' : error);
    assert.ok(!h.events.at(-1)[2].includes('secret-provider-error'));
  }
  const h = setup(); h.controller.start(); h.timers.get(1)();
  assert.equal(h.instances[0].aborted, 1); assert.equal(h.events.at(-1)[1], 'timeout');
});
test('unsupported browsers and start failures keep keyboard fallback without opening repeated captures', () => {
  const h = setup({ supported: false }); assert.equal(h.controller.isSupported, false);
  assert.equal(h.controller.start(), false); assert.equal(h.events.at(-1)[1], 'unsupported');
  const f = setup({ failStart: true }); assert.equal(f.controller.start(), false);
  assert.equal(f.events.at(-1)[1], 'failed'); assert.equal(f.timers.size, 0);
});
test('stop accepts a final result but empty, interim and oversized speech never trigger a search', () => {
  const h = setup({ lang: 'en-CA' }); h.controller.start(); const r = h.instances[0];
  assert.equal(r.lang, 'en-CA'); assert.equal(h.controller.stop(), true);
  assert.equal(r.stopped, 1); r.onresult({ resultIndex: 0, results: [final('repair invoices')] }); r.onend();
  assert.equal(h.events.at(-1)[1], 'repair invoices');
  for (const text of ['', 'x'.repeat(201)]) {
    const f = setup(); f.controller.start(); const rec = f.instances[0];
    const end = rec.onend; rec.onresult({ resultIndex: 0, results: [final(text)] }); end();
    assert.equal(f.events.filter(e => e[0] === 'result').length, 0);
    assert.equal(f.events.at(-1)[1], text ? 'too_long' : 'no-speech');
  }
  const interim = setup(); interim.controller.start(); const rec = interim.instances[0];
  rec.onresult({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: 'Not final' } }] }); rec.onend();
  assert.equal(interim.events.filter(e => e[0] === 'result').length, 0);
  assert.equal(interim.events.at(-1)[1], 'no-speech');
});
