// Espace avocat (/avocat). Same-origin API only; every value is escaped before display. No framework.
(function () {
  'use strict';
  var state = { health: null, me: null, ready: null, step: 'choose', email: '', notice: null, busy: false, invitations: {} };
  // États d'un dossier (D-036) : la personne prépare, puis l'offre aux avocats de son domaine, puis un avocat l'accepte.
  var STATUS = { preparation: ['En préparation', 'neutral'], pret: ['Prêt pour un avocat', 'warning'], accepte: ['Accepté par un avocat', 'teal'] };
  var $ = function (id) { return document.getElementById(id); };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function when(iso, withTime) {
    if (!iso) return '';
    try { return new Intl.DateTimeFormat('fr-CA', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'long' }).format(new Date(iso)); } catch (e) { return iso; }
  }
  function money(cents, currency) {
    try { return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: currency || 'CAD' }).format(cents / 100); } catch (e) { return (cents / 100) + ' ' + currency; }
  }
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
  var toastTimer = null;
  function toast(text, isError) {
    var node = $('lawyer-toast');
    node.textContent = text; node.classList.toggle('error', Boolean(isError)); node.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { node.hidden = true; }, 6000);
  }
  function showState(text, isError) {
    var node = $('lawyer-state');
    node.textContent = text || '';
    node.classList.toggle('is-error', Boolean(isError));
  }
  var ROLE = { owner: 'Responsable', lawyer: 'Avocat', client: 'Client' };

  // ---------- Signed out ----------
  function noticeHtml() { return state.notice ? '<p class="lawyer-notice' + (state.notice.error ? ' is-error' : '') + '" role="status">' + esc(state.notice.text) + '</p>' : ''; }
  function signedOut() {
    var emailCode = state.health && state.health.emailCodeConfigured === true;
    var disabled = state.busy ? ' disabled' : '';
    var hero = '<div class="lawyer-hero"><span class="lawyer-trial-pill">14 jours gratuits · 0 $ · aucune carte</span><h1>Votre espace avocat sur BesoinAvocat.</h1><p>Les personnes préparent leur dossier sur la plateforme : domaine de droit, résumé, pièces. Vous voyez les dossiers prêts dans vos domaines de pratique, vous acceptez ceux qui vous conviennent, puis les conditions du mandat se conviennent entre vous et votre client, dans le dossier. Essayez la plateforme pendant 14 jours sans rien payer; nous vous proposerons un abonnement seulement à la fin de l’essai.</p></div>';
    if (!emailCode) {
      return hero + '<section class="panel lawyer-split"><div><h2>Inscription bientôt disponible</h2><p>' + esc(state.health === null ? 'Le service du portail n’est pas joignable depuis cette page.' : 'La connexion par code courriel n’est pas encore activée sur ce portail. L’inscription des avocats s’ouvre dès qu’elle le sera.') + '</p><p class="lawyer-help">Vous avez déjà un compte ? <a href="./">Connectez-vous depuis l’espace de travail</a>.</p></div></section>';
    }
    var signup, login;
    if (state.step === 'signup-code') {
      signup = noticeHtml() + '<p>Adresse utilisée : <strong>' + esc(state.email) + '</strong></p><form id="lawyer-signup-verify" class="auth-form"><label for="signup-code">Code reçu par courriel</label><input id="signup-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" minlength="6" maxlength="10" required' + disabled + '><small>Saisissez les 6 à 10 chiffres, y compris les zéros au début.</small><button class="button" type="submit"' + disabled + '>' + (state.busy ? 'Vérification…' : 'Ouvrir mon espace avocat') + '</button></form><button class="text-button" type="button" data-action="restart">Modifier l’adresse ou redemander un code</button>';
    } else {
      signup = noticeHtml() + '<form id="lawyer-signup" class="auth-form"><label for="signup-name">Votre nom</label><input id="signup-name" name="name" type="text" autocomplete="name" maxlength="160" required' + disabled + '><div class="profile-grid"><div><label for="signup-bar">N° de membre du Barreau <span class="table-subtext">facultatif</span></label><input id="signup-bar" name="barNumber" type="text" maxlength="40"' + disabled + '></div><div><label for="signup-firm">Cabinet <span class="table-subtext">facultatif</span></label><input id="signup-firm" name="firm" type="text" autocomplete="organization" maxlength="160"' + disabled + '></div></div><label for="signup-email">Adresse courriel professionnelle</label><input id="signup-email" name="email" type="email" autocomplete="email" maxlength="320" value="' + esc(state.email) + '" required' + disabled + '><label class="lawyer-consent"><input type="checkbox" name="consent" required' + disabled + '><span>Je comprends que l’essai de 14 jours est gratuit, sans carte ni paiement, qu’aucun abonnement ne démarre sans mon choix explicite, et que BesoinAvocat n’est pas un cabinet d’avocats.</span></label><button class="button" type="submit"' + disabled + '>' + (state.busy ? 'Envoi du code…' : 'Créer mon compte et recevoir un code') + '</button></form><small>Aucun mot de passe : un code à usage unique est envoyé à votre adresse à chaque connexion. Vos coordonnées servent seulement à identifier votre compte auprès de vos clients.</small>';
    }
    if (state.step === 'login-code') {
      login = noticeHtml() + '<p>Adresse utilisée : <strong>' + esc(state.email) + '</strong></p><form id="lawyer-login-verify" class="auth-form"><label for="login-code">Code reçu par courriel</label><input id="login-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" minlength="6" maxlength="10" required' + disabled + '><button class="button" type="submit"' + disabled + '>' + (state.busy ? 'Vérification…' : 'Me connecter') + '</button></form><button class="text-button" type="button" data-action="restart">Modifier l’adresse</button>';
    } else {
      login = (state.step === 'login' ? noticeHtml() : '') + '<form id="lawyer-login" class="auth-form"><label for="login-email">Adresse courriel du compte</label><input id="login-email" name="email" type="email" autocomplete="username" maxlength="320" required' + disabled + '><button class="button secondary" type="submit"' + disabled + '>' + (state.busy && state.step === 'login' ? 'Envoi du code…' : 'Recevoir un code de connexion') + '</button></form><small>Même code que pour l’espace de travail. Le portail complet reste accessible depuis <a href="./">la page d’accueil</a>.</small>';
    }
    var cardA = state.step === 'login-code' ? login : signup, cardB = state.step === 'login-code' ? '' : login;
    return hero + '<div class="lawyer-split"><section class="panel" aria-labelledby="signup-title"><span class="eyebrow">NOUVEAU SUR BESOINAVOCAT</span><h2 id="signup-title">' + (state.step === 'login-code' ? 'Connexion' : 'Créer mon compte avocat') + '</h2><ul class="lawyer-points"><li>14 jours gratuits, à 0 $, sans carte de crédit</li><li>Des dossiers déjà préparés, dans vos domaines de pratique, à accepter d’un clic</li><li>Accès au dossier d’un client existant par un code qu’il vous remet</li><li>Pièces, échéances, rendez-vous, appels et visioconférence</li><li>Vos honoraires restent entre vous et votre client</li></ul>' + cardA + '</section>' + (cardB ? '<section class="panel" aria-labelledby="login-title"><span class="eyebrow">DÉJÀ INSCRIT</span><h2 id="login-title">Me connecter</h2><p>Vous avez déjà un compte BesoinAvocat ou TAKATAK ? Recevez un code et retrouvez votre espace.</p>' + cardB + '</section>' : '') + '</div>';
  }

  // ---------- Signed in ----------
  function trialCard() {
    var me = state.me, o = me.membership, m = o && o.membership, trial = m && m.trial;
    var head = '<span class="eyebrow">VOTRE ACCÈS</span>';
    if (!m) return '<section class="panel trial-card">' + head + '<h2>Essai gratuit</h2><p>Votre essai s’ouvre à l’activation de l’espace avocat.</p></section>';
    if (m.active && m.plan !== 'trial') {
      return '<section class="panel trial-card">' + head + '<h2>Abonnement actif</h2><p>Forfait ' + esc(m.plan === 'weekly' ? 'hebdomadaire' : m.plan === 'monthly' ? 'mensuel' : m.plan) + (m.currentPeriodEnd ? ' · ' + (m.cancelAtPeriodEnd ? 'se termine' : 'renouvellement') + ' le ' + esc(when(m.currentPeriodEnd)) : '') + '.</p>' + (m.canManage ? '<button type="button" class="button secondary" data-action="portal">Gérer mon abonnement chez Stripe</button>' : '') + '<p>Payé chez Stripe; BesoinAvocat ne voit jamais votre carte.</p></section>';
    }
    var expired = Boolean(trial && trial.expired) || m.status === 'trial_expired' || (!m.active && m.status !== 'none');
    var days = trial ? trial.daysLeft : me.trialDays, total = (trial && trial.days) || me.trialDays || 14;
    var pct = Math.max(0, Math.min(100, Math.round((days / total) * 100)));
    var plans = '';
    if (expired || true) {
      if (o.configured && o.plans && o.plans.length) {
        plans = '<div class="plan-list">' + o.plans.map(function (p) {
          return '<div class="plan"><strong>' + esc(money(p.amountCents, p.currency)) + '</strong><small>par ' + (p.intervalCount > 1 ? p.intervalCount + ' ' : '') + esc({ week: 'semaine', month: 'mois', year: 'an', day: 'jour' }[p.interval] || p.interval) + ', taxes calculées par Stripe · ' + (p.plan === 'weekly' ? 'hebdomadaire' : 'mensuel') + '</small><button type="button" class="button' + (expired ? '' : ' secondary') + ' small" data-action="checkout" data-plan="' + esc(p.plan) + '">' + (expired ? 'Choisir ce forfait' : 'S’abonner dès maintenant') + '</button></div>';
        }).join('') + '</div>' + (o.mode === 'test' ? '<p>Mode test de Stripe : aucun vrai paiement.</p>' : '');
      } else if (expired) {
        plans = '<div class="callout warning"><p><strong>Paiement bientôt proposé ici</strong>L’abonnement par carte est en cours d’activation chez BesoinAvocat. Vos dossiers restent consultables; écrivez-nous pour poursuivre sans interruption.</p></div>';
      } else {
        plans = '<p>À la fin de l’essai, un abonnement vous sera proposé ici. Rien ne sera facturé sans votre choix explicite.</p>';
      }
    }
    if (expired) {
      return '<section class="panel trial-card is-expired">' + head + '<h2>Essai terminé</h2><div class="trial-days">0<small>jour restant</small></div><div class="trial-bar"><span style="width:0%"></span></div><p>Votre essai gratuit de ' + esc(total) + ' jours s’est terminé le ' + esc(when(trial && trial.endsAt)) + '. Choisissez un abonnement pour rejoindre de nouveaux dossiers.</p>' + plans + '</section>';
    }
    return '<section class="panel trial-card">' + head + '<h2>Essai gratuit en cours</h2><div class="trial-days">' + esc(days) + '<small>' + (days === 1 ? 'jour restant' : 'jours restants') + ' sur ' + esc(total) + '</small></div><div class="trial-bar"><span style="width:' + pct + '%"></span></div><p>Gratuit jusqu’au ' + esc(when(trial && trial.endsAt)) + ', à 0 $, sans carte. Aucun prélèvement automatique à la fin : nous vous demanderons alors de choisir.</p>' + plans + '</section>';
  }
  function domainBoxes(selected, prefix) {
    var domains = (state.me && state.me.domains) || [];
    if (!domains.length) return '';
    selected = selected || [];
    return '<fieldset class="domain-grid full"><legend>Mes domaines de pratique</legend>' + domains.map(function (d) {
      return '<label><input type="checkbox" name="domains" value="' + esc(d.id) + '" id="' + esc(prefix) + '-domain-' + esc(d.id) + '"' + (selected.indexOf(d.id) >= 0 ? ' checked' : '') + '><span>' + esc(d.label) + '</span></label>';
    }).join('') + '</fieldset><p class="lawyer-help">Vous ne voyez que les dossiers prêts de ces domaines. Aucun domaine coché : vous les voyez tous.</p>';
  }
  function checkedDomains(form) {
    var boxes = form.querySelectorAll('input[name="domains"]:checked'), out = [];
    for (var i = 0; i < boxes.length; i += 1) out.push(boxes[i].value);
    return out;
  }
  function statusBadge(profile) {
    var st = STATUS[(profile && profile.status) || 'preparation'] || STATUS.preparation;
    return '<span class="badge ' + st[1] + '">' + esc(st[0]) + '</span>' + (profile && profile.domainLabel ? '<span class="badge neutral">' + esc(profile.domainLabel) + '</span>' : '');
  }
  // Les dossiers prêts de l'organisation, dans les domaines de l'avocat : titre, domaine, résumé, nombre de pièces. Jamais les pièces.
  function readyPanel() {
    var m = state.me.membership && state.me.membership.membership, blocked = m && !m.active, r = state.ready;
    var body;
    if (blocked) body = '<div class="callout warning"><p><strong>Essai terminé</strong>Choisissez un abonnement pour voir et accepter de nouveaux dossiers.</p></div>';
    else if (!r) body = '<p class="lawyer-help">Les dossiers prêts n’ont pas pu être chargés. Rechargez la page.</p>';
    else if (!r.cases.length) body = '<div class="empty-state"><h2>Aucun dossier prêt pour l’instant</h2><p>' + (r.domains.length ? 'Aucun dossier prêt dans vos domaines de pratique. Élargissez vos domaines dans « Mon profil » ou revenez plus tard.' : 'Dès qu’une personne déclare son dossier prêt, il apparaît ici.') + (r.total > r.cases.length ? ' ' + esc(r.total - r.cases.length) + ' dossier(s) prêt(s) dans d’autres domaines.' : '') + '</p></div>';
    else body = '<div class="ready-list">' + r.cases.map(function (c) {
      return '<article class="ready-case" data-case="' + esc(c.id) + '"><div class="ready-case-head"><strong>' + esc(c.title) + '</strong><span class="badge neutral">' + esc(c.domainLabel || 'Domaine à préciser') + '</span></div><p class="ready-case-summary">' + (c.summary ? esc(c.summary) : '<em>Aucun résumé fourni.</em>') + '</p><small>' + esc(c.documents) + ' ' + (c.documents === 1 ? 'pièce' : 'pièces') + ' · prêt depuis le ' + esc(when(c.readyAt)) + (c.reference ? ' · ' + esc(c.reference) : '') + '</small><div class="lawyer-case-actions"><button type="button" class="button small" data-action="accept" data-case="' + esc(c.id) + '" data-title="' + esc(c.title) + '"' + (state.busy ? ' disabled' : '') + '>Accepter ce dossier</button></div></article>';
    }).join('') + '</div>' + (r.total > r.cases.length ? '<p class="lawyer-help">' + esc(r.total - r.cases.length) + ' autre(s) dossier(s) prêt(s) dans des domaines que vous n’avez pas cochés.</p>' : '');
    return '<section class="panel" id="ready-panel"><div class="panel-heading"><div><h2>Dossiers prêts à accepter</h2><p>Préparés par les personnes sur la plateforme, dans vos domaines. Vous voyez le titre, le domaine, le résumé et le nombre de pièces; les pièces s’ouvrent après l’acceptation. Les conditions du mandat se conviennent ensuite entre vous, dans le dossier.</p></div><span class="badge neutral">' + esc(r ? r.cases.length : 0) + '</span></div><div class="panel-body">' + body + '</div></section>';
  }
  function casesPanel() {
    var me = state.me, cases = me.cases || [];
    var rows = cases.length ? '<div class="lawyer-cases">' + cases.map(function (c) {
      return '<article class="lawyer-case" data-case="' + esc(c.id) + '"><span class="case-symbol" aria-hidden="true">§</span><div><strong>' + esc(c.title) + '</strong><small><span class="role-badge" data-role="' + esc(c.role) + '">' + esc(ROLE[c.role] || c.role) + '</span>' + esc(c.reference || '') + (c.reference ? ' · ' : '') + 'ouvert le ' + esc(when(c.createdAt)) + '</small><div class="case-status">' + statusBadge(c.profile) + '</div></div><div class="lawyer-case-actions"><a class="button small" href="./#case/' + encodeURIComponent(c.id) + '">Ouvrir le dossier</a><button type="button" class="button secondary small" data-action="invite" data-case="' + esc(c.id) + '" data-title="' + esc(c.title) + '">Inviter un avocat</button></div></article>';
    }).join('') + '</div>' : '<div class="empty-state"><h2>Aucun dossier pour l’instant</h2><p>Acceptez un dossier prêt ci-dessus, ou saisissez le code d’invitation qu’un client vous remet. Vous pouvez aussi ouvrir un dossier vous-même depuis le centre de commandement.</p></div>';
    return '<section class="panel"><div class="panel-heading"><div><h2>Mes dossiers</h2><p>Les dossiers où vous êtes avocat, responsable ou client. Ils s’ouvrent dans le centre de commandement.</p></div><span class="badge neutral">' + esc(cases.length) + '</span></div><div class="panel-body">' + rows + '</div></section>';
  }
  function joinPanel() {
    var m = state.me.membership && state.me.membership.membership, blocked = m && !m.active;
    return '<section class="panel"><div class="panel-heading"><div><h2>Rejoindre le dossier d’un client</h2><p>Votre client génère un code dans son dossier (bouton « Inviter un avocat ») et vous le remet. Le code vaut 14 jours et sert une seule fois.</p></div></div><div class="panel-body">' + (blocked ? '<div class="callout warning"><p><strong>Essai terminé</strong>Choisissez un abonnement pour rejoindre de nouveaux dossiers.</p></div>' : '') + '<form id="lawyer-join" class="join-form"><div><label for="join-code">Code d’invitation</label><input id="join-code" name="code" type="text" placeholder="AV-XXXX-XXXX" maxlength="14" autocomplete="off" spellcheck="false" required' + (state.busy || blocked ? ' disabled' : '') + '></div><button class="button" type="submit"' + (state.busy || blocked ? ' disabled' : '') + '>Rejoindre le dossier</button></form><p class="lawyer-help">En rejoignant, vous devenez l’avocat du dossier : vous voyez les pièces, les échanges, les échéances et les rendez-vous, et chaque consultation est journalisée.</p></div></section>';
  }
  function profilePanel() {
    var a = state.me.account;
    return '<section class="panel"><div class="panel-heading"><div><h2>Mon profil</h2><p>Ce que vos clients voient dans leur dossier, et les domaines dont vous acceptez les dossiers.</p></div></div><div class="panel-body"><form id="lawyer-profile" class="profile-grid"><div class="full"><label for="profile-name">Nom</label><input id="profile-name" name="name" type="text" maxlength="160" value="' + esc(a.name) + '" required></div><div><label for="profile-bar">N° du Barreau</label><input id="profile-bar" name="barNumber" type="text" maxlength="40" value="' + esc(a.barNumber) + '"></div><div><label for="profile-firm">Cabinet</label><input id="profile-firm" name="firm" type="text" maxlength="160" value="' + esc(a.firm) + '"></div>' + domainBoxes(a.domains, 'profile') + '<div class="full form-actions"><button class="button secondary small" type="submit">Enregistrer</button></div></form>' + (a.email ? '<p class="lawyer-help">Courriel du compte : ' + esc(a.email) + '</p>' : '') + '</div></section>';
  }
  function activatePanel() {
    return '<div class="lawyer-hero"><span class="lawyer-trial-pill">14 jours gratuits · 0 $ · aucune carte</span><h1>Ouvrir votre espace avocat</h1><p>Vous êtes connecté. Indiquez votre nom pour ouvrir votre espace avocat et démarrer l’essai gratuit; vos dossiers actuels restent inchangés.</p></div><section class="panel lawyer-split"><div>' + noticeHtml() + '<form id="lawyer-activate" class="auth-form"><label for="activate-name">Votre nom</label><input id="activate-name" name="name" type="text" autocomplete="name" maxlength="160" required><div class="profile-grid"><div><label for="activate-bar">N° de membre du Barreau <span class="table-subtext">facultatif</span></label><input id="activate-bar" name="barNumber" type="text" maxlength="40"></div><div><label for="activate-firm">Cabinet <span class="table-subtext">facultatif</span></label><input id="activate-firm" name="firm" type="text" maxlength="160"></div></div><button class="button" type="submit"' + (state.busy ? ' disabled' : '') + '>Ouvrir mon espace avocat</button></form><small>Si vous êtes la personne cliente d’un dossier, vous n’avez pas besoin de cet espace : utilisez le centre de commandement et le bouton « Inviter un avocat » de votre dossier.</small></div><div><h2>Partager un dossier avec votre avocat</h2><p>Sans ouvrir d’espace avocat, vous pouvez déjà inviter l’avocat d’un de vos dossiers : il recevra un code à saisir ici.</p>' + (state.me.cases && state.me.cases.length ? '<div class="lawyer-cases" style="margin-top:12px">' + state.me.cases.map(function (c) { return '<article class="lawyer-case"><span class="case-symbol" aria-hidden="true">§</span><div><strong>' + esc(c.title) + '</strong><small><span class="role-badge" data-role="' + esc(c.role) + '">' + esc(ROLE[c.role] || c.role) + '</span>' + esc(c.reference || '') + '</small></div><div class="lawyer-case-actions"><button type="button" class="button secondary small" data-action="invite" data-case="' + esc(c.id) + '" data-title="' + esc(c.title) + '">Inviter un avocat</button></div></article>'; }).join('') + '</div>' : '<p class="lawyer-help">Aucun dossier n’est rattaché à votre compte pour l’instant.</p>') + '</div></section>';
  }
  function signedIn() {
    if (!state.me.account) return activatePanel();
    return '<div class="lawyer-hero"><span class="eyebrow">ESPACE AVOCAT</span><h1>Bonjour, ' + esc(state.me.account.name) + '.</h1><p>Les dossiers prêts dans vos domaines, vos dossiers, votre essai et vos domaines de pratique.</p></div><div class="lawyer-grid"><div class="lawyer-stack">' + readyPanel() + casesPanel() + joinPanel() + profilePanel() + '</div><div class="lawyer-stack">' + trialCard() + '<section class="panel trial-card"><span class="eyebrow">CENTRE DE COMMANDEMENT</span><h2>Travailler dans un dossier</h2><p>Pièces, recherche, échanges, échéances, rendez-vous, appels et visioconférence : tout se passe dans l’espace de travail, dossier par dossier.</p><a class="button" href="./">Ouvrir le centre de commandement</a></section></div></div>';
  }

  function render() {
    $('lawyer-content').innerHTML = state.me ? signedIn() : signedOut();
    $('lawyer-logout').hidden = !state.me;
    showState('');
  }

  // ---------- Invitation dialog ----------
  async function openInvite(caseId, title) {
    var dialog = $('lawyer-dialog'), content = $('lawyer-dialog-content');
    content.innerHTML = '<h2 id="lawyer-dialog-title">Inviter un avocat</h2><p>Dossier « ' + esc(title) + ' ». Chargement…</p>';
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
    try {
      var list = await api('/api/cases/' + encodeURIComponent(caseId) + '/invitations');
      renderInvite(caseId, title, list.invitations, null);
    } catch (error) { content.innerHTML = '<h2 id="lawyer-dialog-title">Inviter un avocat</h2><p class="lawyer-notice is-error">' + esc(error.message) + '</p><div class="form-actions"><button class="button secondary" type="button" data-action="close">Fermer</button></div>'; }
  }
  function renderInvite(caseId, title, invitations, code) {
    var items = invitations.length ? '<ul class="invite-list">' + invitations.map(function (i) {
      var label = { open: 'Valide', used: 'Utilisée', revoked: 'Révoquée', expired: 'Expirée' }[i.status] || i.status;
      return '<li data-status="' + esc(i.status) + '"><span><span class="invite-status" data-status="' + esc(i.status) + '">' + esc(label) + '</span> <small>créée le ' + esc(when(i.createdAt, true)) + (i.status === 'open' ? ', valide jusqu’au ' + esc(when(i.expiresAt)) : i.usedAt ? ', acceptée le ' + esc(when(i.usedAt, true)) : '') + '</small></span>' + (i.status === 'open' ? '<button type="button" class="button secondary small" data-action="revoke" data-case="' + esc(caseId) + '" data-id="' + esc(i.id) + '" data-title="' + esc(title) + '">Révoquer</button>' : '') + '</li>';
    }).join('') + '</ul>' : '<p>Aucun code n’a encore été créé pour ce dossier.</p>';
    $('lawyer-dialog-content').innerHTML = '<h2 id="lawyer-dialog-title">Inviter un avocat</h2><p>Dossier « ' + esc(title) + ' ». Remettez ce code à votre avocat : il le saisit dans son espace avocat et devient l’avocat du dossier. Le code vaut 14 jours et ne sert qu’une fois.</p>' +
      (code ? '<div class="invite-code" id="invite-code">' + esc(code) + '</div><div class="form-actions" style="justify-content:flex-start;margin-top:0"><button type="button" class="button secondary small" data-action="copy" data-code="' + esc(code) + '">Copier le code</button></div><p>Ce code ne sera plus affiché : notez-le ou copiez-le maintenant.</p>' : '') +
      items + '<div class="form-actions"><button class="button secondary" type="button" data-action="close">Fermer</button><button class="button" type="button" data-action="create-invite" data-case="' + esc(caseId) + '" data-title="' + esc(title) + '">Créer un nouveau code</button></div>';
  }

  // ---------- Loading ----------
  async function loadMe() {
    try { state.me = await api('/api/lawyer/me'); }
    catch (error) {
      if (error.status === 401 || error.status === 403) state.me = null;
      else throw error;
    }
    state.ready = null;
    if (state.me && state.me.account) {
      try { state.ready = await api('/api/lawyer/ready-cases'); }
      catch (error) { state.ready = null; /* 402 : essai terminé, le panneau le dit; autre erreur : message de rechargement */ }
    }
  }
  async function start() {
    try { state.health = await api('/api/health'); } catch (e) { state.health = null; }
    try { await loadMe(); render(); }
    catch (error) { showState('Le portail ne répond pas : ' + error.message, true); }
  }
  async function afterLogin() {
    state.step = 'choose'; state.email = ''; state.notice = null;
    await loadMe(); render();
    toast(state.me && state.me.account ? 'Bienvenue dans votre espace avocat.' : 'Vous êtes connecté.');
  }
  function fail(error, fallback) { state.notice = { error: true, text: error.message || fallback }; }

  // ---------- Events ----------
  document.addEventListener('submit', async function (event) {
    var form = event.target;
    if (!form.id || form.id.indexOf('lawyer-') !== 0) return;
    event.preventDefault();
    if (state.busy) return;
    var f = form.elements, v = function (name) { return f[name] ? String(f[name].value || '').trim() : ''; };
    state.busy = true; state.notice = null;
    try {
      if (form.id === 'lawyer-signup') {
        state.email = v('email'); state.step = 'signup';
        var result = await api('/api/auth/lawyer/signup', { method: 'POST', body: { email: state.email, name: v('name'), barNumber: v('barNumber'), firm: v('firm'), consent: Boolean(f.consent && f.consent.checked) } });
        state.step = 'signup-code'; state.notice = { text: result.message || 'Code envoyé.' };
      } else if (form.id === 'lawyer-signup-verify') {
        var code = v('code'); f.code.value = '';
        await api('/api/auth/lawyer/verify', { method: 'POST', body: { email: state.email, code: code } });
        state.busy = false; await afterLogin(); return;
      } else if (form.id === 'lawyer-login') {
        state.email = v('email'); state.step = 'login';
        var r = await api('/api/auth/email/request', { method: 'POST', body: { email: state.email } });
        state.step = 'login-code'; state.notice = { text: r.message || 'Si le compte existe, un code a été envoyé.' };
      } else if (form.id === 'lawyer-login-verify') {
        var c = v('code'); f.code.value = '';
        await api('/api/auth/email/verify', { method: 'POST', body: { email: state.email, code: c } });
        state.busy = false; await afterLogin(); return;
      } else if (form.id === 'lawyer-activate') {
        await api('/api/lawyer/activate', { method: 'POST', body: { name: v('name'), barNumber: v('barNumber'), firm: v('firm') } });
        state.busy = false; await loadMe(); render(); toast('Votre espace avocat est ouvert. L’essai gratuit commence aujourd’hui.'); return;
      } else if (form.id === 'lawyer-profile') {
        await api('/api/lawyer/profile', { method: 'POST', body: { name: v('name'), barNumber: v('barNumber'), firm: v('firm'), domains: checkedDomains(form) } });
        state.busy = false; await loadMe(); render(); toast('Profil enregistré.'); return;
      } else if (form.id === 'lawyer-join') {
        var joined = await api('/api/lawyer/join', { method: 'POST', body: { code: v('code') } });
        state.busy = false; await loadMe(); render();
        toast(joined.alreadyMember ? 'Vous faisiez déjà partie du dossier « ' + joined.case.title + ' ».' : 'Vous êtes maintenant l’avocat du dossier « ' + joined.case.title + ' ».');
        return;
      }
    } catch (error) {
      if (form.id === 'lawyer-join' || form.id === 'lawyer-profile') { state.busy = false; toast(error.message, true); return; }
      if (error.status === 401 && /verify/.test(form.id)) fail({ message: 'Code non valide ou expiré. Demandez un nouveau code si besoin.' });
      else fail(error, 'Une erreur est survenue.');
    }
    state.busy = false; render();
  });
  document.addEventListener('click', async function (event) {
    var button = event.target.closest('[data-action]');
    if (!button) return;
    var action = button.dataset.action;
    try {
      if (action === 'restart') { state.step = 'choose'; state.notice = null; render(); }
      else if (action === 'invite') await openInvite(button.dataset.case, button.dataset.title);
      else if (action === 'accept') {
        if (state.busy) return;
        state.busy = true; render();
        try {
          var accepted = await api('/api/lawyer/accept', { method: 'POST', body: { caseId: button.dataset.case } });
          state.busy = false; await loadMe(); render();
          toast('Vous êtes maintenant l’avocat du dossier « ' + accepted.case.title + ' ». La personne en est avisée dans le dossier.');
        } catch (error) { state.busy = false; await loadMe(); render(); throw error; }
      }
      else if (action === 'create-invite') {
        var created = await api('/api/cases/' + encodeURIComponent(button.dataset.case) + '/invitations', { method: 'POST', body: {} });
        var list = await api('/api/cases/' + encodeURIComponent(button.dataset.case) + '/invitations');
        renderInvite(button.dataset.case, button.dataset.title, list.invitations, created.code);
      } else if (action === 'revoke') {
        await api('/api/cases/' + encodeURIComponent(button.dataset.case) + '/invitations/' + encodeURIComponent(button.dataset.id) + '/revoke', { method: 'POST', body: {} });
        var after = await api('/api/cases/' + encodeURIComponent(button.dataset.case) + '/invitations');
        renderInvite(button.dataset.case, button.dataset.title, after.invitations, null);
        toast('Invitation révoquée.');
      } else if (action === 'copy') {
        try { await navigator.clipboard.writeText(button.dataset.code); toast('Code copié.'); } catch (e) { toast('Copie impossible : notez le code affiché.', true); }
      } else if (action === 'close') { $('lawyer-dialog').close(); }
      else if (action === 'checkout') { var s = await api('/api/membership/checkout', { method: 'POST', body: { plan: button.dataset.plan } }); window.location.assign(s.url); }
      else if (action === 'portal') { var p = await api('/api/membership/portal', { method: 'POST', body: {} }); window.location.assign(p.url); }
    } catch (error) { toast(error.message, true); }
  });
  $('lawyer-logout').addEventListener('click', async function () {
    try { await api('/api/auth/logout', { method: 'POST', body: {} }); } catch (e) { /* the cookie is gone either way */ }
    state.me = null; state.step = 'choose'; render(); toast('Session fermée.');
  });
  $('lawyer-dialog').addEventListener('click', function (event) { if (event.target === event.currentTarget) event.currentTarget.close(); });

  void start();
})();
