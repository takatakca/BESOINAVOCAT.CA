// Staff inbox of public requests (/demandes). Same-origin API only; every value is escaped before display.
(function () {
  'use strict';
  var STATUS = {
    received: 'Reçue', in_review: 'En traitement', contacted: 'Personne recontactée', closed: 'Fermée', spam: 'Indésirable',
  };
  var ORDER = ['received', 'in_review', 'contacted', 'closed', 'spam'];
  var state = { status: null, offset: 0, rows: [], selected: null, detail: null, busy: false };
  var $ = function (id) { return document.getElementById(id); };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fr(label) { return label && typeof label === 'object' ? (label.fr || label.en || '') : (label || ''); }
  function when(iso) {
    if (!iso) return '';
    try { return new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)); } catch (e) { return iso; }
  }
  function badge(status) { return '<span class="inbox-status" data-status="' + esc(status) + '">' + esc(STATUS[status] || status) + '</span>'; }

  async function api(path, options) {
    options = options || {};
    var method = options.method || 'GET';
    var headers = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (method !== 'GET') headers['X-Requested-With'] = 'XMLHttpRequest';
    var response = await fetch(path, { method: method, headers: headers, credentials: 'same-origin', cache: 'no-store',
      body: options.body === undefined ? undefined : JSON.stringify(options.body) });
    var data = null;
    try { data = await response.json(); } catch (e) { data = null; }
    if (!response.ok) {
      var error = new Error((data && data.error && data.error.message) || 'Erreur ' + response.status);
      error.status = response.status; error.code = data && data.error && data.error.code;
      throw error;
    }
    return data;
  }

  function showState(text, isError) {
    var node = $('inbox-state');
    node.textContent = text || '';
    node.classList.toggle('is-error', Boolean(isError));
  }

  function renderFilters(counts) {
    var total = ORDER.reduce(function (sum, key) { return sum + (counts[key] || 0); }, 0);
    var buttons = [['', 'Toutes', total]].concat(ORDER.map(function (key) { return [key, STATUS[key], counts[key] || 0]; }));
    $('inbox-filters').innerHTML = buttons.map(function (item) {
      var pressed = (state.status || '') === item[0];
      return '<button type="button" data-filter="' + esc(item[0]) + '" aria-pressed="' + pressed + '">' + esc(item[1]) + ' · ' + esc(item[2]) + '</button>';
    }).join('');
  }

  function renderRows() {
    var list = $('inbox-rows');
    if (!state.rows.length) { list.innerHTML = '<li class="table-empty inbox-empty">Aucune demande dans cette vue.</li>'; return; }
    list.innerHTML = state.rows.map(function (row) {
      var current = row.reference === state.selected;
      var kind = row.role === 'professional' ? 'Avocat · intérêt' : row.detailed ? 'Demande détaillée' : 'Contact';
      return '<li><button type="button" class="inbox-row" data-reference="' + esc(row.reference) + '" aria-current="' + current + '">' +
        '<span class="inbox-row-top"><strong>' + esc(row.name) + '</strong>' + badge(row.status) + '</span>' +
        '<span>' + esc(fr(row.domain && row.domain.label)) + ' · ' + esc(fr(row.region && row.region.label)) + '</span>' +
        '<small>' + esc(kind) + (row.urgency ? ' · ' + esc(fr(row.urgency.label)) : '') + ' · ' + esc(when(row.createdAt)) + '</small></button></li>';
    }).join('');
  }

  async function load(reset) {
    if (reset) { state.offset = 0; state.rows = []; }
    var query = '?limit=25&offset=' + state.offset + (state.status ? '&status=' + encodeURIComponent(state.status) : '');
    try {
      var data = await api('/api/intakes' + query);
      state.rows = state.rows.concat(data.requests);
      state.offset = data.nextOffset || state.offset;
      $('inbox-more').hidden = !data.hasMore;
      renderFilters(data.counts);
      renderRows();
      showState('');
      $('inbox-layout').hidden = false;
    } catch (error) {
      $('inbox-layout').hidden = true;
      if (error.status === 401) showState('Connectez-vous d’abord dans l’espace de travail, puis revenez sur cette page.', true);
      else if (error.status === 404) showState('Cette page est réservée aux personnes de l’équipe BesoinAvocat désignées pour traiter les demandes.', true);
      else showState(error.message, true);
    }
  }

  function day(iso) {
    try { return new Intl.DateTimeFormat('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso + 'T12:00:00')); } catch (e) { return iso; }
  }
  // Answers of the guided flow: other parties (conflict check), legal aid, availability, contact times, remote service.
  function flowRows(r) {
    var rows = [];
    if (r.otherParties) {
      rows.push(['Autres parties', fr(r.otherParties.status && r.otherParties.status.label)]);
      if (r.otherParties.names) rows.push(['Noms à vérifier (conflits)', r.otherParties.names]);
    }
    if (r.legalAid) {
      rows.push(['Aide juridique', fr(r.legalAid.interest && r.legalAid.interest.label)]);
      rows.push(['Composition du ménage', fr(r.legalAid.household && r.legalAid.household.label)]);
      rows.push(['Revenu annuel du ménage', fr(r.legalAid.income && r.legalAid.income.label)]);
    }
    if (r.availability) {
      rows.push(['Disponibilités', r.availability.asap ? 'Dès que possible' : r.availability.slots.map(function (s) { return day(s.date) + ' · ' + fr(s.period && s.period.label); }).join('\n')]);
    }
    if (r.contactTimes) rows.push(['Moments pour joindre', r.contactTimes.length ? r.contactTimes.map(function (t) { return fr(t.label); }).join(', ') : 'Aucune préférence']);
    if (r.acceptRemote !== null && r.acceptRemote !== undefined) rows.push(['Service à distance hors région', r.acceptRemote ? 'Accepté' : 'Non']);
    return rows;
  }

  function renderDetail() {
    var box = $('inbox-detail'), data = state.detail;
    if (!data) return;
    var r = data.request, c = r.contact || {};
    var rows = [
      ['Référence', r.reference], ['Reçue le', when(r.createdAt)], ['Statut', STATUS[r.status] || r.status],
      ['Nom', c.name], ['Courriel', c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>' : null, true],
      ['Téléphone', c.phone ? '<a href="tel:' + esc(c.phone.replace(/[^+0-9]/g, '')) + '">' + esc(c.phone) + '</a>' : null, true],
      ['Préférence de contact', fr(r.contactPreferenceLabel)], ['Langue', r.language === 'en' ? 'Anglais' : 'Français'],
      ['Domaine', fr(r.domain && r.domain.label)], ['Région', fr(r.region && r.region.label)],
      ['Étape', fr(r.stage && r.stage.label)], ['Objectif', fr(r.objective && r.objective.label)],
      ['Urgence', fr(r.urgency && r.urgency.label)], ['Échéance', r.deadline],
      ['Forfait envisagé', r.periodicity === 'weekly' ? 'Hebdomadaire' : r.periodicity === 'monthly' ? 'Mensuel' : null],
    ].concat(flowRows(r)).filter(function (item) { return item[1]; });
    var answers = (r.answers || []).map(function (a) { return [fr(a.question), fr(a.answer && a.answer.label) || a.answer.id]; });
    var history = (data.history || []).map(function (h) {
      var text = h.kind === 'status' ? h.body.split(' → ').map(function (s) { return STATUS[s] || s; }).join(' → ') : h.body;
      return '<li data-kind="' + esc(h.kind) + '"><small>' + esc(when(h.createdAt)) + (h.mine ? ' · vous' : '') + '</small><p>' + esc(text) + '</p></li>';
    }).join('');
    box.innerHTML =
      '<div class="inbox-actions"><h2 id="inbox-detail-title">' + esc(c.name || r.reference) + '</h2>' + badge(r.status) + '</div>' +
      '<dl>' + rows.map(function (item) { return '<dt>' + esc(item[0]) + '</dt><dd>' + (item[2] ? item[1] : esc(item[1])) + '</dd>'; }).join('') + '</dl>' +
      (r.summary ? '<div><h3>Résumé de la situation</h3><p class="inbox-summary">' + esc(r.summary) + '</p></div>' : '') +
      (answers.length ? '<div><h3>Questionnaire</h3><dl>' + answers.map(function (a) { return '<dt>' + esc(a[0]) + '</dt><dd>' + esc(a[1]) + '</dd>'; }).join('') + '</dl></div>' : '') +
      '<div class="inbox-actions"><label for="inbox-status-select">Changer le statut</label><select id="inbox-status-select">' +
        ORDER.map(function (key) { return '<option value="' + key + '"' + (key === r.status ? ' selected' : '') + '>' + esc(STATUS[key]) + '</option>'; }).join('') +
      '</select><button type="button" class="button" id="inbox-status-save">Enregistrer</button></div>' +
      '<form class="inbox-note" id="inbox-note-form"><label for="inbox-note-text"><h3>Ajouter une note interne</h3></label>' +
        '<textarea id="inbox-note-text" maxlength="4000" required></textarea><div><button type="submit" class="button">Ajouter la note</button></div></form>' +
      '<div><h3>Historique</h3>' + (history ? '<ul class="inbox-history">' + history + '</ul>' : '<p class="table-subtext">Aucune note pour l’instant.</p>') + '</div>' +
      '<p class="table-subtext">Consentement ' + esc(r.consent && r.consent.version) + ' : « ' + esc(r.consent && r.consent.text) + ' »</p>';
  }

  async function open(reference, reveal) {
    state.selected = reference;
    renderRows();
    $('inbox-detail').innerHTML = '<p class="loading-state">Chargement de la demande…</p>';
    try { state.detail = await api('/api/intakes/' + encodeURIComponent(reference)); renderDetail();
      if (reveal && window.matchMedia('(max-width: 860px)').matches) $('inbox-detail').scrollIntoView({ block: 'start' }); }
    catch (error) { $('inbox-detail').innerHTML = '<p class="form-error">' + esc(error.message) + '</p>'; }
  }

  async function saveStatus() {
    if (state.busy || !state.detail) return;
    var r = state.detail.request, next = $('inbox-status-select').value;
    state.busy = true;
    try {
      await api('/api/intakes/' + encodeURIComponent(r.reference) + '/status', { method: 'POST', body: { status: next, expected: r.status } });
      await open(r.reference);
      await load(true);
    } catch (error) {
      if (error.code === 'STATUS_CONFLICT') { await open(r.reference); }
      showState(error.message, true);
    } finally { state.busy = false; }
  }

  async function addNote(event) {
    event.preventDefault();
    if (state.busy || !state.detail) return;
    var text = $('inbox-note-text').value;
    if (!text.trim()) return;
    state.busy = true;
    try {
      await api('/api/intakes/' + encodeURIComponent(state.detail.request.reference) + '/notes', { method: 'POST', body: { body: text } });
      await open(state.detail.request.reference);
    } catch (error) { showState(error.message, true); }
    finally { state.busy = false; }
  }

  document.addEventListener('click', function (event) {
    var filter = event.target.closest('[data-filter]');
    if (filter) { state.status = filter.getAttribute('data-filter') || null; state.selected = null; load(true); return; }
    var row = event.target.closest('[data-reference]');
    if (row) { open(row.getAttribute('data-reference'), true); return; }
    if (event.target.closest('#inbox-more')) { load(false); return; }
    if (event.target.closest('#inbox-status-save')) saveStatus();
  });
  document.addEventListener('submit', function (event) { if (event.target.id === 'inbox-note-form') addNote(event); });
  load(true);
})();
