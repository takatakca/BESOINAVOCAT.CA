// Vérification en lecture seule d'un site public. Aucun secret ni cookie requis.
import assert from "node:assert/strict";
const base = new URL(process.env.SITE_URL ?? "https://besoinavocat.onrender.com");
if (base.protocol !== "https:") throw new Error("SITE_URL doit utiliser HTTPS.");
const paths = ["/", "/app.js", "/guide.mjs", "/styles.css", "/confidentialite.html", "/conditions.html", "/health.json"];
for (const path of paths) {
  const url = new URL(path, base);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: "follow" });
    assert.equal(response.ok, true, path + " répond HTTP " + response.status);
    const content = await response.text();
    assert.ok(content.length > 0, path + " est vide");
    if (path === "/") {
      assert.match(content, /BesoinAvocat\.ca/i);
      assert.match(content, /id="domainGrid"/);
      assert.match(content, /id="guideForm"/);
    }
    if (path === "/health.json") {
      assert.deepEqual(JSON.parse(content), { service: "besoinavocat", status: "ok" });
    }
    console.log("OK", response.status, url.href);
  } finally {
    clearTimeout(timeout);
  }
}
