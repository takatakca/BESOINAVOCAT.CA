# DEPLOYMENT — BESOINAVOCAT.CA

## Portail Node.js — 26 octobre 2026

Le pilote est préparé dans `platform/`, sur la branche `codex/espace-client-avocat`. Il n'est pas servi par le déploiement statique Render. Le site public besoinavocat.ca est un WordPress distinct chez MochaHost, confirmé par le propriétaire et ouvert dans le navigateur. Son panneau privé n'est pas encore connecté.

Consulter [MOCHAHOST_WORDPRESS.md](MOCHAHOST_WORDPRESS.md) avant toute installation. Le pilote utilise Node 24.19.x et un disque persistant privé; ses valeurs d'exemple ne configurent ni comptes réels ni secrets. Il ne faut pas placer base, blobs ou manifestes dans `public/`, `site/` ou la bibliothèque média WordPress.

Vérification locale : `node --test platform/test/*.test.mjs`. Le workflow `platform-checks.yml` l'exécute sur les branches de travail et les PR. Le pilote reste sans connexion privée tant que TAKATAK n'est pas raccordé. L'aperçu fictif ne crée aucune session et n'écrit aucun dossier.

Le 26 octobre, les 7 ressources publiques Render contrôlées correspondaient aux blobs de `main` au commit `b56d027c4172ddde5e362497731ac1ae80805fe0`. L'identifiant du dernier déploiement privé n'a pas été revalidé : le connecteur n'avait pas d'espace sélectionné. Ne pas confondre ce contrôle HTTP réussi avec la validation du backend sur MochaHost.

## Production vérifiée
- Plateforme : Render Static Site, nom `besoinavocat`.
- URL provisoire publique : `https://besoinavocat.onrender.com`.
- Render workspace ID : `tea-d04kpsali9vc73eskv8g`.
- Render service ID : `srv-db7srnmi0phs73ahkue0`.
- Répertoire de publication : `site`.
- Branche GitHub : `main`; autoDeploy : `yes`; commit déclenche un nouveau déploiement.
- Commande de build sur Render : `test -s site/index.html && test -s site/styles.css`.
- Aucun secret requis pour le MVP statique.
- Domaine cible : `besoinavocat.ca`, non confirmé sur Render.

## Contrôles préalables
```sh
node --check site/app.js
node --check site/guide.mjs
node --test tests/*.test.mjs
```
Le workflow `.github/workflows/checks.yml` effectue ces vérifications sur chaque push sur `main` et sur les PR.

## Dernière vérification réussie
- Commit code/automatisation : `8ea7be249fc83762d5e9f159bfe4b56b68e94bc9`.
- GitHub Actions Quality checks : `success` (run `38776153594`).
- Render : `live` au SHA identique (deploy `dep-db8glgflot8c738va7mg`).
- Smoke HTTPS : `success` (run `38776190441`), **7 requêtes HTTP 200**, première tentative.
- Toute écriture de documentation ultérieure déclenche un nouveau SHA, à vérifier à nouveau.

## Contrôle post-déploiement
1. Vérifier `GitHub Actions → Quality checks` : conclusion success sur le commit attendu.
2. Vérifier le dernier déploiement Render du service : `status=live` et `commit.id == SHA` poussé sur `main`.
3. Exécuter `SITE_URL=https://besoinavocat.onrender.com node scripts/production-smoke.mjs` (ou le workflow manuel **Production availability smoke test**).
4. Ouvrir `/`, `/confidentialite.html`, `/conditions.html`, `/health.json`; vérifier interface, aucun message console bloquant.
5. En cas d'échec, inspecter les journaux Render et GitHub Actions; ne pas déclarer la version courante déployée.

## Surveillance planifiée
`.github/workflows/production-smoke.yml` : contrôle en lecture seule quotidien à 10:17 UTC, déclenchable manuellement et automatiquement après le succès du workflow Quality checks sur `main`. Il effectue jusqu'à six tentatives espacées de 12 secondes pour laisser Render publier. Il n'effectue aucun redéploiement ni aucune relance autonome de l'agent de code.

## Pages et DNS
GitHub Pages reste optionnel et son workflow ne s'exécute que si la variable GitHub `ENABLE_GITHUB_PAGES=true` et la source Pages GitHub Actions sont activées. **Ne pas l'activer sans décision d'hébergement.**

Pour le domaine personnalisé :
1. Vérifier la propriété du domaine et l'accès au DNS, identifier les enregistrements actuels.
2. Ajouter le domaine sur le service Render; suivre les instructions DNS exactes affichées.
3. Activer/vérifier TLS et redirections, puis tester `https://besoinavocat.ca` et éventuellement `www`.
4. Mettre à jour les URLs canoniques, sitemap et documentation *seulement une fois le domaine réellement accessible*.

## Sauvegarde / rollback
Historique GitHub + déploiements Render. En cas d'incident, revenir à un commit fiable par un **nouveau commit de correction/revert**; ne jamais faire de force-push destructif. Conserver la référence de la version stable. Pas de base de données à sauvegarder dans cette version.

## Durcissement à envisager
Pour un site statique, les vrais en-têtes de réponse HTTP se configurent dans **Render Dashboard → Settings → Headers** (ex. X-Content-Type-Options, Referrer-Policy, Permissions-Policy, anti-framing). Le CSP méta actuel n'est pas un substitut complet aux en-têtes serveur. Ne pas annoncer les en-têtes comme appliqués tant que vérification HTTP absente.

## Contrôle navigateur et dernière preuve
- `python -m pip install -r requirements-qa.txt`, puis `python -m playwright install chromium` et `python scripts/browser_qa.py`.
- La QA Chromium est lancée par `.github/workflows/browser-qa.yml`, avec des captures conservées sept jours.
- Code `2cd5be9` : CI `success` run `38852776970`, Chromium `success` run `38852776863`, smoke `success` run `38852826709`, Render `live` déploiement `dep-db8qqms9v7es7397801g`.
- Après toute modification documentaire, vérifier que le dernier commit HEAD est également déployé et testé.
