# Espace de travail BESOINAVOCAT — pilote local

Ce dossier prépare un espace de dossiers, pièces, échanges et déclarations de temps. Il est distinct de la vitrine statique `site/` actuellement publiée sur Render. Il n’est pas raccordé au domaine WordPress `besoinavocat.ca`, à MochaHost ou à une identité TAKATAK réelle. Aucun dossier réel n’est importé par l’installation.

## Exécution locale

Prérequis : **Node.js 24.19 ou ultérieur dans la branche 24**. Le pilote utilise les modules natifs HTTP, cryptographie, fichiers et SQLite; aucune dépendance npm n’est nécessaire. SQLite est local au processus : cette version n’est pas une base distribuée et ne fournit pas de synchronisation entre plusieurs serveurs.

Depuis la racine du dépôt :

```sh
node platform/server.mjs
```

Le serveur écoute `127.0.0.1:8787`. La base et les pièces utilisent `platform/.data/`, exclu de Git. Ne jamais les placer dans `platform/public/`, `site/` ou un répertoire servi publiquement.

Pour utiliser une configuration locale, copier `.env.example` vers `platform/.env`, puis :

```sh
node --env-file=platform/.env platform/server.mjs
```

`HOST`, `PORT`, `DATABASE_PATH` et `BLOB_DIR` déterminent l’écoute et les emplacements privés. Les chemins relatifs d’environnement partent du répertoire de lancement. Garder l’écoute locale pour ce pilote; aucun accès public supplémentaire n’est nécessaire pour les tests.

## Identité et habilitations

L’API protégée exige `Authorization: Bearer <session TAKATAK>`. Il n’existe ni compte de démonstration accepté par le serveur, ni mot de passe local, ni décodage de JWT sans vérification. Sans session, elle répond 401. Sans raccordement TAKATAK configuré, une requête munie d’un jeton répond 503.

Le contrat d’intégration **préparé, non confirmé avec le service réel** utilise :

- `TAKATAK_IDENTITY_URL` : adresse HTTPS du service d’introspection dédié au produit, sans identifiants intégrés à l’URL.
- `TAKATAK_SERVICE_TOKEN` : secret serveur conservé hors dépôt.
- Requête serveur : POST JSON `{ "token": "session à vérifier", "product": "besoinavocat" }`, avec le secret de service dans l’en-tête Authorization.
- Réponse JSON vérifiée : exactement `{ "subject": "identifiant", "tenantId": "organisation", "product": "besoinavocat", "active": true }`.

Une réponse inactive, mal formée, destinée à un autre produit ou ajoutant des rôles est refusée. Les redirections du service d’identité sont refusées; les erreurs réseau ne créent jamais une identité de remplacement. Les tests injectent une fonction de vérification uniquement à travers `createApp`, dans leur propre processus local; aucun paramètre HTTP n’active cette possibilité.

L’organisation et l’adhésion au dossier sont contrôlées pour chaque accès. Le créateur d’un dossier reçoit le rôle **client**. Les rôles `owner` et `lawyer` nécessitent un provisionnement interne explicite avec `app.store.provisionMembership(...)`; cette opération n’a pas de route HTTP publique.

| Action | Client membre | Lawyer / owner membre |
|---|---|---|
| Lire le dossier, rechercher, télécharger | Oui | Oui |
| Déposer une pièce, écrire un message, déclarer du temps | Oui | Oui |
| Valider une déclaration de temps d’une autre personne | Non | Oui |
| Valider son propre temps | Non | Non |
| Consulter le journal du dossier | Non | Oui |

Une déclaration validée n’est ni une facture ni un paiement. Aucun tarif, encaissement ou attribution de valeur probante n’est effectué.

## Pièces, versions et provenance

Chaque dépôt conserve les octets reçus et calcule leur SHA-256 côté serveur. Le téléchargement exige toujours l’identité et l’accès au dossier, revérifie l’empreinte puis sert une pièce jointe `application/octet-stream` avec `nosniff`.

Les versions de document et le journal sont protégés contre la modification et la suppression par le schéma SQLite. Une nouvelle version référence explicitement la dernière version du même document dans le même dossier. Les anciens octets restent accessibles; une branche créée depuis une version dépassée est refusée.

Des octets identiques réutilisent un blob par organisation. Les occurrences et leurs provenances restent distinctes; `duplicateOf` et `sameHashDocumentIds` signalent seulement les correspondances du même dossier. Deux noms identiques avec des octets différents ne suffisent pas à établir un lien de version. Les doublons ne sont jamais additionnés à un montant.

Les catégories `original`, `declaration`, `analyse`, `ocr` décrivent la provenance déclarée. `controle_visuel` reste une déclaration de l’auteur du dépôt; `reviewIsCertification` reste faux. Le texte fourni pour recherche est identifié comme `user_supplied`, avec `extractionVerified: false`. Cette version n’exécute pas d’OCR ni d’analyse d’images, et un texte extrait ne remplace pas l’original.

Limites d’entrée : fichier 5 Mio; corps JSON de dépôt 8 Mio; texte de recherche fourni 200 000 caractères; message 20 000 caractères; description de temps 2 000 caractères; durée entière de 1 à 1 440 minutes. Les formats déclarés admis sont PDF, JPEG, PNG, WebP, TIFF, TXT, CSV, JSON, EML, DOC/DOCX et XLS/XLSX. Ce contrôle de format déclaré n’est pas un antivirus ni une vérification exhaustive du contenu binaire.

## API du pilote

Toutes les routes ci-dessous, sauf health, sont protégées :

