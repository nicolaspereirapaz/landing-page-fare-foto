import test from "node:test";
import assert from "node:assert/strict";

import {
  WHATSAPP,
  REFERENCE_QTY,
  QUANTITY_TIERS,
  CART_KEY,
  CART_EVENT,
  unitPriceForQuantity,
  priceTiers,
  formatBRL,
  normalizeText,
  filterProducts,
  readCart,
  writeCart,
  addToCart,
  setItemQuantity,
  removeItem,
  lineUnitPrice,
  lineSubtotal,
  summarizeCart,
  buildQuoteMessage,
  buildWhatsAppUrl,
} from "../js/core.js";

const precoRosa = { unitSaleCents: 184, freightCents: 10000 };

function criarItem(sobrescritas = {}) {
  return {
    id: "item-1",
    productId: "produto-1",
    name: "Caneta Plástica",
    color: "Rosa",
    image: "caneta-rosa.jpg",
    quantity: 100,
    pricing: precoRosa,
    ...sobrescritas,
  };
}

test("exporta as constantes definidas no contrato", () => {
  assert.equal(WHATSAPP, "5511953147703");
  assert.equal(REFERENCE_QTY, 100);
  assert.deepEqual(QUANTITY_TIERS, [50, 100, 250, 500, 1000]);
  assert.equal(CART_KEY, "farefoto-outubro-rosa-cart-v1");
  assert.equal(CART_EVENT, "or-cart-change");
});

test("calcula o preço unitário para as quantidades de referência", () => {
  assert.equal(unitPriceForQuantity(precoRosa, 100), 2.84);
  assert.equal(unitPriceForQuantity(precoRosa, 250), 2.24);
  assert.equal(unitPriceForQuantity(precoRosa, 500), 2.04);
  assert.equal(
    unitPriceForQuantity({ unitSaleCents: 674, freightCents: 10000 }, 300),
    7.07,
  );
});

test("recusa preço nulo e quantidades zero, negativas ou fracionárias", () => {
  assert.equal(unitPriceForQuantity(null, 100), null);
  assert.equal(unitPriceForQuantity(precoRosa, 0), null);
  assert.equal(unitPriceForQuantity(precoRosa, -10), null);
  assert.equal(unitPriceForQuantity(precoRosa, 2.5), null);
});

test("monta todas as faixas de preço e trata preço nulo", () => {
  assert.deepEqual(priceTiers(precoRosa), [
    { quantity: 50, unitPrice: 3.84 },
    { quantity: 100, unitPrice: 2.84 },
    { quantity: 250, unitPrice: 2.24 },
    { quantity: 500, unitPrice: 2.04 },
    { quantity: 1000, unitPrice: 1.94 },
  ]);
  assert.deepEqual(priceTiers(null), []);
});

test("formata reais com milhar e espaço normal", () => {
  assert.equal(formatBRL(2.64), "R$ 2,64");
  assert.equal(formatBRL(4887.6), "R$ 4.887,60");
  assert.doesNotMatch(formatBRL(4887.6), /[\u00a0\u202f]/u);
});

test("normaliza caixa, acentos e espaços externos", () => {
  assert.equal(normalizeText("  CANÇÃO Ágil  "), "cancao agil");
});

test("filtra produtos por acento, múltiplos termos e categoria", () => {
  const produtos = [
    {
      id: "caneta",
      name: "Caneta Plástica",
      description: "Corpo leve para campanhas",
      category: "Escrita",
      image: "caneta.jpg",
      variants: [{ id: "metal", label: "Rosa Metálica", image: "rosa.jpg" }],
      startingPrice: 1.84,
      pricing: precoRosa,
    },
    {
      id: "bolsa",
      name: "Sacola Ecológica",
      description: "Algodão cru",
      category: "Bolsas",
      image: "sacola.jpg",
      variants: [{ id: "natural", label: "Natural", image: "natural.jpg" }],
      startingPrice: null,
      pricing: null,
    },
  ];

  assert.deepEqual(
    filterProducts(produtos, { query: " CANÉTA   metálica ", category: "Todos" }),
    [produtos[0]],
  );
  assert.deepEqual(
    filterProducts(produtos, { query: "campanhas escrita", category: "" }),
    [produtos[0]],
  );
  assert.deepEqual(
    filterProducts(produtos, { query: "caneta natural", category: "Todos" }),
    [],
  );
  assert.deepEqual(
    filterProducts(produtos, { query: "", category: "Bolsas" }),
    [produtos[1]],
  );
});

