// Página do produto: galeria por cor, tabela de quantidades, cálculo automático e carrinho.
import { REFERENCE_QTY, addToCart, formatBRL, priceTiers, readCart, unitPriceForQuantity, writeCart } from './core.js';
import { BASE, bindCartCount, cardHtml, escapeHtml, formatName, imageUrl, loadCatalog, setYear } from './ui.js';

const root = document.querySelector('[data-product-root]');
const id = new URLSearchParams(location.search).get('id') ?? '';

bindCartCount();
setYear();

function notFound(message) {
  document.title = 'Produto indisponível – Outubro Rosa | Fare Foto';
  root.innerHTML = `
    <div class="or-cart-empty" style="margin:40px 0">
      <h2>Produto indisponível</h2>
      <p>${escapeHtml(message)}</p>
      <a class="btn-pink" href="${BASE}/">Ver brindes do Outubro Rosa</a>
    </div>`;
}

function render(product, all) {
  const name = formatName(product.name);
  document.title = `${name} – Outubro Rosa | Fare Foto`;
  const tiers = priceTiers(product.pricing);
  const state = { variant: product.variants[0], quantity: REFERENCE_QTY, custom: false, customText: '' };

  root.innerHTML = `
    <nav class="or-breadcrumb" aria-label="Caminho">
      <a href="${BASE}/">← Outubro Rosa</a><span>/</span><span>${escapeHtml(product.category)}</span><span>/</span><strong>${escapeHtml(name)}</strong>
    </nav>
    <div class="or-product">
      <div>
        <div class="or-gallery">
          <div class="or-thumbs" data-thumbs aria-label="Cores do produto">
            ${product.variants.map((v, i) => `<button type="button" data-variant="${i}" aria-label="Ver cor ${escapeHtml(v.label)}" title="${escapeHtml(v.label)}">${v.image ? `<img src="${imageUrl(v.image)}" alt="" loading="lazy" width="72" height="72">` : ''}</button>`).join('')}
          </div>
          <div class="or-main-img"><img data-main-img alt="" width="800" height="800"><span class="or-badge">Outubro Rosa</span></div>
        </div>
        <div class="or-highlights">
          <span>Personalização com sua marca</span>
          <span>${product.variants.length} ${product.variants.length === 1 ? 'cor disponível' : 'cores disponíveis'}</span>
          <span>Orçamento pelo WhatsApp</span>
        </div>
      </div>

      <div class="or-config">
        <p class="or-label">Configure seu produto</p>
        <h1>${escapeHtml(name)}</h1>
        <p>${escapeHtml(product.description || 'Brinde da seleção Outubro Rosa, personalizado pela Fare Foto para a sua campanha.')}</p>
        <div class="or-draft">Opções iniciais para montar o pedido. Disponibilidade, valor e prazo são confirmados pela equipe no WhatsApp.</div>

        <span class="or-field-label">Cor <small data-color-name></small></span>
        <div class="or-colors" data-colors>
          ${product.variants.map((v, i) => `<button type="button" data-variant="${i}">${escapeHtml(v.label)}</button>`).join('')}
        </div>

        <span class="or-field-label">Escolha a quantidade</span>
        <div class="or-qty-table" role="radiogroup" aria-label="Quantidade">
          <div class="or-qty-head" aria-hidden="true"><span>Quantidade</span><span>Valor por unidade</span></div>
          ${tiers.map((t) => `<label class="or-qty-row" data-tier="${t.quantity}"><span><input type="radio" name="qty" value="${t.quantity}">${t.quantity} unidades</span><strong>${formatBRL(t.unitPrice)}</strong></label>`).join('')}
          <label class="or-qty-row" data-tier="custom">
            <span><input type="radio" name="qty" value="custom">Outra quantidade
              <input class="or-qty-custom" data-custom inputmode="numeric" maxlength="6" placeholder="ex.: 300" aria-label="Outra quantidade"></span>
            <strong data-custom-price>${product.pricing ? 'Digite a quantidade' : 'Sob consulta'}</strong>
          </label>
        </div>

        <div class="or-summary">
          <div>
            <span data-sum-label></span>
            <strong data-sum-price></strong>
            <small data-sum-total></small>
          </div>
          <button class="btn-pink" type="button" data-add><svg class="icon-bag" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 10a4 4 0 0 1-8 0"/><path d="M3.103 6.034h17.794"/><path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"/></svg>Adicionar ao carrinho</button>
        </div>
        <p class="or-notice" style="margin-top:14px"><span><strong>Valor estimado.</strong> Os preços exibidos são uma referência e podem mudar no orçamento final, conforme quantidade, personalização, cor escolhida e frete.</span></p>
        <div class="or-added" data-added role="status"><span>✓ Adicionado ao carrinho Outubro Rosa.</span><a href="${BASE}/carrinho/">Ver carrinho</a></div>
      </div>
    </div>`;

  const mainImg = root.querySelector('[data-main-img]');
  const colorName = root.querySelector('[data-color-name]');
  const customInput = root.querySelector('[data-custom]');
  const customPrice = root.querySelector('[data-custom-price]');
  const added = root.querySelector('[data-added]');
  const addButton = root.querySelector('[data-add]');

  const orderQuantity = () => (state.custom ? Number(state.customText) || 0 : state.quantity);

  function paint() {
    const v = state.variant;
    const src = imageUrl(v.image || product.image);
    if (src) { mainImg.src = src; mainImg.alt = `${name} — ${v.label}`; mainImg.hidden = false; } else { mainImg.hidden = true; }
    colorName.textContent = v.label;
    root.querySelectorAll('[data-variant]').forEach((button) => {
      const active = product.variants[Number(button.dataset.variant)] === v;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    root.querySelectorAll('.or-qty-row').forEach((row) => {
      const active = state.custom ? row.dataset.tier === 'custom' : row.dataset.tier === String(state.quantity);
      row.classList.toggle('active', active);
      row.querySelector('input[type=radio]').checked = active;
    });

    const qty = orderQuantity();
    const unit = qty > 0 ? unitPriceForQuantity(product.pricing, qty) : null;
    if (state.custom) {
      customPrice.textContent = unit !== null ? formatBRL(unit) : (product.pricing ? 'Digite a quantidade' : 'Sob consulta');
    } else {
      customPrice.textContent = product.pricing ? 'Digite a quantidade' : 'Sob consulta';
    }
    const label = root.querySelector('[data-sum-label]');
    const price = root.querySelector('[data-sum-price]');
    const total = root.querySelector('[data-sum-total]');
    if (unit !== null) {
      label.textContent = `Valor estimado · ${qty} ${qty === 1 ? 'unidade' : 'unidades'}`;
      price.innerHTML = `${formatBRL(unit)}<em>/un.</em>`;
      total.textContent = `Total estimado ${formatBRL(Math.round(unit * qty * 100) / 100)}. Confirmaremos valor, prazo e entrega.`;
    } else if (typeof product.startingPrice === 'number') {
      label.textContent = 'A partir de';
      price.innerHTML = `${formatBRL(product.startingPrice)}<em>/un.</em>`;
      total.textContent = 'Confirmaremos valor, prazo e retirada ou entrega.';
    } else {
      label.textContent = 'Valor do pedido';
      price.textContent = 'Sob consulta';
      total.textContent = 'Confirmaremos valor, prazo e retirada ou entrega.';
    }
    addButton.disabled = qty < 1;
  }

  function hideAdded() { added.classList.remove('show'); }

  root.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-variant]');
    if (!button) return;
    state.variant = product.variants[Number(button.dataset.variant)];
    hideAdded();
    paint();
  });

  root.querySelectorAll('.or-qty-row input[type=radio]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.value === 'custom') {
        state.custom = true;
        customInput.focus();
      } else {
        state.custom = false;
        state.quantity = Number(radio.value);
        customInput.value = '';
        state.customText = '';
      }
      hideAdded();
      paint();
    });
  });

  // Campo começa vazio (placeholder "ex.: 300"): o cliente digita direto, sem apagar nada.
  customInput.addEventListener('focus', () => {
    state.custom = true;
    customInput.select();
    hideAdded();
    paint();
  });
  customInput.addEventListener('input', () => {
    state.custom = true;
    state.customText = customInput.value.replace(/\D/g, '').replace(/^0+/, '');
    customInput.value = state.customText;
    hideAdded();
    paint();
  });

  addButton.addEventListener('click', () => {
    const qty = orderQuantity();
    if (qty < 1) return;
    const v = state.variant;
    const next = addToCart(readCart(window.localStorage), {
      productId: product.id,
      name,
      color: v.label,
      image: v.image || product.image,
      quantity: qty,
      pricing: product.pricing,
    });
    writeCart(window.localStorage, next);
    added.classList.add('show');
  });

  paint();

  const related = all.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 3);
  if (related.length) {
    document.querySelector('[data-related]').hidden = false;
    document.querySelector('[data-related-title]').textContent = `Mais em ${product.category}`;
    document.querySelector('[data-related-grid]').innerHTML = related.map(cardHtml).join('');
  }
}

loadCatalog()
  .then((all) => {
    const product = all.find((p) => p.id === id);
    if (!product || !product.variants?.length) notFound('Este item não faz mais parte da seleção ou está sem estoque.');
    else render(product, all);
  })
  .catch(() => notFound('Não foi possível carregar este produto agora. Atualize a página em instantes.'));
