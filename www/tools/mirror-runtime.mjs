// Second pass of the WordPress mirror: files the pages load only while running (Elementor script chunks, lazy images,
// fonts of the mobile menu…). Opens live pages in Chromium at desktop and phone widths, records every same-site or
// Google Fonts request that the mirror does not hold yet, downloads it and adds it to manifest.json.
//   node www/tools/mirror-runtime.mjs [--site=<dir>] [path ...]        requires Playwright; default site: www/site
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--site='));
const option = process.argv.find((a) => a.startsWith('--site='));
const SITE = option ? option.slice(7) : new URL('../site', import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(join(SITE, 'manifest.json'), 'utf8'));
const known = new Set(manifest.assets.map((a) => a.path));
const pages = args.length ? args : ['/', '/professionnels/', '/consultations/', '/log-in/', '/demande/', '/faq/'];
const sha = (data) => createHash('sha256').update(data).digest('hex');
const local = (url) => {
  const u = new URL(url);
  let path = decodeURIComponent(u.pathname);
  if (u.hostname === 'fonts.googleapis.com') path = `/css-${sha(u.search).slice(0, 12)}.css`;
  return (/besoinavocat\.ca$/.test(u.hostname) ? '' : `/vendor/${u.hostname}`) + path;
};

const browser = await chromium.launch();
const seen = new Set();
for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const page = await (await browser.newContext({ viewport })).newPage();
  page.on('request', (request) => {
    const url = request.url().split('#')[0];
    if (/^https:\/\/((www\.)?besoinavocat\.ca\/(wp-content|wp-includes)\/|fonts\.(googleapis|gstatic)\.com\/)/.test(url)) seen.add(url.replace(/\?.*$/, (q) => (url.includes('fonts.googleapis.com') ? q : '')));
  });
  for (const path of pages) {
    await page.goto(`https://besoinavocat.ca${path}`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); } });
    await page.waitForTimeout(1500);
    // Open the mobile menu and any accordion so their resources load too.
    for (const selector of ['.menu-toggle', '.elementor-menu-toggle', 'details summary', '.e-n-accordion-item-title']) {
      for (const handle of (await page.$$(selector)).slice(0, 3)) { try { await handle.click({ timeout: 1000 }); } catch { /* hidden on this width */ } }
    }
    await page.waitForTimeout(800);
  }
}
await browser.close();

const added = [];
for (const url of [...seen].sort()) {
  if (known.has(local(url))) continue;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 BesoinAvocat-mirror' } });
  if (response.status !== 200) continue;
  const body = Buffer.from(await response.arrayBuffer());
  const path = local(url);
  mkdirSync(dirname(join(SITE, path)), { recursive: true });
  writeFileSync(join(SITE, path), body);
  manifest.assets.push({ url, path, status: 200, type: response.headers.get('content-type') || '', bytes: body.length, sha256: sha(body), runtime: true });
  added.push(path);
}
manifest.assets.sort((a, b) => a.path.localeCompare(b.path));
manifest.runtimeCapture = { at: new Date().toISOString(), pages, added: added.length };
writeFileSync(join(SITE, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(JSON.stringify({ requested: seen.size, added }));
