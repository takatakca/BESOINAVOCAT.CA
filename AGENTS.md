# AGENTS.md — BESOINAVOCAT.CA

## Reprise obligatoire
1. Vérifier `main` avec GitHub (commits, branches, PR, issues, Actions).
2. Lire dans l'ordre `README.md`, `docs/PROJECT_STATUS.md`, `docs/TASK_QUEUE.md`, `docs/AGENT_HANDOFF.md`, `docs/DEPLOYMENT.md`, `docs/DECISIONS.md` et `docs/RELEVE.md`.
3. Vérifier le service Render réel et le dernier déploiement, puis reprendre la première tâche **autorisée et non bloquée**.
4. Garder le site opérationnel; ne pas recréer l'application de zéro ni effacer le travail d'un autre agent.

## Notes, signatures et coordination — obligatoire (propriétaire, 29 octobre 2026)
Chaque agent laisse une trace de tout ce qu'il fait, **avant, pendant et après**, sur **GitHub et Google Drive**, pour que personne n'écrase le travail d'un autre.
1. **Avant de toucher au code** : lire [docs/JOURNAL-AGENTS.md](docs/JOURNAL-AGENTS.md), puis y ajouter une entrée `DÉBUT`. Elle donne :
   - la signature et l'heure;
   - la branche;
   - les fichiers ou zones réservés;
   - le but.
   Pousser cette entrée sur GitHub et la recopier dans le journal Drive (dossier partagé `11B5CeNU_lZgO2VFA_fzejoLJNkSZdnv-`, fichier « BesoinAvocat — JOURNAL DES AGENTS »).
2. **Pendant** : ajouter une entrée `ÉTAPE` à chaque livraison partielle, et signer chaque commit dans son message.
3. **À la fin** : ajouter une entrée `FIN` avec le résultat, les preuves, ce qui reste et les zones libérées. Mettre aussi à jour les cinq documents de statut.
4. **Format d'une ligne** : `AAAA-MM-JJ HH:MM UTC · Agent (outil, session) · ÉTIQUETTE · branche · zones · résumé`. Étiquettes : `DÉBUT`, `ÉTAPE`, `FIN`, `ALERTE`, `REPRISE`.
5. **Ne jamais écraser le travail d'un autre** :
   - une zone réservée dans une entrée `DÉBUT` sans `FIN` appartient à son agent : se coordonner par une entrée `ALERTE` avant d'y toucher;
   - le journal est en ajout seul : on ne supprime ni ne réécrit la note d'un autre;
   - avant chaque push : `git fetch`, puis intégrer `main` sans réécriture d'historique.
6. **Aucun secret** dans le journal, ni sur GitHub ni sur Drive.

## Processus de livraison
- Utiliser des commits traçables et pousser sur `main` lorsque la version est sûre. Aucune réécriture d'historique, aucun force-push.
- Faire au minimum : `node --check site/app.js`, `node --check site/guide.mjs`, `node --test tests/*.test.mjs` avant la publication (ou vérifier la CI correspondante).
- Contrôler ensuite GitHub Actions, le résultat du déploiement Render et le smoke HTTP de production.
- Actualiser les cinq documents de statut et surtout `docs/AGENT_HANDOFF.md` avant d'arrêter. Ne jamais marquer « terminé » sans preuves.

## Produit et limites
- Le site publié dans `site/` est **un parcours d'orientation public**, exécuté localement dans le navigateur. Le mandat confirmé le 28 octobre remplace WordPress par la vitrine `www/` et le portail Node `platform/` sur Coolify, contenus et sauvegardes conservés. La bascule appartient au développeur du propriétaire : lire `docs/DEV-A-FAIRE-2026-10-28.md`. Ne plus développer WordPress; conserver son code historique sans l'effacer.
- Le backend local est un pilote; l'autorité TAKATAK, la connexion navigateur, le serveur MochaHost et les services payants ne sont pas encore raccordés. Ne pas annoncer une activation en production sur la seule base du code ou de tests injectant une identité fictive.
- Exécuter aussi `node --test platform/test/*.test.mjs` avec Node 24.19.x avant livraison du pilote. Ne jamais publier les données `.data/`, les manifestes privés, secrets ou dossiers réels dans ce dépôt public.
- Ne pas inventer d'avocats, de profils « vérifiés », d'avis, de disponibilité ou de recommandations professionnelles.
- Le site n'est ni un cabinet d'avocats ni un service de conseils juridiques; maintenir des avertissements lisibles et de vrais liens institutionnels.
- Ne pas collecter des données sensibles ou lancer une plateforme de mise en relation sans consentement, revue juridique, mesures de sécurité, responsable de la vie privée et périmètre métier approuvés.
- Si une authentification est ajoutée dans un futur mandat approuvé, utiliser l'autorité d'identité TAKATAK et des habilitations isolées par produit/tenant; ne pas créer une autorité d'identité parallèle.
- Ne pas modifier AHM Verdun, TAKATAK-V1 ou d'autres dépôts dans cette mission.
- Aucune nouvelle infrastructure payante sans autorisation. Aucun secret en dépôt.

## Continuité
Un fichier AGENT_HANDOFF ne lance pas automatiquement de nouvelle session. La surveillance quotidienne GitHub Actions vérifie seulement l'accessibilité. Un orchestrateur externe explicitement configuré serait nécessaire pour relancer un agent de développement.

## QA de navigateur
- Lancer `python scripts/browser_qa.py` avec Playwright et Chromium installés; voir `docs/QA_REPORT.md`. Les tests enregistrent des captures d'écran via GitHub Actions.
- Une QA Chromium automatisée n'est pas une certification WCAG ni un test physique avec lecteur d'écran.
