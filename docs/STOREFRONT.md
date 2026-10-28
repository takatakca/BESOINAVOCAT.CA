# Vitrine besoinavocat.ca sans WordPress (`www/`)

> **28 octobre 2026 — VITRINE : `www/` est maintenant la copie exacte du site WordPress; seules les couleurs changent (D-026). En attente de la validation du propriétaire.**
> - La refonte « plateforme IA » du 27 octobre (D-022) a été **refusée** par le propriétaire (D-023). Son design n'est plus servi; il reste dans l'historique Git (`0e457cd`, `c00ead5`). Le texte importé de `www/content/` est conservé, sans être lu par la construction ([CONTENT_PRESERVATION](CONTENT_PRESERVATION.md)).
> - Le 28 octobre, le propriétaire a choisi de reconstruire `www/` comme **copie exacte** de son site WordPress, fait à la main détail par détail : mêmes mises en page, sections, images et boutons, textes mot pour mot. **Seules les couleurs changent**, pour ne pas ressembler à un autre de ses sites : l'orange devient bordeaux, les bleus et les verts deviennent marine; le blanc, les crèmes et le charbon restent.
> - **Direction du propriétaire (28 octobre)** : c'est un site juridique, il doit garder un **ton juridique**. Les couleurs sont sobres et professionnelles, propres à un service juridique. Les textes sont formels et rigoureux. Proportion voulue : **99 % réel et juridique, 1 % d'IA**. L'IA est la touche discrète qui distingue la plateforme et en fait l'avenir des plateformes juridiques; elle n'est jamais le thème visuel ni le ton général. Pas d'esthétique futuriste ou robotique.
> - Preuves de la copie, page par page et mot pour mot : voir [Preuves](#preuves).
> - **Sans instruction écrite du propriétaire, aucun agent ne modifie** la page de demande du portail (`platform/public/demande.*`, encore dans le style refusé de `c00ead5`), WordPress ou le DNS. Dans `www/`, seule la copie fidèle est autorisée (BA-034). Une autre session travaille en parallèle : vérifier GitHub avant toute action et ne pas écraser son travail.
> - Le WordPress en ligne est intact : vérifié le 28 octobre, thème Astra, extension 0.2.2, DNS toujours chez MochaHost, rien n'a été basculé.

Décisions du propriétaire :
- D-021 (27 octobre) : sortir de WordPress, versionner le site dans GitHub et le servir depuis son serveur Coolify;
- D-023 (28 octobre) : la refonte D-022 est refusée;
- D-026 (28 octobre) : `www/` devient la copie exacte du site WordPress, et seules les couleurs changent.

Le site WordPress chez MochaHost **n'est ni modifié ni supprimé** : il reste la copie de retour arrière jusqu'à la fin de la bascule.

## Contenu de `www/`

| Chemin | Rôle |
|---|---|
| `site/` | **Copie exacte du site en ligne**, prise le 28 octobre 2026 à 08:24 UTC. Elle compte : les 348 pages du plan du site, la page 404 et 1 870 fichiers (feuilles de style, scripts, polices, images, PDF). `manifest.json` donne l'adresse d'origine et l'empreinte SHA-256 de chaque fichier. Ne pas modifier à la main : ce dossier est la référence des contrôles. |
| `tools/mirror-wordpress.mjs` | Prend la copie, en lecture seule : plan du site, pages, puis tous les fichiers qu'elles appellent, y compris les `url()` et `@import` des feuilles de style. Les polices Google sont gardées dans `site/vendor/`. |
| `tools/mirror-runtime.mjs` | Second passage, dans Chromium à 1440 et 390 px. Il ajoute les fichiers que les pages ne chargent qu'en s'exécutant (morceaux de scripts Elementor, par exemple). |
| `palette.mjs` | La règle des couleurs (voir plus bas). |
| `overrides/` | Fichiers qui remplacent ceux de la copie à la même adresse : <br>- le logo recoloré (`tools/recolour-images.py`, même règle); <br>- `assets/palette-fixes.css` : six titres posés sur un fond sombre; <br>- `assets/static-bridge.js` : les formulaires. |
| `build.mjs` | Construit `dist/` (ignoré par Git) à partir de `site/` et `overrides/`. |
| `tools/check-site.mjs` | Contrôle de chaque construction, sans dépendance. Il est aussi exécuté dans l'image Docker et la CI. |
| `tools/compare-live.mjs` | Comparaison au site en ligne, dans Chromium, avec OCR facultatif. |
| `nginx.conf`, `Dockerfile` | Service par nginx 1.28 sur Coolify. |
| `content/`, `public/wp-content/`, `tools/import-wordpress.mjs`, `tools/compare-snapshot.mjs`, `tools/inventory-content.mjs` | Le texte importé le 27 octobre et ses outils. Ils sont conservés et contrôlés par l'inventaire de préservation ([CONTENT_PRESERVATION](CONTENT_PRESERVATION.md)). La construction ne les lit plus. Ne pas relancer `import-wordpress.mjs` : il écrase `content/pages/`. |

## Ce qui change par rapport à WordPress, et rien d'autre

1. **Les couleurs** (`palette.mjs`), pour ne pas ressembler à un autre site du propriétaire et garder un ton juridique sobre. actionavocat.ca, par exemple, est en noir et or `#d6b36a`.
   - L'orange de la marque `#FF751F` devient le bordeaux `#8b2132`, et `#E77926` devient `#792936`. Les teintes claires d'orange deviennent un rose pâle de même clarté.
   - Les verts, sarcelles, ardoises, bleus et violets deviennent marine (teinte 218°), à clarté égale. Les bleus vifs sont assombris : `#046bd2` → `#173f83`, `#1863dc` → `#1a4795`, `#176358` → `#1b345f`.
   - Restent tels quels : le blanc, les crèmes (`#f8f6ef`, `#fffefa`…), les gris neutres, le charbon du texte (`#373643`, `#32373c`) et le noir.
   - La règle s'applique :
     - aux feuilles de style, aux styles en ligne et aux attributs SVG;
     - aux illustrations SVG du site;
     - aux couleurs de la bannière de témoins;
     - au logo PNG.
   - Les photos ne changent pas.
   - Lisibilité :
     - si un fond devient sombre sous un texte sombre, ce texte devient blanc;
     - six titres posés sur un fond sombre prennent une teinte pâle de leur couleur : les prix de `/professionnels/` et deux titres de `/a-propos/` en rose pâle `#f3d4da`, un titre de `/consultations/` en marine pâle `#c3d1ea`.
2. **Les liens du site** deviennent relatifs, pour que la copie fonctionne sur toute adresse. Les balises `canonical`, de partage et `ld+json` gardent `https://besoinavocat.ca`. Les polices Google sont servies par le site lui-même : aucune page n'appelle un tiers.
3. **Les boutons** gardent leurs mots :
   - « Trouver mon avocat » mène à la page de demande du portail `https://portail.besoinavocat.ca/demande?domaine=…`, avec le domaine de la page présélectionné (D-020);
   - « Parler à un avocat » et « Obtenir des offres », sans destination sur WordPress, composent le 514 825-2825;
   - « Contacte-nous » mène au portail (`?role=professional`).
4. **Ce qui ne marche qu'avec WordPress** :
   - Le formulaire MetForm de `/professionnels/`, la connexion de `/log-in/` et le formulaire de mot de passe oublié gardent leur apparence et leurs vérifications de champs. À l'envoi, le visiteur est conduit au portail. **Rien n'est envoyé** : il n'y a plus de serveur WordPress pour le recevoir.
   - Les liens d'en-tête REST, flux et oEmbed sont retirés.
   - Le compteur de vues de MetForm reçoit une réponse vide (204).
5. **Nouvelles adresses pour les fichiers modifiés** (`?ba=<empreinte>`). WordPress envoie ses feuilles de style et ses images avec un cache d'un an (`expires` 2027). Sans nouvelle adresse, un visiteur déjà venu verrait encore l'ancien orange.
6. `sitemap.xml` et `robots.txt` sont produits par la construction.

**Gardé tel quel, car c'est l'état actuel de WordPress** (signalé au propriétaire, pas corrigé) :
- les deux images de `/regroupement-familial-quebec/` sont chargées depuis jurigo.ca, qui répond 404 : elles sont cassées sur WordPress aussi;
- `/terms-and-conditions/` contient un lien `/contact/`, qui est en 404 sur WordPress;
- le lien « Avocat aide juridique » du pied de page mène, sur WordPress, à une page de pièce jointe. nginx le redirige vers l'article `/avocat-aide-juridique-2/`;
- la bannière de témoins n'enregistre pas le choix : WordPress répond « Error saving consent data. » et la bannière revient à chaque page. La copie fait de même : il n'y a plus de serveur pour enregistrer le choix;
- les pages vides sur WordPress le restent, dont la politique de confidentialité et les conditions des professionnels (BA-032);
- les coquilles du texte : celles repérées le 27 octobre sont listées dans [CONTENT_CORRECTIONS](CONTENT_CORRECTIONS.md). Elles ne sont **pas** appliquées, puisque la copie est mot pour mot. Le propriétaire décide;
- sur l'accueil, à 1440 px, les trois cartes « 100% gratuit », « Simple et rapide » et « Confidentiel » sont serrées dans des colonnes de 20 px. C'est le cas sur WordPress aussi, animations actives ou non;
- les contrastes faibles de WordPress, comme les petits libellés gris. La copie en a beaucoup moins que le site en ligne (axe-core, plus bas).

## Preuves

Contrôles du 28 octobre 2026 sur la construction finale, sauf mention contraire. Outils : Chromium (Playwright 1.63), Tesseract 5.3.4 `fra+eng`, axe-core 4.10.2. La copie a été prise à 08:24 UTC : une modification faite ensuite dans WordPress n'y figure pas.

- **Mot pour mot, contre la copie de WordPress** (`check-site`, aussi exécuté dans l'image Docker et la CI) :
  - 348 pages sur 348 ont un texte visible identique;
  - aucun caractère HTML n'est abîmé et aucun orange ne reste dans les styles;
  - aucun fichier n'est chargé d'un tiers, hormis les deux images de jurigo.ca;
  - tous les liens internes aboutissent.
  CI « Storefront checks » verte.
- **Mot pour mot, contre le site en ligne** (`compare-live --ocr`, à 1440 px, chaque page défilée jusqu'au bout) :
  - le texte affiché est **identique sur les 348 pages**, sans erreur de script sur la copie. MochaHost a répondu un 503 passager pour `/contestation-contravention-avocat/`; recontrôlée ensuite, la page répond 200 et est identique;
  - **OCR** de la capture pleine page de la copie : en moyenne **97,1 %** des mots du site en ligne sont retrouvés (médiane 97,5 %); 343 pages sont à 90 % ou plus;
  - les cinq pages sous 90 % sont du texte sur photo ou des pages très courtes : `/demande/`, `/a-propos/`, `/consultations/`, `/log-in/` et `/recrutement/`. La capture de WordPress, lue de la même façon, obtient le même score : `/demande/` 71,4 % en ligne contre 70,1 %, `/a-propos/` 83,9 % contre 83,8 %, `/log-in/` 86,5 % des deux côtés;
  - seul écart notable : `/recrutement/`, 94,2 % contre 87,1 %. Il vient du découpage de la page par Tesseract. Le pied de page, lu seul, donne les mêmes mots des deux côtés (747 et 748), et aucun pixel n'y diffère de plus de 40 sur 255;
  - ce passage a été fait avant deux corrections : le charbon conservé et le caractère `&#039;` (voir plus bas). Le texte affiché n'en dépend pas. Dix pages ont été recontrôlées sur la construction finale : texte identique.
- **Mises en page** : dans Chromium, page défilée, on compare la position et la taille de chaque titre, image et bouton, à 2 px près.
  - À 1440 px : 348 pages sur 348 identiques (16 904 éléments), à la hauteur de page près.
  - À 390 px : 348 pages sur 348 identiques (15 245 éléments).
  - Un écart a été trouvé et corrigé : sur `/succession/`, la page était 59 px plus courte à 1440 px. La règle des couleurs lisait le caractère `&#039;` (les guillemets de « Nunito Sans » dans un style en ligne) comme la couleur `#039`, et le nom de la police était cassé. La règle est corrigée et `check-site` refuse désormais tout caractère abîmé. Après correction, la page est identique; le passage à 390 px a été fait avec la correction.
- **Couleurs rendues et CSP** : dans l'image Docker finale, 349 adresses à 1440 px et 14 pages aussi à 390 px :
  - aucune violation de la CSP;
  - aucun orange calculé sur un élément visible;
  - aucune erreur de script ni fichier en échec, hormis les images de jurigo.ca (en 404 sur WordPress aussi).
- **Contraste** (axe-core, règle `color-contrast`, WordPress contre copie, sur les 348 pages) :
  - WordPress compte 1 386 violations, la copie 9 : la copie en a moins sur chaque page, et plus sur aucune;
  - restent de petits libellés gris de `/` et de `/tableau-de-bord/`, de même clarté que sur WordPress;
  - le titre « Digne de confiance à travers le Québec. » de `/consultations/` est violet `#8400E4` sur fond presque noir sur WordPress (rapport 2,72; il en faut 4,5). Devenu marine, il était moins lisible (1,95). Il passe en marine pâle `#c3d1ea` (11,97), comme les cinq titres sur photo sombre.
- **Formulaires** :
  - MetForm de `/professionnels/` : 9 champs, même hauteur (426 px) et même bouton « OBTENIR DES NOUVEAUX CLIENTS » que sur WordPress. Un envoi valide mène à `portail.besoinavocat.ca/demande?role=professional`, sans aucune requête d'envoi;
  - la connexion de `/log-in/` mène au portail.
- **Bannière de témoins** : mêmes boutons que sur WordPress, même comportement (voir « Gardé tel quel »).
- **Logo** : mêmes lettres et même flèche; le charbon est inchangé et l'orange devient bordeaux.
- **Image Docker** (nginx 1.28, construite localement et en CI) :
  - `/healthz` répond;
  - les pages répondent 200;
  - réponses 301 : une adresse sans barre oblique finale, `/avocat-aide-juridique/`, et www vers le domaine principal;
  - réponses 404 : une page inconnue (page 404 de WordPress), `wp-login.php`, `wp-admin`, `xmlrpc.php`, `wp-json` et `.env`;
  - le PDF `download.php` répond 200 en `application/pdf`;
  - l'en-tête CSP est présent.
- **Tests du dépôt** :
  - `node --check site/app.js` et `site/guide.mjs`;
  - `node --test tests/*.test.mjs` : 12 sur 12;
  - `node --test platform/test/*.test.mjs` : 113 sur 113 sous Node 22 en local; la CI utilise Node 24.19.
- **Limites** :
  - ces contrôles ne sont pas une certification WCAG, ni un test avec lecteur d'écran;
  - le rendu n'a été vérifié que dans Chromium, pas dans Safari ou Firefox;
  - l'OCR est une aide : la preuve mot pour mot est la comparaison du texte affiché.

## Modifier le site

Tant que la bascule n'est pas faite, le site se modifie là où le propriétaire l'a construit, dans WordPress et Elementor. On reprend ensuite la copie :

1. Reprendre la copie : `node www/tools/mirror-wordpress.mjs`, puis `node www/tools/mirror-runtime.mjs`. Relire le diff Git de `www/site/`.
2. Si le logo change : `python3 -I www/tools/recolour-images.py` (Pillow).
3. Construire et contrôler : `node www/build.mjs && node www/tools/check-site.mjs`.
4. Comparer au site en ligne : `node www/tools/compare-live.mjs <dossier> [--ocr] [adresses…]`. Il faut Playwright, et Tesseract `fra` pour l'option `--ocr`.
5. Pousser sur GitHub : la CI « Storefront checks » reconstruit, vérifie et teste l'image.

Après la bascule, le domaine ne mène plus à WordPress, et la reprise de la copie lit `https://besoinavocat.ca` en dur. **Le propriétaire choisit alors comment modifier le site** : modifier directement `www/site/`, ou garder WordPress joignable à une autre adresse et adapter l'outil.

## Application Coolify de la vitrine

| Réglage | Valeur |
|---|---|
| Source | GitHub `takatakca/BESOINAVOCAT.CA`, branche `main` après fusion (la branche `codex/espace-client-avocat` pour un essai) |
| Build pack | Dockerfile |
| Base directory | `/www` |
| Dockerfile | `/Dockerfile` |
| Port exposé | `80` |
| Domaines | `https://besoinavocat.ca,https://www.besoinavocat.ca` (www redirige vers le domaine principal) |
| Stockage persistant | aucun : le site ne garde aucune donnée |
| Argument de build facultatif | `BA_REQUEST_URL`, si la page de demande change d'adresse |

L'image construit la copie et la vérifie mot pour mot : la construction échoue au moindre défaut. Elle la sert ensuite avec nginx 1.28 et fournit :

- une CSP limitée au site lui-même :
  - les scripts et styles en ligne d'Elementor sont permis;
  - `unsafe-eval` est permis seulement sur `/professionnels/`, car MetForm construit ses champs avec `new Function`;
  - le worker du contrôle des émojis de WordPress (`blob:`) est permis;
  - les deux images de jurigo.ca sont permises;
  - les envois de formulaire ne vont que vers le site et le portail;
- les redirections de barre oblique finale, la page 404 et `/healthz`;
- la redirection des anciens plans de site WordPress vers `/sitemap.xml`, et `/avocat-aide-juridique` vers l'article;
- un 404 pour `wp-admin`, `wp-login.php`, `xmlrpc.php`, `wp-json` et tout `.php`. Seule exception : le PDF des conditions, que WordPress servait à l'adresse `download.php`;
- un cache de 7 jours pour `wp-content/` et `wp-includes/`, de 30 jours pour `vendor/` et d'un jour pour `assets/`.

L'image a été construite et testée localement le 28 octobre (voir les preuves).

## Bascule DNS : ordre à suivre (à faire par le développeur du propriétaire)

Zone DNS lue le 27 octobre, en lecture seule. Les serveurs de noms sont ceux de MochaHost (`ns1`–`ns4.mysecurecloudhost.com`); les modifications se font donc dans l'éditeur de zone cPanel. `besoinavocat.ca` A `209.42.24.127`, TTL 7200 s. `www`, `mail` et `ftp` sont des CNAME vers `besoinavocat.ca`; `portail` est un A vers la même adresse.

**Attention au courriel : le MX est `0 besoinavocat.ca.`** Le courrier est donc livré à la même adresse que le site. Changer seulement l'enregistrement A du domaine enverrait le courrier vers Coolify, qui n'a pas de serveur de courrier. **Il faut d'abord détacher le courriel du site.**

1. **La veille** : abaisser à 300 s le TTL des enregistrements `besoinavocat.ca` A, `www` et `portail`.
2. **Courriel d'abord** :
   - créer `mx.besoinavocat.ca` A `209.42.24.127`;
   - changer le MX en `0 mx.besoinavocat.ca.`;
   - remplacer les CNAME `mail` et `ftp` par des A `209.42.24.127`;
   - dans cPanel › Routage du courriel, choisir « Échangeur de courriel local ».
   Attendre l'ancien TTL (2 h), puis envoyer et recevoir un courriel de test. Ne pas toucher aux enregistrements DKIM (`default._domainkey`), DMARC, SPF, `autodiscover`, `webmail` et `cpanel` : ce sont déjà des A ou des TXT vers MochaHost. Le SPF liste déjà les IP de MochaHost; son `+a` pourra être retiré plus tard.
3. **Portail avant vitrine** : les boutons de la vitrine mènent à `portail.besoinavocat.ca/demande`. Déployer le portail Node sur Coolify ([COOLIFY](COOLIFY.md)), puis basculer `portail` A vers `31.220.96.134`. Vérifier `/api/health` et `/demande`. Le portail actuel chez MochaHost est la v1 bloquée : rien à perdre.
4. **Essai de la vitrine avant DNS** : `curl --resolve besoinavocat.ca:80:31.220.96.134 http://besoinavocat.ca/healthz`, puis quelques adresses du plan du site. Le certificat Let's Encrypt de Coolify (défi HTTP) ne peut être obtenu qu'après la bascule. Juste après, il faut donc s'attendre à quelques minutes sans certificat valide, ou utiliser d'abord un domaine d'essai `sslip.io`.
5. **Bascule** : changer seulement `besoinavocat.ca` A en `31.220.96.134`; `www` suit par son CNAME. Vérifier ensuite :
   - `https://besoinavocat.ca/` et le certificat;
   - un échantillon d'anciennes adresses : `/famille-et-jeunesse/`, `/faq/`, `/professionnels/`, une adresse sans barre oblique et `/wp-sitemap.xml`;
   - un bouton « Trouver mon avocat » de bout en bout;
   - un courriel reçu.
6. **Retour arrière** : remettre `besoinavocat.ca` A à `209.42.24.127`. WordPress est intact chez MochaHost. Pendant la bascule, son administration n'est plus joignable par le domaine; c'est normal.
7. Après la bascule : soumettre `https://besoinavocat.ca/sitemap.xml` dans la Search Console, si elle est utilisée.

## Déploiement automatique, comme dans takatak-v1

Le flux `.github/workflows/coolify-deploy.yml` est inactif par défaut. Il ne déploie que :

- après une CI verte sur un push de `main`;
- si le SHA testé est toujours celui de `main`;
- uniquement l'application dont la CI a réussi : la vitrine après « Storefront checks », le portail après « Platform pilot checks ».

Pour l'activer après la première acceptation manuelle :

- dans Coolify, ouvrir l'accès API et créer un jeton **Deploy**;
- dans GitHub, ajouter les secrets d'environnement `production` suivants : `COOLIFY_BESOINAVOCAT_API_TOKEN`, `COOLIFY_BESOINAVOCAT_WWW_DEPLOY_WEBHOOK` et `COOLIFY_BESOINAVOCAT_PORTAL_DEPLOY_WEBHOOK`. Ce sont les adresses `https://coolify.takatak.ca/api/v1/deploy?uuid=…` de chaque application;
- ajouter ensuite les variables de dépôt `COOLIFY_BESOINAVOCAT_WWW_AUTODEPLOY_ENABLED=true` et `COOLIFY_BESOINAVOCAT_PORTAL_AUTODEPLOY_ENABLED=true`;
- désactiver alors le déploiement automatique propre à Coolify, pour qu'un push non vérifié ne parte pas en production.

Aucun jeton ne doit figurer dans une adresse, un commit ou une note.

## Vie privée

La copie ne recueille rien elle-même. Il n'y a ni outil d'analyse ni balise Google : le site WordPress n'en avait pas, et aucun fichier n'est chargé d'un tiers. Seules exceptions : les deux images de jurigo.ca, cassées.

Elle garde les scripts de WordPress :
- la bannière de témoins, qui n'enregistre pas le choix (voir plus haut);
- le stockage local `elementor` d'Elementor.

Les formulaires n'envoient rien. Les demandes passent par le portail, qui affiche sa finalité et recueille le consentement. Les journaux nginx du conteneur contiennent l'adresse IP et la page demandée; leur durée de conservation dépend de la configuration de Coolify.

**La politique de confidentialité doit être rédigée par le propriétaire** avant l'ouverture des demandes. Elle doit nommer la personne responsable de la protection des renseignements personnels (Loi 25) et dire où se trouve le serveur. Aucun texte juridique n'a été inventé.
