# Réception du portail — 30 octobre 2026

Signé : Codex (desktop, session 01a157a4). Cette note réconcilie les notes GitHub, les notes Drive et les contrôles du portail. Elle distingue le code déployé de la réception utilisateur encore ouverte.

**Mise à jour de reprise du 30 octobre :** le refus de livraison est confirmé dans Maileroo : le destinataire n’est pas autorisé sur le domaine de test et la liste a atteint son maximum. Le domaine propre reste inactif, avec vérification DNS SPF/DKIM incomplète; le quota d’envoi n’est pas consommé. [Diagnostic et résolution à terminer](DIAGNOSTIC-ENVOI-2026-10-30.md). Le dernier `main` contrôlé à 09:29 UTC reste `2c41af9`; les cinq correctifs de fiabilité ont ensuite été commités localement dans `7a920ee195d7a492a4a95d7dacbd8b6d3e5732ca`. Leur push et leur déploiement ne sont pas encore confirmés. La réception du code et l’accès authentifié aux trois dossiers restent non confirmés.

## Code et déploiement

- Base vérifiée : `main` `2c41af9fbe413705b2ce8935d6b3c7b63f81e90c`, après les PR 7 (espace de travail D-029) et 8 (journal).
- Coolify, lu le 30 octobre vers 04:36 UTC : déploiement `w0vtdti0dfz83yem8gn3byoa`, état **Success**, daté du 30 octobre à 03:53:56 UTC, durée affichée **3 min 44 s**, source `main` au SHA ci-dessus.
- Domaine du portail : <https://portail.besoinavocat.ca/>. L'adresse d'essai sslip.io reste une adresse distincte; la présente réception HTTP porte sur le domaine du portail.
- Aucun DNS, WordPress, droit utilisateur ou secret modifié par ces contrôles. Les originaux et la remise de 312 annexes ne sont pas modifiés.

## Contrôle HTTP — 04:35:04 UTC

Les requêtes HTTPS ont réussi avec la validation TLS normale du client, sans désactivation de contrôle de certificat. Le blocage historique du certificat auto-signé n'est donc plus reproduit sur ce contrôle.

| Contrôle | Résultat |
|---|---|
| `/` | HTTPS accessible; interface de connexion disponible dans le navigateur |
| `/api/health` | 200; `status:ok`, `mode:pilot`, `loginConfigured:true`, `emailCodeConfigured:true`, `intakeConfigured:true`, `identityConfigured:false` |
| `/workspace.js` | 200; empreinte identique au fichier Git de `2c41af9` |
| `/app.js` | 200; empreinte identique au fichier Git de `2c41af9` |
| `/styles.css` | 200; empreinte identique au fichier Git de `2c41af9` |
| `/api/cases`, sans session | 401 |
| `/data/grants.json` | 404 |
| `/data/session.key` | 404 |
| `/data/corpus-2026-10-28-v2/platform.sqlite` | 404 |

SHA-256 de `workspace.js` contrôlé : `c8b968ff0f093d3851378c52c53892656ce9a3489288510edbbef9013b92ac90`.

La correspondance des trois fichiers publics et le SHA affiché par Coolify corroborent le déploiement. Ce contrôle ne compare pas chaque fichier privé du conteneur. `identityConfigured:false` concerne le chemin distinct d'identité par introspection; ce champ ne contredit pas la configuration de connexion navigateur. `intakeConfigured:true` n'est pas une preuve de réception et d'attribution d'une demande réelle.

## Réception utilisateur encore ouverte

L’interface propose la connexion par code. Trois messages destinés au propriétaire sont marqués « Suppressed » dans Maileroo; l’événement consulté refuse le destinataire hors liste autorisée du domaine de test. L’ajout ciblé du propriétaire a été refusé car la liste est au maximum. Aucun destinataire existant n’a été supprimé, aucun nouvel envoi OTP n’a été déclenché et le secret SMTP n’a pas été modifié. Le [diagnostic d’envoi](DIAGNOSTIC-ENVOI-2026-10-30.md) distingue ce blocage du domaine et du certificat du portail, qui fonctionnent. **Aucune livraison réelle du code, session réelle ou consultation authentifiée n’a été vérifiée.** La santé du serveur et un accusé générique de demande de code ne prouvent pas sa livraison.

