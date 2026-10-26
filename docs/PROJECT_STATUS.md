# PROJECT_STATUS — BESOINAVOCAT.CA

**Priorité : rendre l'accès personnel au backend réellement utilisable avant de poursuivre la vitrine.** État documentaire vérifié le 26 octobre 2026; aucun nouveau déploiement réalisé par cette mise à jour.

## État des trois surfaces

| Surface | Fait vérifié | Ce qui reste ouvert |
|---|---|---|
| `besoinavocat.ca` | WordPress HTTPS chez MochaHost; plugin d'habillage 0.1.2 actif et page `tableau-de-bord` publiée comme aperçu | Nouvelle présentation FR/EN et parcours de formulaires en travail local; aucune activation annoncée |
| `portail.besoinavocat.ca` | Première version technique Node/Passenger joignable; contrôle HTTP courant health 200 (`mode: pilot`, `identityConfigured: false`), dossiers anonymes 401 | Archive v2 avec connexion/corpus refusée par antivirus; pas de connexion utilisateur réelle ni de corpus distant actif validé |
| `besoinavocat.onrender.com` | Site d'orientation statique distinct, service Render actif sur `main` | Ne fournit pas le backend ni les dossiers; ne pas déplacer le domaine WordPress vers Render |

## Backend : réalisé et restant

Le code de `platform/` inclut les sessions navigateur TAKATAK via son fournisseur confirmé, les grants explicites et droits par dossier, les sessions SQLite chiffrées partagées entre workers, les pièces/versions avec SHA-256 et provenance, la recherche littérale avec citations par page, les échanges, le temps soumis à validation indépendante et le journal d'audit. Ce code ne prouve pas son activation sur l'hébergement.

Le corpus a été importé localement dans trois dossiers distincts. La sauvegarde applicative a été vérifiée puis restaurée localement avec contrôle SQLite, tailles et empreintes. Une copie privée de cette sauvegarde a été reçue chez MochaHost avec empreinte concordante. **Copie distante de sauvegarde seulement : aucune restauration ni activation du corpus dans le portail distant.** Les occurrences communes ne s'additionnent pas comme de nouvelles pièces; les déclarations, analyses, OCR et vérifications ouvertes gardent leur statut. Les originaux et le paquet de 312 annexes ne sont pas modifiés.

MochaHost a refusé le paquet `besoinavocat-cpanel-2026-10-26-v2.zip` avec `Sanesecurity.Foxhole.JS_Zip_11.UNOFFICIAL FOUND`. Son SHA-256 est `6593ad7db2028e63f22809a1d23f1334d1fb3c3f4283786730738c2e9923c71c`. Le rejet n'est pas résolu par les tests du code. L'analyse du paquet exact par l'hébergeur reste attendue; aucune neutralisation de l'antivirus ou autre méthode d'installation pour esquiver le contrôle n'est autorisée. La recherche courriel ciblée rapportée lors de cette reprise n'a pas retrouvé de réponse concernant l'archive; elle ne prouve pas l'absence de toute réponse par une autre voie.

Les paramètres serveur et fichiers privés ont été préparés selon les reçus, mais la première version technique n'exploite pas encore le nouveau raccordement. **Aucune connexion réelle de l'utilisateur, consultation de ses dossiers en production ou configuration de son mot de passe n'est déclarée effectuée.** Les futurs essais doivent utiliser son identité TAKATAK existante et ses habilitations, sans nouvelle autorité d'identité ou permission implicite.

Les modules locaux de parcours/formulaire (`intake` / `funnel`) sont préparés et testés localement. Aucun état de déploiement, collecte réelle, paiement ou succès de formulaire n'en découle. Voir [TASK_QUEUE](TASK_QUEUE.md) pour l'ordre des tâches.

## GitHub et Render contrôlés

- `main` : `b56d027c4172ddde5e362497731ac1ae80805fe0`.
- Branche `codex/espace-client-avocat` : `ee278313707bbec608c15df11e402decce66f7ee`, identique entre copie locale et distante lors de la lecture; trois commits d'avance, aucun retard, 57 fichiers différents et aucun changement dans `site/`.
- [PR 1](https://github.com/takatakca/BESOINAVOCAT.CA/pull/1) ouverte en brouillon; aucune issue retournée par la recherche.
- Au SHA `ee27831`, [Quality checks](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40305370703), [Browser QA](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40305370666) et [Platform pilot checks](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40305370653) sont réussis. Ces résultats ne couvrent pas les modifications locales ultérieures.
- Render : service `srv-db7srnmi0phs73ahkue0`, déploiement `dep-db8qsb6k1f9s73epefs0` **live au SHA de main**, publication de `site/`, déploiement automatique depuis `main` actif.
- [Smoke public du 26 octobre](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40362705338) réussi. Il vérifie le site Render, pas la connexion ou le corpus MochaHost.

## Vitrine et contenu préservés

L'export WordPress préalable comportait 348 pages, dont 347 publiées; il précède la création de l'aperçu. La sauvegarde privée et l'export restent hors Git. Les corrections ciblées ont porté sur les anciennes marques d'opérateur et des promesses promotionnelles injustifiées, sans supprimer les articles, URL ou informations documentaires. Les noms de cabinets cités à titre éditorial ne deviennent pas des partenaires.

Le plugin 0.1.2 et sa page 5820 ont été contrôlés sur ordinateur; trois lint PHP et `check-render.php` ont réussi lors de l'installation. Le chevauchement de l'accueil a été corrigé à 1 265 px; cette preuve ne vaut pas contrôle de toutes les tailles. Les tests mobiles, le parcours FR/EN et les nouveaux formulaires restent à effectuer sur leur version livrée. Le téléphone de contact fourni est le **514-825-2825**, sans service automatisé activé. Yan Romanowski est le seul partenaire déclaré par le propriétaire; cette déclaration n'est pas une vérification professionnelle indépendante.

## Conditions commerciales et limites

- Demandes clients toujours gratuites, sans condition d'engagement avec un avocat.
- Offre professionnelle : **100 CAD/semaine ou 300 CAD/mois**.
- **Crédits IA en supplément**; honoraires juridiques distincts.
- Paiements, abonnements, crédits IA, voix et services automatisés non activés. Aucune facturation ou souscription implicite.

Les anciens nombres de tests et mentions « aucune application créée » présents dans les états antérieurs décrivent des étapes précédant `ee27831`; ils ne doivent plus guider la reprise. La clôture du prochain lot exige une connexion réelle, des accès correctement isolés, des téléchargements et citations vérifiés, puis un contrôle de déconnexion, sans exposer de secrets ou de pièces dans les journaux.

## Lot local contact et WordPress 0.2.0

Catalogue et réception privée, parcours FR/EN, tarifs 100 CAD/semaine ou 300 CAD/mois et corrections éditoriales ciblées préparés; 133 tests Node et 12 tests Python réussis. Aucun déploiement ni nouvel accès réel. PHP et contrôle visuel WordPress à confirmer avant publication. Voir [INTAKE_QA.md](INTAKE_QA.md) et [INTAKE_API.md](INTAKE_API.md). Les états du contrôle Git préalable ci-dessus ne décrivent pas le nouveau commit de ce lot.
