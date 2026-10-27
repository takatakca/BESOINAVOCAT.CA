# Catalogue et demandes de contact

Ce lot ajoute du code local, sans activation distante. Le paquet v2 précédemment refusé par cPanel n'est ni remplacé ni reconstruit. Aucun compte ou prix Stripe, paiement, courriel ou notification externe n'est créé.

## Portée

`GET /api/catalog` est public. Il fournit le catalogue versionné `2026-10-26.1`, en **CAD / cents** : demande client à zéro, intérêt avocat à **10 000 cents par semaine** ou **30 000 cents par mois**. Les crédits IA sont séparés, sans prix ni achat activé. Le traitement fiscal reste à configurer. `purchaseAvailable:false` et `subscriptionActive:false` empêchent de confondre un tarif annoncé avec un abonnement disponible.

Les prix et les snapshots d'intérêt utilisent la même source serveur. Changer un montant, les choix ou le consentement exige une nouvelle version du catalogue. Les libellés et le consentement sont fournis en français et en anglais. Les montants ou rôles d'autorité transmis par un navigateur ne sont jamais acceptés.

`POST /api/intake` enregistre uniquement une demande de contact dans une base privée distincte. **Une demande reçue n'est pas un workflow d'attribution, une notification, un espace professionnel, un mandat ou un abonnement.** Aucun GET de demandes, recherche par référence, export HTTP ou interface d'opérateur n'est livré. Les permissions existantes des dossiers ne donnent pas accès à cette file par une nouvelle route.

## Activation explicite

Deux variables sont nécessaires :

| Variable | Valeur attendue |
|---|---|
| `BESOINAVOCAT_INTAKE_DB_PATH` | Chemin absolu d'une base SQLite dédiée, hors dépôt, application, blobs et toutes racines web. Le répertoire parent doit déjà exister et être privé. |
| `BESOINAVOCAT_INTAKE_ALLOWED_ORIGINS` | Tableau JSON de 1 à 8 origines HTTPS exactes, par exemple `["https://besoinavocat.ca","https://portail.besoinavocat.ca"]`. Aucun joker, chemin, slash final ou origine implicite. |

Sous Unix, le répertoire est privé (`0700`) et le fichier `0600`. Les liens finaux et les emplacements publics usuels sont refusés. Le déploiement doit aussi comparer le chemin à **toutes** ses racines web personnalisées. La base ne peut pas réutiliser les fichiers des dossiers, sessions, grants ou clé, ni un fichier SQLite d'une autre application. Elle utilise WAL, `synchronous=FULL` et un délai de verrou de 2 secondes.

Sans configuration valide ou stockage ouvrable, le POST renvoie **503**, jamais une référence de succès. Le catalogue reste lisible sans origine navigateur et annonce `intake.enabled:false`. `/api/health` expose seulement `intakeConfigured`, sans chemin ou donnée reçue. Les origines autorisées peuvent être configurées pour le catalogue indépendamment d'un stockage actif.

## Contrat d'envoi

Le frontend utilise `credentials:'omit'`, sans Cookie ni Authorization. En-têtes requis :

```text
Content-Type: application/json
Origin: <origine HTTPS explicitement autorisée>
X-Requested-With: XMLHttpRequest
Idempotency-Key: <nouvel UUID v4 aléatoire>
```

Le navigateur fournit lui-même `Origin`. Le frontend conserve la même clé et le même corps lors d'une reprise après erreur réseau; il génère une nouvelle clé pour une demande modifiée. Ne pas mettre d'adresse courriel ou de donnée personnelle dans la clé.

Exemple entièrement synthétique :

```json
{
  "name": "Personne de démonstration",
  "email": "person@example.test",
  "role": "professional",
  "language": "fr",
  "domain": "civil",
  "region": "montreal",
  "periodicity": "monthly",
  "consent": true,
  "consentVersion": "2026-10-26.1",
  "website": ""
}
```

| Champ | Règle |
|---|---|
| `name` | Obligatoire, de 1 à 120 caractères, espaces périphériques retirés. |
| `email` | Obligatoire, syntaxe ASCII usuelle, 254 caractères maximum et partie locale de 64 maximum. Aucune vérification de possession de l'adresse n'est revendiquée. |
| `phone` | Facultatif; vide ou 32 caractères maximum avec 7 à 15 chiffres; seuls chiffres, `+`, espaces, points, parenthèses et tirets sont admis. |
| `role` | `client` ou `professional`; ce choix ne crée aucun rôle d'accès. |
| `language` | `fr` ou `en`. |
| `domain` / `region` | Identifiants exacts du catalogue; aucun champ libre. |
| `periodicity` | Obligatoire pour `professional` : `weekly` ou `monthly`. Doit être absent pour `client`. |
| `consent` / `consentVersion` | Booléen `true` et version actuelle exacte; pas de consentement implicite. |
| `website` | Honeypot facultatif, strictement vide. Un contenu produit une erreur; jamais un faux succès. |

Le nom, l'adresse et le téléphone refusent contrôles et balises. Corps JSON limité à **4 096 octets**, UTF-8 valide, sans compression. Les champs inattendus sont refusés : aucun récit juridique, fichier, identifiant de tenant, permission, montant, provenance marketing ou texte libre supplémentaire.

