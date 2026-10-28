# PROJECT_STATUS — BESOINAVOCAT.CA

> **28 octobre 2026 — ARRÊT SUR LA VITRINE : le propriétaire la reprend lui-même, en ce moment.**
> - La refonte « plateforme IA » du 27 octobre (D-022) est **refusée** par le propriétaire (D-023).
> - Ce qu'il voulait : reproduire fidèlement le design qu'il a construit à la main sur WordPress, détail par détail, en changeant **seulement les couleurs** pour ne pas ressembler à un autre de ses sites.
> - **Direction du propriétaire (28 octobre)** : c'est un site juridique, il doit garder un **ton juridique**. Les couleurs sont sobres et professionnelles, propres à un service juridique. Les textes sont formels et rigoureux. Proportion voulue : **99 % réel et juridique, 1 % d'IA**. L'IA est la touche discrète qui distingue la plateforme et en fait l'avenir des plateformes juridiques; elle n'est jamais le thème visuel ni le ton général. Pas d'esthétique futuriste ou robotique.
> - **Aucun agent ne modifie** `www/`, la page de demande du portail (`platform/public/demande.*`), WordPress ou le DNS sans instruction écrite du propriétaire. Une autre session travaille en parallèle : vérifier GitHub avant toute action et ne pas écraser son travail.
> - Le WordPress en ligne est intact : vérifié le 28 octobre, thème Astra, extension 0.2.2, DNS toujours chez MochaHost, rien n'a été basculé.
> - Ni la copie de `www/` d'avant la refonte (`a27f70f`) ni celle d'après (`0e457cd`, `c00ead5`) ne reproduisent le design WordPress : seuls les textes et les liens ont été repris, dans un gabarit fait par l'agent. Rien n'est annulé par l'agent : le propriétaire décide.

**Premier fichier à lire : [REPRISE-SUIVANTE-2026-10-26.md](REPRISE-SUIVANTE-2026-10-26.md)**, dont la section du 27 octobre.

**Priorité : rendre l'accès personnel au backend réellement utilisable avant de poursuivre la vitrine.** État documentaire vérifié le 26 octobre 2026; aucun nouveau déploiement réalisé par cette mise à jour.

## État des trois surfaces

| Surface | Fait vérifié | Ce qui reste ouvert |
|---|---|---|
| `besoinavocat.ca` | WordPress HTTPS chez MochaHost; installation 0.2.1 réussie par l'interface WP, après contrôle visuel de la 0.2.0; aperçu `tableau-de-bord` conservé | **0.2.2 installée** le 27 oct. : bloc prix non recouvert, CTA 1839 sans saut ni piège clavier sur l'accueil, contrôle officiel 24/24. Parcours « Trouver mon avocat » en boucle sans formulaire ([inventaire](WORDPRESS_CTA_INVENTORY.md)); funnel désactivé |
| `www/` (future vitrine) | **Copie complète du site WordPress dans GitHub**, le 27 oct. : 348 pages, mêmes adresses, aucun script. Contrôle 0 erreur; 36 741 / 36 835 phrases en ligne retrouvées; image nginx testée; CI « Storefront checks » verte sur `adde5c2` ([STOREFRONT](STOREFRONT.md)) | Pas encore servie. Application Coolify et bascule DNS par le développeur du propriétaire, courriel détaché d'abord. Politique de confidentialité à rédiger. **Refonte « plateforme IA » et relecture faites le 27 oct. (D-022)** : voir la section « Preuves de la refonte » ci-dessous |
| `portail.besoinavocat.ca` | Première version technique Node/Passenger joignable; contrôle HTTP courant health 200 (`mode: pilot`, `identityConfigured: false`), dossiers anonymes 401 | Archive v2 avec connexion/corpus refusée par antivirus; pas de connexion utilisateur réelle ni de corpus distant actif validé |
| `besoinavocat.onrender.com` | Site d'orientation statique distinct, service Render actif sur `main` | Ne fournit pas le backend ni les dossiers; ne pas déplacer le domaine WordPress vers Render |

## Preuves de la refonte du 27 octobre (D-022)

Contrôles faits sur la construction finale, localement, avant le push :

