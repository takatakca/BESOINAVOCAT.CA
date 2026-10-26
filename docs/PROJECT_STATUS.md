# PROJECT_STATUS — BESOINAVOCAT.CA

**État : habillage WordPress 0.1.2 actif et contrôlé sur ordinateur; portail applicatif Node non déployé.**
Révision : 26 octobre 2026.

## Situation vérifiée le 26 octobre

- `https://besoinavocat.ca` sert le WordPress existant en HTTPS chez MochaHost. Le forfait **bolon.ca Ultimate** est actif; le panneau du compte `bolonca` a été inspecté.
- « Setup Node.js App », Passenger et **Node 24.22.1** sont disponibles. Aucune application BesoinAvocat n'a encore été créée dans ce panneau. `portail.besoinavocat.ca` reste une cible proposée, sans déploiement confirmé.
- Les droits GitHub **admin/push** ont été confirmés par le connecteur. Le contrôle Git `push --dry-run` vers `codex/espace-client-avocat` a réussi, sans effectuer de push réel. Le client local `gh` n'est pas authentifié; cette différence ne constitue pas une absence de droits ou d'accès Git au dépôt.
- Une sauvegarde privée de la base WordPress a réussi : **194 722 770 octets**, mode **0600**. L'export WXR local contient **348 pages, dont 347 publiées**; SHA-256 `22d660865b220ec52e4a1cef2b65598e8e3baee9c77f6e29050f49dce9268b79`. Ces fichiers privés restent hors du dépôt.
- **12 mentions JuriGo sur 9 pages** ont été corrigées avec contrôle des empreintes et transaction. La comparaison portant sur les **347 pages publiées** a préservé les dates, les URL et les autres contenus.
- Les réglages généraux affichent désormais **BesoinAvocat** et « Préparez votre dossier et votre recherche d’avocat. »; l'ancienne description « Lawyers Near Me » a été remplacée. La nouvelle page **5820**, slug `tableau-de-bord`, est **publiée** avec `[besoinavocat_dashboard]`. Il s'agit d'un aperçu fictif, pas du portail applicatif.
- Le plugin WordPress **0.1.2 est installé et actif**, empreinte du paquet vérifiée. Les trois contrôles de syntaxe PHP et `check-render.php` ont réussi sur le serveur. La version neutralise les formulations ciblées « 800 », les avis non vérifiés et quatre anciens textes marketing de l'accueil. Le seul partenaire déclaré par le propriétaire est **Yan Romanowski**; cette déclaration ne vaut pas vérification indépendante du statut professionnel.
- Contrôle public réel : « 800 » et « 839 » absents de l'accueil contrôlé, footer et liens présents. Le chevauchement constaté en 0.1.1 est **résolu dans le contrôle à 1 265 px** : les quatre widgets commencent à x=78 avec largeur 570 px, avant la carte à x=836. Aucun débordement horizontal constaté à cette largeur. Le téléphone de contact est présent dans le header et le footer.
- L'aperçu est accessible depuis le bouton d'accueil; ses trois onglets et la touche Début fonctionnent, sans erreur ni alerte console. Les six articles ciblés affichent chacun une seule note de non-partenariat; les formulations 800 y sont absentes, la recommandation Thetford est remplacée. Voir [WORDPRESS_QA.md](WORDPRESS_QA.md) pour le périmètre exact et les validations mobiles restant ouvertes.
- La page professionnels publique a été rechargée en 0.1.2 : trois offres et conditions à définir, fonctions en préparation, aucun réseau ou abonnement annoncé comme activé, FAQ à trois blocs sans rendement ni nombre de références promis. Les autres slogans historiques non ciblés restent à revoir.

Le **514-825-2825**, fourni par le propriétaire, est publié comme téléphone de contact; cela n'active aucun service téléphonique automatisé. Les prix professionnels restent à définir. La publication d'une demande doit rester gratuite pour les clients, sans la confondre avec les honoraires d'un avocat ou des options payantes.

## Pilote client/avocat local

Le code est dans `platform/`. **WordPress sert uniquement la vitrine et l'aperçu; Node.js doit porter le vrai backend, l'authentification raccordée à TAKATAK et les dossiers privés.** Aucune alternative de gestion de dossiers dans un plugin WordPress n'est retenue. Render reste un site statique indépendant. Aucune nouvelle infrastructure payante, permission externe, invitation ou facturation n'a été créée.

Le serveur local couvre dossiers/membres, dépôt et téléchargement contrôlé, versions immuables par API, SHA-256, provenance, recherche littérale, messages persistants, durée soumise/validée et journal. **49 tests Node réussissent** : 12 pour le site statique, 32 pour le pilote et 5 pour le lanceur Passenger. Ils ont été exécutés sous Node 24.19.0 avec l'autorisation nécessaire aux connexions localhost et aux jonctions Windows. Les échecs dans le sandbox n'ont pas été masqués. Les 3 tests Python du paquet de déploiement ont également réussi. Ces résultats locaux ne valident pas encore Passenger sur l'hébergement.

