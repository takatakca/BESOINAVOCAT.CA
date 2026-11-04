// Original product questions. These categories do not determine a legal remedy,
// jurisdiction, deadline or eligibility and never create a mandate or permission.
// 2026-11-04.1: guided request in the order chosen by the owner (area of law, situation, other parties, urgency,
// legal aid, availability, contact). The wording is BesoinAvocat's own; only the order of the steps was taken as a model.
export const QUESTIONNAIRE_VERSION = '2026-11-04.1';
export const QUESTIONNAIRE_CONSENT_VERSION = '2026-11-04.1';
export const QUESTIONNAIRE_CONSENT_TEXT = {
  fr: 'Je consens à ce que BesoinAvocat conserve mes coordonnées, mes réponses, le résumé de ma situation, le nom des autres parties que j’indique, mes renseignements sur l’aide juridique et mes disponibilités pour traiter ma demande, vérifier l’absence de conflit d’intérêts et me recontacter. Je n’inclus aucun document, numéro d’identification ou renseignement de santé non nécessaire. Cet envoi ne crée ni mandat, ni relation avocat-client, ni attribution d’avocat, ni abonnement, ni paiement.',
  en: 'I consent to BesoinAvocat storing my contact details, answers, the summary of my situation, the names of the other parties I provide, my legal aid information and my availability to process my request, check for conflicts of interest and contact me. I am not including any document, identification number or unnecessary health information. This submission does not create a legal mandate, lawyer-client relationship, lawyer assignment, subscription or payment.',
};
const label = (fr, en) => ({ fr, en });
const option = (id, fr, en) => ({ id, label: label(fr, en) });
const question = (id, fr, en, options, when) => ({ id, label: label(fr, en), type: 'select', required: true, options, ...(when ? { when } : {}) });
const unsure = () => option('unsure', 'Je ne sais pas / à préciser', 'I do not know / to clarify');
const yesNo = () => [option('yes', 'Oui', 'Yes'), option('no', 'Non', 'No'), unsure()];
const when = (field, ...values) => ({ field, values });
const definitions = {
  family: [
    question('topic', 'Quel sujet souhaitez-vous aborder ?', 'Which topic would you like to discuss?', [
      option('separation', 'Séparation ou divorce', 'Separation or divorce'), option('parenting', 'Modalités parentales', 'Parenting arrangements'),
      option('support', 'Pension alimentaire', 'Support payments'), option('agreement', 'Convention ou accord familial', 'Family agreement'), option('other', 'Autre sujet familial', 'Other family matter')]),
    question('relationship', 'Quel contexte décrit votre situation ?', 'Which context describes your situation?', [option('married', 'Mariage', 'Marriage'), option('civil_union', 'Union civile', 'Civil union'), option('common_law', 'Union de fait', 'Common-law relationship'), unsure()], when('topic', 'separation')),
    question('arrangement', 'Existe-t-il déjà une entente ou une décision sur ce sujet ?', 'Is there an existing agreement or decision about this topic?', yesNo()),
    question('agreementGoal', 'Quelle démarche envisagez-vous pour cette entente ?', 'What would you like to do about that agreement?', [option('understand', 'La comprendre', 'Understand it'), option('change', 'Demander un changement', 'Request a change'), option('apply', 'En discuter l’application', 'Discuss how it applies'), unsure()], when('arrangement', 'yes')),
  ],
  employment: [
    question('topic', 'Quel sujet de travail vous concerne ?', 'Which employment topic concerns you?', [option('dismissal', 'Fin d’emploi', 'End of employment'), option('conditions', 'Conditions ou rémunération', 'Conditions or pay'), option('harassment', 'Harcèlement ou climat de travail', 'Harassment or work environment'), option('contract', 'Contrat de travail', 'Employment contract'), option('other', 'Autre', 'Other')]),
    question('workRole', 'À quel titre faites-vous la demande ?', 'In what capacity are you making this request?', [option('employee', 'Salarié·e', 'Employee'), option('employer', 'Employeur', 'Employer'), option('self_employed', 'Travailleur·euse autonome', 'Self-employed'), unsure()]),
    question('noticeForm', 'Comment la fin d’emploi a-t-elle été annoncée ?', 'How was the end of employment communicated?', [option('written', 'Par écrit', 'In writing'), option('verbal', 'Verbalement', 'Verbally'), option('not_yet', 'Pas encore annoncée', 'Not yet communicated'), unsure()], when('topic', 'dismissal')),
    question('internalProcess', 'Une démarche interne a-t-elle déjà été entreprise ?', 'Has an internal process already been started?', [option('none', 'Non', 'No'), option('started', 'Oui, en cours', 'Yes, ongoing'), option('finished', 'Oui, terminée', 'Yes, finished'), unsure()], when('topic', 'harassment')),
  ],
  housing: [
    question('topic', 'Quel sujet de logement vous concerne ?', 'Which housing topic concerns you?', [option('rent', 'Loyer ou paiement', 'Rent or payment'), option('departure', 'Départ, reprise ou éviction annoncée', 'Departure, repossession or eviction notice'), option('repairs', 'Réparations ou état du logement', 'Repairs or housing conditions'), option('lease', 'Bail ou renouvellement', 'Lease or renewal'), option('other', 'Autre', 'Other')]),
    question('housingRole', 'Quel est votre rôle dans cette situation ?', 'What is your role in this situation?', [option('tenant', 'Locataire ou colocataire', 'Tenant or co-tenant'), option('landlord', 'Propriétaire', 'Landlord'), option('other', 'Autre', 'Other'), unsure()]),
    question('writtenNotice', 'Un avis écrit a-t-il été reçu ou envoyé ?', 'Has a written notice been received or sent?', yesNo(), when('topic', 'departure', 'lease')),
    question('repairNotice', 'Le problème a-t-il déjà été signalé par écrit ?', 'Has the issue already been reported in writing?', yesNo(), when('topic', 'repairs')),
  ],
  civil: [
    question('topic', 'Quel type de différend souhaitez-vous aborder ?', 'What type of dispute would you like to discuss?', [option('contract', 'Contrat ou service', 'Contract or service'), option('damage', 'Bien endommagé ou perte', 'Property damage or loss'), option('debt', 'Somme réclamée ou impayée', 'Claimed or unpaid amount'), option('insurance', 'Assurance ou indemnisation', 'Insurance or compensation'), option('other', 'Autre', 'Other')]),
    question('notice', 'Une mise en demeure ou une demande écrite existe-t-elle ?', 'Is there a formal notice or written demand?', [option('received', 'J’en ai reçu une', 'I received one'), option('sent', 'J’en ai envoyé une', 'I sent one'), option('both', 'Les deux', 'Both'), option('none', 'Non', 'No'), unsure()]),
    question('amountBand', 'Quel ordre de montant est en discussion ?', 'Approximately what amount is being discussed?', [option('under_5000', 'Moins de 5 000 CAD', 'Under CAD 5,000'), option('5000_25000', '5 000 à 25 000 CAD', 'CAD 5,000 to 25,000'), option('over_25000', 'Plus de 25 000 CAD', 'Over CAD 25,000'), option('not_amount', 'Pas de montant précis', 'No specific amount'), unsure()], when('topic', 'damage', 'debt', 'insurance')),
  ],
  criminal: [
    question('topic', 'Quel document ou événement motive votre demande ?', 'Which document or event prompted your request?', [option('summons', 'Convocation ou citation', 'Summons or appearance notice'), option('charge', 'Accusation', 'Charge'), option('ticket', 'Constat d’infraction', 'Offence ticket'), option('victim', 'Démarche comme victime ou témoin', 'Matter as a victim or witness'), option('other', 'Autre', 'Other')]),
    question('documentAvailable', 'Avez-vous un document à faire examiner plus tard ?', 'Do you have a document to be reviewed later?', yesNo()),
    question('ticketStep', 'Quelle démarche a déjà été faite pour le constat ?', 'What has already been done about the ticket?', [option('none', 'Aucune', 'None'), option('contested', 'Une contestation a été transmise', 'A contestation was submitted'), option('decision', 'Une décision a été reçue', 'A decision was received'), unsure()], when('topic', 'ticket')),
  ],
  business: [
    question('topic', 'Quel sujet d’affaires souhaitez-vous aborder ?', 'Which business topic would you like to discuss?', [option('contract', 'Contrat commercial', 'Business contract'), option('corporate', 'Création ou organisation d’entreprise', 'Business formation or organization'), option('collection', 'Créance ou paiement', 'Debt or payment'), option('dispute', 'Différend commercial', 'Business dispute'), option('other', 'Autre', 'Other')]),
    question('businessRole', 'À quel titre faites-vous cette demande ?', 'In what capacity are you making this request?', [option('owner', 'Propriétaire ou associé·e', 'Owner or partner'), option('director', 'Administrateur·trice', 'Director'), option('employee', 'Employé·e ou représentant·e', 'Employee or representative'), option('independent', 'Travailleur·euse autonome', 'Self-employed'), unsure()]),
    question('businessStage', 'À quelle étape se trouve le projet ?', 'What stage is the project at?', [option('planning', 'En préparation', 'Planning'), option('active', 'En activité', 'Operating'), option('closing', 'Fin ou réorganisation envisagée', 'Closure or reorganization considered'), unsure()], when('topic', 'corporate')),
  ],
  immigration: [
    question('topic', 'Quel type de démarche souhaitez-vous aborder ?', 'What type of process would you like to discuss?', [option('work', 'Travail', 'Work'), option('study', 'Études', 'Studies'), option('family', 'Famille ou parrainage', 'Family or sponsorship'), option('permanent', 'Résidence permanente', 'Permanent residence'), option('decision', 'Décision reçue ou refus', 'Decision received or refusal'), option('other', 'Autre', 'Other')]),
    question('applicationStage', 'Où en est cette démarche ?', 'What stage is this process at?', [option('planned', 'Pas encore déposée', 'Not yet submitted'), option('submitted', 'Déposée, en attente', 'Submitted, awaiting response'), option('information', 'Renseignements supplémentaires demandés', 'Additional information requested'), option('decision', 'Décision reçue', 'Decision received'), unsure()]),
    question('decisionAvailable', 'La décision écrite est-elle disponible ?', 'Is the written decision available?', yesNo(), when('topic', 'decision')),
  ],
  other: [
    question('topic', 'Quelle catégorie semble la plus proche ?', 'Which category seems closest?', [option('tax', 'Fiscalité', 'Tax'), option('administrative', 'Décision d’un organisme', 'Decision by an organization'), option('estate', 'Succession ou testament', 'Estate or will'), option('notarial', 'Démarche notariale', 'Notarial matter'), option('identify', 'Je veux préciser le domaine', 'I need help identifying the area')]),
    question('context', 'Dans quel contexte faites-vous la demande ?', 'In what context are you making the request?', [option('personal', 'Personnel', 'Personal'), option('business', 'Entreprise', 'Business'), option('organization', 'Association ou organisme', 'Association or organization'), unsure()]),
    question('documentAvailable', 'Avez-vous un document à faire examiner plus tard ?', 'Do you have a document to be reviewed later?', yesNo()),
  ],
};
// Areas without targeted questions go straight from the area of law to the situation.
for (const domain of ['real-estate', 'administrative', 'liability', 'tax', 'estates', 'rights', 'insolvency', 'municipal']) definitions[domain] = [];

