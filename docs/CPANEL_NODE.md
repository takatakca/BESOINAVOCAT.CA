# Pilote Node.js sur cPanel / CloudLinux / Passenger

Préparation du 26 octobre 2026. L’inspection cPanel rapportée par l’agent principal confirme le compte `bolonca`, WordPress dans `/home/bolonca/besoinavocat.ca`, « Setup Node.js App », Node.js **24.22.1** et Passenger. Aucune application BESOINAVOCAT n’existait lors de cette inspection. Cette note et l’archive sont des éléments à déployer; elles ne prouvent pas qu’une application distante a été créée ou fonctionne.

La cible proposée est **`https://portail.besoinavocat.ca/`**, à créer et vérifier séparément. WordPress conserve sa racine et sa future page de présentation `/tableau-de-bord/`. La vitrine Render reste indépendante. Aucun montage du pilote sous `/espace` n’est prévu : ses chemins `/api`, `/app.js` et `/styles.css` partent de la racine du sous-domaine.

## Lanceur compatible

Le fichier `platform/deploy/passenger.cjs` est placé sous le nom **`app.cjs`** à la racine de l’archive. Il est chargé comme CommonJS puis utilise `import()` pour charger `server.mjs` en ESM. Ce contournement est documenté par [CloudLinux pour les applications ESM sous Passenger](https://cloudlinux.zendesk.com/hc/en-us/articles/6719280681884--ERR-REQUIRE-ESM-Must-use-import-to-load-ES-Module). Aucun patch de `platform/server.mjs` n’est requis.

Sous Passenger, le lanceur désactive l’installation implicite du serveur et appelle une seule fois `listen('passenger')`. Le socket est choisi par Passenger; aucun port TCP public ni règle de pare-feu supplémentaire n’est demandé. Hors Passenger, le lanceur écoute uniquement sur `127.0.0.1` pour les contrôles locaux, avec `PORT` numérique ou 8787 par défaut. Le port 0 sert aux tests locaux. Cette distinction suit la documentation officielle du [reverse port binding](https://www.phusionpassenger.com/docs/advanced_guides/in_depth/node/reverse_port_binding.html).

Le lanceur refuse Node hors branche 24 ou antérieur à 24.19. L’offre 24.22.1 observée respecte cette plage; la disponibilité effective de `node:sqlite` doit encore être confirmée par un démarrage sur l’hébergement. Aucun serveur de test n’utilise de secret réel.

## Préparer l’archive

Depuis la racine du dépôt, avec Python 3.10 ou plus récent et sa bibliothèque standard :

```sh
python platform/deploy/build_bundle.py --output platform/deploy/artifacts/besoinavocat-cpanel.zip
```

Le build utilise une **liste blanche de dix fichiers de code/documentation**, puis ajoute `DEPLOYMENT-MANIFEST.json` : onze entrées au total. Le manifeste contient leur taille et SHA-256. L’archive est relue, sa structure et ses empreintes vérifiées; une archive existante n’est jamais écrasée. Pour une nouvelle révision, utiliser un autre nom de sortie. À sources identiques, le ZIP est reproductible.

Les seuls fichiers applicatifs inclus sont `app.cjs`, `server.mjs`, `package.json`, trois modules `lib/` et les trois fichiers `public/`. La documentation de déploiement complète la liste. Aucun `.env`, `.data`, import de dossier, base SQLite, blob, journal, test, dépôt Git ou `node_modules` n’est parcouru ni inclus. Aucun téléchargement de dépendance n’est effectué.

## Paramètres à appliquer dans l’interface autorisée

Créer un répertoire applicatif distinct de WordPress, par exemple **`/home/bolonca/apps/besoinavocat-pilot`**, puis y extraire le ZIP. Il s’agit d’un chemin proposé, à confirmer dans cPanel. Ne pas extraire cette archive dans la racine WordPress ni publier le répertoire applicatif comme un simple répertoire de fichiers.

| Champ | Valeur prévue |
|---|---|
| Node.js version | 24.22.1, version observée dans cPanel |
| Application mode | Production |
| Application root | `apps/besoinavocat-pilot`, relatif au répertoire personnel du compte si l’interface le demande |
| Application URL | `portail.besoinavocat.ca`, chemin `/`, après création et vérification du sous-domaine |
| Application startup file | `app.cjs` |
| `NODE_ENV` | `production` |
| `DATABASE_PATH` | `/home/bolonca/besoinavocat-private/platform.sqlite` — chemin proposé |
| `BLOB_DIR` | `/home/bolonca/besoinavocat-private/blobs` — chemin proposé |
| Identité TAKATAK | Ne renseigner aucune valeur fictive; laisser non configurée pour le contrôle technique initial |

Les deux chemins de stockage doivent être **absolus et hors de tous les document roots web**, y compris WordPress et le sous-domaine. Le lanceur exige des chemins explicites et refuse ceux qui reviennent, même par un lien, dans l’arbre de l’application. Il ne connaît pas tous les autres document roots du compte : leur séparation doit être vérifiée dans cPanel avant le premier démarrage. Le répertoire privé doit appartenir au compte d’exécution et rester inaccessible par HTTP; conserver des permissions de dossier 0700 et de fichiers 0600 lorsque l’hébergement les applique.

La base et les blobs ne doivent pas être replacés dans le ZIP lors d’une mise à jour. Le backend n’a aucune dépendance npm externe à installer. Les options exactes de l’interface, notamment racine, URL et fichier de démarrage, sont décrites par [CloudLinux Node.js Selector](https://docs.cloudlinux.com/cloudlinuxos/lve_manager/#node-js-selector); l’opérateur doit retenir les valeurs effectivement affichées par son hébergeur.

## SQLite et nombre de processus

Le pilote utilise SQLite local avec WAL, pas une base distante. WAL exige que les processus partagent le même hôte et un stockage local approprié; il ne convient pas à un partage de base par système de fichiers réseau. Voir [SQLite WAL](https://www.sqlite.org/wal.html).

Pour ce pilote, **un processus applicatif unique est à confirmer avec l’hébergeur** avant l’usage avec des dossiers réels. Le lanceur ne crée ni cluster ni workers, mais cela ne contraint pas le nombre d’instances que Passenger peut démarrer. Aucun réglage d’environnement dans ce paquet ne prétend imposer cette limite.

Ne pas ajouter au hasard `PassengerMaxInstancesPerApp 1` dans `.htaccess` : la [référence Passenger Apache](https://www.phusionpassenger.com/docs/references/config_reference/apache/) réserve cette directive à la configuration serveur. Une éventuelle limite par application dépend de l’édition et des droits disponibles. Le dimensionnement et le mode de redémarrage doivent être confirmés via la configuration réellement accessible ou l’hébergeur. Le lancement initial sans identité ni données sert seulement à valider le fonctionnement technique.

## Contrôle après installation

Après démarrage par l’interface cPanel, contrôler via HTTPS :

1. `/api/health` : HTTP 200, `mode: "pilot"`, `identityConfigured: false` tant que TAKATAK n’est pas configuré.
2. `/api/cases` sans Authorization : HTTP 401, aucun dossier retourné.
3. Même route avec un jeton synthétique de contrôle, sans identité configurée : HTTP 503; aucune identité locale de remplacement.
4. `/`, `/app.js` et `/styles.css` : contenus de l’archive attendue; contrôler l’interface et les en-têtes réellement servis.
5. `/.env`, `/server.mjs`, `/lib/store.mjs` et les emplacements privés : jamais de contenu de code serveur, de configuration ou de données retourné.

La réussite d’une seule URL ou l’apparition de l’application dans cPanel ne suffit pas. Vérifier le certificat du sous-domaine et l’absence de modification de WordPress. Après confirmation seulement, ajouter le lien HTTPS vers le portail à la page WordPress. Consigner les réponses et empreintes du paquet livré; ne pas recopier de cookies, jetons ou variables secrètes dans les rapports.

Le raccordement réel TAKATAK nécessite encore son URL, le contrat accepté par son exploitant et le secret serveur; ce paquet n’invente aucun de ces éléments. Aucun compte, pièce ou document réel ne doit être déposé pendant ce contrôle sans identité. Les paiements, Twilio et fonctions d’IA restent désactivés.

## Mise à jour et restauration

Une nouvelle version remplace seulement les fichiers de code après contrôle du manifeste. Conserver l’archive précédente et le relevé de la version en service. Arrêter proprement l’application avant une sauvegarde cohérente de la base et des blobs; ne pas copier le seul fichier `.sqlite` d’une base WAL active en supposant que la sauvegarde est complète. Les procédures de sauvegarde/restauration, quotas et analyse antivirus restent à valider avant l’exploitation documentaire.

Les tests locaux livrés vérifient le chargement CommonJS/ESM, la sélection du socket Passenger, le refus des chemins de stockage non privés et un démarrage sans identité. Ils ne reproduisent pas le module Passenger/Apache distant. Le statut final de déploiement dépend des contrôles cPanel et HTTPS effectivement réalisés.