test("lê apenas itens válidos do carrinho", () => {
  const valido = criarItem();
  const armazenamento = {
    getItem(chave) {
      assert.equal(chave, CART_KEY);
      return JSON.stringify([
        valido,
        { id: 42, name: "ID inválido", quantity: 1 },
        { id: "sem-nome", quantity: 1 },
        { id: "zero", name: "Quantidade zero", quantity: 0 },
        { id: "fracao", name: "Quantidade fracionária", quantity: 1.5 },
      ]);
    },
  };

  assert.deepEqual(readCart(armazenamento), [valido]);
});

test("retorna carrinho vazio para JSON corrompido, valor não-array ou erro", () => {
  assert.deepEqual(readCart({ getItem: () => "{corrompido" }), []);
  assert.deepEqual(readCart({ getItem: () => JSON.stringify({ id: "item" }) }), []);
  assert.deepEqual(
    readCart({
      getItem() {
        throw new Error("armazenamento indisponível");
      },
    }),
    [],
  );
});

test("grava o carrinho e dispara o evento contratado", () => {
  const itens = [criarItem()];
  const gravacoes = [];
  const eventos = [];
  const descritorAnterior = Object.getOwnPropertyDescriptor(globalThis, "dispatchEvent");

  Object.defineProperty(globalThis, "dispatchEvent", {
    configurable: true,
    writable: true,
    value(evento) {
      eventos.push(evento);
      return true;
    },
  });

  try {
    writeCart(
      {
        setItem(chave, valor) {
          gravacoes.push([chave, valor]);
        },
      },
      itens,
    );
  } finally {
    if (descritorAnterior) {
      Object.defineProperty(globalThis, "dispatchEvent", descritorAnterior);
    } else {
      delete globalThis.dispatchEvent;
    }
  }

  assert.deepEqual(gravacoes, [[CART_KEY, JSON.stringify(itens)]]);
  assert.equal(eventos.length, 1);
  assert.ok(eventos[0] instanceof Event);
  assert.equal(eventos[0].type, CART_EVENT);
});

test("engole erros ao gravar o carrinho", () => {
  assert.doesNotThrow(() => {
    writeCart(
      {
        setItem() {
          throw new Error("quota excedida");
        },
      },
      [],
    );
  });
});

test("soma produto e cor repetidos sem alterar o array original", () => {
  const original = [criarItem()];
  const retratoOriginal = structuredClone(original);
  const novoPricing = { unitSaleCents: 200, freightCents: 5000 };

  const resultado = addToCart(original, {
    productId: "produto-1",
    name: "Caneta Plástica",
    color: "Rosa",
    image: "caneta-atualizada.jpg",
    quantity: 50,
    pricing: novoPricing,
  });

  assert.notStrictEqual(resultado, original);
  assert.notStrictEqual(resultado[0], original[0]);
  assert.deepEqual(original, retratoOriginal);
  assert.deepEqual(resultado, [
    criarItem({
      image: "caneta-atualizada.jpg",
      quantity: 150,
      pricing: novoPricing,
    }),
  ]);
});

test("cria uma nova linha para cor diferente sem alterar o array original", () => {
  const original = [criarItem()];
  const retratoOriginal = structuredClone(original);
  let chamadasDoId = 0;

  const resultado = addToCart(
    original,
    {
      productId: "produto-1",
      name: "Caneta Plástica",
      color: "Branca",
      image: "caneta-branca.jpg",
      quantity: 25,
      pricing: precoRosa,
    },
    () => {
      chamadasDoId += 1;
      return "item-2";
    },
  );

  assert.equal(chamadasDoId, 1);
  assert.notStrictEqual(resultado, original);
  assert.deepEqual(original, retratoOriginal);
  assert.deepEqual(resultado[1], criarItem({
    id: "item-2",
    color: "Branca",
    image: "caneta-branca.jpg",
    quantity: 25,
  }));
});

test("arredonda e limita a quantidade sem alterar o array original", () => {
  const original = [criarItem()];
  const retratoOriginal = structuredClone(original);

  const arredondado = setItemQuantity(original, "item-1", 12.6);
  const minimo = setItemQuantity(original, "item-1", -8);
  const maximo = setItemQuantity(original, "item-1", 2000000);

  assert.notStrictEqual(arredondado, original);
  assert.notStrictEqual(arredondado[0], original[0]);
  assert.equal(arredondado[0].quantity, 13);
  assert.equal(minimo[0].quantity, 1);
  assert.equal(maximo[0].quantity, 999999);
  assert.deepEqual(original, retratoOriginal);
});

