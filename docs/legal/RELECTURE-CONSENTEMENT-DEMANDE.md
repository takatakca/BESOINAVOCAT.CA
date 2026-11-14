# Relecture du consentement de la demande guidée — 14 novembre 2026

*Le propriétaire a demandé que cette relecture soit faite par nous (14 novembre 2026, 20:57 UTC). Elle a été faite par un agent logiciel, à partir de la Loi 25 et des décisions du dépôt. **Ce n'est pas une relecture par un avocat** : elle ne remplace pas l'avis d'un avocat en protection des renseignements personnels, que les décisions D-030 et D-034 prévoyaient avant l'activation de la demande guidée. Elle réduit toutefois les points qu'un avocat aura à corriger.*

## Les trois textes relus

Ils vivent dans `platform/lib/catalog.mjs` et `platform/lib/questionnaire.mjs`. Chacun porte une version; le portail refuse un consentement d'une version périmée et garde, avec chaque demande, le texte exact accepté.

| Version | Usage | Texte actuel (français) |
| --- | --- | --- |
| `2026-10-26.1` (`CONSENT_TEXT`) | Demande de contact simple | « Je consens à ce que BesoinAvocat conserve ces coordonnées et catégories pour traiter ma demande de contact. Je ne transmets aucun récit juridique ni document. Cet envoi ne crée ni mandat, ni abonnement, ni paiement. » |
| `2026-10-27.1` (`REQUEST_CONSENT_TEXT`) | Demande détaillée avec résumé | « Je consens à ce que BesoinAvocat conserve ces coordonnées, ces catégories et le résumé de ma situation pour traiter ma demande et me recontacter à son sujet. Je n'inclus aucun document, numéro d'identification ou renseignement de santé non nécessaire. Cet envoi ne crée ni mandat, ni relation avocat-client, ni abonnement, ni paiement. » |
| `2026-11-04.1` (`QUESTIONNAIRE_CONSENT_TEXT`) | Demande guidée (51 questions, 16 domaines) | « Je consens à ce que BesoinAvocat conserve mes coordonnées, mes réponses, le résumé de ma situation, le nom des autres parties que j'indique, mes renseignements sur l'aide juridique et mes disponibilités pour traiter ma demande, vérifier l'absence de conflit d'intérêts et me recontacter. Je n'inclus aucun document, numéro d'identification ou renseignement de santé non nécessaire. Cet envoi ne crée ni mandat, ni relation avocat-client, ni attribution d'avocat, ni abonnement, ni paiement. » |

## Ce qui est déjà bon