| Route | Usage |
|---|---|
| `GET /api/health` | État technique et présence de configuration d’identité |
| `GET /api/me` | Identité vérifiée pour ce produit |
| `GET /api/capabilities` | Fonctions externes désactivées dans ce pilote |
| `GET/POST /api/cases` | Dossiers accessibles / création avec rôle client |
| `GET /api/cases/:caseId` | Pièces, échanges et temps du dossier |
| `POST /api/cases/:caseId/documents` | Pièce ou nouvelle version explicite |
| `GET /api/cases/:caseId/documents/:documentId/download` | Original de cette version avec contrôle SHA |
| `GET /api/cases/:caseId/search?q=...` | Recherche littérale dans nom, référence et texte fourni |
| `POST /api/cases/:caseId/messages` | Échange : `{ "body": "..." }` |
| `POST /api/cases/:caseId/time` | Temps : `{ "description": "...", "minutes": 30 }` |
| `POST /api/cases/:caseId/time/:timeId/approve` | Validation indépendante, corps `{}` |
| `GET /api/cases/:caseId/audit` | Journal pour owner/lawyer |
| `GET /api/integrations` | Connecteurs de la personne et leur état réel |
| `POST /api/integrations/:id/connect` · `/disconnect` | Démarre le consentement OAuth chez le fournisseur · retire le compte |
| `POST /api/integrations/complete` | Appelé par `/integrations/callback` : `{ "state", "code" }` |
| `POST /api/cases/:caseId/communications/:sessionId/integrations/:id` (`/remove`) | Réunion Zoom ou inscription Outlook/Google d'un rendez-vous (owner/lawyer) |
| `POST /api/webhooks/:provider` | Notifications signées de Zoom, Stripe, Twilio et DocuSign, sans session |

La recherche est une sous-chaîne littérale SQLite, limitée à 100 résultats; elle n’est pas une recherche sémantique ni une garantie de couverture documentaire. Les outils d’IA, paiements et Twilio ne sont pas raccordés. Les connecteurs Zoom, Outlook et Google fonctionnent dès que leurs accès développeur sont configurés : voir [INTEGRATIONS](../docs/INTEGRATIONS.md).

## Préparer un import du dossier maître

`tools/import-corpus.mjs` produit **uniquement un manifeste local**. Il ne comporte pas de client HTTP et n’effectue aucun téléversement. `--execute` est explicitement refusé tant qu’un mode d’import réel n’a pas été développé et autorisé après raccordement de l’identité.

Créer d’abord un dossier de sortie privé, ignoré par Git. Exemple générique depuis la racine du dépôt :

```sh
node platform/tools/import-corpus.mjs --corpus "CHEMIN/00_DOSSIER_MAITRE/06_Index_recherche/corpus.json" --root "CHEMIN/DU/DOSSIER_MAITRE" --output "platform/private-imports/preparation.json" --dry-run
```

Le dossier `platform/private-imports/` doit déjà exister. `--case "nom exact"` permet de limiter la préparation à un dossier. Un nom inconnu provoque un refus, jamais un import de tous les dossiers par défaut.

L’outil vérifie les fichiers, copies, sources parentes, extractions structurées et manifestes de preuve référencés contre leurs SHA-256. Il conserve noms, chemins, provenance, transformations des recadrages et qualifications des unités non documentaires, sans reprendre les corps de courriels ou textes extraits. Il s’agit d’une sélection de métadonnées de préparation, pas d’une migration complète : les contrôles visuels détaillés de chaque page et les autres propriétés du corpus ne sont pas tous reproduits; le corpus source reste référencé par son empreinte. Les sorties versionnées ou non ignorées à l’intérieur d’un dépôt Git sont refusées. Le fichier de sortie est créé sans écraser un manifeste antérieur.

Les chemins absolus ou sortant de la racine, les liens qui sortent de cette racine et les références `.git`/`.env` sont refusés. Une empreinte différente, une pièce manquante ou une provenance référencée introuvable interrompt la préparation. Une réussite prouve la concordance des fichiers au moment du contrôle, pas leur authenticité ou leur portée juridique. Le manifeste contient des renseignements privés et reste hors du site public.

## Vérifications et limites de livraison

```sh
node --test platform/test/*.test.mjs
```

Les tests utilisent seulement des personnes, dossiers et pièces synthétiques dans des répertoires temporaires. Ils couvrent l’identité refusée par défaut, l’isolation des organisations et dossiers, les rôles, les versions et empreintes, les doublons, les chemins, l’entrée JSON/base64, les tailles, le contenu potentiellement actif, les limites de temps, les approbations et les sorties privées de l’importateur. Les tests HTTP écoutent uniquement sur `127.0.0.1`. Un sandbox bloquant les connexions locales, les liens de test ou la création de Git temporaire exige une exécution locale autorisée; il ne faut pas supprimer ces contrôles pour obtenir un résultat vert.

Ces tests ne constituent pas une validation de l’authentification TAKATAK réelle, du raccordement à MochaHost, du domaine, de sauvegardes restaurables, d’une protection antivirus, d’un audit de sécurité ou d’une revue juridique. Le stockage local n’est pas chiffré par l’application. Les règles de conservation, sauvegarde, exploitation et provisionnement doivent être arrêtées avant l’ouverture à des dossiers réels.

Références techniques consultées : [tests Node.js 24](https://nodejs.org/docs/latest-v24.x/api/test.html), [cryptographie](https://nodejs.org/docs/latest-v24.x/api/crypto.html), [fichiers](https://nodejs.org/docs/latest-v24.x/api/fs.html). La vitrine publique reste indépendante de ce pilote.
