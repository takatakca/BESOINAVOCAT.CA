# DEPLOYMENT — BESOINAVOCAT.CA

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

**Suite de livraison :** résoudre la vérification du domaine d’envoi et le raccordement SMTP; le lot de fiabilité est déjà déployé et ses empreintes sont contrôlées. Ne pas répéter la bascule DNS du portail. Après réception du code : vérifier la session réelle, les trois dossiers, recherche/source, téléchargement et déconnexion.

[Réception détaillée](RECEPTION-2026-10-30.md) · [Vision premium](VISION-PREMIUM-2026-10-29.md), dont les modules externes restent non activés et les outils workspace D-029 déjà livrés.

## Historique documentaire — procédures et états antérieurs au 30 octobre

Les procédures de redéploiement et de bascule ci-dessous décrivent les étapes antérieures. Le résultat vérifié ci-dessus prime pour le portail; conserver les procédures de retour arrière et les exigences propres à la vitrine.

**État historique consigné — 29 octobre 2026 (soir), espace de travail premium (D-029, BA-037) :** pièces en tuiles avec glisser-déposer, visionneuse plein écran / tiers / coin, bouton vert « Appeler mon avocat » (réunion Zoom prévue ou demande de rappel au dossier, sans téléphonie), messages vidéo, éditeur Word `.docx`, annotation d'image avec repères et légende, présentation `.pptx`, navigation mobile par glissement. Guide et preuves : [ESPACE-DE-TRAVAIL](ESPACE-DE-TRAVAIL.md). Tests 242/242 portail et 12/12 site; QA Chromium ordinateur et mobile sans erreur, axe A/AA sans violation. Livré par la [PR 7](https://github.com/takatakca/BESOINAVOCAT.CA/pull/7). **Pas encore en ligne :** après la fusion, le portail Coolify doit être redéployé (bouton Redeploy ou déploiement automatique, voir [DEPLOYMENT](DEPLOYMENT.md)); `portail.besoinavocat.ca` attend toujours la bascule DNS de Mike (DEV-A-FAIRE §3.4). IA, téléphonie et facturation à l'heure restent à connecter.

