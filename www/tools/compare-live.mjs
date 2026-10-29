// Compares the built copy (www/dist) with the live WordPress site, page by page, as a visitor sees them.
//   node www/tools/compare-live.mjs <out-dir> [--ocr] [path ...]      requires Playwright; --ocr also needs tesseract (fra)
// For each page, both versions are opened in Chromium at 1440 px and scrolled to the end so every animated block
// is shown. The visible text (innerText) must be identical, word for word. With --ocr, a full-page screenshot of
// the copy is read by Tesseract and the words found are matched against the live text. Results: <out-dir>/report.json.
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const DIST = join(ROOT, 'dist');
const args = process.argv.slice(2);
const out = args.shift();
if (!out) throw new Error('Usage: node www/tools/compare-live.mjs <out-dir> [--ocr] [path ...]');
const ocr = args.includes('--ocr');
const manifest = JSON.parse(readFileSync(join(ROOT, 'site', 'manifest.json'), 'utf8'));
const paths = args.filter((a) => a.startsWith('/'));
const pages = paths.length ? paths : manifest.pages.map((p) => p.path);
mkdirSync(out, { recursive: true });

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.pdf': 'application/pdf', '.json': 'application/json' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = join(DIST, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (path.includes('..') || !existsSync(file)) { res.writeHead(404, { 'content-type': types['.html'] }); return res.end(readFileSync(join(DIST, '404.html'))); }
  res.writeHead(200, { 'content-type': types[extname(file).toLowerCase()] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const COPY = `http://127.0.0.1:${server.address().port}`;

const normal = (text) => text.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const words = (text) => normal(text).toLowerCase().normalize('NFC').match(/[\p{L}\p{N}]+/gu) || [];

async function visit(page, url, shot) {
  const errors = [];
  const onError = (e) => errors.push(e.message || String(e));
  page.on('pageerror', onError);
  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  // Scroll to the end so animated blocks are revealed, as for a visitor.
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
  await page.waitForTimeout(600);
  const text = await page.evaluate(() => document.body.innerText);
  if (shot) await page.screenshot({ path: shot, fullPage: true, animations: 'disabled', timeout: 120000 });
  page.off('pageerror', onError);
  return { status: response ? response.status() : 0, text, errors };
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
// The cookie banner keeps its consent locally; the same choice is made on both sides so it does not cover the page.
const live = await context.newPage(), copy = await context.newPage();
const results = [];
for (const [i, path] of pages.entries()) {
  const name = path === '/' ? 'accueil' : path.replace(/^\/|\/$/g, '').replace(/\//g, '__');
  const a = await visit(live, `https://besoinavocat.ca${path}`, null);
  const shot = ocr ? join(out, `${name}.png`) : null;
  const b = await visit(copy, COPY + path, shot);
  const result = { path, live: a.status, copy: b.status, identical: normal(a.text) === normal(b.text), copyErrors: b.errors };
  if (!result.identical) {
    const x = normal(a.text), y = normal(b.text); let k = 0; while (k < x.length && x[k] === y[k]) k++;
    result.firstDifference = { live: x.slice(Math.max(0, k - 60), k + 60), copy: y.slice(Math.max(0, k - 60), k + 60) };
  }
  if (ocr) {
    const read = execFileSync('tesseract', [shot, '-', '-l', 'fra+eng', '--psm', '3'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 });
    writeFileSync(join(out, `${name}.ocr.txt`), read);
    const seen = new Set(words(read)); const expected = words(a.text).filter((w) => w.length > 2);
    result.ocrWordsFound = expected.length ? Math.round((expected.filter((w) => seen.has(w)).length / expected.length) * 1000) / 10 : 100;
  }
  results.push(result);
  writeFileSync(join(out, 'report.json'), JSON.stringify(results, null, 1));
  if ((i + 1) % 25 === 0) console.log(`${i + 1}/${pages.length}`);
}
await browser.close(); server.close();
const summary = { pages: results.length, identicalText: results.filter((r) => r.identical).length, different: results.filter((r) => !r.identical).map((r) => r.path),
  copyErrors: results.filter((r) => r.copyErrors.length).length, ocrAverage: ocr ? Math.round(results.reduce((n, r) => n + r.ocrWordsFound, 0) / results.length * 10) / 10 : undefined };
writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary));