// Steps shared by every area of law. Skips mirror the owner's model: no opposing party to check in criminal or
// immigration matters, and no legal aid question for a business. Nothing here decides eligibility.
const FLOW = {
  otherParties: { skipFor: ['criminal', 'immigration'], maxLength: 300,
    statuses: [option('named', 'Je connais le nom', 'I know the name'), option('none', 'Aucune autre partie', 'No other party'), option('unknown', 'Je ne sais pas encore', 'I do not know yet')] },
  legalAid: { skipFor: ['business'],
    interest: [option('check', 'Je souhaite vérifier si l’aide juridique peut s’appliquer', 'I would like to check whether legal aid may apply'),
      option('private', 'Je cherche un avocat en pratique privée', 'I am looking for a lawyer in private practice'), option('unsure', 'Je ne sais pas', 'I do not know')],
    household: [option('single', 'Personne seule', 'Single person'), option('single_children', 'Personne seule avec enfant(s) à charge', 'Single person with dependent child(ren)'),
      option('couple', 'Couple sans enfant à charge', 'Couple without dependent children'), option('couple_children', 'Couple avec enfant(s) à charge', 'Couple with dependent child(ren)'),
      option('undisclosed', 'Je préfère ne pas répondre', 'I prefer not to answer')],
    income: [option('under_30000', 'Moins de 30 000 $', 'Under $30,000'), option('30000_44999', '30 000 $ à 44 999 $', '$30,000 to $44,999'),
      option('45000_59999', '45 000 $ à 59 999 $', '$45,000 to $59,999'), option('60000_84999', '60 000 $ à 84 999 $', '$60,000 to $84,999'),
      option('85000_149999', '85 000 $ à 149 999 $', '$85,000 to $149,999'), option('150000_plus', '150 000 $ ou plus', '$150,000 or more'),
      option('undisclosed', 'Je préfère ne pas répondre', 'I prefer not to answer')] },
  availability: { maxSlots: 10, horizonDays: 14,
    periods: [option('morning', 'Matin', 'Morning'), option('noon', 'Midi', 'Noon'), option('afternoon', 'Après-midi', 'Afternoon'), option('evening', 'Soir', 'Evening')] },
  contactTimes: [option('asap', 'Dès que possible', 'As soon as possible'), option('morning', 'Matin', 'Morning'), option('noon', 'Midi', 'Noon'),
    option('afternoon', 'Après-midi', 'Afternoon'), option('evening', 'Soir', 'Evening')],
};

