# Entente de traitement des renseignements personnels (Loi 25) — BesoinAvocat et MIMT

*Projet du 14 novembre 2026, à signer **avant** la mise en service des appels (voir [MIMT-ACTIVATION-2026-11-07](../MIMT-ACTIVATION-2026-11-07.md), point 6). À faire valider par un avocat; MIMT doit aussi le relire. Clauses attendues : [INTEGRATION-MIMT-2026-10-30, section « Loi 25 et secret professionnel »](../INTEGRATION-MIMT-2026-10-30.md).*

**ENTRE** `[nom légal de l'exploitant de BesoinAvocat]`, `[NEQ]`, `[adresse]` (« BesoinAvocat », le **responsable** des renseignements)

**ET** `[nom légal de MIMT]`, `[NEQ]`, `[adresse]` (« MIMT », le **fournisseur de services** au sens de l'article 18.3 de la *Loi sur la protection des renseignements personnels dans le secteur privé*, RLRQ c. P-39.1).

Les deux entreprises font partie de l'écosystème TAKATAK; la présente entente s'applique malgré ce lien, parce que chacune reste une personne morale distincte et que MIMT traite des renseignements pour le compte de BesoinAvocat.

## 1. Objet

MIMT fournit à BesoinAvocat un service d'appels téléphoniques (« MIMT Connect ») intégré au portail BesoinAvocat : acheminement des appels entre les membres d'un dossier (personne cliente, avocat, équipe de BesoinAvocat), numéro public **(855) 3-AVOCAT**, comptage et **facturation à la minute**, et, si BesoinAvocat l'active pour un dossier, enregistrement des appels. Pour ce faire, MIMT traite des renseignements personnels pour le compte de BesoinAvocat. La présente entente fixe les conditions de ce traitement.

## 2. Renseignements visés et minimisation

MIMT ne reçoit et ne conserve, pour BesoinAvocat, que :

- les identifiants techniques du partenaire, du dossier et de l'appel (jamais le titre ni le contenu du dossier);
- les numéros de téléphone appelants et appelés;
- l'heure de début et de fin, la durée et le nombre de minutes facturées;
- le solde et la consommation des crédits;
- l'enregistrement audio d'un appel **seulement** si la fonction est activée pour ce dossier.

Les webhooks et l'API de MIMT vers BesoinAvocat ne portent **jamais d'audio**. Aucune transcription, aucun résumé par intelligence artificielle et aucune analyse du contenu des conversations ne sont produits pour BesoinAvocat, sauf entente écrite distincte. MIMT n'écoute pas les conversations.

## 3. Finalités autorisées

MIMT traite ces renseignements uniquement pour : acheminer les appels demandés depuis le portail; compter les minutes et facturer BesoinAvocat; produire les relevés d'usage; conserver et rendre accessibles les enregistrements autorisés; assurer la sécurité et le bon fonctionnement du service; respecter la loi. Toute autre utilisation, notamment commerciale, statistique ou d'entraînement de modèles, est interdite.

## 4. Instructions et confidentialité

MIMT agit seulement sur les instructions documentées de BesoinAvocat (la présente entente, la documentation d'intégration et les demandes écrites). MIMT impose une obligation de confidentialité à toute personne de son équipe qui accède aux renseignements et limite cet accès au besoin du service. MIMT avise BesoinAvocat si une instruction lui paraît contraire à la loi.

## 5. Secret professionnel

Les appels entre une personne et son avocat peuvent être couverts par le **secret professionnel**. MIMT reconnaît ce caractère, ne consulte pas les enregistrements sauf demande écrite de BesoinAvocat ou obligation légale, et en informe BesoinAvocat avant toute communication à un tiers lorsque la loi le permet. L'avis d'enregistrement est lu à chaque participant au début de tout appel enregistré; MIMT ne lance aucun enregistrement sans cet avis.

## 6. Mesures de sécurité

MIMT applique des mesures proportionnées à la sensibilité des renseignements : chiffrement en transit; accès au compte partenaire par clé d'API dédiée à BesoinAvocat, révocable; webhooks signés (HMAC) et horodatés; cloisonnement du compte BesoinAvocat; journalisation des accès administratifs; enregistrements accessibles seulement par **liens signés d'une durée maximale de 15 minutes**; sauvegardes protégées; correctifs de sécurité appliqués avec diligence. MIMT décrit ces mesures à l'annexe A et avise BesoinAvocat de tout changement qui les affaiblirait.

## 7. Sous-traitants et traitement hors Québec

MIMT a recours aux sous-traitants suivants : `[Twilio pour la téléphonie; hébergeur de l'API et des enregistrements; autres]`. Certains traitent des renseignements **à l'extérieur du Québec**. MIMT :

- fournit à BesoinAvocat la liste à jour des sous-traitants, de leur rôle et du lieu de traitement (annexe B) et l'avise au moins 30 jours avant d'en ajouter ou d'en changer, BesoinAvocat pouvant s'y opposer pour motif raisonnable;
- lie chaque sous-traitant par des obligations équivalentes aux présentes;
- collabore à l'**évaluation des facteurs relatifs à la vie privée** que BesoinAvocat doit réaliser avant toute communication hors Québec (art. 17 de la Loi), en fournissant les renseignements nécessaires.

## 8. Conservation et suppression

- Les relevés d'appels (numéros, heures, durées, minutes) sont conservés par MIMT `[durée, par exemple 24 mois]` pour la facturation et la preuve, puis supprimés ou anonymisés.
- Les enregistrements sont conservés `[durée, par exemple 90 jours]` après l'appel, puis supprimés; BesoinAvocat peut demander leur suppression plus tôt par l'API, et MIMT s'exécute dans les `[5]` jours ouvrables.
- MIMT n'archive pas de copie des enregistrements au-delà de ces délais, sauf obligation légale dont il avise BesoinAvocat.

## 9. Incidents de confidentialité

MIMT avise BesoinAvocat **sans délai, et au plus tard dans les 48 heures** de la découverte de tout incident de confidentialité touchant les renseignements de BesoinAvocat (accès, utilisation, communication non autorisés, perte), avec la description de l'incident, des renseignements visés, des personnes touchées et des mesures prises. MIMT tient un registre des incidents, collabore à l'évaluation du risque de préjudice sérieux et aux avis à la Commission d'accès à l'information et aux personnes concernées, qui relèvent de BesoinAvocat.

## 10. Droits des personnes

MIMT transmet à BesoinAvocat dans les `[5]` jours ouvrables toute demande d'accès, de rectification ou de suppression qu'une personne lui adresse au sujet du service, et l'aide à y répondre dans le délai légal de 30 jours.

## 11. Vérification

BesoinAvocat peut, une fois par année ou après un incident, demander à MIMT une attestation écrite de conformité et les éléments raisonnables de démonstration (politiques, résultats de tests, liste des accès). MIMT y répond dans les 30 jours.

## 12. Fin de l'entente

À la fin du service, pour quelque cause que ce soit, MIMT **retourne à BesoinAvocat ou détruit**, au choix de BesoinAvocat, tous les renseignements personnels traités pour lui, dans les 30 jours, et le confirme par écrit, sous réserve des seuls éléments que la loi oblige à conserver (par exemple les relevés de facturation), qui restent couverts par la présente entente.

## 13. Durée, droit applicable

La présente entente entre en vigueur à sa signature et dure aussi longtemps que MIMT traite des renseignements pour BesoinAvocat. Elle est régie par les lois du Québec. En cas de conflit avec les conditions commerciales du service MIMT Connect, la présente entente prévaut pour ce qui touche les renseignements personnels.

## Signatures

| Pour BesoinAvocat | Pour MIMT |
| --- | --- |
| `[nom, titre]` | `[nom, titre]` |
| Date : `[…]` | Date : `[…]` |

## Annexe A — Mesures de sécurité de MIMT

`[À fournir par MIMT. Points attendus : chiffrement, gestion des clés d'API, signature des webhooks, cloisonnement des partenaires, journalisation, liens signés de 15 minutes, sauvegardes, gestion des correctifs, contrôle des accès administratifs.]`

## Annexe B — Sous-traitants de MIMT et lieu de traitement

| Sous-traitant | Rôle | Lieu de traitement |
| --- | --- | --- |
| `[Twilio]` | `[téléphonie, numéros, acheminement]` | `[États-Unis]` |
| `[hébergeur de api.mimt.ca]` | `[API, base de données, enregistrements]` | `[…]` |

## Annexe C — Paramètres convenus pour BesoinAvocat

- Identifiant partenaire : `besoinavocat`.
- Numéro public : (855) 3-AVOCAT.
- Facturation : à la minute, `[creditPerMinute : 2 crédits par minute selon la documentation du 7 novembre 2026, à confirmer]`, toute minute commencée étant due.
- Enregistrement : **désactivé** par défaut; activable dossier par dossier par BesoinAvocat, avec avis lu aux participants.
- Résumés et transcriptions : **désactivés**.
- Webhook vers BesoinAvocat : `https://portail.besoinavocat.ca/api/mimt/webhook`, signé.
