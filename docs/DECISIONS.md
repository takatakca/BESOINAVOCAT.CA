# DECISIONS — BESOINAVOCAT.CA

Journal des décisions et hypothèses qui guident le code. Une hypothèse ne devient pas une autorisation métier.

## D-009 — Nouveau mandat client/avocat (26 octobre 2026)

Le propriétaire demande un vrai backend, l'espace client/avocat, ses pièces, une recherche, des échanges et un suivi du temps, puis IA/voix et crédits. Il confirme besoinavocat.ca et MochaHost. WordPress reste la vitrine; l'application Node.js est distincte. Ce mandat autorise le développement local du pilote, auparavant hors du périmètre d'orientation. Il ne nécessite pas de recréer le dépôt.

## D-010 — Identité et périmètre du pilote

Réutiliser l'autorité TAKATAK, mais ne pas confondre sa session avec une permission BesoinAvocat. Le contrat spécifique et le parcours navigateur sont encore à raccorder. Aucune autorité de mots de passe parallèle ni compte automatiquement créé. Les essais injectent des identités fictives en processus; aucun contournement d'authentification n'est exposé par HTTP.

SQLite et stockage de blobs privés servent au pilote sur une seule instance. Pas de nouvelle infrastructure payante; le choix de production dépend du forfait et des contrôles. L'aperçu utilise uniquement des données fictives. Les pièces du maître restent hors du dépôt public et l'inventaire d'import n'effectue aucun transfert. Les minutes sont déclarées et validées par une autre personne habilitée, sans paiement automatique.

## D-001 — Dépôt ciblé
- Date : 14 octobre 2026
- Décision : utiliser `takatakca/BESOINAVOCAT.CA` (lien explicite), sans modifier le dépôt distinct AHMVERDUN malgré son apparition dans le premier message.
- Conséquence : versionnement et déploiement isolés.

## D-002 — Livrer une orientation sans collecte
- Date : 14 octobre 2026
- Décision : site statique public, FR-CA, parcours local dans le navigateur sans inscription, téléversement ni mise en relation.
- Motivation : le dépôt initial ne contenait qu'un README; éviter de publier des profils d'avocats fictifs ou d'accepter des informations sensibles sans infrastructure approuvée.

## D-003 — Hébergement
- Date : 14 octobre 2026
- Décision exécutée : service Render statique dédié, publication depuis `main`.
- Détails : `docs/DEPLOYMENT.md`; GitHub Pages optionnel et volontairement inactif.
- Point non décidé : date et configuration DNS du domaine personnalisé.

## D-004 — Autorités externes
- Date : 15 octobre 2026
- Décision : liens vers sites institutionnels sans affiliation prétendue, sans extraction automatisée de coordonnées de professionnels.
- Références : Barreau du Québec, JuridiQC, Commission des services juridiques, CNESST, Tribunal administratif du logement, gouvernement du Québec.
- Limite : un lien n'est pas une validation ou une recommandation de professionnels.

## D-005 — Écosystème TAKATAK
- Date : 15 octobre 2026
- Règle d'architecture : si l'identification de clients est approuvée, utiliser TAKATAK comme autorité d'identité et isoler les permissions/données de BESOINAVOCAT par produit et tenant.
- **Non implémenté** : pas de backend, SSO, base ni données clients à ce stade.

## D-006 — Conformité avant marketplace
- Date : 15 octobre 2026
- Règle : aucun module d'annuaire professionnel « vérifié », de demandes de consultation, de traitement de pièces ou d'honoraires n'est exposé sans approbation du périmètre métier, accords professionnels, revue juridique et gouvernance de vie privée.
- État : décision métier et cadre juridique encore à obtenir. Les exigences futures sont des éléments de backlog, pas des livrables déjà validés.

## D-007 — Surveillance et autonomie
- Date : 15 octobre 2026
- Décision : CI et vérification HTTPS quotidienne depuis GitHub Actions; le fichier de relève permet la reprise manuelle ou via orchestrateur.
- Limite : un workflow programmé n'est pas un agent de développement permanent et ne relance pas de session d'IA.

## D-008 — QA navigateur et correction de défauts visuels (16 octobre 2026)
- Playwright/Chromium sur les quatre tailles est exécuté à chaque push et PR; ses captures sont conservées comme artéfacts GitHub.
- Les captures ont révélé un symbole masqué et des titres de carte disproportionnés, corrigés dans les commits `22e8970` et `2cd5be9`.
- Cette QA automatisée ne remplace ni NVDA/VoiceOver ni les validations légales et métier BA-009/BA-010.
