# KLEAN — Carte de déploiement — besoinavocat.ca — 2026-10-29

Signé : KLEAN (Muse), mission déploiement 2026-10-29 ~17:14 EDT.
Règles respectées : journal `docs/JOURNAL-AGENTS.md` en ajout seul (entrées DÉBUT/FIN séparées) ; zones réservées de Claude non touchées ; branche `codex/workspace-premium-2026-10-29` NON fusionnée ; aucun code OTP demandé/lu/utilisé ; aucun compte créé ; aucun droit ajouté ; aucun secret copié ; aucun DNS modifié.

## AVANT (vérifié 2026-10-29)

- Dépôt : `takatakca/BESOINAVOCAT.CA`, branche `main` vérifiée avant cette carte : `1b570417588e5099eb5d4b5eafbe786df031d76b` (journal FIN code courriel, 2026-10-29 14:15 UTC). L'entrée DÉBUT de cette carte a ensuite avancé `main` à `8b07dbed04d043e7e70e87c0398d316d2b15cac6` (journal seul).
- Cibles déclarées dans le dépôt : **Coolify** (serveur `31.220.96.134`), deux applications — portail Node (`/platform`, `Dockerfile`, port `8787` via proxy Coolify) et vitrine sans WordPress (`www/`, `www/Dockerfile`, Nginx). Projet Coolify `BESOINAVOCAT`, application portail `besoinavocat-portail`, URL d'essai Coolify `sslip.io` (voir `docs/COOLIFY.md`).
- Configuration présente : oui, mais **inactive par défaut** — `.github/workflows/coolify-deploy.yml` (déclenché après CI verte sur push de `main`, SHA vérifié = `main` actuel, une seule application par CI : vitrine après « Storefront checks », portail après « Platform pilot checks »).

## PENDANT (auto-déploiement)

- **Auto-déploiement : NON, pas encore activé.** Il ne peut pas être activé par code : l'activation exige des réglages panneau (variables de dépôt + secrets d'environnement `production` GitHub + jeton Deploy Coolify), que KLEAN ne peut ni ne doit poser seul. Le flux reste donc inactif jusqu'à la checklist ci-dessous.
- État portail au moment de la carte : portail test Coolify avec `emailCodeConfigured: true` (santé re-vérifiée 2026-10-29) ; `portail.besoinavocat.ca` pointe toujours vers MochaHost (ancien portail v1, sans connexion) — la bascule DNS est l'étape de Mike (DEV-A-FAIRE §3.4, après détachement du courriel, voir `docs/STOREFRONT.md`).
- Aucune PR ouverte sur ce dépôt au moment de la carte ; aucune PR fusionnée par cet agent, sauf la présente note (non fusionnée).

## APRÈS (checklist propriétaire exacte — activation de l'auto-déploiement, puis bascule DNS)

Activation (après la première acceptation manuelle) :
1. Dans Coolify, ouvrir l'accès API et créer un jeton **Deploy** (ne jamais inscrire un jeton dans une adresse, un commit ou une note).
2. Dans GitHub, ajouter les secrets d'environnement `production` : `COOLIFY_BESOINAVOCAT_API_TOKEN`, `COOLIFY_BESOINAVOCAT_WWW_DEPLOY_WEBHOOK` et `COOLIFY_BESOINAVOCAT_PORTAL_DEPLOY_WEBHOOK` (adresses de déploiement de chaque application Coolify).
3. Ajouter ensuite les variables de dépôt `COOLIFY_BESOINAVOCAT_WWW_AUTODEPLOY_ENABLED=true` et `COOLIFY_BESOINAVOCAT_PORTAL_AUTODEPLOY_ENABLED=true`.
4. Désactiver alors le déploiement automatique propre à Coolify, pour qu'un push non vérifié ne parte pas en production.
5. Confirmer dans Coolify la santé du déploiement après la première CI verte sur `main`.

Bascule DNS (ordre strict, `docs/STOREFRONT.md` — développeur du propriétaire) :
1. La veille : abaisser à 300 s le TTL de `besoinavocat.ca` A, `www` et `portail`.
2. Courriel d'abord : créer `mx.besoinavocat.ca` A `209.42.24.127` ; MX `0 mx.besoinavocat.ca.` ; remplacer les CNAME `mail` et `ftp` par des A `209.42.24.127` ; routage « Échangeur de courriel local » dans cPanel. Attendre l'ancien TTL (2 h), puis test d'envoi/réception. Ne pas toucher DKIM, DMARC, SPF, `autodiscover`, `webmail`, `cpanel`.
3. Portail avant vitrine : déployer le portail Node sur Coolify, puis basculer `portail` A vers `31.220.96.134` après confirmation de l'IP ; vérifier `/api/health`, `/demande` et la connexion réelle (code demandé et saisi par le propriétaire lui-même).
4. Essai vitrine avant DNS (résolution locale vers le serveur Coolify), puis bascule : `besoinavocat.ca` A vers `31.220.96.134` (`www` suit par CNAME) ; vérifier HTTPS/certificat, échantillon d'anciennes adresses, bouton « Trouver mon avocat » de bout en bout, et un courriel reçu.
5. Retour arrière si besoin : remettre `besoinavocat.ca` A à `209.42.24.127` (valeur relevée au 28 octobre) ; WordPress reste une sauvegarde chez MochaHost.
- État en ligne : **non vérifié en ligne par cet agent** (ni le portail test, ni `portail.besoinavocat.ca`, ni la vitrine). Un merge ou une CI verte n'est pas une preuve de mise en ligne.
