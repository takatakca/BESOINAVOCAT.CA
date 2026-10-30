# Vision premium — BesoinAvocat, 29 octobre 2026

Cette note conserve les orientations exprimées par le propriétaire dans le chat. Elle constitue une feuille de route, pas une annonce de fonctions déployées, de contrats fournisseurs conclus ou de conformité juridique vérifiée. **La priorité immédiate reste la connexion effective du propriétaire et la consultation de ses trois dossiers.** Les développements ci-dessous viennent après cette réception.

La vitrine fidèle déjà construite est préservée selon D-026. Cette feuille de route n’autorise aucune nouvelle refonte visuelle, bascule DNS, activation payante, création d’automatisation, appel ou message à un tiers.

## Résultat recherché

Un espace BesoinAvocat réunissant le client, son avocat et les intervenants autorisés autour d’un dossier : documents, messages, rendez-vous, appels, étapes de travail, temps et facturation. L’identité TAKATAK demeure commune à l’écosystème; les habilitations, données et opérations de BesoinAvocat restent isolées. Les modules existants doivent être réutilisés après inspection de leur code et de leur contrat d’intégration, sans supposer qu’une fonction présente dans un autre dépôt est déjà raccordée ici.

Direction demandée : un tableau de bord client de base avec options et crédits, un tableau professionnel premium, des actions d’appel/vidéo/chat accessibles au même endroit et des panneaux de travail lisibles. Pour le module téléphonique, le propriétaire souhaite MIMT comme passage obligatoire, y compris l’inscription des avocats et le portage éventuel de leurs numéros. Cette orientation produit reste soumise à la faisabilité et au contrat du fournisseur; elle n’annonce aucune souscription.

Pour les sources juridiques, l’ambition est multijuridictionnelle et inclut les droits autochtones. La cadence visée est hebdomadaire, avec dates de collecte et changements traçables. Aucun collecteur, abonnement documentaire ou tâche récurrente n’est activé par cette note; les sources et leur couverture réelle doivent être validées avant de présenter des résultats.

## Modules demandés et état exact

| Module | Parcours souhaité | État et vérifications nécessaires |
|---|---|---|
| Téléphonie MIMT.ca | Appeler dans la plateforme, retrouver une personne par `@username`, orienter un appel vers un groupe d’avocats disponibles | Orientation du propriétaire. Identité exacte du service, documentation API, authentification, disponibilité, événements d’appel et contrat à vérifier avant développement du connecteur |
| Distribution des appels | Groupe de sonnerie ou recherche successive d’avocats disponibles, acceptation de l’appel par un avocat | Fonction à concevoir avec MIMT. Ne pas déduire disponibilité ou consentement du seul statut connecté; prévoir refus, absence de réponse, hors horaires et retour au client |
| Numéros et portage | Relier ou porter un numéro existant à la solution téléphonique | Possibilité, propriété du numéro, admissibilité, procédure, durée, coûts et risques d’interruption à confirmer auprès du fournisseur; aucune demande de portage engagée |
| Minutes et crédits | Compteurs d’usage et crédits pour les comptes clients et professionnels | Tarification non définie. Durées attestées par les événements du fournisseur, règles d’arrondi, appels échoués, remboursements et rapprochement à spécifier avant tout débit |
| FastFax via MIMT | Réception et envoi de fax, rapprochement avec les courriels et classement dans le bon dossier | Nom exact du produit, API, formats, limites, accusés de transmission, stockage, routage et contrat à vérifier. Aucun fax ou courriel envoyé par cette note |
| Workspace | Déposer et consulter des documents, discuter, faire une visioconférence, suivre les étapes et les minutes | Réutiliser les modules existants après contrôle. Définir rôles, autorisations par dossier, versionnement, notifications et critères d’achèvement; distinguer temps manuel et temps attesté |
| Assistance à distance | Permettre un accompagnement sur l’écran ou les fichiers choisis par le client | Session volontaire, consentement explicite et révocable, périmètre visible, arrêt immédiat. Aucun accès automatique aux disques, aucune connexion permanente implicite |
| Recherche juridique assistée | Chercher des références avec une réponse sourcée et adaptée à la juridiction | Sources autorisées et conditions d’accès à vérifier; dates d’entrée en vigueur, versions, juridiction et citations à montrer. Aucune garantie de couvrir toutes les lois ni de remplacer le jugement professionnel |
| Mobile | Dépôt de fichiers, photos, suivi du dossier, messages et fonctions fax | Première cible : parcours web mobile accessible. Vérifier tailles, reprise des téléversements, lisibilité, permissions du téléphone et accusé de réception; application native à décider ultérieurement |
| Facturation Bolon | Réutiliser le système de facturation existant avec factures, paiements, crédits et suivi | Identifier le dépôt et son API, inspecter les notes et les fonctions existantes, définir les contrats d’intégration. Aucun paiement ni prix nouveau activé |

