# Services internes et connecteurs optionnels

> **29 octobre 2026 (D-027)** : la connexion des comptes (OAuth Zoom, Outlook, Google, DocuSign, Clio) et les réceptions signées sont réalisées : voir [INTEGRATIONS](INTEGRATIONS.md). La partie commerciale de ce document reste à faire et **désactivée** : offres, prix, Stripe Checkout, droits payés. Une connexion ne dépend d'aucun paiement dans le pilote.

Décision de travail du 28 octobre 2026 : un client pourra ajouter des connecteurs, éventuellement avec des frais ponctuels d'installation. **50 CAD est un exemple à confirmer, pas un prix autorisé.** Une offre interne gratuite ou un service exploité sur notre serveur pourra être étudié séparément. Aucun prix, abonnement, paiement, compte fournisseur ou accès OAuth n'est créé par ce lot.

## Catalogue réellement livré

`platform/lib/addon-catalog.mjs` exporte `publicAddonCatalog()`. Le serveur l'expose par `GET /api/addons` après authentification TAKATAK. Malgré son nom, « public » signifie ici sans secrets; cette fonction ne choisit pas la politique d'accès de la route.

| ID | Nature | État réel | Connexion |
|---|---|---|---|
| `internal_chat` | Service interne | `available_pilot` : échanges écrits dans les dossiers autorisés | `internal` |
| `zoom` | Connecteur externe | `external_link_only` : lien Zoom existant | `oauth_planned` |
| `phone` | Connecteur externe | `planned` : pas d'appels intégrés | `provider_not_connected` |

Chaque option retourne `price:{currency:'CAD',amountCents:null,status:'unset'}`, `canPurchase:false`, `canConnect:false` et `caseAccessGranted:false`. Le catalogue contient `checkoutEnabled:false`. L'interface doit afficher « Prix à définir » plutôt que « Gratuit ». La messagerie du pilote existe déjà; ce catalogue ne lui ajoute pas de paiement. Une connexion Zoom ne remplace pas la licence éventuellement exigée par Zoom.

Les valeurs sont produites par le serveur, sans argument navigateur. Une future offre devra ajouter une version tarifaire, le modèle commercial (`one_time_installation`, éventuellement un autre modèle approuvé), le prix Stripe correspondant, le traitement fiscal et les conditions acceptées. Une offre gratuite exige une décision explicite et une version à zéro; un prix inconnu reste `null` et bloque Checkout.

## Trois états indépendants à persister

| Objet futur | États et règles proposées |
|---|---|
| Commande d'option | `created → checkout_pending → payment_pending → paid_verified`; issues `failed`, `expired`, `refunded`, `disputed` |
| Installation | `not_requested → awaiting_payment → oauth_pending → connected`; issues `error`, `revoked` |
| Droit d'utiliser l'option | `inactive → eligible_for_installation → active`; suspension possible si paiement, connexion ou autorisation ne sont plus valides |

Une commande payée rend l'installation admissible. Elle n'établit ni une connexion Zoom ni une invitation au dossier. L'option n'est utilisable qu'avec une installation valide, l'habilitation produit de la personne et les permissions du dossier concerné. Le paiement ne modifie jamais `members`, les rôles avocat/client ni les droits de lecture des pièces.

Clé de rattachement interne : `tenantId + accountOwnerSubject + addonId`. `accountOwnerSubject` désigne l'identité cliente propriétaire de l'option, résolue côté serveur; elle n'est pas équivalente au rôle `owner` d'un dossier. Les objets Stripe, Zoom et Facturations sont associés à cette clé par un mapping serveur contrôlé, jamais par un email ou un `tenantId` fourni par le navigateur.

Tables futures minimales : `addon_offers` (versions/prix), `addon_orders` (offre figée et état), `addon_installations` (fournisseur/propriétaire/scopes), `addon_entitlements`, `provider_events` (réceptions dédupliquées) et `addon_audit` (transitions sans jetons). Prévoir une unicité sur la session Checkout et sur l'événement fournisseur, plus un verrou transactionnel de réalisation de commande.

## Paiement ponctuel Stripe à implémenter

