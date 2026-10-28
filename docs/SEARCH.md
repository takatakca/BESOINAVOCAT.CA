# Recherche structurée du portail

Le pilote recherche le texte et les métadonnées déjà indexés dans les dossiers auxquels la session courante a accès. Il ne génère pas de réponse juridique et n'appelle aucun modèle d'IA. `GET /api/capabilities` expose `structuredSearch: true` et `ai: false`.

## API authentifiée

Exemple entièrement fictif : `GET /api/search?q=montre-moi%20les%20factures%20de%20FournisseurDemo`.

Paramètres autorisés, sans doublons :

| Paramètre | Valeur |
|---|---|
| `q` | Texte requis, de 1 à 200 caractères, avec au moins un mot utile |
| `caseId` | UUID facultatif ; son absence recherche tous les dossiers autorisés |
| `mode` | `terms` par défaut ou `literal` |
| `offset` | Entier de 0 à 100000, par défaut 0 |
| `limit` | Entier de 1 à 50, par défaut 25 |

En mode `terms`, accents, ligatures et espaces sont normalisés. Une liste explicite de mots de commande français/anglais est ignorée et certains pluriels documentaires sont ramenés au singulier. L'exemple ci-dessus devient `['facture', 'fournisseurdemo']`. Les 1 à 12 termes utiles doivent tous apparaître dans une même unité de texte ou ses métadonnées. Ce traitement est déterministe ; il ne comprend pas arbitrairement le langage naturel. Le mode `literal` recherche une expression contiguë normalisée. L'ancienne route `/api/cases/:id/search` conserve son comportement littéral.

```json
{
  "query": "montre-moi les factures de FournisseurDemo",
  "mode": "terms",
  "terms": ["facture", "fournisseurdemo"],
  "results": [],
  "offset": 0,
  "limit": 25,
  "hasMore": false,
  "nextOffset": null,
  "scope": { "caseIds": [] },
  "ai": false,
  "searchedSource": "indexed_text_and_metadata"
}
```

Le tableau `results` conserve les champs publics du document (`id`, `name`, `downloadUrl`, empreinte et provenance), auxquels s'ajoutent `documentId`, `caseId`, `caseTitle`, `excerpt`, `matchSources` et `citation`.

Une citation contient `documentId`, `sourceDocumentId`, `sha256`, `ordinal`, `page`, `unitKind`, `method`, `ocrToVerify`, `extractionVerified: false` et `pagesUrl`. Cette dernière URL ouvre l'unité indexée avec `offset=ordinal-1&limit=1`. `unitKind` vaut `pdf_page` uniquement pour un PDF, sinon `logical_unit` : une feuille, un courriel ou une extraction ne devient pas une page physique par simple numérotation.

Au moins un terme doit réellement apparaître dans le texte de l'unité pour produire une citation. Une correspondance uniquement par nom, référence, catégorie ou texte de téléversement non paginé conserve `citation: null`. L'extrait indique alors sa provenance ; il ne fabrique pas de page. Une citation valide ne certifie pas le contenu OCR ou les faits de la pièce.

## Portée, pagination et limites

- Les droits `tenantId` et `subject` sont ceux de la session vérifiée. L'API ne les accepte pas en paramètres. Les appartenances aux dossiers sont relues à chaque recherche.
- La consultation des unités et le téléchargement contrôlent de nouveau les droits. Une révocation rend les anciennes URLs inaccessibles avec un statut 404.
- `hasMore` est établi par une correspondance supplémentaire ; `nextOffset` permet de continuer sans le plafond silencieux de 100 résultats de l'ancienne recherche. Aucun total exact n'est annoncé.
- L'ordre est stable par dossier, document et unité, puis par document pour les correspondances sans citation. Les droits ou le corpus peuvent changer entre deux requêtes : la pagination n'est pas un instantané transactionnel de longue durée.
- Le journal conserve mode, nombre de résultats et pagination, sans enregistrer le texte de la requête.
- Les unités sans texte, les pièces non importées et les pièces jointes non extraites ne deviennent pas recherchables. Les versions et doublons restent des occurrences distinctes, sans addition comptable implicite.
- Le moteur synchrone parcourt l'index local SQLite ; ce pilote n'est pas un moteur distribué ni une recherche sémantique.

Les tests synthétiques couvrent l'isolation, la révocation, la validation HTTP, la pagination au-delà de 100 correspondances, les extraits Unicode et les citations. Le rapport portant sur les véritables dossiers reste dans le répertoire privé OneDrive ; aucun contenu ni identifiant de ces dossiers ne doit être ajouté à ce dépôt public.
