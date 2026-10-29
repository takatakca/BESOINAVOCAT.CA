# DECISIONS — BESOINAVOCAT.CA

## D-024 — Développement GitHub et bascule par Mike (28 octobre 2026)

Le propriétaire reprend le travail et confirme : aucun WordPress dans la cible, tous les contenus existants conservés dans `www/`, backend Node construit et testé dans GitHub. Mike, son développeur, termine les DNS. L'agent prépare le code, ses tests et [la liste de bascule](DEV-A-FAIRE-2026-10-28.md); ne pas refaire le travail de Mike ni réinstaller WordPress. La sauvegarde WordPress est conservée pour retour arrière.

Le dashboard personnel et les trois dossiers du propriétaire priment. Réutiliser son identité TAKATAK existante, confirmée en lecture seule; les droits locaux préparés ne prouvent pas que le portail distant est activé. Les mots de passe ne vont jamais dans le dépôt ni les notes.

## D-025 — Connecteurs optionnels et revenus distincts (28 octobre 2026)

Le client doit choisir ses options : services internes BesoinAvocat, connecteur Zoom, téléphonie et autres intégrations. Les connecteurs pourront porter des frais d'installation payés par Stripe; **50 CAD est l'exemple donné, pas un prix activé**. Le propriétaire envisage un service interne gratuit, à définir. Des frais pour de forts volumes documentaires sont aussi prévus, sans barème arrêté.

Chaque connexion fournisseur utilise son flux officiel OAuth et ses habilitations propres; ne pas collecter le mot de passe Zoom. L'état du paiement, le droit à l'option, la connexion du fournisseur et les permissions des dossiers sont séparés. Une page de succès Stripe ne débloque pas une option : confirmation serveur signée et idempotente requise. Pas de débit, de création de facture réelle ni de promesse de fonction active avant raccordement et recette.

## D-026 — La vitrine est la copie exacte du site WordPress, en couleurs juridiques (28 octobre 2026)

Le propriétaire a choisi la « copie GitHub du site ». Dans le cadre de D-024 (aucun WordPress dans la cible, contenus conservés, bascule par Mike), `www/` est reconstruit comme la copie exacte de son site WordPress : mêmes mises en page, sections, images, boutons et scripts, textes mot pour mot. Il a ensuite demandé de vérifier le site « mot pour mot », OCR compris, sur toutes les pages.

Règles :

- **seules les couleurs changent**, et dans des tons juridiques :
  - l'orange devient bordeaux;
  - les bleus, verts et violets deviennent marine;
  - le blanc, les crèmes, les gris neutres et le charbon restent.
  La règle est dans `www/palette.mjs`;
- les autres changements servent seulement à faire fonctionner la copie sans WordPress : les liens, la destination des boutons, l'envoi des formulaires vers le portail et les nouvelles adresses des fichiers modifiés. Voir [STOREFRONT](STOREFRONT.md);
- les défauts présents sur WordPress sont gardés et signalés, pas corrigés : coquilles, images et liens morts, bannière de témoins qui n'enregistre pas le choix. Le propriétaire décide;
- le design de la refonte D-022 n'est plus servi; il reste dans l'historique Git (`0e457cd`, `c00ead5`). Le texte importé le 27 octobre (`www/content/`, `www/public/wp-content/`) et ses outils restent dans le dépôt, couverts par l'inventaire de préservation de D-024 ([CONTENT_PRESERVATION](CONTENT_PRESERVATION.md)); la construction ne les lit plus. Seuls les fichiers de présentation de la refonte (`www/public/assets/`, `www/public/favicon.svg`) sont retirés;
- la page de demande du portail (`platform/public/demande.*`) garde le style refusé de `c00ead5`. Sans instruction du propriétaire, elle n'est pas modifiée.

Le résultat attend la validation du propriétaire. La bascule DNS reste à faire par son développeur.

## D-027 — Intégrateur de connecteurs dans le portail (29 octobre 2026)

