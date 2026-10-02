// Regras puras do rastreamento da campanha (sem DOM): origem da visita e dados dos eventos do Pixel.
import { lineSubtotal, summarizeCart } from "./core.js";

/** A origem da visita vale por 30 dias (mesma janela padrão de atribuição da Meta para cliques). */
export const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const META_SOURCES = new Set(["facebook", "fb", "instagram", "ig", "meta", "an", "msg", "messenger"]);

/**
 * Descobre de onde veio a visita.
 * - Anúncio da Meta: utm_source de Facebook/Instagram ou o parâmetro fbclid que a Meta coloca no link.
 * - Outras campanhas com UTM: usa o utm_source.
 * - Sem UTM, mas vindo do Instagram/Facebook: orgânico daquela rede.
 * Retorna null para acesso direto/interno (não substitui uma origem já guardada).
 */
export function pickAttribution(search, referrer, now) {
  const params = new URLSearchParams(search);
  const source = (params.get("utm_source") ?? "").trim().toLowerCase();
  const campaign = (params.get("utm_campaign") ?? "").trim();
  const content = (params.get("utm_content") ?? "").trim();

  if (META_SOURCES.has(source) || (!source && params.has("fbclid"))) {
    return { source: "meta", campaign, content, at: now };
  }
  if (source) return { source: source.replace(/[^a-z0-9_-]/g, "").slice(0, 20) || "outro", campaign, content, at: now };

  let host = "";
  try {
    host = referrer ? new URL(referrer).hostname : "";
  } catch {
    host = "";
  }
  if (/(^|\.)instagram\.com$/.test(host)) return { source: "instagram", campaign: "", content: "", at: now };
  if (/(^|\.)facebook\.com$/.test(host)) return { source: "facebook", campaign: "", content: "", at: now };
  return null;
}

/** "OR-META-OUTUBRO-ROSA-2026": vai no fim da mensagem do WhatsApp para saber de onde veio a conversa. */
export function attributionRef(attribution, now) {
  if (!attribution || !attribution.source) return null;
  if (typeof attribution.at !== "number" || now - attribution.at > ATTRIBUTION_TTL_MS) return null;
  const slug = (value) => value
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  const parts = ["OR", slug(attribution.source), slug(attribution.campaign ?? "")].filter(Boolean);
  return parts.join("-").slice(0, 32).replace(/-$/, "");
}

/** ViewContent / AddToCart de um produto na quantidade escolhida (valor estimado em reais). */
export function productEventData(product, quantity) {
  return {
    content_ids: [product.id],
    content_name: product.name,
    content_category: product.category ?? "",
    content_type: "product",
    contents: [{ id: product.id, quantity }],
    currency: "BRL",
    value: lineSubtotal({ quantity, pricing: product.pricing ?? null }) ?? 0,
  };
}

/** InitiateCheckout / Lead com o carrinho inteiro. */
export function cartEventData(items) {
  return {
    content_ids: items.map((item) => item.productId),
    content_type: "product",
    contents: items.map((item) => ({ id: item.productId, quantity: item.quantity })),
    num_items: items.reduce((total, item) => total + item.quantity, 0),
    currency: "BRL",
    value: summarizeCart(items).total,
  };
}

export function isValidPixelId(value) {
  return typeof value === "string" && /^\d{10,20}$/.test(value);
}
