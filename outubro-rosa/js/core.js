export const WHATSAPP = "5511953147703";
export const REFERENCE_QTY = 100;
export const QUANTITY_TIERS = [50, 100, 250, 500, 1000];
export const CART_KEY = "farefoto-outubro-rosa-cart-v1";
export const CART_EVENT = "or-cart-change";

export function unitPriceForQuantity(preco, quantidade) {
  if (preco == null || !Number.isInteger(quantidade) || quantidade <= 0) {
    return null;
  }

  return Math.round(
    (preco.unitSaleCents * quantidade + preco.freightCents) / quantidade,
  ) / 100;
}

export function priceTiers(preco) {
  if (preco == null) {
    return [];
  }

  return QUANTITY_TIERS.map((quantidade) => ({
    quantity: quantidade,
    unitPrice: unitPriceForQuantity(preco, quantidade),
  }));
}

export function formatBRL(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
    .format(valor)
    .replace(/[\u00a0\u202f]/gu, " ");
}

export function normalizeText(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function filterProducts(
  produtos,
  { query: consulta = "", category: categoria = "" } = {},
) {
  const categoriaNormalizada = normalizeText(categoria);
  const termos = normalizeText(consulta).split(/\s+/u).filter(Boolean);
  const incluiTodasAsCategorias = categoriaNormalizada === ""
    || categoriaNormalizada === "todos";

  return produtos.filter((produto) => {
    if (
      !incluiTodasAsCategorias
      && normalizeText(produto.category) !== categoriaNormalizada
    ) {
      return false;
    }

    const nomesDasVariacoes = (produto.variants ?? [])
      .map((variacao) => variacao.label)
      .join(" ");
    const textoPesquisavel = normalizeText([
      produto.name,
      produto.description,
      produto.category,
      nomesDasVariacoes,
    ].join(" "));

    return termos.every((termo) => textoPesquisavel.includes(termo));
  });
}

export function readCart(armazenamento) {
  try {
    const dados = JSON.parse(armazenamento.getItem(CART_KEY));

    if (!Array.isArray(dados)) {
      return [];
    }

    return dados.filter((item) => (
      typeof item?.id === "string"
      && typeof item.name === "string"
      && Number.isInteger(item.quantity)
      && item.quantity >= 1
    ));
  } catch {
    return [];
  }
}

export function writeCart(armazenamento, itens) {
  try {
    armazenamento.setItem(CART_KEY, JSON.stringify(itens));

    if (typeof globalThis.dispatchEvent === "function") {
      globalThis.dispatchEvent(new Event(CART_EVENT));
    }
  } catch {
    // O carrinho continua disponível em memória quando o armazenamento falha.
  }
}

function criarIdDoItem(gerarId) {
  const idFornecido = gerarId?.();

  if (idFornecido != null) {
    return idFornecido;
  }

  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return String(Date.now() + Math.random());
}

export function addToCart(itens, novoItem, gerarId) {
  const itemRepetido = itens.some((itemAtual) => (
    itemAtual.productId === novoItem.productId
    && itemAtual.color === novoItem.color
  ));

  if (itemRepetido) {
    return itens.map((itemAtual) => {
      const eOMesmoItem = itemAtual.productId === novoItem.productId
        && itemAtual.color === novoItem.color;

      if (!eOMesmoItem) {
        return itemAtual;
      }

      return {
        ...itemAtual,
        quantity: itemAtual.quantity + novoItem.quantity,
        pricing: novoItem.pricing,
        image: novoItem.image,
      };
    });
  }

  return [
    ...itens,
    {
      ...novoItem,
      id: criarIdDoItem(gerarId),
    },
  ];
}

export function setItemQuantity(itens, id, quantidadeInformada) {
  const quantidade = Math.min(
    999999,
    Math.max(1, Math.round(quantidadeInformada)),
  );

  return itens.map((item) => (
    item.id === id
      ? { ...item, quantity: quantidade }
      : item
  ));
}

export function removeItem(itens, id) {
  return itens.filter((item) => item.id !== id);
}

export function lineUnitPrice(item) {
  return unitPriceForQuantity(item.pricing, item.quantity);
}

function arredondarDuasCasas(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function lineSubtotal(item) {
  const precoUnitario = lineUnitPrice(item);

  if (precoUnitario == null) {
    return null;
  }

  return arredondarDuasCasas(precoUnitario * item.quantity);
}

export function summarizeCart(itens) {
  let unidades = 0;
  let total = 0;
  let temItemSemPreco = false;

  for (const item of itens) {
    unidades += item.quantity;

    const subtotal = lineSubtotal(item);
    if (subtotal == null) {
      temItemSemPreco = true;
    } else {
      total += subtotal;
    }
  }

  return {
    lines: itens.length,
    units: unidades,
    total: arredondarDuasCasas(total),
    hasUnpriced: temItemSemPreco,
  };
}

export function buildQuoteMessage(cliente, itens) {
  const linhasDoCliente = [`Cliente: ${cliente.name}`];

  if (cliente.company) {
    linhasDoCliente.push(`Empresa: ${cliente.company}`);
  }

  if (cliente.phone) {
    linhasDoCliente.push(`WhatsApp: ${cliente.phone}`);
  }

  const blocos = [
    [
      "Pedido de orçamento — Outubro Rosa (Fare Foto)",
      "",
      ...linhasDoCliente,
    ].join("\n"),
  ];

  itens.forEach((item, indice) => {
    const linhasDoItem = [`${indice + 1}. ${item.name}`];

    if (item.color) {
      linhasDoItem.push(`  • Cor: ${item.color}`);
    }

    linhasDoItem.push(`  • Quantidade: ${item.quantity} un.`);

    const precoUnitario = lineUnitPrice(item);
    const subtotal = lineSubtotal(item);
    if (precoUnitario == null || subtotal == null) {
      linhasDoItem.push("  • Valor: sob consulta");
    } else {
      linhasDoItem.push(
        `  • Valor estimado: ${formatBRL(precoUnitario)}/un. — subtotal ${formatBRL(subtotal)}`,
      );
    }

    blocos.push(linhasDoItem.join("\n"));
  });

  const resumo = summarizeCart(itens);
  const linhasDoResumo = [];

  if (resumo.total > 0) {
    const avisoSemPreco = resumo.hasUnpriced
      ? " (sem os itens sob consulta)"
      : "";
    linhasDoResumo.push(`Total estimado: ${formatBRL(resumo.total)}${avisoSemPreco}`);
  }

  linhasDoResumo.push("Valores estimados; personalização, frete e prazo a confirmar.");
  blocos.push(linhasDoResumo.join("\n"));

  if (cliente.notes) {
    blocos.push(`Observações: ${cliente.notes}`);
  }

  blocos.push("Olá! Gostaria de confirmar disponibilidade, prazo e valor deste pedido.");

  return blocos.join("\n\n");
}

export function buildWhatsAppUrl(cliente, itens) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(buildQuoteMessage(cliente, itens))}`;
}
