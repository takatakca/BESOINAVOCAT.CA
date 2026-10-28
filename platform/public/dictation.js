/* Dictation is opt-in. No audio upload, recording, account or automatic start here.
 * The browser's recognition provider may process audio remotely; the UI explains
 * this before starting. This controller returns text, never a legal/AI answer. */
(() => {
  'use strict';
  const MESSAGES = Object.freeze({
    unsupported: 'La dictée n’est pas disponible dans ce navigateur. Utilisez le clavier.',
    'not-allowed': 'Le microphone a été refusé. Autorisez-le dans votre navigateur ou utilisez le clavier.',
    'service-not-allowed': 'Le service de dictée est indisponible. Utilisez le clavier.',
    'audio-capture': 'Aucun microphone disponible. Vérifiez votre appareil ou utilisez le clavier.',
    network: 'La dictée n’a pas pu joindre son service. Réessayez ou utilisez le clavier.',
    'no-speech': 'Aucune parole reconnue. Réessayez ou saisissez votre recherche.',
    'language-not-supported': 'Cette langue n’est pas disponible pour la dictée. Utilisez le clavier.',
    too_long: 'La dictée dépasse 200 caractères. Faites une recherche plus courte ou saisissez vos mots-clés.',
    timeout: 'La dictée a été arrêtée après 45 secondes. Réessayez avec une demande plus courte.',
    failed: 'La dictée n’a pas abouti. Utilisez le clavier ou réessayez.',
  });

  function create({ Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition,
    lang = 'fr-CA', onState = () => {}, onResult = () => {}, onError = () => {},
    shouldAccept = () => true, setTimer = globalThis.setTimeout, clearTimer = globalThis.clearTimeout } = {}) {
    if (!['fr-CA', 'en-CA'].includes(lang)) throw new TypeError('Unsupported dictation language');
    if ([onState, onResult, onError, shouldAccept, setTimer, clearTimer].some(f => typeof f !== 'function')) throw new TypeError('Invalid dictation callback');
    const isSupported = typeof Recognition === 'function';
    let active = null;
    const notify = (callback, ...args) => { try { callback(...args); } catch { /* A UI callback cannot retain the microphone. */ } };
    const accepted = () => { try { return shouldAccept() === true; } catch { return false; } };
    const current = item => active === item && !item.settled;
    const detach = item => {
      item.settled = true; active = null;
      clearTimer(item.timer);
      item.recognition.onstart = item.recognition.onresult = item.recognition.onerror = item.recognition.onend = null;
    };
    const abortRecognition = item => { try { item.recognition.abort(); } catch { /* Already closed by browser. */ } };
    const finish = (item, { code = null, deliver = false, abort = false } = {}) => {
      if (!current(item)) return;
      const text = [...item.parts.entries()].sort((a, b) => a[0] - b[0]).map(([, value]) => value).join(' ').trim();
      const accept = accepted();
      detach(item);
      if (abort) abortRecognition(item);
      notify(onState, 'idle');
      if (!accept) return;
      if (code) notify(onError, MESSAGES[code] || MESSAGES.failed, code);
      else if (deliver && text) notify(onResult, text);
      else if (deliver) notify(onError, MESSAGES['no-speech'], 'no-speech');
    };
    const start = () => {
      if (active || !accepted()) return false;
      if (!isSupported) { notify(onError, MESSAGES.unsupported, 'unsupported'); return false; }
      let recognition;
      try { recognition = new Recognition(); } catch { notify(onError, MESSAGES.failed, 'failed'); return false; }
      const item = { recognition, settled: false, parts: new Map(), timer: null };
      active = item;
      recognition.lang = lang; recognition.continuous = false; recognition.interimResults = false; recognition.maxAlternatives = 1;
      recognition.onstart = () => {
        if (!current(item)) return;
        if (!accepted()) { finish(item, { abort: true }); return; }
        notify(onState, 'listening');
      };
      recognition.onresult = event => {
        if (!current(item)) return;
        if (!accepted()) { finish(item, { abort: true }); return; }
        if (!event?.results || !Number.isInteger(event.results.length) || event.results.length > 32) { finish(item, { code: 'failed', abort: true }); return; }
        const first = Number.isInteger(event.resultIndex) && event.resultIndex >= 0 ? event.resultIndex : 0;
        for (let i = first; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result?.isFinal) continue;
          const raw = result[0]?.transcript;
          if (typeof raw !== 'string' || raw.length > 8000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(raw)) { finish(item, { code: 'failed', abort: true }); return; }
          item.parts.set(i, raw.replace(/\s+/gu, ' ').trim());
        }
        if ([...item.parts.values()].join(' ').length > 200) finish(item, { code: 'too_long', abort: true });
      };
      recognition.onerror = event => {
        const code = typeof event?.error === 'string' && Object.hasOwn(MESSAGES, event.error) ? event.error : 'failed';
        finish(item, { code, abort: true });
      };
      recognition.onend = () => finish(item, { deliver: true });
      item.timer = setTimer(() => finish(item, { code: 'timeout', abort: true }), 45000);
      notify(onState, 'starting');
      if (!current(item)) return false;
      if (!accepted()) { finish(item, { abort: true }); return false; }
      try { recognition.start(); return true; }
      catch { finish(item, { code: 'failed', abort: true }); return false; }
    };
    const stop = () => {
      const item = active;
      if (!item) return false;
      if (!accepted()) { finish(item, { abort: true }); return false; }
      notify(onState, 'stopping');
      try { item.recognition.stop(); return true; }
      catch { finish(item, { code: 'failed', abort: true }); return false; }
    };
    const abort = () => { if (active) finish(active, { abort: true }); };
    return Object.freeze({ isSupported, start, stop, abort });
  }
  globalThis.BesoinAvocatDictation = Object.freeze({ create });
})();
