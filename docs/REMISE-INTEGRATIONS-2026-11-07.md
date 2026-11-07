# Remise au technicien — activer les intégrations du portail (7 novembre 2026)

Fiche à suivre telle quelle. Elle ne contient **aucun secret** : les valeurs (clés, secrets, numéros) sont remises au technicien par le propriétaire, dans un canal privé, jamais par GitHub, courriel ou clavardage. Détail technique par fournisseur : [INTEGRATIONS.md](INTEGRATIONS.md); appels MIMT : [COCKPIT-PREMIUM-2026-11-04.md](COCKPIT-PREMIUM-2026-11-04.md).

## 0. Où agir

- Le portail `portail.besoinavocat.ca` tourne dans le **Coolify local du serveur VPS2 (`31.220.96.134`)**. Ce n'est pas `coolify.takatak.ca` : cette console (projet `TAKATAK-V1` seulement) voit VPS2 comme serveur, mais **sans aucune ressource** dessus. Vérifié le 7 novembre 2026 à 08:55 UTC depuis le navigateur du propriétaire.
- Le déploiement automatique depuis GitHub est **inactif** : une fusion dans `main` ne met pas le portail à jour. Après chaque changement de variables ou de code, **redéployer à la main** dans ce Coolify.
- Tout se fait dans l'application du portail, onglet **Environment Variables**, puis **Redeploy**.

## 1. Une seule fois, avant tout

1. `APP_ORIGIN=https://portail.besoinavocat.ca` (vérifier).
2. Clé des connecteurs, depuis le terminal du conteneur (utilisateur `node`), une seule fois; la commande refuse d'écraser une clé existante :
   ```sh
   node -e "require('fs').writeFileSync('/data/integrations.key', require('crypto').randomBytes(32), { mode: 0o600, flag: 'wx' })"
   ```
   La garder dans la sauvegarde privée du volume `/data`. Si elle change, chaque avocat doit reconnecter ses comptes.
3. Accès du propriétaire aux 3 dossiers : voir l'entrée du journal du 2026-11-07 08:20 UTC (`provisionMembership`, rôle `owner`).

## 2. Adresses à déclarer chez les fournisseurs (toutes identiques)

| Usage | Adresse exacte |
|---|---|
| Retour OAuth (Zoom, Microsoft, Google, DocuSign, Clio) | `https://portail.besoinavocat.ca/integrations/callback` |
| Notifications Zoom | `https://portail.besoinavocat.ca/api/webhooks/zoom` |
| Notifications Stripe | `https://portail.besoinavocat.ca/api/webhooks/stripe` |
| Notifications DocuSign Connect | `https://portail.besoinavocat.ca/api/webhooks/docusign` |
| Rappels d'état Twilio (SMS seulement) | `https://portail.besoinavocat.ca/api/webhooks/twilio` |
| Webhook MIMT Connect (appels) | `https://portail.besoinavocat.ca/api/mimt/webhook` |

## 3. Variables à poser dans Coolify, fournisseur par fournisseur

Cocher chaque ligne quand la valeur est en place. Une variable manquante laisse simplement ce fournisseur en « Accès développeur à configurer », sans casser le reste.