function deepFreeze(value) { Object.values(value).forEach(item => { if (item && typeof item === 'object') deepFreeze(item); }); return Object.freeze(value); }
export const QUESTIONNAIRE_SCHEMA = deepFreeze({ version: QUESTIONNAIRE_VERSION, audience: 'client',
  provenance: { kind: 'product_questionnaire', author: 'BesoinAvocat', developedOn: '2026-10-28', flowRevisedOn: '2026-11-04', externalQuestionsCopied: false,
    note: label('Questions de préparation rédigées pour BesoinAvocat. L’ordre des étapes suit un parcours de référence choisi par le propriétaire; aucun libellé n’en est repris. Aucune conclusion juridique automatique, y compris sur l’admissibilité à l’aide juridique.',
      'Preparation questions written for BesoinAvocat. The order of the steps follows a reference flow chosen by the owner; none of its wording is reused. No automated legal conclusion, including on legal aid eligibility.') },
  consent: { version: QUESTIONNAIRE_CONSENT_VERSION, text: { ...QUESTIONNAIRE_CONSENT_TEXT } },
  review: label('J’ai relu ces réponses et je confirme qu’elles correspondent à la demande que je souhaite transmettre.', 'I have reviewed these answers and confirm they match the request I want to submit.'),
  domains: Object.fromEntries(Object.entries(definitions).map(([domain, questions]) => [domain, { questions }])), flow: FLOW });

