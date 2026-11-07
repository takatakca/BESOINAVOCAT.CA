# API du portail pour le site besoinavocat.ca et les outils du propriétaire

Lot du 7 novembre 2026. Le portail `platform/` expose maintenant une **API de plateforme** que les propres systèmes du propriétaire appellent de serveur à serveur : le site public (`www/`, ou le WordPress encore en ligne chez MochaHost), les outils TAKATAK, un tableau de bord interne. Elle complète le formulaire navigateur décrit dans [INTAKE_API](INTAKE_API.md); elle ne le remplace pas.

Trois règles fixes :

1. **Une clé n'ouvre jamais un dossier.** Les routes `/api/v1` ne touchent ni aux dossiers, ni aux pièces, ni aux comptes des avocats. Elles servent le catalogue, le dépôt d'une demande de contact et des totaux sans donnée personnelle.
2. **Jamais depuis un navigateur.** Une requête qui porte `Origin` ou `Cookie` est refusée (403). La clé reste dans le serveur du site, jamais dans une page.
3. **Le serveur ne garde que l'empreinte.** `BESOINAVOCAT_API_KEYS` contient l'empreinte SHA-256 de chaque clé, pas la clé. Une clé perdue se remplace, elle ne se retrouve pas.

La description lisible par machine est servie sur `GET /api/openapi.json` (OpenAPI 3.1, [`platform/lib/api-spec.mjs`](../platform/lib/api-spec.mjs)); elle s'ouvre dans Swagger UI, Postman ou Insomnia.

## Créer une clé (propriétaire ou technicien)

Depuis la racine du dépôt, avec Node 24 :

```sh
node platform/tools/api-key.mjs --id site-wordpress --name "Site besoinavocat.ca" --scopes intake:write,catalog:read
```

La commande affiche **une seule fois** la clé (`ba_site-wordpress_…`) et l'entrée JSON à ajouter au tableau `BESOINAVOCAT_API_KEYS` dans Coolify, par exemple :

```json
[
  {"id":"site-wordpress","name":"Site besoinavocat.ca","sha256":"<empreinte hex>","scopes":["intake:write","catalog:read"]},
  {"id":"takatak-tableau","name":"Tableau TAKATAK","sha256":"<empreinte hex>","scopes":["intakes:read"]}
]
```

