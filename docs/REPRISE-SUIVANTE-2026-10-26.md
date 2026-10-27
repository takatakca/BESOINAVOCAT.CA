# Reprise suivante — BesoinAvocat et écosystème TAKATAK

État du 26 octobre 2026, heure de Montréal. **Arrêt demandé par le propriétaire après lecture des notes GitHub et sauvegarde de cette relève.** Ce fichier décrit le point de reprise, pas une instruction de redémarrage automatique. Reprendre uniquement sur une nouvelle demande. L'automatisation « Compléter le dossier maître 6241 » a été mise en pause et son état `PAUSED` vérifié; ne pas la réactiver sans instruction.

## Priorité et périmètre

Rendre réellement utilisable l'accès personnel au dossier juridique avant d'ajouter des effets à la vitrine. WordPress reste la présentation sur `besoinavocat.ca`; Node.js reste le portail métier distinct sur `portail.besoinavocat.ca`. Réutiliser TAKATAK pour l'identité et Facturations pour la facturation. Ne pas reconstruire ces services ni déplacer WordPress vers Render. Préserver les articles, informations, références, URL, codes et dossiers; seules les marques d'opérateur et recommandations promotionnelles injustifiées sont corrigées.

## Faits acquis, limites explicites

| Élément | État au point d'arrêt |
|---|---|
| WordPress | Plugin 0.2.1 installé via l'administration, message de succès obtenu. |
| Contrôle visuel | En 0.2.0 : tarifs 100 CAD/semaine et 300 CAD/mois, crédits IA séparés, corrections ciblées des articles 2186, 4663, 5082 et 5715 contrôlés. En 0.2.1 : correction du bouton orange qui chevauchait les prix installée; contrôle visuel final de ce bloc encore à faire. |
| Contenu | Noms documentaires, liens et articles conservés. Aucun audit exhaustif des 347 pages publiées n'est annoncé. |
| Formulaires | Module FR/EN livré dans le plugin, mais modal désactivée et endpoint non configuré. Réception Node préparée dans le code seulement; aucune collecte réelle ni réception client testée. |
| Backend distant | Première version technique répond : health 200, `identityConfigured:false`, dossiers anonymes 401. Ce n'est pas un accès fonctionnel au dossier du propriétaire. |
| Backend v2 | Installation bloquée par l'antivirus MochaHost. Examen du paquet exact demandé au support par le propriétaire; réponse non constatée. Aucun contournement. |
| Corpus | Trois dossiers importés localement; sauvegarde restaurée et vérifiée localement. Copie privée distante vérifiée, mais non restaurée ni activée dans le portail. |
| Connexion personnelle | Aucun test réel de connexion ou de consultation du corpus en production; ne pas annoncer que le mot de passe a été configuré. Aucun mot de passe dans Git ou cette relève. |
| GitHub | Dépôt BESOINAVOCAT.CA, branche `codex/espace-client-avocat`, PR 1 en brouillon. Dernier commit de code contrôlé : `5a230e52c758a626f31be24abeef2cce5242b3c1`. Le commit documentaire contenant cette relève est ultérieur. |
| Render | Site d'orientation distinct sur `main` à `b56d027c4172ddde5e362497731ac1ae80805fe0`; aucun nouveau déploiement Render par cette clôture documentaire. |
| Paiements, IA et voix | Aucun abonnement, débit, crédit IA, assistant téléphonique ou permission professionnelle activé. |

Validation du code : **133 tests Node et 12 tests Python réussis**; trois suites PHP passent en CI. Au commit `5a230e5`, [Quality](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40421216083), [Platform PR](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40421216013), [Browser QA](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40421215940) et [Platform push](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40421210422) sont réussis. Ces tests n'attestent pas la connexion réelle à MochaHost.

Archive WordPress 0.2.1 : 46 416 octets, SHA-256 `2e3db12951af0a61a92fdce132aac7bfac5e6616f2e34627ce58e80acdf0e707`.

Paquet Node v2 refusé : `besoinavocat-cpanel-2026-10-26-v2.zip`, 73 236 octets, SHA-256 `6593ad7db2028e63f22809a1d23f1334d1fb3c3f4283786730738c2e9923c71c`; alerte `Sanesecurity.Foxhole.JS_Zip_11.UNOFFICIAL FOUND`. Les modules intake ajoutés ensuite au code ne font pas partie de cette archive exacte. Ne pas prétendre que son éventuelle autorisation couvrirait un autre paquet.

