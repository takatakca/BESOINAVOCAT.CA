# AGENT_HANDOFF — BESOINAVOCAT.CA

## État de remise du lot local — 30 octobre 2026, 11:34 UTC

**Le portail reste à rétablir par Mike ou l'agent serveur**, désigné par le propriétaire. Dernier contrôle public disponible : réponses 503 à 11:22:04 UTC, avec validation TLS normale. L'agent chargé des dossiers ne poursuit pas d'intervention sur le VPS; la [fiche de diagnostic](INCIDENT-COOLIFY-2026-10-30.md) et l'alerte de coordination lui ont été transmises. Aucun retour de disponibilité confirmé.

**Rattachement réparé avant l'incident :** même propriétaire et produit, trois dossiers accessibles au contrôle serveur, base inchangée (1 362 documents / 3 101 unités). La reconnexion et la recette authentifiée après correction restent ouvertes. **CNESST v2 :** paquet privé testé sur une copie, donnant **4 dossiers / 1 368 documents / 3 128 unités**; aucune importation serveur confirmée.

**Vitrine :** corrections locales des deux images, du lien contact et des formulaires historiques; contenu source préservé. Revue indépendante effectuée, défaut du contrôle de formulaires corrigé et **10/10 tests** réussis. Contrôle visuel de la page professionnelle sur ordinateur effectué, capture privée conservée. La vitrine n'est pas créée sur Coolify et aucun DNS n'est modifié. Publication GitHub, CI et réception distante doivent être consignées par le principal avant d'annoncer une livraison en ligne.

[Réception détaillée et suites](RECEPTION-RATTACHEMENT-2026-10-30.md). Priorité : rétablissement VPS, recette des trois dossiers, import CNESST contrôlé, puis vitrine et bascule DNS avec courrier préservé.

## Historique — alerte consignée à 11:24 UTC

**Le portail est actuellement indisponible.** Le contrôle HTTPS avec validation TLS normale du **30 octobre à 11:22:04 UTC** renvoie 503 pour la page, les ressources et les routes contrôlées; la santé renvoie du HTML au lieu du JSON attendu. Coolify présente aussi des erreurs 500 (limite mémoire de 256 Mio) et 504 sur ses vues. La cause de l'incident n'est pas établie; aucun déploiement concurrent ne doit être désigné comme cause sans preuve.

Le rattachement historique a été réparé **avant** cet incident et le contrôle serveur avait trouvé trois dossiers accessibles; cela ne prouve ni leur affichage après reconnexion ni l'état courant du service. L'accès à la console VPS a été demandé et une alerte de coordination a été envoyée au seul compte du propriétaire. **Priorité : rétablir l'hôte et vérifier le portail avant de reprendre l'import CNESST ou la bascule de vitrine.** Aucun changement DNS ni pièce juridique d'origine par cet incident de contrôle. [Réception et preuves](RECEPTION-RATTACHEMENT-2026-10-30.md) · [Fiche pour l'intervenant VPS](INCIDENT-COOLIFY-2026-10-30.md).

## Historique — point consigné à 11:15 UTC

**Rattachement serveur corrigé, recette utilisateur en attente.** La session active affichait zéro dossier, mais la base active contient bien **trois dossiers, 1 362 documents et 3 101 unités**. Après sauvegarde privée, le seul rattachement d'espace du propriétaire historique a été restauré à l'identique de l'original vérifié : contrôle serveur **3 dossiers accessibles**, fichier en mode 0600, compteurs inchangés. Aucune nouvelle identité ou appartenance créée. La reconnexion est demandée; l'affichage et l'ouverture des pièces après correction restent à confirmer.

**CNESST :** six PDF / 27 pages préparés localement avec provenance; import serveur encore à faire. **Courriel :** TWILO annonce la résolution via Resend à 10:43 UTC et une session active a été observée; les anciennes consignes Maileroo ci-dessous sont historiques, à ne pas réappliquer sans recontrôle. **Vitrine :** WordPress reste public; une ressource Coolify distincte pour `www/` est en préparation. Séparer le courrier de l'apex avant la bascule DNS. Aucune bascule de vitrine confirmée.

