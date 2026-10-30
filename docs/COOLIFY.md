# Déployer le portail Node sur Coolify

## Point de reprise — 30 octobre 2026

Le portail déployé reste au SHA `2c41af9fbe413705b2ce8935d6b3c7b63f81e90c`, avec l'espace de travail D-029. Le contrôle du 30 octobre à 04:35–04:36 UTC confirme HTTPS avec validation TLS normale, les trois fichiers principaux identiques à ce commit, la santé 200, les dossiers anonymes refusés en 401 et trois chemins privés en 404. Le déploiement Coolify `w0vtdti0dfz83yem8gn3byoa` est affiché **Success**. Ces preuves restent datées; la connexion réelle n'en découle pas.

**Cause de non-réception confirmée à 09:40 UTC : blocage Maileroo du domaine de test.** Trois messages destinés au propriétaire sont marqués « Suppressed »; l'événement consulté indique un destinataire hors liste autorisée. Son ajout a été refusé car le nombre maximal de destinataires autorisés du domaine de test est atteint; aucune entrée existante n'a été supprimée. Le domaine propre `takatak.ca` est encore inactif, avec vérification DNS SPF/DKIM incomplète. Le quota d'envoi affiché n'est pas consommé : ce refus ne vient pas de ce quota. [Diagnostic et voie de résolution](DIAGNOSTIC-ENVOI-2026-10-30.md). Le blocage fournisseur reste non résolu; réception du code et consultation authentifiée des trois dossiers toujours non confirmées.

**Cinq correctifs du workspace sont terminés et contrôlés localement**, sur `codex/reprise-portail-2026-10-30` : caméra après fermeture/remplacement, éditeur pendant le chargement, sauvegarde de l'éditeur, réponse tardive d'envoi vidéo et décompression DOCX bornée. Résultats : **276/276 tests de la suite plateforme**, dont les **10 tests de fiabilité** (inclus dans 276), et **12/12 tests du site**; revue indépendante sans bloqueur. Le contrôle navigateur sur données fictives a vérifié l'éditeur au tiers de l'écran et l'export d'un véritable fichier DOCX. **Ce lot est maintenant commité localement dans `7a920ee195d7a492a4a95d7dacbd8b6d3e5732ca`, sans push ni déploiement encore confirmé.** Il ne fait pas partie du SHA en ligne contrôlé. Le constat de 09:29 UTC, antérieur au commit, reste historique.

[Preuves détaillées et recette restante](RECEPTION-2026-10-30.md). Le certificat et la bascule du portail ne sont plus les blocages constatés. Conserver le volume et la configuration existants; aucune nouvelle restauration n'est indiquée par ces contrôles. [Vision premium](VISION-PREMIUM-2026-10-29.md) : modules externes non activés, portions workspace D-029 déjà livrées.

## Historique et configuration conservée

Les configurations et états datés ci-dessous sont conservés pour la traçabilité. Le point courant est la réception du 30 octobre ci-dessus; ne pas répéter une restauration, une bascule ou un déploiement ancien à partir de ces traces.

Décision du 27 octobre 2026 : héberger le portail Node sur le serveur Coolify du propriétaire avec une image construite depuis GitHub. L’étape sans accès au serveur est historique : une instance HTTPS de test est désormais joignable. **Corpus restauré, connexion configurée, accès utilisateur réel non validé.** Le refus antérieur du paquet MochaHost reste conservé dans son historique; aucune protection de cet hébergeur n’a été désactivée.

La vitrine besoinavocat.ca, reconstruite sans WordPress, est prévue comme seconde application Coolify. Ses réglages et **l'ordre de bascule DNS sont décrits dans [STOREFRONT](STOREFRONT.md)**. Il faut d'abord détacher le courriel, car le MX pointe sur le domaine, puis déployer le portail et enfin la vitrine.

## État de l’essai distant — 28 octobre 2026

Cette section conserve son ancre de navigation et l'état historique du **29 octobre 2026**; le point courant est la réception du 30 octobre en tête du document. La PR 2 a livré `348d626`; le déploiement suivant était au SHA `efef6921201602ede0139af03bbfb92f43e6f90e`, intégrateur de connecteurs inclus. La [PR 3](https://github.com/takatakca/BESOINAVOCAT.CA/pull/3) a ensuite été fusionnée au SHA `ad8e2f4a31ebdafee2bc56acd36e861652d4623c`, six contrôles réussis. L’application suit `main`, répertoire `/platform`, Dockerfile `/Dockerfile`.