Le contrôle navigateur desktop de l'aperçu local est réussi : quatre rubriques, recherche reliée à la provenance, changement de dossier, actions d'écriture désactivées et écran de connexion non activée. Aucune erreur ou alerte console observée. Voir [PLATFORM_QA.md](PLATFORM_QA.md). Le paquet de déploiement à liste blanche et le lanceur CommonJS/ESM sont prêts pour revue; voir [CPANEL_NODE.md](CPANEL_NODE.md).

À terminer : démarrage réel et stockage privé du portail, processus unique confirmé auprès de l'hébergeur, contrat d'identité TAKATAK dédié et flux de connexion, sauvegarde/restauration applicative, quotas et protection des fichiers, import contrôlé puis parcours complet avec vrais comptes. IA, Twilio et crédits sont des modules futurs; l'indicateur de capacité reste désactivé.

## Site d'orientation Render distinct

- GitHub : `takatakca/BESOINAVOCAT.CA`, branche `main`.
- Render : `besoinavocat`, URL `https://besoinavocat.onrender.com`, service `srv-db7srnmi0phs73ahkue0`.
- Configuration statique historique : `autoDeploy=yes`, répertoire `site/`, sans base de données ni serveur applicatif. L'API Render privée et le dernier déploiement n'ont pas été revalidés le 26 octobre, faute d'espace sélectionné dans le connecteur.
- Le contrôle public du 26 octobre a obtenu 7 réponses HTTP 200 dont les contenus correspondaient au commit `b56d027c4172ddde5e362497731ac1ae80805fe0`.
- GitHub Pages reste volontairement désactivé. **Ne pas raccorder besoinavocat.ca à Render ni rediriger WordPress vers ce site.** L'ancienne tâche BA-008 est obsolète.

### Fonctions du site statique
- Interface responsive FR-CA, 8 domaines juridiques et liste des régions du Québec.
- Recherche textuelle instantanée des domaines (accents et mots-clés) traitée localement.
- Plan de recherche avec niveau d'urgence et option aide juridique; aucune identité, aucune donnée libre ou sensible demandée.
- Liens institutionnels et ressources contextuelles (CNESST, TAL, JuridiQC, Barreau, CSJ).
- Copier/imprimer le plan, navigation clavier, messages d'état, repli JavaScript désactivé.
- Pages confidentialité, conditions, 404 et `/health.json`.
- CI : **12 tests réussis** au SHA `8ea7be2`; smoke public GitHub Actions en post-CI, quotidien et déclenchable manuellement. Le run `38776190441` a réussi avec **7 réponses HTTP 200** le 15 octobre 2026.

### Non activé en production
- Annuaire de professionnels vérifiés, onboarding professionnel et consentements correspondants.
- Connexion TAKATAK et accès aux dossiers réels. Les permissions, l'API et la base existent dans le pilote local, pas dans le site statique Render.
- Messagerie privée, téléversement de pièces, suivi du temps, paiements et tableau de bord applicatif pour de vrais comptes.
- Services d'IA et de téléphonie, prix et abonnements professionnels. Le téléphone de contact fourni ne constitue pas un service d'appels automatisés.

## Qualité / risques
- Les tests Node.js et le smoke HTTP ont réussi mais ne remplacent pas une revue d'accessibilité avec lecteur d'écran, un test manuel mobile et une inspection visuelle.
- Les logs HTTP et règles d'hébergement Render restent du ressort de l'exploitant/hébergeur.
- Les ressources officielles doivent être revérifiées périodiquement.
- Le pilote et le nouvel habillage n'activent aucune collecte de dossier. Cette limite ne constitue pas un audit des formulaires historiques WordPress.
- Avant toute nouvelle collecte de renseignements personnels, compléter la gouvernance de confidentialité.

## Critère de clôture
Le périmètre **MVP orientation** peut être clôturé après validation CI, smoke et revue visuelle; le « produit complet » au sens annuaire/marketplace reste ouvert en attente de définition métier et conformité.

## Mise à jour QA — 16 octobre 2026
- Code `2cd5be9`: Quality checks `success` run `38852776970`, Browser QA Chromium `success` run `38852776863`, smoke HTTPS `success` run `38852826709`, Render `live` déploiement `dep-db8qqms9v7es7397801g`.
- Quatre largeurs testées sans débordement horizontal ni erreur JavaScript. Captures inspectées et deux anomalies d'affichage corrigées.
- Tests humains NVDA/VoiceOver et navigateurs physiques toujours ouverts. Voir [QA_REPORT.md](QA_REPORT.md).
