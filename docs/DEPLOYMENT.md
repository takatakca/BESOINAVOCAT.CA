# DEPLOYMENT — BESOINAVOCAT.CA

## Hébergements distincts — état du 26 octobre 2026

| Surface | État vérifié | Limite |
|---|---|---|
| `https://besoinavocat.ca` | WordPress HTTPS chez MochaHost; forfait bolon.ca Ultimate actif, plugin 0.1.2 actif et aperçu publié | Vitrine seulement; contrôle ordinateur réussi, QA mobile encore ouverte |
| `https://besoinavocat.onrender.com` | Site d'orientation statique indépendant; 7 ressources HTTP 200 comparées au commit `b56d027c4172ddde5e362497731ac1ae80805fe0` le 26 octobre | Aucun backend du pilote; dernier déploiement privé Render non revalidé ce jour |
| `https://portail.besoinavocat.ca` | Cible proposée pour le pilote Node/Passenger | Aucun sous-domaine ou démarrage applicatif déclaré vérifié; aucune application BesoinAvocat encore créée |

**Ne pas déplacer besoinavocat.ca vers Render, ni modifier son DNS pour suivre l'ancienne BA-008.** WordPress conserve son contenu et ses URL; le portail sera servi à la racine de son sous-domaine dédié, sans montage `/espace`.

## WordPress : sauvegarde et changements réalisés

- Sauvegarde de base privée réussie : **194 722 770 octets**, mode **0600**. Elle n'est pas incluse dans le dépôt ou un paquet public; ce succès n'est pas encore un exercice de restauration.
- Export WXR local : **348 pages, dont 347 publiées**, SHA-256 `22d660865b220ec52e4a1cef2b65598e8e3baee9c77f6e29050f49dce9268b79`.
- **12 mentions JuriGo corrigées sur 9 pages**, avec gardes SHA et transaction. Le contrôle des 347 pages publiées conserve dates, URL et autres contenus.
- Réglages généraux : titre **BesoinAvocat**, description « Préparez votre dossier et votre recherche d’avocat. » à la place de « Lawyers Near Me ». Page **5820** `/tableau-de-bord/` désormais **publiée**, avec le seul shortcode `[besoinavocat_dashboard]`; aucune page existante supprimée. Les comptes WXR ci-dessus décrivent l'export antérieur à cette création.
- Plugin **0.1.2 installé et actif** après trois contrôles `php -l` et `check-render.php` réussis sur le serveur. ZIP final de **25 980 octets**, SHA-256 `616175937eb3ba05be4aa427e64db0773b9568d0f4bb022981218327a5ea41d8`; huit fichiers contrôlés contre les sources et empreinte serveur vérifiée. La 0.1.1 avait également passé ses contrôles, puis révélé le défaut visuel corrigé dans cette version.
- Contrôle réel : 800/839 absents de l'accueil inspecté, footer/liens présents; aperçu accessible via le bouton d'accueil, trois onglets et touche Début fonctionnels, console sans erreur/alerte. **Chevauchement résolu à 1 265 px** : quatre widgets x=78/largeur 570 px, carte x=836; aucun débordement horizontal constaté. Téléphone **514-825-2825** correct dans header/footer. Six articles : une note de non-partenariat chacun, 800 absent et recommandation Thetford remplacée.

Les résultats et limites sont détaillés dans [WORDPRESS_QA.md](WORDPRESS_QA.md). Compléter les contrôles mobiles; ne pas considérer le seul contrôle à 1 265 px comme une validation de toutes les tailles. La page `/tableau-de-bord/` reste un aperçu clairement identifié. **WordPress est exclusivement la vitrine; aucune gestion du corpus privé par plugin WordPress n'est retenue.** Les données, permissions et services applicatifs appartiendront au backend Node avec identité TAKATAK. La désactivation du plugin d'habillage ne rétablit pas à elle seule une correction de contenu faite en base. Le contact fourni n'active ni Twilio ni un service téléphonique automatisé.

## Portail Node.js préparé localement

Le pilote est dans `platform/`, branche `codex/espace-client-avocat`; il n'est pas servi par Render. Le panneau cPanel du compte `bolonca` propose **Node 24.22.1**, « Setup Node.js App » et Passenger. Il n'y avait aucune application BesoinAvocat lors de l'inspection.

Consulter [MOCHAHOST_WORDPRESS.md](MOCHAHOST_WORDPRESS.md) et [CPANEL_NODE.md](CPANEL_NODE.md) avant installation. Le lanceur `app.cjs` du paquet charge le serveur ESM et choisit explicitement le socket Passenger. L'archive comporte onze entrées à liste blanche, dont un manifeste d'empreintes; elle exclut base, blobs, `.env`, exports et pièces juridiques. Les chemins privés, la persistance, le processus unique et la disponibilité effective de `node:sqlite` restent à vérifier sur l'hébergement. Aucun réglage d'environnement fictif ne prétend limiter Passenger à une instance.

Les chemins et URL de `CPANEL_NODE.md` sont des valeurs proposées, pas une preuve de déploiement. Ne pas placer base, blobs ou manifestes dans un document root, `public/`, `site/` ou la bibliothèque média WordPress. Aucun secret ni URL de session d'administration ne doit être recopié dans Git.