- `node www/tools/check-site.mjs` : 350 pages, **0 erreur** (titres, h1, descriptions, liens internes, images, texte importé présent).
- **Les 349 pages** rendues dans Chromium à 390 px :
  - HTTP 200, aucune erreur de console ni ressource en échec;
  - aucun débordement horizontal, et aucun non plus à 320 px sur les pages les plus chargées;
  - **0 violation axe-core 4.10 WCAG 2.1 A/AA** (les avertissements de bonnes pratiques signalés ont aussi été corrigés).
- Conteneur nginx réel, sous sa CSP stricte : aucune violation, les trois polices chargées, en-têtes et redirections vérifiés, accueil de 14 Ko compressé.
- Conteneur du portail : `healthy`, polices servies, catalogue `2026-10-27.2`. Une demande synthétique avec la région `ontario` reçoit 201 et une référence; renvoyée avec la même clé, elle redonne la même référence, avec une seule ligne en base.
- Tests : 12 Node du site, 132 Node portail et module WordPress, 3 suites PHP, tests Python du paquet et de la sauvegarde.
  - Le test du lanceur Passenger exige Node 24.19 et passe en CI, pas sur le Node 22 local.
  - Le contrôle des 27 liens externes est consigné dans [CONTENT_CORRECTIONS](CONTENT_CORRECTIONS.md).
- Comparaison au site WordPress en ligne : 36 587 phrases sur 36 835 sont identiques; l'écart correspond aux 141 corrections documentées.
- Ce n'est pas une certification WCAG ni un test avec lecteur d'écran physique.

## Backend : réalisé et restant

Le code de `platform/` inclut les sessions navigateur TAKATAK via son fournisseur confirmé, les grants explicites et droits par dossier, les sessions SQLite chiffrées partagées entre workers, les pièces/versions avec SHA-256 et provenance, la recherche littérale avec citations par page, les échanges, le temps soumis à validation indépendante et le journal d'audit. Ce code ne prouve pas son activation sur l'hébergement.

Le corpus a été importé localement dans trois dossiers distincts. La sauvegarde applicative a été vérifiée puis restaurée localement avec contrôle SQLite, tailles et empreintes. Une copie privée de cette sauvegarde a été reçue chez MochaHost avec empreinte concordante. **Copie distante de sauvegarde seulement : aucune restauration ni activation du corpus dans le portail distant.** Les occurrences communes ne s'additionnent pas comme de nouvelles pièces; les déclarations, analyses, OCR et vérifications ouvertes gardent leur statut. Les originaux et le paquet de 312 annexes ne sont pas modifiés.

MochaHost a refusé le paquet `besoinavocat-cpanel-2026-10-26-v2.zip` avec `Sanesecurity.Foxhole.JS_Zip_11.UNOFFICIAL FOUND`. Son SHA-256 est `6593ad7db2028e63f22809a1d23f1334d1fb3c3f4283786730738c2e9923c71c`. Le rejet n'est pas résolu par les tests du code. L'analyse du paquet exact par l'hébergeur reste attendue; aucune neutralisation de l'antivirus ou autre méthode d'installation pour esquiver le contrôle n'est autorisée. La recherche courriel ciblée rapportée lors de cette reprise n'a pas retrouvé de réponse concernant l'archive; elle ne prouve pas l'absence de toute réponse par une autre voie.

Les paramètres serveur et fichiers privés ont été préparés selon les reçus, mais la première version technique n'exploite pas encore le nouveau raccordement. **Aucune connexion réelle de l'utilisateur, consultation de ses dossiers en production ou configuration de son mot de passe n'est déclarée effectuée.** Les futurs essais doivent utiliser son identité TAKATAK existante et ses habilitations, sans nouvelle autorité d'identité ou permission implicite.

Le code du parcours/formulaire (`intake` / `funnel`) est préparé et testé; son module WordPress est inclus dans la 0.2.1 installée, mais **le funnel reste désactivé** et le service de réception Node n'est pas activé. Aucune collecte réelle, paiement ou réussite de formulaire n'en découle. Voir [TASK_QUEUE](TASK_QUEUE.md).

## Dernier contrôle CI du code

Code `5a230e52c758a626f31be24abeef2cce5242b3c1` : les quatre runs sont réussis, avec **133 tests Node, 12 tests Python et trois suites PHP**.

