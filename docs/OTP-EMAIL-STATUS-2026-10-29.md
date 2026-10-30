# BesoinAvocat — statut code courriel — 2026-10-29

## Point de reprise — 30 octobre 2026, 09:52 UTC

**Les cinq correctifs du workspace sont déployés**, au `main` `a3e20ccbadd182fb819337c79e5b931060316af0`, après fusion de la [PR 10](https://github.com/takatakca/BESOINAVOCAT.CA/pull/10). Coolify `ocvuihsmpnffpbabg07r5ekh` affiche **Success** (48 s), application saine à 09:50:48 UTC. Le contrôle HTTPS du 30 octobre à 09:51:42.941 UTC, avec validation TLS normale, obtient 200 pour la page, la santé et les trois fichiers publics; leurs empreintes correspondent exactement à ce `main`. Les dossiers anonymes restent refusés en 401 et trois chemins privés en 404. Ces preuves de déploiement ne confirment pas la connexion réelle.

**Cause de non-réception confirmée à 09:40 UTC : blocage Maileroo du domaine de test.** Trois messages destinés au propriétaire sont marqués « Suppressed »; l'événement consulté indique un destinataire hors liste autorisée. Son ajout a été refusé car le nombre maximal de destinataires autorisés du domaine de test est atteint; aucune entrée existante n'a été supprimée. Le domaine propre `takatak.ca` est encore inactif, avec vérification DNS SPF/DKIM incomplète. Le quota d'envoi affiché n'est pas consommé : ce refus ne vient pas de ce quota. [Diagnostic et voie de résolution](DIAGNOSTIC-ENVOI-2026-10-30.md). Le blocage fournisseur reste non résolu; réception du code et consultation authentifiée des trois dossiers toujours non confirmées. Aucun DNS ni paramètre SMTP n’a été modifié; aucun nouvel OTP n’a été envoyé. L’ouverture du DNS par le propriétaire ou l’application de la fiche privée par Mike reste en attente.

**Fiabilité livrée :** caméra après fermeture/remplacement, éditeur pendant le chargement, sauvegarde de l’éditeur, réponse tardive d’envoi vidéo et décompression DOCX bornée. Code `7a920ee`, notes `c272e49`, puis fusion `a3e20cc`. Contrôles : **276/276 tests plateforme**, dont **10 de fiabilité inclus**, **12/12 tests du site**, revue indépendante sans bloqueur et QA sur données fictives (éditeur au tiers de l’écran, export DOCX réel). Les six contrôles de la PR sont réussis au SHA `c272e49`; après fusion, validation, Chromium, vitrine, plateforme et smoke de `main` réussissent. Les tâches de déploiement CI ont été ignorées; le déploiement Coolify a été lancé et contrôlé séparément.

L'écran propose la demande et la saisie du code. Un accusé générique ne prouve pas l'envoi; les journaux Maileroo confirment le refus du destinataire par le domaine de test. Ne pas multiplier les essais sans lecture des journaux ni inscrire de code, jeton ou secret dans les notes. [Réception et recette restante](RECEPTION-2026-10-30.md) · [Vision premium](VISION-PREMIUM-2026-10-29.md), dont l'activation reste séparée de la connexion.

## Clarification du contrat de demande de code — 30 octobre

La formulation historique « renvoie toujours `accepted: true` » ci-dessous est trop absolue. Le code actuel neutralise les rejets d’authentification du fournisseur normalisés en **401** et ses limites de débit **429**, afin de ne pas révéler l’existence d’un compte. En revanche, une erreur serveur du fournisseur, un délai dépassé ou une réponse fournisseur invalide restent des erreurs **503**; les limites locales de tentative restent des **429**. Une mauvaise configuration ou une saisie invalide n’est pas transformée en succès par cette protection.

Lecture du code : [service de session navigateur](../platform/lib/browser-session.mjs) et [route HTTP](../platform/server.mjs). Un accusé neutre confirme seulement le traitement de la demande; il ne prouve ni l’envoi SMTP ni la livraison. Ici, les journaux Maileroo apportent la cause précise du refus après demande : [diagnostic du 30 octobre](DIAGNOSTIC-ENVOI-2026-10-30.md). Les notes historiques signées restent conservées sans réécriture.

## Historique du 29 octobre

Les lectures et diagnostics ci-dessous sont conservés avec leurs dates. L'état du domaine et du déploiement ci-dessus remplace leurs mentions encore ouvertes de bascule DNS.

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
