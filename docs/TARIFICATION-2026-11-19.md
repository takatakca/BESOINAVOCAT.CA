# Tarification BesoinAvocat — analyse, grille en place et options (19 novembre 2026)

Demande du propriétaire (18 novembre 2026) : faire payer le stockage et les fonctions aux personnes clientes,
un essai gratuit de 14 jours pour les versions premium, des plugins payés par intégration et un abonnement mensuel
pour les garder dans le portail, des forfaits au mois et à l'année, un calcul complet (coûts, 1 000 clients la
première année, 10 000 ensuite), des prix compétitifs, de la qualité et du luxe. Les avocats restent gratuits pour
l'instant (consigne du 13 novembre); les paiements iront chez Stripe, compte ALKAO.CA, quand le propriétaire
le décidera. Aucun paiement n'est actif tant que les variables Stripe ne sont pas posées dans Coolify.

**Ce qui est déjà construit dans le portail (D-041, PR 77 fusionnée le 18 novembre 2026 à 18:36 UTC, fil
« Construire la monétisation complète du portail »)** : `platform/lib/pricing.mjs` et `platform/lib/billing.mjs`,
page publique `/forfaits`, panneau « Mon forfait » dans Réglages, grille **Essentiel 0 $ (1 dossier, 1 Go, sans vidéo) ·
Premium 15 $/mois ou 150 $/an (dossiers illimités, 50 Go, vidéos) · espace +100 Go 5 $/mois · module d'intégration
30 $ une fois + abonnement Intégrations 9 $/mois**, essai Premium de 14 jours à l'inscription, rien de bloqué ni de
facturé tant que Stripe n'est pas raccordé. Détails et calcul de ce fil : [MONETISATION.md](MONETISATION.md).

Le présent document est l'analyse du fil « Ajouter le dépôt de dossier et les forfaits payants » : il compare la
grille en place avec une grille à trois paliers (Découverte / Membre / Premium) et chiffre coûts et revenus.
**Changer de grille se fait en éditant `platform/lib/pricing.mjs`** (montants, quotas, fonctions) et en créant les
prix correspondants dans Stripe : aucune autre partie du code ne change.

Les montants sont en dollars canadiens, taxes en sus (TPS 5 % et TVQ 9,975 % ajoutées au paiement par Stripe).

## 1. Grille à trois paliers proposée (option A)

### Personnes clientes

