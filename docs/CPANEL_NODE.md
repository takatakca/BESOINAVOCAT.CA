# Portail Node.js sur cPanel / CloudLinux / Passenger

État vérifié le **26 octobre 2026** : l'application **https://portail.besoinavocat.ca/** a été créée dans le compte MochaHost `bolonca` et démarre avec **Node.js 24.22.1**, Passenger et HTTPS. Le contrôle initial du code seul a obtenu `/api/health` **200**, `/api/cases` sans session **401**, `/server.mjs` **404** et `/.env` **404**. Ce contrôle ne prouve ni une connexion réelle à TAKATAK ni un import documentaire distant; les données du dossier restent locales à cette étape.

WordPress reste la vitrine sur `https://besoinavocat.ca`, avec son aperçu `/tableau-de-bord/`. Le portail Node porte le backend applicatif. La vitrine Render reste indépendante; aucun DNS WordPress vers Render ni montage du portail sous `/espace` n'est prévu.

## Emplacements réels et paramètres

| Élément | Valeur confirmée ou configuration à conserver |
|---|---|
| Application root | `/home/bolonca/apps/besoinavocat-pilot` |
| Document root public du sous-domaine | `/home/bolonca/portail.besoinavocat.ca` |
| Racine WordPress distincte | `/home/bolonca/besoinavocat.ca` |
| Application URL | `https://portail.besoinavocat.ca/` |
| Node.js / mode | `24.22.1` / `production` |
| Startup file | `app.cjs` |
| `DATABASE_PATH` | `/home/bolonca/besoinavocat-private/platform.sqlite` |
| `BLOB_DIR` | `/home/bolonca/besoinavocat-private/blobs` |
| `BESOINAVOCAT_GRANTS_FILE` | `/home/bolonca/besoinavocat-private/grants.json` |
| `BESOINAVOCAT_SESSION_DB_PATH` | `/home/bolonca/besoinavocat-private/sessions.sqlite` |
| `BESOINAVOCAT_SESSION_KEY_FILE` | `/home/bolonca/besoinavocat-private/session.key` |
| `APP_ORIGIN` | `https://portail.besoinavocat.ca` |

Les emplacements applicatif et privés ont été comparés aux **49 document roots** du compte : **aucun chevauchement** constaté. Le code ne remplace pas cette inspection d'hébergement : il refuse les chemins dans sa propre application et plusieurs répertoires web usuels, mais ne connaît pas toutes les configurations Apache possibles. Conserver le dossier privé en `0700` et les fichiers privés en `0600`. Ne jamais extraire des pièces, grants, clés ou bases dans un document root.

## Lanceur et archive

