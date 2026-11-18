# BesoinAvocat dans les magasins d'applications

Demande du propriétaire, 18 novembre 2026 : une vraie app BesoinAvocat sur téléphone et ordinateur, dans Google Play, l'App Store d'Apple et le Microsoft Store.

## Principe

Les trois apps ouvrent le **même portail** (`https://portail.besoinavocat.ca`) en plein écran, avec l'icône BesoinAvocat. On ne réécrit pas le portail : une seule version du code, et chaque mise à jour du portail est aussitôt dans les trois apps.

- **Base :** le portail est déjà une app installable (PWA, PR 83 : manifeste, service worker, icônes, page hors connexion).
- **Données :** aucune donnée de dossier n'est gardée sur l'appareil. Le service worker ne met en cache que les fichiers publics.

| Magasin | Appareils | Paquet | Outil | Inscription développeur |
|---|---|---|---|---|
| Google Play | téléphones et tablettes Android, Chromebook | `.aab` (Trusted Web Activity) | PWABuilder ou Bubblewrap | 25 $ US, une seule fois |
| Microsoft Store | Windows 10 et 11 | `.msix` | PWABuilder | gratuit (particulier ou entreprise, depuis mai 2026) |
| App Store (Apple) | iPhone, iPad, Mac (Apple Silicon) | projet Xcode | PWABuilder iOS ou Capacitor, compilé sur un Mac ou un exécuteur macOS de GitHub Actions | 99 $ US par an |
| Linux, autres | tout navigateur récent | — | bouton « Installer » du navigateur | aucune |

## 1. Inscriptions (le propriétaire les fait lui-même)

Inscrire **l'entreprise** (Groupe Takatak), pas un particulier, dans les trois magasins.

**Pourquoi l'entreprise :**
- **Google Play :** un compte *personnel* créé après le 13 novembre 2023 doit faire tester l'app par 12 personnes pendant 14 jours avant de publier. Un compte *organisation* en est dispensé.
- **Nom affiché :** c'est le nom de l'entreprise qui apparaît comme éditeur dans les magasins.

