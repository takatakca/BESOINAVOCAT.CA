# Fiche de réconciliation des notes — 4 novembre 2026, 08:50 UTC

Auteur : Claude (Cowork / Claude in Chrome, session 013t9Lv2). Lecture seule du dépôt (`main` à `0e71e5a`, PR 22) et visite du portail. Document ajouté par l'interface web GitHub du propriétaire; journal en ajout seul; aucun code, DNS, secret ni déploiement touché.

## 1. État vérifié aujourd'hui

- `portail.besoinavocat.ca` répond de nouveau (l'incident 503 du 30 octobre est résorbé), mais il sert encore le code du 29-30 octobre : aucune fusion du 4 novembre n'est déployée tant que Coolify n'est pas relancé (constat du fil principal à 07:34 UTC).
- La connexion du propriétaire échoue encore : Maileroo bloque le courriel du code. Un rapport de préparation en lecture seule existe maintenant : `node tools/deploy-readiness.mjs` dans le conteneur.
- Deux fils Claude actifs aujourd'hui, PR 16 à 22 fusionnées dans la matinée :
  - fil « Build BesoinAvocat to premium level » (branche `claude/project-thread-glrrpi`) : vitrine (témoins FR conservés, SEO), file `/demandes`, parcours guidé de demande, outil de préparation au déploiement, chiffrement AES-256-GCM optionnel des pièces, outil de scellement, cache de recherche (1,6 s → 0,1 s);
  - fil « Revamp portal dashboard to premium level » (branche `claude/project-thread-jc2sy5`) : cockpit premium (reprise de la PR 13, fermée car incluse), téléphonie par MIMT seulement (Twilio retiré), vidéo WebRTC, journal scellé, actes PDF, pièces demandées au client, accueil client simplifié.
- Tests au dernier passage (19:25 UTC, sur `main`) : 363/363 Node, 17/17 Python, 3/3 tests de l'archive; PR 15 à 34 fusionnées, aucune PR backend ouverte.

## 2. Les notes du dépôt, rangées par rôle

- A. Règles et références durables : `AGENTS.md`, `docs/JOURNAL-AGENTS.md` (la source la plus à jour — toujours lire en premier), `DECISIONS.md`, `PRODUCT_ROADMAP.md`, `RELEVE.md`.
- B. Les cinq documents de statut : `PROJECT_STATUS`, `TASK_QUEUE`, `AGENT_HANDOFF`, `DEPLOYMENT`, `DECISIONS`. Leur section « État vérifié — 4 novembre » est tenue à jour par le fil backend à chaque étape; les points du 30 octobre conservés plus bas décrivent une panne résorbée.
- C. Guides techniques durables : `PLATFORM_ARCHITECTURE`, `DEPLOYMENT`, `COOLIFY`, `CPANEL_NODE`, `BROWSER_AUTH`, `INTAKE_API`, `SEARCH`, `COMMUNICATIONS`, `INTEGRATIONS`, `CONNECTEURS-OPTIONNELS`, `QUESTIONNAIRE`, `STOREFRONT`, `ESPACE-DE-TRAVAIL`, `RECHERCHE-ET-DICTEE`, `MOCHAHOST_WORDPRESS`, `CONTENT_PRESERVATION`.
- D. Notes datées (historiques, ne pas réexécuter) : 26 oct. (`REPRISE-SUIVANTE`, `COPIE-GOOGLE-DRIVE`), 28 oct. (`DEV-A-FAIRE`, validations, inventaire), 29 oct. (`OTP-EMAIL-STATUS`, `VISION-PREMIUM`), 30 oct. (réceptions, diagnostic d'envoi, incident Coolify clos, `COCKPIT`, `INTEGRATION-MIMT`, `RELEVE-JURISTE`, `REPRISE-MIKE`), 31 oct. (`ESPACE-DESKTOP`), 4 nov. (`COCKPIT-PREMIUM-2026-11-04` — contient la liste de raccordement MIMT détaillée).

## 3. À faire par le propriétaire et Mike (consolidé des fils)

1. Relancer le déploiement Coolify du portail : le site en ligne = code du 29-30 octobre. Le workflow `coolify-deploy` a maintenant un bouton « Run workflow » et nomme lui-même les variables et secrets manquants.
2. Courriel de connexion : régler le blocage Maileroo / valider Resend, puis tester la réception réelle du code.
3. Variables Coolify : `BESOINAVOCAT_INTAKE_REVIEWERS` (sinon `/demandes` répond 404 à tous); raccordement MIMT (`BESOINAVOCAT_MIMT_API_KEY`, `…_WEBHOOK_SECRET`, `…_PUBLIC_NUMBER`, `BESOINAVOCAT_TEAM_MEMBERS`, TURN) — tableau complet dans `COCKPIT-PREMIUM-2026-11-04`; facultatif : `BESOINAVOCAT_BLOB_KEY_FILE` (chiffrement des pièces) et `BESOINAVOCAT_SESSION_DB_PATH` si 503 de sessions.
4. Côté MIMT : `PARTNERS=on`, forfait Affaires Pro, partenaire `besoinavocat`, clé API et webhook, entente Loi 25 signée avant la mise en service.
5. Relecture juridique : consentement `2026-11-04.1` de la demande guidée, et texte de l'avis d'enregistrement des appels.
6. Recette connectée : confirmer l'affichage des 3 dossiers (1 362 documents) une fois le courriel réglé, puis import CNESST v2 contrôlé (4 dossiers / 1 368 documents testés sur copie).
7. Vitrine : ressource Coolify pour `www/`, détacher le courriel de l'apex, puis bascule DNS (Mike, `DEV-A-FAIRE-2026-10-28` §3.4).
8. Confirmer le chiffre « plus de 6 000 références par mois » avant d'activer le balisage FAQPage.
