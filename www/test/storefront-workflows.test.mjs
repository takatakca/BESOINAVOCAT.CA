import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const source = read('build.mjs');
// Execute the real build functions without rebuilding the 180 MB mirror for each behavioral test.
const repairs = source.slice(source.indexOf('// Approved migration repairs:'), source.indexOf('// Colours of inline styles'));
const forms = source.slice(source.indexOf('// Keep the historical form and labels'), source.indexOf('// The defensive submit handler'));
const { repairKnownReferences, prepareLegacyForms } = runInNewContext(`${repairs}\n${forms}\n({ repairKnownReferences, prepareLegacyForms })`, {
  URL, PORTAL: 'https://portail.besoinavocat.ca/',
});
const checker = read('tools/check-site.mjs');
const validationSource = checker.slice(checker.indexOf('// Validate real legacy wrappers'), checker.indexOf('function walk('));
const validateLegacyForms = runInNewContext(`${validationSource}\nvalidateLegacyForms`);
const visible = (html) => html.replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const withoutNotices = (html) => html.replace(/<aside\b[^>]*data-ba-migration-notice="true"[^>]*>[\s\S]*?<\/aside>/gi, '');

test('the two broken immigration illustrations use existing local files and preserve the article', () => {
  const article = read('site/regroupement-familial-quebec/index.html');
  const repaired = repairKnownReferences(article);
  assert.doesNotMatch(repaired, /src=["']https:\/\/jurigo\.ca\/images\//);
  for (const filename of ['fonctionnement-demande-parrainage-canada.webp', 'regroupement-familial-canada.webp']) {
    const path = `/wp-content/uploads/2025/10/${filename}`;
    assert.ok(repaired.includes(`src="${path}"`));
    assert.ok(existsSync(fileURLToPath(new URL(`site${path}`, root))));
  }
  assert.equal(visible(repaired), visible(article));
});

test('dead contact and password-recovery links lead to the portal without changing their labels', () => {
  const html = '<a href="/contact/">Nous contacter</a><a href="/wp-login.php?action=lostpassword">Lost password</a><a href="/wp-login.php?action=register">Register</a><a href="/faq/">FAQ</a>';
  const repaired = repairKnownReferences(html);
  assert.match(repaired, /href="https:\/\/portail\.besoinavocat\.ca\/demande">Nous contacter/);
  assert.match(repaired, /href="https:\/\/portail\.besoinavocat\.ca\/">Lost password/);
  assert.match(repaired, /href="https:\/\/portail\.besoinavocat\.ca\/demande">Register/);
  assert.match(repaired, /href="\/faq\/">FAQ/);
  assert.equal(visible(repaired), visible(html));
});

test('professional visitors see the portal link before an inert real MetForm wrapper, including without JavaScript', () => {
  const html = read('site/professionnels/index.html');
  const result = prepareLegacyForms(html);
  const wrapper = result.match(/<div\b[^>]*class="mf-form-wrapper"[^>]*>/);
  assert.ok(wrapper);
  assert.match(wrapper[0], /\sinert\s/);
  assert.match(wrapper[0], /aria-disabled="true"/);
  assert.ok(result.indexOf('data-ba-migration-notice="true"') < result.indexOf(wrapper[0]));
  assert.match(result, /href="https:\/\/portail\.besoinavocat\.ca\/demande\?role=professional"/);
  // Its embedded React template must not be rewritten as if it were a rendered form.
  assert.equal((result.match(/className="metform-form-content"/g) || []).length, (html.match(/className="metform-form-content"/g) || []).length);
  assert.deepEqual(result.match(/<script\b[^>]*>[\s\S]*?<\/script>/g), html.match(/<script\b[^>]*>[\s\S]*?<\/script>/g));
  assert.equal(visible(withoutNotices(result)), visible(html));
});

test('the archived login retains its fields and wording but cannot accept credentials', () => {
  const html = read('site/log-in/index.html');
  const result = prepareLegacyForms(html);
  assert.match(result, /<form\b[^>]*inert[^>]*data-ba-legacy-form="true"/);
  assert.match(result, /href="https:\/\/portail\.besoinavocat\.ca\/">Accéder au portail/);
  assert.equal((result.match(/<input\b/g) || []).length, (html.match(/<input\b/g) || []).length);
  assert.equal(visible(withoutNotices(result)), visible(html));
});

test('unrelated forms and script form templates are unchanged', () => {
  const html = '<form class="search" action="/search"><input name="q"></form><script>const template = `<form className="metform-form-content">`;</script>';
  assert.equal(prepareLegacyForms(html), html);
});

test('the build checker rejects both real original pages if form preparation is omitted entirely', () => {
  for (const path of ['site/professionnels/index.html', 'site/log-in/index.html']) {
    const original = read(path);
    assert.ok(validateLegacyForms(original).length > 0, path);
    assert.equal(validateLegacyForms(prepareLegacyForms(original)).length, 0, path);
  }
});

test('the build checker rejects removed inactive markers, broken notice association and a notice after the form', () => {
  const prepared = prepareLegacyForms('<form class="elementor-login"><input name="log"></form>');
  assert.ok(validateLegacyForms(prepared.replace(' data-ba-legacy-form="true"', '')).length > 0);
  assert.ok(validateLegacyForms(prepared.replace(' inert', '')).length > 0);
  assert.ok(validateLegacyForms(prepared.replace('aria-describedby="ba-migration-form-1"', 'aria-describedby="missing"')).length > 0);
  const notice = prepared.match(/<aside[\s\S]*?<\/aside>/)[0];
  assert.ok(validateLegacyForms(prepared.replace(notice, '') + notice).length > 0);
});

function submitFixture({ archived = true, legacy = true, link = true } = {}) {
  let handler, prevented = false, stopped = false, focused = false;
  const noticeLink = { focus() { focused = true; } };
  const container = { getAttribute(name) { assert.equal(name, 'aria-describedby'); return 'notice-1'; } };
  const document = {
    addEventListener(type, callback, capture) { assert.equal(type, 'submit'); assert.equal(capture, true); handler = callback; },
    getElementById(id) { assert.equal(id, 'notice-1'); return link ? { querySelector(selector) { assert.equal(selector, 'a[href]'); return noticeLink; } } : null; },
  };
  runInNewContext(read('overrides/assets/static-bridge.js'), {
    document,
    window: { get location() { throw new Error('The bridge must not navigate with discarded data'); } },
    fetch() { throw new Error('The bridge must not transmit data'); },
    FormData() { throw new Error('The bridge must not read archived fields'); },
  });
  handler({
    target: {
      closest(selector) { return selector === '[data-ba-legacy-form]' ? archived ? container : null : legacy ? container : null; },
      get elements() { throw new Error('Do not read archived fields'); },
    },
    preventDefault() { prevented = true; },
    stopImmediatePropagation() { stopped = true; },
  });
  return { prevented, stopped, focused };
}

test('a programmatic archived submission is blocked without reading data or navigating', () => {
  assert.deepEqual(submitFixture(), { prevented: true, stopped: true, focused: true });
});

test('a legacy submission without a notice remains blocked and cannot silently discard entered values', () => {
  assert.deepEqual(submitFixture({ archived: false, link: false }), { prevented: true, stopped: true, focused: false });
});

test('the defensive handler leaves unrelated forms alone', () => {
  assert.deepEqual(submitFixture({ archived: false, legacy: false }), { prevented: false, stopped: false, focused: false });
});

test('the cookie banner is in French and only its own labels change', async () => {
  const { frenchConsent } = await import('../consent.mjs');
  const page = read('site/index.html');
  const built = frenchConsent(page);
  for (const label of ['Tout refuser', 'Tout accepter', 'Personnaliser', 'Témoins nécessaires', 'Enregistrer mes préférences']) assert.ok(built.includes(label), label);
  assert.doesNotMatch(built, />\s*(?:Reject All|Accept All|Customize|Necessary Cookies)\s*</);
  assert.match(built, /"cookieadmin_notice_title":"Nous respectons votre vie priv/);
  // Outside the banner, the page is untouched.
  const outside = (html) => html.slice(0, html.indexOf('<div class="cookieadmin_law_container"')).replace(/cookieadmin_policy = \{.*?\};/s, '');
  assert.equal(outside(built), outside(page));
});

test('consent is kept in the visitor cookie instead of the missing WordPress endpoint', () => {
  const script = read('overrides/assets/consent-local.js');
  const saved = [];
  const window = { cookieadmin_save_consent_cookie: (preference, days, id) => saved.push({ preference, days, id }), crypto: { randomUUID: () => 'id-1' } };
  runInNewContext(script, { window });
  assert.equal(window.cookieadmin_pro_set_consent({ reject: 'true' }, 365), true);
  assert.deepEqual(saved, [{ preference: { reject: 'true' }, days: 365, id: 'id-1' }]);
  assert.doesNotMatch(script.replace(/^\s*\/\/.*$/gm, ''), /XMLHttpRequest|fetch\(|admin-ajax/);
});

test('search metadata: French language, one h1, description, Open Graph and JSON-LD, visible text unchanged', async () => {
  const { withSearchMetadata } = await import('../seo.mjs');
  const page = read('site/garde-partagee-au-quebec/index.html');
  const html = withSearchMetadata(page, '/garde-partagee-au-quebec/');
  assert.match(html, /<html[^>]*lang="fr-CA"/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /<meta name="description" content="[^"]{60,170}">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/besoinavocat\.ca\/garde-partagee-au-quebec\/">/);
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(ld['@graph'][0]['@type'], 'WebPage');
  assert.equal(visible(html), visible(page));
  const home = withSearchMetadata(read('site/index.html'), '/');
  assert.match(home, /Besoin d’un avocat au Québec\?/);
  assert.ok(JSON.parse(home.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'].some(item => item['@type'] === 'Organization'));
});

// Exact copy (D-032): the forms are as on WordPress; only the submission, which needs WordPress, opens the portal with no value from the form.
function exactSubmit(selectorsMatched) {
  let handler, opened = null, prevented = false, stopped = false;
  const tag = { getAttribute: (name) => ({ 'data-mode': 'exact', 'data-professional': 'https://portail.besoinavocat.ca/demande?role=professional', 'data-portal': 'https://portail.besoinavocat.ca/' })[name] };
  const document = { currentScript: tag, addEventListener(type, callback) { handler = callback; } };
  runInNewContext(read('overrides/assets/static-bridge.js'), {
    document,
    window: { location: { set href(value) { opened = value; } } },
    fetch() { throw new Error('The bridge must not transmit data'); },
    FormData() { throw new Error('The bridge must not read form fields'); },
  });
  handler({
    target: { closest: (selector) => (selectorsMatched(selector) ? {} : null), get elements() { throw new Error('Do not read form fields'); } },
    preventDefault() { prevented = true; }, stopImmediatePropagation() { stopped = true; },
  });
  return { opened, prevented, stopped };
}

test('exact copy: a MetForm submission opens the professional portal page and a login submission opens the portal, with no form value', () => {
  assert.deepEqual(exactSubmit((s) => /mf-form-wrapper/.test(s)), { opened: 'https://portail.besoinavocat.ca/demande?role=professional', prevented: true, stopped: true });
  assert.deepEqual(exactSubmit((s) => /elementor-login/.test(s) && !/mf-form-wrapper/.test(s)), { opened: 'https://portail.besoinavocat.ca/', prevented: true, stopped: true });
  assert.deepEqual(exactSubmit(() => false), { opened: null, prevented: false, stopped: false });
});

test('exact copy is the default style: no destination added, no heading, language or head change, no form notice', () => {
  assert.match(source, /const EXACT = !LEGAL;/);
  assert.match(source, /EXACT \? html : wireButtons\(/);
  assert.match(source, /repairKnownReferences\(html, \{ loginLinks: false \}\)/);
  assert.match(source, /if \(!EXACT && pagePath\.endsWith/);
  assert.match(source, /\(EXACT \? html : prepareLegacyForms\(html\)\)/);
});
