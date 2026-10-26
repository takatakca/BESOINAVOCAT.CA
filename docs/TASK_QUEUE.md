# TASK_QUEUE — BESOINAVOCAT.CA

Tâches ordonnées; les tâches bloquées ne doivent pas interrompre celles qui restent indépendantes.

## Mandat du 26 octobre — portail client/avocat

| ID | Statut | Travail / preuve attendue |
|---|---|---|
| BA-015 | codé, tests locaux réussis | API Node/SQLite, permissions par dossier/organisation, pièces SHA/versions/provenance, recherche, messages, temps et audit. |
| BA-016 | aperçu desktop contrôlé | Interface FR-CA, aperçu fictif, connexion non activée clairement annoncée. Tests de vrais comptes encore requis. |
| BA-017 | manifeste local contrôlé | Inventaire d'import sans transfert, rapprochement des empreintes et versions du maître; aucun téléversement. |
| BA-018 | accès requis | Administration MochaHost et WordPress connectée; vérifier forfait, moteur Node, disque et HTTPS. Domaine confirmé besoinavocat.ca. |
| BA-019 | contrat réel requis | Authentification TAKATAK spécifique à BesoinAvocat, flux navigateur, révocation et tests avec deux comptes. Aucun compte parallèle. |
| BA-020 | à réaliser avant production | Sauvegarde/restauration, quotas, protection des téléversements, supervision, contrôle du stockage et du parcours complet. |
| BA-021 | futur raccordement | IA sourcée, voix/Twilio et crédits : tarifs, compte, consentements, budgets et événements vérifiés. |
| BA-022 | futur parcours | Collaboration à distance sur fichiers choisis; pas d'accès permanent au disque. |

Le nouveau mandat autorise l'implémentation locale auparavant en attente. Il ne transforme pas les modules futurs en fonctions déployées. Les décisions et contrôles de production restent distincts.

## Historique du site d'orientation

| ID | Priorité | Statut | Travail | Validation |
|---|---|---|---|---|
| BA-001 | P0 | livré | Recherche par mot-clé et synonymes, navigation/affichage accessibles | tests de recherche |
| BA-002 | P0 | livré | Ressources officielles contextuelles selon le domaine | tests liens et mapping |
| BA-003 | P0 | livré | Page 404, health.json, copie/impression du plan | tests structure |
| BA-004 | P0 | livré (smoke public réussi) | Contrôles GitHub Actions et smoke quotidien/post-CI du site | CI + workflow planifié |
| BA-005 | P0 | livré | Cinq fichiers de suivi et AGENTS.md | présence dans main |
| BA-006 | P0 | livré (CI + Render) | Exécuter la CI après les derniers commits et confirmer un déploiement Render au SHA exact | Actions success + Render live |
| BA-007 | P1 | Chromium automatisé réussi; manuel restant | Clavier, écran 320–1440, formulaire, impression et captures validés; NVDA/VoiceOver et appareils physiques à réaliser | [QA_REPORT.md](QA_REPORT.md) |
| BA-008 | P1 | bloqué externe | Raccorder `besoinavocat.ca` | preuve propriété DNS, domaine ajouté sur Render, TLS |
| BA-009 | P0 produit | décision requise | Arrêter le modèle de service : annuaire, référence, mise en relation ou consultation; responsables/contrats | décision métier écrite |
| BA-010 | P0 sécurité | décision requise | Désigner responsable confidentialité, finalités, stockage, rétention, accès, consentements et examen juridique | documents approuvés |
| BA-011 | P1 | dépend de 009-010 | Vérification/inscription volontaire de professionnels, permissions, suppression et signalement | tests serveur + audit |
| BA-012 | P1 | dépend de 009-011 | SSO TAKATAK et habilitations par produit; aucun système d'identité parallèle | tests d'isolation tenant |
| BA-013 | P2 | dépend de 010-012 | Demandes de consultation minimisées, sécurité, prévention d'abus, purge et traçabilité | tests E2E/sécurité |
| BA-014 | P2 | après BA-013 | Observabilité, sauvegardes, reprise, conformité et monitoring applicatif | procédures et exercices |

La validation humaine BA-007 reste ouverte. Le mandat du 26 octobre définit le nouveau travail exécutable ci-dessus; les accords et mesures applicables à l'ouverture commerciale demeurent à finaliser avant production.

Ne pas présenter les BA-011 à BA-014 comme implémentées.
