'use strict';

(() => {
  const MAX_FILE_BYTES = 64 * 1024 * 1024;
  const SOURCE_LABELS = { original: 'Pièce source ou copie', declaration: 'Déclaration', analyse: 'Analyse', ocr: 'Extraction ou transcription' };
  // Order follows the cockpit navigation (swipe on mobile follows it too).
  const VIEW_LABELS = { home: 'Accueil', cases: 'Dossiers', documents: 'Pièces et sources', clients: 'Clients', integrations: 'Intégrations', settings: 'Réglages', search: 'Recherche', messages: 'Échanges', communications: 'Rendez-vous', usage: 'Usages', time: 'Suivi du temps' };
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
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    third: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M14 4v16"/>',
    corner: '<rect x="3" y="4" width="18" height="16" rx="2"/><rect x="12" y="12" width="6" height="5" rx="1"/>',
    pen: '<path d="m4 20 4-1L19 8l-3-3L5 16z"/><path d="m14 7 3 3"/>',
    highlighter: '<path d="m9 14-4 5h6l2-2"/><path d="m8 12 8-8 4 4-8 8z"/>',
    eraser: '<path d="M9 20h11"/><path d="m5 15 9-9 5 5-8 8H9z"/>',
    line: '<path d="M5 19 19 5"/>',
    arrowTool: '<path d="M5 19 19 5M10 5h9v9"/>',
    rect: '<rect x="4" y="6" width="16" height="12" rx="1"/>',
    text: '<path d="M5 7V5h14v2M12 5v14M9 19h6"/>',
    marker: '<rect x="5" y="3" width="14" height="13" rx="2"/><path d="M12 16v5M11 7h1v5"/>',
    mask: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16"/>',
    crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14"/>',
    rotate: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m21 16-5-5-9 9"/><path d="M8.5 9.5h.01"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 20h7"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    record: '<rect x="7" y="7" width="10" height="10" rx="5"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
    play: '<path d="M8 5v14l11-7z"/>',
    slides: '<rect x="3" y="4" width="18" height="12" rx="1"/><path d="M12 16v4M8 20h8"/>',
    listBullet: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    listNumber: '<path d="M10 6h10M10 12h10M10 18h10M4 5h1v4M4 15h2l-2 3h2"/>',
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M10 20v-5h4v5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    inbox: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    team: '<circle cx="7" cy="9" r="2.5"/><circle cx="17" cy="9" r="2.5"/><circle cx="12" cy="7" r="3"/><path d="M2.5 19a4.5 4.5 0 0 1 7-3.7M21.5 19a4.5 4.5 0 0 0-7-3.7M7 20a5 5 0 0 1 10 0"/>',
    academy: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  };
  const state = {
    demo: new URLSearchParams(window.location.search).get('demo') === '1',
    mode: 'loading', view: 'home', cases: [], selectedId: null, detail: null,
    capabilities: null, health: null, user: null, integrations: null, cockpitQuery: '', cockpitPanel: null,
    loginStep: 'email', loginEmail: '', loginNotice: '',
    documentCategory: '', onlyUnresolved: false, pageRequest: 0, searchResults: null, searchQuery: '', requestVersion: 0, sessionVersion: 0, caseLoading: false, busy: false,
    searchScope: 'all', searchMode: 'terms', searchMeta: null, searchRequest: 0, searchPending: false,
    dictationLanguage: 'fr-CA', dictationAutoSearch: true, dictationStatus: 'idle', dictationMessage: '',
    docLayout: 'grid', uploads: [],
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
    state.uploads = [];
    if (dialog.open) dialog.close();
    window.BAWorkspace?.reset();
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
      const authAttempt = path.startsWith('/api/auth/');
      if (!authAttempt) { clearSession(); render(); }
      const error = new Error(path === '/api/auth/email/verify' ? 'Code non valide ou expiré. Vérifiez le code reçu pour ce portail.' : authAttempt ? 'Connexion non valide. Vérifiez vos accès TAKATAK.' : 'La session a expiré. Reconnectez-vous avec TAKATAK.');
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
    if (!response.ok) {
      const error = new Error(payload.error?.message || `La demande n’a pas abouti (${response.status}).`);
      error.status = response.status;
      throw error;
    }
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
    const role = state.demo ? 'Lecture seule · données fictives' : state.mode === 'authenticated' ? (currentCase() ? `${roleLabel(currentCase().role)} · dossier sélectionné` : 'Droits par dossier') : 'Non connecté';
    document.getElementById('user-chip-name').textContent = state.demo ? 'Compte de démonstration' : state.mode === 'authenticated' ? 'Session TAKATAK' : 'Espace personnel';
    document.getElementById('user-chip-role').textContent = role;
    document.getElementById('status-lights').innerHTML = statusLights().map(light => `<span class="light" data-tone="${esc(light.tone)}" title="${esc(`${light.label} : ${light.state}`)}"><i aria-hidden="true"></i><span class="light-label">${esc(light.label)}</span><span class="light-state">${esc(light.state)}</span></span>`).join('');
    paintHelpDock();
    const search = document.getElementById('cockpit-search');
    if (search) search.disabled = !['demo', 'authenticated'].includes(state.mode);
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
    const emailCode = login && state.health?.emailCodeConfigured === true;
    const unavailable = state.health === null;
    const disabled = state.busy ? ' disabled' : '';
    const emailField = `<label for="login-email">Adresse courriel de votre compte TAKATAK</label><input id="login-email" name="email" type="email" autocomplete="username" maxlength="320" value="${esc(state.loginEmail)}" required${disabled}>`;
    const notice = state.loginNotice ? `<p class="auth-notice" role="status">${esc(state.loginNotice)}</p>` : '';
    const switchButton = (mode, label) => `<button class="button subtle" type="button" data-action="login-mode" data-mode="${mode}"${disabled}>${label}</button>`;
    let loginForm;
    if (emailCode && state.loginStep === 'code') {
      loginForm = `${notice}<p>Adresse utilisée : <strong>${esc(state.loginEmail)}</strong></p><form id="email-code-verify-form" class="auth-form"><label for="login-code">Code reçu par courriel pour ce portail</label><input id="login-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" minlength="6" maxlength="10" aria-describedby="login-code-help" required${disabled}><small id="login-code-help">Saisissez les 6 à 10 chiffres, y compris les zéros au début. Utilisez le code demandé sur cette page.</small><button class="button" type="submit"${disabled}>${state.busy ? 'Vérification en cours…' : 'Vérifier le code'} ${icon('arrow')}</button></form>${switchButton('email', 'Modifier l’adresse ou demander un autre code')}`;
    } else if (!emailCode || state.loginStep === 'password') {
      loginForm = `${notice}<form id="login-form" class="auth-form">${emailField}<label for="login-password">Mot de passe existant, si vous en avez un</label><input id="login-password" name="password" type="password" autocomplete="current-password" maxlength="2048" required${disabled}><button class="button" type="submit"${disabled}>${state.busy ? 'Connexion en cours…' : 'Se connecter avec le mot de passe'} ${icon('arrow')}</button></form>${emailCode ? switchButton('email', 'Recevoir plutôt un code par courriel') : '<p>La connexion par code courriel est en préparation.</p>'}`;
    } else {
      loginForm = `${notice}<form id="email-code-request-form" class="auth-form">${emailField}<button class="button" type="submit"${disabled}>${state.busy ? 'Demande en cours…' : 'Envoyer un code par courriel'} ${icon('arrow')}</button></form>${switchButton('password', 'Utiliser un mot de passe existant')}`;
    }
    return `${intro('VOTRE ESPACE, EN CLAIR', 'Chaque dossier mérite de la clarté.', 'Rassemblez vos pièces. Préparez vos échanges. Gardez le fil.')}<div class="signedout-layout"><section class="welcome-card"><span class="eyebrow">DU PREMIER DOCUMENT AU SUIVI</span><h2>Tout retrouver.<br>Mieux se préparer.</h2><p>Les documents, leur provenance et les échanges réunis dans un espace de travail commun à la personne cliente et à son avocat.</p><div class="welcome-rule"></div><a class="button light" href="?demo=1">Découvrir l’aperçu ${icon('arrow')}</a><small>Données entièrement fictives · lecture seule</small></section><section class="panel login-card"><span class="login-symbol">${icon('lock')}</span><span class="badge neutral">${login ? 'Connexion disponible' : 'Connexion non activée'}</span><h2>Votre accès<br>à l’espace de travail.</h2><p>${unavailable ? 'Le service du portail n’est pas joignable depuis cette page. Vous pouvez explorer l’aperçu sans transmettre de document.' : login ? 'Utilisez votre compte TAKATAK existant. L’accès nécessite aussi une habilitation BesoinAvocat.' : 'L’accès aux dossiers utilisera votre identité TAKATAK et les autorisations propres à chaque dossier.'}</p>${login ? loginForm : `<button class="button" type="button" disabled>Connexion TAKATAK à configurer ${icon('lock')}</button>`}<small>${login ? 'Ce parcours utilise votre compte existant et ne crée aucune inscription. L’accès aux dossiers reste soumis à vos autorisations.' : 'Aucun mot de passe à transmettre tant que la connexion n’est pas activée.'} Aucun dossier réel n’est accessible dans l’aperçu.</small><div class="login-foot"><p>BesoinAvocat est un outil de préparation. Les analyses et les décisions juridiques restent à valider avec votre avocat.</p></div></section></div><div class="feature-grid"><div class="feature">${icon('folder')}<div><h3>Un dossier bien organisé</h3><p>Des pièces classées, des versions identifiées et un accès par dossier.</p></div></div><div class="feature">${icon('search')}<div><h3>Une recherche qui cite</h3><p>Retrouver un passage et revenir à sa source pour le contrôler.</p></div></div><div class="feature">${icon('clock')}<div><h3>Un suivi compréhensible</h3><p>Des échanges conservés et du temps soumis à validation, sans débit automatique.</p></div></div></div>`;
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
    return `${intro('L’ESSENTIEL, AU MÊME ENDROIT', 'Vos dossiers, en ordre.', 'Un point de départ clair pour préparer la prochaine étape.', `<button class="button" data-action="new-case"${canMutate() ? '' : ' disabled'}>${icon('plus')}Nouveau dossier</button>`)}<div class="metrics">${metric('Dossiers accessibles', state.cases.length, state.demo ? 'Exemples fictifs' : 'Selon vos habilitations', 'folder')}${metric('Pièces du dossier sélectionné', docs.length, `${docs.filter((doc) => doc.reviewStatus !== 'controle_visuel').length} à vérifier`, 'document')}${metric('Temps soumis du dossier', duration(pending), 'Aucune facturation automatique', 'clock')}</div>${state.detail ? workbar() : ''}${quickSearch()}<div class="layout-two"><section class="panel"><div class="panel-heading"><div><h2>Votre bibliothèque de dossiers</h2><p>Ouvrez un dossier pour retrouver ses pièces et son suivi.</p></div><span class="badge outline">${state.cases.length} dossier${state.cases.length > 1 ? 's' : ''}</span></div><div class="panel-body"><label class="searchbox" for="case-filter">${icon('search')}<input id="case-filter" type="search" placeholder="Rechercher un titre ou une référence…" autocomplete="off" aria-label="Rechercher un dossier"></label><div class="case-list">${cards || '<div class="empty-state"><h2>Votre premier dossier commence ici.</h2><p>Créez un dossier pour y classer les pièces et leurs sources.</p></div>'}</div><p id="case-filter-empty" class="table-empty" hidden>Aucun dossier ne correspond à cette recherche.</p>${readOnlyNote()}</div></section><aside class="section-stack" aria-label="Repères de travail">${contactCard()}${principles()}${connections()}</aside></div>`;
  }
  // Workspace (D-029): files as tiles or a list, quick upload, the call card and video messages.
  const DOC_KINDS = { 'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image', 'application/pdf': 'pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx' };
  function docKind(doc) {
    const type = doc?.mimeType || '';
    return DOC_KINDS[type] || (type.startsWith('video/') ? 'video' : type.startsWith('audio/') ? 'audio' : ['text/plain', 'text/csv', 'application/json', 'message/rfc822'].includes(type) ? 'text' : 'other');
  }
  const KIND_ICONS = { image: 'image', video: 'video', audio: 'mic', pdf: 'document', docx: 'edit', pptx: 'slides', text: 'document', other: 'document' };
  function extension(doc) { return (/\.([a-z0-9]{1,5})$/iu.exec(doc.name || '')?.[1] || docKind(doc)).toUpperCase(); }
  function workspaceReady() { return Boolean(window.BAWorkspace) && Boolean(state.detail); }
  function workbar() {
    const tools = workspaceReady() ? '' : ' disabled';
    const upload = canMutate() && state.selectedId ? '' : ' disabled';
    const item = (action, glyph, title, text, disabled) => `<button type="button" class="workbar-action" data-action="${action}"${disabled}><span class="workbar-icon">${icon(glyph)}</span><span><strong>${esc(title)}</strong><small>${esc(text)}</small></span></button>`;
    return `<div class="workbar" role="group" aria-label="Créer ou ajouter une pièce">${item('pick-files', 'upload', 'Téléverser', 'PDF, photos, vidéos, Word', upload)}${item('new-doc', 'edit', 'Document vierge', 'Rédiger, enregistrer en .docx', tools)}${item('new-drawing', 'pen', 'Tableau à dessin', 'Dessiner un plan, situer un lieu', tools)}${item('record-video', 'video', 'Message vidéo', '5 minutes au plus', tools)}</div>`;
  }
  function nextMeeting() {
    const now = Date.now();
    return communicationSessions().filter(item => item.status !== 'cancelled' && new Date(item.scheduledAt).getTime() > now - 2 * 3600 * 1000)
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))[0] || null;
  }
  function joinUrlFor(item) { return item?.kind === 'video' ? safeZoomUrl(item.joinUrl) || safeZoomUrl(meetingLink(item)?.url) : null; }
  function isClientSide() { return !['owner', 'lawyer'].includes(currentCase()?.role); }
  function contactCard() {
    if (!state.detail) return '';
    const client = isClientSide(), next = nextMeeting(), join = !state.demo && joinUrlFor(next);
    const media = (state.detail.documents || []).filter(doc => ['video', 'audio'].includes(docKind(doc))).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 6);
    const callable = state.demo || canMutate() ? '' : ' disabled';
    const record = workspaceReady() ? '' : ' disabled';
    const list = media.length ? `<div class="media-list">${media.map(doc => `<button type="button" class="media-item" data-action="open-file" data-id="${esc(doc.id)}">${icon(docKind(doc) === 'audio' ? 'mic' : 'play')}<span>${esc(doc.name)}</span><small>${esc(date(doc.createdAt))}</small></button>`).join('')}</div>` : '<p class="media-empty">Aucun message vidéo dans ce dossier pour l’instant.</p>';
    return `<section class="contact-card" aria-labelledby="contact-title"><h3 id="contact-title">${client ? 'Votre avocat' : 'La personne cliente'}</h3><p>${next ? `Prochain rendez-vous : ${esc(date(next.scheduledAt, true))}` : 'Aucun rendez-vous planifié dans ce dossier.'}</p><div class="contact-call"><span><strong>${client ? 'Appeler mon avocat' : 'Joindre la personne cliente'}</strong><small>${join ? 'Rejoindre la réunion Zoom prévue' : 'Demande de rappel déposée au dossier'}</small></span><button type="button" class="button call" data-action="call-lawyer"${callable}>${icon('phone')}Appeler</button></div><div class="contact-row"><span><strong>Messages vidéo</strong><small>Expliquez en images, 5 minutes au plus.</small></span><button type="button" class="button secondary small" data-action="record-video"${record}>${icon('video')}Enregistrer</button></div>${list}</section>`;
  }
  function uploadsHtml() {
    const label = { queued: 'En attente', sending: 'Envoi…', done: 'Ajoutée', failed: 'Échec' };
    return state.uploads.map(item => `<div class="upload-item ${item.status}"><span>${esc(item.name)}</span><small>${esc(item.status === 'failed' && item.message ? item.message : label[item.status])}</small><span class="bar"><i></i></span></div>`).join('');
  }
  function fileTile(doc) {
    const kind = docKind(doc), id = esc(doc.id), name = esc(doc.name);
    const actions = [`<button type="button" class="icon-button" data-action="preview" data-id="${id}" title="Provenance" aria-label="${esc(`Provenance de ${doc.name}`)}">${icon('info')}</button>`];
    if (kind === 'image') actions.push(`<button type="button" class="icon-button" data-action="annotate" data-id="${id}" title="Annoter" aria-label="${esc(`Annoter ${doc.name}`)}"${workspaceReady() ? '' : ' disabled'}>${icon('pen')}</button>`);
    if (kind === 'docx' || kind === 'text') actions.push(`<button type="button" class="icon-button" data-action="edit-doc" data-id="${id}" title="Modifier" aria-label="${esc(`Modifier ${doc.name}`)}"${workspaceReady() ? '' : ' disabled'}>${icon('edit')}</button>`);
    actions.push(`<button type="button" class="icon-button" data-action="download" data-id="${id}" title="Télécharger" aria-label="${esc(`Télécharger ${doc.name}`)}"${canMutate() ? '' : ' disabled'}>${icon('download')}</button>`);
    return `<article class="file-tile"><button type="button" class="file-open" data-action="open-file" data-id="${id}"><span class="file-thumb" data-thumb="${id}">${icon(KIND_ICONS[kind])}<span class="file-type">${esc(extension(doc))}</span></span><span class="file-meta"><strong>${name}</strong><small>Version ${esc(doc.versionNumber || 1)} · ${state.demo ? 'Document fictif' : esc(bytes(doc.bytes))} · ${esc(date(doc.createdAt))}</small><span class="file-badges">${sourceBadge(doc.sourceType)}${reviewBadge(doc.reviewStatus)}</span></span></button><div class="file-actions">${actions.join('')}</div></article>`;
  }
  function documentsView() {
    const allDocuments = state.detail.documents || [];
    const categories = [...new Set(allDocuments.map(doc => doc.category).filter(Boolean))].sort((a,b) => a.localeCompare(b,'fr'));
    const documents = allDocuments.filter(doc => (!state.documentCategory || doc.category === state.documentCategory) && (!state.onlyUnresolved || (doc.missingTextPages?.length || doc.ocrPagesToVerify?.length || doc.lowTextPagesToVerify?.length)));
    const filters = `<div class="document-filters"><label for="document-category">Catégorie du registre<select id="document-category"><option value="">Toutes les catégories (${allDocuments.length})</option>${categories.map(category => `<option value="${esc(category)}"${category === state.documentCategory ? ' selected' : ''}>${esc(category)}</option>`).join('')}</select></label><label class="checkbox-filter"><input id="document-unresolved" type="checkbox"${state.onlyUnresolved ? ' checked' : ''}> Registre : texte manquant ou extraction à contrôler</label></div>`;
    const grid = state.docLayout !== 'list';
    const rows = documents.map((doc) => `<tr><td><div class="document-name">${icon(KIND_ICONS[docKind(doc)])}<div><button data-action="open-file" data-id="${esc(doc.id)}">${esc(doc.name)}</button><small>Version ${esc(doc.versionNumber || 1)} · ${state.demo ? 'Document fictif' : esc(bytes(doc.bytes))}${doc.pageCount ? ` · ${doc.pageCount} pages/unités` : ''}</small>${doc.category ? `<small>${esc(doc.category)}</small>` : ''}</div></div></td><td>${sourceBadge(doc.sourceType)}${duplicateNote(doc)}<small class="table-subtext">${esc(date(doc.createdAt))}</small></td><td>${reviewBadge(doc.reviewStatus)}${(doc.missingTextPages?.length || doc.ocrPagesToVerify?.length) ? `<small class="table-subtext">${doc.missingTextPages?.length || 0} sans texte · ${doc.ocrPagesToVerify?.length || 0} OCR à contrôler</small>` : ""}</td><td><button class="icon-button" data-action="preview" data-id="${esc(doc.id)}" aria-label="${esc(`Voir la provenance de ${doc.name}`)}">${icon('eye')}</button></td></tr>`).join('');
    const toggle = `<div class="view-toggle" role="group" aria-label="Affichage des pièces"><button type="button" data-action="doc-layout" data-layout="grid" aria-pressed="${grid}">${icon('grid')}Tuiles</button><button type="button" data-action="doc-layout" data-layout="list" aria-pressed="${!grid}">${icon('list')}Liste</button></div>`;
    const accept = '.pdf,.jpg,.jpeg,.png,.webp,.tif,.tiff,.txt,.csv,.json,.eml,.doc,.docx,.xls,.xlsx,.pptx,.webm,.mp4,.m4a,.mp3';
    const dropzone = canMutate() ? `<div class="dropzone" id="dropzone">${icon('upload')}<span><strong>Déposez vos fichiers ici</strong> ou <button type="button" class="text-button" data-action="pick-files">choisissez-les</button> · ${esc(bytes(state.capabilities?.maxDocumentBytes || MAX_FILE_BYTES))} au plus par fichier, 20 à la fois</span><input id="drop-input" class="dropzone-input" type="file" multiple accept="${accept}" tabindex="-1" aria-hidden="true"></div>` : '';
    const images = allDocuments.some(doc => docKind(doc) === 'image');
    const body = documents.length ? grid ? `<div class="file-grid">${documents.map(fileTile).join('')}</div>` : `<div class="table-wrap"><table><caption class="sr-only">Documents du dossier et états de contrôle</caption><thead><tr><th scope="col">Document</th><th scope="col">Provenance</th><th scope="col">Contrôle</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="table-empty">Aucune pièce ne correspond à ces filtres.</p>';
    return `${intro('DOCUMENTS ET TRAÇABILITÉ', 'Les pièces, avec leurs sources.', 'Ouvrez, annotez et complétez vos pièces. Chacune garde sa provenance.', `<button class="button secondary" data-action="new-presentation"${workspaceReady() && images ? '' : ' disabled'}>${icon('slides')}Présentation</button><button class="button" data-action="upload"${canMutate() ? '' : ' disabled'}>${icon('upload')}Ajouter avec provenance</button>`)}${context()}${workbar()}<div class="layout-two"><div class="section-stack main-stack"><section class="panel workspace-files" data-dropzone aria-labelledby="files-title"><div class="panel-heading"><div><h2 id="files-title">Pièces du dossier</h2><p>${documents.length} pièce${documents.length > 1 ? 's' : ''}${state.demo ? ' fictive' + (documents.length > 1 ? 's' : '') : ''} · cliquez pour ouvrir.</p></div>${toggle}</div>${filters}${dropzone}<div class="upload-queue" id="upload-queue" aria-live="polite">${uploadsHtml()}</div>${body}</section>${quickSearch('case')}</div><aside class="section-stack" aria-label="Contact et repères">${contactCard()}${principles()}</aside></div>${readOnlyNote()}`;
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
  // ---------- Centre de commandement (cockpit, 30 octobre 2026) ----------
  // Every number comes from data already loaded by the portal; anything the server does not expose says « bientôt »
  // or « inconnu ». The cockpit never calls a new endpoint and never sends anything to an AI service.
  // TAKATAK Academy: no address is documented in this repository yet. Keep empty until the owner confirms it.
  const ACADEMY_URL = '';
  // Tutorial progress only (never client or dossier data). The portal keeps nothing in browser storage (D-029,
  // guarded by the auth-http test), so this memory lasts for the open page; see docs/COCKPIT-2026-10-30.md.
  const tutorialMemory = { status: 'unseen', step: 0 };
  const ROLE_LABELS = { owner: 'Responsable', lawyer: 'Avocat', client: 'Client' };
  function roleLabel(role) { return ROLE_LABELS[role] || 'Accès autorisé'; }
  const DAY = 86400000;
  // Same catalog as platform/lib/integrations.mjs, shown in the preview without any account or state.
  const DEMO_PROVIDERS = [
    ['zoom', 'Zoom', 'video', 'oauth', 'implemented'], ['microsoft365', 'Outlook · Microsoft 365', 'calendar', 'oauth', 'implemented'], ['google', 'Google Agenda', 'calendar', 'oauth', 'implemented'],
    ['docusign', 'DocuSign', 'signature', 'oauth', 'connect_only'], ['clio', 'Clio Manage (Canada)', 'practice', 'oauth', 'connect_only'], ['canlii', 'CanLII', 'research', 'platform', 'platform'],
    ['twilio', 'Twilio', 'telephony', 'platform', 'platform'], ['stripe', 'Stripe', 'payments', 'platform', 'platform'], ['notarius', 'Notarius · ConsignO Cloud', 'signature', 'partnership', 'planned'], ['quickbooks', 'QuickBooks Online', 'accounting', 'oauth', 'planned'],
  ].map(([id, label, category, connectionType, status]) => ({ id, label, category, connectionType, status, state: 'demo', routine: 'Aperçu : aucun compte réel n’est relié.' }));
  function cockpitProviders() { return state.demo ? DEMO_PROVIDERS : Array.isArray(state.integrations?.providers) ? state.integrations.providers : null; }

  // Status lights reflect only what the portal knows. Unknown is never shown as green.
  function statusLights() {
    const connection = state.demo ? { tone: 'unknown', state: 'aperçu hors ligne' }
      : state.mode === 'authenticated' ? { tone: 'ok', state: 'session vérifiée' }
      : state.mode === 'loading' ? { tone: 'unknown', state: 'inconnu' }
      : state.health === null ? { tone: 'bad', state: 'serveur injoignable' } : { tone: 'unknown', state: 'non connecté' };
    const email = state.health?.emailCodeConfigured === true ? { tone: 'warn', state: 'configuré · livraison non vérifiée' }
      : state.health?.emailCodeConfigured === false ? { tone: 'unknown', state: 'inactif' } : { tone: 'unknown', state: 'inconnu' };
    return [{ id: 'connexion', label: 'Connexion', ...connection }, { id: 'courriel', label: 'Courriel', ...email }, { id: 'sauvegarde', label: 'Sauvegarde', tone: 'unknown', state: 'inconnu' }];
  }
  function upcoming(days = 7) {
    const now = Date.now();
    return communicationSessions().filter(item => item.status !== 'cancelled' && new Date(item.scheduledAt).getTime() >= now && new Date(item.scheduledAt).getTime() <= now + days * DAY);
  }
  // ---------- Instruments: compact widget chips on a swipeable rail; each one opens its panel in the top drawer ----------
  function clockText(now = new Date()) {
    return { time: new Intl.DateTimeFormat('fr-CA', { hour: '2-digit', minute: '2-digit' }).format(now), day: new Intl.DateTimeFormat('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' }).format(now) };
  }
  function nextAppointment() {
    const now = Date.now();
    return communicationSessions().filter(item => item.status !== 'cancelled' && new Date(item.scheduledAt).getTime() >= now).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))[0] || null;
  }
  // Every value is computed from data already loaded; null means « bientôt » (not connected yet).
  function instruments() {
    const docs = state.detail?.documents || [];
    const lights = Object.fromEntries(statusLights().map(light => [light.id, light]));
    const submitted = (state.detail?.timeEntries || []).filter(entry => entry.status === 'submitted').reduce((sum, entry) => sum + entry.minutes, 0);
    const next = nextAppointment(), clock = clockText();
    return [
      { panel: 'rendezvous', glyph: 'clock', label: clock.day, value: clock.time, clock: true },
      { panel: 'dossiers', glyph: 'folder', label: 'Dossier', value: currentCase() ? (currentCase().reference || currentCase().title) : 'aucun' },
      { panel: 'dossiers', glyph: 'layers', label: 'Dossiers accessibles', value: String(state.cases.length) },
      { panel: 'pieces', glyph: 'document', label: 'Pièces à vérifier', value: state.detail ? String(docs.filter(doc => doc.reviewStatus !== 'controle_visuel').length) : '—' },
      { panel: 'temps', glyph: 'clock', label: 'Temps soumis', value: state.detail ? duration(submitted) : '—' },
      { panel: 'rendezvous', glyph: 'calendar', label: 'Prochain rendez-vous', value: !communicationReady() ? 'inconnu' : next ? date(next.scheduledAt, true) : 'aucun' },
      { panel: 'messages', glyph: 'message', label: 'Messages', value: state.detail ? String((state.detail.messages || []).length) : '—' },
      { panel: 'etat', tone: lights.connexion.tone, label: 'Connexion', value: lights.connexion.state },
      { panel: 'etat', tone: lights.courriel.tone, label: 'Courriel', value: lights.courriel.state },
      { panel: 'demandes', glyph: 'inbox', label: 'Nouvelles demandes', value: null },
      { panel: 'echeances', glyph: 'calendar', label: 'Échéances · 7 jours', value: null },
      { action: 'mimt-board', glyph: 'phone', label: 'Téléphonie MIMT', value: 'à venir' },
    ];
  }
  function chip(item) {
    const lead = item.tone ? `<i class="chip-dot" data-tone="${esc(item.tone)}" aria-hidden="true"></i>` : `<span class="chip-icon">${icon(item.glyph)}</span>`;
    const value = item.value === null ? '<span class="chip-soon">bientôt</span>' : `<span class="chip-value"${item.clock ? ' data-clock' : ''}>${esc(item.value)}</span>`;
    const control = item.action ? `data-action="${esc(item.action)}" aria-haspopup="dialog"` : `data-action="cockpit-drawer" data-panel="${esc(item.panel)}" aria-controls="cockpit-drawer" aria-expanded="${state.cockpitPanel === item.panel}"`;
    return `<button type="button" class="chip${item.value === null ? ' is-soon' : ''}${state.cockpitPanel && state.cockpitPanel === item.panel ? ' is-open' : ''}" ${control}>${lead}<span class="chip-label"${item.clock ? ' data-clock-day' : ''}>${esc(item.label)}</span>${value}</button>`;
  }
  const PANEL_TITLES = { dossiers: 'Dossiers accessibles', pieces: 'Pièces du dossier sélectionné', temps: 'Temps soumis au dossier', rendezvous: 'Rendez-vous du dossier', messages: 'Messages du dossier', etat: 'État des services', demandes: 'Nouvelles demandes', echeances: 'Échéances' };
  const PANEL_VIEWS = { dossiers: 'cases', pieces: 'documents', temps: 'time', rendezvous: 'communications', messages: 'messages' };
  function drawerRows(rows, empty) { return rows.length ? `<ul class="drawer-list">${rows.join('')}</ul>` : `<p class="drawer-empty">${esc(empty)}</p>`; }
  function drawerRow(glyph, title, sub, button = '') { return `<li><span class="queue-icon">${icon(glyph)}</span><span class="queue-text"><strong>${esc(title)}</strong><small>${esc(sub)}</small></span>${button}</li>`; }
  function drawerBody(panel) {
    const fictive = state.demo ? ' · fictif' : '';
    if (panel === 'dossiers') return drawerRows(state.cases.map(item => drawerRow('folder', item.title, `${item.reference || 'Référence à préciser'} · accès ${roleLabel(item.role).toLowerCase()}${fictive}`, item.id === state.selectedId ? '<span class="badge teal">Sélectionné</span>' : `<button type="button" class="button secondary small" data-action="cockpit-select-case" data-id="${esc(item.id)}">Choisir</button>`)), 'Aucun dossier accessible.');
    if (panel === 'pieces') return drawerRows((state.detail?.documents || []).map(doc => drawerRow(KIND_ICONS[docKind(doc)], doc.name, `${SOURCE_LABELS[doc.sourceType] || 'Type à préciser'} · ${doc.reviewStatus === 'controle_visuel' ? 'contrôle visuel déclaré' : 'à vérifier'} · ${date(doc.createdAt)}`, `<button type="button" class="button secondary small" data-action="preview" data-id="${esc(doc.id)}">Provenance</button>`)), state.detail ? 'Aucune pièce dans ce dossier.' : 'Aucun dossier sélectionné.');
    if (panel === 'temps') return drawerRows((state.detail?.timeEntries || []).map(entry => drawerRow('clock', entry.description, `${duration(entry.minutes)} · ${entry.status === 'approved' ? 'validé' : 'soumis'} · ${date(entry.createdAt)}`)), 'Aucune entrée de temps dans ce dossier.') + '<p class="drawer-note">Aucune facturation automatique.</p>';
    if (panel === 'rendezvous') return drawerRows([...communicationSessions()].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)).map(item => drawerRow(item.kind === 'video' ? 'video' : 'phone', item.title, `${date(item.scheduledAt, true)} · ${item.status === 'cancelled' ? 'annulé' : kindLabel(item.kind).toLowerCase()}`)), communicationReady() ? 'Aucun rendez-vous dans ce dossier.' : 'Liste des rendez-vous indisponible.');
    if (panel === 'messages') return drawerRows([...(state.detail?.messages || [])].slice(-5).reverse().map(message => drawerRow('message', String(message.body || '').slice(0, 140), `${message.authorSubject === state.user?.subject ? 'Vous' : message.authorSubject || 'Auteur non précisé'} · ${date(message.createdAt, true)}`)), 'Aucun message dans ce dossier.');
    if (panel === 'etat') return drawerRows(statusLights().map(light => `<li><i class="chip-dot" data-tone="${esc(light.tone)}" aria-hidden="true"></i><span class="queue-text"><strong>${esc(light.label)} : ${esc(light.state)}</strong><small>${esc({ connexion: 'Vert seulement quand le serveur a vérifié la session.', courriel: 'La configuration ne prouve pas la livraison des courriels.', sauvegarde: 'Le serveur n’expose aucun état de sauvegarde.' }[light.id])}</small></span></li>`), '');
    if (panel === 'demandes') return '<p class="drawer-empty"><span class="badge neutral">bientôt</span> Les demandes reçues par la page publique ne sont pas encore reliées au portail. Aucun chiffre n’est affiché tant qu’elles ne le sont pas.</p>';
    if (panel === 'echeances') return `<p class="drawer-empty"><span class="badge neutral">bientôt</span> Les échéances ne sont pas encore modélisées. Rendez-vous à 7 jours dans ce dossier : ${communicationReady() ? upcoming().length : 'inconnu'}.</p>`;
    return '';
  }
  function cockpitDrawer() {
    const panel = state.cockpitPanel;
    if (!panel || !PANEL_TITLES[panel]) return '<section class="cockpit-drawer" id="cockpit-drawer" aria-label="Panneau des instruments" hidden></section>';
    const view = PANEL_VIEWS[panel];
    return `<section class="cockpit-drawer is-open" id="cockpit-drawer" role="region" aria-labelledby="cockpit-drawer-title"><div class="drawer-head"><h2 id="cockpit-drawer-title">${esc(PANEL_TITLES[panel])}${state.demo ? ' · fictif' : ''}</h2>${view ? `<button type="button" class="button subtle small" data-view="${view}">Ouvrir la section ${icon('arrow')}</button>` : ''}<button type="button" class="icon-button" data-action="cockpit-drawer-close" aria-label="Fermer le panneau">${icon('close')}</button></div><div class="drawer-body">${drawerBody(panel)}</div></section>`;
  }
  function cockpitRail() {
    return `<div class="instrument-deck" id="instrument-deck"><div class="rail-wrap"><button type="button" class="rail-arrow" data-action="rail-prev" aria-label="Instruments précédents" aria-controls="cockpit-dials"><span class="rail-chevron" aria-hidden="true">‹</span></button><div class="widget-rail" id="cockpit-dials" role="group" aria-label="Instruments du tableau de bord : flèches gauche et droite pour passer de l’un à l’autre" data-no-swipe>${instruments().map(chip).join('')}</div><button type="button" class="rail-arrow" data-action="rail-next" aria-label="Instruments suivants" aria-controls="cockpit-dials"><span class="rail-chevron" aria-hidden="true">›</span></button></div>${cockpitDrawer()}</div>`;
  }
  function toggleDrawer(panel) {
    state.cockpitPanel = state.cockpitPanel === panel || !PANEL_TITLES[panel] ? null : panel;
    render();
    document.querySelector?.(`#cockpit-dials [data-panel="${panel}"]`)?.focus({ preventScroll: true });
  }
  function closeDrawer(returnFocus = true) {
    const panel = state.cockpitPanel;
    if (!panel) return;
    state.cockpitPanel = null; render();
    if (returnFocus) document.querySelector?.(`#cockpit-dials [data-panel="${panel}"]`)?.focus({ preventScroll: true });
  }
  function reducedMotion() { return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function scrollRail(direction) {
    const rail = document.getElementById('cockpit-dials');
    rail?.scrollBy?.({ left: direction * Math.max(160, (rail.clientWidth || 0) * 0.8), behavior: reducedMotion() ? 'auto' : 'smooth' });
  }
  // Arrow keys, Home and End move between chips; the rail follows the focus.
  function railKey(event) {
    const chips = [...(document.querySelectorAll('#cockpit-dials .chip') || [])];
    const at = chips.indexOf(event.target);
    if (at < 0 || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return false;
    event.preventDefault?.();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? chips.length - 1 : Math.max(0, Math.min(chips.length - 1, at + (event.key === 'ArrowRight' ? 1 : -1)));
    chips[next].focus?.();
    chips[next].scrollIntoView?.({ inline: 'nearest', block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
    return true;
  }
  // The clock instrument updates its own text only; nothing else re-renders.
  window.setInterval?.(() => { const now = clockText(); document.querySelectorAll('[data-clock]').forEach(node => { node.textContent = now.time; }); document.querySelectorAll('[data-clock-day]').forEach(node => { node.textContent = now.day; }); }, 20000);
  // One line per item needing attention, each with a direct action, built from the loaded dossier only.
  function workItems() {
    const items = [];
    const me = state.user?.subject;
    if (!state.cases.length) items.push({ glyph: 'folder', title: 'Créer votre premier dossier', sub: 'Aucun dossier accessible pour l’instant.', button: `<button type="button" class="button small" data-action="new-case"${canMutate() ? '' : ' disabled'}>Créer</button>` });
    for (const provider of cockpitProviders() || []) if (provider.state === 'reconnect_required') items.push({ glyph: 'link', title: `Reconnecter ${provider.label}`, sub: 'Le fournisseur a refusé le renouvellement de l’accès.', button: `<button type="button" class="button small" data-action="cockpit-integration" data-id="${esc(provider.id)}">Reconnecter</button>` });
    for (const item of communicationSessions().filter(session => session.ownTimer?.status === 'running')) items.push({ glyph: 'clock', title: `Chronomètre en cours : ${item.title}`, sub: 'Pensez à l’arrêter à la fin de l’échange.', button: '<button type="button" class="button secondary small" data-view="communications">Ouvrir</button>' });
    for (const item of upcoming().sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))) items.push({ glyph: item.kind === 'video' ? 'video' : 'phone', title: `Rendez-vous : ${item.title}`, sub: date(item.scheduledAt, true), button: '<button type="button" class="button secondary small" data-view="communications">Voir</button>' });
    if (canApprove()) {
      for (const entry of (state.detail?.timeEntries || []).filter(entry => entry.status === 'submitted' && entry.authorSubject !== me)) items.push({ glyph: 'check', title: `Temps à valider : ${entry.description}`, sub: duration(entry.minutes), button: '<button type="button" class="button secondary small" data-view="time">Valider</button>' });
      for (const entry of (state.detail?.usage?.entries || []).filter(entry => entry.status === 'submitted' && !entry.needsReview && entry.authorSubject !== me)) items.push({ glyph: 'check', title: 'Usage à valider en interne', sub: elapsed(entry.seconds), button: '<button type="button" class="button secondary small" data-view="usage">Valider</button>' });
    }
    for (const doc of (state.detail?.documents || []).filter(doc => doc.reviewStatus !== 'controle_visuel')) items.push({ glyph: KIND_ICONS[docKind(doc)], title: `Pièce à vérifier : ${doc.name}`, sub: SOURCE_LABELS[doc.sourceType] || 'Provenance à préciser', button: `<button type="button" class="button secondary small" data-action="preview" data-id="${esc(doc.id)}">Vérifier</button>` });
    return items;
  }
  function workQueue() {
    const items = workItems(), shown = items.slice(0, 8);
    const rows = shown.map(item => `<li class="queue-item"><span class="queue-icon">${icon(item.glyph)}</span><span class="queue-text"><strong>${esc(item.title)}</strong><small>${esc(item.sub)}</small></span>${item.button}</li>`).join('');
    const where = state.detail ? `Dossier sélectionné : ${currentCase()?.title || ''}${state.demo ? ' · fictif' : ''}` : 'Aucun dossier sélectionné';
    return `<section class="panel cockpit-panel" id="work-queue" aria-labelledby="work-queue-title"><div class="panel-heading"><div><h2 id="work-queue-title">File de travail</h2><p>${esc(where)}</p></div><span class="badge outline mono">${items.length}</span></div>${rows ? `<ol class="queue-list">${rows}</ol>` : '<p class="table-empty">Rien en attente dans ce dossier.</p>'}${items.length > shown.length ? `<p class="queue-more">${items.length - shown.length} autre${items.length - shown.length > 1 ? 's' : ''} élément${items.length - shown.length > 1 ? 's' : ''} : ouvrez le dossier pour tout voir.</p>` : ''}</section>`;
  }
  function activityEntries() {
    const entries = [];
    const add = (at, glyph, text, sub) => { if (at && !Number.isNaN(new Date(at).getTime())) entries.push({ at, glyph, text, sub }); };
    const who = subject => subject && subject === state.user?.subject ? 'vous' : subject || 'auteur non précisé';
    for (const doc of state.detail?.documents || []) add(doc.createdAt, 'document', `Pièce ajoutée : ${doc.name}`, `Version ${doc.versionNumber || 1}`);
    for (const message of state.detail?.messages || []) add(message.createdAt, 'message', 'Message au dossier', `Par ${who(message.authorSubject)}`);
    for (const entry of state.detail?.timeEntries || []) { add(entry.createdAt, 'clock', `Temps soumis : ${duration(entry.minutes)}`, `Par ${who(entry.authorSubject)}`); add(entry.approvedAt, 'check', `Temps validé : ${duration(entry.minutes)}`, 'Validation enregistrée'); }
    for (const entry of state.detail?.usage?.entries || []) add(entry.createdAt, 'clock', `Durée enregistrée : ${elapsed(entry.seconds)}`, 'Chronomètre manuel');
    for (const session of communicationSessions()) add(session.createdAt, 'calendar', `Rendez-vous planifié : ${session.title}`, `Prévu le ${date(session.scheduledAt, true)}`);
    if (!state.demo) for (const provider of cockpitProviders() || []) add(provider.connection?.connectedAt, 'link', `Compte relié : ${provider.label}`, 'Vos intégrations');
    return entries.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);
  }
  function activityFeed() {
    const entries = activityEntries();
    const body = entries.length ? `<ol class="activity-list">${entries.map(entry => `<li><span class="activity-dot">${icon(entry.glyph)}</span><span><strong>${esc(entry.text)}</strong><small><time datetime="${esc(entry.at)}">${esc(date(entry.at, true))}</time> · ${esc(entry.sub)}</small></span></li>`).join('')}</ol>` : '<p class="table-empty">Aucune activité enregistrée dans le dossier sélectionné.</p>';
    return `<section class="panel cockpit-panel" id="activity-feed" aria-labelledby="activity-title"><div class="panel-heading"><div><h2 id="activity-title">Activité récente</h2><p>${state.demo ? 'Événements fictifs de l’aperçu.' : 'Dossier sélectionné et vos intégrations.'}</p></div></div>${body}</section>`;
  }
  const PROVIDER_STATES = { ...Object.fromEntries(Object.entries(INTEGRATION_STATES).map(([key, [label, tone]]) => [key, { label, tone }])), demo: { label: 'Aperçu', tone: 'neutral' } };
  function providerState(provider) {
    if (provider.state === 'not_configured' && provider.status === 'planned') return { label: 'Bientôt', tone: 'neutral' };
    if (provider.state === 'planned') return { label: 'Bientôt', tone: 'neutral' };
    return PROVIDER_STATES[provider.state] || { label: 'À vérifier', tone: 'neutral' };
  }
  function cockpitIntegrations() {
    const providers = cockpitProviders();
    const cards = providers ? providers.map(provider => { const s = providerState(provider); return `<button type="button" class="integration-tile" data-action="cockpit-integration" data-id="${esc(provider.id)}" aria-haspopup="dialog"><span class="tile-icon">${icon(INTEGRATION_ICONS[provider.category] || 'layers')}</span><span class="tile-text"><strong>${esc(provider.label)}</strong><span class="badge ${esc(s.tone)}">${esc(s.label)}</span></span></button>`; }).join('') : '';
    const mimt = `<button type="button" class="integration-tile mimt-integration" data-action="mimt-board" aria-haspopup="dialog"><span class="tile-icon">${icon('phone')}</span><span class="tile-text"><strong>Téléphonie MIMT</strong><span class="badge neutral">À venir</span></span></button>`;
    return `<section class="panel cockpit-panel" id="cockpit-integrations" aria-labelledby="cockpit-integrations-title"><div class="panel-heading"><div><h2 id="cockpit-integrations-title">Intégrations</h2><p>Chaque connexion s’ouvre dans une fenêtre qui explique ce qui est partagé, puis demande votre confirmation.</p></div><button type="button" class="button secondary small" data-view="integrations">Tout voir</button></div>${providers ? `<div class="integration-tiles">${mimt}${cards}</div>` : `<div class="integration-tiles">${mimt}</div><p class="table-empty">Le serveur n’a pas renvoyé la liste des autres intégrations.</p>`}</section>`;
  }
  function soonTiles() {
    const call = state.detail && (state.demo || canMutate()) ? '<button type="button" class="button secondary small" data-action="call-lawyer">Demander un rappel dans le dossier</button>' : '';
    const academy = ACADEMY_URL ? `<a class="text-button" href="${esc(ACADEMY_URL)}" target="_blank" rel="noopener noreferrer">Formation TAKATAK Academy<span class="sr-only"> (nouvel onglet)</span> ${icon('arrow')}</a>` : '<span class="academy-pending">Formation TAKATAK Academy · lien à confirmer</span>';
    return `<div class="soon-tiles"><section class="soon-tile mimt-tile" aria-labelledby="tile-mimt"><span class="tile-icon">${icon('phone')}</span><div><h3 id="tile-mimt">Téléphonie MIMT <span class="badge neutral">à venir</span></h3><p>Le téléphone et la vidéo des avocats viendront uniquement de MIMT (mimt.ca), relié par identifiant. MIMT Connect n’est pas encore activé : le portail ne compose aucun numéro et n’affiche aucun appel simulé.</p><div class="tile-actions"><button type="button" class="button small" data-action="mimt-board" aria-haspopup="dialog">Voir l’intégration MIMT</button>${call}</div></div></section><section class="soon-tile" aria-labelledby="tile-team"><span class="tile-icon">${icon('team')}</span><div><h3 id="tile-team">Équipe · Appel de groupe <span class="badge neutral">bientôt</span></h3><p>Une demande de client fera sonner en même temps les avocats partenaires disponibles; le premier qui accepte la prend. Aucun avocat n’est encore relié : aucune liste, aucun profil.</p><button type="button" class="button secondary small" data-action="mimt-group" aria-haspopup="dialog">Comprendre le fonctionnement</button></div></section><section class="soon-tile academy-tile" aria-labelledby="tile-tour"><span class="tile-icon">${icon('academy')}</span><div><h3 id="tile-tour">Tutoriel d’intégration</h3><p>Une visite guidée, étape par étape, des zones du centre de commandement.</p><div class="tile-actions"><button type="button" class="button small" data-action="tutorial-start">${tutorialMemory.status === 'unseen' ? 'Commencer la visite' : 'Revoir la visite'}</button>${academy}</div></div></section></div>`;
  }
  // Desktop workspace (31 October 2026, Juriste): on wide screens the home becomes a three-pane work surface in the
  // spirit of Teams: dossiers on the left, the selected dossier on the stage, the guide and calls on the right.
  // The phone keeps the cockpit (the future mobile app is for capturing and uploading); real work happens here.
  // Every figure comes from loaded data; nothing is invented, and what is not connected says « bientôt » or « à venir ».
  function desktop() { return typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 1180px)').matches; }
  const wsMemory = { query: '' };
  function initials(text) {
    const skip = new Set(['dossier', 'fictif', 'fictive', 'le', 'la', 'les', 'de', 'des', 'du', 'd', 'l', 'un', 'une', 'et', 'en', 'au', 'aux', 'pour']);
    const all = String(text || '').replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/u).filter(Boolean);
    const kept = all.filter(word => !skip.has(fold(word)));
    const words = kept.length ? kept : all;
    return ((words[0]?.[0] || 'D') + (words[1]?.[0] || '')).toLocaleUpperCase('fr');
  }
  function wsCaseRows() {
    const q = fold(wsMemory.query).trim();
    const cases = state.cases.filter(item => !q || fold(`${item.title} ${item.reference}`).includes(q));
    if (!state.cases.length) return '<p class="ws-empty">Aucun dossier accessible pour l’instant.</p>';
    if (!cases.length) return '<p class="ws-empty">Aucun dossier ne correspond au filtre.</p>';
    return `<ul class="ws-cases">${cases.map((item, i) => {
      const on = item.id === state.selectedId;
      return `<li><button type="button" class="ws-case${on ? ' is-active' : ''}" data-action="ws-select" data-id="${esc(item.id)}"${on ? ' aria-current="true"' : ''} data-i="${i}"><span class="ws-case-mark" data-hue="${i % 5}" aria-hidden="true">${esc(initials(item.title))}</span><span class="ws-case-text"><strong>${esc(item.title)}</strong><small>${esc(item.reference || 'Référence à préciser')} · ${esc(roleLabel(item.role))}</small></span>${on ? '<span class="ws-live" aria-hidden="true"></span>' : ''}</button></li>`;
    }).join('')}</ul>`;
  }
  function wsList() {
    return `<section class="ws-pane ws-list" aria-labelledby="ws-list-title"><div class="ws-pane-head"><h2 id="ws-list-title">Dossiers <span class="ws-count mono">${state.cases.length}</span></h2><button type="button" class="icon-button" data-action="new-case" aria-label="Nouveau dossier" title="Nouveau dossier"${canMutate() ? '' : ' disabled'}>${icon('plus')}</button></div><div class="ws-filter"><label class="sr-only" for="ws-filter">Filtrer les dossiers</label>${icon('search')}<input id="ws-filter" type="search" maxlength="80" autocomplete="off" placeholder="Filtrer les dossiers" value="${esc(wsMemory.query)}"></div><div id="ws-case-rows">${wsCaseRows()}</div><p class="ws-list-foot">${state.demo ? 'Aperçu : dossiers fictifs.' : 'Selon vos habilitations, dossier par dossier.'}</p></section>`;
  }
  function wsProgress() {
    const docs = state.detail?.documents || [];
    const checked = docs.filter(doc => doc.reviewStatus === 'controle_visuel').length;
    const pct = docs.length ? Math.round(checked * 100 / docs.length) : 0;
    const todo = docs.length - checked;
    const next = !state.detail ? 'Choisissez un dossier dans la liste.' : !docs.length ? 'Ajoutez une première pièce au dossier.' : todo ? `Vérifier ${todo} pièce${todo > 1 ? 's' : ''} : provenance et lisibilité.` : 'Toutes les pièces ont un contrôle visuel. Préparez vos questions pour l’avocat.';
    const ring = `<div class="ws-ring" data-p="${pct}" role="img" aria-label="${docs.length ? `${checked} pièce${checked > 1 ? 's' : ''} contrôlée${checked > 1 ? 's' : ''} sur ${docs.length}` : 'Aucune pièce'}"><span class="mono">${docs.length ? `${pct}<small>%</small>` : '—'}</span></div>`;
    const stat = (label, value) => `<li><span>${esc(label)}</span><strong class="mono">${esc(value)}</strong></li>`;
    const minutes = (state.detail?.timeEntries || []).reduce((sum, entry) => sum + (Number(entry.minutes) || 0), 0);
    return `<section class="ws-hero ws-glow" aria-labelledby="ws-hero-title">${ring}<div class="ws-hero-text"><span class="eyebrow">PRÉPARATION DU DOSSIER</span><h2 id="ws-hero-title">${esc(next)}</h2><p>Pièces avec un contrôle visuel, sur l’ensemble des pièces du dossier. Ce n’est pas une évaluation juridique.</p><div class="tile-actions"><button type="button" class="button small" ${canMutate() && state.selectedId ? 'data-action="upload"' : 'data-view="documents"'}>${icon('upload')}Ajouter une pièce</button><button type="button" class="button secondary small" data-view="documents">${icon('document')}Ouvrir les pièces</button><button type="button" class="button subtle small" data-action="tutorial-start">${icon('compass')}Visite guidée</button></div></div><ul class="ws-stats">${stat('Pièces', docs.length)}${stat('À vérifier', todo)}${stat('Messages', (state.detail?.messages || []).length)}${stat('Temps soumis', state.detail ? duration(minutes) : '—')}</ul></section>`;
  }
  function wsStage() {
    const item = currentCase();
    const tabs = [['home', 'Aperçu'], ['documents', 'Pièces'], ['messages', 'Échanges'], ['communications', 'Rendez-vous'], ['time', 'Temps'], ['search', 'Recherche']];
    const tabbar = `<nav class="ws-tabs" aria-label="Sections du dossier">${tabs.map(([view, label]) => view === 'home' ? `<span class="ws-tab is-active" aria-current="page">${esc(label)}</span>` : `<button type="button" class="ws-tab" data-view="${view}">${esc(label)}</button>`).join('')}</nav>`;
    const head = item ? `<div class="ws-stage-head"><span class="ws-case-mark large" aria-hidden="true">${esc(initials(item.title))}</span><div class="ws-stage-title"><span class="eyebrow">${state.demo ? 'DOSSIER FICTIF' : 'DOSSIER'}</span><h1>${esc(item.title)}</h1><p><span class="mono">${esc(item.reference || 'Référence à préciser')}</span> · ${esc(roleLabel(item.role))}</p></div></div>` : `<div class="ws-stage-head"><div class="ws-stage-title"><span class="eyebrow">ESPACE DE TRAVAIL</span><h1>Bonjour.</h1><p>${state.cases.length ? 'Choisissez un dossier à gauche pour l’ouvrir ici.' : 'Créez votre premier dossier pour commencer.'}</p></div></div>`;
    const banner = tutorialMemory.status === 'unseen' ? `<div class="tour-banner" role="region" aria-label="Visite guidée"><span class="tile-icon">${icon('compass')}</span><p><strong>Nouveau : l’espace de travail</strong>Une visite de deux minutes présente chaque zone. Vous pouvez la passer.</p><div class="tile-actions"><button type="button" class="button small" data-action="tutorial-start">Commencer</button><button type="button" class="button subtle small" data-action="tutorial-dismiss">Plus tard</button></div></div>` : '';
    return `<section class="ws-pane ws-stage" aria-label="Dossier sélectionné">${head}${tabbar}${cockpitRail()}${banner}${wsProgress()}<div class="cockpit-grid">${workQueue()}${activityFeed()}</div>${cockpitIntegrations()}${readOnlyNote()}</section>`;
  }
  function wsContext() {
    const next = upcoming(30).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)).slice(0, 3);
    const meetings = next.length ? `<ul class="ws-meetings">${next.map(item => `<li><span class="ws-meeting-icon">${icon(item.kind === 'video' ? 'video' : 'phone')}</span><span><strong>${esc(item.title)}</strong><small><time datetime="${esc(item.scheduledAt)}">${esc(date(item.scheduledAt, true))}</time></small></span></li>`).join('')}</ul>` : '<p class="ws-empty">Aucun rendez-vous planifié dans les 30 prochains jours.</p>';
    return `<aside class="ws-pane ws-context" aria-label="Guide, appels et rendez-vous"><section class="ws-card ws-guide ws-glow" aria-labelledby="ws-guide-title"><div class="ws-guide-top">${guideRobot('small')}<div><span class="eyebrow">GUIDE</span><h2 id="ws-guide-title">Le guide BesoinAvocat</h2></div></div><p class="ws-guide-quote">${esc(GUIDE_TEXT)}</p><button type="button" class="ws-ask" data-action="guide-open">${icon('spark')}<span>Demander au guide</span><span class="badge neutral">IA bientôt</span></button><p class="ws-fine">${esc(GUIDE_DISCLAIMER)}</p></section><section class="ws-card" aria-labelledby="ws-call-title"><h2 id="ws-call-title" class="ws-card-title">Joindre un avocat</h2><button type="button" class="ws-call" data-action="mimt-board" aria-haspopup="dialog"><span class="ws-call-icon">${icon('phone')}</span><span><strong>Appeler · Téléphonie MIMT</strong><small>Appels et vidéo uniquement par MIMT</small></span><span class="badge neutral">à venir</span></button><button type="button" class="ws-call team" data-action="mimt-group" aria-haspopup="dialog"><span class="ws-call-icon">${icon('team')}</span><span><strong>Équipe · appel de groupe</strong><small>Le premier avocat qui accepte répond</small></span><span class="badge neutral">bientôt</span></button><p class="ws-fine">Aucun appel n’est lancé depuis le portail tant que MIMT Connect n’est pas activé.</p></section><section class="ws-card" aria-labelledby="ws-meet-title"><div class="ws-card-row"><h2 id="ws-meet-title" class="ws-card-title">À venir</h2><button type="button" class="text-button" data-view="communications">Tout voir ${icon('arrow')}</button></div>${meetings}</section></aside>`;
  }
  // The CSP forbids style attributes; custom properties are set through the CSSOM after rendering instead.
  function paintWorkspace(root) {
    root?.querySelectorAll?.('.ws-case[data-i]').forEach(node => node.style.setProperty('--i', node.dataset.i));
    root?.querySelectorAll?.('.ws-ring[data-p]').forEach(node => node.style.setProperty('--p', node.dataset.p));
  }
  function workspaceView() {
    return `<div class="ws" id="ws">${wsList()}${wsStage()}${wsContext()}</div>`;
  }
  function cockpitView() {
    const banner = tutorialMemory.status === 'unseen' ? `<div class="tour-banner" role="region" aria-label="Visite guidée"><span class="tile-icon">${icon('compass')}</span><p><strong>Nouveau : le centre de commandement</strong>Une visite de deux minutes présente chaque zone. Vous pouvez la passer.</p><div class="tile-actions"><button type="button" class="button small" data-action="tutorial-start">Commencer</button><button type="button" class="button subtle small" data-action="tutorial-dismiss">Plus tard</button></div></div>` : '';
    const greeting = state.demo ? 'Aperçu en lecture seule, avec des données fictives.' : 'Vos dossiers, vos pièces et ce qui demande votre attention.';
    return `<div class="cockpit">${cockpitRail()}<div class="intro cockpit-intro"><div><span class="eyebrow">CENTRE DE COMMANDEMENT</span><h1>Bonjour.</h1><p>${esc(greeting)}</p></div><div class="intro-actions"><button class="button secondary small" data-action="tutorial-start">${icon('compass')}Visite guidée</button><button class="button small" data-action="new-case"${canMutate() ? '' : ' disabled'}>${icon('plus')}Nouveau dossier</button></div></div>${banner}<div class="cockpit-grid">${workQueue()}${activityFeed()}</div>${cockpitIntegrations()}${soonTiles()}${quickSearch()}${readOnlyNote()}</div>`;
  }
  function clientsView() {
    const rows = state.cases.map(item => `<li class="queue-item"><span class="queue-icon">${icon('folder')}</span><span class="queue-text"><strong>${esc(item.title)}</strong><small>${esc(item.reference || 'Référence à préciser')} · votre accès : ${esc(roleLabel(item.role))}</small></span><button type="button" class="button secondary small" data-action="open-case" data-id="${esc(item.id)}">Ouvrir</button></li>`).join('');
    return `${intro('PERSONNES ET DOSSIERS', 'Clients', 'Les personnes sont rattachées à chaque dossier par leur identité TAKATAK et leurs habilitations.')}<section class="panel empty-state">${icon('users')}<h2>Annuaire des clients : bientôt</h2><p>Le pilote ne gère pas encore de fiches clients. Aucune fiche n’est inventée : retrouvez les personnes par leurs dossiers ci-dessous.</p></section><section class="panel cockpit-panel"><div class="panel-heading"><div><h2>Dossiers accessibles</h2><p>${state.demo ? 'Exemples fictifs.' : 'Selon vos habilitations.'}</p></div></div>${rows ? `<ul class="queue-list">${rows}</ul>` : '<p class="table-empty">Aucun dossier accessible.</p>'}</section>`;
  }
  function settingsView() {
    const tour = { unseen: 'pas encore vue', skipped: 'passée', done: 'terminée' }[tutorialMemory.status];
    return `${intro('VOTRE ESPACE', 'Réglages', 'Ce qui est réglable aujourd’hui, et ce qui ne l’est pas encore.')}<div class="settings-grid"><section class="panel cockpit-panel"><div class="panel-heading"><div><h2>Session</h2><p>${esc(state.demo ? 'Aperçu sans session.' : state.mode === 'authenticated' ? 'Session TAKATAK vérifiée par le serveur.' : 'Non connecté.')}</p></div></div><div class="panel-body"><p class="table-subtext">Les droits sont accordés dossier par dossier. Fermez la session avec le bouton de déconnexion du menu.</p></div></section><section class="panel cockpit-panel"><div class="panel-heading"><div><h2>Visite guidée</h2><p>État : ${esc(tour)}.</p></div><button type="button" class="button small" data-action="tutorial-start">Relancer</button></div><div class="panel-body"><p class="table-subtext">Seule la progression de la visite est mémorisée, et seulement tant que la page reste ouverte. Aucune donnée de client ou de dossier n’y est liée.</p></div></section><section class="panel cockpit-panel"><div class="panel-heading"><div><h2>Notifications, langue et thème</h2><p><span class="badge neutral">bientôt</span></p></div></div><div class="panel-body"><p class="table-subtext">Thème clair. Les animations sont réduites si votre appareil le demande.</p></div></section></div>`;
  }

  // Local search: only names already loaded in this page (dossiers, pièces of the selected dossier). No request.
  function localResults(query) {
    const q = fold(query).trim();
    if (!q) return null;
    const cases = state.cases.filter(item => fold(`${item.title} ${item.reference}`).includes(q)).slice(0, 6);
    const docs = (state.detail?.documents || []).filter(doc => fold(doc.name).includes(q)).slice(0, 6);
    return { cases, docs };
  }
  function paintLocalSearch() {
    const box = document.getElementById('cockpit-search-results'), input = document.getElementById('cockpit-search');
    if (!box) return;
    const found = localResults(state.cockpitQuery);
    if (!found) { box.hidden = true; box.innerHTML = ''; input?.setAttribute('aria-expanded', 'false'); return; }
    const row = (action, id, glyph, title, sub) => `<li><button type="button" class="search-hit" data-action="${action}" data-id="${esc(id)}">${icon(glyph)}<span><strong>${esc(title)}</strong><small>${esc(sub)}</small></span></button></li>`;
    const group = (title, rows, empty) => `<div class="search-group"><p class="search-group-title">${esc(title)}</p>${rows.length ? `<ul>${rows.join('')}</ul>` : `<p class="search-empty">${esc(empty)}</p>`}</div>`;
    const total = found.cases.length + found.docs.length;
    box.innerHTML = `<p class="sr-only" role="status">${total} résultat${total > 1 ? 's' : ''} local${total > 1 ? 'aux' : ''}</p>${group('Dossiers', found.cases.map(item => row('open-case', item.id, 'folder', item.title, item.reference || 'Dossier')), 'Aucun dossier correspondant.')}${group('Pièces · dossier sélectionné', found.docs.map(doc => row('preview', doc.id, KIND_ICONS[docKind(doc)], doc.name, SOURCE_LABELS[doc.sourceType] || 'Pièce')), state.detail ? 'Aucune pièce correspondante.' : 'Aucun dossier sélectionné.')}${group('Clients', [], 'Annuaire des clients : bientôt.')}<button type="button" class="search-fulltext" data-action="cockpit-fulltext">${icon('search')}Chercher « ${esc(state.cockpitQuery.trim())} » dans le texte des pièces</button><p class="search-note">Recherche locale dans les données déjà chargées. Aucune IA n’est utilisée.</p>`;
    box.hidden = false; input?.setAttribute('aria-expanded', 'true');
  }
  function closeLocalSearch(clear = false) {
    if (clear) { state.cockpitQuery = ''; const input = document.getElementById('cockpit-search'); if (input) input.value = ''; }
    const box = document.getElementById('cockpit-search-results');
    if (box) { box.hidden = true; box.innerHTML = ''; }
    document.getElementById('cockpit-search')?.setAttribute('aria-expanded', 'false');
  }

  // Integration pop-up: explains what is shared, then asks for confirmation before the existing OAuth flow.
  const cockpitModal = document.getElementById('cockpit-modal');
  let modalReturn = null;
  function sharingCopy(provider) {
    if (['zoom', 'microsoft365', 'google'].includes(provider.id)) return {
      shared: ['Le titre, la date et la durée du rendez-vous que vous choisissez (60 minutes par défaut).', ...(provider.id === 'zoom' ? ['Une réunion est créée avec salle d’attente, sans enregistrement par défaut.'] : ['Le lien Zoom du rendez-vous, s’il existe.'])],
      never: ['Aucun nom de client, aucune pièce et aucun message du dossier.', 'Votre mot de passe : vous consentez sur le site du fournisseur (OAuth 2.0).'],
    };
    if (provider.connectionType === 'oauth' && provider.status === 'connect_only') return { shared: ['Seulement l’identification de votre compte chez le fournisseur.'], never: ['Aucune donnée de dossier n’est transmise dans cette version.', 'Votre mot de passe : vous consentez sur le site du fournisseur (OAuth 2.0).'] };
    if (provider.connectionType === 'platform') return { shared: ['Service configuré par la plateforme, sans connexion personnelle.'], never: ['Rien n’est envoyé depuis cette fenêtre.'] };
    return { shared: ['Rien pour l’instant : cette intégration n’est pas encore réalisée.'], never: ['Aucune connexion ni envoi.'] };
  }
  function integrationModalHtml(provider) {
    const s = providerState(provider), copy = sharingCopy(provider), id = esc(provider.id);
    const connectable = provider.connectionType === 'oauth' && ['available', 'reconnect_required'].includes(provider.state);
    const ready = canMutate() && !state.busy;
    let actions = '<button type="button" class="button secondary" data-action="cockpit-modal-close">Fermer</button>';
    let note = '';
    if (connectable) {
      actions = `<button type="button" class="button secondary" data-action="cockpit-modal-close">Annuler</button><button type="button" class="button" id="cockpit-confirm" data-action="integration-connect" data-id="${id}" disabled>${icon('link')}Confirmer et continuer vers ${esc(provider.label)}</button>`;
      note = `<label class="checkbox-filter consent"><input type="checkbox" id="cockpit-consent"${ready ? '' : ' disabled'}> J’ai lu ce qui est partagé et je confirme la connexion.</label>`;
    } else if (provider.state === 'connected') {
      actions = `<button type="button" class="button secondary" data-action="cockpit-modal-close">Fermer</button><button type="button" class="button secondary" data-action="integration-disconnect" data-id="${id}"${ready ? '' : ' disabled'}>Déconnecter</button>`;
      note = provider.connection?.account ? `<p class="integration-account">${icon('check')}<span>Compte relié : ${esc(provider.connection.account)}</span></p>` : '';
    } else if (provider.state === 'demo') note = '<p class="callout">Aperçu : aucune connexion réelle n’est possible ici.</p>';
    else if (provider.state === 'not_configured') note = `<p class="callout">Bientôt : l’accès développeur de ce service n’est pas encore configuré sur le serveur.</p>`;
    else if (s.label === 'Bientôt') note = '<p class="callout">Bientôt : cette intégration n’est pas encore réalisée.</p>';
    return `<div class="dialog-header"><div class="modal-title"><span class="tile-icon">${icon(INTEGRATION_ICONS[provider.category] || 'layers')}</span><div><h2 id="cockpit-modal-title">${esc(provider.label)}</h2><span class="badge ${esc(s.tone)}">${esc(s.label)}</span></div></div><button class="icon-button" type="button" data-action="cockpit-modal-close" aria-label="Fermer la fenêtre">${icon('close')}</button></div><div class="dialog-body"><p id="cockpit-modal-desc">${esc(provider.routine || '')}</p><div class="share-grid"><section><h3>Ce qui est partagé</h3><ul>${copy.shared.map(line => `<li>${esc(line)}</li>`).join('')}</ul></section><section><h3>Ce qui ne l’est jamais</h3><ul>${copy.never.map(line => `<li>${esc(line)}</li>`).join('')}</ul></section></div><p class="table-subtext">Les jetons d’accès restent chiffrés sur le serveur et ne sont jamais affichés. Vous pouvez déconnecter le service à tout moment.</p>${note}<div class="form-actions">${actions}</div></div>`;
  }
  function openIntegrationModal(id, trigger = null) {
    const provider = (cockpitProviders() || []).find(item => item.id === id);
    if (!provider || !cockpitModal) return;
    modalReturn = trigger;
    document.getElementById('cockpit-modal-content').innerHTML = integrationModalHtml(provider);
    if (!cockpitModal.open) cockpitModal.showModal();
    (document.getElementById('cockpit-consent') || cockpitModal.querySelector('[data-action="cockpit-modal-close"]'))?.focus();
  }
  function closeCockpitModal() { if (cockpitModal?.open) cockpitModal.close(); }
  cockpitModal?.addEventListener('close', () => { const back = modalReturn; modalReturn = null; if (back?.isConnected) back.focus(); });

  // ---------- Téléphonie MIMT (direction du propriétaire, 30 octobre 2026) ----------
  // Phone and video for lawyers come only from MIMT. BesoinAvocat shows buttons and layout; MIMT Connect (partner API,
  // https://api.mimt.ca/v1/partner/…, off by default with PARTNERS=off) is not active yet, so no step calls anything.
  // Links are the public MIMT pages listed in the mimtcaapp sources (apps/web/lib/site.ts, apps/webphone routes).
  const MIMT_STATUS = 'À venir — MIMT Connect pas encore activé';
  const MIMT_STEPS = [
    { title: 'Créer ou ouvrir son compte MIMT', text: 'L’avocat ouvre son compte directement chez MIMT, avec un code texto envoyé à son cellulaire ou son compte TAKATAK. BesoinAvocat ne crée aucun compte à sa place.',
      links: [['Ouvrir MIMT (app.mimt.ca)', 'https://app.mimt.ca/connexion'], ['MIMT Affaires', 'https://mimt.ca/affaires/']], shared: ['Rien n’est transmis à BesoinAvocat à cette étape.'], api: 'Sur MIMT : connexion à l’app Web.' },
    { title: 'Choisir son numéro', text: 'Le numéro se choisit dans le sélecteur de MIMT (réservé quelques minutes pendant le paiement).',
      links: [['Choisir un numéro', 'https://app.mimt.ca/numero']], shared: ['Rien pour l’instant. Plus tard : le numéro choisi, seulement s’il est relié au profil BesoinAvocat.'], api: 'Sur MIMT : sélecteur de numéro. Aucune route MIMT Connect pour l’instant (écart signalé).' },
    { title: 'Choisir le forfait et payer sur MIMT', text: 'Le forfait et le paiement se font chez MIMT. BesoinAvocat ne voit jamais la carte de paiement.',
      links: [['Forfaits', 'https://mimt.ca/forfaits/'], ['MIMT Affaires', 'https://mimt.ca/affaires/']], shared: ['Plus tard : l’état de l’abonnement seulement (actif ou non), jamais les données de paiement.'], api: 'Sur MIMT : paiement Stripe de MIMT. Aucune route MIMT Connect d’état d’abonnement (écart signalé).' },
    { title: 'Transférer son numéro existant (portage)', text: 'Facultatif. La demande de transfert et la lettre d’autorisation se remplissent chez MIMT, selon la disponibilité du service de transfert de MIMT.',
      links: [['Demander un transfert', 'https://app.mimt.ca/services/transfert']], shared: ['Plus tard : l’état du transfert seulement (demandé, en cours, terminé).'], api: 'Sur MIMT : formulaire de transfert. Aucune route MIMT Connect d’état de transfert (écart signalé).' },
    { title: 'Relier le compte MIMT au profil BesoinAvocat', text: 'Le serveur de BesoinAvocat inscrit l’avocat chez MIMT sous son identifiant BesoinAvocat. L’avocat sonne sur son cellulaire ou dans ses apps MIMT (@nom).',
      links: [], shared: ['Identifiant d’avocat BesoinAvocat, nom, courriel, cellulaire ou @nom MIMT, langue.', 'Aucune pièce, aucun message et aucun nom de client.'], api: 'MIMT Connect : PUT /v1/partner/members/:externalId (création ou mise à jour), DELETE pour désactiver.' },
    { title: 'Appels et vidéo dans le portail', text: 'Les appels arriveront par le groupe « Trouver un avocat »; leurs métadonnées reviendront dans le portail par identifiant d’avocat. La vidéo viendra des Réunions MIMT.',
      links: [['App Web MIMT', 'https://mimt.ca/app-web/']], shared: ['Identifiants et métadonnées d’appel : numéros, heures, durée, crédits.', 'Jamais d’audio ni de transcription dans les webhooks. Un enregistrement, s’il est activé avec l’avis de consentement, ne s’écoute que par un lien signé de 15 minutes.'], api: 'MIMT Connect : webhooks call.ringing, call.answered, call.completed, recording.ready; GET /v1/partner/calls, GET /v1/partner/recordings/:id. Vidéo : Réunions MIMT, pas encore dans MIMT Connect.' },
  ];
  const mimtMemory = { step: 0 };
  function mimtLink([label, href]) { return `<a class="button secondary small" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}<span class="sr-only"> (mimt, nouvel onglet)</span> ${icon('arrow')}</a>`; }
  function mimtBoardHtml(index) {
    const step = MIMT_STEPS[index], last = index === MIMT_STEPS.length - 1;
    const rail = MIMT_STEPS.map((item, i) => `<li><button type="button" class="wizard-step${i === index ? ' is-current' : ''}" data-action="mimt-step" data-step="${i}"${i === index ? ' aria-current="step"' : ''}><span class="wizard-num mono">${i + 1}</span><span>${esc(item.title)}</span></button></li>`).join('');
    return `<div class="dialog-header"><div class="modal-title"><span class="tile-icon">${icon('phone')}</span><div><h2 id="cockpit-modal-title">Intégration MIMT</h2><span class="badge neutral">${esc(MIMT_STATUS)}</span></div></div><button class="icon-button" type="button" data-action="cockpit-modal-close" aria-label="Fermer la fenêtre">${icon('close')}</button></div><div class="dialog-body wizard"><p id="cockpit-modal-desc" class="sr-only">Étapes que l’avocat suivra pour relier sa téléphonie MIMT à BesoinAvocat.</p><ol class="wizard-rail" aria-label="Étapes">${rail}</ol><section class="wizard-panel" aria-live="polite"><p class="wizard-count mono">Étape ${index + 1} / ${MIMT_STEPS.length}</p><h3>${esc(step.title)}</h3><p>${esc(step.text)}</p>${step.links.length ? `<div class="tile-actions wizard-links">${step.links.map(mimtLink).join('')}</div>` : ''}<div class="share-grid single"><section><h3>Ce qui est partagé avec BesoinAvocat</h3><ul>${step.shared.map(line => `<li>${esc(line)}</li>`).join('')}</ul></section></div><p class="wizard-api"><span class="mono">${esc(step.api)}</span></p><p class="wizard-status"><span class="light" data-tone="unknown"><i aria-hidden="true"></i><span class="light-label">Statut</span><span class="light-state-inline">${esc(MIMT_STATUS)}</span></span></p></section><div class="form-actions wizard-actions"><button type="button" class="button secondary" data-action="cockpit-modal-close">Fermer</button>${index ? '<button type="button" class="button secondary" data-action="mimt-prev">Précédent</button>' : ''}${last ? '' : '<button type="button" class="button" data-action="mimt-next">Suivant</button>'}</div></div>`;
  }
  function openMimtBoard(index = mimtMemory.step, trigger = null) {
    if (!cockpitModal) return;
    mimtMemory.step = Math.max(0, Math.min(MIMT_STEPS.length - 1, Number(index) || 0));
    if (trigger) modalReturn = trigger;
    document.getElementById('cockpit-modal-content').innerHTML = mimtBoardHtml(mimtMemory.step);
    if (!cockpitModal.open) cockpitModal.showModal();
    (cockpitModal.querySelector('[data-action="mimt-next"]') || cockpitModal.querySelector('[aria-current="step"]'))?.focus();
  }
  const GROUP_FLOW = [
    ['Une demande arrive', 'Un client appelle le numéro public de BesoinAvocat ou dépose une demande.'],
    ['MIMT fait sonner le groupe', 'Tous les avocats partenaires disponibles sonnent en même temps (groupe de chasse MIMT, stratégie simultanée).'],
    ['Le premier qui accepte prend l’appel', 'L’avocat appuie sur 1 pour accepter; MIMT indique qui a répondu.'],
    ['Durée et suivi', 'La durée et les crédits de l’appel reviennent au dossier, par identifiant d’avocat.'],
    ['Paiements par Stripe', 'Le client paie par Stripe, l’avocat est payé, BesoinAvocat retient une commission; l’avocat paie son abonnement de membre. Montants et commission à définir.'],
  ];
  function mimtGroupHtml() {
    return `<div class="dialog-header"><div class="modal-title"><span class="tile-icon">${icon('team')}</span><div><h2 id="cockpit-modal-title">Équipe · Appel de groupe</h2><span class="badge neutral">bientôt</span></div></div><button class="icon-button" type="button" data-action="cockpit-modal-close" aria-label="Fermer la fenêtre">${icon('close')}</button></div><div class="dialog-body"><p id="cockpit-modal-desc">Le fonctionnement prévu, avec MIMT pour les appels et Stripe pour les paiements. Rien de ceci n’est actif.</p><ol class="group-flow">${GROUP_FLOW.map(([title, text], i) => `<li><span class="wizard-num mono">${i + 1}</span><span><strong>${esc(title)}</strong><small>${esc(text)}</small></span></li>`).join('')}</ol><p class="wizard-api"><span class="mono">MIMT Connect : PUT /v1/partner/hunt-groups/:key (strategy « simultaneous »), webhooks call.answered (member_external_id) et call.completed. Paiements : Stripe, côté BesoinAvocat, à concevoir.</span></p><div class="callout warning">${icon('info')}<p><strong>Avant toute mise en service</strong>Aucun avocat partenaire n’est relié et aucune disponibilité n’est déduite. La commission et le partage d’honoraires demandent une revue déontologique et juridique; une entente de traitement (Loi 25) avec MIMT est requise.</p></div><div class="form-actions"><button type="button" class="button secondary" data-action="cockpit-modal-close">Fermer</button><button type="button" class="button" data-action="mimt-board">Voir l’intégration MIMT</button></div></div>`;
  }
  function openMimtGroup(trigger = null) {
    if (!cockpitModal) return;
    if (trigger) modalReturn = trigger;
    document.getElementById('cockpit-modal-content').innerHTML = mimtGroupHtml();
    if (!cockpitModal.open) cockpitModal.showModal();
    cockpitModal.querySelector('[data-action="cockpit-modal-close"]')?.focus();
  }

  // ---------- « Besoin d'aide ? » button and the BesoinAvocat guide ----------
  // The guide only points to existing features. No AI service is called and nothing leaves the page.
  const GUIDE_TEXT = '« Je suis là pour vous aider et vous guider. Pas vous conseiller, mais bien vous guider à préparer votre dossier pour votre avocat. »';
  const GUIDE_DISCLAIMER = 'BesoinAvocat n’est pas un cabinet d’avocats et ne donne aucun conseil juridique. Les décisions se prennent avec votre avocat.';
  // Session memory only (no browser storage): the guide opens by itself once per page session.
  const guideMemory = { autoShown: false, open: false };
  const helpMemory = { used: false, menuOpen: false };
  // Original illustration: a friendly robot wearing a judge's robe and a white collar with bands.
  function guideRobot(size = 'large') {
    return `<svg class="guide-robot ${size}" viewBox="0 0 120 120" role="img" aria-label="Illustration : robot guide en toge"><title>Robot guide en toge</title>
<line x1="60" y1="8" x2="60" y2="18" stroke="#2459e0" stroke-width="3" stroke-linecap="round"/><circle cx="60" cy="7" r="4" fill="#5b8cff"/>
<rect x="34" y="18" width="52" height="40" rx="14" fill="#eef3ff" stroke="#2a4a8f" stroke-width="2.5"/>
<rect x="41" y="27" width="38" height="20" rx="9" fill="#0f1e3d"/><circle cx="52" cy="37" r="4" fill="#7fb0ff"/><circle cx="68" cy="37" r="4" fill="#7fb0ff"/>
<path d="M54 50 q6 4 12 0" fill="none" stroke="#2a4a8f" stroke-width="2.5" stroke-linecap="round"/>
<rect x="29" y="33" width="5" height="12" rx="2.5" fill="#2459e0"/><rect x="86" y="33" width="5" height="12" rx="2.5" fill="#2459e0"/>
<path d="M30 112 L38 66 Q60 58 82 66 L90 112 Z" fill="#1f2a44"/>
<path d="M44 64 Q60 76 76 64 L72 70 Q60 80 48 70 Z" fill="#ffffff" stroke="#cbd3e1" stroke-width="1"/>
<rect x="55.5" y="72" width="4" height="14" rx="1.5" fill="#ffffff" stroke="#cbd3e1" stroke-width="1"/><rect x="60.5" y="72" width="4" height="14" rx="1.5" fill="#ffffff" stroke="#cbd3e1" stroke-width="1"/>
<path d="M38 72 Q26 86 30 100" fill="none" stroke="#1f2a44" stroke-width="9" stroke-linecap="round"/><path d="M82 72 Q96 82 92 94" fill="none" stroke="#1f2a44" stroke-width="9" stroke-linecap="round"/>
<circle cx="31" cy="101" r="5" fill="#eef3ff" stroke="#2a4a8f" stroke-width="2"/><circle cx="92" cy="95" r="5" fill="#eef3ff" stroke="#2a4a8f" stroke-width="2"/>
<line x1="60" y1="88" x2="60" y2="110" stroke="#33415e" stroke-width="1.5"/></svg>`;
  }
  function guideHtml() {
    const upload = canMutate() && state.selectedId ? 'data-action="upload"' : 'data-view="documents"';
    const action = (attrs, glyph, label, sub) => `<li><button type="button" class="guide-action" ${attrs}><span class="queue-icon">${icon(glyph)}</span><span><strong>${esc(label)}</strong><small>${esc(sub)}</small></span></button></li>`;
    return `<div class="guide-head"><span class="eyebrow">GUIDE BESOINAVOCAT</span><button type="button" class="icon-button" data-action="guide-close" aria-label="Réduire le guide">${icon('close')}</button></div><div class="guide-hero">${guideRobot()}<div><h2 id="guide-title" class="sr-only">Guide BesoinAvocat</h2><p class="guide-quote">${esc(GUIDE_TEXT)}</p></div></div><p class="guide-badge"><span class="badge neutral">Assistant IA : réponses automatiques bientôt — aucun conseil juridique</span></p><ul class="guide-actions">${action('data-action="tutorial-start"', 'compass', 'Préparer mon dossier', 'Visite guidée, étape par étape')}${action(upload, 'upload', 'Ajouter une pièce', state.demo ? 'Aperçu : ajout désactivé' : 'Un document, une photo, avec sa provenance')}${action('data-view="messages"', 'message', 'Écrire mes questions pour l’avocat', 'Dans les échanges du dossier')}${action('data-view="communications"', 'calendar', 'Voir les rendez-vous', 'Du dossier sélectionné')}</ul><p class="guide-disclaimer">${icon('info')}<span>${esc(GUIDE_DISCLAIMER)}</span></p>`;
  }
  const guideNode = document.getElementById('cockpit-guide');
  function showGuide(focus = true) {
    if (!guideNode || !['demo', 'authenticated'].includes(state.mode)) return;
    closeHelpMenu(false);
    guideNode.innerHTML = guideHtml(); guideNode.hidden = false; guideMemory.open = true;
    const avatar = document.getElementById('guide-avatar'); if (avatar) { avatar.hidden = true; avatar.setAttribute('aria-expanded', 'true'); }
    if (focus) guideNode.querySelector?.('.guide-action')?.focus();
  }
  // Closing minimises the guide to its small robot button.
  function hideGuide(focusAvatar = true) {
    if (!guideNode || !guideMemory.open) return;
    guideNode.hidden = true; guideMemory.open = false;
    const avatar = document.getElementById('guide-avatar');
    if (avatar) { avatar.hidden = !['demo', 'authenticated'].includes(state.mode); avatar.setAttribute('aria-expanded', 'false'); if (focusAvatar) avatar.focus(); }
  }
  function helpMenuHtml() {
    const callback = state.detail && (state.demo || canMutate()) ? '' : ' disabled';
    const item = (attrs, glyph, label, badge = '') => `<button type="button" class="help-item" ${attrs}><span class="queue-icon">${icon(glyph)}</span><span>${esc(label)}</span>${badge ? `<span class="badge neutral">${esc(badge)}</span>` : ''}</button>`;
    return `<p class="help-title">Besoin d’aide ?</p>${item('data-action="mimt-board" aria-haspopup="dialog"', 'phone', 'Appeler · Téléphonie MIMT', 'à venir')}${item(`data-action="call-lawyer"${callback}`, 'message', 'Demander un rappel')}${item('data-action="mimt-group" aria-haspopup="dialog"', 'team', 'Équipe · appel de groupe', 'bientôt')}${item('data-action="tutorial-start"', 'compass', 'Visite guidée')}${item('data-action="guide-open"', 'spark', 'Guide BesoinAvocat')}<p class="help-note">Aucun appel n’est lancé depuis le portail.</p>`;
  }
  function openHelpMenu() {
    const menu = document.getElementById('help-menu'), fab = document.getElementById('help-fab');
    if (!menu) return;
    hideGuide(false);
    menu.innerHTML = helpMenuHtml(); menu.hidden = false; helpMemory.menuOpen = true;
    helpMemory.used = true; fab?.classList.add('is-quiet'); fab?.setAttribute('aria-expanded', 'true');
    menu.querySelector?.('.help-item:not([disabled])')?.focus();
  }
  function closeHelpMenu(focusFab = true) {
    const menu = document.getElementById('help-menu'), fab = document.getElementById('help-fab');
    if (!menu || !helpMemory.menuOpen) return;
    helpMemory.menuOpen = false; menu.hidden = true; fab?.setAttribute('aria-expanded', 'false');
    if (focusFab) fab?.focus();
  }
  function paintHelpDock() {
    const active = ['demo', 'authenticated'].includes(state.mode);
    const dock = document.getElementById('help-dock'); if (dock) dock.hidden = !active;
    const avatar = document.getElementById('guide-avatar');
    if (avatar && !avatar.dataset.ready) { avatar.innerHTML = guideRobot('small'); avatar.dataset.ready = '1'; }
    if (avatar) avatar.hidden = !active || guideMemory.open;
    if (!active) { hideGuide(false); closeHelpMenu(false); }
  }

  // Guided tour: pop-up steps over the cockpit zones; skippable with the button or Escape.
  const tourDialog = document.getElementById('cockpit-tour');
  const TOUR_STEPS = [
    { target: '#cockpit-search-form', title: 'Une seule recherche', text: 'Retrouvez un dossier ou une pièce déjà chargés, sans quitter la page. Pour chercher dans le texte des pièces, suivez le lien en bas des résultats.' },
    { target: '#status-lights', title: 'Les voyants d’état', text: 'Connexion, courriel et sauvegarde. Un voyant gris signifie « inconnu » : le portail n’affiche jamais un vert qu’il ne peut pas vérifier.' },
    { target: '#cockpit-dials', title: 'Les instruments', text: 'Heure, dossier, pièces, temps, rendez-vous et voyants. Chaque instrument ouvre son panneau sous la barre; glissez ou utilisez les flèches pour passer de l’un à l’autre. Ce qui n’est pas relié affiche « bientôt ».' },
    { target: '#work-queue', title: 'La file de travail', text: 'Ce qui demande votre attention dans le dossier sélectionné, une ligne par élément, avec l’action directe.' },
    { target: '#activity-feed', title: 'L’activité récente', text: 'Les pièces, messages, temps et rendez-vous les plus récents du dossier.' },
    { target: '#cockpit-integrations', title: 'Les intégrations', text: 'Téléphonie MIMT, Zoom, Outlook, Google Agenda et les autres services. Chaque connexion explique d’abord ce qui est partagé.' },
    { target: '#workspace-nav', mobileTarget: '.tabbar', title: 'La navigation', text: 'Accueil, Dossiers, Pièces, Clients, Intégrations et Réglages. Sur téléphone, la barre du bas.' },
  ];
  let tourTarget = null;
  function clearTourTarget() { tourTarget?.classList.remove('tour-target'); tourTarget = null; }
  function narrow() { return typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 860px)').matches; }
  function tourHtml(index) {
    const step = TOUR_STEPS[index], last = index === TOUR_STEPS.length - 1;
    const academy = ACADEMY_URL ? `<a class="text-button" href="${esc(ACADEMY_URL)}" target="_blank" rel="noopener noreferrer">Formation TAKATAK Academy<span class="sr-only"> (nouvel onglet)</span></a>` : '<span class="academy-pending">Formation TAKATAK Academy · lien à confirmer</span>';
    const dots = TOUR_STEPS.map((_, i) => `<i${i === index ? ' class="on"' : ''}></i>`).join('');
    return `<div class="tour-ring" aria-hidden="true"></div><div class="tour-card"><div class="tour-head"><span class="tour-count mono">${index + 1} / ${TOUR_STEPS.length}</span><span class="tour-dots" aria-hidden="true">${dots}</span><button type="button" class="icon-button" data-action="tour-skip" aria-label="Passer le tutoriel">${icon('close')}</button></div><h2 id="cockpit-tour-title">${esc(step.title)}</h2><p id="cockpit-tour-text">${esc(step.text)}</p><div class="tour-foot">${academy}<div class="tile-actions"><button type="button" class="button subtle small" data-action="tour-skip">Passer</button>${index ? '<button type="button" class="button secondary small" data-action="tour-prev">Précédent</button>' : ''}<button type="button" class="button small" data-action="tour-next">${last ? 'Terminer' : 'Suivant'}</button></div></div><p class="tour-privacy">Seule votre progression dans la visite est retenue, jamais une donnée de dossier.</p></div>`;
  }
  function showTourStep(index) {
    if (!tourDialog) return;
    const step = TOUR_STEPS[index];
    tutorialMemory.step = index;
    clearTourTarget();
    const target = document.querySelector?.(narrow() && step.mobileTarget ? step.mobileTarget : step.target);
    if (target && target.getClientRects?.().length) {
      tourTarget = target; target.classList.add('tour-target');
      target.scrollIntoView?.({ block: 'center', behavior: 'auto' });
    }
    document.getElementById('cockpit-tour-content').innerHTML = tourHtml(index);
    if (!tourDialog.open) tourDialog.showModal();
    placeTourRing();
    // The navigation rail widens when highlighted: place the ring again once it has opened.
    window.setTimeout(() => { if (tourDialog.open) placeTourRing(); }, 260);
    tourDialog.querySelector?.('[data-action="tour-next"]')?.focus();
  }
  // The ring sits in the dialog's top layer, over the highlighted zone; its wide shadow dims the rest of the page.
  function placeTourRing() {
    const ring = tourDialog?.querySelector?.('.tour-ring');
    const rect = tourTarget?.getBoundingClientRect?.();
    tourDialog?.classList.toggle('no-target', !rect);
    if (!ring) return;
    ring.hidden = !rect;
    if (!rect) return;
    const pad = 6, top = Math.max(4, rect.top - pad), left = Math.max(4, rect.left - pad);
    const width = Math.min(window.innerWidth - 4, rect.right + pad) - left, height = Math.min(window.innerHeight - 4, rect.bottom + pad) - top;
    Object.assign(ring.style, { top: `${top}px`, left: `${left}px`, width: `${Math.max(0, width)}px`, height: `${Math.max(0, height)}px` });
    tourDialog.classList.toggle('at-top', rect.top + rect.height / 2 > window.innerHeight / 2);
  }
  window.addEventListener?.('resize', () => { if (tourDialog?.open) placeTourRing(); });
  // Crossing the desktop breakpoint swaps the home between the workspace and the cockpit, without a reload.
  const wideQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 1180px)') : null;
  wideQuery?.addEventListener?.('change', () => { if (state.view === 'home') render(); });
  // A soft light follows the pointer on the workspace cards (pure decoration; skipped when motion is reduced).
  main.addEventListener?.('pointermove', (event) => {
    const card = event.target?.closest?.('.ws-glow, .ws-card, .ws-case');
    if (!card || reducedMotion()) return;
    const box = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${Math.round(event.clientX - box.left)}px`); card.style.setProperty('--my', `${Math.round(event.clientY - box.top)}px`);
  });
  function startTour() {
    if (!['demo', 'authenticated'].includes(state.mode)) return;
    closeCockpitModal(); closeLocalSearch();
    if (state.view !== 'home') navigate('home');
    document.body?.classList.remove('drawer-open');
    showTourStep(0);
  }
  function endTour(status) {
    tutorialMemory.status = status;
    clearTourTarget();
    if (tourDialog?.open) tourDialog.close();
    if (state.view === 'home' || state.view === 'settings') render();
  }
  // Focus stays inside an open cockpit dialog: Tab and Shift+Tab cycle between its controls.
  function trapFocus(node) {
    node?.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const items = [...node.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])')].filter(item => item.getClientRects().length);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !node.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !node.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    });
  }
  trapFocus(cockpitModal); trapFocus(tourDialog);
  // Escape closes the tour: remembered as skipped.
  tourDialog?.addEventListener('cancel', event => { event.preventDefault(); endTour('skipped'); });

  function render(focus = false) {
    header();
    const shell = document.body?.classList;
    if (typeof shell?.toggle === 'function') shell.toggle('ws-desktop', state.view === 'home' && ['demo', 'authenticated'].includes(state.mode) && desktop());
    if (state.mode === 'loading') return;
    const shown = `${state.mode}:${state.view}:${state.selectedId || ''}`;
    main.classList.toggle('enter', main.dataset.shown !== shown);
    main.dataset.shown = shown;
    if (state.mode === 'signedout') main.innerHTML = signedOut();
    else if (state.view === 'home' && desktop()) { const railScroll = document.getElementById('cockpit-dials')?.scrollLeft, listScroll = document.querySelector?.('.ws-list')?.scrollTop; main.innerHTML = workspaceView(); paintWorkspace(main); const rail = document.getElementById('cockpit-dials'); if (rail && Number.isFinite(railScroll)) rail.scrollLeft = railScroll; const list = document.querySelector?.('.ws-list'); if (list && Number.isFinite(listScroll)) list.scrollTop = listScroll; }
    else if (state.view === 'home') { const railScroll = document.getElementById('cockpit-dials')?.scrollLeft; main.innerHTML = cockpitView(); const rail = document.getElementById('cockpit-dials'); if (rail && Number.isFinite(railScroll)) rail.scrollLeft = railScroll; }
    else if (state.view === 'cases') main.innerHTML = casesView();
    else if (state.view === 'search') main.innerHTML = searchView();
    else if (state.view === 'integrations') main.innerHTML = integrationsView();
    else if (state.view === 'clients') main.innerHTML = clientsView();
    else if (state.view === 'settings') main.innerHTML = settingsView();
    else if (!state.detail) main.innerHTML = noCase();
    else main.innerHTML = ({ documents: documentsView, messages: messagesView, time: timeView, communications: communicationsView, usage: usageView })[state.view]();
    window.BAWorkspace?.afterRender(main);
    if (focus) main.focus({ preventScroll: true });
    // The guide opens by itself once per page session, on the cockpit, without taking the focus.
    if (state.view === 'home' && ['demo', 'authenticated'].includes(state.mode) && !guideMemory.autoShown && !desktop()) { guideMemory.autoShown = true; showGuide(false); }
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
    showDialog('Ajouter une pièce', 'Le fichier est conservé avec son empreinte et sa provenance.', `<form id="upload-form"><div class="field"><label for="document-file">Fichier original</label><input id="document-file" class="file-input" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.tif,.tiff,.txt,.csv,.json,.eml,.doc,.docx,.xls,.xlsx,.pptx,.webm,.mp4,.m4a,.mp3" required><small>Un fichier à la fois · ${esc(bytes(state.capabilities?.maxDocumentBytes || MAX_FILE_BYTES))} maximum. PDF, images, texte, courriel, documents bureautiques, vidéo et audio.</small></div><div class="form-grid"><div class="field"><label for="source-type">Nature de la source</label><select id="source-type" name="sourceType"><option value="original">Original</option><option value="declaration">Déclaration</option><option value="analyse">Analyse</option><option value="ocr">Extraction OCR</option></select></div><div class="field"><label for="version-of">Lien à une version antérieure</label><select id="version-of" name="versionOf"><option value="">Nouvelle pièce</option>${options}</select></div></div><div class="field"><label for="source-reference">Provenance et référence</label><textarea id="source-reference" name="sourceReference" rows="2" maxlength="2048" placeholder="Origine, auteur, date, référence du courriel ou de la pièce…"></textarea><small>Décrivez ce qui est connu ; signalez ce qui reste à établir.</small></div><div class="field"><label for="extracted-text">Texte saisi ou extrait — facultatif</label><textarea id="extracted-text" name="extractedText" maxlength="200000" placeholder="Texte de travail destiné à la recherche, à comparer au fichier original…"></textarea><small>Aucun OCR automatique n’est lancé. Ce texte reste marqué « À vérifier », même si vous l’avez relu.</small></div><div class="callout warning">${icon('info')}<p>Le serveur calcule l’empreinte du fichier. Une empreinte identique permet de repérer un doublon ; elle ne prouve ni l’authenticité du document ni la véracité de son contenu.</p></div>${formFooter('Ajouter au dossier')}</form>`);
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
    showDialog('Pièce et provenance', doc.name, `<dl class="metadata-grid"><div><dt>Nature</dt><dd>${sourceBadge(doc.sourceType)}</dd></div><div><dt>État</dt><dd>${reviewBadge(doc.reviewStatus)}</dd></div><div><dt>Ajoutée le</dt><dd>${esc(date(doc.createdAt))}</dd></div><div><dt>Version et taille</dt><dd>Version ${esc(doc.versionNumber || 1)} · ${state.demo ? 'Exemple fictif' : esc(bytes(doc.bytes))}</dd></div><div class="full-width"><dt>Provenance déclarée</dt><dd>${esc(doc.sourceReference || 'Non précisée dans les données disponibles.')}</dd></div><div class="full-width"><dt>Empreinte SHA-256</dt><dd class="hash-value">${esc(state.demo ? 'Aucune empreinte réelle — document fictif.' : doc.sha256 || 'Non fournie.')}</dd></div>${duplicateDetails(doc)}${doc.versionOf ? `<div class="full-width"><dt>Version précédente</dt><dd>${esc(doc.versionOf)}</dd></div>` : ''}</dl><div class="callout warning">${icon('info')}<p>La nature et le contrôle sont des informations déclarées. Une lecture visuelle ou un texte saisi ne constitue pas une authentification de la pièce.</p></div><h3 class="transcription-title">${doc.extractedText ? 'Texte saisi ou extrait — à contrôler' : text ? 'Extrait retrouvé par la recherche — à contrôler' : 'Texte de recherche'}</h3><div class="transcription">${esc(text || 'Aucun texte fourni dans cette vue. Recherchez un passage ou téléchargez le fichier versé pour le consulter.')}</div><div class="form-actions"><button class="button secondary" type="button" data-action="close-dialog">Fermer</button>${window.BAWorkspace && state.detail?.documents.some(item => item.id === doc.id) ? `<button class="button secondary" type="button" data-action="open-file" data-id="${esc(doc.id)}">${icon('eye')}Ouvrir la pièce</button>` : ''}<button class="button" type="button" data-action="download" data-id="${esc(doc.id)}"${canMutate() ? '' : ' disabled'}>${icon('download')}${state.demo ? 'Exemple sans original réel' : 'Télécharger le fichier versé'}</button></div>`);
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
    if (id !== state.selectedId) window.BAWorkspace?.closeDock();
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
    closeLocalSearch(); closeCockpitModal(); closeHelpMenu(false); state.cockpitPanel = null;
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
    const known = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', tif: 'image/tiff', tiff: 'image/tiff', txt: 'text/plain', csv: 'text/csv', json: 'application/json', eml: 'message/rfc822', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', webm: file.type.startsWith('audio/') ? 'audio/webm' : 'video/webm', mp4: 'video/mp4', m4a: 'audio/mp4', mp3: 'audio/mpeg' };
    return known[ext] || file.type || 'application/octet-stream';
  }
  async function fileBase64(file) {
    if (typeof FileReader === 'function') {
      // The browser's own encoder: faster and lighter than building a binary string for large videos.
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => { const value = String(reader.result); resolve(value.slice(value.indexOf(',') + 1)); };
        reader.onerror = () => reject(reader.error || new Error('Lecture du fichier impossible.'));
        reader.readAsDataURL(file);
      });
    }
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
  // The server takes one upload at a time: every file of the workspace goes through this queue.
  let uploadChain = Promise.resolve();
  function queueUpload(task) { const run = uploadChain.then(task, task); uploadChain = run.catch(() => {}); return run; }
  function wait(ms) { return new Promise(resolve => window.setTimeout(resolve, ms)); }
  async function postDocument(caseId, payload) {
    for (let attempt = 0; ; attempt += 1) {
      try { return await api(`/api/cases/${encodeURIComponent(caseId)}/documents`, { method: 'POST', body: JSON.stringify(payload) }); }
      catch (error) { if (error.status !== 429 || attempt >= 5) throw error; await wait(800 * (attempt + 1)); }
    }
  }
  function cleanName(name) {
    const value = String(name || '').normalize('NFC').replace(/[\\/:<>"|?*\u0000-\u001f\u007f]+/gu, ' ').replace(/\s+/gu, ' ').replace(/\s+\./gu, '.').replace(/^[\s.]+|[\s.]+$/gu, '');
    return (value || 'Pièce sans nom').slice(-240);
  }
  function paintUploads() { const node = document.getElementById('upload-queue'); if (node) node.innerHTML = uploadsHtml(); }
  function pickFiles() {
    if (!canMutate() || !state.selectedId) return;
    if (state.view !== 'documents') navigate('documents');
    document.getElementById('drop-input')?.click();
  }
  // Quick upload: originals marked « à vérifier », with an honest provenance note to complete later.
  function enqueueFiles(list) {
    if (!canMutate() || !state.selectedId || !list?.length) return;
    const caseId = state.selectedId, session = state.sessionVersion, max = state.capabilities?.maxDocumentBytes || MAX_FILE_BYTES;
    const files = [...list];
    if (files.length > 20) notify('20 fichiers au plus à la fois : les suivants n’ont pas été ajoutés.', true);
    const items = files.slice(0, 20).map(file => ({ file, name: cleanName(file.name), status: 'queued', message: '' }));
    state.uploads = [...state.uploads.filter(item => item.status === 'sending' || item.status === 'queued'), ...items];
    for (const item of items) {
      if (!item.file.size) { item.status = 'failed'; item.message = 'Fichier vide'; continue; }
      if (item.file.size > max) { item.status = 'failed'; item.message = 'Fichier trop volumineux'; continue; }
      void queueUpload(async () => {
        if (session !== state.sessionVersion) return;
        item.status = 'sending'; paintUploads();
        try {
          await postDocument(caseId, { name: item.name, mimeType: mimeFor(item.file), contentBase64: await fileBase64(item.file), sourceType: 'original', reviewStatus: 'a_verifier', extractedText: '',
            sourceReference: `Ajout rapide depuis l’espace de travail le ${date(new Date().toISOString(), true)} : provenance à préciser.` });
          item.status = 'done';
        } catch (error) { item.status = 'failed'; item.message = error.message; }
        if (session === state.sessionVersion) paintUploads();
      });
    }
    paintUploads();
    void queueUpload(async () => {
      if (session !== state.sessionVersion) return;
      const done = items.filter(item => item.status === 'done').length, failed = items.length - done;
      if (done && caseId === state.selectedId) { await refreshDetail(caseId).catch(() => false); render(); }
      notify(done ? `${done} pièce${done > 1 ? 's' : ''} ajoutée${done > 1 ? 's' : ''} au dossier${failed ? `, ${failed} refusée${failed > 1 ? 's' : ''}` : ''}. Précisez la provenance si elle est connue.` : 'Aucune pièce n’a été ajoutée.', !done);
    });
  }
  // Files made in the workspace (video, document, drawing, presentation) are saved to the case they were opened from.
  async function saveFromWorkspace(blob, meta) {
    const caseId = meta.caseId;
    if (!canMutate() || !caseId || caseId !== state.selectedId) throw new Error('Enregistrement impossible : ouvrez l’outil depuis le dossier concerné.');
    const session = state.sessionVersion;
    return queueUpload(async () => {
      if (session !== state.sessionVersion) throw new Error('La session a été fermée.');
      const payload = { name: cleanName(meta.name), mimeType: meta.mimeType, contentBase64: await fileBase64(blob), sourceType: meta.sourceType, reviewStatus: 'a_verifier',
        sourceReference: String(meta.sourceReference || '').slice(0, 2048), extractedText: String(meta.extractedText || '').slice(0, 200000) };
      if (meta.versionOf) payload.versionOf = meta.versionOf;
      const result = await postDocument(caseId, payload);
      if (caseId === state.selectedId && session === state.sessionVersion) { await refreshDetail(caseId).catch(() => false); render(); }
      return result.document;
    });
  }
  function workspaceTool(name, id) {
    const tools = window.BAWorkspace;
    if (!tools || !state.detail) { notify('Cet outil n’est pas disponible dans ce navigateur.', true); return; }
    const doc = id ? state.detail.documents.find(item => item.id === id) : null;
    if (id && !doc) return;
    tools[name](doc);
  }
  function openCall() {
    if (!state.detail) return;
    const client = isClientSide(), next = nextMeeting(), join = !state.demo && joinUrlFor(next);
    const send = state.demo || !canMutate() ? ' disabled' : '';
    const meeting = join ? `<section class="call-option"><h3>Rejoindre la réunion prévue</h3><p>${esc(next.title)} · ${esc(date(next.scheduledAt, true))}</p><div><a class="button call" href="${esc(join)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${icon('video')}Rejoindre sur Zoom<span class="sr-only"> dans un nouvel onglet</span></a></div></section>` : '';
    showDialog(client ? 'Appeler mon avocat' : 'Joindre la personne cliente', join ? 'Rejoignez la réunion prévue ou demandez un rappel.' : 'Votre demande de rappel arrive dans les échanges du dossier.', `<div class="call-options">${meeting}<section class="call-option"><h3>Demander un rappel</h3><p>${client ? 'Votre avocat' : 'La personne cliente'} voit la demande dans les échanges de ce dossier et vous rappelle au moment indiqué.</p><form id="call-form"><div class="form-grid"><div class="field"><label for="call-when">Moment souhaité</label><select id="call-when" name="when"><option>Dès que possible</option><option>Aujourd’hui, avant midi</option><option>Aujourd’hui, après-midi</option><option>En soirée</option><option>Demain</option></select></div><div class="field"><label for="call-phone">Numéro où vous joindre, facultatif</label><input id="call-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="40"></div></div><div class="field"><label for="call-topic">Sujet en quelques mots, facultatif</label><input id="call-topic" name="topic" maxlength="200" autocomplete="off" placeholder="Ex. la mise en demeure reçue hier"></div><p class="form-error" role="alert" hidden></p><div class="form-actions"><button class="button secondary" type="button" data-action="close-dialog">Annuler</button><button class="button call" type="submit"${send}>${icon('phone')}Demander un rappel</button></div></form></section><div class="callout">${icon('info')}<p><strong>Téléphonie à connecter</strong>${state.demo ? 'Aperçu : aucune demande n’est envoyée.' : 'Le portail ne compose aucun numéro lui-même : la demande est un message du dossier.'}</p></div></div>`);
  }
  async function submitCall(form) {
    if (!canMutate() || state.busy || !state.selectedId) return;
    const caseId = state.selectedId, data = new FormData(form);
    const button = form.querySelector('[type="submit"]'), errorNode = form.querySelector('.form-error');
    const when = String(data.get('when') || 'Dès que possible'), phone = String(data.get('phone') || '').trim(), topic = String(data.get('topic') || '').trim();
    if (phone && !/^\+?[0-9 ().-]{7,24}(?:\s*(?:poste|ext\.?|x)\s*[0-9]{1,6})?$/iu.test(phone)) { errorNode.textContent = 'Vérifiez le numéro de téléphone, ou laissez ce champ vide.'; errorNode.hidden = false; return; }
    state.busy = true; button.disabled = true; errorNode.hidden = true;
    try {
      const body = `Demande d’appel — moment souhaité : ${when}${phone ? ` · numéro : ${phone}` : ''}${topic ? ` · sujet : ${topic}` : ''}`;
      await api(`/api/cases/${encodeURIComponent(caseId)}/messages`, { method: 'POST', body: JSON.stringify({ body }) });
      if (caseId === state.selectedId) await refreshDetail(caseId);
      if (dialog.open) dialog.close();
      state.busy = false; render();
      notify('Votre demande de rappel est déposée dans les échanges du dossier.');
    } catch (error) { if (errorNode.isConnected) { errorNode.textContent = error.message; errorNode.hidden = false; } else notify(error.message, true); }
    finally { state.busy = false; button.disabled = false; }
  }
  const workspaceBridge = {
    icon, esc, notify, bytes, sourceLabel: type => SOURCE_LABELS[type] || 'Type à préciser',
    navigate: view => navigate(view), views: () => Object.keys(VIEW_LABELS), currentView: () => state.view,
    isDemo: () => state.demo, canSave: () => canMutate() && Boolean(state.selectedId), caseId: () => state.selectedId,
    docs: () => state.detail?.documents || [], caseTitle: () => currentCase()?.title || '',
    fetchBlob: doc => api(`/api/cases/${encodeURIComponent(state.selectedId)}/documents/${encodeURIComponent(doc.id)}/download`, { asBlob: true }),
    save: saveFromWorkspace, provenance: id => preview(id), download: (id, trigger) => download(id, trigger),
  };
  function help() {
    showDialog('Un espace pour préparer', 'Le document, sa source et ses limites restent accessibles.', `<p>Les dossiers regroupent les pièces, les échanges et le suivi du temps. Les droits sont contrôlés par le serveur pour chaque dossier.</p><div class="callout">${icon('info')}<p><strong>Une source reste à apprécier</strong>Un original, une déclaration, une analyse et une extraction OCR sont des natures distinctes. Un texte extrait reste à contrôler sur la pièce. Les doublons ne s’additionnent pas.</p></div><p>L’aperçu ne contient que des exemples fictifs et n’envoie aucune information au serveur. La connexion TAKATAK, l’assistant IA, les crédits et les appels ne sont pas présentés comme actifs lorsqu’ils ne sont pas configurés.</p><div class="form-actions"><button class="button" data-action="close-dialog">Compris</button></div>`);
  }
  document.addEventListener('keydown', (event) => {
    if (event.target?.closest?.('#cockpit-dials') && railKey(event)) return;
    if ((event.ctrlKey || event.metaKey) && !event.altKey && String(event.key).toLowerCase() === 'k') { const search = document.getElementById('cockpit-search'); if (search && !search.disabled) { event.preventDefault?.(); search.focus(); search.select?.(); } return; }
    if (event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key) && state.view === 'home' && state.cases.length > 1 && !document.querySelector?.('dialog[open]')) {
      const at = state.cases.findIndex(item => item.id === state.selectedId);
      const next = state.cases[(at + (event.key === 'ArrowDown' ? 1 : -1) + state.cases.length) % state.cases.length];
      if (next) { event.preventDefault?.(); void loadCase(next.id, 'home'); }
      return;
    }
    if (event.key === 'Escape' && !document.querySelector?.('dialog[open]')) {
      if (helpMemory.menuOpen) { event.preventDefault?.(); closeHelpMenu(); return; }
      if (guideMemory.open && event.target?.closest?.('#cockpit-guide')) { event.preventDefault?.(); hideGuide(true); return; }
      if (state.cockpitPanel && event.target?.closest?.('#instrument-deck')) { event.preventDefault?.(); closeDrawer(); return; }
    }
    // Local search results: arrows move between results, Escape closes them and returns to the field.
    const inSearch = event.target?.closest?.('#cockpit-search-form');
    if (inSearch && ['ArrowDown', 'ArrowUp', 'Escape'].includes(event.key)) {
      const hits = [...document.querySelectorAll('#cockpit-search-results button')];
      if (event.key === 'Escape') { if (!document.getElementById('cockpit-search-results')?.hidden) { event.preventDefault(); closeLocalSearch(); document.getElementById('cockpit-search')?.focus(); } return; }
      if (!hits.length) return;
      event.preventDefault();
      const at = hits.indexOf(document.activeElement);
      const next = event.key === 'ArrowDown' ? Math.min(at + 1, hits.length - 1) : at <= 0 ? -1 : at - 1;
      (next < 0 ? document.getElementById('cockpit-search') : hits[next])?.focus();
      return;
    }
    if (event.key === 'Escape' && state.dictationStatus !== 'idle') {
      event.preventDefault(); cancelDictation(); render();
      document.getElementById('document-query')?.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target?.closest?.('#cockpit-search-form')) closeLocalSearch();
    if (!event.target?.closest?.('#help-menu, #help-fab')) closeHelpMenu(false);
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.closest?.('#help-menu')) closeHelpMenu(false);
    if (button.closest?.('#cockpit-guide') && button.dataset.action !== 'guide-close') hideGuide(false);
    if (button.dataset.view) { navigate(button.dataset.view); return; }
    if (button.id === 'help-fab') { if (helpMemory.menuOpen) closeHelpMenu(); else openHelpMenu(); return; }
    if (button.id === 'guide-avatar') { showGuide(true); return; }
    const action = button.dataset.action;
    const inModal = Boolean(button.closest?.('#cockpit-modal'));
    // Every connection goes through the pop-up first; only its confirm button starts the existing OAuth flow.
    if (action === 'integration-connect' && !inModal) { openIntegrationModal(button.dataset.id, button); return; }
    if (action === 'integration-disconnect' && inModal) closeCockpitModal();
    if (button.classList.contains('search-hit')) closeLocalSearch(true);
    if (action === 'cockpit-integration') openIntegrationModal(button.dataset.id, button);
    if (action === 'cockpit-modal-close') closeCockpitModal();
    if (action === 'cockpit-drawer') toggleDrawer(button.dataset.panel);
    if (action === 'cockpit-drawer-close') closeDrawer();
    if (action === 'cockpit-select-case' && state.cases.some(item => item.id === button.dataset.id)) void loadCase(button.dataset.id, 'home');
    if (action === 'rail-prev') scrollRail(-1);
    if (action === 'rail-next') scrollRail(1);
    if (action === 'guide-open') showGuide(true);
    if (action === 'guide-close') hideGuide(true);
    if (action === 'mimt-board') openMimtBoard(inModal ? 0 : mimtMemory.step, inModal ? null : button);
    if (action === 'mimt-group') openMimtGroup(button);
    if (action === 'ws-select' && button.dataset.id && button.dataset.id !== state.selectedId) void loadCase(button.dataset.id, 'home');
    if (action === 'mimt-step') openMimtBoard(Number(button.dataset.step));
    if (action === 'mimt-next') openMimtBoard(mimtMemory.step + 1);
    if (action === 'mimt-prev') openMimtBoard(mimtMemory.step - 1);
    if (action === 'tutorial-start') startTour();
    if (action === 'tutorial-dismiss') { tutorialMemory.status = 'skipped'; render(); }
    if (action === 'tour-next') { if (tutorialMemory.step + 1 < TOUR_STEPS.length) showTourStep(tutorialMemory.step + 1); else endTour('done'); }
    if (action === 'tour-prev' && tutorialMemory.step > 0) showTourStep(tutorialMemory.step - 1);
    if (action === 'tour-skip') endTour('skipped');
    if (action === 'cockpit-fulltext') {
      const query = state.cockpitQuery.trim(); closeLocalSearch(true);
      if (query) { openSearch('all'); state.searchQuery = query; void runSearch(query); }
    }
    if (action === 'login-mode' && !state.busy && !state.demo) {
      state.loginStep = button.dataset.mode === 'password' ? 'password' : 'email';
      state.loginNotice = ''; render();
    }
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
    if (action === 'open-file') workspaceTool('openFile', button.dataset.id);
    if (action === 'annotate') workspaceTool('openStudio', button.dataset.id);
    if (action === 'edit-doc') workspaceTool('openEditor', button.dataset.id);
    if (action === 'new-doc') workspaceTool('openEditor');
    if (action === 'new-drawing') workspaceTool('openStudio');
    if (action === 'record-video') workspaceTool('recordVideo');
    if (action === 'new-presentation') workspaceTool('openPresentation');
    if (action === 'call-lawyer') openCall();
    if (action === 'pick-files') pickFiles();
    if (action === 'doc-layout') {
      state.docLayout = button.dataset.layout === 'list' ? 'list' : 'grid';
      render();
    }
    if (button.id === 'help-button') help();
    if (button.id === 'logout-button') void logout(button);
  });
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    if (form.id === 'login-form') void login(form);
    else if (form.id === 'email-code-request-form') void requestEmailCode(form);
    else if (form.id === 'email-code-verify-form') void verifyEmailCode(form);
    else if (['search-form', 'dashboard-search-form', 'case-search-form'].includes(form.id)) void submitSearch(form);
    else if (form.id === 'page-jump-form') void jumpPage(form);
    else if (['communication-form', 'communication-cancel-form'].includes(form.id)) void submitCommunication(form);
    else if (['case-form', 'upload-form', 'message-form', 'time-form'].includes(form.id)) void submitMutation(form);
    else if (form.id === 'call-form') void submitCall(form);
    else if (form.id === 'cockpit-search-form') document.querySelector?.('#cockpit-search-results .search-hit, #cockpit-search-results .search-fulltext')?.focus();
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
    if (event.target.id === 'drop-input') { enqueueFiles(event.target.files); event.target.value = ''; }
    if (event.target.id === 'document-category') { state.documentCategory=event.target.value; render(); }
    if (event.target.id === 'document-unresolved') { state.onlyUnresolved=event.target.checked; render(); }
    if (event.target.id === 'cockpit-consent') { const confirm = document.getElementById('cockpit-confirm'); if (confirm) confirm.disabled = !event.target.checked || !canMutate(); }
    if (event.target.id === 'communication-kind') {
      const phone = event.target.value === 'phone';
      const link = document.getElementById('communication-link');
      document.getElementById('communication-link-field').hidden = phone;
      link.disabled = phone;
    }
  });
  document.addEventListener('input', (event) => {
    if (event.target.id === 'ws-filter') { wsMemory.query = String(event.target.value || '').slice(0, 80); const rows = document.getElementById('ws-case-rows'); if (rows) { rows.innerHTML = wsCaseRows(); paintWorkspace(rows); } return; }
    if (event.target.id === 'cockpit-search') { state.cockpitQuery = String(event.target.value || '').slice(0, 120); paintLocalSearch(); return; }
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
  // Files dropped on the pieces panel join the upload queue; elsewhere the browser does not open them.
  document.addEventListener('dragover', (event) => {
    if (![...(event.dataTransfer?.types || [])].includes('Files')) return;
    event.preventDefault();
    const zone = event.target.closest?.('[data-dropzone]');
    document.getElementById('dropzone')?.classList.toggle('active', Boolean(zone) && canMutate());
    if (event.dataTransfer) event.dataTransfer.dropEffect = zone && canMutate() ? 'copy' : 'none';
  });
  document.addEventListener('dragleave', (event) => { if (!event.relatedTarget) document.getElementById('dropzone')?.classList.remove('active'); });
  document.addEventListener('drop', (event) => {
    if (![...(event.dataTransfer?.types || [])].includes('Files')) return;
    event.preventDefault();
    document.getElementById('dropzone')?.classList.remove('active');
    if (event.target.closest?.('[data-dropzone]')) enqueueFiles(event.dataTransfer.files);
  });
  cockpitModal?.addEventListener('click', (event) => { if (event.target === cockpitModal) { const rect = cockpitModal.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeCockpitModal(); } });
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
  async function requestEmailCode(form) {
    if (state.demo || state.health?.emailCodeConfigured !== true || state.busy) return;
    const email = form.elements.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) || email.length > 320) { notify('Vérifiez votre adresse courriel.', true); return; }
    state.busy = true; clearSession();
    const generation = state.sessionVersion;
    state.loginEmail = email; state.loginNotice = '';
    const button = form.querySelector('button[type="submit"]'); if (button) button.disabled = true;
    try {
      const result = await api('/api/auth/email/request', { method: 'POST', body: JSON.stringify({ email }) });
      if (generation !== state.sessionVersion) return;
      state.loginStep = 'code';
      state.loginNotice = result.message || 'Si ce compte existe, un code pourra être envoyé. Consultez votre courriel et vos indésirables.';
    } catch (error) {
      if (generation === state.sessionVersion) { state.loginNotice = error.message; notify(error.message, true); }
    } finally {
      state.busy = false;
      if (generation === state.sessionVersion) { render(); if (state.loginStep === 'code') document.getElementById('login-code')?.focus(); }
    }
  }
  async function verifyEmailCode(form) {
    if (state.demo || state.health?.emailCodeConfigured !== true || state.busy || state.loginStep !== 'code') return;
    let code = form.elements.code.value;
    form.elements.code.value = '';
    if (!/^[0-9]{6,10}$/u.test(code)) { code = ''; notify('Saisissez le code de 6 à 10 chiffres reçu par courriel.', true); return; }
    const email = state.loginEmail;
    state.busy = true; clearSession();
    const generation = state.sessionVersion;
    const button = form.querySelector('button[type="submit"]'); if (button) button.disabled = true;
    try {
      const pending = api('/api/auth/email/verify', { method: 'POST', body: JSON.stringify({ email, code }) });
      code = ''; await pending;
      if (generation !== state.sessionVersion) return;
      await loadSession();
      if (generation !== state.sessionVersion) return;
      state.loginEmail = ''; state.loginNotice = ''; state.loginStep = 'email';
      notify('Vous êtes connecté à votre espace.');
    } catch (error) {
      if (generation === state.sessionVersion) { clearSession(); state.loginNotice = error.message; notify(error.message, true); render(); }
    } finally {
      code = ''; state.busy = false;
      render(true);
    }
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
    window.BAWorkspace?.init(workspaceBridge);
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