export class QuestionnaireError extends Error {
  constructor(field, code = 'QUESTIONNAIRE_INVALID_INPUT') {
    super('Vérifiez les réponses du questionnaire.'); this.status = 400; this.code = code; this.field = field;
  }
}
const plain = value => value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
export function activeQuestions(domain, answers = {}) {
  if (!Object.hasOwn(QUESTIONNAIRE_SCHEMA.domains, domain)) throw new QuestionnaireError('domain');
  return QUESTIONNAIRE_SCHEMA.domains[domain].questions.filter(item => !item.when || (Object.hasOwn(answers, item.when.field) && item.when.values.includes(answers[item.when.field])));
}
export function pruneQuestionnaireAnswers(domain, answers = {}) {
  const clean = {};
  if (!plain(answers)) return clean;
  // Questions are ordered after their dependencies; invalid parents cannot expose child answers.
  for (const item of activeQuestions(domain, answers)) {
    if (item.when && !item.when.values.includes(clean[item.when.field])) continue;
    if (Object.hasOwn(answers, item.id) && item.options.some(option => option.id === answers[item.id])) clean[item.id] = answers[item.id];
  }
  return clean;
}
export function validateQuestionnaire(domain, value, { requireReview = true } = {}) {
  if (!plain(value) || Object.keys(value).some(key => !['version','answers','reviewed'].includes(key)) || value.version !== QUESTIONNAIRE_VERSION || !plain(value.answers)) throw new QuestionnaireError('questionnaire');
  const active = activeQuestions(domain, value.answers), ids = active.map(item => item.id);
  if (Object.keys(value.answers).some(key => !ids.includes(key))) throw new QuestionnaireError('answers');
  const answers = {};
  for (const item of active) {
    const answer = value.answers[item.id];
    if (!Object.hasOwn(value.answers, item.id) || typeof answer !== 'string' || !item.options.some(option => option.id === answer)) throw new QuestionnaireError(item.id);
    answers[item.id] = answer;
  }
  if (requireReview && value.reviewed !== true) throw new QuestionnaireError('reviewed', 'QUESTIONNAIRE_REVIEW_REQUIRED');
  if (value.reviewed !== undefined && typeof value.reviewed !== 'boolean') throw new QuestionnaireError('reviewed');
  return { version: QUESTIONNAIRE_VERSION, answers, reviewed: value.reviewed === true };
}
const ids = list => list.map(item => item.id);
const day = time => Math.floor(time / 86_400_000);
export const otherPartiesAsked = domain => !QUESTIONNAIRE_SCHEMA.flow.otherParties.skipFor.includes(domain);
export const legalAidAsked = domain => !QUESTIONNAIRE_SCHEMA.flow.legalAid.skipFor.includes(domain);
function flowText(value, max) {
  if (typeof value !== 'string' || value.length > max * 2 || !value.isWellFormed()) throw new QuestionnaireError('otherParties');
  const text = value.replace(/\s+/gu, ' ').trim().normalize('NFC');
  if (!text || text.length > max || /[\u0000-\u001f\u007f<>]/u.test(text)) throw new QuestionnaireError('otherParties');
  return text;
}
// Validates the shared steps of the guided request. `time` is the server clock; slots are calendar days
// (YYYY-MM-DD) with one day of tolerance for visitors west or east of UTC.
export function validateFlow(domain, body, time) {
  const flow = QUESTIONNAIRE_SCHEMA.flow, result = {};
  if (otherPartiesAsked(domain)) {
    const value = body.otherParties;
    if (!plain(value) || Object.keys(value).some(key => !['status','names'].includes(key)) || !ids(flow.otherParties.statuses).includes(value.status)) throw new QuestionnaireError('otherParties');
    if (value.status === 'named') result.otherParties = { status: 'named', names: flowText(value.names, flow.otherParties.maxLength) };
    else if (value.names !== undefined) throw new QuestionnaireError('otherParties');
    else result.otherParties = { status: value.status };
  } else if (body.otherParties !== undefined) throw new QuestionnaireError('otherParties');
  if (legalAidAsked(domain)) {
    const value = body.legalAid;
    if (!plain(value) || Object.keys(value).length !== 3 || !ids(flow.legalAid.interest).includes(value.interest) ||
        !ids(flow.legalAid.household).includes(value.household) || !ids(flow.legalAid.income).includes(value.income)) throw new QuestionnaireError('legalAid');
    result.legalAid = { interest: value.interest, household: value.household, income: value.income };
  } else if (body.legalAid !== undefined) throw new QuestionnaireError('legalAid');
  const availability = body.availability;
  if (!plain(availability)) throw new QuestionnaireError('availability');
  if (availability.asap === true && Object.keys(availability).length === 1) result.availability = { asap: true };
  else {
    const slots = availability.slots, periods = ids(flow.availability.periods), today = day(time);
    if (Object.keys(availability).length !== 1 || !Array.isArray(slots) || slots.length < 1 || slots.length > flow.availability.maxSlots ||
        new Set(slots).size !== slots.length) throw new QuestionnaireError('availability');
    for (const slot of slots) {
      const match = typeof slot === 'string' && /^(\d{4})-(\d{2})-(\d{2}):([a-z]+)$/u.exec(slot);
      if (!match || !periods.includes(match[4])) throw new QuestionnaireError('availability');
      const date = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      if (new Date(date).toISOString().slice(0, 10) !== slot.slice(0, 10)) throw new QuestionnaireError('availability');
      if (day(date) < today - 1 || day(date) > today + flow.availability.horizonDays + 1) throw new QuestionnaireError('availability');
    }
    result.availability = { slots: [...slots].sort() };
  }
  const times = body.contactTimes;
  if (!Array.isArray(times) || times.length > flow.contactTimes.length || new Set(times).size !== times.length || times.some(item => !ids(flow.contactTimes).includes(item))) throw new QuestionnaireError('contactTimes');
  result.contactTimes = ids(flow.contactTimes).filter(item => times.includes(item));
  if (typeof body.acceptRemote !== 'boolean') throw new QuestionnaireError('acceptRemote');
  result.acceptRemote = body.acceptRemote;
  return result;
}
export function publicQuestionnaire() { return structuredClone(QUESTIONNAIRE_SCHEMA); }
