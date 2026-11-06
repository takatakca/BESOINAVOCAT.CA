'use strict';

// Calls, video, sealed journal and generated documents of the portal (window.BALive). app.js renders placeholders
// (<section data-live="…">) and calls afterRender(); this module fills them from the API and owns their events.
// Phone calls go through MIMT Connect only (server side, lib/telephony.mjs); the video is browser-to-browser WebRTC
// with the portal relaying signaling to the members of the case. Nothing here is simulated: when the server says a
// service is not connected, the panel says so and offers no action.
(() => {
  let bridge = null;
  const cache = { overview: null, link: null, team: null };
  const timers = new Map();
  const STATUS = { queued: 'En file', initiated: 'Lancé', ringing: 'Sonnerie', answered: 'En ligne', completed: 'Terminé', missed: 'Sans réponse', failed: 'Échec' };
  const AVAILABILITY = { available: 'Disponible', busy: 'Occupé', offline: 'Hors ligne' };
  const SUBSCRIPTION = { active: 'Actif', trialing: 'Essai', past_due: 'Paiement en retard', canceled: 'Terminé', none: 'Aucun' };
  const ROLE = { owner: 'Responsable', lawyer: 'Avocat', client: 'Client' };
  const FINAL = new Set(['completed', 'missed', 'failed']);

  const esc = value => bridge.esc(value);
  const icon = name => bridge.icon(name);
  const api = (path, options) => bridge.api(path, options);
  const post = (path, body = {}) => api(path, { method: 'POST', body: JSON.stringify(body) });
  const caseBase = () => `/api/cases/${encodeURIComponent(bridge.caseId())}`;
  const when = value => (value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Toronto' }).format(new Date(value)) : '—');
  const duration = s => (Number.isFinite(s) && s !== null ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s` : '—');
  const pill = (tone, label) => `<span class="live-pill" data-tone="${tone}">${esc(label)}</span>`;
  const outLink = (href, label) => (href ? `<a class="button secondary small" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}<span class="sr-only"> (MIMT, nouvel onglet)</span> ${icon('arrow')}</a>` : '');
  const empty = text => `<p class="table-empty">${esc(text)}</p>`;
  const errorBox = error => `<div class="callout warning">${icon('info')}<p><strong>Action impossible</strong>${esc(error.message)}${error.link ? ` <a href="${esc(error.link)}" target="_blank" rel="noopener noreferrer">Ouvrir MIMT</a>` : ''}</p></div>`;

  function notConnected(overview) {
    const missing = overview?.missing?.length ? ` Variables à renseigner dans Coolify : ${overview.missing.join(', ')}.` : '';
    return `<div class="callout">${icon('info')}<p><strong>Téléphonie MIMT à raccorder</strong>La clé MIMT Connect et le secret de webhook ne sont pas encore configurés sur le serveur. Aucun appel n’est lancé ni simulé.${esc(missing)}</p></div>`;
  }
  function demo(section) {
    return `<div class="panel-heading"><div><h2>${esc(section)}</h2><p>Aperçu</p></div></div><div class="panel-body">${empty('L’aperçu n’appelle aucun service. Connectez-vous pour utiliser cette section.')}</div>`;
  }
  async function overview(force = false) {
    if (!cache.overview || force) cache.overview = await api('/api/telephony');
    return cache.overview;
  }

  // ---------- Réglages : numéro et profil MIMT ----------
  function phoneBlock(o) {
    const phone = o.phone;
    return `<section class="live-block" aria-labelledby="live-phone-title"><h3 id="live-phone-title">${icon('phone')}Mon numéro pour être rappelé</h3>
      ${phone ? `<p>Numéro enregistré : <strong class="mono">${esc(phone.phone)}</strong>, consentement donné le ${esc(when(phone.consentAt))}. Seul l’avocat d’un de vos dossiers peut vous appeler, par MIMT; il ne voit jamais le numéro.</p>
        <div class="tile-actions"><button type="button" class="button secondary small" data-live-action="phone-remove">Retirer mon numéro</button></div>`
      : `<form data-live-form="phone" class="live-form"><div class="field"><label for="live-phone">Numéro canadien ou américain</label><input id="live-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="40" required></div>
        <label class="check"><input type="checkbox" name="consent" required> J’accepte que l’avocat de mes dossiers m’appelle à ce numéro, par la téléphonie MIMT. Je peux retirer ce numéro en tout temps.</label>
        <p class="form-error" role="alert" hidden></p><div class="form-actions"><button class="button small" type="submit">Enregistrer</button></div></form>`}
    </section>`;
  }
  function stepper(o) {
    const m = o.member;
    const steps = [
      ['Profil MIMT', Boolean(m?.registered && m.active)], ['Compte MIMT relié', Boolean(m?.linked)], ['Ligne choisie', Boolean(m?.lineE164)],
      ['Forfait actif', m?.subscription ? m.subscription.canCall : false], ['Disponibilité', Boolean(m?.availability)],
    ];
    return `<ol class="live-steps">${steps.map(([label, done], i) => `<li class="${done ? 'is-done' : ''}"><span class="mono">${done ? '✓' : i + 1}</span>${esc(label)}</li>`).join('')}</ol>`;
  }
  function memberBlock(o) {
    const m = o.member;
    if (!o.canBeMember) return '';
    if (!o.configured) return `<section class="live-block"><h3>${icon('phone')}Téléphonie MIMT de l’avocat</h3>${notConnected(o)}</section>`;
    const head = `<h3>${icon('phone')}Téléphonie MIMT de l’avocat ${m?.readyToCall ? pill('ok', 'Prêt à appeler') : pill('wait', 'À compléter')}</h3>${stepper(o)}`;
    if (!m || !m.active) {
      return `<section class="live-block">${head}<p>Vos appels passent par votre propre compte MIMT : vos clients voient votre ligne MIMT, jamais votre cellulaire. Votre nom n’est transmis qu’à MIMT.</p>
        <form data-live-form="member" class="live-form"><div class="form-grid"><div class="field"><label for="live-name">Nom affiché chez MIMT</label><input id="live-name" name="displayName" maxlength="80" required autocomplete="name" value="${esc(m?.displayName || '')}"></div>
        <div class="field"><label for="live-mobile">Cellulaire pour le groupe Équipe, facultatif</label><input id="live-mobile" name="mobile" type="tel" inputmode="tel" maxlength="40" autocomplete="tel"></div></div>
        <p class="form-error" role="alert" hidden></p><div class="form-actions"><button class="button small" type="submit">Activer la téléphonie MIMT</button></div></form></section>`;
    }
    const parts = [head];
    if (!m.linked) {
      const link = cache.link;
      parts.push(`<div class="live-card"><h4>Relier votre compte MIMT</h4><p>Pas encore de compte MIMT? Créez-le, choisissez votre numéro et votre forfait sur MIMT, puis revenez ici.</p>
        <div class="tile-actions">${outLink('https://app.mimt.ca/connexion', 'Ouvrir MIMT')}${outLink(m.links?.chooseNumberUrl, 'Choisir un numéro MIMT')}</div>
        ${link ? `<div class="live-code" role="status"><span class="eyebrow">CODE À USAGE UNIQUE</span><strong class="mono">${esc(link.code)}</strong><small>Valide jusqu’à ${esc(when(link.expiresAt))}. Approuvez la liaison dans MIMT, puis actualisez.</small></div>
          <div class="tile-actions">${outLink(link.url, 'Approuver dans MIMT')}<button type="button" class="button small" data-live-action="member-refresh">J’ai approuvé, actualiser</button></div>`
        : `<div class="tile-actions"><button type="button" class="button small" data-live-action="member-link">Relier mon compte MIMT</button><button type="button" class="button subtle small" data-live-action="member-refresh">Actualiser</button></div>`}</div>`);
    } else {
      const options = (m.numbers || []).map(n => `<option value="${esc(n.e164)}"${n.e164 === m.lineE164 ? ' selected' : ''}>${esc(n.label)}</option>`).join('');
      parts.push(`<div class="live-grid">
        <div class="live-card"><h4>Ligne BesoinAvocat</h4>${m.lineE164 ? `<p class="live-big mono">${esc(m.lineNumber)}</p>` : '<p>Aucune ligne choisie.</p>'}
          ${options ? `<form data-live-form="line" class="live-inline"><label class="sr-only" for="live-line">Ligne</label><select id="live-line" name="e164">${options}</select><button class="button small" type="submit">${m.lineE164 ? 'Changer' : 'Choisir'}</button></form>` : `<p class="table-subtext">Aucun numéro actif dans votre compte MIMT.</p>`}
          <div class="tile-actions">${outLink(m.links?.chooseNumberUrl, 'Choisir un numéro MIMT')}</div></div>
        <div class="live-card"><h4>Forfait MIMT</h4>${m.subscription ? `<p>${pill(m.subscription.canCall ? 'ok' : 'warn', SUBSCRIPTION[m.subscription.status] || m.subscription.status)} ${esc(m.subscription.plan || '')}</p><p class="table-subtext">Fin de période : ${esc(when(m.subscription.currentPeriodEnd))}</p>` : '<p class="table-subtext">Actualisez pour lire l’état.</p>'}
          <div class="tile-actions">${outLink(m.links?.planUrl, 'Gérer mon forfait')}</div></div>
        <div class="live-card"><h4>Transfert de numéro</h4>${(m.portIns || []).length ? `<ul class="live-list">${m.portIns.map(p => `<li><span class="mono">${esc(p.e164 || '')}</span> ${esc(p.status || '')}${p.expectedDate ? ` · prévu le ${esc(p.expectedDate.slice(0, 10))}` : ''}</li>`).join('')}</ul>` : '<p class="table-subtext">Aucun transfert en cours.</p>'}
          <div class="tile-actions">${outLink(m.links?.portUrl, 'Transférer mon numéro')}</div></div>
      </div>`);
    }
    const effective = m.availability?.effectiveStatus;
    parts.push(`<div class="live-card"><h4>Disponibilité pour le groupe Équipe ${effective ? pill(effective === 'available' ? 'ok' : 'wait', AVAILABILITY[effective]) : ''}</h4>
      <div class="live-segment" role="group" aria-label="Disponibilité">${Object.entries(AVAILABILITY).map(([key, label]) => `<button type="button" class="button ${m.availability?.status === key ? '' : 'secondary '}small" data-live-action="availability" data-status="${key}" aria-pressed="${m.availability?.status === key}">${esc(label)}</button>`).join('')}</div>
      ${m.availability?.source === 'user' ? '<p class="table-subtext">Votre choix dans l’app MIMT l’emporte sur ce réglage.</p>' : ''}</div>`);
    parts.push(`<div class="tile-actions live-foot"><button type="button" class="button subtle small" data-live-action="member-refresh">${icon('rotate')}Actualiser depuis MIMT</button>${m.linked ? '<button type="button" class="button subtle small" data-live-action="member-unlink">Délier mon compte MIMT</button>' : ''}<button type="button" class="button subtle small" data-live-action="member-deactivate">Désactiver</button><span class="table-subtext">Dernière lecture : ${esc(when(m.syncedAt))}</span></div>`);
    return `<section class="live-block">${parts.join('')}</section>`;
  }
  async function paintPhone(node) {
    if (bridge.isDemo()) { node.innerHTML = demo('Téléphone et MIMT'); return; }
    const o = await overview(true);
    node.innerHTML = `<div class="panel-heading"><div><h2>Téléphone · MIMT</h2><p>Les appels du portail passent uniquement par MIMT (mimt.ca).</p></div>${o.team ? `<button type="button" class="button secondary small" data-view="equipe">${icon('team')}Console Équipe</button>` : ''}</div>
      <div class="panel-body">${phoneBlock(o)}${memberBlock(o)}</div>`;
  }

  // ---------- Dossier : appels ----------
  async function paintCalls(node) {
    if (bridge.isDemo() || !bridge.caseId()) { node.innerHTML = demo('Appels du dossier'); return; }
    const [parts, list] = await Promise.all([api(`${caseBase()}/participants`), api(`${caseBase()}/calls`)]);
    const o = await overview();
    const canCall = parts.canCall && parts.configured;
    const rows = parts.participants.filter(p => !p.self).map(p => `<li class="queue-item"><span class="queue-icon">${icon(p.role === 'client' ? 'users' : 'team')}</span><span class="queue-text"><strong>${esc(p.subject)}</strong><small>${esc(ROLE[p.role] || p.role)} · ${p.reachable ? 'joignable par MIMT' : 'aucun numéro donné'}</small></span>
      ${canCall ? `<span class="live-inline"><label class="sr-only" for="via-${esc(p.subject)}">Faire sonner</label><select id="via-${esc(p.subject)}" data-via-for="${esc(p.subject)}"><option value="app">Mon app MIMT</option><option value="mobile">Mon cellulaire</option></select>
        <button type="button" class="button call small" data-live-action="call" data-subject="${esc(p.subject)}"${p.reachable && parts.selfReady ? '' : ' disabled'}>${icon('phone')}Appeler</button></span>` : ''}</li>`).join('');
    const intro = !parts.configured ? notConnected(o)
      : parts.canCall && !parts.selfReady ? `<div class="callout">${icon('info')}<p><strong>Votre ligne MIMT n’est pas prête</strong>Reliez votre compte MIMT et choisissez votre ligne dans Réglages. <button type="button" class="text-button" data-view="settings">Ouvrir les réglages</button></p></div>`
      : !parts.canCall ? `<div class="callout">${icon('info')}<p><strong>Comment être appelé</strong>${o.phone ? 'Votre avocat peut vous appeler par MIMT au numéro enregistré.' : 'Enregistrez votre numéro dans Réglages pour que votre avocat puisse vous appeler par MIMT.'} <button type="button" class="text-button" data-view="settings">Réglages</button></p></div>` : '';
    const calls = list.calls.map(c => `<tr><td>${esc(when(c.createdAt))}</td><td>${esc(c.callerSubject || 'externe')} → ${esc(c.calleeSubject || c.answeredBy || '—')}</td><td>${pill(FINAL.has(c.status) ? (c.status === 'completed' ? 'ok' : 'warn') : 'live', STATUS[c.status] || c.status)}</td><td class="mono">${esc(duration(c.durationSeconds))}</td><td class="mono">${c.credits ?? '—'}</td>
      <td class="live-actions">${c.hasRecording && parts.canCall ? `<button type="button" class="button subtle small" data-live-action="listen" data-id="${esc(c.id)}">${icon('play')}Écouter</button>` : ''}${c.canAddTime ? `<button type="button" class="button subtle small" data-live-action="call-time" data-id="${esc(c.id)}">${icon('clock')}Au temps</button>` : ''}${parts.canCall && FINAL.has(c.status) ? `<button type="button" class="button subtle small" data-live-action="call-record" data-id="${esc(c.id)}">${icon('document')}Procès-verbal</button>` : ''}</td></tr>`).join('');
    node.innerHTML = `<div class="panel-heading"><div><h2>Appels du dossier</h2><p>Par MIMT : l’avocat répond d’abord, puis MIMT compose l’autre personne avec sa ligne. Heures et durées viennent des notifications signées de MIMT.</p></div></div>
      <div class="panel-body">${intro}${rows ? `<ul class="queue-list">${rows}</ul>` : empty('Aucune autre personne dans ce dossier.')}
      <h3 class="live-sub">Historique</h3>${calls ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>De → à</th><th>État</th><th>Durée</th><th>Crédits</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${calls}</tbody></table></div>` : empty('Aucun appel pour ce dossier.')}
      <div id="live-player" class="live-player" hidden></div></div>`;
    schedule('calls', list.calls.some(c => !FINAL.has(c.status)) ? 4000 : 0, node);
  }

  // ---------- Dossier : vidéo ----------
  const room = { id: null, caseId: null, self: null, after: 0, peers: new Map(), stream: null, ice: [], polling: false, ended: false };
  async function paintVideo(node) {
    if (bridge.isDemo() || !bridge.caseId()) { node.innerHTML = demo('Salle vidéo'); return; }
    if (room.id && room.caseId === bridge.caseId()) { renderRoom(node); return; }
    const [status, history] = await Promise.all([api(`${caseBase()}/video`), api(`${caseBase()}/video/history`)]);
    const open = status.room;
    const past = history.rooms.filter(r => r.endedAt).slice(-5).reverse().map(r => `<li>${esc(when(r.createdAt))} → ${esc(when(r.endedAt))} · ${esc(r.attendance.map(a => `${a.subject} ${duration(a.totalSeconds)}`).join(', ') || '—')}</li>`).join('');
    node.innerHTML = `<div class="panel-heading"><div><h2>Salle vidéo du dossier</h2><p>Directement entre les navigateurs (jusqu’à 4 personnes). Arrivées et départs horodatés au journal.</p></div></div>
      <div class="panel-body">${open ? `<p>${pill('live', 'Salle ouverte')} depuis ${esc(when(open.createdAt))} · ${open.participants.length} présent${open.participants.length > 1 ? 's' : ''} ${esc(open.participants.map(p => p.subject).join(', '))}</p>` : '<p>Aucune salle ouverte.</p>'}
      <div class="tile-actions"><button type="button" class="button call small" data-live-action="video-join">${icon('video')}${open ? 'Rejoindre la salle' : 'Ouvrir et rejoindre'}</button></div>
      <p class="table-subtext">Le navigateur demande l’accès à la caméra et au micro. Rien n’est enregistré.</p>
      ${past ? `<h3 class="live-sub">Séances précédentes</h3><ul class="live-list">${past}</ul>` : ''}</div>`;
  }
  function renderRoom(node) {
    node.innerHTML = `<div class="panel-heading"><div><h2>Salle vidéo ${pill('live', 'En direct')}</h2><p>Vous êtes connecté. Les autres membres du dossier peuvent vous rejoindre.</p></div></div>
      <div class="panel-body"><div class="live-stage" id="live-stage"><figure class="live-tile is-self"><video id="live-self" autoplay playsinline muted></video><figcaption>Vous</figcaption></figure></div>
      <div class="tile-actions live-controls"><button type="button" class="button secondary small" data-live-action="video-mic" aria-pressed="true">${icon('mic')}Micro</button><button type="button" class="button secondary small" data-live-action="video-cam" aria-pressed="true">${icon('video')}Caméra</button>
      <button type="button" class="button small" data-live-action="video-leave">Quitter</button>${bridge.role() === 'client' ? '' : '<button type="button" class="button subtle small" data-live-action="video-end">Fermer la salle pour tous</button>'}</div></div>`;
    const self = document.getElementById('live-self');
    if (self && room.stream) self.srcObject = room.stream;
    for (const [subject, peer] of room.peers) attachRemote(subject, peer.stream);
  }
  function attachRemote(subject, stream) {
    const stage = document.getElementById('live-stage');
    if (!stage || !stream) return;
    let video = stage.querySelector(`video[data-peer="${CSS.escape(subject)}"]`);
    if (!video) {
      const figure = document.createElement('figure');
      figure.className = 'live-tile';
      video = document.createElement('video');
      video.autoplay = true; video.playsInline = true; video.dataset.peer = subject;
      const caption = document.createElement('figcaption'); caption.textContent = subject;
      figure.append(video, caption); stage.append(figure);
    }
    if (video.srcObject !== stream) video.srcObject = stream;
  }
  function dropRemote(subject) {
    const peer = room.peers.get(subject);
    if (peer) { try { peer.pc.close(); } catch { /* already closed */ } room.peers.delete(subject); }
    document.querySelector(`#live-stage video[data-peer="${CSS.escape(subject)}"]`)?.closest('figure')?.remove();
  }
  function peerFor(subject) {
    if (room.peers.has(subject)) return room.peers.get(subject);
    const pc = new RTCPeerConnection({ iceServers: room.ice });
    const peer = { pc, stream: null, pending: [] };
    room.peers.set(subject, peer);
    room.stream?.getTracks().forEach(track => pc.addTrack(track, room.stream));
    pc.onicecandidate = event => { if (event.candidate) void signal(subject, 'candidate', JSON.stringify(event.candidate)); };
    pc.ontrack = event => { peer.stream = event.streams[0]; attachRemote(subject, peer.stream); };
    pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState)) dropRemote(subject); };
    return peer;
  }
  async function signal(to, kind, payload) {
    if (!room.id) return;
    try { await post(`${caseBase()}/video/${room.id}/signal`, { to, kind, payload }); } catch { /* the peer left: dropped on the next poll */ }
  }
  async function videoJoin() {
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection !== 'function') { bridge.notify('Ce navigateur ne permet pas la vidéo.', true); return; }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 } } }); }
    catch { bridge.notify('Accès à la caméra ou au micro refusé. Autorisez-le dans le navigateur pour rejoindre la salle.', true); return; }
    try {
      const opened = await post(`${caseBase()}/video`);
      const joined = await post(`${caseBase()}/video/${opened.room.id}/join`);
      Object.assign(room, { id: opened.room.id, caseId: bridge.caseId(), self: joined.self, after: joined.after, stream, ice: joined.iceServers || [], ended: false });
      bridge.refresh();
      // The newcomer calls everyone already present; the others answer.
      for (const p of joined.room.participants.filter(p => !p.self)) {
        const peer = peerFor(p.subject);
        const offer = await peer.pc.createOffer();
        await peer.pc.setLocalDescription(offer);
        await signal(p.subject, 'offer', JSON.stringify(peer.pc.localDescription));
      }
      void pollLoop();
    } catch (error) { stream.getTracks().forEach(t => t.stop()); bridge.notify(error.message, true); }
  }
  async function handleSignal(s) {
    let data = null;
    try { data = s.payload ? JSON.parse(s.payload) : null; } catch { return; }
    if (s.kind === 'bye') { dropRemote(s.fromSubject); return; }
    const peer = peerFor(s.fromSubject);
    if (s.kind === 'offer') {
      await peer.pc.setRemoteDescription(data);
      for (const c of peer.pending.splice(0)) await peer.pc.addIceCandidate(c).catch(() => {});
      const answer = await peer.pc.createAnswer();
      await peer.pc.setLocalDescription(answer);
      await signal(s.fromSubject, 'answer', JSON.stringify(peer.pc.localDescription));
    } else if (s.kind === 'answer') {
      await peer.pc.setRemoteDescription(data);
      for (const c of peer.pending.splice(0)) await peer.pc.addIceCandidate(c).catch(() => {});
    } else if (s.kind === 'candidate') {
      if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(data).catch(() => {});
      else peer.pending.push(data);
    }
  }
  async function pollLoop() {
    if (room.polling) return;
    room.polling = true;
    while (room.id) {
      try {
        const result = await post(`${caseBase()}/video/${room.id}/poll`, { after: room.after });
        if (result.ended) { bridge.notify('La salle vidéo a été fermée.'); videoCleanup(); break; }
        room.after = result.after;
        for (const s of result.signals) await handleSignal(s).catch(() => {});
        const present = new Set(result.participants.map(p => p.subject));
        for (const subject of [...room.peers.keys()]) if (!present.has(subject)) dropRemote(subject);
      } catch { /* transient network error: try again */ }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    room.polling = false;
  }
  function videoCleanup() {
    for (const subject of [...room.peers.keys()]) dropRemote(subject);
    room.stream?.getTracks().forEach(t => t.stop());
    Object.assign(room, { id: null, caseId: null, stream: null, after: 0 });
    bridge.refresh();
  }
  async function videoLeave(endForAll) {
    const id = room.id;
    if (!id) return;
    for (const subject of room.peers.keys()) await signal(subject, 'bye', '');
    try { await post(`${caseBase()}/video/${id}/${endForAll ? 'end' : 'leave'}`); } catch (error) { bridge.notify(error.message, true); }
    videoCleanup();
  }
  function toggleTrack(kind, button) {
    const tracks = kind === 'mic' ? room.stream?.getAudioTracks() : room.stream?.getVideoTracks();
    if (!tracks?.length) return;
    const on = !tracks[0].enabled;
    tracks.forEach(t => { t.enabled = on; });
    button.setAttribute('aria-pressed', String(on));
  }
  // Closing the tab without « Quitter » ends the presence by itself: the server drops a person unseen for 20 seconds.

  // ---------- Dossier : journal scellé et actes ----------
  async function paintJournal(node) {
    if (bridge.isDemo() || !bridge.caseId()) { node.innerHTML = demo('Journal horodaté'); return; }
    if (bridge.role() === 'client') { node.innerHTML = `<div class="panel-heading"><div><h2>Journal horodaté</h2><p>Réservé à l’avocat du dossier.</p></div></div>`; return; }
    const journal = await api(`${caseBase()}/journal`);
    const rows = journal.events.slice(0, 40).map(e => `<tr><td class="mono">${e.position}</td><td class="mono">${esc(e.createdAt.replace('T', ' ').slice(0, 19))}</td><td>${esc(e.subject)}</td><td>${esc(e.action)}</td><td class="mono" title="${esc(e.chain)}">${esc(e.chain.slice(0, 12))}…</td></tr>`).join('');
    node.innerHTML = `<div class="panel-heading"><div><h2>Journal horodaté et scellé</h2><p>${journal.total} événement${journal.total > 1 ? 's' : ''}, chaînés par SHA-256 dans l’ordre d’insertion. Empreinte de tête : <span class="mono">${esc(journal.head.slice(0, 16))}…</span></p></div>
      <div class="tile-actions"><button type="button" class="button secondary small" data-live-action="journal-verify">${icon('check')}Vérifier</button><button type="button" class="button small" data-live-action="journal-seal">${icon('lock')}Sceller maintenant</button></div></div>
      <div class="panel-body"><div id="live-verdict"></div>${rows ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Horodatage (UTC)</th><th>Personne</th><th>Action</th><th>Chaîne</th></tr></thead><tbody>${rows}</tbody></table></div>` : empty('Aucun événement.')}</div>`;
  }
  async function paintDocuments(node) {
    if (bridge.isDemo() || !bridge.caseId()) { node.innerHTML = demo('Actes et documents'); return; }
    const catalog = await api(`${caseBase()}/generate`);
    if (!catalog.canGenerate) { node.innerHTML = `<div class="panel-heading"><div><h2>Actes et documents</h2><p>Les documents générés par l’avocat apparaissent dans les pièces du dossier.</p></div></div>`; return; }
    const kinds = catalog.kinds.filter(k => !['template', 'call_record'].includes(k.id));
    node.innerHTML = `<div class="panel-heading"><div><h2>Actes et documents</h2><p>PDF établis à partir des données du dossier, versés aux pièces avec l’état « À vérifier ». Aucun texte juridique n’est inventé.</p></div></div>
      <div class="panel-body"><div class="live-grid">${kinds.map(k => `<button type="button" class="live-doc" data-live-action="generate" data-kind="${esc(k.id)}">${icon('document')}<strong>${esc(k.label)}</strong><small>${esc(k.description)}</small></button>`).join('')}</div>
      <details class="live-template"><summary>Document à partir de votre gabarit</summary><form data-live-form="template" class="live-form"><div class="field"><label for="live-tpl-title">Titre</label><input id="live-tpl-title" name="title" maxlength="160" required></div>
      <div class="field"><label for="live-tpl-body">Texte (votre rédaction)</label><textarea id="live-tpl-body" name="body" rows="8" maxlength="20000" required placeholder="Dossier {{dossier.titre}} ({{dossier.reference}}), le {{date}}.&#10;&#10;Pièces :&#10;{{pieces}}"></textarea><small>Champs remplis par le portail : {{dossier.titre}}, {{dossier.reference}}, {{date}}, {{auteur}}, {{pieces}}.</small></div>
      <p class="form-error" role="alert" hidden></p><div class="form-actions"><button class="button small" type="submit">Générer le PDF</button></div></form></details></div>`;
  }

  // ---------- Équipe ----------
  async function paintTeam(node) {
    if (bridge.isDemo()) { node.innerHTML = demo('Console Équipe'); return; }
    let team;
    try { team = await api('/api/telephony/team'); }
    catch { node.innerHTML = `<div class="panel-heading"><div><h2>Équipe · appel de groupe</h2><p>Réservé aux avocats du groupe Équipe.</p></div></div><div class="panel-body"><p>Une personne qui appelle le numéro public de BesoinAvocat fait sonner en même temps les avocats disponibles du groupe; le premier qui appuie sur 1 prend l’appel. Pour en faire partie, l’administration ajoute votre identifiant au groupe.</p></div>`; return; }
    const o = await overview();
    const members = team.members.map(m => `<li class="queue-item"><span class="queue-icon">${icon('team')}</span><span class="queue-text"><strong>${esc(m.subject)}${m.self ? ' (vous)' : ''}</strong><small>${m.registered ? `${m.linked ? 'compte MIMT relié' : 'compte MIMT non relié'}${m.mobile ? ` · cellulaire ${esc(m.mobile)}` : ''}` : 'téléphonie MIMT non activée'}</small></span>${m.availability ? pill(m.availability === 'available' ? 'ok' : 'wait', AVAILABILITY[m.availability] || m.availability) : pill('off', 'Absent du groupe')}</li>`).join('');
    const calls = team.calls.map(c => `<tr><td>${esc(when(c.createdAt))}</td><td>${c.kind === 'team_callback' ? 'Rappel' : 'Entrant'}</td><td class="mono">${esc(c.externalNumber || '—')}</td><td>${pill(c.status === 'completed' ? 'ok' : FINAL.has(c.status) ? 'warn' : 'live', STATUS[c.status] || c.status)}</td><td>${esc(c.answeredBy || c.callerSubject || '—')}</td><td class="mono">${esc(duration(c.durationSeconds))}</td>
      <td class="live-actions">${c.kind === 'team_inbound' && c.status !== 'completed' ? `<button type="button" class="button call small" data-live-action="team-callback" data-id="${esc(c.id)}">${icon('phone')}Rappeler</button>` : ''}${c.hasRecording ? `<button type="button" class="button subtle small" data-live-action="team-listen" data-id="${esc(c.id)}">${icon('play')}Écouter</button>` : ''}</td></tr>`).join('');
    node.innerHTML = `<div class="panel-heading"><div><h2>Équipe · appel de groupe</h2><p>Numéro public ${esc(team.publicNumber || 'à configurer')} · groupe MIMT « ${esc(team.huntGroup)} » · ${team.availableNow} disponible${team.availableNow > 1 ? 's' : ''} maintenant</p></div>
      <div class="tile-actions"><button type="button" class="button small" data-live-action="team-sync"${team.configured ? '' : ' disabled'}>${icon('rotate')}Synchroniser le groupe</button><button type="button" class="button secondary small" data-live-action="team-calls"${team.configured ? '' : ' disabled'}>Rattraper les appels</button><button type="button" class="button secondary small" data-live-action="team-credits"${team.configured ? '' : ' disabled'}>Crédits</button></div></div>
      <div class="panel-body">${team.configured ? '' : notConnected(o)}
      <div class="live-grid"><div class="live-card"><h4>Groupe dans MIMT</h4><p>${team.group ? `${team.group.members} avocat${team.group.members > 1 ? 's' : ''} · synchronisé le ${esc(when(team.group.syncedAt))}` : 'Pas encore synchronisé.'}</p></div>
      <div class="live-card"><h4>Crédits MIMT</h4><p class="live-big mono">${team.credits?.balance ?? '—'}</p><p class="table-subtext">${team.credits ? `${team.credits.creditPerMinute} crédit(s) par minute · lu le ${esc(when(team.credits.at))}` : 'Appuyez sur « Crédits » pour lire le solde.'}</p></div></div>
      <h3 class="live-sub">Avocats du groupe</h3><ul class="queue-list">${members}</ul>
      <h3 class="live-sub">Appels récents</h3>${calls ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Type</th><th>Numéro</th><th>État</th><th>Avocat</th><th>Durée</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${calls}</tbody></table></div>` : empty('Aucun appel reçu.')}
      <div id="live-player" class="live-player" hidden></div></div>`;
    schedule('team', team.calls.some(c => !FINAL.has(c.status)) ? 5000 : 30000, node);
  }


  // ---------- Pièces demandées et accueil client ----------
  const REQUEST_STATUS = { requested: ['wait', 'Demandée'], provided: ['warn', 'À vérifier par l’avocat'], accepted: ['ok', 'Acceptée'], cancelled: ['off', 'Annulée'] };
  const requests = { data: null };
  async function loadRequests(force = false) {
    if (bridge.isDemo()) return { requests: [], canRequest: false, open: 0, toReview: 0, demo: true };
    if (!requests.data || force || requests.data.caseId !== bridge.caseId()) requests.data = { caseId: bridge.caseId(), ...(await api(`${caseBase()}/requests`)) };
    return requests.data;
  }
  function requestCard(r, list) {
    const [tone, label] = REQUEST_STATUS[r.status];
    const due = r.dueDate ? `<span class="${r.overdue ? 'live-late' : 'table-subtext'}">Échéance : ${esc(r.dueDate)}${r.overdue ? ' (dépassée)' : ''}</span>` : '';
    const docs = (bridge.documents() || []).slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const attached = r.documentId ? `<p>Pièce jointe : <button type="button" class="text-button" data-action="open-file" data-id="${esc(r.documentId)}">${esc(r.documentName || 'pièce du dossier')}</button></p>` : '';
    const answer = r.answer ? `<p class="live-quote">${esc(r.answer)}</p>` : '';
    let actions = '';
    if (!list.canRequest && ['requested', 'provided'].includes(r.status) && bridge.canMutate()) {
      const options = docs.map(d => `<option value="${esc(d.id)}"${d.id === r.documentId ? ' selected' : ''}>${esc(d.name)}</option>`).join('');
      actions = `<form data-live-form="request-provide" data-id="${esc(r.id)}" class="live-form"><div class="form-grid">
        <div class="field"><label for="rq-doc-${esc(r.id)}">Pièce du dossier</label><select id="rq-doc-${esc(r.id)}" name="documentId"><option value="">Aucune, je réponds par écrit</option>${options}</select></div>
        <div class="field"><label for="rq-ans-${esc(r.id)}">Message à votre avocat (facultatif)</label><input id="rq-ans-${esc(r.id)}" name="answer" maxlength="2000"></div></div>
        <p class="form-error" role="alert" hidden></p><div class="form-actions"><button type="button" class="button secondary small" data-action="upload">${icon('upload')}Téléverser d’abord</button><button class="button small" type="submit">${r.status === 'provided' ? 'Remplacer ma réponse' : 'Envoyer à mon avocat'}</button></div></form>`;
    } else if (list.canRequest && bridge.canMutate()) {
      if (r.status === 'provided') actions = `<div class="tile-actions"><button type="button" class="button small" data-live-action="request-accept" data-id="${esc(r.id)}">${icon('check')}Accepter</button><button type="button" class="button secondary small" data-live-action="request-reopen" data-id="${esc(r.id)}">Redemander</button></div>`;
      else if (r.status === 'requested') actions = `<div class="tile-actions"><button type="button" class="button subtle small" data-live-action="request-cancel" data-id="${esc(r.id)}">Annuler la demande</button></div>`;
      else if (r.status === 'cancelled') actions = `<div class="tile-actions"><button type="button" class="button subtle small" data-live-action="request-reopen" data-id="${esc(r.id)}">Rouvrir</button></div>`;
    }
    return `<article class="live-card live-request" id="request-${esc(r.id)}"><h4>${icon('document')}${esc(r.title)} ${pill(tone, label)}</h4>${r.note ? `<p>${esc(r.note)}</p>` : ''}${due}${attached}${answer}
      <small class="table-subtext">Demandée le ${esc(when(r.createdAt))} · mise à jour le ${esc(when(r.updatedAt))}</small>${actions}</article>`;
  }
  async function paintRequests(node) {
    if (!bridge.caseId()) { node.innerHTML = `<div class="panel-body">${empty('Choisissez un dossier.')}</div>`; return; }
    const list = await loadRequests();
    const head = `<div class="panel-heading"><div><h2>Pièces demandées</h2><p>${list.demo ? 'Aperçu' : list.canRequest ? `${list.open} en attente du client · ${list.toReview} à vérifier` : list.open ? `${list.open} pièce${list.open > 1 ? 's' : ''} attendue${list.open > 1 ? 's' : ''} par votre avocat` : 'Rien n’est attendu de vous pour l’instant'}</p></div></div>`;
    const form = list.canRequest && bridge.canMutate() ? `<details class="live-template"><summary>Demander une pièce au client</summary><form data-live-form="request-create" class="live-form"><div class="form-grid">
      <div class="field"><label for="rq-title">Pièce demandée</label><input id="rq-title" name="title" maxlength="200" required placeholder="Ex. : bail signé, avis de cotisation 2025"></div>
      <div class="field"><label for="rq-due">Échéance (facultatif)</label><input id="rq-due" name="dueDate" type="date"></div></div>
      <div class="field"><label for="rq-note">Précisions pour le client (facultatif)</label><textarea id="rq-note" name="note" rows="3" maxlength="2000"></textarea></div>
      <p class="form-error" role="alert" hidden></p><div class="form-actions"><button class="button small" type="submit">Envoyer la demande</button></div></form></details>` : '';
    const items = list.requests.filter(r => r.status !== 'cancelled' || list.canRequest);
    node.innerHTML = `${head}<div class="panel-body">${form}${items.length ? `<div class="live-stack">${items.map(r => requestCard(r, list)).join('')}</div>` : empty(list.demo ? 'L’aperçu n’appelle aucun service.' : 'Aucune pièce demandée dans ce dossier.')}</div>`;
  }
  async function paintClientHome(node) {
    const list = await loadRequests().catch(() => ({ requests: [], open: 0 }));
    const open = list.requests.filter(r => r.status === 'requested');
    const next = bridge.nextMeeting();
    const docs = bridge.documents() || [];
    const step = open.length
      ? { tone: 'wait', title: `Votre avocat attend ${open.length === 1 ? 'une pièce' : `${open.length} pièces`}`, text: open[0].title + (open[0].dueDate ? `, d’ici le ${open[0].dueDate}` : ''), action: `<button type="button" class="button small" data-live-action="request-focus" data-id="${esc(open[0].id)}">${icon('upload')}Envoyer cette pièce</button>` }
      : next ? { tone: 'ok', title: 'Prochain rendez-vous', text: when(next.scheduledAt) + (next.title ? ` · ${next.title}` : ''), action: '<button type="button" class="button small" data-view="communications">Voir le rendez-vous</button>' }
      : { tone: 'ok', title: 'Rien à faire pour l’instant', text: 'Votre avocat vous écrira ici. Vous pouvez ajouter une pièce ou lui écrire en tout temps.', action: '' };
    const tile = (attrs, glyph, title, sub) => `<button type="button" class="client-action" ${attrs}><span class="client-action-icon">${icon(glyph)}</span><strong>${esc(title)}</strong><small>${esc(sub)}</small></button>`;
    const mutate = bridge.canMutate() ? '' : ' disabled';
    node.innerHTML = `<div class="client-next" data-tone="${step.tone}"><span class="eyebrow">VOTRE PROCHAINE ÉTAPE</span><h2>${esc(step.title)}</h2><p>${esc(step.text)}</p>${step.action}</div>
      <div class="client-actions" role="group" aria-label="Actions principales">${tile(`data-action="upload"${mutate}`, 'upload', 'Envoyer une pièce', 'Photo, PDF ou document')}${tile('data-view="messages"', 'message', 'Écrire à mon avocat', 'Réponse dans le dossier')}${tile('data-view="live"', 'phone', 'Appel ou vidéo', 'Par MIMT ou dans le portail')}${tile('data-view="communications"', 'calendar', 'Mes rendez-vous', next ? when(next.scheduledAt) : 'Aucun planifié')}</div>
      <p class="client-foot">${docs.length} pièce${docs.length > 1 ? 's' : ''} au dossier. BesoinAvocat n’est pas un cabinet d’avocats et ne donne aucun conseil juridique.</p>`;
  }


  // ---------- Échéances du dossier ----------
  // Every date is typed by the lawyer; the portal never computes a legal delay. Clients see only what is shared.
  const deadlines = { data: null, week: null };
  const DEADLINE_STATUS = { open: ['wait', 'À venir'], done: ['ok', 'Faite'], cancelled: ['off', 'Annulée'] };
  const daysText = d => (d.status !== 'open' ? '' : d.daysLeft < 0 ? `dépassée de ${-d.daysLeft} j` : d.daysLeft === 0 ? 'aujourd’hui' : d.daysLeft === 1 ? 'demain' : `dans ${d.daysLeft} j`);
  async function loadDeadlines(force = false) {
    if (bridge.isDemo()) return { deadlines: [], canEdit: false, kinds: {}, demo: true };
    if (!deadlines.data || force || deadlines.data.caseId !== bridge.caseId()) deadlines.data = { caseId: bridge.caseId(), ...(await api(`${caseBase()}/deadlines`)) };
    return deadlines.data;
  }
  async function loadWeek(force = false) {
    if (bridge.isDemo()) return null;
    if (!deadlines.week || force) deadlines.week = await api('/api/deadlines/upcoming?days=7');
    return deadlines.week;
  }
  function deadlineCard(d, list) {
    const [tone, label] = DEADLINE_STATUS[d.status];
    const time = d.dueTime ? ` à ${esc(d.dueTime)}` : '';
    const edit = list.canEdit && bridge.canMutate();
    const actions = !edit ? '' : d.status === 'open'
      ? `<div class="tile-actions"><button type="button" class="button small" data-live-action="deadline-done" data-id="${esc(d.id)}">${icon('check')}Marquer faite</button><button type="button" class="button subtle small" data-live-action="deadline-cancel" data-id="${esc(d.id)}">Annuler</button></div>`
      : `<div class="tile-actions"><button type="button" class="button subtle small" data-live-action="deadline-reopen" data-id="${esc(d.id)}">Rouvrir</button></div>`;
    return `<article class="live-card live-deadline" data-tone="${d.overdue ? 'late' : tone}"><div class="live-card-head"><strong>${esc(d.title)}</strong>${pill(d.overdue ? 'warn' : tone, d.overdue ? 'Dépassée' : label)}</div>
      <p><span class="mono">${esc(d.dueDate)}</span>${time} · ${esc(d.kindLabel)}${d.status === 'open' ? ` · <span class="${d.overdue ? 'live-late' : 'table-subtext'}">${esc(daysText(d))}</span>` : ''}${list.canEdit ? ` · <span class="table-subtext">${d.visibleToClient ? 'visible par le client' : 'interne'}</span>` : ''}</p>
      ${d.note ? `<p class="live-quote">${esc(d.note)}</p>` : ''}${actions}</article>`;
  }
  async function paintDeadlines(node) {
    if (!bridge.caseId()) { node.innerHTML = `<div class="panel-body">${empty('Choisissez un dossier.')}</div>`; return; }
    const list = await loadDeadlines();
    if (list.demo) { node.innerHTML = demo('Échéances du dossier'); return; }
    const open = list.deadlines.filter(d => d.status === 'open');
    const late = open.filter(d => d.overdue).length;
    const head = `<div class="panel-heading"><div><h2>Échéances du dossier</h2><p>${open.length ? `${open.length} à venir${late ? ` · ${late} dépassée${late > 1 ? 's' : ''}` : ''}` : 'Aucune échéance ouverte'}${list.canEdit ? '. Dates saisies par l’avocat, qui en reste responsable.' : '. Dates communiquées par votre avocat.'}</p></div>${open.length ? '<button type="button" class="button secondary small" data-live-action="deadline-ics">' + icon('calendar') + 'Ajouter à mon calendrier</button>' : ''}</div>`;
    const kinds = Object.entries(list.kinds || {});
    const form = list.canEdit && bridge.canMutate() ? `<details class="live-template"><summary>Ajouter une échéance</summary><form data-live-form="deadline-create" class="live-form"><div class="form-grid">
      <div class="field"><label for="dl-title">Intitulé</label><input id="dl-title" name="title" maxlength="200" required placeholder="Ex. : audience au fond, dépôt de la défense"></div>
      <div class="field"><label for="dl-kind">Type</label><select id="dl-kind" name="kind">${kinds.map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join('')}</select></div>
      <div class="field"><label for="dl-date">Date</label><input id="dl-date" name="dueDate" type="date" required></div>
      <div class="field"><label for="dl-time">Heure (facultatif)</label><input id="dl-time" name="dueTime" type="time"></div></div>
      <div class="field"><label for="dl-note">Note (facultatif)</label><textarea id="dl-note" name="note" rows="2" maxlength="2000"></textarea></div>
      <label class="check"><input type="checkbox" name="visibleToClient"> Le client voit cette échéance dans son dossier</label>
      <p class="form-error" role="alert" hidden></p><div class="form-actions"><button class="button small" type="submit">Enregistrer</button></div></form></details>` : '';
    const shown = list.canEdit ? list.deadlines : open;
    node.innerHTML = `${head}<div class="panel-body">${form}${shown.length ? `<div class="live-stack">${shown.map(d => deadlineCard(d, list)).join('')}</div>` : empty(list.canEdit ? 'Aucune échéance dans ce dossier.' : 'Votre avocat n’a communiqué aucune date pour l’instant.')}</div>`;
  }
  async function paintWeek(node) {
    if (bridge.isDemo()) { node.innerHTML = '<p class="drawer-empty">L’aperçu n’appelle aucun service.</p>'; return; }
    const week = await loadWeek(true);
    syncWeekChip();
    node.innerHTML = week.deadlines.length ? `<ul class="drawer-list">${week.deadlines.map(d => `<li><span class="queue-icon">${icon('calendar')}</span><span class="queue-text"><strong>${esc(d.title)}</strong><small>${esc(d.dueDate)}${d.dueTime ? ` ${esc(d.dueTime)}` : ''} · ${esc(d.kindLabel)} · ${esc(d.caseReference || d.caseTitle)} · ${esc(daysText(d))}</small></span></li>`).join('')}</ul><p class="drawer-note">Échéances ouvertes dans vos dossiers, jusqu’à 7 jours, y compris celles dépassées. Dates saisies par les avocats.</p>`
      : '<p class="drawer-empty">Aucune échéance ouverte dans les 7 prochains jours.</p>';
  }
  // The « Échéances · 7 jours » dial of the cockpit: filled once the count is read from the server.
  function syncWeekChip() {
    const count = deadlines.week ? String(deadlines.week.deadlines.length) : null;
    for (const chip of document.querySelectorAll('[data-panel="echeances"].chip')) {
      if (count === null) continue;
      chip.classList.remove('is-soon');
      const soon = chip.querySelector('.chip-soon, .chip-value');
      if (soon) { soon.className = 'chip-value'; soon.textContent = count; }
    }
  }

  // « Nouvelles demandes » dial, for the BesoinAvocat intake team only (BESOINAVOCAT_INTAKE_REVIEWERS): requests
  // received on the public page and not yet handled. Nothing is shown to anyone else, and no contact detail is read.
  const intakes = { counts: null };
  async function loadIntakes(force = false) {
    if (bridge.isDemo() || !bridge.intakeReviewer()) return null;
    if (!intakes.counts || force) intakes.counts = (await api('/api/intakes?status=received&limit=1')).counts;
    return intakes.counts;
  }
  function syncIntakeChip() {
    if (!intakes.counts) return;
    for (const chip of document.querySelectorAll('[data-panel="demandes"].chip')) {
      chip.classList.remove('is-soon');
      const value = chip.querySelector('.chip-soon, .chip-value');
      if (value) { value.className = 'chip-value'; value.textContent = String(intakes.counts.received ?? 0); }
    }
  }
  async function paintIntakes(node) {
    const counts = await loadIntakes(true);
    syncIntakeChip();
    const label = { received: 'Reçues, à traiter', in_review: 'En traitement', contacted: 'Personne recontactée', closed: 'Fermées', spam: 'Indésirables' };
    node.innerHTML = `<ul class="drawer-list">${Object.entries(label).filter(([k]) => counts[k] !== undefined).map(([k, v]) => `<li><span class="queue-icon">${icon('inbox')}</span><span class="queue-text"><strong>${esc(v)} : ${esc(counts[k])}</strong></span></li>`).join('')}</ul>
      <p class="drawer-note">Demandes déposées sur la page publique, visibles seulement par l’équipe BesoinAvocat. Elles ne sont transmises à aucun avocat.</p><div class="tile-actions"><a class="button small" href="/demandes">Ouvrir la file des demandes ${icon('arrow')}</a></div>`;
  }

  // ---------- Abonnement de l'avocat (Stripe) ----------
  const MEMBERSHIP_STATUS = { active: ['ok', 'Actif'], trialing: ['ok', 'Essai'], past_due: ['warn', 'Paiement en retard'], unpaid: ['warn', 'Impayé'], incomplete: ['wait', 'En attente de paiement'], incomplete_expired: ['off', 'Expiré'], canceled: ['off', 'Terminé'], paused: ['off', 'En pause'], none: ['off', 'Aucun'] };
  const INTERVAL = { week: 'semaine', month: 'mois', year: 'an', day: 'jour' };
  const money = (cents, currency) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency }).format(cents / 100);
  async function paintMembership(node) {
    if (bridge.isDemo()) { node.innerHTML = demo('Abonnement à la plateforme'); return; }
    const o = await api('/api/membership');
    if (!o.eligible) { node.hidden = true; node.innerHTML = ''; return; }
    node.hidden = false;
    const head = `<div class="panel-heading"><div><h2>Abonnement à la plateforme</h2><p>Pour les avocats. Payé chez Stripe; BesoinAvocat ne voit jamais votre carte.</p></div></div>`;
    if (!o.configured) { node.innerHTML = `${head}<div class="panel-body"><div class="callout">${icon('info')}<p><strong>Abonnement par Stripe à raccorder</strong>Aucun paiement n’est possible pour l’instant. Variables à renseigner dans Coolify : ${esc(o.missing.join(', '))}.</p></div></div>`; return; }
    const m = o.membership, [tone, label] = MEMBERSHIP_STATUS[m.status] || ['off', m.status];
    const status = `<p>${pill(tone, label)}${m.plan ? ` Forfait ${m.plan === 'weekly' ? 'hebdomadaire' : 'mensuel'}` : ''}${m.currentPeriodEnd ? ` · ${m.cancelAtPeriodEnd ? 'se termine' : 'renouvellement'} le ${esc(when(m.currentPeriodEnd))}` : ''}</p>`;
    const manage = m.canManage ? `<button type="button" class="button secondary small" data-live-action="membership-portal">Gérer mon abonnement chez Stripe</button>` : '';
    const plans = m.active ? '' : `<div class="live-grid">${o.plans.map(p => `<div class="live-card"><h4>${p.plan === 'weekly' ? 'Hebdomadaire' : 'Mensuel'}</h4><p class="live-big mono">${esc(money(p.amountCents, p.currency))}</p><p class="table-subtext">par ${p.intervalCount > 1 ? `${p.intervalCount} ` : ''}${esc(INTERVAL[p.interval] || p.interval)}, taxes calculées par Stripe</p><div class="tile-actions"><button type="button" class="button small" data-live-action="membership-checkout" data-plan="${esc(p.plan)}">S’abonner</button></div></div>`).join('') || empty('Les forfaits n’ont pas pu être lus chez Stripe.')}</div>`;
    node.innerHTML = `${head}<div class="panel-body">${o.mode === 'test' ? '<p class="table-subtext">Mode test de Stripe : aucun vrai paiement.</p>' : ''}${status}${plans}<div class="tile-actions">${manage}</div>
      <p class="table-subtext">L’abonnement couvre l’accès des avocats à la plateforme. Aucun paiement de client, aucune avance d’honoraires et aucune commission sur vos honoraires ne passent par BesoinAvocat.</p></div>`;
  }

  // ---------- Abonnement agenda privé (lien iCal secret) ----------
  let feedLink = null;
  const FEED_DETAIL = { discreet: 'Discret : type et référence du dossier seulement', full: 'Complet : titres et notes inclus' };
  async function paintCalendarFeed(node) {
    if (bridge.isDemo()) { node.innerHTML = demo('Abonnement agenda'); return; }
    const o = await api('/api/calendar-feed');
    const head = `<div class="panel-heading"><div><h2>Abonnement agenda</h2><p>Vos échéances et rendez-vous dans Outlook, Google Agenda ou Apple Calendrier, mis à jour automatiquement.</p></div></div>`;
    if (!o.enabled) { node.innerHTML = `${head}<div class="panel-body"><div class="callout">${icon('info')}<p><strong>Abonnement agenda à activer</strong>Variables à renseigner dans Coolify : ${esc(o.missing.join(', '))}. En attendant, chaque dossier offre l’export .ics de ses échéances.</p></div></div>`; return; }
    const select = `<label class="field-inline">Détail <select id="feed-detail">${o.details.map(d => `<option value="${esc(d)}"${(o.feed?.detail || 'discreet') === d ? ' selected' : ''}>${esc(FEED_DETAIL[d] || d)}</option>`).join('')}</select></label>`;
    const fresh = feedLink ? `<div class="callout success">${icon('check')}<p><strong>Votre lien privé</strong>Copiez-le maintenant : il ne sera plus affiché. Collez-le dans votre agenda (« Ajouter un agenda par URL » ou « S’abonner »).</p></div>
      <p><input class="mono" id="feed-url" type="text" readonly value="${esc(feedLink.url)}" aria-label="Lien privé de l’agenda"></p>
      <div class="tile-actions"><button type="button" class="button small" data-live-action="feed-copy">Copier le lien</button><a class="button secondary small" href="${esc(feedLink.webcalUrl)}">Ouvrir dans mon agenda</a></div>` : '';
    const state = o.feed ? `<p>${pill('ok', 'Actif')} Créé le ${esc(when(o.feed.createdAt))} · ${esc(o.feed.detail === 'full' ? 'complet' : 'discret')}${o.feed.lastFetchedAt ? ` · dernière lecture par votre agenda le ${esc(when(o.feed.lastFetchedAt))}` : ' · pas encore lu par un agenda'}</p>` : `<p>${pill('off', 'Aucun lien')}</p>`;
    const actions = `<div class="tile-actions">${select}<button type="button" class="button small" data-live-action="feed-create">${o.feed ? 'Remplacer le lien' : 'Créer mon lien'}</button>${o.feed ? '<button type="button" class="button subtle small" data-live-action="feed-revoke">Désactiver</button>' : ''}</div>`;
    node.innerHTML = `${head}<div class="panel-body">${state}${fresh}${actions}
      <p class="table-subtext">Ce lien donne accès à votre agenda sans mot de passe : ne le partagez pas. Remplacez-le ou désactivez-le en tout temps; l’ancien cesse aussitôt. Les liens de visioconférence n’y figurent jamais. En mode discret, votre fournisseur d’agenda ne reçoit ni nom de client ni note.</p></div>`;
  }

  // ---------- Painting, refresh and events ----------
  const PAINTERS = { phone: paintPhone, 'case-calls': paintCalls, 'case-video': paintVideo, 'case-journal': paintJournal, 'case-documents': paintDocuments, team: paintTeam, 'case-requests': paintRequests, 'client-home': paintClientHome, membership: paintMembership, 'case-deadlines': paintDeadlines, 'deadline-week': paintWeek, 'intake-counts': paintIntakes, 'calendar-feed': paintCalendarFeed };
  async function paint(node) {
    const painter = PAINTERS[node.dataset.live];
    if (!painter) return;
    node.setAttribute('aria-busy', 'true');
    try { await painter(node); }
    catch (error) { node.innerHTML = `<div class="panel-body">${errorBox(error)}</div>`; }
    finally { node.removeAttribute('aria-busy'); }
  }
  function schedule(key, ms, node) {
    clearTimeout(timers.get(key));
    if (!ms) return;
    timers.set(key, setTimeout(() => { if (node.isConnected && !node.contains(document.activeElement)) void paint(node); }, ms));
  }
  function afterRender(root) {
    if (!bridge.isDemo() && document.querySelector('[data-panel="echeances"].chip')) {
      if (deadlines.week) syncWeekChip(); else loadWeek().then(syncWeekChip, () => {});
    }
    if (!bridge.isDemo() && bridge.intakeReviewer() && document.querySelector('[data-panel="demandes"].chip')) {
      if (intakes.counts) syncIntakeChip(); else loadIntakes().then(syncIntakeChip, () => {});
    }
    for (const node of root.querySelectorAll('[data-live]')) {
      if (!node.querySelector('.panel-body, .panel-heading')) node.innerHTML = `<div class="panel-body"><p class="table-subtext">Chargement…</p></div>`;
      void paint(node);
    }
  }
  const repaint = selector => { const node = document.querySelector(`[data-live="${selector}"]`); if (node) void paint(node); };
  async function play(path) {
    const player = document.getElementById('live-player');
    if (!player) return;
    const blob = await api(path, { asBlob: true });
    const url = URL.createObjectURL(blob);
    player.hidden = false;
    player.innerHTML = '<audio controls autoplay></audio><button type="button" class="button subtle small" data-live-action="player-close">Fermer</button>';
    const audio = player.querySelector('audio');
    audio.src = url;
    audio.addEventListener('emptied', () => URL.revokeObjectURL(url), { once: true });
  }
  async function act(action, button) {
    const id = button.dataset.id;
    if (action === 'phone-remove') { cache.overview = await post('/api/telephony/phone/remove'); repaint('phone'); }
    else if (action === 'member-link') { cache.link = await post('/api/telephony/member/link'); repaint('phone'); }
    else if (action === 'member-refresh') { cache.overview = await post('/api/telephony/member/refresh'); if (cache.overview.member?.linked) cache.link = null; repaint('phone'); }
    else if (action === 'membership-checkout') { const { url } = await post('/api/membership/checkout', { plan: button.dataset.plan }); window.location.assign(url); }
    else if (action === 'membership-portal') { const { url } = await post('/api/membership/portal'); window.location.assign(url); }
    else if (action === 'request-focus') { const card = document.getElementById(`request-${id}`); card?.scrollIntoView({ behavior: 'smooth', block: 'center' }); card?.querySelector('select, input, button')?.focus({ preventScroll: true }); }
    else if (['request-accept', 'request-reopen', 'request-cancel'].includes(action)) {
      await post(`${caseBase()}/requests/${encodeURIComponent(id)}/decide`, { decision: action.slice(8) });
      await loadRequests(true); repaint('case-requests'); repaint('client-home');
      bridge.notify({ accept: 'Pièce acceptée.', reopen: 'Demande rouverte.', cancel: 'Demande annulée.' }[action.slice(8)]);
    }
    else if (['deadline-done', 'deadline-reopen', 'deadline-cancel'].includes(action)) {
      const step = action.slice(9);
      await post(`${caseBase()}/deadlines/${encodeURIComponent(id)}/${step}`);
      await loadDeadlines(true); deadlines.week = null; repaint('case-deadlines'); loadWeek().then(syncWeekChip, () => {});
      bridge.notify({ done: 'Échéance marquée faite.', reopen: 'Échéance rouverte.', cancel: 'Échéance annulée.' }[step]);
    }
    else if (action === 'deadline-ics') {
      const blob = await api(`${caseBase()}/deadlines.ics`, { asBlob: true });
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = 'echeances.ics'; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    else if (action === 'feed-create') { feedLink = await post('/api/calendar-feed', { detail: document.getElementById('feed-detail')?.value || 'discreet' }); repaint('calendar-feed'); bridge.notify('Lien d’agenda créé. Copiez-le avant de quitter la page.'); }
    else if (action === 'feed-revoke') { await post('/api/calendar-feed/revoke'); feedLink = null; repaint('calendar-feed'); bridge.notify('Lien d’agenda désactivé.'); }
    else if (action === 'feed-copy') { const field = document.getElementById('feed-url'); if (field) { try { await navigator.clipboard.writeText(field.value); bridge.notify('Lien copié.'); } catch { field.select(); bridge.notify('Sélectionné : copiez avec Ctrl+C.'); } } }
    else if (action === 'member-unlink') { cache.overview = await post('/api/telephony/member/unlink'); repaint('phone'); }
    else if (action === 'member-deactivate') { cache.overview = await post('/api/telephony/member/deactivate'); repaint('phone'); }
    else if (action === 'availability') { cache.overview = await post('/api/telephony/member/availability', { status: button.dataset.status }); repaint('phone'); }
    else if (action === 'call') {
      const via = document.querySelector(`[data-via-for="${CSS.escape(button.dataset.subject)}"]`)?.value || 'app';
      await post(`${caseBase()}/calls`, { calleeSubject: button.dataset.subject, via });
      bridge.notify(via === 'mobile' ? 'MIMT fait sonner votre cellulaire : appuyez sur 1, puis MIMT compose la personne.' : 'MIMT fait sonner votre application : répondez, puis MIMT compose la personne.');
      repaint('case-calls');
    }
    else if (action === 'listen') await play(`${caseBase()}/calls/${encodeURIComponent(id)}/recording`);
    else if (action === 'team-listen') await play(`/api/telephony/team/calls/${encodeURIComponent(id)}/recording`);
    else if (action === 'player-close') { const p = document.getElementById('live-player'); if (p) { p.querySelector('audio')?.pause(); p.hidden = true; p.innerHTML = ''; } }
    else if (action === 'call-time') { await post(`${caseBase()}/calls/${encodeURIComponent(id)}/time`); bridge.notify('La durée attestée par MIMT est ajoutée au suivi du temps.'); await bridge.reloadCase(); repaint('case-calls'); }
    else if (action === 'call-record') { await post(`${caseBase()}/generate`, { kind: 'call_record', callId: id }); bridge.notify('Le procès-verbal d’appel est versé aux pièces du dossier.'); await bridge.reloadCase(); }
    else if (action === 'video-join') await videoJoin();
    else if (action === 'video-leave') await videoLeave(false);
    else if (action === 'video-end') await videoLeave(true);
    else if (action === 'video-mic') toggleTrack('mic', button);
    else if (action === 'video-cam') toggleTrack('cam', button);
    else if (action === 'journal-verify') {
      const v = await api(`${caseBase()}/journal/verify`);
      const box = document.getElementById('live-verdict');
      if (box) box.innerHTML = v.intact ? `<div class="callout success">${icon('check')}<p><strong>Journal intact</strong>${v.seals.length} sceau${v.seals.length > 1 ? 'x' : ''} vérifié${v.seals.length > 1 ? 's' : ''} sur ${v.total} événements.</p></div>`
        : `<div class="callout warning">${icon('info')}<p><strong>Écart détecté</strong>${v.seals.filter(s => !s.intact).length} sceau(x) ne correspondent plus au journal. Conservez ce constat.</p></div>`;
    }
    else if (action === 'journal-seal') { const s = await post(`${caseBase()}/journal/seal`); bridge.notify(`Journal scellé : ${s.seal.eventCount} événements, empreinte ${s.seal.headDigest.slice(0, 12)}…`); repaint('case-journal'); }
    else if (action === 'generate') { const made = await post(`${caseBase()}/generate`, { kind: button.dataset.kind }); bridge.notify(`« ${made.document.name} » est versé aux pièces, à vérifier.`); await bridge.reloadCase(); repaint('case-journal'); }
    else if (action === 'team-sync') { cache.team = await post('/api/telephony/team/sync'); repaint('team'); bridge.notify('Le groupe Équipe est à jour chez MIMT.'); }
    else if (action === 'team-calls') { await post('/api/telephony/team/calls/sync'); repaint('team'); }
    else if (action === 'team-credits') { await post('/api/telephony/team/credits'); repaint('team'); }
    else if (action === 'team-callback') { await post(`/api/telephony/team/calls/${encodeURIComponent(id)}/callback`); bridge.notify('MIMT fait sonner votre application, puis compose la personne.'); repaint('team'); }
  }
  async function submit(kind, form) {
    const data = new FormData(form), errorNode = form.querySelector('.form-error'), button = form.querySelector('[type="submit"]');
    if (errorNode) errorNode.hidden = true;
    if (button) button.disabled = true;
    try {
      if (kind === 'phone') cache.overview = await post('/api/telephony/phone', { phone: String(data.get('phone') || ''), consent: data.get('consent') === 'on' });
      if (kind === 'member') cache.overview = await post('/api/telephony/member', { displayName: String(data.get('displayName') || '').trim(), ...(String(data.get('mobile') || '').trim() ? { mobile: String(data.get('mobile')).trim() } : {}) });
      if (kind === 'line') cache.overview = await post('/api/telephony/member/line', { e164: String(data.get('e164') || '') });
      if (kind === 'request-create') { await post(`${caseBase()}/requests`, { title: String(data.get('title') || '').trim(), note: String(data.get('note') || '').trim(), ...(data.get('dueDate') ? { dueDate: String(data.get('dueDate')) } : {}) }); form.reset(); bridge.notify('Demande envoyée au client, dans le dossier.'); await loadRequests(true); repaint('case-requests'); return; }
      if (kind === 'request-provide') { await post(`${caseBase()}/requests/${encodeURIComponent(form.dataset.id)}/provide`, { ...(data.get('documentId') ? { documentId: String(data.get('documentId')) } : {}), ...(String(data.get('answer') || '').trim() ? { answer: String(data.get('answer')).trim() } : {}) }); bridge.notify('Envoyé à votre avocat.'); await loadRequests(true); repaint('case-requests'); repaint('client-home'); return; }
      if (kind === 'deadline-create') { await post(`${caseBase()}/deadlines`, { title: String(data.get('title') || '').trim(), kind: String(data.get('kind') || 'autre'), dueDate: String(data.get('dueDate') || ''), ...(data.get('dueTime') ? { dueTime: String(data.get('dueTime')) } : {}), note: String(data.get('note') || '').trim(), visibleToClient: data.get('visibleToClient') === 'on' }); form.reset(); bridge.notify('Échéance enregistrée au dossier.'); await loadDeadlines(true); deadlines.week = null; repaint('case-deadlines'); loadWeek().then(syncWeekChip, () => {}); return; }
      if (kind === 'template') { const made = await post(`${caseBase()}/generate`, { kind: 'template', title: String(data.get('title') || ''), body: String(data.get('body') || '') }); bridge.notify(`« ${made.document.name} » est versé aux pièces, à vérifier.`); form.reset(); await bridge.reloadCase(); return; }
      repaint('phone');
    } catch (error) {
      if (errorNode) { errorNode.textContent = error.message; errorNode.hidden = false; } else bridge.notify(error.message, true);
    } finally { if (button?.isConnected) button.disabled = false; }
  }
  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-live-action]');
    if (!button || !bridge || button.disabled) return;
    event.preventDefault();
    if (!bridge.canMutate() && !['player-close', 'video-mic', 'video-cam', 'request-focus', 'deadline-ics'].includes(button.dataset.liveAction)) { bridge.notify('Connectez-vous pour utiliser cette action.', true); return; }
    button.disabled = true;
    act(button.dataset.liveAction, button).catch(error => { bridge.notify(error.message, true); }).finally(() => { if (button.isConnected) button.disabled = false; });
  });
  document.addEventListener('submit', event => {
    const form = event.target.closest?.('form[data-live-form]');
    if (!form || !bridge) return;
    event.preventDefault();
    void submit(form.dataset.liveForm, form);
  });

  window.BALive = Object.freeze({
    init(next) { bridge = next; },
    afterRender,
    reset() { feedLink = null; requests.data = null; deadlines.data = null; deadlines.week = null; intakes.counts = null; cache.overview = null; cache.link = null; cache.team = null; for (const t of timers.values()) clearTimeout(t); timers.clear(); if (room.id) videoCleanup(); },
    status: () => cache.overview,
    intakeCount: () => (intakes.counts ? String(intakes.counts.received ?? 0) : null),
    deadlineWeek: () => (deadlines.week ? String(deadlines.week.deadlines.length) : null),
    inRoom: () => Boolean(room.id),
  });
})();
