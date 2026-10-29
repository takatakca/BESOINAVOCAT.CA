# Connexion du portail avec l'identité TAKATAK

Le module `platform/lib/browser-session.mjs` réutilise Supabase Auth, fournisseur existant de TAKATAK. Il ne crée ni utilisateur, ni mot de passe local, ni identité WordPress. Sa présence dans le dépôt et ses tests simulés ne prouvent pas une connexion réelle en production.

## Fournisseur et accès au produit

Le code TAKATAK-V1 au commit `4e57ccf6a3623548081067263341039aef2fc498` distingue explicitement le projet de production `pcjfahhlozsseqqevimi` et le staging `utuvzrqvivqyziibobvu`. Les références sont des identifiants publics, pas des clés. Voir [la constante de production](https://github.com/takatakca/takatak-v1/blob/4e57ccf6a3623548081067263341039aef2fc498/scripts/phone-email-history.mjs) et [le contrôle de promotion](https://github.com/takatakca/takatak-v1/blob/4e57ccf6a3623548081067263341039aef2fc498/deploy/linux/promote-production.sh).

Le portail conserve le mot de passe existant en solution de repli via `/auth/v1/token?grant_type=password`. Le parcours par code courriel, soumis à une activation explicite, utilise `/auth/v1/otp` puis `/auth/v1/verify`. Les deux parcours vérifient ensuite le jeton reçu avec `/auth/v1/user`. Ce dernier appel est également effectué à chaque résolution d'une session du portail. Le résultat doit identifier un UUID utilisateur, une adresse confirmée et un compte non anonyme sans bannissement courant. Les erreurs de connexion sont génériques; les réponses et identifiants ne sont pas journalisés par ce module. [Connexion par mot de passe](https://supabase.com/docs/reference/javascript/auth-signinwithpassword) · [Vérification serveur getUser](https://supabase.com/docs/reference/javascript/auth-getuser).

L'authentification ne suffit pas à donner accès aux dossiers. Un fichier privé local accorde explicitement l'accès BesoinAvocat à l'UUID renvoyé par le fournisseur, avec un tenant. Ni l'adresse courriel, ni les `user_metadata`, ni un rôle transmis par le navigateur ne créent cette autorisation. Les rôles et appartenances à chaque dossier restent dans la base applicative; le fichier ci-dessous ne confère pas de rôle avocat ou propriétaire.

Le statut du profil métier TAKATAK n'est pas interrogé par ce module. Il contrôle le compte Auth et l'habilitation locale. Aucun contrôle périodique de `auth.sessions` ou de l'ensemble des permissions TAKATAK n'est revendiqué. La fonction TAKATAK `identity-context` a un autre contrat et n'est pas utilisée comme introspection BesoinAvocat.

## Code courriel : activation et réception opérateur

**Contrôle du 29 octobre 2026 :** le propriétaire a ouvert le tableau de bord Supabase. Le SMTP personnalisé était déjà activé; ses identifiants sont restés inchangés. Le modèle partagé « Magic link or OTP » contenait une invitation TAKATAK avec un lien utilisant `.RedirectTo` et `.TokenHash`. Une section FR/EN affichant `{{ .Token }}` a été ajoutée en conservant intégralement l'invitation, son lien et son objet. Enregistrement et relecture après rechargement confirmés; copie préalable et preuve conservées dans le OneDrive privé. La livraison effective du courriel et la connexion utilisateur restent à tester après déploiement du correctif.

Le code est prêt à tester, **désactivé par défaut**. La variable `BESOINAVOCAT_EMAIL_OTP_ENABLED` doit valoir exactement `true` pour l’activer. Sans cette déclaration opérateur, `/api/health` annonce `emailCodeConfigured:false`, les deux routes de code répondent 503 après la garde d’origine et le navigateur conserve le formulaire de mot de passe existant. `loginConfigured` reste distinct. La capacité est une déclaration de configuration locale, pas un test SMTP ni une preuve de livraison.

Avant toute activation, l'opérateur doit :

1. Confirmer que le fournisseur et la clé publique ciblent bien le projet Auth TAKATAK attendu, sans changer de projet ni créer de compte.
2. Vérifier dans Supabase **Authentication → Email Templates → Magic Link** que le message affiche `{{ .Token }}`. Un modèle avec seulement `{{ .ConfirmationURL }}` envoie un lien magique; le portail ne traite pas ce lien comme un code. Examiner l’impact sur les autres applications du même projet avant toute modification de ce modèle partagé.
3. Vérifier l’activation de l’authentification email, le SMTP ou hook de livraison réellement utilisé, l’expéditeur, les destinataires autorisés, les limites d’envoi et la durée/longueur du code. Un nouveau projet Free utilisant le SMTP par défaut peut nécessiter un SMTP personnalisé pour modifier le modèle. Aucun abonnement ni identifiant SMTP n'est changé par ce lot; l'ajout au modèle partagé est décrit ci-dessus.
4. Confirmer les grants BesoinAvocat et les appartenances aux dossiers existants. L’envoi d’un code ne crée ni grant ni appartenance. Ne pas réinitialiser le mot de passe historique pour utiliser ce parcours.
5. Après ces vérifications, activer explicitement la variable et redéployer. Vérifier `emailCodeConfigured:true` puis faire **une demande réelle volontaire depuis le portail**, saisir le code reçu et confirmer l’accès aux dossiers autorisés, le refus anonyme, puis la déconnexion. Si la livraison ou le modèle ne convient pas, désactiver la variable. Le parcours réel n’a pas été exécuté dans les tests de ce lot.

[Guide officiel des codes et modèles](https://supabase.com/docs/guides/auth/auth-email-passwordless) · [Vérification du code](https://supabase.com/docs/reference/javascript/auth-verifyotp) · [Changement des modèles sur les nouveaux projets Free](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier).

### Ne pas confondre les deux systèmes de code

Le code TAKATAK main observé au commit `68cbc860b25d68cf30ef0af3fd89f96bfc937ffe` utilise un OTP applicatif : [`src/app/api/auth/login/route.ts`](https://github.com/takatakca/takatak-v1/blob/68cbc860b25d68cf30ef0af3fd89f96bfc937ffe/src/app/api/auth/login/route.ts) appelle `sendEmailOtp` dans [`src/lib/auth/otp/service.ts`](https://github.com/takatakca/takatak-v1/blob/68cbc860b25d68cf30ef0af3fd89f96bfc937ffe/src/lib/auth/otp/service.ts), avec hash de code dans le profil. Le nouveau parcours du portail appelle **Supabase Auth directement sur la même identité**. Un code demandé sur TAKATAK n’est donc pas annoncé comme utilisable sur le portail. Aucun SSO automatique, transfert de code, changement du service TAKATAK ou réinitialisation n’est ajouté.

### Contrat HTTP

- `POST /api/auth/email/request` avec `{ "email": "member@example.test" }` appelle le fournisseur avec `{email, create_user:false}`. Succès, compte inconnu/refusé et limitation fournisseur liée au compte reçoivent le même résultat public générique `{accepted:true,message}`; cela ne prouve ni l’existence du compte ni l’envoi/livraison du message. Aucun cookie de connexion n’est délivré à cette étape.
- `POST /api/auth/email/verify` avec `{ "email": "member@example.test", "code": "00123456" }` envoie `{email,token:code,type:"email"}`. Le code reste une chaîne de **6 à 10 chiffres ASCII**, zéros initiaux conservés. Après le jeton fournisseur, `/user` doit confirmer le même UUID, le même courriel normalisé et un compte confirmé non anonyme/non banni. Les grants frais sont ensuite obligatoires. Seuls `{user,expiresAt}` et le cookie opaque sont renvoyés.
- Les routes refusent query, champs supplémentaires, corps trop volumineux, méthode autre que POST et authentification Bearer. Elles exigent l’origine exacte et `X-Requested-With: XMLHttpRequest`; réponses `no-store`. La vérification n’accepte ni token hash ni type `recovery`, `signup` ou autre fourni par le client.
- Les limites durables existantes sont **communes** aux demandes de code, vérifications et mots de passe : cinq tentatives par courriel et dix par client sur quinze minutes, soixante au total par minute, quatre requêtes de connexion simultanées. La limitation locale reste un vrai 429 avant réseau. Les erreurs fournisseur ne sont jamais recopiées. Les codes faux, expirés ou réutilisés ne créent pas de session; le fournisseur en contrôle l’usage unique et l’expiration.
- Aucun code n’est enregistré en base, dans l’URL, dans un stockage navigateur ou dans les logs applicatifs. Le champ est vidé dès la soumission et reste réutilisable après erreur. Les identifiants transitent seulement dans le corps HTTPS. Vérifier que les logs du proxy, du fournisseur et des outils d’observabilité ne capturent pas ces corps.

## Configuration privée

Le serveur charge uniquement ces variables, sans afficher leur contenu :

| Variable | Contenu attendu |
|---|---|
| `TAKATAK_SUPABASE_URL` | Origine HTTPS exacte du fournisseur confirmé, sans chemin, query ou identifiants URL |
| `TAKATAK_SUPABASE_PUBLISHABLE_KEY` | Clé publique `sb_publishable_…`, ou ancienne clé publique `anon`; jamais `service_role` ou `sb_secret_…` |
| `BESOINAVOCAT_GRANTS_FILE` | Chemin absolu du fichier JSON privé, hors dépôt, racine de l'application et toutes racines web |
| `BESOINAVOCAT_EMAIL_OTP_ENABLED` | `true` seulement après vérification du modèle contenant `.Token` et de la livraison; absent/false par défaut |
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
| `emailCodeConfigured` | Configuration valide, stockage ouvert et activation explicite du code; ne prouve pas une livraison réelle |
| `await requestEmailCode(email, {clientKey}?)` | `{accepted:true,message}` générique, sans session |
| `await verifyEmailCode(email, code, {clientKey}?)` | `{identity,expiresAt,setCookie}` après fournisseur, correspondance de courriel et grants |
| `await resolve(cookieHeader)` | `{subject, tenantId, product: 'besoinavocat', active: true}` |
| `logout(cookieHeader)` | `{setCookie}` pour supprimer le cookie, et invalidation locale immédiate de cette session |
| `assertMutation(req)` | Refuse si `Origin` n'est pas exactement `APP_ORIGIN`, ou si `X-Requested-With` n'est pas `XMLHttpRequest` |
| `clear()` | Ferme le stockage de ce processus; conserve les sessions SQLite des autres workers. En mode mémoire de développement, supprime les sessions locales |

Les erreurs utilisent `HttpError` avec `status`, `code`, `message` : 401 pour une connexion/session invalide, 403 pour l'accès produit ou l'origine refusée, 429 pour la limitation des tentatives, 503 pour une configuration ou un fournisseur indisponible. Le serveur ne doit renvoyer que ces messages publics; jamais les réponses brutes du fournisseur ou les exceptions de fichiers.

Le navigateur reçoit seulement un identifiant opaque aléatoire de 32 octets : `__Host-ba_session`, `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, sans `Domain`. Seule son empreinte indexe la session. Le mot de passe et le code ne sont pas conservés; le refresh token est écarté. Aucun renouvellement automatique n'a lieu. L'expiration est le minimum de l'échéance du fournisseur, de sa durée annoncée et d'une heure.

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

## Vérification du lot code courriel — 29 octobre 2026

Les tests dédiés `email-code.test.mjs`, `workspace-email-code.test.mjs` et les extensions de `auth-http.test.mjs` utilisent uniquement des comptes, codes et réponses fictifs. Ils contrôlent l’activation explicite, `create_user:false`, les réponses génériques, la correspondance UUID/courriel, les droits inchangés, les codes 6/8/10 chiffres, la reprise après code refusé, le retrait des réponses obsolètes et zéro HTTP en démonstration. Les limites sont également contrôlées entre deux instances SQLite. Exécutable de validation : Node **24.19.0**; les commandes reproductibles sont `node --test platform/test/email-code.test.mjs platform/test/workspace-email-code.test.mjs platform/test/auth-http.test.mjs platform/test/browser-session.test.mjs platform/test/browser-session-persistence.test.mjs`, puis `node --test platform/test/*.test.mjs`. Aucun code réel n’a été envoyé et aucune connexion réelle par OTP n’est certifiée.

Résultat du contrôle local du 29 octobre : **60/60** tests ciblés auth/OTP/session/UI, **233/233** tests du pilote et **12/12** tests du site historique réussis. Le test intégrations portant sur le mode Unix `0644` a été conditionné aux systèmes POSIX; les contrôles de rotation de clé et de reconnexion restent exécutés sur toutes les plateformes. La revue indépendante de l’authentification et de la reprise UI après erreur n’a relevé aucun blocage. Cette validation reste synthétique et ne remplace pas le test de livraison réelle à effectuer après configuration.
