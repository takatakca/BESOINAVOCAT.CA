# État des intégrations BesoinAvocat — 18 novembre 2026

Vérifié en direct sur `portail.besoinavocat.ca` (adresse `/api/integrations` et `/api/health`) le 18 novembre 2026 vers 08:15 UTC, depuis le navigateur du propriétaire.

## 1. Ce qui a changé depuis le 13 novembre

- La clé de chiffrement du serveur existe maintenant : le moteur d'intégrations répond « prêt ».
- Les clés Google Agenda, Zoom, Clio, DocuSign, QuickBooks et même Microsoft 365 sont posées dans le serveur.
- Stripe et Twilio sont actifs côté serveur.
- L'espace avocat (`/avocat`, essai de 14 jours) et l'inscription libre des clients sont en ligne.

## 2. État par intégration

| Intégration | État en ligne | Ce qui manque | Qui agit |
|---|---|---|---|
| **Zoom** | Prêt à connecter. Webhook configuré. | Un premier essai réel : un avocat clique « Connecter » puis crée une réunion. Ensuite publier l'app Zoom (revue Zoom) pour que n'importe quel compte puisse la relier. | Propriétaire (essai), Claude (dossier de publication) |
| **Google Agenda** | Prêt à connecter. | Premier essai réel. Tant que l'écran de consentement Google est en mode « Test », seuls les comptes ajoutés comme testeurs peuvent se connecter. Publier l'app (revue Google) avant l'ouverture au public. | Propriétaire (essai), Claude (ajout des testeurs, demande de publication) |
| **Outlook / Microsoft 365** | Prêt à connecter (clés posées). | Premier essai réel avec un compte Microsoft d'avocat. | Propriétaire |
| **DocuSign** | Prêt à connecter. | **Le retour automatique du document signé n'est pas branché** (clé « Connect HMAC » absente). Sans elle, l'envoi pour signature fonctionne mais la version signée ne revient pas seule au dossier. Le compte est en environnement d'essai DocuSign : il faudra la revue « Go-Live » de DocuSign avant des signatures à valeur réelle. | Colombo (clé HMAC dans Coolify), Claude (configuration Connect côté DocuSign) |
| **Clio Manage** | Prêt à connecter. | Premier essai réel avec un compte Clio d'avocat. | Propriétaire |
| **QuickBooks** | Prêt à connecter (connexion seulement). | L'envoi des clients et des factures n'est pas encore programmé. Compte Intuit en mode « sandbox » : passer en production après la revue Intuit. | Claude (code), propriétaire (revue Intuit) |
| **Stripe** | Actif côté serveur, webhook configuré. | Gratuit pour l'instant (décision du 13 novembre). Les forfaits payants restent à créer le jour venu, sur le compte ALKAO.CA. | Plus tard |
| **Twilio (SMS)** | Actif côté serveur. | Réception d'état seulement; aucun SMS envoyé. Rien à faire. | — |
| **CanLII** | **Non configuré.** | La clé d'API CanLII n'a jamais été demandée. Le courriel est prêt dans `integrations/courriel-canlii-demande-cle-api.md` (il manque nom, titre, téléphone). | Propriétaire |
| **Notarius ConsignO Cloud** | Prévu, non construit. | Entente de partenariat avec Notarius (seule signature reconnue par le Barreau). | Propriétaire (premier contact) |
| **MIMT (appels)** | Non vérifiable sans session ouverte. Au dernier relevé : non configuré. | `PARTNERS=on` sur api.mimt.ca, partenaire `besoinavocat`, clé API et secret du webhook dans Coolify, entente Loi 25. | Colombo |

**Aucune intégration n'est encore « fonctionnelle à 100 % »,** parce qu'aucune n'a été essayée avec un vrai compte. Le serveur est prêt pour Zoom, Google, Outlook, DocuSign (sans retour automatique), Clio et QuickBooks (connexion seulement). Le test qui le prouve prend deux minutes par fournisseur : ouvrir **Intégrations** dans le portail, cliquer **Connecter**, accepter chez le fournisseur, puis vérifier que la carte affiche « Service connecté ».

