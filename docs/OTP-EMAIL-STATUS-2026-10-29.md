# BesoinAvocat — statut code courriel — 2026-10-29

## GitHub : complet
- Fusion PR #4, `main` 342e3fc, 2026-10-29 00:54 EDT : « Merge verified email-code portal login (#4) ».
- Les 6 contrôles sont passés au SHA 3bb10db.
- Les 2 échecs « Platform pilot checks » de 00:50 EDT sur 429c0a6 sont donc dépassés : 3bb10db a corrigé le contrat de santé Passenger, puis la fusion a eu lieu. Ce ne sont plus l'état actuel.
- Tests locaux sur une copie de `main`, 2026-10-29 : `platform/test/email-code.test.mjs` + `platform/test/auth-http.test.mjs`, 28/28 passent.

## En ligne : déployé et activé selon la santé
- Portail test, `/api/health`, vérifié 2026-10-29 vers 03:21 EDT : `status: ok`, `mode: pilot`, `loginConfigured: true`, `emailCodeConfigured: true`, `identityConfigured: false`, `intakeConfigured: true`.
- Un serveur à l'ancien SHA efef692 ne renverrait pas `emailCodeConfigured`. La santé actuelle prouve donc un code post-fusion, avec le parcours code courriel activé (pas d'erreur 503 EMAIL_CODE_UNAVAILABLE attendue sur `/api/auth/email/request`).

## Pourquoi un code peut ne pas arriver, sans bug de code trouvé
- `requestEmailCode` appelle Supabase `/auth/v1/otp` avec `create_user: false`, puis renvoie toujours `accepted: true`, même si Supabase rejette avec 401 ou 429. C'est volontaire, anti-énumération : un message « accepté » ne prouve pas l'envoi.
- Donc, si aucun courriel n'arrive : compte Supabase inexistant ou courriel non confirmé, limite de débit Supabase, ou modèle SMTP non finalisé. Vérifier dans le tableau de bord Supabase, pas dans le code du portail.
- La vérification accepte un code de 6 à 10 chiffres, zéros initiaux conservés, type `email`.

## Étape restante, à faire par le propriétaire
- Confirmer dans Supabase : utilisateur existant, courriel confirmé, fournisseur OTP activé, SMTP personnalisé et modèle avec `{{ .Token }}` finalisés.
- Puis le propriétaire demande lui-même un code depuis le portail BesoinAvocat et le saisit lui-même. Aucun code n'est inscrit dans GitHub, aucun compte n'est créé par cet envoi.
- Tant que cette réception réelle n'a pas réussi, garder « accès utilisateur non validé » pour la recette complète (consultation authentifiée, recherche, téléchargement, persistance en session).

## Mise à jour 2026-10-29, 06:58 EDT — vérification continuée par KLEAN
- `main` avancé à 65f4623 (journal Claude : lot « workspace premium » en pause à la demande du propriétaire, branche `codex/workspace-premium-2026-10-29` non fusionnée). KLEAN n'a touché à aucune zone réservée par Claude (`platform/public/*`, constante CSP de `server.mjs`, `MIME_TYPES` de `validation.mjs`) et n'a fusionné aucune branche.
- Tests locaux sur `main` 65f4623 : suite complète du portail 233/233, dont code courriel + auth HTTP 28/28.
- Santé en ligne revérifiée 2026-10-29 05:07 EDT (portail test Coolify) : mêmes valeurs, `emailCodeConfigured: true`, `identityConfigured: false`.
- Aucun problème ouvert sur le dépôt (0 open issues au contrôle).
- DNS du portail public : selon la vérification journalisée par Claude 2026-10-29 07:58 UTC, `portail.besoinavocat.ca` pointe encore vers l'ancien serveur MochaHost (portail v1 sans connexion); le parcours code courriel n'existe que sur l'adresse test Coolify. La bascule DNS est l'étape de Mike (DEV-A-FAIRE §3.4) : KLEAN n'a modifié aucun DNS.
- Restent, inchangés : confirmation Supabase + réception réelle du code par le propriétaire lui-même; recette authentifiée complète (trois dossiers, recherche, téléchargements, déconnexion); validation et bascule de la vitrine par le propriétaire.

Signé : KLEAN, 2026-10-29. Aucun secret, jeton ou code dans cette note.
