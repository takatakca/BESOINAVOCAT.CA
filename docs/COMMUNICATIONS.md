# Communications et passerelle Facturations — 28 octobre 2026

Ce lot ajoute un agenda de communications par dossier, un chronomètre personnel côté serveur et un registre de durées à valider. Il ajoute aussi un adaptateur **Facturations en lecture seule, désactivé par défaut**. Le code et ses tests ne constituent pas une connexion Zoom, une téléphonie active, un déploiement ou une activation de facturation.

## Ce qui fonctionne dans le pilote

- Un propriétaire ou avocat habilité planifie un rendez-vous vidéo ou téléphonique dans son dossier.
- Une vidéo peut référencer un lien de participation Zoom existant. Le lien est limité à HTTPS, au domaine `zoom.us` ou ses sous-domaines, au chemin `/j/` suivi de 9 à 11 chiffres et à l'éventuel paramètre `pwd`. Les liens hôte `/s/`, redirections, informations de connexion dans l'URL, fragments et ports non standard sont refusés. Aucun appel réseau n'est effectué pour ouvrir ou vérifier ce lien.
- Chaque membre du dossier démarre et termine **son propre chronomètre manuel**. L'heure vient du serveur. Cela mesure le délai entre deux actions dans le portail, pas une présence vérifiée dans un appel.
- Un seul chronomètre peut être actif par identité et organisation, même entre plusieurs dossiers. Les chronomètres des différents participants sont des temps personnels distincts : ils ne doivent pas être additionnés comme une durée unique d'appel.
- Les reprises d'une planification avec la même clé et le même contenu, et les doubles clics sur démarrer/terminer, ne créent pas de doublons. Après arrêt, un chronomètre ne redémarre pas; une nouvelle séance exige un nouveau rendez-vous.
- À l'arrêt, une ligne de consommation immuable est inscrite. Son origine est `manual_server_timer`, avec `providerVerified: false` et `billed: false`.
- Une autre personne disposant du rôle propriétaire ou avocat peut approuver cette ligne. L'approbation reste interne et ne transforme pas sa provenance en événement Zoom/téléphonie vérifié.
- Un chronomètre oublié au-delà de 24 heures conserve toute sa durée avec `needsReview: true`, sans estimation financière ni approbation possible. Une future correction devra être ajoutée explicitement avec sa justification; elle n'est pas implémentée par ce lot.
- L'absence de tarif produit `null` pour le tarif et l'estimation. Un tarif configuré à zéro est une décision explicite du serveur, pas une valeur de remplacement pour un prix inconnu.

Les doublons entre ce registre et les anciennes fiches `time_entries` ne sont pas automatiquement rapprochés. Aucun total facturable global, débit de crédit ou paiement ne doit être obtenu en additionnant ces deux sources.

## Contrat d'intégration dans le serveur Node

```js
import { createCommunications } from './lib/communications.mjs';

const communications = createCommunications({
  db: store.db,
  access: store.access,
  audit: store.audit,
  // Ces tarifs sont une configuration serveur, jamais un corps HTTP.
  rates: { videoCentsPerMinute: null, phoneCentsPerMinute: null },
});
```

Le module utilise la même base SQLite que le dossier. `clock` peut être injecté dans les tests; la production utilise `Date.now`. Les mutations sont synchrones et transactionnelles (`BEGIN IMMEDIATE`), avec les événements d'audit dans la même transaction. Aucune transaction ne reste ouverte pendant une requête externe.

| Méthode | Entrées supplémentaires | Accès et résultat |
|---|---|---|
| `list(user, caseId)` | aucune | Membre du dossier; `{sessions, hasMore, providers}` |
| `schedule(user, caseId, body, key)` | `kind`, `title`, `scheduledAt`, `joinUrl` facultatif; clé de 16–80 caractères `[A-Za-z0-9_-]` | Propriétaire/avocat; rendez-vous créé ou résultat précédent |
| `start(user, caseId, sessionId)` | aucune durée reçue | Membre; son chronomètre personnel |
| `end(user, caseId, sessionId)` | aucune durée reçue | Membre; son chronomètre arrêté et une ligne de consommation |
| `cancel(user, caseId, sessionId)` | aucune | Propriétaire/avocat; seulement avant tout chronométrage |
| `listUsage(user, caseId)` | aucune | Membre; `{entries, hasMore, billingEnabled:false}` |
| `approveUsage(user, caseId, usageId)` | aucune | Propriétaire/avocat différent de l'auteur; ligne avec `approved_internal_only` |

