/* BesoinAvocat optional intake. This file never reads accounts or case documents. */
(function (global) {
  'use strict';
  const CONSENT_VERSION = '2026-10-26.1';
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
    'outside-quebec': ['Hors Québec', 'Outside Québec']
  };
  const COPY = {
    fr: {
      steps: ['Votre parcours', 'Vos préférences', 'Vos coordonnées', 'Votre récapitulatif'],
      progress: 'Progression du parcours', step: 'Étape', of: 'sur',
      roleTitle: 'Quelle est votre prochaine étape ?', roleHint: 'Votre choix prépare une demande, sans créer de compte ni donner accès à un dossier.',
      client: 'Je cherche un avocat', clientShort: 'Client', professional: 'Je suis avocat', professionalShort: 'Avocat',
      clientDetail: 'Préparer une demande gratuite. Les honoraires juridiques restent distincts.',
      professionalDetail: 'Signaler mon intérêt pour un espace professionnel, sous réserve de vérification de mon habilitation.',
      preferencesTitle: 'Dans quel domaine et quelle région ?', preferencesHint: 'Ces catégories servent à orienter votre demande. Elles ne garantissent ni réponse ni disponibilité.',
      domain: 'Domaine', region: 'Région', choose: 'Choisir une option', plan: 'Formule qui vous intéresse',
      weekly: '100 CAD / semaine', monthly: '300 CAD / mois', planHint: 'Choix indicatif uniquement : aucun abonnement, paiement ou engagement à cette étape.',
      contactTitle: 'Comment vous recontacter ?', contactHint: 'Renseignez uniquement vos coordonnées. Aucun détail de votre affaire, mot de passe ou document.',
      name: 'Nom', email: 'Courriel', phone: 'Téléphone (facultatif)',
      consent: 'Je consens à ce que BesoinAvocat conserve ces coordonnées et catégories pour traiter ma demande de contact. Je ne transmets aucun récit juridique ni document. Cet envoi ne crée ni mandat, ni abonnement, ni paiement.',
      privacy: 'Lire la politique de confidentialité', consentHint: 'Ce consentement ne vaut ni mandat juridique, ni abonnement, ni inscription à une infolettre.',
      unavailable: 'La réception des demandes en ligne n’est pas ouverte ici. Vous pouvez explorer le parcours, puis appeler BesoinAvocat au 514 825-2825. Aucune coordonnée n’est envoyée.',
      unavailableShort: 'Réception en ligne non ouverte', reviewTitle: 'Relisez avant d’envoyer.', reviewHint: 'Seuls les éléments ci-dessous seront transmis. Ils ne seront pas publiés sur le site.',
      reviewEmpty: 'Coordonnées non recueillies : la réception en ligne n’est pas ouverte.', role: 'Parcours', language: 'Langue de suivi', fr: 'Français', en: 'Anglais',
      contact: 'Coordonnées', price: 'Tarif indiqué', free: 'Demande client gratuite — honoraires de l’avocat distincts', ai: 'Crédits IA séparés; aucun prix IA défini ici.',
      agreed: 'Consentement accepté', required: 'Obligatoire', optionalEmpty: 'Non renseigné',
      previous: 'Retour', next: 'Continuer', submit: 'Envoyer ma demande', sending: 'Envoi en cours…', edit: 'Modifier mes coordonnées',
      received: 'Votre demande a été reçue.', reference: 'Votre référence',
      receivedHint: 'Conservez cette référence. La réception ne confirme ni rendez-vous, ni acceptation d’un mandat, ni création de compte ou d’abonnement. Aucun délai de réponse n’est garanti.',
      restart: 'Préparer une autre demande', call: 'Appeler le 514 825-2825', errorTitle: 'Un point à vérifier',
      missingRole: 'Choisissez votre parcours.', missingDomain: 'Choisissez un domaine.', missingRegion: 'Choisissez une région.',
      missingPlan: 'Choisissez une formule indicative.', invalidName: 'Saisissez un nom de 1 à 120 caractères, sans chevrons ni caractères de contrôle.',
      invalidEmail: 'Saisissez une adresse courriel valide (254 caractères maximum).', invalidPhone: 'Vérifiez le numéro : de 7 à 15 chiffres, avec +, espaces, parenthèses, points ou tirets uniquement.',
      consentRequired: 'Votre accord est nécessaire pour envoyer ces coordonnées.', invalidInput: 'Vérifiez les renseignements saisis avant de réessayer.',
      serviceUnavailable: 'La réception est momentanément indisponible. Vous pouvez appeler le 514 825-2825.', forbidden: 'Ce formulaire n’est pas autorisé à envoyer la demande depuis cette page. Veuillez appeler BesoinAvocat.',
      rateLimit: 'Trop de tentatives rapprochées. Patientez avant de réessayer, ou appelez BesoinAvocat.', conflict: 'Cette tentative ne correspond plus aux renseignements préparés. Modifiez un renseignement avant de réessayer, ou appelez BesoinAvocat.',
      uncertain: 'Nous ne pouvons pas confirmer la réception. Vous pouvez réessayer avec les mêmes renseignements : la même référence de tentative sera conservée pour éviter un double envoi.',
      secureUnavailable: 'L’envoi sécurisé n’est pas disponible dans ce navigateur ou sur cette page. Veuillez appeler BesoinAvocat.',
      retryLanguage: 'La langue de suivi conserve celle de la première tentative pour permettre une reprise sans double envoi. La langue d’affichage peut être différente.',
      changedAttempt: 'La réception de la tentative précédente reste inconnue. Vous avez changé des renseignements : cet envoi créera une nouvelle demande et peut faire doublon avec la précédente. Pour éviter cela, vous pouvez appeler BesoinAvocat.',
      submitChanged: 'Envoyer la demande modifiée',
      website: 'Laisser ce champ vide', summaryConsent: 'Accord de traitement des coordonnées et préférences', close: 'Fermer ce parcours'
    },
    en: {
      steps: ['Your path', 'Your preferences', 'Your contact details', 'Your summary'],
      progress: 'Form progress', step: 'Step', of: 'of',
      roleTitle: 'What is your next step?', roleHint: 'Your choice prepares a request. It does not create an account or grant access to a case.',
      client: 'I am looking for a lawyer', clientShort: 'Client', professional: 'I am a lawyer', professionalShort: 'Lawyer',
      clientDetail: 'Prepare a free request. Legal fees remain separate.',
      professionalDetail: 'Express interest in a professional workspace, subject to verification of my professional authorization.',
      preferencesTitle: 'Which area of law and region?', preferencesHint: 'These categories help route your request. They do not guarantee a response or availability.',
      domain: 'Area of law', region: 'Region', choose: 'Choose an option', plan: 'Option you are interested in',
      weekly: '100 CAD / week', monthly: '300 CAD / month', planHint: 'This is an indication of interest only: no subscription, payment or commitment at this step.',
      contactTitle: 'How can we contact you?', contactHint: 'Enter contact details only. Do not include case details, passwords or documents.',
      name: 'Name', email: 'Email', phone: 'Phone (optional)',
      consent: 'I consent to BesoinAvocat storing these contact details and categories to process my contact request. I am not submitting a legal account or document. This submission does not create a legal engagement, subscription or payment.',
      privacy: 'Read the privacy policy', consentHint: 'This consent does not constitute a legal mandate, subscription or newsletter signup.',
      unavailable: 'Online intake is not open here. You may explore the form, then call BesoinAvocat at 514 825-2825. No contact details are sent.',
      unavailableShort: 'Online intake is not open', reviewTitle: 'Review before sending.', reviewHint: 'Only the items below will be sent. They will not be published on the website.',
      reviewEmpty: 'No contact details collected: online intake is not open.', role: 'Path', language: 'Follow-up language', fr: 'French', en: 'English',
      contact: 'Contact details', price: 'Stated price', free: 'Free client request — lawyer’s fees are separate', ai: 'AI credits are separate; no AI price is defined here.',
      agreed: 'Consent accepted', required: 'Required', optionalEmpty: 'Not provided',
      previous: 'Back', next: 'Continue', submit: 'Send my request', sending: 'Sending…', edit: 'Edit my contact details',
      received: 'Your request has been received.', reference: 'Your reference',
      receivedHint: 'Keep this reference. Receipt does not confirm an appointment, acceptance of a legal mandate, or creation of an account or subscription. No response time is guaranteed.',
      restart: 'Prepare another request', call: 'Call 514 825-2825', errorTitle: 'Please check',
      missingRole: 'Choose your path.', missingDomain: 'Choose an area of law.', missingRegion: 'Choose a region.',
      missingPlan: 'Choose an indicative plan.', invalidName: 'Enter a name of 1 to 120 characters, without angle brackets or control characters.',
      invalidEmail: 'Enter a valid email address (254 characters maximum).', invalidPhone: 'Check the phone number: 7 to 15 digits, using only +, spaces, parentheses, periods or hyphens.',
      consentRequired: 'Your consent is required to send these contact details.', invalidInput: 'Check the information entered before trying again.',
      serviceUnavailable: 'Intake is temporarily unavailable. You may call 514 825-2825.', forbidden: 'This form is not authorized to send a request from this page. Please call BesoinAvocat.',
      rateLimit: 'Too many attempts in a short time. Wait before trying again, or call BesoinAvocat.', conflict: 'This attempt no longer matches the prepared information. Change a detail before trying again, or call BesoinAvocat.',
      uncertain: 'We cannot confirm receipt. You may retry with the same information: the same attempt reference will be kept to avoid a duplicate submission.',
      secureUnavailable: 'Secure sending is unavailable in this browser or on this page. Please call BesoinAvocat.',
      retryLanguage: 'The follow-up language remains the language of the first attempt so a retry does not create a duplicate submission. The display language may differ.',
      changedAttempt: 'Receipt of the previous attempt is still unknown. You changed some details: sending now will create a new request and may duplicate the previous one. You may call BesoinAvocat to avoid this.',
      submitChanged: 'Send the changed request',
      website: 'Leave this field empty', summaryConsent: 'Consent to process contact details and preferences', close: 'Close this form'
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
  function safeEndpoint(value, origin) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const page = new URL(origin);
      if (page.protocol !== 'https:') return '';
      const raw = value.trim();
      if (raw !== '/api/intake' && !raw.startsWith('https://')) return '';
      const parsed = new URL(raw, page.origin);
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/api/intake') return '';
      return parsed.href;
    } catch (_) { return ''; }
  }
  function initialState(role, language) {
    return { role: role === 'professional' || role === 'lawyer' ? 'professional' : 'client', language: languageOf(language),
      step: 0, domain: '', region: '', periodicity: 'monthly', name: '', email: '', phone: '', consent: false, website: '',
      pending: false, error: '', errorField: '', receipt: '', requestLanguage: '', uncertainBody: '' };
  }
  function validate(state, throughStep = 3) {
    if (!['client', 'professional'].includes(state.role)) return { field: 'role', key: 'missingRole' };
    if (throughStep < 1) return null;
    if (!has(DOMAINS, state.domain)) return { field: 'domain', key: 'missingDomain' };
    if (!has(REGIONS, state.region)) return { field: 'region', key: 'missingRegion' };
    if (state.role === 'professional' && !['weekly', 'monthly'].includes(state.periodicity)) return { field: 'periodicity', key: 'missingPlan' };
    if (throughStep < 2) return null;
    const name = String(state.name || '').trim();
    const email = String(state.email || '').trim();
    const phone = String(state.phone || '').trim();
    const unsafe = /[<>\x00-\x1f\x7f-\x9f]/;
    if (!name || name.length > 120 || unsafe.test(name)) return { field: 'name', key: 'invalidName' };
    const pieces = email.split('@');
    if (email.length > 254 || pieces.length !== 2 || pieces[0].length > 64 ||
        !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(email) ||
        pieces[0].startsWith('.') || pieces[0].endsWith('.') || pieces[0].includes('..')) return { field: 'email', key: 'invalidEmail' };
    if (phone && (phone.length > 32 || !/^[+0-9() .-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15)) return { field: 'phone', key: 'invalidPhone' };
    if (state.consent !== true) return { field: 'consent', key: 'consentRequired' };
    if (state.website) return { field: 'website', key: 'invalidInput' };
    return null;
  }
  function payloadFrom(state) {
    if (validate(state)) throw new Error('Invalid intake state');
    const payload = { name: state.name.trim(), email: state.email.trim(), role: state.role, language: languageOf(state.requestLanguage || state.language), domain: state.domain, region: state.region };
    if (state.phone.trim()) payload.phone = state.phone.trim();
    if (state.role === 'professional') payload.periodicity = state.periodicity;
    payload.consent = true;
    payload.consentVersion = CONSENT_VERSION;
    payload.website = '';
    return payload;
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
    let text;
    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader(); const chunks = []; let total = 0;
      try {
        for (;;) {
          const chunk = await reader.read();
          if (chunk.done) break;
          total += chunk.value.byteLength;
          if (total > maximum) { await reader.cancel(); throw new Error('uncertain'); }
          chunks.push(chunk.value);
        }
        const buffer = new Uint8Array(total); let offset = 0;
        for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
        text = new TextDecoder().decode(buffer);
      } finally { reader.releaseLock(); }
    } else {
      text = await response.text();
      if (text.length > maximum) throw new Error('uncertain');
    }
    try { return JSON.parse(text); } catch (_) { throw new Error('uncertain'); }
  }
  async function sendRequest(endpoint, attempt, fetchImpl) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetchImpl(endpoint, { method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store',
        redirect: 'error', referrerPolicy: 'no-referrer', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'Idempotency-Key': attempt.key }, body: attempt.body });
      const value = await readSmallJson(response);
      const reference = receiptFrom(response.status, value);
      if (reference) return { reference };
      const code = value && value.error && value.error.code;
      return { error: has(ERROR_KEYS, code) ? ERROR_KEYS[code] : 'uncertain' };
    } catch (_) { return { error: 'uncertain' }; }
    finally { clearTimeout(timer); }
  }

  const instances = new WeakMap();
  function mount(root) {
    if (instances.has(root)) return instances.get(root);
    const state = initialState(root.dataset.baContext, root.dataset.baLanguage);
    const view = root.querySelector('[data-ba-funnel-view]');
    if (!view) return null;
    const dialog = root.querySelector('[data-ba-dialog]');
    const endpoint = safeEndpoint(root.dataset.baIntakeEndpoint, global.location && global.location.origin);
    const ready = !!endpoint && typeof global.fetch === 'function' && !!global.crypto && typeof global.crypto.getRandomValues === 'function';
    const attempt = createAttempt(global.crypto);
    let opener = null;
    const text = (key) => COPY[state.language][key];
    const escaped = (key) => escapeHtml(text(key));
    const disabled = () => state.pending ? ' disabled' : '';
    function options(choices, selected) {
      return `<option value="">${escaped('choose')}</option>` + Object.keys(choices).map((key) => `<option value="${key}"${key === selected ? ' selected' : ''}>${escapeHtml(labelOf(choices, key, state.language))}</option>`).join('');
    }
    function field(name, type, max, autocomplete) {
      const invalid = state.errorField === name;
      return `<label for="${root.id}-${name}">${escaped(name)}${name !== 'phone' ? ` <small>${escaped('required')}</small>` : ''}</label><input id="${root.id}-${name}" name="${name}" type="${type}" maxlength="${max}" autocomplete="${autocomplete}" value="${escapeHtml(state[name])}"${invalid ? ` aria-invalid="true" aria-describedby="${root.id}-error"` : ''}${name !== 'phone' ? ' required' : ''}${!ready ? ' disabled' : ''}${disabled()}>`;
    }
    function roleCard(role) {
      return `<button type="button" class="ba-funnel__choice${state.role === role ? ' is-selected' : ''}" data-ba-role="${role}" aria-pressed="${state.role === role}"${disabled()}><span class="ba-funnel__choice-icon" aria-hidden="true">${role === 'client' ? '↗' : '§'}</span><strong>${escaped(role)}</strong><span>${escaped(role + 'Detail')}</span><i aria-hidden="true">${state.role === role ? '✓' : '+'}</i></button>`;
    }
    function planCards() {
      return `<fieldset class="ba-funnel__plans"><legend>${escaped('plan')}</legend><div>${['weekly', 'monthly'].map((plan) => `<button type="button" class="${state.periodicity === plan ? 'is-selected' : ''}" data-ba-plan="${plan}" aria-pressed="${state.periodicity === plan}"${disabled()}>${escaped(plan)}</button>`).join('')}</div><p class="ba-funnel__fine">${escaped('planHint')}</p></fieldset>`;
    }
    function summary() {
      const rows = [[text('role'), text(state.role + 'Short')], [text('domain'), labelOf(DOMAINS, state.domain, state.language)], [text('region'), labelOf(REGIONS, state.region, state.language)], [text('language'), text(state.requestLanguage || state.language)], [text('price'), state.role === 'professional' ? text(state.periodicity) : text('free')]];
      if (ready) rows.push([text('name'), state.name.trim()], [text('email'), state.email.trim()], [text('phone'), state.phone.trim() || text('optionalEmpty')], [text('summaryConsent'), text('agreed')]);
      return `<dl class="ba-funnel__summary">${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>${changedUncertainAttempt(state) ? `<div class="ba-funnel__notice" role="status">${escaped('changedAttempt')}</div>` : ''}${state.requestLanguage && state.requestLanguage !== state.language ? `<p class="ba-funnel__fine">${escaped('retryLanguage')}</p>` : ''}<p class="ba-funnel__fine">${escaped('ai')}</p>${ready ? `<button type="button" class="ba-funnel__text-button" data-ba-action="edit"${disabled()}>${escaped('edit')}</button>` : `<p>${escaped('reviewEmpty')}</p>`}`;
    }
    function render(focus) {
      root.lang = state.language;
      root.querySelectorAll('[data-ba-fr][data-ba-en]').forEach((element) => { element.textContent = state.language === 'en' ? element.dataset.baEn : element.dataset.baFr; });
      root.querySelectorAll('[data-ba-aria-fr][data-ba-aria-en]').forEach((element) => { element.setAttribute('aria-label', state.language === 'en' ? element.dataset.baAriaEn : element.dataset.baAriaFr); });
      root.querySelectorAll('[data-ba-language-button]').forEach((element) => { element.setAttribute('aria-pressed', String(element.dataset.baLanguageButton === state.language)); element.disabled = state.pending; });
      root.querySelectorAll('.ba-funnel__pricing [data-ba-plan]').forEach((element) => { element.disabled = state.pending; });
      if (state.receipt) {
        view.innerHTML = `<section class="ba-funnel__received" role="status"><span class="ba-funnel__success-mark" aria-hidden="true">✓</span><h3 tabindex="-1" data-ba-step-heading>${escaped('received')}</h3><p>${escaped('reference')}</p><strong class="ba-funnel__reference">${escapeHtml(state.receipt)}</strong><p>${escaped('receivedHint')}</p><button type="button" class="ba-funnel__button" data-ba-action="restart">${escaped('restart')}</button></section>`;
      } else {
        const stepper = `<nav aria-label="${escaped('progress')}"><ol class="ba-funnel__steps">${text('steps').map((step, index) => `<li${index === state.step ? ' aria-current="step"' : ''} class="${index < state.step ? 'is-complete' : ''}"><span aria-hidden="true">${index < state.step ? '✓' : index + 1}</span><span>${escapeHtml(step)}</span></li>`).join('')}</ol></nav>`;
        const unavailable = !ready ? `<div class="ba-funnel__notice"><strong>${escaped('unavailableShort')}</strong><p>${escaped('unavailable')}</p><a href="tel:+15148252825">${escaped('call')}</a></div>` : '';
        const error = state.error ? `<div class="ba-funnel__error" id="${root.id}-error" role="alert" tabindex="-1"><strong>${escaped('errorTitle')}</strong><p>${escapeHtml(text(state.error) || text('uncertain'))}</p></div>` : '';
        const headingKeys = ['roleTitle', 'preferencesTitle', 'contactTitle', 'reviewTitle'];
        const hints = ['roleHint', 'preferencesHint', 'contactHint', 'reviewHint'];
        let section = '';
        if (state.step === 0) section = `<div class="ba-funnel__choices">${roleCard('client')}${roleCard('professional')}</div>`;
        if (state.step === 1) section = `<div class="ba-funnel__fields"><div><label for="${root.id}-domain">${escaped('domain')}</label><select id="${root.id}-domain" name="domain" required${state.errorField === 'domain' ? ' aria-invalid="true"' : ''}>${options(DOMAINS, state.domain)}</select></div><div><label for="${root.id}-region">${escaped('region')}</label><select id="${root.id}-region" name="region" required${state.errorField === 'region' ? ' aria-invalid="true"' : ''}>${options(REGIONS, state.region)}</select></div></div>${state.role === 'professional' ? planCards() : ''}`;
        if (state.step === 2) section = ready ? `<div class="ba-funnel__fields"><div>${field('name', 'text', 120, 'name')}</div><div>${field('email', 'email', 254, 'email')}</div><div>${field('phone', 'tel', 32, 'tel')}</div></div><div class="ba-funnel__honeypot" aria-hidden="true"><label for="${root.id}-website">${escaped('website')}</label><input id="${root.id}-website" name="website" type="text" autocomplete="off" tabindex="-1" value=""></div><label class="ba-funnel__consent"><input name="consent" type="checkbox"${state.consent ? ' checked' : ''}${state.errorField === 'consent' ? ' aria-invalid="true"' : ''} required${disabled()}><span>${escaped('consent')}</span></label><p class="ba-funnel__fine">${escaped('consentHint')}</p><a class="ba-funnel__privacy" href="${escapeHtml(privacyUrl())}" target="_blank" rel="noopener noreferrer">${escaped('privacy')}</a>` : `<p>${escaped('reviewEmpty')}</p>`;
        if (state.step === 3) section = summary();
        const next = state.step === 3 ? `<button class="ba-funnel__button" type="submit"${!ready || state.pending ? ' disabled' : ''}>${escaped(state.pending ? 'sending' : changedUncertainAttempt(state) ? 'submitChanged' : 'submit')}</button>` : `<button class="ba-funnel__button" type="submit">${escaped('next')} <span aria-hidden="true">→</span></button>`;
        view.innerHTML = `${stepper}${unavailable}<form novalidate aria-busy="${state.pending}">${error}<p class="ba-funnel__step-label">${escaped('step')} ${state.step + 1} ${escaped('of')} 4</p><h3 tabindex="-1" data-ba-step-heading>${escaped(headingKeys[state.step])}</h3><p class="ba-funnel__hint">${escaped(hints[state.step])}</p>${section}<div class="ba-funnel__actions">${state.step > 0 ? `<button class="ba-funnel__back" type="button" data-ba-action="back"${disabled()}>${escaped('previous')}</button>` : '<span></span>'}${next}</div></form>`;
      }
      if (focus) {
        const target = state.error ? view.querySelector('[role="alert"]') : view.querySelector('[data-ba-step-heading]');
        if (target) target.focus({ preventScroll: false });
      }
    }
    function privacyUrl() {
      try {
        const parsed = new URL(root.dataset.baPrivacyUrl || '/politique-de-confidentialite/', global.location.origin);
        return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.href : '/politique-de-confidentialite/';
      } catch (_) { return '/politique-de-confidentialite/'; }
    }
    function setError(failure) { state.error = failure.key; state.errorField = failure.field || ''; render(true); }
    function captureVisibleFields() {
      // Capture autofilled values too; some browsers do not emit input events for them.
      if (state.pending) return;
      const form = view.querySelector('form');
      if (!form) return;
      for (const name of ['domain', 'region', 'name', 'email', 'phone', 'website']) {
        const field = form.elements.namedItem(name);
        if (field && !field.disabled) state[name] = field.value;
      }
      const consent = form.elements.namedItem('consent');
      if (consent && !consent.disabled) state.consent = consent.checked;
    }
    function close() {
      if (!dialog) return;
      if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
      if (opener && typeof opener.focus === 'function') opener.focus();
    }
    function open(settings = {}, trigger) {
      if (!state.pending && !state.receipt && settings.role) state.role = settings.role === 'professional' || settings.role === 'lawyer' ? 'professional' : 'client';
      if (!state.pending && !state.receipt && ['weekly', 'monthly'].includes(settings.periodicity)) { state.role = 'professional'; state.periodicity = settings.periodicity; }
      opener = trigger || global.document.activeElement;
      render(false);
      if (dialog) {
        if (!dialog.open) {
          if (typeof dialog.showModal === 'function') dialog.showModal();
          else { dialog.setAttribute('open', ''); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); }
        }
        view.querySelector('[data-ba-step-heading]')?.focus();
      } else { root.scrollIntoView({ behavior: 'auto', block: 'start' }); view.querySelector('[data-ba-step-heading]')?.focus(); }
    }
    root.addEventListener('input', (event) => {
      const input = event.target;
      if (state.pending || !['name', 'email', 'phone', 'website'].includes(input.name)) return;
      state[input.name] = input.value;
    });
    root.addEventListener('change', (event) => {
      const input = event.target;
      if (state.pending) return;
      if (['domain', 'region'].includes(input.name)) state[input.name] = input.value;
      if (input.name === 'consent') state.consent = input.checked;
    });
    root.addEventListener('click', (event) => {
      const target = event.target.closest('button');
      if (!target || !root.contains(target)) return;
      if (target.dataset.baLanguageButton) { if (!state.pending) { captureVisibleFields(); state.language = languageOf(target.dataset.baLanguageButton); render(false); } return; }
      if (target.dataset.baAction === 'close') { close(); return; }
      if (state.pending) return;
      if (target.dataset.baRole) { state.role = target.dataset.baRole; state.error = ''; render(false); view.querySelector(`[data-ba-role="${state.role}"]`)?.focus(); }
      if (target.dataset.baPlan) {
        if (state.receipt) return;
        state.role = 'professional'; state.periodicity = target.dataset.baPlan; state.step = 1; state.error = ''; render(true);
      }
      const action = target.dataset.baAction;
      if (action === 'back' || action === 'edit') { state.step = action === 'edit' ? 2 : Math.max(0, state.step - 1); state.error = ''; state.errorField = ''; render(true); }
      if (action === 'restart') { const lang = state.language; Object.assign(state, initialState(root.dataset.baContext, lang)); attempt.clear(); render(true); }
    });
    root.addEventListener('submit', async (event) => {
      if (!view.contains(event.target)) return;
      event.preventDefault();
      if (state.pending || state.receipt) return;
      captureVisibleFields();
      const failure = validate(state, !ready && state.step >= 2 ? 1 : state.step);
      if (failure) { setError(failure); return; }
      if (state.step < 3) { state.step++; state.error = ''; state.errorField = ''; render(true); return; }
      if (!ready) { setError({ key: 'serviceUnavailable' }); return; }
      let request;
      try { request = attempt.prepare(payloadFrom(state)); } catch (_) { setError({ key: 'secureUnavailable' }); return; }
      if (!state.requestLanguage) state.requestLanguage = state.language;
      state.pending = true; state.error = ''; state.errorField = ''; render(false);
      const result = await sendRequest(endpoint, request, global.fetch.bind(global));
      state.pending = false;
      if (result.reference) {
        state.receipt = result.reference;
        // No contact data is persisted or retained after a confirmed receipt.
        state.name = ''; state.email = ''; state.phone = ''; state.consent = false; state.website = ''; state.uncertainBody = ''; attempt.clear();
      } else { state.error = result.error; if (result.error === 'uncertain') state.uncertainBody = request.body; }
      render(!dialog || dialog.open);
    });
    if (dialog) {
      dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
      dialog.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') { event.preventDefault(); close(); return; }
        if (event.key !== 'Tab') return;
        const elements = Array.from(dialog.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled):not([tabindex="-1"]), select:not(:disabled), [tabindex="0"]')).filter((element) => element.getClientRects().length);
        if (!elements.length) return;
        const active = global.document.activeElement;
        const index = elements.indexOf(active);
        if (event.shiftKey && index <= 0) { event.preventDefault(); elements[elements.length - 1].focus(); }
        else if (!event.shiftKey && (index < 0 || index === elements.length - 1)) { event.preventDefault(); elements[0].focus(); }
      });
    }
    const instance = { open, close };
    instances.set(root, instance); render(false); return instance;
  }
  function init(scope) {
    if (!global.document) return;
    (scope || global.document).querySelectorAll('[data-ba-funnel]').forEach(mount);
  }
  function open(id, settings = {}, trigger) {
    if (!global.document || typeof id !== 'string') return false;
    const root = global.document.getElementById(id);
    if (!root || !root.hasAttribute('data-ba-funnel')) return false;
    const instance = mount(root);
    if (!instance) return false;
    instance.open(settings, trigger); return true;
  }
  const api = { init, open };
  // Pure contract functions are also exported for deterministic tests, without a DOM.
  if (typeof module === 'object' && module.exports) module.exports = { ...api, CONSENT_VERSION, DOMAINS, REGIONS, COPY, ERROR_KEYS, safeEndpoint, initialState, validate, payloadFrom, escapeHtml, createAttempt, changedUncertainAttempt, receiptFrom, sendRequest };
  global.BAIntakeFunnel = api;
  if (global.document) {
    global.document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-ba-funnel-open]');
      if (trigger && open(trigger.dataset.baFunnelOpen, { role: trigger.dataset.baFunnelRole, periodicity: trigger.dataset.baFunnelPlan }, trigger)) event.preventDefault();
    });
    if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', () => init(), { once: true });
    else init();
  }
})(typeof window === 'object' ? window : globalThis);
