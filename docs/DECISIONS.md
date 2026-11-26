# DECISIONS — BESOINAVOCAT.CA

## D-045 — Deuxième vérification de bout en bout : le guide ne s'ouvre plus tout seul, Réglages de l'aperçu condensés (26 novembre 2026)

Le propriétaire a demandé (26 novembre, 04:48) de continuer jusqu'à « 100 % complet », tout fonctionnel, testé et vérifié. Nouveau relevé de 27 écrans (ordinateur et téléphone) après les 45 commits fusionnés depuis D-042 : aucune erreur de script, aucune ressource manquante, 430 tests verts. Deux simplifications, sans changer le design : sur téléphone, le guide BesoinAvocat ne s'ouvre plus de lui-même à l'arrivée (il couvrait 60 % de l'écran par-dessus la première étape); le bouton robot et « Besoin d'aide ? » restent visibles et l'ouvrent à la demande; en mode aperçu, la page Réglages montre une seule carte « Réglages du compte » au lieu de cinq cadres vides « L'aperçu n'appelle aucun service » (connecté, les cinq sections réelles restent). Le texte tarifaire avocat de `demande.html` est déjà conforme à D-044 (corrigé par un autre fil). Constat : `/avocats` affiche « Le répertoire est temporairement indisponible » quand `/api/firms` ne répond pas; comportement attendu hors ligne, à surveiller en ligne.

## D-044 — Grille de prix des avocats, distincte de celle des membres (20 novembre 2026)

Le propriétaire (20 novembre 2026, 19:07 et 19:08 UTC) : « membre et avocat, deux prix différents »; pour les avocats, « gratuit 14 jours, après 100 $ la semaine, 300 $ le mois à l'avance par mois facturé à l'année, sinon c'est 100 $ la semaine ». Lecture appliquée : **14 jours gratuits** sans carte, puis **100 $ par semaine sans engagement**, ou **300 $ par mois avec engagement d'un an, facturé chaque mois d'avance**. Cette décision remplace la gratuité de l'accès avocat du 13 novembre (reprise dans D-041) et reprend les montants de D-017. Grille dans `platform/lib/pricing.mjs` (`LAWYER_PLANS`), abonnement existant `platform/lib/membership.mjs` (prix lus chez Stripe, mêmes montants), page `/forfaits`, panneau « Abonnement à la plateforme », page de demande. Par défaut, l'essai expiré ne bloque l'avocat que lorsque Stripe est raccordé; `BESOINAVOCAT_LAWYER_ACCESS=paid` bloque même sans Stripe, `=free` rend l'accès gratuit. L'engagement d'un an est contractuel (conditions, métadonnée Stripe `ba_commitment_months`), Stripe Checkout ne sachant pas l'imposer. Honoraires jamais via BesoinAvocat (D-025). Grille des membres : D-043.

## D-043 — Grille de prix à trois paliers (option A) pour les personnes clientes (20 novembre 2026)

Le propriétaire a choisi, sur la carte de décision du fil « Ajouter le dépôt de dossier et les forfaits payants », l'option **A** de [TARIFICATION-2026-11-19](TARIFICATION-2026-11-19.md) : **Découverte** 0 $ (1 dossier, 1 Go, sans vidéo), **Membre** 15 $/mois ou 150 $/an (5 dossiers, 25 Go, vidéos), **Premium** 39 $/mois ou 390 $/an (dossiers illimités, 100 Go), espace additionnel 5 $/mois par 50 Go (Membre et Premium seulement, jusqu'à 20 tranches), module d'intégration 30 $ une fois, abonnement Intégrations 19 $/mois ou 190 $/an, essai Premium de 14 jours sans carte. Cette grille remplace celle de D-041 dans `platform/lib/pricing.mjs`; le reste de D-041 (espace compté par compte, Stripe sur ALKAO.CA, taux TPS/TVQ, rien de bloqué tant que Stripe n'est pas raccordé, équipe jamais facturée, avocats gratuits, D-025) demeure. Un seul forfait payé à la fois : le changement Membre ↔ Premium passe par le portail client de Stripe. Les lignes de l'option A que le portail ne sait pas encore appliquer (résumés par l'IA, priorité auprès des avocats, durée de conservation, soutien prioritaire) ne sont pas affichées tant qu'elles ne sont pas codées. Variables Coolify : [MONETISATION.md §4](MONETISATION.md) (deux nouvelles : `BESOINAVOCAT_STRIPE_PRICE_CLIENT_MEMBER_MONTHLY`, `…_MEMBER_YEARLY`, plus `…_INTEGRATIONS_YEARLY`).

