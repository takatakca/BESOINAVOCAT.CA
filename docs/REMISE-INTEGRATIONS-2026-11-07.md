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
| **MIMT (appels, numéro public)** | `BESOINAVOCAT_MIMT_API_KEY` · `BESOINAVOCAT_MIMT_WEBHOOK_SECRET` · `BESOINAVOCAT_MIMT_PUBLIC_NUMBER` · `BESOINAVOCAT_TEAM_MEMBERS` | Côté MIMT : `PARTNERS=on`, partenaire `besoinavocat` avec crédits, clé d'API, webhook (§2). Marche à suivre complète : [MIMT-ACTIVATION-2026-11-07.md](MIMT-ACTIVATION-2026-11-07.md). Côté MIMT, `PARTNERS=on` se pose dans le Coolify qui héberge `api.mimt.ca` (pas `coolify.takatak.ca`), très probablement le même Coolify local de VPS2 que le portail. `BESOINAVOCAT_MIMT_API_BASE` vaut `https://api.mimt.ca` par défaut; `BESOINAVOCAT_MIMT_HUNT_GROUP` vaut `trouver-un-avocat` par défaut. |
| **Vidéo (relais TURN)** | `BESOINAVOCAT_TURN_URLS` · `BESOINAVOCAT_TURN_SECRET` (+ `BESOINAVOCAT_STUN_URLS` facultatif) | Serveur TURN du propriétaire (coturn) ou service tiers. Sans relais, la vidéo ne passe pas derrière certains pare-feu. |
| **Zoom** | `BESOINAVOCAT_ZOOM_CLIENT_ID` · `BESOINAVOCAT_ZOOM_CLIENT_SECRET` · `BESOINAVOCAT_ZOOM_WEBHOOK_SECRET` | Application « General App », gérée par l'utilisateur. Scopes : `meeting:write:meeting`, `meeting:delete:meeting`, `user:read:user`. **Après** le redéploiement avec le `WEBHOOK_SECRET` posé : dans l'app Zoom, *Features › Access › Event subscription*, ajouter l'adresse `/api/webhooks/zoom` (Zoom valide l'adresse en direct, donc le portail doit déjà tourner avec le secret). Facultatif. |
| **Microsoft 365 / Outlook** | `BESOINAVOCAT_MICROSOFT_CLIENT_ID` · `BESOINAVOCAT_MICROSOFT_CLIENT_SECRET` · `BESOINAVOCAT_MICROSOFT_TENANT` | Inscription d'application Entra, multilocataire. `TENANT=common` si on veut aussi les comptes Outlook.com personnels (sinon `organizations`, valeur par défaut). Noter la date d'expiration du secret. |
| **Google Agenda** | `BESOINAVOCAT_GOOGLE_CLIENT_ID` · `BESOINAVOCAT_GOOGLE_CLIENT_SECRET` | ID client OAuth « Application Web ». En mode « Test », seuls les utilisateurs de test peuvent se connecter et leur accès expire après 7 jours. |
| **DocuSign** | `BESOINAVOCAT_DOCUSIGN_CLIENT_ID` · `BESOINAVOCAT_DOCUSIGN_CLIENT_SECRET` · `BESOINAVOCAT_DOCUSIGN_ENVIRONMENT` · `BESOINAVOCAT_DOCUSIGN_CONNECT_HMAC_KEY` | `ENVIRONMENT=demo` tant que la revue Go-Live n'est pas faite, puis `production`. |
| **Clio Manage** | `BESOINAVOCAT_CLIO_CLIENT_ID` · `BESOINAVOCAT_CLIO_CLIENT_SECRET` · `BESOINAVOCAT_CLIO_REGION` | `REGION=ca` (valeur par défaut). |
| **Stripe (abonnement des avocats)** | `BESOINAVOCAT_STRIPE_SECRET_KEY` · `BESOINAVOCAT_STRIPE_WEBHOOK_SECRET` · `BESOINAVOCAT_STRIPE_PRICE_WEEKLY` et/ou `BESOINAVOCAT_STRIPE_PRICE_MONTHLY` | Rester en **mode test** jusqu'à l'approbation des prix et taxes (D-025). Événements du webhook : `checkout.session.completed`, `customer.subscription.created`, `.updated`, `.deleted`. |
| **Twilio (SMS, réceptions seulement)** | `BESOINAVOCAT_TWILIO_ACCOUNT_SID` · `BESOINAVOCAT_TWILIO_AUTH_TOKEN` | Facultatif. Aucun appel par Twilio : les appels passent par MIMT. |
| **QuickBooks Online** (ajouté le 7 nov. par le fil tableau de bord) | `BESOINAVOCAT_QUICKBOOKS_CLIENT_ID` · `BESOINAVOCAT_QUICKBOOKS_CLIENT_SECRET` · `BESOINAVOCAT_QUICKBOOKS_ENVIRONMENT` | App Intuit « QuickBooks Online and Payments », scope `com.intuit.quickbooks.accounting` seulement, même adresse de retour. `ENVIRONMENT=sandbox` puis `production`. |
| **CanLII** | `BESOINAVOCAT_CANLII_API_KEY` | Clé obtenue par courriel auprès de CanLII (délai de quelques jours). |
| **Courriels de notification** | `BESOINAVOCAT_EMAIL_PROVIDER=resend` · `BESOINAVOCAT_EMAIL_API_KEY` · `BESOINAVOCAT_EMAIL_FROM` | Domaine d'envoi vérifié chez Resend (SPF/DKIM). |
| **Abonnement agenda (.ics)** | `BESOINAVOCAT_CALENDAR_FEED_ENABLED=true` | Aucune clé; simple interrupteur. |

