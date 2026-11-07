# Organisation des dossiers PC, Drive et GitHub — 7 novembre 2026


Note du dépôt : ce document reproduit le plan déposé dans le dossier PC du propriétaire (`00 — PLAN DE DÉPLACEMENT 2026-11-07.md`). La structure cible du PC (01 à 11 + CLONE) est celle des dossiers produits TAKATAK dans Google Drive (« ON2GO Hub »). Les notes Drive de BesoinAvocat restent dans « 00 — Opérations TAKATAK » (règle d’AGENTS.md); le PC en est le miroir.
Dossier : `C:\Users\fansh\OneDrive\Desktop\CLIENT WEBSITE\BESOINAVOCAT`

## État avant
Le dossier ne contenait qu'un seul fichier :

| Ancien chemin | Nouveau chemin | Action |
|---|---|---|
| `BESOINAVOCAT\CLES-INTEGRATIONS-BESOINAVOCAT.txt` | `BESOINAVOCAT\CLES-INTEGRATIONS-BESOINAVOCAT.txt` | **Inchangé** (secrets; d'autres fils de travail y écrivent encore). Rien déplacé, rien copié. |

Aucun autre fichier n'existait : il n'y a donc eu **aucun déplacement** et **aucune suppression**. Tout le reste est un ajout.

## Ajouts (source -> destination)

| Source | Destination |
|---|---|
| GitHub `main` 66cb4b4, `docs/*.md` (51 documents triés par sujet) | `01` à `10` selon le tableau de `00 — LIRE EN PREMIER.md` |
| GitHub, `platform/README.md` | `03 — Architecture et technologie\PORTAIL-README.md` |
| GitHub, branche `claude/project-thread-fo5yxi`, `docs/API.md` (PR 50) | `03 — Architecture et technologie\API.md` |
| GitHub, `docs/JOURNAL-AGENTS.md` | `11 — Relèves et journal des sessions d'agents\JOURNAL-AGENTS.md` |
| Archive ZIP de tout le dépôt (`git archive origin/main`) | `CLONE — BESOINAVOCAT consolidé 2026-11-07\github\` (9 archives ZIP de moins de 25 Mo chacune, `1-code-et-docs-66cb4b4.zip` en premier; voir `github\LIRE.md`) |
| Drive « 00 — Opérations TAKATAK », 106 fichiers dont le titre contient BesoinAvocat (notes JOURNAL, directions, spécifications) | `CLONE — BESOINAVOCAT consolidé 2026-11-07\drive-notes\` (un fichier par note + `00-INDEX-DRIVE.md`) |
| Fichiers du projet Claude (captures du parcours, brouillon CanLII, note cockpit) | `05`, `08` |

## Ce qui n'a pas été fait, et pourquoi
- `docs/REMISE-INTEGRATIONS-2026-11-07.md` est arrivé sur `main` à 13 h 10 UTC (PR 51) : copié dans `04 — Intégrations` à 13 h 15 UTC (copie, l'original reste dans le dépôt; le fil « Connecter et activer toutes les intégrations » le met encore à jour, reprendre la copie à sa note FIN).
- Les notes Drive n'ont pas été déplacées dans Drive : les autres fils de travail déposent leurs notes dans « 00 — Opérations TAKATAK » et une réorganisation de Drive casserait cette règle. Ce dossier PC est le miroir; Drive reste la source des notes.
- Aucun secret copié. Le fichier de clés n'apparaît ni dans le CLONE ni dans l'inventaire.

## Pour refaire l'export plus tard
1. Dépôt : `git clone https://github.com/takatakca/BESOINAVOCAT.CA` ou télécharger le ZIP depuis GitHub (bouton « Code »).
2. Notes Drive : ouvrir « 00 — Opérations TAKATAK », filtrer sur « BesoinAvocat », télécharger.
3. Copier les documents `docs/` dans les dossiers 01 à 10 selon le tableau.
