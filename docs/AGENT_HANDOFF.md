# AGENT_HANDOFF — BESOINAVOCAT.CA

**Suite du 28 octobre — recherche et dictée :** [validation du second lot](VALIDATION-RECHERCHE-2026-10-28.md). 231 tests Node réussis, recherche globale autorisée et citations, dictée au clic, lecteur amélioré. Trois documents de travail ajoutés dans une nouvelle copie privée du corpus (1 362 occurrences / 1 185 empreintes / 3 101 unités), sauvegarde et restauration contrôlées. La [PR 2](https://github.com/takatakca/BESOINAVOCAT.CA/pull/2) est **fusionnée dans `main` le 28 octobre 2026**, au commit `348d626b76d4adcd874cc7485d2e744006b249c9`. **Configuration du serveur en cours, recette login/corpus non validée.** Le microphone physique reste à essayer; IA générative non connectée.

**État figé — 29 octobre 2026, 03:18 UTC :** [instance HTTPS de test](https://fluzlqgkhifrgkmygknj4mjj.31.220.96.134.sslip.io) déployée; dernier health confirmé : 200, `mode:pilot`, `identityConfigured:false`, `loginConfigured:false`, `intakeConfigured:true`, demandes désactivées. Volume privé `/data` créé. Après activation de l’accès aux fichiers locaux, la deuxième tentative de téléversement a échoué par perte de connexion à l’extension Chrome; la reconnexion est demandée. **Transfert non confirmé; aucune installation du corpus, des grants, de la clé de session ou des variables de connexion TAKATAK/Supabase confirmée.** Procédure privée de restauration prête, non exécutée. Recette login/corpus non validée. [État et suite](COOLIFY.md#état-de-lessai-distant--28-octobre-2026).

> **28 octobre 2026 — ARRÊT SUR LA VITRINE : le propriétaire la reprend lui-même, en ce moment.**
> - La refonte « plateforme IA » du 27 octobre (D-022) est **refusée** par le propriétaire (D-023).
> - Ce qu'il voulait : reproduire fidèlement le design qu'il a construit à la main sur WordPress, détail par détail, en changeant **seulement les couleurs** pour ne pas ressembler à un autre de ses sites.
> - **Direction du propriétaire (28 octobre)** : c'est un site juridique, il doit garder un **ton juridique**. Les couleurs sont sobres et professionnelles, propres à un service juridique. Les textes sont formels et rigoureux. Proportion voulue : **99 % réel et juridique, 1 % d'IA**. L'IA est la touche discrète qui distingue la plateforme et en fait l'avenir des plateformes juridiques; elle n'est jamais le thème visuel ni le ton général. Pas d'esthétique futuriste ou robotique.
> - **Aucun agent ne modifie** `www/`, la page de demande du portail (`platform/public/demande.*`), WordPress ou le DNS sans instruction écrite du propriétaire. Une autre session travaille en parallèle : vérifier GitHub avant toute action et ne pas écraser son travail.
> - Le WordPress en ligne est intact : vérifié le 28 octobre, thème Astra, extension 0.2.2, DNS toujours chez MochaHost, rien n'a été basculé.
> - Ni la copie de `www/` d'avant la refonte (`a27f70f`) ni celle d'après (`0e457cd`, `c00ead5`) ne reproduisent le design WordPress : seuls les textes et les liens ont été repris, dans un gabarit fait par l'agent. Rien n'est annulé par l'agent : le propriétaire décide.

**Périmètre coordonné du présent lot :** la demande écrite de ce chat autorise le backend et les questionnaires fonctionnels. Aucun rendu de la vitrine n’est redessiné ni déployé. Les notes concurrentes de `main` (`fb992d6`) sont conservées. Les changements de la branche de livraison ont été intégrés par la PR 2; la configuration du serveur reste en cours.

**Historique du premier lot du 28 octobre, désormais intégré :** [preuve et limites](VALIDATION-LOT-2026-10-28.md). 200 tests Node, 14 tests Python, questionnaire FR/EN, rendez-vous/usages, catalogue optionnel sans paiement, inventaire des contenus. Le déploiement et la connexion réelle restent à faire avec Mike; la présentation est réservée au propriétaire.

## Reprise prioritaire — 28 octobre 2026

Le propriétaire a repris le travail : la consigne historique d'arrêt ci-dessous est levée. **Plus de WordPress dans la cible**; contenus importés dans `www/` et portail Node dans `platform/`. Le développeur humain est disponible pour Coolify/DNS : [sa liste](DEV-A-FAIRE-2026-10-28.md), avec contrôles live du 28 octobre et restauration détaillée [COOLIFY](COOLIFY.md).

La PR 2 est fusionnée dans `main` au SHA `348d626b76d4adcd874cc7485d2e744006b249c9`. La base `e59a9e084966a649d260ff917d756823ff4558c4` et la branche `codex/workspaces-appels-2026-10-28` décrivent la préparation historique; ne pas rouvrir la PR pour intégrer ce lot. **Configuration du serveur en cours, recette login/corpus non validée.**

Le site d’orientation Render, dont le contenu `site/` est inchangé, a été republié au commit `348d626b76d4adcd874cc7485d2e744006b249c9`; les sept URL du smoke public passent. Ce contrôle ne valide pas le portail Node ni les dossiers privés.

Le contrôle distant antérieur à la configuration, le 28 octobre, renvoyait health 200 mais `/demande` 404 et identité Bearer non configurée. Tester `loginConfigured`, puis la vraie connexion : ne jamais annoncer le compte prêt sur un aperçu fictif. Préserver la sauvegarde/corpus privés hors Git et la remise figée des 312 annexes.

Le tri courriel a été effectué séparément dans le OneDrive privé le 28 octobre : 22 messages classés, 9 promotions mises à la corbeille de façon réversible, deux exports avec distinction envoyé/brouillon. Un seul compte accessible; deuxième compte et ChatGPT non contrôlés dans ce lot. Manifestes privés dans `00_DOSSIER_MAITRE/99_Travail_et_collecte/Reprise_2026-10-28`, pas de nouvelle preuve de pertes affirmée.

**Historique de clôture du 26 octobre :** [REPRISE-SUIVANTE-2026-10-26.md](REPRISE-SUIVANTE-2026-10-26.md). La consigne « notes seulement, puis arrêt » de cette étape est remplacée par la reprise active du 28 octobre.

## Reprise courante — 26 octobre 2026

**Faire fonctionner le backend et l'accès du propriétaire avant de poursuivre la vitrine.** Préserver le travail existant : WordPress sur besoinavocat.ca, portail Node distinct sur portail.besoinavocat.ca, orientation Render sur besoinavocat.onrender.com. Ne pas reconstruire l'application ou déplacer WordPress vers Render.

### État de référence vérifié

- Code de référence CI : `5a230e52c758a626f31be24abeef2cce5242b3c1`; Quality 40421216083, Platform PR 40421216013, Browser 40421215940 et Platform push 40421210422 verts. 133 tests Node, 12 Python et trois suites PHP réussis; liens dans [PROJECT_STATUS](PROJECT_STATUS.md).
- Historique Git préalable conservé : `main` était à `b56d027c4172ddde5e362497731ac1ae80805fe0` et `codex/espace-client-avocat` à `ee278313707bbec608c15df11e402decce66f7ee`, trois commits d'avance, sans retard, avec [PR 1](https://github.com/takatakca/BESOINAVOCAT.CA/pull/1) en brouillon. Ces anciens pointeurs ne décrivent pas le nouveau code CI; relire l'état courant à la reprise.
- Render réel : service `srv-db7srnmi0phs73ahkue0`, dernier déploiement `dep-db8qsb6k1f9s73epefs0` live au SHA de `main`, publication de `site/`, autoDeploy actif. Le smoke du 26 octobre réussit.
- WordPress : **0.2.1 installée avec succès via l'interface WP**. La 0.2.0 avait été contrôlée visuellement pour les tarifs 100/300 CAD et les articles 2186/4663/5082/5715. La 0.2.1 corrige la superposition du CTA orange aux prix par un CSS dans le flux normal; **contrôle visuel final du bloc prix à faire**. Funnel désactivé; aperçu et contenus/URL conservés. Le téléphone 514-825-2825 est un contact, pas une voix automatisée.
- **Portail Node créé** chez MochaHost, Node 24.22.1/Passenger/HTTPS. Le recontrôle HTTP courant obtient health 200 (`mode: pilot`, `identityConfigured: false`) et dossiers anonymes 401. Les anciens contrôles `/.env` et `/server.mjs` étaient 404. Cela ne prouve pas l'exploitation des dossiers réels.
- **V2 connexion/corpus non installée** : archive refusée avec `Sanesecurity.Foxhole.JS_Zip_11.UNOFFICIAL FOUND`. SHA exact `6593ad7db2028e63f22809a1d23f1334d1fb3c3f4283786730738c2e9923c71c`. Aucun contournement ou validation de l'hébergeur n'est constaté dans les preuves lues; la recherche courriel ciblée n'a pas retrouvé de réponse concernant l'archive.
- Corpus des trois dossiers importé localement; sauvegarde vérifiée et restaurée localement. Copie de sauvegarde privée distante reçue avec empreinte concordante, **sans restauration/activation distante**. Les originaux et 312 annexes restent inchangés.
- Configuration d'identité et stockage privé préparée selon les reçus; **aucun test réel de connexion utilisateur ni de consultation du corpus en production**. Ne pas dire que le mot de passe a été configuré. Réutiliser l'identité TAKATAK et les habilitations explicites, pas un compte WordPress parallèle.

### Sources à lire avant action

Lire d'abord `docs/REPRISE-SUIVANTE-2026-10-26.md`, puis `docs/PROJECT_STATUS.md`, `docs/TASK_QUEUE.md`, `docs/DEPLOYMENT.md`, `docs/CPANEL_NODE.md`, `docs/BROWSER_AUTH.md`, `docs/PLATFORM_QA.md` et `docs/DECISIONS.md`. Dans l'espace de travail privé autorisé, le reçu `scripts/.build-livrables/node-portal-2026-10-26/ETAT-PORTAIL-2026-10-26.md` détaille le refus MochaHost, l'import local, la copie distante et les contrôles HTTPS. Il n'est pas un fichier du dépôt public; ne pas y copier ses sauvegardes, grants, clés ou pièces.

### Prochaine action exacte

0. **Vitrine (27 oct., D-021 et D-022)** : la PR 1 a été fusionnée par le propriétaire (`a27f70f`), puis `main` a avancé en avance rapide jusqu'à `050653c`. Ce commit contient la refonte, avec CI verte sur `main` (Quality, Browser QA, Platform, Storefront, smoke de production). Le déploiement Coolify automatique reste désactivé. Suite de la vitrine : refonte « plateforme IA », relecture ([CONTENT_CORRECTIONS](CONTENT_CORRECTIONS.md)) et Ontario ajoutés à la demande. Ne pas annoncer une fonction d'IA comme active avant son raccordement et son test. le site complet est prêt dans `www/` (CI verte sur `adde5c2`). La suite revient au développeur du propriétaire, dans l'ordre de [STOREFRONT](STOREFRONT.md) :
   1. détacher le courriel, car le MX pointe sur le domaine;
   2. déployer le portail sur Coolify et basculer `portail`;
   3. déployer la vitrine et basculer l'enregistrement A du domaine;
   4. vérifier.
   Un agent ne modifie ni le DNS ni WordPress. Il contrôle les adresses après la bascule et met à jour le contenu dans `www/content/`. Relancer `node www/build.mjs && node www/tools/check-site.mjs` après toute modification.
1. Lire la note de reprise, dont la section du 27 octobre, et vérifier l'état courant du code sans remplacer les travaux d'autres agents. La 0.2.2 est installée et réussit `node scripts/wordpress-cta-qa.mjs` (24/24); relancer ce contrôle après toute nouvelle version du plugin. Funnel toujours désactivé. Les tests de code ne prouvent pas le circuit de réception réel.
2. Obtenir la résolution documentée du refus antivirus sur le paquet exact. Ne pas désactiver la protection, changer de format pour l'esquiver ou installer autrement un paquet refusé.
3. Après résolution, installer le code validé en conservant la version précédente. Relire manifeste/SHA et configuration privée, puis vérifier health, assets, HTTPS, refus anonymes et inaccessibilité des fichiers privés.
4. Faire connecter le propriétaire avec son compte TAKATAK existant. Ne pas conserver ni afficher son mot de passe, cookie ou jeton; ne pas déduire des permissions de son email. Vérifier les grants et l'accès réellement autorisé.
5. Restaurer la sauvegarde vérifiée dans une nouvelle destination privée et contrôler l'état de la base technique avant bascule. Vérifier tailles/SHA, SQLite, dossiers, citations et téléchargements; ne pas écraser une base active ou copier une base WAL seule.
6. Contrôler déconnexion, refus d'accès indu et limites de périmètre. Ensuite seulement, raccorder la vitrine au portail réellement utilisable et poursuivre les formulaires/FR-EN.

### Conditions et préservation

Demandes clients toujours gratuites. Tarifs professionnels décidés : **100 CAD/semaine ou 300 CAD/mois**, **crédits IA en supplément**; honoraires juridiques distincts. Aucun paiement, abonnement, crédit ou assistant vocal actif n'est établi. L'affichage ne doit pas simuler une souscription.

Préserver originaux, preuves contraires, articles, informations documentaires, URL et codes. Retirer seulement les anciennes marques d'opérateur ou affiliations promotionnelles injustifiées, sans effacer les noms utiles aux pièces ou articles. Les OCR et déclarations gardent leur provenance et leurs réserves; les doublons ne s'additionnent pas.

### Contrôles de livraison

Suivre AGENTS.md et les tests des fichiers réellement modifiés. La CI au SHA `5a230e52c758a626f31be24abeef2cce5242b3c1` est verte : 133 tests Node, 12 Python et trois suites PHP. Elle ne remplace pas le contrôle visuel final des prix 0.2.1, les essais du funnel désactivé ou l'accès distant réel. Les anciens comptes de 49 tests et le stade « import préparatoire seulement » sont historiques.

Aucun Git, déploiement, envoi, compte, mot de passe ou nouvelle permission n'a été modifié par cette reprise documentaire.

## Historique conservé — 16 octobre 2026

Les statuts et instructions de cette archive décrivent le site statique à cette date. La reprise courante ci-dessus prévaut; ne pas réexécuter une ancienne tâche déjà réalisée.

Les instructions et statuts ci-dessous décrivent l'ancienne livraison d'orientation. Pour le nouveau mandat, appliquer la reprise courante ci-dessus.

**Date historique : 16 octobre 2026** · Dépôt `takatakca/BESOINAVOCAT.CA` · Branche `main`.

## Dernière tâche terminée
- BA-007 (partie automatisée) : tests Chromium mobile, clavier, formulaire, erreurs, impression, captures et revue visuelle.
- Défauts identifiés et corrigés : symbole central masqué (`22e8970`) et titres d'engagements trop grands (`2cd5be9`).
- Dernier commit de code réellement validé : `2cd5be9990b8671c5189303c4315aff5c02671b8`. Le commit de documentation contenant ce rapport est ultérieur; le SHA HEAD exact se lit depuis GitHub.

## Vérifications réalisées
- GitHub : arbre de `main`, derniers commits, PR ouvertes (0), issues ouvertes (0), workflows et permissions vérifiés.
- Node Quality checks **success** : run `38852776970`.
- Browser QA Chromium **success** : run `38852776863` (320, 375, 768, 1440 px, clavier, formulaire, CSS print, sans JS errors).
- Production HTTPS smoke **success** : run `38852826709`.
- Render deploy **live** au SHA `2cd5be9` : `dep-db8qqms9v7es7397801g`.
- Captures finales de desktop et mobile inspectées; symbole § visible et titres compacts. Détails `docs/QA_REPORT.md`.
- Commandes couvertes par CI/QA : `node --check site/app.js`, `node --check site/guide.mjs`, `node --test tests/*.test.mjs`, `python scripts/browser_qa.py`, `node scripts/production-smoke.mjs`.

## Tâche actuellement en cours
- BA-007 reste ouverte uniquement pour une validation humaine NVDA/VoiceOver, appareils physiques, Safari/Firefox et audit d'accessibilité complet.
- BA-008 était bloquée le 16 octobre; elle est **obsolète depuis le 26 octobre**. Le WordPress HTTPS confirmé chez MochaHost doit rester en place.
- BA-009/BA-010 : décisions métier et conformité avant comptes, annuaire ou traitement de dossiers.

## Fichiers modifiés
- Créés : `scripts/browser_qa.py`, `requirements-qa.txt`, `.github/workflows/browser-qa.yml`, `docs/QA_REPORT.md`.
- Modifiés : `site/styles.css`, `.gitignore`, `AGENTS.md`, `README.md` et les cinq fichiers `docs/PROJECT_STATUS.md`, `TASK_QUEUE.md`, `AGENT_HANDOFF.md`, `DEPLOYMENT.md`, `DECISIONS.md`.

## Blocages et accès nécessaires
- GitHub push `main` et Render lecture/déploiement fonctionnent; hébergement Render `https://besoinavocat.onrender.com` avec autoDeploy.
- Constat historique du 16 octobre : accès DNS/registrar non confirmé. Il ne doit plus conduire à proposer un raccordement du domaine WordPress à Render.
- Définition et approbation du périmètre juridique et de la protection des données obligatoires avant profils professionnels, comptes TAKATAK ou mise en relation.
- Ne pas créer de faux professionnels, de collecte de données confidentielles, de backend payant ou de seconde identité.

## Prochaine action exacte
1. Lire `AGENTS.md`, ce fichier, `docs/TASK_QUEUE.md`, `docs/QA_REPORT.md`.
2. Lire SHA HEAD, CI, Browser QA, smoke et Render du dernier commit; distinguer commit de code et commit documentaire.
3. Réaliser la partie humaine BA-007 sur NVDA/VoiceOver et appareils réels, corriger les défauts prouvés.
4. Instruction historique annulée le 26 octobre : ne pas raccorder `besoinavocat.ca` à Render; suivre la reprise courante pour le portail distinct.
5. Conserver en attente BA-009/BA-010 avant de commencer annuaire, comptes ou dossiers juridiques.

## Clôture du lot contact et WordPress 0.2.1

WordPress 0.2.1 installé avec succès; contrôle visuel final du bloc prix ouvert et funnel désactivé. Backend v1 à `identityConfigured: false`; v2 bloquée par l'antivirus, sans contournement. Aucun accès réel au corpus validé. Voir [INTAKE_QA.md](INTAKE_QA.md) et [WORDPRESS_QA.md](WORDPRESS_QA.md).