Règles de saisie : caractères imprimables sans espace; au moins 8 caractères pour un secret; les secrets se saisissent **dans Coolify seulement**.

## 4. Après le redéploiement

1. `https://portail.besoinavocat.ca/api/health` répond 200.
2. Page **Intégrations** du portail : chaque fournisseur configuré passe de « Accès développeur à configurer » à « Prêt à connecter ».
3. Le propriétaire clique **Connecter** sur chacun, consent chez le fournisseur, et la page affiche « Service connecté ».
4. Recette complète : [INTEGRATIONS.md, section « Vérifier avec un vrai compte »](INTEGRATIONS.md#vérifier-avec-un-vrai-compte-à-faire-après-la-configuration).

## 5. État des comptes développeur au 7 novembre 2026 (mis à jour 13:15 UTC)

Les valeurs secrètes sont dans le fichier `CLES-INTEGRATIONS-BESOINAVOCAT.txt`, dossier `BESOINAVOCAT` sur le bureau du propriétaire (jamais dans le dépôt). Le propriétaire le remet au technicien, qui copie chaque ligne dans Coolify.

| Fournisseur | État | Repères (non secrets) |
|---|---|---|
| **Google Agenda** | **Prêt.** Projet Google Cloud `besoinavocat-portail`, API Calendar activée, écran de consentement « BesoinAvocat » (externe, statut *Test*), client OAuth « Portail BesoinAvocat » avec l'adresse de retour §2. ID client et secret dans le fichier local. | Tant que l'écran est en *Test*, ajouter chaque avocat testeur dans *Audience › Test users*; publier l'app (revue Google) avant l'ouverture au public. |
| **Clio Manage** | **Prêt.** Application « BesoinAvocat Portail » (app id 349730, région Canada, ca.developers.clio.com), adresse de retour §2, permissions Activities/Contacts/Matters écriture, Users lecture. Client id et secret dans le fichier local. | `BESOINAVOCAT_CLIO_REGION=ca`. |
| **Zoom** | **Prêt.** Application « BesoinAvocat Portail » (General App, user-managed, id `pPKxMw9sQwGnXfhPaqAD_w` sur marketplace.zoom.us), adresse de retour §2, 3 scopes ci-dessus. Client id, secret et jeton de webhook dans le fichier local. | Abonnement aux événements à faire après le redéploiement (voir §3). Tant que l'app n'est pas publiée, seuls les comptes Zoom autorisés en développement peuvent la connecter. |
| **QuickBooks Online** | **App créée, clés à relever.** Espace Intuit « BESOIN AVOCAT » (id 9341458656771974), app « BUREAU AVOCAT » (AppID `ca84ee85-51e6-44fc-86b3-8a81f71ce14d`). La page *Keys and credentials* renvoyait « Sorry, something went wrong » puis la session a expiré. | Le propriétaire se reconnecte sur developer.intuit.com; ensuite relever Client ID / Client Secret (Development) et vérifier l'adresse de retour §2 et le scope `com.intuit.quickbooks.accounting`. |
| **DocuSign** | **En attente de la connexion du propriétaire** au compte développeur (account-d.docusign.com, mot de passe temporaire créé par lui). | Ensuite : *Apps and Keys › Add App*, clé d'intégration + secret, adresse de retour §2, puis Connect (HMAC) vers `/api/webhooks/docusign`. `ENVIRONMENT=demo`. |
| **Stripe** | **En attente du choix de compte** (carte posée dans le fil : takatak.ca, ALKAO.CA ou nouveau compte). Le connecteur Stripe relié à Claude ne donne que le mode réel du compte takatak.ca; la configuration doit se faire en mode test, donc depuis le tableau de bord Stripe. | Webhook `/api/webhooks/stripe` avec les 4 événements du §3, un produit « Abonnement avocat » (prix hebdo/mensuel), clé restreinte. |
| **Microsoft / Outlook** | **Bloqué.** Compte Microsoft personnel (takatak.ca@gmail.com), sans annuaire Entra; Azure refuse la création d'un locataire sans abonnement (« You do not have access », vérifié 09:08 UTC). | Abonnement Microsoft 365 Entreprise ou compte Azure ouvert par le propriétaire (carte de crédit). Laisser `BESOINAVOCAT_MICROSOFT_*` vides : le portail affiche « Accès développeur à configurer ». |
| **CanLII** | **Courriel à envoyer** par le propriétaire (brouillon fourni dans le fil). | Délai de quelques jours. |
| **Twilio** | Facultatif (SMS reçus seulement). Compte existant du propriétaire : SID + jeton dans Coolify si voulu. | — |
| **Notarius ConsignO Cloud** | Fiche de partenariat, aucune application à créer. | — |
| **MIMT** | Voir [MIMT-ACTIVATION-2026-11-07.md](MIMT-ACTIVATION-2026-11-07.md). | — |