| | Découverte | Membre | Premium |
|---|---|---|---|
| Prix | 0 $ | 15 $/mois ou 150 $/an (2 mois offerts) | 39 $/mois ou 390 $/an (2 mois offerts) |
| Dossiers actifs | 1 | 5 | illimités |
| Espace de stockage | 1 Go | 25 Go | 100 Go |
| Vidéo et audio | non (PDF, images, documents) | oui | oui |
| Résumé du dossier par l'IA (quand l'IA sera branchée) | 1 à la création | 3 par mois | 20 par mois |
| Rendez-vous vidéo dans le portail | oui | oui | oui |
| Dossier proposé aux avocats du domaine | oui | oui, en priorité | oui, en priorité, avec relance |
| Signature électronique (par l'avocat) | — | oui | oui |
| Conservation après fermeture du dossier | 90 jours | 1 an | 7 ans |
| Soutien | courriel | courriel | prioritaire |

- **Essai gratuit de 14 jours** : chaque nouveau compte client reçoit automatiquement l'essai Premium, sans
  carte. À la fin, sans abonnement, le compte redescend à Découverte; les pièces déjà déposées restent lisibles,
  on ne peut plus en ajouter au-delà du quota tant qu'un forfait n'est pas choisi.
- **Espace additionnel** : +50 Go pour 5 $/mois, cumulable, pour Membre et Premium.
- **Période de lancement** : tant que Stripe n'est pas raccordé, personne n'est bloqué : à la fin de l'essai, le
  compte garde les droits Membre, affichés « offert pendant le lancement ». Le jour où Stripe est raccordé, la
  règle normale s'applique aux fins d'essai suivantes.

### Plugins (intégrations) — pour les avocats et les clients qui le souhaitent

| | Prix |
|---|---|
| Activation d'un plugin (Zoom, Google Agenda, Outlook, DocuSign, Clio, QuickBooks, CanLII, MIMT) | 30 $ une fois, par plugin et par compte |
| Abonnement « Intégrations » : garde tous ses plugins actifs dans le portail | 19 $/mois ou 190 $/an |

Un plugin se connecte toujours avec le compte de la personne (OAuth), jamais avec un mot de passe (D-027).
Le paiement de l'activation ne connecte rien : il ouvre le droit d'utiliser le connecteur; la connexion reste un
geste séparé (D-025).

### Avocats (plus tard, à activer par le propriétaire)

Gratuit pour l'instant. Grille prévue pour la suite, lue chez Stripe quand elle existera :

| | Avocat | Cabinet |
|---|---|---|
| Prix | 49 $/mois ou 490 $/an | 149 $/mois ou 1 490 $/an |
| Dossiers acceptés | 15 actifs | illimités, 5 comptes |
| Stockage | 100 Go | 500 Go |
| Abonnement Intégrations | inclus | inclus + plugins inclus |

## 2. Pourquoi ces prix

- **15 $/mois** est le prix nommé par le propriétaire pour le membre. C'est le prix d'un abonnement de musique
  ou d'un espace de stockage grand public (Dropbox Plus : environ 16 $/mois pour 2 To). Nous vendons moins de
  gigaoctets mais un service précis : un dossier juridique organisé, des pièces à provenance, un avocat qui
  l'accepte. 25 Go suffisent à des centaines de PDF, des photos et plusieurs vidéos de téléphone.
- **39 $/mois pour Premium** : moins que l'heure d'un avocat la plus basse au Québec, pour « illimité » et
  100 Go. Le palier sert aussi d'ancre : il rend Membre évident.
- **Annuel = 10 mois payés** : les packages d'un an demandés par le propriétaire; ils stabilisent la trésorerie.
- **30 $ par plugin** : le chiffre donné par le propriétaire, en frais d'activation une fois, lisible et sans
  surprise. L'abonnement Intégrations de 19 $/mois est l'« abonnement par mois pour l'intégrer dans leur portail »
  demandé : il couvre le maintien des connexions (jetons, notifications des fournisseurs, soutien).
- **Vidéo réservée aux membres** : une vidéo de téléphone de cinq minutes pèse 100 à 300 Mo; c'est le poste de
  coût de stockage. Le propriétaire l'a demandé explicitement.

## 3. Coûts estimés

Prix publics des fournisseurs, convertis à 1,38 CAD par USD, arrondis.

| Poste | Base | An 1 (1 000 clients) | An 3 (10 000 clients) |
|---|---|---|---|
| Hébergement (VPS Coolify) | 60 $ à 400 $/mois selon la taille | 60 $ | 400 $ |
| Stockage et sauvegarde | 0,06 $/Go/mois (disque ou stockage objet, copie de sauvegarde incluse) | 2 To → 119 $ | 20 To → 1 194 $ |
| Courriels (codes, avis) | Gmail/SMTP gratuit jusqu'à 500/jour; ensuite Resend 20 USD/mois (50 000) ou 80 USD (100 000) | 0 $ | 110 $ |
| Identité (Supabase) | gratuit jusqu'à 50 000 utilisateurs actifs/mois; Pro 25 USD | 0 $ | 35 $ |
| IA (résumés, quand branchée) | ~0,25 $ par résumé de dossier | 150 $ | 1 500 $ |
| Frais Stripe | 2,9 % + 0,30 $ par transaction | 202 $ | 1 989 $ |
| Domaines, DNS | | 15 $ | 15 $ |
| **Total** | | **546 $/mois (6 555 $/an)** | **5 243 $/mois (62 913 $/an)** |

Non chiffrés : le temps de soutien aux clients, le marketing, la révision juridique des textes (politique de
confidentialité, conditions), les licences DocuSign de production si BesoinAvocat en porte une.

## 4. Revenus estimés (conversion prudente : 80 % Découverte, 15 % Membre, 5 % Premium; 35 % des abonnés à l'année)

| | An 1 — 1 000 clients, 40 avocats | An 2 — 4 000 clients, 150 avocats | An 3 — 10 000 clients, 350 avocats |
|---|---|---|---|
| Abonnements clients | 3 955 $/mois | 15 820 $/mois | 39 550 $/mois |
| Espace additionnel | 113 $ | 450 $ | 1 125 $ |
| Abonnement Intégrations (60 % des avocats) | 456 $ | 1 710 $ | 3 990 $ |
| Activations de plugins (2 par avocat équipé, étalées) | 120 $ | 450 $ | 1 050 $ |
| **Revenus** | **4 644 $/mois (55 722 $/an)** | **18 430 $/mois (221 160 $/an)** | **45 715 $/mois (548 580 $/an)** |
| Coûts | 546 $/mois | 2 137 $/mois | 5 243 $/mois |
| **Marge brute** | **4 097 $/mois (88 %)** | **16 293 $/mois (88 %)** | **40 472 $/mois (89 %)** |

Seuil de rentabilité des coûts fixes (hébergement et domaines, 75 $/mois) : 6 abonnés Membre. Les coûts
variables (stockage, Stripe, IA) restent sous 12 % des revenus à chaque palier : chaque client payant rapporte.

Si la conversion n'est que de 5 % payants (au lieu de 20 %), les revenus de l'an 1 tombent à environ
1 400 $/mois pour 300 $ de coûts : encore positif. La grille tient dans le pire cas raisonnable.

## 5. Ce que le portail fait de la grille

- `platform/lib/pricing.mjs` : la grille (montants, quotas, fonctions, essai). `platform/lib/billing.mjs` : état du
  compte client, droits calculés à chaque requête, essai Premium de 14 jours ouvert à l'inscription, Checkout et
  portail Stripe, événements Stripe signés, identifiant opaque `bc_…` seulement. Les montants du code et ceux
  créés dans Stripe doivent être identiques.
- Limites appliquées au dépôt de pièces (espace du compte, vidéo, nombre de dossiers) et à la connexion des
  modules, aux comptes clients seulement : les avocats et l'équipe BesoinAvocat n'y sont pas soumis. Rien n'est
  jamais effacé; les pièces restent lisibles quel que soit le forfait.
- Dépôt de pièces dès la création du premier dossier (ce fil, 19 novembre 2026) : la fenêtre « Votre premier
  dossier » accepte plusieurs fichiers, envoyés un à un après la création, avec les mêmes gardes.
- Variables Coolify et étapes Stripe (compte ALKAO.CA, mode test d'abord) : [MONETISATION.md §4](MONETISATION.md).
  Aucune clé dans le dépôt.

## 6. Décision du propriétaire

Les options soumises le 19 novembre 2026 : (A) la grille à trois paliers de la section 1; (B) deux paliers
seulement : c'est, à peu de chose près, la grille déjà en place (D-041 : Essentiel 0 $ et Premium 15 $/150 $,
+100 Go à 5 $, module 30 $ + Intégrations 9 $/mois); (C) la grille A avec Membre 19 $ et Premium 49 $.
Tant que le propriétaire n'a pas répondu, la grille en place (D-041) reste celle du portail. La réponse sera
consignée dans `docs/DECISIONS.md` et appliquée dans `platform/lib/pricing.mjs`.
