# AGENT_HANDOFF — BESOINAVOCAT.CA

## Reprise courante — 26 octobre 2026

**Dépôt :** `takatakca/BESOINAVOCAT.CA`. **Branche du pilote :** `codex/espace-client-avocat`, issue de `main` au SHA `b56d027c4172ddde5e362497731ac1ae80805fe0`. Lire le SHA courant dans Git pour la livraison exacte.

Le propriétaire demande un espace client/avocat et l'amélioration du WordPress existant, en conservant ses pages et URL. **Besoinavocat.ca est le WordPress HTTPS chez MochaHost; besoinavocat.onrender.com est un site statique distinct. Ne pas déplacer le domaine WordPress vers Render.** L'ancienne BA-008 est obsolète.

### Dernier état vérifié

- Le panneau MochaHost est connecté et inspecté : forfait **bolon.ca Ultimate** actif, compte `bolonca`, WordPress à sa racine dédiée, Node **24.22.1** et Passenger disponibles. Aucune application BesoinAvocat créée. `portail.besoinavocat.ca` est proposé, pas déclaré en service.
- GitHub : droits **admin/push** confirmés par le connecteur; `git push --dry-run origin HEAD:refs/heads/codex/espace-client-avocat` a réussi, sans push réel. Le client `gh` local n'est pas authentifié mais l'accès Git testé fonctionne. Vérifier la branche/les changements avant toute livraison.
- Sauvegarde privée WordPress : base **194 722 770 octets**, mode **0600**; WXR **348 pages dont 347 publiées**, SHA-256 `22d660865b220ec52e4a1cef2b65598e8e3baee9c77f6e29050f49dce9268b79`. Aucun export, contenu privé ou emplacement de session d'administration à publier dans Git.
- Correction exécutée : **12 mentions JuriGo dans 9 pages**, contrôles SHA et transaction; dates, URL et autres contenus conservés lors de la comparaison des **347 pages publiées**.
- Réglages généraux harmonisés : titre **BesoinAvocat**, description « Préparez votre dossier et votre recherche d’avocat. ». La page **5820** `/tableau-de-bord/` est **publiée**, avec le seul shortcode `[besoinavocat_dashboard]`; le slug était absent auparavant et aucune page n'a été supprimée.
- Plugin `wordpress/besoinavocat-experience` **0.1.2 installé et actif**, empreinte du paquet vérifiée, trois lint PHP et `check-render.php` réussis sur serveur. Yan Romanowski reste le seul partenaire déclaré par le propriétaire, sans vérification professionnelle indépendante revendiquée. Mentions 800/839 absentes de l'accueil contrôlé, footer/liens conservés, aperçu accessible depuis l'accueil, trois onglets et touche Début fonctionnels, console sans erreur/alerte.
- Le chevauchement de la 0.1.1 est **résolu à 1 265 px** : quatre widgets x=78, largeur 570 px, carte x=836; pas de débordement horizontal. Téléphone correct dans header/footer. Six articles ciblés : une seule note chacun, 800 absent et recommandation Thetford remplacée. Voir [WORDPRESS_QA.md](WORDPRESS_QA.md); ne pas étendre ce résultat aux tailles mobiles non contrôlées.
- Prix professionnels à définir; demande toujours gratuite pour les clients, distincte des honoraires et options payantes. Téléphone de contact **514-825-2825** publié; aucun service de téléphonie automatisée ou paiement activé.

Le tableau de bord WordPress publié est un **aperçu uniquement**. L'utilisateur a réaffirmé que **WordPress doit rester la vitrine, Node.js le vrai backend, TAKATAK l'autorité d'identité**. Le projet de plugin WordPress de dossiers a été interrompu : ne pas le reprendre, le publier ou le traiter comme une solution temporaire. L'application Node et sa connexion réelle restent à déployer et raccorder.

### Livré dans cette branche