- [Quality — 40421216083](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40421216083).
- [Platform PR — 40421216013](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40421216013).
- [Browser — 40421215940](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40421215940).
- [Platform push — 40421210422](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40421210422).

Ces contrôles ne valident ni une connexion réelle au portail ni le rendu final du bloc prix 0.2.1. La mise à jour documentaire présente ne crée aucun commit ou déploiement.

## Contrôle GitHub et Render préalable — historique conservé

- `main` : `b56d027c4172ddde5e362497731ac1ae80805fe0`.
- Branche `codex/espace-client-avocat` : `ee278313707bbec608c15df11e402decce66f7ee`, identique entre copie locale et distante lors de la lecture; trois commits d'avance, aucun retard, 57 fichiers différents et aucun changement dans `site/`.
- [PR 1](https://github.com/takatakca/BESOINAVOCAT.CA/pull/1) ouverte en brouillon; aucune issue retournée par la recherche.
- Au SHA `ee27831`, [Quality checks](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40305370703), [Browser QA](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40305370666) et [Platform pilot checks](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40305370653) sont réussis. Ces résultats ne couvrent pas les modifications locales ultérieures.
- Render : service `srv-db7srnmi0phs73ahkue0`, déploiement `dep-db8qsb6k1f9s73epefs0` **live au SHA de main**, publication de `site/`, déploiement automatique depuis `main` actif.
- [Smoke public du 26 octobre](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40362705338) réussi. Il vérifie le site Render, pas la connexion ou le corpus MochaHost.

## Vitrine et contenu préservés

L'export WordPress préalable comportait 348 pages, dont 347 publiées; il précède la création de l'aperçu. La sauvegarde privée et l'export restent hors Git. Les corrections ciblées ont porté sur les anciennes marques d'opérateur et des promesses promotionnelles injustifiées, sans supprimer les articles, URL ou informations documentaires. Les noms de cabinets cités à titre éditorial ne deviennent pas des partenaires.

Historiquement, le plugin 0.1.2 et la page 5820 avaient été contrôlés sur ordinateur, avec trois lint PHP et `check-render.php` réussis. La 0.2.0 a ensuite été installée et contrôlée visuellement : tarifs 100/300 CAD et corrections des articles 2186, 4663, 5082 et 5715. **La 0.2.1 est maintenant installée avec succès par l'interface WP**; elle remet le CTA orange dans le flux normal pour corriger sa superposition aux prix. Le bloc prix a été contrôlé sur le site réel le 27 octobre : non recouvert de 320 à 1440 px. Le CTA 1839 provoque en revanche un saut en fin de page et un piège clavier; le correctif 0.2.2 est **installé** et réussit le contrôle officiel 24/24 ([WORDPRESS_QA](WORDPRESS_QA.md)). Le funnel reste désactivé. Les contrôles mobiles, clavier et FR/EN ne sont pas déduits des tests CI. Téléphone de contact : **514-825-2825**, sans service automatisé activé. Yan Romanowski est le seul partenaire déclaré par le propriétaire; cette déclaration n'est pas une vérification professionnelle indépendante.

## Conditions commerciales et limites

- Demandes clients toujours gratuites, sans condition d'engagement avec un avocat.
- Offre professionnelle : **100 CAD/semaine ou 300 CAD/mois**.
- **Crédits IA en supplément**; honoraires juridiques distincts.
- Paiements, abonnements, crédits IA, voix et services automatisés non activés. Aucune facturation ou souscription implicite.

Les anciens nombres de tests et mentions « aucune application créée » présents dans les états antérieurs décrivent des étapes précédant `ee27831`; ils ne doivent plus guider la reprise. La clôture du prochain lot exige une connexion réelle, des accès correctement isolés, des téléchargements et citations vérifiés, puis un contrôle de déconnexion, sans exposer de secrets ou de pièces dans les journaux.

## Clôture du lot contact et WordPress 0.2.1

Installation WordPress 0.2.1 réussie; funnel désactivé; contrôle visuel final des prix ouvert. Le Node v1 reste à `identityConfigured: false`; v2 refusée par l'antivirus, sans contournement. Aucun accès réel au corpus n'est validé. CI du code verte, y compris PHP; voir [INTAKE_QA.md](INTAKE_QA.md) et [WORDPRESS_QA.md](WORDPRESS_QA.md).
