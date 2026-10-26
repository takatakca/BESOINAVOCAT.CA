# Feuille de route produit — BesoinAvocat

Plan du 26 octobre 2026, fondé sur les états locaux du projet. Ce document décrit des priorités et des critères de livraison; il n’annonce aucune nouvelle activation. Les preuves d’exploitation restent dans [PROJECT_STATUS](PROJECT_STATUS.md), [PLATFORM_QA](PLATFORM_QA.md) et [WORDPRESS_QA](WORDPRESS_QA.md).

## Architecture retenue

**WordPress conserve la vitrine, ses pages et ses URL. Node.js porte le portail privé. TAKATAK reste l’autorité d’identité.** Le site statique Render demeure indépendant; aucun basculement du domaine WordPress vers Render n’est prévu. L’aperçu WordPress n’est pas une session de travail réelle.

```text
Vitrine WordPress → lien vers le portail HTTPS, une fois vérifié
                         ↓
Identité TAKATAK → API Node → habilitations par organisation et dossier
                         ├─ base applicative et journal d’audit
                         ├─ fichiers privés, versions et empreintes
                         └─ adaptateurs futurs : IA, facturation, signature, médias
```

Le pilote utilise SQLite et un stockage de fichiers sur une seule instance. Les espaces de travail futurs regrouperont les dossiers dans une organisation, sans donner automatiquement accès à tous leurs membres. Un éventuel passage à une base distribuée exige une migration testée; les données WordPress et ses plugins ne se convertissent pas automatiquement en portail.

## Existant, en cours et futur

| État | Périmètre réel |
|---|---|
| Existant en ligne, selon les contrôles consignés | WordPress conservé; habillage 0.1.2 actif; tableau de bord fictif. Les vérifications desktop ne couvrent pas toutes les tailles mobiles. |
| Existant localement | API et interface pilote : dossiers, membres, dépôt/téléchargement autorisé, versions, SHA-256, provenance déclarée, recherche littérale, messages, temps soumis/validé et audit. |
| En préparation | Lanceur Passenger et paquet de déploiement; préparation d’import par manifeste sans transfert. Node/Passenger disponibles chez l’hébergeur, mais application et identité réelle non raccordées dans l’état consigné. |
| Futur, non activé | Espaces de travail, rôle huissier, citations documentaires détaillées, points ouverts, IA sourcée, facturation Bollon, crédits/paiements, DocuSign, microphone et visioconférence. |

Le pilote ne réalise pas d’OCR. Un texte fourni, une mention de contrôle visuel ou une empreinte ne certifient ni l’authenticité ni la portée juridique d’une pièce. Les dossiers réels, exports, enregistrements, sauvegardes et secrets restent hors de ce dépôt.

## P0 — Préparation de la rencontre du 27 octobre

Utiliser le dossier maître existant pour disposer d’un point d’entrée, d’une recherche, de sources ouvrables et d’une liste des questions non résolues. Cette préparation ne dépend pas de l’ouverture du nouveau portail.

| À fournir | Critère de réception |
|---|---|
| Navigation et recherche utiles à la rencontre | Les fichiers existent, les liens ouvrent la bonne version et les requêtes essentielles retrouvent leurs sources. |
| Citations contrôlables | Chaque extrait utile indique document/version, page ou repère disponible et provenance; un OCR reste signalé comme extraction à vérifier. |
| Points ouverts et décisions | Chaque manque ou contradiction a une source, un responsable à confirmer et une prochaine action; aucune absence de résultat n’est assimilée à une preuve d’absence. |
| Remise maîtrisée | Le paquet figé reste identifiable; tout complément est séparé et daté. Réception, signature ou transmission ne sont enregistrées qu’après réalisation. |

## P1 — Ouvrir un portail utilisable

Ordre proposé : **hébergement → identité → habilitations → import pilote → parcours complet**.

1. **Démarrage technique.** Vérifier le sous-domaine proposé, HTTPS, Passenger, le processus unique, les emplacements privés et les journaux sans secrets. Tester une sauvegarde cohérente base/fichiers et sa restauration. Voir [CPANEL_NODE](CPANEL_NODE.md).
2. **Connexion TAKATAK.** Confirmer le contrat d’introspection dédié, le parcours navigateur, expiration/révocation et séparation des organisations. Les comptes WordPress ne créent pas de comptes ni de rôles dans le portail. Sans identité vérifiée, les routes privées restent fermées.
3. **Habilitations explicites.** Conserver le créateur en rôle client. Les qualités professionnelles ne se déduisent ni d’un nom ni d’un paiement. Provisionner les droits par dossier; tester refus, retrait d’accès et téléchargements avec plusieurs comptes et organisations.
4. **Import contrôlé.** Ajouter un véritable parcours de sélection et de transfert au manifeste actuel : choix du dossier, prévisualisation, vérification des empreintes, traitement explicite des doublons et rapport de réception. Aucun accès permanent au disque; aucun transfert automatique du corpus existant.
5. **Usage complet.** Déposer une pièce, retrouver sa version, suivre une citation, échanger et traiter un point ouvert avec des comptes habilités. Vérifier quotas, fichiers malformés, protection des téléversements et restauration avant ouverture à des dossiers réels.

