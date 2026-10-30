# BESOINAVOCAT.CA

## Reprise serveur et vitrine — 30 octobre 2026, 11:43 UTC

Le portail répond encore 503 au contrôle de 11:35 UTC. **Mike ou l'agent serveur prend le rétablissement du VPS**, selon le propriétaire. [Fiche courte de reprise](docs/REPRISE-MIKE-2026-10-30.md).

Les correctifs de vitrine et les notes sont publiés dans la [PR 12](https://github.com/takatakca/BESOINAVOCAT.CA/pull/12) : 348 pages conservées et contrôlées, 10 tests de formulaires, 12 tests du site, revue indépendante et contrôle visuel local. Les six contrôles GitHub ont réussi sur le code `47ec80e`; les ajouts documentaires suivants ont leur propre CI à vérifier dans la PR. La vitrine n'est pas encore créée ni déployée sur Coolify et aucun DNS n'a changé.

Rattachement historique restauré avant la panne : trois dossiers accessibles au contrôle serveur, recette utilisateur encore ouverte. CNESST v2 validé sur copie (4 dossiers / 1 368 documents / 3 128 pages), **pas importé en production**. Le choix de cookies et les textes juridiques restent à contrôler; aucun service payant activé.

## Point de reprise — 30 octobre 2026, 11:15 UTC

**Rattachement serveur corrigé, recette utilisateur en attente.** La session active affichait zéro dossier, mais la base active contient bien **trois dossiers, 1 362 documents et 3 101 unités**. Après sauvegarde privée, le seul rattachement d'espace du propriétaire historique a été restauré à l'identique de l'original vérifié : contrôle serveur **3 dossiers accessibles**, fichier en mode 0600, compteurs inchangés. Aucune nouvelle identité ou appartenance créée. La reconnexion est demandée; l'affichage et l'ouverture des pièces après correction restent à confirmer.

**CNESST :** six PDF / 27 pages préparés localement avec provenance; import serveur encore à faire. **Courriel :** TWILO annonce la résolution via Resend à 10:43 UTC et une session active a été observée; les anciennes consignes Maileroo ci-dessous sont historiques, à ne pas réappliquer sans recontrôle. **Vitrine :** WordPress reste public; une ressource Coolify distincte pour `www/` est en préparation. Séparer le courrier de l'apex avant la bascule DNS. Aucune bascule de vitrine confirmée.

Priorité : vérifier la nouvelle session et ses pièces, importer puis contrôler CNESST, déployer et contrôler la copie `www/`, ensuite effectuer la bascule avec continuité du courrier. [Réception détaillée, preuves et limites](docs/RECEPTION-RATTACHEMENT-2026-10-30.md). Le workspace déjà déployé au SHA `a3e20cc` reste inchangé par cette correction.

## Historique — point consigné à 09:52 UTC

**Les cinq correctifs du workspace sont déployés**, au `main` `a3e20ccbadd182fb819337c79e5b931060316af0`, après fusion de la [PR 10](https://github.com/takatakca/BESOINAVOCAT.CA/pull/10). Coolify `ocvuihsmpnffpbabg07r5ekh` affiche **Success** (48 s), application saine à 09:50:48 UTC. Le contrôle HTTPS du 30 octobre à 09:51:42.941 UTC, avec validation TLS normale, obtient 200 pour la page, la santé et les trois fichiers publics; leurs empreintes correspondent exactement à ce `main`. Les dossiers anonymes restent refusés en 401 et trois chemins privés en 404. Ces preuves de déploiement ne confirment pas la connexion réelle.

**Cause de non-réception confirmée à 09:40 UTC : blocage Maileroo du domaine de test.** Trois messages destinés au propriétaire sont marqués « Suppressed »; l'événement consulté indique un destinataire hors liste autorisée. Son ajout a été refusé car le nombre maximal de destinataires autorisés du domaine de test est atteint; aucune entrée existante n'a été supprimée. Le domaine propre `takatak.ca` est encore inactif, avec vérification DNS SPF/DKIM incomplète. Le quota d'envoi affiché n'est pas consommé : ce refus ne vient pas de ce quota. [Diagnostic et voie de résolution](docs/DIAGNOSTIC-ENVOI-2026-10-30.md). Le blocage fournisseur reste non résolu; réception du code et consultation authentifiée des trois dossiers toujours non confirmées. Aucun DNS ni paramètre SMTP n’a été modifié; aucun nouvel OTP n’a été envoyé. L’ouverture du DNS par le propriétaire ou l’application de la fiche privée par Mike reste en attente.

**Fiabilité livrée :** caméra après fermeture/remplacement, éditeur pendant le chargement, sauvegarde de l’éditeur, réponse tardive d’envoi vidéo et décompression DOCX bornée. Code `7a920ee`, notes `c272e49`, puis fusion `a3e20cc`. Contrôles : **276/276 tests plateforme**, dont **10 de fiabilité inclus**, **12/12 tests du site**, revue indépendante sans bloqueur et QA sur données fictives (éditeur au tiers de l’écran, export DOCX réel). Les six contrôles de la PR sont réussis au SHA `c272e49`; après fusion, validation, Chromium, vitrine, plateforme et smoke de `main` réussissent. Les tâches de déploiement CI ont été ignorées; le déploiement Coolify a été lancé et contrôlé séparément.

[Réception et preuves](docs/RECEPTION-2026-10-30.md) · [Feuille de route premium](docs/VISION-PREMIUM-2026-10-29.md). La feuille de route conserve les orientations à venir; les outils du workspace D-029 sont déjà livrés, mais les appels réels, l'IA et la facturation ne sont pas activés par cette note.

## Historique documentaire — états antérieurs au contrôle du 30 octobre

Les mentions ci-dessous « pas encore en ligne », DNS à basculer et code non déployé décrivent leurs dates de rédaction. Elles sont remplacées par l'état vérifié ci-dessus pour le portail, sans modifier les décisions de produit ni la vitrine.

**État historique consigné — 29 octobre 2026 (soir), espace de travail premium (D-029, BA-037) :** pièces en tuiles avec glisser-déposer, visionneuse plein écran / tiers / coin, bouton vert « Appeler mon avocat » (réunion Zoom prévue ou demande de rappel au dossier, sans téléphonie), messages vidéo, éditeur Word `.docx`, annotation d'image avec repères et légende, présentation `.pptx`, navigation mobile par glissement. Guide et preuves : [ESPACE-DE-TRAVAIL](docs/ESPACE-DE-TRAVAIL.md). Tests 242/242 portail et 12/12 site; QA Chromium ordinateur et mobile sans erreur, axe A/AA sans violation. Livré par la [PR 7](https://github.com/takatakca/BESOINAVOCAT.CA/pull/7). **Pas encore en ligne :** après la fusion, le portail Coolify doit être redéployé (bouton Redeploy ou déploiement automatique, voir [DEPLOYMENT](docs/DEPLOYMENT.md)); `portail.besoinavocat.ca` attend toujours la bascule DNS de Mike (DEV-A-FAIRE §3.4). IA, téléphonie et facturation à l'heure restent à connecter.

**État historique consigné — 29 octobre 2026, connexion à corriger :** la [PR 3](https://github.com/takatakca/BESOINAVOCAT.CA/pull/3) est fusionnée au SHA `ad8e2f4a31ebdafee2bc56acd36e861652d4623c`, six contrôles réussis, avec la réception et le correctif de sauvegarde des cinq tables d’intégration. Le serveur reste au SHA `efef692`; l’accès utilisateur réel n’est pas validé. TAKATAK utilise son propre code courriel/SMS, alors que ce portail demande encore un mot de passe. Le correctif de code courriel Supabase sur `codex/connexion-code-courriel` a réussi 233/233 tests du portail, 12/12 tests du site et 60/60 contrôles ciblés de connexion, avec revue indépendante; il n’est pas encore déployé. Ce code est distinct du code TAKATAK. Le propriétaire est connecté à Supabase : SMTP personnalisé déjà activé (`smtp.maileroo.com:465`), secrets inchangés. Le modèle Magic Link a reçu un code `{{ .Token }}` FR/EN en conservant son lien; sauvegarde effectuée, relecture après rechargement confirmée. Activation désactivée par défaut (`BESOINAVOCAT_EMAIL_OTP_ENABLED`); après contrôle final du modèle et déploiement, la livraison réelle du code puis la connexion restent à tester. Aucun code envoyé, réinitialisation, nouveau compte ou droit ajouté. [Réception et étapes restantes](docs/COOLIFY.md#état-de-lessai-distant--28-octobre-2026).

**Suite du 28 octobre — recherche et dictée :** [validation du second lot](docs/VALIDATION-RECHERCHE-2026-10-28.md). 231 tests Node réussis, recherche globale autorisée et citations, dictée au clic, lecteur amélioré. Trois documents de travail ajoutés dans une nouvelle copie privée du corpus (1 362 occurrences / 1 185 empreintes / 3 101 unités), sauvegarde et restauration contrôlées. La [PR 2](https://github.com/takatakca/BESOINAVOCAT.CA/pull/2) est **fusionnée dans `main` le 28 octobre 2026**, au commit `348d626b76d4adcd874cc7485d2e744006b249c9`. **Corpus restauré et connexion configurée; accès utilisateur réel non validé.** Le microphone physique reste à essayer; IA générative non connectée.

**Réception — 29 octobre 2026 :** [portail HTTPS de test](https://fluzlqgkhifrgkmygknj4mjj.31.220.96.134.sslip.io) redéployé au SHA `efef6921201602ede0139af03bbfb92f43e6f90e`, déploiement terminé à 04:21:20 UTC. Archive et restauration vérifiées par empreintes; trois dossiers, 1 362 documents et 1 185 blobs restaurés, propriétaire `1000:1000`, répertoires `0700`, fichiers `0600`, base initiale préservée. Grants et clé prêts; `/api/health` répond avec `loginConfigured:true`, dossiers anonymes refusés en 401 et trois chemins privés en 404. **Le mot de passe historique a été refusé; TAKATAK utilise désormais un code courriel/SMS personnalisé. Ne pas répéter l’essai de cet ancien mot de passe. Le correctif de code courriel du portail est testé, mais pas encore déployé; la livraison du code et la connexion réelle restent à valider. Aucune consultation authentifiée des dossiers n’est confirmée.** Recherche, téléchargement et persistance en session réelle restent à contrôler. [État et suite](docs/COOLIFY.md#état-de-lessai-distant--28-octobre-2026).

> **28 octobre 2026 — VITRINE : `www/` est maintenant la copie exacte du site WordPress; seules les couleurs changent (D-026). En attente de la validation du propriétaire.**
> - La refonte « plateforme IA » du 27 octobre (D-022) a été **refusée** par le propriétaire (D-023). Son design n'est plus servi; il reste dans l'historique Git (`0e457cd`, `c00ead5`). Le texte importé de `www/content/` est conservé, sans être lu par la construction ([CONTENT_PRESERVATION](docs/CONTENT_PRESERVATION.md)).
> - Le 28 octobre, le propriétaire a choisi de reconstruire `www/` comme **copie exacte** de son site WordPress, fait à la main détail par détail : mêmes mises en page, sections, images et boutons, textes mot pour mot. **Seules les couleurs changent**, pour ne pas ressembler à un autre de ses sites : l'orange devient bordeaux, les bleus et les verts deviennent marine; le blanc, les crèmes et le charbon restent.
> - **Direction du propriétaire (28 octobre)** : c'est un site juridique, il doit garder un **ton juridique**. Les couleurs sont sobres et professionnelles, propres à un service juridique. Les textes sont formels et rigoureux. Proportion voulue : **99 % réel et juridique, 1 % d'IA**. L'IA est la touche discrète qui distingue la plateforme et en fait l'avenir des plateformes juridiques; elle n'est jamais le thème visuel ni le ton général. Pas d'esthétique futuriste ou robotique.
> - Preuves de la copie, page par page et mot pour mot : [STOREFRONT](docs/STOREFRONT.md#preuves).
> - **Sans instruction écrite du propriétaire, aucun agent ne modifie** la page de demande du portail (`platform/public/demande.*`, encore dans le style refusé de `c00ead5`), WordPress ou le DNS. Dans `www/`, seule la copie fidèle est autorisée (BA-034). Une autre session travaille en parallèle : vérifier GitHub avant toute action et ne pas écraser son travail.
> - Le WordPress en ligne est intact : vérifié le 28 octobre, thème Astra, extension 0.2.2, DNS toujours chez MochaHost, rien n'a été basculé.

**À lire en premier à la reprise : [REPRISE-SUIVANTE-2026-10-26.md](docs/REPRISE-SUIVANTE-2026-10-26.md).** La vitrine `www/` est la copie exacte du site WordPress, en attente de la validation du propriétaire (BA-034).

**Périmètre coordonné du présent lot :** la demande écrite de ce chat autorise le backend et les questionnaires fonctionnels. Aucun rendu de la vitrine n’est redessiné ni déployé. Les notes concurrentes, la copie fidèle et les intégrations de `main` (`efef692`) sont conservées; aucun fichier de vitrine n’est modifié par cette réconciliation documentaire. Les changements de la branche de livraison ont été intégrés par la PR 2; la réception authentifiée reste ouverte après restauration.

**Historique du premier lot du 28 octobre, désormais intégré :** [preuve et limites](docs/VALIDATION-LOT-2026-10-28.md). 200 tests Node, 14 tests Python, questionnaire FR/EN, rendez-vous/usages, catalogue optionnel sans paiement, inventaire des contenus. L’application de test et le corpus sont désormais installés; la connexion réelle reste à valider. La présentation est réservée au propriétaire.

Contrôle daté du 28 octobre : le site d’orientation Render, dont le contenu `site/` est inchangé, a été republié au commit `348d626b76d4adcd874cc7485d2e744006b249c9`; les sept URL du smoke public passent. Ce contrôle ne valide pas le portail Node ni les dossiers privés.

**29 octobre — connecteurs du portail (D-027) :** chaque avocat relie son Zoom, son Outlook ou son Google Agenda à ses rendez-vous; DocuSign et Clio se connectent. Le code est testé avec des fournisseurs simulés; il reste à ouvrir les comptes développeur et à vérifier avec de vrais comptes : [INTEGRATIONS](docs/INTEGRATIONS.md).

**État courant du 28 octobre : [liste immédiate pour le développeur](docs/DEV-A-FAIRE-2026-10-28.md).** Le propriétaire a repris le développement. La cible est désormais sans WordPress : vitrine `www/`, portail Node `platform/`, déploiement Coolify depuis GitHub. Les sauvegardes et les contenus sont conservés.

La connexion réelle et le corpus distant restent à valider. **Corpus restauré et connexion configurée; accès utilisateur réel non validé.** Le contrôle antérieur à cette configuration, le 28 octobre, obtenait portail `/api/health` 200 avec `identityConfigured:false`, `/demande` 404 et DNS MochaHost. L’instance de test Coolify est désormais joignable; cela ne prouve pas l’accès au corpus privé. Le lot issu de `codex/workspaces-appels-2026-10-28` ajoute le questionnaire FR/EN, les rendez-vous et le chronométrage manuel; [communications et Facturations](docs/COMMUNICATIONS.md). Aucun appel fournisseur ni débit actif.

Le propriétaire prévoit aussi des frais clients pour les volumes documentaires importants : tarifs, crédits, appels et commissions restent à définir. Les forfaits avocats 100 CAD/semaine ou 300 CAD/mois restent les seuls montants décidés; aucune facturation n'est activée.

## Historique et surfaces conservées

Les mentions WordPress, arrêt de session et blocage MochaHost ci-dessous décrivent les étapes antérieures. Le mandat actuel et la procédure de bascule ci-dessus prévalent.

Site d'orientation juridique généraliste pour le Québec et développement d'un espace client/avocat distinct.

## Historique du 26 octobre — priorité à l’accès réel au backend

Le propriétaire demande d'abord un accès effectif à ses dossiers dans le portail **Node.js**, puis l'amélioration des formulaires WordPress et de la présentation interactive en français et en anglais. **besoinavocat.ca reste la vitrine WordPress chez MochaHost**; `site/` conserve le site d'orientation Render distinct. Les pages, articles, URL, informations documentaires et travaux existants sont préservés. Les anciennes marques d'opérateur et affiliations promotionnelles injustifiées peuvent être corrigées sans effacer les noms nécessaires aux documents ou articles.

Le pilote `platform/` contient l'identité TAKATAK, les habilitations par organisation/dossier, des sessions serveur partagées chiffrées, les pièces et versions avec provenance/SHA-256, la recherche et ses références par page, les échanges et le suivi du temps à valider. **Le sous-domaine `portail.besoinavocat.ca` répond avec une première version technique; la v2 avec connexion et corpus n'est pas installée.** MochaHost a rejeté son archive par l'antivirus. Il faut obtenir l'analyse du paquet exact avant installation, sans contourner cette protection.

Le corpus des trois dossiers a été importé, sauvegardé, vérifié et restauré localement. Une copie de sauvegarde privée a été transférée sur l'hébergement et son empreinte contrôlée; **elle n'est ni restaurée ni activée dans le portail distant**. Aucune connexion réelle de l'utilisateur ni consultation du corpus en production n'a été validée. Aucun mot de passe n'est annoncé comme configuré. Les originaux et le paquet de 312 annexes restent distincts et inchangés.

Conditions commerciales décidées : publication des demandes **toujours gratuite pour les clients**; offre professionnelle **100 CAD par semaine ou 300 CAD par mois**, avec **crédits IA en supplément**. Les honoraires de l'avocat sont distincts. Ces montants n'activent aucun abonnement, débit, crédit IA ou paiement.

**WordPress 0.2.1 a été installé avec succès par l'interface WordPress.** La 0.2.0 avait été contrôlée visuellement pour les tarifs 100/300 CAD et les corrections des articles 2186, 4663, 5082 et 5715. La 0.2.1 remet le CTA orange dans le flux normal pour corriger sa superposition aux prix; **le contrôle visuel final du bloc prix reste à faire**. Le parcours de contact (`funnel`) reste désactivé; le backend Node v1 répond toujours avec `identityConfigured: false`, et la v2 reste bloquée par l'antivirus, sans contournement. Le code `5a230e52c758a626f31be24abeef2cce5242b3c1` a ses quatre contrôles CI verts : 133 tests Node, 12 Python et trois suites PHP. Voir les preuves dans [PROJECT_STATUS](docs/PROJECT_STATUS.md).

**27 et 28 octobre 2026 — vitrine sans WordPress (D-021, D-026).** `www/site/` est la copie exacte du site publié : 348 pages, mêmes adresses, mêmes fichiers. `node www/build.mjs` n'y change que les couleurs, en tons juridiques, et ce qui ne fonctionne qu'avec WordPress; `www/Dockerfile` sert le résultat sur Coolify. La bascule DNS reste à faire dans l'ordre de [STOREFRONT](docs/STOREFRONT.md) : le courriel d'abord, car le MX pointe sur le domaine. WordPress n'est pas modifié.

- [Vitrine `www/` et bascule DNS](docs/STOREFRONT.md)
- [État précis et preuves](docs/PROJECT_STATUS.md)
- [Ordre de reprise du backend](docs/AGENT_HANDOFF.md)
- [Déploiement et blocage actuel](docs/DEPLOYMENT.md)
- [Architecture du pilote](docs/PLATFORM_ARCHITECTURE.md)
- [Démarrage et tests](platform/README.md)
- [Habillage WordPress réversible](wordpress/besoinavocat-experience/README.md)

L'IA, la voix, les paiements et les crédits restent à raccorder et à vérifier. Aucun dossier réel, sauvegarde, manifeste privé, mot de passe, clé ou jeton ne doit entrer dans le dépôt public.

## Site d'orientation conservé (livraison du 15 octobre 2026)

- Interface responsive en français : huit domaines de droit recherchables (accents et synonymes), sélection de région, niveau d'urgence, intérêt pour l'aide juridique.
- Guide généré localement dans le navigateur, lien vers le Barreau du Québec, JuridiQC et la Commission des services juridiques.
- Copie et impression volontaires du plan; **aucune donnée personnelle n'est envoyée, enregistrée ou partagée** par l'outil.
- Ressources institutionnelles ciblées (Barreau, JuridiQC, CSJ, CNESST et TAL), page 404 et contrôle public `/health.json`.
- Mentions de confidentialité et d'utilisation adaptées à ce périmètre (à réviser avec un responsable juridique avant les futurs traitements de données).
- Tests unitaires/structure Node.js natifs et GitHub Actions pour contrôle qualité; smoke HTTPS quotidien et **après chaque CI réussie de `main`**.
- Hébergement Render **en ligne** : service statique `besoinavocat` relié à `main`, déploiement automatique à chaque push.
- Workflow GitHub Pages facultatif, désactivé tant que `ENABLE_GITHUB_PAGES` n'est pas configurée à `true` et que Pages n'est pas activé.

Le site statique n'est ni un cabinet d'avocats ni un réseau professionnel vérifié. Il ne traite pas les dossiers privés du pilote Node.

## Démarrage local

Sans installation de dépendances :

```sh
python3 -m http.server 8080 --directory site
# ouvrir http://localhost:8080
```

Le navigateur doit accéder aux fichiers par HTTP local, car le script utilise des modules ES.

## Tests

```sh
node --check site/app.js
node --check site/guide.mjs
node --test tests/*.test.mjs
```

Node 22 recommandé. Les vérifications sont aussi lancées par les workflows GitHub Actions.

## Site d’orientation distinct : Render

Service : [besoinavocat.onrender.com](https://besoinavocat.onrender.com) (premier déploiement **live** le 14 octobre 2026).

- Compte : espace Render `My Workspace`.
- Dépôt : `https://github.com/takatakca/BESOINAVOCAT.CA`.
- Branche : `main` ; déploiement automatique : activé.
- Commande de build : `test -s site/index.html && test -s site/styles.css`.
- Répertoire publié : `site`.

**Ne pas rediriger besoinavocat.ca vers Render.** Le site d’orientation Render conserve son adresse propre. La cible actuelle du portail Node est Coolify; le maintien de WordPress chez MochaHost décrivait l’étape antérieure à la migration.

## Déploiement facultatif : GitHub Pages

Le workflow `.github/workflows/pages.yml` publie le dossier `site/` vers GitHub Pages lors des pushes sur `main` **uniquement si** la variable de dépôt GitHub Actions `ENABLE_GITHUB_PAGES` vaut `true` et si **Settings → Pages → Build and deployment → Source: GitHub Actions** est activé. Sans ces activations, le workflow Pages est ignoré. Cela évite les échecs de déploiement inutiles maintenant que Render assure la publication.

Ne pas créer de fichier CNAME avant que le domaine soit vérifié, que le DNS pointe vers l'hébergement choisi et que HTTPS soit fonctionnel. Le déploiement GitHub Pages n'est **pas** un déploiement automatique vers l'hébergement commercial du nom de domaine `besoinavocat.ca`.

## Sécurité du site statique `site/`

- Pas de formulaire de dossier confidentiel ni de collecte de leads.
- Pas de cookies analytiques, publicitaires ou d'intégrations tierces sur les pages.
- Politique CSP restrictive. Liens externes `noopener noreferrer`.
- Contenus généraux sans promesse juridique; aucune usurpation d'appartenance au Barreau.
- L'hébergeur peut disposer de journaux techniques. Vérifier leur politique et les obligations applicables lors du déploiement.

## Prochaines phases (non réalisées)

Voir [docs/RELEVE.md](docs/RELEVE.md). Le périmètre réel d'une plateforme de mise en relation, ses partenaires, rôles, contrats, consentements, processus de vérification et traitements de données nécessitent des décisions métier et des contrôles de sécurité avant ouverture en production.


## Pilotage et reprise des agents

Lire d'abord [la note de reprise](docs/REPRISE-SUIVANTE-2026-10-26.md), puis [AGENTS.md](AGENTS.md) et [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md),
[docs/TASK_QUEUE.md](docs/TASK_QUEUE.md), [docs/AGENT_HANDOFF.md](docs/AGENT_HANDOFF.md),
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) et [docs/DECISIONS.md](docs/DECISIONS.md).
Ces fichiers distinguent livrables réels, décisions encore nécessaires et tâches futures.
Le workflow de surveillance ne constitue pas un orchestrateur d'agents autonome.

## QA navigateur

```sh
python -m pip install -r requirements-qa.txt
python -m playwright install chromium
python scripts/browser_qa.py
```

Le workflow [Browser QA](.github/workflows/browser-qa.yml) effectue des tests Chromium à 320, 375, 768 et 1440 px, vérifie les interactions clavier, les erreurs et l'impression. Voir [docs/QA_REPORT.md](docs/QA_REPORT.md). La revue humaine lecteur d'écran demeure à effectuer.
