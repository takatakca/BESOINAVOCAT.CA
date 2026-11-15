# Master list — avocats contactés (prospection Quadro/Harmony → base marketing BesoinAvocat)

Note DÉBUT — 2026-11-14 23:10 EST — signée Taktak.
Ordre de Matt (2026-11-14 23:10) : bâtir la master list de tous les avocats contactés le 2026-11-14
(campagne de recherche de représentation au résultat, litige Quadro Holdings / Harmony),
avec nom, cabinet, courriel — téléphone et adresse à enrichir — pour travailler avec eux et,
éventuellement, leur offrir BesoinAvocat.

## L'offre à préparer (décision de Matt, 2026-11-14)
- Produit : **BesoinAvocat** (besoinavocat.ca) — « magasiner vos clients » pour les avocats.
- Offre de lancement : **14 jours gratuits**.
- C'est la première offre qu'on poussera à cette liste. Pour le moment : on prépare le terrain
  (liste + enrichissement), aucun envoi marketing n'est parti.

## Contenu de la liste (master-list-avocats-2026-11-14.csv)
- **456 adresses contactées** (449 le 2026-11-14 + 7 relève 20 le 2026-11-15 01:52–01:53 EST — vague 3 TERMINÉE 56/56).
- **13 échecs de livraison** (adresses invalides/refusées — ne jamais réessayer pour le mandat Harmony).
- **443 courriels livrés**, dont :
  - **25 déclins** du mandat Harmony (24 rattachés à un courriel dans la liste ; 1 compté au journal sans courriel rattaché) ;
  - **9 réponses automatiques** rattachées (absences ; ~14 reçues au total) ;
  - **410 sans réponse** ;
  - **0 acceptation**.
- Couverture : nom pour 295/449, cabinet pour 321/449 (le reste : envois du matin retracés par la boîte,
  nom/cabinet à enrichir avec le téléphone et l'adresse).
- Colonnes Téléphone / Adresse / Ville : présentes, **vides** — nos sources (sites de cabinets,
  documents de cour) ne les contenaient pas. Enrichissement prévu : bottin du Barreau du Québec, par lots.

## Corrections faites en bâtissant la liste (vérifiées sur les fichiers)
- Le fichier d'exclusion de la campagne (tous_contactes_apres_vague2.txt) a été complété :
  4 adresses contactées y manquaient (Chahadi/ALC, Eidelmann, Karteris, Mongrain/CLA) → **445 → 449**.
  Sauvegarde : tous_contactes_apres_vague2.txt.bak-2026-11-14.
- Les 13 échecs de livraison SONT dans les 449 tentatives (le compteur « 10 échecs » du journal
  ne comptait que les vagues récentes ; 3 autres — Lexo, Dexar, Kellerman — venaient des envois du matin).
  Donc : 449 tentatives, 436 livrés, 13 non livrés.
- Me Yan Romanowski est EXCLU de cette liste en permanence : c'est l'avocat actuel au dossier
  (correspondance de coordination, pas de la prospection).

## Règles d'usage
- Mandat Harmony : ne jamais recontacter les déclins ni les échecs (liste d'exclusion de la campagne).
- Marketing BesoinAvocat : usage distinct, sur décision de Matt seulement ; aucun envoi fait à ce jour.
- La campagne de recherche d'avocat continue (ordre permanent de Matt) : il reste 11 contacts de la
  vague 3 à envoyer ; ils seront ajoutés à la liste au fur et à mesure.

Sources : ~/workspace/recherche-avocat-harmony/ (journal-envois.md, envois_log.json, envois_campagne.json,
recus_campagne.json, contactes.md, fichiers candidats des vagues 1–3).
Signé : Taktak — 2026-11-14 23:2x EST.

## Mise à jour 2026-11-15 02:05 EST — relève 20 (vague 3 TERMINÉE 56/56) — signée Taktak
- 7 envois ajoutés (relève 20, 2026-11-15 01:52–01:53 EST, ids Gmail vérifiés dans lot_releve_20.log et
  envois_log.json) : Me Lianne Armstrong (Lerners, 1a1ddfad68d954e6), Me Natalie Carrothers (Lerners,
  1a1ddfaf691d3050), Me Joseph Hentz (Lerners, 1a1ddfb123724295), Me Kevin Ross (Lerners,
  1a1ddfb2fe70cb83), Me John De Vellis (Shibley Righton, 1a1ddfb48ecde8c9), Me Vern DaRe (Fogler,
  Rubinoff, 1a1ddfb63ac155a2), Me David Joanisse (LCM Avocats, 1a1ddfb7e47441b5).
- Compteurs : 449 → **456 adresses** ; livrés 436 → **443** ; sans réponse 403 → **410** ; déclins 25,
  échecs 13, réponses automatiques 9, acceptations 0 — inchangés.
- Vérification : base distante GitHub main 48e9a718 (blob SHA 5f3778b3…) re-vérifiée avant dépôt —
  le fichier poussé est byte-identique à la base + 7 lignes ajoutées (md5 ancien cd1f3ddf…).
- Prochaine étape : vague 4 — nouvelle liste (Barreau Montréal/Québec, litige), hors exclusion (460),
  hors déclins/échecs ; liste en constitution dans ~/workspace/recherche-avocat-harmony/.
