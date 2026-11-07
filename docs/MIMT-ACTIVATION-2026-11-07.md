# Activer MIMT Connect pour BesoinAvocat — état et marche à suivre (7 novembre 2026)

Note du fil « Activer le partenaire MIMT pour les appels ». Elle complète [INTEGRATION-MIMT-2026-10-30.md](INTEGRATION-MIMT-2026-10-30.md) (contrat) et la fiche de remise [REMISE-INTEGRATIONS-2026-11-07.md](REMISE-INTEGRATIONS-2026-11-07.md) (variables du portail). **Aucun secret ici.**

## Ce qui a été vérifié le 7 novembre 2026 (09:00 à 09:20 UTC)

| Point | Constat |
|---|---|
| MIMT Connect en ligne | `GET https://api.mimt.ca/v1/partner/members` répond **404 `not_found`** : `PARTNERS` est encore à `off` sur l'API MIMT. |
| Version en ligne de MIMT | `app.mimt.ca/mimt-release.json` = `2c960db` (30 octobre). Les lots A et B de MIMT Connect sont sur `main` de `takatakca/mimtcaapp` (`1c33e7e`) mais **pas encore publiés**. |
| Où tourne l'API MIMT | Pas sur `coolify.takatak.ca` (un seul projet, `TAKATAK-V1`, application `takatak.ca`). Les secrets `COOLIFY_URL/TOKEN/API_UUID` du dépôt `mimtcaapp` pointent encore vers `coolify.takatak.ca` et répondent **401** : ils sont périmés. L'API vit vraisemblablement dans le Coolify local de VPS2 (`31.220.96.134`), le même que le portail, que seul le technicien (Colombo) connaît. |
| Nouveau dans `mimtcaapp` | Workflow manuel **« API env (Coolify) »** (`.github/workflows/api-env.yml`, PR #104 fusionnée) : pose une variable non secrète sur l'application API et redéploie. Il fonctionnera dès que les trois secrets Coolify du dépôt seront remis à jour. |
| Numéros | `(450) 999-3999` appartient à BesoinAvocat (compte Twilio « CLOVER API », renvoi d'appel). `(855) 328-6228` = (855) 3-AVOCAT, commandé par le propriétaire le 30 octobre. Pour servir de numéro public du groupe « Trouver un avocat », le numéro doit être dans le compte Twilio de l'API MIMT puis importé dans MIMT (Compte › Administration MIMT › Importer). |

## Marche à suivre côté MIMT (technicien, puis propriétaire)

1. **Technicien, dans le Coolify qui héberge `api.mimt.ca`** : variable `PARTNERS=on` sur l'application API, puis **Redeploy** (publier `main` au passage pour avoir les lots A et B). Vérification : `curl -s https://api.mimt.ca/v1/partner/members` doit répondre **401** (`invalid_api_key`) et non 404.
   - Même occasion : mettre à jour les secrets GitHub `COOLIFY_URL`, `COOLIFY_TOKEN` (jeton avec droits lecture + écriture + déploiement) et `COOLIFY_API_UUID` du dépôt `mimtcaapp`, pour que « Deploy » et « API env (Coolify) » refonctionnent.
   - `CATALOG_ADMIN_USER_IDS` doit contenir l'identifiant MIMT du propriétaire (sinon la page Compte › Administration MIMT répond 403). À vérifier une fois connecté.
2. **Propriétaire, connecté à `app.mimt.ca`** (session texto ou clé d'accès) : créer le standard « BesoinAvocat » (`/affaires/nouvelle`), prendre le forfait **MIMT Affaires Pro** (groupes d'appel + enregistrement) et enregistrer l'adresse 9-1-1.
3. **Partenaire** (administrateur MIMT, API ou agent dans le navigateur du propriétaire) : `POST /v1/admin/partners {"businessId":"…","slug":"besoinavocat","creditPerMinute":2}`, puis recharge `POST /v1/admin/partners/:id/credits {"credits":5000,"idempotencyKey":"besoinavocat-2026-11"}`.
4. **Clé et webhook** (propriétaire, section Partenaire du standard, confirmation récente exigée) : clé « Site besoinavocat.ca » (`mimt_pk_…`, montrée une fois) et webhook `https://portail.besoinavocat.ca/api/mimt/webhook` (secret `whsec_…`, montré une fois). Les deux vont dans un fichier privé sur le PC du propriétaire (dossier BESOINAVOCAT) puis dans le Coolify du portail : `BESOINAVOCAT_MIMT_API_KEY`, `BESOINAVOCAT_MIMT_WEBHOOK_SECRET`.
5. **Numéro public** : importer `(450) 999-3999` ou `(855) 328-6228` dans MIMT, le router vers le groupe `trouver-un-avocat`, et poser `BESOINAVOCAT_MIMT_PUBLIC_NUMBER=+1XXXXXXXXXX` sur le portail. `BESOINAVOCAT_TEAM_MEMBERS` = identifiants des avocats de l'équipe (voir INTEGRATIONS.md).
6. **Loi 25** : signer l'entente de traitement (DPA) avec MIMT avant la mise en service (liste des clauses dans INTEGRATION-MIMT-2026-10-30.md, section « Loi 25 »).
7. Redéployer le portail; la page Intégrations doit passer de « MIMT à raccorder » à prêt, et un appel test est à faire par un avocat relié.

## Ce qui bloque aujourd'hui

- L'adresse du Coolify de l'API MIMT (et un jeton valide) : sans elle, `PARTNERS=on` ne peut être posé ni par GitHub ni depuis le navigateur du propriétaire.
- La connexion du propriétaire à `app.mimt.ca` dans l'onglet ouvert par l'agent (la session MIMT vit dans l'onglet).
