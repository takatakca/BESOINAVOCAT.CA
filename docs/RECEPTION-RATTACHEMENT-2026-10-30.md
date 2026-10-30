# Réception du rattachement des dossiers — 30 octobre 2026

## Incident d'hébergement — 11:24 UTC (07:24 à Montréal)

**Portail indisponible au contrôle du 30 octobre à 11:22:04.614 UTC, avec validation TLS normale.** La page, les fichiers publics et les routes contrôlées renvoient 503; l'endpoint de santé renvoie du HTML au lieu du JSON attendu. Coolify échoue également : création de ressource et terminal en erreur 500 avec une limite mémoire de 268435456 octets, vues canvas et Files en 504. La cause n'est pas établie. Un déploiement concurrent observé ne constitue pas une preuve de causalité.

Le contrôle de rattachement réussi ci-dessous précède cet incident. Il reste une preuve de trois dossiers accessibles sur le serveur à ce moment, **pas une recette utilisateur ni une preuve de disponibilité actuelle**. Le principal a demandé l'accès à la console VPS et envoyé une alerte de coordination au seul compte du propriétaire. Aucune ressource vitrine créée ni bascule DNS confirmée. Reprendre par la disponibilité de l'hôte et la santé du portail avant import CNESST ou changement DNS.

Preuves dans le dossier de travail privé OneDrive `scripts/.build-livrables/node-portal-2026-10-30/` :

- `CONTROLE-HTTPS-2026-10-30T11-22-04-614Z.json` : résultat daté en échec;
- `COOLIFY-CREATION-VITRINE-500.png` : erreur de création de ressource;
- `RATTACHEMENT-RESTAURE.png` : contrôle antérieur de la correction.

**Traçabilité des contrôles :** le fichier JSON utilisé pour le contrôle de 09:51 avait été écrasé par une nouvelle exécution à 11:20, en échec DNS dans le sandbox. Ce dernier résultat a été archivé comme `CONTROLE-SANDBOX-2026-10-30T112054.json`; il ne doit pas être présenté comme le reçu original de 09:51. Les comptes rendus et la capture de 09:51 restent disponibles. Le script privé écrit désormais des noms horodatés avec création exclusive pour éviter cet écrasement. Aucune reconstitution du JSON original n'est annoncée, et aucune pièce juridique d'origine n'a été touchée.

[Fiche de diagnostic et option encadrée pour l'intervenant VPS](INCIDENT-COOLIFY-2026-10-30.md). Cette procédure préparée ne constitue pas une réparation exécutée.

## Historique de réception — 11:15 UTC

## Accès et correction effectuée

La session du propriétaire a été observée active dans le navigateur, avec **zéro dossier affiché**. Le contrôle en lecture seule de la base effectivement utilisée par le conteneur a retrouvé **trois dossiers, 1 362 documents, 3 101 unités et trois appartenances**. Les pièces n'avaient donc pas disparu et la base active n'était pas vide.

Le même propriétaire historique disposait de l'habilitation produit, mais son rattachement d'espace différait de celui des trois appartenances. Après comparaison à l'original privé vérifié, le principal a sauvegardé le fichier courant et rétabli le seul rattachement historique. Le propriétaire et le produit restent les mêmes; aucune nouvelle identité ou appartenance n'a été créée.

Contrôles après correction :

- **3 dossiers accessibles** pour l'identité historique selon le contrôle serveur;
- fichier d'habilitation en mode **0600** et empreinte exactement identique à l'original privé conservé;
- compteurs de la base inchangés : **3 / 1 362 / 3 101**;
- sauvegarde et preuves conservées dans OneDrive privé, sans identifiant personnel ou fichier d'habilitation dans ce dépôt.

**La reconnexion a été demandée au propriétaire. L'affichage des trois dossiers après correction, l'ouverture d'une pièce, la recherche avec citation et le téléchargement restent à vérifier dans sa nouvelle session.** Un contrôle serveur ne remplace pas cette recette.

## Code courriel

Le message de coordination TWILO du 30 octobre à 10:43 UTC annonce le remplacement de Maileroo par **Resend**, ainsi qu'un code livré et une connexion réussie. La session active a ensuite été observée dans le navigateur par le principal. Aucun nouveau code n'a été demandé, lu ou saisi par ce lot.

La fiche [Maileroo](DIAGNOSTIC-ENVOI-2026-10-30.md) décrit le diagnostic antérieur. **Ne pas réappliquer ses consignes DNS/SMTP sans relire la configuration actuelle.** Le problème courant traité ici était le rattachement aux dossiers.

## Quatrième dossier CNESST

Le lot local contient **six PDF et 27 pages**, avec originaux, versions, empreintes et provenance conservés dans l'espace privé. Ce lot est préparé pour l'import, mais **aucun quatrième dossier importé sur le serveur n'est confirmé à cette étape**. Les versions ne doivent pas être additionnées comme des faits ou montants distincts. Les limites et contrôles documentaires accompagnent les sources.

## Vitrine sans WordPress

Le domaine public sert encore WordPress sur l'ancien hébergement; le portail fonctionne sur Coolify. La production Coolify examinée ne montre qu'une ressource, celle du portail. Le principal prépare la ressource distincte destinée à la copie `www/` de GitHub, avec conservation des contenus.

Le courrier du domaine dépend encore de l'apex. **Séparer sa destination avant de déplacer l'adresse web**, puis vérifier le courrier et le certificat de la vitrine. Aucun DNS ni WordPress n'a été modifié par la correction de rattachement. La préparation d'une ressource ne signifie pas que la vitrine est déployée ou que la bascule est faite.

## Suite du lot

1. Vérifier la nouvelle session réelle : dossiers, pièce, recherche/source et téléchargement.
2. Importer le lot CNESST avec provenance, contrôle des versions et vérification de l'accès; confirmer ensuite le total de quatre dossiers.
3. Déployer et contrôler la copie `www/` avant la bascule DNS, puis suivre la séparation préalable du courrier.
4. Publier les preuves et les limites dans le journal et Google Drive. Les paiements, appels et autres modules externes ne sont pas activés par cette note.

Le code du workspace reste celui déployé au SHA `a3e20cc`; [réception précédente et contrôles HTTPS](RECEPTION-2026-10-30.md). Les originaux et la remise figée des 312 annexes sont préservés. Aucun dossier exhaustif ni parcours intégralement terminé n'est annoncé.