## D-042 — Vérification de bout en bout : rien ne recouvre le menu, menu plus court pour la personne cliente (19 novembre 2026)

Le propriétaire a demandé (18 novembre, 08:06) de vérifier connexion, affichage, tableau de bord, simplicité et fonctions, puis d'« arranger tout » sans changer le design. Relevé fait sur chaque écran (ordinateur et téléphone, aperçu et écran de connexion). Corrections : sur téléphone, le guide BesoinAvocat ne recouvre plus le menu ouvert et se referme quand la personne change de section (il reste accessible par le bouton robot); avant la connexion, la barre du bas, le bouton d'aide et les « outils du dossier » sont masqués; « Découvrir l'aperçu » redevient lisible sur la carte claire; une personne cliente (aucun dossier où elle est avocate ou propriétaire) ne voit pas Clients, Usages ni Suivi du temps dans le menu. Rien d'autre ne change. Constat hors zone, à décider par le propriétaire : `demande.html` annonce encore l'espace professionnel « 100 CAD par semaine ou 300 CAD par mois, souscription non ouverte », alors que D-034 ouvre l'inscription avocat avec 14 jours gratuits et que l'accès avocat est gratuit pour l'instant.

## D-041 — Monétisation : forfaits client, espace par compte, essai Premium, modules d'intégration payants (18 novembre 2026)

Demande du propriétaire (18 novembre 2026) : « une solution de monétisation complète à 100 % ». Grille (`platform/lib/pricing.mjs`, détails et calcul pour 1 000 et 10 000 clients dans [MONETISATION](MONETISATION.md)) : Essentiel gratuit (1 dossier, 1 Go, sans vidéo), Premium 15 $/mois ou 150 $/an (dossiers illimités, 50 Go, vidéos), essai Premium de 14 jours sans carte pour chaque nouveau compte client, espace supplémentaire 5 $/mois par 100 Go, modules d'intégration 30 $ une fois chacun + abonnement Intégrations 9 $/mois. Accès avocat gratuit pour le moment (`BESOINAVOCAT_LAWYER_ACCESS=paid` rétablit le paiement après l'essai). Paiement par Stripe Checkout sur le compte ALKAO.CA, taux TPS/TVQ plutôt que Stripe Tax. Les limites ne s'appliquent que lorsque le paiement est raccordé; l'équipe BesoinAvocat n'est jamais facturée. Cette décision remplace, pour les services du dossier, la « gratuité client » de D-014/D-017 : la demande et le forfait Essentiel restent gratuits; les honoraires ne passent jamais par BesoinAvocat (D-025).

## D-040 — Les inscriptions appartiennent à TAKATAK (2026-11-18)

Le propriétaire précise à 08:03 UTC que toute inscription passe par la base de données de TAKATAK, c'est-à-dire le projet Supabase « TAKATAK User Official Dashboard V1 ». TAKATAK détient le client. BesoinAvocat reçoit une copie de l'information et gère les opérations quotidiennes du client sur sa plateforme. Si un partenaire quitte TAKATAK ou si son service est coupé, il doit bâtir son propre système, et TAKATAK conserve les clients.

Le portail fonctionne déjà ainsi : il n'a pas de système de connexion séparé, le compte est créé chez TAKATAK et le portail ne conserve que les habilitations et les dossiers. Cacher le nom TAKATAK à l'écran ou dans les courriels (règle du 18 novembre, 07:07 UTC) est seulement une question de présentation. Cela ne doit jamais faire sortir l'inscription de TAKATAK.

## PR #52 — conflit de fusion résolu, en attente de la revue du 14 novembre 2026 20:00

La PR #52 (cockpit : carte « Votre avocat », téléphone (514) 949-0887 + « Par chat / Par courriel », coordonnées aussi côté responsable) ne pouvait plus fusionner : `main` (c603a550, PR #60) avait avancé. Conflit limité à `docs/JOURNAL-AGENTS.md` (ajout-ajout) : les 4 entrées SOCIO du 2026-11-11 sont conservées avant les 20 entrées `main` du 2026-11-13, verbatim (133 entrées). `platform/public/app.js` et `platform/test/cockpit.test.mjs` ont fusionné sans conflit. Contrôles : `node --check` OK, suite plateforme 384/384 (Node 24.22). Branche `socio/cockpit-avocat-2026-11-11` mise à jour par fusion de `main` (commit `a2e8131`). **La PR n'est pas fusionnée** : fusion décidée à la revue de ce soir 20:00 avec Matt. Reste ensuite : redéploiement manuel Coolify (`besoinavocat-portail`) et provisionnement du compte avocat 6280.ca@gmail.com (accès Supabase + Coolify à confirmer : propriétaire ou Matt). — SOCIO, Agent Lévesque, 2026-11-14.


