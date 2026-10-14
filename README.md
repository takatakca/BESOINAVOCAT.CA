# BESOINAVOCAT.CA

Site d'orientation juridique généraliste pour le Québec — version initiale (MVP statique), en français.

## État actuel (14 octobre 2026)

- Interface responsive et accessible en français : huit domaines de droit, sélection de région, niveau d'urgence, intérêt pour l'aide juridique.
- Guide généré localement dans le navigateur, lien vers le Barreau du Québec, JuridiQC et la Commission des services juridiques.
- Copie volontaire du plan; **aucune donnée personnelle n'est envoyée, enregistrée ou partagée** par l'outil.
- Mentions de confidentialité et d'utilisation adaptées à ce périmètre (à réviser avec un responsable juridique avant les futurs traitements de données).
- Tests unitaires Node.js natifs et GitHub Actions pour contrôle qualité.
- Workflow GitHub Pages prêt à publier à chaque commit sur main **une fois la source GitHub Pages configurée**.

Le produit n'est **pas encore** un annuaire propriétaire, un réseau de mise en relation, un cabinet d'avocats ou une plateforme de traitement de dossiers.

## Démarrage local

Sans installation de dépendances :

\`\`\`sh
python3 -m http.server 8080 --directory site
# ouvrir http://localhost:8080
\`\`\`

Le navigateur doit accéder aux fichiers par HTTP local, car le script utilise des modules ES.

## Tests

\`\`\`sh
node --check site/app.js
node --check site/guide.mjs
node --test tests/*.test.mjs
\`\`\`

Node 22 recommandé. Les vérifications sont aussi lancées par les workflows GitHub Actions.

## Déploiement

Le workflow \`.github/workflows/pages.yml\` publie le dossier \`site/\` vers GitHub Pages lors des pushes sur \`main\`, à condition d'avoir activé **Settings → Pages → Build and deployment → Source: GitHub Actions**. Sans cette activation, l'étape \`configure-pages\` échouera; un fichier de workflow ne suffit pas à activer Pages.

Ne pas créer de fichier CNAME avant que le domaine soit vérifié, que le DNS pointe vers l'hébergement choisi et que HTTPS soit fonctionnel. Le déploiement GitHub Pages n'est **pas** un déploiement automatique vers l'hébergement commercial du nom de domaine \`besoinavocat.ca\`.

## Sécurité et respect de la vie privée

- Pas de formulaire de dossier confidentiel ni de collecte de leads.
- Pas de cookies analytiques, publicitaires ou d'intégrations tierces sur les pages.
- Politique CSP restrictive. Liens externes \`noopener noreferrer\`.
- Contenus généraux sans promesse juridique; aucune usurpation d'appartenance au Barreau.
- L'hébergeur peut disposer de journaux techniques. Vérifier leur politique et les obligations applicables lors du déploiement.

## Prochaines phases (non réalisées)

Voir [docs/RELEVE.md](docs/RELEVE.md). Le périmètre réel d'une plateforme de mise en relation, ses partenaires, rôles, contrats, consentements, processus de vérification et traitements de données nécessitent des décisions métier et des contrôles de sécurité avant ouverture en production.
