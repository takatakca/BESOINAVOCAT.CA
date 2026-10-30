# Code courriel — diagnostic de livraison du 30 octobre 2026

Signé : Codex (desktop, session 01a157a4). Diagnostic confirmé dans les interfaces d'administration par la session principale à 09:40 UTC. Cette note publique ne contient ni destinataires, ni identifiants de compte, ni secrets SMTP. Les valeurs DNS exactes sont conservées dans une fiche privée distincte pour le propriétaire et Mike.

**La cause du refus est connue, mais le blocage fournisseur n'est pas encore résolu.** Le domaine de test Maileroo refuse le destinataire demandé. Le portail répond en HTTPS; cela ne valide pas la livraison de ses courriels ni l'accès authentifié aux dossiers.

## Observations confirmées

| Contrôle | Observation au moment de la lecture |
|---|---|
| Messages consultés | Trois messages destinés au propriétaire sont marqués « Suppressed ». |
| Événement d'envoi | Le 30 octobre à 08:58:26 UTC : « User is not allowed to send outside of the authorized email list. » |
| Domaine de test | Actif; sept destinataires autorisés affichés, propriétaire absent. |
| Ajout ciblé du propriétaire | Refus de l'interface : nombre maximal de destinataires autorisés du domaine de test atteint. Aucune addition effectuée et aucun destinataire existant supprimé. |
| Domaine propre `takatak.ca` | « Inactive », « DNS Incomplete »; SPF et DKIM non vérifiés. Le contrôle DNS public ne trouve pas la clé DKIM attendue au sélecteur `mta`. |
| Supabase | SMTP personnalisé activé vers `smtp.maileroo.com`, port 465. Le secret en place n'a pas été modifié. |
| Compteurs affichés | Offre gratuite à 3 000 messages par mois; compteurs à 0/3 000 et 0/30 pour l'heure. Le refus constaté ne vient pas d'un quota d'envoi consommé. |

Ces compteurs décrivent l'interface au moment du contrôle, sans garantir les conditions commerciales futures. Aucun achat, changement d'offre ou nouvel envoi OTP n'a été déclenché pendant ce diagnostic.

Maileroo impose une liste de destinataires autorisés pour ses domaines de test; sa documentation distingue ce mode de l'envoi depuis un domaine propre. [Documentation Maileroo : destinataires autorisés](https://maileroo.com/blog/send-email-with-python#adding-authorized-recipients).

Le projet utilise déjà un SMTP personnalisé. Ce blocage Maileroo ne doit pas être confondu avec les restrictions du service SMTP par défaut de Supabase. Supabase permet de raccorder un fournisseur SMTP avec ses paramètres de serveur, d'expéditeur et d'authentification. [Documentation Supabase : SMTP personnalisé](https://supabase.com/docs/guides/auth/auth-smtp).

## Voie de résolution avec le compte existant

1. **DNS du domaine d'envoi :** Mike ou le propriétaire applique les valeurs exactes de la fiche privée préparée pour `takatak.ca`, en préservant les enregistrements existants et en évitant les doublons SPF. La lecture des dépendances SPF a compté sept consultations, sous la limite de dix, lors du contrôle de 09:43–09:44 UTC; ce constat ne remplace pas la validation après modification.
2. **Validation Maileroo :** attendre la propagation puis vérifier que SPF et DKIM sont validés et que le domaine propre devient actif. Ne pas annoncer cette étape accomplie sur la seule base de valeurs préparées.
3. **Raccordement Supabase :** utiliser le SMTP et l'expéditeur du domaine validé. Le propriétaire saisit les identifiants dans l'administration; ils ne doivent pas figurer dans GitHub ou dans les notes. Vérifier également le modèle de courriel affichant le code.
4. **Essai réel :** après configuration, le propriétaire demande un nouveau code depuis le portail et le saisit lui-même. Contrôler les événements d'envoi du fournisseur ainsi que la réception effective. Aucun code ne doit être recopié dans les notes.
5. **Recette du dossier :** vérifier la session réelle, les trois dossiers autorisés, l'ouverture, la recherche, le téléchargement et la déconnexion selon la [fiche de réception](RECEPTION-2026-10-30.md).

Cette voie utilise le domaine et le compte déjà disponibles; aucune souscription payante n'est activée par ce plan. Au dernier contrôle, les changements DNS et le raccordement au SMTP du domaine restent à effectuer. La demande au propriétaire — ouvrir son administration DNS ou faire appliquer la fiche par Mike — est encore en attente.

## Statut à conserver lors de la reprise

- **Portail accessible :** oui, d'après les contrôles datés du 30 octobre; voir les limites dans la [réception](RECEPTION-2026-10-30.md).
- **Cause de non-réception :** restriction du domaine de test Maileroo confirmée; résolution non terminée.
- **Accès utilisateur et trois dossiers :** réception du code et consultation authentifiée non confirmées.
- **Correctifs de fiabilité du workspace :** contrôlés localement puis commités dans `7a920ee195d7a492a4a95d7dacbd8b6d3e5732ca`; leur publication et leur déploiement sont distincts du diagnostic d'envoi et restent à contrôler.

Un résultat générique `accepted: true` ne constitue pas une preuve de livraison. La [clarification du contrat de demande de code](OTP-EMAIL-STATUS-2026-10-29.md#clarification-du-contrat-de-demande-de-code--30-octobre) précise quels rejets sont neutralisés et quelles erreurs restent signalées. Les notes historiques restent conservées avec leurs dates.