## Réception du portail — 2026-11-07 08:02 UTC

Signé **Codex**. Le propriétaire a demandé de fusionner, pousser et vérifier les dépôts **un par un**, en commençant par BESOINAVOCAT.

Le portail existant a été déployé au code `749d1b05e945df9c10c5fa1277802f51394c5aef` par Coolify `4u9anis5o0p81iw5mkmyr8pn`, terminé à 07:58:19 UTC, conteneur sain. Les 20 routes publiques ont leurs empreintes exactes sur `portail.besoinavocat.ca` et l’hôte HTTPS de diagnostic. Santé 200, API privées anonymes 401, chemins privés 404. L’écran de connexion courant et l’absence d’erreur console ont été vérifiés. Sauvegarde privée créée et vérifiée avant remplacement, volume et habilitations conservés.

La PR documentaire 6 est fusionnée après quatre contrôles verts et identification explicite de sa carte historique. La dernière ligne du journal de la branche backend est réintégrée sans modifier son auteur ni les changements plus récents de main. Aucun fichier applicatif n’est modifié par cette réception.

**Suivi du dernier SHA et de sa CI/déploiement après ces notes** : [issue 45](https://github.com/takatakca/BESOINAVOCAT.CA/issues/45). Le site d’orientation Render reste distinct. La vitrine WordPress, les DNS et le courrier restent inchangés. Livraison réelle du code courriel et session utilisateur à vérifier dans l’issue 5. Les services optionnels restent soumis à leur configuration et aux validations existantes; aucun paiement, appel, intégration ou formulaire supplémentaire n’a été activé. L’automatisation de déploiement reste à vérifier séparément des tâches ignorées en CI.

Les états plus anciens ci-dessous sont conservés comme historique et ne décrivent plus la version du portail après cette réception.


## D-038 — Accueil épuré et touche premium : moins de blocs, un fil d'or, le design conservé (18 novembre 2026)

Demande du propriétaire (18 novembre 2026, 05:00 et 05:08 UTC) : « simplifier les choses… le visuel, surtout la simplicité », puis « un peu plus de luxe, de VIP, de diplomatie, le monde juridique et la cour, sans changer le design du tout ; c'est un peu trop sombre ».

- **Accueil propriétaire/avocat** : huit instruments au lieu de douze (l'heure, le dossier affiché, le nombre de dossiers et le voyant courriel sont déjà dans l'en-tête, le sélecteur et le panneau « État »); sur le poste de travail, la liste de gauche choisit le dossier (plus de pastilles répétées sur la scène); la prochaine étape (héros) vient avant les instruments; les chiffres du héros ne sont plus répétés; la vue d'ensemble et les intégrations ferment la page.
- **Intégrations sur l'accueil** : une tuile seulement pour MIMT et les comptes reliés, à reconnecter ou prêts à connecter; les services dont l'accès développeur n'existe pas encore tiennent en une ligne de texte. La section Intégrations garde tout le catalogue; l'aperçu public aussi.
- **Accueil téléphone** : accueil, choix du dossier, instruments, puis ce qui demande une action. Les trois tuiles de texte (MIMT, Équipe, Academy) ont disparu : appels, rappel et Équipe restent dans le menu d'aide et les sections Appels et vidéo / Équipe; « Revoir la visite » remplace la visite guidée dans l'en-tête une fois la visite passée.
- **Touche premium (CSS seulement)** : jeton `--gold` (filets sous les titres de panneaux, repères avant les surtitres, instrument ouvert, dossier actif, badge du domaine, bordure du héros et anneau de progression), titres d'accueil en serif (Georgia) comme un en-tête de jugement, toile et filets un peu plus clairs. Palette, panneaux, rail, héros, navigation : inchangés. Aucune couleur sombre ajoutée.
- Rien d'inventé : aucun chiffre, aucun avocat, aucun appel; les états « bientôt » et « à raccorder » restent.

Lot 9 de `docs/COCKPIT-PREMIUM-2026-11-04.md`; tests 388/388.
## D-039 — Le client pilote est Costa / Chambly; la demande guidée débouche sur le tableau de bord (18 novembre 2026)

Le propriétaire (18 novembre 2026, 05:00 UTC) précise que Quadro Holding est son propre compte, déjà créé, et que le premier vrai client à embarquer par le navigateur est Costa / Chambly (sinistre du local commercial, R2NETTE), avec son courriel d'inscription (hors dépôt). Les pièces du client restent sur le Drive et son dépôt séparé; rien n'entre dans ce dépôt public. Côté plateforme : la demande guidée se termine par « Créer mon tableau de bord », qui emporte le domaine et le résumé (PR #67). Les boutons du site WordPress doivent pointer vers `https://portail.besoinavocat.ca/demande`, `/?signup=1` et `/avocat` (voir RACCORDEMENT-SITE-PUBLIC-2026-11-18). Le propriétaire demande aussi une inscription plus courte et une touche plus « premium » sans changer le design (lot suivant).

## D-037 — Réponses du propriétaire du 14 novembre 2026 : numéro public, appels à la minute, textes légaux rédigés en projet (14 novembre 2026)

Réponses du propriétaire (14 novembre 2026, 20:57 UTC) à la liste des points qui restaient à sa décision :
- **Numéro public pour les appels : (855) 3-AVOCAT** (855 328-6228). Clos; l'autre option, (450) 999-3999, est abandonnée.
- **Appels facturés à la minute** (MIMT Connect, toute minute commencée due; `creditPerMinute` du partenaire, 2 crédits par minute selon la documentation du 7 novembre, à confirmer avec MIMT). Le tarif affiché aux utilisateurs reste à fixer.
- **Entente Loi 25, politique de confidentialité et conditions des avocats** : le propriétaire demande que nous les rédigions, à partir des textes que TAKATAK a déjà (`takatak.ca/privacy`). Projets livrés dans [`docs/legal/`](legal/README.md). **Ce sont des projets rédigés par un agent logiciel, à faire valider par un avocat avant publication ou signature**; les passages entre crochets sont à compléter par le propriétaire (identité légale, responsable de la protection des renseignements personnels, durées de conservation, tarifs).
- **Relecture du consentement de la demande guidée** : le propriétaire demande que nous la fassions nous-mêmes. Faite dans [RELECTURE-CONSENTEMENT-DEMANDE](legal/RELECTURE-CONSENTEMENT-DEMANDE.md) : les textes actuels sont conformes dans l'ensemble; neuf précisions et trois reformulations proposées, qui deviendraient de nouvelles versions de consentement si le propriétaire les retient. Ce n'est pas une relecture par un avocat; l'activation de la demande guidée reste soumise à la décision du propriétaire en connaissance de cause.
- **WordPress en ligne** : renommage « Trouver un avocat » → « Préparer mon dossier » (popup Elementor 1839 et lien d'en-tête) confirmé (« oui exactement »); à faire par le propriétaire ou Mike (D-023, D-026).
- **Durée de conservation des demandes (D-030)** : toujours ouverte; la politique de confidentialité prévoit l'espace à compléter.
- CanLII (nom, titre, téléphone pour la demande de clé) : toujours ouvert.

## D-036 — La personne crée son tableau de bord et prépare son dossier; un avocat du domaine l'accepte (14 novembre 2026)

Demande du propriétaire (14 novembre 2026, 19:44 UTC) : « terminer la plateforme complète à 100 % ». Constat au départ : le message D-035 était écrit sur les écrans, mais le parcours n'existait pas de bout en bout. Une personne du public ne pouvait pas entrer (habilitation par fichier privé ou compte avocat seulement), un dossier n'avait ni domaine de droit ni état « prêt », et un avocat ne voyait ni n'acceptait les dossiers prêts de son domaine (rattachement par code d'invitation seulement). Ce lot livre le parcours complet, sans paiement (voir la consigne Stripe du 13 novembre : gratuit pour l'instant).

Mise en œuvre :
- **Inscription libre d'une personne cliente** (`platform/lib/client-accounts.mjs`) : bouton « Créer mon tableau de bord » sur l'écran de connexion (visible seulement si le code courriel est activé : `clientSignup` dans `/api/health`), nom + courriel + consentement, code à usage unique vérifié chez le fournisseur TAKATAK (compte créé au premier code, comme pour les avocats). Le compte client devient la troisième source d'habilitation après le fichier de grants et les comptes avocats (`extraGrants`). Routes `POST /api/auth/client/signup` et `POST /api/auth/client/verify`; 503 si `BESOINAVOCAT_EMAIL_OTP_ENABLED` n'est pas `true`. Le locataire est celui des avocats inscrits (`BESOINAVOCAT_LAWYER_TENANT`, `takatak` par défaut), pour que les dossiers des personnes et les avocats inscrits se voient.
- **Profil de dossier** (`platform/lib/case-matching.mjs`, table `case_profiles`) : domaine de droit (les 16 domaines du catalogue de la demande guidée), résumé en langage courant (1 500 caractères), état `preparation` → `pret` → `accepte`. Le nouveau dossier demande le domaine et le résumé; la carte « Préparer le dossier pour un avocat » du tableau de bord suit l'état et porte les boutons « Mon dossier est prêt » / « Reprendre la préparation ». Routes `GET|POST /api/cases/:id/profile`, `POST /api/cases/:id/ready`, `POST /api/cases/:id/reopen`; `profile` accompagne chaque dossier dans `/api/cases`, `/api/cases/:id` et `/api/lawyer/me`. Un dossier accepté garde son domaine (409 `CASE_ACCEPTED`); un dossier sans domaine ne peut pas être déclaré prêt (409 `DOMAIN_REQUIRED`).
- **Dossiers prêts côté avocat** : l'avocat déclare ses domaines de pratique dans son profil (`domains` dans `lawyer_accounts`, aucun domaine = tous). `GET /api/lawyer/ready-cases` liste les dossiers prêts de son organisation dans ses domaines, dont il n'est pas déjà membre : titre, domaine, résumé, nombre de pièces, date. **Jamais les pièces, les messages ni l'identité de la personne avant l'acceptation.** `POST /api/lawyer/accept {caseId}` le rend membre avec le rôle avocat, passe le dossier à `accepte` et dépose dans le dossier un message qui le dit à la personne : les conditions du mandat se conviennent ensuite entre eux, dans le dossier. Après l'essai de 14 jours, 402 comme pour les codes d'invitation. Les codes d'invitation `AV-XXXX-XXXX` restent possibles pour un dossier déjà suivi par un avocat précis.
- **Ce que l'écran dit honnêtement** : rien ne garantit qu'un avocat accepte ni dans quel délai; la carte le dit. BesoinAvocat n'est pas un cabinet et ne choisit pas l'avocat.
- **Journal d'audit** : `client.signed_up`, `case.profile_updated`, `case.ready`, `case.reopened`, `case.accepted`. Tables ajoutées à `OPTIONAL_TABLES` de `platform/tools/backup-corpus.py` : `client_signups`, `client_accounts`, `case_profiles`.
- **Tests** : `platform/test/client-journey.test.mjs` (parcours complet inscription → dossier prêt → avocat du bon domaine l'accepte, avocat d'un autre domaine ne le voit pas, essai expiré → 402, refus sans inscription en attente, 503 sans code courriel). Suite au 14 novembre 2026 : 388/388 tests Node, 17/17 Python, 3/3 archive.

Ce que ce lot ne fait pas : aucun paiement ni facturation (consigne du 13 novembre), aucune notification par courriel à l'avocat quand un dossier devient prêt (à prévoir avec Resend quand il sera activé), aucune modification de `demande.*` ni de la vitrine. Détails : [ESPACE-AVOCAT](ESPACE-AVOCAT.md).

## D-035 — Le message est « préparer son dossier pour trouver son avocat », plus « trouver un avocat » (13 novembre 2026)

Demande du propriétaire (13 novembre 2026, 07:04 et 07:05 UTC) : le but de BesoinAvocat est de préparer un dossier sur la plateforme pour que les avocats derrière BesoinAvocat (domaine connexe : jeunesse, civil, etc.) voient un dossier déjà prêt et l'acceptent; les conditions du mandat se conviennent ensuite entre l'avocat et la personne. « Le petit piton rose qui dit trouver un avocat, c'est fini » : il signifie désormais créer son tableau de bord et préparer son dossier pour trouver son avocat. « Ne changez pas les informations sur le site » à part cela.

Mise en œuvre (texte seulement, aucune couleur, mise en page, destination ni autre contenu touché) :
- Portail, page `/demande` : titre « Préparer mon dossier pour trouver mon avocat — demande gratuite », en-tête « Préparez votre dossier. Trouvez votre avocat. », phrase d'introduction qui explique le parcours (dossier préparé → avocat du domaine qui l'accepte → conditions du mandat convenues ensuite), les phrases de réserve existantes conservées (aucune garantie de disponibilité ni d'attribution).
- Portail, écran de connexion : même message (« Préparez votre dossier. Trouvez votre avocat. », « Un dossier prêt. Un avocat qui l'accepte. »).
- Vitrine (copie exacte D-032 et style D-026) : seuls les libellés « TROUVER MON AVOCAT », « Trouver un avocat » et « FIND MY LAWYER » deviennent « PRÉPARER MON DOSSIER », « Préparer mon dossier » et « PREPARE MY FILE » (`repositionCta` dans `www/build.mjs`). Le contrôle mot à mot de `check-site` relit ces libellés comme ceux de WordPress; tout le reste reste identique. Exception explicite à D-032, demandée par le propriétaire.
- Le WordPress en ligne (`besoinavocat.ca`, MochaHost) n'est pas modifiable depuis le dépôt : le bouton du popup Elementor 1839 (« TROUVER MON AVOCAT ») et le lien d'en-tête (« Trouver un avocat ») y sont à renommer par le propriétaire ou Mike.

## D-034 — Un avocat s'inscrit seul, avec un essai gratuit de 14 jours sans carte (13 novembre 2026)

Demande du propriétaire (13 novembre 2026, 04:31 UTC) : un avocat doit pouvoir s'inscrire, obtenir « 14 jours gratuits, sans carte de crédit, sans paiement », puis rejoindre le dossier de son client; après 14 jours, on lui demande un paiement. Mise en œuvre : page `/avocat`, inscription par code courriel qui crée le compte à la volée, essai local `plan: trial` géré par `membership.mjs` sans Stripe, codes d'invitation `AV-XXXX-XXXX` pour rejoindre un dossier avec le rôle avocat. Après l'essai : lecture conservée des dossiers rejoints, aucun nouveau dossier (402), forfaits Stripe affichés seulement quand les clés existent. Locataire par défaut des avocats inscrits : `takatak`. Détails : [ESPACE-AVOCAT](ESPACE-AVOCAT.md).

## D-033 — Les deux images mortes et le lien mort sont réparés dans la copie exacte (13 novembre 2026)

Demande du propriétaire : réparer sur `preview.besoinavocat.ca` les liens et images morts de WordPress. Dans la construction exacte (D-032), `repairKnownReferences` s'applique de nouveau, sans les liens `wp-login.php` : les deux images de `jurigo.ca` (404) de `/regroupement-familial-quebec/` utilisent les fichiers locaux déjà prévus, et le lien `/contact/` (404) de `/terms-and-conditions/` mène à `https://portail.besoinavocat.ca/demande`. Tout le reste de D-032 est inchangé.

## D-032 — La copie de prévisualisation est strictement identique au WordPress (13 novembre 2026)

Instruction du propriétaire du 13 novembre : `preview.besoinavocat.ca` doit être identique à `besoinavocat.ca` en tout : liens, contenu, mise en page, boutons et effets, « rien de différent ». Comparaison des 352 adresses en ligne (statut, texte visible, liens, structure du corps, scripts) puis de rendus Chromium (bureau 1440 px et mobile 390 px, 17 types de pages, survols, menu, bannière de témoins, accordéons, clic sur « Trouver mon avocat ») : les rendus étaient déjà identiques au pixel; les écarts restants étaient des ajouts de la copie, retirés par cette décision.

Avec `BA_STYLE=wordpress` (défaut), la construction **ne change plus** :

- la destination des boutons : « Trouver mon avocat » mène à `/demande` comme sur WordPress (et non au portail); les boutons sans lien sur WordPress restent sans lien; les liens morts de WordPress (`/contact/`, `wp-login.php?action=…`, deux images de jurigo.ca) restent tels quels;
- l'en-tête : `lang="en-US"`, titres `<h2>`, aucune balise description / Open Graph / JSON-LD ajoutée, liens `feed`, `wp-json`, `EditURI`, `shortlink` conservés;
- les formulaires : plus d'avis ni d'attribut `inert`; champs utilisables comme sur WordPress. Seul l'envoi, qui exige WordPress, ouvre le portail (`/demande?role=professional` pour MetForm, le portail pour la connexion) **sans aucune valeur du formulaire**;
- `robots.txt`, `wp-sitemap*.xml`, `feed/` et `comments/feed/` sont les fichiers mêmes de WordPress (`www/parity/`, rafraîchis par `www/tools/mirror-parity.mjs`); `/sitemap.xml`, `/index.php`, `/favicon.ico` et `/avocat-aide-juridique/` redirigent comme sur WordPress; un dossier sans page répond 404.

Pages ajoutées à la copie (servies par WordPress, absentes du plan de site des pages) : `/author/admin/`, `/category/uncategorized/`, `/metform-form/become-a-partner/`, `/metform-form/find-a-lawyer/`, `/metform-form/new-form-1759089507/`, avec les feuilles de style `post-430` et `post-461`. Le CSP autorise `secure.gravatar.com` (image de l'auteur) et l'évaluation de scripts sous `/metform-form/`.

Écarts volontairement conservés (invisibles ou impossibles sans WordPress) :

- les polices Google restent servies depuis `vendor/` (même rendu, aucune requête tierce);
- le choix de la bannière de témoins est gardé dans le témoin du visiteur (`consent-local.js`) : sur WordPress, `admin-ajax.php` répond « Error saving consent data » (contrôle du 13 novembre) et la bannière revient à chaque page;
- adresses relatives au lieu de `https://besoinavocat.ca/…` dans les liens du site (la copie reste sur son propre hôte);
- WordPress seul : `wp-login.php`, `wp-admin`, `wp-json`, `wp-cron.php`, recherche `/?s=`, redirection `/?p=ID`, réception des formulaires.

`BA_STYLE=legal` (D-026) reste disponible et inchangé. `www/tools/check-site.mjs` vérifie désormais, page par page, que la liste des liens (adresse, cible, rel), la langue, le nombre de titres et les balises meta sont ceux du WordPress.

## D-031 — La copie de prévisualisation reprend les couleurs du WordPress (9 novembre 2026)

Instruction du propriétaire du 9 novembre : `preview.besoinavocat.ca` doit être **identique** à `besoinavocat.ca`, même contenu et même mise en page sur toutes les pages. Contrôle du jour : les 348 pages de `www/site` ont un texte identique, mot pour mot, au WordPress en ligne; seules différaient les couleurs juridiques de D-026 et les libellés français de la bannière de témoins.

Règles :

- la construction prend un interrupteur `BA_STYLE` (argument Docker et variable) :
  - `wordpress`, **par défaut** : couleurs, logo et libellés de la bannière de témoins exactement comme sur WordPress;
  - `legal` : la version D-026 (orange → bordeaux, bleus et verts → marine, logo recoloré, libellés français), conservée telle quelle;
- `www/tools/check-site.mjs` suit le même interrupteur : texte comparé mot pour mot dans les deux cas, absence d'orange exigée seulement en `legal`;
- les ponts qui font fonctionner la copie sans WordPress restent dans les deux styles : liens, destination des boutons, formulaires vers le portail, choix des témoins gardé dans le navigateur, métadonnées de recherche;
- la bannière de témoins du WordPress est en anglais : la copie la garde en anglais. Une version française exige `BA_STYLE=legal` ou une décision du propriétaire.

D-026 n'est pas effacée : elle redevient active avec `BA_STYLE=legal`.

## D-030 — Instructions écrites du propriétaire du 4 novembre 2026

**Contexte** : reprise en parallèle par deux fils Claude (backend et tableau de bord) et un fil de contrôle à distance sur le poste du propriétaire, avec un livrable attendu au plus vite.

**Décisions du propriétaire, consignées dans le journal** :
- « MERGE ALL TO MAIN » (08:29 UTC) : chaque fil fusionne lui-même ses PR vertes sur `main`; le déploiement reste une étape distincte.
- Autorisation complète pour MochaHost, DNS, courriel et sauvegarde du WordPress vers Drive, exécutée par le fil de contrôle à distance avec relevé avant/après; les enregistrements MX ne sont jamais touchés. Le propriétaire complète lui-même les codes 2FA.
- Coordination obligatoire : notes avant, pendant et après chaque lot dans `docs/JOURNAL-AGENTS.md` **et** dans le dossier Drive JOURNAL; lecture des notes des autres fils avant tout fichier partagé.
- Appels par MIMT Connect seulement (Twilio retiré, PR 18); abonnement des avocats seulement par Stripe Checkout, jamais de paiement de client ni de commission sur honoraires (D-025, PR 23).
- Aucun mot de passe n'est conservé par les agents, même sur demande; la connexion aux services se fait par le propriétaire.

**Conséquences** : les sections « État vérifié — 4 novembre » de `PROJECT_STATUS`, `TASK_QUEUE`, `AGENT_HANDOFF` et `DEPLOYMENT` remplacent les points du 30 octobre; la mise en service de chaque module reste conditionnée à sa configuration et, pour la demande guidée et l'avis d'enregistrement des appels, à une relecture juridique.

## D-029 — Espace de travail premium du portail (29 octobre 2026)

**Demande du propriétaire (29 octobre)** : un tableau de bord « premium », sérieux et vivant, sans allure de gadget ni d'IA. Il veut :
- les fichiers en petites tuiles qu'on ouvre d'un clic;
- « Appeler mon avocat » avec un bouton vert à côté, et sous lui les messages vidéo;
- une vidéo ouverte en plein écran, au tiers de l'écran ou dans un coin;
- des menus et un glissement gauche-droite sur mobile;
- un poste de travail façon Word avec document vierge;
- du dessin, l'édition et l'annotation d'images (« vous étiez ici, vous êtes tombé là »), et une présentation PowerPoint.
L'IA et les services gratuits par API sont envisagés, facturés à l'heure.

**Décision** :
- tout est fait dans le navigateur, sous la CSP stricte du portail, sans dépendance ni service externe;
- chaque création devient une pièce du dossier : « Déclaration » pour une vidéo ou un document rédigé, « Analyse » pour une annotation, un dessin ou une présentation;
- elle est marquée « à vérifier » avec sa provenance, et l'original n'est jamais modifié;
- « Appeler » rejoint la réunion Zoom prévue ou dépose une demande de rappel dans les échanges : le portail ne compose aucun numéro tant que la téléphonie n'est pas connectée;
- l'IA et les éditeurs photo en ligne restent **désactivés et affichés comme « à connecter »**. Les brancher exige un fournisseur choisi, une évaluation Loi 25 avant tout envoi hors Québec, et des prix, taxes et conditions approuvés (D-025).

**Garde-fous** :
- aucun stockage navigateur;
- enregistrement lié au dossier ouvert;
- caméra et micro au clic seulement, et sur la page du portail seulement;
- HTML et SVG toujours refusés.

Guide, preuves et limites : [ESPACE-DE-TRAVAIL](ESPACE-DE-TRAVAIL.md). Le numéro D-028 appartient déjà à la réception du portail (Codex); cette décision prend le numéro suivant sans renuméroter les autres.

## D-028 — Code fusionné, réception du portail distincte (29 octobre 2026)

La [PR 2](https://github.com/takatakca/BESOINAVOCAT.CA/pull/2) est fusionnée dans `main` au commit `348d626b76d4adcd874cc7485d2e744006b249c9`. L’intégration du code est achevée; **corpus restauré et connexion configurée, accès utilisateur réel non validé**. Conserver les résultats locaux et la CI comme preuves de code, sans les présenter comme une connexion réelle du propriétaire.

La réception du 29 octobre confirme le déploiement `efef692` terminé à 04:21:20 UTC, la restauration contrôlée des trois dossiers (1 362 documents, 1 185 blobs), les empreintes et les permissions privées. `/api/health` indique `loginConfigured:true`; les refus anonymes sont contrôlés. Le mot de passe historique a été refusé. Le correctif de compatibilité des cinq tables de connecteurs avec la sauvegarde est fusionné avec la réception dans la [PR 3](https://github.com/takatakca/BESOINAVOCAT.CA/pull/3), SHA `ad8e2f4a31ebdafee2bc56acd36e861652d4623c`, six contrôles réussis. Le serveur demeure à `efef692`. Le nom d’environnement Coolify `production` ne vaut pas recette utilisateur. Voir [l’état précis](COOLIFY.md#état-de-lessai-distant--28-octobre-2026).

**Diagnostic de connexion du 29 octobre.** TAKATAK utilise désormais son code personnalisé par courriel/SMS, tandis que le portail demande encore un mot de passe Supabase. Le correctif sur `codex/connexion-code-courriel` réutilise la même identité et les mêmes habilitations avec un code Supabase distinct. Tests réussis : 233/233 portail, 12/12 site, 60/60 contrôles ciblés de connexion; revue indépendante effectuée. Il reste désactivé par défaut (`BESOINAVOCAT_EMAIL_OTP_ENABLED`) et non déployé. Le propriétaire est connecté à Supabase. SMTP personnalisé déjà activé (`smtp.maileroo.com:465`), secrets inchangés; modèle Magic Link complété par `{{ .Token }}` FR/EN avec lien conservé, enregistré et relu après rechargement. La livraison réelle du code et la connexion doivent être testées après déploiement. Aucun code envoyé, aucun nouveau compte, mot de passe réinitialisé ou droit ajouté. Aucune consultation authentifiée n’est encore validée. Ne pas confondre livraison du code source, activation et réception utilisateur. Cette précision complète D-028 sans renuméroter les décisions D-026/D-027 des autres travaux.

Contrôle daté du 28 octobre : le site d’orientation Render, dont le contenu `site/` est inchangé, a été republié au commit `348d626b76d4adcd874cc7485d2e744006b249c9`; les sept URL du smoke public passent. Ce contrôle ne valide pas le portail Node ni les dossiers privés.

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

**Historique de clôture du 26 octobre :** [REPRISE-SUIVANTE-2026-10-26.md](REPRISE-SUIVANTE-2026-10-26.md). La consigne « notes seulement, puis arrêt » concernait cette étape; la reprise du 28 octobre demeure active.

Journal des décisions et hypothèses qui guident le code. Une hypothèse ne devient pas une autorisation métier. Les décisions D-016 à D-029 ci-dessous priment sur les états historiques qu'elles remplacent.

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
