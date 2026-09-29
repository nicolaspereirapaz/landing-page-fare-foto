// Página do carrinho: ajustar quantidades, ver total estimado e enviar pelo WhatsApp.
import {
  buildWhatsAppUrl, formatBRL, lineSubtotal, lineUnitPrice, readCart, removeItem, setItemQuantity, summarizeCart, writeCart,
} from './core.js';
import { BASE, bindCartCount, escapeHtml, imageUrl, loadCatalog, setYear } from './ui.js';

const STEP = 10;

const emptyBox = document.querySelector('[data-cart-empty]');
const filledBox = document.querySelector('[data-cart-filled]');
const list = document.querySelector('[data-cart-list]');
const info = document.querySelector('[data-cart-info]');
const form = document.querySelector('[data-quote-form]');

let cart = readCart(window.localStorage);

function save(next) {
  cart = next;
  writeCart(window.localStorage, cart);
  render();
}

function productHref(item) {
  return `${BASE}/produto/?id=${encodeURIComponent(item.productId)}`;
}

function render() {
  const summary = summarizeCart(cart);
  emptyBox.hidden = cart.length > 0;
  filledBox.hidden = cart.length === 0;
  if (!cart.length) return;

  info.textContent = `${summary.lines} ${summary.lines === 1 ? 'produto' : 'produtos'} · ${summary.units.toLocaleString('pt-BR')} unidades`;
  list.innerHTML = cart.map((item) => {
    const unit = lineUnitPrice(item);
    const subtotal = lineSubtotal(item);
    const image = escapeHtml(imageUrl(item.image));
    const name = escapeHtml(item.name);
    return `
      <li class="or-cart-row" data-id="${escapeHtml(item.id)}">
        <a class="or-cart-img" href="${productHref(item)}" aria-label="${name}">${image ? `<img src="${image}" alt="" loading="lazy">` : ''}</a>
        <div class="or-cart-info">
          <h2><a href="${productHref(item)}">${name}</a></h2>
          ${item.color ? `<p>Cor: <strong>${escapeHtml(item.color)}</strong></p>` : ''}
          <p>${unit !== null ? `${formatBRL(unit)} <small>/un. estimado</small>` : 'Valor sob consulta'}</p>
        </div>
        <div class="or-cart-qty">
          <span class="or-cart-lbl">Quantidade</span>
          <div class="or-stepper">
            <button type="button" data-step="-${STEP}" aria-label="Diminuir ${STEP} unidades" ${item.quantity <= 1 ? 'disabled' : ''}>−</button>
            <input data-qty inputmode="numeric" maxlength="6" value="${item.quantity}" aria-label="Quantidade de ${name}">
            <button type="button" data-step="${STEP}" aria-label="Aumentar ${STEP} unidades">+</button>
          </div>
        </div>
        <div class="or-cart-sub"><span class="or-cart-lbl">Subtotal</span><strong>${subtotal !== null ? formatBRL(subtotal) : 'Sob consulta'}</strong></div>
        <button class="or-remove" type="button" data-remove aria-label="Remover ${name}">🗑</button>
      </li>`;
  }).join('');

  document.querySelector('[data-sum-lines]').textContent = String(summary.lines);
  document.querySelector('[data-sum-units]').textContent = summary.units.toLocaleString('pt-BR');
  document.querySelector('[data-sum-total]').textContent = summary.total > 0
    ? `${formatBRL(summary.total)}${summary.hasUnpriced ? '*' : ''}`
    : 'Sob consulta';
}

list.addEventListener('click', (event) => {
  const row = event.target.closest('[data-id]');
  if (!row) return;
  const item = cart.find((entry) => entry.id === row.dataset.id);
  if (!item) return;
  const step = event.target.closest('[data-step]');
  if (step) save(setItemQuantity(cart, item.id, item.quantity + Number(step.dataset.step)));
  if (event.target.closest('[data-remove]')) save(removeItem(cart, item.id));
});

function commitQuantity(input) {
  const row = input.closest('[data-id]');
  const value = Number(input.value.replace(/\D/g, ''));
  if (row && value >= 1) save(setItemQuantity(cart, row.dataset.id, value));
  else render();
}
list.addEventListener('change', (event) => { if (event.target.matches('[data-qty]')) commitQuantity(event.target); });
list.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target.matches('[data-qty]')) { event.preventDefault(); commitQuantity(event.target); }
});
list.addEventListener('input', (event) => {
  if (event.target.matches('[data-qty]')) event.target.value = event.target.value.replace(/\D/g, '');
});

document.querySelector('[data-clear]').addEventListener('click', () => {
  if (window.confirm('Remover todos os itens do carrinho?')) save([]);
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!cart.length) return;
  const data = new FormData(form);
  const customer = {
    name: String(data.get('name') ?? '').trim(),
    company: String(data.get('company') ?? '').trim(),
    phone: String(data.get('phone') ?? '').trim(),
    notes: String(data.get('notes') ?? '').trim(),
  };
  window.location.assign(buildWhatsAppUrl(customer, cart));
});

window.addEventListener('storage', () => { cart = readCart(window.localStorage); render(); });

bindCartCount();
setYear();
render();

// Atualiza preço e foto dos itens com o catálogo publicado agora: um carrinho antigo
// não pode mostrar o preço de uma exportação anterior.
loadCatalog()
  .then((products) => {
    const byId = new Map(products.map((product) => [product.id, product]));
    let changed = false;
    const next = cart.map((item) => {
      const product = byId.get(item.productId);
      if (!product) return item;
      const variant = product.variants.find((v) => v.label === item.color);
      const pricing = product.pricing ?? null;
      const image = variant?.image || item.image;
      if (JSON.stringify(pricing) === JSON.stringify(item.pricing ?? null) && image === item.image) return item;
      changed = true;
      return { ...item, pricing, image };
    });
    if (changed) save(next);
  })
  .catch(() => { /* sem catálogo: mantém os valores guardados no carrinho */ });
