# Contrôle WordPress — 26 octobre 2026

**Version vérifiée : BesoinAvocat — Expérience 0.1.2, installée et active sur https://besoinavocat.ca.** WordPress sert la vitrine et l'aperçu du tableau de bord; le vrai backend Node et sa connexion TAKATAK ne sont pas déployés par ce plugin.

Les observations de serveur et de navigateur ci-dessous proviennent des contrôles directs de l'agent principal. La revue indépendante a porté sur les sources PHP/JS/CSS, le WXR conservé, les limites des transformations et la concordance du ZIP. Elle ne prétend pas avoir reproduit le contrôle visuel dans un second navigateur.

## Paquet et contrôles serveur

- ZIP final : **25 980 octets**, huit fichiers de code/documentation, identiques aux sources relues.
- SHA-256 : `616175937eb3ba05be4aa427e64db0773b9568d0f4bb022981218327a5ea41d8`, vérifié localement puis sur le serveur.
- Trois contrôles de syntaxe PHP réussis : plugin principal, `render-integrity.php`, `render-rules.php`.
- `checks/check-render.php` exécuté avec succès sur le serveur. Ce contrôle autonome est hors du ZIP et n'est pas chargé par WordPress.
- Une action de purge SpeedyCache a été exécutée lors de l'activation du nouvel habillage. Les résultats de navigateur portent sur les pages effectivement servies, pas seulement sur l'existence de fichiers installés.

## Contrôles de l'interface réelle

| Élément | Résultat constaté | Limite |
|---|---|---|
| Bandeau d'accueil | Chevauchement résolu en 0.1.2 : les quatre widgets sont à x=78, largeur 570 px; la carte commence à x=836 | Mesure à une largeur de navigateur de 1 265 px |
| Débordement horizontal | Aucun à 1 265 px sur l'accueil et l'aperçu | Pas une validation de toutes les tailles mobiles |
| Contact | 514 825-2825 présent et correct dans header/footer, lien `tel:+15148252825` | Aucun service téléphonique automatisé ou numéro payant activé |
| Accueil | Mentions ciblées 800/839 absentes, footer et liens conservés | Les autres textes historiques n'ont pas tous fait l'objet d'une revue éditoriale |
| Aperçu `/tableau-de-bord/` | Page 5820 publiée, accessible depuis le bouton de l'accueil; trois onglets fonctionnels | Données fictives, aucune connexion ou collecte de dossier |
| Clavier et console | Touche Début et changement d'onglet contrôlés; zéro erreur ou alerte console observée | Ni audit WCAG complet ni contrôle avec lecteur d'écran |
| Politiques | Les trois liens pointent vers les pages prévues | Pas une validation juridique de leur contenu |
| Articles 2186, 4663, 5009, 5082, 5595, 5715 | Une note de non-partenariat par page; formulations 800 absentes; recommandation Thetford remplacée | Noms de cabinets conservés comme citations, sans partenariat prétendu |
| Page professionnels 151 | Page publique rechargée en 0.1.2 : trois offres et conditions à définir, introduction indiquant les fonctions en préparation et l'absence de réseau ou abonnement activé; FAQ à trois blocs sans rendement ou nombre de références promis; téléphone correct dans header/footer | Les autres slogans historiques des blocs non ciblés restent présents; il ne s'agit pas d'un audit éditorial exhaustif |

## Revue indépendante des transformations

Les changements sont appliqués au rendu et n'écrivent ni le contenu WordPress ni les données Elementor. Les deux blocs d'avis de l'accueil sont identifiés par leurs `data-id` précis; le scanner suit leurs fermetures imbriquées et ignore commentaires, scripts et styles. Un fragment incomplet reste inchangé. Les textes et liens voisins restent en dehors de la suppression.

Les deux widgets commerciaux des pages 5009/5030 correspondent exactement aux champs `editor` de l'export. Les cinq règles de phrases récurrentes et leurs variantes correspondent à **18 champs** retrouvés dans les nœuds texte par un contrôle indépendant. Les quatre nouvelles phrases de l'accueil sont également présentes dans le WXR; la phrase suivie du lien FAQ est corrigée sans retirer ce lien. Les six libellés de la page professionnels et son introduction correspondent après la normalisation prévue; la FAQ ciblée est bien l'accordéon à huit entrées.

Un défaut de portée a été identifié et corrigé avant activation : le filtre Elementor peut traiter les templates header/footer séparément. L'ajout des notes est désormais conditionné par le `data-elementor-id` du document interrogé, et un cas de contrôle protège le header 604 contre un ajout intempestif sur une page d'article.

Le ZIP ne contient ni test, export, sauvegarde, dossier juridique, secret ou configuration d'identité. Les contrôles JavaScript ont réussi. Aucun nouveau profil professionnel, avis, mandat, compte, paiement ou abonnement n'est créé par le plugin.

## Préservation et limites restantes

La sauvegarde privée de la base et le WXR précèdent les modifications; leurs détails figurent dans [DEPLOYMENT.md](DEPLOYMENT.md). Les corrections JuriGo en base, les réglages généraux et la création de la page d'aperçu sont des opérations distinctes du plugin. Désactiver celui-ci retire son rendu mais n'annule pas ces opérations en base.

Restent à effectuer : contrôle mobile sur plusieurs largeurs et appareils, lecteur d'écran, revue éditoriale au-delà des expressions ciblées, puis contrôles propres au futur portail Node. Le résultat local des 49 tests Node ne remplace pas ces validations WordPress ou le démarrage Passenger réel. Aucun plugin WordPress de gestion du corpus privé ne doit être installé : la séparation vitrine WordPress/backend Node a été réaffirmée par le propriétaire.