1. L'utilisateur choisit un identifiant d'offre. Le backend authentifie l'identité, résout son organisation/propriétaire et vérifie que l'offre est disponible avec un prix approuvé. Il fige la commande et crée Checkout en mode paiement ponctuel, avec montant/prix et quantité résolus côté serveur. Les frais d'installation ne deviennent pas un abonnement implicite.
2. Une page de retour affiche l'état serveur; elle ne marque jamais la commande payée en se fiant à son URL. La réalisation doit résister aux notifications répétées et concurrentes. Le serveur relit la session et ses lignes, vérifie son paiement puis rattache le résultat à la commande locale. [Documentation officielle de réalisation Checkout](https://docs.stripe.com/checkout/fulfillment).
3. Le récepteur vérifie la signature `Stripe-Signature` sur les **octets bruts** avec le secret propre à cette destination. Il enregistre durablement la réception et déduplique avant toute activation; il gère également les événements arrivés dans le désordre. [Signatures et bonnes pratiques des webhooks Stripe](https://docs.stripe.com/webhooks).
4. Traiter `checkout.session.completed` avec contrôle de `payment_status`, puis `checkout.session.async_payment_succeeded` et `checkout.session.async_payment_failed` pour les moyens différés. `unpaid` ne donne aucun droit. `no_payment_required` ne peut servir qu'à une offre gratuite explicitement autorisée. [Paiements différés et réalisation](https://docs.stripe.com/checkout/fulfillment).
5. Contrôles locaux obligatoires : bon compte et environnement Stripe, session liée à la commande, identité/propriétaire correspondants, devise CAD, ligne/quantité/prix attendus et total conforme à l'offre et aux taxes approuvées. Un événement connu rejoué ne doit ni réinstaller ni facturer une deuxième fois.
6. Une notification de remboursement/litige ouvre l'état approprié et applique une politique commerciale préalablement approuvée. Elle ne supprime pas de dossier ni de document. Ne pas inventer de remboursement automatique tant que ses règles ne sont pas fixées.

Développement en sandbox distincte, clé restreinte côté serveur et secrets hors GitHub. Le SDK et sa version API seront fixés au raccordement. Aucune dépendance Stripe n'est ajoutée ici; le catalogue ne fait aucun appel réseau. La configuration fiscale et les conditions de service restent à arrêter avant de rendre un prix achetable.

## Installation Zoom séparée

La connexion d'un compte client passe par le consentement **sur Zoom** puis par un retour OAuth contrôlé. BesoinAvocat ne collecte pas le mot de passe Zoom. Une application utilisateur/compte adaptée est nécessaire; le flux Server-to-Server du compte de la plateforme n'autorise pas les comptes indépendants des clients. [Documentation officielle OAuth Zoom](https://developers.zoom.us/docs/integrations/oauth/).

Conception proposée :

- Démarrage par le propriétaire authentifié; contrôle de l'admissibilité à l'installation. Nonce `state` aléatoire, limité dans le temps, à usage unique et lié à la session, au tenant, au propriétaire et au fournisseur. Retour HTTPS exact autorisé; pas de redirection libre reçue du navigateur.
- Échange du code uniquement côté serveur. Vérification de l'identité du compte Zoom autorisé et des permissions obtenues. Demander seulement les scopes nécessaires aux opérations effectivement livrées; ne pas demander l'accès aux enregistrements par défaut.
- Jetons chiffrés au repos avec une clé distincte de la base, accès limité au service d'intégration, jamais renvoyés au navigateur, à Facturations ou aux journaux. Renouvellements sérialisés par installation et remplacement atomique des jetons renouvelés.
- Révocation/désinstallation : marquer l'installation révoquée, arrêter les tâches qui utilisent le fournisseur et supprimer ses jetons selon la politique de conservation. Les pièces du dossier et l'historique comptable restent distincts.
- Vérifier les webhooks Zoom selon leur signature et timestamp, contrôler l'identifiant du compte attendu, dédupliquer puis traiter les transitions. La validation de l'URL d'un webhook n'est pas une autorisation d'installer un compte. [Documentation officielle des webhooks Zoom](https://developers.zoom.us/docs/api/webhooks/).

Le chronomètre manuel existant conserve sa provenance `manual_server_timer`. Les futurs événements fournisseur devront constituer une autre source vérifiée; ils ne doivent pas réécrire les anciennes durées.

## Place de Facturations et ordre de réalisation

Facturations reste un service indépendant : voir [COMMUNICATIONS.md](COMMUNICATIONS.md) pour le contrat v1 consulté. Les références de commande, transaction vérifiée et installation permettront un rapprochement comptable. Ni une session Checkout ni une ligne de temps ne doit être traduite automatiquement en facture émise par l'adaptateur actuel, qui reste en lecture seule. Définir le responsable du reçu/facture et les clés de rapprochement avant d'éviter tout double enregistrement.

Ordre de réalisation proposé :

1. Livrer et tester le catalogue informatif dans le compte client.
2. Confirmer les offres, frais, conditions, taxes et politique en cas d'échec d'installation.
3. Persister les commandes et les transitions avec tests d'isolation des organisations.
4. Raccorder Checkout et les événements signés en sandbox; tester paiement différé, rejeu, concurrence, mauvais tenant, montant erroné, remboursement et litige.
5. Raccorder OAuth Zoom dans un environnement autorisé; tester refus de consentement, code/state rejoué, expiration, scopes insuffisants, renouvellement concurrent et révocation.
6. Contrôler le parcours payé mais non connecté, connecté mais sans accès au dossier, puis reconnecté sans nouvelle facturation injustifiée.
7. Activer l'offre approuvée après validation du parcours réel. Les services internes supplémentaires, l'appel auto-hébergé et la téléphonie restent des lots distincts.

Sources consultées le 28 octobre 2026 via documentation officielle Zoom et outil documentaire Stripe. Trois tests du catalogue vérifient les états réels, l'absence de prix/droits inventés et l'absence de contamination entre réponses.
