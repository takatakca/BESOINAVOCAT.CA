# BesoinAvocat — liste immédiate pour le développeur

**Suite du 28 octobre — recherche et dictée :** [validation du second lot](VALIDATION-RECHERCHE-2026-10-28.md). 231 tests Node réussis, recherche globale autorisée et citations, dictée au clic, lecteur amélioré. Trois documents de travail ajoutés dans une nouvelle copie privée du corpus (1 362 occurrences / 1 185 empreintes / 3 101 unités), sauvegarde et restauration contrôlées. La [PR 2](https://github.com/takatakca/BESOINAVOCAT.CA/pull/2) est **fusionnée dans `main` le 28 octobre 2026**, au commit `348d626b76d4adcd874cc7485d2e744006b249c9`. **Configuration du serveur en cours, recette login/corpus non validée.** Le microphone physique reste à essayer; IA générative non connectée.

**État figé — 29 octobre 2026, 03:18 UTC :** [instance HTTPS de test](https://fluzlqgkhifrgkmygknj4mjj.31.220.96.134.sslip.io) déployée; dernier health confirmé : 200, `mode:pilot`, `identityConfigured:false`, `loginConfigured:false`, `intakeConfigured:true`, demandes désactivées. Volume privé `/data` créé. Après activation de l’accès aux fichiers locaux, la deuxième tentative de téléversement a échoué par perte de connexion à l’extension Chrome; la reconnexion est demandée. **Transfert non confirmé; aucune installation du corpus, des grants, de la clé de session ou des variables de connexion TAKATAK/Supabase confirmée.** Procédure privée de restauration prête, non exécutée. Recette login/corpus non validée. [État et suite](COOLIFY.md#état-de-lessai-distant--28-octobre-2026).

Mandat du propriétaire, 28 octobre 2026 : remplacer WordPress par nos solutions versionnées dans GitHub, préserver le contenu et les adresses existantes, rendre le compte et les trois dossiers utilisables avant les ajouts visuels.

**Code intégré : [PR 2 — portail et préservation](https://github.com/takatakca/BESOINAVOCAT.CA/pull/2), fusionnée dans `main` au commit `348d626b76d4adcd874cc7485d2e744006b249c9`.** Historique : `212e8d7` désigne le premier lot, `aaf64ef` le second lot recherche/dictée et ses six contrôles GitHub verts. L’étape de fusion est achevée. **Configuration du serveur en cours, recette login/corpus non validée.** Relire [la validation du second lot](VALIDATION-RECHERCHE-2026-10-28.md), puis contrôler le SHA effectivement déployé et la réception réelle.

**Coordination avec Mike et l'autre session (28 octobre)** : les notes de `main` `fb992d6` refusent la refonte visuelle IA et réservent la vitrine au propriétaire. Ne pas déployer automatiquement son design actuel comme une copie fidèle : les textes et liens ont été importés, pas la mise en page WordPress exacte. La bascule de la vitrine dépend de la version visuelle validée par le propriétaire. Le lot présent se concentre sur le backend, les formulaires fonctionnels et les contrôles; aucune modification de WordPress ou du DNS par l'agent.

## État vérifié le 28 octobre

- Dépôt : <https://github.com/takatakca/BESOINAVOCAT.CA>.
- Base de livraison : `main`, commit `348d626b76d4adcd874cc7485d2e744006b249c9`, après fusion de la PR 2. L’ancienne base `e59a9e084966a649d260ff917d756823ff4558c4` n’incluait pas ce lot.
- `www/` contient la vitrine sans WordPress : 348 pages importées, mêmes slugs, sources conservées; 350 pages construites avec contact et 404. Il faut préserver ces fichiers et les contenus informationnels.
- `platform/` contient le portail Node, les sessions TAKATAK, dossiers/pièces/recherche/messages/temps et la demande publique `/demande`.
- **La recette du portail n’est pas validée; la configuration du serveur est en cours.** Contrôle HTTP du 28 octobre antérieur à cette configuration : portail `/api/health` répond 200 avec `identityConfigured:false`; `/demande` répond 404. La connexion du propriétaire n'est donc pas validée. La vitrine `/healthz` répond 404.
- DNS observés : apex et portail A `209.42.24.127`, TTL 7200; MX `0 besoinavocat.ca`; `mail` CNAME vers l'apex; `mx.besoinavocat.ca` non résolu. Changer seulement l'apex maintenant ferait dépendre le courrier du nouveau serveur.
- Historique du premier lot testé sur `codex/workspaces-appels-2026-10-28` : 200 tests Node et 14 tests Python réussis, QA navigateur et inventaire contrôlés; [VALIDATION-LOT](VALIDATION-LOT-2026-10-28.md). Le second lot porte la suite complète à 231 tests Node; les deux lots sont intégrés à `main`. Ne pas imposer leur ancienne présentation de vitrine au propriétaire.

## 1. Compléter l’application de test Coolify; conserver la vitrine distincte

L’application de test `besoinavocat-portail` existe sur le serveur Coolify `vps1` (`31.220.96.134`), avec `/data`. Réutiliser cette application et son volume; ne pas en créer un doublon. Les identifiants de ressource et contrôles sont dans [COOLIFY](COOLIFY.md#état-de-lessai-distant--28-octobre-2026). Le déploiement de la vitrine et la bascule du domaine restent des étapes distinctes.

| Application | Source / branche | Base | Dockerfile | Port | Données |
|---|---|---|---|---|---|
| Portail Node | `takatakca/BESOINAVOCAT.CA`, `main` | `/platform` | `/Dockerfile` | 8787, accessible uniquement au proxy | volume persistant `/data` |
| Vitrine sans WordPress | même dépôt, `main` | `/www` | `/Dockerfile` | 80 | aucun volume |

Déployer sur des domaines d'essai HTTPS, puis suivre [COOLIFY](COOLIFY.md) et [STOREFRONT](STOREFRONT.md). Ne pas monter un volume sur `/app`.

Portail : régler `APP_ORIGIN`, `BESOINAVOCAT_INTAKE_ALLOWED_ORIGINS` (JSON des origines exactes), `BESOINAVOCAT_TRUST_PROXY=1` seulement derrière le proxy isolé. Activer `BESOINAVOCAT_INTAKE_REQUEST_ENABLED=true` lorsque le traitement des demandes et leur notice sont prêts. Les détails de configuration et leurs conditions sont dans les documents liés.

## 2. Rendre l'accès du propriétaire réel

- Raccorder l'autorité TAKATAK : `TAKATAK_SUPABASE_URL`, `TAKATAK_SUPABASE_PUBLISHABLE_KEY` publique. Aucune clé `service_role` dans le navigateur.
- Identifier le vrai compte du propriétaire par son UUID TAKATAK, puis habilitations explicites BesoinAvocat/tenant dans `/data/grants.json` selon [BROWSER_AUTH](BROWSER_AUTH.md). Une adresse courriel seule ne donne pas les droits.
- Créer la clé de session privée une seule fois et conserver les sessions sur le volume. Aucun mot de passe ni secret dans GitHub, les notes ou une capture.
- Restaurer le corpus privé avec la procédure [COOLIFY](COOLIFY.md#restaurer-un-corpus-dans-le-volume-coolify) : l'image Node n'a pas Python; restaurer côté opérateur dans un nouveau sous-dossier privé puis régler `DATABASE_PATH` et `BLOB_DIR`, contrôler empreintes, droits `node` et appartenances. Ne jamais écraser une base active ni restaurer directement dans le volume `/data` existant. Trois catégories attendues : **Harmony Movers, 6241 Léger, 6280 Somerled NDG**.
- Vérifier avec le propriétaire : connexion réelle, trois dossiers visibles, recherche donnant les pièces, téléchargement de plusieurs originaux, déconnexion. Ne pas considérer l'aperçu fictif comme une preuve de réussite.
- Conserver la remise de 312 annexes intacte; les nouveaux apports vont dans une version distincte contrôlée.

## 3. Détacher le courrier avant de déplacer le site

Conserver un export DNS et une sauvegarde WordPress privée pour retour arrière. Ce n'est plus l'application cible.

1. Réduire les TTL utiles à 300, puis respecter l'ancien TTL de 7200.
2. Si MochaHost continue d'héberger le courrier, créer `mx.besoinavocat.ca` A `209.42.24.127`, MX `0 mx.besoinavocat.ca.`, et remplacer les CNAME `mail` et `ftp` vers l'apex par des A `209.42.24.127`.
3. Vérifier le routage local du courrier cPanel, conserver DKIM/SPF/DMARC et les hôtes de messagerie. Tester réception et envoi avec le propriétaire avant de continuer.
4. Déplacer **portail** vers l'IP Coolify confirmée, vérifier HTTPS, connexion et `/demande`.
5. Déplacer l'apex, puis vérifier `www`, certificat, anciens slugs et liens vers le portail.
6. Si échec : rétablir l'A antérieur de chaque application concernée (apex et/ou portail) et sa configuration sauvegardée. Ne pas supprimer la sauvegarde WordPress le soir même.

## 4. Critères de réception obligatoires

- Vitrine : `/healthz` 200, 348 contenus conservés; anciens slugs, `/sitemap.xml`, redirections et liens internes vérifiés sur ordinateur et mobile.
- Portail : `/api/health` et `/demande` 200; `loginConfigured:true` et connexion réelle validée, indépendamment du champ `identityConfigured` qui décrit le Bearer; `/api/cases` anonyme 401; `/.env` et `/server.mjs` 404.
- Demande d'essai identifiable : référence créée, même requête/idempotence donnant la même référence après redémarrage; confirmer la réception dans le stockage privé et le suivi opérateur.
- Connexion réelle du propriétaire aux trois dossiers, pièces, recherche, téléchargements; séparation entre comptes et dossiers vérifiée.
- Redémarrer/redéployer sans perdre demandes, sessions ni fichiers. Faire une sauvegarde SQLite cohérente et tester sa restauration.
- Confirmer la réception des courriels après la bascule.
- Retour de livraison : URL vitrine, URL portail, SHA déployé pour chacun, contrôles réussis/échoués, emplacement privé de la sauvegarde. Aucun secret dans ce retour.

## 5. Déploiement GitHub après réception

Activer `coolify-deploy.yml` uniquement après les essais. Utiliser les secrets d'environnement `production` `COOLIFY_BESOINAVOCAT_API_TOKEN`, `COOLIFY_BESOINAVOCAT_WWW_DEPLOY_WEBHOOK`, `COOLIFY_BESOINAVOCAT_PORTAL_DEPLOY_WEBHOOK` et les deux variables `COOLIFY_BESOINAVOCAT_WWW_AUTODEPLOY_ENABLED` / `COOLIFY_BESOINAVOCAT_PORTAL_AUTODEPLOY_ENABLED` à `true`. Désactiver l'autodéploiement direct Coolify pour que seule la CI verte sur le SHA actuel de `main` déclenche la production.

## 6. Suite produit, distincte de la bascule

- Questionnaires FR/EN adaptés au domaine et récapitulatif avant transmission; source d'inspiration fonctionnelle : <https://jurigo.ca/demande/>. Notre rédaction et notre code restent propres à BesoinAvocat.
- File opérateur de réception, attribution à un avocat avec accord, états/suivis et notifications testées. Un formulaire enregistré ne constitue pas encore une mise en relation.
- Workspace avec pièces versionnées, provenance, recherche, chat et temps; aucune décision juridique automatique.
- Rendez-vous vidéo/téléphone et journal de durée : distinguer chrono manuel de durée attestée par le fournisseur. Connecter Zoom/Twilio seulement après configuration réelle et tests de webhooks.
- Adaptateur serveur vers `takatakca/Facturations`, contrats API vérifiés, brouillons avant émission. Pas de duplication de l'identité TAKATAK ni d'affectation de tenant par donnée navigateur.
- Forfaits avocats demandés : 100 CAD/semaine ou 300 CAD/mois. Prix des appels, stockage client, crédits et commissions à fixer; ne pas transformer les durées en débits sans tarif, accord et fournisseur configuré.
- Confidentialité/conditions encore incomplètes dans certaines pages : faire valider les textes et le traitement effectif avant ouverture publique des dossiers sensibles. Ne pas inventer une politique ni une offre de cabinet.
- Visuels : coordonner avec le propriétaire et Mike, préserver la mise en page WordPress voulue, ton juridique sobre (99 % juridique, 1 % IA discrète selon D-023). Aucun nouveau design dans ce lot. Conserver les contenus et corriger les références étrangères, sans recopier les promesses, avis ou marques de JuriGo.

La fin de WordPress signifie une production servie par GitHub/Coolify, pas la destruction des sauvegardes. Le compte, les workflows et les paiements ne doivent être annoncés actifs qu'après leur propre recette.
