# Application native BesoinAvocat (iOS + Android)

Vraie application native, écrite en **React Native avec Expo** (SDK 57). Chaque écran est un écran de téléphone
natif : navigation, gestes, appareil photo, Face ID ou empreinte, partage du système. Ce n'est pas le site dans une
boîte (la version PWABuilder actuelle des magasins). Une seule base de code donne l'app iPhone et l'app Android.

- Nom de paquet Android et identifiant iOS : `ca.besoinavocat.portail` (le même que la version des magasins, pour la
  remplacer par une mise à jour).
- Version : `2.0.0`, code de version Android `100` (plus haut que celui de PWABuilder).
- Aucune mention de TAKATAK dans l'app (règle de séparation des marques).

## Ce que fait l'app

| Écran | Contenu |
|---|---|
| Accueil | Salutation, dossier en cours avec ses 4 étapes de préparation, échéances à venir, dernier échange, forfait et espace utilisé |
| Dossiers | Liste filtrée (en préparation, prêts, acceptés), création d'un dossier (titre, domaine, situation) |
| Dossier | Aperçu, pièces (photo, image, fichier ; ouverture et partage), échanges, pièces demandées, échéances, rendez-vous |
| Préparer | Domaine de droit, résumé, « Mon dossier est prêt » ou retour en préparation |
| Pièce demandée | Répondre à l'avocat avec une photo ou un fichier et une note |
| À accepter (avocats) | Dossiers prêts de leurs domaines (résumé seulement), bouton « Accepter » |
| Échéances | Toutes les dates des 90 prochains jours, par mois |
| Recherche | Recherche dans les pièces de tous les dossiers |
| Forfaits | Grille A, forfait actuel, espace utilisé |
| Mon compte | Verrouillage Face ID / empreinte, aide, confidentialité, conditions, déconnexion, suppression du compte |

Connexion et inscription : par **code reçu par courriel**, exactement comme le portail. L'app parle au même serveur
(`https://portail.besoinavocat.ca`, `platform/server.mjs`) et aux mêmes comptes. **Aucun changement du serveur** :
l'app garde le témoin de session du portail dans le coffre sécurisé du téléphone (Keychain / Keystore) et envoie les
en-têtes `Origin` et `X-Requested-With` que le portail exige pour toute modification.

Paiement : l'app affiche les forfaits mais n'encaisse rien. Les règles d'Apple et de Google interdisent un paiement
par carte pour un abonnement numérique dans l'app ; le changement de forfait se fait sur le portail Web.

## Construire l'app (gratuit, sur GitHub)

Le flux `.github/workflows/mobile.yml` tourne à chaque modification de `mobile/` :

1. vérification des types, tests et paquet JavaScript ;
2. **Android** : `BesoinAvocat-native-test.apk` (à installer sur un téléphone pour tester) et
   `BesoinAvocat-native-unsigned-for-play.aab` (format Google Play) — dans les « Artifacts » de l'exécution ;
3. **iOS** : compilation pour le simulateur d'iPhone (prouve que l'app iPhone compile, sans compte Apple).

Les fichiers Android du flux sont signés avec la clé de test publique d'Android : bons pour essayer, **pas pour Google
Play**.

## Publier sur Google Play (plus tard, après les soumissions en cours)

La clé de téléversement Google Play reste **sur le PC du propriétaire** (fichier PWABuilder) et ne va jamais sur
GitHub ni sur Drive. Pour publier, sur le PC (ou par Colombo) :

```sh
# une fois : Java 17 installé (il fournit jarsigner)
jarsigner -keystore signing.keystore -signedjar BesoinAvocat-2.0.0.aab \
  BesoinAvocat-native-unsigned-for-play.aab my-key-alias
```

Le nom d'alias et le mot de passe sont dans le fichier `signing-key-info.txt` du ZIP PWABuilder, sur le PC. Ensuite,
téléverser `BesoinAvocat-2.0.0.aab` comme nouvelle version de l'app existante dans la Play Console.

## Apple (en dernier)

Le code iPhone est prêt. Il faut le compte Apple Developer (99 $ US par an, décision du propriétaire), puis une
signature Apple pour TestFlight et l'App Store.

## Développer

```sh
cd mobile
npm ci
npx expo start          # aperçu sur un téléphone avec un build de développement
npx tsc --noEmit        # types
npm test                # tests de logique
python3 scripts/make-icons.py   # redessine les icônes
```

Les dossiers `ios/` et `android/` sont générés (`npx expo prebuild`) et ne sont pas versionnés.
