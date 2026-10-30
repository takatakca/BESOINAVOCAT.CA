# Relève — BESOINAVOCAT.CA

## État de remise du lot local — 30 octobre 2026, 11:34 UTC

**Le portail reste à rétablir par Mike ou l'agent serveur**, désigné par le propriétaire. Dernier contrôle public disponible : réponses 503 à 11:22:04 UTC, avec validation TLS normale. L'agent chargé des dossiers ne poursuit pas d'intervention sur le VPS; la [fiche de diagnostic](INCIDENT-COOLIFY-2026-10-30.md) et l'alerte de coordination lui ont été transmises. Aucun retour de disponibilité confirmé.

**Rattachement réparé avant l'incident :** même propriétaire et produit, trois dossiers accessibles au contrôle serveur, base inchangée (1 362 documents / 3 101 unités). La reconnexion et la recette authentifiée après correction restent ouvertes. **CNESST v2 :** paquet privé testé sur une copie, donnant **4 dossiers / 1 368 documents / 3 128 unités**; aucune importation serveur confirmée.

**Vitrine :** corrections locales des deux images, du lien contact et des formulaires historiques; contenu source préservé. Revue indépendante effectuée, défaut du contrôle de formulaires corrigé et **10/10 tests** réussis. Contrôle visuel de la page professionnelle sur ordinateur effectué, capture privée conservée. La vitrine n'est pas créée sur Coolify et aucun DNS n'est modifié. Publication GitHub, CI et réception distante doivent être consignées par le principal avant d'annoncer une livraison en ligne.

[Réception détaillée et suites](RECEPTION-RATTACHEMENT-2026-10-30.md). Priorité : rétablissement VPS, recette des trois dossiers, import CNESST contrôlé, puis vitrine et bascule DNS avec courrier préservé.

## Historique — alerte consignée à 11:24 UTC

**Le portail est actuellement indisponible.** Le contrôle HTTPS avec validation TLS normale du **30 octobre à 11:22:04 UTC** renvoie 503 pour la page, les ressources et les routes contrôlées; la santé renvoie du HTML au lieu du JSON attendu. Coolify présente aussi des erreurs 500 (limite mémoire de 256 Mio) et 504 sur ses vues. La cause de l'incident n'est pas établie; aucun déploiement concurrent ne doit être désigné comme cause sans preuve.

Le rattachement historique a été réparé **avant** cet incident et le contrôle serveur avait trouvé trois dossiers accessibles; cela ne prouve ni leur affichage après reconnexion ni l'état courant du service. L'accès à la console VPS a été demandé et une alerte de coordination a été envoyée au seul compte du propriétaire. **Priorité : rétablir l'hôte et vérifier le portail avant de reprendre l'import CNESST ou la bascule de vitrine.** Aucun changement DNS ni pièce juridique d'origine par cet incident de contrôle. [Réception et preuves](RECEPTION-RATTACHEMENT-2026-10-30.md) · [Fiche pour l'intervenant VPS](INCIDENT-COOLIFY-2026-10-30.md).

## Historique — point consigné à 11:15 UTC

**Rattachement serveur corrigé, recette utilisateur en attente.** La session active affichait zéro dossier, mais la base active contient bien **trois dossiers, 1 362 documents et 3 101 unités**. Après sauvegarde privée, le seul rattachement d'espace du propriétaire historique a été restauré à l'identique de l'original vérifié : contrôle serveur **3 dossiers accessibles**, fichier en mode 0600, compteurs inchangés. Aucune nouvelle identité ou appartenance créée. La reconnexion est demandée; l'affichage et l'ouverture des pièces après correction restent à confirmer.

**CNESST :** six PDF / 27 pages préparés localement avec provenance; import serveur encore à faire. **Courriel :** TWILO annonce la résolution via Resend à 10:43 UTC et une session active a été observée; les anciennes consignes Maileroo ci-dessous sont historiques, à ne pas réappliquer sans recontrôle. **Vitrine :** WordPress reste public; une ressource Coolify distincte pour `www/` est en préparation. Séparer le courrier de l'apex avant la bascule DNS. Aucune bascule de vitrine confirmée.

Priorité : vérifier la nouvelle session et ses pièces, importer puis contrôler CNESST, déployer et contrôler la copie `www/`, ensuite effectuer la bascule avec continuité du courrier. [Réception détaillée, preuves et limites](RECEPTION-RATTACHEMENT-2026-10-30.md). Le workspace déjà déployé au SHA `a3e20cc` reste inchangé par cette correction.