## Notes GitHub lues avant les raccordements

### TAKATAK-V1 : autorité d'identité

Référence lue : `takatakca/takatak-v1`, `main` à `4e57ccf6a3623548081067263341039aef2fc498`.

- [Architecture MIMT](https://github.com/takatakca/takatak-v1/blob/4e57ccf6a3623548081067263341039aef2fc498/docs/mimt/README.md) : Supabase Auth, MasterIdentity, profils et appartenances aux espaces. BesoinAvocat conserve ses données métier et ses habilitations par dossier. Le [chantier AUTH #141](https://github.com/takatakca/takatak-v1/issues/141) reste ouvert.
- [Pont Academy](https://github.com/takatakca/takatak-v1/blob/4e57ccf6a3623548081067263341039aef2fc498/docs/TAKATAK_ACADEMY_BRIDGE.md) : exemple de code de lancement unique valable 90 secondes, échange serveur et réponse `session:{masterIdentityId,displayName,productCode,entitlements,expiresAt}`. C'est une référence à adapter, pas un accès BesoinAvocat existant.
- [Fondation facturation](https://github.com/takatakca/takatak-v1/blob/4e57ccf6a3623548081067263341039aef2fc498/docs/TAKATAK_BILLING_FACTURATIONS_FOUNDATION.md) : file TAKATAK vers un brouillon Facturations, jeton serveur HS256 de 60 secondes, clé d'idempotence, montants en cents CAD. Approbation, émission et paiement sont distincts.
- [Applications autorisées à facturer](https://github.com/takatakca/takatak-v1/blob/4e57ccf6a3623548081067263341039aef2fc498/src/lib/billing/invoices/source-apps.ts) : `besoinavocat` n'y figure pas au SHA lu. Un contrat explicite reste nécessaire.
- Consentement OAuth : [PR 219 fusionnée](https://github.com/takatakca/takatak-v1/pull/219); correctif de certains POST `Origin:null` [PR 220 encore brouillon](https://github.com/takatakca/takatak-v1/pull/220). Les [PR 194](https://github.com/takatakca/takatak-v1/pull/194) et [195](https://github.com/takatakca/takatak-v1/pull/195) sur jetons/JWKS KnowledgeAI restent des brouillons se chevauchant; ne pas les fusionner ensemble sans arrêter un seul contrat.
- Le [JWKS actuel](https://github.com/takatakca/takatak-v1/blob/4e57ccf6a3623548081067263341039aef2fc498/src/app/.well-known/jwks.json/route.ts) concerne le client OAuth Bluesky, pas un émetteur général de sessions BesoinAvocat. Les [routes de résolution d'identité 1LV](https://github.com/takatakca/takatak-v1/blob/4e57ccf6a3623548081067263341039aef2fc498/src/lib/integrations/master-api/auth.ts) emploient une clé dédiée : ne pas la transformer en clé globale.
- [CI 39970958679](https://github.com/takatakca/takatak-v1/actions/runs/39970958679) réussie, mais [promotion 39972641745](https://github.com/takatakca/takatak-v1/actions/runs/39972641745) échoue à « Validate already configured production transport ». Le code vert ne prouve pas le raccordement en production.

### TAKATAK : génération antérieure distincte

Référence lue : `takatakca/takatak`, `main` à `8fa20d177609cc1aa9aa1e942ed95a4338283e58`. Le [contexte d'authentification](https://github.com/takatakca/takatak/blob/8fa20d177609cc1aa9aa1e942ed95a4338283e58/src/app/context/AppContext.js) appelle `takatak.onrender.com` et utilise un jeton dans `sessionStorage`. Aucun run Actions ou PR ouverte n'a été retourné lors de la lecture. Préserver cette référence historique; ne pas mélanger implicitement son contrat avec V1.

### Facturations : contrat serveur existant, activation à vérifier

Le dépôt exact correspondant à la facturation Bolon est `takatakca/Facturations`, `main` à `995d5cbb6296fca5ea852985c2cb9c4e4d89f2d3`. Le nom de domaine déclaré est **`facturations.bolon.ca`**. Son [README](https://github.com/takatakca/Facturations/blob/995d5cbb6296fca5ea852985c2cb9c4e4d89f2d3/README.md) indique une application non déployée et un domaine/Wave réel non homologués. Ce sont les indications du dépôt lu, pas un contrôle live du service.

- [Passation d'intégration](https://github.com/takatakca/Facturations/blob/995d5cbb6296fca5ea852985c2cb9c4e4d89f2d3/docs/takatak-dashboard-integration-handoff-v1.md), blob `56471e4058306be0e046c6ad95083a28de5c6664`.
- [Contrat OpenAPI](https://github.com/takatakca/Facturations/blob/995d5cbb6296fca5ea852985c2cb9c4e4d89f2d3/docs/takatak-integration-v1.openapi.json), blob `40f0d06894f87ed0b09b13816af95c2274a9d35d`.
- Connexion interne avec MFA; intégration TAKATAK distincte, serveur à serveur, JWT HS256 d'au plus 90 secondes. Le producteur TAKATAK décrit 60 secondes, compatible avec ce plafond. Identité stable, entreprise autorisée et rôle `OWNER` ou `STAFF` résolus côté serveur. Aucun secret dans WordPress, le navigateur ou les notes.
- API : découverte des capacités, tableau de bord des brouillons, brouillons, clients, approbations internes et suivi. La création d'un brouillon requiert une activation séparée et une clé d'idempotence. Émission, livraison et paiement sont hors des capacités de cette intégration.
- À construire : adaptateur backend BesoinAvocat vers Facturations, d'abord en lecture seule; correspondance explicite identité/entreprise/rôle; configuration de préproduction isolée; preuves HTTPS, PostgreSQL, restauration et refus des accès indus. Les abonnements et crédits IA ne sont pas une intégration de paiement déjà réalisée.

Les trois dépôts ont été lus, sans modification ni déploiement. Aucune clé ou donnée d'identification n'a été copiée.

## Instructions exactes pour la prochaine session

1. Lire ce fichier, puis AGENTS, PROJECT_STATUS, TASK_QUEUE, AGENT_HANDOFF, CPANEL_NODE, BROWSER_AUTH, INTAKE_API et INTAKE_QA. Vérifier les SHAs courants et les changements d'autres agents avant toute modification.
2. Vérifier la réponse MochaHost sur le paquet exact refusé. Tant que le blocage subsiste, poursuivre uniquement les préparations indépendantes autorisées. Ne pas désactiver l'antivirus, changer le format pour l'esquiver ou passer par un autre canal.
3. Confirmer un contrat d'identité TAKATAK propre à BesoinAvocat : émetteur, audience, échange serveur, expiration, révocation, MasterIdentity, tenant et droits explicites. Réutiliser le fournisseur existant; aucun compte de mots de passe parallèle et aucune permission déduite du seul email. Les autres dépôts sont restés en lecture seule pendant cette session.
4. Après résolution documentée de l'hébergement, installer une version précisément contrôlée, conserver le retour arrière, vérifier les protections, puis faire connecter le propriétaire avec son compte existant. Restaurer le corpus dans une nouvelle destination privée vérifiée avant la bascule; ne pas écraser une base active.
5. Vérifier en conditions réelles les trois dossiers, recherche, citations, ouverture/téléchargement des fichiers, déconnexion, refus anonymes et isolation entre dossiers/tenants. Ne pas annoncer l'accès prêt avant ces preuves.
6. Contrôler visuellement WordPress 0.2.1 : prix non masqués par le CTA orange, ordinateur/mobile, liens, prix professionnels et correction de la page 5009. Conserver les articles et la structure. Le parcours FR/EN ne traduit pas automatiquement les 347 articles.
7. Raccorder le formulaire seulement une fois le service de réception disponible et contrôlé : origine exacte, consentement, reprise sans doublon, erreurs honnêtes et référence après enregistrement. Prévoir ensuite le traitement des demandes; aucune attribution ou notification opérationnelle n'est actuellement démontrée.
8. Préparer la facturation BesoinAvocat selon le contrat Facturations ci-dessus, d'abord en lecture seule : clients gratuits; avocats 100 CAD/semaine ou 300 CAD/mois, crédits IA séparés et honoraires distincts. Ne pas simuler une souscription ou un paiement.
9. Reprendre ensuite le dossier juridique par lots avec provenance : originaux, déclarations et analyses identifiés; OCR à contrôler; doublons exclus des totaux; preuves contraires conservées; manquants et suivis explicites. Le paquet de 312 annexes reste figé sans nouvelle version contrôlée. Aucun envoi à des tiers ni signature sans nouvelle instruction correspondante.

Les notes et le code sont conservés dans [PR 1 en brouillon](https://github.com/takatakca/BESOINAVOCAT.CA/pull/1). La présence du dépôt sur GitHub ne signifie pas que le portail utilisateur est déployé.