| Ressource | État constaté le 29 octobre |
|---|---|
| Projet | `BESOINAVOCAT` — `pwctapf4bxo821pbb9hvhaz8` |
| Environnement Coolify | `production` — `i16tncnyov97ttcvw5lxro96`; nom administratif, pas une recette utilisateur validée |
| Application | `besoinavocat-portail` — `fluzlqgkhifrgkmygknj4mjj` |
| Serveur | `vps1` — `31.220.96.134` |
| Déploiement | `7ypce4adkpnauc7jjqk6b197`, remplacement progressif réussi à 04:21:20 UTC, SHA `efef692` |
| URL d’essai | [Portail HTTPS de test](https://fluzlqgkhifrgkmygknj4mjj.31.220.96.134.sslip.io) |
| Santé | `/api/health` 200, `loginConfigured:true`; ce drapeau ne valide pas un mot de passe |
| Contrôles anonymes | `/api/cases` refusé en 401; trois chemins privés non exposés, 404 |
| Réception des demandes | Désactivée; la connexion configurée ne l’ouvre pas |
| Corpus | Restauration vérifiée dans `corpus-2026-10-28-v2` : trois dossiers, 1 362 documents, 1 185 blobs; base initiale conservée |
| Permissions | Propriétaire `1000:1000`; répertoires `0700`, fichiers privés `0600` |
| Configuration privée | Grants contrôlés par empreinte; clé de session de 32 octets créée une seule fois; variables de connexion et chemins du corpus appliqués par le redéploiement |
| Accès utilisateur | Mot de passe historique refusé; TAKATAK utilise un code courriel/SMS personnalisé. Correctif de connexion par code du portail testé et relu, pas encore déployé; aucune réinitialisation effectuée |
| Code courriel du portail | Supabase OTP distinct du code personnalisé TAKATAK; désactivé par défaut via `BESOINAVOCAT_EMAIL_OTP_ENABLED`. SMTP personnalisé activé, secrets inchangés; modèle avec `{{ .Token }}` FR/EN enregistré, relecture après rechargement confirmée. Livraison réelle du code à tester après déploiement |
| Recette restante | Consultation authentifiée, recherche, téléchargements et persistance en session réelle |

**Réception et restauration.** Les 35 segments ont été contrôlés, puis l’archive de 362 450 598 octets assemblée et vérifiée par empreinte à 04:16 UTC. La restauration dans une destination neuve, l’empreinte de la base et les permissions ont ensuite été contrôlées. Le gestionnaire de fichiers nécessitait des rafraîchissements; la cause des difficultés avec les gros téléversements n’est pas établie. Les reçus privés conservent les empreintes complètes et le détail opérateur.

**Connexion.** Le formulaire répond « Connexion non valide. Vérifiez vos accès TAKATAK. » avec le mot de passe historique. Le parcours actuel de TAKATAK utilise un code courriel/SMS personnalisé (`src/lib/auth/otp/service.ts` dans `takatak-v1`), tandis que le portail utilise encore le mot de passe Supabase. Ne pas demander de répéter l’ancien mot de passe. Le correctif de connexion par code courriel Supabase sur `codex/connexion-code-courriel` a réussi 233/233 tests du portail, 12/12 tests du site et 60/60 contrôles ciblés de connexion, avec revue indépendante. Il n’est pas encore déployé. Il conserve la même identité et les mêmes grants; son code n’est pas interchangeable avec celui du service personnalisé TAKATAK. Aucun accès authentifié, changement de mot de passe ou droit supplémentaire n’est annoncé. Conserver la clé de session et les grants déjà installés; ne pas les régénérer.

**Configuration de l’envoi du code.** Le propriétaire est connecté à Supabase. Le SMTP personnalisé est déjà activé avec `smtp.maileroo.com:465`; ses secrets sont inchangés. Le modèle Magic Link, auparavant rédigé comme une invitation personnalisée, conserve son lien et reçoit une présentation neutre FR/EN du code `{{ .Token }}`. La sauvegarde est effectuée; la relecture après rechargement est en cours. Le correctif reste désactivé par défaut et n’est pas encore déployé. Après contrôle final du modèle et déploiement, activer `BESOINAVOCAT_EMAIL_OTP_ENABLED=true` pour tester la livraison réelle du code puis la connexion. Aucun code n’a été envoyé par l’agent, aucune nouvelle identité n’a été créée. Une suite de tests simulés ne prouve ni la livraison du courriel ni la connexion réelle.

**Procédure de réception du correctif par le propriétaire ou Mike :**

1. Terminer la relecture après rechargement du modèle Magic Link enregistré : code `{{ .Token }}` visible dans la version FR/EN et lien antérieur conservé. Le SMTP personnalisé est activé; sa configuration seule ne prouve pas la réception effective du courriel. Ne publier aucun secret.
2. Le correctif ayant passé ses tests et sa revue indépendante, déployer son SHA exact sur le même volume. Conserver les fichiers de grants, la clé de session et les chemins de corpus installés. Ne pas recréer le compte ni déduire de nouvelles permissions du courriel.
3. Activer `BESOINAVOCAT_EMAIL_OTP_ENABLED=true` après ce contrôle final pour la réception réelle. Laisser désactivé si le modèle n’est pas confirmé; ne pas présenter la fonction comme opérationnelle sur la seule base de `loginConfigured:true`.
4. Le propriétaire demande un code depuis **BesoinAvocat**, puis saisit lui-même le code reçu dans le portail. Ne pas utiliser un code demandé depuis TAKATAK, ne pas inscrire le code dans GitHub et ne pas remplacer ce test par une session fabriquée.
5. Vérifier les trois catégories, une recherche avec référence de source, un téléchargement, la déconnexion et le refus anonyme. Consigner le SHA déployé, l’heure et les résultats, sans cookie, jeton ou code. Tant que ce parcours n’a pas réussi, garder « accès utilisateur non validé ».

**Compatibilité des sauvegardes.** `efef692` crée cinq tables `integration_*` au démarrage, même sans connecteur actif. L’ancien outil de sauvegarde refuse ces tables. Le correctif ajoute uniquement leurs noms à sa liste fermée, avec un test de sauvegarde, vérification et restauration du vrai schéma : échec reproduit avant correction, **12 tests Python réussis** après correction. Les tables inconnues restent refusées; les jetons restent chiffrés et la clé des connecteurs demeure hors de l’archive corpus. Ce correctif est fusionné par la PR 3 (`ad8e2f4`), six contrôles réussis; l’outil corrigé doit encore être installé/vérifié sur l’hôte avant une nouvelle sauvegarde. Conserver l’archive antérieure vérifiée.

La procédure privée `PROCEDURE-RESTAURATION-HOTE-COOLIFY-2026-10-28.md` et les reçus restent dans OneDrive. Python 3.12.3 et SQLite 3.45.1 sont disponibles sur l’hôte; l’outil utilisé pour restaurer l’archive antérieure était celui du commit `348d626`, contrôlé par empreinte. Ne pas confondre cet outil historique avec le correctif requis pour une sauvegarde après démarrage d’`efef692`. Aucun corpus, grant, clé ou secret dans GitHub.

Contrôle HTTPS distant du 28 octobre : **19/19 réussis**, dont sept assets identiques au code fusionné, cinq routes privées refusées en 401 et six chemins internes en 404. Le rapport `CONTROLE-COOLIFY-HTTPS-2026-10-28T17-33-00-004Z` est conservé dans les reçus privés. Ces contrôles ne testent pas une session utilisateur authentifiée.

Suite : terminer la relecture du modèle enregistré, déployer le correctif testé et relu, activer son parcours pour la réception et faire demander au propriétaire un code depuis ce portail. Confirmer la livraison du courriel et sa vérification, puis les trois dossiers, recherche/citations, téléchargements, déconnexion, refus d’accès et persistance. Aucun connecteur métier externe, paiement ou IA générative n’a été activé. Le domaine d’essai et le health ne prouvent aucune bascule DNS ni recette utilisateur complète.

## Ce qui a été vérifié localement (27 octobre)

Image construite avec `platform/Dockerfile` : Node 24.22.1, 331 Mo, aucune dépendance npm, utilisateur `node` non root, `/data` en 0700. Conteneur lancé avec un volume nommé sur `/data`, comme Coolify :

- statut Docker `healthy`;
- `/api/health` 200, `/demande` 200, `/api/catalog` ouvert;
- `POST /api/intake` synthétique 201 avec référence;
- après `docker restart`, la même clé d'idempotence renvoie **la même référence**, et la base contient une seule ligne;
- fichiers privés en 0600 dans `/data`.

Le service HTTPS de test et son health ont été contrôlés à distance le 28 octobre. La restauration a été vérifiée le 29 octobre; la connexion réelle, les contrôles en session et la persistance après redémarrage restent à vérifier. La compatibilité de sauvegarde après intégration des connecteurs est corrigée dans la PR 3 fusionnée; l’outil corrigé n’est pas encore annoncé installé sur l’hôte.

## Réglages de l'application dans Coolify

| Réglage | Valeur |
|---|---|
| Source | GitHub `takatakca/BESOINAVOCAT.CA`, via l'application GitHub de Coolify |
| Branche | `main` (PR 2 fusionnée à `348d626`); réserver les nouvelles branches aux préversions |
| Déploiement automatique | pour l'essai, celui de Coolify à chaque push; en production, le flux `coolify-deploy.yml` après CI verte sur `main`, comme dans takatak-v1 ([STOREFRONT](STOREFRONT.md#déploiement-automatique-comme-dans-takatak-v1)) |
| Build pack | Dockerfile |
| Base directory | `/platform` |
| Dockerfile | `/Dockerfile` |
| Port exposé | `8787` (ne pas le publier sur l'hôte : seul le proxy Coolify doit y accéder) |
| Domaine | d'abord un domaine d'essai (domaine `sslip.io` proposé par Coolify), puis `https://portail.besoinavocat.ca`. L'enregistrement `portail` est aujourd'hui un A vers MochaHost (`209.42.24.127`, la v1 bloquée); le passer à `31.220.96.134`. |
| Stockage persistant | un volume monté sur `/data`; ne jamais monter `/app` |

Variables d'environnement (les chemins privés sont déjà fixés dans l'image) :

| Variable | Valeur |
|---|---|
| `APP_ORIGIN` | `https://<domaine du portail>` |
| `BESOINAVOCAT_INTAKE_ALLOWED_ORIGINS` | `["https://<domaine du portail>"]`. Ajouter l'origine WordPress seulement si un formulaire WordPress doit poster ici. |
| `BESOINAVOCAT_TRUST_PROXY` | `1` : le visiteur est lu dans le dernier `X-Forwarded-For`, ajouté par le proxy de Coolify. Sans cette valeur, tous les visiteurs partageraient la même limite anti-abus. À ne pas activer si le port est exposé directement. |
| `BESOINAVOCAT_INTAKE_REQUEST_ENABLED` | `false` tant que l'ouverture de la demande détaillée n'est pas décidée (D-006); `true` l'ouvre |
| `TAKATAK_SUPABASE_URL`, `TAKATAK_SUPABASE_PUBLISHABLE_KEY` | plus tard, pour la connexion du propriétaire : clé **publique** seulement, jamais `service_role` (voir [BROWSER_AUTH](BROWSER_AUTH.md)) |
| `BESOINAVOCAT_ZOOM_*`, `BESOINAVOCAT_MICROSOFT_*`, `BESOINAVOCAT_GOOGLE_*`, `BESOINAVOCAT_DOCUSIGN_*`, `BESOINAVOCAT_CLIO_*`, `BESOINAVOCAT_STRIPE_WEBHOOK_SECRET`, `BESOINAVOCAT_TWILIO_*`, `BESOINAVOCAT_CANLII_API_KEY` | connecteurs, chacun seulement après la création de son compte développeur : liste exacte et étapes dans [INTEGRATIONS](INTEGRATIONS.md). Adresse de retour à déclarer chez chaque fournisseur : `https://<domaine du portail>/integrations/callback`. |

## Une seule fois, dans le terminal du conteneur

1. Clé de session (32 octets aléatoires, jamais affichée) :
   `node -e "require('fs').writeFileSync('/data/session.key', require('crypto').randomBytes(32), { mode: 0o600, flag: 'wx' })"`.
   Ne jamais la recréer ni la copier ailleurs que dans une sauvegarde privée.
2. `grants.json` en 0600 avec l'UUID TAKATAK du propriétaire, au format de [BROWSER_AUTH](BROWSER_AUTH.md). Uniquement au moment d'activer la connexion.
3. Corpus : restauration de la sauvegarde vérifiée dans un nouveau sous-dossier privé, selon la procédure ci-dessous. La sauvegarde doit être restaurée, pas copiée à chaud depuis une base active.
4. Clé des connecteurs (Zoom, Outlook, Google…), même règle que la clé de session :
   `node -e "require('fs').writeFileSync('/data/integrations.key', require('crypto').randomBytes(32), { mode: 0o600, flag: 'wx' })"`.
   Une nouvelle clé oblige chaque avocat à reconnecter ses services. Voir [INTEGRATIONS](INTEGRATIONS.md).

## Restaurer un corpus dans le volume Coolify

L'image Node ne contient ni Python ni `backup-corpus.py`. Le développeur exécute l'outil du dépôt sur un poste ou un hôte administré disposant de Python, avec accès privé à la sauvegarde et au volume. L'outil refuse une destination existante : **ne pas passer `/data` comme destination**, puisque ce volume existe déjà.

1. Relever et vérifier l'empreinte de l'archive privée; lancer `python platform/tools/backup-corpus.py verify --archive <archive-privee>` depuis le dépôt sur le poste opérateur.
2. Restaurer avec `python platform/tools/backup-corpus.py restore --archive <archive-privee> --destination <nouveau-dossier-prive-inexistant>`. La destination doit être hors du dépôt et des racines web. Le rapport doit confirmer les fichiers et empreintes.
3. Arrêter l'application pour la maintenance. Transférer le **dossier restauré et vérifié complet** par le canal privé administrateur vers un nouveau sous-dossier du volume, par exemple `/data/corpus-2026-10-28`. Ne jamais superposer une base existante ni ses fichiers WAL. Si la restauration a lieu sur l'hôte directement dans le volume, employer son véritable chemin hôte et le même sous-dossier inexistant.
4. Vérifier les empreintes après transfert; donner au compte `node` du conteneur les droits sur ce seul nouveau répertoire, avec dossiers 0700 et fichiers 0600. Confirmer son UID/GID sur l'image, sans supposer ceux de l'hôte.
5. Régler `DATABASE_PATH=/data/corpus-2026-10-28/platform.sqlite` et `BLOB_DIR=/data/corpus-2026-10-28/blobs`. Conserver les bases intake/sessions et leur clé à leurs chemins actuels distincts. Cette archive de corpus ne remplace pas une sauvegarde complète du volume.
6. Redémarrer, vérifier les trois dossiers avec l'identité réelle habilitée et télécharger des pièces pour contrôler les empreintes. Conserver les anciens chemins et leur sauvegarde pour le retour arrière; aucune suppression de base ni d'archive n'est requise.

## Contrôles après chaque déploiement

- `curl https://<domaine>/api/health` → 200. `intakeConfigured: true` seulement si les origines sont réglées.
- `loginConfigured: true` indique la configuration de connexion navigateur; vérifier ensuite la connexion réelle. `identityConfigured` concerne l'introspection Bearer et ne remplace pas ce contrôle.
- `/demande`, `/demande.js` et `/demande.css` → 200, avec l'en-tête `Content-Security-Policy`.
- `/api/cases` sans session → 401; `/.env` et `/server.mjs` → 404.
- Seulement après ouverture autorisée de la réception : une demande synthétique depuis la page reçoit une référence. Tant que les demandes sont désactivées, vérifier leur refus explicite.
- Redéploiement : les demandes déjà reçues restent présentes, ce qui prouve que le volume `/data` est conservé.

## Sauvegarde

Après installation complète, le volume `/data` contiendra les bases SQLite (mode WAL), les pièces, la clé de session et les grants. Sauvegarder avec une méthode cohérente pour SQLite, comme indiqué dans [CPANEL_NODE](CPANEL_NODE.md). Conserver ensemble la clé et la base des sessions. Avant d'y placer des dossiers juridiques réels, noter où se trouve physiquement le serveur : un hébergement hors Québec demande une évaluation des facteurs relatifs à la vie privée (Loi 25).
