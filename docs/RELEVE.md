# Relève — BESOINAVOCAT.CA

État de reprise du 26 octobre 2026. Lire [AGENTS.md](../AGENTS.md), [AGENT_HANDOFF](AGENT_HANDOFF.md), [PROJECT_STATUS](PROJECT_STATUS.md) et [TASK_QUEUE](TASK_QUEUE.md).

## Priorité du propriétaire

**Faire fonctionner le backend et son accès aux dossiers avant de poursuivre la vitrine.** WordPress reste sur besoinavocat.ca; le portail Node est distinct sur portail.besoinavocat.ca; Render conserve le site d'orientation indépendant.

## État réellement acquis

- Branche locale/distante contrôlée : `codex/espace-client-avocat` à `ee278313707bbec608c15df11e402decce66f7ee`. `main` reste à `b56d027c4172ddde5e362497731ac1ae80805fe0`; trois commits d'avance, aucun retard. [PR 1](https://github.com/takatakca/BESOINAVOCAT.CA/pull/1) en brouillon.
- CI Quality, Browser et Platform réussie au SHA `ee27831`; aucune extension de cette preuve aux modifications locales ultérieures. Les anciens comptes de tests décrivent des étapes antérieures.
- WordPress 0.1.2 actif avec aperçu publié et contrôles ordinateur consignés. Articles, informations, URL et sauvegardes préservés; les contrôles mobiles/nouveaux parcours FR/EN restent à réaliser sur leur version livrée.
- Portail Node technique créé chez MochaHost sous Passenger/Node 24.22.1. Le contrôle HTTP courant confirme health 200 (`mode: pilot`, `identityConfigured: false`) et dossiers anonymes 401. **La v2 connexion/corpus n'est pas installée : archive refusée par l'antivirus MochaHost.**
- Corpus importé localement, sauvegarde vérifiée puis restaurée localement; copie privée distante avec empreinte concordante. **Aucune restauration ni activation du corpus dans le portail distant.** Originaux et paquet de 312 annexes inchangés.
- Configuration privée préparée, mais **aucun test réel de connexion utilisateur ou de consultation du corpus en production**. Ne pas annoncer que son mot de passe a été configuré.
- Render contrôlé par API : service `srv-db7srnmi0phs73ahkue0`, déploiement `dep-db8qsb6k1f9s73epefs0` live au SHA de `main`; publication de `site/`, autoDeploy actif. Le smoke public du 26 octobre réussit.

## Prochaine étape

Obtenir l'analyse du paquet v2 exact refusé par MochaHost, sans contourner l'antivirus. Après résolution documentée : installer la version validée, contrôler les protections, faire utiliser l'identité TAKATAK existante, restaurer le corpus en destination privée contrôlée puis vérifier les trois dossiers, pièces, citations et déconnexion. Raccorder ensuite la vitrine au portail réellement utilisable. Les détails et preuves sont dans [DEPLOYMENT](DEPLOYMENT.md) et [CPANEL_NODE](CPANEL_NODE.md).

Les modules de parcours/formulaire `intake` / `funnel` sont **en cours localement, non déployés**. Aucun formulaire, paiement ou accès ne doit annoncer un succès qui n'a pas eu lieu. Pas de nouvelle permission ni autorité de mots de passe parallèle.

## Conditions de produit

Demandes clients **toujours gratuites**. Avocats : **100 CAD/semaine ou 300 CAD/mois**, **crédits IA en supplément**; honoraires juridiques distincts. Ces conditions remplacent « prix à définir », sans activer souscription, facturation, IA ou voix. Téléphone de contact : **514-825-2825**, sans assistant automatisé annoncé.

Préserver informations, articles, originaux, preuves contraires, URL et codes; corriger seulement les anciennes marques d'opérateur ou affiliations promotionnelles injustifiées. Les cabinets cités dans des articles ne deviennent pas des partenaires. Les doublons et versions ne s'additionnent pas; les OCR restent à contrôler sur les pièces.

Aucun Git, déploiement, compte, mot de passe ou état du dossier juridique n'a été modifié par cette mise à jour des documents.

## Lot local contact et WordPress 0.2.0

Catalogue et réception privée, parcours FR/EN, tarifs 100 CAD/semaine ou 300 CAD/mois et corrections éditoriales ciblées préparés; 133 tests Node et 12 tests Python réussis. Aucun déploiement ni nouvel accès réel. PHP et contrôle visuel WordPress à confirmer avant publication. Voir [INTAKE_QA.md](INTAKE_QA.md) et [INTAKE_API.md](INTAKE_API.md). Les états du contrôle Git préalable ci-dessus ne décrivent pas le nouveau commit de ce lot.
