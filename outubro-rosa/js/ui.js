// Funções compartilhadas pelas páginas da campanha (DOM, dados e contador do carrinho).
import { CART_EVENT, CART_KEY, formatBRL, readCart } from './core.js';

export const BASE = '/outubro-rosa';

let catalogPromise = null;

/** Carrega o catálogo exportado (uma vez por página). */
export function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch(`${BASE}/data/products.json`, { cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => (Array.isArray(data.products) ? data.products : []));
  }
  return catalogPromise;
}

/** "img/produtos/x.webp" → "/outubro-rosa/img/produtos/x.webp" (vazio continua vazio). */
export function imageUrl(path) {
  if (!path) return '';
  return /^https?:\/\//.test(path) || path.startsWith('/') ? path : `${BASE}/${path}`;
}

export function productUrl(product) {
  return `${BASE}/produto/?id=${encodeURIComponent(product.id)}`;
}

/** Nomes do fornecedor vêm em CAIXA ALTA: "CANETA PLÁSTICA 350ML" → "Caneta Plástica 350ml". */
const SMALL_WORDS = new Set(['a', 'as', 'o', 'os', 'e', 'de', 'da', 'das', 'do', 'dos', 'em', 'com', 'para', 'por', 'sem', 'na', 'no', 'nas', 'nos', 'ou']);
const KEEP_UPPER = new Set(['USB', 'LED', 'PVC', 'EVA', 'PU', 'RPET', 'PET', 'A4', 'A5', 'A6', 'MDF', 'ABS', 'RFID', 'TWS', 'UV', 'PP', 'BT', 'C']);
export function formatName(value = '') {
  return value
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      const upper = word.toUpperCase();
      if (KEEP_UPPER.has(upper)) return upper;
      if (/^\d+([.,]\d+)?(ML|L|CM|MM|M|G|KG|W|MAH|GB)$/i.test(word)) return word.replace(/[A-Z]+$/i, (unit) => (unit.toUpperCase() === 'L' ? 'L' : unit.toLowerCase()));
      const lower = word.toLocaleLowerCase('pt-BR');
      if (index > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.replace(/(^|[-/])(\p{L})/gu, (_m, sep, letter) => sep + letter.toLocaleUpperCase('pt-BR'));
    })
    .join(' ');
}

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export function cardHtml(product) {
  const name = escapeHtml(formatName(product.name));
  const href = productUrl(product);
  const colors = product.variants.length;
  const image = imageUrl(product.image);
  const price = typeof product.startingPrice === 'number'
    ? `<small>A partir de</small><strong>${formatBRL(product.startingPrice)}</strong><span>/un. · pedido de 100 un.</span>`
    : '<small>Valor</small><strong>Sob consulta</strong>';
  return `
    <article class="or-card">
      <a class="or-card-img" href="${href}" aria-label="${name}">
        ${image ? `<img src="${image}" alt="${name}" loading="lazy" decoding="async" width="400" height="400">` : ''}
      </a>
      <div class="or-card-body">
        <span class="or-card-cat">${escapeHtml(product.category)}</span>
        <h3><a href="${href}">${name}</a></h3>
        <p class="or-card-colors">${colors} ${colors === 1 ? 'cor disponível' : 'cores disponíveis'}</p>
        <div class="or-card-price">${price}</div>
        <a class="or-card-btn" href="${href}">🛍️ Configurar<span class="extra">&nbsp;produto</span></a>
      </div>
    </article>`;
}

/** Contador do carrinho no topo: número de produtos (linhas). */
export function bindCartCount() {
  const badges = document.querySelectorAll('[data-cart-count]');
  const update = () => {
    const lines = readCart(window.localStorage).length;
    badges.forEach((badge) => {
      badge.textContent = String(lines);
      badge.classList.toggle('show', lines > 0);
    });
  };
  update();
  window.addEventListener(CART_EVENT, update);
  window.addEventListener('storage', (event) => { if (event.key === null || event.key === CART_KEY) update(); });
}

export function setYear() {
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
}
