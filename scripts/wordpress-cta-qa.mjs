// Contrôle en lecture seule de l'accueil WordPress réel : bloc prix et CTA Elementor 1839.
// Aucun compte, cookie de session ou écriture serveur. Prérequis : Playwright et Chromium,
// par exemple `npm install --no-save playwright` puis `npx playwright install chromium`.
//   node scripts/wordpress-cta-qa.mjs                          # version installée
//   node scripts/wordpress-cta-qa.mjs --inject-assets wordpress/besoinavocat-experience/assets
// L'option remplace common.js et experience.js dans le navigateur de test seulement, pour
// contrôler une révision avant installation. Captures dans qa-artifacts/wordpress/ (ignoré par Git).
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

// require() also resolves a global Playwright installation through NODE_PATH.
const { chromium } = createRequire(import.meta.url)("playwright");

const base = new URL(process.env.WORDPRESS_URL ?? "https://besoinavocat.ca/");
if (base.protocol !== "https:") throw new Error("WORDPRESS_URL doit utiliser HTTPS.");
const flag = process.argv.indexOf("--inject-assets");
const injected = flag > 0 ? Object.fromEntries(["common.js", "experience.js"].map((name) => [name, readFileSync(new URL(name, new URL(process.argv[flag + 1] + "/", `file://${process.cwd()}/`)), "utf8")])) : null;
const artifacts = new URL("../qa-artifacts/wordpress/", import.meta.url);
mkdirSync(artifacts, { recursive: true });
const popup = "#elementor-popup-modal-1839";
const failures = [];
const check = (condition, description) => {
  console.log((condition ? "PASS: " : "FAIL: ") + description);
  if (!condition) failures.push(description);
};

const browser = await chromium.launch();
try {
  // The home page holds the price block; an article checks the popup in its fixed corner position.
const pages = [["/", true], ["/famille-et-jeunesse/", false]];
for (const [pathname, home] of pages) for (const [width, height] of [[1440, 900], [375, 812]]) {
    const context = await browser.newContext({ viewport: { width, height }, locale: "fr-CA" });
    const page = await context.newPage();
    if (injected) {
      await page.route(/\/plugins\/besoinavocat-experience\/assets\/(common|experience)\.js/, (route) =>
        route.fulfill({ status: 200, contentType: "application/javascript", body: injected[new URL(route.request().url()).pathname.split("/").pop()] }));
    }
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    const url = new URL(pathname, base);
    url.searchParams.set("ba-qa", String(Date.now()));
    const response = await page.goto(url.href, { waitUntil: "networkidle", timeout: 60000 });
    const label = `${pathname} ${width}px${injected ? " (assets injectés)" : ""}`;
    check(response?.status() === 200, `${label} HTTP 200`);
    const version = await page.evaluate(() => [...new Set([...document.querySelectorAll('script[src*="besoinavocat-experience"]')]
      .map((script) => new URL(script.src).searchParams.get("ver")))].join(","));
    console.log(`INFO: ${label} version du plugin servie : ${version || "aucune"}`);

    // Prices: visible, and nothing but the dismissible cookie banner on top of them.
    if (home) {
    const prices = await page.evaluate(() => [...document.querySelectorAll(".ba-offer-price")].map((price) => {
      price.scrollIntoView({ block: "center" });
      const box = price.getBoundingClientRect();
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      const covered = Boolean(top && !price.contains(top) && !top.closest(".cookieadmin_law_container"));
      return { text: price.innerText.replace(/\s+/g, " ").trim(), covered };
    }));
    check(prices.some((price) => price.text.startsWith("100 $ CA")) && prices.some((price) => price.text.startsWith("300 $ CA")),
      `${label} prix 100 $ CA et 300 $ CA présents`);
    check(prices.length > 0 && prices.every((price) => !price.covered), `${label} aucun prix recouvert`);
    }

    // The scroll-triggered popup must not move the visitor or take the focus.
    await page.evaluate(() => scrollTo(0, 0));
    let trigger = null;
    for (let step = 0; step < 240 && trigger === null; step += 1) {
      await page.mouse.wheel(0, 250);
      await page.waitForTimeout(150);
      if (await page.$(popup)) trigger = await page.evaluate(() => scrollY);
    }
    check(trigger !== null, `${label} CTA 1839 affiché au défilement`);
    if (trigger === null) { await context.close(); continue; }
    await page.waitForTimeout(1500);
    const after = await page.evaluate((selector) => ({
      y: scrollY,
      focused: Boolean(document.activeElement?.closest(selector)),
      modal: document.querySelector(selector).getAttribute("aria-modal"),
      href: document.querySelector(`${selector} a.elementor-button`)?.href ?? null,
    }), popup);
    check(Math.abs(after.y - trigger) < 300, `${label} pas de saut de page à l'ouverture (${Math.round(trigger)} → ${Math.round(after.y)} px)`);
    check(!after.focused, `${label} focus non déplacé vers le CTA`);
    check(after.modal !== "true", `${label} CTA dans le flux sans aria-modal`);
    check(after.href === new URL("/demande", base).href, `${label} lien du CTA conservé (${after.href})`);
    await page.screenshot({ path: new URL(`${home ? "accueil" : "article"}-cta-${width}.png`, artifacts).pathname });

    // Keyboard: Tab and Shift+Tab leave the button instead of looping on it.
    const focusCta = () => page.evaluate((selector) =>
      HTMLElement.prototype.focus.call(document.querySelector(`${selector} a.elementor-button`)), popup);
    const onCta = () => page.evaluate((selector) => Boolean(document.activeElement?.closest(selector)), popup);
    await focusCta();
    await page.keyboard.press("Tab");
    await page.waitForTimeout(400);
    check(!(await onCta()), `${label} Tab quitte le CTA`);
    await focusCta();
    await page.keyboard.press("Shift+Tab");
    await page.waitForTimeout(400);
    check(!(await onCta()), `${label} Maj+Tab quitte le CTA`);
    check(errors.length === 0, `${label} aucune erreur JavaScript${errors.length ? " : " + errors.join(" | ") : ""}`);
    await context.close();
  }
} finally {
  await browser.close();
}
if (failures.length) {
  console.error(`${failures.length} contrôle(s) en échec.`);
  process.exit(1);
}
console.log("Tous les contrôles WordPress CTA sont réussis.");
