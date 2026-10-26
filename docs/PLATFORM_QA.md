# Contrôles du pilote — 26 octobre 2026

## Tests exécutés

Node.js **24.19.0**, suites natives, données synthétiques et dossiers temporaires :

| Suite | Résultat | Portée |
|---|---|---|
| `platform/test/api.test.mjs` | 17 réussis | Refus anonyme, tenant et membre, provenance/versions/SHA, doublons, contrôle du téléchargement, entrées malformées, chemins, temps et audit. |
| `platform/test/identity.test.mjs` | 4 réussis | Contrat strict, configuration et refus par défaut; aucune identité de remplacement. |
| `platform/test/import-corpus.test.mjs` | 11 réussis | Manifestes sans transfert, chemins et liens, empreintes, provenance, sélection et sorties Git privées. |
| `tests/*.test.mjs` | 12 réussis | Régression du site d'orientation conservé. |

La suite HTTP utilise le serveur local avec une fonction de vérification injectée uniquement dans le processus de test. Elle ne prouve pas que la connexion TAKATAK réelle fonctionne. L'essai de préparation du corpus existant a également réussi en local, sans envoi et avec contrôle des empreintes. Le manifeste et le reçu détaillé restent hors du dépôt public.

## Contrôle navigateur

Le nouveau serveur a été démarré sur `127.0.0.1:8787` avec les paramètres d'identité vides. Dans le navigateur de l'application, les contrôles suivants ont réussi :

- Page `?demo=1` : titre, bandeau fictif, navigation, hiérarchie visuelle, lisibilité des sources et boutons d'écriture désactivés.
- Pièces : recherche « chronologie » donnant un résultat; ouverture de sa provenance et du texte fictif attribué comme analyse.
- Échanges : exemples explicitement fictifs, saisie et envoi désactivés.
- Temps : durée soumise séparée du temps validé; aucun débit; dossier secondaire vide affichant zéro minute.
- Sortie de l'aperçu : connexion TAKATAK désactivée avec explication claire. Aucune saisie de mot de passe ou jeton proposée.
- Retour à l'aperçu et capture finale. Aucune erreur ou alerte console enregistrée dans le contrôle.

Une revue indépendante du code a vérifié l'échappement des données affichées, la séparation session/dossier des réponses asynchrones, l'absence de requête API dans la démonstration, l'absence d'autoapprobation et les étiquettes de doublon/provenance. Les styles inline ont été supprimés pour respecter la CSP.

## Limites explicites

Pas de certification d'accessibilité, de test sur appareil mobile réel, d'audit externe de sécurité, de test de charge, de restauration de sauvegarde ni de parcours connecté avec des comptes TAKATAK réels. Aucun déploiement du backend chez MochaHost, aucune IA, voix, invitation ou facturation réelle. La vérification GitHub de la branche complète ces contrôles locaux; consulter ses résultats, sans les déduire de ce document.