- **Consentement manifeste, libre, éclairé et à des fins précises** (art. 14 de la Loi) : case à cocher distincte, texte en langage clair, finalités nommées (traiter la demande, recontacter, vérifier les conflits d'intérêts), renseignements énumérés.
- **Pas de surprise** : le texte dit ce que la personne ne doit pas envoyer (documents, numéros d'identification, santé), ce qui applique le principe de nécessité (art. 5).
- **Pas de fausse promesse** : « ni mandat, ni relation avocat-client, ni attribution d'avocat » respecte D-006 et D-013 (aucune mise en relation non encadrée, aucune liste d'avocats inventée).
- **Traçabilité** : la version et le texte exact sont conservés avec la demande; un changement de finalité exige une nouvelle version. C'est exactement ce que la Loi attend pour prouver le consentement.
- **Version anglaise** fidèle à la française.

## Ce qui manque ou mérite d'être précisé

1. **Qui conserve** : l'article 8 exige d'indiquer, au moment de la collecte, le nom du responsable (l'entreprise) — « BesoinAvocat » est un nom commercial. Il suffit que la page de demande affiche, à côté de la case, le nom légal et le lien vers la politique de confidentialité. Le texte du consentement peut rester court.
2. **Durée** : rien ne dit combien de temps la demande est gardée. La Loi n'exige pas que la durée soit dans la phrase de consentement, mais la personne doit pouvoir la connaître (politique de confidentialité, section 10). La durée reste à fixer par le propriétaire (D-030).
3. **Qui voit la demande** : « BesoinAvocat conserve » ne dit pas que des personnes de l'équipe la lisent, ni qu'elle peut être transmise à un avocat **seulement si la personne poursuit** (crée son tableau de bord et déclare son dossier prêt). Depuis D-036, c'est le parcours réel : il faut le dire.
4. **Hors Québec** : si l'hébergeur ou le fournisseur de courriel traite les données hors Québec, l'article 8 demande de le mentionner au moment de la collecte. Un renvoi à la politique suffit, à condition qu'elle le dise (section 6 du projet).
5. **Droits** : la personne doit savoir qu'elle peut accéder à sa demande, la rectifier et retirer son consentement (art. 8, al. 2). Un renvoi suffit.
6. **« Catégories »** (textes 1 et 2) : terme technique peu clair pour le public. Dire « le domaine de droit et la région que j'ai choisis ».
7. **« Récit juridique »** (texte 1) : expression inhabituelle; « je ne décris pas ma situation » est plus clair.
8. **Autres parties** (texte 3) : nommer un tiers sans son consentement est permis pour la vérification des conflits, mais le texte devrait préciser que ce nom **ne sert qu'à cela** et n'est pas communiqué à l'autre partie.
9. **Aide juridique** : renseignement sur la situation financière. Dire qu'il sert seulement à orienter la demande.

## Propositions de reformulation (à faire valider par un avocat)

Si le propriétaire les retient, elles deviennent de **nouvelles versions** (`2026-11-14.1`) et les tests du portail sont à mettre à jour; la page `/demande` affiche en plus le nom légal et le lien vers la politique.

**Contact simple (remplace `2026-10-26.1`)**
> Je consens à ce que BesoinAvocat conserve mes coordonnées, le domaine de droit et la région que j'ai choisis, pour traiter ma demande de contact et me recontacter. Je ne décris pas ma situation et je n'envoie aucun document. Cet envoi ne crée ni mandat, ni relation avocat-client, ni abonnement, ni paiement. Je peux consulter, corriger ou faire supprimer ma demande, comme l'explique la politique de confidentialité.

**Demande détaillée (remplace `2026-10-27.1`)**
> Je consens à ce que BesoinAvocat conserve mes coordonnées, le domaine de droit et la région que j'ai choisis et le résumé de ma situation, pour traiter ma demande et me recontacter à son sujet. Seules les personnes de l'équipe de BesoinAvocat chargées des demandes y ont accès; aucun avocat ne la voit tant que je n'ai pas créé mon tableau de bord et déclaré mon dossier prêt. Je n'inclus aucun document, numéro d'identification ou renseignement de santé non nécessaire. Cet envoi ne crée ni mandat, ni relation avocat-client, ni abonnement, ni paiement. Je peux consulter, corriger ou faire supprimer ma demande, comme l'explique la politique de confidentialité.

**Demande guidée (remplace `2026-11-04.1`)**
> Je consens à ce que BesoinAvocat conserve mes coordonnées, mes réponses, le résumé de ma situation, mes renseignements sur l'aide juridique et mes disponibilités, pour traiter ma demande, l'orienter vers le bon domaine et me recontacter. Le nom des autres parties que j'indique sert seulement à vérifier l'absence de conflit d'intérêts et n'est pas communiqué à ces personnes. Seules les personnes de l'équipe de BesoinAvocat chargées des demandes y ont accès; aucun avocat ne voit ma demande tant que je n'ai pas créé mon tableau de bord et déclaré mon dossier prêt. Je n'inclus aucun document, numéro d'identification ou renseignement de santé non nécessaire. Cet envoi ne crée ni mandat, ni relation avocat-client, ni attribution d'avocat, ni abonnement, ni paiement. Je peux consulter, corriger ou faire supprimer ma demande, comme l'explique la politique de confidentialité.

Versions anglaises à produire à l'identique au moment de la mise en œuvre.

## Ce que cette relecture ne couvre pas

- La conformité déontologique de la collecte du point de vue des avocats qui recevront les dossiers (publicité, sollicitation, conflits) : à voir avec un avocat.
- Le texte de l'avis lu au début d'un appel enregistré (D-030 le prévoyait aussi pour relecture) : à écrire avec MIMT une fois l'entente signée.
- Les textes de consentement de l'inscription client (« Créer mon tableau de bord ») et avocat (`/avocat`), qui renvoient aux conditions et à la politique une fois publiées (voir [CONDITIONS-AVOCATS](CONDITIONS-AVOCATS.md), texte court en fin de document).
