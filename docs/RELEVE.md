# Relève — BESOINAVOCAT.CA

Mise à jour du 26 octobre 2026. Cette page résume la reprise; les preuves détaillées et les limites figurent dans les documents liés.

**Reprise courante :** consulter d'abord [AGENTS.md](../AGENTS.md) et [docs/AGENT_HANDOFF.md](AGENT_HANDOFF.md).

L'état, les décisions, la file de tâches et le déploiement en vigueur sont documentés dans les cinq fichiers `PROJECT_STATUS.md`, `TASK_QUEUE.md`, `AGENT_HANDOFF.md`, `DEPLOYMENT.md`, `DECISIONS.md`.

## État courant

- **WordPress existant conservé** sur besoinavocat.ca, HTTPS vérifié chez MochaHost; forfait bolon.ca Ultimate actif. Le site Render besoinavocat.onrender.com reste indépendant. L'ancien raccordement BA-008 est obsolète.
- **Sauvegarde et corrections contrôlées** : base privée 194 722 770 octets en mode 0600; WXR 348 pages dont 347 publiées. Douze mentions JuriGo corrigées sur neuf pages, avec conservation contrôlée des dates, URL et autres contenus. Aucun export privé dans Git.
- **Plugin 0.1.2 installé et actif**, SHA vérifié, trois lint PHP et `check-render` réussis sur serveur. 800/839 absents de l'accueil contrôlé, footer/liens présents, trois onglets et touche Début fonctionnels, console sans erreur/alerte. **Chevauchement résolu et aucun débordement à 1 265 px**; QA mobile restante, voir [WORDPRESS_QA.md](WORDPRESS_QA.md).
- Page 5820 `tableau-de-bord` **publiée comme aperçu**, shortcode seul; aucune page supprimée. Titre général harmonisé en **BesoinAvocat**, description « Préparez votre dossier et votre recherche d’avocat. ».
- **Portail local préparé** : API, interface fictive, permissions, pièces/versions/provenance, recherche, échanges, temps et audit; connexion TAKATAK non raccordée. Node 24.22.1/Passenger disponibles chez l'hébergeur, mais aucune application BesoinAvocat créée. Le sous-domaine portail.besoinavocat.ca reste proposé.
- **49 tests Node locaux réussis** (12 site, 32 pilote, 5 Passenger) et 3 tests Python du paquet. Ils ne prouvent pas encore un lancement Passenger distant.
- **Droits GitHub admin/push confirmés par connecteur** et `push --dry-run` Git réussi vers `codex/espace-client-avocat`, sans push réel; `gh` local non authentifié. Ne jamais enregistrer un secret pour contourner cette distinction.
- Demande client toujours gratuite; prix professionnels à définir; téléphone de contact **514-825-2825** publié et contrôlé dans header/footer. IA, voix et paiements non activés.

**Architecture réaffirmée : WordPress uniquement pour la vitrine et l'aperçu; Node pour le vrai backend; TAKATAK pour l'identité. Le projet de plugin WordPress de dossiers est interrompu et ne doit pas être publié.**

Prochain travail : compléter la QA mobile et la revue éditoriale restante, puis poursuivre le portail Node selon [CPANEL_NODE.md](CPANEL_NODE.md), confirmer stockage/processus/HTTPS et raccorder l'identité réelle. Les routes privées restent fermées sans identité valide. Les pièces réelles et le paquet de remise juridique restent hors du dépôt et du pilote non raccordé.

## Éléments historiques

- Dépôt initial limité à un README le 14 octobre 2026.
- Premier site d'orientation statique français construit avec liens vers les institutions, sans collecte de dossiers juridiques.
- Première publication Render confirmée `live` le 14 octobre 2026.
- Les fonctionnalités futures d'annuaire professionnel, de comptes et de mise en relation n'ont pas été prétendues livrées.
