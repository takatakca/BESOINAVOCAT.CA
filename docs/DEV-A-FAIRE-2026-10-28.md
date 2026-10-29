# BesoinAvocat — liste immédiate pour le développeur

**Point courant — 29 octobre 2026, connexion à corriger :** la [PR 3](https://github.com/takatakca/BESOINAVOCAT.CA/pull/3) est fusionnée au SHA `ad8e2f4a31ebdafee2bc56acd36e861652d4623c`, six contrôles réussis, avec la réception et le correctif de sauvegarde des cinq tables d’intégration. Le serveur reste au SHA `efef692`; l’accès utilisateur réel n’est pas validé. TAKATAK utilise son propre code courriel/SMS, alors que ce portail demande encore un mot de passe. Le correctif de code courriel Supabase sur `codex/connexion-code-courriel` a réussi 233/233 tests du portail, 12/12 tests du site et 60/60 contrôles ciblés de connexion, avec revue indépendante; il n’est pas encore déployé. Ce code est distinct du code TAKATAK. Le propriétaire est connecté à Supabase : SMTP personnalisé déjà activé (`smtp.maileroo.com:465`), secrets inchangés. Le modèle Magic Link a reçu un code `{{ .Token }}` FR/EN en conservant son lien; sauvegarde effectuée, relecture après rechargement confirmée. Activation désactivée par défaut (`BESOINAVOCAT_EMAIL_OTP_ENABLED`); après contrôle final du modèle et déploiement, la livraison réelle du code puis la connexion restent à tester. Aucun code envoyé, réinitialisation, nouveau compte ou droit ajouté. [Réception et étapes restantes](COOLIFY.md#état-de-lessai-distant--28-octobre-2026).

**Suite du 28 octobre — recherche et dictée :** [validation du second lot](VALIDATION-RECHERCHE-2026-10-28.md). 231 tests Node réussis, recherche globale autorisée et citations, dictée au clic, lecteur amélioré. Trois documents de travail ajoutés dans une nouvelle copie privée du corpus (1 362 occurrences / 1 185 empreintes / 3 101 unités), sauvegarde et restauration contrôlées. La [PR 2](https://github.com/takatakca/BESOINAVOCAT.CA/pull/2) est **fusionnée dans `main` le 28 octobre 2026**, au commit `348d626b76d4adcd874cc7485d2e744006b249c9`. **Corpus restauré et connexion configurée; accès utilisateur réel non validé.** Le microphone physique reste à essayer; IA générative non connectée.

**Réception — 29 octobre 2026 :** [portail HTTPS de test](https://fluzlqgkhifrgkmygknj4mjj.31.220.96.134.sslip.io) redéployé au SHA `efef6921201602ede0139af03bbfb92f43e6f90e`, déploiement terminé à 04:21:20 UTC. Archive et restauration vérifiées par empreintes; trois dossiers, 1 362 documents et 1 185 blobs restaurés, propriétaire `1000:1000`, répertoires `0700`, fichiers `0600`, base initiale préservée. Grants et clé prêts; `/api/health` répond avec `loginConfigured:true`, dossiers anonymes refusés en 401 et trois chemins privés en 404. **Le mot de passe historique a été refusé; TAKATAK utilise désormais un code courriel/SMS personnalisé. Ne pas répéter l’essai de cet ancien mot de passe. Le correctif de code courriel du portail est testé, mais pas encore déployé; la livraison du code et la connexion réelle restent à valider. Aucune consultation authentifiée des dossiers n’est confirmée.** Recherche, téléchargement et persistance en session réelle restent à contrôler. [État et suite](COOLIFY.md#état-de-lessai-distant--28-octobre-2026).

Mandat du propriétaire, 28 octobre 2026 : remplacer WordPress par nos solutions versionnées dans GitHub, préserver le contenu et les adresses existantes, rendre le compte et les trois dossiers utilisables avant les ajouts visuels.

**Code intégré : [PR 2 — portail et préservation](https://github.com/takatakca/BESOINAVOCAT.CA/pull/2), fusionnée dans `main` au commit `348d626b76d4adcd874cc7485d2e744006b249c9`.** Historique : `212e8d7` désigne le premier lot, `aaf64ef` le second lot recherche/dictée et ses six contrôles GitHub verts. L’étape de fusion est achevée. **Corpus restauré et connexion configurée; accès utilisateur réel non validé.** Relire [la validation du second lot](VALIDATION-RECHERCHE-2026-10-28.md), puis contrôler le SHA effectivement déployé et la réception réelle.

**Mise à jour du 29 octobre — connecteurs du portail (D-027)** : le portail sait relier le compte Zoom, Outlook ou Google de chaque avocat à ses rendez-vous. DocuSign et Clio se connectent; leurs actions viendront au prochain lot. Les tests passent avec des fournisseurs simulés; **aucun compte réel n'est raccordé**. Pour les activer, après le déploiement du portail :
1. créer `/data/integrations.key` ([COOLIFY](COOLIFY.md), étape 4);
2. ouvrir les comptes développeur décrits dans [INTEGRATIONS](INTEGRATIONS.md);
3. ajouter leurs variables dans Coolify;
4. faire la vérification « avec un vrai compte » de ce guide.

**Mise à jour de la vitrine, fin du 28 octobre (D-026)** : `www/` sert maintenant la **copie exacte** du site WordPress, et seules les couleurs changent (tons juridiques). Elle compte 348 pages et leurs fichiers, prises le 28 octobre à 08:24 UTC.
- Preuves : texte identique, mot pour mot, au site en ligne sur les 348 pages; mises en page identiques à 1440 et 390 px. Voir [STOREFRONT](STOREFRONT.md#preuves).
- Le texte importé (`www/content/`) reste conservé et l'inventaire passe.
- **La bascule de la vitrine attend la validation du rendu par le propriétaire.** Réglages Coolify inchangés : base `/www`, `Dockerfile`, port 80.

**Coordination avec Mike et l'autre session (29 octobre)** : les notes de `main` `efef692` conservent le refus de la refonte IA et intègrent désormais la copie fidèle demandée (D-026). Préserver cette copie, ses contenus et ses preuves; la validation du rendu et la bascule de la vitrine restent au propriétaire et à son développeur. Le lot présent se concentre sur le backend, les formulaires fonctionnels et les contrôles; aucune modification de WordPress, de la vitrine ou du DNS par ce lot.

## État vérifié le 28 octobre

- Dépôt : <https://github.com/takatakca/BESOINAVOCAT.CA>.
- Code du portail livré par la PR 2 : `348d626b76d4adcd874cc7485d2e744006b249c9`, SHA du contrôle HTTPS historique du 28 octobre. `origin/main` relu et déployé le 29 octobre : `efef6921201602ede0139af03bbfb92f43e6f90e`, qui conserve la copie fidèle et ajoute l’intégrateur de connecteurs. Ne pas confondre la tête Git et le SHA effectivement déployé.
- `www/` contient désormais la copie sans WordPress : 348 pages, une page 404 et 1 870 fichiers, mêmes adresses, sources conservées. Il faut préserver ces fichiers et les contenus informationnels.
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

- La configuration TAKATAK est installée (`loginConfigured:true`) : `TAKATAK_SUPABASE_URL`, `TAKATAK_SUPABASE_PUBLISHABLE_KEY` publique. Ce drapeau ne valide pas la connexion. TAKATAK utilise son propre code courriel/SMS; livrer le correctif Supabase OTP testé et relu après contrôle final du modèle `{{ .Token }}` enregistré (SMTP personnalisé déjà activé, secrets inchangés), activer `BESOINAVOCAT_EMAIL_OTP_ENABLED=true` pour la réception, puis faire tester la livraison du code et l’accès par le propriétaire. Les codes des deux parcours ne sont pas interchangeables. Aucune clé `service_role` dans le navigateur.
- Conserver le vrai compte identifié par son UUID TAKATAK et les habilitations explicites BesoinAvocat/tenant déjà vérifiées dans `/data/grants.json` selon [BROWSER_AUTH](BROWSER_AUTH.md). Une adresse courriel seule ne donne pas les droits.
- Conserver la clé de session privée déjà créée le 29 octobre et les sessions sur le volume; ne pas régénérer la clé. Les grants vérifiés et les variables publiques sauvegardées doivent être contrôlés lors de l’activation. Aucun mot de passe ni secret dans GitHub, les notes ou une capture.
- Le corpus privé a été restauré et ses empreintes/permissions contrôlées selon [COOLIFY](COOLIFY.md#restaurer-un-corpus-dans-le-volume-coolify); conserver la destination neuve, la base initiale et les chemins appliqués. Trois catégories attendues : **Harmony Movers, 6241 Léger, 6280 Somerled NDG**. Ne pas relancer une restauration par-dessus ces données. Le correctif de sauvegarde des tables `integration_*` est fusionné par la PR 3; installer et vérifier cet outil corrigé sur l’hôte avant la prochaine sauvegarde de la base démarrée.
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
- Rendez-vous vidéo/téléphone et journal de durée : distinguer chrono manuel de durée attestée par le fournisseur. Zoom, Outlook et Google sont prêts côté code (D-027, [INTEGRATIONS](INTEGRATIONS.md)); Twilio attend son compte, le consentement des personnes et un budget d'envoi.
- Adaptateur serveur vers `takatakca/Facturations`, contrats API vérifiés, brouillons avant émission. Pas de duplication de l'identité TAKATAK ni d'affectation de tenant par donnée navigateur.
- Forfaits avocats demandés : 100 CAD/semaine ou 300 CAD/mois. Prix des appels, stockage client, crédits et commissions à fixer; ne pas transformer les durées en débits sans tarif, accord et fournisseur configuré.
- Confidentialité/conditions encore incomplètes dans certaines pages : faire valider les textes et le traitement effectif avant ouverture publique des dossiers sensibles. Ne pas inventer une politique ni une offre de cabinet.
- Visuels : coordonner avec le propriétaire et Mike, préserver la mise en page WordPress voulue, ton juridique sobre (99 % juridique, 1 % IA discrète selon D-023). Aucun nouveau design dans ce lot. Conserver les contenus et corriger les références étrangères, sans recopier les promesses, avis ou marques de JuriGo.

La fin de WordPress signifie une production servie par GitHub/Coolify, pas la destruction des sauvegardes. Le compte, les workflows et les paiements ne doivent être annoncés actifs qu'après leur propre recette.
