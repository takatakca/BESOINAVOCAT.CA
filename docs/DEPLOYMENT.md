# DEPLOYMENT — BESOINAVOCAT.CA

## Production vérifiée
- Plateforme : Render Static Site, nom \`besoinavocat\`.
- URL provisoire publique : \`https://besoinavocat.onrender.com\`.
- Render workspace ID : \`tea-d04kpsali9vc73eskv8g\`.
- Render service ID : \`srv-db7srnmi0phs73ahkue0\`.
- Répertoire de publication : \`site\`.
- Branche GitHub : \`main\`; autoDeploy : \`yes\`; commit déclenche un nouveau déploiement.
- Commande de build sur Render : \`test -s site/index.html && test -s site/styles.css\`.
- Aucun secret requis pour le MVP statique.
- Domaine cible : \`besoinavocat.ca\`, non confirmé sur Render.

## Contrôles préalables
\`\`\`sh
node --check site/app.js
node --check site/guide.mjs
node --test tests/*.test.mjs
\`\`\`
Le workflow \`.github/workflows/checks.yml\` effectue ces vérifications sur chaque push sur \`main\` et sur les PR.

## Contrôle post-déploiement
1. Vérifier \`GitHub Actions → Quality checks\` : conclusion success sur le commit attendu.
2. Vérifier le dernier déploiement Render du service : \`status=live\` et \`commit.id == SHA\` poussé sur \`main\`.
3. Exécuter \`SITE_URL=https://besoinavocat.onrender.com node scripts/production-smoke.mjs\` (ou le workflow manuel **Production availability smoke test**).
4. Ouvrir \`/\`, \`/confidentialite.html\`, \`/conditions.html\`, \`/health.json\`; vérifier interface, aucun message console bloquant.
5. En cas d'échec, inspecter les journaux Render et GitHub Actions; ne pas déclarer la version courante déployée.

## Surveillance planifiée
\`.github/workflows/production-smoke.yml\` : contrôle en lecture seule quotidien à 10:17 UTC, déclenchable manuellement et automatiquement après le succès du workflow Quality checks sur `main`. Il effectue jusqu'à six tentatives espacées de 12 secondes pour laisser Render publier. Il n'effectue aucun redéploiement ni aucune relance autonome de l'agent de code.

## Pages et DNS
GitHub Pages reste optionnel et son workflow ne s'exécute que si la variable GitHub \`ENABLE_GITHUB_PAGES=true\` et la source Pages GitHub Actions sont activées. **Ne pas l'activer sans décision d'hébergement.**

Pour le domaine personnalisé :
1. Vérifier la propriété du domaine et l'accès au DNS, identifier les enregistrements actuels.
2. Ajouter le domaine sur le service Render; suivre les instructions DNS exactes affichées.
3. Activer/vérifier TLS et redirections, puis tester \`https://besoinavocat.ca\` et éventuellement \`www\`.
4. Mettre à jour les URLs canoniques, sitemap et documentation *seulement une fois le domaine réellement accessible*.

## Sauvegarde / rollback
Historique GitHub + déploiements Render. En cas d'incident, revenir à un commit fiable par un **nouveau commit de correction/revert**; ne jamais faire de force-push destructif. Conserver la référence de la version stable. Pas de base de données à sauvegarder dans cette version.

## Durcissement à envisager
Pour un site statique, les vrais en-têtes de réponse HTTP se configurent dans **Render Dashboard → Settings → Headers** (ex. X-Content-Type-Options, Referrer-Policy, Permissions-Policy, anti-framing). Le CSP méta actuel n'est pas un substitut complet aux en-têtes serveur. Ne pas annoncer les en-têtes comme appliqués tant que vérification HTTP absente.
