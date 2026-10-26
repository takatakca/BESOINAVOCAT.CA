# DECISIONS — BESOINAVOCAT.CA

Journal des décisions et hypothèses qui guident le code. Une hypothèse ne devient pas une autorisation métier.

## D-015 — WordPress uniquement pour la vitrine, Node pour le backend (26 octobre 2026)

Le propriétaire réaffirme cette séparation : **WordPress sert la vitrine et l'aperçu, Node.js le vrai backend et les dossiers privés**. La piste d'un plugin WordPress de consultation du corpus a été interrompue; elle ne doit pas être déployée ou considérée comme une seconde solution d'authentification. L'autorité demeure TAKATAK, avec habilitations BesoinAvocat. La simple existence de comptes WordPress n'autorise pas à les convertir en identité du portail.

## D-011 — Conserver WordPress et distinguer les hébergements (26 octobre 2026)

L'inspection réelle confirme WordPress HTTPS sur besoinavocat.ca chez MochaHost, forfait bolon.ca Ultimate actif. Le site statique besoinavocat.onrender.com reste indépendant. **L'ancien projet BA-008 de raccordement du domaine à Render est obsolète** : aucun déplacement ou remplacement du WordPress existant n'en découle.

Node 24.22.1 et Passenger sont disponibles dans cPanel; aucune application BesoinAvocat n'y est encore créée. La cible proposée pour le pilote est portail.besoinavocat.ca à sa racine, et non un montage `/espace`. Avant de l'annoncer disponible, contrôler création, stockage privé, processus Passenger, certificat et réponses HTTP. L'interface WordPress ne pointera vers ce portail qu'après vérification de son URL HTTPS.

## D-012 — Préserver le contenu existant et rendre l'habillage réversible (26 octobre 2026)

Conserver les pages, dates et URL WordPress. La sauvegarde privée de base réussie (194 722 770 octets, mode 0600) et l'export WXR (348 pages, dont 347 publiées) sont exclus du dépôt. Les 12 mentions JuriGo corrigées dans 9 pages ont fait l'objet de gardes SHA et d'une transaction; la comparaison des 347 pages publiées confirme la conservation des autres contenus, des dates et URL.

Le nouvel habillage est un plugin distinct. Après l'installation inactive de la 0.1.0 puis l'activation de la 0.1.1, la **0.1.2 est active**, avec empreinte, trois lint PHP et `check-render` vérifiés sur serveur; la page 5820 est publiée comme aperçu. Le chevauchement constaté en 0.1.1 est résolu dans le contrôle à 1 265 px; les autres tailles restent à contrôler. Les états d'installation, d'activation, de contrôle visuel et de publication sont rapportés séparément. Les sauvegardes, secrets, cookies, URL de session et exports privés ne sont jamais ajoutés à Git.

## D-013 — Partenaire déclaré et affirmations publiques (26 octobre 2026)

Le propriétaire précise que **Yan Romanowski est le seul partenaire**. Cette information est attribuée au propriétaire; elle n'établit pas à elle seule une vérification indépendante du statut professionnel, des compétences, d'une disponibilité ou d'un consentement à chaque présentation.

Neutraliser dans le nouvel habillage les affirmations « 800 » et les avis non vérifiés, sans inventer de profils ou de témoignages de remplacement. La 0.1.2 reprend les corrections contrôlées de la 0.1.1 et quatre autres phrases marketing de l'accueil, sans changer les données Elementor. La page professionnels reçoit également une présentation des offres en préparation. Ces transformations ciblées ne constituent pas un audit exhaustif des articles historiques. Les archives de sauvegarde restent intactes.

## D-014 — Gratuité client et services futurs (26 octobre 2026)

La publication d'une demande doit rester **toujours gratuite pour les clients**. Les honoraires de l'avocat et les éventuelles options payantes sont distincts. Les prix des offres professionnelles restent à définir; aucune formule affichée comme projet ne doit créer de souscription ou de facturation.

Le propriétaire a fourni le **514-825-2825** comme téléphone de contact, désormais publié et contrôlé dans le header/footer de la 0.1.2. Cette publication de coordonnées n'active aucun assistant ou service téléphonique. Les appels/enregistrements automatisés, l'IA documentaire, les crédits et paiements restent à raccorder et à vérifier. Ne pas présenter ces fonctions comme actives, ni créer un compte ou numéro payant par déduction.

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
- Point historique, remplacé par D-011 le 26 octobre : le domaine besoinavocat.ca sert déjà WordPress chez MochaHost et ne doit pas être basculé vers Render.

## D-004 — Autorités externes
- Date : 15 octobre 2026
- Décision : liens vers sites institutionnels sans affiliation prétendue, sans extraction automatisée de coordonnées de professionnels.
- Références : Barreau du Québec, JuridiQC, Commission des services juridiques, CNESST, Tribunal administratif du logement, gouvernement du Québec.
- Limite : un lien n'est pas une validation ou une recommandation de professionnels.

## D-005 — Écosystème TAKATAK
- Date : 15 octobre 2026
- Règle d'architecture : si l'identification de clients est approuvée, utiliser TAKATAK comme autorité d'identité et isoler les permissions/données de BESOINAVOCAT par produit et tenant.
- **État au 15 octobre** : pas de backend, SSO, base ni données clients. Le pilote local créé le 26 octobre est décrit par D-009/D-010; sa connexion TAKATAK reste non activée.

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
