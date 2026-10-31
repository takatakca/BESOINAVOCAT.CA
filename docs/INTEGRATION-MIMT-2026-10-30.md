# Intégration MIMT — contrat attendu de MIMT Connect (30 octobre 2026)

**Direction du propriétaire (30 octobre 2026)** : le téléphone et la vidéo des avocats viennent **uniquement de MIMT** (mimt.ca). Le lien se fait par identifiant. BesoinAvocat ne fait que les boutons et la mise en page. L’API vient de MIMT : **MIMT Connect**, l’API partenaire construite pour besoinavocat.ca (PR #83 de `takatakca/mimtcaapp`).

**État** : MIMT Connect est **désactivé** (`PARTNERS=off` par défaut). Ses routes `/v1/partner/…` répondent 404 tant que MIMT n’a pas mis `PARTNERS=on`. Côté BesoinAvocat, rien n’est raccordé :

- aucune clé d’API;
- aucun récepteur de webhook;
- aucun appel.

Le cockpit affiche le parcours avec le statut « À venir — MIMT Connect pas encore activé ». Cette note ne crée ni compte, ni numéro, ni portage, ni paiement, ni appel.

## Sources lues

Lecture seule de `takatakca/mimtcaapp`, commit `2c960db` :

| Document ou code | Ce qu’on y lit |
|---|---|
| `docs/MIMT-CONNECT.md` | API partenaire, webhooks, crédits, mise en place pour besoinavocat, Loi 25 |
| `docs/MIMT-VIDEO.md` | Réunions LiveKit, jetons signés par l’API MIMT |
| `docs/MIMT-PARITY.md` et `docs/MIMT-LAUNCH.md` | Portage : `/v1/port-ins`, `/webhooks/twilio/porting`, interrupteur `TWILIO_PORTING_ENABLED` |
| `docs/AGENT_HANDOFF.md` | Sélecteur de numéro : `GET /v1/public/numbers/search`, réservations, paiement par Checkout |
| `apps/web/lib/site.ts` et routes de `apps/webphone` | Liens publics utilisés dans le cockpit |

Les liens publics utilisés dans le cockpit :

- `https://mimt.ca/affaires/`
- `https://mimt.ca/forfaits/`
- `https://mimt.ca/app-web/`
- `https://app.mimt.ca/connexion`
- `https://app.mimt.ca/numero`
- `https://app.mimt.ca/services/transfert`

Le site public n’a pas pu être consulté depuis l’environnement de travail : le proxy a refusé l’accès à `mimt.ca`. Ces adresses viennent donc du code source et restent à vérifier en ligne.

## Le modèle de MIMT Connect, en bref

- **besoinavocat est une entreprise MIMT** (forfait MIMT Affaires Pro) devenue **partenaire** :
  - chaque avocat y est un **membre**, désigné par son `externalId`, c’est-à-dire **l’identifiant d’avocat de BesoinAvocat**;
  - chaque membre reçoit un **poste** du standard MIMT;
  - il sonne sur son cellulaire (avec le « appuyez sur 1 ») ou dans ses apps MIMT, par son `@nom`, s’il est membre actif de l’entreprise.
- **Groupe de chasse** : le numéro public (`did`) fait sonner un groupe d’avocats, en simultané ou en séquentiel.
- **Authentification** : `Authorization: Bearer mimt_pk_…`, une clé **serveur** (120 requêtes par minute).
- **Webhooks signés** : `X-MIMT-Signature: t=…,v1=<HMAC-SHA256>`, avec dédoublonnage sur `id`.
- **Facturation** : MIMT facture le partenaire en **crédits** internes.

## Contrat dont BesoinAvocat a besoin, mis en regard de MIMT Connect

| Besoin de BesoinAvocat | Ce qui existe chez MIMT | État |
|---|---|---|
| **Lier un avocat** à MIMT par identifiant | `PUT /v1/partner/members/:externalId`, plus `GET` et `DELETE` (désactivation). Champs : `name`, `email`, `phone`, `handle`, `language`, `active` | **Existe.** Lien par l’identifiant BesoinAvocat, poussé par le serveur. Voir l’écart 1. |
| **Choisir un numéro** pour l’avocat | Sélecteur public `GET /v1/public/numbers/search` et réservation, sur le compte MIMT de la personne | **ÉCART 2** : aucune route partenaire pour rattacher le numéro d’un avocat. Seul le `did` d’un groupe se règle. |
| **État de l’abonnement et du paiement** de l’avocat | Paiement Stripe de MIMT (`/v1/billing/checkout`); `GET /v1/partner/credits` donne le solde de crédits **du partenaire** | **ÉCART 3** : rien ne donne au partenaire l’état du forfait **d’un avocat**. |
| **État d’un transfert de numéro** | `/v1/port-ins` et `/webhooks/twilio/porting` côté utilisateur MIMT, si `TWILIO_PORTING_ENABLED` | **ÉCART 4** : pas de route partenaire ni d’événement pour suivre le transfert d’un avocat. |
| **Appeler depuis le portail** (cliquer pour appeler) | Rien en v1 : les appels sortants des membres au nom du partenaire sont **reportés** | **ÉCART 5.** |
| **Jeton de session vidéo** | Réunions MIMT : `POST /v1/meetings`, `/:id/token`, `/:id/invites` et `join/guest`, réservées aux utilisateurs MIMT | **ÉCART 6** : rien dans MIMT Connect. Vidéo « plus tard ». |
| **Appel de groupe** : faire sonner tous les avocats disponibles | `PUT /v1/partner/hunt-groups/:key`, `strategy: "simultaneous"`, `ringTimeoutS`, `fallback`, `did` (forfait Affaires Pro) | **Existe.** La disponibilité se gère en renvoyant la liste du groupe; voir l’écart 7. |
| **Premier qui répond** | Webhook `call.answered` avec `member_external_id`. Le premier qui appuie sur 1 prend l’appel. | **Existe.** |
| **Événements d’appel** | `call.ringing`, `call.answered`, `call.completed` (`duration_s`, `credits`, `billing`, `unbilled_credits`), `recording.ready`; rattrapage par `GET /v1/partner/calls?since=&member=` | **Existe.** Identifiants et métadonnées seulement. |
| **Enregistrements** | `GET /v1/partner/recordings/:id` : lien signé de 15 minutes, si l’enregistrement est activé avec l’avis de consentement | **Existe.** Usage à décider (secret professionnel). |
| **Facturation, commission, Stripe Connect** : le client paie, l’avocat est payé, BesoinAvocat retient une commission, l’avocat paie son abonnement de membre | MIMT : crédits du partenaire. Recharge par administrateur MIMT; recharge Stripe reportée. | **ÉCART 8** : rien chez MIMT pour Stripe Connect. C’est une conception à faire **chez BesoinAvocat**, sur ses propres comptes Stripe. |

## Écarts à régler avec MIMT

1. **Consentement de l’avocat au lien de compte.**
   - Aujourd’hui le partenaire pousse un membre; l’avocat ne prouve pas qu’il possède le compte MIMT `@nom`.
   - Le `@nom` doit déjà être membre actif de l’entreprise besoinavocat.
   - Il manque un parcours où l’avocat autorise le lien, avec révocation.
2. **Le numéro de chaque avocat** : choix, attribution et affichage par partenaire.
3. **État de l’abonnement de chaque avocat** chez MIMT : actif, en retard ou annulé. Aucune donnée de paiement.
4. **Suivi du transfert de numéro** par partenaire : état et date prévue, sans la lettre d’autorisation.
5. **Appel sortant au nom du partenaire** (cliquer pour appeler) et appels venant de l’app MIMT vers le numéro du partenaire.
6. **Vidéo dans MIMT Connect** : jeton de réunion ou lien d’invité émis pour un membre ou pour un client du partenaire.
7. **Disponibilité des avocats** : horaires gérés par MIMT, ou au moins un événement « membre disponible ».
8. **Paiements** :
   - recharge Stripe des crédits du partenaire;
   - séparation entre crédits de télécommunication, honoraires et commission.
   Le partage avec l’avocat se ferait par Stripe Connect **chez BesoinAvocat**. Montants, taxes et commission restent à définir. **Revue déontologique requise** sur la commission et le partage d’honoraires avec une entité qui n’est pas un cabinet.
9. **Adresse du webhook** : MIMT-CONNECT prévoit `https://besoinavocat.ca/api/mimt/webhook`. Le portail Node est servi sur `portail.besoinavocat.ca` : choisir l’adresse réelle.
10. **Interrupteur** : MIMT doit activer `PARTNERS=on`, créer le partenaire et les crédits, et remettre une clé `mimt_pk_` et un secret `whsec_`. Ils sont à conserver dans les secrets du serveur, **jamais dans Git**.

## Travail futur côté BesoinAvocat (pas fait ici)

Ce lot est purement front-end. Le raccordement exigera, côté serveur, sur autorisation explicite :

- un **client serveur** MIMT Connect, avec la clé dans les secrets;
- un **récepteur** `POST /api/mimt/webhook` : vérification de la signature sur les octets bruts, dédoublonnage sur `id`, enregistrement par `member_external_id`;
- une **synchronisation des membres** : identifiant d’avocat vers `externalId`;
- un affichage des appels dans les dossiers.

Ces ajouts ne sont **pas** dans cette branche.

## Loi 25 et secret professionnel

- Pour ces appels, MIMT agit comme **fournisseur de services** (sous-traitant) de besoinavocat, qui reste responsable des renseignements de ses appelants et de ses avocats.
- Une **entente de traitement (DPA) est requise avant la mise en service**. Elle doit couvrir :
  - les finalités : acheminement, facturation, enregistrement si activé;
  - les mesures de sécurité;
  - les sous-traitants : Twilio, hébergement;
  - la conservation et la suppression des enregistrements;
  - l’avis d’incident;
  - le retour ou la destruction des données en fin de contrat.
- **Évaluation des facteurs relatifs à la vie privée** : requise si des renseignements sortent du Québec (Twilio).
- **Données minimales** : webhooks et API ne portent qu’identifiants, numéros, heures, durées et crédits.
  - **Jamais d’audio** dans les webhooks.
  - **Aucune transcription** en v1.
  - Enregistrements par lien signé de 15 minutes seulement.
- **Consentement à l’enregistrement** : l’avis est lu à chaque appelant quand l’enregistrement est actif. Il doit aussi figurer dans la politique de confidentialité de BesoinAvocat.
- **Secret professionnel** : MIMT n’écoute pas les conversations. Les résumés IA restent **désactivés** pour besoinavocat, sauf entente écrite.
  - Décider, avec les avocats, si l’enregistrement est souhaitable.
- **Pas de mise en relation non encadrée** : aucune liste d’avocats ni disponibilité n’est inventée (D-006, D-013). Le groupe « Trouver un avocat » ne s’ouvre qu’avec :
  - des avocats réellement inscrits et consentants;
  - une revue juridique et déontologique.

## Ce que montre le cockpit

- **Carte « Téléphonie MIMT »** : en tête des intégrations et parmi les tuiles. Elle ouvre le tableau « Intégration MIMT », une fenêtre accessible (Échap ferme, focus retenu) en 6 étapes :
  1. compte MIMT;
  2. numéro;
  3. forfait et paiement chez MIMT;
  4. transfert du numéro;
  5. lien par identifiant;
  6. appels et vidéo.

  Chaque étape donne le lien MIMT réel, ce qui est partagé avec BesoinAvocat, la route MIMT Connect correspondante ou l’écart, et le statut « À venir ».
- **Carte « Équipe · Appel de groupe »** (bientôt). Elle explique le parcours prévu :
  - sonnerie simultanée;
  - premier qui accepte;
  - durée et crédits;
  - Stripe et commission à définir.

  Aucun avocat, montant ni appel n’est affiché.
- Le bouton existant « Demander un rappel dans le dossier » (message au dossier) reste disponible.
