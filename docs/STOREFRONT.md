# Vitrine besoinavocat.ca sans WordPress (`www/`)

Décision du propriétaire, 27 octobre 2026 (D-021) : la vitrine besoinavocat.ca est reconstruite à partir du contenu publié sur WordPress, versionnée dans GitHub et servie par le serveur Coolify du propriétaire. Il n'y a plus d'extension, de thème ni de base de données. Le site WordPress chez MochaHost **n'est ni modifié ni supprimé** : il reste la copie de retour arrière jusqu'à la fin de la bascule.

## Ce qui a été copié et comment le vérifier

- **348 pages**, soit toutes celles du plan du site WordPress (`wp-sitemap.xml` ne contient que des pages, aucun article de blogue). Instantané en lecture seule du 27 octobre, puis conversion des widgets Elementor en HTML propre : `www/tools/import-wordpress.mjs`. Résultat dans `www/content/pages/`, une page par fichier, avec son adresse, son titre et sa source en en-tête.
- **Mêmes adresses** que WordPress, barre oblique finale comprise. Une adresse sans barre oblique redirige vers la page, comme avant.
- **Comparaison au site en ligne** (`node www/tools/compare-snapshot.mjs <instantané>`) : 36 741 des 36 835 phrases visibles sont retrouvées telles quelles. Les 94 autres ont été contrôlées par échantillon : elles sont présentes, mais la comparaison colle autrement les listes imbriquées. S'y ajoutent les trois corrections volontaires listées plus bas.
- **Contrôle de chaque construction** (`node www/tools/check-site.mjs`, aussi exécuté dans l'image Docker et la CI) : un seul h1, un titre et une description par page; tous les liens internes et les images aboutissent; aucun bouton sans destination; le texte importé est présent dans la page construite. Résultat au 27 octobre : 350 pages (348, plus `/contact/` et la page 404), 0 erreur. Il reste 9 avertissements : 6 titres en double déjà présents sur WordPress (`/logement/` et `/logement-2/`, par exemple) et 3 pages réécrites.
- Rendu contrôlé dans Chromium à 1440 et 375 px : aucun débordement horizontal, aucune erreur JavaScript (le site n'a aucun script), menu mobile et ordre de tabulation corrects.

## Ce qui a changé par rapport à WordPress

- Un seul gabarit (voir la refonte ci-dessous) : navigation, fil d'Ariane et panneau « Trouver mon avocat » sur chaque article. Le pied de page reprend tous les liens de WordPress, les domaines étant regroupés en sections dépliables.
- **« Trouver mon avocat » mène à la page de demande du portail** (`https://portail.besoinavocat.ca/demande`), avec le domaine de droit de la page présélectionné (D-020). Les boutons « Parler à un avocat » et « Obtenir des offres », sans destination sur WordPress, affichent et composent le 514 825-2825.
- Pages réécrites à la main dans `www/content/overrides/`, en conservant leurs textes :
  - l'accueil et `/tableau-de-bord/` : leurs blocs (prix 100/300 $ CA, crédits IA, assistant téléphonique « en préparation », aperçu fictif) venaient de l'extension et non d'Elementor;
  - `/demande/` : le choix des domaines, avec deux fautes corrigées (« jeuneesse », « Immobiler »);
  - `/professionnels/` : les prix présentés en cartes et une étape en double retirée (« clients potentielse new leads »). Le formulaire MetForm est remplacé par le lien du portail `?role=professional`.
- **Pages vides sur WordPress, aucun texte juridique inventé** : `/politique-de-confidentialite/`, `/conditions-dutilisation-des-professionnels/`, `/find-a-lawyer/` et `/rediger-un-contrat-de-service/`. Elles annoncent un texte « en cours de rédaction », sauf la dernière, qui renvoie vers l'article complet `/rediger-un-contrat-de-service-2/`. `/log-in/` explique que la connexion est en préparation.
- Liens réparés : six liens du pied de page sans barre oblique. Le lien « Avocat aide juridique » menait, sur WordPress, à une image; il mène maintenant à l'article `/avocat-aide-juridique-2/`. `/contact/` répondait 404; il devient une page « Nous joindre ». Les deux PDF Complianz (conditions et formulaire de rétractation) sont copiés tels quels.
- Plus de bannière de témoins : le site ne dépose aucun témoin et n'a ni outil d'analyse ni script. Le site WordPress n'avait aucune balise Google Analytics, Tag Manager ou de vérification Search Console.

## Refonte « plateforme IA » du 27 octobre 2026 (D-022)

Demande du propriétaire : un site premium et futuriste, qui présente BesoinAvocat comme une plateforme juridique propulsée par l'IA pour le Québec et l'Ontario, raccordée à TAKATAK, sans rien retirer du contenu.

- **Design** :
  - fond marine et lumière bleue de la marque TAKATAK (`BRAND.md` de takatak-v1), orange BesoinAvocat pour les actions;
  - polices Montserrat, Inter et JetBrains Mono, servies par le site lui-même (licence OFL) : aucune requête vers un tiers;
  - aucun script : tous les effets sont en CSS et respectent « réduire les animations »;
  - même design sur la page de demande du portail (`platform/public/demande.css`).
- **Articles** :
  - l'ouverture commune (titre, « Répondez à quelques questions… », bouton) devient un en-tête avec le domaine et le temps de lecture;
  - les sections reçoivent une ancre, et une table « Sur cette page » accompagne un panneau de demande fixe.
  - Les niveaux de titre ne sautent plus de niveau (accessibilité). Le texte et l'ordre ne changent pas.
- **Accueil** : tous les textes précédents sont conservés. S'ajoutent :
  - des chiffres réels (292 guides, 16 domaines, 38 villes et régions, 0 $ pour publier une demande);
  - le « moteur BesoinAvocat » avec l'état de chaque fonction : questionnaire *Disponible*; structuration par IA, recherche dans les documents et connexion TAKATAK *En déploiement*; assistant téléphonique *En préparation*;
  - une comparaison « Payez pour le conseil, pas pour la paperasse »;
  - l'annuaire des domaines et un bandeau TAKATAK.
- **Limites volontaires du texte** (lois sur le Barreau et sur la protection du consommateur) :
  - BesoinAvocat prépare le dossier, l'avocat conseille : aucune consultation juridique ni économie chiffrée n'est promise;
  - les fonctions d'IA ne sont pas présentées comme actives avant d'être raccordées et testées.
- **Ontario** :
  - la page de demande propose maintenant l'Ontario;
  - l'ancien choix « Hors Québec » devient « Autre province ou territoire », avec le même identifiant;
  - catalogue `2026-10-27.2`.
- **Image de partage** `assets/og-image.png` (1200 × 630) et nouvelle icône. L'adresse de la feuille de style change avec son contenu, ce qui évite qu'un ancien design reste en cache après un déploiement.
- **Contrôles** :
  - `check-site` : 350 pages, 0 erreur;
  - axe-core (WCAG 2.1 AA) sur les 350 pages à 390 px, sans erreur ni débordement : voir la section des preuves de [PROJECT_STATUS](PROJECT_STATUS.md);
  - relecture du contenu : [CONTENT_CORRECTIONS](CONTENT_CORRECTIONS.md).

## Modifier le site

1. Modifier le texte dans `www/content/pages/<page>.html` ou, pour une page réécrite, dans `www/content/overrides/<page>.html`. Une page de `overrides/` remplace la page importée de même adresse.
2. Dans une page réécrite, `{{request}}` ou `{{request:family}}` donne l'adresse de demande (domaine présélectionné); `{{portal}}`, `{{phone}}` et `{{phone-label}}` sont aussi disponibles.
3. `node www/build.mjs && node www/tools/check-site.mjs`, sans dépendance. Le site construit est dans `www/dist/` (ignoré par Git).
4. Pousser sur GitHub : la CI « Storefront checks » reconstruit, vérifie et teste l'image. Après la bascule, le déploiement suit la CI verte sur `main` (voir plus bas).

L'import WordPress est un outil de reprise ponctuel. Le relancer **écrase** `www/content/pages/`; ne le faire qu'avec un nouvel instantané et en relisant le diff.

## Application Coolify de la vitrine

| Réglage | Valeur |
|---|---|
| Source | GitHub `takatakca/BESOINAVOCAT.CA`, branche `main` (PR 1 fusionnée); nouvelles branches réservées aux préversions |
| Build pack | Dockerfile |
| Base directory | `/www` |
| Dockerfile | `/Dockerfile` |
| Port exposé | `80` |
| Domaines | `https://besoinavocat.ca,https://www.besoinavocat.ca` (www redirige vers le domaine principal) |
| Stockage persistant | aucun : le site ne garde aucune donnée |
| Argument de build facultatif | `BA_REQUEST_URL`, si la page de demande change d'adresse |

L'image construit les pages, les vérifie (la construction échoue au moindre défaut), puis les sert avec nginx 1.28. Elle fournit :

- une CSP stricte : aucun script, aucun formulaire;
- les redirections de barre oblique finale, la page 404 et `/healthz`;
- la redirection des anciens plans de site WordPress vers `/sitemap.xml`;
- un 404 pour `wp-admin`, `wp-login.php`, `xmlrpc.php` et tout `.php`.

L'image a été construite et testée localement le 27 octobre : healthy, 200, 301, 404 et en-têtes vérifiés.

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
3. **Portail avant vitrine** : les boutons de la vitrine mènent à `portail.besoinavocat.ca/demande`. Sauvegarder l'état privé et relever l'A antérieur du portail. Déployer le portail Node sur Coolify ([COOLIFY](COOLIFY.md)), puis basculer `portail` A vers `31.220.96.134` après confirmation de l'IP du serveur. Vérifier `/api/health`, `/demande` et la connexion réelle.
4. **Essai de la vitrine avant DNS** : `curl --resolve besoinavocat.ca:80:31.220.96.134 http://besoinavocat.ca/healthz`, puis quelques adresses du plan du site. Le certificat Let's Encrypt de Coolify (défi HTTP) ne peut être obtenu qu'après la bascule. Juste après, il faut donc s'attendre à quelques minutes sans certificat valide, ou utiliser d'abord un domaine d'essai `sslip.io`.
5. **Bascule** : changer seulement `besoinavocat.ca` A en `31.220.96.134`; `www` suit par son CNAME. Vérifier ensuite :
   - `https://besoinavocat.ca/` et le certificat;
   - un échantillon d'anciennes adresses : `/famille-et-jeunesse/`, `/faq/`, `/professionnels/`, une adresse sans barre oblique et `/wp-sitemap.xml`;
   - un bouton « Trouver mon avocat » de bout en bout;
   - un courriel reçu.
6. **Retour arrière** : remettre `besoinavocat.ca` A à sa valeur relevée (`209.42.24.127` au 28 octobre). Si la bascule du portail échoue, restaurer aussi son A antérieur et sa configuration sauvegardée. Garder le courrier sur ses hôtes dédiés. WordPress reste une sauvegarde chez MochaHost. Pendant la bascule, son administration n'est plus joignable par le domaine.
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

La vitrine ne collecte rien : pas de formulaire, pas de témoin, pas de script. Les demandes passent par le portail, qui affiche sa finalité et recueille le consentement. Les journaux nginx du conteneur contiennent l'adresse IP et la page demandée; leur durée de conservation dépend de la configuration de Coolify.

**La politique de confidentialité doit être rédigée par le propriétaire** avant l'ouverture des demandes. Elle doit nommer la personne responsable de la protection des renseignements personnels (Loi 25) et dire où se trouve le serveur. Aucun texte juridique n'a été inventé.
