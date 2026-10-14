import test from "node:test";
import assert from "node:assert/strict";
import { DOMAINS, REGIONS, SOURCES, buildGuide } from "../site/guide.mjs";

test("Les domaines et régions sont uniques", () => {
  assert.equal(new Set(DOMAINS.map((item) => item.id)).size, DOMAINS.length);
  assert.equal(new Set(REGIONS).size, REGIONS.length);
});
test("Plan courant sans aide juridique", () => {
  const guide = buildGuide({ domain: "famille", region: "Montréal" });
  assert.match(guide.summary, /Montréal/);
  assert.equal(guide.resources.length, 2);
  assert.ok(guide.steps.every((step) => typeof step === "string"));
});
test("Cas urgent renvoie vers l'information officielle d'urgence", () => {
  const guide = buildGuide({ domain: "penal", region: "Laval", urgency: "today", aid: true });
  assert.match(guide.steps[0], /urgente/);
  assert.ok(guide.resources.some((source) => source.url === SOURCES.urgence.url));
  assert.ok(guide.resources.some((source) => source.url === SOURCES.aide.url));
});
test("Les paramètres inattendus sont refusés", () => {
  assert.throws(() => buildGuide({ domain: "__proto__", region: "Montréal" }));
  assert.throws(() => buildGuide({ domain: "famille", region: "ailleurs" }));
  assert.throws(() => buildGuide({ domain: "famille", region: "Montréal", urgency: "impossible" }));
});
test("Aucun lien de ressource externe en HTTP non chiffré", () => {
  for (const source of Object.values(SOURCES)) assert.ok(source.url.startsWith("https://"));
});
