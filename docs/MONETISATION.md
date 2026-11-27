# Monétisation de BesoinAvocat (D-041, 18 novembre 2026; grille A choisie par le propriétaire le 20 novembre 2026, D-043)

Demande du propriétaire (18 novembre 2026) : une solution de monétisation complète. Un minimum gratuit pour la personne cliente, une adhésion d'environ 15 $ par mois pour aller plus loin (surtout les vidéos), environ 30 $ par module d'intégration, un essai de 14 jours des forfaits payants, des forfaits mensuels et annuels, un abonnement mensuel pour intégrer les modules au portail, et le calcul pour 1 000 puis 10 000 clients. Paiement sur le compte Stripe **ALKAO.CA**. Accès des avocats gratuit pour le moment (13 novembre 2026).

Code : `platform/lib/pricing.mjs` (grille), `platform/lib/billing.mjs` (droits, quotas, Stripe), routes dans `platform/server.mjs`, page publique `/forfaits`, panneau « Mon forfait » dans Réglages, tests `platform/test/billing.test.mjs`.

## 1. La grille

Prix en dollars canadiens, taxes en sus.

| Offre | Prix | Contenu |
|---|---|---|
| **Découverte** (client) | 0 $ | 1 dossier, 1 Go, documents, images, notes vocales, messages, rendez-vous, appels vidéo avec l'avocat |
| **Membre** (client) | **150 $ / an** ou **19 $ / mois** (D-046 : le mois coûte 50 % de plus) | 5 dossiers, 25 Go, vidéos dans les pièces |
| **Premium** (client) | **390 $ / an** ou **49 $ / mois** | dossiers illimités, 100 Go, vidéos dans les pièces |
| Essai (D-046) | 0 $, 14 jours, **carte demandée à l'inscription** | essai Stripe; ensuite l'année (ou le mois) est débitée automatiquement |
| **Espace supplémentaire** | **5 $ / mois** par tranche de 50 Go (max. 20, cumulable) | Membre ou Premium (un forfait payé) |
| **Module d'intégration** | **30 $ une fois** par module | Zoom, Google Agenda, Outlook, DocuSign, Clio, QuickBooks |
| **Abonnement Intégrations** | **190 $ / an** ou **24 $ / mois** | garde tous les modules activés branchés au portail |
| **Accès avocat** (D-044, 20 novembre 2026) | (D-046) carte à l'inscription, 14 jours gratuits, puis **3 600 $ / an** ou **450 $ / mois** (le forfait à la semaine est retiré) | `lib/membership.mjs`, prix lus chez Stripe (`BESOINAVOCAT_STRIPE_PRICE_LAWYER_YEARLY` / `_MONTHLY`); rien n'est bloqué tant que Stripe n'est pas raccordé; `BESOINAVOCAT_LAWYER_ACCESS=free` rend l'accès gratuit, `=paid` bloque même sans Stripe |

