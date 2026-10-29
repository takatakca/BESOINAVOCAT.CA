# Intégrations du portail — connecteurs et comptes développeur

Lot du 29 octobre 2026 (D-027). Le portail `platform/` relie chaque avocat à ses propres outils de travail. Le code fonctionne et il est testé avec des fournisseurs simulés. **Aucun compte réel n'est encore raccordé** : chaque connecteur s'active dès que son accès développeur est configuré sur le serveur (Coolify), puis il doit être vérifié avec un vrai compte.

## Ce que l'avocat peut faire

| Service | État du code | Dans la journée de l'avocat |
|---|---|---|
| **Zoom** | connexion + actions | Créer la réunion d'un rendez-vous : salle d'attente active, sans enregistrement, micros coupés à l'entrée. Seul le lien de participation est gardé; le lien d'hôte (`start_url`) n'est jamais conservé ni affiché. |
| **Outlook · Microsoft 365** | connexion + actions | Inscrire le rendez-vous dans son agenda Outlook, avec le lien Zoom s'il existe. |
| **Google Agenda** | connexion + actions | La même chose dans Google Agenda. |
| **DocuSign** | connexion seulement | Compte relié. L'envoi d'une convention de mandat ou d'une procuration pour signature viendra au prochain lot. |
| **Clio Manage (Canada)** | connexion seulement | Compte relié (région `ca.app.clio.com`). La synchronisation des dossiers, contacts et heures viendra au prochain lot. |
| **Stripe** | réceptions signées | Abonnements professionnels de la plateforme (100 $/semaine, 300 $/mois). Les paiements restent désactivés. |
| **Twilio** | réceptions signées | Rappels SMS et appels plus tard, avec le consentement de la personne. Aucun envoi pour l'instant. |
| **CanLII** | clé de plateforme | Vérifier une décision citée et ses citations, à partir des métadonnées CanLII. Recherche au prochain lot. |
| Notarius ConsignO Cloud | à venir | Signature numérique reconnue par le Barreau du Québec; accès par entente de partenariat. |
| QuickBooks Online | à venir | Comptabilité du cabinet. |

Où le trouver dans le portail :
- page **Intégrations** : connecter ou déconnecter chaque service;
- page **Rendez-vous** : boutons « Créer la réunion Zoom », « Ajouter à Outlook » et « Ajouter à Google Agenda », réservés aux avocats et aux responsables du dossier.

Le lien Zoom créé est visible par tous les membres du dossier, client compris. Une inscription à l'agenda n'est visible que par la personne dont c'est l'agenda.

## Comment c'est construit (`platform/lib/integrations.mjs`)

