// Original product questions. These categories do not determine a legal remedy,
// jurisdiction, deadline or eligibility and never create a mandate or permission.
export const QUESTIONNAIRE_VERSION = '2026-10-28.1';
export const QUESTIONNAIRE_CONSENT_VERSION = '2026-10-28.1';
export const QUESTIONNAIRE_CONSENT_TEXT = {
  fr: 'Je consens à ce que BesoinAvocat conserve mes coordonnées, mes réponses au questionnaire, les catégories et le résumé de ma situation pour traiter ma demande de contact et me recontacter. Je n’inclus aucun document, numéro d’identification ou renseignement de santé non nécessaire. Cet envoi ne crée ni mandat, ni relation avocat-client, ni attribution d’avocat, ni abonnement, ni paiement.',
  en: 'I consent to BesoinAvocat storing my contact details, questionnaire answers, categories and situation summary to process my contact request and contact me. I am not including any document, identification number or unnecessary health information. This submission does not create a legal mandate, lawyer-client relationship, lawyer assignment, subscription or payment.',
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
function deepFreeze(value) { Object.values(value).forEach(item => { if (item && typeof item === 'object') deepFreeze(item); }); return Object.freeze(value); }
export const QUESTIONNAIRE_SCHEMA = deepFreeze({ version: QUESTIONNAIRE_VERSION, audience: 'client',
  provenance: { kind: 'product_questionnaire', author: 'BesoinAvocat', developedOn: '2026-10-28', externalQuestionsCopied: false,
    note: label('Questions de préparation conçues pour BesoinAvocat; aucune conclusion juridique automatique.', 'Preparation questions designed for BesoinAvocat; no automated legal conclusion.') },
  consent: { version: QUESTIONNAIRE_CONSENT_VERSION, text: { ...QUESTIONNAIRE_CONSENT_TEXT } },
  review: label('J’ai relu ces réponses et je confirme qu’elles correspondent à la demande que je souhaite transmettre.', 'I have reviewed these answers and confirm they match the request I want to submit.'),
  domains: Object.fromEntries(Object.entries(definitions).map(([domain, questions]) => [domain, { questions }])) });

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
export function publicQuestionnaire() { return structuredClone(QUESTIONNAIRE_SCHEMA); }
