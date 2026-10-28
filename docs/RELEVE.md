# Relève — BESOINAVOCAT.CA

**Suite du 28 octobre — recherche et dictée :** [validation du second lot](VALIDATION-RECHERCHE-2026-10-28.md). 231 tests Node réussis, recherche globale autorisée et citations, dictée au clic, lecteur amélioré. Trois documents de travail ajoutés dans une nouvelle copie privée du corpus (1 362 occurrences / 1 185 empreintes / 3 101 unités), sauvegarde et restauration contrôlées. Le compte distant, le microphone physique et le déploiement restent à vérifier; IA générative non connectée. La PR 2 contient aussi ce lot.

**Lot du 28 octobre validé localement :** [preuve et limites](VALIDATION-LOT-2026-10-28.md). 200 tests Node, 14 tests Python, questionnaire FR/EN, rendez-vous/usages, catalogue optionnel sans paiement, inventaire des contenus. Le déploiement et la connexion réelle restent à faire avec Mike; la présentation est réservée au propriétaire.

## Reprise du 28 octobre — le développement est autorisé

Lire [la liste destinée à Mike](DEV-A-FAIRE-2026-10-28.md) et les ajouts courants de [PROJECT_STATUS](PROJECT_STATUS.md). Mike termine le DNS; l'agent construit et teste le code dans GitHub, sans intervention WordPress. Vitrine `www/` avec contenu conservé, backend Node `platform/`, identité TAKATAK et corpus privé séparé du dépôt public.

L'identité existante du propriétaire a été confirmée en lecture seule dans TAKATAK. Les grants et trois appartenances au corpus préparé concordent; reçu dans le OneDrive privé. Cela n'est pas une connexion au portail de production ni une vérification de mot de passe. Après déploiement, Mike doit vérifier la connexion réelle et les trois dossiers.

Les connecteurs sont optionnels pour chaque client; Zoom doit utiliser son autorisation OAuth, pas collecter son mot de passe dans BesoinAvocat. Le prix d'installation évoqué de 50 CAD est un exemple à confirmer. Chat interne, intégrations externes, frais d'usage et honoraires restent des rubriques distinctes.

Les sections ci-dessous sont historiques; leur consigne d'arrêt est levée. L'ancienne automatisation reste en pause : ce travail est celui du chat actif.

État de fin de session du 26 octobre 2026 : notes seulement, puis arrêt. **Lire en premier [REPRISE-SUIVANTE-2026-10-26.md](REPRISE-SUIVANTE-2026-10-26.md)**, puis [AGENTS.md](../AGENTS.md), [AGENT_HANDOFF](AGENT_HANDOFF.md), [PROJECT_STATUS](PROJECT_STATUS.md) et [TASK_QUEUE](TASK_QUEUE.md).

## Priorité du propriétaire

**Faire fonctionner le backend et son accès aux dossiers avant de poursuivre la vitrine.** WordPress reste sur besoinavocat.ca; le portail Node est distinct sur portail.besoinavocat.ca; Render conserve le site d'orientation indépendant.

## État réellement acquis

- Code CI `5a230e52c758a626f31be24abeef2cce5242b3c1` : quatre runs verts, 133 tests Node, 12 Python et trois suites PHP; liens dans [PROJECT_STATUS](PROJECT_STATUS.md).
- Les anciens pointeurs `codex/espace-client-avocat` à `ee27831` et `main` à `b56d027` sont conservés comme historique du contrôle précédent, pas comme état courant du nouveau code.
- **WordPress 0.2.1 installé avec succès via l'interface WP.** La 0.2.0 avait été contrôlée visuellement pour les prix 100/300 CAD et les articles 2186/4663/5082/5715. La 0.2.1 remet le CTA orange dans le flux normal; **contrôle visuel final du bloc prix à faire**. Funnel désactivé. Articles, informations, URL et sauvegardes conservés.
- Portail Node technique créé chez MochaHost sous Passenger/Node 24.22.1. Le contrôle HTTP courant confirme health 200 (`mode: pilot`, `identityConfigured: false`) et dossiers anonymes 401. **La v2 connexion/corpus n'est pas installée : archive refusée par l'antivirus MochaHost.**
- Corpus importé localement, sauvegarde vérifiée puis restaurée localement; copie privée distante avec empreinte concordante. **Aucune restauration ni activation du corpus dans le portail distant.** Originaux et paquet de 312 annexes inchangés.
- Configuration privée préparée, mais **aucun test réel de connexion utilisateur ou de consultation du corpus en production**. Ne pas annoncer que son mot de passe a été configuré.
- Render contrôlé par API : service `srv-db7srnmi0phs73ahkue0`, déploiement `dep-db8qsb6k1f9s73epefs0` live au SHA de `main`; publication de `site/`, autoDeploy actif. Le smoke public du 26 octobre réussit.

## Prochaine étape

Obtenir l'analyse du paquet v2 exact refusé par MochaHost, sans contourner l'antivirus. Après résolution documentée : installer la version validée, contrôler les protections, faire utiliser l'identité TAKATAK existante, restaurer le corpus en destination privée contrôlée puis vérifier les trois dossiers, pièces, citations et déconnexion. Raccorder ensuite la vitrine au portail réellement utilisable. Les détails et preuves sont dans [DEPLOYMENT](DEPLOYMENT.md) et [CPANEL_NODE](CPANEL_NODE.md).

Le module WordPress `funnel` est installé mais **désactivé**; la réception Node n'est pas activée. Le contrôle visuel final des prix 0.2.1 reste à reprendre. Aucun formulaire, paiement ou accès ne doit annoncer un succès qui n'a pas eu lieu. Pas de nouvelle permission ni autorité de mots de passe parallèle.

## Conditions de produit

Demandes clients **toujours gratuites**. Avocats : **100 CAD/semaine ou 300 CAD/mois**, **crédits IA en supplément**; honoraires juridiques distincts. Ces conditions remplacent « prix à définir », sans activer souscription, facturation, IA ou voix. Téléphone de contact : **514-825-2825**, sans assistant automatisé annoncé.

Préserver informations, articles, originaux, preuves contraires, URL et codes; corriger seulement les anciennes marques d'opérateur ou affiliations promotionnelles injustifiées. Les cabinets cités dans des articles ne deviennent pas des partenaires. Les doublons et versions ne s'additionnent pas; les OCR restent à contrôler sur les pièces.

Aucun Git, déploiement, compte, mot de passe ou état du dossier juridique n'a été modifié par cette mise à jour des documents.

## Clôture du lot contact et WordPress 0.2.1

Installation WordPress réussie et CI du code verte, y compris PHP; contrôle visuel final 0.2.1 ouvert. Node v1 reste à `identityConfigured: false`, v2 bloquée par l'antivirus, sans contournement. Aucun accès réel au corpus validé. Voir [INTAKE_QA.md](INTAKE_QA.md) et [WORDPRESS_QA.md](WORDPRESS_QA.md).
