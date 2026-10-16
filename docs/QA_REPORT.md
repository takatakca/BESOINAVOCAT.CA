# QA_REPORT — BESOINAVOCAT.CA

**Date : 16 octobre 2026. Version de code : `2cd5be9990b8671c5189303c4315aff5c02671b8`.**

## Preuves vérifiées
- Quality checks : **success** — run [38852776970](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/38852776970).
- Browser QA Chromium : **success** — run [38852776863](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/38852776863).
- Smoke HTTP production : **success** — run [38852826709](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/38852826709).
- Render : **live**, déploiement `dep-db8qqms9v7es7397801g` au même SHA.

## Contrôles Chromium
| Fonction | 320 px | 375 px | 768 px | 1440 px |
|---|---|---|---|---|
| Accueil HTTP 200, huit cartes visibles | OK | OK | OK | OK |
| Absence de débordement horizontal | OK | OK | OK | OK |
| Absence d'erreurs JavaScript | OK | OK | OK | OK |
| Titres des engagements à taille compacte | OK | OK | OK | OK |
| Grand symbole du héros non masqué | non testé | non testé | non testé | OK |

À 320 px : menu et fermeture par Échap, recherche sans accents, état vide, remise à zéro, sélection au clavier, focus, validation des erreurs, plan personnalisé urgent avec ressources et styles d'impression : **OK**.
Pages confidentialité, conditions et 404 vérifiées dans Chromium : **OK**.

## Inspection des captures
Cinq captures par run sont archivées sept jours dans l'artéfact `browser-qa-screenshots`. L'inspection avant et après correction a identifié et confirmé la réparation de deux anomalies visuelles : symbole § masqué par les anneaux et titres de cartes trop grands. Correctifs `22e8970` et `2cd5be9`.

## Vérifications non effectuées
- NVDA/VoiceOver sur appareils physiques, Safari et Firefox.
- Audit WCAG formel et revue juridique.
- Domaine personnalisé `besoinavocat.ca` et propriété DNS.

## Reproduction
```sh
python -m pip install -r requirements-qa.txt
python -m playwright install chromium
python scripts/browser_qa.py
```

Aucune donnée personnelle ni dossier juridique n'est utilisé dans ces tests.