**État historique consigné — 29 octobre 2026, connexion à corriger :** la [PR 3](https://github.com/takatakca/BESOINAVOCAT.CA/pull/3) est fusionnée au SHA `ad8e2f4a31ebdafee2bc56acd36e861652d4623c`, six contrôles réussis, avec la réception et le correctif de sauvegarde des cinq tables d’intégration. Le serveur reste au SHA `efef692`; l’accès utilisateur réel n’est pas validé. TAKATAK utilise son propre code courriel/SMS, alors que ce portail demande encore un mot de passe. Le correctif de code courriel Supabase sur `codex/connexion-code-courriel` a réussi 233/233 tests du portail, 12/12 tests du site et 60/60 contrôles ciblés de connexion, avec revue indépendante; il n’est pas encore déployé. Ce code est distinct du code TAKATAK. Le propriétaire est connecté à Supabase : SMTP personnalisé déjà activé (`smtp.maileroo.com:465`), secrets inchangés. Le modèle Magic Link a reçu un code `{{ .Token }}` FR/EN en conservant son lien; sauvegarde effectuée, relecture après rechargement confirmée. Activation désactivée par défaut (`BESOINAVOCAT_EMAIL_OTP_ENABLED`); après contrôle final du modèle et déploiement, la livraison réelle du code puis la connexion restent à tester. Aucun code envoyé, réinitialisation, nouveau compte ou droit ajouté. [Réception et étapes restantes](COOLIFY.md#état-de-lessai-distant--28-octobre-2026).

## Redéployer le portail après l'espace de travail (PR 7, 29 octobre 2026)

Le déploiement automatique est inactif tant que les variables et secrets `production` ne sont pas posés (voir [COOLIFY](COOLIFY.md) et la carte de KLEAN, PR 6). Les agents n'ont ni accès à Coolify ni droit sur ces réglages. Après la fusion de la PR 7 dans `main` :

1. Dans Coolify, ouvrir le projet `BESOINAVOCAT` puis l'application du portail (`besoinavocat-portail`), et cliquer **Redeploy** (source `main`).
2. Contrôler sur l'adresse d'essai <https://fluzlqgkhifrgkmygknj4mjj.31.220.96.134.sslip.io> :
   - `/api/health` répond 200, avec `loginConfigured` et `emailCodeConfigured`;
   - `/workspace.js` répond 200 en `text/javascript`;
   - l'en-tête `Content-Security-Policy` de `/` contient `media-src 'self' blob:`, et `Permissions-Policy` contient `camera=(self)`.
3. Se connecter, ouvrir **Pièces et sources** : les tuiles, la carte « Appeler mon avocat » et la barre d'actions s'affichent. Essayer un message vidéo avec la vraie caméra.
4. `portail.besoinavocat.ca` ne montrera ce portail qu'après la bascule DNS de Mike ([DEV-A-FAIRE](DEV-A-FAIRE-2026-10-28.md) §3.4).

## Cible confirmée le 28 octobre 2026

GitHub → Coolify : `www/` sans WordPress et `platform/` Node. Suivre [la liste du développeur](DEV-A-FAIRE-2026-10-28.md), [STOREFRONT](STOREFRONT.md) et [COOLIFY](COOLIFY.md). La PR 1 est fusionnée; base `main` `e59a9e0`, nouvelles branches en préversion seulement. WordPress/MochaHost reste une sauvegarde et l'hébergement du courrier, à séparer du DNS web avant bascule.

Contrôle live du 28 octobre : DNS encore MochaHost; portail health 200 mais `/demande` 404; pas de preuve de connexion propriétaire ni de corpus actif. Aucun déploiement Coolify par ce lot. Les instructions MochaHost et Render suivantes sont historiques ou concernent le site d'orientation distinct.

**Premier fichier à lire : [REPRISE-SUIVANTE-2026-10-26.md](REPRISE-SUIVANTE-2026-10-26.md).** Fin de session : notes seulement, puis arrêt.

## Hébergements distincts — état vérifié le 26 octobre 2026

| Surface | État vérifié | Limite |
|---|---|---|
| `https://besoinavocat.ca` | WordPress HTTPS chez MochaHost; installation 0.2.1 réussie via l'interface WP, aperçu conservé | Contrôle visuel final du bloc prix 0.2.1 à faire; funnel désactivé |
| `https://portail.besoinavocat.ca` | Première version Node technique créée et joignable sous Passenger | V2 connexion/corpus refusée par l'antivirus, aucun accès utilisateur réel ou corpus actif validé |
| `https://besoinavocat.onrender.com` | Service statique Render live au SHA `b56d027c4172ddde5e362497731ac1ae80805fe0` | Orientation publique seulement; aucun backend du pilote |

**Priorité : accès réel du propriétaire au backend avant la vitrine.** Ne pas basculer WordPress vers Render ni placer les pièces dans la bibliothèque média, le dépôt public ou un document root.

## Blocage MochaHost à résoudre

Le paquet `besoinavocat-cpanel-2026-10-26-v2.zip` a été refusé avec `Sanesecurity.Foxhole.JS_Zip_11.UNOFFICIAL FOUND`. SHA-256 : `6593ad7db2028e63f22809a1d23f1334d1fb3c3f4283786730738c2e9923c71c`. Le fichier rejeté n'est pas installé. Les tests de code ne lèvent pas ce refus; conserver l'analyse de l'hébergeur sur le paquet exact avant toute installation. Ne pas désactiver la protection ni modifier l'archive ou sa voie d'installation pour esquiver le contrôle.

Le recontrôle HTTP courant confirme `/api/health` 200 avec `status: ok`, `mode: pilot`, `identityConfigured: false`, et `/api/cases` anonyme 401. Les anciens contrôles `/.env` et `/server.mjs` avaient obtenu 404. **Cela ne valide ni la connexion réelle ni la présence des dossiers.** La configuration privée a été préparée mais la v2 qui l'utilise n'est pas en service. Aucun mot de passe de l'utilisateur n'est déclaré configuré. La recherche courriel ciblée rapportée lors de la reprise n'a pas retrouvé de réponse concernant le paquet; une résolution du blocage n'est pas présumée.

## Corpus et stockage privé

L'import local des trois dossiers et une restauration complète de sa sauvegarde ont été vérifiés avec SQLite, tailles et empreintes. Une copie privée de la sauvegarde a été transférée chez MochaHost et comparée au SHA attendu. Elle reste une **sauvegarde distante non restaurée et non activée**. Les originaux et les 312 annexes ne sont pas modifiés; plusieurs occurrences d'une même pièce ne sont pas de nouveaux éléments à additionner.

Les détails des chemins privés et de Node 24.22.1/Passenger figurent dans [CPANEL_NODE](CPANEL_NODE.md). La comparaison préalable avec les document roots, les permissions et les reçus d'acquisition ne doivent pas être remplacés par la simple absence d'erreur HTTP. Les sauvegardes, manifests privés, bases, sessions, grants, clés, mots de passe et pièces réelles restent hors Git et des fichiers publics.

## Ordre de mise en service après résolution du refus

1. Confirmer le paquet validé et préserver le code précédent. Comparer le manifeste, les tailles et les SHA avant démarrage; ne pas régénérer silencieusement la clé des sessions.
2. Vérifier les fichiers et paramètres privés, le stockage persistant partagé et HTTPS. Les sessions chiffrées partagées ne dépendent pas d'un nombre de workers inventé ou non contrôlé.
3. Contrôler health, assets, refus anonymes et inaccessibilité du code serveur/des secrets. `loginConfigured` ne prouve pas une connexion fournisseur réussie.
4. Faire utiliser à l'utilisateur son identité TAKATAK existante et vérifier ses habilitations. Ne pas créer une autorité de mots de passe parallèle ni enregistrer de secret dans les rapports.
5. Restaurer avec l'outil contrôlé dans une **nouvelle destination privée**, comparer au manifeste, examiner l'état de la base technique et préserver ses données éventuelles avant bascule. Ne pas écraser une base active ni copier un fichier SQLite seul en présence de WAL.
6. Vérifier les dossiers, recherches/citations, téléchargements, déconnexion et refus d'accès indu. Aucun test simulé ne remplace ce parcours réel.
7. Raccorder seulement ensuite le lien WordPress au portail opérationnel. Le module de contact est inclus dans le plugin installé mais le funnel reste désactivé; aucune réception réelle n'est annoncée tant que le service Node et le circuit des demandes ne sont pas contrôlés.

## GitHub et contrôles correspondants

Le code `5a230e52c758a626f31be24abeef2cce5242b3c1` dispose des quatre runs verts : [Quality 40421216083](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40421216083), [Platform PR 40421216013](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40421216013), [Browser 40421215940](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40421215940), [Platform push 40421210422](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40421210422). **133 tests Node, 12 Python et trois suites PHP réussis.** Aucun test CI ne lève le blocage antivirus ni ne valide la connexion réelle ou le bloc prix WordPress 0.2.1.

### Contrôle Git préalable — historique

Lors du contrôle préalable, la branche `codex/espace-client-avocat` au SHA `ee278313707bbec608c15df11e402decce66f7ee` avait trois commits d'avance sur `main` (`b56d027...`), sans retard; la [PR 1](https://github.com/takatakca/BESOINAVOCAT.CA/pull/1) était en brouillon et `site/` inchangé. Ces pointeurs historiques ne décrivent pas le nouveau code CI.

Les runs [Quality](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40305370703), [Browser](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40305370666) et [Platform](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40305370653) sont réussis pour `ee27831`. Le workflow Platform contrôle notamment les trois fichiers PHP du plugin, `check-render.php`, le pilote, le paquet et la sauvegarde/restauration. Les travaux ultérieurs requièrent leurs propres validations. Les anciens nombres de tests consignés lors des étapes précédentes ne doivent pas être utilisés comme mesure de la version actuelle.

Commandes de référence, à adapter aux fichiers réellement modifiés :

```sh
node --check site/app.js
node --check site/guide.mjs
node --test tests/*.test.mjs
node --test platform/test/*.test.mjs platform/deploy/passenger.test.cjs
python -B -m unittest discover -s platform/deploy -p test_build_bundle.py -v
python -B platform/test/test_backup_corpus.py
php -l wordpress/besoinavocat-experience/besoinavocat-experience.php
php -l wordpress/besoinavocat-experience/render-integrity.php
php -l wordpress/besoinavocat-experience/render-rules.php
php wordpress/besoinavocat-experience/checks/check-render.php
php wordpress/besoinavocat-experience/checks/check-funnel.php
php wordpress/besoinavocat-experience/checks/check-integration.php
```

PHP n'a pas été trouvé dans le PATH ni les emplacements usuels inspectés sur le poste local. Ne pas annoncer de lint PHP local sans runtime; les contrôles CI et les anciens contrôles serveur sont des preuves distinctes. Aucune nouvelle exécution de tests ou publication n'est effectuée par cette mise à jour documentaire.

## WordPress : conservation et retour arrière

**État actuel : installation 0.2.1 réussie via l'interface WordPress.** La 0.2.0 avait été contrôlée visuellement pour les tarifs 100/300 CAD et les corrections des articles 2186, 4663, 5082 et 5715. La 0.2.1 remet le CTA orange dans le flux normal pour corriger sa superposition aux prix. **Contrôle visuel final du bloc prix restant à faire; funnel désactivé.** Les preuves 0.1.2 ci-dessous sont historiques.

La sauvegarde de base privée et l'export WXR précèdent les corrections; l'export comportait 348 pages dont 347 publiées, avant la nouvelle page d'aperçu. Douze anciennes mentions d'opérateur ont été corrigées sur neuf pages avec contrôle des dates et URL. Le plugin 0.1.2 a ensuite été installé et contrôlé; sa page 5820 est un aperçu, pas le backend.

Le paquet WordPress 0.1.2 contrôlé a pour SHA `616175937eb3ba05be4aa427e64db0773b9568d0f4bb022981218327a5ea41d8`. Les trois lint PHP et `check-render` ont réussi lors de sa validation serveur; le contrôle visuel ordinateur n'est pas une certification mobile ou d'accessibilité complète. La désactivation d'un plugin ne rétablit pas une correction réalisée en base : conserver séparément sauvegarde, export et code précédent.

Les prochaines modifications doivent préserver articles, informations, URL, médias et codes, tout en corrigeant les anciennes marques d'opérateur et affiliations promotionnelles injustifiées. Demandes clients gratuites; offre professionnelle **100 CAD/semaine ou 300 CAD/mois**, **crédits IA en supplément**. Aucun paiement, abonnement, crédit ou service vocal n'est actif par cette seule présentation.

## Render : état réel et contrôles

Service `srv-db7srnmi0phs73ahkue0`, type `static_site`, dépôt `takatakca/BESOINAVOCAT.CA`, branche `main`, autoDeploy actif. Build : `test -s site/index.html && test -s site/styles.css`; répertoire publié : `site`. Le déploiement `dep-db8qsb6k1f9s73epefs0` est **live au SHA `b56d027c4172ddde5e362497731ac1ae80805fe0`**. Le [smoke du 26 octobre](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40362705338) réussit.

Une modification de la branche pilote ne publie pas automatiquement ce site, WordPress ou le portail MochaHost. Après une livraison Render autorisée, vérifier Actions, SHA exact du déploiement et smoke public. Ne pas lancer un déploiement supplémentaire lorsque l'autoDeploy a déjà pris le commit.

GitHub Pages reste optionnel et désactivé sans configuration explicite. Ne pas créer de CNAME ou modifier le DNS WordPress pour ce site statique. Sa surveillance planifiée est un contrôle de disponibilité, pas un orchestrateur autonome de développement.

## Historique de validation conservé

Les preuves ci-dessous concernent une étape antérieure et ne remplacent pas les états exacts ci-dessus.

## Vérification historique du 15 octobre
- Commit code/automatisation : `8ea7be249fc83762d5e9f159bfe4b56b68e94bc9`.
- GitHub Actions Quality checks : `success` (run `38776153594`).
- Render : `live` au SHA identique (deploy `dep-db8glgflot8c738va7mg`).
- Smoke HTTPS : `success` (run `38776190441`), **7 requêtes HTTP 200**, première tentative.
- Toute écriture de documentation ultérieure déclenche un nouveau SHA, à vérifier à nouveau.


Les contrôles Chromium historiques portaient sur le site statique à 320, 375, 768 et 1440 px. Ils ne valident pas les nouveaux formulaires WordPress ou le portail authentifié. Le contrôle humain avec lecteur d'écran et appareils physiques reste distinct.

## Clôture du lot contact et WordPress 0.2.1

Installation WordPress 0.2.1 réussie, funnel désactivé, contrôle visuel final des prix ouvert. Node v1 reste à `identityConfigured: false`; v2 refusée par l'antivirus, sans contournement. Aucun accès réel au corpus validé. Cette clôture modifie seulement les notes, sans code, commit, push ou action externe.
