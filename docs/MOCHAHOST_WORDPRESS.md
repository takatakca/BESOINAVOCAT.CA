# Raccordement de besoinavocat.ca

**État au 26 octobre 2026 :** domaine et hébergeur confirmés par le propriétaire. La page WordPress publique a été ouverte. Le panneau [MochaHost](https://clients.mochahost.com/login) attend une connexion; aucun paramètre, DNS ou compte n'a été modifié.

## Ce que l'accès permettra de vérifier

1. L'offre et le serveur qui hébergent réellement besoinavocat.ca, l'administration WordPress associée et les sauvegardes disponibles.
2. La présence d'une application Node.js, sa version, le lancement de processus persistants et le stockage hors des fichiers publics. Le pilote utilise Node.js 24; un forfait WordPress ne prouve pas la disponibilité de ce moteur.
3. L'URL retenue pour l'espace client, par exemple un sous-domaine, ses certificats et la méthode de déploiement. Aucun sous-domaine n'est créé par ce document.
4. Le raccordement TAKATAK et le compte du propriétaire. L'adresse courriel demandée ne suffit pas à prouver une session ni à créer un accès.

## Installation préparée, à exécuter sur l'hébergement vérifié

- Conserver une sauvegarde WordPress et un retour possible avant de modifier le menu.
- Installer `platform/` comme application serveur, jamais comme dossier public contenant sa base et ses pièces. Ne pas copier `.env`, `data`, `uploads` ou `private-imports` dans la bibliothèque média WordPress.
- Définir les secrets dans le gestionnaire de l'hébergeur. Configurer un stockage persistant, un seul processus pour le pilote SQLite, sauvegarde/restauration et HTTPS.
- Vérifier le vrai contrat TAKATAK, le parcours de connexion, deux comptes séparés et l'accès à chaque dossier. Sans ce raccordement, seule la présentation sans données réelles est accessible.
- Lorsque l'URL privée fonctionne et les contrôles passent, ajouter le lien « Mon dossier » au menu WordPress. Il s'agit d'une navigation; un compte administrateur WordPress ne donne pas automatiquement accès aux pièces.
- Importer un petit lot contrôlé, comparer ses empreintes et vérifier les documents avec le propriétaire avant de transférer le dossier complet.

Si le forfait ne propose pas le serveur requis, WordPress peut rester chez MochaHost et le portail utiliser un serveur distinct. Aucun abonnement ni changement d'offre n'est décidé à ce stade.

## Limites actuelles

Le code GitHub ne déploie pas automatiquement le backend chez MochaHost. Le service Render existant publie uniquement `site/`. Le pilote n'est pas encore un service client en production : connexion réelle, paiements, IA, Twilio et assistance à distance restent à raccorder et à tester.
