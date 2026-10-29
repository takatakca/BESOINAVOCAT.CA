'use strict';

// Return address of the OAuth providers. The session cookie is SameSite=Strict, so it is not sent on the
// provider's redirect itself; this same-origin page sends the single-use code with the person's session.
(() => {
  const params = new URLSearchParams(window.location.search);
  // The code is single-use: remove it from the address bar and the history right away.
  window.history.replaceState(null, '', '/integrations/callback');
  const title = document.getElementById('callback-title');
  const message = document.getElementById('callback-message');
  const show = (heading, text) => { title.textContent = heading; message.textContent = text; };
  const state = params.get('state'), code = params.get('code'), error = params.get('error');
  if (!state || (!code && !error)) {
    show('Connexion interrompue', 'Aucune autorisation n’a été reçue. Recommencez depuis la page Intégrations du portail.');
    return;
  }
  fetch('/api/integrations/complete', {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify(error ? { state, error: error.slice(0, 200) } : { state, code }),
  })
    .then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) throw new Error('Votre session du portail a expiré. Reconnectez-vous, puis recommencez la connexion du service.');
      if (!response.ok) throw new Error(payload.error?.message || `La connexion n’a pas abouti (${response.status}).`);
      return payload;
    })
    .then((payload) => show('Service connecté', `Compte relié : ${payload.connection?.account || 'compte du fournisseur'}. Vous pouvez revenir aux intégrations.`))
    .catch((failure) => show('Connexion non terminée', failure.message));
})();
