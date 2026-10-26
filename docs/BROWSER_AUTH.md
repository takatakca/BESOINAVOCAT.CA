# Connexion du portail avec l'identité TAKATAK

Le module `platform/lib/browser-session.mjs` réutilise Supabase Auth, fournisseur existant de TAKATAK. Il ne crée ni utilisateur, ni mot de passe local, ni identité WordPress. Sa présence dans le dépôt et ses tests simulés ne prouvent pas une connexion réelle en production.

## Fournisseur et accès au produit

Le code TAKATAK-V1 au commit `4e57ccf6a3623548081067263341039aef2fc498` distingue explicitement le projet de production `pcjfahhlozsseqqevimi` et le staging `utuvzrqvivqyziibobvu`. Les références sont des identifiants publics, pas des clés. Voir [la constante de production](https://github.com/takatakca/takatak-v1/blob/4e57ccf6a3623548081067263341039aef2fc498/scripts/phone-email-history.mjs) et [le contrôle de promotion](https://github.com/takatakca/takatak-v1/blob/4e57ccf6a3623548081067263341039aef2fc498/deploy/linux/promote-production.sh).

Le portail envoie les identifiants saisis à `/auth/v1/token?grant_type=password`, puis vérifie le jeton reçu avec `/auth/v1/user`. Ce dernier appel est également effectué à chaque résolution d'une session du portail. Le résultat doit identifier un UUID utilisateur, une adresse confirmée et un compte non anonyme sans bannissement courant. Les erreurs de connexion sont génériques; les réponses et identifiants ne sont pas journalisés par ce module. [Connexion par mot de passe](https://supabase.com/docs/reference/javascript/auth-signinwithpassword) · [Vérification serveur getUser](https://supabase.com/docs/reference/javascript/auth-getuser).

L'authentification ne suffit pas à donner accès aux dossiers. Un fichier privé local accorde explicitement l'accès BesoinAvocat à l'UUID renvoyé par le fournisseur, avec un tenant. Ni l'adresse courriel, ni les `user_metadata`, ni un rôle transmis par le navigateur ne créent cette autorisation. Les rôles et appartenances à chaque dossier restent dans la base applicative; le fichier ci-dessous ne confère pas de rôle avocat ou propriétaire.

Le statut du profil métier TAKATAK n'est pas interrogé par ce module. Il contrôle le compte Auth et l'habilitation locale. Aucun contrôle périodique de `auth.sessions` ou de l'ensemble des permissions TAKATAK n'est revendiqué. La fonction TAKATAK `identity-context` a un autre contrat et n'est pas utilisée comme introspection BesoinAvocat.

## Configuration privée

Le serveur charge uniquement ces variables, sans afficher leur contenu :

| Variable | Contenu attendu |
|---|---|
| `TAKATAK_SUPABASE_URL` | Origine HTTPS exacte du fournisseur confirmé, sans chemin, query ou identifiants URL |
| `TAKATAK_SUPABASE_PUBLISHABLE_KEY` | Clé publique `sb_publishable_…`, ou ancienne clé publique `anon`; jamais `service_role` ou `sb_secret_…` |
| `BESOINAVOCAT_GRANTS_FILE` | Chemin absolu du fichier JSON privé, hors dépôt, racine de l'application et toutes racines web |
| `APP_ORIGIN` | Origine HTTPS exacte du portail déployé, sans chemin ni query |
| `BESOINAVOCAT_SESSION_DB_PATH` | Chemin absolu d'une base SQLite privée distincte pour les sessions et limites partagées |
| `BESOINAVOCAT_SESSION_KEY_FILE` | Chemin absolu d'un fichier privé contenant exactement 32 octets binaires aléatoires; jamais une clé en variable d'environnement |

Le module refuse un fichier de grants contenu dans le projet ou un lien symbolique final. Sur Unix, ses permissions ne doivent accorder aucun accès au groupe ni aux autres utilisateurs, par exemple `0600`. Le dossier parent doit lui aussi rester privé et administré par le serveur. Le déploiement doit vérifier les autres racines web de l'hébergement : le module ne connaît pas leur configuration. Un fichier remplacé doit l'être atomiquement avec ses permissions privées conservées.

Avec `NODE_ENV=production`, les deux chemins de persistance sont obligatoires; sans eux, la connexion reste indisponible. La clé doit être créée côté serveur par un générateur cryptographique, sans affichage ni copie dans Git, une commande visible ou le panneau de variables. La clé et la base sont hors de l'application et des répertoires `public_html`, `htdocs`, `wwwroot`; les liens symboliques finaux sont refusés. Leurs permissions Unix doivent être privées (`0600`) et leur répertoire parent aussi (`0700`). Le fichier de clé doit exister; la base est créée si nécessaire. Le mode mémoire reste réservé aux tests et au développement non configuré en production.

Format illustratif, exclusivement synthétique; ne pas verser le fichier réel dans Git :

```json
{
  "version": 1,
  "grants": {
    "11111111-1111-4111-8111-111111111111": {
      "tenantId": "synthetic-tenant",
      "product": "besoinavocat",
      "active": true
    }
  }
}
```

Le fichier est relu à chaque connexion et résolution. Un retrait ou `active:false` refuse immédiatement l'accès local à la prochaine requête et invalide sa session. Changer son tenant oblige à se reconnecter. Un fichier absent, malformé, trop volumineux, publiquement lisible sur Unix ou contenant des champs de rôle est refusé. Cette autorisation locale explicite est distincte de la création d'une identité chez TAKATAK.

## Session et intégration HTTP

`createBrowserSessions({config, fetchImpl?, now?})` expose :

| API | Résultat |
|---|---|
| `configured` | Configuration valide et stockage de session ouvert; ne prouve pas la disponibilité du fournisseur ou du fichier de grants |
| `await login(email, password, {clientKey}?)` | `{identity, expiresAt, setCookie}`; expiration en millisecondes Unix |
| `await resolve(cookieHeader)` | `{subject, tenantId, product: 'besoinavocat', active: true}` |
| `logout(cookieHeader)` | `{setCookie}` pour supprimer le cookie, et invalidation locale immédiate de cette session |
| `assertMutation(req)` | Refuse si `Origin` n'est pas exactement `APP_ORIGIN`, ou si `X-Requested-With` n'est pas `XMLHttpRequest` |
| `clear()` | Ferme le stockage de ce processus; conserve les sessions SQLite des autres workers. En mode mémoire de développement, supprime les sessions locales |

Les erreurs utilisent `HttpError` avec `status`, `code`, `message` : 401 pour une connexion/session invalide, 403 pour l'accès produit ou l'origine refusée, 429 pour la limitation des tentatives, 503 pour une configuration ou un fournisseur indisponible. Le serveur ne doit renvoyer que ces messages publics; jamais les réponses brutes du fournisseur ou les exceptions de fichiers.

Le navigateur reçoit seulement un identifiant opaque aléatoire de 32 octets : `__Host-ba_session`, `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, sans `Domain`. Seule son empreinte indexe la session. Le mot de passe n'est pas conservé et le refresh token est écarté. Aucun renouvellement automatique n'a lieu. L'expiration est le minimum de l'échéance du fournisseur, de sa durée annoncée et d'une heure.

En production, `browser-session-store.mjs` stocke le jeton d'accès, le subject et le tenant dans un payload chiffré **AES-256-GCM**. Chaque écriture utilise un nonce aléatoire de 12 octets et un tag de 16 octets. Les données authentifiées lient le ciphertext aux origines du fournisseur et du portail, à l'empreinte de session, à sa révision et à son échéance. La base ne contient ni cookie brut, ni mot de passe, ni refresh token. La clé de chiffrement reste dans un fichier séparé, chargé en mémoire du processus; sa valeur n'est jamais imprimée. [API cryptographique Node](https://nodejs.org/docs/latest-v24.x/api/crypto.html).

La base SQLite privée utilise WAL, `synchronous=FULL` et un délai d'attente de verrou de 2 secondes. Les workers du même hébergement partagent exactement la même base et la même clé. Une session résolue dans un autre processus reste soumise à `/user` et aux grants frais. Après les vérifications asynchrones, une requête SQL confirme que la session et sa révision existent encore : une déconnexion dans un autre worker ne peut pas être annulée par une réponse fournisseur arrivée ensuite. Une fermeture de worker n'efface pas les sessions des autres workers. Cette compatibilité concerne un stockage local partagé sur le même hôte, pas SQLite sur un système réseau ou plusieurs machines.

Une empreinte de clé et la liaison des origines empêchent d'ouvrir la base avec une clé ou une configuration incompatible. Ne jamais régénérer la clé à chaque démarrage ni restaurer clé et base indépendamment. Une mauvaise paire fait échouer la connexion fermée. La rotation nécessite une opération contrôlée de révocation et de remplacement; elle n'est pas automatisée ici. Le chiffrement protège le contenu au repos, sans prétendre résister à un attaquant contrôlant simultanément le processus et ses fichiers privés.

L'intégration serveur doit limiter le JSON de connexion, réserver la connexion à POST, exiger `assertMutation` pour connexion, déconnexion et toute écriture utilisant le cookie, et conserver `Cache-Control: no-store`. Le cookie et l'ancien Bearer ne doivent pas être acceptés simultanément. Les en-têtes d'origine dupliqués et les cookies de session dupliqués sont refusés. Le champ `clientKey` vient d'une donnée serveur fiable, par exemple l'adresse du pair; ne pas faire confiance à `X-Forwarded-For` sans proxy explicitement configuré.

## Limites de session et protection contre les abus

La déconnexion supprime immédiatement cette session du portail et son cookie, sans appeler la déconnexion globale Supabase ni déconnecter les autres produits. Un jeton d'accès déjà émis peut rester valide chez le fournisseur jusqu'à son expiration; `getUser` n'est pas présenté comme une garantie de révocation globale instantanée. Le portail conserve sa propre suppression de session et son refus local d'accès. [Limite des jetons après déconnexion](https://supabase.com/docs/reference/javascript/auth-signout).

Les appels fournisseur ont une échéance de 5 secondes, refusent les redirections et limitent le JSON à 64 Kio. Le module limite les tentatives à 5 par courriel et 10 par client sur 15 minutes, et 60 au total par minute. Les clés de ces compteurs sont hachées; les mots de passe n'y figurent pas. Il accepte au plus 4 connexions en cours, 32 vérifications concurrentes, 1 000 sessions et 4 096 compteurs.

En mode SQLite, les compteurs, capacités et réservations temporaires sont partagés et leurs décisions d'admission utilisent `BEGIN IMMEDIATE`. Ils survivent au redémarrage jusqu'à leur expiration. Les réservations de requêtes expirent après 30 secondes pour libérer un worker arrêté; une connexion qui aurait dépassé ce délai ne peut plus enregistrer sa session. Les sessions et compteurs échus sont purgés lors des accès. Le mode mémoire de développement fournit les mêmes limites dans son seul processus. Ces protections ne remplacent pas celles du fournisseur, du proxy ou une défense contre une attaque distribuée.

## Validation locale et validations restantes

Les tests de `platform/test/browser-session.test.mjs` et `browser-session-persistence.test.mjs` utilisent seulement des UUID, adresses, mots de passe et réponses synthétiques. Les **24 tests dédiés** ont réussi sous Node 24.19.0 hors sandbox le 26 octobre 2026, sans appel réseau externe. La suite combinée avec les 12 tests HTTP d'authentification compte **36 succès**. Ils couvrent notamment configuration refusée, réponse fournisseur invalide, confirmation utilisateur, grants retirés/modifiés, absence de rôle implicite, cookies ambigus, origine/CSRF, expiration, déconnexion isolée, course entre déconnexion et vérification, limites par compte/client/global et concurrence.

Les contrôles de persistance incluent deux instances sur la même base et un véritable second processus Node qui résout puis révoque une session du premier. Ils vérifient également la fermeture isolée d'un worker, le refus d'une mauvaise clé ou liaison d'origine, la détection d'une échéance altérée grâce au GCM, l'absence de jeton/subject/tenant/cookie en clair dans les fichiers SQLite et WAL, les limites partagées et la purge des sessions expirées. Un contrôle copie les modules dans l'arborescence du ZIP déployé : il accepte le stockage privé voisin de l'application et refuse les fichiers privés placés à l'intérieur de celle-ci.

La connexion réelle, les cookies sous le domaine HTTPS final, la confidentialité des logs du proxy, les fichiers privés partagés entre tous les workers Passenger et les contrôles HTTP de bout en bout restent à vérifier lors de l'intégration. Ces tests ne prouvent pas le déploiement effectif. Aucun utilisateur ni paramètre de TAKATAK/Supabase n'a été créé ou modifié par ce lot.
