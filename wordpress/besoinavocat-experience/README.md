# BesoinAvocat — Expérience WordPress

**Premier fichier à lire : [REPRISE-SUIVANTE-2026-10-26.md](../../docs/REPRISE-SUIVANTE-2026-10-26.md).** Fin de session : notes seulement, puis arrêt.

La **0.2.1 a été installée avec succès via l'interface WordPress**. La 0.2.0 avait été contrôlée visuellement pour les prix 100/300 CAD et les articles 2186/4663/5082/5715. La 0.2.1 remet le CTA orange dans le flux normal pour corriger sa superposition aux prix; ce bloc prix a été contrôlé sur le site réel le 27 octobre 2026, sans recouvrement de 320 à 1440 px.

**0.2.2 — préparée, pas encore installée.** Le CTA Elementor 1839 de l'accueil conservait son comportement modal : à l'ouverture (30 % de défilement), le focus sur son bouton faisait sauter la page jusqu'au pied de page, Tab/Maj+Tab restaient bloqués sur ce bouton et `aria-modal` restait présent. `assets/experience.js` neutralise ces seuls comportements pour ce popup; contenu, lien `/demande` et position inchangés. Contrôle : `node scripts/wordpress-cta-qa.mjs` depuis la racine du dépôt, après installation et purge des caches. Le funnel reste **désactivé**. Le plugin ne remplace ni le thème, ni Elementor, ni les 347 pages publiées.

CI du code `5a230e52c758a626f31be24abeef2cce5242b3c1` entièrement verte : 133 tests Node, 12 Python et trois suites PHP; [preuves](../../docs/PROJECT_STATUS.md). Le backend v1 reste à `identityConfigured: false`, v2 refusée par l'antivirus, sans contournement. Cette installation WordPress ne valide aucun accès aux dossiers.

## Périmètre hérité de la version 0.1.2 — historique conservé

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

La page avec shortcode est uniquement un **aperçu fictif**. Ses onglets sont navigables au clavier (flèches, Début, Fin). Cet aperçu ne crée aucun fichier, jeton ou connexion. Le nouveau parcours de contact 0.2.0 est distinct et reste fermé sans configuration explicite; il ne donne jamais accès aux dossiers.

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
./build-plugin.ps1 -Destination 'CHEMIN-ABSOLU/besoinavocat-experience-0.2.2.zip'
```

Le ZIP 0.2.2 a été produit sans PowerShell, avec la même liste de fichiers et les mêmes chemins d'entrée; son empreinte figure dans `docs/WORDPRESS_QA.md`. Le script refuse d’écraser un fichier, ne déploie rien et n’inclut que PHP, CSS, JS et ce document sous le répertoire attendu. Aucun PHP CLI n'était disponible localement; les trois suites PHP ont depuis réussi en CI. Les contrôles du code ne dispensent pas de vérifier visuellement la version réellement installée.

## Contrôle ciblé

Le script non empaqueté `checks/check-render.php` peut être lancé avec PHP 7.4+ sans WordPress. Un chemin vers la capture DOM peut être passé en argument pour contrôler les conteneurs réels. Il vérifie les limites des remplacements, les nœuds voisins, les noms de cabinets, l’idempotence et les fragments mal formés. Le PHP doit aussi être contrôlé dans l’environnement serveur cible avant activation.

## Compléments 0.1.2

- Alignement propre à chaque widget du hero : `align-self:flex-start` et marges latérales explicites pour éviter le centrage imposé par Elementor. Largeur52% sur ordinateur,100% mobile.
- Numéro officiel confirmé par le propriétaire :5148252825, lien `tel:+15148252825`, en header/footer et tableau de bord. Il s’agit d’un contact, pas d’un assistant IA actif.
- Quatre formulations exactes supplémentaires sont neutralisées uniquement sur l’accueil13 : tri automatique, mise en relation annoncée, augmentation des chances de gagner et promesse analogue du dernier paragraphe. Le lien FAQ est conservé.

- Sur la page professionnelle151 uniquement : six intitulés statistiques exacts deviennent les noms/statuts des offres ; l’introductionf99fdfe est neutralisée et le widget FAQ9f15bdf est remplacé par trois réponses « offres/prix en préparation, aucun abonnement activé ». Le formulaire existant reste hors de ces transformations.

## Parcours préparé en 0.2.0, inclus dans la 0.2.1 — désactivé

Les tarifs annoncés sont **100 CAD/semaine ou 300 CAD/mois** pour les avocats. Les crédits IA sont séparés et leur prix reste à définir. Les demandes clients restent gratuites. Aucun abonnement, débit, compte ou habilitation ne résulte de cet affichage.

`funnel.php` et ses deux assets apportent un parcours de contact FR/EN, avec étapes, récapitulatif, consentement et référence seulement après enregistrement par Node. La traduction porte sur ce parcours, pas sur les articles existants. Aucune description libre d’une affaire, pièce, notification ou paiement n’est collectée par ce module. Les montants et conditions applicables seront confirmés avant activation des abonnements.

- Le shortcode `[besoinavocat_intake]` permet une intégration explicite dans une page de préparation; `role="professional"` sélectionne le parcours avocat. Il ne remplace aucun contenu ou formulaire historique.
- La modale de l’accueil est **désactivée par défaut**. `BESOINAVOCAT_FUNNEL_ENABLED=true` permet de l’ajouter volontairement après contrôle; elle ne s’ouvre jamais automatiquement.
- Le destinataire est absent par défaut. Seule la constante serveur `BESOINAVOCAT_INTAKE_ENDPOINT=https://portail.besoinavocat.ca/api/intake` est admise par l’intégration. Un attribut de shortcode ne peut pas changer ce destinataire.
- Sans destinataire, l’interface explique que rien n’a été envoyé et propose le téléphone. Aucun succès fictif, aucune conservation des coordonnées dans le stockage du navigateur.
- L’API Node doit être installée, sa base de contact privée configurée et ses origines autorisées explicitement avant tout raccordement. Voir [INTAKE_API.md](../../docs/INTAKE_API.md). La file de contacts n’est pas encore un workflow d’attribution à un avocat.

**État réel :** le paquet Node v2 demeure refusé par MochaHost. Les nouveaux modules ne changent pas ce statut. Ne pas activer le parcours public pour masquer le blocage de connexion au dossier, ni remplacer le paquet v2 en attente de contrôle par une archive différente. Le formulaire MetForm historique reste à auditer avant le raccordement final pour éviter deux circuits de demandes.

Contrôles : `checks/check-render.php`, `checks/check-funnel.php` et `checks/check-integration.php` ont réussi en CI pour le rendu ciblé, l’échappement, le défaut fermé, l’intégration explicite et la conservation du contenu. Les 19 tests JavaScript du parcours complètent ces contrôles. L'activation du funnel nécessite encore la validation du backend et du circuit des demandes, puis une vérification sur le vrai WordPress.

Les intitulés et phrases promotionnelles ciblés des articles 2186, 4663, 5009, 5082 et 5715 ont été neutralisés au rendu en 0.2.0. Les articles **2186, 4663, 5082 et 5715** ont ensuite été contrôlés visuellement. Les noms cités, informations de fond, liens et références sont conservés; aucune suppression globale de mot-clé n'est appliquée. Voir [INTAKE_QA.md](../../docs/INTAKE_QA.md) et [WORDPRESS_QA.md](../../docs/WORDPRESS_QA.md).
