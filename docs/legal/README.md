# Textes légaux de BesoinAvocat — projets du 14 novembre 2026

*Rédigés à la demande du propriétaire (14 novembre 2026, 20:57 UTC), à partir de la politique de confidentialité publiée par TAKATAK (`takatak.ca/privacy`), des décisions du dépôt (D-006, D-013, D-014, D-025, D-030, D-034 à D-037) et des exigences notées pour MIMT dans [INTEGRATION-MIMT-2026-10-30](../INTEGRATION-MIMT-2026-10-30.md). Décision : [D-037](../DECISIONS.md).*

> **Avertissement.** Ces textes ont été rédigés par un agent logiciel, pas par un avocat. Ils ne constituent pas un avis juridique. Avant toute publication sur le site ou signature avec un partenaire, ils doivent être relus et validés par un avocat membre du Barreau du Québec (droit de la protection des renseignements personnels, droit des contrats, déontologie). Les passages entre crochets `[…]` sont des renseignements que seul le propriétaire peut fournir.

| Fichier | Objet | Où il servira |
| --- | --- | --- |
| [POLITIQUE-DE-CONFIDENTIALITE.md](POLITIQUE-DE-CONFIDENTIALITE.md) | Politique de confidentialité de BesoinAvocat (site, portail, demande guidée, appels) | Page `/politique-de-confidentialite/` du site (aujourd'hui « en cours de rédaction »), lien depuis le portail et la page de demande |
| [CONDITIONS-AVOCATS.md](CONDITIONS-AVOCATS.md) | Conditions d'utilisation de l'espace avocat (essai de 14 jours, acceptation de dossiers, honoraires, appels à la minute) | Case de consentement de l'inscription `/avocat`, page publique à créer |
| [ENTENTE-LOI-25-MIMT.md](ENTENTE-LOI-25-MIMT.md) | Entente de traitement des renseignements personnels (Loi 25) entre BesoinAvocat et MIMT pour les appels | À signer avant la mise en service des appels (voir [MIMT-ACTIVATION-2026-11-07](../MIMT-ACTIVATION-2026-11-07.md), point 6) |
| [RELECTURE-CONSENTEMENT-DEMANDE.md](RELECTURE-CONSENTEMENT-DEMANDE.md) | Relecture des trois textes de consentement de la demande guidée et propositions de reformulation | Décision du propriétaire, puis nouvelle version du consentement dans `platform/lib/catalog.mjs` et `questionnaire.mjs` |

## Ce que ces textes tiennent pour acquis (à confirmer par le propriétaire)

- BesoinAvocat est exploité par une entreprise du groupe TAKATAK, au Québec; l'identité légale exacte (nom, NEQ, adresse) est à insérer.
- BesoinAvocat **n'est pas un cabinet d'avocats** et ne donne pas de conseils juridiques (D-006, D-013). Il fournit un outil de préparation de dossier et un espace de travail partagé.
- L'accès des personnes clientes est **gratuit** (D-014). Les avocats ont un essai de 14 jours sans carte, puis un abonnement (D-034); le prix n'est pas encore fixé.
- BesoinAvocat **ne perçoit aucune commission** sur les honoraires (D-025); les conditions du mandat se conviennent entre l'avocat et la personne, dans le dossier (D-035, D-036).
- Les appels passent par MIMT Connect et sont **facturés à la minute** (réponse du propriétaire du 14 novembre); le numéro public est **(855) 3-AVOCAT**.
- La durée de conservation des demandes reçues (D-030) **n'est pas encore fixée** : la politique prévoit un espace à compléter.

## Après la validation par un avocat

1. Publier la politique sur le WordPress (page existante « Politique de confidentialité », aujourd'hui « en cours de rédaction ») — propriétaire ou Mike (D-023, D-026).
2. Relier la case de consentement de `/avocat` aux conditions publiées (lien dans `platform/public/avocat.js`).
3. Signer l'entente Loi 25 avec MIMT, puis seulement activer les appels.
4. Si le propriétaire retient les reformulations du consentement, créer une nouvelle version (`CONSENT_VERSION`, `REQUEST_CONSENT_VERSION`, `QUESTIONNAIRE_CONSENT_VERSION`) : le portail refuse un consentement d'une version périmée, et les tests le vérifient.