test("remove uma linha sem alterar o array original", () => {
  const original = [criarItem(), criarItem({ id: "item-2", color: "Branca" })];
  const retratoOriginal = structuredClone(original);
  const resultado = removeItem(original, "item-1");

  assert.notStrictEqual(resultado, original);
  assert.deepEqual(resultado, [original[1]]);
  assert.deepEqual(original, retratoOriginal);
});

test("calcula preço unitário e subtotal da linha", () => {
  const item = criarItem({ quantity: 250 });

  assert.equal(lineUnitPrice(item), 2.24);
  assert.equal(lineSubtotal(item), 560);
  assert.equal(lineUnitPrice(criarItem({ pricing: null })), null);
  assert.equal(lineSubtotal(criarItem({ pricing: null })), null);
});

test("resume linhas, unidades, total dos itens com preço e itens sob consulta", () => {
  const itens = [
    criarItem({ quantity: 250 }),
    criarItem({
      id: "item-2",
      productId: "produto-2",
      name: "Sacola",
      quantity: 30,
      pricing: null,
    }),
    criarItem({
      id: "item-3",
      productId: "produto-3",
      name: "Copo",
      quantity: 300,
      pricing: { unitSaleCents: 674, freightCents: 10000 },
    }),
  ];

  assert.deepEqual(summarizeCart(itens), {
    lines: 3,
    units: 580,
    total: 2681,
    hasUnpriced: true,
  });
  assert.deepEqual(summarizeCart([]), {
    lines: 0,
    units: 0,
    total: 0,
    hasUnpriced: false,
  });
});

test("monta a mensagem exata com empresa, observações e item com preço", () => {
  const mensagem = buildQuoteMessage(
    {
      name: "Ana",
      company: "ACME",
      phone: "(11) 98888-7777",
      notes: "Entregar pela manhã",
    },
    [criarItem({ quantity: 500, pricing: { unitSaleCents: 184, freightCents: 0 } })],
  );

  assert.equal(
    mensagem,
    [
      "Pedido de orçamento — Outubro Rosa (Fare Foto)",
      "",
      "Cliente: Ana",
      "Empresa: ACME",
      "WhatsApp: (11) 98888-7777",
      "",
      "1. Caneta Plástica",
      "  • Cor: Rosa",
      "  • Quantidade: 500 un.",
      "  • Valor estimado: R$ 1,84/un. — subtotal R$ 920,00",
      "",
      "Total estimado: R$ 920,00",
      "Valores estimados; personalização, frete e prazo a confirmar.",
      "",
      "Observações: Entregar pela manhã",
      "",
      "Olá! Gostaria de confirmar disponibilidade, prazo e valor deste pedido.",
    ].join("\n"),
  );
});

test("monta a mensagem exata sem campos opcionais e com item sob consulta", () => {
  const mensagem = buildQuoteMessage(
    { name: "Bruno" },
    [
      criarItem({ color: "", quantity: 100 }),
      criarItem({
        id: "item-2",
        productId: "produto-2",
        name: "Sacola",
        color: "Rosa",
        quantity: 25,
        pricing: null,
      }),
    ],
  );

  assert.equal(
    mensagem,
    [
      "Pedido de orçamento — Outubro Rosa (Fare Foto)",
      "",
      "Cliente: Bruno",
      "",
      "1. Caneta Plástica",
      "  • Quantidade: 100 un.",
      "  • Valor estimado: R$ 2,84/un. — subtotal R$ 284,00",
      "",
      "2. Sacola",
      "  • Cor: Rosa",
      "  • Quantidade: 25 un.",
      "  • Valor: sob consulta",
      "",
      "Total estimado: R$ 284,00 (sem os itens sob consulta)",
      "Valores estimados; personalização, frete e prazo a confirmar.",
      "",
      "Olá! Gostaria de confirmar disponibilidade, prazo e valor deste pedido.",
    ].join("\n"),
  );
});

test("omite o total quando todos os itens estão sob consulta", () => {
  const mensagem = buildQuoteMessage(
    { name: "Carla" },
    [criarItem({ pricing: null })],
  );

  assert.doesNotMatch(mensagem, /Total estimado:/u);
  assert.match(mensagem, /  • Valor: sob consulta/u);
  assert.match(mensagem, /Valores estimados; personalização, frete e prazo a confirmar\./u);
});

test("monta a URL do WhatsApp com a mensagem codificada", () => {
  const cliente = { name: "Ana" };
  const itens = [criarItem({ pricing: null })];

  assert.equal(
    buildWhatsAppUrl(cliente, itens),
    `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(buildQuoteMessage(cliente, itens))}`,
  );
});
