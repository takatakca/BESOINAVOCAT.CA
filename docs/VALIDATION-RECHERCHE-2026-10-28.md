# Validation — recherche, dictée et corpus local

**PR 2 fusionnée dans `main` le 28 octobre 2026, au commit `348d626b76d4adcd874cc7485d2e744006b249c9`.** Configuration du serveur en cours, recette login/corpus non validée.

**État figé — 29 octobre 2026, 03:18 UTC :** déploiement HTTPS de test joignable; dernier health confirmé : 200 (`mode:pilot`, `identityConfigured:false`, `loginConfigured:false`, `intakeConfigured:true`), demandes désactivées. Volume `/data` créé. Après activation de l’accès aux fichiers locaux, la deuxième tentative de téléversement a échoué par perte de connexion à l’extension Chrome; reconnexion demandée. **Transfert non confirmé; aucune installation du corpus, des grants, de la clé de session ni des variables de connexion confirmée.** Procédure privée de restauration prête, non exécutée; recette login/corpus non validée. [Identifiants et suite](COOLIFY.md#état-de-lessai-distant--28-octobre-2026).

**Historique du code validé avant fusion : `aaf64efec669aac769d7b23d8c26644ec67b5459`.** Contrôles GitHub réussis : [portail](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40668400373), [vitrine](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40668400430), [qualité](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40668400332), [QA navigateur du site d’orientation](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40668400336). Les deux contrôles au push sont également verts. La fusion est achevée; l’activation du portail reste une étape distincte.

Le site d’orientation Render, dont le contenu `site/` est inchangé, a été republié au commit `348d626b76d4adcd874cc7485d2e744006b249c9`; les sept URL du smoke public passent. Ce contrôle ne valide pas le portail Node ni les dossiers privés.

Ce second lot complète la [PR 2](https://github.com/takatakca/BESOINAVOCAT.CA/pull/2), à la demande explicite du propriétaire de poursuivre son tableau de bord et le travail juridique en parallèle. Il ne redessine pas la vitrine. La validation du premier lot est conservée dans [VALIDATION-LOT](VALIDATION-LOT-2026-10-28.md).

## Résultats de code

- Recherche visible depuis l'accueil et la navigation; choix de tous les dossiers autorisés ou d'un dossier précis.
- Recherche par mots utiles ou expression normalisée, pagination sans plafond silencieux de 100 résultats, extraits liés aux sources.
- Ouverture et téléchargement dans le dossier du résultat; lecteur avec saut direct à une unité. Une page PDF est distinguée d'une unité logique d'un courriel ou tableur.
- Dictée FR/EN démarrée au clic, recherche automatique à la fin si l'option est sélectionnée, clavier disponible, annulation par Escape, navigation ou déconnexion. Réponses périmées ignorées; réactivation des contrôles après modification d'une requête en cours.
- L'interface décrit une recherche sourcée. **L'IA générative n'est pas connectée**; aucun modèle ni paiement appelé. Voir [RECHERCHE-ET-DICTEE](RECHERCHE-ET-DICTEE.md) et le [contrat API](SEARCH.md).

## Contrôles exécutés

| Contrôle | Résultat |
|---|---|
| Suite complète Node 24.19 (portail, site, Passenger, compatibilité formulaire) | **231 tests réussis**, aucun échec ou test ignoré |
| Archive de déploiement après ajout des deux modules | **3 tests Python réussis**, fichiers privés exclus |
| Sauvegarde/restauration applicative | Les 11 tests Python du premier lot restent applicables; une nouvelle sauvegarde du corpus réel a également été créée et restaurée avec vérification |
| QA du navigateur avec exemples fictifs | Ordinateur, 390 et 320 pixels, clavier, résultats et ouverture inter-dossiers : réussie; aucun débordement mesuré |
| Source réelle, SQLite en lecture seule | Six recherches positives, 18 citations résolues et 16 empreintes de pièces vérifiées; base source inchangée |
| Copie privée complétée, API HTTP locale | Trois dossiers; six recherches; trois nouveaux documents retrouvés et téléchargés avec empreintes concordantes; refus anonyme confirmé |
| Dossier maître local, lecture seule | 2 038 pages HTML, 23 677 liens, 4 171 ancres : zéro erreur; 56 recherches de contrôle réussies |

Les tests HTTP du corpus utilisent une identité injectée dans le processus de test sur la boucle locale. **Ils ne constituent pas une connexion réelle au compte de production ni une validation de mot de passe.** Les rapports, captures et pièces restent dans le OneDrive privé, hors de ce dépôt.

## Rapprochement du corpus

Les trois empreintes absentes du portail provenaient de documents de travail transversaux exclus des trois filtres initiaux. Elles ont été ajoutées au dossier concerné dans une **nouvelle copie privée**, après plan et vérification. Leur statut de projet non envoyé est conservé; deux formats d'un même projet ne deviennent pas deux preuves d'envoi. Aucun compte ou droit n'a été créé.

Cette copie compte **1 362 occurrences, 1 185 empreintes distinctes et 3 101 unités indexées**. La sauvegarde v2 a été restaurée dans une destination neuve, avec ces mêmes compteurs et la même empreinte de base. La restauration antérieure, les originaux et le paquet de 312 annexes sont intacts. Les informations de restauration sont dans le reçu privé `ETAT-PORTAIL-2026-10-28.md` et la procédure générale [COOLIFY](COOLIFY.md).

Ces compteurs décrivent le corpus disponible, pas l'exhaustivité du dossier juridique. Les unités sans texte et les pièces manquantes restent identifiées. Un rapprochement frigoriste complémentaire a conservé deux dates et deux montants divergents; la facture native annoncée n'a pas été obtenue. Le compte de messagerie nécessaire n'était pas présent dans les sessions de navigateur disponibles.

## Réception encore requise

1. Compléter l’application de test Coolify existante : vérifier le SHA installé, rétablir la connexion au navigateur, contrôler l’état des fichiers distants avant une nouvelle tentative, terminer et vérifier le transfert privé, puis installer et contrôler le corpus privé v2 et la configuration de connexion prévue. Ne pas recréer le volume `/data` ni les comptes. Préserver le courrier lors du changement DNS et la sauvegarde WordPress complète.
2. Vérifier la vraie connexion, les trois dossiers, la recherche, les originaux et la persistance après redémarrage sur HTTPS.
3. Essayer le microphone physique dans le navigateur de l'utilisateur. Aucune capture ambiante n'a été lancée pendant la QA; les états de reconnaissance ont été testés avec un simulateur.
4. L'IA générative, OAuth Zoom, les appels intégrés et les paiements sont encore des raccordements distincts. Ne pas les annoncer actifs.

Au contrôle distant du 28 octobre antérieur à la configuration en cours, le portail répondait avec l’ancien health (`identityConfigured:false`), et `/demande` renvoyait 404. **Configuration du serveur en cours, recette login/corpus non validée.** Le nouvel essai Coolify prouve seulement un service HTTPS joignable avec connexion désactivée. Les vérifications locales et le smoke Render ne prouvent pas la recette login/corpus.
