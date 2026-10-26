# Contrôle du lot contact et préservation — 26 octobre 2026

## État

Préparation locale de WordPress **0.2.0**, catalogue et réception de demandes de contact Node. La version WordPress active reste **0.1.2**. Le Node v2 auth/corpus demeure refusé par MochaHost : aucun déploiement ou raccordement des formulaires n’est annoncé. Le paquet refusé est inchangé (SHA-256 `6593ad7db2028e63f22809a1d23f1334d1fb3c3f4283786730738c2e9923c71c`).

## Contrôles réalisés

- **133 tests Node réussis**, zéro échec ou test ignoré : 114 site/pilote/Passenger et 19 parcours de contact. Syntaxes des deux modules du site vérifiées. Exécution avec Node 24.19.0 et autorisation des connexions locales/fichiers temporaires synthétiques.
- **3 tests Python d’archive + 9 de sauvegarde/restauration réussis**. Le premier essai a été bloqué par les permissions du répertoire temporaire du bac à sable; reprise autorisée sans modifier les tests ni les ignorer.
- Réception seulement après transaction SQLite, consentement explicite, choix bornés, origine exacte, aucun récit ou fichier, aucune nouvelle habilitation et aucun paiement.
- Reprise avec même clé/corps après réponse perdue; changement FR/EN conserve la langue de suivi réellement transmise. Si des données sont modifiées après un résultat incertain, un avertissement indique qu’une première demande a peut-être déjà été reçue.
- Revue indépendante a détecté deux défauts corrigés : texte de consentement divergent du texte archivé, puis risque de doublon lié au changement de langue. Les19tests du parcours ont été rejoués après correction.
- Recontrôle distant : portail health200, `identityConfigured:false`; dossiers anonymes401. Aucun test réel de connexion propriétaire ou accès au corpus distant.

## WordPress et préservation

L’intégration est explicite : shortcode, assets seulement sur sa page ou modale activée par constante. La modale reste désactivée par défaut; aucun formulaire historique n’est remplacé et le destinataire des coordonnées ne peut pas être choisi dans le shortcode. Sans configuration, aucun reçu ni envoi n’est simulé.

Le PHP possède trois contrôles autonomes : rendu ciblé, module, intégration. Ils vérifient notamment que le contenu original précède intégralement les ajouts et que les corrections de phrases ne suppriment pas les noms, liens et références juridiques. **PHP CLI absent localement : leur résultat doit être lu dans la CI du nouveau commit avant publication.**

Contrôle de lecture du site existant effectué sur cinq articles : immigration Montréal (2186), fiscalistes (4663), régions (5009), cabinets du Québec (5082), Thetford(5715). Des titres/classements et phrases promotionnelles précis subsistent. La0.2.0 prépare leur neutralisation au rendu; aucun paragraphe informatif complet ou nom de cabinet n’est supprimé. Les dates, URL, base et archives restent intactes. Ce lot ciblé ne signifie pas que toutes les 347 pages ont été contrôlées visuellement.

## Restant avant activation

Résoudre le refus MochaHost sur le paquet exact, valider la vraie connexion et le corpus, puis configurer/réviser le circuit des demandes. La file privée de contacts n’est pas une attribution, une messagerie ni un espace professionnel. Le formulaire historique MetForm, la consultation par l’opérateur, la conservation et les notifications éventuelles restent à raccorder. Aucun formulaire public nouveau n’est activé par ce lot.

Vérifier ensuite le vrai WordPress sur ordinateur/mobile, le clavier, la modale, FR/EN, les tarifs et les erreurs; les tests purs du module ne remplacent pas ce contrôle visuel. Les contrôles Browser QA du site Render ne couvrent pas WordPress.
