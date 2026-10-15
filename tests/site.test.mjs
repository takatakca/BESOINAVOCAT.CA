import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../site");
const PAGES = ["index.html", "confidentialite.html", "conditions.html", "404.html"];
const read = (path) => readFileSync(resolve(SITE_DIR, path), "utf8");

test("Les pages statiques ont une structure accessible et une CSP", () => {
  for (const path of PAGES) {
    const html = read(path);
    assert.match(html, /<!doctype html>/i, path);
    assert.match(html, /<html lang="fr-CA">/, path);
    assert.match(html, /<meta name="viewport"/, path);
    assert.match(html, /Content-Security-Policy/, path);
    assert.match(html, /<main id="contenu"/, path);
    assert.match(html, /<title>.+<\/title>/, path);
    assert.doesNotMatch(html, /\son(?:click|load|error|submit)\s*=/i, path);
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i, path);
  }
});

test("Les liens vers les ressources locales existent et les ancres principales sont valides", () => {
  for (const path of PAGES) {
    const html = read(path);
    for (const [, target] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      if (/^https?:\/\//.test(target)) {
        assert.match(target, /^https:\/\//);
        continue;
      }
      if (target.startsWith("#")) {
        assert.ok(html.includes('id="' + target.slice(1) + '"'), path + ": " + target);
        continue;
      }
      const asset = target.split(/[?#]/)[0];
      if (asset && !asset.startsWith("data:") && !asset.startsWith("mailto:")) {
        assert.ok(existsSync(resolve(SITE_DIR, asset)), path + ": " + asset + " introuvable");
      }
    }
  }
});

test("Les liens externes dans une nouvelle fenêtre protègent le contexte de navigation", () => {
  for (const path of PAGES) {
    const html = read(path);
    for (const anchor of html.match(/<a\b[^>]+>/g) ?? []) {
      if (anchor.includes('target="_blank"')) {
        assert.match(anchor, /rel="[^"]*\bnoopener\b[^"]*"/, path + " : " + anchor);
        assert.match(anchor, /rel="[^"]*\bnoreferrer\b[^"]*"/, path + " : " + anchor);
      }
    }
  }
});

test("Le formulaire et la recherche locale sont des éléments réellement câblés", () => {
  const html = read("index.html");
  const app = read("app.js");
  const guide = read("guide.mjs");
  for (const id of ["domainGrid", "domainSearch", "domainCount", "noDomains", "guideForm", "region", "aide", "guideResult", "formNotice"]) {
    assert.ok(html.includes('id="' + id + '"'), id + " absent du document");
    assert.ok(app.includes('$("#' + id + '")'), id + " non relié au script");
  }
  assert.match(app, /addEventListener\("submit"/);
  assert.match(app, /addEventListener\("input"/);
  assert.match(guide, /export function findDomains/);
  assert.match(guide, /export function buildGuide/);
});

test("Les ressources de base et les mentions restent accessibles sans backend", () => {
  assert.ok(existsSync(resolve(SITE_DIR, "favicon.svg")));
  assert.ok(existsSync(resolve(SITE_DIR, "styles.css")));
  assert.match(read("index.html"), /<noscript>/);
  assert.match(read("confidentialite.html"), /navigateur/);
  assert.match(read("conditions.html"), /avocat-client/);
  const health = JSON.parse(read("health.json"));
  assert.deepEqual(health, { service: "besoinavocat", status: "ok" });
});
