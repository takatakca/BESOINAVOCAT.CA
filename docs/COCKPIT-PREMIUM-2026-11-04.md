# Portail premium — appels MIMT, vidéo, journal scellé, actes (4 novembre 2026)

Auteur : Claude (Claude Code, projet BESOINAVOCAT COMPLETE, fil « Revamp portal dashboard to premium level »), branche `claude/project-thread-jc2sy5`.

## Pourquoi le portail paraissait « dégradé »

- Le cockpit premium de Juriste (PR 13, 30–31 octobre) n'a jamais été fusionné ni déployé. Rien n'est perdu : son travail est déjà dans `main` (vérifié le 4 novembre) et cette branche le reprend.
- `portail.besoinavocat.ca` tourne encore sur le code du 29–30 octobre. Aucune fusion depuis n'est déployée tant que Coolify n'est pas relancé (voir `docs/COOLIFY.md`).
- Les cartes « Téléphonie MIMT » et « Équipe » étaient des maquettes « à venir », parce que MIMT Connect n'existait pas encore. Il est maintenant livré dans `takatakca/mimtcaapp` (PR 83, sur `main`, désactivé par défaut `PARTNERS=off`).

## Ce qui est livré, et réel

Toute la téléphonie passe par **MIMT seulement**, comme le dit la note Juriste sur Drive (« Téléphonie et vidéo = MIMT seulement »). Twilio a été retiré.

