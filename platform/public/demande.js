/* BesoinAvocat request page. Same-origin intake only; never reads accounts, cookies or case documents. */
(function (global) {
  'use strict';
  const CONSENT_VERSION = '2026-10-26.1';
  // Detailed client request (situation, urgency): separate consent, used only when the server opens it.
  const REQUEST_CONSENT_VERSION = '2026-10-27.1';
  const ENDPOINT = '/api/intake', CATALOG = '/api/catalog';
  const SUMMARY_MIN = 20, SUMMARY_MAX = 1500;
  // One day below the server bound so a visitor east of UTC is never refused.
  const DEADLINE_MAX_DAYS = 1829;
  const DOMAINS = {
    family: ['Famille', 'Family'], employment: ['Travail', 'Employment'],
    housing: ['Logement', 'Housing'], civil: ['Civil', 'Civil'],
    criminal: ['Criminel et pénal', 'Criminal and penal'], business: ['Affaires', 'Business'],
    immigration: ['Immigration', 'Immigration'], other: ['Autre / à déterminer', 'Other / to be determined']
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
  // Situation and timing are asked only in the detailed client request.
  const STEP_ORDER = ['role', 'preferences', 'situation', 'timing', 'contact', 'review'];
  const FIELD_STEPS = { role: 'role', domain: 'preferences', region: 'preferences', periodicity: 'preferences', stage: 'situation',
    objective: 'situation', summary: 'situation', urgency: 'timing', hasDeadline: 'timing', deadline: 'timing' };
  const URGENT_LINKS = [['https://www.barreau.qc.ca/fr/grand-public/acces-justice/besoin-avocat/', 'urgentBarreau'], ['https://www.csj.qc.ca/', 'urgentLegalAid']];
  const COPY = {
    fr: {
      steps: ['Votre parcours', 'Domaine et région', 'Votre situation', 'Urgence et échéance', 'Vos coordonnées', 'Récapitulatif'],
      progress: 'Progression de la demande', step: 'Étape', of: 'sur',
      roleTitle: 'Quelle est votre prochaine étape ?', roleHint: 'Votre choix prépare une demande. Il ne crée pas de compte et ne donne accès à aucun dossier.',
      client: 'Je cherche un avocat', clientShort: 'Client', professional: 'Je suis avocat', professionalShort: 'Avocat',
      clientDetail: 'Déposer une demande gratuite. Les honoraires de l’avocat restent distincts.',
      professionalDetail: 'Signaler mon intérêt pour l’espace professionnel, sous réserve de vérification de mon inscription au Barreau.',
      preferencesTitle: 'Dans quel domaine et quelle région ?', preferencesHint: 'Ces catégories servent à orienter votre demande. Elles ne garantissent ni réponse ni disponibilité.',
      domain: 'Domaine de droit', region: 'Région', choose: 'Choisir une option', plan: 'Formule qui vous intéresse',
      planHint: 'Choix indicatif seulement : aucun abonnement, paiement ou engagement à cette étape. Crédits IA en supplément, prix à définir.',
      situationTitle: 'Décrivez votre situation.', situationHint: 'Quelques lignes suffisent. L’avocat pourra vous demander les précisions nécessaires.',
      stage: 'Où en est votre dossier ?', objective: 'Que souhaitez-vous obtenir ?', summary: 'Résumé de votre situation',
      summaryHint: 'Indiquez les faits utiles, ce qui s’est passé récemment et ce que vous souhaitez obtenir, en 20 à 1 500 caractères.',
      summaryAvoid: 'N’indiquez pas de numéro d’assurance sociale, de renseignements bancaires, de mot de passe, ni de détails médicaux ou concernant d’autres personnes qui ne sont pas nécessaires. Ne joignez aucun document.',
      summaryCount: 'caractères sur 1 500',
      timingTitle: 'Y a-t-il une urgence ou une échéance ?', timingHint: 'Indiquez dans quel délai vous avez besoin d’aide et, si vous la connaissez, la date d’une audience ou d’un délai à respecter.',
      urgency: 'Dans quel délai avez-vous besoin d’aide ?', hasDeadline: 'Avez-vous une échéance connue ?', deadline: 'Date de l’échéance',
      deadlineHint: 'Par exemple une audience, une mise en demeure ou un délai de réponse.', noDeadline: 'Aucune échéance indiquée',
      urgentTitle: 'Besoin d’aide en moins de 48 heures ?',
      urgentText: 'BesoinAvocat ne traite pas les urgences et ne garantit aucun délai de réponse. En cas de danger immédiat, composez le 911. Si vous êtes arrêté·e ou détenu·e, vous avez le droit d’avoir recours sans délai à l’assistance d’un avocat : demandez-le. Pour une audience ou un délai imminent, contactez directement un avocat.',
      urgentBarreau: 'Barreau du Québec — Besoin d’un avocat', urgentLegalAid: 'Commission des services juridiques — aide juridique',
      contactTitle: 'Comment vous joindre ?', contactHint: 'Vos coordonnées servent uniquement à vous recontacter au sujet de cette demande.',
      name: 'Nom', email: 'Courriel', phone: 'Téléphone (facultatif)', phoneRequired: 'Téléphone', contactPreference: 'Moyen de contact préféré',
      consent: 'Je consens à ce que BesoinAvocat conserve ces coordonnées et catégories pour traiter ma demande de contact. Je ne transmets aucun récit juridique ni document. Cet envoi ne crée ni mandat, ni abonnement, ni paiement.',
      requestConsent: 'Je consens à ce que BesoinAvocat conserve ces coordonnées, ces catégories et le résumé de ma situation pour traiter ma demande et me recontacter à son sujet. Je n’inclus aucun document, numéro d’identification ou renseignement de santé non nécessaire. Cet envoi ne crée ni mandat, ni relation avocat-client, ni abonnement, ni paiement.',
      consentHint: 'Ce consentement ne vaut ni mandat juridique, ni abonnement, ni inscription à une infolettre.', privacy: 'Lire la politique de confidentialité',
      reviewTitle: 'Relisez avant d’envoyer.', reviewHint: 'Seuls les éléments ci-dessous seront transmis. Ils ne seront jamais publiés.',
      reviewPath: 'Parcours', reviewPreferences: 'Domaine et région', reviewSituation: 'Situation', reviewTiming: 'Urgence et échéance', reviewContact: 'Coordonnées',
      role: 'Parcours', language: 'Langue de suivi', fr: 'Français', en: 'Anglais', price: 'Tarif', free: 'Demande gratuite — honoraires de l’avocat distincts',
      summaryConsent: 'Consentement', agreed: 'Accepté', required: 'Obligatoire', optionalEmpty: 'Non renseigné',
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
      missingRole: 'Choisissez votre parcours.', missingDomain: 'Choisissez un domaine.', missingRegion: 'Choisissez une région.', missingPlan: 'Choisissez une formule indicative.',
      missingStage: 'Indiquez où en est votre dossier.', missingObjective: 'Indiquez ce que vous souhaitez obtenir.',
      invalidSummary: 'Décrivez votre situation en 20 à 1 500 caractères, sans chevrons (< >).', missingUrgency: 'Indiquez dans quel délai vous avez besoin d’aide.',
      missingDeadlineChoice: 'Indiquez si vous avez une échéance connue.', invalidDeadline: 'Choisissez une date réelle, entre aujourd’hui et dans cinq ans.',
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
      website: 'Laisser ce champ vide', title: 'Trouver un avocat — demande gratuite | BesoinAvocat'
    },
    en: {
      steps: ['Your path', 'Area of law and region', 'Your situation', 'Urgency and deadline', 'Your contact details', 'Summary'],
      progress: 'Request progress', step: 'Step', of: 'of',
      roleTitle: 'What is your next step?', roleHint: 'Your choice prepares a request. It does not create an account or grant access to any case.',
      client: 'I am looking for a lawyer', clientShort: 'Client', professional: 'I am a lawyer', professionalShort: 'Lawyer',
      clientDetail: 'Submit a free request. The lawyer’s fees remain separate.',
      professionalDetail: 'Express interest in the professional workspace, subject to verification of my Bar membership.',
      preferencesTitle: 'Which area of law and region?', preferencesHint: 'These categories help route your request. They do not guarantee a response or availability.',
      domain: 'Area of law', region: 'Region', choose: 'Choose an option', plan: 'Option you are interested in',
      planHint: 'Indication of interest only: no subscription, payment or commitment at this step. AI credits are extra, pricing to be defined.',
      situationTitle: 'Describe your situation.', situationHint: 'A few lines are enough. The lawyer may ask you for the details needed.',
      stage: 'Where does your matter stand?', objective: 'What would you like to achieve?', summary: 'Summary of your situation',
      summaryHint: 'Give the useful facts, what happened recently and what you would like to achieve, in 20 to 1,500 characters.',
      summaryAvoid: 'Do not include your social insurance number, banking information, passwords, or medical details or details about other people that are not necessary. Do not attach any document.',
      summaryCount: 'characters of 1,500',
      timingTitle: 'Is there any urgency or deadline?', timingHint: 'Tell us how soon you need help and, if you know it, the date of a hearing or of a deadline to meet.',
      urgency: 'How soon do you need help?', hasDeadline: 'Do you have a known deadline?', deadline: 'Deadline date',
      deadlineHint: 'For example a hearing, a formal notice or a time limit to respond.', noDeadline: 'No deadline given',
      urgentTitle: 'Need help within 48 hours?',
      urgentText: 'BesoinAvocat does not handle emergencies and does not guarantee any response time. In case of immediate danger, call 911. If you are arrested or detained, you have the right to retain and instruct counsel without delay: ask for it. For an imminent hearing or deadline, contact a lawyer directly.',
      urgentBarreau: 'Barreau du Québec — Need a lawyer (in French)', urgentLegalAid: 'Commission des services juridiques — legal aid (in French)',
      contactTitle: 'How can we reach you?', contactHint: 'Your contact details are used only to contact you about this request.',
      name: 'Name', email: 'Email', phone: 'Phone (optional)', phoneRequired: 'Phone', contactPreference: 'Preferred contact method',
      consent: 'I consent to BesoinAvocat storing these contact details and categories to process my contact request. I am not submitting a legal account or document. This submission does not create a legal engagement, subscription or payment.',
      requestConsent: 'I consent to BesoinAvocat storing these contact details, categories and the summary of my situation to process my request and contact me about it. I am not including any document, identification number or unnecessary health information. This submission does not create a legal mandate, lawyer-client relationship, subscription or payment.',
      consentHint: 'This consent is not a legal mandate, subscription or newsletter signup.', privacy: 'Read the privacy policy',
      reviewTitle: 'Review before sending.', reviewHint: 'Only the items below will be sent. They will never be published.',
      reviewPath: 'Path', reviewPreferences: 'Area of law and region', reviewSituation: 'Situation', reviewTiming: 'Urgency and deadline', reviewContact: 'Contact details',
      role: 'Path', language: 'Follow-up language', fr: 'French', en: 'English', price: 'Price', free: 'Free request — the lawyer’s fees are separate',
      summaryConsent: 'Consent', agreed: 'Accepted', required: 'Required', optionalEmpty: 'Not provided',
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
      missingRole: 'Choose your path.', missingDomain: 'Choose an area of law.', missingRegion: 'Choose a region.', missingPlan: 'Choose an indicative plan.',
      missingStage: 'Tell us where your matter stands.', missingObjective: 'Tell us what you would like to achieve.',
      invalidSummary: 'Describe your situation in 20 to 1,500 characters, without angle brackets (< >).', missingUrgency: 'Tell us how soon you need help.',
      missingDeadlineChoice: 'Tell us whether you have a known deadline.', invalidDeadline: 'Choose a real date between today and five years from now.',
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
      website: 'Leave this field empty', title: 'Find a lawyer — free request | BesoinAvocat'
    }
  };
  const ERROR_KEYS = {
    INTAKE_UNAVAILABLE: 'serviceUnavailable', INTAKE_FORBIDDEN: 'forbidden', INTAKE_INVALID_INPUT: 'invalidInput',
    INTAKE_CONSENT_REQUIRED: 'consentRequired', INTAKE_RATE_LIMIT: 'rateLimit', IDEMPOTENCY_CONFLICT: 'conflict'
  };
  const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const languageOf = (value) => value === 'en' ? 'en' : 'fr';
  const labelOf = (choices, key, language) => has(choices, key) ? choices[key][language === 'en' ? 1 : 0] : '';

  function initialState(role, language, requestMode) {
    return { role: role === 'professional' || role === 'lawyer' ? 'professional' : 'client', language: languageOf(language),
      requestMode: requestMode === true, step: 'role', domain: '', region: '', periodicity: 'monthly',
      stage: '', objective: '', summary: '', urgency: '', hasDeadline: '', deadline: '', contactPreference: 'email',
      name: '', email: '', phone: '', consent: false, website: '',
      pending: false, error: '', errorField: '', receipt: '', requestLanguage: '', uncertainBody: '', returnToReview: false };
  }
  function detailed(state) { return state.requestMode === true && state.role === 'client'; }
  function stepsFor(state) { return STEP_ORDER.filter((id) => detailed(state) || (id !== 'situation' && id !== 'timing')); }
  function consentVersionFor(state) { return detailed(state) ? REQUEST_CONSENT_VERSION : CONSENT_VERSION; }
  function normalizeSummary(value) { return String(value || '').replace(/\r\n?/g, '\n').trim(); }
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
  // Validates every step of the current path up to `through` (a step id; the whole path by default).
  function validate(state, through, now) {
    const steps = stepsFor(state);
    const limit = STEP_ORDER.indexOf(STEP_ORDER.includes(through) ? through : 'review');
    const checks = (id) => steps.includes(id) && STEP_ORDER.indexOf(id) <= limit;
    if (!['client', 'professional'].includes(state.role)) return { field: 'role', key: 'missingRole' };
    if (!checks('preferences')) return null;
    if (!has(DOMAINS, state.domain)) return { field: 'domain', key: 'missingDomain' };
    if (!has(REGIONS, state.region)) return { field: 'region', key: 'missingRegion' };
    if (state.role === 'professional' && !has(PLANS, state.periodicity)) return { field: 'periodicity', key: 'missingPlan' };
    if (checks('situation')) {
      if (!has(STAGES, state.stage)) return { field: 'stage', key: 'missingStage' };
      if (!has(OBJECTIVES, state.objective)) return { field: 'objective', key: 'missingObjective' };
      const summary = normalizeSummary(state.summary);
      if (summary.length < SUMMARY_MIN || summary.length > SUMMARY_MAX || /[<>\x00-\x08\x0b-\x1f\x7f-\x9f]/.test(summary)) return { field: 'summary', key: 'invalidSummary' };
    }
    if (checks('timing')) {
      if (!has(URGENCIES, state.urgency)) return { field: 'urgency', key: 'missingUrgency' };
      if (!has(DEADLINE_CHOICES, state.hasDeadline)) return { field: 'hasDeadline', key: 'missingDeadlineChoice' };
      if (state.hasDeadline === 'yes' && !validDeadline(state.deadline, now)) return { field: 'deadline', key: 'invalidDeadline' };
    }
    if (!checks('contact')) return null;
    const name = String(state.name || '').trim();
    const email = String(state.email || '').trim();
    const phone = String(state.phone || '').trim();
    if (!name || name.length > 120 || /[<>\x00-\x1f\x7f-\x9f]/.test(name)) return { field: 'name', key: 'invalidName' };
    const pieces = email.split('@');
    if (email.length > 254 || pieces.length !== 2 || pieces[0].length > 64 ||
        !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(email) ||
        pieces[0].startsWith('.') || pieces[0].endsWith('.') || pieces[0].includes('..')) return { field: 'email', key: 'invalidEmail' };
    if (phone && (phone.length > 32 || !/^[+0-9() .-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15)) return { field: 'phone', key: 'invalidPhone' };
    if (detailed(state)) {
      if (!has(CONTACT_PREFERENCES, state.contactPreference)) return { field: 'contactPreference', key: 'missingContactPreference' };
      if (state.contactPreference === 'phone' && !phone) return { field: 'phone', key: 'phoneMissing' };
    }
    if (state.consent !== true) return { field: 'consent', key: 'consentRequired' };
    if (state.website) return { field: 'website', key: 'invalidInput' };
    return null;
  }
  function payloadFrom(state) {
    if (validate(state)) throw new Error('Invalid intake state');
    const payload = { name: state.name.trim(), email: state.email.trim(), role: state.role, language: languageOf(state.requestLanguage || state.language), domain: state.domain, region: state.region };
    if (state.phone.trim()) payload.phone = state.phone.trim();
    if (state.role === 'professional') payload.periodicity = state.periodicity;
    if (detailed(state)) {
      payload.contactPreference = state.contactPreference; payload.stage = state.stage; payload.objective = state.objective;
      payload.summary = normalizeSummary(state.summary); payload.urgency = state.urgency;
      if (state.hasDeadline === 'yes') payload.deadline = state.deadline;
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
    return { open: true, requestMode: !!request && request.enabled === true && !!request.consent && request.consent.version === REQUEST_CONSENT_VERSION };
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
    return !!state.uncertainBody && !validate(state) && JSON.stringify(payloadFrom(state)) !== state.uncertainBody;
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
  async function readSmallJson(response) {
    const maximum = 16384;
    const stated = Number(response.headers && response.headers.get('Content-Length'));
    if (stated > maximum) throw new Error('uncertain');
    const text = await response.text();
    if (text.length > maximum) throw new Error('uncertain');
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
  async function loadService(fetchImpl) {
    try {
      const response = await fetchImpl(CATALOG, { credentials: 'omit', cache: 'no-store', redirect: 'error', headers: { Accept: 'application/json' } });
      if (response.status !== 200) return { open: false, requestMode: false };
      return serviceFrom(await readSmallJson(response));
    } catch (_) { return { open: false, requestMode: false }; }
  }

  function mount(root) {
    const view = root.querySelector('[data-ba-request-view]');
    if (!view || root.dataset.baMounted) return null;
    root.dataset.baMounted = 'true';
    const document = global.document;
    const preset = preselection(global.location && global.location.search);
    const state = initialState(preset.role, preset.language || document.documentElement.lang);
    if (preset.domain) state.domain = preset.domain;
    if (preset.periodicity) state.periodicity = preset.periodicity;
    const secure = !!global.crypto && typeof global.crypto.getRandomValues === 'function' && typeof global.fetch === 'function';
    let service = 'loading';
    const ready = () => service === 'open' && secure;
    const attempt = createAttempt(global.crypto);
    const text = (key) => COPY[state.language][key];
    const escaped = (key) => escapeHtml(text(key));
    const disabled = () => state.pending ? ' disabled' : '';
    const id = (name) => `ba-request-${name}`;
    const errorRef = (name) => state.errorField === name ? ' ba-request-error' : '';
    const invalid = (name) => state.errorField === name ? ' aria-invalid="true"' : '';

    function options(choices, selected) {
      return `<option value="">${escaped('choose')}</option>` + Object.keys(choices).map((key) => `<option value="${key}"${key === selected ? ' selected' : ''}>${escapeHtml(labelOf(choices, key, state.language))}</option>`).join('');
    }
    function radios(name, choices, legendKey, modifier) {
      return `<fieldset class="ba-options${modifier ? ' ba-options--' + modifier : ''}"${state.errorField === name ? ' aria-describedby="ba-request-error"' : ''}><legend>${escaped(legendKey)} <small>${escaped('required')}</small></legend><div>${Object.keys(choices).map((key) => `<label class="ba-option${state[name] === key ? ' is-selected' : ''}"><input type="radio" name="${name}" value="${key}"${state[name] === key ? ' checked' : ''}${invalid(name)}${disabled()}><span>${escapeHtml(labelOf(choices, key, state.language))}</span></label>`).join('')}</div></fieldset>`;
    }
    function field(name, type, max, autocomplete) {
      const required = name !== 'phone' || (detailed(state) && state.contactPreference === 'phone');
      const label = name === 'phone' && required ? text('phoneRequired') : text(name);
      return `<div class="ba-field"><label for="${id(name)}">${escapeHtml(label)}${required ? ` <small>${escaped('required')}</small>` : ''}</label><input id="${id(name)}" name="${name}" type="${type}" maxlength="${max}" autocomplete="${autocomplete}" value="${escapeHtml(state[name])}"${invalid(name)}${state.errorField === name ? ' aria-describedby="ba-request-error"' : ''}${required ? ' required' : ''}${!ready() ? ' disabled' : ''}${disabled()}></div>`;
    }
    function roleCard(role) {
      const selected = state.role === role;
      return `<button type="button" class="ba-choice${selected ? ' is-selected' : ''}" data-ba-role="${role}" aria-pressed="${selected}"${disabled()}><span class="ba-choice__mark" aria-hidden="true">${selected ? '✓' : '+'}</span><strong>${escaped(role)}</strong><span>${escaped(role + 'Detail')}</span></button>`;
    }
    function preferencesSection() {
      const plans = state.role === 'professional' ? radios('periodicity', PLANS, 'plan', 'inline') + `<p class="ba-fine">${escaped('planHint')}</p>` : '';
      return `<div class="ba-grid"><div class="ba-field"><label for="${id('domain')}">${escaped('domain')} <small>${escaped('required')}</small></label><select id="${id('domain')}" name="domain" required${invalid('domain')}${disabled()}>${options(DOMAINS, state.domain)}</select></div><div class="ba-field"><label for="${id('region')}">${escaped('region')} <small>${escaped('required')}</small></label><select id="${id('region')}" name="region" required${invalid('region')}${disabled()}>${options(REGIONS, state.region)}</select></div></div>${plans}`;
    }
    function situationSection() {
      const described = `${id('summary')}-hint ${id('summary')}-avoid ${id('summary')}-count${errorRef('summary')}`;
      return `${radios('stage', STAGES, 'stage')}${radios('objective', OBJECTIVES, 'objective')}<div class="ba-field ba-field--wide"><label for="${id('summary')}">${escaped('summary')} <small>${escaped('required')}</small></label><p class="ba-fine" id="${id('summary')}-hint">${escaped('summaryHint')}</p><p class="ba-fine ba-avoid" id="${id('summary')}-avoid">${escaped('summaryAvoid')}</p><textarea id="${id('summary')}" name="summary" rows="7" maxlength="${SUMMARY_MAX}" aria-describedby="${described}"${invalid('summary')} required${disabled()}>${escapeHtml(state.summary)}</textarea><p class="ba-count" id="${id('summary')}-count" data-ba-summary-count>${String(state.summary).length} ${escaped('summaryCount')}</p></div>`;
    }
    function timingSection() {
      const bounds = deadlineBounds();
      const urgent = state.urgency === 'immediate' ? `<div class="ba-notice ba-notice--urgent" role="note"><strong>${escaped('urgentTitle')}</strong><p>${escaped('urgentText')}</p><ul>${URGENT_LINKS.map(([href, key]) => `<li><a href="${href}" target="_blank" rel="noopener noreferrer">${escaped(key)}</a></li>`).join('')}</ul></div>` : '';
      const date = state.hasDeadline === 'yes' ? `<div class="ba-field"><label for="${id('deadline')}">${escaped('deadline')} <small>${escaped('required')}</small></label><p class="ba-fine" id="${id('deadline')}-hint">${escaped('deadlineHint')}</p><input id="${id('deadline')}" name="deadline" type="date" min="${bounds.min}" max="${bounds.max}" value="${escapeHtml(state.deadline)}" aria-describedby="${id('deadline')}-hint${errorRef('deadline')}"${invalid('deadline')} required${disabled()}></div>` : '';
      return `${radios('urgency', URGENCIES, 'urgency')}${urgent}${radios('hasDeadline', DEADLINE_CHOICES, 'hasDeadline', 'inline')}${date}`;
    }
    function contactSection() {
      if (!ready()) return `<p class="ba-fine">${escaped('reviewEmpty')}</p>`;
      const consentKey = detailed(state) ? 'requestConsent' : 'consent';
      return `${detailed(state) ? radios('contactPreference', CONTACT_PREFERENCES, 'contactPreference', 'inline') : ''}<div class="ba-grid">${field('name', 'text', 120, 'name')}${field('email', 'email', 254, 'email')}${field('phone', 'tel', 32, 'tel')}</div><div class="ba-honeypot" aria-hidden="true"><label for="${id('website')}">${escaped('website')}</label><input id="${id('website')}" name="website" type="text" autocomplete="off" tabindex="-1" value=""></div><label class="ba-consent"><input name="consent" type="checkbox"${state.consent ? ' checked' : ''}${invalid('consent')} required${disabled()}><span>${escaped(consentKey)}</span></label><p class="ba-fine">${escaped('consentHint')} <a href="https://besoinavocat.ca/politique-de-confidentialite/" target="_blank" rel="noopener noreferrer">${escaped('privacy')}</a></p>`;
    }
    function formatDate(value) {
      try { return new Date(value + 'T12:00:00').toLocaleDateString(state.language === 'en' ? 'en-CA' : 'fr-CA', { year: 'numeric', month: 'long', day: 'numeric' }); }
      catch (_) { return value; }
    }
    function reviewSection() {
      const row = (label, value, wide) => `<div${wide ? ' class="is-wide"' : ''}><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
      const group = (step, titleKey, rows) => `<section class="ba-review" aria-labelledby="${id('review-' + step)}"><div class="ba-review__head"><h3 id="${id('review-' + step)}">${escaped(titleKey)}</h3><button type="button" class="ba-link-button" data-ba-action="edit" data-ba-edit-step="${step}" aria-label="${escaped('editSection')} : ${escaped(titleKey)}"${disabled()}>${escaped('editSection')}</button></div><dl>${rows.join('')}</dl></section>`;
      const groups = [group('role', 'reviewPath', [row(text('role'), text(state.role + 'Short')), row(text('language'), text(state.requestLanguage || state.language))].concat(state.role === 'client' ? [row(text('price'), text('free'))] : [])),
        group('preferences', 'reviewPreferences', [row(text('domain'), labelOf(DOMAINS, state.domain, state.language)), row(text('region'), labelOf(REGIONS, state.region, state.language))].concat(state.role === 'professional' ? [row(text('plan'), labelOf(PLANS, state.periodicity, state.language))] : []))];
      if (detailed(state)) {
        groups.push(group('situation', 'reviewSituation', [row(text('stage'), labelOf(STAGES, state.stage, state.language)), row(text('objective'), labelOf(OBJECTIVES, state.objective, state.language)), row(text('summary'), normalizeSummary(state.summary), true)]));
        groups.push(group('timing', 'reviewTiming', [row(text('urgency'), labelOf(URGENCIES, state.urgency, state.language)), row(text('deadline'), state.hasDeadline === 'yes' ? formatDate(state.deadline) : text('noDeadline'))]));
      }
      if (ready()) {
        const rows = [row(text('name'), state.name.trim()), row(text('email'), state.email.trim()), row(detailed(state) && state.contactPreference === 'phone' ? text('phoneRequired') : text('phone'), state.phone.trim() || text('optionalEmpty'))];
        if (detailed(state)) rows.push(row(text('contactPreference'), labelOf(CONTACT_PREFERENCES, state.contactPreference, state.language)));
        rows.push(row(text('summaryConsent'), text('agreed')));
        groups.push(group('contact', 'reviewContact', rows));
      } else groups.push(`<p class="ba-fine">${escaped('reviewEmpty')}</p>`);
      const changed = changedUncertainAttempt(state) ? `<div class="ba-notice" role="status">${escaped('changedAttempt')}</div>` : '';
      const retry = state.requestLanguage && state.requestLanguage !== state.language ? `<p class="ba-fine">${escaped('retryLanguage')}</p>` : '';
      return groups.join('') + changed + retry;
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
        if (!steps.includes(state.step)) state.step = 'role';
        const index = steps.indexOf(state.step);
        const stepper = `<nav aria-label="${escaped('progress')}"><ol class="ba-steps ba-steps--${steps.length}">${steps.map((step, i) => `<li${i === index ? ' aria-current="step"' : ''}${i < index ? ' class="is-complete"' : ''}><span aria-hidden="true">${i < index ? '✓' : i + 1}</span><span>${escapeHtml(text('steps')[STEP_ORDER.indexOf(step)])}</span></li>`).join('')}</ol></nav>`;
        const status = service === 'loading' ? `<p class="ba-fine" role="status">${escaped('loading')}</p>` : !ready() ? `<div class="ba-notice"><strong>${escaped('closedTitle')}</strong><p>${escaped('closed')}</p><a href="tel:+15148252825">${escaped('call')}</a></div>` : '';
        const error = state.error ? `<div class="ba-error" id="ba-request-error" role="alert" tabindex="-1"><strong>${escaped('errorTitle')}</strong><p>${escapeHtml(text(state.error) || text('uncertain'))}</p></div>` : '';
        const sections = { role: () => `<div class="ba-choices">${roleCard('client')}${roleCard('professional')}</div>`, preferences: preferencesSection, situation: situationSection, timing: timingSection, contact: contactSection, review: reviewSection };
        const last = state.step === 'review';
        const next = last
          ? `<button class="ba-button" type="submit"${!ready() || state.pending ? ' disabled' : ''}>${escaped(state.pending ? 'sending' : changedUncertainAttempt(state) ? 'submitChanged' : 'submit')}</button>`
          : `<button class="ba-button" type="submit"${disabled()}>${escaped(state.returnToReview ? 'backToReview' : 'next')} <span aria-hidden="true">→</span></button>`;
        view.innerHTML = `${stepper}${status}<form novalidate aria-busy="${state.pending}">${error}<p class="ba-step-label">${escaped('step')} ${index + 1} ${escaped('of')} ${steps.length}</p><h2 tabindex="-1" data-ba-step-heading>${escaped(state.step + 'Title')}</h2><p class="ba-hint">${escaped(state.step + 'Hint')}</p>${sections[state.step]()}<div class="ba-actions">${index > 0 ? `<button class="ba-back" type="button" data-ba-action="back"${disabled()}>${escaped('previous')}</button>` : '<span></span>'}${next}</div></form>`;
      }
      if (focus) {
        const target = state.error ? view.querySelector('[role="alert"]') : view.querySelector('[data-ba-step-heading]');
        if (target) target.focus({ preventScroll: false });
      }
    }
    function setError(failure) { state.error = failure.key; state.errorField = failure.field || ''; render(true); }
    const CAPTURED = ['domain', 'region', 'name', 'email', 'phone', 'website', 'summary', 'deadline', 'stage', 'objective', 'urgency', 'hasDeadline', 'contactPreference', 'periodicity'];
    function captureVisibleFields() {
      // Also captures autofilled values; some browsers do not emit input events for them.
      if (state.pending) return;
      const form = view.querySelector('form');
      if (!form) return;
      for (const name of CAPTURED) {
        const element = form.elements.namedItem(name);
        if (!element) continue;
        if (element.tagName) { if (!element.disabled) state[name] = element.type === 'radio' ? (element.checked ? element.value : '') : element.value; }
        else if (!Array.from(element).some((item) => item.disabled)) state[name] = element.value;
      }
      const consent = form.elements.namedItem('consent');
      if (consent && !consent.disabled) state.consent = consent.checked;
    }
    function changeRole(role) {
      const before = consentVersionFor(state);
      state.role = role === 'professional' ? 'professional' : 'client';
      // A different consent text must be agreed to again.
      if (consentVersionFor(state) !== before) state.consent = false;
    }
    root.addEventListener('input', (event) => {
      const input = event.target;
      if (state.pending || !['name', 'email', 'phone', 'website', 'summary', 'deadline'].includes(input.name)) return;
      state[input.name] = input.value;
      if (input.name === 'summary') {
        const counter = view.querySelector('[data-ba-summary-count]');
        if (counter) counter.textContent = `${input.value.length} ${text('summaryCount')}`;
      }
    });
    root.addEventListener('change', (event) => {
      const input = event.target;
      if (state.pending || !input.name) return;
      if (['domain', 'region', 'stage', 'objective', 'deadline'].includes(input.name)) state[input.name] = input.value;
      if (input.name === 'consent') state.consent = input.checked;
      if (['urgency', 'hasDeadline', 'contactPreference', 'periodicity'].includes(input.name)) {
        // These choices change the questions shown below them.
        captureVisibleFields();
        state[input.name] = input.value;
        if (state.errorField === input.name) { state.error = ''; state.errorField = ''; }
        render(false);
        const again = view.querySelector(`input[name="${input.name}"][value="${input.value}"]`);
        if (again) again.focus();
      }
    });
    document.addEventListener('click', (event) => {
      const target = event.target.closest && event.target.closest('button');
      if (!target) return;
      if (target.dataset.baLanguage) {
        if (state.pending) return;
        captureVisibleFields(); state.language = languageOf(target.dataset.baLanguage); render(false);
        return;
      }
      if (!root.contains(target) || state.pending) return;
      if (target.dataset.baRole) {
        changeRole(target.dataset.baRole); state.error = ''; state.errorField = ''; render(false);
        const again = view.querySelector(`[data-ba-role="${state.role}"]`);
        if (again) again.focus();
        return;
      }
      const action = target.dataset.baAction;
      if (action === 'back') {
        captureVisibleFields();
        const steps = stepsFor(state);
        state.step = steps[Math.max(0, steps.indexOf(state.step) - 1)];
        state.error = ''; state.errorField = ''; render(true);
      }
      if (action === 'edit') {
        const steps = stepsFor(state);
        state.step = steps.includes(target.dataset.baEditStep) ? target.dataset.baEditStep : 'role';
        state.returnToReview = true; state.error = ''; state.errorField = ''; render(true);
      }
      if (action === 'restart') {
        const mode = state.requestMode, lang = state.language;
        Object.assign(state, initialState('client', lang, mode)); attempt.clear(); render(true);
      }
    });
    root.addEventListener('submit', async (event) => {
      if (!view.contains(event.target)) return;
      event.preventDefault();
      if (state.pending || state.receipt) return;
      captureVisibleFields();
      // Without an open intake, contact details are neither collected nor validated.
      const exploring = !ready() && (state.step === 'contact' || state.step === 'review');
      const failure = validate(state, exploring ? 'timing' : state.step);
      if (failure) { setError(failure); return; }
      if (state.step !== 'review') {
        if (state.returnToReview) {
          const pending = validate(state, ready() ? 'review' : 'timing');
          if (pending) { state.step = FIELD_STEPS[pending.field] || 'contact'; setError(pending); return; }
          state.step = 'review'; state.returnToReview = false;
        } else {
          const steps = stepsFor(state);
          state.step = steps[steps.indexOf(state.step) + 1];
        }
        state.error = ''; state.errorField = ''; render(true); return;
      }
      if (!ready()) { setError({ key: 'serviceUnavailable' }); return; }
      let request;
      try { request = attempt.prepare(payloadFrom(state)); } catch (_) { setError({ key: 'secureUnavailable' }); return; }
      if (!state.requestLanguage) state.requestLanguage = state.language;
      state.pending = true; state.error = ''; state.errorField = ''; render(false);
      const result = await sendRequest(request, global.fetch.bind(global));
      state.pending = false;
      if (result.reference) {
        state.receipt = result.reference;
        // Nothing entered is kept after a confirmed receipt.
        Object.assign(state, { name: '', email: '', phone: '', consent: false, website: '', summary: '', deadline: '', hasDeadline: '',
          stage: '', objective: '', urgency: '', contactPreference: 'email', uncertainBody: '', returnToReview: false });
        attempt.clear();
      } else { state.error = result.error; if (result.error === 'uncertain') state.uncertainBody = request.body; }
      render(true);
    });
    render(false);
    if (secure) {
      loadService(global.fetch.bind(global)).then((result) => {
        service = result.open ? 'open' : 'closed';
        if (!state.pending && !state.receipt) {
          const before = consentVersionFor(state);
          state.requestMode = result.open && result.requestMode;
          if (consentVersionFor(state) !== before) state.consent = false;
          if (!stepsFor(state).includes(state.step)) state.step = 'preferences';
          render(false);
        }
      });
    } else { service = 'closed'; render(false); }
    return { state };
  }

  const api = { CONSENT_VERSION, REQUEST_CONSENT_VERSION, DOMAINS, REGIONS, STAGES, OBJECTIVES, URGENCIES, CONTACT_PREFERENCES, DEADLINE_CHOICES, PLANS,
    STEP_ORDER, COPY, ERROR_KEYS, escapeHtml, initialState, detailed, stepsFor, consentVersionFor, normalizeSummary, deadlineBounds, validDeadline,
    validate, payloadFrom, serviceFrom, preselection, createAttempt, changedUncertainAttempt, receiptFrom, sendRequest, loadService };
  // Pure contract functions are exported for deterministic tests, without a DOM.
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (global.document) {
    const start = () => global.document.querySelectorAll('[data-ba-request]').forEach(mount);
    if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }
})(typeof window === 'object' ? window : globalThis);
