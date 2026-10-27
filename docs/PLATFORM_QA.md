# Contrôles de la plateforme — 26 octobre 2026

Le code final a été vérifié localement, y compris les sessions partagées et la restauration du corpus. **Cette version n'est pas encore installée sur le portail public.** Le serveur initial fonctionne chez MochaHost, mais cPanel a refusé la nouvelle archive avant son installation. Aucune connexion réelle ni activation du corpus distant n'est attestée ici.

## Tests locaux exécutés

Les tests Node ont été exécutés sous **24.19.0**, hors sandbox pour les connexions et processus locaux. Ils emploient des identités, réponses fournisseur et fichiers synthétiques; les reçus détaillés restent privés.

| Exécution | Résultat | Portée |
|---|---|---|
| Ensemble Node : site, plateforme et lanceur Passenger | **96/96 réussis** | Régression du site, API, identité, sessions, préparation/import du corpus et adaptation d'hébergement. |
| Reprise ciblée après les corrections de cookies et de transmission de l'environnement au lanceur | **20/20 réussis** | Refus des cookies ambigus et cohérence de la configuration effective. |
| `platform/test/test_backup_corpus.py` | **9/9 réussis** | Snapshot SQLite avec WAL actif, restauration, pages et triggers conservés, empreintes, séparation des tenants, refus des archives ou chemins invalides. |
| `platform/deploy/test_build_bundle.py` | **3/3 réussis** | Liste blanche, exclusion des données privées, empreintes, reproductibilité et refus d'un fichier requis absent ou vide. |

Ces exécutions se recouvrent : les 20 tests de reprise ne sont pas 20 fonctionnalités supplémentaires. Les tests HTTP n'appellent aucun compte TAKATAK réel.

La couverture porte notamment sur :

- Refus anonyme, vérification du tenant et de l'appartenance au dossier, téléchargement authentifié, rôle client sans promotion implicite et interdiction d'approuver son propre temps.
- Conservation des originaux, SHA-256, versions et occurrences de doublons; import idempotent, quotas, contrôle des références, pagination et citations des textes disponibles.
- Entrées malformées, bornes de durée et de téléversement, chemins, échappement du texte affiché, absence de données de dossier dans l'aperçu fictif.
- Connexion limitée à POST, protection Origin/en-tête, ambiguïté cookie/Bearer, grants relus, expiration, erreurs fermées et absence de mot de passe ou refresh token conservé.
- Sessions SQLite chiffrées, deux instances et un véritable second processus Node : résolution et déconnexion partagées, fermeture d'un worker sans révocation des autres, course déconnexion/vérification, mauvaise clé, altération du payload et limites communes. Les tests inspectent aussi DB/WAL pour l'absence des secrets synthétiques en clair.

Le détail des garanties et limites de session figure dans [BROWSER_AUTH.md](BROWSER_AUTH.md). Une revue indépendante a également porté sur les routes, le lecteur documentaire et le stockage partagé; elle ne constitue pas un audit externe de sécurité.

## Snapshot réel créé et restauré en privé

Une sauvegarde du corpus importé localement a été **créée, vérifiée puis restaurée** dans un emplacement privé distinct. Le contrôle de la restauration a confirmé :

| Mesure | Valeur |
|---|---:|
| Dossiers | 3 |
| Documents, comptés comme occurrences par dossier | 1 359 |
| Pages ou unités conservées | 3 098 |
| Blobs uniques dans le tenant | 1 182 |
| Taille totale de ces blobs | 332 242 396 octets |

SHA-256 de la base snapshot contrôlée : `37eeb867bb55676dc45f5fc5d82b7a549fb7593cbe1aa62b8543850bb5138249`.

Les occurrences dans plusieurs dossiers ne deviennent pas des preuves indépendantes ni des dépenses à additionner. Ces compteurs ne prouvent pas l'exhaustivité des dossiers. Les noms de dossiers, identités, archives et reçus détaillés ne sont pas publiés dans ce dépôt.

L'[outil de sauvegarde](../platform/tools/backup-corpus.py) prend un snapshot SQLite cohérent et uniquement les blobs référencés. Il exclut sessions, clés et grants. Son ZIP n'est pas chiffré; il doit rester dans un stockage privé. Les empreintes détectent une altération, sans authentifier à elles seules l'auteur d'une archive. Ce résultat local ne constitue pas une restauration sur le serveur distant.

## État distant et blocage de la mise à jour

Le portail [portail.besoinavocat.ca](https://portail.besoinavocat.ca/) a réellement démarré avec **Node.js 24.22.1**, Passenger et HTTPS. Sur le code initial, les contrôles ont obtenu : health **200**, accès anonyme aux dossiers **401**, `/server.mjs` et `/.env` **404**. Les emplacements applicatif et privés ont été comparés à 49 racines web sans chevauchement. Voir [CPANEL_NODE.md](CPANEL_NODE.md) pour les procédures d'exploitation.

La configuration serveur de l'authentification, les grants et la clé de session sont en place. Cependant, le **code initial sans le nouveau raccordement d'authentification reste en ligne** : leur présence ne prouve pas leur utilisation par l'application ni une connexion réussie.

cPanel a refusé l'archive v2 de **73 236 octets / 17 entrées**, SHA-256 `6593ad7db2028e63f22809a1d23f1334d1fb3c3f4283786730738c2e9923c71c`, avec l'alerte **`Sanesecurity.Foxhole.JS_Zip_11.UNOFFICIAL`**. Cette version n'a pas été installée. Le traitement de cette alerte nécessite la vérification du paquet exact par l'hébergeur; elle n'est pas qualifiée de faux positif sans ce contrôle. Aucun contournement ou arrêt de l'antivirus n'a été effectué.

La copie privée du corpus était en cours au dernier contrôle. **Ni sa réception complète, ni sa restauration distante, ni son activation ne sont déclarées réussies.** Le parcours connecté réel et l'accès aux pièces restent à vérifier après installation autorisée du code.

## Navigateur et CI

Le contrôle navigateur initial de la démonstration locale a validé navigation, recherche fictive, provenance, échanges désactivés, distinction temps soumis/validé et absence d'erreur console. Il concernait l'ancienne interface sans connexion active; il ne valide pas la nouvelle connexion HTTPS ni le lecteur avec le corpus réel. Les contrôles de la vitrine WordPress sont consignés séparément dans [WORDPRESS_QA.md](WORDPRESS_QA.md).

Le workflow [platform-checks.yml](../.github/workflows/platform-checks.yml) fixe Node 24.19.0, exécute les suites natives de plateforme — dont l'authentification partagée — et Passenger, les contrôles syntaxiques, **les trois tests du bundle et les neuf tests de sauvegarde/restauration**. Sa configuration ne prouve pas qu'une exécution GitHub Actions de cette révision a réussi; consulter le reçu de la révision publiée.

## Contrôles encore nécessaires

Installation de la version finale après résolution du blocage hébergeur; connexion réelle, cookies, déconnexion et retrait de grant sous le domaine final; comportement entre workers Passenger; absence de données sensibles dans les logs; restauration et empreintes du corpus distant avant activation. Restent aussi les essais de charge et de capacité, supervision et sauvegardes récurrentes, protection opérationnelle des téléversements, audit externe et contrôle d'accessibilité/mobile réel.

Aucune fonction d'IA, de voix, d'invitation ou de paiement réel n'est activée par ces tests.
