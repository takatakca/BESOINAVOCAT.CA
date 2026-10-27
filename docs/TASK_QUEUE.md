# TASK_QUEUE — BESOINAVOCAT.CA

**Premier fichier à lire : [REPRISE-SUIVANTE-2026-10-26.md](REPRISE-SUIVANTE-2026-10-26.md).** Fin de session : notes seulement, puis arrêt.

Ordre actuel demandé par le propriétaire : **backend et accès effectif aux dossiers avant la vitrine**. Les tâches documentaires et de préparation indépendantes peuvent avancer sans contourner un blocage de déploiement.

## Travail courant

| ID | Priorité / état | Travail et preuve attendue |
|---|---|---|
| BA-018 | P0 — v2 bloquée par l'antivirus | Faire examiner le paquet v2 exact refusé par MochaHost. Conserver le reçu et le SHA; aucun contournement ni désactivation de protection. La première version Node technique existe déjà. |
| BA-025 | P0 — installation après résolution du blocage | Installer uniquement le paquet validé, comparer le manifeste et les empreintes, préserver le code précédent et la configuration privée. Vérifier HTTPS et les refus anonymes; pas de réinstallation aveugle. |
| BA-019 | P0 — code raccordé, parcours réel non testé | Faire utiliser à l'utilisateur son identité TAKATAK existante; vérifier sa session et ses grants BesoinAvocat. Aucun mot de passe déclaré configuré, aucune permission nouvelle implicite. |
| BA-017 | P0 — import/restauration locaux vérifiés | La sauvegarde privée distante est une copie seulement. Après contrôles d'accès, restaurer dans une nouvelle destination privée, vérifier les empreintes et basculer sans écraser une base active. |
| BA-020 | P0 — preuve de fonctionnement réel requise | Vérifier les trois dossiers du propriétaire, recherche/citations, pièces téléchargées, refus inter-dossiers/organisations, déconnexion et absence de fichiers privés exposés. Distinguer essais locaux et résultats distants. |
| BA-015 | code au SHA 5a230e5 contrôlé par CI | 133 tests Node, 12 Python et trois suites PHP réussis. API, provenance/versions, recherche par page, échanges, temps soumis à validation et audit restent distincts d'un accès distant réellement validé. |
| BA-016 | après accès réel | Raccorder le lien WordPress vers le vrai portail vérifié; distinguer clairement l'aperçu fictif existant de l'application authentifiée. |
| BA-026 | module WP installé, funnel désactivé | Code `intake` / `funnel` testé; réception Node non activée. Aucun envoi réel ou succès de formulaire confirmé. Garder le funnel fermé avant validation du backend, du circuit des demandes et des contrôles FR/EN/clavier. |
| BA-024 | 0.2.1 installée; contrôle visuel final ouvert | Vérifier à la reprise le bloc prix et le CTA orange remis dans le flux normal. La 0.2.0 avait été contrôlée pour les tarifs 100/300 et les articles 2186/4663/5082/5715. Préserver pages, articles, informations et URL. |
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
