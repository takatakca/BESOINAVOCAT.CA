# Dépôt de BesoinAvocat dans les autres magasins — 20 novembre 2026

Suite de [APPS-MAGASINS.md](APPS-MAGASINS.md). Ce guide donne, pour chaque magasin, ce que le propriétaire fait lui-même et ce que Claude remplit ensuite, avec les réponses à copier. Les réponses reprennent celles de Google Play, déjà enregistrées le 20 novembre.

## État au 20 novembre 2026 (21 h 30 UTC)

| Magasin | État | Prochaine étape | Qui |
|---|---|---|---|
| Google Play | 11 tâches sur 12 terminées | « Don't label assets » + Save sur la fiche, puis téléversement de l'AAB | propriétaire, puis Claude |
| Microsoft Store | compte « Groupe TAKATAK » : courriel et entreprise vérifiés, emploi en vérification (environ 5 jours ouvrables) | attendre le courriel de Microsoft | Microsoft |
| Zoom Marketplace | application soumise, en révision fonctionnelle | attendre la réponse de Zoom | Zoom |
| Samsung Galaxy Store | pas de compte | créer le compte vendeur | propriétaire |
| Huawei AppGallery | pas de compte | créer le compte développeur entreprise | propriétaire |
| Amazon (tablettes Fire, Fire TV) | pas de compte | créer le compte développeur | propriétaire |
| Apple App Store | pas de compte | inscription « Organization », 99 $ US par an | propriétaire |

**PWABuilder (nouveau test, 20 novembre) :** « Your PWA is store ready ». Aucune erreur, aucun avertissement bloquant. Il reste seulement 2 suggestions facultatives et 7 idées d'amélioration.

**Amazon :** Amazon a fermé son magasin sur les téléphones Android le 20 août 2025. Il reste ouvert sur les tablettes Fire et la Fire TV. Le dépôt Amazon vise donc ces appareils seulement.

## Le même paquet Android partout

Le ZIP de PWABuilder (paquet Android `ca.besoinavocat.portail`) contient :
- un fichier `.aab`, pour Google Play ;
- un fichier `.apk`, pour Samsung, Huawei et Amazon ;
- la clé de signature `signing.keystore` et un fichier de mots de passe.

**Garder la clé et ses mots de passe secrets.** Ils ne vont jamais dans le dépôt, le Drive, le clavardage ou la mémoire. Les ranger avec `CLES-INTEGRATIONS-BESOINAVOCAT.txt` sur le PC.

Le même `.apk` signé par cette clé sert aux trois magasins hors Google. Pour que l'app s'ouvre sans barre d'adresse, Coolify doit avoir les deux empreintes dans `BESOINAVOCAT_ANDROID_CERT_SHA256`, séparées par une virgule :
- celle de Google Play (Play App Signing) ;
- celle de la clé de PWABuilder (indiquée dans le ZIP).

## Réponses communes (à copier dans chaque magasin)

