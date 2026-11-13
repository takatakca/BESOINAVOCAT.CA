# Espace avocat — inscription, essai gratuit de 14 jours, accès aux dossiers des clients

*Lot du 13 novembre 2026 (branche `claude/project-thread-llrshb`). Décision : [D-034](DECISIONS.md).*

## Ce que voit l'avocat

1. **`/avocat`** : une page autonome du portail (`platform/public/avocat.html`, `avocat.js`, `avocat.css`), avec le même habillage que l'espace de travail.
2. **Inscription sans carte** : nom, courriel, numéro du Barreau (facultatif), cabinet (facultatif), case de consentement. L'avocat reçoit un **code à 8 chiffres par courriel** et le saisit. Aucune carte, aucun paiement, aucun Stripe : c'est un essai à **0 $**.
3. **Essai de 14 jours** : la carte « Essai gratuit » montre les jours restants, une barre de progression et la date de fin. La durée est fixée par `BESOINAVOCAT_TRIAL_DAYS` (14 par défaut).
4. **Rejoindre le dossier d'un client** : la personne qui tient le dossier (le client, le responsable ou un avocat déjà membre) ouvre « Inviter un avocat » et obtient un code `AV-XXXX-XXXX`, valable 14 jours, à usage unique. L'avocat le saisit dans « Rejoindre un dossier » et devient membre avec le rôle **avocat**. « Ouvrir le dossier » mène ensuite au centre de commandement.
5. **Après 14 jours** : le statut passe à `trial_expired`. L'avocat garde la lecture des dossiers déjà rejoints, mais ne peut plus en rejoindre de nouveaux (réponse 402 `PAYMENT_REQUIRED`). La carte propose les forfaits si Stripe est configuré (`BESOINAVOCAT_STRIPE_SECRET_KEY` et les prix), sinon un avis « paiement bientôt proposé ». Le compte Stripe (ALKAO.CA ou takatak.ca) reste à choisir par le propriétaire; rien ne bloque l'inscription en attendant.
6. **Déjà client ou responsable ?** Une personne déjà connectée au portail peut ouvrir `/avocat` et « Activer mon espace avocat » : même essai, même règle.

## Comment ça marche côté serveur

- **`platform/lib/lawyer-accounts.mjs`** (nouveau). Trois tables SQLite : `lawyer_signups` (inscription en attente, 1 h), `lawyer_accounts` (compte avocat : sujet TAKATAK, locataire, nom, Barreau, cabinet), `case_invitations` (codes hachés en SHA-256, jamais en clair). Les trois sont dans la liste blanche de `platform/tools/backup-corpus.py`.
- **Identité** : l'inscription crée l'utilisateur chez le fournisseur TAKATAK (Supabase Auth, `create_user: true`) par la route `/api/auth/lawyer/signup`, puis `/api/auth/lawyer/verify` vérifie le code, crée le compte avocat et démarre l'essai dans la même transaction logique. `platform/lib/browser-session.mjs` consulte d'abord le fichier des habilitations (`BESOINAVOCAT_GRANTS_FILE`), puis les comptes avocats (`extraGrants`). Un compte qui n'est ni dans le fichier ni avocat reste refusé (403), comme avant.
- **Locataire** : les avocats inscrits eux-mêmes sont placés dans `BESOINAVOCAT_LAWYER_TENANT` (`takatak` par défaut, le locataire des trois dossiers du propriétaire), ce qui leur permet de rejoindre ces dossiers par invitation. Un code d'un autre locataire est refusé.
- **Essai** : `platform/lib/membership.mjs` gère un abonnement local `plan: 'trial', status: 'trialing'` avec `trialStartedAt` et `trialEndsAt`. `/api/membership` renvoie maintenant `trial` (`daysLeft`, `endsAt`, `expired`), `paymentRequired` et le statut `trial_expired`. Si Stripe est configuré et qu'il reste au moins 48 h d'essai, le paiement Stripe Checkout reprend l'essai restant (`subscription_data[trial_end]`) : l'avocat ne paie pas deux fois.
- **Routes** (toutes derrière la session, l'origine et `X-Requested-With`) :
  - `POST /api/auth/lawyer/signup` `{email, name, barNumber?, firm?, consent: true}` → envoi du code (503 si `BESOINAVOCAT_EMAIL_OTP_ENABLED` n'est pas `true`).
  - `POST /api/auth/lawyer/verify` `{email, code}` → `{user, expiresAt, membership}`; 403 `NO_PENDING_SIGNUP` sans inscription en attente.
  - `GET /api/lawyer/me` → `{account, tenantId, membership, cases, trialDays, payments}`.
  - `POST /api/lawyer/activate`, `POST /api/lawyer/profile`, `POST /api/lawyer/join` `{code}` (10 essais par 15 min, 429 au-delà).
  - `GET|POST /api/cases/:id/invitations`, `POST /api/cases/:id/invitations/:invitationId/revoke` (membres du dossier).
  - `/api/capabilities` annonce `lawyerSpace: {url: '/avocat', trialDays, account}` pour que le tableau de bord puisse afficher le lien.
- **Journal d'audit** : `lawyer.signed_up`, `lawyer.activated`, `invitation.created`, `invitation.revoked`, `invitation.accepted`.

## Ce qu'il faut pour que ça marche en ligne

| Qui | Quoi |
| --- | --- |
| Colombo | Redéployer le portail depuis `main` dans Coolify (l'autodéploiement est éteint). |
| Colombo | Vérifier `BESOINAVOCAT_EMAIL_OTP_ENABLED=true` et que le courriel du code arrive vraiment (voir [BROWSER_AUTH](BROWSER_AUTH.md)). Sans cela, la page affiche « inscription bientôt disponible ». |
| Colombo | Dans Supabase Auth du projet TAKATAK, laisser **« Enable email signups »** activé : l'inscription crée l'utilisateur à la volée. |
| Colombo (facultatif) | `BESOINAVOCAT_LAWYER_TENANT` (défaut `takatak`), `BESOINAVOCAT_TRIAL_DAYS` (défaut `14`). |
| Propriétaire | Choisir le compte Stripe, puis Colombo pose `BESOINAVOCAT_STRIPE_SECRET_KEY`, `BESOINAVOCAT_STRIPE_WEBHOOK_SECRET` et les prix pour que le paiement après l'essai s'affiche. |
| Propriétaire | Pour inviter un avocat sur ses trois dossiers, son compte doit d'abord y être membre (commande `provisionMembership` du journal du 7 novembre, 08:20 UTC, à exécuter par Colombo). |

## Ce que ce lot ne fait pas (volontairement)

- Aucun paiement, aucune carte, aucun appel à Stripe pendant l'essai.
- Aucune vérification automatique au tableau du Barreau : le numéro est déclaratif.
- Aucun changement de `app.js`, `live.js` ou `index.html` (fil du tableau de bord). Le lien « Vous êtes avocat ? » sur l'écran de connexion et le lien direct vers un dossier lui sont demandés.
- Aucun courriel de rappel avant la fin de l'essai (à prévoir avec le service de notification Resend quand il sera activé).

## Vérifications

- `platform/test/lawyer-accounts.test.mjs` : 6 tests (inscription complète, refus sans inscription en attente, expiration après 14 jours, activation depuis une session et reprise de l'essai par Stripe, invitations liées au locataire, révocables et limitées, page servie).
- Suite complète au 13 novembre 2026 : 378/378 tests Node, 17/17 tests Python.