`platform/deploy/passenger.cjs` est placé sous le nom `app.cjs` à la racine du paquet. Il charge `server.mjs` en ESM avec `import()` depuis CommonJS, selon le contournement documenté par [CloudLinux](https://cloudlinux.zendesk.com/hc/en-us/articles/6719280681884--ERR-REQUIRE-ESM-Must-use-import-to-load-ES-Module).

Sous Passenger, le lanceur désactive l'installation implicite et appelle une seule fois `listen('passenger')`; le socket est fourni par l'hébergeur. Hors Passenger, il écoute uniquement sur `127.0.0.1`, avec `PORT` numérique ou 8787. Node 24.19 ou ultérieur dans la branche 24 est requis. Le démarrage réel a confirmé la disponibilité de `node:sqlite` sous 24.22.1. Voir [reverse port binding Passenger](https://www.phusionpassenger.com/docs/advanced_guides/in_depth/node/reverse_port_binding.html) et [Node.js Selector](https://docs.cloudlinux.com/cloudlinuxos/lve_manager/#node-js-selector).

Depuis le dépôt, créer une archive sous un **nouveau nom** :

```sh
python platform/deploy/build_bundle.py --output platform/deploy/artifacts/besoinavocat-cpanel-revision.zip
```

La liste blanche explicite de `build_bundle.py` est la référence des fichiers inclus. Elle évolue avec les modules nécessaires; ne pas utiliser un ancien nombre fixe de fichiers comme critère de validité. `DEPLOYMENT-MANIFEST.json` décrit les chemins, tailles et SHA-256 du paquet effectivement construit. Le build relit l'archive, vérifie sa structure et ses empreintes et refuse d'écraser une archive existante. À sources identiques, le ZIP est reproductible.

Le paquet contient uniquement le lanceur, le serveur, les modules applicatifs nécessaires — dont **les deux modules browser-session** —, les outils d'import autorisés, les ressources de l'interface et la documentation choisie. Il ne contient jamais `.env`, données de dossier, manifests privés, grants, clé de session, bases SQLite ou WAL, blobs, journaux, tests, Git ou `node_modules`. Aucun téléchargement npm n'est nécessaire.

## Raccordement de l'identité existante

Le navigateur utilise l'identité TAKATAK existante via son fournisseur Supabase confirmé. Le module utilise `/auth/v1/token?grant_type=password`, puis `/auth/v1/user`; il ne crée ni compte, ni mot de passe local, ni identité WordPress. Les comptes et mots de passe réels ne doivent pas être copiés dans les fichiers ou rapports.

Configurer côté serveur :

- `TAKATAK_SUPABASE_URL` : origine HTTPS exacte du projet TAKATAK de production confirmé. La référence de production identifiée dans le code est `pcjfahhlozsseqqevimi`; ne pas utiliser le projet staging.
- `TAKATAK_SUPABASE_PUBLISHABLE_KEY` : clé publique du projet confirmé, jamais une clé `service_role` ou `sb_secret_…`.
- Les chemins privés et `APP_ORIGIN` du tableau ci-dessus.
- `NODE_ENV=production` : exige les deux chemins du stockage partagé de sessions. Une paire absente, illisible ou incompatible laisse la connexion indisponible.

Le fichier `grants.json` autorise explicitement un **subject UUID vérifié** vers un tenant BesoinAvocat; il est relu à chaque connexion et requête authentifiée. Les rôles et appartenances à un dossier restent contrôlés dans la base applicative. Ni l'email ni les métadonnées modifiables par l'utilisateur ne confèrent de rôle. Aucun profil ou compte nouveau n'est nécessaire pour réutiliser une identité existante confirmée.

L'ancienne introspection Bearer (`TAKATAK_IDENTITY_URL` et `TAKATAK_SERVICE_TOKEN`) reste un mécanisme distinct. Ne pas lui attribuer une URL de fonction TAKATAK au contrat différent pour simuler sa disponibilité. La connexion navigateur directe à Supabase n'exige pas ce secret d'introspection. Voir [BROWSER_AUTH.md](BROWSER_AUTH.md) pour le contrat, les grants synthétiques, les cookies et les limites.

## SQLite et sessions partagées entre workers

Le stockage SQLite/WAL a été contrôlé sur un système de fichiers local ext2/ext3. Un processus Passenger a été observé, mais le réglage de son nombre maximal n'était pas accessible. **L'application ne dépend donc plus de sessions conservées dans la mémoire d'un unique worker.** Ne pas ajouter une variable imaginaire ou une directive `.htaccess` pour prétendre imposer un processus unique. Certaines directives de limite relèvent de la [configuration serveur Passenger](https://www.phusionpassenger.com/docs/references/config_reference/apache/).

Tous les workers doivent utiliser les mêmes chemins privés de base applicative, blobs, grants, base de sessions et clé. La base de sessions utilise WAL et des transactions `BEGIN IMMEDIATE` pour les admissions, limites et réservations. Le jeton d'accès, le subject et le tenant y sont chiffrés en **AES-256-GCM**, avec une clé binaire aléatoire de **32 octets**, générée une fois côté serveur sans affichage. La valeur de cette clé ne va pas dans une variable visible du panneau, Git ou un rapport. Les mots de passe et refresh tokens ne sont pas conservés.

Une fermeture de worker ferme sa connexion SQLite sans déconnecter les autres. Une déconnexion explicite supprime la session partagée, y compris lorsqu'une vérification est en cours dans un autre processus. Le cookie est opaque, `__Host-ba_session`, `HttpOnly`, `Secure`, `SameSite=Strict`, sans `Domain`; sa durée ne dépasse ni l'expiration Supabase ni une heure. `/auth/v1/user` et les grants restent contrôlés à chaque résolution.

Les tests locaux incluent un véritable second processus Node qui résout puis révoque une session du premier, ainsi que l'absence de secrets en clair dans DB/WAL. Ils ne remplacent pas les contrôles du déploiement réel. Cette architecture concerne plusieurs workers sur **un même hôte et un stockage local**; elle ne valide pas SQLite sur NFS ou sur plusieurs serveurs. Voir [SQLite WAL](https://www.sqlite.org/wal.html).

## Contrôles après chaque installation

1. Comparer le SHA du ZIP et toutes les empreintes du manifeste côté serveur avant remplacement du code. Conserver le paquet précédent pour retour arrière.
2. Vérifier via HTTPS `/api/health`, `/`, `/app.js`, `/styles.css` et la version attendue. `loginConfigured` indique une configuration et un stockage ouverts; ce n'est pas la preuve d'une connexion fournisseur réussie. `identityConfigured` décrit séparément l'ancienne introspection Bearer.
3. Vérifier `/api/cases` anonyme : **401** et aucune donnée. Les faux cookies, les sessions expirées et les demandes d'un autre tenant doivent être refusés.
4. Vérifier que `/.env`, `/server.mjs`, `/lib/store.mjs` et les fichiers privés ne retournent aucun contenu de configuration, de code serveur ou de dossier. Les 404 initiales de `/.env` et `/server.mjs` doivent rester vraies après les mises à jour.
5. Tester les origines et en-têtes de protection : connexion, déconnexion et mutations par cookie exigent l'origine exacte du portail et `X-Requested-With: XMLHttpRequest`. Contrôler `Cache-Control: no-store` sur les réponses privées et l'absence de mise en cache par le proxy.
6. Après configuration autorisée seulement, vérifier une véritable connexion utilisateur, sa déconnexion, le refus après retrait du grant et la continuité entre workers. Ne pas consigner mot de passe, cookie, jeton ou réponse fournisseur complète.
7. Importer les dossiers uniquement après simulation locale et contrôles d'identité, destination, SHA et quota. Un build ou une réponse health200 n'autorise pas à annoncer que les pièces sont déjà sur le portail.

Les résultats vérifiés à la date de cette note concernent le démarrage initial sans données et les tests locaux de l'intégration. **La connexion réelle et l'import distant ne sont pas présentés comme effectués.** WordPress conserve ses URL et contenus; les paiements, Twilio et fonctions d'IA restent désactivés.

## Mise à jour, sauvegarde et retour arrière

Une mise à jour remplace seulement le code contrôlé. Ne pas replacer données ou secrets dans le ZIP et ne pas régénérer la clé de session au redémarrage. Conserver séparément la version en service, les empreintes, les sauvegardes privées et le paquet précédent.

Une sauvegarde SQLite doit être cohérente avec WAL : ne pas copier seulement le fichier `.sqlite` d'une base active en supposant que tous les changements y figurent. Utiliser une procédure SQLite adaptée ou arrêter proprement tous les workers pendant la sauvegarde. Conserver une paire cohérente base de sessions/clé si les sessions doivent être restaurées; une clé incompatible ferme l'accès. La rotation de cette clé exige une révocation et un remplacement contrôlés, pas une modification isolée du fichier.

Après restauration, revérifier origines, grants, accès anonyme, tenant/dossier, déconnexion et empreintes des pièces. Les quotas, sauvegardes/restaurations documentaires et contrôles des fichiers doivent être validés avant d'annoncer l'exploitation complète. Aucun test simulé ne constitue une certification de l'hébergement ou de la confidentialité des logs.