| Fournisseur | Variables | Valeur / remarque |
|---|---|---|
| **MIMT (appels, numéro public)** | `BESOINAVOCAT_MIMT_API_KEY` · `BESOINAVOCAT_MIMT_WEBHOOK_SECRET` · `BESOINAVOCAT_MIMT_PUBLIC_NUMBER` · `BESOINAVOCAT_TEAM_MEMBERS` | Côté MIMT : `PARTNERS=on`, partenaire `besoinavocat` avec crédits, clé d'API, webhook (§2). `BESOINAVOCAT_MIMT_API_BASE` vaut `https://api.mimt.ca` par défaut; `BESOINAVOCAT_MIMT_HUNT_GROUP` vaut `trouver-un-avocat` par défaut. |
| **Vidéo (relais TURN)** | `BESOINAVOCAT_TURN_URLS` · `BESOINAVOCAT_TURN_SECRET` (+ `BESOINAVOCAT_STUN_URLS` facultatif) | Serveur TURN du propriétaire (coturn) ou service tiers. Sans relais, la vidéo ne passe pas derrière certains pare-feu. |
| **Zoom** | `BESOINAVOCAT_ZOOM_CLIENT_ID` · `BESOINAVOCAT_ZOOM_CLIENT_SECRET` · `BESOINAVOCAT_ZOOM_WEBHOOK_SECRET` | Application « General App », gérée par l'utilisateur. Scopes : `meeting:write:meeting`, `meeting:delete:meeting`, `user:read:user`. |
| **Microsoft 365 / Outlook** | `BESOINAVOCAT_MICROSOFT_CLIENT_ID` · `BESOINAVOCAT_MICROSOFT_CLIENT_SECRET` · `BESOINAVOCAT_MICROSOFT_TENANT` | Inscription d'application Entra, multilocataire. `TENANT=common` si on veut aussi les comptes Outlook.com personnels (sinon `organizations`, valeur par défaut). Noter la date d'expiration du secret. |
| **Google Agenda** | `BESOINAVOCAT_GOOGLE_CLIENT_ID` · `BESOINAVOCAT_GOOGLE_CLIENT_SECRET` | ID client OAuth « Application Web ». En mode « Test », seuls les utilisateurs de test peuvent se connecter et leur accès expire après 7 jours. |
| **DocuSign** | `BESOINAVOCAT_DOCUSIGN_CLIENT_ID` · `BESOINAVOCAT_DOCUSIGN_CLIENT_SECRET` · `BESOINAVOCAT_DOCUSIGN_ENVIRONMENT` · `BESOINAVOCAT_DOCUSIGN_CONNECT_HMAC_KEY` | `ENVIRONMENT=demo` tant que la revue Go-Live n'est pas faite, puis `production`. |
| **Clio Manage** | `BESOINAVOCAT_CLIO_CLIENT_ID` · `BESOINAVOCAT_CLIO_CLIENT_SECRET` · `BESOINAVOCAT_CLIO_REGION` | `REGION=ca` (valeur par défaut). |
| **Stripe (abonnement des avocats)** | `BESOINAVOCAT_STRIPE_SECRET_KEY` · `BESOINAVOCAT_STRIPE_WEBHOOK_SECRET` · `BESOINAVOCAT_STRIPE_PRICE_WEEKLY` et/ou `BESOINAVOCAT_STRIPE_PRICE_MONTHLY` | Rester en **mode test** jusqu'à l'approbation des prix et taxes (D-025). Événements du webhook : `checkout.session.completed`, `customer.subscription.created`, `.updated`, `.deleted`. |
| **Twilio (SMS, réceptions seulement)** | `BESOINAVOCAT_TWILIO_ACCOUNT_SID` · `BESOINAVOCAT_TWILIO_AUTH_TOKEN` | Facultatif. Aucun appel par Twilio : les appels passent par MIMT. |
| **CanLII** | `BESOINAVOCAT_CANLII_API_KEY` | Clé obtenue par courriel auprès de CanLII (délai de quelques jours). |
| **Courriels de notification** | `BESOINAVOCAT_EMAIL_PROVIDER=resend` · `BESOINAVOCAT_EMAIL_API_KEY` · `BESOINAVOCAT_EMAIL_FROM` | Domaine d'envoi vérifié chez Resend (SPF/DKIM). |
| **Abonnement agenda (.ics)** | `BESOINAVOCAT_CALENDAR_FEED_ENABLED=true` | Aucune clé; simple interrupteur. |

Règles de saisie : caractères imprimables sans espace; au moins 8 caractères pour un secret; les secrets se saisissent **dans Coolify seulement**.

## 4. Après le redéploiement

1. `https://portail.besoinavocat.ca/api/health` répond 200.
2. Page **Intégrations** du portail : chaque fournisseur configuré passe de « Accès développeur à configurer » à « Prêt à connecter ».
3. Le propriétaire clique **Connecter** sur chacun, consent chez le fournisseur, et la page affiche « Service connecté ».
4. Recette complète : [INTEGRATIONS.md, section « Vérifier avec un vrai compte »](INTEGRATIONS.md#vérifier-avec-un-vrai-compte-à-faire-après-la-configuration).

## 5. Pas encore programmé dans le portail

Notarius ConsignO Cloud et QuickBooks Online sont affichés « à venir » : aucune variable à poser, aucun compte à ouvrir pour l'instant.
