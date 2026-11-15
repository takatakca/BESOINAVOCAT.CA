// Nos avocats : charge la projection publique de l'annuaire (nom du cabinet + ville + palier seulement)
// depuis /api/firms et l'affiche par palier. Aucune coordonnée n'existe côté serveur public.
const $ = (selector, root = document) => root.querySelector(selector);

const fold = (value) => String(value ?? '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

const state = { directory: { top: [], sponsored: [], free: [] }, query: '' };

function firmItem(firm) {
  const item = document.createElement('li');
  item.className = 'firm';
  const name = document.createElement('strong');
  name.textContent = firm.cabinet;
  item.append(name);
  if (firm.ville) {
    const city = document.createElement('small');
    city.textContent = firm.ville;
    item.append(city);
  }
  return item;
}

function renderSection(listId, emptyId, firms) {
  const list = $(listId);
  list.replaceChildren(...firms.map(firmItem));
  $(emptyId).hidden = firms.length > 0;
  return firms.length;
}

function render() {
  const query = fold(state.query).trim();
  const matches = (firm) => !query || fold(firm.cabinet).includes(query) || fold(firm.ville).includes(query);
  const top = state.directory.top.filter(matches);
  const sponsored = state.directory.sponsored.filter(matches);
  const free = state.directory.free.filter(matches);
  renderSection('#firms-top', '#firms-top-empty', top);
  renderSection('#firms-sponsored', '#firms-sponsored-empty', sponsored);
  const shown = renderSection('#firms-free', '#firms-free-empty', free);
  $('#firms-count').textContent = state.directory.free.length ? `(${state.directory.free.length})` : '';
  $('#firms-noresult').hidden = !(query && shown === 0 && top.length === 0 && sponsored.length === 0);
  if (query) $('#firms-free-empty').hidden = true;
}

async function load() {
  const box = $('#directory-state');
  try {
    const response = await fetch('/api/firms', { credentials: 'omit' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.directory = {
      top: Array.isArray(data.top) ? data.top : [],
      sponsored: Array.isArray(data.sponsored) ? data.sponsored : [],
      free: Array.isArray(data.free) ? data.free : [],
    };
    box.textContent = '';
    render();
  } catch {
    box.textContent = 'Le répertoire est temporairement indisponible. Réessayez dans un moment.';
    box.classList.add('is-error');
  }
}

$('#firms-search').addEventListener('input', (event) => { state.query = event.target.value; render(); });
load();
