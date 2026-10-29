'use strict';

(() => {
  const MAX_FILE_BYTES = 64 * 1024 * 1024;
  const SOURCE_LABELS = { original: 'Pièce source ou copie', declaration: 'Déclaration', analyse: 'Analyse', ocr: 'Extraction ou transcription' };
  const VIEW_LABELS = { cases: 'Dossiers', search: 'Recherche', documents: 'Pièces et sources', messages: 'Échanges', communications: 'Rendez-vous', usage: 'Usages', time: 'Suivi du temps', integrations: 'Intégrations' };
  const PATHS = {
    folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3z"/>',
    document: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4M9 12h6M9 16h6"/>',
    message: '<path d="M4 4h16v12H9l-5 4z"/><path d="M8 8h8M8 12h5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h3M14 14h3M7 17h3"/>',
    video: '<rect x="3" y="6" width="12" height="12" rx="2"/><path d="m15 10 6-3v10l-6-3"/>',
    layers: '<path d="m12 3 10 5-10 5L2 8zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
    logout: '<path d="M10 4H4v16h6M9 12h12m-4-4 4 4-4 4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.1"/>',
    search: '<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
    phone: '<path d="m7 3-4 2c0 9 7 16 16 16l2-4-5-3-2 3a14 14 0 0 1-7-7l3-2z"/>',
    credit: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>',
    upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
    download: '<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    send: '<path d="m3 3 19 9-19 9 4-9zm4 9h15"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    link: '<path d="m9 15 6-6M8 16l-2 2a3 3 0 0 1-4-4l5-5a3 3 0 0 1 4 0m2 6a3 3 0 0 0 4 0l5-5a3 3 0 0 0-4-4l-2 2"/>',
  };
  const state = {
    demo: new URLSearchParams(window.location.search).get('demo') === '1',
    mode: 'loading', view: 'cases', cases: [], selectedId: null, detail: null,
    capabilities: null, health: null, user: null, integrations: null,
    documentCategory: '', onlyUnresolved: false, pageRequest: 0, searchResults: null, searchQuery: '', requestVersion: 0, sessionVersion: 0, caseLoading: false, busy: false,
    searchScope: 'all', searchMode: 'terms', searchMeta: null, searchRequest: 0, searchPending: false,
    dictationLanguage: 'fr-CA', dictationAutoSearch: true, dictationStatus: 'idle', dictationMessage: '',
  };
  const main = document.getElementById('main-content');
  const dialog = document.getElementById('workspace-dialog');
  let toastTimer;
  let dictationController = null, dictationGeneration = 0;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }
  function icon(name) { return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${PATHS[name] || PATHS.document}</svg>`; }
  function fillIcons() { document.querySelectorAll('[data-icon]').forEach((node) => { node.innerHTML = icon(node.dataset.icon); }); }
  function fold(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr'); }
  function date(value, withTime = false) {
    const parsed = new Date(value);
    if (!value || Number.isNaN(parsed.getTime())) return 'Date non précisée';
    return new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(parsed);
  }
  function bytes(value) {
    if (!Number.isFinite(value)) return 'Taille non précisée';
    return value < 1024 ? `${value} octets` : value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} Ko` : `${(value / (1024 * 1024)).toFixed(1)} Mo`;
  }
  function duration(minutes) {
    const n = Number.isFinite(Number(minutes)) ? Number(minutes) : 0;
    return n < 60 ? `${n} min` : `${Math.floor(n / 60)} h${n % 60 ? ` ${String(n % 60).padStart(2, '0')}` : ''}`;
  }
  function sourceBadge(type) { return `<span class="badge neutral">${esc(SOURCE_LABELS[type] || 'Type à préciser')}</span>`; }
  function reviewBadge(status) {
    return status === 'controle_visuel' ? '<span class="badge teal">Contrôle visuel déclaré</span>' : '<span class="badge warning">À vérifier</span>';
  }
  function metric(label, value, foot, glyph) {
    return `<div class="metric"><div><span class="metric-label">${esc(label)}</span><strong class="metric-value">${esc(value)}</strong><span class="metric-foot">${esc(foot)}</span></div><span class="metric-icon">${icon(glyph)}</span></div>`;
  }
  function notify(message, error = false) {
    const node = document.getElementById('toast');
    node.textContent = message; node.classList.toggle('error', error); node.hidden = false;
    window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { node.hidden = true; }, 6500);
  }
  function clearSession() {
    cancelSearchWork();
    state.sessionVersion += 1;
    state.requestVersion += 1;
    state.pageRequest += 1;
    state.caseLoading = false;
    state.mode = 'signedout'; state.user = null; state.cases = []; state.detail = null;
    state.selectedId = null; state.capabilities = null; state.integrations = null; state.searchResults = null; state.searchQuery = ''; state.searchMeta = null;
    if (dialog.open) dialog.close();
  }
  async function api(path, options = {}) {
    // Preview never falls through to a real API, including read-only requests.
    if (state.demo) throw new Error('L’aperçu utilise uniquement des données fictives locales.');
    const sessionVersion = state.sessionVersion;
    const method = options.method || 'GET';
    const headers = { ...options.headers, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(!['GET', 'HEAD'].includes(method) ? { 'X-Requested-With': 'XMLHttpRequest' } : {}) };
    const response = await fetch(path, { cache: 'no-store', ...options, credentials: 'same-origin', headers });
    if (sessionVersion !== state.sessionVersion) throw new Error('Cette réponse appartient à une session fermée.');
    if (response.status === 401) {
      clearSession(); render();
      const error = new Error(path === '/api/auth/login' ? 'Connexion non valide. Vérifiez vos accès TAKATAK.' : 'La session a expiré. Reconnectez-vous avec TAKATAK.');
      error.status = 401;
      throw error;
    }
    if (options.asBlob && response.ok) {
      const blob = await response.blob();
      if (sessionVersion !== state.sessionVersion) throw new Error('La session a été fermée.');
      return blob;
    }
    const payload = await response.json().catch(() => ({}));
    if (sessionVersion !== state.sessionVersion) throw new Error('Cette réponse appartient à une session fermée.');
    if (!response.ok) throw new Error(payload.error?.message || `La demande n’a pas abouti (${response.status}).`);
    return payload;
  }
  async function publicHealth() {
    try {
      const response = await fetch('/api/health', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }
  function currentCase() { return state.detail?.case || state.cases.find((item) => item.id === state.selectedId) || null; }
  function canApprove() { return canMutate() && ['owner', 'lawyer'].includes(currentCase()?.role); }
  function canMutate() { return state.mode === 'authenticated' && !state.demo && !state.caseLoading && Boolean(state.user?.active); }
  function duplicateIds(doc) { return [...new Set([doc.duplicateOf, ...(doc.sameHashDocumentIds || [])].filter(Boolean))]; }
  function duplicateNote(doc) {
    const ids = duplicateIds(doc);
    return ids.length ? `<small class="table-subtext duplicate-note">Même empreinte que ${ids.length} autre${ids.length > 1 ? 's' : ''} pièce${ids.length > 1 ? 's' : ''} — ne pas additionner.</small>` : '';
  }
  function duplicateDetails(doc) {
    const ids = duplicateIds(doc);
    if (!ids.length) return '';
    return `<div class="full-width"><dt>Pièces de même empreinte</dt><dd>${ids.map((id) => esc(state.detail?.documents.find((item) => item.id === id)?.name || id)).join('<br>')}<small class="table-subtext">Contenu binaire identique. Conserver les provenances sans additionner les doublons.</small></dd></div>`;
  }

  function demoData() {
    const first = { id: 'demo-preparation', title: 'Préparer une première rencontre', reference: 'EXEMPLE 01', createdAt: '2026-10-12T16:00:00Z', role: 'client' };
    const second = { id: 'demo-classement', title: 'Organiser les pièces d’un dossier', reference: 'EXEMPLE 02', createdAt: '2026-10-10T16:00:00Z', role: 'client' };
    state.cases = [first, second]; state.selectedId = first.id;
    const documents = [
      { id: 'demo-note', name: 'Note de préparation — exemple.txt', mimeType: 'text/plain', sourceType: 'declaration', sourceReference: 'Exemple pédagogique rédigé pour cet aperçu. Aucune personne ni affaire réelle.', reviewStatus: 'a_verifier', versionNumber: 1, createdAt: '2026-10-12T16:15:00Z', extractedText: 'DOCUMENT FICTIF — aperçu de l’interface.\n\nCette note illustre la présentation d’une déclaration. Elle ne décrit aucun événement réel.\n\nPour un vrai dossier, préciser les faits personnellement observés, la date et les sources associées. Les questions et les incertitudes doivent rester visibles.' },
      { id: 'demo-chronologie', name: 'Chronologie — exemple.txt', mimeType: 'text/plain', sourceType: 'analyse', sourceReference: 'Exemple pédagogique. Aucune chronologie réelle.', reviewStatus: 'a_verifier', versionNumber: 1, createdAt: '2026-10-12T17:00:00Z', extractedText: 'DOCUMENT FICTIF — aperçu de l’interface.\n\nUne chronologie de travail relie chaque événement à une pièce identifiable. Elle distingue ce qui est rapporté, ce qui a été constaté et ce qui reste à confirmer.\n\nAucun événement ni montant réel n’est contenu dans cet exemple.' },
      { id: 'demo-liste', name: 'Liste de pièces — exemple.txt', mimeType: 'text/plain', sourceType: 'analyse', sourceReference: 'Exemple pédagogique sans justificatif réel.', reviewStatus: 'a_verifier', versionNumber: 1, createdAt: '2026-10-13T14:00:00Z', extractedText: 'DOCUMENT FICTIF — aperçu de l’interface.\n\nUne liste de pièces permet de relier un nom de fichier, sa provenance et son état de contrôle.\n\nExemples de rubriques : correspondance, facture, photographie, déclaration. Aucun de ces justificatifs n’est fourni ici.' },
    ];
    return {
      'demo-preparation': { case: first, documents, messages: [
        { id: 'demo-message-1', authorSubject: 'Personne cliente — fictive', createdAt: '2026-10-13T14:00:00Z', body: 'Exemple de message : j’ai regroupé mes notes de préparation. Je souhaite distinguer les documents disponibles des pièces encore à obtenir.' },
        { id: 'demo-message-2', authorSubject: 'Professionnel — fictif', createdAt: '2026-10-13T15:30:00Z', body: 'Exemple de réponse : la provenance et les points à vérifier peuvent être suivis dans l’onglet « Pièces et sources ». Cet échange est entièrement fictif.' },
      ], timeEntries: [{ id: 'demo-time-1', description: 'Exemple fictif : classement et lecture préparatoire', minutes: 30, authorSubject: 'Professionnel — fictif', status: 'submitted', createdAt: '2026-10-13T16:00:00Z' }],
      communications: { sessions: [
        { id: 'demo-rdv-1', kind: 'video', title: 'Préparer le premier échange — exemple fictif', scheduledAt: '2026-10-30T14:00:00Z', status: 'scheduled', joinUrl: null, ownTimer: null },
        { id: 'demo-rdv-2', kind: 'phone', title: 'Faire le point sur les pièces — exemple fictif', scheduledAt: '2026-10-13T14:00:00Z', status: 'scheduled', joinUrl: null, ownTimer: { status: 'ended', startedAt: '2026-10-13T14:00:00Z', endedAt: '2026-10-13T14:12:30Z', seconds: 750, rateCentsPerMinute: null } },
      ], hasMore: false, providers: { video: 'external_zoom_link_only', phone: 'not_connected' } },
      usage: { entries: [{ id: 'demo-usage-1', sessionId: 'demo-rdv-2', authorSubject: 'Personne cliente — fictive', kind: 'phone', seconds: 750, rateCentsPerMinute: null, estimateCents: null, needsReview: false, createdAt: '2026-10-13T14:12:30Z', status: 'submitted', providerVerified: false, billed: false }], hasMore: false, billingEnabled: false } },
      'demo-classement': { case: second, documents: [], messages: [], timeEntries: [], communications: { sessions: [], hasMore: false }, usage: { entries: [], hasMore: false, billingEnabled: false } },
    };
  }
  let examples = null;

  function header() {
    document.getElementById('current-section').textContent = VIEW_LABELS[state.view];
    document.querySelectorAll('[data-view]').forEach((button) => {
      if (button.dataset.view === state.view) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    document.getElementById('case-count').textContent = state.cases.length || '';
    document.getElementById('demo-banner').hidden = !state.demo;
    document.getElementById('environment-badge').innerHTML = `<span class="status-dot" aria-hidden="true"></span>${state.demo ? 'Aperçu fictif' : state.mode === 'authenticated' ? 'Session active' : 'Version pilote'}`;
    document.getElementById('profile-name').textContent = state.demo ? 'Compte de démonstration' : state.mode === 'authenticated' ? 'Session TAKATAK' : 'Espace personnel';
    document.getElementById('profile-state').textContent = state.demo ? 'Lecture seule · données fictives' : state.mode === 'authenticated' ? 'Droits par dossier' : state.health?.loginConfigured ? 'Connexion disponible' : 'Connexion non activée';
    document.getElementById('workspace-subtitle').textContent = state.demo ? 'Aperçu en lecture seule' : 'Préparer. Comprendre. Avancer.';
    document.getElementById('logout-button').hidden = state.mode !== 'authenticated';
  }
  function intro(eyebrow, title, subtitle, actions = '') {
    return `<div class="intro"><div><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${actions ? `<div class="intro-actions">${actions}</div>` : ''}</div>`;
  }
  function readOnlyNote() {
    return state.demo ? `<div class="callout">${icon('eye')}<p><strong>Aperçu en lecture seule</strong>Les exemples permettent d’explorer l’organisation. Aucun ajout, envoi ou changement n’est possible dans cet aperçu.</p></div>` : '';
  }
  function connections() {
    // These flows deliberately have no actionable controls until complete integrations exist.
    const addons = state.capabilities?.addons?.items;
    if (Array.isArray(addons)) {
      const status = { available_pilot: 'Pilote interne', connector_pilot: 'Dans Intégrations', external_link_only: 'Lien externe', planned: 'À connecter' };
      const symbol = { internal_chat: 'message', zoom: 'video', phone: 'phone' };
      return `<div class="connection-panel"><h3>Services complémentaires</h3>${addons.map(item => `<div class="integration-row"><span>${icon(symbol[item.id] || 'layers')}${esc(item.label)}</span><span class="badge">${esc(status[item.availability] || 'À vérifier')}</span></div><p class="addon-description">${esc(item.description)}</p>`).join('')}<p class="addon-description">Tarifs des options payantes à définir. Aucun achat ni connexion fournisseur depuis cette liste.</p></div>`;
    }
    return `<div class="connection-panel"><h3>Services complémentaires</h3><div class="integration-row"><span>${icon('spark')}Assistant IA</span><span class="badge">À connecter</span></div><div class="integration-row"><span>${icon('credit')}Crédits et paiements</span><span class="badge">À connecter</span></div><div class="integration-row"><span>${icon('phone')}Appels et voix</span><span class="badge">À connecter</span></div></div>`;
  }
  function principles() {
    return `<div class="note-panel"><div class="note-icon">${icon('layers')}</div><h2>Des pièces.<br>Une provenance.</h2><p>Un dossier lisible permet de retrouver le document et de comprendre ce qu’il établit.</p><ol class="principles"><li><span>01</span><span><strong>Garder la source</strong><br>Original, déclaration, analyse ou OCR.</span></li><li><span>02</span><span><strong>Conserver les versions</strong><br>Un doublon n’est pas une nouvelle perte.</span></li><li><span>03</span><span><strong>Rendre les limites visibles</strong><br>Une extraction reste à contrôler.</span></li></ol></div>`;
  }
  function signedOut() {
    const login = state.health?.loginConfigured === true;
    const unavailable = state.health === null;
    const loginForm = `<form id="login-form"><label for="login-email">Adresse courriel TAKATAK</label><input id="login-email" name="email" type="email" autocomplete="username" maxlength="320" required><label for="login-password">Mot de passe</label><input id="login-password" name="password" type="password" autocomplete="current-password" maxlength="2048" required><button class="button" type="submit"${state.busy ? ' disabled' : ''}>${state.busy ? 'Connexion en cours…' : 'Se connecter avec TAKATAK'} ${icon('arrow')}</button></form>`;
    return `${intro('VOTRE ESPACE, EN CLAIR', 'Chaque dossier mérite de la clarté.', 'Rassemblez vos pièces. Préparez vos échanges. Gardez le fil.')}<div class="signedout-layout"><section class="welcome-card"><span class="eyebrow">DU PREMIER DOCUMENT AU SUIVI</span><h2>Tout retrouver.<br>Mieux se préparer.</h2><p>Les documents, leur provenance et les échanges réunis dans un espace de travail commun à la personne cliente et à son avocat.</p><div class="welcome-rule"></div><a class="button light" href="?demo=1">Découvrir l’aperçu ${icon('arrow')}</a><small>Données entièrement fictives · lecture seule</small></section><section class="panel login-card"><span class="login-symbol">${icon('lock')}</span><span class="badge neutral">${login ? 'Connexion disponible' : 'Connexion non activée'}</span><h2>Votre accès<br>à l’espace de travail.</h2><p>${unavailable ? 'Le service du portail n’est pas joignable depuis cette page. Vous pouvez explorer l’aperçu sans transmettre de document.' : login ? 'Utilisez votre compte TAKATAK existant. L’accès nécessite aussi une habilitation BesoinAvocat.' : 'L’accès aux dossiers utilisera votre identité TAKATAK et les autorisations propres à chaque dossier.'}</p>${login ? loginForm : `<button class="button" type="button" disabled>Connexion TAKATAK à configurer ${icon('lock')}</button>`}<small>${login ? 'La session est conservée dans un cookie sécurisé. Aucun jeton n’est à copier. Aucun compte n’est créé depuis ce formulaire.' : 'Aucun mot de passe à transmettre tant que la connexion n’est pas activée.'} Aucun dossier réel n’est accessible dans l’aperçu.</small><div class="login-foot"><p>BesoinAvocat est un outil de préparation. Les analyses et les décisions juridiques restent à valider avec votre avocat.</p></div></section></div><div class="feature-grid"><div class="feature">${icon('folder')}<div><h3>Un dossier bien organisé</h3><p>Des pièces classées, des versions identifiées et un accès par dossier.</p></div></div><div class="feature">${icon('search')}<div><h3>Une recherche qui cite</h3><p>Retrouver un passage et revenir à sa source pour le contrôler.</p></div></div><div class="feature">${icon('clock')}<div><h3>Un suivi compréhensible</h3><p>Des échanges conservés et du temps soumis à validation, sans débit automatique.</p></div></div></div>`;
  }
  function noCase() {
    return `${intro('VOTRE ESPACE DE TRAVAIL', VIEW_LABELS[state.view], 'Chaque pièce et chaque échange sont rattachés à un dossier.')}<section class="panel empty-state">${icon('folder')}<h2>Commencez par un dossier.</h2><p>Ouvrez un dossier existant ou créez-en un depuis la page Dossiers.</p><button class="button" data-action="go-cases">Voir mes dossiers ${icon('arrow')}</button></section>`;
  }
  function context() {
    const item = currentCase();
    return `<div class="case-context"><div><small>DOSSIER SÉLECTIONNÉ${state.demo ? ' · FICTIF' : ''}</small><strong>${esc(item?.title)}</strong></div><label class="sr-only" for="case-select">Changer de dossier</label><select id="case-select" aria-label="Changer de dossier">${state.cases.map((entry) => `<option value="${esc(entry.id)}"${entry.id === state.selectedId ? ' selected' : ''}>${esc(entry.reference || entry.title)}</option>`).join('')}</select></div>`;
  }
  function quickSearch(scope = 'all') {
    return `<section class="panel quick-search"><div><h2>${scope === 'case' ? 'Chercher dans ce dossier' : 'Retrouver une pièce ou un passage'}</h2><p>${scope === 'case' ? 'Les filtres du registre ci-dessous ne limitent pas cette recherche.' : 'Dans les dossiers auxquels vous avez accès, avec un retour à chaque source.'}</p></div><form id="${scope === 'case' ? 'case-search-form' : 'dashboard-search-form'}" class="search-toolbar"><label class="searchbox">${icon('search')}<input type="search" name="query" maxlength="200" required autocomplete="off" placeholder="Un nom, un numéro de facture, une question…" aria-label="${scope === 'case' ? 'Rechercher dans ce dossier' : 'Rechercher dans tous mes dossiers'}"></label><button class="button" type="submit">Rechercher</button><button class="button secondary" type="button" data-action="open-search" data-scope="${scope}">Options et dictée</button></form></section>`;
  }
  function searchView() {
    const listening = ['starting','listening','stopping'].includes(state.dictationStatus);
    const supported = Boolean(window.BesoinAvocatDictation && (window.SpeechRecognition || window.webkitSpeechRecognition));
    const cases = state.cases.map(item => `<option value="${esc(item.id)}"${item.id === state.selectedId ? ' selected' : ''}>${esc(item.reference ? `${item.reference} — ${item.title}` : item.title)}</option>`).join('');
    return `${intro('RECHERCHE DANS VOS PIÈCES', 'Un passage. Une source vérifiable.', 'Recherche sourcée dans les textes disponibles. L’IA générative reste à connecter.')}<section class="panel"><div class="panel-body search-workspace"><form id="search-form"><label for="document-query" class="search-label">Votre recherche ou votre question</label><div class="search-toolbar"><label class="searchbox" for="document-query">${icon('search')}<input id="document-query" name="query" type="search" required maxlength="200" value="${esc(state.searchQuery)}" placeholder="Ex. retrouver les factures de réparation…" autocomplete="off"></label><button class="button" type="submit"${state.searchPending || listening || state.caseLoading ? ' disabled' : ''}>${state.searchPending ? 'Recherche…' : 'Rechercher'}</button></div><div class="search-options"><label>Périmètre<select id="search-scope" name="scope"${listening || state.caseLoading ? ' disabled' : ''}><option value="all"${state.searchScope === 'all' ? ' selected' : ''}>Tous mes dossiers autorisés</option><option value="case"${state.searchScope === 'case' ? ' selected' : ''}${state.selectedId ? '' : ' disabled'}>Ce dossier</option></select></label>${state.searchScope === 'case' ? `<label>Dossier<select id="search-case"${listening || state.caseLoading ? ' disabled' : ''}>${cases}</select></label>` : ''}<label>Correspondance<select id="search-mode" name="mode"${listening || state.caseLoading ? ' disabled' : ''}><option value="terms"${state.searchMode === 'terms' ? ' selected' : ''}>Tous les mots utiles</option><option value="literal"${state.searchMode === 'literal' ? ' selected' : ''}>Expression exacte</option></select></label></div><div class="dictation-panel"><div class="dictation-controls"><button class="button secondary" id="dictation-control" type="button" data-action="dictate"${supported && !state.caseLoading && !state.searchPending && state.dictationStatus !== 'stopping' ? '' : ' disabled'}>${listening ? 'Terminer la dictée' : 'Dicter la recherche'}</button>${listening ? '<button class="text-button" type="button" data-action="cancel-dictation">Annuler la dictée</button>' : ''}<label>Langue de dictée<select id="dictation-language"${listening || state.caseLoading ? ' disabled' : ''}><option value="fr-CA"${state.dictationLanguage === 'fr-CA' ? ' selected' : ''}>Français</option><option value="en-CA"${state.dictationLanguage === 'en-CA' ? ' selected' : ''}>English</option></select></label></div><label class="checkbox-filter"><input id="dictation-auto-search" type="checkbox"${state.dictationAutoSearch ? ' checked' : ''}${listening || state.caseLoading ? ' disabled' : ''}> Rechercher automatiquement à la fin de la dictée</label><p class="table-subtext">Le micro démarre seulement après votre clic. Le navigateur peut transmettre l’audio à son service de reconnaissance externe. Aucun fichier audio n’est enregistré par ce portail. ${supported ? 'Vous pouvez aussi saisir votre recherche au clavier.' : 'Dictée indisponible dans ce navigateur : utilisez le clavier.'}</p><p id="dictation-status" role="status">${esc(state.dictationMessage)}</p></div></form><div id="search-results" aria-live="polite">${searchResults()}</div></div></section>${readOnlyNote()}`;
  }
  function casesView() {
    const docs = state.detail?.documents || [];
    const entries = state.detail?.timeEntries || [];
    const pending = entries.filter((entry) => entry.status === 'submitted').reduce((sum, entry) => sum + entry.minutes, 0);
    const cards = state.cases.map((item) => `<article class="case-card${item.id === state.selectedId ? ' selected' : ''}" data-case-filter="${esc(fold(`${item.title} ${item.reference}`))}"><span class="case-symbol">${icon('folder')}</span><div class="case-card-content"><div class="case-ref">${esc(item.reference || 'Référence à préciser')}${state.demo ? ' · FICTIF' : ''}</div><button class="case-title" data-action="open-case" data-id="${esc(item.id)}">${esc(item.title)}</button><p>${state.demo ? 'Exemple de présentation, sans affaire réelle.' : `Créé le ${esc(date(item.createdAt))}`}</p><div class="case-card-foot"><span class="badge${item.id === state.selectedId ? ' teal' : ' neutral'}">${item.id === state.selectedId ? 'Dossier sélectionné' : 'Dossier de travail'}</span>${item.id === state.selectedId ? `<span>${docs.length} pièce${docs.length > 1 ? 's' : ''}</span>` : ''}<span>${state.demo ? 'Lecture seule' : `Accès ${esc(({ owner: 'responsable', lawyer: 'avocat', client: 'client' })[item.role] || 'autorisé')}`}</span></div></div><button class="icon-button case-arrow" data-action="open-case" data-id="${esc(item.id)}" aria-label="${esc(`Ouvrir ${item.title}`)}">${icon('arrow')}</button></article>`).join('');
    return `${intro('L’ESSENTIEL, AU MÊME ENDROIT', 'Vos dossiers, en ordre.', 'Un point de départ clair pour préparer la prochaine étape.', `<button class="button" data-action="new-case"${canMutate() ? '' : ' disabled'}>${icon('plus')}Nouveau dossier</button>`)}<div class="metrics">${metric('Dossiers accessibles', state.cases.length, state.demo ? 'Exemples fictifs' : 'Selon vos habilitations', 'folder')}${metric('Pièces du dossier sélectionné', docs.length, `${docs.filter((doc) => doc.reviewStatus !== 'controle_visuel').length} à vérifier`, 'document')}${metric('Temps soumis du dossier', duration(pending), 'Aucune facturation automatique', 'clock')}</div>${quickSearch()}<div class="layout-two"><section class="panel"><div class="panel-heading"><div><h2>Votre bibliothèque de dossiers</h2><p>Ouvrez un dossier pour retrouver ses pièces et son suivi.</p></div><span class="badge outline">${state.cases.length} dossier${state.cases.length > 1 ? 's' : ''}</span></div><div class="panel-body"><label class="searchbox" for="case-filter">${icon('search')}<input id="case-filter" type="search" placeholder="Rechercher un titre ou une référence…" autocomplete="off" aria-label="Rechercher un dossier"></label><div class="case-list">${cards || '<div class="empty-state"><h2>Votre premier dossier commence ici.</h2><p>Créez un dossier pour y classer les pièces et leurs sources.</p></div>'}</div><p id="case-filter-empty" class="table-empty" hidden>Aucun dossier ne correspond à cette recherche.</p>${readOnlyNote()}</div></section><aside class="section-stack" aria-label="Repères de travail">${principles()}${connections()}</aside></div>`;
  }
  function documentsView() {
    const allDocuments = state.detail.documents || [];
    const categories = [...new Set(allDocuments.map(doc => doc.category).filter(Boolean))].sort((a,b) => a.localeCompare(b,'fr'));
    const documents = allDocuments.filter(doc => (!state.documentCategory || doc.category === state.documentCategory) && (!state.onlyUnresolved || (doc.missingTextPages?.length || doc.ocrPagesToVerify?.length || doc.lowTextPagesToVerify?.length)));
    const filters = `<div class="document-filters"><label for="document-category">Catégorie du registre<select id="document-category"><option value="">Toutes les catégories (${allDocuments.length})</option>${categories.map(category => `<option value="${esc(category)}"${category === state.documentCategory ? ' selected' : ''}>${esc(category)}</option>`).join('')}</select></label><label class="checkbox-filter"><input id="document-unresolved" type="checkbox"${state.onlyUnresolved ? ' checked' : ''}> Registre : texte manquant ou extraction à contrôler</label></div>`;
    const rows = documents.map((doc) => `<tr><td><div class="document-name">${icon('document')}<div><button data-action="preview" data-id="${esc(doc.id)}">${esc(doc.name)}</button><small>Version ${esc(doc.versionNumber || 1)} · ${state.demo ? 'Document fictif' : esc(bytes(doc.bytes))}${doc.pageCount ? ` · ${doc.pageCount} pages/unités` : ''}</small>${doc.category ? `<small>${esc(doc.category)}</small>` : ''}</div></div></td><td>${sourceBadge(doc.sourceType)}${duplicateNote(doc)}<small class="table-subtext">${esc(date(doc.createdAt))}</small></td><td>${reviewBadge(doc.reviewStatus)}${(doc.missingTextPages?.length || doc.ocrPagesToVerify?.length) ? `<small class="table-subtext">${doc.missingTextPages?.length || 0} sans texte · ${doc.ocrPagesToVerify?.length || 0} OCR à contrôler</small>` : ""}</td><td><button class="icon-button" data-action="preview" data-id="${esc(doc.id)}" aria-label="${esc(`Voir la provenance de ${doc.name}`)}">${icon('eye')}</button></td></tr>`).join('');
    return `${intro('DOCUMENTS ET TRAÇABILITÉ', 'Les pièces, avec leurs sources.', 'Retrouvez un passage. Contrôlez le document auquel il se rapporte.', `<button class="button" data-action="upload"${canMutate() ? '' : ' disabled'}>${icon('upload')}Ajouter une pièce</button>`)}${context()}<div class="layout-two"><div class="section-stack main-stack">${quickSearch('case')}<section class="panel"><div class="panel-heading"><div><h2>Registre des pièces</h2><p>${documents.length} pièce${documents.length > 1 ? 's' : ''} dans ce dossier${state.demo ? ' fictif' : ''}.</p></div></div>${filters}${documents.length ? `<div class="table-wrap"><table><caption class="sr-only">Documents du dossier et états de contrôle</caption><thead><tr><th scope="col">Document</th><th scope="col">Provenance</th><th scope="col">Contrôle</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="table-empty">Aucune pièce ne correspond à ces filtres.</p>'}</section></div><aside class="section-stack" aria-label="Repères sur les pièces">${principles()}${connections()}</aside></div>${readOnlyNote()}`;
  }
  function searchResults() {
    if (state.searchResults === null) return '<p class="table-subtext">Saisissez des mots ou une question : la recherche extrait des termes et retrouve les passages correspondants. Elle ne rédige pas de réponse juridique.</p>';
    const meta = state.searchMeta || {};
    const lead = `<p class="search-summary">${state.searchResults.length} résultat${state.searchResults.length > 1 ? 's' : ''} affiché${state.searchResults.length > 1 ? 's' : ''}${meta.hasMore ? ' · liste partielle, d’autres résultats sont disponibles' : ' · fin des résultats de cette recherche'}${state.demo ? ' · données fictives' : ''}.</p><p class="table-subtext">Recherche : « ${esc(meta.query || state.searchQuery)} »${meta.terms?.length ? ` · termes retenus : ${meta.terms.map(esc).join(', ')}` : ''}. Contrôlez les extraits sur leur source. Aucune réponse d’IA générative.</p>`;
    if (!state.searchResults.length) return lead + '<p class="table-empty">Aucun passage retrouvé. Essayez moins de mots ou une expression différente. Une pièce sans texte peut rester accessible par son nom dans le registre.</p>';
    return lead + `<div class="search-results">${state.searchResults.map((result, i) => `<article class="result"><div class="result-header"><button class="result-title" data-action="search-preview" data-result-index="${i}">[${i + 1}] ${esc(result.name)}</button>${sourceBadge(result.sourceType)}</div><p class="result-case">Dossier : ${esc(result.caseTitle || state.cases.find(item => item.id === result.caseId)?.title || 'Dossier sélectionné')}</p>${result.citation ? `<p class="citation-line">${esc(result.citation.sourceDocumentId || result.id)} · ${result.citation.unitKind === 'pdf_page' && result.citation.page ? `page PDF ${esc(result.citation.page)}` : `unité ${esc(result.citation.ordinal)}`}${result.citation.label ? ` · ${esc(result.citation.label)}` : ''}${result.citation.ocrToVerify ? ' · OCR à contrôler' : ''}</p>` : '<p class="citation-line">Correspondance documentaire · aucune page citée</p>'}<p>${esc(result.excerpt || 'Aucun extrait textuel fourni.')}</p><div class="result-foot">${reviewBadge(result.reviewStatus)}<span>${state.demo ? 'Aucune empreinte réelle' : result.sha256 ? `SHA-256 ${esc(result.sha256.slice(0, 14))}…` : 'Empreinte non fournie'}</span><button class="text-button" data-action="search-preview" data-result-index="${i}">Voir la source ${icon('arrow')}</button><button class="text-button" data-action="search-download" data-result-index="${i}"${state.demo || !canMutate() ? ' disabled' : ''}>Télécharger la pièce</button></div></article>`).join('')}</div>${meta.hasMore ? `<button class="button secondary search-more" type="button" data-action="search-more"${state.searchPending ? ' disabled' : ''}>${state.searchPending ? 'Chargement…' : 'Afficher les résultats suivants'}</button>` : ''}`;
  }
  function messagesView() {
    const messages = state.detail.messages || [];
    const body = messages.length ? messages.map((message) => `<article class="message${message.authorSubject === state.user?.subject ? ' message-own' : ''}"><span class="avatar" aria-hidden="true">${message.authorSubject === state.user?.subject ? 'VO' : 'ÉC'}</span><div class="message-body"><div class="message-meta"><strong>${esc(message.authorSubject === state.user?.subject ? 'Vous' : message.authorSubject || 'Auteur non précisé')}</strong><time datetime="${esc(message.createdAt)}">${esc(date(message.createdAt, true))}</time></div><p class="message-text">${esc(message.body)}</p></div></article>`).join('') : '<p class="table-empty">Aucun échange enregistré dans ce dossier.</p>';
    return `${intro('GARDER LE FIL', 'Des échanges au bon endroit.', 'Les messages restent rattachés au dossier sélectionné. Aucun courriel externe n’est envoyé.')} ${context()}<div class="layout-two"><section class="panel"><div class="panel-heading"><div><h2>Conversation du dossier</h2><p>${state.demo ? 'Échanges de démonstration entièrement fictifs.' : 'Les personnes habilitées à ce dossier peuvent consulter ses échanges.'}</p></div><span class="badge outline">${messages.length} message${messages.length > 1 ? 's' : ''}</span></div><div class="message-list">${body}</div><form id="message-form" class="composer"><label for="message-body">Votre message</label><textarea id="message-body" name="body" maxlength="20000" required placeholder="Précisez votre question ou la pièce concernée…"${canMutate() ? '' : ' disabled'}></textarea><div class="composer-footer"><small>${state.demo ? 'Envoi désactivé dans l’aperçu.' : 'L’envoi ajoute un message à ce dossier. Ce canal n’est pas surveillé en continu.'}</small><button class="button" type="submit"${canMutate() ? '' : ' disabled'}>Envoyer ${icon('send')}</button></div><p class="form-error" role="alert" hidden></p></form></section><aside class="section-stack"><div class="note-panel"><div class="note-icon">${icon('message')}</div><h2>Un échange<br>facile à suivre.</h2><p>Indiquez le nom de la pièce, la date concernée et le point à clarifier. Une question précise sera plus facile à relier au dossier.</p></div>${connections()}</aside></div>`;
  }
  function timeView() {
    const entries = state.detail.timeEntries || [];
    const sum = (status) => entries.filter((entry) => entry.status === status).reduce((total, entry) => total + entry.minutes, 0);
    const rows = entries.map((entry) => `<tr><td><strong>${esc(entry.description)}</strong><small class="table-subtext">${esc(entry.authorSubject || 'Auteur non précisé')} · ${esc(date(entry.createdAt))}</small>${entry.approvedAt ? `<small class="table-subtext">Validé le ${esc(date(entry.approvedAt, true))}</small>` : ''}</td><td><span class="time-number">${esc(duration(entry.minutes))}</span></td><td><span class="badge ${entry.status === 'approved' ? 'teal' : 'warning'}">${entry.status === 'approved' ? 'Validé' : 'Soumis'}</span></td><td>${entry.status === 'submitted' && canApprove() && entry.authorSubject !== state.user?.subject ? `<button class="button secondary small" data-action="approve-time" data-id="${esc(entry.id)}">Valider</button>` : ''}</td></tr>`).join('');
    return `${intro('DU TEMPS, SANS ZONE GRISE', 'Suivre le travail effectué.', 'Le temps est saisi manuellement, puis validé par un avocat ou responsable habilité.', `<button class="button" data-action="new-time"${canMutate() ? '' : ' disabled'}>${icon('plus')}Soumettre du temps</button>`)}${context()}<div class="metrics">${metric('Temps soumis', duration(sum('submitted')), 'En attente de validation', 'clock')}${metric('Temps validé', duration(sum('approved')), 'Validation enregistrée au dossier', 'check')}${metric('Débit de crédits', '—', 'Paiements et crédits à connecter', 'credit')}</div><div class="layout-two"><section class="panel"><div class="panel-heading"><div><h2>Journal du temps</h2><p>${state.demo ? 'Exemples fictifs de suivi du temps.' : 'La validation ne déclenche pas de facturation ni de paiement.'}</p></div></div>${entries.length ? `<div class="table-wrap"><table><caption class="sr-only">Temps soumis et validé</caption><thead><tr><th scope="col">Travail déclaré</th><th scope="col">Durée</th><th scope="col">État</th><th scope="col"><span class="sr-only">Validation</span></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="table-empty">Aucune entrée de temps dans ce dossier.</p>'}<p class="time-note">La personne cliente peut consulter le suivi. La validation est réservée aux rôles autorisés du dossier et contrôlée par le serveur.</p></section><aside class="section-stack"><div class="note-panel"><div class="note-icon">${icon('clock')}</div><h2>Une validation<br>distincte.</h2><p>Décrire le travail, déclarer la durée et faire valider l’entrée sont des étapes séparées. Le portail ne calcule aucun honoraire automatiquement.</p></div>${connections()}</aside></div>${readOnlyNote()}`;
  }
  function elapsed(seconds) {
    if (!Number.isSafeInteger(seconds) || seconds < 0) return 'Durée non disponible';
    const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60), rest = seconds % 60;
    return `${hours ? `${hours} h ` : ''}${minutes} min ${String(rest).padStart(2, '0')} s`;
  }
  function money(cents) {
    return Number.isSafeInteger(cents) && cents >= 0 ? new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', currencyDisplay: 'code' }).format(cents / 100) : null;
  }
  function rateLabel(rate) { return money(rate) === null ? 'Tarif non configuré' : `${money(rate)} / min — estimation`; }
  function communicationSessions() { return state.detail?.communications?.sessions || []; }
  function communicationReady() { return Array.isArray(state.detail?.communications?.sessions); }
  function usageReady() { return Array.isArray(state.detail?.usage?.entries); }
  function kindLabel(kind) { return kind === 'video' ? 'Visioconférence' : kind === 'phone' ? 'Téléphone' : 'Type non précisé'; }
  function safeZoomUrl(value) {
    if (typeof value !== 'string' || value.length > 1024 || /[\\\s]/u.test(value)) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash ||
        !(url.hostname === 'zoom.us' || /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+zoom\.us$/u.test(url.hostname)) ||
        !/^\/j\/[0-9]{9,11}$/u.test(url.pathname) || [...url.searchParams.keys()].some(key => key !== 'pwd') ||
        url.searchParams.getAll('pwd').length > 1 || (url.searchParams.has('pwd') && !/^[A-Za-z0-9._~-]{1,256}$/u.test(url.searchParams.get('pwd')))) return null;
      return url.href;
    } catch { return null; }
  }
  // Connectors belong to the person: each lawyer links their own Zoom, Outlook or Google account.
  const INTEGRATION_GROUPS = [['video', 'Visioconférence'], ['calendar', 'Agenda'], ['signature', 'Signature électronique'], ['practice', 'Gestion du cabinet'], ['telephony', 'Téléphonie et SMS'], ['research', 'Recherche juridique'], ['payments', 'Paiements de la plateforme'], ['accounting', 'Comptabilité']];
  const INTEGRATION_STATES = { connected: ['Connecté', 'teal'], reconnect_required: ['À reconnecter', 'warning'], available: ['Prêt à connecter', 'outline'], active_on_server: ['Actif sur le serveur', 'teal'], not_configured: ['Accès développeur à configurer', 'neutral'], planned: ['À venir', 'neutral'] };
  const INTEGRATION_ICONS = { video: 'video', calendar: 'calendar', signature: 'document', practice: 'folder', telephony: 'phone', research: 'search', payments: 'credit', accounting: 'layers' };
  const APPOINTMENT_ACTIONS = { zoom: 'Créer la réunion Zoom', microsoft365: 'Ajouter à Outlook', google: 'Ajouter à Google Agenda' };
  function integrationCard(item) {
    const [label, tone] = INTEGRATION_STATES[item.state] || ['À vérifier', 'neutral'];
    const ready = canMutate() && !state.busy ? '' : ' disabled';
    const id = esc(item.id);
    const buttons = item.connectionType === 'oauth' ? ({
      available: `<button class="button small" data-action="integration-connect" data-id="${id}"${ready}>${icon('link')}Connecter</button>`,
      reconnect_required: `<button class="button small" data-action="integration-connect" data-id="${id}"${ready}>${icon('link')}Reconnecter</button><button class="button subtle small" data-action="integration-disconnect" data-id="${id}"${ready}>Retirer</button>`,
      connected: `<button class="button secondary small" data-action="integration-disconnect" data-id="${id}"${ready}>Déconnecter</button>`,
    })[item.state] || '' : '';
    const account = item.connection?.account ? `<p class="integration-account">${icon('check')}<span>Compte relié : ${esc(item.connection.account)}<small>Depuis le ${esc(date(item.connection.connectedAt))}</small></span></p>` : '';
    return `<article class="integration-card"><div class="integration-head"><span class="case-symbol">${icon(INTEGRATION_ICONS[item.category] || 'layers')}</span><div><h3>${esc(item.label)}</h3><span class="badge ${tone}">${esc(label)}</span></div></div><p>${esc(item.routine)}</p>${account}${buttons ? `<div class="integration-actions">${buttons}</div>` : ''}</article>`;
  }
  function integrationsView() {
    const head = intro('VOS OUTILS, RELIÉS AU PORTAIL', 'Vos services de travail.', 'Chaque avocat relie ses propres comptes. BesoinAvocat ne reçoit jamais vos mots de passe.',
      state.demo ? '' : `<button class="button secondary" data-action="refresh-integrations"${canMutate() && !state.busy ? '' : ' disabled'}>Actualiser</button>`);
    if (state.demo) return `${head}<section class="panel empty-state">${icon('link')}<h2>Aucun compte réel dans l’aperçu.</h2><p>Dans votre espace, vous reliez Zoom, Outlook ou Google Agenda à vos rendez-vous, avec votre propre compte.</p></section>${readOnlyNote()}`;
    const data = state.integrations;
    if (!data?.providers) return `${head}<section class="panel empty-state">${icon('link')}<h2>Liste indisponible.</h2><p>Le serveur n’a pas renvoyé la liste des intégrations. Actualisez dans un instant.</p></section>`;
    const count = value => data.providers.filter(item => item.state === value).length;
    const engine = data.engine?.ready ? '' : `<div class="callout warning">${icon('info')}<p><strong>Connexions pas encore ouvertes sur ce serveur</strong>L’administrateur doit d’abord ajouter la clé de chiffrement des connecteurs et l’adresse publique du portail. Chaque service devient ensuite connectable dès que son accès développeur est configuré.</p></div>`;
    const groups = INTEGRATION_GROUPS.map(([category, title]) => {
      const items = data.providers.filter(item => item.category === category);
      return items.length ? `<section class="integration-group"><h2>${esc(title)}</h2><div class="integration-grid">${items.map(integrationCard).join('')}</div></section>` : '';
    }).join('');
    return `${head}<div class="metrics">${metric('Comptes connectés', count('connected'), 'Vos propres comptes', 'check')}${metric('Prêts à connecter', count('available'), 'Accès développeur configuré', 'link')}${metric('À configurer', count('not_configured'), 'Accès développeur à créer', 'layers')}</div>${engine}${groups}<div class="callout">${icon('lock')}<p><strong>Ce qui est transmis</strong>Pour un rendez-vous, seuls son titre, sa date et sa durée sont envoyés au service que vous choisissez. Les jetons d’accès restent chiffrés sur le serveur et ne sont jamais affichés. Une réunion Zoom est créée avec salle d’attente et sans enregistrement.</p></div>`;
  }
  function meetingLink(item) {
    return (state.detail?.integrationLinks || []).find(link => link.sessionId === item.id && link.kind === 'meeting' && link.url) || null;
  }
  function appointmentIntegrations(item) {
    if (state.demo || item.status === 'cancelled' || !canApprove() || !Array.isArray(state.integrations?.providers)) return '';
    const mine = (state.detail?.integrationLinks || []).filter(link => link.sessionId === item.id && link.mine);
    const ready = canMutate() && !state.busy ? '' : ' disabled';
    const controls = state.integrations.providers.filter(provider => provider.state === 'connected' && Object.hasOwn(APPOINTMENT_ACTIONS, provider.id) && (provider.id !== 'zoom' || item.kind === 'video')).map(provider => {
      const link = mine.find(entry => entry.provider === provider.id), data = `data-id="${esc(item.id)}" data-provider="${esc(provider.id)}"`;
      if (!link) return `<button type="button" class="button secondary small" data-action="appointment-link" ${data}${ready}>${icon(provider.id === 'zoom' ? 'video' : 'calendar')}${esc(APPOINTMENT_ACTIONS[provider.id])}</button>`;
      const shown = link.kind === 'calendar_event' && link.url
        ? `<a class="button secondary small" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${icon('calendar')}Ouvrir dans ${esc(provider.label)}<span class="sr-only"> dans un nouvel onglet</span></a>`
        : `<span class="badge teal">${esc(link.kind === 'meeting' ? 'Réunion Zoom créée' : `Inscrit dans ${provider.label}`)}</span>`;
      return `${shown}<button type="button" class="button subtle small" data-action="appointment-unlink" ${data}${ready}>Retirer</button>`;
    });
    return controls.length ? `<div class="communication-integrations"><small>Vos intégrations</small><div class="communication-actions">${controls.join('')}</div></div>` : '';
  }
  function communicationLimits() {
    return `<div class="callout warning">${icon('info')}<p><strong>Un suivi manuel, sans facturation</strong>Ouvrir Zoom ne démarre pas le chronomètre. Vous le démarrez et l’arrêtez vous-même ; la durée provient de l’horloge du portail, sans vérification par Zoom ou un opérateur. La fermeture de cette page ne l’arrête pas.</p></div>`;
  }
  function communicationCard(item) {
    const timer = item.ownTimer;
    const running = timer?.status === 'running', ended = timer?.status === 'ended', cancelled = item.status === 'cancelled';
    const anotherRunning = communicationSessions().some(other => other.id !== item.id && other.ownTimer?.status === 'running');
    const ready = canMutate() && communicationReady() && !state.busy;
    const meeting = meetingLink(item);
    const joinUrl = safeZoomUrl(item.joinUrl) || safeZoomUrl(meeting?.url);
    const status = cancelled ? 'Annulé' : running ? 'Votre chronomètre est en cours' : ended ? 'Votre chronomètre est arrêté' : 'Planifié';
    const provider = item.kind === 'video' ? (meeting && !safeZoomUrl(item.joinUrl) ? 'Réunion Zoom créée depuis le portail · salle d’attente active' : 'Lien Zoom externe · aucune réunion créée par le portail') : 'Service téléphonique non connecté · aucun appel lancé';
    const link = item.kind === 'video' && joinUrl && !cancelled && !state.demo && !state.caseLoading
      ? `<a class="button secondary small" href="${esc(joinUrl)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${icon('link')}Ouvrir Zoom <span class="sr-only">dans un nouvel onglet</span></a>`
      : item.kind === 'video' ? `<span class="table-subtext">${state.demo ? 'Aucun lien réel dans l’aperçu.' : item.joinUrl && !joinUrl ? 'Lien de participation non reconnu ; à faire corriger.' : cancelled ? 'Lien désactivé pour ce rendez-vous annulé.' : 'Lien de participation non renseigné.'}</span>` : '';
    const timerCopy = running ? `Démarré le ${date(timer.startedAt, true)}. Arrêtez-le à la fin de votre échange.` : ended ? `Durée enregistrée : ${elapsed(timer.seconds)} · arrêté le ${date(timer.endedAt, true)}.` : 'Aucun chronomètre personnel démarré.';
    return `<article class="communication-card"><div class="communication-heading"><span class="case-symbol">${icon(item.kind === 'video' ? 'video' : 'phone')}</span><div><span class="case-ref">${esc(kindLabel(item.kind))}${state.demo ? ' · FICTIF' : ''}</span><h3>${esc(item.title)}</h3><time datetime="${esc(item.scheduledAt)}">${esc(date(item.scheduledAt, true))}</time></div><span class="badge ${running ? 'teal' : cancelled ? 'neutral' : 'outline'}">${esc(status)}</span></div><p class="communication-provider">${esc(provider)}</p><div class="communication-timer"><span>${icon('clock')}${esc(timerCopy)}</span>${timer ? `<small>${esc(rateLabel(timer.rateCentsPerMinute))} · aucun débit.</small>` : ''}</div><div class="communication-actions">${link}${running ? `<button type="button" class="button small" data-action="communication-end" data-id="${esc(item.id)}"${ready ? '' : ' disabled'}>Arrêter mon chronomètre</button>` : !timer && !cancelled ? `<button type="button" class="button secondary small" data-action="communication-start" data-id="${esc(item.id)}"${ready && !anotherRunning ? '' : ' disabled'}>${icon('clock')}Démarrer mon chronomètre</button>` : ''}${!cancelled && !timer && canApprove() ? `<button type="button" class="button subtle small" data-action="communication-cancel" data-id="${esc(item.id)}"${ready ? '' : ' disabled'}>Annuler le rendez-vous</button>` : ''}</div>${anotherRunning && !timer && !cancelled ? '<p class="table-subtext">Arrêtez votre autre chronomètre actif avant d’en démarrer un.</p>' : ''}${appointmentIntegrations(item)}</article>`;
  }
  function communicationsView() {
    const sessions = communicationSessions();
    const ready = communicationReady();
    const actions = `<button class="button secondary" data-action="refresh-communications"${canMutate() && !state.busy ? '' : ' disabled'}>Actualiser</button><button class="button" data-action="new-communication"${canApprove() && ready && !state.busy ? '' : ' disabled'}>${icon('plus')}Planifier un rendez-vous</button>`;
    return `${intro('PRÉPARER LE PROCHAIN ÉCHANGE', 'Vos rendez-vous, avec un suivi clair.', 'Les rendez-vous et les durées restent rattachés au dossier sélectionné.', actions)}${context()}<div class="metrics">${metric('Rendez-vous affichés', sessions.length, 'Dates dans votre fuseau horaire', 'calendar')}${metric('Votre chronomètre en cours', sessions.filter(item => item.ownTimer?.status === 'running').length, 'Démarrage et arrêt manuels', 'clock')}${metric('Service téléphonique', 'À connecter', 'Aucun appel lancé depuis le portail', 'phone')}</div><div class="layout-two"><section class="panel"><div class="panel-heading"><div><h2>Rendez-vous du dossier</h2><p>${state.demo ? 'Exemples fictifs, sans réunion ni appel réel.' : 'Un avocat ou responsable habilité planifie les rendez-vous.'}</p></div></div><div class="panel-body">${!ready ? '<p class="table-empty">La liste des rendez-vous n’est pas disponible dans cette version du serveur.</p>' : sessions.length ? `<div class="communication-list">${sessions.map(communicationCard).join('')}</div>` : '<p class="table-empty">Aucun rendez-vous enregistré dans ce dossier.</p>'}${state.detail?.communications?.hasMore ? '<p class="callout warning">Liste limitée à 200 rendez-vous, avec votre chronomètre actif prioritaire ; d’autres rendez-vous ne sont pas affichés.</p>' : ''}${communicationLimits()}</div></section><aside class="section-stack"><div class="note-panel"><div class="note-icon">${icon('calendar')}</div><h2>Un rendez-vous.<br>Votre propre durée.</h2><p>Chaque membre suit son propre temps. Un rendez-vous déjà chronométré ne peut plus être annulé.</p><p>Les durées arrêtées se retrouvent dans Usages, pour une validation interne par une autre personne habilitée.</p><button class="text-button communication-jump" data-view="usage">Consulter les usages ${icon('arrow')}</button></div>${connections()}</aside></div>${readOnlyNote()}`;
  }
  function usageView() {
    const entries = state.detail?.usage?.entries || [];
    const sessions = communicationSessions();
    const rows = entries.map(entry => {
      const session = sessions.find(item => item.id === entry.sessionId);
      const approved = entry.status === 'approved_internal_only';
      const estimate = entry.needsReview ? 'Estimation suspendue — durée à contrôler' : money(entry.estimateCents) === null ? 'Estimation non disponible' : `${money(entry.estimateCents)} — estimation seulement`;
      const approval = !approved && !entry.needsReview && canApprove() && entry.authorSubject !== state.user?.subject
        ? `<button class="button secondary small" data-action="approve-usage" data-id="${esc(entry.id)}"${state.busy ? ' disabled' : ''}>Valider en interne</button>` : '';
      return `<tr><td><strong>${esc(session?.title || `Rendez-vous ${entry.sessionId}`)}</strong><small class="table-subtext">${esc(kindLabel(entry.kind))} · ${esc(date(entry.createdAt, true))}</small><small class="table-subtext">Auteur : ${esc(entry.authorSubject === state.user?.subject ? 'Vous' : entry.authorSubject || 'Non précisé')}</small><small class="table-subtext">Référence : ${esc(entry.id)}</small></td><td><span class="time-number usage-duration">${esc(elapsed(entry.seconds))}</span><small class="table-subtext">Chronomètre manuel · non vérifié par un fournisseur</small>${entry.needsReview ? '<span class="badge warning">Plus de 24 h — à contrôler</span>' : ''}</td><td><strong>${esc(estimate)}</strong><small class="table-subtext">${esc(rateLabel(entry.rateCentsPerMinute))}</small><small class="table-subtext">Non facturé · aucun débit de crédits</small></td><td><span class="badge ${approved ? 'teal' : 'warning'}">${approved ? 'Validé en interne' : 'Soumis'}</span>${approved ? `<small class="table-subtext">Le ${esc(date(entry.approvedAt, true))}<br>Par ${esc(entry.approvedBy || 'Personne habilitée')}</small>` : entry.authorSubject === state.user?.subject ? '<small class="table-subtext">Une autre personne habilitée doit valider.</small>' : ''}${approval}</td></tr>`;
    }).join('');
    return `${intro('DURÉES ET VALIDATION INTERNE', 'Comprendre chaque usage.', 'Des durées manuelles et des estimations distinctes d’une facture.', `<button class="button secondary" data-action="refresh-communications"${canMutate() && !state.busy ? '' : ' disabled'}>Actualiser</button>`)}${context()}<div class="metrics">${metric('Usages affichés', entries.length, 'Durées arrêtées dans ce dossier', 'clock')}${metric('À valider', entries.filter(item => item.status === 'submitted').length, 'Par une autre personne habilitée', 'check')}${metric('Facturation', 'Inactive', 'Aucun paiement ni débit de crédits', 'credit')}</div><section class="panel"><div class="panel-heading"><div><h2>Journal des usages</h2><p>${state.demo ? 'Exemple fictif de durée soumise.' : 'La validation interne ne déclenche aucune facturation.'}</p></div></div>${!usageReady() ? '<p class="table-empty">Le journal des usages n’est pas disponible dans cette version du serveur.</p>' : entries.length ? `<div class="table-wrap"><table class="usage-table"><caption class="sr-only">Durées des communications et estimations non facturées</caption><thead><tr><th scope="col">Rendez-vous et auteur</th><th scope="col">Durée</th><th scope="col">Estimation</th><th scope="col">Validation</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="table-empty">Aucun usage enregistré. L’arrêt de votre chronomètre crée une entrée ici.</p>'}${state.detail?.usage?.hasMore ? '<p class="time-note">Liste limitée aux 200 usages les plus récents ; d’autres usages ne sont pas affichés.</p>' : ''}<p class="time-note">Ces durées ne sont pas automatiquement ajoutées au journal « Suivi du temps ». Évitez de compter deux fois une même intervention. Un tarif absent reste non configuré ; ce n’est pas un tarif nul.</p></section>${communicationLimits()}${readOnlyNote()}`;
  }
  function render(focus = false) {
    header();
    if (state.mode === 'loading') return;
    if (state.mode === 'signedout') main.innerHTML = signedOut();
    else if (state.view === 'cases') main.innerHTML = casesView();
    else if (state.view === 'search') main.innerHTML = searchView();
    else if (state.view === 'integrations') main.innerHTML = integrationsView();
    else if (!state.detail) main.innerHTML = noCase();
    else main.innerHTML = ({ documents: documentsView, messages: messagesView, time: timeView, communications: communicationsView, usage: usageView })[state.view]();
    if (focus) main.focus({ preventScroll: true });
  }
  function showDialog(title, subtitle, body) {
    document.getElementById('dialog-content').innerHTML = `<div class="dialog-header"><div><h2 id="dialog-title">${esc(title)}</h2><p>${esc(subtitle)}</p></div><button class="icon-button" type="button" data-action="close-dialog" aria-label="Fermer la fenêtre">${icon('close')}</button></div><div class="dialog-body">${body}</div>`;
    if (!dialog.open) dialog.showModal();
  }
  function formFooter(submitLabel) {
    return `<p class="form-error" role="alert" hidden></p><div class="form-actions"><button class="button secondary" type="button" data-action="close-dialog">Annuler</button><button class="button" type="submit">${esc(submitLabel)}</button></div>`;
  }
  function openNewCase() {
    if (!canMutate()) return;
    showDialog('Nouveau dossier', 'Un titre clair et une référence suffisent pour commencer.', `<form id="case-form"><div class="field"><label for="case-title">Titre du dossier</label><input id="case-title" name="title" required maxlength="200" autocomplete="off" placeholder="Nommer le dossier"></div><div class="field"><label for="case-reference">Référence</label><input id="case-reference" name="reference" maxlength="100" autocomplete="off" placeholder="Votre référence de classement"><small>Évitez les renseignements personnels inutiles dans le titre et la référence.</small></div>${formFooter('Créer le dossier')}</form>`);
  }
  function openUpload() {
    if (!canMutate() || !state.selectedId) return;
    const options = (state.detail.documents || []).map((doc) => `<option value="${esc(doc.id)}">${esc(doc.name)} — v${esc(doc.versionNumber || 1)}</option>`).join('');
    showDialog('Ajouter une pièce', 'Le fichier est conservé avec son empreinte et sa provenance.', `<form id="upload-form"><div class="field"><label for="document-file">Fichier original</label><input id="document-file" class="file-input" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.tif,.tiff,.txt,.csv,.json,.eml,.doc,.docx,.xls,.xlsx" required><small>Un fichier à la fois · ${esc(bytes(state.capabilities?.maxDocumentBytes || MAX_FILE_BYTES))} maximum. PDF, images, texte, courriel et documents bureautiques.</small></div><div class="form-grid"><div class="field"><label for="source-type">Nature de la source</label><select id="source-type" name="sourceType"><option value="original">Original</option><option value="declaration">Déclaration</option><option value="analyse">Analyse</option><option value="ocr">Extraction OCR</option></select></div><div class="field"><label for="version-of">Lien à une version antérieure</label><select id="version-of" name="versionOf"><option value="">Nouvelle pièce</option>${options}</select></div></div><div class="field"><label for="source-reference">Provenance et référence</label><textarea id="source-reference" name="sourceReference" rows="2" maxlength="2048" placeholder="Origine, auteur, date, référence du courriel ou de la pièce…"></textarea><small>Décrivez ce qui est connu ; signalez ce qui reste à établir.</small></div><div class="field"><label for="extracted-text">Texte saisi ou extrait — facultatif</label><textarea id="extracted-text" name="extractedText" maxlength="200000" placeholder="Texte de travail destiné à la recherche, à comparer au fichier original…"></textarea><small>Aucun OCR automatique n’est lancé. Ce texte reste marqué « À vérifier », même si vous l’avez relu.</small></div><div class="callout warning">${icon('info')}<p>Le serveur calcule l’empreinte du fichier. Une empreinte identique permet de repérer un doublon ; elle ne prouve ni l’authenticité du document ni la véracité de son contenu.</p></div>${formFooter('Ajouter au dossier')}</form>`);
  }
  function openTime() {
    if (!canMutate()) return;
    showDialog('Soumettre du temps', 'Une entrée déclarée, à valider séparément.', `<form id="time-form"><div class="field"><label for="time-description">Travail effectué</label><textarea id="time-description" name="description" required maxlength="2000" placeholder="Décrivez précisément l’intervention…"></textarea></div><div class="field"><label for="time-minutes">Durée en minutes</label><input id="time-minutes" name="minutes" type="number" min="1" max="1440" step="1" required inputmode="numeric"><small>De 1 à 1 440 minutes. Aucun montant n’est calculé ni débité.</small></div>${formFooter('Soumettre pour validation')}</form>`);
  }
  function communicationScope() {
    return { caseId: state.selectedId, requestVersion: state.requestVersion, sessionVersion: state.sessionVersion };
  }
  function sameCommunicationScope(scope) {
    return scope.caseId === state.selectedId && scope.requestVersion === state.requestVersion && scope.sessionVersion === state.sessionVersion && canMutate();
  }
  function bindCommunicationForm(form) {
    const scope = communicationScope();
    form.dataset.caseId = scope.caseId;
    form.dataset.requestVersion = String(scope.requestVersion);
    form.dataset.sessionVersion = String(scope.sessionVersion);
  }
  function communicationFormScope(form) {
    return { caseId: form.dataset.caseId, requestVersion: Number(form.dataset.requestVersion), sessionVersion: Number(form.dataset.sessionVersion) };
  }
  function finishCommunicationAction(trigger) {
    const wasBusy = state.busy;
    state.busy = false; trigger.disabled = false;
    // A different dossier may have finished loading while this action was pending.
    if (wasBusy && state.mode === 'authenticated' && !state.caseLoading && ['communications', 'usage'].includes(state.view)) render();
  }
  function openCommunication() {
    if (!canApprove() || !communicationReady() || state.busy) return;
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'fuseau de votre appareil';
    showDialog('Planifier un rendez-vous', 'Un repère au dossier, sans invitation ni appel automatique.', `<form id="communication-form"><div class="field"><label for="communication-title">Objet du rendez-vous</label><input id="communication-title" name="title" required maxlength="160" autocomplete="off" placeholder="Préparation, point sur les pièces…"></div><div class="form-grid"><div class="field"><label for="communication-kind">Type</label><select id="communication-kind" name="kind"><option value="video">Visioconférence — lien Zoom externe</option><option value="phone">Téléphone — service non connecté</option></select></div><div class="field"><label for="communication-date">Date et heure</label><input id="communication-date" name="scheduledAt" type="datetime-local" required><small>Fuseau de votre appareil : ${esc(zone)}. La date sera enregistrée en UTC.</small></div></div><div class="field" id="communication-link-field"><label for="communication-link">Lien de participation Zoom — facultatif</label><input id="communication-link" name="joinUrl" type="url" maxlength="1024" autocomplete="off" placeholder="https://zoom.us/j/12345678901"><small>Uniquement un lien de participation Zoom /j/numéro, avec code de participation éventuel. Ne saisissez pas de lien hôte.</small></div><div class="callout warning">${icon('info')}<p>Ce rendez-vous sera visible dans ce dossier. Aucune réunion Zoom n’est créée, aucune invitation n’est envoyée et aucun appel téléphonique n’est lancé. Le chronomètre ne démarre pas à la planification.</p></div>${formFooter('Enregistrer le rendez-vous')}</form>`);
    bindCommunicationForm(document.getElementById('communication-form'));
  }
  function openCommunicationCancel(id) {
    if (!canApprove() || state.busy) return;
    const item = communicationSessions().find(session => session.id === id);
    if (!item || item.status === 'cancelled' || item.ownTimer) return;
    showDialog('Annuler le rendez-vous', item.title, `<form id="communication-cancel-form" data-id="${esc(id)}"><p>Le rendez-vous restera dans le dossier avec le statut « Annulé ». Un rendez-vous déjà chronométré par un membre ne peut pas être annulé.</p><p>Aucun message externe n’est envoyé aux participants.</p>${formFooter('Confirmer l’annulation')}</form>`);
    bindCommunicationForm(document.getElementById('communication-cancel-form'));
  }
  async function submitCommunication(form) {
    const scope = communicationFormScope(form);
    if (!sameCommunicationScope(scope) || !canApprove() || !communicationReady() || state.busy) return;
    const button = form.querySelector('[type="submit"]'), errorNode = form.querySelector('.form-error');
    state.busy = true; button.disabled = true; errorNode.hidden = true;
    try {
      const base = `/api/cases/${encodeURIComponent(scope.caseId)}/communications`;
      let resultMessage;
      if (form.id === 'communication-cancel-form') {
        const item = communicationSessions().find(session => session.id === form.dataset.id);
        if (!item || item.ownTimer || item.status === 'cancelled') throw new Error('Ce rendez-vous ne peut plus être annulé depuis cette vue.');
        await api(`${base}/${encodeURIComponent(item.id)}/cancel`, { method: 'POST', body: '{}' });
        resultMessage = 'Le rendez-vous est annulé. Aucun message externe n’a été envoyé.';
      } else {
        const data = new FormData(form), kind = String(data.get('kind'));
        const localDate = String(data.get('scheduledAt') || ''), parsed = new Date(localDate);
        if (!localDate || Number.isNaN(parsed.getTime())) throw new Error('Précisez une date et une heure valides.');
        const title = String(data.get('title') || '').trim();
        if (!title) throw new Error('Précisez l’objet du rendez-vous.');
        const rawLink = kind === 'video' ? String(data.get('joinUrl') || '').trim() : '';
        const joinUrl = rawLink ? safeZoomUrl(rawLink) : null;
        if (rawLink && !joinUrl) throw new Error('Utilisez un lien de participation HTTPS Zoom au format /j/numéro.');
        const body = JSON.stringify({ kind, title, scheduledAt: parsed.toISOString(), joinUrl });
        // Keep the same key across retries of the same form and payload only.
        if (form.dataset.payload !== body || !form.dataset.idempotencyKey) {
          form.dataset.idempotencyKey = crypto.randomUUID(); form.dataset.payload = body;
        }
        await api(base, { method: 'POST', headers: { 'Idempotency-Key': form.dataset.idempotencyKey }, body });
        resultMessage = 'Le rendez-vous a été enregistré. Aucun appel ni chronomètre n’a été démarré.';
      }
      if (!sameCommunicationScope(scope)) return;
      if (!await refreshDetail(scope.caseId) || !sameCommunicationScope(scope)) return;
      if (form.isConnected && dialog.open) dialog.close();
      state.busy = false;
      render(); notify(resultMessage);
    } catch (error) {
      if (sameCommunicationScope(scope)) {
        if (errorNode.isConnected) { errorNode.textContent = error.message; errorNode.hidden = false; }
        else notify(error.message, true);
      }
    } finally { finishCommunicationAction(button); }
  }
  async function mutateCommunication(action, id, trigger) {
    if (!canMutate() || state.busy) return;
    const scope = communicationScope();
    let path, message;
    if (action === 'approve') {
      const entry = state.detail?.usage?.entries?.find(item => item.id === id);
      if (!canApprove() || !entry || entry.status !== 'submitted' || entry.needsReview || entry.authorSubject === state.user?.subject) return;
      path = `usage/${encodeURIComponent(id)}/approve`;
      message = 'L’usage a été validé en interne. Aucune facture ni aucun débit de crédits n’a été créé.';
    } else {
      const item = communicationSessions().find(session => session.id === id);
      if (!item || !['start', 'end'].includes(action) || item.status === 'cancelled') return;
      if (action === 'start' && (item.ownTimer || communicationSessions().some(session => session.ownTimer?.status === 'running'))) return;
      if (action === 'end' && item.ownTimer?.status !== 'running') return;
      path = `communications/${encodeURIComponent(id)}/${action}`;
      message = action === 'start' ? 'Votre chronomètre est démarré. Arrêtez-le à la fin de votre échange ; fermer la page ne l’arrête pas.' : 'Votre chronomètre est arrêté. La durée est enregistrée dans Usages, sans facturation.';
    }
    state.busy = true; trigger.disabled = true;
    try {
      await api(`/api/cases/${encodeURIComponent(scope.caseId)}/${path}`, { method: 'POST', body: '{}' });
      if (!sameCommunicationScope(scope)) return;
      if (!await refreshDetail(scope.caseId) || !sameCommunicationScope(scope)) return;
      state.busy = false;
      render(); notify(message);
    } catch (error) { if (sameCommunicationScope(scope)) notify(error.message, true); }
    finally { finishCommunicationAction(trigger); }
  }
  async function refreshIntegrations(trigger, quiet = false) {
    if (!canMutate() || state.busy) return;
    const sessionVersion = state.sessionVersion; state.busy = true; if (trigger) trigger.disabled = true;
    try {
      const data = await api('/api/integrations');
      if (sessionVersion !== state.sessionVersion) return;
      state.integrations = data; state.busy = false; render();
      if (!quiet) notify('La liste des intégrations a été actualisée.');
    } catch (error) { if (sessionVersion === state.sessionVersion) notify(error.message, true); }
    finally { state.busy = false; if (trigger?.isConnected) trigger.disabled = false; }
  }
  // The provider's consent page is a top-level navigation; it returns to /integrations/callback.
  async function connectIntegration(id, trigger) {
    if (!canMutate() || state.busy) return;
    state.busy = true; trigger.disabled = true;
    try {
      const result = await api(`/api/integrations/${encodeURIComponent(id)}/connect`, { method: 'POST', body: '{}' });
      const target = new URL(result.authorizationUrl);
      if (target.protocol !== 'https:') throw new Error('Adresse d’autorisation refusée.');
      window.location.assign(target.href);
    } catch (error) { notify(error.message, true); state.busy = false; if (trigger.isConnected) trigger.disabled = false; }
  }
  async function disconnectIntegration(id, trigger) {
    if (!canMutate() || state.busy) return;
    const sessionVersion = state.sessionVersion; state.busy = true; trigger.disabled = true;
    try {
      const result = await api(`/api/integrations/${encodeURIComponent(id)}/disconnect`, { method: 'POST', body: '{}' });
      if (sessionVersion !== state.sessionVersion) return;
      state.integrations = await api('/api/integrations');
      state.busy = false; render();
      notify(result.revocation === 'revoked' ? 'Service déconnecté, et autorisation retirée chez le fournisseur.' : 'Service déconnecté. Retirez aussi l’autorisation dans les réglages de votre compte chez le fournisseur.');
    } catch (error) { if (sessionVersion === state.sessionVersion) notify(error.message, true); }
    finally { state.busy = false; if (trigger.isConnected) trigger.disabled = false; }
  }
  async function linkAppointment(id, provider, trigger, remove = false) {
    if (!canApprove() || state.busy) return;
    const item = communicationSessions().find(session => session.id === id);
    if (!item || item.status === 'cancelled' || !Object.hasOwn(APPOINTMENT_ACTIONS, provider)) return;
    const scope = communicationScope(); state.busy = true; trigger.disabled = true;
    try {
      await api(`/api/cases/${encodeURIComponent(scope.caseId)}/communications/${encodeURIComponent(id)}/integrations/${encodeURIComponent(provider)}${remove ? '/remove' : ''}`, { method: 'POST', body: '{}' });
      if (!sameCommunicationScope(scope)) return;
      if (!await refreshDetail(scope.caseId) || !sameCommunicationScope(scope)) return;
      state.busy = false; render();
      notify(remove ? 'L’élément a été retiré chez le fournisseur.' : provider === 'zoom' ? 'La réunion Zoom est créée. Le lien de participation est visible par les membres du dossier.' : 'Le rendez-vous est inscrit dans votre agenda.');
    } catch (error) { if (sameCommunicationScope(scope)) notify(error.message, true); }
    finally { finishCommunicationAction(trigger); }
  }
  async function refreshCommunications(trigger) {
    if (!canMutate() || state.busy) return;
    const scope = communicationScope(); state.busy = true; trigger.disabled = true;
    try { if (await refreshDetail(scope.caseId) && sameCommunicationScope(scope)) { state.busy = false; render(); notify('Le suivi du dossier a été actualisé.'); } }
    catch (error) { if (sameCommunicationScope(scope)) notify(error.message, true); }
    finally { finishCommunicationAction(trigger); }
  }
  function preview(id, ordinal = 1) {
    const doc = state.detail?.documents.find((item) => item.id === id) || state.searchResults?.find((item) => item.id === id);
    if (!doc) return;
    const searchHit = state.searchResults?.find((item) => item.id === id && (item.citation?.ordinal || 1) === ordinal);
    const text = doc.extractedText || searchHit?.excerpt || '';
    showDialog('Pièce et provenance', doc.name, `<dl class="metadata-grid"><div><dt>Nature</dt><dd>${sourceBadge(doc.sourceType)}</dd></div><div><dt>État</dt><dd>${reviewBadge(doc.reviewStatus)}</dd></div><div><dt>Ajoutée le</dt><dd>${esc(date(doc.createdAt))}</dd></div><div><dt>Version et taille</dt><dd>Version ${esc(doc.versionNumber || 1)} · ${state.demo ? 'Exemple fictif' : esc(bytes(doc.bytes))}</dd></div><div class="full-width"><dt>Provenance déclarée</dt><dd>${esc(doc.sourceReference || 'Non précisée dans les données disponibles.')}</dd></div><div class="full-width"><dt>Empreinte SHA-256</dt><dd class="hash-value">${esc(state.demo ? 'Aucune empreinte réelle — document fictif.' : doc.sha256 || 'Non fournie.')}</dd></div>${duplicateDetails(doc)}${doc.versionOf ? `<div class="full-width"><dt>Version précédente</dt><dd>${esc(doc.versionOf)}</dd></div>` : ''}</dl><div class="callout warning">${icon('info')}<p>La nature et le contrôle sont des informations déclarées. Une lecture visuelle ou un texte saisi ne constitue pas une authentification de la pièce.</p></div><h3 class="transcription-title">${doc.extractedText ? 'Texte saisi ou extrait — à contrôler' : text ? 'Extrait retrouvé par la recherche — à contrôler' : 'Texte de recherche'}</h3><div class="transcription">${esc(text || 'Aucun texte fourni dans cette vue. Recherchez un passage ou téléchargez le fichier versé pour le consulter.')}</div><div class="form-actions"><button class="button secondary" type="button" data-action="close-dialog">Fermer</button><button class="button" type="button" data-action="download" data-id="${esc(doc.id)}"${canMutate() ? '' : ' disabled'}>${icon('download')}${state.demo ? 'Exemple sans original réel' : 'Télécharger le fichier versé'}</button></div>`);
    if (!state.demo && doc.pageCount) {
      const panel = document.createElement('section'); panel.id = 'document-page-reader'; panel.className = 'document-page-reader';
      const actions = dialog.querySelector('.form-actions'); actions.before(panel);
      dialog.dataset.pageDocument = id;
      void loadPage(id, Math.max(0, ordinal - 1));
    } else { delete dialog.dataset.pageDocument; }
  }
  async function loadPage(id, offset) {
    const available = state.detail?.documents.find(doc => doc.id === id);
    if (!available || !Number.isSafeInteger(offset) || offset < 0 || offset >= available.pageCount) return;
    const caseId=state.selectedId, session=state.sessionVersion, request=++state.pageRequest;
    const panel=document.getElementById('document-page-reader'); if(!panel || state.demo)return;
    panel.textContent='Chargement de la page…';
    try {
      const result=await api(`/api/cases/${encodeURIComponent(caseId)}/documents/${encodeURIComponent(id)}/pages?offset=${offset}&limit=1`);
      if(caseId!==state.selectedId || session!==state.sessionVersion || request!==state.pageRequest || !dialog.open || dialog.dataset.pageDocument!==id)return;
      const page=result.pages[0], doc=result.document;
      const sourceUnit = page?.page !== null && page?.page !== undefined
        ? `${doc.mimeType === 'application/pdf' ? 'page source' : 'unité logique'} ${esc(page.page)}`
        : 'unité sans numéro de page';
      panel.innerHTML=`<h3>Lecture référencée</h3><p class="citation-line">${esc(doc.sourceDocumentId || doc.id)} · ${sourceUnit} · extrait ${offset+1} / ${esc(doc.pageCount)} · ${esc(page?.label || '')}</p><p class="table-subtext">${esc(page?.method || 'Méthode non précisée')} · texte à comparer au fichier versé.</p><div class="transcription">${esc(page?.text || 'Aucun texte disponible pour cette page/unité. Consulter le fichier versé.')}</div>${page?.visual_review_note ? `<p class="callout">${esc(page.visual_review_note)}</p>` : ''}<details><summary>Provenance de cette page / unité</summary><pre class="page-provenance">${esc(JSON.stringify(page ? Object.fromEntries(Object.entries(page).filter(([key])=>key!=='text')) : {},null,2))}</pre></details><p class="table-subtext">Pages / unités sans texte restant à obtenir : ${esc((doc.missingTextPages || []).join(', ') || 'aucune signalée dans cet index')}. OCR à contrôler : ${esc((doc.ocrPagesToVerify || []).join(', ') || 'aucun signalé dans cet index')}.</p><div class="page-controls"><button class="button secondary small" data-action="page" data-id="${esc(id)}" data-offset="${offset-1}"${offset===0?' disabled':''}>Précédente</button><span>${offset+1} / ${esc(doc.pageCount)}</span><button class="button secondary small" data-action="page" data-id="${esc(id)}" data-offset="${offset+1}"${offset+1>=doc.pageCount?' disabled':''}>Suivante</button></div><form id="page-jump-form" class="page-jump" data-document="${esc(id)}" data-case="${esc(caseId)}"><label for="page-jump">Aller à l’extrait / unité (ordre de lecture)</label><div><input id="page-jump" name="ordinal" type="number" inputmode="numeric" min="1" max="${esc(doc.pageCount)}" value="${offset+1}" required><button class="button secondary small" type="submit">Aller</button></div><small>Le numéro de page PDF ou d’unité logique est indiqué séparément dans la référence.</small></form>`;
    } catch(error) {if(caseId===state.selectedId && session===state.sessionVersion && request===state.pageRequest && dialog.open)panel.textContent=error.message;}
  }
  async function jumpPage(form) {
    const id = form.dataset.document, ordinal = Number(new FormData(form).get('ordinal'));
    const doc = state.detail?.documents.find(item => item.id === id);
    if (!dialog.open || dialog.dataset.pageDocument !== id || form.dataset.case !== state.selectedId || !doc || !Number.isSafeInteger(ordinal) || ordinal < 1 || ordinal > doc.pageCount) return;
    await loadPage(id, ordinal - 1);
  }
  async function loadCase(id, newView = state.view, focus = false, preserveSearch = false) {
    cancelSearchWork();
    const version = ++state.requestVersion;
    const sessionVersion = state.sessionVersion;
    state.caseLoading = true;
    if (dialog.open) dialog.close();
    render();
    try {
      const detail = state.demo ? examples[id] : await api(`/api/cases/${encodeURIComponent(id)}`);
      if (version !== state.requestVersion || sessionVersion !== state.sessionVersion || !detail) return false;
      state.selectedId = id; state.detail = detail; state.view = newView; state.documentCategory = ''; state.onlyUnresolved = false;
      if (!preserveSearch) { state.searchResults = null; state.searchQuery = ''; state.searchMeta = null; }
      return true;
    } catch (error) { if (sessionVersion === state.sessionVersion) notify(error.message, true); }
    finally {
      if (version === state.requestVersion && sessionVersion === state.sessionVersion) { state.caseLoading = false; render(focus); }
    }
  }
  async function refreshDetail(caseId = state.selectedId) {
    if (!caseId) return false;
    cancelSearchWork();
    const requestVersion = state.requestVersion;
    const sessionVersion = state.sessionVersion;
    const detail = await api(`/api/cases/${encodeURIComponent(caseId)}`);
    if (caseId !== state.selectedId || requestVersion !== state.requestVersion || sessionVersion !== state.sessionVersion) return false;
    state.detail = detail;
    return true;
  }
  async function download(id, trigger) {
    if (!canMutate()) return;
    const doc = state.detail?.documents.find((item) => item.id === id);
    if (!doc) return;
    trigger.disabled = true;
    try {
      const blob = await api(`/api/cases/${encodeURIComponent(state.selectedId)}/documents/${encodeURIComponent(id)}/download`, { asBlob: true });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = doc.name; anchor.rel = 'noopener';
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      notify('Le téléchargement de la pièce a été lancé.');
    } catch (error) { notify(error.message, true); }
    finally { trigger.disabled = false; }
  }
  function cancelDictation() {
    dictationGeneration += 1;
    const previous = dictationController; dictationController = null;
    previous?.abort(); state.dictationStatus = 'idle'; state.dictationMessage = '';
  }
  function cancelSearchWork() {
    cancelDictation(); state.searchRequest += 1; state.searchPending = false;
  }
  function navigate(view) {
    if (!Object.hasOwn(VIEW_LABELS, view)) return;
    cancelSearchWork(); state.requestVersion += 1; state.caseLoading = false;
    if (dialog.open) dialog.close(); state.pageRequest += 1;
    state.view = view; render(true);
  }
  function openSearch(scope = 'all') {
    cancelSearchWork(); state.requestVersion += 1; state.caseLoading = false;
    state.searchScope = scope === 'case' && state.selectedId ? 'case' : 'all';
    state.searchResults = null; state.searchMeta = null; state.view = 'search'; render(true);
    document.getElementById('document-query')?.focus();
  }
  function beginDictation() {
    if (state.view !== 'search' || !['demo','authenticated'].includes(state.mode) || state.searchPending || state.caseLoading) return;
    if (['starting','listening'].includes(state.dictationStatus)) { dictationController?.stop(); return; }
    cancelDictation();
    if (!window.BesoinAvocatDictation) { state.dictationMessage = 'Dictée indisponible. Saisissez votre recherche au clavier.'; render(); return; }
    const generation = ++dictationGeneration, session = state.sessionVersion, selected = state.selectedId, scope = state.searchScope;
    const active = () => generation === dictationGeneration && session === state.sessionVersion && selected === state.selectedId && scope === state.searchScope && state.view === 'search' && ['demo','authenticated'].includes(state.mode);
    dictationController = window.BesoinAvocatDictation.create({ lang: state.dictationLanguage, shouldAccept: active,
      onState(status) {
        if (!active()) return;
        state.dictationStatus = status;
        state.dictationMessage = ({ starting: 'Ouverture du micro…', listening: 'Écoute en cours. Terminez ou annulez la dictée.', stopping: 'Fin de la dictée…', idle: '' })[status] || '';
        render(); document.getElementById(status === 'idle' ? 'document-query' : 'dictation-control')?.focus();
      },
      onResult(text) {
        if (!active() || typeof text !== 'string') return;
        if (text.length > 200) { state.dictationMessage = 'La dictée dépasse 200 caractères. Faites une recherche plus courte ou utilisez le clavier.'; state.dictationStatus = 'idle'; render(); return; }
        state.searchQuery = text; state.searchResults = null; state.searchMeta = null;
        state.dictationMessage = 'Texte dicté ajouté. Vous pouvez le corriger.'; render();
        if (state.dictationAutoSearch && state.searchQuery.trim()) void runSearch(state.searchQuery);
        else document.getElementById('document-query')?.focus();
      },
      onError(message) { if (active()) { state.dictationMessage = String(message || 'La dictée n’a pas abouti. Utilisez le clavier.'); state.dictationStatus = 'idle'; render(); } },
    });
    dictationController.start();
  }
  function demoSearch(query, offset, limit) {
    const words = fold(query).split(/\s+/).filter(Boolean);
    const terms = state.searchMode === 'literal' ? [fold(query)] : words;
    const hits = [];
    for (const [caseId, item] of Object.entries(examples || {})) {
      if (state.searchScope === 'case' && caseId !== state.selectedId) continue;
      for (const doc of item.documents) {
        const haystack = fold(`${doc.name} ${doc.sourceReference} ${doc.extractedText}`);
        if (terms.every(word => haystack.includes(word))) hits.push({ ...doc, documentId: doc.id, caseId, caseTitle: item.case.title, excerpt: doc.extractedText, citation: null });
      }
    }
    return { query, mode: state.searchMode, terms, results: hits.slice(offset,offset+limit), offset, limit, hasMore: hits.length > offset + limit, nextOffset: hits.length > offset + limit ? offset + limit : null, ai: false };
  }
  async function runSearch(rawQuery, more = false) {
    const query = String(rawQuery || '').trim();
    if (!query || query.length > 200 || state.view !== 'search' || state.caseLoading || !['demo','authenticated'].includes(state.mode)) return;
    if (more && (state.searchPending || !state.searchMeta?.hasMore)) return;
    const offset = more ? state.searchMeta.nextOffset : 0;
    if (!Number.isSafeInteger(offset) || offset < 0) return;
    cancelDictation(); const request = ++state.searchRequest, session = state.sessionVersion, selected = state.selectedId, scope = state.searchScope, mode = state.searchMode;
    if (scope === 'case' && !selected) { notify('Choisissez d’abord un dossier.', true); return; }
    state.searchQuery = query; state.searchPending = true;
    if (!more) { state.searchResults = null; state.searchMeta = null; }
    render(); document.getElementById('document-query')?.focus();
    const active = () => request === state.searchRequest && session === state.sessionVersion && selected === state.selectedId && scope === state.searchScope && mode === state.searchMode && state.view === 'search';
    try {
      const params = new URLSearchParams({ q: query, mode, offset: String(offset), limit: '25' });
      if (scope === 'case') params.set('caseId', selected);
      const result = state.demo ? demoSearch(query, offset, 25) : await api(`/api/search?${params}`);
      if (!active()) return;
      if (!Array.isArray(result.results)) throw new Error('Réponse de recherche invalide. Réessayez.');
      state.searchResults = more ? [...state.searchResults, ...result.results] : result.results;
      state.searchMeta = result;
    } catch (error) { if (active()) notify(error.message, true); }
    finally { if (active()) {
      const focusId = document.activeElement?.id || 'document-query';
      state.searchPending = false; render(); document.getElementById(focusId)?.focus();
    } }
  }
  async function submitSearch(form) {
    const query = String(new FormData(form).get('query') || '').trim();
    if (form.id !== 'search-form') openSearch(form.id === 'case-search-form' ? 'case' : 'all');
    await runSearch(query);
  }
  async function openSearchSource(index, downloadRequested = false, trigger = { disabled: false }) {
    const hit = state.searchResults?.[index];
    if (!Number.isSafeInteger(index) || index < 0 || !hit || state.caseLoading || (downloadRequested && state.demo)) return;
    const targetCase = hit.caseId || state.selectedId, documentId = hit.documentId || hit.id;
    if (!state.cases.some(item => item.id === targetCase)) { notify('Ce dossier n’est plus accessible. Actualisez votre session.', true); return; }
    cancelDictation();
    if (targetCase !== state.selectedId) {
      const pending = loadCase(targetCase, 'search', false, true), request = state.searchRequest;
      if (!await pending || request !== state.searchRequest) return;
    }
    if (state.view !== 'search' || targetCase !== state.selectedId || !state.detail?.documents.some(doc => doc.id === documentId)) return;
    if (downloadRequested) await download(documentId, trigger);
    else preview(documentId, hit.citation?.ordinal || 1);
  }
  function mimeFor(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const known = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', tif: 'image/tiff', tiff: 'image/tiff', txt: 'text/plain', csv: 'text/csv', json: 'application/json', eml: 'message/rfc822', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    return known[ext] || file.type || 'application/octet-stream';
  }
  async function fileBase64(file) {
    const array = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let i = 0; i < array.length; i += 16384) binary += String.fromCharCode(...array.subarray(i, i + 16384));
    return btoa(binary);
  }
  async function submitMutation(form) {
    if (!canMutate() || state.busy) return;
    state.busy = true;
    const button = form.querySelector('[type="submit"]');
    const errorNode = form.querySelector('.form-error');
    button.disabled = true; if (errorNode) errorNode.hidden = true;
    try {
      const data = new FormData(form);
      const caseId = state.selectedId;
      const casePath = `/api/cases/${encodeURIComponent(caseId)}`;
      let message = '';
      if (form.id === 'case-form') {
        const result = await api('/api/cases', { method: 'POST', body: JSON.stringify({ title: String(data.get('title')).trim(), reference: String(data.get('reference')).trim() }) });
        state.cases = (await api('/api/cases')).cases || [];
        state.selectedId = result.case.id; await refreshDetail(); state.view = 'documents'; message = 'Le dossier a été créé.';
      } else if (form.id === 'upload-form') {
        const file = data.get('file');
        if (!(file instanceof File) || !file.size) throw new Error('Sélectionnez un fichier non vide.');
        if (file.size > (state.capabilities?.maxDocumentBytes || MAX_FILE_BYTES)) throw new Error('Ce fichier dépasse la limite de taille du serveur.');
        if (file.name.length > 240 || /[\\/\u0000-\u001f]/.test(file.name)) throw new Error('Le nom du fichier doit être court et sans caractère de contrôle.');
        const payload = { name: file.name, mimeType: mimeFor(file), contentBase64: await fileBase64(file), sourceType: data.get('sourceType'), sourceReference: String(data.get('sourceReference')).trim(), extractedText: String(data.get('extractedText')), reviewStatus: 'a_verifier' };
        if (data.get('versionOf')) payload.versionOf = data.get('versionOf');
        await api(`${casePath}/documents`, { method: 'POST', body: JSON.stringify(payload) });
        await refreshDetail(caseId); message = 'La pièce et sa provenance ont été ajoutées. Son contenu reste à vérifier.';
      } else if (form.id === 'message-form') {
        const body = String(data.get('body')).trim();
        if (!body) throw new Error('Rédigez un message avant de l’envoyer.');
        await api(`${casePath}/messages`, { method: 'POST', body: JSON.stringify({ body }) });
        await refreshDetail(caseId); message = 'Le message a été ajouté au dossier.';
      } else if (form.id === 'time-form') {
        await api(`${casePath}/time`, { method: 'POST', body: JSON.stringify({ description: String(data.get('description')).trim(), minutes: Number(data.get('minutes')) }) });
        await refreshDetail(caseId); message = 'Le temps a été soumis pour validation. Aucun montant n’a été débité.';
      } else return;
      if (dialog.open) dialog.close(); render(); notify(message);
    } catch (error) {
      if (errorNode?.isConnected) { errorNode.textContent = error.message; errorNode.hidden = false; }
      else notify(error.message, true);
    } finally { state.busy = false; button.disabled = false; }
  }
  async function approveTime(id, trigger) {
    if (!canApprove()) return;
    const entry = state.detail?.timeEntries.find((item) => item.id === id);
    if (!entry || entry.authorSubject === state.user?.subject) return;
    const caseId = state.selectedId;
    trigger.disabled = true;
    try {
      await api(`/api/cases/${encodeURIComponent(caseId)}/time/${encodeURIComponent(id)}/approve`, { method: 'POST', body: '{}' });
      await refreshDetail(caseId); render(); notify('L’entrée de temps a été validée. Aucun paiement n’a été déclenché.');
    } catch (error) { notify(error.message, true); trigger.disabled = false; }
  }
  function help() {
    showDialog('Un espace pour préparer', 'Le document, sa source et ses limites restent accessibles.', `<p>Les dossiers regroupent les pièces, les échanges et le suivi du temps. Les droits sont contrôlés par le serveur pour chaque dossier.</p><div class="callout">${icon('info')}<p><strong>Une source reste à apprécier</strong>Un original, une déclaration, une analyse et une extraction OCR sont des natures distinctes. Un texte extrait reste à contrôler sur la pièce. Les doublons ne s’additionnent pas.</p></div><p>L’aperçu ne contient que des exemples fictifs et n’envoie aucune information au serveur. La connexion TAKATAK, l’assistant IA, les crédits et les appels ne sont pas présentés comme actifs lorsqu’ils ne sont pas configurés.</p><div class="form-actions"><button class="button" data-action="close-dialog">Compris</button></div>`);
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.dictationStatus !== 'idle') {
      event.preventDefault(); cancelDictation(); render();
      document.getElementById('document-query')?.focus();
    }
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.view) { navigate(button.dataset.view); return; }
    const action = button.dataset.action;
    if (action === 'go-cases') navigate('cases');
    if (action === 'open-search') openSearch(button.dataset.scope);
    if (action === 'dictate') beginDictation();
    if (action === 'cancel-dictation') { cancelDictation(); render(); }
    if (action === 'search-more') void runSearch(state.searchMeta?.query || state.searchQuery, true);
    if (action === 'search-preview') void openSearchSource(Number(button.dataset.resultIndex));
    if (action === 'search-download') void openSearchSource(Number(button.dataset.resultIndex), true, button);
    if (action === 'open-case') void loadCase(button.dataset.id, 'documents', true);
    if (action === 'new-case') openNewCase();
    if (action === 'upload') openUpload();
    if (action === 'new-time') openTime();
    if (action === 'new-communication') openCommunication();
    if (action === 'communication-cancel') openCommunicationCancel(button.dataset.id);
    if (action === 'communication-start') void mutateCommunication('start', button.dataset.id, button);
    if (action === 'communication-end') void mutateCommunication('end', button.dataset.id, button);
    if (action === 'approve-usage') void mutateCommunication('approve', button.dataset.id, button);
    if (action === 'refresh-communications') void refreshCommunications(button);
    if (action === 'refresh-integrations') void refreshIntegrations(button);
    if (action === 'integration-connect') void connectIntegration(button.dataset.id, button);
    if (action === 'integration-disconnect') void disconnectIntegration(button.dataset.id, button);
    if (action === 'appointment-link') void linkAppointment(button.dataset.id, button.dataset.provider, button);
    if (action === 'appointment-unlink') void linkAppointment(button.dataset.id, button.dataset.provider, button, true);
    if (action === 'preview') preview(button.dataset.id, Number(button.dataset.page || 1));
    if (action === 'page') void loadPage(button.dataset.id, Number(button.dataset.offset));
    if (action === 'close-dialog') dialog.close();
    if (action === 'download') void download(button.dataset.id, button);
    if (action === 'approve-time') void approveTime(button.dataset.id, button);
    if (button.id === 'help-button') help();
    if (button.id === 'logout-button') void logout(button);
  });
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    if (form.id === 'login-form') void login(form);
    else if (['search-form', 'dashboard-search-form', 'case-search-form'].includes(form.id)) void submitSearch(form);
    else if (form.id === 'page-jump-form') void jumpPage(form);
    else if (['communication-form', 'communication-cancel-form'].includes(form.id)) void submitCommunication(form);
    else if (['case-form', 'upload-form', 'message-form', 'time-form'].includes(form.id)) void submitMutation(form);
  });
  document.addEventListener('change', (event) => {
    if (event.target.id === 'search-scope' || event.target.id === 'search-mode') {
      cancelSearchWork();
      if (event.target.id === 'search-scope') state.searchScope = event.target.value === 'case' ? 'case' : 'all';
      else state.searchMode = event.target.value === 'literal' ? 'literal' : 'terms';
      state.searchResults = null; state.searchMeta = null; render();
    }
    if (event.target.id === 'search-case') {
      cancelSearchWork(); state.searchResults = null; state.searchMeta = null;
      if (state.cases.some(item => item.id === event.target.value)) void loadCase(event.target.value, 'search', false, true);
    }
    if (event.target.id === 'dictation-language') { cancelSearchWork(); state.dictationLanguage = event.target.value === 'en-CA' ? 'en-CA' : 'fr-CA'; render(); }
    if (event.target.id === 'dictation-auto-search') state.dictationAutoSearch = event.target.checked;
    if (event.target.id === 'case-select') void loadCase(event.target.value);
    if (event.target.id === 'document-category') { state.documentCategory=event.target.value; render(); }
    if (event.target.id === 'document-unresolved') { state.onlyUnresolved=event.target.checked; render(); }
    if (event.target.id === 'communication-kind') {
      const phone = event.target.value === 'phone';
      const link = document.getElementById('communication-link');
      document.getElementById('communication-link-field').hidden = phone;
      link.disabled = phone;
    }
  });
  document.addEventListener('input', (event) => {
    if (event.target.id === 'document-query') {
      const listening = state.dictationStatus !== 'idle';
      state.searchQuery = event.target.value; cancelSearchWork(); state.searchResults = null; state.searchMeta = null;
      if (listening) {
        const selection = [event.target.selectionStart, event.target.selectionEnd, event.target.selectionDirection];
        render(); const input = document.getElementById('document-query'); input?.focus();
        if (Number.isInteger(selection[0]) && Number.isInteger(selection[1])) input?.setSelectionRange?.(...selection);
      } else {
        const results = document.getElementById('search-results'); if (results) results.innerHTML = searchResults();
        const submit = document.querySelector('#search-form button[type="submit"]');
        if (submit) { submit.disabled = state.caseLoading; submit.textContent = 'Rechercher'; }
        const microphone = document.getElementById('dictation-control');
        if (microphone) microphone.disabled = state.caseLoading || !window.BesoinAvocatDictation || !(window.SpeechRecognition || window.webkitSpeechRecognition);
        const status = document.getElementById('dictation-status'); if (status) status.textContent = state.dictationMessage;
      }
      return;
    }
    if (event.target.id !== 'case-filter') return;
    const query = fold(event.target.value);
    let count = 0;
    document.querySelectorAll('[data-case-filter]').forEach((card) => { card.hidden = !card.dataset.caseFilter.includes(query); if (!card.hidden) count += 1; });
    document.getElementById('case-filter-empty').hidden = count !== 0 || state.cases.length === 0;
  });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });

  async function loadSession() {
    const me = await api('/api/me');
    if (!me.user?.active) throw new Error('Cette identité ne dispose pas d’un accès actif.');
    state.user = me.user;
    state.capabilities = await api('/api/capabilities');
    // An older server without connectors still opens the workspace.
    state.integrations = await api('/api/integrations').catch(error => { if (error.status === 401) throw error; return null; });
    state.cases = (await api('/api/cases')).cases || [];
    state.mode = 'authenticated';
    if (state.cases.length) { state.selectedId = state.cases[0].id; await refreshDetail(); }
  }
  async function login(form) {
    if (state.demo || state.health?.loginConfigured !== true || state.busy) return;
    state.busy = true;
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    const email = form.elements.email.value.trim();
    let password = form.elements.password.value;
    form.elements.password.value = '';
    clearSession();
    try {
      const pending = api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      password = '';
      await pending;
      await loadSession();
      notify('Vous êtes connecté à votre espace.');
    } catch (error) {
      clearSession(); notify(error.message, true);
    } finally {
      password = ''; state.busy = false; render(true);
    }
  }
  async function logout(button) {
    if (state.demo || state.busy) return;
    cancelSearchWork();
    state.busy = true; button.disabled = true;
    // Invalidate in-flight reads before closing the server session.
    state.sessionVersion += 1; state.requestVersion += 1; state.pageRequest += 1; state.caseLoading = true;
    try {
      await api('/api/auth/logout', { method: 'POST', body: '{}' });
      clearSession(); render(true); notify('La session a été fermée.');
    } catch (error) {
      state.caseLoading = false;
      notify(`La fermeture de session n’a pas pu être confirmée. ${error.message}`, true);
    } finally { state.busy = false; button.disabled = false; }
  }
  async function start() {
    fillIcons();
    if (state.demo) { examples = demoData(); state.detail = examples[state.selectedId]; state.mode = 'demo'; render(); return; }
    state.health = await publicHealth();
    try {
      await loadSession();
      // The connector return page links back to /#integrations.
      if (window.location.hash === '#integrations') state.view = 'integrations';
      render();
    }
    catch (error) {
      clearSession(); render();
      if (error.status !== 401) notify(error.message, true);
    }
  }
  void start();
})();