- `platform/server.mjs`, `lib/`, `public/` : API Node/SQLite persistante et interface française, dossiers, permissions, pièces/versions/provenance/SHA, recherche, messages, temps soumis/validé, audit.
- Adaptateur d'identité TAKATAK dédié, désactivé sans configuration valide; le contrat proposé **n'existe pas encore comme raccordement vérifié**. Aucun mot de passe parallèle, compte créé ou jeton public de secours.
- Aperçu fictif entièrement local, sans appel API, lecture seule; IA, voix et crédits désactivés.
- Préparation d'import sous forme de manifeste uniquement, sans transfert. Les données réelles et le manifeste sont ignorés par Git; les originaux et le paquet de 312 annexes restent dans le dossier maître.
- Workflow de tests du pilote et guide MochaHost/WordPress. `site/` n'a pas été modifié.
- Lanceur CommonJS/ESM pour Passenger, archive de déploiement à liste blanche sans données privées et guide [CPANEL_NODE.md](CPANEL_NODE.md). Le paquet n'a pas encore été exécuté sous Passenger distant.

### Preuves

**49 tests Node réussis** sous Node 24.19.0 : 12 site + 32 pilote + 5 Passenger. L'exécution locale autorisée était nécessaire aux connexions localhost et aux jonctions Windows; les deux échecs sous sandbox n'ont pas été ignorés. Les 3 tests Python du constructeur de paquet passent également. Ces résultats locaux ne remplacent pas un contrôle réel Node 24.22.1/Passenger sur l'hébergement.

Contrôle visuel desktop et navigation dans l'aperçu local : dossiers, recherche fictive avec retour à la provenance, échanges désactivés, temps, changement de dossier, connexion non activée, aucune erreur/alerte console. Le contrôle d'import local a vérifié **1 185 documents et 1 689 références de chemins** sans téléverser ni modifier les sources. Voir `docs/PLATFORM_QA.md`; ne pas attribuer ces contrôles à une CI distante sans résultat correspondant au commit livré.

### Prochaine action exacte

1. Lire `docs/PLATFORM_ARCHITECTURE.md`, `platform/README.md`, `docs/MOCHAHOST_WORDPRESS.md` et `docs/CPANEL_NODE.md`. Vérifier l'état distant réel pour éviter de refaire une opération déjà exécutée.
2. Consulter `docs/WORDPRESS_QA.md`; compléter les contrôles mobiles et la revue éditoriale restante sans réinstaller la 0.1.2 déjà active. Conserver les preuves de la correction du bandeau et les limites du contrôle réalisé. La page professionnels publique a aussi été rechargée : trois offres/conditions à définir, introduction et FAQ à trois blocs conformes aux corrections ciblées; les autres slogans historiques ne sont pas tous audités.
3. Confirmer les chemins privés hors de tous les document roots, la persistance et le nombre de processus Passenger. Créer seulement le portail dédié prévu, puis vérifier HTTPS, `/api/health`, les refus 401/503 sans identité, les assets et l'inaccessibilité du code/stockage. Conserver WordPress et le site Render indépendants.
4. Définir et tester le vrai contrat TAKATAK BesoinAvocat ainsi que le flux navigateur. L'ancien contexte Supabase, l'API 1LV et le JWKS Bluesky ne donnent pas automatiquement l'accès à ce produit.
5. Réaliser sauvegarde/restauration applicative et contrôles de production, puis un petit import avec comparaison d'empreintes et deux comptes distincts. L'outil d'import actuel refuse `--execute`; il ne transfère pas de pièces.
6. Ajouter le lien WordPress vers le portail seulement après vérification de son URL HTTPS. Crédits, IA, Twilio et accès fichiers distants constituent les étapes suivantes, pas des fonctions actives.

Aucune facture ni nouvelle permission, aucun courriel ou message à des tiers n'a été envoyé. Le serveur de contrôle local écoute uniquement `127.0.0.1:8787` sans identité configurée. Son éventuelle disponibilité dépend du processus local; ce n'est pas un hébergement à distance.

## Historique conservé — 16 octobre 2026