## Historique — point consigné à 09:52 UTC

**Les cinq correctifs du workspace sont déployés**, au `main` `a3e20ccbadd182fb819337c79e5b931060316af0`, après fusion de la [PR 10](https://github.com/takatakca/BESOINAVOCAT.CA/pull/10). Coolify `ocvuihsmpnffpbabg07r5ekh` affiche **Success** (48 s), application saine à 09:50:48 UTC. Le contrôle HTTPS du 30 octobre à 09:51:42.941 UTC, avec validation TLS normale, obtient 200 pour la page, la santé et les trois fichiers publics; leurs empreintes correspondent exactement à ce `main`. Les dossiers anonymes restent refusés en 401 et trois chemins privés en 404. Ces preuves de déploiement ne confirment pas la connexion réelle.

**Cause de non-réception confirmée à 09:40 UTC : blocage Maileroo du domaine de test.** Trois messages destinés au propriétaire sont marqués « Suppressed »; l'événement consulté indique un destinataire hors liste autorisée. Son ajout a été refusé car le nombre maximal de destinataires autorisés du domaine de test est atteint; aucune entrée existante n'a été supprimée. Le domaine propre `takatak.ca` est encore inactif, avec vérification DNS SPF/DKIM incomplète. Le quota d'envoi affiché n'est pas consommé : ce refus ne vient pas de ce quota. [Diagnostic et voie de résolution](DIAGNOSTIC-ENVOI-2026-10-30.md). Le blocage fournisseur reste non résolu; réception du code et consultation authentifiée des trois dossiers toujours non confirmées. Aucun DNS ni paramètre SMTP n’a été modifié; aucun nouvel OTP n’a été envoyé. L’ouverture du DNS par le propriétaire ou l’application de la fiche privée par Mike reste en attente.

**Fiabilité livrée :** caméra après fermeture/remplacement, éditeur pendant le chargement, sauvegarde de l’éditeur, réponse tardive d’envoi vidéo et décompression DOCX bornée. Code `7a920ee`, notes `c272e49`, puis fusion `a3e20cc`. Contrôles : **276/276 tests plateforme**, dont **10 de fiabilité inclus**, **12/12 tests du site**, revue indépendante sans bloqueur et QA sur données fictives (éditeur au tiers de l’écran, export DOCX réel). Les six contrôles de la PR sont réussis au SHA `c272e49`; après fusion, validation, Chromium, vitrine, plateforme et smoke de `main` réussissent. Les tâches de déploiement CI ont été ignorées; le déploiement Coolify a été lancé et contrôlé séparément.

Reprendre par la vérification du domaine Maileroo, le raccordement SMTP et la réception utilisateur. Les cinq correctifs sont déjà fusionnés et déployés; le contrôle en ligne est consigné. [Réception du 30 octobre](RECEPTION-2026-10-30.md). Continuer les notes avant, pendant et après dans GitHub et Drive; préserver les originaux et les 312 annexes.

[Feuille de route premium](VISION-PREMIUM-2026-10-29.md) conservée comme vision non activée, avec portions workspace déjà livrées par D-029.

## Historique documentaire — états antérieurs au contrôle du 30 octobre

Les étapes ci-dessous sont des états datés. Les anciens blocages MochaHost, DNS du portail et code non déployé ne décrivent plus le portail contrôlé le 30 octobre. Les exigences métier et les décisions de produit restent conservées.

**État historique consigné — 29 octobre 2026, connexion à corriger :** la [PR 3](https://github.com/takatakca/BESOINAVOCAT.CA/pull/3) est fusionnée au SHA `ad8e2f4a31ebdafee2bc56acd36e861652d4623c`, six contrôles réussis, avec la réception et le correctif de sauvegarde des cinq tables d’intégration. Le serveur reste au SHA `efef692`; l’accès utilisateur réel n’est pas validé. TAKATAK utilise son propre code courriel/SMS, alors que ce portail demande encore un mot de passe. Le correctif de code courriel Supabase sur `codex/connexion-code-courriel` a réussi 233/233 tests du portail, 12/12 tests du site et 60/60 contrôles ciblés de connexion, avec revue indépendante; il n’est pas encore déployé. Ce code est distinct du code TAKATAK. Le propriétaire est connecté à Supabase : SMTP personnalisé déjà activé (`smtp.maileroo.com:465`), secrets inchangés. Le modèle Magic Link a reçu un code `{{ .Token }}` FR/EN en conservant son lien; sauvegarde effectuée, relecture après rechargement confirmée. Activation désactivée par défaut (`BESOINAVOCAT_EMAIL_OTP_ENABLED`); après contrôle final du modèle et déploiement, la livraison réelle du code puis la connexion restent à tester. Aucun code envoyé, réinitialisation, nouveau compte ou droit ajouté. [Réception et étapes restantes](COOLIFY.md#état-de-lessai-distant--28-octobre-2026).

**Suite du 28 octobre — recherche et dictée :** [validation du second lot](VALIDATION-RECHERCHE-2026-10-28.md). 231 tests Node réussis, recherche globale autorisée et citations, dictée au clic, lecteur amélioré. Trois documents de travail ajoutés dans une nouvelle copie privée du corpus (1 362 occurrences / 1 185 empreintes / 3 101 unités), sauvegarde et restauration contrôlées. La [PR 2](https://github.com/takatakca/BESOINAVOCAT.CA/pull/2) est **fusionnée dans `main` le 28 octobre 2026**, au commit `348d626b76d4adcd874cc7485d2e744006b249c9`. **Corpus restauré et connexion configurée; accès utilisateur réel non validé.** Le microphone physique reste à essayer; IA générative non connectée.

**Réception — 29 octobre 2026 :** [portail HTTPS de test](https://fluzlqgkhifrgkmygknj4mjj.31.220.96.134.sslip.io) redéployé au SHA `efef6921201602ede0139af03bbfb92f43e6f90e`, déploiement terminé à 04:21:20 UTC. Archive et restauration vérifiées par empreintes; trois dossiers, 1 362 documents et 1 185 blobs restaurés, propriétaire `1000:1000`, répertoires `0700`, fichiers `0600`, base initiale préservée. Grants et clé prêts; `/api/health` répond avec `loginConfigured:true`, dossiers anonymes refusés en 401 et trois chemins privés en 404. **Le mot de passe historique a été refusé; TAKATAK utilise désormais un code courriel/SMS personnalisé. Ne pas répéter l’essai de cet ancien mot de passe. Le correctif de code courriel du portail est testé, mais pas encore déployé; la livraison du code et la connexion réelle restent à valider. Aucune consultation authentifiée des dossiers n’est confirmée.** Recherche, téléchargement et persistance en session réelle restent à contrôler. [État et suite](COOLIFY.md#état-de-lessai-distant--28-octobre-2026).

**Historique du premier lot du 28 octobre, désormais intégré :** [preuve et limites](VALIDATION-LOT-2026-10-28.md). 200 tests Node, 14 tests Python, questionnaire FR/EN, rendez-vous/usages, catalogue optionnel sans paiement, inventaire des contenus. L’application de test et le corpus sont désormais installés; la connexion réelle reste à valider. La présentation est réservée au propriétaire.

Contrôle daté du 28 octobre : le site d’orientation Render, dont le contenu `site/` est inchangé, a été republié au commit `348d626b76d4adcd874cc7485d2e744006b249c9`; les sept URL du smoke public passent. Ce contrôle ne valide pas le portail Node ni les dossiers privés.

## Reprise du 28 octobre — code intégré, configuration en cours

Lire [la liste destinée à Mike](DEV-A-FAIRE-2026-10-28.md) et les ajouts courants de [PROJECT_STATUS](PROJECT_STATUS.md). Mike termine le DNS; l'agent construit et teste le code dans GitHub, sans intervention WordPress. Vitrine `www/` avec contenu conservé, backend Node `platform/`, identité TAKATAK et corpus privé séparé du dépôt public.

L'identité existante du propriétaire a été confirmée en lecture seule dans TAKATAK. Les grants et trois appartenances au corpus préparé concordent; reçu dans le OneDrive privé. Cela n'est pas une connexion au portail de production ni une vérification de mot de passe. Le serveur est configuré et le corpus restauré; la recette authentifiée reste non validée. Le mot de passe historique a été refusé; TAKATAK utilise maintenant son propre code courriel/SMS. Le correctif du portail est testé et relu. Le SMTP personnalisé est activé, secrets inchangés; le modèle avec code a été enregistré et sa relecture est en cours. Le correctif doit ensuite être déployé avant le test réel de livraison du code, de connexion et de consultation des trois dossiers, recherches et téléchargements.

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
