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

Signé : KLEAN, 2026-10-29. Aucun secret, jeton ou code dans cette note.
