# Recherche sourcée et dictée du portail

La recherche du portail doit retrouver des pièces réellement présentes dans les dossiers auxquels l'utilisateur a accès. Une correspondance de texte n'est ni une conclusion juridique ni une preuve que le dossier est exhaustif. Les extraits OCR et déclarations gardent leur provenance et leur état de contrôle.

## Recherche

Le nouvel accès `GET /api/search` recherche dans les dossiers autorisés ou dans un dossier choisi, avec pagination explicite. Le mode mots-clés tolère les accents et retire les mots de commande courants; le mode expression exacte permet une recherche plus stricte. Il ne s'agit pas d'un moteur sémantique ou d'un modèle de langage. L'ancien endpoint par dossier reste disponible pour compatibilité.

Chaque résultat indique le dossier, le document et l'extrait disponible. Une correspondance dans une page renvoie son numéro ou son unité, la méthode d'extraction et un accès au lecteur. Une correspondance dans les métadonnées seule n'est pas transformée en fausse citation de page. L'ouverture et le téléchargement doivent repasser par les contrôles de session et de dossier.

Une recherche sans résultat ne prouve pas l'absence du fait ou du document : pages sans texte, mots différents, éléments hors corpus et documents manquants restent possibles. Les documents présents et les besoins de vérification doivent demeurer visibles dans le registre, indépendamment des résultats de recherche.

## Dictée

`public/dictation.js` encapsule la reconnaissance vocale fournie par le navigateur. Elle ne démarre que sur un clic explicite, avec la langue choisie. Le portail ne crée pas d'enregistrement audio et n'envoie pas lui-même d'audio à une API. Certains navigateurs transmettent toutefois l'audio à leur service de reconnaissance : l'interface le signale avant le démarrage. La disponibilité varie selon le navigateur. [Documentation SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

Le résultat final remplit la requête. Si l'option « Rechercher à la fin de la dictée » est sélectionnée, le portail lance cette requête textuelle; sinon l'utilisateur peut la corriger avant envoi. Aucun résultat partiel n'est soumis. La saisie clavier reste disponible en cas de refus de permission, d'absence de microphone, d'erreur du fournisseur ou de navigateur incompatible.

Le contrôleur limite l'écoute à 45 secondes et la requête à 200 caractères, sans troncature silencieuse. Il interrompt la dictée au changement de contexte et à la déconnexion, ignore les anciens événements et ne livre qu'une fois le résultat final. Un échec du microphone ne doit jamais déclencher une recherche avec un texte partiel ou inventé.

La politique HTTP autorise le microphone du même site seulement sur le document du portail (`/` et `/index.html`); la caméra reste interdite. Les pages de demande publique et les autres routes conservent l'interdiction du microphone. Cela autorise la demande de permission du navigateur, sans l'accorder automatiquement. [Directive HTTP microphone](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/microphone).

## Ce qui reste distinct de l'IA

`/api/capabilities` conserve `ai:false`. Aucun modèle génératif ni fournisseur de transcription payant n'est raccordé par cette fonction. La dictée du navigateur et la recherche dans les sources sont des fonctions réelles distinctes d'une réponse IA. Un futur assistant devra citer des sources autorisées, indiquer ses limites, respecter le périmètre du dossier et utiliser une configuration serveur explicite; aucun prix ou jeton n'est inventé ici.

Les tests simulés du contrôleur couvrent les erreurs de permission, les réponses tardives, la limite de longueur, la durée maximale, l'arrêt et l'absence de capture automatique. Ils ne constituent pas un essai physique du microphone de l'utilisateur. La réception finale exige un test avec sa voix dans le navigateur HTTPS réellement utilisé, puis une vérification des pièces retournées.