| Fonction | Comment elle marche | Fichiers |
|---|---|---|
| Profil MIMT de l'avocat | Réglages → « Activer la téléphonie MIMT » crée le membre chez MIMT (`PUT /v1/partner/members/:id`, identifiant opaque `ba-…`). | `lib/telephony.mjs`, `public/live.js` |
| Liaison du compte MIMT | « Relier mon compte MIMT » affiche un code à usage unique de 15 min (`POST …/link-requests`). L'avocat l'approuve dans MIMT; le webhook `member.linked` confirme. Le code n'est ni stocké ni journalisé. | idem |
| Ligne, forfait, transfert, disponibilité | Choix de la ligne parmi les numéros du compte MIMT (`PUT …/number`, refus `number_not_owned`), lecture du forfait et des transferts, disponibilité Disponible / Occupé / Hors ligne. | idem |
| Appel depuis un dossier | « Appeler » (avocat ou responsable du dossier seulement) : MIMT fait sonner l'app de l'avocat, puis compose le client avec la ligne de l'avocat (`POST …/calls`). Le numéro du client n'est jamais montré à l'avocat. | idem, onglet « Appels et vidéo » |
| Horodatage des appels | Heures de sonnerie, réponse, fin, durée et crédits viennent des webhooks signés de MIMT (HMAC-SHA256, tolérance 5 min, dédoublonnage par `id`). L'avocat peut verser la durée au temps du dossier en un clic. | idem |
| Enregistrements | Seulement si activé chez MIMT avec l'avis de consentement. Écoute par lien signé de 15 min relu à chaque fois, même origine que l'API vérifiée. | idem |
| Groupe Équipe | Le numéro public fait sonner les avocats disponibles en même temps; le premier qui appuie sur 1 prend l'appel. Synchronisation du groupe (`PUT /v1/partner/hunt-groups/:key`), console des appels, rappel des appels manqués, crédits. | idem, menu « Équipe » |
| Salle vidéo du dossier | WebRTC de navigateur à navigateur, signalisation relayée par le portail aux seuls membres du dossier, relais TURN (coturn, identifiants temporaires HMAC). Entrées et sorties horodatées au journal. | `lib/video-room.mjs` |
| Journal scellé | Chaîne SHA-256 sur les événements du dossier, sceaux en ajout seul; « Vérifier » détecte une ligne modifiée en base. | `lib/audit-seal.mjs`, onglet « Journal et actes » |
| Actes générés | PDF réels (fiche du dossier, relevé des appels, journal, temps, gabarit de l'avocat) enregistrés comme pièces du dossier, factuels, réservés aux avocats. Aucun texte juridique inventé. | `lib/document-generator.mjs`, `lib/pdf.mjs` |
| Couleurs | Cockpit repeint aux couleurs de la vitrine : fond crème, surfaces papier, encre marine, accent bordeaux. Le vert reste réservé aux appels et aux voyants. | `public/styles.css` |

Sans clé MIMT, chaque écran le dit (« à raccorder ») et n'offre aucune action : rien n'est simulé.

## Ce que Matt doit raccorder

### Chez MIMT (propriétaire de MIMT)

1. Activer MIMT Connect : `PARTNERS=on`.
2. Prendre le forfait Affaires Pro et le numéro public de BesoinAvocat.
3. Créer le partenaire `besoinavocat` et approvisionner ses crédits.
4. Créer la clé API (`mimt_pk_…`) et le webhook vers `https://portail.besoinavocat.ca/api/mimt/webhook` (secret `whsec_…`), avec tous les événements `call.*`, `recording.ready` et `member.*`.
5. Signer l'entente de traitement des données (Loi 25) entre BesoinAvocat et MIMT **avant** la mise en service.

### Dans Coolify (application portail) — Matt colle lui-même les secrets

| Variable | Valeur |
|---|---|
| `BESOINAVOCAT_MIMT_API_KEY` | la clé `mimt_pk_…` (secret) |
| `BESOINAVOCAT_MIMT_WEBHOOK_SECRET` | le secret `whsec_…` (secret) |
| `BESOINAVOCAT_MIMT_PUBLIC_NUMBER` | le numéro public, ex. `+1 450 …` |
| `BESOINAVOCAT_MIMT_HUNT_GROUP` | facultatif, défaut `trouver-un-avocat` |
| `BESOINAVOCAT_TEAM_MEMBERS` | JSON `["tenant/sujet", …]` des avocats du groupe Équipe |
| `BESOINAVOCAT_TURN_URLS` | ex. `turn:turn.besoinavocat.ca:3478?transport=udp,turns:turn.besoinavocat.ca:5349` |
| `BESOINAVOCAT_TURN_SECRET` | le `static-auth-secret` du serveur coturn (secret) |
| `BESOINAVOCAT_STUN_URLS` | facultatif, défaut `stun:stun.cloudflare.com:3478` |
| `BESOINAVOCAT_MIMT_API_BASE` | facultatif, défaut `https://api.mimt.ca` |

Sans TURN, la vidéo marche sur la plupart des réseaux, mais pas derrière certains pare-feu d'entreprise. Un petit service coturn peut tourner sur le même VPS (ports 3478 UDP/TCP et 5349).

Puis : fusionner la PR et relancer le déploiement du portail dans Coolify.

## Pas encore fait (dit honnêtement dans l'interface)

- Paiements Équipe par Stripe (client paie, avocat payé, commission) : à concevoir, montants à définir. Marqué « à concevoir ».
- Vidéo hébergée par MIMT (jeton LiveKit, « lot C » de MIMT) : pas encore dans MIMT Connect. La vidéo reste dans le portail.
- Texte de l'avis d'enregistrement : à faire relire juridiquement avant d'activer l'enregistrement chez MIMT.

## Contrôles

- 291/291 tests portail (Node 24), dont 10 sur la téléphonie MIMT, la vidéo, le journal et les PDF, avec un faux MIMT Connect fidèle au contrat `docs/MIMT-CONNECT.md` de mimtcaapp.
- Recette Chromium 1440 px en aperçu : aucune erreur console, CSP stricte respectée.
- Aucun secret, DNS, déploiement ni donnée réelle touché. `mimtcaapp` lu seulement.

## Lot 2 — vue client simplifiée et pièces demandées (4 novembre 2026)

- **Pièces demandées** (`lib/document-requests.mjs`, routes `/api/cases/:id/requests…`) : l'avocat demande une pièce (titre, précisions, échéance); le client répond en joignant une pièce déjà au dossier ou par écrit; l'avocat accepte, redemande ou annule. Chaque étape est horodatée par le serveur, gardée dans un historique en ajout seul (déclencheurs SQLite) et versée au journal scellé du dossier. Aucun courriel ni texto n'est envoyé.
- **Vue client** : un vrai compte client (pas l'aperçu) voit à l'accueil une seule « prochaine étape » (pièce attendue, sinon prochain rendez-vous, sinon « rien à faire »), quatre grandes actions (envoyer une pièce, écrire à mon avocat, appel ou vidéo, mes rendez-vous) et la liste des pièces demandées. Plus de cadrans ni de file de travail pour le client. Les avocats gardent le cockpit, avec le panneau des pièces demandées en plus.
- Tests : 301/301.

## Lot 3 — abonnement des avocats par Stripe (4 novembre 2026)

Choix du propriétaire : **« Lawyer subscription only »**. Les avocats paient leur accès à la plateforme par Stripe Checkout; les clients paient leur avocat directement. Aucun paiement de client, aucune avance d'honoraires, aucune commission ne passe par BesoinAvocat (D-025).

- `lib/membership.mjs`, routes `GET /api/membership`, `POST /api/membership/checkout`, `POST /api/membership/portal`; panneau « Abonnement à la plateforme » dans Réglages (avocats seulement).
- Les montants sont lus chez Stripe à partir des identifiants de prix; aucun montant n'est écrit dans le code.
- L'état (actif, en retard, terminé) vient seulement des notifications signées de Stripe, dédoublonnées; historique en ajout seul.
- Rien n'est encore relié à l'accès (l'Équipe ne dépend pas de l'abonnement) : à décider par le propriétaire.

**À raccorder** (détail dans `docs/INTEGRATIONS.md`, section Stripe) : créer le produit et les prix dans Stripe, poser `BESOINAVOCAT_STRIPE_SECRET_KEY`, `BESOINAVOCAT_STRIPE_PRICE_WEEKLY` et/ou `_MONTHLY`, `BESOINAVOCAT_STRIPE_WEBHOOK_SECRET` dans Coolify, cocher les quatre événements du webhook, activer le portail client et Stripe Tax.

Tests : 313/313.

## Lot 4 — échéances du dossier (4 novembre 2026)

- `lib/deadlines.mjs`, routes `GET/POST /api/cases/:id/deadlines`, `POST …/deadlines/:id` (modifier), `POST …/deadlines/:id/(done|reopen|cancel)`, `GET …/deadlines/:id/history`, `GET …/deadlines.ics`, et `GET /api/deadlines/upcoming?days=7` (tous les dossiers de la personne).
- L'avocat saisit chaque date (audience, dépôt, prescription, rencontre, autre), avec heure et note facultatives, et choisit si le client la voit. **Le portail ne calcule aucun délai légal** : l'avocat reste responsable de chaque date.
- Le client ne voit que les échéances partagées, jamais une échéance interne, même par son identifiant ou dans le calendrier exporté.
- Historique en ajout seul (déclencheurs SQLite), chaque étape versée au journal du dossier (`deadline.*`), export de calendrier journalisé.
- Écrans : panneau « Échéances du dossier » dans l'espace avocat, la vue client et Rendez-vous; bouton « Ajouter à mon calendrier » (.ics, fuseau America/Toronto). Le cadran « Échéances · 7 jours » du cockpit affiche maintenant le vrai nombre et son tiroir liste les échéances de la semaine, dossier par dossier (« bientôt » seulement dans l'aperçu).
- Tables `case_deadlines` et `case_deadline_events` ajoutées à la liste de sauvegarde (`tools/backup-corpus.py`), selon la règle du fil backend.
- Aucun rappel par courriel ni texto n'est envoyé.

Tests : 317/317 Node, 17/17 Python de sauvegarde.

## Lot 5 — cadran « Nouvelles demandes » (4 novembre 2026)

- Pour l'équipe de réception seulement (`BESOINAVOCAT_INTAKE_REVIEWERS`) : le cadran affiche le nombre de demandes reçues non traitées; son tiroir donne les décomptes par statut et ouvre `/demandes`. Seuls les décomptes sont lus, jamais une coordonnée.
- Les avocats et l'aperçu gardent « bientôt » : les demandes publiques ne sont transmises à aucun avocat (le consentement ne le couvre pas).

Tests : 318/318.

## Lot 6 — téléversement en flux (4 novembre 2026)

- Les pièces partent telles quelles par `PUT /api/cases/:id/documents/stream` (route de la PR 25 du fil backend), avec leur description dans un en-tête. Plus d'encodage base64 dans le navigateur : environ un tiers de données en moins, et moins de mémoire pour les grosses vidéos.
- Repli sur la route JSON si la description dépasse 8 Ko (long texte saisi) ou si le serveur n'a pas la route.
- Tous les envois passent par la même file : un à la fois, nouvel essai si le serveur est occupé.

Tests : 340/340.

## Lot 7 — accueil relié : choisir le dossier sans cliquer partout (13 novembre 2026)

Demande du propriétaire : « ça me dit ce dossier, mais ça me donne pas le choix de quel dossier ; ça devrait relier tout ».

- **Sélecteur de dossier** en tête de l'accueil (téléphone et bureau) : une pastille par dossier accessible, la pastille du dossier affiché est marquée, les autres portent le nombre d'éléments en attente (pièces à vérifier, chronomètre en cours, rendez-vous dans les 7 jours, temps à valider pour les avocats). Un tap change de dossier.
- **Vue d'ensemble** (dès 2 dossiers) : une ligne par dossier avec ses chiffres réels — pièces à vérifier, messages, temps soumis, prochain rendez-vous. Chaque chiffre est un bouton qui ouvre directement la bonne section du bon dossier (`data-action="open-case-view"`, `data-section`). Tant qu'un dossier n'est pas chargé, la ligne dit « chargement… » ; s'il est injoignable, « résumé indisponible ». Rien n'est inventé.
- **File de travail reliée** : les éléments des autres dossiers (chronomètre, rendez-vous proche, temps à valider, pièces à vérifier) s'ajoutent à ceux du dossier affiché, chacun avec son bouton vers la bonne section. Le titre dit « Dossier X et N autres dossiers ».
- **Chargement en arrière-plan** : après l'ouverture (`start`) et à chaque retour à l'accueil, un `GET /api/cases/:id` par autre dossier (24 au plus), résumé gardé 60 s dans `state.overview`, jamais dans l'aperçu fictif, jamais pendant le rendu. Une erreur sur un dossier n'affecte pas les autres.
- Bureau : la liste de dossiers du poste de travail montre aussi le compteur d'attente à côté des dossiers non affichés.

Tests : 375/375 (3 nouveaux dans `platform/test/cockpit.test.mjs`). Aucun style en ligne, aucun `localStorage`.

**Mise en ligne** : l'autodéploiement est désactivé ; après la fusion dans `main`, un redéploiement manuel du portail dans Coolify est nécessaire pour voir ce lot sur portail.besoinavocat.ca.

## Lot 8 — liens profonds et passerelle vers l'espace avocat (13 novembre 2026)

Demandes du fil « Ouvrir l'inscription avocat avec essai gratuit » (PR 56) :

- **Lien profond** `portail/#case/<id>` ou `#case/<id>/<section>` : à l'ouverture, le portail affiche directement ce dossier et cette section (sections = celles de la barre : `documents`, `messages`, `time`, `communications`, `live`, `journal`, …). Un dossier que le compte ne voit pas, ou une section inconnue, retombe sur le comportement habituel (premier dossier, accueil). Aucune requête n'est faite pour un identifiant inconnu.
- **Écran de connexion** : « Vous êtes avocat ? Créer mon compte (14 jours gratuits, sans carte) » vers l'espace avocat, affiché seulement quand `/api/health` annonce `lawyerSpace: { url, trialDays }` (chemin local uniquement). Tant que le serveur ne l'annonce pas, aucun lien vers une page absente.
- **Abonnement** (`live.js`) : statut `trial_expired` libellé « Essai terminé » (ton d'alerte), forfait `trial` libellé « d'essai », jours d'essai restants affichés quand `membership.trial` est présent, invitation à choisir un forfait quand l'essai est terminé.

Tests : 377/377 (+2 dans `cockpit.test.mjs`).
