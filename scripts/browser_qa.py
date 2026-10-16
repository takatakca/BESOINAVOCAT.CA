#!/usr/bin/env python3
"""Tests d'interface du site statique réel, sans backend ni données privées.

Lancer depuis la racine :
  python -m pip install -r requirements-qa.txt
  python -m playwright install chromium
  python scripts/browser_qa.py
Les captures sont créées dans qa-artifacts/ (ignoré par Git).
"""
from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys
import time
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ARTIFACTS = ROOT / "qa-artifacts"
BASE = "http://127.0.0.1:8765"
WIDTHS = (320, 375, 768, 1440)
fails = []


def check(condition: bool, description: str) -> None:
    if not condition:
        raise AssertionError(description)
    print("PASS:", description)


def run_suite() -> None:
    ARTIFACTS.mkdir(exist_ok=True)
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", "8765", "--bind", "127.0.0.1", "--directory", str(ROOT / "site")],
        stdout=subprocess.DEVNULL, stderr=subprocess.PIPE
    )
    try:
        for _ in range(40):
            try:
                with urlopen(BASE + "/", timeout=1) as response:
                    if response.status == 200:
                        break
            except OSError:
                time.sleep(.2)
        else:
            raise RuntimeError("Le serveur de test ne démarre pas")

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, args=["--no-sandbox"])
            try:
                for width in WIDTHS:
                    context = browser.new_context(
                        viewport={"width": width, "height": 800},
                        device_scale_factor=1,
                        reduced_motion="reduce",
                        locale="fr-CA"
                    )
                    page = context.new_page()
                    errors = []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    response = page.goto(BASE + "/", wait_until="networkidle")
                    check(response is not None and response.status == 200, f"Accueil HTTP 200 ({width}px)")
                    check(page.locator(".domain-card").count() == 8, f"Huit domaines chargés ({width}px)")
                    page.screenshot(path=str(ARTIFACTS / f"accueil-{width}.png"), full_page=True)
                    overflow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
                    check(overflow <= 1, f"Aucun débordement horizontal ({width}px, écart={overflow}px)")

                    if width == 320:
                        menu = page.locator("#menuToggle")
                        check(menu.is_visible(), "Menu mobile visible")
                        menu.click()
                        check(menu.get_attribute("aria-expanded") == "true", "Menu mobile ouvert et annoncé")
                        check(page.locator("#mainNav").is_visible(), "Navigation mobile affichée")
                        page.keyboard.press("Escape")
                        check(menu.get_attribute("aria-expanded") == "false", "Échap ferme le menu mobile")

                        search = page.get_by_role("searchbox", name="Chercher un domaine ou une situation")
                        search.fill("congediement")
                        check(page.locator(".domain-card:visible").count() == 1, "Recherche sans accents")
                        check(page.locator('.domain-card:visible').get_attribute("data-domain") == "travail", "Résultat professionnel correct")
                        search.fill("expression-inconnue")
                        check(page.locator("#noDomains").is_visible(), "Message de recherche sans résultats")
                        search.fill("")
                        check(page.locator(".domain-card:visible").count() == 8, "Recherche réinitialisée")

                        page.locator("#guideForm button[type='submit']").click()
                        check("Sélectionnez d'abord" in page.locator("#formNotice").inner_text(), "Validation domaine manquant")
                        button = page.locator('.domain-card[data-domain="logement"]')
                        button.focus()
                        page.keyboard.press("Enter")
                        check(button.get_attribute("aria-pressed") == "true", "Choix activé au clavier")
                        check(page.evaluate("document.activeElement.id") == "region", "Focalisation sur la région")
                        page.locator("#guideForm button[type='submit']").click()
                        check("Choisissez une région" in page.locator("#formNotice").inner_text(), "Validation région manquante")
                        page.locator("#region").select_option(label="Montréal")
                        page.locator('input[name="urgency"][value="today"]').check()
                        page.locator("#aide").check()
                        page.locator("#guideForm button[type='submit']").click()
                        result = page.locator("#guideResult")
                        check(result.is_visible(), "Plan personnalisé rendu")
                        check("Tribunal administratif du logement" in result.inner_text(), "Ressource logement présente")
                        check("Commission des services juridiques" in result.inner_text(), "Aide juridique demandée présente")
                        check("urgente" in result.inner_text(), "Priorisation de l'urgence")
                        check(page.evaluate("document.activeElement.id") == "guideResult", "Résultat reçoit le focus")
                        check(result.get_by_role("button", name="Imprimer mon plan").is_visible(), "Impression du résultat offerte")
                        page.screenshot(path=str(ARTIFACTS / "resultat-320.png"), full_page=True)
                        page.emulate_media(media="print")
                        check(page.locator(".hero").evaluate("(el) => getComputedStyle(el).display") == "none", "Hero caché à l'impression")
                        check(result.evaluate("(el) => getComputedStyle(el).display") != "none", "Plan visible à l'impression")

                    check(not errors, f"Pas d'erreur JavaScript ({width}px): {errors}")
                    context.close()

                context = browser.new_context(viewport={"width": 1280, "height": 800}, reduced_motion="reduce")
                legal = context.new_page()
                for path in ("confidentialite.html", "conditions.html", "404.html"):
                    reply = legal.goto(BASE + "/" + path)
                    check(reply is not None and reply.ok, f"Page {path} disponible")
                    check(legal.locator("main").count() == 1, f"Page {path} possède un contenu principal")
                context.close()
            finally:
                browser.close()
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait(timeout=5)


if __name__ == "__main__":
    try:
        run_suite()
    except Exception as error:
        print(f"FAIL: {error}", file=sys.stderr)
        sys.exit(1)
