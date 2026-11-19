# Monétisation de BesoinAvocat (D-041, 18 novembre 2026)

Demande du propriétaire (18 novembre 2026) : une solution de monétisation complète. Un minimum gratuit pour la personne cliente, une adhésion d'environ 15 $ par mois pour aller plus loin (surtout les vidéos), environ 30 $ par module d'intégration, un essai de 14 jours des forfaits payants, des forfaits mensuels et annuels, un abonnement mensuel pour intégrer les modules au portail, et le calcul pour 1 000 puis 10 000 clients. Paiement sur le compte Stripe **ALKAO.CA**. Accès des avocats gratuit pour le moment (13 novembre 2026).

Code : `platform/lib/pricing.mjs` (grille), `platform/lib/billing.mjs` (droits, quotas, Stripe), routes dans `platform/server.mjs`, page publique `/forfaits`, panneau « Mon forfait » dans Réglages, tests `platform/test/billing.test.mjs`.

## 1. La grille

Prix en dollars canadiens, taxes en sus.

| Offre | Prix | Contenu |
|---|---|---|
| **Essentiel** (client) | 0 $ | 1 dossier, 1 Go, documents, images, notes vocales, messages, rendez-vous, appels vidéo avec l'avocat |
| **Premium** (client) | **15 $ / mois** ou **150 $ / an** (2 mois offerts) | dossiers illimités, 50 Go, vidéos dans les pièces |
| Essai Premium | 0 $, 14 jours, sans carte | ouvert automatiquement à chaque nouveau compte client |
| **Espace supplémentaire** | **5 $ / mois** par tranche de 100 Go (max. 10) | Essentiel ou Premium |
| **Module d'intégration** | **30 $ une fois** par module | Zoom, Google Agenda, Outlook, DocuSign, Clio, QuickBooks |
| **Abonnement Intégrations** | **9 $ / mois** | garde tous les modules activés branchés au portail |
| Accès avocat | 0 $ pour le moment | l'abonnement avocat existant reste prêt (`BESOINAVOCAT_LAWYER_ACCESS=paid`) |

