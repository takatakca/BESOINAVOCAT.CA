# PROJECT_STATUS — BESOINAVOCAT.CA

**État : site public d'orientation (MVP fonctionnel), développement commercial avancé non encore approuvé.**  
Révision : 15 octobre 2026.

## Dépôt et exécution
- GitHub : \`takatakca/BESOINAVOCAT.CA\`, branche \`main\`.
- Render : \`besoinavocat\`, URL \`https://besoinavocat.onrender.com\`, service \`srv-db7srnmi0phs73ahkue0\`.
- Déploiement de nouveaux commits : \`autoDeploy=yes\`. Pas de base de données ni de serveur applicatif.
- GitHub Pages facultatif volontairement désactivé; la publication principale reste Render.
- Domaine \`besoinavocat.ca\` : raccordement DNS/SSL non vérifié, **ne pas déclarer en ligne sur ce domaine**.

## Livré et réellement codé
- Interface responsive FR-CA, 8 domaines juridiques et liste des régions du Québec.
- Recherche textuelle instantanée des domaines (accents et mots-clés) traitée localement.
- Plan de recherche avec niveau d'urgence et option aide juridique; aucune identité, aucune donnée libre ou sensible demandée.
- Liens institutionnels et ressources contextuelles (CNESST, TAL, JuridiQC, Barreau, CSJ).
- Copier/imprimer le plan, navigation clavier, messages d'état, repli JavaScript désactivé.
- Pages confidentialité, conditions, 404 et \`/health.json\`.
- CI : tests unitaires et vérification de la structure HTML; smoke public quotidien et déclenchable manuellement.

## Non implémenté — ne pas confondre avec un bug
- Annuaire propriétaire, fiches d'avocats, onboarding professionnel, statut Barreau vérifié et consentement.
- Comptes TAKATAK, permissions multi-tenant, API et base de données.
- Demandes de consultation, messagerie, paiements, traitements de pièces confidentielles, tableau de bord professionnel.
- Raccordement du domaine personnalisé et conformité définitive avant exploitation commerciale de ces fonctionnalités.

## Qualité / risques
- Les tests Node.js ne remplacent pas une revue d'accessibilité avec lecteur d'écran ni un test manuel mobile.
- Les logs HTTP et règles d'hébergement Render restent du ressort de l'exploitant/hébergeur.
- Les ressources officielles doivent être revérifiées périodiquement.
- Aucune collecte de dossier, donc pas de fonctionnalité serveur nécessitant des permissions actuellement.
- Avant toute nouvelle collecte de renseignements personnels, compléter la gouvernance de confidentialité.

## Critère de clôture
Le périmètre **MVP orientation** peut être clôturé après validation CI, smoke et revue visuelle; le « produit complet » au sens annuaire/marketplace reste ouvert en attente de définition métier et conformité.
