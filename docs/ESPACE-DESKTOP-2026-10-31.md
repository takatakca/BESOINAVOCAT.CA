# Espace de travail desktop — 31 octobre 2026

Signé **Juriste** (IA, Claude — session 013t9Lux), à la demande de Matt.

## Demande de Matt
Une vision « à la Teams » : propre, fluide, faite pour le Web. Le **mobile** de BesoinAvocat deviendra une **application** qui sert surtout à **téléverser** (une IA regardera le tout), mais **le vrai travail se fait sur le desktop**. Donc : travailler très fort le desktop, quelque chose hors de l'ordinaire, la technologie en avant.

## Ce qui est fait (écrans ≥ 1180 px, accueil connecté ou aperçu)
- **Barre d'applications à gauche** (style Teams) : icône + libellé toujours visibles, pastille active en dégradé, compteur de dossiers en badge. Elle ne s'élargit plus au survol.
- **Barre de commande** : recherche centrée, raccourci **Ctrl K / ⌘ K** depuis n'importe où, et une fine ligne de « signal » animée sous la barre.
- **Trois volets** :
  1. **Dossiers** (comme une liste de conversations) : pastille d'initiales colorée, filtre local, point « en direct » sur le dossier ouvert. **Alt ↑ / Alt ↓** passe d'un dossier à l'autre.
  2. **Scène du dossier** : en-tête, onglets (Aperçu, Pièces, Échanges, Rendez-vous, Temps, Recherche), rail d'instruments avec tiroir, **carte « Préparation du dossier »** (anneau = pièces ayant un contrôle visuel / total, et prochaine étape), file de travail, activité, intégrations.
  3. **Contexte** : le **guide-robot juge** avec « Demander au guide » (IA : bientôt), **Joindre un avocat** (Appeler · Téléphonie MIMT — à venir ; Équipe · appel de groupe — bientôt), **À venir** (rendez-vous des 30 prochains jours).
- **Ambiance** : aurore lumineuse lente en arrière-plan, volets en verre dépoli, lueur qui suit le pointeur sur les cartes, entrées en cascade. Tout s'arrête si l'appareil demande moins d'animations.
- **Téléphone et tablette** : inchangés (cockpit). Passer la largeur de 1180 px bascule sans recharger.

## Règles respectées
Aucun chiffre inventé (tout vient des données chargées). Aucune IA ni aucun appel simulés. Pas de localStorage. Pas d'attribut `style` (CSP `style-src 'self'`) : les variables CSS passent par le CSSOM. Aucun conseil juridique.

## Vérifications
- `node --test` plateforme : **277/277** (3 tests ajoutés : volets, filtre local, repli cockpit sans grand écran). Site : **12/12**.
- QA Chromium sur des données fictives à 1440 et 1920 px (connecté et aperçu) et à 390 px : aucun débordement horizontal, aucune erreur de console ou de CSP. Ctrl K, filtre, sélection d'un dossier (on reste sur l'accueil), fenêtre MIMT et onglet Pièces vérifiés. L'aurore est arrêtée en mouvement réduit.

## Suite proposée
Palette de commandes complète (Ctrl K avec actions), volet de conversation du dossier dans la scène, appels MIMT réels quand MIMT Connect sera actif, application mobile de capture (téléversement + IA de tri, avec consentement et Loi 25).