### Rôles et espaces de travail à construire

| Rôle | Accès cible, toujours limité au dossier autorisé |
|---|---|
| Client | Déposer ses pièces, consulter les éléments partagés, échanger et suivre ses demandes. |
| Avocat | Examiner les pièces autorisées, préparer des analyses attribuées, traiter les points ouverts et valider le temps d’autrui selon le mandat. |
| Huissier — futur | Accès aux seules missions et pièces explicitement partagées; dépôt de constats, médias et provenance. Aucun accès général à la stratégie ou à la comptabilité du client. |
| Administrateur habilité | Gérer les appartenances et la traçabilité dans le périmètre accordé, sans se déclarer avocat ni contourner l’isolation des dossiers. |

**Aucun accès automatique des juges, tribunaux ou tiers.** Une remise à un tiers doit être une action distincte : contenu sélectionné, destinataire confirmé, autorisation et trace de transmission. Les invitations devront être limitées, révocables et contrôlées côté serveur.

## P2 — Recherche sourcée, IA et suivi du travail

Étendre le modèle existant avec `Workspace`, `CaseMembership`, `SourceCitation`, `OpenIssue` et `ReviewEvent`. Une citation référence une version immuable et son repère; un point ouvert conserve son statut, ses sources et son historique. Les permissions doivent filtrer les résultats et extraits avant toute transmission à un modèle d’IA.

L’IA documentaire est un module futur : fournisseur et modèle configurés côté serveur, finalités et budget validés, tests avec données synthétiques, citations vérifiables et gestion explicite de l’absence de source. Séparer documents, déclarations et analyses; préserver contradictions et versions. Aucun score ne doit présenter une réponse comme une preuve ou une conclusion juridique certaine.

**Temps et facturation sont deux registres distincts.** Le pilote reçoit des minutes déclarées et interdit l’auto-approbation. La suite doit conserver auteur, description, corrections, approbateur et historique. Ni frappe, ni activité d’écran, ni durée de connexion ne deviennent automatiquement du temps facturable. Une validation de temps n’autorise pas, à elle seule, une facture : mandat, tarif et décision de facturer doivent être enregistrés séparément.

## P3 — Intégrations, chacune derrière une activation explicite

| Module futur | Préconditions et preuve de fonctionnement |
|---|---|
| **Bollon — facturation** | Identifier le dépôt, son propriétaire, son contrat API et les entités facturantes. Ne pas confondre ce produit avec le nom du forfait d’hébergement. Préparer un adaptateur et des factures brouillon; tester identifiants, taxes, corrections et rapprochement. Aucun autre dépôt modifié par cette feuille de route. |
| **Crédits API et Stripe** | Définir offres, prix, unités de consommation, plafonds et remboursements. Séparer consommation réelle, solde de crédits, facture et paiement. Tester événements signés, traitement idempotent, échecs et rapprochement en environnement de test. Aucun prix inventé, achat, abonnement ou débit activé. La publication d’une demande client reste gratuite; honoraires et options restent distincts. |
| **DocuSign** | Compte et intégration approuvés, destinataires et documents sélectionnés, consentement et état des enveloppes vérifiés. Conserver original, version signée et journal du fournisseur. L’envoi d’une enveloppe ne vaut pas signature; aucune signature ni assermentation automatique. |
| **Fieldy, microphone et visioconférence** | Identifier l’API et les exports disponibles, le fournisseur de réunion et les droits des participants. Consentement explicite, permission microphone au moment utile, indication visible de l’enregistrement, arrêt et conservation définis. Référencer source audio/vidéo, session, horodatage et version de transcription; ne pas authentifier un locuteur sur le seul texte. |
| **Téléphonie, si retenue** | Choisir et autoriser le service, le numéro et les coûts avant raccordement, par exemple Twilio. Un téléphone de contact affiché n’active ni appels automatisés ni enregistrement. |

Les connexions externes exigent secrets hors Git, permissions minimales, règles de conservation et essais d’erreur/révocation. Une capture d’interface ou un test fictif ne suffit pas à annoncer une intégration active.

## Prochaine livraison mesurable

Après la préparation de la rencontre, viser un **dossier synthétique complet dans le portail réellement hébergé**, avec deux comptes isolés, un dépôt versionné, une recherche/citation, un point ouvert, un échange et une validation de temps indépendante. Consigner le SHA livré et les résultats, puis effectuer une restauration d’essai. Si TAKATAK ou l’hébergement ne sont pas prêts, annoncer précisément la dépendance restante et conserver les fonctions privées fermées; ne pas remplacer ces contrôles par une promesse de produit complet.