`scheduledAt` est une date UTC ISO complète avec secondes, par exemple `2026-11-01T18:00:00Z`. Les listes sont limitées aux 200 entrées les plus récentes et signalent `hasMore`; la pagination complète reste à implémenter avant de grands volumes.

La réponse rendez-vous contient `ownTimer` pour la personne connectée, ou `null`. Son `status` vaut `scheduled` ou `cancelled`; il ne prétend pas refléter l'état d'un appel fournisseur. `ownTimer.status` vaut `running` ou `ended`. Les durées sont des secondes entières, arrondies vers le bas. Une estimation, si un tarif serveur est fixé, vaut `ceil(seconds × rateCentsPerMinute / 60)` centimes CAD. Le tarif est figé au démarrage. L'estimation n'applique ni taxes ni forfait minimum et ne vaut pas prix accepté ou facture.

Routes d'intégration prévues dans `server.mjs` :

- `GET/POST /api/cases/:caseId/communications` (`Idempotency-Key` obligatoire pour POST);
- `POST /api/cases/:caseId/communications/:id/start`, `/end` et `/cancel`;
- `GET /api/cases/:caseId/usage`;
- `POST /api/cases/:caseId/usage/:id/approve`.

Les routes doivent garder l'identité TAKATAK, les protections de session/CSRF, la validation des corps vides sur les actions et les en-têtes de non-cache du portail. `user`, les rôles, l'organisation et les tarifs ne viennent pas du JSON navigateur. Un lien contenant `pwd` ne doit pas apparaître dans les journaux ou pages publiques.

Erreurs : `400 INVALID_INPUT`, `403 FORBIDDEN`, `404 NOT_FOUND` (absence ou autre dossier), `409 COMMUNICATION_CONFLICT` (transition impossible, horloge reculée, autre chrono actif, clé réutilisée avec un contenu différent). Le journal n'inscrit ni titre ni lien Zoom.

## Facturations : contrat réellement consulté

Le 28 octobre 2026, `takatakca/Facturations` `main` répond au commit `995d5cbb6296fca5ea852985c2cb9c4e4d89f2d3`.

