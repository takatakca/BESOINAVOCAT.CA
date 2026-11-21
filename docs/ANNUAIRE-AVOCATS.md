# Annuaire des cabinets — page publique « Nos avocats »

*Lot du 15 novembre 2026 (branche `taktak/annuaire-avocats-2026-11-15`). Ordre du propriétaire du 15 novembre 10:46 EST.*

## Ce que voit le visiteur

1. **`/avocats`** : page publique du portail (`platform/public/avocats.html`, `avocats.js`, `avocats.css`), même habillage que l'espace avocat. Recherche par nom de bureau ou de ville, côté navigateur.
2. **Affichage strictement limité** : le **nom du cabinet** et sa **ville**, rien d'autre. Aucun téléphone, aucun courriel, aucune adresse, aucun nom d'avocat ou d'agent.
3. **Sections** : « Top placement » (les trois bureaux partenaires rattachés à BesoinAvocat — emplacements vides au départ, la page affiche « Emplacements partenaires — à venir »), « Bureaux partenaires » (palier `sponsored`), puis le « Répertoire des bureaux » (palier `free`, A–Z).

## Comment ça marche côté serveur

- **`platform/lib/firms-directory.mjs`** : charge le dataset arrière-plan au démarrage et expose la seule projection publique `{ cabinet, ville, palier }`, groupée par palier (`top` plafonné à 3). Les champs privés du dataset ne traversent jamais ce module.
- **`GET /api/firms`** (public, sans session) : renvoie `{ top, sponsored, free }`. Dataset absent ou illisible : sections vides, jamais d'erreur — la page affiche ses états « à venir ».
- **Paliers** : ils se changent **dans le fichier de données seulement** (`palier: "top" | "sponsored" | "free"` dans `firms.json`), puis redémarrage du portail. Aucun écran d'administration. Le lien avec les forfaits vendus aux cabinets (abonnement de l'espace avocat, `lib/membership.mjs`) se fait à la main : quand un bureau souscrit, on passe son `palier` à `sponsored`; les trois `top` sont choisis par le propriétaire.

## Le dataset arrière-plan (jamais public, jamais commité)

- **`platform/tools/generate-firms.mjs`** fusionne les listes de prospection et déduplique (par domaine courriel du cabinet, hors domaines génériques, puis par nom normalisé) :
  - `docs/prospection/master-list-avocats-2026-11-14.csv` — la copie du dépôt compte 449 lignes; la liste maîtresse à jour (456 lignes, relève 20) est celle de l'espace de travail du propriétaire tant que sa poussée GitHub est en attente. Générer depuis les fichiers les plus récents, passés en arguments.
  - `docs/prospection/vague4-contacts-2026-11-15.csv` — 57 contacts (adresses 57/57, téléphones 6/57).
- **Sorties** dans `platform/data/` (dossier gitignoré par la règle du dépôt) : `firms.json` (complet : contacts, courriels, téléphones, adresses, statuts) et `firms.csv` (à plat). Les deux sont déposés sur Drive, dans le dossier des opérations.
- **Régénérer** : `node platform/tools/generate-firms.mjs [chemin1.csv chemin2.csv ...]` puis redéposer les sorties sur Drive et sur le serveur.
- **Cabinets sans nom confirmé** : 116 domaines dont aucun nom de cabinet n'est confirmé par les listes restent au dataset avec `cabinet: null` (leurs courriels y sont, pour la prospection) et sont **exclus de l'affichage public**. Aucun nom n'est déduit d'un domaine ni inventé. Ils deviendront affichables quand leur nom sera confirmé (inscription du bureau ou bottin du Barreau).
- **État au 15 novembre 2026** : 513 contacts → **199 cabinets** (83 nommés affichables, 116 sans nom), 14 avec adresse, 4 avec téléphone, 0 logo, tous au palier `free`.

## Ce qu'il faut pour que ça marche en ligne

| Qui | Quoi |
| --- | --- |
| Technicien (Colombo) | Fusionner la PR, puis redéployer le portail depuis `main` dans Coolify (autodéploiement éteint). |
| Technicien (Colombo) | Déposer `firms.json` sur le volume de l'application (`/data/firms.json`, même canal que `grants.json`) et poser `BESOINAVOCAT_FIRMS_FILE=/data/firms.json` dans Coolify. Sans cela, `/avocats` affiche un répertoire vide (« à venir »), sans erreur. |
| Propriétaire | Choisir les trois bureaux `top` quand ils seront rattachés; passer les paliers dans `firms.json` au fil des souscriptions. |

## Vérifications

- `platform/test/firms-directory.test.mjs` : 10 tests (parseur CSV, fusions et déduplication, enrichissement vague 4, invariants sur les listes réelles du dépôt, projection sans fuite de champs privés — courriel, téléphone, adresse et nom de contact absents de la réponse HTTP —, page servie, dataset absent).
- Suite complète au 15 novembre 2026 : plateforme **398/398** (Node 24.22), site **12/12**, `test_build_bundle.py` OK, `test_backup_corpus.py` OK.