**Préalable :** Google et Apple demandent un numéro **D-U-N-S**. Il est gratuit chez Dun & Bradstreet (on le demande depuis la page d'Apple). Compter quelques jours ouvrables. Le demander en premier.

**Où s'inscrire :**
1. **Google Play Console :** https://play.google.com/console/signup. Type « Organisation », D-U-N-S, 25 $ US.
2. **Apple Developer Program :** https://developer.apple.com/programs/enroll/. Type « Organization », D-U-N-S, 99 $ US par an, identifiant Apple avec double authentification.
3. **Microsoft Partner Center :** https://storedeveloper.microsoft.com. Type « Company », pièce d'identité, gratuit.

Le propriétaire saisit lui-même ses mots de passe, ses codes et son paiement. Claude ne les tape jamais.

## 2. Ce qui est déjà prêt dans le code

- **App installable :** manifeste `/manifest.webmanifest` (nom, icônes 192 et 512, icône « maskable » Android, couleurs, raccourcis Espace avocat et Aide).
- **Fichier de liaison Android** `/.well-known/assetlinks.json` : il permet à l'app Google Play de s'ouvrir sans barre d'adresse. Il est servi dès que Coolify contient :
  - `BESOINAVOCAT_ANDROID_CERT_SHA256` : l'empreinte SHA-256 du certificat de signature, prise dans Play Console › Intégrité de l'application. Plusieurs empreintes sont séparées par des virgules.
  - `BESOINAVOCAT_ANDROID_PACKAGE` : facultatif, `ca.besoinavocat.portail` par défaut.

  Sans ces réglages, la page répond 404.
- **Identifiant d'app commun** aux trois magasins : `ca.besoinavocat.portail`.

## 3. Construction des paquets (Claude, une fois le portail redéployé)

1. **Mise en ligne de la PWA :** il faut que le redéploiement de `main` (PR 83 et suivantes) soit en ligne.
2. **Analyse :** passer `https://portail.besoinavocat.ca` dans https://www.pwabuilder.com. On doit obtenir un score sans erreur pour le manifeste et le service worker.
3. **Android :** paquet Google Play, identifiant `ca.besoinavocat.portail`.
   - Google conserve la clé de signature (Play App Signing).
   - Copier l'empreinte SHA-256 de Play Console dans `BESOINAVOCAT_ANDROID_CERT_SHA256`, puis redéployer.
4. **Windows :** paquet MSIX. Les valeurs « Package ID », « Publisher » et « Publisher display name » viennent de Partner Center › Product identity, après la réservation du nom « BesoinAvocat ».
5. **iPhone, iPad et Mac :**
   - générer le projet Xcode ;
   - le compiler et le signer avec le compte Apple ;
   - l'envoyer dans App Store Connect, puis TestFlight.

## 4. Points d'attention

- **Apple, règle 4.2 :** Apple refuse les apps qui ne sont « qu'un site Web ». Pour limiter le risque :
  - mettre en avant ce que l'app fait au-delà du site : dépôt de pièces avec l'appareil photo, messages vidéo, dictée, appels et rendez-vous ;
  - ajouter les notifications du dossier dès que possible.
- **Fiches des magasins :** il faut, pour chaque magasin :
  - la politique de confidentialité (`/confidentialite`) ;
  - les conditions (`/conditions`) ;
  - le soutien (`/aide`) ;
  - des captures d'écran du téléphone et de l'ordinateur ;
  - un compte d'essai pour les examinateurs : l'essai avocat de 14 jours (`/avocat`) suffit.
- **Classification et données :** l'app collecte des renseignements personnels et des documents juridiques. Le questionnaire « Sécurité des données » de Google et les « App Privacy Details » d'Apple doivent le dire honnêtement : données chiffrées en transit, pas de publicité, pas de revente.
- **Paiements :** les forfaits sont vendus sur le site, pas dans l'app. Ne pas mettre de bouton d'achat dans les apps iOS et Android, pour éviter les règles d'achat intégré d'Apple et de Google.

## 5. Textes des fiches

**Nom :** BesoinAvocat

**Sous-titre (30 caractères au plus) :**
- FR : « Votre dossier, prêt pour l'avocat »
- EN : « Your case, ready for a lawyer »

**Description courte (80 caractères au plus) :**
- FR : « Préparez votre dossier juridique et suivez-le avec votre avocat, au même endroit. »
- EN : « Prepare your legal file and follow it with your lawyer, all in one place. »

**Description longue, FR :**
> BesoinAvocat vous aide à préparer votre dossier avant de rencontrer un avocat au Québec. Déposez vos pièces, expliquez votre situation par écrit, par la voix ou en vidéo, et suivez chaque étape dans un espace privé. Un avocat du domaine concerné voit un dossier déjà prêt ; c'est seulement ensuite que vous convenez ensemble du mandat.
> • Dépôt sécurisé de documents et de photos
> • Messages, rendez-vous et visioconférence avec votre avocat
> • Échéances et suivi du dossier
> • Espace avocat avec essai gratuit de 14 jours
> BesoinAvocat n'est pas un cabinet d'avocats et ne donne pas de conseils juridiques.

**Description longue, EN :**
> BesoinAvocat helps you prepare your case before meeting a lawyer in Quebec. Upload your documents, explain your situation in writing, by voice or on video, and follow every step in a private space. A lawyer in the relevant field sees a file that is already prepared; only then do you agree on the mandate together.
> • Secure upload of documents and photos
> • Messages, appointments and video calls with your lawyer
> • Deadlines and case tracking
> • Lawyer workspace with a free 14-day trial
> BesoinAvocat is not a law firm and does not provide legal advice.

**Catégorie :** Professionnel / Productivité (Business / Productivity).
