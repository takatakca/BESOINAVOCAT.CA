// Compares the visible text of a WordPress snapshot (see import-wordpress.mjs) with the built pages in www/dist.
//   node www/tools/compare-snapshot.mjs <snapshot-dir>     requires Playwright; the pages' JavaScript is not run
// Prints the number of sentences found and, per page, the sentences the built page does not contain.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const snapshot = process.argv[2];
if (!snapshot) throw new Error('Usage: node www/tools/compare-snapshot.mjs <snapshot-dir>');
const dist = new URL('../dist', import.meta.url).pathname;
const index = JSON.parse(readFileSync(`${snapshot}/index.json`, 'utf8'));
const norm = (text) => text.replace(/[ \s]+/g, ' ').replace(/’/g, "'").trim();
const decode = (text) => text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

const browser = await chromium.launch();
const context = await browser.newContext({ javaScriptEnabled: false });
await context.route('**/*', (route) => route.abort());
const page = await context.newPage();
const gaps = [];
let total = 0, found = 0;
for (const entry of index.pages) {
  if (entry.status !== 200) continue;
  await page.setContent(readFileSync(`${snapshot}/raw/${entry.file}`, 'utf8'), { waitUntil: 'domcontentloaded' });
  const blocks = await page.evaluate(() => {
    const root = document.querySelector('[data-elementor-type="wp-page"], [data-elementor-type="wp-post"]') || document.querySelector('#content .entry-content, #content .ast-container');
    if (!root) return [];
    root.querySelectorAll('script, style, form, .elementor-widget-metform, .elementor-share-buttons').forEach((node) => node.remove());
    return Array.from(root.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, summary, .elementor-button-text, .elementor-icon-box-title, .elementor-icon-box-description')).map((node) => node.textContent);
  });
  // Inline tags join words; block tags separate them.
  const built = norm(decode(readFileSync(`${dist}${entry.path}index.html`, 'utf8').replace(/<\/?(?:strong|em|a|u|sup|sub|code|b|i|span)\b[^>]*>/g, '').replace(/<[^>]+>/g, ' ')));
  const sentences = [...new Set(blocks.map(norm).flatMap((text) => text.split(/(?<=[.!?])\s+/)).filter((sentence) => sentence.length > 25))];
  const missing = sentences.filter((sentence) => !built.toLowerCase().includes(sentence.toLowerCase()));
  total += sentences.length;
  found += sentences.length - missing.length;
  if (missing.length) gaps.push({ path: entry.path, missing: missing.length, of: sentences.length, sample: missing.slice(0, 3).map((sentence) => sentence.slice(0, 90)) });
}
await browser.close();
console.log(JSON.stringify({ sentences: total, found, pagesWithGaps: gaps.length }));
for (const gap of gaps) console.log(JSON.stringify(gap));