Domaines : `family`, `employment`, `housing`, `civil`, `criminal`, `business`, `immigration`, `other`.

Régions : `montreal`, `laval`, `monteregie`, `capitale-nationale`, `outaouais`, `laurentides`, `lanaudiere`, `estrie`, `mauricie`, `chaudiere-appalaches`, `centre-du-quebec`, `saguenay-lac-saint-jean`, `bas-saint-laurent`, `abitibi-temiscamingue`, `cote-nord`, `nord-du-quebec`, `gaspesie-iles-de-la-madeleine`, `outside-quebec`.

Après commit SQLite seulement : **201**, JSON exact `{ "reference": "BA-…", "status": "received" }`. La référence suit `^BA-[A-Za-z0-9_-]{24}$`, avec 18 octets aléatoires; elle n'autorise aucune consultation. Une reprise avec la même clé, le même corps normalisé et la même origine retourne le même reçu sans seconde ligne. Un changement de corps ou d'origine avec cette clé renvoie **409**.

## Confidentialité, CORS et erreurs

Les deux routes publiques sont les seules à autoriser le CORS de cette liste. Le serveur ne renvoie jamais `*` ou `Access-Control-Allow-Credentials`. Le preflight accepte uniquement la méthode propre à la route et les trois en-têtes explicitement listés. Les API privées des dossiers ne reçoivent aucune nouvelle permission CORS.

Origin, en-têtes requis et idempotence sont contrôlés avant le stockage; les en-têtes de sécurité dupliqués sont refusés. CORS et Origin protègent le navigateur, sans authentifier un émetteur qui utilise un client HTTP hors navigateur. La file n'est donc pas une preuve d'identité.

Chaque ligne garde les coordonnées minimales, choix, consentement et sa version/son texte, date serveur, origine, version et snapshot du prix annoncé. La base privée contient ces coordonnées en clair; elle doit être protégée et sauvegardée comme telle. Aucun jeton, cookie, mot de passe, fichier juridique ou IP brute n'y est enregistré par ce module. Les clés d'idempotence et de limitation sont hachées. Le hachage n'est pas présenté comme une anonymisation.

Les réponses sont `no-store` et ne renvoient ni coordonnées ni diagnostics de stockage. Codes stables :

| HTTP | Code | Sens |
|---|---|---|
| 400 | `INTAKE_INVALID_INPUT` | Champs, choix, honeypot ou clé invalides. |
| 400 | `INTAKE_CONSENT_REQUIRED` | Consentement explicite ou version actuelle absent/invalide. |
| 403 | `INTAKE_FORBIDDEN` | Origine, en-têtes ou credentials refusés. |
| 409 | `IDEMPOTENCY_CONFLICT` | Clé déjà utilisée avec un autre contenu ou origine. |
| 429 | `INTAKE_RATE_LIMIT` | Limite atteinte; aucun nouvel enregistrement. |
| 503 | `INTAKE_UNAVAILABLE` | Configuration, stockage ou capacité indisponible. |

Les erreurs communes `INVALID_INPUT`, `BODY_TOO_LARGE` et `JSON_REQUIRED`/`UNSUPPORTED_ENCODING` couvrent URL, JSON, taille et encodage. Une méthode non autorisée renvoie 405. Le frontend traduit les codes en FR/EN; il ne traite ni une réponse non-201 ni une panne réseau comme un reçu.

## Limites d'exploitation

Les limites partagées SQLite sont de **20 tentatives par pair réseau sur 15 minutes**, **120 par minute au total** et **3 nouvelles demandes par courriel sur 24 heures**. Une reprise idempotente ne consomme pas une nouvelle demande courriel, mais reste soumise à la limite des tentatives. Les décisions et écritures utilisent `BEGIN IMMEDIATE`. Au plus quatre corps sont lus simultanément par processus; la file est bornée à 10 000 lignes et les compteurs à 4 096 entrées actives.

Le pair est `socket.remoteAddress`, jamais un `X-Forwarded-For` non validé. **Derrière Passenger ou un proxy, plusieurs visiteurs peuvent partager ce pair et donc sa limite.** Adapter cette limite ou la source d'adresse exige une configuration de proxy vérifiée; aucune confiance implicite dans les en-têtes transmis n'est ajoutée ici.

Seuls les compteurs expirés sont purgés automatiquement; les demandes ne sont pas effacées par cette purge. Avant activation, l'exploitant doit définir la consultation, la durée de conservation, la suppression et la sauvegarde de cette file privée. L'outil existant de sauvegarde documentaire ne l'inclut pas. Le consentement enregistré porte sur le traitement d'une demande de contact, pas sur une inscription marketing générale ou une notification automatique.

## Vérification

`platform/test/intake.test.mjs` teste le catalogue bilingue, prix et désactivation, refus d'origine et de credentials, preflight, consentement, champs et corps bornés, honeypot, stockage séparé, absence de divulgation, idempotence sur deux instances et après redémarrage, panne d'écriture, quotas de débit partagés et conservation des demandes lors de la purge des compteurs. Les fixtures et coordonnées sont synthétiques, sans réseau externe.

Les deux modules sont ajoutés à la liste blanche du constructeur de bundle; ce changement ne modifie aucune archive existante. Le branchement réel du formulaire WordPress, la configuration d'hébergement et la validation de bout en bout restent distincts des tests locaux.
