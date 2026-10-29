# Déployer le portail Node sur Coolify

Décision du 27 octobre 2026 : héberger le portail Node sur le serveur Coolify du propriétaire avec une image construite depuis GitHub. L’étape sans accès au serveur est historique : une instance HTTPS de test est désormais joignable. **Configuration privée incomplète, recette login/corpus non validée.** Le refus antérieur du paquet MochaHost reste conservé dans son historique; aucune protection de cet hébergeur n’a été désactivée.

La vitrine besoinavocat.ca, reconstruite sans WordPress, est prévue comme seconde application Coolify. Ses réglages et **l'ordre de bascule DNS sont décrits dans [STOREFRONT](STOREFRONT.md)**. Il faut d'abord détacher le courriel, car le MX pointe sur le domaine, puis déployer le portail et enfin la vitrine.

## État de l’essai distant — 28 octobre 2026

La PR 2 est fusionnée dans `main` au commit `348d626b76d4adcd874cc7485d2e744006b249c9`. L’application est configurée avec la source `main`, le répertoire `/platform` et le Dockerfile `/Dockerfile`. Vérifier le SHA effectif de chaque déploiement avant sa recette.

| Ressource | État constaté |
|---|---|
| Projet | `BESOINAVOCAT` — `pwctapf4bxo821pbb9hvhaz8` |
| Environnement Coolify | `production` — `i16tncnyov97ttcvw5lxro96` ; nom administratif, pas une recette validée |
| Application | `besoinavocat-portail` — `fluzlqgkhifrgkmygknj4mjj` |
| Serveur | `vps1` — `31.220.96.134` |
| Déploiement | `c9qioijef3tljwkh50pstl52`, statut observé `Running` |
| URL d’essai | [Portail HTTPS de test](https://fluzlqgkhifrgkmygknj4mjj.31.220.96.134.sslip.io) |
| Santé | `/api/health` 200, `mode:pilot`, `identityConfigured:false`, `loginConfigured:false`, `intakeConfigured:true` |
| Réception des demandes | Désactivée; `intakeConfigured:true` ne signifie pas ouverture du formulaire |
| Stockage | Volume privé monté sur `/data`; 35 segments et archive complète vérifiés sur le serveur le 29 octobre à 04:16 UTC; restauration lancée en destination neuve |
| Configuration privée préparée | Grants vérifiés par empreinte, `1000:1000`, `0600`; clé de session de 32 octets créée en `0600`; variables publiques Supabase sauvegardées dans Coolify |
| Activation non validée | Résultat final de restauration à contrôler, variables non redéployées, connexion réelle et consultation des dossiers non testées |

**Reprise — 29 octobre 2026.** Les premières tentatives Chrome ont rencontré la restriction **Allow access to file URLs**, puis une perte de connexion à l’extension. L’accès a ensuite été repris dans le navigateur intégré connecté : `grants.json`, 198 octets, est visible dans `/data` à 03:31:27 UTC. Son empreinte a été contrôlée, puis son propriétaire corrigé à `1000:1000` et son mode à `0600`. La clé de session de 32 octets a été créée une seule fois en `0600`, sans afficher son contenu; ne pas la régénérer. Les variables publiques de connexion Supabase ont été sauvegardées dans Coolify, mais aucun redéploiement ni test de leur activation n’est encore confirmé.

**Archive complète vérifiée — 29 octobre 2026, 04:16 UTC.** Les 35 segments ont été reçus et contrôlés, puis l’archive assemblée de 362 450 598 octets vérifiée par son empreinte globale sur le serveur. Le gestionnaire de fichiers devait être rafraîchi pour constater leur présence; les difficultés observées lors des tentatives de plus gros fichiers n’ont pas de cause établie. La restauration a été lancée dans une destination neuve `corpus-2026-10-28-v2`; son résultat final reste à contrôler. La base initiale reste préservée. La réception vérifiée ne prouve ni une habilitation active ni l’accès aux dossiers. Ne jamais placer le corpus, les grants ou la clé dans GitHub.

La procédure privée `PROCEDURE-RESTAURATION-HOTE-COOLIFY-2026-10-28.md` est en cours d’exécution; **le lancement de la restauration n’en confirme pas encore la réussite**. Python 3.12.3 et SQLite 3.45.1 sont disponibles sur l’hôte; l’outil de restauration du commit `348d626` y a été téléchargé et son empreinte contrôlée. La procédure, les chemins opérateur, la sauvegarde et ses empreintes restent dans l’espace de travail privé; ce document public ne contient aucun secret.

Contrôle HTTPS distant du 28 octobre : **19/19 réussis**, dont sept assets identiques au code fusionné, cinq routes privées refusées en 401 et six chemins internes en 404. Le rapport `CONTROLE-COOLIFY-HTTPS-2026-10-28T17-33-00-004Z` est conservé dans les reçus privés. Ces contrôles ne testent pas une session utilisateur authentifiée.

Suite : contrôler le résultat de restauration, les compteurs, les empreintes et permissions du corpus, puis activer la configuration préparée et contrôler la vraie connexion, les trois dossiers, recherche/citations, téléchargements, refus d’accès et persistance. Conserver la clé de session et les grants déjà préparés. Le domaine d’essai et le health ne prouvent aucune mise en production validée ni bascule DNS.

## Ce qui a été vérifié localement (27 octobre)

Image construite avec `platform/Dockerfile` : Node 24.22.1, 331 Mo, aucune dépendance npm, utilisateur `node` non root, `/data` en 0700. Conteneur lancé avec un volume nommé sur `/data`, comme Coolify :

- statut Docker `healthy`;
- `/api/health` 200, `/demande` 200, `/api/catalog` ouvert;
- `POST /api/intake` synthétique 201 avec référence;
- après `docker restart`, la même clé d'idempotence renvoie **la même référence**, et la base contient une seule ligne;
- fichiers privés en 0600 dans `/data`.

Le service HTTPS de test et son health ont été contrôlés à distance le 28 octobre. La restauration du corpus, la connexion réelle, les contrôles d’accès, la persistance après redémarrage et les sauvegardes du serveur restent à vérifier.

## Réglages de l'application dans Coolify

| Réglage | Valeur |
|---|---|
| Source | GitHub `takatakca/BESOINAVOCAT.CA`, via l'application GitHub de Coolify |
| Branche | `main` (PR 2 fusionnée à `348d626`); réserver les nouvelles branches aux préversions |
| Déploiement automatique | pour l'essai, celui de Coolify à chaque push; en production, le flux `coolify-deploy.yml` après CI verte sur `main`, comme dans takatak-v1 ([STOREFRONT](STOREFRONT.md#déploiement-automatique-comme-dans-takatak-v1)) |
| Build pack | Dockerfile |
| Base directory | `/platform` |
| Dockerfile | `/Dockerfile` |
| Port exposé | `8787` (ne pas le publier sur l'hôte : seul le proxy Coolify doit y accéder) |
| Domaine | d'abord un domaine d'essai (domaine `sslip.io` proposé par Coolify), puis `https://portail.besoinavocat.ca`. L'enregistrement `portail` est aujourd'hui un A vers MochaHost (`209.42.24.127`, la v1 bloquée); le passer à `31.220.96.134`. |
| Stockage persistant | un volume monté sur `/data`; ne jamais monter `/app` |

Variables d'environnement (les chemins privés sont déjà fixés dans l'image) :

| Variable | Valeur |
|---|---|
| `APP_ORIGIN` | `https://<domaine du portail>` |
| `BESOINAVOCAT_INTAKE_ALLOWED_ORIGINS` | `["https://<domaine du portail>"]`. Ajouter l'origine WordPress seulement si un formulaire WordPress doit poster ici. |
| `BESOINAVOCAT_TRUST_PROXY` | `1` : le visiteur est lu dans le dernier `X-Forwarded-For`, ajouté par le proxy de Coolify. Sans cette valeur, tous les visiteurs partageraient la même limite anti-abus. À ne pas activer si le port est exposé directement. |
| `BESOINAVOCAT_INTAKE_REQUEST_ENABLED` | `false` tant que l'ouverture de la demande détaillée n'est pas décidée (D-006); `true` l'ouvre |
| `TAKATAK_SUPABASE_URL`, `TAKATAK_SUPABASE_PUBLISHABLE_KEY` | plus tard, pour la connexion du propriétaire : clé **publique** seulement, jamais `service_role` (voir [BROWSER_AUTH](BROWSER_AUTH.md)) |

## Une seule fois, dans le terminal du conteneur

1. Clé de session (32 octets aléatoires, jamais affichée) :
   `node -e "require('fs').writeFileSync('/data/session.key', require('crypto').randomBytes(32), { mode: 0o600, flag: 'wx' })"`.
   Ne jamais la recréer ni la copier ailleurs que dans une sauvegarde privée.
2. `grants.json` en 0600 avec l'UUID TAKATAK du propriétaire, au format de [BROWSER_AUTH](BROWSER_AUTH.md). Uniquement au moment d'activer la connexion.
3. Corpus : restauration de la sauvegarde vérifiée dans un nouveau sous-dossier privé, selon la procédure ci-dessous. La sauvegarde doit être restaurée, pas copiée à chaud depuis une base active.

## Restaurer un corpus dans le volume Coolify

L'image Node ne contient ni Python ni `backup-corpus.py`. Le développeur exécute l'outil du dépôt sur un poste ou un hôte administré disposant de Python, avec accès privé à la sauvegarde et au volume. L'outil refuse une destination existante : **ne pas passer `/data` comme destination**, puisque ce volume existe déjà.

1. Relever et vérifier l'empreinte de l'archive privée; lancer `python platform/tools/backup-corpus.py verify --archive <archive-privee>` depuis le dépôt sur le poste opérateur.
2. Restaurer avec `python platform/tools/backup-corpus.py restore --archive <archive-privee> --destination <nouveau-dossier-prive-inexistant>`. La destination doit être hors du dépôt et des racines web. Le rapport doit confirmer les fichiers et empreintes.
3. Arrêter l'application pour la maintenance. Transférer le **dossier restauré et vérifié complet** par le canal privé administrateur vers un nouveau sous-dossier du volume, par exemple `/data/corpus-2026-10-28`. Ne jamais superposer une base existante ni ses fichiers WAL. Si la restauration a lieu sur l'hôte directement dans le volume, employer son véritable chemin hôte et le même sous-dossier inexistant.
4. Vérifier les empreintes après transfert; donner au compte `node` du conteneur les droits sur ce seul nouveau répertoire, avec dossiers 0700 et fichiers 0600. Confirmer son UID/GID sur l'image, sans supposer ceux de l'hôte.
5. Régler `DATABASE_PATH=/data/corpus-2026-10-28/platform.sqlite` et `BLOB_DIR=/data/corpus-2026-10-28/blobs`. Conserver les bases intake/sessions et leur clé à leurs chemins actuels distincts. Cette archive de corpus ne remplace pas une sauvegarde complète du volume.
6. Redémarrer, vérifier les trois dossiers avec l'identité réelle habilitée et télécharger des pièces pour contrôler les empreintes. Conserver les anciens chemins et leur sauvegarde pour le retour arrière; aucune suppression de base ni d'archive n'est requise.

## Contrôles après chaque déploiement

- `curl https://<domaine>/api/health` → 200. `intakeConfigured: true` seulement si les origines sont réglées.
- `loginConfigured: true` indique la configuration de connexion navigateur; vérifier ensuite la connexion réelle. `identityConfigured` concerne l'introspection Bearer et ne remplace pas ce contrôle.
- `/demande`, `/demande.js` et `/demande.css` → 200, avec l'en-tête `Content-Security-Policy`.
- `/api/cases` sans session → 401; `/.env` et `/server.mjs` → 404.
- Seulement après ouverture autorisée de la réception : une demande synthétique depuis la page reçoit une référence. Tant que les demandes sont désactivées, vérifier leur refus explicite.
- Redéploiement : les demandes déjà reçues restent présentes, ce qui prouve que le volume `/data` est conservé.

## Sauvegarde

Après installation complète, le volume `/data` contiendra les bases SQLite (mode WAL), les pièces, la clé de session et les grants. Sauvegarder avec une méthode cohérente pour SQLite, comme indiqué dans [CPANEL_NODE](CPANEL_NODE.md). Conserver ensemble la clé et la base des sessions. Avant d'y placer des dossiers juridiques réels, noter où se trouve physiquement le serveur : un hébergement hors Québec demande une évaluation des facteurs relatifs à la vie privée (Loi 25).
