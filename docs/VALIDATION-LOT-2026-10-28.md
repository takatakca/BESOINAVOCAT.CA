# Validation du lot portail — 28 octobre 2026

Branche : `codex/workspaces-appels-2026-10-28`. Le lot est destiné à la revue et au déploiement par Mike. Il ne modifie pas WordPress, le DNS ou les comptes de production. Les notes concurrentes de `main` réservent la présentation de la vitrine au propriétaire : conserver cette décision.

## Résultat du lot

- Questionnaire FR/EN : huit domaines, questions conditionnelles, récapitulatif relu, consentement versionné et réception idempotente. Les contrats antérieurs restent acceptés. Aucun formulaire réel transmis pendant la QA visuelle.
- Rendez-vous : planification réservée aux responsables/avocats, liens de participation Zoom existants validés, chronomètre personnel fondé sur l'horloge serveur. Les usages sont soumis à validation indépendante; ils ne constituent pas une facture. Le chronomètre actif reste accessible même au-delà de 200 rendez-vous.
- Connecteurs : catalogue de trois options en lecture seule, prix non fixés et achats/connexions désactivés. Facturations fournit un adaptateur serveur fermé par défaut, lectures et préparation locale de brouillons seulement. Aucune API de paiement ou d'appel réel n'a été activée.
- Préservation : inventaire contrôlé de 348 pages, dix remplacements et trois fichiers `wp-content`, soit 363 fichiers avec métadonnées. Une copie textuelle ne certifie ni la fidélité de la mise en page ni une sauvegarde complète des médias. Lire [CONTENT_PRESERVATION](CONTENT_PRESERVATION.md).

## Contrôles locaux réussis

| Contrôle | Résultat |
|---|---|
| Suite Node 24.19, portail, Passenger, site et compatibilité formulaire historique | **200 tests réussis**, zéro échec, zéro ignoré |
| Archive de code et exclusion des données privées | **3 tests Python réussis** |
| Sauvegarde/restauration, dont les nouveaux usages et leurs contraintes | **11 tests Python réussis** |
| Syntaxe serveur, interface et site; `git diff --check` | Réussie |
| `inventory-content.mjs --check` | 363 fichiers concordants; référence `8057de40b459e6e9a27d862e77d96620f2661becc94b6cee34e0dbcc4fd79dd1` |
| Construction et contrôle de la vitrine | 350 pages, zéro erreur, trois avertissements existants sur les textes remplacés |

Les avertissements concernent `/`, `/professionnels/` et `/tableau-de-bord/` : certaines phrases importées ne sont pas dans le rendu de leurs remplacements. Les sources originales restent conservées. Aucun de ces contenus ou remplacements n'a été réécrit dans ce lot; les changements de `www/` concernent les outils et leur compatibilité Windows.

La QA navigateur a contrôlé le parcours FR puis EN, les embranchements, l'effacement des réponses devenues inactives, la relecture après correction, le clavier, ainsi que Rendez-vous et Usages. Deux défauts de largeur mobile ont été corrigés et recontrôlés : questionnaire à 320/390 pixels et carte Rendez-vous à 390 pixels. Neuf captures et leur rapport avec SHA sont conservés dans les livrables privés OneDrive. Les écrans de rendez-vous utilisent des exemples fictifs; cette QA ne prouve pas la connexion au compte réel.

## Contrôles de production encore nécessaires

La dernière observation de cette session donne `/api/health` 200 avec `identityConfigured:false` et `/demande` 404 sur le portail distant : l'ancien service répond. Le compte TAKATAK existe et les habilitations locales des trois dossiers concordent, mais aucun mot de passe n'a été testé ni modifié. Après le déploiement, vérifier la connexion réelle, les trois dossiers, recherche, citations et téléchargements, puis la conservation des données après redémarrage.

La réception des demandes ne comprend pas encore toute la file opérateur, l'attribution à un avocat et les notifications. Les connecteurs OAuth, appels intégrés, webhooks de paiement, abonnements et frais d'usage demandent encore une configuration et des essais réels. Voir [la liste de Mike](DEV-A-FAIRE-2026-10-28.md) et [CONNECTEURS-OPTIONNELS](CONNECTEURS-OPTIONNELS.md).

Commandes reproductibles depuis la racine :

```sh
node --test platform/test/*.test.mjs platform/deploy/passenger.test.cjs wordpress/besoinavocat-experience/checks/funnel.test.mjs tests/*.test.mjs
python platform/deploy/test_build_bundle.py
python platform/test/test_backup_corpus.py
node www/tools/inventory-content.mjs --check
node www/build.mjs
node www/tools/check-site.mjs
```