### Contrôles locaux obtenus

**49 tests Node réussis** sous Node 24.19.0 : 12 site, 32 pilote, 5 lanceur Passenger. Les tests nécessitant localhost et des jonctions Windows ont été exécutés avec l'autorisation d'exécution adéquate; ils ne sont pas remplacés par des tests ignorés. Les **3 tests Python** du constructeur d'archive passent également. Le workflow `platform-checks.yml` contrôle le pilote, mais une réussite locale ne doit pas être présentée comme un résultat CI distant au nouveau SHA.

```sh
node --test tests/*.test.mjs platform/test/*.test.mjs platform/deploy/passenger.test.cjs
python -B -m unittest discover -s platform/deploy -p test_build_bundle.py -v
```

Le pilote reste sans connexion privée tant que TAKATAK n'est pas raccordé. L'aperçu fictif ne crée aucune session et n'écrit aucun dossier. Pour le démarrage technique futur, contrôler HTTPS, `/api/health`, les refus 401 sans identité et 503 avec jeton synthétique lorsque l'autorité n'est pas configurée, puis l'inaccessibilité du code et du stockage. Aucun document réel à importer avant validation des permissions et du parcours complet.

### GitHub et livraison

Les droits admin/push sur `takatakca/BESOINAVOCAT.CA` sont confirmés par le connecteur. Le contrôle `git push --dry-run origin HEAD:refs/heads/codex/espace-client-avocat` a réussi; il n'effectue pas de push réel. Le client `gh` local n'est pas authentifié, ce qui ne bloque pas l'accès Git ainsi testé. Ne pas enregistrer de jeton dans le dépôt ou les commandes de documentation; employer l'accès autorisé disponible et vérifier le SHA réellement livré. La présente mise à jour documentaire n'exécute aucun commit, push réel, DNS ou déploiement.

## Configuration Render historique conservée
- Plateforme : Render Static Site, nom `besoinavocat`.
- URL publique indépendante : `https://besoinavocat.onrender.com`.
- Render workspace ID : `tea-d04kpsali9vc73eskv8g`.
- Render service ID : `srv-db7srnmi0phs73ahkue0`.
- Répertoire de publication : `site`.
- Branche GitHub : `main`; autoDeploy : `yes`; commit déclenche un nouveau déploiement.
- Commande de build sur Render : `test -s site/index.html && test -s site/styles.css`.
- Aucun secret requis pour le MVP statique.
- Aucun raccordement de `besoinavocat.ca` à Render n'est prévu dans le mandat courant.

## Contrôles préalables
```sh
node --check site/app.js
node --check site/guide.mjs
node --test tests/*.test.mjs
```
Le workflow `.github/workflows/checks.yml` effectue ces vérifications sur chaque push sur `main` et sur les PR.

## Vérification historique du 15 octobre
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

## Pages et DNS : ne pas basculer WordPress
GitHub Pages reste optionnel et son workflow ne s'exécute que si la variable GitHub `ENABLE_GITHUB_PAGES=true` et la source Pages GitHub Actions sont activées. **Ne pas l'activer sans décision d'hébergement.**

L'ancien plan d'ajout de besoinavocat.ca sur Render est annulé par la confirmation du WordPress actif chez MochaHost. Conserver les enregistrements et URL WordPress. Un éventuel sous-domaine `portail.besoinavocat.ca` doit être configuré et contrôlé séparément dans le périmètre autorisé; sa simple mention dans les guides ne prouve pas sa création ou son certificat.

## Sauvegarde / rollback
Pour le site statique : historique GitHub + déploiements Render; revenir à un commit fiable par un **nouveau commit de correction/revert**, sans force-push destructif. Pour WordPress : conserver les sauvegardes privées et distinguer désactivation du plugin, restauration de fichiers et restauration de base. Pour le futur portail : tester une sauvegarde cohérente SQLite/WAL et blobs ainsi que sa restauration avant toute exploitation documentaire. La sauvegarde WordPress ne couvre pas automatiquement cette application distincte.

## Durcissement à envisager
Pour un site statique, les vrais en-têtes de réponse HTTP se configurent dans **Render Dashboard → Settings → Headers** (ex. X-Content-Type-Options, Referrer-Policy, Permissions-Policy, anti-framing). Le CSP méta actuel n'est pas un substitut complet aux en-têtes serveur. Ne pas annoncer les en-têtes comme appliqués tant que vérification HTTP absente.

## Contrôle navigateur et dernière preuve
- `python -m pip install -r requirements-qa.txt`, puis `python -m playwright install chromium` et `python scripts/browser_qa.py`.
- La QA Chromium est lancée par `.github/workflows/browser-qa.yml`, avec des captures conservées sept jours.
- Code `2cd5be9` : CI `success` run `38852776970`, Chromium `success` run `38852776863`, smoke `success` run `38852826709`, Render `live` déploiement `dep-db8qqms9v7es7397801g`.
- Après toute modification documentaire, vérifier que le dernier commit HEAD est également déployé et testé.
