# Espace de travail du portail (D-029, 29 octobre 2026)

Ce guide décrit l'espace de travail premium du portail (`platform/public/`). Il s'adresse au propriétaire, à son développeur et aux agents. Tout se passe dans le navigateur, sous la CSP stricte du portail. Chaque fichier créé devient une pièce du dossier, avec sa provenance.

## Ce que voit la personne

### Pièces du dossier
- Les pièces s'affichent en **tuiles**, avec la miniature des photos, ou en **liste**; le bouton « Tuiles / Liste » passe de l'une à l'autre.
- Un clic ouvre la pièce dans la visionneuse.
- Petites actions sur chaque tuile :
  - Provenance;
  - Annoter, pour une image;
  - Modifier, pour un document Word ou texte;
  - Télécharger.
- **Glisser-déposer** jusqu'à 20 fichiers à la fois, ou « choisissez-les ».
  - Les fichiers partent un par un (le serveur n'en accepte qu'un à la fois), avec un nouvel essai si le serveur répond « occupé ».
  - Chaque fichier ajouté ainsi devient une pièce « source ou copie », marquée « à vérifier », avec la mention « provenance à préciser ».
  - Pour une provenance détaillée, utiliser « Ajouter avec provenance ».
- **Barre d'actions** : Téléverser, Document vierge, Tableau à dessin, Message vidéo.

### Visionneuse
- Trois tailles :
  - **plein écran**;
  - **un tiers de l'écran**, la page restant utilisable à gauche;
  - **petite fenêtre en coin**.
