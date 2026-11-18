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

## 6. Tous les magasins et tous les écrans : liens d'inscription et de dépôt

Demande du propriétaire, 18 novembre 2026 : « partout » (téléphones, tablettes, ordinateurs, télés, consoles), version internationale.

**Règle :** une seule app, le portail. Ce qui est fait dans une version est fait dans toutes.

**État :**
- **Déjà en ligne :** l'app installable (PWA) avec manifeste, icônes et captures d'écran.
- **Validation :** PWABuilder la valide sans erreur.
- **Paquet Android unique :** il sert à Google Play, Amazon, Samsung Galaxy Store et Huawei.

| # | Plateforme | Appareils | Paquet | Inscription (entreprise) | Dépôt de l'app | Coût | Faisabilité |
|---|---|---|---|---|---|---|---|
| 1 | Google Play | téléphones, tablettes, Chromebook | `.aab` (PWABuilder) | https://play.google.com/console/signup | https://play.google.com/console | 25 $ US une fois | Oui |
| 2 | Google TV / Android TV | télés Android, Sony, TCL, Hisense, etc. | même `.aab`, déclaré « TV » | même compte Google Play | Play Console › Facteurs de forme › TV | inclus | Possible, mais Google exige une navigation à la télécommande. Le portail se tape au clavier : version télé à adapter (lecture du dossier, rendez-vous, visio). |
| 3 | Apple App Store | iPhone, iPad, Mac | projet Xcode (PWABuilder iOS) | https://developer.apple.com/programs/enroll/ | https://appstoreconnect.apple.com | 99 $ US par an | Oui. Mac requis (ou exécuteur macOS de GitHub Actions). Règle 4.2 : voir section 4. |
| 4 | Apple TV (tvOS) | Apple TV | — | même compte Apple | — | — | Non sans réécriture : tvOS n'a pas de navigateur intégré pour afficher le portail. |
| 5 | Microsoft Store | PC Windows 10 et 11 | `.msix` (PWABuilder) | https://storedeveloper.microsoft.com | https://partner.microsoft.com/dashboard | gratuit | Oui |
| 6 | Xbox | consoles Xbox | `.msix` | même compte Microsoft | Partner Center | gratuit | À vérifier : Microsoft ne garantit pas les PWA sur Xbox. On le teste après le dépôt Windows. |
| 7 | Amazon Appstore | tablettes Fire, Fire TV | même `.aab` ou `.apk` | https://developer.amazon.com/apps-and-games/console | https://developer.amazon.com/apps-and-games/console | gratuit | Oui pour les tablettes Fire. Pour Fire TV, même réserve sur la télécommande que la ligne 2. |
| 8 | Samsung Galaxy Store | téléphones et tablettes Samsung | même `.apk` | https://seller.samsungapps.com | https://seller.samsungapps.com | gratuit | Oui |
| 9 | Samsung Smart TV (Tizen) | télés Samsung | app Web Tizen (`.wgt`) | https://seller.samsungapps.com/tv/ | TV Seller Office | gratuit, mais partenariat à faire approuver | Possible. Samsung choisit ses partenaires TV ; même réserve télécommande. |
| 10 | LG webOS TV | télés LG | app Web webOS (`.ipk`) | http://seller.lgappstv.com/seller/member/register/memberMain.lge | http://seller.lgappstv.com | gratuit | Possible ; même réserve télécommande. |
| 11 | Huawei AppGallery | téléphones Huawei | même `.apk` | https://developer.huawei.com/consumer/en/appgallery | AppGallery Connect | gratuit | Oui ; utile surtout hors Amérique du Nord. |
| 12 | Linux | tout PC Linux | bouton « Installer » du navigateur (déjà actif) ; plus tard Snap ou Flathub | https://snapcraft.io/account | https://snapcraft.io | gratuit | Déjà possible par le navigateur |
| 13 | PlayStation | PS4, PS5 | — | https://partners.playstation.net | — | — | Non : Sony ne publie que des jeux et de grands services de streaming approuvés. Pas d'accès pour une app de ce type. |
| 14 | Roku | télés Roku | — | https://developer.roku.com | — | — | Non sans réécriture complète dans le langage de Roku (BrightScript). |

### Ordre recommandé

1. **Inscriptions de l'entreprise :** D-U-N-S, Google Play, Apple, Microsoft, Amazon, Samsung (comptes mobiles).
2. **Paquets :** Android (lignes 1, 7, 8, 11) et Windows (ligne 5), puis iPhone, iPad et Mac (ligne 3).
3. **Version télé « télécommande » :** à prévoir pour les lignes 2, 7, 9 et 10, une fois les apps mobiles et ordinateur publiées.

### International

- **Pays :** les fiches peuvent viser tous les pays.
- **Langues :** le portail est en français ; les textes des fiches sont en français et en anglais (section 5). Une interface anglaise complète du portail serait un chantier à part.
- **Avertissement :** il reste vrai partout. BesoinAvocat prépare des dossiers pour des avocats **du Québec** et n'est pas un cabinet d'avocats.

## 7. Images et mode télé (2026-11-18)

Toutes les images demandées par les magasins sont prêtes dans [`docs/store-assets/`](store-assets/README.md) : icônes, bannières, affiches Microsoft, bannières télé et captures téléphone, tablette, ordinateur et télé.
Le portail se pilote maintenant à la télécommande sur les télés (flèches, OK, Retour) : c'est la condition pour Google TV, Fire TV, Samsung TV, LG webOS et Xbox.
