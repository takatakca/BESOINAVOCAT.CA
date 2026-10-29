# TASK_QUEUE — BESOINAVOCAT.CA

**Suite du 28 octobre — recherche et dictée :** [validation du second lot](VALIDATION-RECHERCHE-2026-10-28.md). 231 tests Node réussis, recherche globale autorisée et citations, dictée au clic, lecteur amélioré. Trois documents de travail ajoutés dans une nouvelle copie privée du corpus (1 362 occurrences / 1 185 empreintes / 3 101 unités), sauvegarde et restauration contrôlées. La [PR 2](https://github.com/takatakca/BESOINAVOCAT.CA/pull/2) est **fusionnée dans `main` le 28 octobre 2026**, au commit `348d626b76d4adcd874cc7485d2e744006b249c9`. **Configuration du serveur en cours, recette login/corpus non validée.** Le microphone physique reste à essayer; IA générative non connectée.

**Reprise — 29 octobre 2026 :** [instance HTTPS de test](https://fluzlqgkhifrgkmygknj4mjj.31.220.96.134.sslip.io) déployée; dernier contrôle HTTPS indépendant du 28 octobre : 19/19 réussis, health 200, `mode:pilot`, `identityConfigured:false`, `loginConfigured:false`, `intakeConfigured:true`, demandes désactivées. Volume privé `/data` créé. Le téléversement via le navigateur intégré a repris : `grants.json` (198 octets) est visible à distance à 03:31:27 UTC; propriétaire et droits du fichier restent à corriger. Le transfert de l’archive a démarré; réception complète et empreinte distante non encore confirmées. **Restauration du corpus et configuration de connexion non validées; aucune connexion réelle aux dossiers annoncée.** La procédure privée de restauration est prête. [État et suite](COOLIFY.md#état-de-lessai-distant--28-octobre-2026).

> **28 octobre 2026 — VITRINE : `www/` est maintenant la copie exacte du site WordPress; seules les couleurs changent (D-026). En attente de la validation du propriétaire.**
> - La refonte « plateforme IA » du 27 octobre (D-022) a été **refusée** par le propriétaire (D-023). Son design n'est plus servi; il reste dans l'historique Git (`0e457cd`, `c00ead5`). Le texte importé de `www/content/` est conservé, sans être lu par la construction ([CONTENT_PRESERVATION](CONTENT_PRESERVATION.md)).
> - Le 28 octobre, le propriétaire a choisi de reconstruire `www/` comme **copie exacte** de son site WordPress, fait à la main détail par détail : mêmes mises en page, sections, images et boutons, textes mot pour mot. **Seules les couleurs changent**, pour ne pas ressembler à un autre de ses sites : l'orange devient bordeaux, les bleus et les verts deviennent marine; le blanc, les crèmes et le charbon restent.
> - **Direction du propriétaire (28 octobre)** : c'est un site juridique, il doit garder un **ton juridique**. Les couleurs sont sobres et professionnelles, propres à un service juridique. Les textes sont formels et rigoureux. Proportion voulue : **99 % réel et juridique, 1 % d'IA**. L'IA est la touche discrète qui distingue la plateforme et en fait l'avenir des plateformes juridiques; elle n'est jamais le thème visuel ni le ton général. Pas d'esthétique futuriste ou robotique.
> - Preuves de la copie, page par page et mot pour mot : [STOREFRONT](STOREFRONT.md#preuves).
> - **Sans instruction écrite du propriétaire, aucun agent ne modifie** la page de demande du portail (`platform/public/demande.*`, encore dans le style refusé de `c00ead5`), WordPress ou le DNS. Dans `www/`, seule la copie fidèle est autorisée (BA-034). Une autre session travaille en parallèle : vérifier GitHub avant toute action et ne pas écraser son travail.
> - Le WordPress en ligne est intact : vérifié le 28 octobre, thème Astra, extension 0.2.2, DNS toujours chez MochaHost, rien n'a été basculé.

**Premier fichier à lire : [REPRISE-SUIVANTE-2026-10-26.md](REPRISE-SUIVANTE-2026-10-26.md).** Vitrine : copie exacte livrée le 28 octobre, en attente de la validation du propriétaire (BA-034).

**Périmètre coordonné du présent lot :** la demande écrite de ce chat autorise le backend et les questionnaires fonctionnels. Aucun rendu de la vitrine n’est redessiné ni déployé. Les notes concurrentes et la copie fidèle de `main` (`a2b2d11`) sont conservées; aucun fichier de vitrine n’est modifié par cette réconciliation documentaire. Les changements de la branche de livraison ont été intégrés par la PR 2; la configuration du serveur reste en cours.

**Historique du premier lot du 28 octobre, désormais intégré :** [preuve et limites](VALIDATION-LOT-2026-10-28.md). 200 tests Node, 14 tests Python, questionnaire FR/EN, rendez-vous/usages, catalogue optionnel sans paiement, inventaire des contenus. L’application de test est désormais déployée; sa configuration privée et la connexion réelle restent à valider. La présentation est réservée au propriétaire.

## Priorité du 28 octobre — reprise autorisée

1. Développeur du propriétaire : exécuter [DEV-A-FAIRE-2026-10-28](DEV-A-FAIRE-2026-10-28.md), portail et compte réel avant vitrine. Préserver les courriels lors du DNS. WordPress devient seulement une sauvegarde de retour arrière.
2. Valider/restaurer le corpus privé dans une destination neuve, habilitations par UUID, trois dossiers, recherche et téléchargement; remise de 312 annexes inchangée.
3. **Code intégré par la PR 2 dans `main` (`348d626`)** : questionnaire, rendez-vous, durées, recherche et dictée. Configuration du serveur en cours; recette login/corpus non validée. Exécuter les contrôles de réception sur le serveur, sans rouvrir l’étape de fusion.
4. Compléter la file opérateur, l'attribution humaine des demandes, le parcours d'inscription et les notifications; la réception d'un formulaire seule n'est pas la mise en relation.
5. Raccorder Zoom/Twilio et Facturations après configuration serveur réelle, définir les tarifs clients/minutes/crédits/commissions; aucun débit avant ces étapes.
6. Visuels réservés au propriétaire et à Mike selon D-023, ton juridique sobre; garder le contenu informationnel et les anciens slugs. Ne pas confondre copie textuelle et reproduction exacte de la mise en page.
   **Mise à jour (D-026)** : depuis la fin du 28 octobre, `www/` sert la reproduction exacte de la mise en page WordPress, et seules les couleurs changent (BA-034). Le texte importé reste conservé. Le propriétaire doit encore valider le rendu avant la bascule de la vitrine.

Le tableau ci-dessous conserve l'historique. Les tâches de réinstallation WordPress/MochaHost ne sont plus le chemin de déploiement principal.

**Historique de clôture du 26 octobre :** [REPRISE-SUIVANTE-2026-10-26.md](REPRISE-SUIVANTE-2026-10-26.md). Sa consigne d’arrêt ne remplace pas la file active du 28 octobre.

Ordre actuel demandé par le propriétaire : **backend et accès effectif aux dossiers avant la vitrine**. Les tâches documentaires et de préparation indépendantes peuvent avancer sans contourner un blocage de déploiement.

## Travail courant

| ID | Priorité / état | Travail et preuve attendue |
|---|---|---|
| BA-018 | P0 — v2 bloquée par l'antivirus | Faire examiner le paquet v2 exact refusé par MochaHost. Conserver le reçu et le SHA; aucun contournement ni désactivation de protection. La première version Node technique existe déjà. |
| BA-030 | P0 — instance HTTPS de test joignable; transfert privé en cours | Application `besoinavocat-portail` en essai sur Coolify, volume `/data` créé et health 200. Connexion désactivée. Le 29 octobre, transfert du fichier de grants confirmé via le navigateur intégré; droits à corriger. Archive en cours de transfert, réception complète et empreinte à confirmer. Terminer la restauration dans une destination neuve, puis la configuration privée et la recette d’accès. La réception des demandes reste fermée; voir [COOLIFY](COOLIFY.md). |
| BA-031 | **en attente : validation de la copie (BA-034) par le propriétaire, puis bascule par son développeur** | Vitrine besoinavocat.ca servie sans WordPress (D-021), désormais la copie exacte du site (D-026) : 348 pages, mêmes adresses, « Trouver mon avocat » vers le portail. Reste : créer l'application Coolify, puis basculer dans l'ordre de [STOREFRONT](STOREFRONT.md) (courriel d'abord, car le MX pointe sur le domaine; portail avant vitrine). Prouver ensuite les adresses, le certificat et la réception d'un courriel. |
| BA-033 | **refusée par le propriétaire le 28 oct. (D-023) — ne pas poursuivre** (ancien état : refonte et relecture, D-022) | Design « plateforme IA » sur la vitrine et la page de demande. 141 coquilles et défauts de la source corrigés ([CONTENT_CORRECTIONS](CONTENT_CORRECTIONS.md)); Ontario ajouté au formulaire (catalogue `2026-10-27.2`). Accessibilité axe-core contrôlée sur les 350 pages. À refaire après toute modification de contenu : `node www/build.mjs && node www/tools/check-site.mjs`. |
| BA-034 | **fait le 28 oct. sur instruction du propriétaire (« GitHub copy of site », D-026) — en attente de sa validation** | Copie exacte du design WordPress : mises en page, sections, images, boutons et textes mot pour mot. Seules les couleurs changent, en tons juridiques : orange → bordeaux, bleus et verts → marine. Le propriétaire valide le rendu ou précise sa palette; un changement de palette se fait dans `www/palette.mjs`. Preuves : [STOREFRONT](STOREFRONT.md#preuves). À refaire après toute reprise de la copie : `node www/build.mjs && node www/tools/check-site.mjs`. |
| BA-032 | P1 — textes à fournir par le propriétaire | Politique de confidentialité (avec la personne responsable selon la Loi 25 et le lieu du serveur) et conditions des professionnels : pages vides sur WordPress, publiées « en cours de rédaction ». Aucun texte juridique ne doit être inventé. |
| BA-025 | P0 — installation après résolution du blocage | Installer uniquement le paquet validé, comparer le manifeste et les empreintes, préserver le code précédent et la configuration privée. Vérifier HTTPS et les refus anonymes; pas de réinstallation aveugle. |
| BA-019 | P0 — code raccordé, parcours réel non testé | Faire utiliser à l'utilisateur son identité TAKATAK existante; vérifier sa session et ses grants BesoinAvocat. Aucun mot de passe déclaré configuré, aucune permission nouvelle implicite. |
| BA-017 | P0 — import/restauration locaux vérifiés | La sauvegarde privée distante est une copie seulement. Après contrôles d'accès, restaurer dans une nouvelle destination privée, vérifier les empreintes et basculer sans écraser une base active. |
| BA-020 | P0 — preuve de fonctionnement réel requise | Vérifier les trois dossiers du propriétaire, recherche/citations, pièces téléchargées, refus inter-dossiers/organisations, déconnexion et absence de fichiers privés exposés. Distinguer essais locaux et résultats distants. |
| BA-015 | code au SHA 5a230e5 contrôlé par CI | 133 tests Node, 12 Python et trois suites PHP réussis. API, provenance/versions, recherche par page, échanges, temps soumis à validation et audit restent distincts d'un accès distant réellement validé. |
| BA-016 | après accès réel | Raccorder le lien de la vitrine (désormais `www/`) vers le vrai portail vérifié; distinguer clairement l'aperçu fictif existant de l'application authentifiée. |
| BA-026 | module WP installé, funnel désactivé | Code `intake` / `funnel` testé; réception Node non activée. Aucun envoi réel ou succès de formulaire confirmé. Garder le funnel fermé avant validation du backend, du circuit des demandes et des contrôles FR/EN/clavier. |
| BA-028 | P1 — demandé, à développer | Parcours « Besoin d'un avocat » en étapes conditionnelles, FR/EN, réponses modifiables, réception réelle et reprise sans doublon. Étendre le contrat serveur avant tout ajout de récit, échéance ou pièce; voir le mandat détaillé dans REPRISE-SUIVANTE. |
| BA-029 | P1 — demandé, à développer | File d'opérateur, statuts, suivi client, notifications contrôlées et séparation demande/compte/mandat. Vérifier de bout en bout que la demande enregistrée est visible uniquement aux personnes habilitées. |
| BA-024 | 0.2.2 installée et contrôlée le 27 oct. (24/24) | Prix 0.2.1 non recouverts de 320 à 1440 px. Défauts trouvés sur le CTA 1839 : saut en fin de page à l'ouverture et piège clavier. Correctif 0.2.2 installé; `node scripts/wordpress-cta-qa.mjs` réussit 24/24 sur le site réel. Reste : piège clavier du même popup sur les 346 autres pages, corrigé dans la version suivante (`common.js`). Préserver pages, articles, informations et URL. |
| BA-027 | conditions de produit décidées, facturation inactive | Présenter **100 CAD/semaine ou 300 CAD/mois** pour les avocats, **crédits IA en supplément**, demandes clients toujours gratuites, honoraires distincts. Vérifier l'affichage et le parcours avant toute souscription; aucun paiement activé par la seule copie. |
| BA-021 | raccordements futurs | IA sourcée, crédits et voix : services, budgets, consentements et événements réels à raccorder puis tester; ne pas simuler leur activation. |
| BA-022 | futur parcours distinct | Collaboration sur fichiers expressément choisis; aucun accès permanent au disque. |
| BA-023 | acquis, conserver | Sauvegarde privée WordPress et export; corrections ciblées avec dates/URL préservées. Ne pas reprendre une extraction ou réécriture complète sans nouvel objectif. |

Les quatre runs CI du code `5a230e52c758a626f31be24abeef2cce5242b3c1` sont verts; liens dans [PROJECT_STATUS](PROJECT_STATUS.md). Ils ne remplacent pas le contrôle visuel final WordPress ni l'accès distant. Aucun déploiement, compte ou permission n'est modifié par cette mise à jour des notes.

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
| BA-008 | P1 | obsolète depuis le 26 octobre | Ancien projet de raccordement de `besoinavocat.ca` à Render abandonné : le domaine sert WordPress HTTPS chez MochaHost | WordPress conservé; Render indépendant; aucun basculement DNS vers Render |
| BA-009 | P0 produit | décision requise | Arrêter le modèle de service : annuaire, référence, mise en relation ou consultation; responsables/contrats | décision métier écrite |
| BA-010 | P0 sécurité | décision requise | Désigner responsable confidentialité, finalités, stockage, rétention, accès, consentements et examen juridique | documents approuvés |
| BA-011 | P1 | dépend de 009-010 | Vérification/inscription volontaire de professionnels, permissions, suppression et signalement | tests serveur + audit |
| BA-012 | P1 | dépend de 009-011 | SSO TAKATAK et habilitations par produit; aucun système d'identité parallèle | tests d'isolation tenant |
| BA-013 | P2 | dépend de 010-012 | Demandes de consultation minimisées, sécurité, prévention d'abus, purge et traçabilité | tests E2E/sécurité |
| BA-014 | P2 | après BA-013 | Observabilité, sauvegardes, reprise, conformité et monitoring applicatif | procédures et exercices |


Les lignes historiques décrivent le site d'orientation. Les décisions de prix et la priorité backend ci-dessus priment sur les anciennes mentions « à définir ». La partie humaine accessibilité demeure ouverte; aucune plateforme complète ni réseau professionnel vérifié n'est annoncé.

## Clôture du lot contact et WordPress 0.2.1

WordPress 0.2.1 installé; funnel désactivé. Reprendre le contrôle visuel final du bloc prix puis la priorité backend : v1 `identityConfigured: false`, v2 bloquée par antivirus, sans contournement. Les trois suites PHP de la CI sont réussies; aucun accès réel au corpus n'est validé. Voir [INTAKE_QA.md](INTAKE_QA.md).
