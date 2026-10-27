# Déployer le portail Node sur Coolify

Décision du 27 octobre 2026 : le portail Node peut être hébergé sur le serveur Coolify du propriétaire au lieu de MochaHost. Ce choix supprime le blocage antivirus du paquet v2 (BA-018) et permet un déploiement automatique à chaque push GitHub. Ce document décrit les réglages; **aucun déploiement Coolify n'a encore été fait par un agent**, faute d'accès au serveur.

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
| Branche | `codex/espace-client-avocat` pour l'essai, puis `main` après fusion de la PR 1 |
| Déploiement automatique | activé (chaque push déploie) |
| Build pack | Dockerfile |
| Base directory | `/platform` |
| Dockerfile | `/Dockerfile` |
| Port exposé | `8787` (ne pas le publier sur l'hôte : seul le proxy Coolify doit y accéder) |
| Domaine | d'abord un domaine d'essai (domaine `sslip.io` proposé par Coolify, ou un nouveau sous-domaine), puis `https://portail.besoinavocat.ca` quand MochaHost est retiré |
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
3. Corpus : restauration de la sauvegarde vérifiée dans `/data`, selon [CPANEL_NODE](CPANEL_NODE.md). La sauvegarde doit être restaurée, pas copiée à chaud depuis une base active.

## Contrôles après chaque déploiement

- `curl https://<domaine>/api/health` → 200. `intakeConfigured: true` seulement si les origines sont réglées.
- `/demande`, `/demande.js` et `/demande.css` → 200, avec l'en-tête `Content-Security-Policy`.
- `/api/cases` sans session → 401; `/.env` et `/server.mjs` → 404.
- Une demande synthétique depuis la page reçoit une référence.
- Redéploiement : les demandes déjà reçues restent présentes, ce qui prouve que le volume `/data` est conservé.

## Sauvegarde

Le volume `/data` contient les bases SQLite (mode WAL), les pièces, la clé de session et les grants. Sauvegarder avec une méthode cohérente pour SQLite, comme indiqué dans [CPANEL_NODE](CPANEL_NODE.md). Conserver ensemble la clé et la base des sessions. Avant d'y placer des dossiers juridiques réels, noter où se trouve physiquement le serveur : un hébergement hors Québec demande une évaluation des facteurs relatifs à la vie privée (Loi 25).
