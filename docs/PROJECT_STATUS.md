# PROJECT_STATUS — BESOINAVOCAT.CA

**Point courant — 29 octobre 2026, connexion à corriger :** la [PR 3](https://github.com/takatakca/BESOINAVOCAT.CA/pull/3) est fusionnée au SHA `ad8e2f4a31ebdafee2bc56acd36e861652d4623c`, six contrôles réussis, avec la réception et le correctif de sauvegarde des cinq tables d’intégration. Le serveur reste au SHA `efef692`; l’accès utilisateur réel n’est pas validé. TAKATAK utilise son propre code courriel/SMS, alors que ce portail demande encore un mot de passe. Le correctif de code courriel Supabase sur `codex/connexion-code-courriel` a réussi 233/233 tests du portail, 12/12 tests du site et 60/60 contrôles ciblés de connexion, avec revue indépendante; il n’est pas encore déployé. Ce code est distinct du code TAKATAK. Le propriétaire est connecté à Supabase : SMTP personnalisé déjà activé (`smtp.maileroo.com:465`), secrets inchangés. Le modèle Magic Link a reçu un code `{{ .Token }}` FR/EN en conservant son lien; sauvegarde effectuée, relecture après rechargement confirmée. Activation désactivée par défaut (`BESOINAVOCAT_EMAIL_OTP_ENABLED`); après contrôle final du modèle et déploiement, la livraison réelle du code puis la connexion restent à tester. Aucun code envoyé, réinitialisation, nouveau compte ou droit ajouté. [Réception et étapes restantes](COOLIFY.md#état-de-lessai-distant--28-octobre-2026).

**Suite du 28 octobre — recherche et dictée :** [validation du second lot](VALIDATION-RECHERCHE-2026-10-28.md). 231 tests Node réussis, recherche globale autorisée et citations, dictée au clic, lecteur amélioré. Trois documents de travail ajoutés dans une nouvelle copie privée du corpus (1 362 occurrences / 1 185 empreintes / 3 101 unités), sauvegarde et restauration contrôlées. La [PR 2](https://github.com/takatakca/BESOINAVOCAT.CA/pull/2) est **fusionnée dans `main` le 28 octobre 2026**, au commit `348d626b76d4adcd874cc7485d2e744006b249c9`. **Corpus restauré et connexion configurée; accès utilisateur réel non validé.** Le microphone physique reste à essayer; IA générative non connectée.

**Réception — 29 octobre 2026 :** [portail HTTPS de test](https://fluzlqgkhifrgkmygknj4mjj.31.220.96.134.sslip.io) redéployé au SHA `efef6921201602ede0139af03bbfb92f43e6f90e`, déploiement terminé à 04:21:20 UTC. Archive et restauration vérifiées par empreintes; trois dossiers, 1 362 documents et 1 185 blobs restaurés, propriétaire `1000:1000`, répertoires `0700`, fichiers `0600`, base initiale préservée. Grants et clé prêts; `/api/health` répond avec `loginConfigured:true`, dossiers anonymes refusés en 401 et trois chemins privés en 404. **Le mot de passe historique a été refusé; TAKATAK utilise désormais un code courriel/SMS personnalisé. Ne pas répéter l’essai de cet ancien mot de passe. Le correctif de code courriel du portail est testé, mais pas encore déployé; la livraison du code et la connexion réelle restent à valider. Aucune consultation authentifiée des dossiers n’est confirmée.** Recherche, téléchargement et persistance en session réelle restent à contrôler. [État et suite](COOLIFY.md#état-de-lessai-distant--28-octobre-2026).

> **28 octobre 2026 — VITRINE : `www/` est maintenant la copie exacte du site WordPress; seules les couleurs changent (D-026). En attente de la validation du propriétaire.**
> - La refonte « plateforme IA » du 27 octobre (D-022) a été **refusée** par le propriétaire (D-023). Son design n'est plus servi; il reste dans l'historique Git (`0e457cd`, `c00ead5`). Le texte importé de `www/content/` est conservé, sans être lu par la construction ([CONTENT_PRESERVATION](CONTENT_PRESERVATION.md)).
> - Le 28 octobre, le propriétaire a choisi de reconstruire `www/` comme **copie exacte** de son site WordPress, fait à la main détail par détail : mêmes mises en page, sections, images et boutons, textes mot pour mot. **Seules les couleurs changent**, pour ne pas ressembler à un autre de ses sites : l'orange devient bordeaux, les bleus et les verts deviennent marine; le blanc, les crèmes et le charbon restent.
> - **Direction du propriétaire (28 octobre)** : c'est un site juridique, il doit garder un **ton juridique**. Les couleurs sont sobres et professionnelles, propres à un service juridique. Les textes sont formels et rigoureux. Proportion voulue : **99 % réel et juridique, 1 % d'IA**. L'IA est la touche discrète qui distingue la plateforme et en fait l'avenir des plateformes juridiques; elle n'est jamais le thème visuel ni le ton général. Pas d'esthétique futuriste ou robotique.
> - Preuves de la copie, page par page et mot pour mot : [STOREFRONT](STOREFRONT.md#preuves).
> - **Sans instruction écrite du propriétaire, aucun agent ne modifie** la page de demande du portail (`platform/public/demande.*`, encore dans le style refusé de `c00ead5`), WordPress ou le DNS. Dans `www/`, seule la copie fidèle est autorisée (BA-034). Une autre session travaille en parallèle : vérifier GitHub avant toute action et ne pas écraser son travail.
> - Le WordPress en ligne est intact : vérifié le 28 octobre, thème Astra, extension 0.2.2, DNS toujours chez MochaHost, rien n'a été basculé.

**Périmètre coordonné du présent lot :** la demande écrite de ce chat autorise le backend et les questionnaires fonctionnels. Aucun rendu de la vitrine n’est redessiné ni déployé. Les notes concurrentes, la copie fidèle et les intégrations de `main` (`efef692`) sont conservées; aucun fichier de vitrine n’est modifié par cette réconciliation documentaire. Les changements de la branche de livraison ont été intégrés par la PR 2; la réception authentifiée reste ouverte après restauration.

**Historique du premier lot du 28 octobre, désormais intégré :** [preuve et limites](VALIDATION-LOT-2026-10-28.md). 200 tests Node, 14 tests Python, questionnaire FR/EN, rendez-vous/usages, catalogue optionnel sans paiement, inventaire des contenus. L’application de test et le corpus sont désormais installés; la connexion réelle reste à valider. La présentation est réservée au propriétaire.

## État courant — 29 octobre 2026

CI exacte de la base déployée `efef692` : [Platform](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40814610725), [Quality](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40814610756), [Storefront](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40814610803), [Browser QA](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40814610657) et [smoke](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40814629017) réussis. Le correctif de sauvegarde proposé ensuite a ses 12 tests Python locaux; sa propre CI reste à vérifier après publication de la PR.

Le propriétaire reprend le travail et confirme la sortie de WordPress. [Liste opérationnelle pour son développeur disponible](DEV-A-FAIRE-2026-10-28.md). Code du portail intégré par la PR 2 : `348d626b76d4adcd874cc7485d2e744006b249c9`, SHA du contrôle HTTPS historique à 19 points du 28 octobre. `origin/main` relu et déployé le 29 octobre : `efef6921201602ede0139af03bbfb92f43e6f90e`, avec la copie fidèle de la vitrine (D-026) et l’intégrateur de connecteurs (D-027), aucun fournisseur activé. Historique de la reprise : base `e59a9e084966a649d260ff917d756823ff4558c4` après fusion de la PR 1, puis développement sur `codex/workspaces-appels-2026-10-28`. La réconciliation des notes conserve tous les fichiers de `main` et n’est pas une nouvelle recette du serveur.

Contrôles publics du 28 octobre, antérieurs à la configuration en cours : apex/portail A `209.42.24.127`; MX sur apex; mail CNAME sur apex; TTL 7200. Portail health 200 avec `identityConfigured:false`, `/demande` 404; vitrine `/healthz` 404. **Corpus restauré et connexion configurée; accès utilisateur réel non validé.** Protéger le courrier avant la bascule, puis vérifier l’accès réel du propriétaire.

Contrôle daté du 28 octobre : le site d’orientation Render, dont le contenu `site/` est inchangé, a été republié au commit `348d626b76d4adcd874cc7485d2e744006b249c9`; les sept URL du smoke public passent. Ce contrôle ne valide pas le portail Node ni les dossiers privés.

Lot validé localement : questionnaire par domaine FR/EN, rendez-vous, chronomètre personnel serveur et registre des durées. Adaptateur Facturations limité à des lectures et une préparation locale de brouillons, fermé par défaut. Aucun appel réel, paiement ou souscription activé. Tarifs de stockage client, minutes et commissions non fixés.

Les sections antérieures suivantes sont conservées comme historique; leurs consignes « notes seulement » et maintien de WordPress sont remplacées par le mandat du 28 octobre.

**Premier fichier à lire : [REPRISE-SUIVANTE-2026-10-26.md](REPRISE-SUIVANTE-2026-10-26.md)**, dont la section du 27 octobre.

**Priorité : rendre l'accès personnel au backend réellement utilisable avant de poursuivre la vitrine.** État documentaire vérifié le 26 octobre 2026; aucun nouveau déploiement réalisé par cette mise à jour.

## État des trois surfaces

| Surface | Fait vérifié | Ce qui reste ouvert |
|---|---|---|
| `besoinavocat.ca` | WordPress HTTPS chez MochaHost; installation 0.2.1 réussie par l'interface WP, après contrôle visuel de la 0.2.0; aperçu `tableau-de-bord` conservé | **0.2.2 installée** le 27 oct. : bloc prix non recouvert, CTA 1839 sans saut ni piège clavier sur l'accueil, contrôle officiel 24/24. Parcours « Trouver mon avocat » en boucle sans formulaire ([inventaire](WORDPRESS_CTA_INVENTORY.md)); funnel désactivé |
| `www/` (future vitrine) | **Copie exacte du site WordPress** (D-026), prise le 28 oct. : 348 pages, page 404 et 1 870 fichiers, mêmes adresses. Seules les couleurs changent, en tons juridiques. Texte identique, mot pour mot : voir les preuves ci-dessous et [STOREFRONT](STOREFRONT.md#preuves) | Validation du propriétaire; application Coolify; bascule DNS par son développeur (BA-031); textes de BA-032 |
| `portail.besoinavocat.ca` | Première version technique Node/Passenger joignable; contrôle HTTP courant health 200 (`mode: pilot`, `identityConfigured: false`), dossiers anonymes 401 | Archive v2 avec connexion/corpus refusée par antivirus; pas de connexion utilisateur réelle ni de corpus distant actif validé |
| `besoinavocat.onrender.com` | Site d'orientation statique distinct, service Render actif sur `main` | Ne fournit pas le backend ni les dossiers; ne pas déplacer le domaine WordPress vers Render |

## Connecteurs du portail — 29 octobre 2026 (D-027)

- **Fait dans le code** :
  - chaque avocat relie ses propres comptes : Zoom, Outlook et Google Agenda avec actions sur les rendez-vous; DocuSign et Clio Canada en connexion seulement;
  - OAuth avec PKCE, état à usage unique, jetons chiffrés AES-256-GCM avec une clé séparée de la base;
  - notifications Zoom, Stripe, Twilio et DocuSign signées et dédupliquées;
  - écran **Intégrations** et boutons sur les rendez-vous. Détail : [INTEGRATIONS](INTEGRATIONS.md).
- **Preuves** :
  - `node --test platform/test/*.test.mjs` : 210 tests, dont 15 nouveaux. Quatre défauts injectés volontairement (jeton en clair, signature non vérifiée, lien d'hôte gardé, état non lié) sont chacun détectés;
  - Chromium, sous la CSP réelle du portail, avec des fournisseurs simulés : Connecter, puis consentement, puis retour « Service connecté », puis « Créer la réunion Zoom » sur un rendez-vous. À 1440 et 390 px : aucune erreur de script et aucun débordement;
  - image Docker du portail construite : `/integrations/callback` 200, notifications refusées tant qu'elles ne sont pas configurées (503), clé créée en `-rw-------` par l'utilisateur `node`.
- **Non fait** :
  - aucun compte développeur n'est ouvert et aucun connecteur n'est vérifié avec un vrai compte;
  - aucun paiement, SMS ni envoi pour signature n'est actif.

## Preuves de la copie exacte du 28 octobre (D-026)

Détail complet : [STOREFRONT](STOREFRONT.md#preuves).

Contrôles du 28 octobre 2026 sur la construction finale, sauf mention contraire. Outils : Chromium (Playwright 1.63), Tesseract 5.3.4 `fra+eng`, axe-core 4.10.2. La copie a été prise à 08:24 UTC : une modification faite ensuite dans WordPress n'y figure pas.

- **Mot pour mot, contre la copie de WordPress** (`check-site`, aussi exécuté dans l'image Docker et la CI) :
  - 348 pages sur 348 ont un texte visible identique;
  - aucun caractère HTML n'est abîmé et aucun orange ne reste dans les styles;
  - aucun fichier n'est chargé d'un tiers, hormis les deux images de jurigo.ca;
  - tous les liens internes aboutissent.
  CI « Storefront checks » verte.
- **Mot pour mot, contre le site en ligne** (`compare-live --ocr`, à 1440 px, chaque page défilée jusqu'au bout) :
  - le texte affiché est **identique sur les 348 pages**, sans erreur de script sur la copie. MochaHost a répondu un 503 passager pour `/contestation-contravention-avocat/`; recontrôlée ensuite, la page répond 200 et est identique;
  - **OCR** de la capture pleine page de la copie : en moyenne **97,1 %** des mots du site en ligne sont retrouvés (médiane 97,5 %); 343 pages sont à 90 % ou plus;
  - les cinq pages sous 90 % sont du texte sur photo ou des pages très courtes : `/demande/`, `/a-propos/`, `/consultations/`, `/log-in/` et `/recrutement/`. La capture de WordPress, lue de la même façon, obtient le même score : `/demande/` 71,4 % en ligne contre 70,1 %, `/a-propos/` 83,9 % contre 83,8 %, `/log-in/` 86,5 % des deux côtés;
  - seul écart notable : `/recrutement/`, 94,2 % contre 87,1 %. Il vient du découpage de la page par Tesseract. Le pied de page, lu seul, donne les mêmes mots des deux côtés (747 et 748), et aucun pixel n'y diffère de plus de 40 sur 255;
  - ce passage a été fait avant deux corrections : le charbon conservé et le caractère `&#039;` (voir plus bas). Le texte affiché n'en dépend pas. Dix pages ont été recontrôlées sur la construction finale : texte identique.
- **Mises en page** : dans Chromium, page défilée, on compare la position et la taille de chaque titre, image et bouton, à 2 px près.
  - À 1440 px : 348 pages sur 348 identiques (16 904 éléments), à la hauteur de page près.
  - À 390 px : 348 pages sur 348 identiques (15 245 éléments).
  - Un écart a été trouvé et corrigé : sur `/succession/`, la page était 59 px plus courte à 1440 px. La règle des couleurs lisait le caractère `&#039;` (les guillemets de « Nunito Sans » dans un style en ligne) comme la couleur `#039`, et le nom de la police était cassé. La règle est corrigée et `check-site` refuse désormais tout caractère abîmé. Après correction, la page est identique; le passage à 390 px a été fait avec la correction.
- **Couleurs rendues et CSP** : dans l'image Docker finale, 349 adresses à 1440 px et 14 pages aussi à 390 px :
  - aucune violation de la CSP;
  - aucun orange calculé sur un élément visible;
  - aucune erreur de script ni fichier en échec, hormis les images de jurigo.ca (en 404 sur WordPress aussi).
- **Contraste** (axe-core, règle `color-contrast`, WordPress contre copie, sur les 348 pages) :
  - WordPress compte 1 386 violations, la copie 9 : la copie en a moins sur chaque page, et plus sur aucune;
  - restent de petits libellés gris de `/` et de `/tableau-de-bord/`, de même clarté que sur WordPress;
  - le titre « Digne de confiance à travers le Québec. » de `/consultations/` est violet `#8400E4` sur fond presque noir sur WordPress (rapport 2,72; il en faut 4,5). Devenu marine, il était moins lisible (1,95). Il passe en marine pâle `#c3d1ea` (11,97), comme les cinq titres sur photo sombre.
- **Formulaires** :
  - MetForm de `/professionnels/` : 9 champs, même hauteur (426 px) et même bouton « OBTENIR DES NOUVEAUX CLIENTS » que sur WordPress. Un envoi valide mène à `portail.besoinavocat.ca/demande?role=professional`, sans aucune requête d'envoi;
  - la connexion de `/log-in/` mène au portail.
- **Bannière de témoins** : mêmes boutons que sur WordPress, même comportement (voir « Gardé tel quel »).
- **Logo** : mêmes lettres et même flèche; le charbon est inchangé et l'orange devient bordeaux.
- **Image Docker** (nginx 1.28, construite localement et en CI) :
  - `/healthz` répond;
  - les pages répondent 200;
  - réponses 301 : une adresse sans barre oblique finale, `/avocat-aide-juridique/`, et www vers le domaine principal;
  - réponses 404 : une page inconnue (page 404 de WordPress), `wp-login.php`, `wp-admin`, `xmlrpc.php`, `wp-json` et `.env`;
  - le PDF `download.php` répond 200 en `application/pdf`;
  - l'en-tête CSP est présent.
- **Tests du dépôt** :
  - `node --check site/app.js` et `site/guide.mjs`;
  - `node --test tests/*.test.mjs` : 12 sur 12;
  - `node --test platform/test/*.test.mjs` : 113 sur 113 sous Node 22 en local; la CI utilise Node 24.19.
- **Limites** :
  - ces contrôles ne sont pas une certification WCAG, ni un test avec lecteur d'écran;
  - le rendu n'a été vérifié que dans Chromium, pas dans Safari ou Firefox;
  - l'OCR est une aide : la preuve mot pour mot est la comparaison du texte affiché.

## Historique : preuves de la refonte du 27 octobre (D-022, refusée)

Le design de cette refonte n'est plus servi depuis le 28 octobre; son texte importé reste dans `www/content/`. Contrôles faits alors sur sa construction finale, localement, avant le push :

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
