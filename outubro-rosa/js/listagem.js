// Listagem da campanha: busca, categorias e grade de produtos.
import { filterProducts } from './core.js';
import { bindCartCount, cardHtml, escapeHtml, loadCatalog, setYear } from './ui.js';

const PAGE = 24;
const MIN_CATEGORY = 3; // categorias com poucos itens ficam só em "Todos"

const grid = document.querySelector('[data-grid]');
const count = document.querySelector('[data-count]');
const empty = document.querySelector('[data-empty]');
const more = document.querySelector('[data-more]');
const search = document.querySelector('[data-search]');
const categoriesBox = document.querySelector('[data-categories]');

const params = new URLSearchParams(location.search);
const state = { query: params.get('q') ?? '', category: params.get('categoria') ?? 'Todos', shown: PAGE };
let products = [];

function syncUrl() {
  const next = new URLSearchParams();
  if (state.query) next.set('q', state.query);
  if (state.category !== 'Todos') next.set('categoria', state.category);
  const query = next.toString(); // (URLSearchParams.size não existe no iOS 16)
  history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}`);
}

function renderCategories() {
  const counts = new Map();
  for (const product of products) counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
  const list = [...counts]
    .filter(([, total]) => total >= MIN_CATEGORY)
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
  const entries = [['Todos', products.length], ...list];
  categoriesBox.innerHTML = entries
    .map(([name, total]) => `<button type="button" data-cat="${escapeHtml(name)}" class="${state.category === name ? 'active' : ''}" aria-pressed="${state.category === name}">
        <span>${name === 'Todos' ? 'Todos os brindes' : escapeHtml(name)}</span><small>${total}</small></button>`)
    .join('');
}

function render() {
  const filtered = filterProducts(products, { query: state.query, category: state.category });
  count.textContent = `${filtered.length} ${filtered.length === 1 ? 'produto' : 'produtos'}`;
  grid.innerHTML = filtered.slice(0, state.shown).map(cardHtml).join('');
  empty.hidden = filtered.length > 0;
  more.hidden = filtered.length <= state.shown;
  categoriesBox.querySelectorAll('button').forEach((button) => {
    const active = button.dataset.cat === state.category;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

categoriesBox.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-cat]');
  if (!button) return;
  state.category = button.dataset.cat;
  state.shown = PAGE;
  syncUrl();
  render();
});

let timer;
search.value = state.query;
search.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    state.query = search.value.trim();
    state.shown = PAGE;
    syncUrl();
    render();
  }, 180);
});

more.addEventListener('click', () => {
  state.shown += PAGE;
  render();
});

bindCartCount();
setYear();

loadCatalog()
  .then((list) => {
    products = list;
    if (state.category !== 'Todos' && !products.some((p) => p.category === state.category)) state.category = 'Todos';
    renderCategories();
    render();
  })
  .catch(() => {
    count.textContent = 'Não foi possível carregar os produtos.';
    empty.hidden = false;
    empty.innerHTML = '<p><strong>Não foi possível carregar os produtos agora.</strong></p><p>Atualize a página em instantes.</p>';
  });
