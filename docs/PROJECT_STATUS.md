# PROJECT_STATUS — BESOINAVOCAT.CA

**État : site d'orientation conservé; nouveau pilote client/avocat en préparation locale.**
Révision : 26 octobre 2026.

## Nouveau mandat autorisé

Le propriétaire confirme besoinavocat.ca et MochaHost. Le développement WordPress + application Node.js est demandé, avec identité TAKATAK. Le code du pilote est dans `platform/`; l'accès MochaHost attend une connexion. Aucune infrastructure payante, permission externe, invitation ou facturation n'a été créée.

Le serveur local couvre dossiers/membres, dépôt et téléchargement contrôlé, versions immuables par API, SHA-256, provenance, recherche littérale, messages persistants, durée soumise/validée et journal. Tests API/identité/import : **32 cas réussis en local**. Les **12 tests du site existant** réussissent également. Le contrôle navigateur desktop de l'aperçu est réussi : quatre rubriques, recherche reliée à la provenance, changement de dossier, actions d'écriture désactivées et écran de connexion non activée. Aucune erreur ou alerte console observée. Voir [PLATFORM_QA.md](PLATFORM_QA.md).

À terminer : contrat d'identité TAKATAK dédié et flux de connexion, hébergement confirmé, sauvegarde/restauration, quotas et protection des fichiers, import contrôlé puis parcours complet avec vrais comptes. IA, Twilio et crédits sont des modules futurs; l'indicateur de capacité reste désactivé.

Les rubriques historiques ci-dessous décrivent la **production statique**, pas l'absence du nouveau code local.

## Dépôt et exécution
- GitHub : `takatakca/BESOINAVOCAT.CA`, branche `main`.
- Render : `besoinavocat`, URL `https://besoinavocat.onrender.com`, service `srv-db7srnmi0phs73ahkue0`.
- Déploiement de nouveaux commits : `autoDeploy=yes`. Pas de base de données ni de serveur applicatif.
- GitHub Pages facultatif volontairement désactivé; la publication principale reste Render.
- Domaine `besoinavocat.ca` : raccordement DNS/SSL non vérifié, **ne pas déclarer en ligne sur ce domaine**.

## Livré et réellement codé
- Interface responsive FR-CA, 8 domaines juridiques et liste des régions du Québec.
- Recherche textuelle instantanée des domaines (accents et mots-clés) traitée localement.
- Plan de recherche avec niveau d'urgence et option aide juridique; aucune identité, aucune donnée libre ou sensible demandée.
- Liens institutionnels et ressources contextuelles (CNESST, TAL, JuridiQC, Barreau, CSJ).
- Copier/imprimer le plan, navigation clavier, messages d'état, repli JavaScript désactivé.
- Pages confidentialité, conditions, 404 et `/health.json`.
- CI : **12 tests réussis** au SHA `8ea7be2`; smoke public GitHub Actions en post-CI, quotidien et déclenchable manuellement. Le run `38776190441` a réussi avec **7 réponses HTTP 200** le 15 octobre 2026.

## Non implémenté — ne pas confondre avec un bug
- Annuaire propriétaire, fiches d'avocats, onboarding professionnel, statut Barreau vérifié et consentement.
- Comptes TAKATAK, permissions multi-tenant, API et base de données.
- Demandes de consultation, messagerie, paiements, traitements de pièces confidentielles, tableau de bord professionnel.
- Raccordement du domaine personnalisé et conformité définitive avant exploitation commerciale de ces fonctionnalités.

## Qualité / risques
- Les tests Node.js et le smoke HTTP ont réussi mais ne remplacent pas une revue d'accessibilité avec lecteur d'écran, un test manuel mobile et une inspection visuelle.
- Les logs HTTP et règles d'hébergement Render restent du ressort de l'exploitant/hébergeur.
- Les ressources officielles doivent être revérifiées périodiquement.
- Aucune collecte de dossier, donc pas de fonctionnalité serveur nécessitant des permissions actuellement.
- Avant toute nouvelle collecte de renseignements personnels, compléter la gouvernance de confidentialité.

## Critère de clôture
Le périmètre **MVP orientation** peut être clôturé après validation CI, smoke et revue visuelle; le « produit complet » au sens annuaire/marketplace reste ouvert en attente de définition métier et conformité.

## Mise à jour QA — 16 octobre 2026
- Code `2cd5be9`: Quality checks `success` run `38852776970`, Browser QA Chromium `success` run `38852776863`, smoke HTTPS `success` run `38852826709`, Render `live` déploiement `dep-db8qqms9v7es7397801g`.
- Quatre largeurs testées sans débordement horizontal ni erreur JavaScript. Captures inspectées et deux anomalies d'affichage corrigées.
- Tests humains NVDA/VoiceOver et navigateurs physiques toujours ouverts. Voir [QA_REPORT.md](QA_REPORT.md).