- [Handoff d'intégration au commit consulté](https://github.com/takatakca/Facturations/blob/995d5cbb6296fca5ea852985c2cb9c4e4d89f2d3/docs/takatak-dashboard-integration-handoff-v1.md)
- [OpenAPI v1 au même commit](https://github.com/takatakca/Facturations/blob/995d5cbb6296fca5ea852985c2cb9c4e4d89f2d3/docs/takatak-integration-v1.openapi.json)

Le contrat prévoit une identité de service HS256, des brouillons et leurs états internes. Le connecteur livré n'utilise que `GET /integration/v1/capabilities`, `GET /integration/v1/dashboard` et `GET /integration/v1/drafts`. Le tableau récapitulatif porte toujours `DRAFTS_ONLY`; ses montants ne sont ni revenus ni paiements reçus.

```js
import { createFacturationsClient, prepareFacturationsDraft }
  from './lib/facturations-client.mjs';

const disabled = createFacturationsClient(); // Aucun appel externe possible.

// À raccorder uniquement après validation de l'environnement cible :
const reads = createFacturationsClient({
  enabled: true,
  origin: configuredHttpsOrigin,
  secret: privateHmacKeyBuffer, // >= 32 octets, configuration serveur privée
  issuer: configuredIssuer,
  audience: configuredAudience,
  resolveAccount: async authenticatedUser => serverOwnedAccountMapping(authenticatedUser),
});
```

`resolveAccount` doit vérifier l'habilitation effective et retourner `{masterIdentityId, businessId, role:'OWNER'|'STAFF'}`. Il ne doit pas reprendre une entreprise ou un rôle déclarés par le navigateur. L'adaptateur ne crée aucun mapping ni accès. La clé dédiée, l'origine et le mapping ne sont pas encore raccordés dans ce lot. Ne pas réutiliser la clé administrative d'une autre application.

Chaque requête crée un jeton de 60 secondes, avec un `jti` neuf et exactement les claims v1 documentés. Le jeton reste dans l'en-tête `Authorization` serveur. Les redirections sont refusées; un délai maximal couvre la requête et sa lecture, avec une réponse JSON limitée à 64 Kio. L'entreprise retournée doit correspondre au mapping. Les données de réponse sont validées et les champs superflus ne sont pas transmis.

Méthodes disponibles : `status()`, `capabilities(user)`, `dashboard(user)`, `drafts(user,{page,pageSize})`. Pagination : page entière positive, taille de 1 à 50. Erreurs publiques : `403 FACTURATIONS_MAPPING_REQUIRED`, `503 FACTURATIONS_UNAVAILABLE`, `502 FACTURATIONS_INVALID_RESPONSE`, sans détail interne ni secret fournisseur.

`prepareFacturationsDraft(body)` prépare **uniquement un objet local** conforme au schéma documenté : CAD, client, dates, lignes en centimes entiers, taxes explicitement renseignées et notes facultatives. Aucun appel, stockage distant ou idempotence distante n'est prétendu. Ce validateur de structure n'est pas une autorité tarifaire : il faut résoudre les prix/taxes côté serveur avant de l'appeler. Il ne convertit pas automatiquement le registre de temps en facture.

Même si le serveur distant annonce `draftWrite:true`, cet adaptateur expose `writesEnabled:false` et ne comporte **aucune méthode POST**. La création distante de brouillon pourra être ajoutée ensuite, sous un commutateur distinct et avec le contrat `Idempotency-Key` du fournisseur. Émission, livraison, paiement, publication et écritures Wave restent absents.

## Raccordements à réaliser ensuite

1. Vérifier l'accès TAKATAK réel et les habilitations du dossier sur le portail déployé; les tests de ce lot utilisent des identités synthétiques.
2. Pour créer des réunions Zoom par API : choisir le type d'application approprié, le compte autorisé et les permissions minimales. La [documentation officielle Server-to-Server OAuth](https://developers.zoom.us/docs/internal-apps/s2s-oauth/) exige une application et les identifiants de compte/client côté serveur. Ce flux porte l'autorité du compte propriétaire; il n'autorise pas automatiquement les comptes des avocats tiers.
3. Pour une durée fournisseur vérifiée : intégrer les événements signés, les identifiants de participants et l'idempotence des événements. Conserver cette provenance séparée du chronomètre manuel. La [référence officielle Zoom Meeting API](https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/) est un point de départ, pas une preuve de connexion.
4. Pour le téléphone intégré : choisir et raccorder le fournisseur. Le statut reste `not_connected`; aucun numéro n'est acheté, appelé ou enregistré ici.
5. Pour Facturations : staging isolé HTTPS, identité/service et business validés, tests des cas de refus, puis activation explicite des lectures. Aucun appel réel Facturations n'a été effectué pendant ce développement.
6. Pour les frais : fixer les tarifs d'usage, taxes, règles d'arrondi, consentement au prix et rapprochements. Les abonnements avocats décidés antérieurement ne fixent pas le tarif d'une minute d'appel. Aucun prélèvement ou commission n'est activé.

## Vérifications du module

`node --test platform/test/communications.test.mjs platform/test/facturations-client.test.mjs` avec Node 24 : 17 tests réussis lors du développement. Ils couvrent les rôles et dossiers, les liens hostiles, les doubles clics, deux connexions SQLite concurrentes, l'approbation indépendante, l'horloge et les durées oubliées, le calcul d'estimation, les claims/signatures, les réponses d'une autre entreprise, les délais et tailles de réponses ainsi que la préparation locale des brouillons. Ces tests ne remplacent pas les contrôles HTTP/UI du serveur intégrateur ni une homologation fournisseur.

Le contrôle de compatibilité a également ajouté les quatre tables de communications à la liste explicite du programme de sauvegarde. Les 11 tests Python de sauvegarde/restauration passent : l'un construit une base à travers les modules Node réels, sauvegarde un usage approuvé, le restaure puis vérifie ses valeurs, ses liens et les quatre déclencheurs qui interdisent la modification/suppression de l'usage et de son approbation. Les tables inconnues restent refusées. Le paquet Passenger historique inclut les nouveaux modules; ses trois tests passent. Ces contrôles ne reconstruisent ni ne transfèrent le paquet bloqué par MochaHost.
