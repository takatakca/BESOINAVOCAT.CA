# BesoinAvocat — Expérience WordPress

Plugin préparé pour revue, **non activé par son auteur**. Il ne remplace ni le thème, ni Elementor, ni les 347 pages publiées.

## Périmètre de la version 0.1.2

- Habillage complet limité à l’accueil Elementor 13 et à l’aperçu du tableau de bord. Un CSS/JS commun léger ajoute les liens de politiques et le libellé « Espace professionnels » sur les autres pages.
- Aucun contenu WordPress, donnée Elementor, compte ou option n’est écrit. Les 347 pages et les originaux restent en base et dans l’export conservé par l’opérateur.
- Au rendu serveur seulement, les formulations exactes observées promettant un réseau de 800 avocats sont remplacées par une présentation neutre. Deux widgets commerciaux précis des pages 5009/5030 sont remplacés au rendu après correspondance de leur texte complet. Les autres usages du nombre 800 ou du mot partenaire ne sont pas visés.
- Les deux conteneurs identifiés de l’accueil (note 4.6 / 839 Google Reviews, puis témoignages) sont retirés du HTML public et remplacés par une note neutre. Ils ne sont jamais réattribués à BesoinAvocat. Les données originales restent en base.
- Les six articles 2186, 4663, 5009, 5082, 5595, 5715 gardent leurs noms de cabinets avec une note explicite de non-partenariat. La recommandation précise « vous conseille les trois cabinets suivants » de 5715 et le titre anglais de 827 sont neutralisés.
- Cinq phrases récurrentes exactes promettant une mise en contact avec « nos avocats partenaires » sont neutralisées dans les nœuds texte (18 champs identifiés, y compris deux variantes à espace insécable). Les balises, attributs, scripts et liens adjacents restent inchangés.
- Aucun nom de cabinet n’est remplacé par celui d’un autre professionnel. Aucun compte, profil vérifié, disponibilité ou partenariat n’est inventé.
- Offre client toujours gratuite, sans condition d’engagement ; honoraires de l’avocat et options payantes distincts. Offres professionnelles, portail et téléphone IA en préparation. Aucun dépôt, abonnement, appel, enregistrement ou paiement activé.
- Les articles historiques comportent d’autres textes éditoriaux qui nécessitent une revue propre : cette transformation ciblée n’est pas un audit juridique exhaustif des 347 pages.

## Installation par l’opérateur, après revue

1. Conserver l’export WordPress et une sauvegarde complète fichiers/base avant activation.
2. Installer le dossier `besoinavocat-experience` comme plugin ordinaire, ou utiliser le ZIP produit par le script ci-dessous.
3. Créer séparément une page publiée avec le slug `tableau-de-bord` et le shortcode `[besoinavocat_dashboard]`. Le plugin ne crée ni page ni compte. Tant que cette page n’existe pas, les liens d’accueil pointent vers la section d’aperçu sur l’accueil.
4. Contrôler l’accueil avec les vrais CSS Elementor, sur ordinateur et mobile ; vérifier le retrait des avis non vérifiés et le maintien des textes hors cibles, illustrations, domaines et régions.
5. Vérifier les liens `/demande/`, `/professionnels/`, `/faq/` ainsi que les trois politiques. Le chemin `/demande/` mène au parcours existant, pas à un nouveau dépôt de pièces. `/professionnels/` mène à une page de candidature, pas à la création instantanée d’un compte.
6. Purger les caches Elementor et SpeedyCache après activation : un cache HTML déjà servi sans exécuter WordPress ne peut pas être corrigé par un filtre PHP. Aucun changement de base n’est exécuté par ce plugin.

La page avec shortcode est uniquement un **aperçu fictif**. Ses onglets sont navigables au clavier (flèches, Début, Fin). Aucun formulaire, fichier à sélectionner, jeton, connexion ou requête réseau n’est créé par le JavaScript. La connexion TAKATAK et toute URL d’API restent hors de ce plugin en attendant un contrat réel.

## Réversibilité

Désactiver le plugin retire les fichiers CSS/JS et les ajouts rendus par `the_content`. Les données Elementor et les contenus WordPress n’ont jamais été modifiés. Les traductions et liens ajoutés au DOM disparaissent au rechargement. La nouvelle page de tableau de bord, si créée par l’opérateur, reste une page indépendante ; retirer son shortcode ou repasser cette page en brouillon pour supprimer cet aperçu. Purger les caches éventuels après désactivation.

Le JavaScript déplace uniquement les **nouveaux** blocs du plugin. Sans JavaScript, ils restent à la fin du contenu de l’accueil. Les corrections explicites ci-dessus sont appliquées côté serveur, y compris sans JavaScript. Les contenus hors cibles ne sont pas raccourcis ni mis dans des accordéons fermés. Les listes de domaines et régions du footer demeurent visibles et accessibles.

## Sources de la structure

- Capture DOM : `accueil-dom-avant.html`, acquise le 26 octobre 2026.
- Export WordPress du 26 octobre 2026 : 347 pages publiées, accueil 13 ; SHA-256 `22d660865b220ec52e4a1cef2b65598e8e3baee9c77f6e29050f49dce9268b79`.
- Politiques publiées dans cet export : 5773 `conditions-dutilisation-des-justiciables`, 5774 `conditions-dutilisation-des-professionnels`, 5784 `politique-de-confidentialite`.

Ces références documentent les sélecteurs et destinations ; elles ne valident pas les affirmations commerciales ou juridiques des textes historiques. Une évolution des IDs Elementor peut nécessiter un ajustement de présentation ; les nouveaux blocs restent lisibles en fin de page si les sélecteurs ne correspondent plus.

## ZIP

Depuis PowerShell :

```powershell
./build-plugin.ps1 -Destination 'CHEMIN-ABSOLU/besoinavocat-experience-0.1.2.zip'
```

Le script refuse d’écraser un fichier. Il ne déploie rien et n’inclut que PHP, CSS, JS et ce document, sous le répertoire racine attendu par WordPress. Tester le PHP dans l’environnement cible avant activation : aucun exécutable PHP local n’était disponible lors de la préparation initiale.

## Contrôle ciblé

Le script non empaqueté `checks/check-render.php` peut être lancé avec PHP 7.4+ sans WordPress. Un chemin vers la capture DOM peut être passé en argument pour contrôler les conteneurs réels. Il vérifie les limites des remplacements, les nœuds voisins, les noms de cabinets, l’idempotence et les fragments mal formés. Le PHP doit aussi être contrôlé dans l’environnement serveur cible avant activation.

## Compléments 0.1.2

- Alignement propre à chaque widget du hero : `align-self:flex-start` et marges latérales explicites pour éviter le centrage imposé par Elementor. Largeur52% sur ordinateur,100% mobile.
- Numéro officiel confirmé par le propriétaire :5148252825, lien `tel:+15148252825`, en header/footer et tableau de bord. Il s’agit d’un contact, pas d’un assistant IA actif.
- Quatre formulations exactes supplémentaires sont neutralisées uniquement sur l’accueil13 : tri automatique, mise en relation annoncée, augmentation des chances de gagner et promesse analogue du dernier paragraphe. Le lien FAQ est conservé.

- Sur la page professionnelle151 uniquement : six intitulés statistiques exacts deviennent les noms/statuts des offres ; l’introductionf99fdfe est neutralisée et le widget FAQ9f15bdf est remplacé par trois réponses « offres/prix en préparation, aucun abonnement activé ». Le formulaire existant reste hors de ces transformations.
