# Raccordement du site public au parcours client — 18 novembre 2026

*Fil « Embarquer le client pilote de bout en bout ». Demande du propriétaire du 18 novembre 2026 : qu'un vrai client puisse s'inscrire depuis besoinavocat.ca, créer son tableau de bord et préparer son dossier.*

## 1. Constat (18 novembre 2026, 04:46 UTC)

| Où | État réel |
| --- | --- |
| `portail.besoinavocat.ca` | Tourne sur le code récent : `/api/health` répond `emailCodeConfigured:true`, `clientSignup:true`, `lawyerSpace`. L'écran d'accueil montre « Créer mon tableau de bord »; `/avocat` montre l'inscription avocat (14 jours gratuits); `/demande` montre la demande guidée. |
| `besoinavocat.ca` (WordPress chez MochaHost) | **Aucun lien vers le portail.** « TROUVER MON AVOCAT », « Trouver un avocat » et « Décrire mon besoin » mènent à `/demande/`, page qui n'affiche que 16 boutons de domaine renvoyant à des articles, lesquels renvoient à `/demande/` : la boucle décrite dans [WORDPRESS_CTA_INVENTORY.md](WORDPRESS_CTA_INVENTORY.md). « Tableau de bord ↗ » mène à `/tableau-de-bord/`, qui affiche « Portail en préparation · connexion non activée ». |
| `preview.besoinavocat.ca` (vitrine `www/`) | Les boutons d'appel à l'action pointent déjà sur `https://portail.besoinavocat.ca/demande` (`BA_REQUEST_URL`). Rien à changer. |

Conclusion : le portail est prêt à recevoir des inscriptions; c'est le site WordPress qui ne les y envoie pas.

## 2. Ce que ce lot ajoute au portail (branche `claude/project-thread-omm6q5`)

1. **La demande guidée mène au tableau de bord.** Sur `/demande`, après la réception de la demande (et aussi tant que la réception en ligne est fermée), un encadré « Prochaine étape : votre tableau de bord » propose **« Créer mon tableau de bord »**. Le lien emporte le domaine choisi (`?domaine=`) et le résumé saisi (`#resume=`, fragment que le navigateur ne transmet jamais au serveur). Rien d'autre ne voyage : ni coordonnées, ni autres parties, ni réponses.
2. **`/?signup=1` ouvre directement l'inscription** sur le portail (quand le code courriel est actif, sinon l'écran de connexion habituel). C'est le lien à donner au site public.
3. **Le premier dossier est pré-rempli.** Après le code courriel, le compte vide propose « Nouveau dossier » avec le domaine présélectionné et le résumé repris; la personne donne un titre et le dossier existe. Le résumé est effacé de la barre d'adresse dès sa lecture; aucun stockage navigateur, aucun cookie.
4. Vérifications : `platform/test/demande.test.mjs` (lien et contenu emporté), `platform/test/cockpit.test.mjs` (`?signup=1`, dossier pré-rempli, fragment effacé). Suite plateforme : 391/391.

## 3. Liens à changer sur WordPress (propriétaire ou Mike, administration Elementor)

Le dépôt ne contient pas le site WordPress en ligne; ces changements se font dans l'administration de besoinavocat.ca. Aucun visuel ne change, seulement la destination des liens.

| Élément WordPress | Aujourd'hui | À mettre |
| --- | --- | --- |
| Popup Elementor 1839, bouton « TROUVER MON AVOCAT » (347 pages) | `/demande` | `https://portail.besoinavocat.ca/demande` |
| Lien d'en-tête « Trouver un avocat » et lien de pied de page « Trouver un avocat » | `/demande` | `https://portail.besoinavocat.ca/demande` |
| Accueil : « TROUVER MON AVOCAT » (2 boutons) et « Décrire mon besoin ↗ » | `/demande` | `https://portail.besoinavocat.ca/demande` |
| Accueil et `/tableau-de-bord/` : « Tableau de bord ↗ », « Découvrir le projet ↗ », « Voir le tableau de bord ↗ » | `/tableau-de-bord/` | `https://portail.besoinavocat.ca/?signup=1` |
| `/tableau-de-bord/` : « Décrire mon besoin ↗ » | `/demande/` | `https://portail.besoinavocat.ca/demande` |
| Accueil, `/tableau-de-bord/`, `/professionnels/` : « Espace professionnels ↗ », « Consulter l'espace professionnels ↗ », « Devenir partenaire » | `/professionnels/` | `https://portail.besoinavocat.ca/avocat` (inscription avocat, 14 jours gratuits) |
| Boutons sans destination : « FIND MY LAWYER » (4), « Parler à un avocat rapidement » (2), « Contacte-nous » | vide ou `#` | `https://portail.besoinavocat.ca/demande` |

Textes à ajuster au même moment (D-035, confirmé le 14 novembre) : « Trouver un avocat » → « Préparer mon dossier » (popup 1839 et lien d'en-tête). Sur `/tableau-de-bord/`, retirer « Portail en préparation · connexion non activée » et « Souscription non ouverte » : l'inscription client est gratuite et ouverte; l'accès avocat est gratuit 14 jours sans carte (le paiement viendra plus tard, sur le compte Stripe ALKAO.CA, décision du 13 novembre).

Pour le lot `/demande/` des 16 domaines : chaque bouton de domaine peut pointer sur `https://portail.besoinavocat.ca/demande?domaine=<id>` pour arriver avec le domaine déjà choisi. Identifiants : `family`, `business`, `criminal`, `real-estate`, `immigration`, `administrative`, `liability`, `employment`, `civil`, `tax`, `housing`, `estates`, `rights`, `insolvency`, `municipal`, `other`.

## 4. Ce qui reste côté technicien (inchangé)

Voir [REMISE-INTEGRATIONS-2026-11-07.md §6](REMISE-INTEGRATIONS-2026-11-07.md) et [ESPACE-AVOCAT.md](ESPACE-AVOCAT.md) : le portail en ligne tourne maintenant sur le code récent et le code courriel est actif, mais l'autodéploiement reste éteint (chaque fusion demande un redéploiement manuel), et les clés d'intégrations, la clé de chiffrement et MIMT ne sont pas posés. Ce lot n'a besoin que d'un redéploiement de `main`.

## 5. Parcours à tester avec le dossier pilote (navigateur du propriétaire)

1. `besoinavocat.ca` → bouton → `portail.besoinavocat.ca/demande` : choisir le domaine, écrire le résumé, (envoyer ou non), « Créer mon tableau de bord ».
2. Nom, courriel, consentement → code reçu par courriel → tableau de bord créé → « Nouveau dossier » pré-rempli → titre → dossier créé.
3. Pièces : téléverser les documents du dossier pilote avec leur provenance; échéances; messages.
4. « Mon dossier est prêt » → le dossier est offert aux avocats du domaine.
5. `portail.besoinavocat.ca/avocat` avec une seconde adresse : inscription avocat (essai 14 jours), domaine de pratique coché → « Dossiers prêts à accepter » → « Accepter ce dossier » → le client voit « Dossier accepté » et le message dans le dossier.
6. Noter franchement, étape par étape, ce qui marche et ce qui ne marche pas (le courriel du code est la première chose à vérifier en vrai).
