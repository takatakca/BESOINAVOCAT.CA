# Inventaire des appels à l'action WordPress — 27 octobre 2026

Recensement demandé par le mandat (lot 2 : « recenser tous les boutons concernés de WordPress »). Lecture seule du site public : les 348 URL du plan `wp-sitemap-posts-page-1.xml` ont été téléchargées une à une (pause de 250 ms), sans compte, cookie de session ni soumission de formulaire. Aucune page, aucun réglage ni aucune entrée WordPress n'a été modifié. Les 348 réponses sont HTTP 200.

## Appels à l'action « avocat / demande »

| Texte | Cible | Occurrences | Nature |
|---|---|---|---|
| TROUVER MON AVOCAT | `/demande` | 678 (2 par page) | bouton orange du popup Elementor 1839, présent sur 347 pages (toutes sauf `/demande/`), et son double dans le même gabarit |
| Trouver un avocat | `/demande` | 346 | lien d'en-tête |
| Devenir partenaire | `/professionnels/` | 346 | lien d'en-tête |
| Consultation Téléphonique | `/consultations/` | 346 | lien de pied de page |
| Demande provision frais, Demande parrainage immigration, Demande de résidence permanente, Demande de citoyenneté canadienne, Demande d'asile au Canada, Demande introductive d'instance, Inscription et radiation d'une hypothèque légale, Consultation publique | articles éponymes | 346 chacun | liens éditoriaux du pied de page, pas des formulaires |
| FIND MY LAWYER | **aucune** (`href` vide) | 4 boutons | `/lawyer-tenancy-law/`, `/notice-of-lease-assignment/`, `/legal-adoption-quebec/` |
| Parler à un avocat rapidement | **aucune** | 2 boutons | `/consultations/` |
| Contacte-nous | `#` | 1 bouton | `/professionnels/` |
| Espace professionnels ↗, Décrire mon besoin ↗, Consulter l'espace professionnels ↗ | `/professionnels/`, `/demande/` | 1 à 3 | blocs ajoutés par le plugin sur l'accueil et l'aperçu |

## Constats

1. **Le parcours « Besoin d'un avocat » n'aboutit à aucune demande.** `/demande/` affiche « Quel domaine de droit concerne votre affaire ? » et 16 boutons (libellés d'origine conservés, dont « Famille et jeuneesse » et « Immobiler »). Chaque bouton ouvre un article de domaine (par exemple `/famille-et-jeunesse/` : « Répondez à quelques questions pour trouver un avocat répondant à vos besoins! »). Cet article ne contient **aucune question ni formulaire** : son seul bouton, « TROUVER MON AVOCAT », renvoie à `/demande`. Le parcours tourne en boucle; aucune requête POST n'est émise. Aucun client ne peut actuellement déposer de demande par le site.
2. **Seul formulaire du site : MetForm 405 sur `/professionnels/`**, candidature d'avocat. Champs : prénom, nom, téléphone, courriel, province du barreau, titre professionnel, et un champ caché. Bouton « OBTENIR DES NOUVEAUX CLIENTS », une promesse commerciale à revoir selon D-018. La destination des entrées (base MetForm, courriels de notification) n'est pas visible publiquement et reste à vérifier dans l'administration. Le chargement de la page envoie seulement un compteur de vue MetForm (`POST /wp-json/metform/v1/forms/views/405`). La page `/log-in/` contient un formulaire de connexion WordPress.
3. **Popup 1839 hors accueil** : sur les 346 autres pages, il garde son comportement d'origine. C'est un encart fixe en bas à droite, ouvert à 30 % de défilement, souvent derrière la bannière cookies sur mobile. Il prend le focus, garde Tab à l'intérieur, et Échap ne le ferme pas (`aria-modal="true"`). Contrôlé sur `/famille-et-jeunesse/` à 1440 et 375 px. Le correctif 0.2.2 ne s'applique qu'à l'accueil; la version suivante du plugin l'étend à toutes les pages sans déplacer l'encart.
4. Six boutons sans destination (FIND MY LAWYER ×4, Parler à un avocat rapidement ×2) et un « Contacte-nous » vers `#`.

## Raccordement prévu (BA-028), sous réserve de décision du propriétaire

- Une fois la réception réelle activée et contrôlée, faire aboutir les CTA « Trouver mon avocat », « Trouver un avocat », « Décrire mon besoin » et « FIND MY LAWYER » au même parcours guidé (page avec `[besoinavocat_intake]` ou modale du plugin). Conserver `/demande/` et les articles de domaine comme contenu informatif.
- Donner une destination réelle aux six boutons vides au même moment. Les pointer aujourd'hui vers `/demande` reproduirait la boucle.
- Décider du sort de MetForm 405 avant d'ouvrir le parcours avocat (lot 5), pour éviter deux circuits de candidatures.
- Aucun de ces changements n'est appliqué par ce recensement.
