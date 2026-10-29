# Corrections du contenu importé de WordPress

> **28 octobre 2026 : ces corrections ne sont pas appliquées.** Depuis D-026, `www/` sert la copie exacte du site WordPress, mot pour mot (`www/site/`). `www/content/` est conservé pour l'inventaire de préservation, mais la construction ne le lit plus. Cette liste reste une **proposition au propriétaire** : chaque défaut a été confirmé sur son site en ligne. S'il le souhaite, il les corrige dans WordPress, puis la copie est reprise (voir [STOREFRONT](STOREFRONT.md#modifier-le-site)).

Relecture du 27 octobre 2026, sur les 348 pages de `www/content/pages/`. La méthode combine :

- un correcteur orthographique français (pyspellchecker, 140 000 mots);
- une recherche des mots collés (« clientAnalyse ») et des phrases collées (« réclamé.Par »);
- une vérification manuelle de chaque cas dans son contexte.

Chaque défaut a d'abord été confirmé dans le HTML du site WordPress en ligne : **ce sont des coquilles de la source, pas de la copie**.

Règles suivies :

- **aucune information retirée**;
- seuls deux types de parasites sont enlevés : les restes de copier-coller Word (« Top of Form », « Bottom of Form ») et un passage collé par erreur dans un autre article (voir `/avocat-harcelement-criminel/`), qui reste en place sur `/affaires/`;
- les listes collées en une seule ligne redeviennent des listes, avec le même texte;
- les mots juridiques corrects mais rares (*absoute*, *synallagmatique*, *quérulent*…) et l'orthographe rectifiée (*connaitre*, *entrainer*) ne sont pas modifiés.

Les noms de cabinets ne sont corrigés que lorsque l'orthographe est certaine : McCarthy Tétrault, Dunton Rainville, Moskowitz & Meredith.

Résultat après correction :

- `node www/tools/check-site.mjs` : 0 erreur;
- le correcteur ne signale plus que des termes juridiques ou régionaux valides;
- 27 des 28 liens externes répondent 200, une fois remplacé le lien mort de la CSJ. barreaudemontreal.qc.ca n'a pas répondu depuis l'environnement de contrôle; le lien est conservé.

| Page | Correction | Avant | Après |
|---|---|---|---|
| `/a-propos/` | mot coupé | ocats-justiciables par année, d’ici 2025. Nos contributions Au-delà de son activité principale de mis | ocats-justiciables par année, d’ici 2025. Nos contributions Au-delà de son activité principale de mis |
| `/absolution-conditionnelle-en-matiere-dagression/` | coquille | judicaire (1×) | judiciaire |
| `/absolution-conditionnelle-et-inconditionnelle/` | coquille | antécédant (1×) | antécédent |
| `/absolution-conditionnelle-et-inconditionnelle/` | coquille | judicaire (1×) | judiciaire |
| `/abus-et-exploitation-des-aines/` | reste de copier-coller Word | réparation financière pour les dommages subis.Bottom of Form Besoinavocat vous aide à trouver un avocat sp | réparation financière pour les dommages subis. Besoinavocat vous aide à trouver un avocat sp |
| `/abus-et-exploitation-des-aines/` | espace manquante | commissairelocal (3×) | commissaire local |
| `/abus-et-exploitation-des-aines/` | espace manquante après la ponctuation | 1 endroit(s) |  |
| `/acheter-une-maison-sans-garantie-legale/` | espace manquante après la ponctuation | 6 endroit(s) |  |
| `/affaires/` | phrases collées | l net, le locataire va payer un montant fixe pour couvrir son loyerToutefois, il faudra ajouter une somme additionnelle afin d | l net, le locataire va payer un montant fixe pour couvrir son loyer. Toutefois, il faudra ajouter une somme additionnelle afin d |
| `/amos/` | espace manquante | offertsen (1×) | offerts en |
| `/annuler-un-testament/` | espace manquante après la ponctuation | 1 endroit(s) |  |
| `/avocat-a-forfait-ou-a-taux-horaire/` | liste collée | rie selon les exigences propres à chaque dossier, telsRencontres avec le clientAnalyse des éléments de preuveÉlaboration d’une stratégie de défensePréparation au procèsDans ce contexte, la tarification horaire s’impose souvent comme l | rie selon les exigences propres à chaque dossier, tels :Rencontres avec le client;Analyse des éléments de preuve;Élaboration d’une stratégie de défense;Préparation au procès.Dans ce contexte, la tarification horaire s’impose souvent comme l |
| `/avocat-aide-juridique-2/` | espace manquante après la ponctuation | 8 endroit(s) |  |
| `/avocat-delit-fuite/` | mot tronqué | la jurisprudence en matière de délit de fuite.Les peines applicab Les éléments de l’infraction de délit de fuit | la jurisprudence en matière de délit de fuite.Les peines applicables Les éléments de l’infraction de délit de fuit |
| `/avocat-droit-immigration-ottawa/` | espace manquante | examensde (1×) | examens de |
| `/avocat-droit-immobilier/` | espace manquante après la ponctuation | 1 endroit(s) |  |
| `/avocat-harcelement-criminel/` | citation de l’article 264 C.cr. séparée d’un passage sur les fusions collé par erreur (ce passage reste dans /affaires/) | èlement criminel et qui le définit comme-ci : Attention! Lorsque vous procédez à une fusion ordinaire, la convention sera obliga« 264 (1) Il est interdit, sauf autorisation légitime, d’agir à l’égard d’une personne sachant qu’elle se sent harcelée ou sans se soucier de ce qu’elle se sente harcelée si l’acte en question a pour effet de lui faire raisonnablement craindre compte tenu du contexte pour sa sécurité ou celle d’une de ses connaissances. » toire. Toutefois, advenant que vous optiez pour la fusion simplifiée, vous n’aurez qu’à soumettre une résolution du conseil d'administration. Il faut noter qu’il existe d’autres ty | èlement criminel et qui le définit comme-ci : « 264 (1) Il est interdit, sauf autorisation légitime, d’agir à l’égard d’une personne sachant qu’elle se sent harcelée ou sans se soucier de ce qu’elle se sente harcelée si l’acte en question a pour effet de lui faire raisonnablement craindre compte tenu du contexte pour sa sécurité ou celle d’une de ses connaissances. » Il faut noter qu’il existe d’autres ty |
| `/avocat-harcelement-criminel/` | coquille | crimistnalie (1×) | criminaliste |
| `/bail-commercial/` | espace manquante | lemontant (1×) | le montant |
| `/blainville/` | espace manquante après la ponctuation | 1 endroit(s) |  |
| `/bottin-des-avocats-du-quebec/` | coquille | Ahunstic (1×) | Ahuntsic |
| `/boucherville/` | espace manquante | avocatdès (1×) | avocat dès |
| `/boucherville/` | espace manquante | prouverhors (1×) | prouver hors |
| `/brossard/` | coquille | Diminuer les risques et conséquences d’un litige ente héritiersIntenter un recours en destituti | Diminuer les risques et conséquences d’un litige entre héritiersIntenter un recours en destituti |
| `/calcul-de-la-pension-alimentaire/` | espace manquante après la ponctuation | 1 endroit(s) |  |
| `/chateauguay/` | reste de copier-coller Word | est déterminée en fonction du revenu et d’autres facteurs pertinents.Top of Form Laissez Besoinavocat prendre en charge votre | est déterminée en fonction du revenu et d’autres facteurs pertinents. Laissez Besoinavocat prendre en charge votre |
| `/civil-general/` | espace manquante | defaire (1×) | de faire |
| `/civil-general/` | espace manquante | notammentla (1×) | notamment la |
| `/clause-shotgun-convention-dactionnaires/` | espace manquante | actionsimplique (1×) | actions implique |
| `/clause-shotgun-convention-dactionnaires/` | espace manquante après la ponctuation | 1 endroit(s) |  |
| `/comment-consulter-un-casier-judiciaire/` | espace manquante | judiciairecomprend (1×) | judiciaire comprend |
| `/congediement-injustifie/` | coquille | cat! Enfin, le nerf de la guerre, soit la fixation avdu montant de votre indemnité de départ! Combien obtiendrez- | cat! Enfin, le nerf de la guerre, soit la fixation du montant de votre indemnité de départ! Combien obtiendrez- |
| `/consultations/` | mot tronqué | qui vous convient et suivez les instructions pour finaliser votre réservatioQuelle est la durée de | qui vous convient et suivez les instructions pour finaliser votre réservation.Quelle est la durée de |
| `/consultations/` | coquille | avantange (1×) | avantage |
| `/contenu-casier-judiciaire/` | espace manquante après la ponctuation | 2 endroit(s) |  |
| `/contestation-dune-decision-du-mapaq/` | mot coupé | est obligatoire d’utiliser le formulaire disponible directement sur le site du Ministère de l’Agriculture, des Pê | est obligatoire d’utiliser le formulaire disponible directement sur le site du Ministère de l’Agriculture, des Pê |
| `/contrat-construction-extras/` | mot coupé | rong>votre entrepreneur ne peut pas vous réclamer un prix plus élev é que ce qui a été prévu dans le contrat. Ainsi, votre | rong>votre entrepreneur ne peut pas vous réclamer un prix plus élevé que ce qui a été prévu dans le contrat. Ainsi, votre |
| `/cour-canadienne-de-limpot/` | mot coupé | lement ou totalement sa décision initialeAnnuler sa décision initialeC’est uniquement après avoir reçu la | lement ou totalement sa décision initialeAnnuler sa décision initialeC’est uniquement après avoir reçu la |
| `/cour-canadienne-de-limpot/` | liste collée | e plusieurs lois fiscales fédérales (environ 14), notamment : La Loi de l’impôt sur le revenu La Loi sur la taxe d’accise (y compris la TPS/TVH)La Loi sur l’assurance-emploiLe Régime de pensions du CanadaLa Loi sur la taxe sur les logements sous-utilisésLa Loi sur l’exportation et l’importation de biens culturelsLa majorité des dossiers présentés devant la CCI concernent d | e plusieurs lois fiscales fédérales (environ 14), notamment :La Loi de l’impôt sur le revenu;La Loi sur la taxe d’accise (y compris la TPS/TVH);La Loi sur l’assurance-emploi;Le Régime de pensions du Canada;La Loi sur la taxe sur les logements sous-utilisés;La Loi sur l’exportation et l’importation de biens culturels.La majorité des dossiers présentés devant la CCI concernent d |
| `/crimes-sexuels/` | espace manquante après la ponctuation | 1 endroit(s) |  |
| `/criminel-et-penal/` | espace manquante après la ponctuation | 1 endroit(s) |  |
| `/deces-sans-testament/` | espace manquante | desfrères (1×) | des frères |
| `/delai-prescription-agression-sexuelle/` | espace manquante après la ponctuation | 1 endroit(s) |  |
| `/demande-dasile-au-canada/` | espace manquante | travailau (1×) | travail au |
| `/demande/` | coquille | jeuneesse (1×) | jeunesse |
| `/demande/` | coquille | Immobiler (1×) | Immobilier |
| `/demarrage-dentreprise/` | espace manquante | unbail (1×) | un bail |
| `/dommages-moraux-et-psychologiques/` | espace manquante | élémentsessentiels (1×) | éléments essentiels |
| `/droit-de-servitude-et-passage/` | mot coupé | s ouvragesVous aurez aussi la possibilité d’e ffectuer tout ouvrage qui sera nécessaire pour utiliser la | s ouvragesVous aurez aussi la possibilité d’effectuer tout ouvrage qui sera nécessaire pour utiliser la |
| `/droits-des-heritiers-lors-dune-succession/` | espace manquante | quela (1×) | que la |
| `/drummondville/` | coquille | Drummonville (1×) | Drummondville |
| `/enregistrer-une-conversation/` | espace manquante après la ponctuation | 4 endroit(s) |  |
| `/etapes-dun-proces-civil-au-quebec-en-2025/` | mot coupé | u sept pages si elle comprend une demande reconventionnelle. ÉTAPE 5: CONFÉRENCE DE RÈ | u sept pages si elle comprend une demande reconventionnelle. ÉTAPE 5: CONFÉRENCE DE RÈ |
| `/etapes-dun-proces-civil-au-quebec-en-2025/` | coquille | econventionnelle. ÉTAPE 5: CONFÉRENCE DE RÈGLEMENTE À L’AMIABLE Il est important de noter que la | econventionnelle. ÉTAPE 5: CONFÉRENCE DE RÈGLEMENT À L’AMIABLE Il est important de noter que la |
| `/etias-etias-autorisation-pour-voyager-en-europe/` | liste collée | ’espace Schengen, incluant :AllemagneAutricheBelgiqueBulgarieCroatie DanemarkEspagneEstonieFinlandeFranceGrèceHongrieIslande ItalieLetton | ’espace Schengen, incluant :AllemagneAutricheBelgiqueBulgarieCroatieDanemarkEspagneEstonieFinlandeFranceGrèceHongrieIslande ItalieLetton |
| `/etias-etias-autorisation-pour-voyager-en-europe/` | liste collée | CroatieDanemarkEspagneEstonieFinlandeFranceGrèceHongrieIslande ItalieLettonieLiechtensteinLituanieLuxembourgMalteNorvègePay | CroatieDanemarkEspagneEstonieFinlandeFranceGrèceHongrieIslandeItalieLettonieLiechtensteinLituanieLuxembourgMalteNorvègePay |
| `/etias-etias-autorisation-pour-voyager-en-europe/` | liste collée | eHongrieIslandeItalieLettonieLiechtensteinLituanieLuxembourgMalteNorvègePays-BasPolognePortugal République tchèque RoumanieSlovaquieS | eHongrieIslandeItalieLettonieLiechtensteinLituanieLuxembourgMalteNorvègePays-BasPolognePortugal République tchèque RoumanieSlovaquieS |
| `/etias-etias-autorisation-pour-voyager-en-europe/` | liste collée | rgMalteNorvègePays-BasPolognePortugal République tchèque RoumanieSlovaquieSlovénieSuèdeSuisseQuels pays doit demander | rgMalteNorvègePays-BasPolognePortugalRépublique tchèqueRoumanieSlovaquieSlovénieSuèdeSuisseQuels pays doit demander |
| `/evitement-fiscal-v-evasion-fiscale/` | liste collée | fin de déterminer s’il s’agit d’un paradis fiscal ou non:Régime fiscal opaque,Accueil de sociétés-écrans,Pas ou peu d’impôt, etAbsence d’échange relatif aux renseignements fiscaux.Par exemple, les Bermudes, Chypre, Bahamas et Maurice sont de | fin de déterminer s’il s’agit d’un paradis fiscal ou non : régime fiscal opaque, accueil de sociétés-écrans, pas ou peu d’impôt, et absence d’échange relatif aux renseignements fiscaux. Par exemple, les Bermudes, Chypre, Bahamas et Maurice sont de |
| `/faillite-et-insolvabilite/` | espace manquante | biensafin (1×) | biens afin |
| `/faillite-vs-dissolution-dentreprise-au-quebec/` | espace manquante après la ponctuation | 2 endroit(s) |  |
| `/famille-et-jeunesse/` | mot parasite collé | biens, etLa garde des enfants. BesoinavocatEn revanche, si les conjoints ne sont pas d’accord avec la dé | biens, etLa garde des enfants. En revanche, si les conjoints ne sont pas d’accord avec la dé |
| `/famille-et-jeunesse/` | mot parasite collé | nces de la déchéance de l’autorité parentale BesoinavocatLorsque la déchéance de l’autorité parentale est prononcée pour l’un d | nces de la déchéance de l’autorité parentale Lorsque la déchéance de l’autorité parentale est prononcée pour l’un d |
| `/famille-et-jeunesse/` | espace manquante après la ponctuation | 1 endroit(s) |  |
| `/fermeture-entreprise-incorporee/` | espace manquante | affairesafin (1×) | affaires afin |
| `/fiscal/` | coquille et sens | /p>Après tout, les lois fiscales étant une sorte de jardon intelligible, aucune entreprise n’est immunisée contre les err | /p>Après tout, les lois fiscales étant une sorte de jargon inintelligible, aucune entreprise n’est immunisée contre les err |
| `/fiscalite-et-taxes/` | mots collés | ribunal compétent Revenu Québec Cour du QuébecPetites créances Agence du revenu du Canada Cour | ribunal compétent Revenu Québec Cour du Québec – Petites créances Agence du revenu du Canada Cour |
| `/franchiser-son-entreprise/` | coquille | Ains (1×) | Ainsi |
| `/garde-denfants-et-pension-alimentaire/` | espace manquante | enfantsle (1×) | enfants le |
| `/harcelement-psychologique/` | espace manquante | ildoit (1×) | il doit |
| `/immigration-illegale-au-canada/` | espace manquante après la ponctuation | 1 endroit(s) |  |
| `/immigration/` | espace manquante | autantafin (1×) | autant afin |
| `/immobilier/` | espace manquante après la ponctuation | 1 endroit(s) |  |
| `/incorporation-dentreprises/` | espace manquante | ensembledes (1×) | ensemble des |
| `/incorporation-dentreprises/` | espace manquante | Besoinavocatest (1×) | Besoinavocat est |
| `/inscription-et-radiation-dune-hypotheque-legale/` | espace manquante | constructionporte (1×) | construction porte |
| `/inscription-et-radiation-dune-hypotheque-legale/` | espace manquante | généralementles (1×) | généralement les |
| `/inscription-et-radiation-dune-hypotheque-legale/` | espace manquante | Québecpeuvent (1×) | Québec peuvent |
| `/lanaudiere/` | espace manquante après la ponctuation | 1 endroit(s) |  |
| `/leguer-un-heritage-de-son-vivant/` | reste de copier-coller Word | stressante pour toutes les parties concernées.Top of FormBottom of FormRespect de ses volontés:< | stressante pour toutes les parties concernées.Bottom of FormRespect de ses volontés:< |
| `/leguer-un-heritage-de-son-vivant/` | reste de copier-coller Word | stressante pour toutes les parties concernées.Bottom of FormRespect de ses volontés:En optant pour | stressante pour toutes les parties concernées.Respect de ses volontés:En optant pour |
| `/les-plus-gros-cabinets-davocats-du-quebec/` | coquille | visibilité gratuite, il suffit de nous écrire et il nous ferra plaisir d’enlever toute mention de votre cabinet.< | visibilité gratuite, il suffit de nous écrire et il nous fera plaisir d’enlever toute mention de votre cabinet.< |
| `/les-plus-gros-cabinets-davocats-du-quebec/` | coquille | Thétrault (1×) | Tétrault |
| `/les-plus-gros-cabinets-davocats-du-quebec/` | coquille | Duton (1×) | Dunton |
| `/litige-entre-actionnaires/` | espace manquante après la ponctuation | 2 endroit(s) |  |
| `/logement-2/` | coquille | rapidemnet (1×) | rapidement |
| `/magog/` | espace manquante | Lafusion (1×) | La fusion |
| `/maison-de-chambre/` | espace manquante après la ponctuation | 1 endroit(s) |  |
| `/mise-en-demeure-par-courriel/` | espace manquante après la ponctuation | 1 endroit(s) |  |
| `/nouveaux-droits-pour-les-consommateurs-en-2025/` | coquille | roduits en 2025 pour les droits des consommateurs au quÉbec! La Politique d’exactitude des prix au Qu | roduits en 2025 pour les droits des consommateurs au Québec! La Politique d’exactitude des prix au Qu |
| `/nouveaux-droits-pour-les-consommateurs-en-2025/` | espace manquante après la ponctuation | 1 endroit(s) |  |
| `/obligation-des-syndicats-de-copropriete/` | espace manquante | prévoyancereprésente (1×) | prévoyance représente |
| `/pardon-alcool-volant/` | espace manquante | unavocat (1×) | un avocat |
| `/patrimoine-familial-vs-patrimoine-dunion-parental/` | espace manquante | exclusdu (1×) | exclus du |
| `/pension-alimentaire-ex-conjoint/` | espace manquante | pourex-conjoints (1×) | pour ex-conjoints |
| `/pension-alimentaire-ex-conjoint/` | espace manquante après la ponctuation | 1 endroit(s) |  |
| `/permis-conduire-suspendu-par-la-saaq/` | espace manquante | spécialiséen (1×) | spécialisé en |
| `/permis-conduire-suspendu-par-la-saaq/` | espace manquante | étéreconnu (1×) | été reconnu |
| `/permis-de-conduire-restreint/` | espace manquante | volantentraîne (1×) | volant entraîne |
| `/personnes-en-situation-de-handicap/` | espace manquante après la ponctuation | 1 endroit(s) |  |
| `/poursuivre-accident-de-la-route/` | espace manquante après la ponctuation | 2 endroit(s) |  |
| `/prescription-acquisitive/` | coquille | Uune (1×) | Une |
| `/prix-avocat-pour-une-poursuite-civile/` | coquille | judicaire (1×) | judiciaire |
| `/prix-dun-avocat-en-droit-criminel/` | coquille | Magasine (1×) | Magazine |
| `/projet-de-loi-106-changements-a-la-remuneration-des-medecins/` | espace manquante après la ponctuation | 1 endroit(s) |  |
| `/projet-de-loi-89/` | phrases collées | s services assurant le bien-être de la population à maintenirEn cas de grève ou de lock-out, un décret gouvernemental pourra d | s services assurant le bien-être de la population à maintenir. En cas de grève ou de lock-out, un décret gouvernemental pourra d |
| `/projet-de-loi-89/` | liste collée | services publics. Ce préavis doit être adressé à plusieurs parties : Le ministre du TravailL’autre partie impliquée (syndicat ou employeur)Le Tribunal administratif du travailCette nouvelle exigence vise à garantir un délai suffisant pour | services publics. Ce préavis doit être adressé à plusieurs parties :le ministre du Travail;l’autre partie impliquée (syndicat ou employeur);le Tribunal administratif du travail.Cette nouvelle exigence vise à garantir un délai suffisant pour |
| `/projet-de-loi-89/` | espace manquante après la ponctuation | 1 endroit(s) |  |
| `/promesse-dachat-et-action-en-passation-de-titre/` | coquille | remord (1×) | remords |
| `/recours-au-tribunal-administratif-du-logement/` | coquille | adminsitratif (1×) | administratif |
| `/recours-faute-professionnelle/` | espace manquante | professionnelest (1×) | professionnel est |
| `/rediger-un-contrat-de-service-2/` | espace manquante après la ponctuation | 5 endroit(s) |  |
| `/refus-demande-immigration/` | espace manquante | ng>. De plus, si la décision prise par l’agent de l’IRCCn’a pas respecté les principes d’équité procé | ng>. De plus, si la décision prise par l’agent de l’IRCC n’a pas respecté les principes d’équité procé |
| `/refus-demande-immigration/` | nom officiel | des agents du Ministère de l’Immigration, Réfugiés et Citoyennetés du Canada . Par conséquent, le résultat pourra néc | des agents du Ministère de l’Immigration, Réfugiés et Citoyenneté Canada . Par conséquent, le résultat pourra néc |
| `/refus-demande-immigration/` | espace manquante | Besoinavocatvous (1×) | Besoinavocat vous |
| `/remboursement-des-frais-davocat/` | coquille | judicaires (1×) | judiciaires |
| `/reponse-mise-en-demeure/` | mot coupé | . Ainsi, pour mettre toutes les chances de votre côté, voici les 4 étapes à suivre lorsque vient le temps de r | . Ainsi, pour mettre toutes les chances de votre côté, voici les 4 étapes à suivre lorsque vient le temps de r |
| `/responsabilite-civile/` | espace manquante après la ponctuation | 1 endroit(s) |  |
| `/responsabilite-medicale/` | espace manquante | couvrirles (1×) | couvrir les |
| `/responsabilite-medicale/` | espace manquante | maisquelles (1×) | mais quelles |
| `/rimouski/` | coquille | corolaire (1×) | corollaire |
| `/role-regie-du-batiment/` | coquille | gouvernmental (1×) | gouvernemental |
| `/role-regie-du-batiment/` | coquille | offfertes (1×) | offertes |
| `/role-regie-du-batiment/` | coquille | partenair (1×) | partenaire |
| `/role-regie-du-batiment/` | coquille | réglements (1×) | règlements |
| `/saint-hyacinthe/` | coquille | Saint-Hyacintheav (1×) | Saint-Hyacinthe |
| `/service-daide-a-lhomologation/` | coquille | Besoinavoca (1×) | Besoinavocat |
| `/service-daide-a-lhomologation/` | espace manquante | alimentaireet (1×) | alimentaire et |
| `/taux-interet-criminel/` | coquille | Besoinavoca (1×) | Besoinavocat |
| `/terrebonne/` | coquille | Terrebonneav (1×) | Terrebonne |
| `/top-10-avocat-fiscaliste/` | coquille | Mskowitz (1×) | Moskowitz |
| `/top-5-avocat-criminel/` | espace manquante | défensereconnus (1×) | défense reconnus |
| `/trouver-un-cabinet-davocats-a-montreal/` | mots collés | ribunal compétent Revenu Québec Cour du QuébecPetites créances Agence du revenu du Canada Cour | ribunal compétent Revenu Québec Cour du Québec – Petites créances Agence du revenu du Canada Cour |
| `/trouver-un-cabinet-davocats-a-montreal/` | reste de copier-coller Word | s aide à trouver un avocat rapidement à Montréal, quels que soient vos besoins !Bottom of Form Engager un avocat près de chez vous vous perme | s aide à trouver un avocat rapidement à Montréal, quels que soient vos besoins ! Engager un avocat près de chez vous vous perme |
| `/trouver-un-cabinet-davocats-a-montreal/` | espace manquante après la ponctuation | 2 endroit(s) |  |
| `/verification-rdprm-et-carfax/` | liste collée | quement et occupent un espace dans le monde réel, tels queDeséquipementsDes outilsDes véhiculesDes animaux Les biens incorporels, dépourvus de forme physique, possèdent une valeu | quement et occupent un espace dans le monde réel, tels que :des équipements;des outils;des véhicules;des animaux.Les biens incorporels, dépourvus de forme physique, possèdent une valeu |
| `/verification-rdprm-et-carfax/` | liste collée | ou monétaire et englobent des actifs intangibles tels que :Des brevetsDes marques de commerceDes comptes clientsDes créancesDes droits d’auteurLe RDPRM offre aux acquére | ou monétaire et englobent des actifs intangibles tels que :des brevets;des marques de commerce;des comptes clients;des créances;des droits d’auteur.Le RDPRM offre aux acquére |
| `/voie-de-fait/` | coquille | Ains (1×) | Ainsi |
| `/waiver-americain/` | coquille | américan (1×) | américain |
| `/waiver-americain/` | espace manquante après la ponctuation | 2 endroit(s) |  |
| `/rediger-un-contrat-de-service-2/` | modèle de contrat en un seul paragraphe | « CONTRAT DE PRESTATION DE SERVICECe contrat… Objet du contratLe présent… SignatureFait à [Lieu] » | même texte, découpé en titre, parties, 11 sections et bloc de signature (contrôlé : aucun caractère perdu) |
| 3 pages (`/permis-conduire-suspendu-par-la-saaq/`, `/inscription-et-radiation-dune-hypotheque-legale/`, `/etapes-dun-proces-civil-au-quebec-en-2025/`) | accents décomposés (NFD) | 57 caractères | normalisés (NFC) : même affichage, recherche et copier-coller corrects |
| `/laval/`, `/montreal/` | lien officiel mort (404) | csj.qc.ca/…/volet-gratuit-aj/fr | https://www.csj.qc.ca/admissibilite/ (page actuelle des barèmes de la Commission des services juridiques) |
| `/logement/` | titre principal d’une autre page | Besoin d'un avocat spécialisé en propriété intellectuelle? | Besoin d'un avocat en droit du logement? (la page traite du logement) |
| 6 pages en double titre | titre d’onglet et de recherche identique à une autre page | « Succession », « Faillite et insolvabilité », « Logement », « Municipal », « Rédiger un contrat de service », « Responsabilité civile » | titres distincts pour `/avocat-droit-succession/`, `/faillite-et-insolvabilite-2/`, `/logement-2/`, `/municipal-2/`, `/rediger-un-contrat-de-service-2/`, `/responsabilite-civile-2/`; adresses inchangées |