Priorité : vérifier la nouvelle session et ses pièces, importer puis contrôler CNESST, déployer et contrôler la copie `www/`, ensuite effectuer la bascule avec continuité du courrier. [Réception détaillée, preuves et limites](RECEPTION-RATTACHEMENT-2026-10-30.md). Le workspace déjà déployé au SHA `a3e20cc` reste inchangé par cette correction.

## Historique — point consigné à 09:52 UTC

**Les cinq correctifs du workspace sont déployés**, au `main` `a3e20ccbadd182fb819337c79e5b931060316af0`, après fusion de la [PR 10](https://github.com/takatakca/BESOINAVOCAT.CA/pull/10). Coolify `ocvuihsmpnffpbabg07r5ekh` affiche **Success** (48 s), application saine à 09:50:48 UTC. Le contrôle HTTPS du 30 octobre à 09:51:42.941 UTC, avec validation TLS normale, obtient 200 pour la page, la santé et les trois fichiers publics; leurs empreintes correspondent exactement à ce `main`. Les dossiers anonymes restent refusés en 401 et trois chemins privés en 404. Ces preuves de déploiement ne confirment pas la connexion réelle.

**Cause de non-réception confirmée à 09:40 UTC : blocage Maileroo du domaine de test.** Trois messages destinés au propriétaire sont marqués « Suppressed »; l'événement consulté indique un destinataire hors liste autorisée. Son ajout a été refusé car le nombre maximal de destinataires autorisés du domaine de test est atteint; aucune entrée existante n'a été supprimée. Le domaine propre `takatak.ca` est encore inactif, avec vérification DNS SPF/DKIM incomplète. Le quota d'envoi affiché n'est pas consommé : ce refus ne vient pas de ce quota. [Diagnostic et voie de résolution](DIAGNOSTIC-ENVOI-2026-10-30.md). Le blocage fournisseur reste non résolu; réception du code et consultation authentifiée des trois dossiers toujours non confirmées. Aucun DNS ni paramètre SMTP n’a été modifié; aucun nouvel OTP n’a été envoyé. L’ouverture du DNS par le propriétaire ou l’application de la fiche privée par Mike reste en attente.

**Fiabilité livrée :** caméra après fermeture/remplacement, éditeur pendant le chargement, sauvegarde de l’éditeur, réponse tardive d’envoi vidéo et décompression DOCX bornée. Code `7a920ee`, notes `c272e49`, puis fusion `a3e20cc`. Contrôles : **276/276 tests plateforme**, dont **10 de fiabilité inclus**, **12/12 tests du site**, revue indépendante sans bloqueur et QA sur données fictives (éditeur au tiers de l’écran, export DOCX réel). Les six contrôles de la PR sont réussis au SHA `c272e49`; après fusion, validation, Chromium, vitrine, plateforme et smoke de `main` réussissent. Les tâches de déploiement CI ont été ignorées; le déploiement Coolify a été lancé et contrôlé séparément.

Lire le [journal des agents](JOURNAL-AGENTS.md), puis la [réception du 30 octobre](RECEPTION-2026-10-30.md) avant de reprendre. Les notes des autres agents restent en ajout seul. Les correctifs sont fusionnés et déployés; leur publication ne doit pas être répétée à partir des états historiques. Vérifier le nouveau main avant toute suite et conserver les changements concurrents. La résolution du blocage Maileroo reste la priorité d'accès utilisateur.

[Vision premium conservée](VISION-PREMIUM-2026-10-29.md) : orientations non activées; portions workspace D-029 déjà livrées. La copie locale récupérée ne crée aucun service externe ni dépense. Préserver vitrine, droits, originaux et 312 annexes.

## Historique documentaire — états antérieurs au contrôle du 30 octobre

Les anciennes indications « code non déployé », « DNS à basculer » et « Redeploy à faire » ci-dessous sont historiques pour le portail. Utiliser l'état vérifié et la réception ci-dessus avant toute opération.

**État historique consigné — 29 octobre 2026 (soir), espace de travail premium (D-029, BA-037) :** pièces en tuiles avec glisser-déposer, visionneuse plein écran / tiers / coin, bouton vert « Appeler mon avocat » (réunion Zoom prévue ou demande de rappel au dossier, sans téléphonie), messages vidéo, éditeur Word `.docx`, annotation d'image avec repères et légende, présentation `.pptx`, navigation mobile par glissement. Guide et preuves : [ESPACE-DE-TRAVAIL](ESPACE-DE-TRAVAIL.md). Tests 242/242 portail et 12/12 site; QA Chromium ordinateur et mobile sans erreur, axe A/AA sans violation. Livré par la [PR 7](https://github.com/takatakca/BESOINAVOCAT.CA/pull/7). **Pas encore en ligne :** après la fusion, le portail Coolify doit être redéployé (bouton Redeploy ou déploiement automatique, voir [DEPLOYMENT](DEPLOYMENT.md)); `portail.besoinavocat.ca` attend toujours la bascule DNS de Mike (DEV-A-FAIRE §3.4). IA, téléphonie et facturation à l'heure restent à connecter.

**État historique consigné — 29 octobre 2026, connexion à corriger :** la [PR 3](https://github.com/takatakca/BESOINAVOCAT.CA/pull/3) est fusionnée au SHA `ad8e2f4a31ebdafee2bc56acd36e861652d4623c`, six contrôles réussis, avec la réception et le correctif de sauvegarde des cinq tables d’intégration. Le serveur reste au SHA `efef692`; l’accès utilisateur réel n’est pas validé. TAKATAK utilise son propre code courriel/SMS, alors que ce portail demande encore un mot de passe. Le correctif de code courriel Supabase sur `codex/connexion-code-courriel` a réussi 233/233 tests du portail, 12/12 tests du site et 60/60 contrôles ciblés de connexion, avec revue indépendante; il n’est pas encore déployé. Ce code est distinct du code TAKATAK. Le propriétaire est connecté à Supabase : SMTP personnalisé déjà activé (`smtp.maileroo.com:465`), secrets inchangés. Le modèle Magic Link a reçu un code `{{ .Token }}` FR/EN en conservant son lien; sauvegarde effectuée, relecture après rechargement confirmée. Activation désactivée par défaut (`BESOINAVOCAT_EMAIL_OTP_ENABLED`); après contrôle final du modèle et déploiement, la livraison réelle du code puis la connexion restent à tester. Aucun code envoyé, réinitialisation, nouveau compte ou droit ajouté. [Réception et étapes restantes](COOLIFY.md#état-de-lessai-distant--28-octobre-2026).

**Suite du 28 octobre — recherche et dictée :** [validation du second lot](VALIDATION-RECHERCHE-2026-10-28.md). 231 tests Node réussis, recherche globale autorisée et citations, dictée au clic, lecteur amélioré. Trois documents de travail ajoutés dans une nouvelle copie privée du corpus (1 362 occurrences / 1 185 empreintes / 3 101 unités), sauvegarde et restauration contrôlées. La [PR 2](https://github.com/takatakca/BESOINAVOCAT.CA/pull/2) est **fusionnée dans `main` le 28 octobre 2026**, au commit `348d626b76d4adcd874cc7485d2e744006b249c9`. **Corpus restauré et connexion configurée; accès utilisateur réel non validé.** Le microphone physique reste à essayer; IA générative non connectée.

**Réception — 29 octobre 2026 :** [portail HTTPS de test](https://fluzlqgkhifrgkmygknj4mjj.31.220.96.134.sslip.io) redéployé au SHA `efef6921201602ede0139af03bbfb92f43e6f90e`, déploiement terminé à 04:21:20 UTC. Archive et restauration vérifiées par empreintes; trois dossiers, 1 362 documents et 1 185 blobs restaurés, propriétaire `1000:1000`, répertoires `0700`, fichiers `0600`, base initiale préservée. Grants et clé prêts; `/api/health` répond avec `loginConfigured:true`, dossiers anonymes refusés en 401 et trois chemins privés en 404. **Le mot de passe historique a été refusé; TAKATAK utilise désormais un code courriel/SMS personnalisé. Ne pas répéter l’essai de cet ancien mot de passe. Le correctif de code courriel du portail est testé, mais pas encore déployé; la livraison du code et la connexion réelle restent à valider. Aucune consultation authentifiée des dossiers n’est confirmée.** Recherche, téléchargement et persistance en session réelle restent à contrôler. [État et suite](COOLIFY.md#état-de-lessai-distant--28-octobre-2026).

> **28 octobre 2026 — VITRINE : `www/` est maintenant la copie exacte du site WordPress; seules les couleurs changent (D-026). En attente de la validation du propriétaire.**
> - La refonte « plateforme IA » du 27 octobre (D-022) a été **refusée** par le propriétaire (D-023). Son design n'est plus servi; il reste dans l'historique Git (`0e457cd`, `c00ead5`). Le texte importé de `www/content/` est conservé, sans être lu par la construction ([CONTENT_PRESERVATION](CONTENT_PRESERVATION.md)).
> - Le 28 octobre, le propriétaire a choisi de reconstruire `www/` comme **copie exacte** de son site WordPress, fait à la main détail par détail : mêmes mises en page, sections, images et boutons, textes mot pour mot. **Seules les couleurs changent**, pour ne pas ressembler à un autre de ses sites : l'orange devient bordeaux, les bleus et les verts deviennent marine; le blanc, les crèmes et le charbon restent.
> - **Direction du propriétaire (28 octobre)** : c'est un site juridique, il doit garder un **ton juridique**. Les couleurs sont sobres et professionnelles, propres à un service juridique. Les textes sont formels et rigoureux. Proportion voulue : **99 % réel et juridique, 1 % d'IA**. L'IA est la touche discrète qui distingue la plateforme et en fait l'avenir des plateformes juridiques; elle n'est jamais le thème visuel ni le ton général. Pas d'esthétique futuriste ou robotique.
> - Preuves de la copie, page par page et mot pour mot : [STOREFRONT](STOREFRONT.md#preuves).
> - **Sans instruction écrite du propriétaire, aucun agent ne modifie** la page de demande du portail (`platform/public/demande.*`, encore dans le style refusé de `c00ead5`), WordPress ou le DNS. Dans `www/`, seule la copie fidèle est autorisée (BA-034). Une autre session travaille en parallèle : vérifier GitHub avant toute action et ne pas écraser son travail.
> - Le WordPress en ligne est intact : vérifié le 28 octobre, thème Astra, extension 0.2.2, DNS toujours chez MochaHost, rien n'a été basculé.

**Premier fichier à lire : [REPRISE-SUIVANTE-2026-10-26.md](REPRISE-SUIVANTE-2026-10-26.md).** Vitrine : copie exacte livrée le 28 octobre, en attente de la validation du propriétaire (BA-034, D-026).

**Périmètre coordonné du présent lot :** la demande écrite de ce chat autorise le backend et les questionnaires fonctionnels. Aucun rendu de la vitrine n’est redessiné ni déployé. Les notes concurrentes, la copie fidèle et les intégrations de `main` (`efef692`) sont conservées; aucun fichier de vitrine n’est modifié par cette réconciliation documentaire. Les changements de la branche de livraison ont été intégrés par la PR 2; la réception authentifiée reste ouverte après restauration.

**Historique du premier lot du 28 octobre, désormais intégré :** [preuve et limites](VALIDATION-LOT-2026-10-28.md). 200 tests Node, 14 tests Python, questionnaire FR/EN, rendez-vous/usages, catalogue optionnel sans paiement, inventaire des contenus. L’application de test et le corpus sont désormais installés; la connexion réelle reste à valider. La présentation est réservée au propriétaire.

## Reprise prioritaire — 28 octobre 2026

Le propriétaire a repris le travail : la consigne historique d'arrêt ci-dessous est levée. **Plus de WordPress dans la cible**; contenus importés dans `www/` et portail Node dans `platform/`. Le développeur humain est disponible pour Coolify/DNS : [sa liste](DEV-A-FAIRE-2026-10-28.md), avec contrôles live du 28 octobre et restauration détaillée [COOLIFY](COOLIFY.md).

La PR 2 est fusionnée dans `main` au SHA `348d626b76d4adcd874cc7485d2e744006b249c9`. La base `e59a9e084966a649d260ff917d756823ff4558c4` et la branche `codex/workspaces-appels-2026-10-28` décrivent la préparation historique; ne pas rouvrir la PR pour intégrer ce lot. Le 29 octobre, le serveur a été déployé à `efef6921201602ede0139af03bbfb92f43e6f90e`; sa copie fidèle D-026 et son intégrateur D-027 sont conservés. La réception est distinguée dans D-028. La PR 3 est fusionnée à `ad8e2f4a31ebdafee2bc56acd36e861652d4623c`, six contrôles réussis, avec les notes de réception et le correctif de sauvegarde des cinq tables d’intégration. Cela ne constitue pas son installation sur l’hôte ni une recette utilisateur. **Corpus restauré et connexion configurée; accès utilisateur réel non validé.**

Contrôle daté du 28 octobre : le site d’orientation Render, dont le contenu `site/` est inchangé, a été republié au commit `348d626b76d4adcd874cc7485d2e744006b249c9`; les sept URL du smoke public passent. Ce contrôle ne valide pas le portail Node ni les dossiers privés.

Le contrôle distant antérieur à la configuration, le 28 octobre, renvoyait health 200 mais `/demande` 404 et identité Bearer non configurée. Tester `loginConfigured`, puis la vraie connexion : ne jamais annoncer le compte prêt sur un aperçu fictif. Préserver la sauvegarde/corpus privés hors Git et la remise figée des 312 annexes.

Le tri courriel a été effectué séparément dans le OneDrive privé le 28 octobre : 22 messages classés, 9 promotions mises à la corbeille de façon réversible, deux exports avec distinction envoyé/brouillon. Un seul compte accessible; deuxième compte et ChatGPT non contrôlés dans ce lot. Manifestes privés dans `00_DOSSIER_MAITRE/99_Travail_et_collecte/Reprise_2026-10-28`, pas de nouvelle preuve de pertes affirmée.

**Historique de clôture du 26 octobre :** [REPRISE-SUIVANTE-2026-10-26.md](REPRISE-SUIVANTE-2026-10-26.md). La consigne « notes seulement, puis arrêt » de cette étape est remplacée par la reprise active du 28 octobre.

## Historique de reprise — 26 octobre 2026

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

0. **Connecteurs (29 oct., D-027)** : le code est fait et testé (BA-035). La suite attend le propriétaire et Mike :
   - la clé `/data/integrations.key`;
   - les comptes développeur de [INTEGRATIONS](INTEGRATIONS.md) et leurs variables Coolify;
   - la vérification avec un vrai compte, une étape à la fois.
   Ne pas annoncer un connecteur actif avant cette vérification. Prochain lot : BA-036.
0. **Vitrine (28 oct., D-026)** : `www/` est la copie exacte du site WordPress, et seules les couleurs changent. Preuves : [STOREFRONT](STOREFRONT.md#preuves). **La suite attend le propriétaire** :
   - valider le rendu et la palette (`www/palette.mjs`);
   - décider du style de la page de demande du portail, encore celui refusé de `c00ead5`.
   Ensuite, son développeur suit l'ordre de [STOREFRONT](STOREFRONT.md) :
   1. détacher le courriel, car le MX pointe sur le domaine;
   2. déployer le portail sur Coolify et basculer `portail`;
   3. déployer la vitrine et basculer l'enregistrement A du domaine;
   4. vérifier.
   Un agent ne modifie ni le DNS ni WordPress, et ne redessine rien. Après une modification faite par le propriétaire dans WordPress, reprendre la copie (`node www/tools/mirror-wordpress.mjs`, puis `node www/tools/mirror-runtime.mjs`), relire le diff, puis lancer `node www/build.mjs && node www/tools/check-site.mjs`.
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