- `id` : minuscules, chiffres et tirets, 40 caractères au plus; unique.
- `scopes` (permissions) : `catalog:read`, `intake:write`, `intakes:read`. Donner le strict nécessaire.
- 32 clés au plus. **Une seule entrée malformée désactive toutes les clés**, et le rapport de démarrage (`node platform/tools/deploy-readiness.mjs`) le dit.
- Après l'ajout : redéployer le portail à la main (l'autodéploiement est désactivé, voir le journal du 7 novembre).
- La clé va dans le système appelant seulement (variable d'environnement, `wp-config.php` hors dépôt, Coolify). Jamais dans GitHub, Drive, un courriel ou le journal.

Pour révoquer une clé : retirer son entrée et redéployer. Pour la remplacer : créer une nouvelle entrée avec un nouvel `id` ou la même `id` et une nouvelle empreinte.

## Appeler l'API

En-tête sur chaque appel : `Authorization: Bearer ba_<id>_<secret>`. Réponses toujours en JSON, `Cache-Control: no-store`, sans en-tête CORS.

| Route | Permission | Usage |
|---|---|---|
| `GET /api/v1/me` | aucune | Vérifier une clé : `{ "id", "name", "scopes" }`. |
| `GET /api/v1/catalog` | `catalog:read` | Le même catalogue que `GET /api/catalog` (prix en cents CAD, domaines, régions, consentement en vigueur). |
| `POST /api/v1/intake` | `intake:write` | Déposer une demande de contact. Même corps et mêmes règles que `/api/intake` (voir [INTAKE_API](INTAKE_API.md)); `Idempotency-Key` (UUID v4) obligatoire; ni `Origin` ni `X-Requested-With`. Réponse `201 { "reference": "BA-…", "status": "received" }`. |
| `GET /api/v1/intakes/summary` | `intakes:read` | Totaux : `{ total, counts: { received, in_review, contacted, closed, spam }, open, lastReceivedAt, generatedAt }`. Aucun nom, aucune coordonnée, aucune référence. |

Exemple avec curl (données entièrement fictives) :

```sh
curl -sS https://portail.besoinavocat.ca/api/v1/intake \
  -H "Authorization: Bearer $BESOINAVOCAT_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen | tr 'A-Z' 'a-z')" \
  -d '{"name":"Personne de démonstration","email":"person@example.test","role":"client","language":"fr","domain":"civil","region":"montreal","consent":true,"consentVersion":"2026-10-26.1","website":""}'
```

Exemple côté site, en PHP (dans le serveur WordPress, jamais dans une page) :

```php
$response = wp_remote_post('https://portail.besoinavocat.ca/api/v1/intake', [
  'headers' => [
    'Authorization'   => 'Bearer ' . BESOINAVOCAT_API_KEY, // définie dans wp-config.php, hors dépôt
    'Content-Type'    => 'application/json',
    'Idempotency-Key' => wp_generate_uuid4(),
  ],
  'body'    => wp_json_encode($demande),
  'timeout' => 10,
]);
```

Ce qui est enregistré pour une demande déposée par clé : les mêmes champs que par le navigateur, avec l'origine `apikey:<id>` au lieu de l'origine HTTPS du site. La file `/demandes` la traite exactement comme les autres.

## Limites et erreurs

- Par clé : **60 appels par minute** et **2 000 par jour** (`429 API_RATE_LIMIT`). Les limites du formulaire s'ajoutent (`429 INTAKE_RATE_LIMIT`, 3 demandes par courriel sur 24 heures, 120 par minute au total).
- Idempotence : la même `Idempotency-Key` avec le même corps renvoie le même reçu; avec un autre corps ou depuis une autre clé, `409 IDEMPOTENCY_CONFLICT`.
- Une seule base des demandes : si `BESOINAVOCAT_INTAKE_DB_PATH` n'est pas configurée, `POST /api/v1/intake` et le résumé répondent `503 INTAKE_UNAVAILABLE`.

| HTTP | Code | Sens |
|---|---|---|
| 401 | `API_KEY_REQUIRED` | Aucun en-tête `Authorization` (réponse avec `WWW-Authenticate: Bearer`). |
| 403 | `API_KEY_INVALID` | Clé inconnue, mal formée, en double, ou appel venant d'un navigateur (`Origin`/`Cookie`). |
| 403 | `API_SCOPE_MISSING` | La clé existe mais n'a pas cette permission. |
| 429 | `API_RATE_LIMIT` | Limite de la clé atteinte. |
| 404 / 405 | `NOT_FOUND` / `METHOD_NOT_ALLOWED` | Route ou méthode inconnue sous `/api/v1`. |

Les erreurs du formulaire (`INTAKE_INVALID_INPUT`, `INTAKE_CONSENT_REQUIRED`, `IDEMPOTENCY_CONFLICT`, `INTAKE_RATE_LIMIT`, `INTAKE_UNAVAILABLE`) gardent leur sens de [INTAKE_API](INTAKE_API.md).

## Ce que l'API ne fait pas (volontairement)

- Pas de lecture d'une demande par référence, ni d'export : les coordonnées restent dans la file `/demandes`, réservée aux personnes nommées dans `BESOINAVOCAT_INTAKE_REVIEWERS`.
- Pas d'accès aux dossiers, pièces, messages, temps ou intégrations : ces routes exigent la session de la personne (cookie), jamais une clé.
- Pas d'annuaire d'avocats ni de mise en relation : rien n'est inventé ni promis (AGENTS.md).
- Pas de paiement.

## Vérifications

- `platform/test/api-keys.test.mjs` : forme des clés, liste malformée, comparaison en temps constant, refus des navigateurs, permissions, limites, dépôt par clé, rejeu idempotent, séparation avec le formulaire navigateur, outil de création.
- `platform/test/api-spec.test.mjs` : document OpenAPI complet et sans secret, route `/api/openapi.json` (GET/HEAD, cache public, 405/400).
- `node platform/tools/deploy-readiness.mjs` : ligne `api` dans le rapport de démarrage.

Référence : [`platform/lib/api-keys.mjs`](../platform/lib/api-keys.mjs), [`platform/lib/api-spec.mjs`](../platform/lib/api-spec.mjs), [`platform/tools/api-key.mjs`](../platform/tools/api-key.mjs), routes dans [`platform/server.mjs`](../platform/server.mjs).