## Ordre de réalisation

1. **Accès et dossiers.** Terminer la réception de la connexion, des trois catégories, de la recherche avec références, d’un téléchargement et de la déconnexion. Le corpus, les grants, la clé de session, les originaux et les 312 annexes restent préservés. Voir [COOLIFY](COOLIFY.md) et [BROWSER_AUTH](BROWSER_AUTH.md).
2. **Inventaire des solutions réutilisables.** Lire les dépôts TAKATAK et Facturation Bolon ainsi que les notes existantes. Documenter les fonctions réellement disponibles, leurs dépendances, leur licence et leur état de déploiement. Obtenir la documentation officielle de MIMT/FastFax et leurs conditions avant de promettre une capacité.
3. **Workspace de base.** Relier documents, recherche, chat, étapes et suivi du temps dans le dossier autorisé. Chaque ajout garde son auteur, sa provenance, son horodatage et ses versions. Tester l’isolation entre clients et dossiers.
4. **Téléphonie et fax en essai.** Construire les connecteurs selon les contrats vérifiés, avec événements signés, accusés de réception, idempotence et reprises maîtrisées. Tester d’abord avec des données et comptes d’essai, puis avec une autorisation précise pour les appels ou envois réels.
5. **Crédits et facturation.** Arrêter les prix, frais, règles de consommation et conditions de remboursement. Raccorder les événements d’usage validés au registre de facturation Bolon; rapprocher les montants avant activation des paiements.
6. **Recherche juridique et mobile.** Étendre les sources et les parcours mobiles selon des critères vérifiables. Mesurer la qualité des références, signaler les limites de couverture et vérifier la mise à jour des sources.
7. **Assistance à distance.** Choisir une solution après étude des consentements, du périmètre d’accès et de la traçabilité. Tester la révocation et la fermeture de session avant tout usage sur les fichiers réels d’un client.

## Contrats d’intégration à préparer

- **Identité et accès :** TAKATAK authentifie; BesoinAvocat détermine les droits par organisation et dossier. Un compte valide ou un paiement ne confère pas automatiquement accès aux pièces d’un autre client.
- **Communication :** identifier l’émetteur, le destinataire, le dossier, l’autorisation et l’état réel de l’appel ou de l’envoi. Définir consentements, conservation et effacement applicables avant enregistrement ou transcription.
- **Usage :** conserver les références d’événements fournisseur et éviter de comptabiliser deux fois une notification répétée. Rapprocher estimation, durée attestée, crédit réservé, consommation finale et éventuelle annulation.
- **Facturation :** séparer abonnement de plateforme, options, crédits, télécommunications et honoraires de l’avocat. Les pourcentages, dépôts, commissions, tarifs d’usage et frais d’intégration restent à définir et à faire valider selon le cadre applicable.
- **Documents :** conserver original, provenance, cote, version et empreinte; distinguer déclaration, analyse et extraction OCR. Les doublons et versions de factures ne sont pas des montants supplémentaires.
- **Sources juridiques :** pour chaque résultat, indiquer la juridiction, le lien source, la version ou date consultée et les limites connues. Une réponse non étayée doit être signalée; ne pas inventer de texte, de citation ou de jurisprudence.

## Points à décider ou à vérifier

| Point ouvert | Résultat attendu avant activation |
|---|---|
| MIMT.ca et FastFax | Documentation officielle, interlocuteur/contrat fournisseur, accès d’essai et matrice des fonctions supportées |
| Portage des numéros | Éligibilité, procédure approuvée par le titulaire, calendrier et possibilité de retour arrière |
| Appels et enregistrements | Règles de consentement, information des participants, conservation, accès et suppression |
| Frais clients et professionnels | Barème des minutes/crédits/options, devis, conditions et validation des taxes; pas de montant inventé |
| Facturation Bolon | Dépôt/API identifiés, schéma des événements, règles de rapprochement et séparation des comptes |
| Base juridique IA | Sources autorisées, couverture par juridiction, mises à jour et protocole de vérification des citations |
| Exigences professionnelles | Références officielles à vérifier avec les professionnels concernés; ne pas inventer une obligation d’utiliser un logiciel imposé par le Barreau |
| Assistance à distance | Consentement explicite, périmètre choisi, arrêt/révocation testés et journal des sessions |

## Limites de cette livraison

Cette livraison ajoute une mémoire de produit. Elle ne crée ni intégration active, abonnement, achat de crédits, numéro, portage, paiement, fax, appel, campagne ou accès distant. Les critères de mise en service sont décrits ici pour guider les prochains lots; leur présence dans un document ne signifie pas qu’ils sont satisfaits.

Références internes : [communications et facturation](COMMUNICATIONS.md), [connecteurs existants](INTEGRATIONS.md), [architecture du portail](PLATFORM_ARCHITECTURE.md), [file de travail](TASK_QUEUE.md), [reprise des agents](AGENT_HANDOFF.md).