Demande du propriétaire : rendre la solution exploitable, d'un niveau premium, avec un intégrateur de connecteurs pour tout ce qui sert au quotidien d'un avocat. Le propriétaire ouvrira les comptes développeur.

Décisions :

- chaque avocat relie **ses propres comptes** (OAuth 2.0, PKCE quand le fournisseur l'accepte). Aucun mot de passe de fournisseur ne passe par BesoinAvocat;
- les jetons sont chiffrés au repos avec une clé séparée de la base (`/data/integrations.key`), et jamais renvoyés au navigateur;
- premier lot :
  - Zoom, Outlook et Google Agenda, avec des actions réelles sur les rendez-vous;
  - DocuSign et Clio (région Canada), pour la connexion seulement;
  - Stripe, Twilio et CanLII, au niveau de la plateforme;
  - Notarius et QuickBooks à venir;
- les notifications des fournisseurs sont acceptées seulement avec une signature valide. Elles sont enregistrées une fois, sans action métier pour l'instant;
- dans le pilote, une connexion ne dépend d'aucun paiement. Les frais de connecteur (D-025) restent à décider; Stripe ne sert qu'aux abonnements de la plateforme, jamais aux avances d'un client (fidéicommis);
- ce qui est envoyé au fournisseur se limite au titre, à la date et à la durée du rendez-vous;
- pas d'enregistrement Zoom par défaut, et aucun lien d'hôte conservé;
- l'évaluation Loi 25 des services situés hors Québec reste à valider par le propriétaire.

Le code est testé avec des fournisseurs simulés. Aucun connecteur n'est annoncé comme actif avant sa vérification avec un vrai compte ([INTEGRATIONS](INTEGRATIONS.md)).

**Premier fichier à lire : [REPRISE-SUIVANTE-2026-10-26.md](REPRISE-SUIVANTE-2026-10-26.md).** Fin de session : notes seulement, puis arrêt.

Journal des décisions et hypothèses qui guident le code. Une hypothèse ne devient pas une autorisation métier. Les décisions D-016 à D-027 ci-dessous priment sur les états historiques qu'elles remplacent.

## D-023 — Refonte D-022 refusée; le propriétaire reprend la vitrine (28 octobre 2026)

Le propriétaire refuse la refonte « plateforme IA » de D-022. Il ne voulait pas un nouveau design : il voulait la reproduction fidèle de son site WordPress, construit à la main détail par détail, avec seulement d'autres couleurs pour ne pas ressembler à un autre de ses sites. Il reprend lui-même la vitrine, en ce moment.

L'erreur de l'agent : il a lu la demande « premium, futuriste » du 27 octobre comme une permission de tout redessiner, alors que la consigne antérieure était de garder ce qui existe et seulement de nettoyer. Il aurait dû poser la question avant de remplacer un design fait à la main. Dès la première copie (D-021), il n'a d'ailleurs repris que les textes et les liens dans son propre gabarit, sans le dire assez clairement.

Direction précisée le même jour : c'est un site juridique, qui doit garder un ton juridique. Les couleurs sont sobres et professionnelles, propres à un service juridique; les textes sont formels et rigoureux; proportion voulue : 99 % réel et juridique, 1 % d'IA. L'IA est la touche discrète qui distingue la plateforme et en fait l'avenir des plateformes juridiques; elle n'est jamais le thème visuel ni le ton général. Pas d'esthétique futuriste ou robotique.

Conséquences :

- aucun agent ne modifie `www/`, `platform/public/demande.*`, WordPress ou le DNS sans instruction écrite du propriétaire;
- rien n'est annulé d'office. Références si le propriétaire le demande : état avant la refonte `a27f70f`; commits de la refonte `0e457cd` (vitrine) et `c00ead5` (page de demande et Ontario); relecture du contenu `ac80fef`, détaillée dans [CONTENT_CORRECTIONS](CONTENT_CORRECTIONS.md).

## D-022 — Plateforme IA premium, Québec et Ontario, raccordée à TAKATAK (27 octobre 2026) — refusée le 28 octobre, voir D-023

Décision du propriétaire. BesoinAvocat se présente comme une plateforme juridique propulsée par l'IA, pour le Québec et l'Ontario. Elle reste une marque indépendante, mais son identité, ses API et ses outils d'IA sont conçus sur l'infrastructure TAKATAK (D-005, D-010). Le design suit la marque TAKATAK (marine et bleu électrique) avec l'orange BesoinAvocat. Le contenu est conservé et relu ([CONTENT_CORRECTIONS](CONTENT_CORRECTIONS.md)).

Cadre du message : la demande est gratuite et l'équipe trouve l'avocat. L'IA prépare le dossier pour réduire le temps facturé, mais BesoinAvocat ne donne pas de consultation juridique. Aucune économie chiffrée, aucun résultat garanti, aucune fonction d'IA annoncée comme active avant d'être raccordée et testée : chaque fonction affiche son état (*Disponible*, *En déploiement*, *En préparation*). L'Ontario est ajouté au formulaire de demande (catalogue `2026-10-27.2`). Aucun réseau d'avocats ontariens n'est annoncé.

## D-021 — Vitrine statique dans GitHub, servie par Coolify (27 octobre 2026)

Décision du propriétaire : copier tout le contenu publié de WordPress dans le dépôt (`www/`) et servir besoinavocat.ca depuis son serveur Coolify. Il n'y a plus d'extension, de thème ni de base de données. Cette décision remplace la partie « WordPress reste la vitrine » de D-020. Le questionnaire reste sur le portail Node.

Conditions retenues :

- mêmes adresses et mêmes textes;
- corrections limitées aux fautes et défauts constatés;
- aucun texte juridique inventé pour les pages vides;
- aucun script, témoin ou outil d'analyse;
- chaque construction est vérifiée;
- WordPress reste intact chez MochaHost comme retour arrière.

La bascule DNS est faite par le développeur du propriétaire, dans l'ordre de [STOREFRONT](STOREFRONT.md) : courriel détaché d'abord (le MX pointe sur le domaine), portail, puis vitrine. Le déploiement automatique suit la CI verte sur `main`, comme dans takatak-v1.

## D-020 — Questionnaire sur le portail Node, WordPress pour le contenu (27 octobre 2026)

Décision du propriétaire. Les appels à l'action « Trouver mon avocat » mènent au portail Node, `portail.besoinavocat.ca/demande`. Ce portail sert le questionnaire et enregistre la demande avec notre propre backend. WordPress reste la vitrine : aucun texte, article ou page n'est supprimé; seules la propreté et la présentation sont corrigées. Le module de formulaire WordPress (`funnel`) n'est plus étendu et reste désactivé.

Message produit voulu : demande toujours gratuite pour le client, l'équipe se charge de trouver l'avocat, des outils d'IA aideront à préparer le dossier pour réduire les frais. Ces services sont présentés comme en préparation tant qu'ils ne sont pas raccordés et testés. L'ouverture de la réception reste conditionnée au déploiement contrôlé du portail (BA-018, BA-025) et aux préalables de D-006.

## D-019 — Clôturer sans confondre installation et validation (26 octobre 2026)

Le propriétaire termine la session : mettre les notes à jour puis arrêter. WordPress **0.2.1 installé avec succès via l'interface WP**; la 0.2.0 avait été contrôlée visuellement pour les tarifs 100/300 CAD et les articles 2186/4663/5082/5715. La 0.2.1 corrige le CTA orange superposé aux prix par un CSS dans le flux normal; **son contrôle visuel final reste à faire**. Le funnel demeure désactivé.

Le code `5a230e52c758a626f31be24abeef2cce5242b3c1` a ses quatre runs CI verts, 133 tests Node, 12 Python et trois suites PHP (preuves dans [PROJECT_STATUS](PROJECT_STATUS.md)). Cela ne valide ni le rendu final WordPress ni l'accès aux dossiers. Node v1 reste à `identityConfigured: false`; la v2 demeure bloquée par l'antivirus, sans contournement. Aucun nouveau code, commit, push, compte ou déploiement pendant cette clôture documentaire.

## D-016 — Backend et accès effectif en priorité (26 octobre 2026)

Le propriétaire demande de faire fonctionner son backend et son accès aux dossiers **avant la vitrine**. WordPress demeure la présentation; Node porte l'application et TAKATAK l'identité. Le portail technique existe déjà, mais la v2 de connexion/corpus reste refusée par l'antivirus MochaHost. Les contrôles de code ne lèvent pas ce refus : demander l'analyse du paquet exact, sans désactiver la protection ou l'esquiver.

Le corpus a été importé et restauré localement avec contrôles; une copie privée de sauvegarde est distante, sans activation dans le portail. Aucune connexion réelle de l'utilisateur ni consultation du corpus en production n'est validée. Ne pas dire que son mot de passe a été configuré. Aucun nouveau compte, permission implicite ou système d'identité parallèle n'est autorisé par cette note.

Les modules `intake` / `funnel` sont préparés et testés. Le module WordPress est inclus dans la 0.2.1 installée, mais le funnel reste désactivé et la réception Node non activée. Cette préparation ne doit pas être présentée comme une collecte fonctionnelle ni retarder l'accès prioritaire.

## D-017 — Prix professionnels et gratuité client (26 octobre 2026)

Les prix décidés sont **100 CAD par semaine ou 300 CAD par mois**, avec **crédits IA en supplément**. Les demandes clients restent **toujours gratuites**, sans obligation d'engager un avocat; les honoraires juridiques sont distincts. Cette décision remplace les anciennes mentions « prix à définir » pour ces deux formules.

L'affichage des prix n'active pas la facturation : aucun abonnement, débit, paiement, crédit IA ou service vocal n'est annoncé opérationnel sans raccordement et contrôle effectifs. Ne pas inventer un prix de crédit, un volume inclus, un engagement ou une condition fiscale non définis.

## D-018 — Conserver les informations et corriger la promotion (26 octobre 2026)

Préserver originaux, preuves contraires, articles, informations documentaires, dates, URL, médias et codes existants. Les corrections éditoriales visent les anciennes marques d'opérateur et affiliations promotionnelles injustifiées; elles ne doivent pas effacer les noms nécessaires à un article ou à une pièce. Un cabinet cité ne devient pas un partenaire. Les nouvelles présentations FR/EN doivent conserver cette distinction et éviter les promesses de résultat ou de disponibilité non établies.

Les statuts documentaires restent explicites : original ou copie, déclaration, analyse, OCR à contrôler. Les versions et doublons ne s'additionnent pas et le paquet figé des 312 annexes ne change pas par le développement du portail.

## D-015 — WordPress uniquement pour la vitrine, Node pour le backend (26 octobre 2026)

Le propriétaire réaffirme cette séparation : **WordPress sert la vitrine et l'aperçu, Node.js le vrai backend et les dossiers privés**. La piste d'un plugin WordPress de consultation du corpus a été interrompue; elle ne doit pas être déployée ou considérée comme une seconde solution d'authentification. L'autorité demeure TAKATAK, avec habilitations BesoinAvocat. La simple existence de comptes WordPress n'autorise pas à les convertir en identité du portail.

## D-011 — Conserver WordPress et distinguer les hébergements (26 octobre 2026)

L'inspection réelle confirme WordPress HTTPS sur besoinavocat.ca chez MochaHost, forfait bolon.ca Ultimate actif. Le site statique besoinavocat.onrender.com reste indépendant. **L'ancien projet BA-008 de raccordement du domaine à Render est obsolète** : aucun déplacement ou remplacement du WordPress existant n'en découle.

La première version technique Node 24.22.1/Passenger est désormais créée sur portail.besoinavocat.ca. L'ancienne mention « aucune application créée » est dépassée. La v2 connexion/corpus reste bloquée; une réponse HTTPS du pilote ne suffit pas pour annoncer l'accès aux dossiers. Voir D-016 et DEPLOYMENT.

## D-012 — Préserver le contenu existant et rendre l'habillage réversible (26 octobre 2026)

Conserver les pages, dates et URL WordPress. La sauvegarde privée de base réussie (194 722 770 octets, mode 0600) et l'export WXR (348 pages, dont 347 publiées) sont exclus du dépôt. Les 12 mentions JuriGo corrigées dans 9 pages ont fait l'objet de gardes SHA et d'une transaction; la comparaison des 347 pages publiées confirme la conservation des autres contenus, des dates et URL.

Le nouvel habillage est un plugin distinct. Historiquement, l'installation inactive de la 0.1.0 a été suivie de la 0.1.1 puis de la **0.1.2**, alors active avec empreinte, trois lint PHP et `check-render` vérifiés sur serveur; la page 5820 a été publiée comme aperçu. Le chevauchement 0.1.1 avait été résolu au contrôle à 1 265 px. **D-019 consigne désormais l'installation 0.2.1.** Les états d'installation, de contrôle visuel et d'activation du funnel restent distincts. Les sauvegardes, secrets, cookies, URL de session et exports privés ne sont jamais ajoutés à Git.

## D-013 — Partenaire déclaré et affirmations publiques (26 octobre 2026)

Le propriétaire précise que **Yan Romanowski est le seul partenaire**. Cette information est attribuée au propriétaire; elle n'établit pas à elle seule une vérification indépendante du statut professionnel, des compétences, d'une disponibilité ou d'un consentement à chaque présentation.

Neutraliser dans le nouvel habillage les affirmations « 800 » et les avis non vérifiés, sans inventer de profils ou de témoignages de remplacement. La 0.1.2 reprend les corrections contrôlées de la 0.1.1 et quatre autres phrases marketing de l'accueil, sans changer les données Elementor. La page professionnels reçoit également une présentation des offres en préparation. Ces transformations ciblées ne constituent pas un audit exhaustif des articles historiques. Les archives de sauvegarde restent intactes.

## D-014 — Gratuité client et services futurs (26 octobre 2026)

La publication d'une demande doit rester **toujours gratuite pour les clients**. Les honoraires de l'avocat et les éventuelles options payantes sont distincts. D-017 fixe désormais les deux formules professionnelles à 100 CAD/semaine ou 300 CAD/mois, crédits IA en supplément. Leur présentation ne crée aucune souscription ni facturation.

Le propriétaire a fourni le **514-825-2825** comme téléphone de contact, désormais publié et contrôlé dans le header/footer de la 0.1.2. Cette publication de coordonnées n'active aucun assistant ou service téléphonique. Les appels/enregistrements automatisés, l'IA documentaire, les crédits et paiements restent à raccorder et à vérifier. Ne pas présenter ces fonctions comme actives, ni créer un compte ou numéro payant par déduction.

## D-009 — Nouveau mandat client/avocat (26 octobre 2026)

Le propriétaire demande un vrai backend, l'espace client/avocat, ses pièces, une recherche, des échanges et un suivi du temps, puis IA/voix et crédits. Il confirme besoinavocat.ca et MochaHost. WordPress reste la vitrine; l'application Node.js est distincte. Ce mandat autorise le développement local du pilote, auparavant hors du périmètre d'orientation. Il ne nécessite pas de recréer le dépôt.

## D-010 — Identité et périmètre du pilote

Réutiliser l'autorité TAKATAK, mais ne pas confondre sa session avec une permission BesoinAvocat. Le code de connexion navigateur et les grants explicites existent dans la v2; leur parcours réel sur l'hébergement n'est pas validé. Aucune autorité de mots de passe parallèle, permission implicite ou création automatique de compte. Les essais locaux ne constituent pas une connexion utilisateur distante.

SQLite et les blobs privés servent au pilote sur un même hôte; les sessions chiffrées partagées évitent de dépendre d'un worker unique non garanti par l'hébergeur. Aucune nouvelle infrastructure payante par déduction. L'aperçu conserve des données fictives. Les pièces du maître restent hors Git; l'import/restauration locaux vérifiés et la copie privée distante sont distincts d'une activation du corpus en production. Les minutes sont déclarées et validées par une autre personne habilitée, sans paiement automatique.

## D-001 — Dépôt ciblé
- Date : 14 octobre 2026
- Décision : utiliser `takatakca/BESOINAVOCAT.CA` (lien explicite), sans modifier le dépôt distinct AHMVERDUN malgré son apparition dans le premier message.
- Conséquence : versionnement et déploiement isolés.

## D-002 — Livrer une orientation sans collecte
- Date : 14 octobre 2026
- Décision : site statique public, FR-CA, parcours local dans le navigateur sans inscription, téléversement ni mise en relation.
- Motivation : le dépôt initial ne contenait qu'un README; éviter de publier des profils d'avocats fictifs ou d'accepter des informations sensibles sans infrastructure approuvée.

## D-003 — Hébergement
- Date : 14 octobre 2026
- Décision exécutée : service Render statique dédié, publication depuis `main`.
- Détails : `docs/DEPLOYMENT.md`; GitHub Pages optionnel et volontairement inactif.
- Point historique, remplacé par D-011 le 26 octobre : le domaine besoinavocat.ca sert déjà WordPress chez MochaHost et ne doit pas être basculé vers Render.

## D-004 — Autorités externes
- Date : 15 octobre 2026
- Décision : liens vers sites institutionnels sans affiliation prétendue, sans extraction automatisée de coordonnées de professionnels.
- Références : Barreau du Québec, JuridiQC, Commission des services juridiques, CNESST, Tribunal administratif du logement, gouvernement du Québec.
- Limite : un lien n'est pas une validation ou une recommandation de professionnels.

## D-005 — Écosystème TAKATAK
- Date : 15 octobre 2026
- Règle d'architecture : si l'identification de clients est approuvée, utiliser TAKATAK comme autorité d'identité et isoler les permissions/données de BESOINAVOCAT par produit et tenant.
- **État au 15 octobre** : pas de backend, SSO, base ni données clients. Le pilote créé le 26 octobre est décrit par D-009/D-010/D-016; le code de connexion existe, mais son usage réel sur l'hébergement reste non validé.

## D-006 — Conformité avant marketplace
- Date : 15 octobre 2026
- Règle : aucun module d'annuaire professionnel « vérifié », de demandes de consultation, de traitement de pièces ou d'honoraires n'est exposé sans approbation du périmètre métier, accords professionnels, revue juridique et gouvernance de vie privée.
- État : décision métier et cadre juridique encore à obtenir. Les exigences futures sont des éléments de backlog, pas des livrables déjà validés.

## D-007 — Surveillance et autonomie
- Date : 15 octobre 2026
- Décision : CI et vérification HTTPS quotidienne depuis GitHub Actions; le fichier de relève permet la reprise manuelle ou via orchestrateur.
- Limite : un workflow programmé n'est pas un agent de développement permanent et ne relance pas de session d'IA.

## D-008 — QA navigateur et correction de défauts visuels (16 octobre 2026)
- Playwright/Chromium sur les quatre tailles est exécuté à chaque push et PR; ses captures sont conservées comme artéfacts GitHub.
- Les captures ont révélé un symbole masqué et des titres de carte disproportionnés, corrigés dans les commits `22e8970` et `2cd5be9`.
- Cette QA automatisée ne remplace ni NVDA/VoiceOver ni les validations légales et métier BA-009/BA-010.
