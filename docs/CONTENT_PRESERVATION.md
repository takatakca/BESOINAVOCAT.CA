# Préserver le contenu — repères pour Mike

L’[inventaire du 28 octobre](CONTENT_INVENTORY_2026-10-28.json) décrit les fichiers présents dans le dépôt. Il ne modifie ni les pages importées, ni leurs remplacements, ni les médias. Il n’impose aucun changement de présentation : le propriétaire garde la maîtrise du visuel et de la disposition WordPress.

## Ce qui est inventorié

| Ensemble | Fichiers | Contrôle |
|---|---:|---|
| `www/content/pages/` | 348 | Adresse, titre, provenance et empreinte du texte complet |
| `www/content/overrides/` | 10 | Même contrôle ; neuf remplacent un rendu importé, `/contact/` ajoute une adresse |
| `www/public/wp-content/` | 3 | Tous les fichiers locaux de ce répertoire, 127 504 octets, SHA-256 binaire |
| `www/content/site.json` et `assets.json` | 2 | Métadonnées de l’import, avec empreintes |

Au total, **363 fichiers**, **349 adresses de pages distinctes**, auxquelles le générateur ajoute sa page 404. Les 348 URL sources inscrites dans les en-têtes correspondent aux adresses des pages importées. C’est un contrôle local des métadonnées, pas une vérification HTTP des anciennes URL. L’unique média déclaré dans `assets.json` est présent ; les deux autres fichiers de `wp-content` sont également inventoriés, même s’ils ne figurent pas dans cette liste déclarative.

Chaque page indique `file`, `path`, `title`, `source`, `sourceUrl`, `exists`, `status` et `sha256Utf8LF`. `effectiveFile` désigne le fichier utilisé pour son rendu ; chaque remplacement indique `replacesFile`. Le texte importé reste donc repérable même lorsqu’une autre version est rendue. Cette coexistence ne prouve pas que toutes ses phrases sont encore affichées.

Les empreintes textuelles portent sur le texte UTF-8 complet, avec uniquement CRLF et CR convertis en LF. Les espaces, caractères Unicode et éventuel BOM restent conservés. Les empreintes des fichiers `wp-content` portent sur les octets intacts. L’inventaire n’enregistre ni horodatage variable ni chemin privé absolu ; une conversion Git des fins de ligne ne change pas son résultat. Les dates de provenance contenues dans les textes sont conservées telles quelles.

## Contrôle reproductible, sans réimportation

Depuis la racine du dépôt, avec Node 24 :

```sh
node www/tools/inventory-content.mjs --check
```

Cette commande relit les 363 fichiers, recalcule leurs empreintes et compare le résultat à l’inventaire versionné. Elle ne réécrit aucun fichier. Un fichier retiré ou modifié, une nouvelle entrée, une adresse incohérente ou un média déclaré absent provoque un échec. Le nombre attendu de pages est volontairement fixé à 348 et celui des remplacements à dix : toute évolution de ce périmètre exige une revue explicite de cette référence.

Après avoir examiné et accepté des modifications, produire un candidat séparé :

```sh
node www/tools/inventory-content.mjs --output docs/CONTENT_INVENTORY_CANDIDAT.json
git diff --no-index docs/CONTENT_INVENTORY_2026-10-28.json docs/CONTENT_INVENTORY_CANDIDAT.json
```

Le code de sortie 1 de `git diff --no-index` signifie que des différences ont été trouvées. Ne remplacer l’inventaire de référence qu’après leur examen. Les deux modes de l’outil écrivent au plus un JSON sous `docs/`; ils ne lancent pas le générateur, un import, un téléchargement ou un déploiement.

## Rapprocher l’instantané WordPress du 27 octobre

Conserver séparément l’instantané local d’origine, son `index.json` et ses `raw/*.html`. Il est distinct des fichiers HTML nettoyés dans ce dépôt. Pour contrôler une évolution :

1. Rapprocher les adresses de `index.json` avec les 348 couples `sourceUrl` / `path` de l’inventaire, et vérifier la présence des fichiers bruts de l’instantané. Une URL seule ne prouve pas le contenu historique.
2. Comparer le texte visible de cet instantané au rendu construit, puis relire les écarts, notamment les neuf pages remplacées. L’outil existant `www/tools/compare-snapshot.mjs` s’utilise dans un environnement compatible avec ses chemins et avec Playwright ; il lit le snapshot, mais ne constitue pas une comparaison d’octets. Son chemin `URL.pathname` doit être adapté ou exécuté sous Linux plutôt que supposé compatible avec les chemins Windows. Ne pas relancer `import-wordpress.mjs` pour effectuer cette comparaison : il écrase les fichiers importés.
3. Consulter [CONTENT_CORRECTIONS](CONTENT_CORRECTIONS.md) pour les corrections déjà documentées et [STOREFRONT](STOREFRONT.md) pour le protocole de comparaison précédent. Le présent lot n’a pas relancé cette comparaison à l’instantané et ne certifie pas de nouveaux résultats sur les phrases historiques.
4. Le contrôle `node www/tools/check-site.mjs`, après une construction autorisée, vérifie les liens et le texte importé face au rendu. Il complète l’inventaire ; ses avertissements sur les remplacements doivent être examinés, pas effacés.

## Limites à garder visibles

L'export WXR original du 26 octobre est également conservé dans les livrables privés OneDrive. Son SHA-256 a été recalculé le 28 octobre : `22d660865b220ec52e4a1cef2b65598e8e3baee9c77f6e29050f49dce9268b79`, identique au reçu initial. Ce reçu décrit 347 pages publiées, un brouillon et 1 467 références de médias : des références ne sont pas autant de fichiers sauvegardés. Le reçu du 26 octobre consigne aussi une sauvegarde SQL complète sur l'ancien hébergement; son existence distante et son contenu n'ont pas été recontrôlés dans ce lot.

Avant de supprimer l'ancien hébergement, Mike doit conserver et vérifier une sauvegarde privée restaurable de la base **et** des fichiers WordPress (médiathèque, thèmes, extensions et paramètres utiles), puis rapprocher les médias requis des pages migrées. Les trois fichiers locaux de `wp-content` et l'export WXR ne suffisent pas à certifier cette sauvegarde complète. Aucun export contenant des comptes ou paramètres privés ne doit être ajouté au dépôt public.

- Ceci n’est **pas une sauvegarde de la base WordPress**, de ses comptes, thèmes, extensions ou paramètres.
- Les trois fichiers locaux `wp-content` ne prouvent pas que toute la médiathèque distante, les médias inutilisés ou les anciennes versions ont été sauvegardés.
- `www/public/assets/`, les autres fichiers de code et le dossier juridique privé ne font pas partie de cet inventaire de contenu importé.
- Une empreinte détecte un changement par rapport à une référence conservée ; elle ne prouve pas l’authenticité d’une source ni la véracité de son texte.
- Aucune suppression WordPress, réimportation, mutation de contenu ou bascule de site n’a été effectuée par cet outil.
