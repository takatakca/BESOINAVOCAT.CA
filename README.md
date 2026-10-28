# BESOINAVOCAT.CA

> **28 octobre 2026 — VITRINE : `www/` est maintenant la copie exacte du site WordPress; seules les couleurs changent (D-026). En attente de la validation du propriétaire.**
> - La refonte « plateforme IA » du 27 octobre (D-022) a été **refusée** par le propriétaire (D-023). Son design n'est plus servi; il reste dans l'historique Git (`0e457cd`, `c00ead5`). Le texte importé de `www/content/` est conservé, sans être lu par la construction ([CONTENT_PRESERVATION](docs/CONTENT_PRESERVATION.md)).
> - Le 28 octobre, le propriétaire a choisi de reconstruire `www/` comme **copie exacte** de son site WordPress, fait à la main détail par détail : mêmes mises en page, sections, images et boutons, textes mot pour mot. **Seules les couleurs changent**, pour ne pas ressembler à un autre de ses sites : l'orange devient bordeaux, les bleus et les verts deviennent marine; le blanc, les crèmes et le charbon restent.
> - **Direction du propriétaire (28 octobre)** : c'est un site juridique, il doit garder un **ton juridique**. Les couleurs sont sobres et professionnelles, propres à un service juridique. Les textes sont formels et rigoureux. Proportion voulue : **99 % réel et juridique, 1 % d'IA**. L'IA est la touche discrète qui distingue la plateforme et en fait l'avenir des plateformes juridiques; elle n'est jamais le thème visuel ni le ton général. Pas d'esthétique futuriste ou robotique.
> - Preuves de la copie, page par page et mot pour mot : [STOREFRONT](docs/STOREFRONT.md#preuves).
> - **Sans instruction écrite du propriétaire, aucun agent ne modifie** la page de demande du portail (`platform/public/demande.*`, encore dans le style refusé de `c00ead5`), WordPress ou le DNS. Dans `www/`, seule la copie fidèle est autorisée (BA-034). Une autre session travaille en parallèle : vérifier GitHub avant toute action et ne pas écraser son travail.
> - Le WordPress en ligne est intact : vérifié le 28 octobre, thème Astra, extension 0.2.2, DNS toujours chez MochaHost, rien n'a été basculé.

**À lire en premier à la reprise : [REPRISE-SUIVANTE-2026-10-26.md](docs/REPRISE-SUIVANTE-2026-10-26.md).** La vitrine `www/` est la copie exacte du site WordPress, en attente de la validation du propriétaire (BA-034).

Site d'orientation juridique généraliste pour le Québec et développement d'un espace client/avocat distinct.

## Priorité courante — accès réel au backend

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

**besoinavocat.ca reste sur WordPress chez MochaHost. Ne pas rediriger ce domaine vers Render.** Le site Render conserve son adresse propre; le futur backend MochaHost est distinct de ces deux vitrines.

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
