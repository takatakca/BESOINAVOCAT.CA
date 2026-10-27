# Contrôle du lot contact et préservation — 26 octobre 2026

**Premier fichier à lire : [REPRISE-SUIVANTE-2026-10-26.md](REPRISE-SUIVANTE-2026-10-26.md).** Fin de session : notes seulement, puis arrêt.

## État

**WordPress 0.2.1 installé avec succès via l'interface WP; funnel désactivé.** La 0.2.0 avait été contrôlée visuellement pour les prix 100/300 CAD et les articles 2186/4663/5082/5715. La 0.2.1 remet le CTA orange dans le flux normal pour supprimer sa superposition aux prix; **contrôle visuel final du bloc prix à faire**. Le Node v1 reste à `identityConfigured: false`; la v2 auth/corpus demeure refusée par MochaHost, sans contournement ni raccordement du formulaire. Le paquet refusé reste inchangé (SHA-256 `6593ad7db2028e63f22809a1d23f1334d1fb3c3f4283786730738c2e9923c71c`).

## Contrôles réalisés

- Code `5a230e52c758a626f31be24abeef2cce5242b3c1` : [Quality 40421216083](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40421216083), [Platform PR 40421216013](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40421216013), [Browser 40421215940](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40421215940) et [Platform push 40421210422](https://github.com/takatakca/BESOINAVOCAT.CA/actions/runs/40421210422) tous réussis. Trois suites PHP réussies en CI; les résultats n'attestent pas une réception réelle ou le rendu final WordPress.

- **133 tests Node réussis**, zéro échec ou test ignoré : 114 site/pilote/Passenger et 19 parcours de contact. Syntaxes des deux modules du site vérifiées. Exécution avec Node 24.19.0 et autorisation des connexions locales/fichiers temporaires synthétiques.
- **3 tests Python d’archive + 9 de sauvegarde/restauration réussis**. Le premier essai a été bloqué par les permissions du répertoire temporaire du bac à sable; reprise autorisée sans modifier les tests ni les ignorer.
- Réception seulement après transaction SQLite, consentement explicite, choix bornés, origine exacte, aucun récit ou fichier, aucune nouvelle habilitation et aucun paiement.
- Reprise avec même clé/corps après réponse perdue; changement FR/EN conserve la langue de suivi réellement transmise. Si des données sont modifiées après un résultat incertain, un avertissement indique qu’une première demande a peut-être déjà été reçue.
- Revue indépendante a détecté deux défauts corrigés : texte de consentement divergent du texte archivé, puis risque de doublon lié au changement de langue. Les19tests du parcours ont été rejoués après correction.
- Recontrôle distant : portail health200, `identityConfigured:false`; dossiers anonymes401. Aucun test réel de connexion propriétaire ou accès au corpus distant.

## WordPress et préservation

L’intégration est explicite : shortcode, assets seulement sur sa page ou modale activée par constante. La modale reste désactivée par défaut; aucun formulaire historique n’est remplacé et le destinataire des coordonnées ne peut pas être choisi dans le shortcode. Sans configuration, aucun reçu ni envoi n’est simulé.

Les trois contrôles PHP autonomes — rendu ciblé, module, intégration — **ont réussi en CI** sur le code indiqué ci-dessus. Ils vérifient notamment que le contenu original précède intégralement les ajouts et que les corrections ne suppriment pas les noms, liens et références juridiques. PHP CLI reste absent localement; aucune exécution PHP locale n'est prétendue.

Le contrôle préalable portait sur cinq articles : immigration Montréal (2186), fiscalistes (4663), régions (5009), cabinets du Québec (5082), Thetford (5715). Après installation de la 0.2.0, les corrections des articles **2186, 4663, 5082 et 5715 ont été contrôlées visuellement**. Les noms, informations de fond, liens et références sont conservés; aucune suppression globale n'est annoncée. Les dates, URL, base et archives restent intactes. Ce lot ciblé ne signifie pas que toutes les 347 pages ont été contrôlées visuellement.

## Restant avant activation

Résoudre le refus MochaHost sur le paquet exact, valider la vraie connexion et le corpus, puis configurer/réviser le circuit des demandes. La file privée de contacts n’est pas une attribution, une messagerie ni un espace professionnel. Le formulaire historique MetForm, la consultation par l’opérateur, la conservation et les notifications éventuelles restent à raccorder. Aucun formulaire public nouveau n’est activé par ce lot.

**Reprendre d'abord le contrôle visuel final du bloc prix 0.2.1**, puis les contrôles ordinateur/mobile, clavier, modale, FR/EN et erreurs avant ouverture du funnel. Les tests purs et Browser QA du site Render ne remplacent pas ces contrôles WordPress.