## 3. Tribunaux et systèmes juridiques du Québec : ce qui existe vraiment

| Système | À quoi il sert | API pour un logiciel comme BesoinAvocat? | Ce qu'on peut faire |
|---|---|---|---|
| **Lexius** (Services judiciaires numériques, ministère de la Justice) | Dépôt en ligne à la Cour du Québec et à la Cour supérieure. Obligatoire pour le non contentieux depuis juin 2024 et pour les actions collectives depuis le 1er décembre 2025. | **Non.** Plateforme web seulement. L'avocat se connecte avec son identifiant du portail du Barreau et la double vérification. Aucune API ni programme pour fournisseurs n'est publié. Le programme est en retard (livraisons prévues jusqu'en 2029). | Préparer dans BesoinAvocat un **paquet prêt à déposer** (actes et pièces numérotés selon les directives Lexius, PDF conformes) avec un bouton qui ouvre Lexius. Demander au ministère un accès partenaire (voir §4). |
| **Greffe numérique judiciaire du Québec (GNJQ)** | Dépôt numérique de secours et échanges avec les greffes. | **Non.** Web seulement. | Même approche : paquet prêt à déposer + lien. |
| **Greffe numérique de la Cour d'appel (GNCA)** | Dépôt des actes en appel. | **Non.** Web seulement, conditions d'utilisation propres à la Cour d'appel. | Même approche. |
| **SOQUIJ** (plumitifs, jurisprudence) | Consultation des plumitifs (dossiers de cour) et de la jurisprudence québécoise. | **Pas d'API publique.** Portail payant (15 $ par mois par accès + frais par consultation). Les licences de données se négocient directement. | Demander à SOQUIJ une licence de données ou un accès entreprise. En attendant : lien vers le plumitif depuis le dossier. |
| **CanLII** | Jurisprudence et lois gratuites, tout le Canada. | **Oui**, clé sur demande. Déjà programmé dans le portail. | Envoyer le courriel de demande de clé (prêt). |
| **Barreau du Québec** | Tableau de l'Ordre (vérifier qu'un avocat est membre en règle). | **Pas d'API publique.** | Demander au Barreau un accès pour vérifier automatiquement les avocats qui s'inscrivent. Sinon, vérification manuelle à l'inscription. |
| **Notarius** | Signature numérique professionnelle reconnue. | **Oui**, par entente de partenariat. | Prendre contact (voir §4). |

## 4. Demandes à envoyer (je rédige les courriels sur demande)

1. **CanLII** : clé d'API. Courriel déjà rédigé; il manque nom, titre et téléphone du propriétaire.
2. **Ministère de la Justice, programme Lexius** : demande d'accès partenaire ou d'interface pour fournisseurs de logiciels juridiques. Réponse probable : pas avant les prochaines livraisons, mais la demande nous place sur la liste.
3. **SOQUIJ** : licence de données (plumitifs et jurisprudence) pour une plateforme.
4. **Barreau du Québec** : vérification automatique du statut de membre des avocats inscrits.
5. **Notarius** : entente de partenariat ConsignO Cloud.

## Sources

- Guide Lexius du Barreau : https://www.barreau.qc.ca/media/bkgfu4lr/guide-lexius-depot-matiere-civile.pdf
- Programme Lexius, Barreau : https://www.barreau.qc.ca/en/membres-ordre/ressources/transformation-justice-programme-lexius/
- Retard du virage numérique : https://droit-inc.com/conseils-carriere/nouvelles/le-virage-numerique-du-systeme-de-justice-retarde-a-2029
- Mémoire du Barreau sur le règlement (mars 2024) : https://www.barreau.qc.ca/media/jsgcwitu/memoire-projet-reglement-transformation-numerique-administration-justice.pdf
- Conditions du greffe de la Cour d'appel : https://greffenumerique.courdappelduquebec.ca/fr/Public/Information/ConditionsUtilisation
- Catalogue SOQUIJ : https://catalogue.soquij.qc.ca/catalogue/PORTAIL/