- **Le compte appartient à la personne, pas au dossier.** Chaque avocat connecte son propre Zoom, Outlook ou Google. BesoinAvocat ne voit jamais ses mots de passe : la personne consent sur le site du fournisseur (OAuth 2.0, code d'autorisation).
- **Démarrage de la connexion** :
  - le serveur crée un état aléatoire à usage unique, valable 10 minutes, lié à la personne, à son organisation et au fournisseur. Seule son empreinte SHA-256 est stockée;
  - PKCE S256 est utilisé chez les fournisseurs qui l'acceptent (Zoom, Microsoft, Google, DocuSign; pas Clio);
  - au plus 5 connexions en attente par personne.
- **Retour** : le fournisseur renvoie le navigateur vers `/integrations/callback`.
  - Le cookie de session étant `SameSite=Strict`, cette page du portail efface aussitôt le code de la barre d'adresse et l'envoie elle-même à `/api/integrations/complete`, avec la session de la personne.
  - Le serveur échange le code, côté serveur uniquement.
- **Jetons** :
  - ils sont scellés en AES-256-GCM, avec une clé de 32 octets gardée dans un fichier séparé de la base (`/data/integrations.key`, droits 600);
  - chaque jeton est lié à sa personne et à son fournisseur;
  - ils ne sont jamais renvoyés au navigateur ni écrits dans le journal d'audit.
  Si la clé change, chaque compte doit être reconnecté; rien d'autre n'est perdu.
- **Renouvellement** :
  - un seul renouvellement à la fois par compte, car Zoom change le jeton de renouvellement à chaque usage;
  - si le fournisseur refuse le renouvellement, le compte passe à « À reconnecter ».
- **Déconnexion** :
  - l'autorisation est retirée chez le fournisseur quand il le permet (Zoom, Google, Clio), puis les jetons sont supprimés;
  - Microsoft et DocuSign n'offrent pas ce retrait par API : l'avocat retire l'application dans les réglages de son compte.
- **Actions sur un rendez-vous** :
  - une seule création par rendez-vous, par fournisseur et par personne : un second clic renvoie l'élément existant;
  - une réservation empêche les doublons si deux clics arrivent en même temps;
  - le bouton « Retirer » supprime l'élément chez le fournisseur.
- **Ce qui est transmis** : le titre, la date et la durée du rendez-vous (60 minutes par défaut), et le lien Zoom pour les agendas. Aucun nom de client, aucune pièce, aucun message du dossier.
- **Notifications des fournisseurs** (`POST /api/webhooks/{zoom|stripe|twilio|docusign}`) :
  - elles sont acceptées seulement avec une signature valide et récente (5 minutes), vérifiée sur les octets bruts;
  - chacune est enregistrée une seule fois (déduplication) et aucune action métier n'est encore déclenchée;
  - la validation d'adresse de Zoom (`endpoint.url_validation`) est prise en charge.
- **Journal d'audit** : connexion démarrée, connectée, refusée, déconnectée, élément créé ou retiré. Sans jeton ni code.

## Avant tout : configurer le serveur

Dans Coolify, application du portail :

1. Vérifier que `APP_ORIGIN=https://portail.besoinavocat.ca`. L'adresse de retour à déclarer chez **tous** les fournisseurs est alors, exactement :
   `https://portail.besoinavocat.ca/integrations/callback`
2. Créer la clé des connecteurs **une seule fois**, depuis le terminal du conteneur (utilisateur `node`) :
   ```sh
   node -e "require('fs').writeFileSync('/data/integrations.key', require('crypto').randomBytes(32), { mode: 0o600, flag: 'wx' })"
   ```
   La commande refuse d'écraser une clé existante. `BESOINAVOCAT_INTEGRATIONS_KEY_FILE` vaut déjà `/data/integrations.key` dans l'image. Ne jamais copier cette clé dans GitHub, une note ou un courriel; elle fait partie de la sauvegarde privée du volume `/data`.
3. Ajouter les variables de chaque fournisseur (ci-dessous), puis redéployer. La page Intégrations passe alors de « Accès développeur à configurer » à « Prêt à connecter ».

Les secrets se saisissent dans Coolify seulement. Valeurs acceptées : caractères imprimables sans espace; au moins 8 caractères pour un secret.

## Ouvrir les comptes développeur — fournisseur par fournisseur

### Zoom — réunions

1. Sur <https://marketplace.zoom.us>, menu **Develop › Build App**, choisir une application **General App** gérée par l'utilisateur (*User-managed*). Pas « Server-to-Server » : ce type ne permet pas de relier le compte de chaque avocat.
2. **OAuth Redirect URL** et **OAuth Allow List** : `https://portail.besoinavocat.ca/integrations/callback`.
3. **Scopes** (permissions détaillées de Zoom) :
   - `meeting:write:meeting` pour créer la réunion;
   - `meeting:delete:meeting` pour le bouton « Retirer »;
   - `user:read:user` pour l'adresse du compte relié.
   Rien d'autre, notamment aucun accès aux enregistrements.
4. **Features › Event Subscriptions**, si les notifications sont voulues :
   - adresse `https://portail.besoinavocat.ca/api/webhooks/zoom`;
   - copier le **Secret Token**. Zoom valide l'adresse automatiquement.
5. Variables Coolify : `BESOINAVOCAT_ZOOM_CLIENT_ID`, `BESOINAVOCAT_ZOOM_CLIENT_SECRET`, `BESOINAVOCAT_ZOOM_WEBHOOK_SECRET`.
6. Limite à connaître : tant que l'application n'est pas publiée sur le Marketplace (revue Zoom), seuls les utilisateurs autorisés pendant le développement peuvent la connecter.

Documentation : [OAuth Zoom](https://developers.zoom.us/docs/integrations/oauth/) · [Webhooks Zoom](https://developers.zoom.us/docs/api/webhooks/).

### Microsoft 365 — Outlook

1. Dans le [centre d'administration Microsoft Entra](https://entra.microsoft.com), aller à **Applications › Inscriptions d'applications › Nouvelle inscription**.
2. Types de comptes : **comptes dans n'importe quel annuaire organisationnel (multilocataire)**. Pour accepter aussi les comptes Outlook.com personnels, choisir l'option qui les inclut et mettre `BESOINAVOCAT_MICROSOFT_TENANT=common`. Par défaut, la valeur est `organizations`.
3. **URI de redirection**, plateforme **Web** : `https://portail.besoinavocat.ca/integrations/callback`.
4. **Certificats et secrets › Nouveau secret client**. Noter sa date d'expiration et prévoir son renouvellement : à l'expiration, plus aucune connexion Outlook ne fonctionne.
5. **Autorisations d'API**, Microsoft Graph, autorisations déléguées : `User.Read`, `Calendars.ReadWrite`, `offline_access`, `openid`, `profile`, `email`.
6. Pour éviter l'avertissement « éditeur non vérifié » chez les cabinets, faire la **vérification de l'éditeur** (compte Microsoft Partner).
7. Variables : `BESOINAVOCAT_MICROSOFT_CLIENT_ID` (ID d'application), `BESOINAVOCAT_MICROSOFT_CLIENT_SECRET` (valeur du secret), et `BESOINAVOCAT_MICROSOFT_TENANT` si nécessaire.

Documentation : [plateforme d'identité Microsoft, code d'autorisation](https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow) · [Graph, créer un événement](https://learn.microsoft.com/graph/api/user-post-events).

### Google — Agenda

1. Dans la [console Google Cloud](https://console.cloud.google.com), créer un projet, puis activer **Google Calendar API**.
2. **Écran de consentement OAuth** :
   - type **Externe**;
   - champs d'application : `openid`, `email` et `https://www.googleapis.com/auth/calendar.events`.
3. **Identifiants › ID client OAuth › Application Web**. URI de redirection autorisé : `https://portail.besoinavocat.ca/integrations/callback`.
4. **À savoir** :
   - tant que l'application est en mode « Test », seuls les utilisateurs de test ajoutés peuvent se connecter;
   - leurs autorisations expirent **après 7 jours** : il faut alors se reconnecter, et le portail affiche « À reconnecter »;
   - le champ `calendar.events` est « sensible » : la publication exige la vérification de l'application par Google.
5. Variables : `BESOINAVOCAT_GOOGLE_CLIENT_ID`, `BESOINAVOCAT_GOOGLE_CLIENT_SECRET`.

Documentation : [OAuth 2.0 pour applications Web](https://developers.google.com/identity/protocols/oauth2/web-server) · [Calendar, insérer un événement](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert).

### DocuSign — signature électronique (connexion)

1. Créer un compte développeur gratuit sur <https://developers.docusign.com> (environnement *demo*).
2. **Apps and Keys › Add App and Integration Key** :
   - noter l'*Integration Key*;
   - ajouter un *Secret Key*;
   - URI de redirection `https://portail.besoinavocat.ca/integrations/callback`.
3. Variables :
   - `BESOINAVOCAT_DOCUSIGN_CLIENT_ID` (Integration Key) et `BESOINAVOCAT_DOCUSIGN_CLIENT_SECRET`;
   - `BESOINAVOCAT_DOCUSIGN_ENVIRONMENT=demo`, puis `production` après la revue *Go-Live* de DocuSign.
4. Notifications (Connect), plus tard : clé HMAC dans `BESOINAVOCAT_DOCUSIGN_CONNECT_HMAC_KEY`, adresse `https://portail.besoinavocat.ca/api/webhooks/docusign`.
5. Au Québec, la signature numérique reconnue par le Barreau est celle de **Notarius**; DocuSign convient aux signatures électroniques courantes. Le choix appartient à l'avocat, selon l'acte.

### Clio Manage — gestion du cabinet (connexion)

1. Ouvrir un compte développeur Clio, **région Canada** (`ca.app.clio.com`). Un jeton émis dans une région n'est pas valide dans une autre.
2. Créer une application :
   - adresse de redirection `https://portail.besoinavocat.ca/integrations/callback`;
   - permissions en lecture pour commencer.
3. Variables : `BESOINAVOCAT_CLIO_CLIENT_ID` (App Key), `BESOINAVOCAT_CLIO_CLIENT_SECRET` (App Secret), et `BESOINAVOCAT_CLIO_REGION=ca` (valeur par défaut; `us`, `eu`, `au` possibles).

Documentation : [autorisation Clio](https://docs.developers.clio.com/api-docs/clio-manage/authorization/).

### Stripe — paiements de la plateforme (réceptions)

1. Sur le [tableau de bord Stripe](https://dashboard.stripe.com), rester en **mode test**.
2. **Développeurs › Webhooks › Ajouter un point de terminaison** :
   - adresse `https://portail.besoinavocat.ca/api/webhooks/stripe`;
   - copier le secret de signature `whsec_…`.
3. Variable : `BESOINAVOCAT_STRIPE_WEBHOOK_SECRET`.
4. **Règle déontologique** : Stripe sert aux abonnements des avocats à la plateforme. Les avances d'honoraires d'un client appartiennent au compte en fidéicommis de l'avocat; elles ne passent pas par le compte Stripe de BesoinAvocat. Le paiement reste désactivé (D-025) jusqu'aux prix, taxes et conditions approuvés.

### Twilio — téléphonie et SMS (réceptions)

1. Ouvrir un compte sur la [console Twilio](https://console.twilio.com) et noter l'**Account SID** et l'**Auth Token**. Les numéros et les SMS sont payants à l'usage : aucune dépense sans accord du propriétaire.
2. Adresse de rappel d'état : `https://portail.besoinavocat.ca/api/webhooks/twilio`.
3. Variables : `BESOINAVOCAT_TWILIO_ACCOUNT_SID`, `BESOINAVOCAT_TWILIO_AUTH_TOKEN`.
4. Un rappel SMS exige le consentement de la personne (Loi canadienne anti-pourriel) et une mention claire de l'expéditeur.

### CanLII — recherche juridique (clé)

1. Demander une clé d'API par le [formulaire de contact de CanLII](https://www.canlii.org/en/feedback/feedback.html), avec vos coordonnées. L'API (`https://api.canlii.org/v1/`) renvoie des métadonnées (titre, référence, date, citations), pas le texte intégral.
2. Variable : `BESOINAVOCAT_CANLII_API_KEY`.

Documentation : [API CanLII](https://github.com/canlii/API_documentation/blob/master/EN.md).

## Vérifier avec un vrai compte (à faire après la configuration)

Les tests du dépôt ne prouvent rien sur les vrais comptes. Pour chaque fournisseur configuré, l'avocat de test vérifie :

1. Intégrations : l'état est « Prêt à connecter ». **Connecter** mène au consentement du fournisseur, puis la page de retour affiche « Service connecté » et l'adresse du compte.
2. Rendez-vous : **Créer la réunion Zoom**. La réunion apparaît dans Zoom avec salle d'attente et sans enregistrement; le client du dossier voit le lien.
3. **Ajouter à Outlook** et **Ajouter à Google Agenda** : l'événement apparaît à la bonne heure, avec le lien Zoom.
4. **Retirer** : l'élément disparaît chez le fournisseur.
5. **Déconnecter** : l'application n'apparaît plus dans les autorisations du compte (Zoom, Google), ou doit y être retirée à la main (Microsoft).
6. Refuser le consentement, puis recommencer : « Connexion non terminée », sans effet de bord.
7. Notifications : Zoom valide l'adresse; un événement de test Stripe est reçu (200), et un second envoi du même événement est marqué comme doublon.

## Vie privée et déontologie (à valider par le propriétaire et son conseiller)

- Zoom, Microsoft et Google peuvent traiter des renseignements hors du Québec. Avant de communiquer des renseignements personnels à l'extérieur du Québec, la Loi 25 demande une évaluation des facteurs relatifs à la vie privée. Le portail limite ce qui est envoyé (titre, date, durée), mais **le titre d'un rendez-vous ne devrait pas contenir de renseignement confidentiel** sur le client.
- Les connecteurs sont des outils de l'avocat. Ils ne créent aucune relation avocat-client et ne donnent aucun avis juridique.
- Aucun frais de connecteur n'est actif. Les 50 $ évoqués en D-025 restent un exemple, pas un prix.

## Tests du dépôt

- `node --test platform/test/integrations.test.mjs` (11 tests), avec des fournisseurs simulés. Ils couvrent :
  - l'état réel sans configuration et l'adresse d'autorisation exacte;
  - PKCE, l'état à usage unique lié à la personne, et l'échange du code côté serveur;
  - les jetons scellés sur disque, WAL compris, et jamais renvoyés au navigateur;
  - le refus, l'expiration et la panne du fournisseur;
  - la réunion Zoom créée une seule fois, sans lien d'hôte, et les rôles du dossier;
  - Outlook et Google avec le lien Zoom, et le retrait;
  - le renouvellement unique en cas d'actions simultanées, puis « À reconnecter »;
  - la déconnexion et la révocation, la rotation de la clé;
  - les signatures Zoom, Stripe, Twilio et DocuSign, rejeu et doublon compris;
  - les routes HTTP et la page de retour.
- `node --test platform/test/workspace-integrations.test.mjs` (4 tests) : l'écran Intégrations et les boutons des rendez-vous.
- QA Chromium du parcours complet sous la CSP réelle : Connecter, consentement simulé, retour, puis création de la réunion depuis un rendez-vous. À 1440 et 390 px : aucune erreur de script et aucun débordement. Les seuls contrastes signalés par axe-core sont ceux déjà présents dans l'en-tête et le pied de page du portail.
