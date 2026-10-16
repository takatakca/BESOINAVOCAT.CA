# AGENTS.md — BESOINAVOCAT.CA

## Reprise obligatoire
1. Vérifier `main` avec GitHub (commits, branches, PR, issues, Actions).
2. Lire dans l'ordre `README.md`, `docs/PROJECT_STATUS.md`, `docs/TASK_QUEUE.md`, `docs/AGENT_HANDOFF.md`, `docs/DEPLOYMENT.md`, `docs/DECISIONS.md` et `docs/RELEVE.md`.
3. Vérifier le service Render réel et le dernier déploiement, puis reprendre la première tâche **autorisée et non bloquée**.
4. Garder le site opérationnel; ne pas recréer l'application de zéro ni effacer le travail d'un autre agent.

## Processus de livraison
- Utiliser des commits traçables et pousser sur `main` lorsque la version est sûre. Aucune réécriture d'historique, aucun force-push.
- Faire au minimum : `node --check site/app.js`, `node --check site/guide.mjs`, `node --test tests/*.test.mjs` avant la publication (ou vérifier la CI correspondante).
- Contrôler ensuite GitHub Actions, le résultat du déploiement Render et le smoke HTTP de production.
- Actualiser les cinq documents de statut et surtout `docs/AGENT_HANDOFF.md` avant d'arrêter. Ne jamais marquer « terminé » sans preuves.

## Produit et limites
- Le périmètre livré est **un parcours d'orientation public**, exécuté localement dans le navigateur. Aucun backend, compte client, annuaire propriétaire ou collecte de dossiers personnels.
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
