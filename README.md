# BESOINAVOCAT.CA

Site d'orientation juridique généraliste pour le Québec et développement d'un espace client/avocat distinct.

## Nouveau mandat — 26 octobre 2026

Le propriétaire a confirmé **besoinavocat.ca chez MochaHost** et demandé WordPress pour la vitrine, un backend Node.js et un portail de travail pour les dossiers. Le dépôt est conservé; `site/` continue de contenir le site public existant.

Le pilote `platform/` ajoute une API persistante, des contrôles par dossier et organisation, des pièces et versions avec empreintes/provenance, la recherche, les échanges et des déclarations de temps à valider. Son interface propose un aperçu explicitement fictif. **Ce pilote n'est pas encore installé chez MochaHost et le compte client n'est pas activé.** Le raccordement à l'identité TAKATAK et la connexion navigateur restent à effectuer; aucun mot de passe local n'est créé.

- [Démarrage et tests du pilote](platform/README.md)
- [Architecture et limites réelles](docs/PLATFORM_ARCHITECTURE.md)
- [Raccordement WordPress / MochaHost](docs/MOCHAHOST_WORDPRESS.md)
- [État de reprise](docs/AGENT_HANDOFF.md)

Les crédits, paiements, Twilio, IA et accès à un disque distant ne sont pas actifs. La préparation d'import reste locale; aucune pièce du dossier maître n'est envoyée automatiquement dans un nouveau service.

## Site d'orientation conservé (livraison du 15 octobre 2026)

- Interface responsive en français : huit domaines de droit recherchables (accents et synonymes), sélection de région, niveau d'urgence, intérêt pour l'aide juridique.
- Guide généré localement dans le navigateur, lien vers le Barreau du Québec, JuridiQC et la Commission des services juridiques.
- Copie et impression volontaires du plan; **aucune donnée personnelle n'est envoyée, enregistrée ou partagée** par l'outil.
- Ressources institutionnelles ciblées (Barreau, JuridiQC, CSJ, CNESST et TAL), page 404 et contrôle public `/health.json`.
- Mentions de confidentialité et d'utilisation adaptées à ce périmètre (à réviser avec un responsable juridique avant les futurs traitements de données).
- Tests unitaires/structure Node.js natifs et GitHub Actions pour contrôle qualité; smoke HTTPS quotidien et **après chaque CI réussie de `main`**.
- Hébergement Render **en ligne** : service statique `besoinavocat` relié à `main`, déploiement automatique à chaque push.
- Workflow GitHub Pages facultatif, désactivé tant que `ENABLE_GITHUB_PAGES` n'est pas configurée à `true` et que Pages n'est pas activé.

Le produit n'est **pas encore** un annuaire propriétaire, un réseau de mise en relation, un cabinet d'avocats ou une plateforme de traitement de dossiers.

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

## Déploiement principal : Render

Service : [besoinavocat.onrender.com](https://besoinavocat.onrender.com) (premier déploiement **live** le 14 octobre 2026).

- Compte : espace Render `My Workspace`.
- Dépôt : `https://github.com/takatakca/BESOINAVOCAT.CA`.
- Branche : `main` ; déploiement automatique : activé.
- Commande de build : `test -s site/index.html && test -s site/styles.css`.
- Répertoire publié : `site`.

Ce site Render n'est pas encore relié au domaine personnalisé. Faire pointer le DNS et activer HTTPS uniquement après vérification de la propriété du domaine et du paramétrage Render.

## Déploiement facultatif : GitHub Pages

Le workflow `.github/workflows/pages.yml` publie le dossier `site/` vers GitHub Pages lors des pushes sur `main` **uniquement si** la variable de dépôt GitHub Actions `ENABLE_GITHUB_PAGES` vaut `true` et si **Settings → Pages → Build and deployment → Source: GitHub Actions** est activé. Sans ces activations, le workflow Pages est ignoré. Cela évite les échecs de déploiement inutiles maintenant que Render assure la publication.

Ne pas créer de fichier CNAME avant que le domaine soit vérifié, que le DNS pointe vers l'hébergement choisi et que HTTPS soit fonctionnel. Le déploiement GitHub Pages n'est **pas** un déploiement automatique vers l'hébergement commercial du nom de domaine `besoinavocat.ca`.

## Sécurité et respect de la vie privée

- Pas de formulaire de dossier confidentiel ni de collecte de leads.
- Pas de cookies analytiques, publicitaires ou d'intégrations tierces sur les pages.
- Politique CSP restrictive. Liens externes `noopener noreferrer`.
- Contenus généraux sans promesse juridique; aucune usurpation d'appartenance au Barreau.
- L'hébergeur peut disposer de journaux techniques. Vérifier leur politique et les obligations applicables lors du déploiement.

## Prochaines phases (non réalisées)

Voir [docs/RELEVE.md](docs/RELEVE.md). Le périmètre réel d'une plateforme de mise en relation, ses partenaires, rôles, contrats, consentements, processus de vérification et traitements de données nécessitent des décisions métier et des contrôles de sécurité avant ouverture en production.


## Pilotage et reprise des agents

Lire [AGENTS.md](AGENTS.md) puis [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md),
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
