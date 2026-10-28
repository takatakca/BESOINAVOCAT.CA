# Questionnaire de préparation — 28 octobre 2026

Le parcours existant `/demande` reçoit une étape de questions conditionnelles en français et en anglais. Il reste une **demande initiale de contact gratuite**, distincte des futurs services payants du dossier et de l’IA selon le volume. Leurs prix et conditions ne sont pas définis ici. Aucun mandat, compte, droit d’accès, attribution d’avocat, abonnement ou paiement n’est créé.

## Périmètre réalisé

Sept étapes pour le client lorsque la demande détaillée est ouverte : parcours, domaine/région, questions ciblées, situation, urgence/échéance, coordonnées et récapitulatif confirmé. Le parcours professionnel conserve ses quatre étapes. Les résumés de 20 à 1 500 caractères, l’Ontario, les 18 autres régions, les préférences de contact et les contrôles de dates existants sont conservés.

Le module `platform/lib/questionnaire.mjs` définit 27 questions possibles dans huit domaines; seules deux à quatre apparaissent pour un choix donné. Les questions sont des choix fermés, avec une option d’incertitude lorsque pertinente.

| Domaine | Choix conditionnels principaux |
|---|---|
| Famille | Séparation → contexte de l’union; entente existante → démarche envisagée |
| Travail | Fin d’emploi → forme de l’annonce; harcèlement → démarche interne |
| Logement | Départ/bail → avis écrit; réparations → signalement écrit |
| Civil | Dommages/créance/assurance → ordre de montant, sans conclusion de compétence |
| Criminel et pénal | Constat → démarche déjà entreprise |
| Affaires | Organisation d’entreprise → étape du projet |
| Immigration | Décision/refus → disponibilité de l’écrit |
| Autre | Catégorie à préciser, contexte et disponibilité d’un document pour plus tard |

Changer de domaine efface ses anciennes réponses. Changer une réponse parent retire les enfants devenus inapplicables. Un changement de données annule la confirmation du récapitulatif. Le serveur refuse les réponses absentes, inconnues, inactives, d’un autre domaine ou non conformes à leur type. Aucun résultat juridique, admissibilité à l’aide juridique ou délai légal n’est calculé.

## Contrat et intégration

Le serveur existant conserve `GET /api/catalog` et `POST /api/intake`. Aucun nouvel asset, route ou formulaire concurrent n’est nécessaire. Le bundle doit inclure le nouveau module `platform/lib/questionnaire.mjs`, importé par `catalog.mjs` et `intake.mjs`.

Le catalogue `2026-10-28.1` expose `intake.request.questionnaire` avec les questions, conditions, choix bilingues, provenance du produit, texte de consentement et confirmation de révision. La lecture du catalogue est bornée à 128 Kio côté page; les reçus restent bornés à 16 Kio.

Aux champs de la demande détaillée s’ajoutent :

```json
{
  "consent": true,
  "consentVersion": "2026-10-28.1",
  "questionnaire": {
    "version": "2026-10-28.1",
    "answers": {
      "topic": "repairs",
      "housingRole": "tenant",
      "repairNotice": "no"
    },
    "reviewed": true
  }
}
```

Les anciens contrats de contact `2026-10-26.1` et de demande détaillée `2026-10-27.1` restent acceptés selon leur configuration. La nouvelle version est réservée au rôle `client` et soumise au même indicateur privé `BESOINAVOCAT_INTAKE_REQUEST_ENABLED=true`. L’activation exige toujours la base de collecte privée et les origines HTTPS explicitement autorisées. Aucun de ces prérequis n’est créé ou activé par cette modification.

Les réponses canoniques et le texte exact du consentement dans la langue envoyée sont archivés dans la file privée existante. Ni journal de récit, stockage navigateur persistant, document joint, ni publication des réponses n’est ajouté. Le point public conserve `credentials: omit`, l’origine contrôlée, `X-Requested-With` et une clé d’idempotence UUID v4.

Après une réponse réseau incertaine, changer seulement la langue d’affichage conserve le corps et la clé de la tentative ainsi que la langue de suivi affichée. Modifier des données crée une nouvelle demande après nouvelle confirmation; le récapitulatif avertit que la première a peut-être été reçue. Seule une réponse HTTP 201 conforme produit un reçu.

## Provenance et limites

L’observation navigateur de JuriGo transmise par l’agent principal le 28 octobre a porté uniquement sur : choix initial de 16 domaines; sélection « Logement »; court récit; noms des parties adverses pour conflit, avec possibilité « NA »; province et tranche de revenus pour présélection d’aide juridique. Aucune donnée personnelle réelle ni demande n’a été soumise. Les autres branches n’ont pas été vérifiées.

Les questions de BesoinAvocat sont des formulations originales pour les huit domaines déjà présents au catalogue. Elles ne prétendent pas reproduire tout JuriGo. Aucun nom de tiers ni revenu n’est collecté. Le lien institutionnel d’aide juridique déjà présent est conservé; aucune admissibilité n’est annoncée. Les deux langues concernent ce parcours, pas une traduction des 348 pages migrées. Le contenu WordPress et le corpus juridique n’ont pas été modifiés par cette sous-tâche.

## Vérification locale

Le 28 octobre : `node --check platform/public/demande.js` et **51 tests ciblés réussis** :

```text
node --test platform/test/questionnaire.test.mjs platform/test/demande.test.mjs platform/test/intake.test.mjs
```

Ces tests couvrent les huit branches, les conditions accessibles, les champs interdits, la confirmation obligatoire, le consentement exact, l’effacement des enfants inactifs, l’idempotence, l’archivage privé, l’absence de création de dossier et la compatibilité antérieure. Les tests HTTP locaux ont été exécutés hors du bac à sable Windows, qui interdit les connexions à `127.0.0.1`. Deux nettoyages de tests ont été corrigés pour fermer SQLite avant de supprimer les répertoires temporaires; une recherche de fuite vérifie désormais le nom synthétique entier plutôt que le mot public « Personnel ».

Contrôle navigateur local effectué le 28 octobre via CUA : sept étapes de la branche logement jusqu’au récapitulatif en FR puis EN; choix radio et progression au clavier; apparition/retrait de l’échéance; suppression de la réponse de réparations après changement vers départ; nouvelle confirmation requise après correction depuis le récapitulatif; changement Logement → Travail avec réponses vierges. Le parcours Travail/harcèlement a aussi été contrôlé sur mobile. À 320 et 390 pixels, aucun débordement horizontal de page après correction du bandeau téléphone/langue. Aucun envoi final n’a été effectué. Les deux onglets de contrôle n’ont signalé aucune erreur de console.

Captures et relevé privés : `scripts/.build-livrables/node-portal-2026-10-28/qa-artifacts/`, dans le dossier maître parent du dépôt. Les essais du navigateur utilisent des données entièrement synthétiques. Ils ne constituent ni un audit WCAG complet, ni un contrôle physique sur téléphone. Restent avant publication : contrôle du mode fermé dans le navigateur et test de réception synthétique sur l’environnement déployé. Cette note ne constate aucun déploiement ni ouverture de la collecte.
