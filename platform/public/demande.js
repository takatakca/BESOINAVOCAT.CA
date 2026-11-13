/* BesoinAvocat request page. Same-origin intake only; never reads accounts, cookies or case documents.
   Guided request (2026-11-04): area of law, targeted questions, situation, other parties, urgency, legal aid,
   availability, contact, summary. The order of the steps follows the owner's model; the wording is BesoinAvocat's. */
(function (global) {
  'use strict';
  const CONSENT_VERSION = '2026-10-26.1';
  // Former detailed request without the guided steps; still accepted by the server, no longer sent by this page.
  const REQUEST_CONSENT_VERSION = '2026-10-27.1';
  const QUESTIONNAIRE_VERSION = '2026-11-04.1';
  const ENDPOINT = '/api/intake', CATALOG = '/api/catalog';
  const SUMMARY_MIN = 20, SUMMARY_MAX = 1500, NAMES_MAX = 300, MAX_SLOTS = 10, SLOT_DAYS = 14;
  // One day below the server bound so a visitor east of UTC is never refused.
  const DEADLINE_MAX_DAYS = 1829;
  const DOMAINS = {
    family: ['Famille et jeunesse', 'Family and youth'], business: ['Affaires et entreprises', 'Business'],
    criminal: ['Criminel et pénal', 'Criminal and penal'], 'real-estate': ['Immobilier', 'Real estate'],
    immigration: ['Immigration et citoyenneté', 'Immigration and citizenship'],
    administrative: ['Administratif (organismes publics)', 'Administrative (public bodies)'],
    liability: ['Responsabilité civile et dommages', 'Civil liability and damages'], employment: ['Travail et emploi', 'Employment'],
    civil: ['Civil et contrats', 'Civil and contracts'], tax: ['Fiscalité', 'Tax'],
    housing: ['Logement et bail', 'Housing and leases'], estates: ['Successions et testaments', 'Estates and wills'],
    rights: ['Droits et libertés', 'Rights and freedoms'], insolvency: ['Faillite et dettes', 'Bankruptcy and debt'],
    municipal: ['Municipal', 'Municipal'], other: ['Autre / je ne sais pas', 'Other / I do not know']
  };
  const REGIONS = {
    montreal: ['Montréal', 'Montréal'], laval: ['Laval', 'Laval'], monteregie: ['Montérégie', 'Montérégie'],
    'capitale-nationale': ['Capitale-Nationale', 'Capitale-Nationale'], outaouais: ['Outaouais', 'Outaouais'],
    laurentides: ['Laurentides', 'Laurentides'], lanaudiere: ['Lanaudière', 'Lanaudière'], estrie: ['Estrie', 'Estrie'],
    mauricie: ['Mauricie', 'Mauricie'], 'chaudiere-appalaches': ['Chaudière-Appalaches', 'Chaudière-Appalaches'],
    'centre-du-quebec': ['Centre-du-Québec', 'Centre-du-Québec'],
    'saguenay-lac-saint-jean': ['Saguenay–Lac-Saint-Jean', 'Saguenay–Lac-Saint-Jean'],
    'bas-saint-laurent': ['Bas-Saint-Laurent', 'Bas-Saint-Laurent'],
    'abitibi-temiscamingue': ['Abitibi-Témiscamingue', 'Abitibi-Témiscamingue'], 'cote-nord': ['Côte-Nord', 'Côte-Nord'],
    'nord-du-quebec': ['Nord-du-Québec', 'Nord-du-Québec'],
    'gaspesie-iles-de-la-madeleine': ['Gaspésie–Îles-de-la-Madeleine', 'Gaspésie–Îles-de-la-Madeleine'],
    ontario: ['Ontario', 'Ontario'],
    'outside-quebec': ['Autre province ou territoire', 'Other province or territory']
  };
  const STAGES = {
    none: ['Aucune procédure en cours', 'No proceeding under way'], considering: ['Une procédure est envisagée', 'A proceeding is being considered'],
    ongoing: ['Une procédure est en cours', 'A proceeding is under way'], decided: ['Une décision a été rendue', 'A decision has been rendered'],
    unknown: ['Je ne sais pas', 'I do not know']
  };
  const OBJECTIVES = {
    understand: ['Comprendre mes options', 'Understand my options'], represent: ['Être représenté·e', 'Be represented'],
    document: ['Faire préparer ou réviser un document', 'Have a document prepared or reviewed'],
    settle: ['Négocier ou régler un différend', 'Negotiate or settle a dispute'], other: ['Autre', 'Other']
  };
  const URGENCIES = {
    immediate: ['Moins de 48 heures', 'Within 48 hours'], week: ['Dans la semaine', 'Within a week'], month: ['Dans le mois', 'Within a month'],
    flexible: ['Pas d’urgence particulière', 'No particular urgency'], unknown: ['Je ne sais pas', 'I do not know']
  };
  const CONTACT_PREFERENCES = { email: ['Par courriel', 'By email'], phone: ['Par téléphone', 'By phone'] };
  const DEADLINE_CHOICES = { yes: ['Oui', 'Yes'], no: ['Non, ou je ne sais pas', 'No, or I do not know'] };
  const PLANS = { weekly: ['100 CAD / semaine', '100 CAD / week'], monthly: ['300 CAD / mois', '300 CAD / month'] };
  // Shared steps; the same identifiers and labels are published by the server (questionnaire.flow).
  const OTHER_PARTY_STATUSES = { named: ['Je connais le nom', 'I know the name'], none: ['Aucune autre partie', 'No other party'], unknown: ['Je ne sais pas encore', 'I do not know yet'] };
  const LEGAL_AID_INTEREST = {
    check: ['Je souhaite vérifier si l’aide juridique peut s’appliquer', 'I would like to check whether legal aid may apply'],
    private: ['Je cherche un avocat en pratique privée', 'I am looking for a lawyer in private practice'], unsure: ['Je ne sais pas', 'I do not know']
  };
  const HOUSEHOLDS = {
    single: ['Personne seule', 'Single person'], single_children: ['Personne seule avec enfant(s) à charge', 'Single person with dependent child(ren)'],
    couple: ['Couple sans enfant à charge', 'Couple without dependent children'], couple_children: ['Couple avec enfant(s) à charge', 'Couple with dependent child(ren)'],
    undisclosed: ['Je préfère ne pas répondre', 'I prefer not to answer']
  };
  const INCOMES = {
    under_30000: ['Moins de 30 000 $', 'Under $30,000'], '30000_44999': ['30 000 $ à 44 999 $', '$30,000 to $44,999'],
    '45000_59999': ['45 000 $ à 59 999 $', '$45,000 to $59,999'], '60000_84999': ['60 000 $ à 84 999 $', '$60,000 to $84,999'],
    '85000_149999': ['85 000 $ à 149 999 $', '$85,000 to $149,999'], '150000_plus': ['150 000 $ ou plus', '$150,000 or more'],
    undisclosed: ['Je préfère ne pas répondre', 'I prefer not to answer']
  };
  const PERIODS = { morning: ['Matin', 'Morning'], noon: ['Midi', 'Noon'], afternoon: ['Après-midi', 'Afternoon'], evening: ['Soir', 'Evening'] };
  const AVAILABILITY_MODES = { asap: ['Le plus tôt possible', 'As soon as possible'], slots: ['Je choisis mes disponibilités', 'I will choose my availability'] };
  const CONTACT_TIMES = { asap: ['Dès que possible', 'As soon as possible'], morning: ['Matin', 'Morning'], noon: ['Midi', 'Noon'], afternoon: ['Après-midi', 'Afternoon'], evening: ['Soir', 'Evening'] };
  // No opposing party to check in criminal or immigration matters; no legal aid question for a business.
  const SKIP_PARTIES = ['criminal', 'immigration'], SKIP_LEGAL_AID = ['business'];
  const STEP_ORDER = ['domain', 'details', 'situation', 'parties', 'timing', 'legalAid', 'availability', 'preferences', 'contact', 'review'];
  const FIELD_STEPS = { domain: 'domain', questionnaire: 'details', stage: 'situation', objective: 'situation', summary: 'situation',
    otherPartiesStatus: 'parties', otherPartiesNames: 'parties', urgency: 'timing', hasDeadline: 'timing', deadline: 'timing',
    legalAidInterest: 'legalAid', household: 'legalAid', income: 'legalAid', availabilityMode: 'availability', slots: 'availability',
    periodicity: 'preferences', reviewed: 'review' };
  const URGENT_LINKS = [['https://www.barreau.qc.ca/fr/grand-public/acces-justice/besoin-avocat/', 'urgentBarreau'], ['https://www.csj.qc.ca/', 'urgentLegalAid']];
  const COPY = {
    fr: {
      steps: ['Domaine de droit', 'Questions ciblées', 'Votre situation', 'Autres parties', 'Urgence', 'Aide juridique', 'Disponibilités', 'Région et formule', 'Coordonnées', 'Récapitulatif'],
      progress: 'Progression de la demande', step: 'Étape', of: 'sur',
      domainTitle: 'Dans quel domaine de droit se situe votre situation ?', domainHint: 'Choisissez le domaine le plus proche. Si vous hésitez, choisissez « Autre / je ne sais pas » : nous préciserons avec vous.',
      domainTitlePro: 'Dans quel domaine pratiquez-vous ?', domainHintPro: 'Choisissez votre domaine principal. Vous pourrez préciser vos autres domaines plus tard.',
      switchToPro: 'Vous êtes avocat ou avocate ? Signalez votre intérêt pour l’espace professionnel', switchToClient: 'Vous cherchez plutôt un avocat ? Revenir à la demande de client',
      detailsTitle: 'Quelques questions adaptées à votre domaine.', detailsHint: 'Seules les questions utiles à votre choix apparaissent. Vous pouvez choisir « Je ne sais pas »; aucune conclusion juridique n’est déduite de vos réponses.',
      situationTitle: 'Expliquez brièvement votre situation.', situationHint: 'Quelques lignes suffisent. Ce résumé reste confidentiel et sert à orienter votre demande vers la bonne personne.',
      stage: 'Où en est votre dossier ?', objective: 'Que souhaitez-vous obtenir ?', summary: 'Résumé de votre situation',
      summaryHint: 'Indiquez les faits utiles, ce qui s’est passé récemment et ce que vous souhaitez obtenir, en 20 à 1 500 caractères.',
      summaryAvoid: 'N’indiquez pas de numéro d’assurance sociale, de renseignements bancaires, de mot de passe, ni de détails médicaux ou concernant d’autres personnes qui ne sont pas nécessaires. Ne joignez aucun document.',
      summaryCount: 'caractères sur 1 500',
      partiesTitle: 'Qui est l’autre partie ?', partiesHint: 'Un avocat ne peut pas représenter deux parties opposées. Le nom de la personne ou de l’entreprise visée sert uniquement à vérifier qu’il n’y a pas de conflit d’intérêts.',
      otherPartiesStatus: 'Connaissez-vous le nom de l’autre partie ?', otherPartiesNames: 'Nom de la ou des autres parties',
      otherPartiesNamesHint: 'Par exemple le nom de l’employeur, du propriétaire, de l’entreprise ou de l’ex-conjoint. Séparez les noms par des virgules.',
      timingTitle: 'Y a-t-il une urgence ou une échéance ?', timingHint: 'Indiquez dans quel délai vous avez besoin d’aide et, si vous la connaissez, la date d’une audience ou d’un délai à respecter.',
      urgency: 'Dans quel délai avez-vous besoin d’aide ?', hasDeadline: 'Avez-vous une échéance connue ?', deadline: 'Date de l’échéance',
      deadlineHint: 'Par exemple une audience, une mise en demeure ou un délai de réponse.', noDeadline: 'Aucune échéance indiquée',
      urgentTitle: 'Besoin d’aide en moins de 48 heures ?',
      urgentText: 'BesoinAvocat ne traite pas les urgences et ne garantit aucun délai de réponse. En cas de danger immédiat, composez le 911. Si vous êtes arrêté·e ou détenu·e, vous avez le droit d’avoir recours sans délai à l’assistance d’un avocat : demandez-le. Pour une audience ou un délai imminent, contactez directement un avocat.',
      urgentBarreau: 'Barreau du Québec — Besoin d’un avocat', urgentLegalAid: 'Commission des services juridiques — aide juridique',
      legalAidTitle: 'Souhaitez-vous vérifier l’aide juridique ?', legalAidHint: 'L’aide juridique est un programme public offert selon le revenu et la composition du ménage. Ces réponses aident notre équipe à vous orienter; elles ne constituent pas une décision d’admissibilité.',
      legalAidInterest: 'Quel type d’avocat recherchez-vous ?', household: 'Composition de votre ménage', income: 'Revenu annuel approximatif du ménage',
      legalAidNote: 'Seule la Commission des services juridiques ou un bureau d’aide juridique peut confirmer votre admissibilité.', legalAidLink: 'En savoir plus sur l’aide juridique',
      availabilityTitle: 'Quand êtes-vous disponible pour un premier échange ?', availabilityHint: 'Ces disponibilités nous aident à planifier l’appel. Elles ne réservent aucun rendez-vous.',
      availabilityMode: 'Vos disponibilités', slotsLegend: 'Choisissez de 1 à 10 plages', slotsCount: 'plages choisies sur 10',
      preferencesTitle: 'Votre région et la formule qui vous intéresse', preferencesHint: 'Ces renseignements orientent votre intérêt. Ils ne créent aucun abonnement.',
      domain: 'Domaine de droit', region: 'Région', regionClient: 'Votre région', regionRemote: 'Région où vous souhaitez un avocat', choose: 'Choisir une option', plan: 'Formule qui vous intéresse',
      planHint: 'Choix indicatif seulement : aucun abonnement, paiement ou engagement à cette étape. Crédits IA en supplément, prix à définir.',
      contactTitle: 'Dernière étape : comment vous joindre ?', contactHint: 'Vos coordonnées servent uniquement à vous recontacter au sujet de cette demande.',
      name: 'Nom complet', email: 'Courriel', phone: 'Téléphone (facultatif)', phoneRequired: 'Téléphone', contactPreference: 'Moyen de contact préféré',
      acceptRemote: 'J’accepte d’être servi·e à distance, même par un avocat situé hors de ma région', acceptRemoteHint: 'Cette option élargit le choix des professionnels qui peuvent vous aider.',
      contactTimes: 'Meilleurs moments pour vous joindre (facultatif)',
      consent: 'Je consens à ce que BesoinAvocat conserve ces coordonnées et catégories pour traiter ma demande de contact. Je ne transmets aucun récit juridique ni document. Cet envoi ne crée ni mandat, ni abonnement, ni paiement.',
      flowConsent: 'Je consens à ce que BesoinAvocat conserve mes coordonnées, mes réponses, le résumé de ma situation, le nom des autres parties que j’indique, mes renseignements sur l’aide juridique et mes disponibilités pour traiter ma demande, vérifier l’absence de conflit d’intérêts et me recontacter. Je n’inclus aucun document, numéro d’identification ou renseignement de santé non nécessaire. Cet envoi ne crée ni mandat, ni relation avocat-client, ni attribution d’avocat, ni abonnement, ni paiement.',
      consentHint: 'Ce consentement ne vaut ni mandat juridique, ni abonnement, ni inscription à une infolettre.', privacy: 'Lire la politique de confidentialité',
      reviewTitle: 'Relisez avant d’envoyer.', reviewHint: 'Seuls les éléments ci-dessous seront transmis. Ils ne seront jamais publiés.',
      reviewDomain: 'Domaine de droit', reviewDetails: 'Réponses aux questions ciblées', reviewSituation: 'Situation', reviewParties: 'Autres parties',
      reviewTiming: 'Urgence et échéance', reviewLegalAid: 'Aide juridique', reviewAvailability: 'Disponibilités', reviewPreferences: 'Région et formule', reviewContact: 'Coordonnées',
      reviewConfirm: 'J’ai relu ces réponses et je confirme qu’elles correspondent à la demande que je souhaite transmettre.',
      role: 'Parcours', clientShort: 'Client', professionalShort: 'Avocat', language: 'Langue de suivi', fr: 'Français', en: 'Anglais',
      price: 'Tarif', free: 'Demande gratuite — honoraires de l’avocat distincts', yes: 'Oui', no: 'Non', notAsked: 'Non demandé pour ce domaine',
      summaryConsent: 'Consentement', agreed: 'Accepté', required: 'Obligatoire', optionalEmpty: 'Non renseigné',
      paidServices: 'La demande initiale de contact est gratuite. Les futurs services du dossier et de l’IA pourront être payants selon le volume; leurs prix et conditions restent à définir. Aucun achat n’est effectué ici.',
      editSection: 'Modifier', backToReview: 'Revenir au récapitulatif', previous: 'Retour', next: 'Continuer',
      submit: 'Envoyer ma demande', sending: 'Envoi en cours…', submitChanged: 'Envoyer la demande modifiée',
      received: 'Votre demande a été reçue.', reference: 'Votre référence',
      receivedHint: 'Conservez cette référence. La réception ne confirme ni rendez-vous, ni acceptation d’un mandat, ni création de compte ou d’abonnement. Aucun délai de réponse n’est garanti.',
      noDocuments: 'Ne transmettez aucun document pour l’instant. Cette demande ne crée pas de compte.',
      restart: 'Préparer une autre demande', call: 'Appeler le 514 825-2825', errorTitle: 'Un point à vérifier',
      loading: 'Vérification de la réception en ligne…',
      closedTitle: 'Réception en ligne pas encore ouverte',
      closed: 'Vous pouvez parcourir les questions, mais rien ne sera envoyé pour l’instant. Pour une demande aujourd’hui, appelez BesoinAvocat au 514 825-2825.',
      reviewEmpty: 'Coordonnées non recueillies : la réception en ligne n’est pas encore ouverte.',
      missingDomain: 'Choisissez un domaine de droit.', missingRegion: 'Choisissez une région.', missingPlan: 'Choisissez une formule indicative.',
      missingQuestionnaire: 'Répondez aux questions affichées pour votre domaine.', reviewRequired: 'Relisez le récapitulatif puis confirmez les réponses à transmettre.',
      missingStage: 'Indiquez où en est votre dossier.', missingObjective: 'Indiquez ce que vous souhaitez obtenir.',
      invalidSummary: 'Décrivez votre situation en 20 à 1 500 caractères, sans chevrons (< >).',
      missingParties: 'Indiquez si vous connaissez le nom de l’autre partie.', invalidPartyNames: 'Indiquez le ou les noms en 1 à 300 caractères, sans chevrons (< >).',
      missingUrgency: 'Indiquez dans quel délai vous avez besoin d’aide.',
      missingDeadlineChoice: 'Indiquez si vous avez une échéance connue.', invalidDeadline: 'Choisissez une date réelle, entre aujourd’hui et dans cinq ans.',
      missingLegalAid: 'Indiquez le type d’avocat recherché.', missingHousehold: 'Indiquez la composition de votre ménage, ou « Je préfère ne pas répondre ».',
      missingIncome: 'Indiquez une tranche de revenu, ou « Je préfère ne pas répondre ».',
      missingAvailability: 'Indiquez vos disponibilités.', invalidSlots: 'Choisissez de 1 à 10 plages parmi les jours proposés.', tooManySlots: 'Vous pouvez choisir au plus 10 plages.',
      invalidName: 'Saisissez un nom de 1 à 120 caractères, sans chevrons ni caractères de contrôle.',
      invalidEmail: 'Saisissez une adresse courriel valide (254 caractères maximum).',
      invalidPhone: 'Vérifiez le numéro : de 7 à 15 chiffres, avec +, espaces, parenthèses, points ou tirets uniquement.',
      missingContactPreference: 'Choisissez un moyen de contact.', phoneMissing: 'Indiquez un numéro de téléphone pour être joint par téléphone.',
      consentRequired: 'Votre accord est nécessaire pour envoyer cette demande.', invalidInput: 'Vérifiez les renseignements saisis avant de réessayer.',
      serviceUnavailable: 'La réception est momentanément indisponible. Vous pouvez appeler le 514 825-2825.',
      forbidden: 'Cette page n’est pas autorisée à envoyer la demande. Veuillez appeler BesoinAvocat.',
      rateLimit: 'Trop de tentatives rapprochées. Patientez avant de réessayer, ou appelez BesoinAvocat.',
      conflict: 'Cette tentative ne correspond plus aux renseignements préparés. Modifiez un renseignement avant de réessayer, ou appelez BesoinAvocat.',
      uncertain: 'Nous ne pouvons pas confirmer la réception. Vous pouvez réessayer avec les mêmes renseignements : la même référence de tentative sera conservée pour éviter un double envoi.',
      secureUnavailable: 'L’envoi sécurisé n’est pas disponible dans ce navigateur. Veuillez appeler BesoinAvocat.',
      retryLanguage: 'La langue de suivi reste celle de la première tentative, pour permettre une reprise sans double envoi.',
      changedAttempt: 'La réception de la tentative précédente reste inconnue. Vous avez changé des renseignements : cet envoi créera une nouvelle demande et peut faire doublon avec la précédente.',
      website: 'Laisser ce champ vide', title: 'Préparer mon dossier pour trouver mon avocat — demande gratuite | BesoinAvocat'
    },
    en: {
      steps: ['Area of law', 'Targeted questions', 'Your situation', 'Other parties', 'Urgency', 'Legal aid', 'Availability', 'Region and plan', 'Contact details', 'Summary'],
      progress: 'Request progress', step: 'Step', of: 'of',
      domainTitle: 'Which area of law does your situation concern?', domainHint: 'Choose the closest area. If you are unsure, choose “Other / I do not know”: we will clarify it with you.',
      domainTitlePro: 'Which area do you practise in?', domainHintPro: 'Choose your main area. You can add your other areas later.',
      switchToPro: 'Are you a lawyer? Express your interest in the professional workspace', switchToClient: 'Looking for a lawyer instead? Back to the client request',
      detailsTitle: 'A few questions for your area of law.', detailsHint: 'Only questions relevant to your selection appear. You can choose “I do not know”; your answers do not produce a legal conclusion.',
      situationTitle: 'Briefly explain your situation.', situationHint: 'A few lines are enough. This summary stays confidential and is used to route your request to the right person.',
      stage: 'Where does your matter stand?', objective: 'What would you like to achieve?', summary: 'Summary of your situation',
      summaryHint: 'Give the useful facts, what happened recently and what you would like to achieve, in 20 to 1,500 characters.',
      summaryAvoid: 'Do not include your social insurance number, banking information, passwords, or medical details or details about other people that are not necessary. Do not attach any document.',
      summaryCount: 'characters of 1,500',
      partiesTitle: 'Who is the other party?', partiesHint: 'A lawyer cannot represent two opposing parties. The name of the person or business involved is used only to check for conflicts of interest.',
      otherPartiesStatus: 'Do you know the other party’s name?', otherPartiesNames: 'Name of the other party or parties',
      otherPartiesNamesHint: 'For example the employer, landlord, business or former partner. Separate names with commas.',
      timingTitle: 'Is there any urgency or deadline?', timingHint: 'Tell us how soon you need help and, if you know it, the date of a hearing or of a deadline to meet.',
      urgency: 'How soon do you need help?', hasDeadline: 'Do you have a known deadline?', deadline: 'Deadline date',
      deadlineHint: 'For example a hearing, a formal notice or a time limit to respond.', noDeadline: 'No deadline given',
      urgentTitle: 'Need help within 48 hours?',
      urgentText: 'BesoinAvocat does not handle emergencies and does not guarantee any response time. In case of immediate danger, call 911. If you are arrested or detained, you have the right to retain and instruct counsel without delay: ask for it. For an imminent hearing or deadline, contact a lawyer directly.',
      urgentBarreau: 'Barreau du Québec — Need a lawyer (in French)', urgentLegalAid: 'Commission des services juridiques — legal aid (in French)',
      legalAidTitle: 'Would you like to check legal aid?', legalAidHint: 'Legal aid is a public program offered according to income and household size. These answers help our team guide you; they are not an eligibility decision.',
      legalAidInterest: 'What kind of lawyer are you looking for?', household: 'Your household', income: 'Approximate annual household income',
      legalAidNote: 'Only the Commission des services juridiques or a legal aid office can confirm your eligibility.', legalAidLink: 'Learn more about legal aid (in French)',
      availabilityTitle: 'When are you available for a first conversation?', availabilityHint: 'Your availability helps us plan the call. It does not book an appointment.',
      availabilityMode: 'Your availability', slotsLegend: 'Choose 1 to 10 time slots', slotsCount: 'time slots chosen of 10',
      preferencesTitle: 'Your region and the plan you are interested in', preferencesHint: 'This information guides your expression of interest. It does not create a subscription.',
      domain: 'Area of law', region: 'Region', regionClient: 'Your region', regionRemote: 'Region where you would like a lawyer', choose: 'Choose an option', plan: 'Option you are interested in',
      planHint: 'Indication of interest only: no subscription, payment or commitment at this step. AI credits are extra, pricing to be defined.',
      contactTitle: 'Last step: how can we reach you?', contactHint: 'Your contact details are used only to contact you about this request.',
      name: 'Full name', email: 'Email', phone: 'Phone (optional)', phoneRequired: 'Phone', contactPreference: 'Preferred contact method',
      acceptRemote: 'I accept being served remotely, even by a lawyer outside my region', acceptRemoteHint: 'This option widens the choice of professionals who can help you.',
      contactTimes: 'Best times to reach you (optional)',
      consent: 'I consent to BesoinAvocat storing these contact details and categories to process my contact request. I am not submitting a legal account or document. This submission does not create a legal engagement, subscription or payment.',
      flowConsent: 'I consent to BesoinAvocat storing my contact details, answers, the summary of my situation, the names of the other parties I provide, my legal aid information and my availability to process my request, check for conflicts of interest and contact me. I am not including any document, identification number or unnecessary health information. This submission does not create a legal mandate, lawyer-client relationship, lawyer assignment, subscription or payment.',
      consentHint: 'This consent is not a legal mandate, subscription or newsletter signup.', privacy: 'Read the privacy policy',
      reviewTitle: 'Review before sending.', reviewHint: 'Only the items below will be sent. They will never be published.',
      reviewDomain: 'Area of law', reviewDetails: 'Answers to targeted questions', reviewSituation: 'Situation', reviewParties: 'Other parties',
      reviewTiming: 'Urgency and deadline', reviewLegalAid: 'Legal aid', reviewAvailability: 'Availability', reviewPreferences: 'Region and plan', reviewContact: 'Contact details',
      reviewConfirm: 'I have reviewed these answers and confirm they match the request I want to submit.',
      role: 'Path', clientShort: 'Client', professionalShort: 'Lawyer', language: 'Follow-up language', fr: 'French', en: 'English',
      price: 'Price', free: 'Free request — the lawyer’s fees are separate', yes: 'Yes', no: 'No', notAsked: 'Not asked for this area of law',
      summaryConsent: 'Consent', agreed: 'Accepted', required: 'Required', optionalEmpty: 'Not provided',
      paidServices: 'The initial contact request is free. Future case and AI services may be paid according to usage volume; their prices and terms remain to be defined. No purchase is made here.',
      editSection: 'Edit', backToReview: 'Back to the summary', previous: 'Back', next: 'Continue',
      submit: 'Send my request', sending: 'Sending…', submitChanged: 'Send the changed request',
      received: 'Your request has been received.', reference: 'Your reference',
      receivedHint: 'Keep this reference. Receipt does not confirm an appointment, acceptance of a legal mandate, or creation of an account or subscription. No response time is guaranteed.',
      noDocuments: 'Do not send any document for now. This request does not create an account.',
      restart: 'Prepare another request', call: 'Call 514 825-2825', errorTitle: 'Please check',
      loading: 'Checking online intake…',
      closedTitle: 'Online intake is not open yet',
      closed: 'You may explore the questions, but nothing will be sent for now. To make a request today, call BesoinAvocat at 514 825-2825.',
      reviewEmpty: 'No contact details collected: online intake is not open yet.',
      missingDomain: 'Choose an area of law.', missingRegion: 'Choose a region.', missingPlan: 'Choose an indicative plan.',
      missingQuestionnaire: 'Answer the questions displayed for your area of law.', reviewRequired: 'Read the summary and confirm the answers to be submitted.',
      missingStage: 'Tell us where your matter stands.', missingObjective: 'Tell us what you would like to achieve.',
      invalidSummary: 'Describe your situation in 20 to 1,500 characters, without angle brackets (< >).',
      missingParties: 'Tell us whether you know the other party’s name.', invalidPartyNames: 'Enter the name or names in 1 to 300 characters, without angle brackets (< >).',
      missingUrgency: 'Tell us how soon you need help.',
      missingDeadlineChoice: 'Tell us whether you have a known deadline.', invalidDeadline: 'Choose a real date between today and five years from now.',
      missingLegalAid: 'Tell us what kind of lawyer you are looking for.', missingHousehold: 'Tell us about your household, or choose “I prefer not to answer”.',
      missingIncome: 'Choose an income range, or “I prefer not to answer”.',
      missingAvailability: 'Tell us about your availability.', invalidSlots: 'Choose 1 to 10 time slots among the days offered.', tooManySlots: 'You can choose at most 10 time slots.',
      invalidName: 'Enter a name of 1 to 120 characters, without angle brackets or control characters.',
      invalidEmail: 'Enter a valid email address (254 characters maximum).',
      invalidPhone: 'Check the phone number: 7 to 15 digits, using only +, spaces, parentheses, periods or hyphens.',
      missingContactPreference: 'Choose a contact method.', phoneMissing: 'Enter a phone number to be contacted by phone.',
      consentRequired: 'Your consent is required to send this request.', invalidInput: 'Check the information entered before trying again.',
      serviceUnavailable: 'Intake is temporarily unavailable. You may call 514 825-2825.',
      forbidden: 'This page is not authorized to send the request. Please call BesoinAvocat.',
      rateLimit: 'Too many attempts in a short time. Wait before trying again, or call BesoinAvocat.',
      conflict: 'This attempt no longer matches the prepared information. Change a detail before trying again, or call BesoinAvocat.',
      uncertain: 'We cannot confirm receipt. You may retry with the same information: the same attempt reference will be kept to avoid a duplicate submission.',
      secureUnavailable: 'Secure sending is unavailable in this browser. Please call BesoinAvocat.',
      retryLanguage: 'The follow-up language remains that of the first attempt, so a retry does not create a duplicate.',
      changedAttempt: 'Receipt of the previous attempt is still unknown. You changed some details: sending now will create a new request and may duplicate the previous one.',
      website: 'Leave this field empty', title: 'Prepare my file to find my lawyer — free request | BesoinAvocat'
    }
  };
  const ERROR_KEYS = {
    INTAKE_UNAVAILABLE: 'serviceUnavailable', INTAKE_FORBIDDEN: 'forbidden', INTAKE_INVALID_INPUT: 'invalidInput',
    INTAKE_CONSENT_REQUIRED: 'consentRequired', INTAKE_RATE_LIMIT: 'rateLimit', IDEMPOTENCY_CONFLICT: 'conflict',
    QUESTIONNAIRE_INVALID_INPUT: 'invalidInput', QUESTIONNAIRE_REVIEW_REQUIRED: 'reviewRequired'
  };
  const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const languageOf = (value) => value === 'en' ? 'en' : 'fr';
  const labelOf = (choices, key, language) => has(choices, key) ? choices[key][language === 'en' ? 1 : 0] : '';

  function initialState(role, language, requestMode) {
    return { role: role === 'professional' || role === 'lawyer' ? 'professional' : 'client', language: languageOf(language),
      requestMode: requestMode === true, preview: false, step: 'domain', domain: '', region: '', periodicity: 'monthly',
      stage: '', objective: '', summary: '', otherPartiesStatus: '', otherPartiesNames: '', urgency: '', hasDeadline: '', deadline: '',
      legalAidInterest: '', household: '', income: '', availabilityMode: '', slots: [],
      contactPreference: 'email', name: '', email: '', phone: '', acceptRemote: false, contactTimes: [], consent: false, website: '',
      pending: false, error: '', errorField: '', receipt: '', requestLanguage: '', uncertainBody: '', returnToReview: false,
      questionnaireSchema: null, answers: {}, reviewed: false };
  }
  // The guided client request: sent when the server opens it, or shown as a preview while intake is closed.
  function guided(state) { return state.role === 'client' && (state.requestMode === true || state.preview === true); }
  function detailed(state) { return guided(state); }
  function branched(state) { return guided(state) && !!state.questionnaireSchema; }
  function partiesAsked(state) { return guided(state) && !SKIP_PARTIES.includes(state.domain); }
  function legalAidAsked(state) { return guided(state) && !SKIP_LEGAL_AID.includes(state.domain); }
  function branchQuestions(state) {
    const definition = state.questionnaireSchema && state.questionnaireSchema.domains[state.domain];
    return definition ? definition.questions.filter((item) => !item.when || (has(state.answers, item.when.field) && item.when.values.includes(state.answers[item.when.field]))) : [];
  }
  function stepsFor(state) {
    if (state.role === 'professional') return ['domain', 'preferences', 'contact', 'review'];
    if (!guided(state)) return ['domain', 'contact', 'review'];
    return STEP_ORDER.filter((id) => id === 'details' ? branched(state) && branchQuestions(state).length > 0
      : id === 'parties' ? partiesAsked(state) : id === 'legalAid' ? legalAidAsked(state) : id !== 'preferences');
  }
  function consentVersionFor(state) { return guided(state) ? QUESTIONNAIRE_VERSION : CONSENT_VERSION; }
  function pruneBranchAnswers(state) {
    const clean = {};
    for (const item of branchQuestions(state)) {
      if (item.when && !item.when.values.includes(clean[item.when.field])) continue;
      if (has(state.answers, item.id) && item.options.some((option) => option.id === state.answers[item.id])) clean[item.id] = state.answers[item.id];
    }
    state.answers = clean;
    return clean;
  }
  function setDomain(state, domain) {
    if (state.domain !== domain) {
      state.domain = domain; state.answers = {}; state.reviewed = false;
      // Answers to a step that the new area of law does not ask are not kept.
      if (SKIP_PARTIES.includes(domain)) { state.otherPartiesStatus = ''; state.otherPartiesNames = ''; }
      if (SKIP_LEGAL_AID.includes(domain)) { state.legalAidInterest = ''; state.household = ''; state.income = ''; }
    }
  }
  function setBranchAnswer(state, id, value) {
    if (!branched(state) || !branchQuestions(state).some((item) => item.id === id)) return false;
    state.answers[id] = value; pruneBranchAnswers(state); state.reviewed = false; return true;
  }
  function branchFailure(state) {
    if (!branched(state)) return null;
    const questions = branchQuestions(state);
    if (Object.keys(state.answers).some((id) => !questions.some((item) => item.id === id))) return { field: 'questionnaire', key: 'missingQuestionnaire' };
    for (const item of questions) if (!has(state.answers, item.id) || !item.options.some((option) => option.id === state.answers[item.id])) return { field: 'questionnaire', question: item.id, key: 'missingQuestionnaire' };
    return null;
  }
  const FLOW_LISTS = [['otherParties.statuses', OTHER_PARTY_STATUSES], ['legalAid.interest', LEGAL_AID_INTEREST], ['legalAid.household', HOUSEHOLDS],
    ['legalAid.income', INCOMES], ['availability.periods', PERIODS], ['contactTimes', CONTACT_TIMES]];
  function questionnaireFrom(catalog) {
    const value = catalog && catalog.intake && catalog.intake.request && catalog.intake.request.questionnaire;
    if (!value) return null;
    const pair = (item) => item && ['fr', 'en'].every((lang) => typeof item[lang] === 'string' && item[lang].length > 0 && item[lang].length <= 1000);
    if (value.version !== QUESTIONNAIRE_VERSION || !value.consent || value.consent.version !== QUESTIONNAIRE_VERSION || !pair(value.consent.text) || !pair(value.review) ||
        !value.domains || Object.keys(value.domains).length !== Object.keys(DOMAINS).length || !value.flow) return null;
    // The shared steps are rendered from this page's lists; the server must publish exactly the same choices.
    for (const [path, list] of FLOW_LISTS) {
      const published = path.split('.').reduce((node, key) => node && node[key], value.flow);
      if (!Array.isArray(published) || published.map((item) => item && item.id).join('|') !== Object.keys(list).join('|')) return null;
    }
    for (const domain of Object.keys(DOMAINS)) {
      const questions = value.domains[domain] && value.domains[domain].questions;
      if (!Array.isArray(questions) || questions.length > 6) return null;
      const prior = new Set();
      for (const item of questions) {
        if (!item || !/^[a-zA-Z][a-zA-Z0-9]{0,39}$/.test(item.id) || prior.has(item.id) || item.type !== 'select' || item.required !== true || !pair(item.label) || !Array.isArray(item.options) || item.options.length < 1 || item.options.length > 10) return null;
        const values = new Set();
        for (const choice of item.options) {
          if (!choice || !/^[a-z0-9_]{1,40}$/.test(choice.id) || values.has(choice.id) || !pair(choice.label)) return null;
          values.add(choice.id);
        }
        if (item.when && (!prior.has(item.when.field) || !Array.isArray(item.when.values) || !item.when.values.length || item.when.values.some((id) => typeof id !== 'string'))) return null;
        prior.add(item.id);
      }
    }
    return JSON.parse(JSON.stringify(value));
  }
  function normalizeSummary(value) { return String(value || '').replace(/\r\n?/g, '\n').trim(); }
  function normalizeNames(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
  function dayNumber(date) { return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000); }
  function isoDay(day) { return new Date(day * 86400000).toISOString().slice(0, 10); }
  // Local calendar day of the visitor; the server accepts one more day on each side.
  function deadlineBounds(now) {
    const today = dayNumber(now || new Date());
    return { min: isoDay(today), max: isoDay(today + DEADLINE_MAX_DAYS) };
  }
  function validDeadline(value, now) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parts = value.split('-').map(Number);
    if (new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).toISOString().slice(0, 10) !== value) return false;
    const bounds = deadlineBounds(now);
    return value >= bounds.min && value <= bounds.max;
  }
  // The next 14 calendar days, from tomorrow, in the visitor's time zone.
  function availabilityDays(now) {
    const today = dayNumber(now || new Date());
    return Array.from({ length: SLOT_DAYS }, (_, index) => isoDay(today + 1 + index));
  }
  function validSlots(slots, now) {
    if (!Array.isArray(slots) || slots.length < 1 || slots.length > MAX_SLOTS || new Set(slots).size !== slots.length) return false;
    const days = availabilityDays(now);
    return slots.every((slot) => typeof slot === 'string' && /^\d{4}-\d{2}-\d{2}:[a-z]+$/.test(slot) && days.includes(slot.slice(0, 10)) && has(PERIODS, slot.slice(11)));
  }
  // Validates every step of the current path up to `through` (a step id; the whole path by default).
  function validate(state, through, now) {
    const steps = stepsFor(state);
    const limit = STEP_ORDER.indexOf(STEP_ORDER.includes(through) ? through : 'review');
    const checks = (id) => steps.includes(id) && STEP_ORDER.indexOf(id) <= limit;
    if (!['client', 'professional'].includes(state.role)) return { field: 'domain', key: 'missingDomain' };
    if (!has(DOMAINS, state.domain)) return { field: 'domain', key: 'missingDomain' };
    if (checks('details')) { const failure = branchFailure(state); if (failure) return failure; }
    if (checks('situation')) {
      if (!has(STAGES, state.stage)) return { field: 'stage', key: 'missingStage' };
      if (!has(OBJECTIVES, state.objective)) return { field: 'objective', key: 'missingObjective' };
      const summary = normalizeSummary(state.summary);
      if (summary.length < SUMMARY_MIN || summary.length > SUMMARY_MAX || /[<>\x00-\x08\x0b-\x1f\x7f-\x9f]/.test(summary)) return { field: 'summary', key: 'invalidSummary' };
    }
    if (checks('parties')) {
      if (!has(OTHER_PARTY_STATUSES, state.otherPartiesStatus)) return { field: 'otherPartiesStatus', key: 'missingParties' };
      const names = normalizeNames(state.otherPartiesNames);
      if (state.otherPartiesStatus === 'named' && (!names || names.length > NAMES_MAX || /[<>\x00-\x1f\x7f-\x9f]/.test(names))) return { field: 'otherPartiesNames', key: 'invalidPartyNames' };
    }
    if (checks('timing')) {
      if (!has(URGENCIES, state.urgency)) return { field: 'urgency', key: 'missingUrgency' };
      if (!has(DEADLINE_CHOICES, state.hasDeadline)) return { field: 'hasDeadline', key: 'missingDeadlineChoice' };
      if (state.hasDeadline === 'yes' && !validDeadline(state.deadline, now)) return { field: 'deadline', key: 'invalidDeadline' };
    }
    if (checks('legalAid')) {
      if (!has(LEGAL_AID_INTEREST, state.legalAidInterest)) return { field: 'legalAidInterest', key: 'missingLegalAid' };
      if (!has(HOUSEHOLDS, state.household)) return { field: 'household', key: 'missingHousehold' };
      if (!has(INCOMES, state.income)) return { field: 'income', key: 'missingIncome' };
    }
    if (checks('availability')) {
      if (!has(AVAILABILITY_MODES, state.availabilityMode)) return { field: 'availabilityMode', key: 'missingAvailability' };
      if (state.availabilityMode === 'slots' && !validSlots(state.slots, now)) return { field: 'slots', key: 'invalidSlots' };
    }
    if (checks('preferences')) {
      if (!has(REGIONS, state.region)) return { field: 'region', key: 'missingRegion' };
      if (!has(PLANS, state.periodicity)) return { field: 'periodicity', key: 'missingPlan' };
    }
    if (!checks('contact')) return null;
    if (state.role === 'client' && !has(REGIONS, state.region)) return { field: 'region', key: 'missingRegion' };
    const name = String(state.name || '').trim();
    const email = String(state.email || '').trim();
    const phone = String(state.phone || '').trim();
    if (!name || name.length > 120 || /[<>\x00-\x1f\x7f-\x9f]/.test(name)) return { field: 'name', key: 'invalidName' };
    const pieces = email.split('@');
    if (email.length > 254 || pieces.length !== 2 || pieces[0].length > 64 ||
        !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(email) ||
        pieces[0].startsWith('.') || pieces[0].endsWith('.') || pieces[0].includes('..')) return { field: 'email', key: 'invalidEmail' };
    if (phone && (phone.length > 32 || !/^[+0-9() .-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15)) return { field: 'phone', key: 'invalidPhone' };
    if (guided(state)) {
      if (!has(CONTACT_PREFERENCES, state.contactPreference)) return { field: 'contactPreference', key: 'missingContactPreference' };
      if (state.contactPreference === 'phone' && !phone) return { field: 'phone', key: 'phoneMissing' };
      if (typeof state.acceptRemote !== 'boolean' || !Array.isArray(state.contactTimes) || state.contactTimes.some((item) => !has(CONTACT_TIMES, item))) return { field: 'contactTimes', key: 'invalidInput' };
    }
    if (state.consent !== true) return { field: 'consent', key: 'consentRequired' };
    if (state.website) return { field: 'website', key: 'invalidInput' };
    if (guided(state) && checks('review') && state.reviewed !== true) return { field: 'reviewed', key: 'reviewRequired' };
    return null;
  }
  function payloadFrom(state) {
    if (validate(state)) throw new Error('Invalid intake state');
    const payload = { name: state.name.trim(), email: state.email.trim(), role: state.role, language: languageOf(state.requestLanguage || state.language), domain: state.domain, region: state.region };
    if (state.phone.trim()) payload.phone = state.phone.trim();
    if (state.role === 'professional') payload.periodicity = state.periodicity;
    if (guided(state)) {
      payload.contactPreference = state.contactPreference; payload.stage = state.stage; payload.objective = state.objective;
      payload.summary = normalizeSummary(state.summary); payload.urgency = state.urgency;
      if (state.hasDeadline === 'yes') payload.deadline = state.deadline;
      payload.questionnaire = { version: QUESTIONNAIRE_VERSION, answers: Object.fromEntries(branchQuestions(state).map((item) => [item.id, state.answers[item.id]])), reviewed: true };
      if (partiesAsked(state)) payload.otherParties = state.otherPartiesStatus === 'named' ? { status: 'named', names: normalizeNames(state.otherPartiesNames) } : { status: state.otherPartiesStatus };
      if (legalAidAsked(state)) payload.legalAid = { interest: state.legalAidInterest, household: state.household, income: state.income };
      payload.availability = state.availabilityMode === 'asap' ? { asap: true } : { slots: state.slots.slice().sort() };
      payload.contactTimes = Object.keys(CONTACT_TIMES).filter((item) => state.contactTimes.includes(item));
      payload.acceptRemote = state.acceptRemote;
    }
    payload.consent = true;
    payload.consentVersion = consentVersionFor(state);
    payload.website = '';
    return payload;
  }
  // Reads only the two booleans this page needs; consent versions must match the ones displayed here.
  function serviceFrom(catalog) {
    const intake = catalog && typeof catalog === 'object' ? catalog.intake : null;
    if (!intake || intake.enabled !== true || !intake.consent || intake.consent.version !== CONSENT_VERSION) return { open: false, requestMode: false };
    const request = intake.request;
    return { open: true, requestMode: !!request && request.enabled === true && !!request.questionnaire && !!request.questionnaire.consent && request.questionnaire.consent.version === QUESTIONNAIRE_VERSION };
  }
  // Only enumerated values are taken from the address bar; nothing personal is read from it.
  function preselection(search) {
    const out = {};
    try {
      const params = new URLSearchParams(search || '');
      const domain = params.get('domaine') || params.get('domain');
      if (domain && has(DOMAINS, domain)) out.domain = domain;
      const role = params.get('role');
      if (role === 'professional' || role === 'lawyer') out.role = 'professional';
      const plan = params.get('formule') || params.get('plan');
      if (plan && has(PLANS, plan)) { out.role = 'professional'; out.periodicity = plan; }
      const lang = params.get('lang');
      if (lang === 'en' || lang === 'fr') out.language = lang;
    } catch (_) { /* ignored */ }
    return out;
  }
  function uuidV4(cryptoObject) {
    if (!cryptoObject || typeof cryptoObject.getRandomValues !== 'function') throw new Error('secureUnavailable');
    if (typeof cryptoObject.randomUUID === 'function') {
      const value = cryptoObject.randomUUID();
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return value;
    }
    const bytes = cryptoObject.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  function changedUncertainAttempt(state) {
    // Show the new-request warning before the visitor confirms the review checkbox.
    const candidate = { ...state, reviewed: true };
    return !!state.uncertainBody && !validate(candidate) && JSON.stringify(payloadFrom(candidate)) !== state.uncertainBody;
  }
  function createAttempt(cryptoObject) {
    let previous = null;
    return { prepare(payload) {
      const body = JSON.stringify(payload);
      if (!previous || previous.body !== body) previous = { body, key: uuidV4(cryptoObject) };
      return { ...previous };
    }, clear() { previous = null; } };
  }
  function receiptFrom(responseStatus, value) {
    if (responseStatus !== 201 || !value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).length !== 2 || value.status !== 'received' || typeof value.reference !== 'string' ||
        !/^BA-[A-Za-z0-9_-]{24}$/.test(value.reference)) return '';
    return value.reference;
  }
  async function readSmallJson(response, maximum = 16384) {
    const stated = Number(response.headers && response.headers.get('Content-Length'));
    if (stated > maximum) throw new Error('uncertain');
    let text;
    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader(), chunks = []; let size = 0;
      try {
        for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength;
          if (size > maximum) { await reader.cancel(); throw new Error('uncertain'); } chunks.push(part.value); }
        const bytes = new Uint8Array(size); let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
        text = new TextDecoder().decode(bytes);
      } finally { reader.releaseLock(); }
    } else { text = await response.text(); if (text.length > maximum) throw new Error('uncertain'); }
    try { return JSON.parse(text); } catch (_) { throw new Error('uncertain'); }
  }
  async function sendRequest(attempt, fetchImpl) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      // credentials:'omit' keeps the portal session cookie out of the public intake.
      const response = await fetchImpl(ENDPOINT, { method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error',
        referrerPolicy: 'no-referrer', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'Idempotency-Key': attempt.key }, body: attempt.body });
      const value = await readSmallJson(response);
      const reference = receiptFrom(response.status, value);
      if (reference) return { reference };
      const code = value && value.error && value.error.code;
      return { error: has(ERROR_KEYS, code) ? ERROR_KEYS[code] : 'uncertain' };
    } catch (_) { return { error: 'uncertain' }; }
    finally { clearTimeout(timer); }
  }
  // The questionnaire is kept even while intake is closed, so the visitor can preview the whole path.
  async function loadService(fetchImpl) {
    try {
      const response = await fetchImpl(CATALOG, { credentials: 'omit', cache: 'no-store', redirect: 'error', headers: { Accept: 'application/json' } });
      if (response.status !== 200) return { open: false, requestMode: false };
      const catalog = await readSmallJson(response, 131072), service = serviceFrom(catalog);
      const schema = questionnaireFrom(catalog);
      if (service.requestMode && !schema) return { open: false, requestMode: false };
      return { ...service, ...(schema ? { questionnaireSchema: schema } : {}) };
    } catch (_) { return { open: false, requestMode: false }; }
  }

  function mount(root) {
    const view = root.querySelector('[data-ba-request-view]');
    if (!view || root.dataset.baMounted) return null;
    root.dataset.baMounted = 'true';
    const document = global.document;
    const preset = preselection(global.location && global.location.search);
    const state = initialState(preset.role, preset.language || document.documentElement.lang);
    if (preset.periodicity) state.periodicity = preset.periodicity;
    if (preset.domain) { setDomain(state, preset.domain); }
    const secure = !!global.crypto && typeof global.crypto.getRandomValues === 'function' && typeof global.fetch === 'function';
    let service = 'loading';
    const ready = () => service === 'open' && secure;
    const attempt = createAttempt(global.crypto);
    const text = (key) => COPY[state.language][key];
    const escaped = (key) => escapeHtml(text(key));
    const disabled = () => state.pending ? ' disabled' : '';
    const id = (name) => `ba-request-${name}`;
    const errorRef = (name) => state.errorField === name ? ' ba-request-error' : '';
    const invalid = (name) => state.errorField === name ? ' aria-invalid="true" aria-describedby="ba-request-error"' : '';
    const required = () => ` <small>${escaped('required')}</small>`;

    function options(choices, selected) {
      return `<option value="">${escaped('choose')}</option>` + Object.keys(choices).map((key) => `<option value="${escapeHtml(key)}"${key === selected ? ' selected' : ''}>${escapeHtml(labelOf(choices, key, state.language))}</option>`).join('');
    }
    function radios(name, choices, legendKey, modifier) {
      return `<fieldset class="ba-options${modifier ? ' ba-options--' + modifier : ''}"><legend>${escaped(legendKey)}${required()}</legend><div>${Object.keys(choices).map((key) => `<label class="ba-option${state[name] === key ? ' is-selected' : ''}"><input type="radio" name="${name}" value="${escapeHtml(key)}"${state[name] === key ? ' checked' : ''}${invalid(name)}${disabled()}><span>${escapeHtml(labelOf(choices, key, state.language))}</span></label>`).join('')}</div></fieldset>`;
    }
    function select(name, choices, labelKey, hint) {
      return `<div class="ba-field"><label for="${id(name)}">${escaped(labelKey)}${required()}</label>${hint || ''}<select id="${id(name)}" name="${name}" required${invalid(name)}${disabled()}>${options(choices, state[name])}</select></div>`;
    }
    function field(name, type, max, autocomplete) {
      const needed = name !== 'phone' || (guided(state) && state.contactPreference === 'phone');
      const label = name === 'phone' && needed ? text('phoneRequired') : text(name);
      return `<div class="ba-field"><label for="${id(name)}">${escapeHtml(label)}${needed ? required() : ''}</label><input id="${id(name)}" name="${name}" type="${type}" maxlength="${max}" autocomplete="${autocomplete}" value="${escapeHtml(state[name])}"${invalid(name)}${needed ? ' required' : ''}${!ready() ? ' disabled' : ''}${disabled()}></div>`;
    }
    function domainSection() {
      const tiles = Object.keys(DOMAINS).map((key) => `<button type="button" class="ba-domain${state.domain === key ? ' is-selected' : ''}${key === 'other' ? ' ba-domain--other' : ''}" data-ba-domain="${escapeHtml(key)}" aria-pressed="${state.domain === key}"${disabled()}>${escapeHtml(labelOf(DOMAINS, key, state.language))}</button>`).join('');
      const other = state.role === 'professional' ? 'client' : 'professional';
      return `<div class="ba-domains" role="group" aria-label="${escaped('domain')}"${state.errorField === 'domain' ? ' aria-describedby="ba-request-error"' : ''}>${tiles}</div><p class="ba-switch"><button type="button" class="ba-link-button" data-ba-role="${other}"${disabled()}>${escaped(other === 'professional' ? 'switchToPro' : 'switchToClient')}</button></p>`;
    }
    function detailsSection() {
      return `<div class="ba-grid ba-branch">${branchQuestions(state).map((item) => {
        const name = 'questionnaire.' + item.id;
        return `<div class="ba-field"><label for="${id(name)}">${escapeHtml(item.label[state.language])}${required()}</label><select id="${id(name)}" name="${name}" required${state.errorField === 'questionnaire' && (!state.question || state.question === item.id) ? ' aria-invalid="true" aria-describedby="ba-request-error"' : ''}${disabled()}><option value="">${escaped('choose')}</option>${item.options.map((choice) => `<option value="${escapeHtml(choice.id)}"${state.answers[item.id] === choice.id ? ' selected' : ''}>${escapeHtml(choice.label[state.language])}</option>`).join('')}</select></div>`;
      }).join('')}</div>`;
    }
    function situationSection() {
      const described = `${id('summary')}-hint ${id('summary')}-avoid ${id('summary')}-count${errorRef('summary')}`;
      return `<div class="ba-field ba-field--wide"><label for="${id('summary')}">${escaped('summary')}${required()}</label><p class="ba-fine" id="${id('summary')}-hint">${escaped('summaryHint')}</p><p class="ba-fine ba-avoid" id="${id('summary')}-avoid">${escaped('summaryAvoid')}</p><textarea id="${id('summary')}" name="summary" rows="6" maxlength="${SUMMARY_MAX}" aria-describedby="${described}"${state.errorField === 'summary' ? ' aria-invalid="true"' : ''} required${disabled()}>${escapeHtml(state.summary)}</textarea><p class="ba-count" id="${id('summary')}-count" data-ba-summary-count>${String(state.summary).length} ${escaped('summaryCount')}</p></div>${radios('stage', STAGES, 'stage')}${radios('objective', OBJECTIVES, 'objective')}`;
    }
    function partiesSection() {
      const names = state.otherPartiesStatus === 'named' ? `<div class="ba-field ba-field--wide"><label for="${id('otherPartiesNames')}">${escaped('otherPartiesNames')}${required()}</label><p class="ba-fine" id="${id('otherPartiesNames')}-hint">${escaped('otherPartiesNamesHint')}</p><input id="${id('otherPartiesNames')}" name="otherPartiesNames" type="text" maxlength="${NAMES_MAX}" autocomplete="off" value="${escapeHtml(state.otherPartiesNames)}" aria-describedby="${id('otherPartiesNames')}-hint${errorRef('otherPartiesNames')}"${state.errorField === 'otherPartiesNames' ? ' aria-invalid="true"' : ''} required${disabled()}></div>` : '';
      return `${radios('otherPartiesStatus', OTHER_PARTY_STATUSES, 'otherPartiesStatus', 'inline')}${names}`;
    }
    function timingSection() {
      const bounds = deadlineBounds();
      const urgent = state.urgency === 'immediate' ? `<div class="ba-notice ba-notice--urgent" role="note"><strong>${escaped('urgentTitle')}</strong><p>${escaped('urgentText')}</p><ul>${URGENT_LINKS.map(([href, key]) => `<li><a href="${href}" target="_blank" rel="noopener noreferrer">${escaped(key)}</a></li>`).join('')}</ul></div>` : '';
      const date = state.hasDeadline === 'yes' ? `<div class="ba-field"><label for="${id('deadline')}">${escaped('deadline')}${required()}</label><p class="ba-fine" id="${id('deadline')}-hint">${escaped('deadlineHint')}</p><input id="${id('deadline')}" name="deadline" type="date" min="${bounds.min}" max="${bounds.max}" value="${escapeHtml(state.deadline)}" aria-describedby="${id('deadline')}-hint${errorRef('deadline')}"${state.errorField === 'deadline' ? ' aria-invalid="true"' : ''} required${disabled()}></div>` : '';
      return `${radios('urgency', URGENCIES, 'urgency')}${urgent}${radios('hasDeadline', DEADLINE_CHOICES, 'hasDeadline', 'inline')}${date}`;
    }
    function legalAidSection() {
      return `${radios('legalAidInterest', LEGAL_AID_INTEREST, 'legalAidInterest')}<div class="ba-grid">${select('household', HOUSEHOLDS, 'household')}${select('income', INCOMES, 'income')}</div><p class="ba-fine">${escaped('legalAidNote')} <a href="https://www.csj.qc.ca/" target="_blank" rel="noopener noreferrer">${escaped('legalAidLink')}</a></p>`;
    }
    function dayLabel(day) {
      try { return new Date(day + 'T12:00:00').toLocaleDateString(state.language === 'en' ? 'en-CA' : 'fr-CA', { weekday: 'short', day: 'numeric', month: 'short' }); }
      catch (_) { return day; }
    }
    function availabilitySection() {
      if (state.availabilityMode !== 'slots') return radios('availabilityMode', AVAILABILITY_MODES, 'availabilityMode', 'inline');
      const days = availabilityDays();
      const grid = days.map((day) => `<fieldset class="ba-day"><legend>${escapeHtml(dayLabel(day))}</legend>${Object.keys(PERIODS).map((period) => {
        const value = `${day}:${period}`, checked = state.slots.includes(value);
        return `<label class="ba-slot${checked ? ' is-selected' : ''}"><input type="checkbox" name="slot" value="${value}"${checked ? ' checked' : ''}${disabled()}><span>${escapeHtml(labelOf(PERIODS, period, state.language))}</span></label>`;
      }).join('')}</fieldset>`).join('');
      return `${radios('availabilityMode', AVAILABILITY_MODES, 'availabilityMode', 'inline')}<div class="ba-slots"${state.errorField === 'slots' ? ' aria-describedby="ba-request-error"' : ''}><p class="ba-fine"><strong>${escaped('slotsLegend')}</strong> · <span data-ba-slot-count>${state.slots.length} ${escaped('slotsCount')}</span></p><div class="ba-days">${grid}</div></div>`;
    }
    function preferencesSection() {
      return `${select('region', REGIONS, 'region')}${radios('periodicity', PLANS, 'plan', 'inline')}<p class="ba-fine">${escaped('planHint')}</p>`;
    }
    function contactSection() {
      if (!ready()) return `<p class="ba-fine">${escaped('reviewEmpty')}</p>`;
      const consentText = guided(state) ? (state.questionnaireSchema ? state.questionnaireSchema.consent.text[state.language] : text('flowConsent')) : text('consent');
      const region = state.role === 'client' ? select('region', REGIONS, state.acceptRemote ? 'regionRemote' : 'regionClient') : '';
      const extra = guided(state)
        ? `<label class="ba-consent ba-check"><input type="checkbox" name="acceptRemote"${state.acceptRemote ? ' checked' : ''}${disabled()}><span><strong>${escaped('acceptRemote')}</strong><small>${escaped('acceptRemoteHint')}</small></span></label><fieldset class="ba-options ba-options--inline ba-times"><legend>${escaped('contactTimes')}</legend><div>${Object.keys(CONTACT_TIMES).map((key) => `<label class="ba-option${state.contactTimes.includes(key) ? ' is-selected' : ''}"><input type="checkbox" name="contactTimes" value="${key}"${state.contactTimes.includes(key) ? ' checked' : ''}${disabled()}><span>${escapeHtml(labelOf(CONTACT_TIMES, key, state.language))}</span></label>`).join('')}</div></fieldset>`
        : '';
      return `<div class="ba-grid">${field('name', 'text', 120, 'name')}${field('email', 'email', 254, 'email')}${field('phone', 'tel', 32, 'tel')}${region}</div>${guided(state) ? radios('contactPreference', CONTACT_PREFERENCES, 'contactPreference', 'inline') : ''}${extra}<div class="ba-honeypot" aria-hidden="true"><label for="${id('website')}">${escaped('website')}</label><input id="${id('website')}" name="website" type="text" autocomplete="off" tabindex="-1" value=""></div><label class="ba-consent"><input name="consent" type="checkbox"${state.consent ? ' checked' : ''}${invalid('consent')} required${disabled()}><span>${escapeHtml(consentText)}</span></label><p class="ba-fine">${escaped('consentHint')} <a href="https://besoinavocat.ca/politique-de-confidentialite/" target="_blank" rel="noopener noreferrer">${escaped('privacy')}</a></p>`;
    }
    function formatDate(value) {
      try { return new Date(value + 'T12:00:00').toLocaleDateString(state.language === 'en' ? 'en-CA' : 'fr-CA', { year: 'numeric', month: 'long', day: 'numeric' }); }
      catch (_) { return value; }
    }
    function reviewSection() {
      const lang = state.language, steps = stepsFor(state);
      const row = (label, value, wide) => `<div${wide ? ' class="is-wide"' : ''}><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
      const group = (step, titleKey, rows) => `<section class="ba-review" aria-labelledby="${id('review-' + step)}"><div class="ba-review__head"><h3 id="${id('review-' + step)}">${escaped(titleKey)}</h3><button type="button" class="ba-link-button" data-ba-action="edit" data-ba-edit-step="${step}" aria-label="${escaped('editSection')} : ${escaped(titleKey)}"${disabled()}>${escaped('editSection')}</button></div><dl>${rows.join('')}</dl></section>`;
      const groups = [group('domain', 'reviewDomain', [row(text('role'), text(state.role + 'Short')), row(text('domain'), labelOf(DOMAINS, state.domain, lang)), row(text('language'), text(state.requestLanguage || state.language))]
        .concat(state.role === 'client' ? [row(text('price'), text('free'))] : []))];
      if (steps.includes('details')) groups.push(group('details', 'reviewDetails', branchQuestions(state).map((item) => row(item.label[lang], (item.options.find((choice) => choice.id === state.answers[item.id]) || { label: {} }).label[lang] || text('optionalEmpty')))));
      if (steps.includes('situation')) groups.push(group('situation', 'reviewSituation', [row(text('summary'), normalizeSummary(state.summary), true), row(text('stage'), labelOf(STAGES, state.stage, lang)), row(text('objective'), labelOf(OBJECTIVES, state.objective, lang))]));
      if (steps.includes('parties')) groups.push(group('parties', 'reviewParties', [row(text('otherPartiesStatus'), labelOf(OTHER_PARTY_STATUSES, state.otherPartiesStatus, lang))]
        .concat(state.otherPartiesStatus === 'named' ? [row(text('otherPartiesNames'), normalizeNames(state.otherPartiesNames), true)] : [])));
      if (steps.includes('timing')) groups.push(group('timing', 'reviewTiming', [row(text('urgency'), labelOf(URGENCIES, state.urgency, lang)), row(text('deadline'), state.hasDeadline === 'yes' ? formatDate(state.deadline) : text('noDeadline'))]));
      if (steps.includes('legalAid')) groups.push(group('legalAid', 'reviewLegalAid', [row(text('legalAidInterest'), labelOf(LEGAL_AID_INTEREST, state.legalAidInterest, lang)), row(text('household'), labelOf(HOUSEHOLDS, state.household, lang)), row(text('income'), labelOf(INCOMES, state.income, lang))]));
      if (steps.includes('availability')) groups.push(group('availability', 'reviewAvailability', [row(text('availabilityMode'), state.availabilityMode === 'slots'
        ? state.slots.slice().sort().map((slot) => `${dayLabel(slot.slice(0, 10))} · ${labelOf(PERIODS, slot.slice(11), lang)}`).join(', ') : labelOf(AVAILABILITY_MODES, state.availabilityMode, lang), true)]));
      if (steps.includes('preferences')) groups.push(group('preferences', 'reviewPreferences', [row(text('region'), labelOf(REGIONS, state.region, lang)), row(text('plan'), labelOf(PLANS, state.periodicity, lang))]));
      if (ready()) {
        const rows = [row(text('name'), state.name.trim()), row(text('email'), state.email.trim()), row(guided(state) && state.contactPreference === 'phone' ? text('phoneRequired') : text('phone'), state.phone.trim() || text('optionalEmpty'))];
        if (state.role === 'client') rows.push(row(text('region'), labelOf(REGIONS, state.region, lang)));
        if (guided(state)) {
          rows.push(row(text('contactPreference'), labelOf(CONTACT_PREFERENCES, state.contactPreference, lang)));
          rows.push(row(text('acceptRemote'), text(state.acceptRemote ? 'yes' : 'no'), true));
          rows.push(row(text('contactTimes'), state.contactTimes.length ? Object.keys(CONTACT_TIMES).filter((key) => state.contactTimes.includes(key)).map((key) => labelOf(CONTACT_TIMES, key, lang)).join(', ') : text('optionalEmpty')));
        }
        rows.push(row(text('summaryConsent'), text('agreed')));
        groups.push(group('contact', 'reviewContact', rows));
      } else groups.push(`<p class="ba-fine">${escaped('reviewEmpty')}</p>`);
      const changed = changedUncertainAttempt(state) ? `<div class="ba-notice" role="status">${escaped('changedAttempt')}</div>` : '';
      const retry = state.requestLanguage && state.requestLanguage !== state.language ? `<p class="ba-fine">${escaped('retryLanguage')}</p>` : '';
      const reviewText = state.questionnaireSchema ? state.questionnaireSchema.review[lang] : text('reviewConfirm');
      const confirmation = guided(state) && ready() ? `<label class="ba-consent ba-review-confirm"><input type="checkbox" name="reviewed" required${state.reviewed ? ' checked' : ''}${invalid('reviewed')}${disabled()}><span>${escapeHtml(reviewText)}</span></label>` : '';
      return groups.join('') + (state.role === 'client' ? `<p class="ba-fine">${escaped('paidServices')}</p>` : '') + changed + retry + confirmation;
    }
    function translatePage() {
      document.documentElement.lang = state.language === 'en' ? 'en-CA' : 'fr-CA';
      document.title = text('title');
      document.querySelectorAll('[data-ba-fr][data-ba-en]').forEach((element) => { element.textContent = state.language === 'en' ? element.dataset.baEn : element.dataset.baFr; });
      document.querySelectorAll('[data-ba-aria-fr][data-ba-aria-en]').forEach((element) => { element.setAttribute('aria-label', state.language === 'en' ? element.dataset.baAriaEn : element.dataset.baAriaFr); });
      document.querySelectorAll('[data-ba-language]').forEach((element) => { element.setAttribute('aria-pressed', String(element.dataset.baLanguage === state.language)); element.disabled = state.pending; });
    }
    function render(focus) {
      translatePage();
      if (state.receipt) {
        view.innerHTML = `<section class="ba-received" role="status"><span class="ba-received__mark" aria-hidden="true">✓</span><h2 tabindex="-1" data-ba-step-heading>${escaped('received')}</h2><p>${escaped('reference')}</p><strong class="ba-reference">${escapeHtml(state.receipt)}</strong><p>${escaped('receivedHint')}</p><p>${escaped('noDocuments')}</p><button type="button" class="ba-button" data-ba-action="restart">${escaped('restart')}</button></section>`;
      } else {
        const steps = stepsFor(state);
        if (!steps.includes(state.step)) state.step = 'domain';
        const index = steps.indexOf(state.step);
        const label = text('steps')[STEP_ORDER.indexOf(state.step)];
        const progress = `<div class="ba-progress" aria-label="${escaped('progress')}"><p class="ba-step-label">${escaped('step')} ${index + 1} ${escaped('of')} ${steps.length} · ${escapeHtml(label)}</p><progress max="${steps.length}" value="${index + 1}" aria-hidden="true"></progress></div>`;
        const status = service === 'loading' ? `<p class="ba-fine" role="status">${escaped('loading')}</p>` : !ready() ? `<div class="ba-notice"><strong>${escaped('closedTitle')}</strong><p>${escaped('closed')}</p><a href="tel:+15148252825">${escaped('call')}</a></div>` : '';
        const error = state.error ? `<div class="ba-error" id="ba-request-error" role="alert" tabindex="-1"><strong>${escaped('errorTitle')}</strong><p>${escapeHtml(text(state.error) || text('uncertain'))}</p></div>` : '';
        const sections = { domain: domainSection, details: detailsSection, situation: situationSection, parties: partiesSection, timing: timingSection,
          legalAid: legalAidSection, availability: availabilitySection, preferences: preferencesSection, contact: contactSection, review: reviewSection };
        const pro = state.step === 'domain' && state.role === 'professional';
        const last = state.step === 'review';
        const next = last
          ? `<button class="ba-button" type="submit"${!ready() || state.pending ? ' disabled' : ''}>${escaped(state.pending ? 'sending' : changedUncertainAttempt(state) ? 'submitChanged' : 'submit')}</button>`
          : `<button class="ba-button" type="submit"${disabled()}>${escaped(state.returnToReview ? 'backToReview' : 'next')} <span aria-hidden="true">→</span></button>`;
        view.innerHTML = `${progress}${status}<form novalidate aria-busy="${state.pending}">${error}<h2 tabindex="-1" data-ba-step-heading>${escaped(pro ? 'domainTitlePro' : state.step + 'Title')}</h2><p class="ba-hint">${escaped(pro ? 'domainHintPro' : state.step + 'Hint')}</p>${sections[state.step]()}<div class="ba-actions">${index > 0 ? `<button class="ba-back" type="button" data-ba-action="back"${disabled()}>← ${escaped('previous')}</button>` : '<span></span>'}${next}</div></form>`;
      }
      if (focus) {
        const target = state.error ? view.querySelector('[role="alert"]') : view.querySelector('[data-ba-step-heading]');
        if (target) target.focus({ preventScroll: true });
        if (target && typeof root.scrollIntoView === 'function' && root.getBoundingClientRect && root.getBoundingClientRect().top < 0) root.scrollIntoView({ block: 'start' });
      }
    }
    function setError(failure) { state.error = failure.key; state.errorField = failure.field || ''; state.question = failure.question || ''; render(true); }
    function clearError() { state.error = ''; state.errorField = ''; state.question = ''; }
    const CAPTURED = ['region', 'name', 'email', 'phone', 'website', 'summary', 'deadline', 'stage', 'objective', 'urgency', 'hasDeadline', 'contactPreference', 'periodicity',
      'otherPartiesStatus', 'otherPartiesNames', 'legalAidInterest', 'household', 'income', 'availabilityMode'];
    function captureVisibleFields() {
      // Also captures autofilled values; some browsers do not emit input events for them.
      if (state.pending) return;
      const form = view.querySelector('form');
      if (!form) return;
      for (const name of CAPTURED) {
        const element = form.elements.namedItem(name);
        if (!element) continue;
        let value = state[name];
        if (element.tagName) { if (!element.disabled) value = element.type === 'radio' ? (element.checked ? element.value : '') : element.value; }
        else if (!Array.from(element).some((item) => item.disabled)) value = element.value;
        if (state[name] !== value) { state[name] = value; state.reviewed = false; }
      }
      for (const item of branchQuestions(state)) {
        const element = form.elements.namedItem('questionnaire.' + item.id);
        if (element && !element.disabled && state.answers[item.id] !== element.value) setBranchAnswer(state, item.id, element.value);
      }
      const consent = form.elements.namedItem('consent');
      if (consent && !consent.disabled && state.consent !== consent.checked) { state.consent = consent.checked; state.reviewed = false; }
      const reviewed = form.elements.namedItem('reviewed');
      if (reviewed && !reviewed.disabled) state.reviewed = reviewed.checked;
    }
    function changeRole(role) {
      const before = consentVersionFor(state);
      const next = role === 'professional' ? 'professional' : 'client';
      if (state.role !== next) { state.role = next; state.answers = {}; state.reviewed = false; state.step = 'domain'; }
      // A different consent text must be agreed to again.
      if (consentVersionFor(state) !== before) state.consent = false;
    }
    function advance() {
      if (state.returnToReview) {
        const pending = validate(state, ready() ? 'contact' : 'availability');
        if (pending) { state.step = FIELD_STEPS[pending.field] || 'contact'; setError(pending); return; }
        state.step = 'review'; state.returnToReview = false;
      } else {
        const steps = stepsFor(state);
        state.step = steps[steps.indexOf(state.step) + 1] || 'review';
      }
      clearError(); render(true);
    }
    function refocus(selector) { const again = view.querySelector(selector); if (again) again.focus(); }
    root.addEventListener('input', (event) => {
      const input = event.target;
      if (state.pending || !['name', 'email', 'phone', 'website', 'summary', 'deadline', 'otherPartiesNames'].includes(input.name)) return;
      if (state[input.name] !== input.value) { state[input.name] = input.value; state.reviewed = false; }
      if (input.name === 'summary') {
        const counter = view.querySelector('[data-ba-summary-count]');
        if (counter) counter.textContent = `${input.value.length} ${text('summaryCount')}`;
      }
    });
    root.addEventListener('change', (event) => {
      const input = event.target;
      if (state.pending || !input.name) return;
      if (input.name.startsWith('questionnaire.')) {
        captureVisibleFields(); setBranchAnswer(state, input.name.slice(14), input.value); render(false);
        refocus(`[name="${input.name}"]`); return;
      }
      if (input.name === 'slot') {
        const set = new Set(state.slots);
        if (input.checked) {
          if (set.size >= MAX_SLOTS) { input.checked = false; setError({ field: 'slots', key: 'tooManySlots' }); return; }
          set.add(input.value);
        } else set.delete(input.value);
        state.slots = Array.from(set); state.reviewed = false;
        if (state.errorField === 'slots') clearError();
        render(false); refocus(`input[name="slot"][value="${input.value}"]`); return;
      }
      if (input.name === 'contactTimes') {
        const set = new Set(state.contactTimes);
        if (input.checked) set.add(input.value); else set.delete(input.value);
        state.contactTimes = Object.keys(CONTACT_TIMES).filter((key) => set.has(key)); state.reviewed = false;
        captureVisibleFields(); render(false); refocus(`input[name="contactTimes"][value="${input.value}"]`); return;
      }
      if (input.name === 'acceptRemote') {
        captureVisibleFields(); state.acceptRemote = input.checked; state.reviewed = false; render(false); refocus('input[name="acceptRemote"]'); return;
      }
      if (['region', 'stage', 'objective', 'deadline', 'household', 'income', 'legalAidInterest'].includes(input.name) && state[input.name] !== input.value) { state[input.name] = input.value; state.reviewed = false; }
      if (input.name === 'consent' && state.consent !== input.checked) { state.consent = input.checked; state.reviewed = false; }
      if (input.name === 'reviewed') state.reviewed = input.checked;
      if (['urgency', 'hasDeadline', 'contactPreference', 'periodicity', 'otherPartiesStatus', 'availabilityMode'].includes(input.name)) {
        // These choices change the questions shown below them.
        captureVisibleFields();
        if (state[input.name] !== input.value) { state[input.name] = input.value; state.reviewed = false; }
        if (state.errorField === input.name) clearError();
        render(false);
        refocus(`input[name="${input.name}"][value="${input.value}"]`);
      }
    });
    document.addEventListener('click', (event) => {
      const target = event.target.closest && event.target.closest('button');
      if (!target) return;
      if (target.dataset.baLanguage) {
        if (state.pending) return;
        captureVisibleFields();
        const language = languageOf(target.dataset.baLanguage);
        if (state.language !== language && !state.requestLanguage) state.reviewed = false;
        state.language = language; render(false);
        return;
      }
      if (!root.contains(target) || state.pending) return;
      if (target.dataset.baDomain) {
        // One choice moves on to the next step, as on the owner's model.
        setDomain(state, target.dataset.baDomain); clearError(); advance(); return;
      }
      if (target.dataset.baRole) {
        changeRole(target.dataset.baRole); clearError(); render(true); return;
      }
      const action = target.dataset.baAction;
      if (action === 'back') {
        captureVisibleFields();
        const steps = stepsFor(state);
        state.step = steps[Math.max(0, steps.indexOf(state.step) - 1)];
        clearError(); render(true);
      }
      if (action === 'edit') {
        const steps = stepsFor(state);
        state.step = steps.includes(target.dataset.baEditStep) ? target.dataset.baEditStep : 'domain';
        state.returnToReview = true; clearError(); render(true);
      }
      if (action === 'restart') {
        const mode = state.requestMode, preview = state.preview, lang = state.language, schema = state.questionnaireSchema;
        Object.assign(state, initialState('client', lang, mode), { preview, questionnaireSchema: schema }); attempt.clear(); render(true);
      }
    });
    root.addEventListener('submit', async (event) => {
      if (!view.contains(event.target)) return;
      event.preventDefault();
      if (state.pending || state.receipt) return;
      captureVisibleFields();
      // Without an open intake, contact details are neither collected nor validated.
      const exploring = !ready() && (state.step === 'contact' || state.step === 'review');
      const failure = validate(state, exploring ? 'availability' : state.step);
      if (failure) { setError(failure); return; }
      if (state.step !== 'review') { advance(); return; }
      if (!ready()) { setError({ key: 'serviceUnavailable' }); return; }
      let request;
      try { request = attempt.prepare(payloadFrom(state)); } catch (_) { setError({ key: 'secureUnavailable' }); return; }
      if (!state.requestLanguage) state.requestLanguage = state.language;
      state.pending = true; clearError(); render(false);
      const result = await sendRequest(request, global.fetch.bind(global));
      state.pending = false;
      if (result.reference) {
        state.receipt = result.reference;
        // Nothing entered is kept after a confirmed receipt.
        const fresh = initialState('client', state.language, state.requestMode);
        Object.assign(state, fresh, { receipt: result.reference, preview: state.preview, questionnaireSchema: state.questionnaireSchema, step: 'domain' });
        attempt.clear();
      } else { state.error = result.error; if (result.error === 'uncertain') state.uncertainBody = request.body; }
      render(true);
    });
    render(false);
    const settle = (result) => {
      service = result.open && secure ? 'open' : 'closed';
      if (!state.pending && !state.receipt) {
        const before = consentVersionFor(state);
        state.requestMode = service === 'open' && result.requestMode;
        state.preview = service !== 'open';
        state.questionnaireSchema = result.questionnaireSchema || null;
        if (consentVersionFor(state) !== before) state.consent = false;
        if (!stepsFor(state).includes(state.step)) state.step = 'domain';
        render(false);
      }
    };
    if (secure) loadService(global.fetch.bind(global)).then(settle);
    else settle({ open: false, requestMode: false });
    return { state };
  }

  const api = { CONSENT_VERSION, REQUEST_CONSENT_VERSION, QUESTIONNAIRE_VERSION, DOMAINS, REGIONS, STAGES, OBJECTIVES, URGENCIES, CONTACT_PREFERENCES, DEADLINE_CHOICES, PLANS,
    OTHER_PARTY_STATUSES, LEGAL_AID_INTEREST, HOUSEHOLDS, INCOMES, PERIODS, AVAILABILITY_MODES, CONTACT_TIMES, SKIP_PARTIES, SKIP_LEGAL_AID,
    STEP_ORDER, COPY, ERROR_KEYS, escapeHtml, initialState, guided, detailed, stepsFor, consentVersionFor, normalizeSummary, deadlineBounds, validDeadline,
    availabilityDays, validSlots, branched, branchQuestions, pruneBranchAnswers, setDomain, setBranchAnswer, branchFailure, questionnaireFrom,
    validate, payloadFrom, serviceFrom, preselection, createAttempt, changedUncertainAttempt, receiptFrom, sendRequest, loadService };
  // Pure contract functions are exported for deterministic tests, without a DOM.
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (global.document) {
    const start = () => global.document.querySelectorAll('[data-ba-request]').forEach(mount);
    if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }
})(typeof window === 'object' ? window : globalThis);
