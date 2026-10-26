# AGENT_HANDOFF — BESOINAVOCAT.CA

## Reprise courante — 26 octobre 2026

**Dépôt :** `takatakca/BESOINAVOCAT.CA`. **Branche du pilote :** `codex/espace-client-avocat`, issue de `main` au SHA `b56d027c4172ddde5e362497731ac1ae80805fe0`. Lire le SHA courant dans Git pour la livraison exacte.

Le propriétaire a demandé un vrai espace client/avocat, en conservant WordPress pour la vitrine. Il a confirmé **besoinavocat.ca** et **MochaHost**. Le travail local de développement est autorisé. La conversion d'une vitrine existante, l'activation de comptes et de services payants ne doivent pas être prétendues réalisées.

### Livré dans cette branche

- `platform/server.mjs`, `lib/`, `public/` : API Node/SQLite persistante et interface française, dossiers, permissions, pièces/versions/provenance/SHA, recherche, messages, temps soumis/validé, audit.
- Adaptateur d'identité TAKATAK dédié, désactivé sans configuration valide; le contrat proposé **n'existe pas encore comme raccordement vérifié**. Aucun mot de passe parallèle, compte créé ou jeton public de secours.
- Aperçu fictif entièrement local, sans appel API, lecture seule; IA, voix et crédits désactivés.
- Préparation d'import sous forme de manifeste uniquement, sans transfert. Les données réelles et le manifeste sont ignorés par Git; les originaux et le paquet de 312 annexes restent dans le dossier maître.
- Workflow de tests du pilote et guide MochaHost/WordPress. `site/` n'a pas été modifié.

### Preuves

32 tests pilote et 12 tests du site existant réussis en local. Contrôle visuel desktop et navigation dans le navigateur : dossiers, recherche fictive avec retour à la provenance, échanges désactivés, temps, changement de dossier, connexion non activée, aucune erreur/alerte console. Le contrôle d'import local a vérifié les empreintes sans téléverser ni modifier les sources. Voir `docs/PLATFORM_QA.md` et les résultats GitHub de la branche/PR.

### Prochaine action exacte

1. Lire `docs/PLATFORM_ARCHITECTURE.md`, `platform/README.md` et `docs/MOCHAHOST_WORDPRESS.md`.
2. Attendre/inspecter la connexion utilisateur dans l'onglet MochaHost ouvert sur `https://clients.mochahost.com/login`. Ne pas demander de mot de passe dans le chat. Vérifier le forfait, WordPress, Node et le stockage avant de choisir le déploiement.
3. Définir et tester le vrai contrat TAKATAK BesoinAvocat ainsi que le flux navigateur. L'ancien contexte Supabase, l'API 1LV et le JWKS Bluesky ne donnent pas automatiquement l'accès à ce produit.
4. Réaliser les contrôles de production et sauvegarde, puis un petit import avec comparaison d'empreintes et deux comptes distincts. Le développement de l'import effectif reste à faire; l'outil actuel refuse `--execute`.
5. Ajouter le lien WordPress seulement vers l'URL HTTPS vérifiée. Crédits, IA, Twilio et accès fichiers distants constituent les étapes suivantes, pas des fonctions actives.

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
- BA-008 domaine `besoinavocat.ca` : bloqué faute de confirmation de contrôle DNS et certificat pour ce domaine.
- BA-009/BA-010 : décisions métier et conformité avant comptes, annuaire ou traitement de dossiers.

## Fichiers modifiés
- Créés : `scripts/browser_qa.py`, `requirements-qa.txt`, `.github/workflows/browser-qa.yml`, `docs/QA_REPORT.md`.
- Modifiés : `site/styles.css`, `.gitignore`, `AGENTS.md`, `README.md` et les cinq fichiers `docs/PROJECT_STATUS.md`, `TASK_QUEUE.md`, `AGENT_HANDOFF.md`, `DEPLOYMENT.md`, `DECISIONS.md`.

## Blocages et accès nécessaires
- GitHub push `main` et Render lecture/déploiement fonctionnent; hébergement Render `https://besoinavocat.onrender.com` avec autoDeploy.
- Accès DNS/registrar du domaine final non confirmés, aucun secret requis pour le site statique.
- Définition et approbation du périmètre juridique et de la protection des données obligatoires avant profils professionnels, comptes TAKATAK ou mise en relation.
- Ne pas créer de faux professionnels, de collecte de données confidentielles, de backend payant ou de seconde identité.

## Prochaine action exacte
1. Lire `AGENTS.md`, ce fichier, `docs/TASK_QUEUE.md`, `docs/QA_REPORT.md`.
2. Lire SHA HEAD, CI, Browser QA, smoke et Render du dernier commit; distinguer commit de code et commit documentaire.
3. Réaliser la partie humaine BA-007 sur NVDA/VoiceOver et appareils réels, corriger les défauts prouvés.
4. Confirmer les informations DNS nécessaires avant de raccorder `besoinavocat.ca` sur Render.
5. Conserver en attente BA-009/BA-010 avant de commencer annuaire, comptes ou dossiers juridiques.
