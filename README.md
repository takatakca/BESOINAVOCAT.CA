# BESOINAVOCAT.CA

**Suite du 28 octobre — recherche et dictée :** [validation du second lot](docs/VALIDATION-RECHERCHE-2026-10-28.md). 231 tests Node réussis, recherche globale autorisée et citations, dictée au clic, lecteur amélioré. Trois documents de travail ajoutés dans une nouvelle copie privée du corpus (1 362 occurrences / 1 185 empreintes / 3 101 unités), sauvegarde et restauration contrôlées. La [PR 2](https://github.com/takatakca/BESOINAVOCAT.CA/pull/2) est **fusionnée dans `main` le 28 octobre 2026**, au commit `348d626b76d4adcd874cc7485d2e744006b249c9`. **Configuration du serveur en cours, recette login/corpus non validée.** Le microphone physique reste à essayer; IA générative non connectée.

**État figé — 29 octobre 2026, 03:18 UTC :** [instance HTTPS de test](https://fluzlqgkhifrgkmygknj4mjj.31.220.96.134.sslip.io) déployée; dernier health confirmé : 200, `mode:pilot`, `identityConfigured:false`, `loginConfigured:false`, `intakeConfigured:true`, demandes désactivées. Volume privé `/data` créé. Après activation de l’accès aux fichiers locaux, la deuxième tentative de téléversement a échoué par perte de connexion à l’extension Chrome; la reconnexion est demandée. **Transfert non confirmé; aucune installation du corpus, des grants, de la clé de session ou des variables de connexion TAKATAK/Supabase confirmée.** Procédure privée de restauration prête, non exécutée. Recette login/corpus non validée. [État et suite](docs/COOLIFY.md#état-de-lessai-distant--28-octobre-2026).

> **28 octobre 2026 — ARRÊT SUR LA VITRINE : le propriétaire la reprend lui-même, en ce moment.**
> - La refonte « plateforme IA » du 27 octobre (D-022) est **refusée** par le propriétaire (D-023).
> - Ce qu'il voulait : reproduire fidèlement le design qu'il a construit à la main sur WordPress, détail par détail, en changeant **seulement les couleurs** pour ne pas ressembler à un autre de ses sites.
> - **Direction du propriétaire (28 octobre)** : c'est un site juridique, il doit garder un **ton juridique**. Les couleurs sont sobres et professionnelles, propres à un service juridique. Les textes sont formels et rigoureux. Proportion voulue : **99 % réel et juridique, 1 % d'IA**. L'IA est la touche discrète qui distingue la plateforme et en fait l'avenir des plateformes juridiques; elle n'est jamais le thème visuel ni le ton général. Pas d'esthétique futuriste ou robotique.
> - **Aucun agent ne modifie** `www/`, la page de demande du portail (`platform/public/demande.*`), WordPress ou le DNS sans instruction écrite du propriétaire. Une autre session travaille en parallèle : vérifier GitHub avant toute action et ne pas écraser son travail.
> - Le WordPress en ligne est intact : vérifié le 28 octobre, thème Astra, extension 0.2.2, DNS toujours chez MochaHost, rien n'a été basculé.
> - Ni la copie de `www/` d'avant la refonte (`a27f70f`) ni celle d'après (`0e457cd`, `c00ead5`) ne reproduisent le design WordPress : seuls les textes et les liens ont été repris, dans un gabarit fait par l'agent. Rien n'est annulé par l'agent : le propriétaire décide.

**Note de clôture de l’autre session — à lire en premier à la reprise : [REPRISE-SUIVANTE-2026-10-26.md](docs/REPRISE-SUIVANTE-2026-10-26.md).** La session est arrêtée après cette mise à jour des notes.

**Périmètre coordonné du présent lot :** la demande écrite de ce chat autorise le backend et les questionnaires fonctionnels. Aucun rendu de la vitrine n’est redessiné ni déployé. Les notes concurrentes de `main` (`fb992d6`) sont conservées. Les changements de la branche de livraison ont été intégrés par la PR 2; la configuration du serveur reste en cours.

**Historique du premier lot du 28 octobre, désormais intégré :** [preuve et limites](docs/VALIDATION-LOT-2026-10-28.md). 200 tests Node, 14 tests Python, questionnaire FR/EN, rendez-vous/usages, catalogue optionnel sans paiement, inventaire des contenus. Le déploiement et la connexion réelle restent à faire avec Mike; la présentation est réservée au propriétaire.

Le site d’orientation Render, dont le contenu `site/` est inchangé, a été republié au commit `348d626b76d4adcd874cc7485d2e744006b249c9`; les sept URL du smoke public passent. Ce contrôle ne valide pas le portail Node ni les dossiers privés.

**État courant du 28 octobre : [liste immédiate pour le développeur](docs/DEV-A-FAIRE-2026-10-28.md).** Le propriétaire a repris le développement. La cible est désormais sans WordPress : vitrine `www/`, portail Node `platform/`, déploiement Coolify depuis GitHub. Les sauvegardes et les contenus sont conservés.

La connexion réelle et le corpus distant restent à valider. **Configuration du serveur en cours, recette login/corpus non validée.** Le contrôle antérieur à cette configuration, le 28 octobre, obtenait portail `/api/health` 200 avec `identityConfigured:false`, `/demande` 404 et DNS MochaHost. L’instance de test Coolify est désormais joignable; cela ne prouve pas l’accès au corpus privé. Le lot issu de `codex/workspaces-appels-2026-10-28` ajoute le questionnaire FR/EN, les rendez-vous et le chronométrage manuel; [communications et Facturations](docs/COMMUNICATIONS.md). Aucun appel fournisseur ni débit actif.

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

**27 octobre 2026 — vitrine sans WordPress prête (D-021).** `www/` contient tout le contenu publié de besoinavocat.ca : 348 pages, mêmes adresses. `node www/build.mjs` en fait un site statique, et `www/Dockerfile` le sert sur Coolify. La bascule DNS reste à faire dans l'ordre de [STOREFRONT](docs/STOREFRONT.md) : le courriel d'abord, car le MX pointe sur le domaine. WordPress n'est pas modifié.

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