- **Nom :** BesoinAvocat
- **Éditeur :** Groupe TAKATAK (Quadro Holdings Ltée)
- **Catégorie :** Business / Affaires (sinon Productivité)
- **Textes courts et longs, FR et EN :** [APPS-MAGASINS.md §5](APPS-MAGASINS.md#5-textes-des-fiches)
- **Site :** https://portail.besoinavocat.ca
- **Politique de confidentialité :** https://portail.besoinavocat.ca/confidentialite
- **Conditions d'utilisation :** https://portail.besoinavocat.ca/conditions
- **Suppression du compte :** https://portail.besoinavocat.ca/suppression-compte
- **Soutien :** https://portail.besoinavocat.ca/aide · support@takatak.ca
- **Prix :** gratuit au téléchargement. Pas d'achat dans l'app : les forfaits se prennent sur le site.
- **Publicité :** aucune.
- **Public :** adultes (18 ans et plus). Ne vise pas les enfants.
- **Classification d'âge :** mêmes réponses que Google Play.
  - Les utilisateurs échangent entre eux, mais seulement avec les personnes invitées au dossier.
  - Pas de violence, pas de nudité, pas de jeux d'argent, pas d'achats, pas de localisation partagée.
- **Données collectées :**
  - nom, courriel, téléphone et identifiants de compte ;
  - documents et messages du dossier ;
  - journaux techniques, pour la sécurité.
- **Utilisation des données :** chiffrées en transit, ni vendues ni partagées pour la publicité, suppression sur demande.
- **Compte pour les examinateurs :** le compte client de vérification déjà donné à Google (voir JOURNAL-AGENTS, 20 novembre). Le mot de passe se trouve seulement dans `CLES-INTEGRATIONS-BESOINAVOCAT.txt`.

## Images à téléverser (dossier `docs/store-assets/`, copiées aussi sur le PC dans `BESOINAVOCAT\MAGASINS-IMAGES`)

| Magasin | Icône | Bannière | Captures (au moins 4) |
|---|---|---|---|
| Samsung Galaxy Store | `samsung-galaxy-icon-512.png` | `samsung-galaxy-feature-1024x500.png` | `google-play/play-telephone-1080x1920-*` (4) |
| Huawei AppGallery | `huawei-icon-216.png` | — | `google-play/play-telephone-1080x1920-*` (4) |
| Amazon Fire | `amazon-icon-114.png` + `amazon-icon-512.png` | `amazon-firetv-banner-1280x720.png` | `screenshots/android-tablet-10-*` (4) |
| Apple | `apple-app-icon-1024.png` | — | `screenshots/apple-iphone-6.9-*` + `screenshots/apple-ipad-13-*` |

## 1. Samsung Galaxy Store

**Le propriétaire :**
1. Aller sur https://seller.samsungapps.com et cliquer sur **Sign Up Now**.
2. Se connecter avec un compte Samsung (en créer un avec takatak.ca@gmail.com au besoin).
3. Choisir un compte **Corporate** (entreprise) : Quadro Holdings Ltée, nom affiché « Groupe TAKATAK ».
4. Accepter les conditions. C'est gratuit.

**Claude ensuite :**
1. *Add New Application* › Android › BesoinAvocat.
2. Onglet *Binary* : téléverser l'`.apk`.
3. Onglet *App Information* : textes, icône, bannière, captures, catégorie, liens.
4. Onglet *Content Rating* : questionnaire, avec les mêmes réponses que Google.
5. Pays : tous. Prix : gratuit.
6. **Submit** seulement avec le oui du propriétaire.

## 2. Huawei AppGallery

**Le propriétaire :**
1. Aller sur https://developer.huawei.com/consumer/en/ › *Register*, puis *Identity verification* › **Enterprise**.
2. Fournir les documents : immatriculation de Quadro Holdings Ltée et pièce d'identité du responsable. C'est gratuit. La vérification prend 1 à 3 jours ouvrables.

**Claude ensuite :**
1. AppGallery Connect › *My apps* › *New app* › Android › BesoinAvocat.
2. Téléverser l'`.apk`, les textes et les images.
3. Remplir la classification, la confidentialité et les pays.
4. Soumettre seulement avec le oui du propriétaire.

## 3. Amazon (tablettes Fire et Fire TV)

**Le propriétaire :**
1. Aller sur https://developer.amazon.com/apps-and-games/console et se connecter avec un compte Amazon.
2. Créer le profil développeur au nom de Groupe TAKATAK. C'est gratuit.
3. Remplir l'*interview fiscale* (Canada).

**Claude ensuite :**
1. *Add New App* › Android › BesoinAvocat.
2. Téléverser l'`.apk` et choisir les appareils Fire.
3. Ajouter les textes, les images et la classification.
4. Soumettre seulement avec le oui du propriétaire.

La télé Fire se pilote à la télécommande, comme les autres télés (voir APPS-MAGASINS §7).

## 4. Apple (iPhone, iPad, Mac)

**Le propriétaire :**
1. Aller sur https://developer.apple.com/programs/enroll/ › **Organization**.
2. Donner le numéro D-U-N-S de Quadro Holdings Ltée, le même que pour Google Play.
3. Payer 99 $ US par an.
4. Utiliser un identifiant Apple avec la double authentification.

**Claude ensuite :**
1. Générer le projet iOS sur PWABuilder.
2. Le compiler sur un Mac, ou sur un exécuteur macOS de GitHub Actions avec le certificat du compte Apple.
3. L'envoyer dans App Store Connect et TestFlight.
4. Remplir « App Privacy » avec les mêmes réponses.

Rappel, règle 4.2 d'Apple : la fiche doit montrer ce que l'app fait de plus qu'un site Web. Ce sont le dépôt de pièces avec l'appareil photo, la visio, la dictée et les rendez-vous.

## Ce que Claude ne fait jamais seul

- Taper un mot de passe ou un code.
- Payer.
- Accepter des conditions ou une déclaration.
- Cliquer sur « Envoyer pour révision » ou « Submit » sans le oui du propriétaire.