Historique : la grille D-041 du 18 novembre avait deux paliers (Essentiel 0 $, Premium 15 $/150 $ avec 50 Go, +100 Go à 5 $, Intégrations 9 $). Le 19 novembre, [TARIFICATION-2026-11-19.md](TARIFICATION-2026-11-19.md) a proposé trois options; le propriétaire a choisi l'option **A** le 20 novembre 2026 (D-043). Seules les lignes que le portail sait appliquer (prix, dossiers, espace, vidéo) sont programmées; les autres lignes de l'option A (résumés par l'IA, priorité, conservation, soutien) restent des promesses à ne pas afficher tant qu'elles ne sont pas codées.

Pourquoi ces chiffres :
- **15 $** est le prix que le propriétaire a donné pour l'adhésion; il couvre largement le coût d'un client payant (environ 1 $ par mois, voir §3) et reste sous le prix d'une heure d'avocat, ce qui le rend facile à accepter pour une personne qui prépare un litige. **39 $** pour Premium vise les personnes qui mènent plusieurs dossiers ou beaucoup de vidéos : un seul palier à 15 $ ne les faisait pas payer plus.
- **Annuel à 150 $ et 390 $** : deux mois offerts encouragent le paiement d'avance et réduisent les frais Stripe (une transaction par an au lieu de douze).
- **1 Go gratuit, sans vidéo** : un dossier de documents et de photos tient dans 1 Go; ce sont les vidéos qui coûtent de l'espace. Le gratuit coûte presque rien (environ 0,02 $ par mois par compte) et attire les inscriptions.
- **Modules à 30 $ + 19 $ par mois (190 $ par année)** : ce que le propriétaire a demandé (« payés par intégration » et « un abonnement par mois pour l'intégrer »). Les fournisseurs (Zoom, DocuSign…) ne nous coûtent rien : chaque personne relie son propre compte. C'est presque tout en marge.
- **Pas de Stripe Tax** (0,5 % de plus par transaction) : on crée une fois les taux TPS et TVQ dans Stripe, c'est gratuit.

## 2. Comment ça marche dans le portail

- **Espace compté par compte** : la somme des pièces des dossiers que la personne a créés (un doublon dans un dossier ne compte qu'une fois). Une pièce versée par l'avocat dans le dossier du client compte dans l'espace du client.
- **Découverte** : une vidéo est refusée avec un message clair (« comprises dans les forfaits Membre et Premium »), un deuxième dossier aussi, et une pièce qui dépasse l'espace. Les documents continuent d'entrer. Rien n'est jamais effacé. **Membre** : le sixième dossier est refusé (« Premium n'a pas de limite »). Un seul forfait payé à la fois : le passage Membre ↔ Premium se fait dans le portail client de Stripe (« Gérer mes paiements »). L'espace additionnel ne se vend qu'avec un forfait payé; une tranche déjà payée continue de compter tant que son abonnement vit.
- **Modules** : sans module activé, le bouton « Connecter » d'une intégration répond « module à activer dans Mon forfait ». Si l'abonnement Intégrations s'arrête, les modules restent acquis mais débranchés jusqu'à la reprise.
- **Équipe BesoinAvocat** (fichier de grants, le compte du propriétaire) : jamais facturée, jamais limitée.
- **Tant que Stripe n'est pas raccordé, rien n'est bloqué** : on n'empêche jamais quelqu'un qui ne peut pas payer. Le panneau affiche « Paiement en ligne bientôt ouvert ». Dès que les clés sont posées, les limites s'appliquent (on peut les suspendre avec `BESOINAVOCAT_BILLING_ENFORCED=false`).
- **Sécurité** : l'état payé vient seulement des notifications signées de Stripe; Stripe ne reçoit qu'une clé opaque (`bc_…`), jamais l'identité TAKATAK ni le nom TAKATAK. La carte n'est vue que par Stripe. Gestion, factures et annulation par le portail client de Stripe.

## 3. Calcul : coûts et revenus

Hypothèses prudentes (à revoir avec les vrais chiffres) : 1 $ US = 1,40 $ CA; stockage en objet de type Backblaze B2 (environ 8,40 $ CA par To par mois) gardé en deux copies; courriels par Resend; identité par Supabase; frais Stripe Canada 2,9 % + 0,30 $ par transaction; IA éteinte (le portail n'en utilise pas).

### Année 1 : 1 000 clients

| Revenus par mois | Calcul | Montant |
|---|---|---|
| Membre | 10 % des clients = 100; 70 % mensuel, 30 % annuel = 14,25 $ en moyenne | 1 425 $ |
| Premium | 3 % des clients = 30; 70 % mensuel, 30 % annuel = 37,05 $ en moyenne | 1 110 $ |
| Espace supplémentaire | 20 tranches de 50 Go | 100 $ |
| Abonnement Intégrations | 30 comptes × 18 $ en moyenne (mensuel 19 $, annuel 15,83 $) | 540 $ |
| Activations de modules | 60 × 30 $ par an, ramené au mois | 150 $ |
| Accès avocat (D-044) | 40 avocats : 25 % à la semaine (433 $ / mois), 75 % au mois (300 $) | ≈ 13 330 $ |
| **Total** | | **≈ 16 650 $ / mois (≈ 200 000 $ / an)**, dont ≈ 3 325 $ des clients |

| Coûts par mois | Montant |
|---|---|
| Serveur actuel (VPS) | ≈ 40 $ |
| Stockage ≈ 2 To, deux copies | ≈ 34 $ |
| Courriels (≈ 15 000 / mois, Resend Pro) | ≈ 28 $ |
| Supabase (gratuit jusqu'à 50 000 utilisateurs actifs) | 0 $ |
| Frais Stripe (2,9 % + 0,30 $ par transaction) | ≈ 145 $ |
| Divers (domaine, sauvegardes) | ≈ 5 $ |
| **Total** | **≈ 255 $ / mois** |

**Marge clients ≈ 3 070 $ / mois, ≈ 36 800 $ la première année.** (Grille D-041 à deux paliers : ≈ 1 735 $ / mois.) Avec 40 avocats payants, les frais Stripe montent d'environ 400 $ et la marge totale dépasse ≈ 16 000 $ / mois. Le nombre d'avocats qui restent après l'essai est l'hypothèse la plus incertaine : chaque avocat au mois vaut 20 clients Membre.

### À maturité : 10 000 clients

| Revenus par mois | Calcul | Montant |
|---|---|---|
| Membre | 10 % = 1 000 × 14,25 $ | 14 250 $ |
| Premium | 4 % = 400 × 37,05 $ | 14 820 $ |
| Espace supplémentaire | 300 comptes × 1,5 tranche × 5 $ | 2 250 $ |
| Abonnement Intégrations | 300 × 18 $ | 5 400 $ |
| Activations de modules | 600 × 30 $ par an, au mois | 1 500 $ |
| Accès avocat (D-044) | 350 avocats : 25 % à la semaine, 75 % au mois | ≈ 116 640 $ |
| **Total** | | **≈ 154 860 $ / mois (≈ 1,86 M$ / an)**, dont ≈ 38 220 $ des clients |

| Coûts par mois | Montant |
|---|---|
| Deux serveurs et sauvegardes | ≈ 200 $ |
| Stockage ≈ 37 To, deux copies | ≈ 620 $ |
| Courriels (≈ 150 000 / mois) | ≈ 126 $ |
| Supabase Pro | ≈ 35 $ |
| Frais Stripe | ≈ 1 700 $ |
| Surveillance | ≈ 50 $ |
| IA si un jour activée pour les forfaits payants (≈ 0,70 $ par client payant) | ≈ 980 $ (facultatif) |
| **Total** | **≈ 2 730 $ / mois (3 710 $ avec IA)** |

**Marge ≈ 34 500 à 35 500 $ / mois, ≈ 415 000 à 425 000 $ par an**, avant salaires et marketing. (Grille D-041 : ≈ 245 000 à 255 000 $.)

Par compte : un client gratuit coûte environ 0,02 $ par mois; un client Membre coûte environ 1 $ par mois (stockage 0,17 $, frais Stripe 0,73 $, courriels) pour 15 $ payés, un client Premium environ 2 $ pour 39 $, soit plus de 90 % de marge dans les deux cas. Le point mort (≈ 255 $ par mois de frais) est atteint avec environ 18 clients Membre, ou 7 Premium.

À surveiller :
- **TPS/TVQ** : l'inscription est obligatoire au-delà de 30 000 $ de ventes sur quatre trimestres; l'année 1 en est proche. Conseil : s'inscrire dès le départ et poser les deux taux dans Stripe.
- Le taux de passage aux forfaits payants (13 à 14 % ici, Membre et Premium) est l'hypothèse qui compte le plus. À 5 % au total, l'année 1 rapporte encore environ 1 100 $ de marge par mois.

## 4. Ce qu'il reste à faire pour encaisser (Colombo et le propriétaire)

Dans le compte Stripe **ALKAO.CA** (mode test d'abord) :
1. Créer huit prix, montants exacts de la grille, en CAD : Membre mensuel 15,00 $ (récurrent, mois), Membre annuel 150,00 $ (récurrent, année), Premium mensuel 39,00 $ (récurrent, mois), Premium annuel 390,00 $ (récurrent, année), Espace 50 Go 5,00 $ (récurrent, mois, quantité modifiable), Activation de module 30,00 $ (paiement unique), Abonnement Intégrations mensuel 19,00 $ (récurrent, mois), Abonnement Intégrations annuel 190,00 $ (récurrent, année). Les prix annuels sont facultatifs : sans eux, seul le mensuel est proposé.
2. Créer deux taux de taxe exclusifs : TPS 5 % et TVQ 9,975 %.
3. Webhook vers `https://portail.besoinavocat.ca/api/webhooks/stripe`, événements : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `.updated`, `.deleted`, `.paused`, `.resumed`.
4. Portail client de Stripe : activer l'annulation, le changement de quantité et l'historique des factures.

Dans Coolify (application du portail), puis redéployer :

| Variable | Valeur |
|---|---|
| `BESOINAVOCAT_STRIPE_SECRET_KEY` | clé secrète `sk_test_…` puis `sk_live_…` (ou clé restreinte `rk_…`) |
| `BESOINAVOCAT_STRIPE_WEBHOOK_SECRET` | `whsec_…` du webhook |
| `BESOINAVOCAT_STRIPE_PRICE_CLIENT_MEMBER_MONTHLY` | `price_…` (Membre 19 $) |
| `BESOINAVOCAT_STRIPE_PRICE_CLIENT_MEMBER_YEARLY` | `price_…` (Membre 150 $) |
| `BESOINAVOCAT_STRIPE_PRICE_CLIENT_PREMIUM_MONTHLY` | `price_…` (Premium 49 $) |
| `BESOINAVOCAT_STRIPE_PRICE_CLIENT_PREMIUM_YEARLY` | `price_…` (Premium 390 $) |
| `BESOINAVOCAT_STRIPE_PRICE_STORAGE_PACK_MONTHLY` | `price_…` (50 Go, 5 $) |
| `BESOINAVOCAT_STRIPE_PRICE_PLUGIN_ACTIVATION` | `price_…` (30 $ une fois) |
| `BESOINAVOCAT_STRIPE_PRICE_INTEGRATIONS_MONTHLY` | `price_…` (24 $) |
| `BESOINAVOCAT_STRIPE_PRICE_INTEGRATIONS_YEARLY` | `price_…` (190 $) |
| `BESOINAVOCAT_STRIPE_TAX_RATES` | `txr_…,txr_…` (TPS, TVQ) |
| `APP_ORIGIN` | `https://portail.besoinavocat.ca` (déjà requis) |
| facultatif `BESOINAVOCAT_BILLING_ENFORCED` | `false` pour suspendre les limites |
| facultatif `BESOINAVOCAT_STRIPE_AUTOMATIC_TAX` | `true` pour Stripe Tax (0,5 % par transaction) au lieu des taux |
| `BESOINAVOCAT_STRIPE_PRICE_LAWYER_YEARLY` | `price_…` (avocat, 3 600,00 $ par année, récurrent) |
| `BESOINAVOCAT_STRIPE_PRICE_MONTHLY` | `price_…` (avocat, 450,00 $ par mois, récurrent, sans engagement) |
| facultatif `BESOINAVOCAT_CARD_TRIAL` | `false` remet l'ancien essai de 14 jours sans carte (D-046) |
| facultatif `BESOINAVOCAT_LAWYER_ACCESS` | `free` pour rendre l'accès avocat gratuit; `paid` pour bloquer l'essai expiré même sans Stripe; sinon le blocage suit le raccordement de Stripe |

Aucune clé ne va dans le dépôt, le clavardage ou la mémoire : seulement dans Coolify et le fichier `CLES-INTEGRATIONS-BESOINAVOCAT.txt` du PC du propriétaire.

## 5. Ce qui n'est pas fait (volontairement)

- Engagement d'un an du forfait avocat mensuel : Stripe Checkout ne sait pas l'imposer; il est écrit dans les conditions et dans la métadonnée de l'abonnement. Dans le portail client de Stripe, désactiver l'annulation immédiate pour ce prix si l'on veut le faire respecter techniquement.
- Crédits IA : l'IA est éteinte; rien à facturer.
- Aucun paiement d'honoraires, d'avance ou de commission ne passe par BesoinAvocat (D-025).
