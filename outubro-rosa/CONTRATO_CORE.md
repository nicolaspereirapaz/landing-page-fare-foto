# Contrato — `outubro-rosa/js/core.js` (landing page estática)

Módulo ES puro (sem dependências, sem DOM obrigatório), usado no navegador via
`<script type="module">` e testado no Node com `node --test`.

## Tipos

```ts
type Pricing = { unitSaleCents: number; freightCents: number }; // preço de venda/un. (já com margem) e frete a ratear, em centavos
type Variant = { id: string; label: string; image: string };
type Product = {
  id: string; name: string; description: string; category: string; image: string;
  variants: Variant[]; startingPrice: number | null; pricing: Pricing | null;
};
type CartItem = {
  id: string; productId: string; name: string; color: string; image: string;
  quantity: number;            // inteiro >= 1
  pricing: Pricing | null;     // null => "sob consulta"
};
type Customer = { name: string; company?: string; phone?: string; notes?: string };
```

## Exports obrigatórios

| Export | Regra |
|---|---|
| `WHATSAPP = "5511953147703"` | número de destino |
| `REFERENCE_QTY = 100` | referência do "a partir de" |
| `QUANTITY_TIERS = [50, 100, 250, 500, 1000]` | faixas da tabela |
| `CART_KEY = "farefoto-outubro-rosa-cart-v1"` | chave do localStorage |
| `CART_EVENT = "or-cart-change"` | evento disparado em `window` após gravar |
| `unitPriceForQuantity(pricing, qty)` | `Math.round((unitSaleCents*qty + freightCents)/qty)/100`; `null` se `pricing` nulo ou `qty` não for inteiro > 0 |
| `priceTiers(pricing)` | `[{quantity, unitPrice}]` para cada `QUANTITY_TIERS`; `[]` se `pricing` nulo |
| `formatBRL(value)` | `"R$ 2,64"`, `"R$ 4.887,60"` — separador de milhar `.`, decimal `,`, **espaço normal** (não NBSP) |
| `normalizeText(s)` | minúsculas, sem acentos, trim |
| `filterProducts(products, {query, category})` | `category` vazio ou `"Todos"` = todas; `query` quebrada em termos por espaço, TODOS os termos devem aparecer em `name + description + category + labels das variações` (normalizados) |
| `readCart(storage)` | lê JSON de `storage.getItem(CART_KEY)`; retorna só itens válidos (`id` string, `name` string, `quantity` inteiro >= 1); JSON inválido/não-array → `[]` |
| `writeCart(storage, items)` | grava JSON; se `globalThis.dispatchEvent` existir, dispara `new Event(CART_EVENT)`; erro de storage é engolido |
| `addToCart(items, item, makeId?)` | **imutável**. Mesmo `productId` + mesma `color` → soma `quantity` na linha existente (atualiza `pricing`/`image`). Senão acrescenta com `id = makeId?.() ?? crypto.randomUUID()` (fallback `Date.now()+random` se não houver crypto) |
| `setItemQuantity(items, id, qty)` | imutável; `qty` arredondado e limitado a `1..999999` |
| `removeItem(items, id)` | imutável |
| `lineUnitPrice(item)` | `unitPriceForQuantity(item.pricing, item.quantity)` |
| `lineSubtotal(item)` | `round2(lineUnitPrice * quantity)` ou `null` |
| `summarizeCart(items)` | `{lines, units, total, hasUnpriced}`; `total` arredondado a 2 casas e soma só os itens com preço |
| `buildQuoteMessage(customer, items)` | texto abaixo |
| `buildWhatsAppUrl(customer, items)` | `https://wa.me/5511953147703?text=` + `encodeURIComponent(mensagem)` |

## Mensagem (formato exato, linhas vazias incluídas)

```
Pedido de orçamento — Outubro Rosa (Fare Foto)

Cliente: Ana
Empresa: ACME                 ← só se houver
WhatsApp: (11) 98888-7777     ← só se houver

1. Caneta Plástica
  • Cor: Rosa                 ← só se color não vazio
  • Quantidade: 500 un.
  • Valor estimado: R$ 1,84/un. — subtotal R$ 920,00     (ou "  • Valor: sob consulta")

2. ...

Total estimado: R$ 4.887,60   ← só se total > 0; acrescenta " (sem os itens sob consulta)" se hasUnpriced
Valores estimados; personalização, frete e prazo a confirmar.

Observações: texto           ← só se houver, seguido de linha vazia
Olá! Gostaria de confirmar disponibilidade, prazo e valor deste pedido.
```

Casos de referência (pricing `{unitSaleCents:184, freightCents:10000}`):
100 un. → 2.84; 250 → 2.24 (subtotal 560); 500 → 2.04.
(pricing `{unitSaleCents:674, freightCents:10000}`: 300 → 7.07)
