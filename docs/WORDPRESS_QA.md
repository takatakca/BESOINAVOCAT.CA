# Contrôle WordPress — 26 octobre 2026

**Premier fichier à lire : [REPRISE-SUIVANTE-2026-10-26.md](REPRISE-SUIVANTE-2026-10-26.md).** Fin de session : notes seulement, puis arrêt.

## 0.2.2 installée et contrôlée — 27 octobre 2026

Installation par une session Claude du navigateur, pour le propriétaire : Extensions › Téléverser › « Remplacer », message « Plugin updated successfully ». ZIP utilisé : copie Google Drive `1bKgBZfw7RUnA83ZbI15Cs0may_py70nQ`, SHA-256 `78e659673ee82efb6ed60d4f5ca8119835bdf33765131457f76737e727eb53ac` vérifié avant installation. Caches vidés : SpeedyCache « Delete Cache and Minified », Elementor « Clear Files & Data ».

**Preuve officielle, 27 octobre vers 04 h 13 UTC** : `node scripts/wordpress-cta-qa.mjs` sans option sur le site réel, **24 contrôles réussis sur 24** à 1440 et 375 px. Version servie 0.2.2; prix présents et non recouverts; ouverture du CTA sans saut (2 752 → 2 752 px, 5 002 → 5 002 px); focus non déplacé; plus de `aria-modal`; Tab et Maj+Tab quittent le bouton; lien `/demande` conservé; aucune erreur JavaScript. `experience.js` servi en `?ver=0.2.2` est identique à celui du commit `1464640` (SHA-256 `e22b07180da3733906b70acb5dcf9b99b690d1556e809e54b89f85a86f1f3100`).

Limite : ce correctif ne vise que l'accueil. Sur les 346 autres pages, le popup 1839 garde son piège clavier d'origine ([inventaire](WORDPRESS_CTA_INVENTORY.md)); la version suivante du plugin déplace le correctif dans `common.js`.

## Contrôle du 27 octobre 2026 — 0.2.1 réelle, 0.2.2 préparée

Contrôle Chromium du site réel, lecture seule, vers 03 h UTC :

| Contrôle | 0.2.1 installée | 0.2.2 injectée dans le navigateur de test |
|---|---|---|
| Version servie | 0.2.1 | 0.2.1 sur le serveur; seul `experience.js` remplacé localement |
| Prix 100 $ CA / 300 $ CA / crédits IA, 1440-1265-768-375-320 px | lisibles, non recouverts, sans débordement horizontal | identique |
| Ouverture du CTA 1839 à 30 % de défilement | **saut en fin de page** : 2 750 → 9 433 px (1440), 5 000 → 16 613 px (375) | aucune variation : 2 752 → 2 752 et 5 000 → 5 000 px |
| Focus à l'ouverture | déplacé sur « Trouver mon avocat » | inchangé |
| Tab / Maj+Tab depuis le bouton | **bloqués sur le bouton** (Échap et fermeture désactivés) | quittent le bouton normalement |
| `aria-modal` sur le conteneur dans le flux | `true` | retiré |
| Lien du CTA | `https://besoinavocat.ca/demande` | identique |
| Erreurs JavaScript | aucune | aucune |

Cause, lue dans Elementor Pro 3.32.1 : `showModal` appelle `handleKeyboardA11y`, qui fait `focus()` sur le premier élément après 250 ms et ajoute un gestionnaire `keydown` sur `window` qui reboucle Tab sur le premier/dernier élément. Le correctif 0.2.2 rend `focus()` inopérant pour les éléments de ce popup seulement, arrête la propagation de Tab vers ce gestionnaire quand le focus est dans le popup, et retire `aria-modal` et `tabindex` du conteneur. Aucune autre page ni aucun autre popup n'est visé.

- ZIP : `besoinavocat-experience-0.2.2.zip`, **47 635 octets**, SHA-256 `78e659673ee82efb6ed60d4f5ca8119835bdf33765131457f76737e727eb53ac`. Onze entrées, mêmes fichiers et chemins que `build-plugin.ps1`, relues contre les sources. Produit sous `wordpress/dist/` (ignoré par Git), hors du dépôt public.
- Contrôles locaux : `php -l` des quatre fichiers PHP et les trois suites `checks/*.php` réussis (PHP 8.3.6 disponible dans cette session); 31 tests Node site/funnel réussis; `node --check` des trois assets.
- Script reproductible : `node scripts/wordpress-cta-qa.mjs` (10 échecs sur la 0.2.1 installée) et `--inject-experience wordpress/besoinavocat-experience/assets/experience.js` (tous réussis).

Installation, purge des caches et contrôle officiel faits ensuite : voir la section « 0.2.2 installée et contrôlée » ci-dessus. Le lecteur d'écran réel n'a pas été testé.

## État au 26 octobre — 0.2.1 installée, contrôle final alors ouvert

**BesoinAvocat — Expérience 0.2.1 a été installé avec succès via l'interface WordPress.** La 0.2.0 avait été contrôlée visuellement pour les tarifs **100 CAD/semaine et 300 CAD/mois** et les corrections des articles **2186, 4663, 5082 et 5715**. Un CTA orange se superposait aux prix; la 0.2.1 le remet dans le flux normal par CSS. **Le contrôle visuel final du bloc prix 0.2.1 RESTE À FAIRE.** Le succès d'installation n'est pas cette validation visuelle.

Le **funnel reste désactivé**. WordPress sert la vitrine et l'aperçu; le portail Node v1 répond toujours avec `identityConfigured: false` et la v2 reste bloquée par l'antivirus, sans contournement. Aucun accès réel au corpus, abonnement ou paiement n'est validé.

Le code `5a230e52c758a626f31be24abeef2cce5242b3c1` a ses quatre runs CI verts : Quality 40421216083, Platform PR 40421216013, Browser 40421215940 et Platform push 40421210422. **133 tests Node, 12 Python et trois suites PHP réussis**; liens dans [PROJECT_STATUS](PROJECT_STATUS.md). Browser QA concerne le site Render; les tests de code ne couvrent pas le rendu réel du bloc prix WordPress.

## Historique conservé — contrôle de la 0.1.2

La version 0.1.2 était installée et active lors des observations ci-dessous; elle a été remplacée depuis. Ses preuves de paquet, dimensions et contrôle serveur ne sont pas attribuées à la 0.2.1.

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

Restent à effectuer : **contrôle visuel final du bloc prix 0.2.1**, contrôle mobile sur plusieurs largeurs/appareils, lecteur d'écran, revue éditoriale au-delà des expressions ciblées et contrôles du portail Node. Les 49 tests Node de l'étape historique ne décrivent pas la suite actuelle; les 133 tests Node, 12 Python et trois suites PHP réussis ne remplacent pas ces validations réelles. Aucun plugin WordPress de gestion du corpus privé ne doit être installé : la séparation vitrine WordPress/backend Node demeure.