Les instructions et statuts ci-dessous décrivent l'ancienne livraison d'orientation. Pour le nouveau mandat, appliquer la reprise courante ci-dessus.

**Date historique : 16 octobre 2026** · Dépôt `takatakca/BESOINAVOCAT.CA` · Branche `main`.

## Dernière tâche terminée
- BA-007 (partie automatisée) : tests Chromium mobile, clavier, formulaire, erreurs, impression, captures et revue visuelle.
- Défauts identifiés et corrigés : symbole central masqué (`22e8970`) et titres d'engagements trop grands (`2cd5be9`).
- Dernier commit de code réellement validé : `2cd5be9990b8671c5189303c4315aff5c02671b8`. Le commit de documentation contenant ce rapport est ultérieur; le SHA HEAD exact se lit depuis GitHub.

## Vérifications réalisées
- GitHub : arbre de `main`, derniers commits, PR ouvertes (0), issues ouvertes (0), workflows et permissions vérifiés.
- Node Quality checks **success** : run `38852776970`.
- Browser QA Chromium **success** : run `38852776863` (320, 375, 768, 1440 px, clavier, formulaire, CSS print, sans JS errors).
- Production HTTPS smoke **success** : run `38852826709`.
- Render deploy **live** au SHA `2cd5be9` : `dep-db8qqms9v7es7397801g`.
- Captures finales de desktop et mobile inspectées; symbole § visible et titres compacts. Détails `docs/QA_REPORT.md`.
- Commandes couvertes par CI/QA : `node --check site/app.js`, `node --check site/guide.mjs`, `node --test tests/*.test.mjs`, `python scripts/browser_qa.py`, `node scripts/production-smoke.mjs`.

## Tâche actuellement en cours
- BA-007 reste ouverte uniquement pour une validation humaine NVDA/VoiceOver, appareils physiques, Safari/Firefox et audit d'accessibilité complet.
- BA-008 était bloquée le 16 octobre; elle est **obsolète depuis le 26 octobre**. Le WordPress HTTPS confirmé chez MochaHost doit rester en place.
- BA-009/BA-010 : décisions métier et conformité avant comptes, annuaire ou traitement de dossiers.

## Fichiers modifiés
- Créés : `scripts/browser_qa.py`, `requirements-qa.txt`, `.github/workflows/browser-qa.yml`, `docs/QA_REPORT.md`.
- Modifiés : `site/styles.css`, `.gitignore`, `AGENTS.md`, `README.md` et les cinq fichiers `docs/PROJECT_STATUS.md`, `TASK_QUEUE.md`, `AGENT_HANDOFF.md`, `DEPLOYMENT.md`, `DECISIONS.md`.

## Blocages et accès nécessaires
- GitHub push `main` et Render lecture/déploiement fonctionnent; hébergement Render `https://besoinavocat.onrender.com` avec autoDeploy.
- Constat historique du 16 octobre : accès DNS/registrar non confirmé. Il ne doit plus conduire à proposer un raccordement du domaine WordPress à Render.
- Définition et approbation du périmètre juridique et de la protection des données obligatoires avant profils professionnels, comptes TAKATAK ou mise en relation.
- Ne pas créer de faux professionnels, de collecte de données confidentielles, de backend payant ou de seconde identité.

## Prochaine action exacte
1. Lire `AGENTS.md`, ce fichier, `docs/TASK_QUEUE.md`, `docs/QA_REPORT.md`.
2. Lire SHA HEAD, CI, Browser QA, smoke et Render du dernier commit; distinguer commit de code et commit documentaire.
3. Réaliser la partie humaine BA-007 sur NVDA/VoiceOver et appareils réels, corriger les défauts prouvés.
4. Instruction historique annulée le 26 octobre : ne pas raccorder `besoinavocat.ca` à Render; suivre la reprise courante pour le portail distinct.
5. Conserver en attente BA-009/BA-010 avant de commencer annuaire, comptes ou dossiers juridiques.
