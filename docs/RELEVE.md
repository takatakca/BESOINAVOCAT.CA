# Relève développement — BESOINAVOCAT.CA

## Référence de travail
Dépôt \`takatakca/BESOINAVOCAT.CA\`, branche \`main\`. Le 14 octobre 2026, il ne contenait que le README initial. La première livraison a été bâtie sans créer de profils fictifs ni traiter de dossiers confidentiels.

## Livré
- Site statique réactif, français canadien, huit domaines juridiques.
- Guide d'orientation local, régionalisation, niveaux d'urgence, accès à trois ressources officielles.
- Mentions légales cohérentes avec une version sans collecte de données.
- Tests Node 22 et workflows de validation et publication Pages.

## À vérifier après la publication
1. Statut Actions et tests, URL Pages et absence d'erreurs console.
2. Navigation clavier, lecteur d'écran, mobile et viewport 320 px.
3. Liens officiels, présence des pages de confidentialité et des conditions.
4. Domaine \`besoinavocat.ca\` : propriété, DNS, SSL, hébergement définitif et identité de l'exploitant.
5. Avis juridique externe avant lancement commercial.

## Produit futur — backlog conditionnel, pas de faux accomplissement
- **P0 métier** : documenter le périmètre (orientation uniquement, annuaire, référencement, mise en relation, ou consultation), les responsabilités légales, le modèle économique et l'identité de l'exploitant.
- **P0 protection des données** : désigner une personne responsable, définir les finalités, consentements, notices, rétention/suppression, hébergement, droits d'accès, sécurité et incidents, avec analyse appropriée pour le Québec.
- **P1 annuaire** : onboarding professionnel opt-in, validation manuelle du statut Barreau, date de vérification, expiration, consentement de publication, désactivation et mécanisme de signalement.
- **P1 accès** : rôles et permissions, authentification, isolation stricte entre professionnels, piste d'audit, limites d'accès.
- **P2 demandes** : formulaires de contact sécurisés et minimisés, chiffrement, anti-spam, consentement explicite, respect de la confidentialité avocat-client, revue juridique et tests de sécurité.
- **P2 TAKATAK** : prévoir TAKATAK Auth et services partagés seulement après accord sur les habilitations de ce produit, sans exposer les données d'autres verticales.
- **P3 exploitation** : observabilité respectueuse de la vie privée, sauvegardes, reprise après incident, contrôles de disponibilité, notifications et intégrations.

## Contraintes
Ne jamais aspirer les coordonnées du Barreau pour solliciter des avocats : les conditions de l'annuaire limitent cette utilisation. Ne pas affirmer qu'un professionnel est vérifié sans preuve. Ne jamais publier un formulaire sensible sans politique complète et infrastructure sécurisée.

## Comment poursuivre
Lire ce document et le README, inspecter l'état de main, les Actions et le déploiement avant toute nouvelle écriture. Préserver le code opérationnel; avancer par changements traçables, avec tests. Ne pas annoncer de mise en production sans vérifier son URL et son état réel.