- La taille choisie est retenue jusqu'au rechargement de la page. Le portail ne garde rien dans le navigateur.
- Formats affichés :
  - photos JPEG, PNG et WebP;
  - vidéo et audio;
  - PDF (lecteur du navigateur, après vérification de l'en-tête `%PDF`);
  - texte;
  - Word `.docx`, avec titres, listes, gras, italique et souligné.
- Pour les autres formats (TIFF, Excel, `.doc`, PowerPoint), il faut télécharger le fichier.
- La touche Échap ferme la visionneuse. Si une modification n'est pas enregistrée, une confirmation est demandée.

### Appeler mon avocat
- La carte « Votre avocat » (ou « La personne cliente » pour l'avocat) porte un bouton vert **Appeler**.
- Si une réunion Zoom est prévue pour le dossier, le bouton propose de la rejoindre.
- Sinon, il ouvre une **demande de rappel** :
  - moment souhaité;
  - numéro facultatif;
  - sujet facultatif.
  La demande est ajoutée aux échanges du dossier. **Le portail ne compose aucun numéro lui-même** : la téléphonie reste à connecter (Twilio, BA-036).
- Sous le bouton :
  - « Messages vidéo », avec un bouton d'enregistrement;
  - la liste des vidéos et messages vocaux du dossier. Un clic sur l'un d'eux l'ouvre dans la visionneuse, en tiers ou en coin.

### Message vidéo
- La caméra et le micro s'allument seulement après le clic « Activer la caméra et le micro ». Option : message vocal seulement.
- Durée : 5 minutes au plus (arrêt automatique), à environ 1 Mb/s.
- Avant l'envoi, on peut revoir l'enregistrement ou recommencer.
- Le message est versé comme pièce « Déclaration », au format WebM (ou MP4 sur Safari). Il n'est ni transcrit ni analysé.

### Document vierge et modification (format Word)
- Éditeur façon Word :
  - Paragraphe, Titre 1, Titre 2;
  - gras, italique, souligné;
  - listes à puces et numérotées;
  - annuler et rétablir.
- Un texte collé perd sa mise en forme d'origine : aucun style, image ou lien étranger n'entre dans le document.
- « Enregistrer dans le dossier » produit un vrai `.docx`, lisible par Word, LibreOffice et python-docx.
  - Modifier un document existant enregistre une **nouvelle version**; l'original reste au dossier.
  - Le texte est aussi envoyé comme texte extrait, pour que la recherche le retrouve. Il reste marqué « à vérifier ».
- « Télécharger .docx » garde une copie locale sans rien envoyer.

### Tableau à dessin et annotation d'image
- Outils :
  - crayon, surligneur, gomme (la gomme n'efface que les annotations, jamais la photo);
  - ligne, flèche, cadre, texte;
  - **repère numéroté**;
  - **masquer une zone** (flou en mosaïque, pour un visage, une plaque ou un renseignement personnel);
  - recadrer, pivoter;
  - luminosité et contraste;
  - sept couleurs, épaisseur, annuler et rétablir.
- Chaque repère reçoit un libellé, par exemple « 1 — J'étais ici », « 2 — Je suis tombé ici ». La légende peut être ajoutée sous l'image enregistrée.
- Une annotation devient une **nouvelle pièce « Analyse »** : la photo d'origine n'est jamais modifiée. La légende est enregistrée comme texte extrait, donc trouvable par la recherche.

### Présentation
- Le bouton « Présentation » (page Pièces) crée un fichier **PowerPoint `.pptx`** à partir des images choisies :
  - une page de titre;
  - une diapositive par image, avec sa légende de repères ou sa provenance.
- Le fichier est enregistré au dossier (pièce « Analyse ») et téléchargé.

### Mobile
- Bouton menu en haut à gauche (tiroir de navigation).
- Barre du bas : Dossiers, Pièces, Échanges, Rendez-vous, Plus.
- **Glisser à gauche ou à droite** sur la page passe à la section suivante ou précédente. Le geste est ignoré dans les champs, les tableaux, le dessin et la vidéo.

## IA et services payants
Les boutons « IA · à connecter » (libellés proposés, mise en page assistée) sont **désactivés** : aucune donnée n'est envoyée à un service d'IA. Les brancher demande :
- un fournisseur choisi par le propriétaire;
- une évaluation des facteurs relatifs à la vie privée (Loi 25), avant tout envoi hors Québec;
- la facturation à l'heure annoncée par le propriétaire, avec prix, taxes et conditions approuvés (D-025).

Les éditeurs photo en ligne gratuits (Photopea, retrait d'arrière-plan, etc.) recevraient les pièces du dossier : ne pas les brancher sans la même évaluation.

## Sécurité et vie privée
- CSP :
  - `script-src 'self'` et `style-src 'self'` sont inchangés;
  - sont ajoutés `media-src 'self' blob:` et `frame-src blob:`, pour lire les vidéos et les PDF du dossier à partir de leurs propres octets;
  - aucune ressource d'une autre origine.
- Caméra et micro : permis sur la page du portail seulement (`Permissions-Policy`); refusés sur `/demande`.
- Types acceptés en plus : `video/webm`, `video/mp4`, `audio/webm`, `audio/mp4`, `audio/mpeg` et PowerPoint `.pptx`. HTML et SVG restent refusés.
- Chaque fichier créé dans un outil est enregistré dans le dossier **ouvert au moment où l'outil a été ouvert**. Si le dossier change entre-temps, l'enregistrement est refusé.
- Rien n'est gardé dans le navigateur (aucun `localStorage`), et `workspace.js` n'appelle jamais le réseau lui-même.

## Fichiers
- `platform/public/workspace.js` : visionneuse, enregistreur, éditeur et écriture `.docx`, tableau à dessin, écriture `.pptx`, ZIP sans dépendance (CRC32), navigation mobile.
- `platform/public/app.js` : tuiles, glisser-déposer et file d'envoi, carte d'appel, demande de rappel, pont vers `workspace.js`.
- `platform/public/styles.css` : système visuel complet.
- `platform/public/index.html` : bouton menu, barre du bas, voile du tiroir; `workspace.js` est chargé avant `app.js`.
- `platform/server.mjs` : route `/workspace.js`, CSP et permissions.
- `platform/lib/validation.mjs` : types de fichiers.
- `platform/deploy/build_bundle.py` : `workspace.js` ajouté à l'archive MochaHost.
- Tests : `platform/test/workspace-premium.test.mjs` (8 tests) et `platform/test/workspace-media.test.mjs`.

## Preuves (29 octobre 2026)
- Tests :
  - portail : 242 sur 242;
  - site : 12 sur 12;
  - archive MochaHost : test Python réussi;
  - quatre défauts injectés volontairement, chacun détecté (envois en parallèle, absence de nouvel essai après 429, enregistrement vers un autre dossier, listes numérotées sans redémarrage).
- QA Chromium sur le vrai serveur, avec identité et fichiers fictifs, sur ordinateur (1440 px) et mobile (390 px) :
  - tuiles et miniatures;
  - visionneuse dans ses trois tailles;
  - PDF (Chromium complet) et Word;
  - modification enregistrée en version 2;
  - annotation avec deux repères, flèche et masque;
  - dessin;
  - demande de rappel visible dans les échanges;
  - message vidéo avec caméra simulée, puis lecture au tiers;
  - présentation téléchargée;
  - tiroir et glissement mobile.
  Résultat : aucune erreur de console ni de CSP, aucun débordement horizontal sur mobile, audit axe WCAG A/AA sans violation.
- Les `.docx` et `.pptx` produits ont été ouverts par python-docx, python-pptx et LibreOffice (rendu PDF contrôlé).
- Limites :
  - l'éditeur utilise `execCommand` du navigateur, ancien mais pris en charge partout;
  - la QA Chromium n'est pas un test sur un vrai iPhone ou Android, ni avec un lecteur d'écran;
  - le microphone et la caméra physiques restent à essayer par le propriétaire.

## Mise en ligne
Voir [DEPLOYMENT](DEPLOYMENT.md). Après la fusion dans `main`, le portail Coolify doit être redéployé :
- soit par le bouton **Redeploy** de l'application portail dans Coolify;
- soit en activant le déploiement automatique (liste de KLEAN, PR 6).

Contrôle après déploiement :
- `/workspace.js` répond 200;
- la page Pièces montre les tuiles;
- l'en-tête `Content-Security-Policy` contient `media-src 'self' blob:`.
