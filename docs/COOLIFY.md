# Déployer le portail Node sur Coolify

Décision du 27 octobre 2026 : le portail Node peut être hébergé sur le serveur Coolify du propriétaire au lieu de MochaHost. Ce choix supprime le blocage antivirus du paquet v2 (BA-018) et permet un déploiement automatique depuis GitHub. Ce document décrit les réglages; **aucun déploiement Coolify n'a encore été fait par un agent**, faute d'accès au serveur.

La vitrine besoinavocat.ca, reconstruite sans WordPress, est une seconde application Coolify. Ses réglages et **l'ordre de bascule DNS sont décrits dans [STOREFRONT](STOREFRONT.md)**. Il faut d'abord détacher le courriel, car le MX pointe sur le domaine, puis déployer le portail et enfin la vitrine.

## Ce qui a été vérifié localement (27 octobre)

Image construite avec `platform/Dockerfile` : Node 24.22.1, 331 Mo, aucune dépendance npm, utilisateur `node` non root, `/data` en 0700. Conteneur lancé avec un volume nommé sur `/data`, comme Coolify :

- statut Docker `healthy`;
- `/api/health` 200, `/demande` 200, `/api/catalog` ouvert;
- `POST /api/intake` synthétique 201 avec référence;
- après `docker restart`, la même clé d'idempotence renvoie **la même référence**, et la base contient une seule ligne;
- fichiers privés en 0600 dans `/data`.

Le serveur Coolify réel, son proxy, son certificat et ses sauvegardes restent à vérifier lors du premier déploiement.

## Réglages de l'application dans Coolify

| Réglage | Valeur |
|---|---|
| Source | GitHub `takatakca/BESOINAVOCAT.CA`, via l'application GitHub de Coolify |
| Branche | `main` (PR 1 fusionnée); réserver les nouvelles branches aux préversions |
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
- Une demande synthétique depuis la page reçoit une référence.
- Redéploiement : les demandes déjà reçues restent présentes, ce qui prouve que le volume `/data` est conservé.

## Sauvegarde

Le volume `/data` contient les bases SQLite (mode WAL), les pièces, la clé de session et les grants. Sauvegarder avec une méthode cohérente pour SQLite, comme indiqué dans [CPANEL_NODE](CPANEL_NODE.md). Conserver ensemble la clé et la base des sessions. Avant d'y placer des dossiers juridiques réels, noter où se trouve physiquement le serveur : un hébergement hors Québec demande une évaluation des facteurs relatifs à la vie privée (Loi 25).