Après vérification du domaine Maileroo et raccordement du SMTP correspondant, contrôler dans la session du propriétaire :

1. Réception du code puis connexion, sans publier ni enregistrer le code dans les notes.
2. Présence des trois dossiers autorisés et ouverture de leurs pièces.
3. Recherche d'un document avec sa source et sa page; distinction entre original, déclaration, analyse et texte extrait à contrôler.
4. Téléchargement d'une pièce et contrôle de son intégrité.
5. Déconnexion, refus des accès privés après déconnexion et reprise normale de session.

Le blocage fournisseur reste non résolu. Mike doit appliquer les valeurs de la fiche DNS privée, puis le domaine et le SMTP correspondant doivent être vérifiés avant un nouvel essai demandé par le propriétaire. Ne pas créer de compte ou élargir des droits pour contourner un échec de connexion.

## Lot de fiabilité contrôlé localement — publication encore à faire

Sur `codex/reprise-portail-2026-10-30`, cinq correctifs sont terminés localement :

- **Caméra :** une autorisation reçue après fermeture ou remplacement de l'enregistreur n'attache plus un flux à un ancien outil; ses pistes sont arrêtées.
- **Chargement de document :** l'éditeur, l'enregistrement et l'export restent verrouillés jusqu'au chargement réussi; une erreur ne permet pas de remplacer l'original par un document incomplet. Une réponse tardive ne reprend pas le focus d'un autre outil.
- **Sauvegarde de l'éditeur :** la saisie et les actions sont verrouillées pendant l'envoi, puis rétablies sans perdre le texte, en cas de succès comme d'échec; un envoi en cours ne peut pas être soumis deux fois.
- **Envoi vidéo tardif :** la fin d'un envoi commencé dans un ancien enregistreur ne ferme plus l'éditeur qui l'a remplacé et ne détruit pas son travail.
- **Lecture DOCX :** la décompression est bornée et les structures ZIP sont contrôlées; tailles trompeuses, répertoires tronqués, entrées cibles en double et sommes de contrôle invalides sont rejetés.

Preuves locales rapportées par la session principale :

- **276/276 tests de la suite plateforme réussis**, dont les **10 tests de fiabilité** déjà inclus dans ce total;
- **12/12 tests du site réussis**;
- revue indépendante **sans bloqueur**;
- contrôle navigateur sur données fictives : éditeur au tiers de l'écran et export d'un véritable fichier DOCX.

**Évolution depuis le contrôle de 09:29 UTC :** ces corrections sont maintenant commitées localement dans `7a920ee195d7a492a4a95d7dacbd8b6d3e5732ca`. Le push et le déploiement restent à confirmer. Elles ne font pas partie du déploiement `2c41af9` contrôlé ici. Le contrôle sur données fictives ne constitue ni la réception des dossiers réels ni un essai de caméra physique. La publication, la CI du commit publié et le contrôle après déploiement doivent être consignés séparément.

## Continuité et périmètre

Le journal des agents reste en ajout seul; cette note et les documents de statut donnent le point courant sans supprimer les traces antérieures. Les mentions anciennes de code OTP non déployé, de DNS à basculer et de redéploiement PR 7 à faire sont historiques pour le portail.

Les choix de vitrine D-026, l'espace de travail D-029 et la séparation des services payants D-025 restent conservés. Aucune téléphonie réelle, IA générative, facturation ou nouvelle intégration externe n'est activée par cette réception. La plateforme complète ne peut pas être annoncée entièrement validée sur la base de ces seuls contrôles.

La [vision premium du 29 octobre](VISION-PREMIUM-2026-10-29.md) est conservée comme feuille de route, pas comme activation des services envisagés. Ses portions workspace sont déjà livrées par D-029 (tuiles, visionneuse, documents, annotations, présentations et messages vidéo); MIMT, FastFax, recherche juridique IA et monétisation restent des développements à raccorder et valider.