Pourquoi ces chiffres :
- **15 $** est le prix que le propriétaire a donné; il couvre largement le coût d'un client Premium (environ 1 $ par mois, voir §3) et reste sous le prix d'une heure d'avocat, ce qui le rend facile à accepter pour une personne qui prépare un litige.
- **Annuel à 150 $** : deux mois offerts encouragent le paiement d'avance et réduisent les frais Stripe (une transaction par an au lieu de douze).
- **1 Go gratuit, sans vidéo** : un dossier de documents et de photos tient dans 1 Go; ce sont les vidéos qui coûtent de l'espace. Le gratuit coûte presque rien (environ 0,02 $ par mois par compte) et attire les inscriptions.
- **Modules à 30 $ + 9 $ par mois** : ce que le propriétaire a demandé (« payés par intégration » et « un abonnement par mois pour l'intégrer »). Les fournisseurs (Zoom, DocuSign…) ne nous coûtent rien : chaque personne relie son propre compte. C'est presque tout en marge.
- **Pas de Stripe Tax** (0,5 % de plus par transaction) : on crée une fois les taux TPS et TVQ dans Stripe, c'est gratuit.

## 2. Comment ça marche dans le portail

- **Espace compté par compte** : la somme des pièces des dossiers que la personne a créés (un doublon dans un dossier ne compte qu'une fois). Une pièce versée par l'avocat dans le dossier du client compte dans l'espace du client.
- **Essentiel** : une vidéo est refusée avec un message clair (« comprises dans Premium »), un deuxième dossier aussi, et une pièce qui dépasse l'espace. Les documents continuent d'entrer. Rien n'est jamais effacé.
- **Modules** : sans module activé, le bouton « Connecter » d'une intégration répond « module à activer dans Mon forfait ». Si l'abonnement Intégrations s'arrête, les modules restent acquis mais débranchés jusqu'à la reprise.
- **Équipe BesoinAvocat** (fichier de grants, le compte du propriétaire) : jamais facturée, jamais limitée.
- **Tant que Stripe n'est pas raccordé, rien n'est bloqué** : on n'empêche jamais quelqu'un qui ne peut pas payer. Le panneau affiche « Paiement en ligne bientôt ouvert ». Dès que les clés sont posées, les limites s'appliquent (on peut les suspendre avec `BESOINAVOCAT_BILLING_ENFORCED=false`).
- **Sécurité** : l'état payé vient seulement des notifications signées de Stripe; Stripe ne reçoit qu'une clé opaque (`bc_…`), jamais l'identité TAKATAK ni le nom TAKATAK. La carte n'est vue que par Stripe. Gestion, factures et annulation par le portail client de Stripe.

## 3. Calcul : coûts et revenus

Hypothèses prudentes (à revoir avec les vrais chiffres) : 1 $ US = 1,40 $ CA; stockage en objet de type Backblaze B2 (environ 8,40 $ CA par To par mois) gardé en deux copies; courriels par Resend; identité par Supabase; frais Stripe Canada 2,9 % + 0,30 $ par transaction; IA éteinte (le portail n'en utilise pas).

### Année 1 : 1 000 clients

| Revenus par mois | Calcul | Montant |
|---|---|---|
| Premium | 10 % des clients = 100; 70 % mensuel, 30 % annuel = 14,25 $ en moyenne | 1 425 $ |
| Espace supplémentaire | 20 tranches | 100 $ |
| Abonnement Intégrations | 30 comptes × 9 $ | 270 $ |
| Activations de modules | 60 × 30 $ par an, ramené au mois | 150 $ |
| **Total** | | **≈ 1 945 $ / mois (≈ 23 300 $ / an)** |

| Coûts par mois | Montant |
|---|---|
| Serveur actuel (VPS) | ≈ 40 $ |
| Stockage ≈ 2 To, deux copies | ≈ 34 $ |
| Courriels (≈ 15 000 / mois, Resend Pro) | ≈ 28 $ |
| Supabase (gratuit jusqu'à 50 000 utilisateurs actifs) | 0 $ |
| Frais Stripe | ≈ 100 $ |
| Divers (domaine, sauvegardes) | ≈ 5 $ |
| **Total** | **≈ 210 $ / mois** |

**Marge ≈ 1 735 $ / mois, ≈ 20 800 $ la première année.**

### À maturité : 10 000 clients

| Revenus par mois | Calcul | Montant |
|---|---|---|
| Premium | 12 % = 1 200 × 14,25 $ | 17 100 $ |
| Espace supplémentaire | 300 comptes × 1,5 tranche × 5 $ | 2 250 $ |
| Abonnement Intégrations | 300 × 9 $ | 2 700 $ |
| Activations de modules | 600 × 30 $ par an, au mois | 1 500 $ |
| **Total** | | **≈ 23 550 $ / mois (≈ 282 600 $ / an)** |

| Coûts par mois | Montant |
|---|---|
| Deux serveurs et sauvegardes | ≈ 200 $ |
| Stockage ≈ 37 To, deux copies | ≈ 620 $ |
| Courriels (≈ 150 000 / mois) | ≈ 126 $ |
| Supabase Pro | ≈ 35 $ |
| Frais Stripe | ≈ 1 250 $ |
| Surveillance | ≈ 50 $ |
| IA si un jour activée pour Premium (≈ 0,70 $ par client Premium) | ≈ 840 $ (facultatif) |
| **Total** | **≈ 2 280 $ / mois (3 120 $ avec IA)** |

**Marge ≈ 20 400 à 21 300 $ / mois, ≈ 245 000 à 255 000 $ par an**, avant salaires et marketing.

Par compte : un client gratuit coûte environ 0,02 $ par mois; un client Premium coûte environ 1 $ par mois (stockage 0,17 $, frais Stripe 0,73 $, courriels) pour 15 $ payés, soit plus de 90 % de marge. Le point mort (≈ 210 $ par mois de frais) est atteint avec environ 15 clients Premium.

À surveiller :
- **TPS/TVQ** : l'inscription est obligatoire au-delà de 30 000 $ de ventes sur quatre trimestres; l'année 1 en est proche. Conseil : s'inscrire dès le départ et poser les deux taux dans Stripe.
- Le taux de passage à Premium (10 à 12 % ici) est l'hypothèse qui compte le plus. À 5 %, l'année 1 rapporte encore environ 1 000 $ de marge par mois.

## 4. Ce qu'il reste à faire pour encaisser (Colombo et le propriétaire)

Dans le compte Stripe **ALKAO.CA** (mode test d'abord) :
1. Créer cinq prix, montants exacts de la grille, en CAD : Premium mensuel 15,00 $ (récurrent, mois), Premium annuel 150,00 $ (récurrent, année), Espace 100 Go 5,00 $ (récurrent, mois, quantité modifiable), Activation de module 30,00 $ (paiement unique), Abonnement Intégrations 9,00 $ (récurrent, mois).
2. Créer deux taux de taxe exclusifs : TPS 5 % et TVQ 9,975 %.
3. Webhook vers `https://portail.besoinavocat.ca/api/webhooks/stripe`, événements : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `.updated`, `.deleted`, `.paused`, `.resumed`.
4. Portail client de Stripe : activer l'annulation, le changement de quantité et l'historique des factures.

Dans Coolify (application du portail), puis redéployer :

| Variable | Valeur |
|---|---|
| `BESOINAVOCAT_STRIPE_SECRET_KEY` | clé secrète `sk_test_…` puis `sk_live_…` (ou clé restreinte `rk_…`) |
| `BESOINAVOCAT_STRIPE_WEBHOOK_SECRET` | `whsec_…` du webhook |
| `BESOINAVOCAT_STRIPE_PRICE_CLIENT_PREMIUM_MONTHLY` | `price_…` |
| `BESOINAVOCAT_STRIPE_PRICE_CLIENT_PREMIUM_YEARLY` | `price_…` |
| `BESOINAVOCAT_STRIPE_PRICE_STORAGE_PACK_MONTHLY` | `price_…` |
| `BESOINAVOCAT_STRIPE_PRICE_PLUGIN_ACTIVATION` | `price_…` |
| `BESOINAVOCAT_STRIPE_PRICE_INTEGRATIONS_MONTHLY` | `price_…` |
| `BESOINAVOCAT_STRIPE_TAX_RATES` | `txr_…,txr_…` (TPS, TVQ) |
| `APP_ORIGIN` | `https://portail.besoinavocat.ca` (déjà requis) |
| facultatif `BESOINAVOCAT_BILLING_ENFORCED` | `false` pour suspendre les limites |
| facultatif `BESOINAVOCAT_STRIPE_AUTOMATIC_TAX` | `true` pour Stripe Tax (0,5 % par transaction) au lieu des taux |
| facultatif `BESOINAVOCAT_LAWYER_ACCESS` | `paid` le jour où l'accès avocat devient payant |

Aucune clé ne va dans le dépôt, le clavardage ou la mémoire : seulement dans Coolify et le fichier `CLES-INTEGRATIONS-BESOINAVOCAT.txt` du PC du propriétaire.

## 5. Ce qui n'est pas fait (volontairement)

- Prix de l'accès avocat : gratuit sur décision du propriétaire. Les anciens prix de D-017 (100 $/semaine, 300 $/mois) restent dans l'ancien catalogue public de la demande (`lib/catalog.mjs`) et sont à revoir le jour où l'accès devient payant.
- Crédits IA : l'IA est éteinte; rien à facturer.
- Aucun paiement d'honoraires, d'avance ou de commission ne passe par BesoinAvocat (D-025).
