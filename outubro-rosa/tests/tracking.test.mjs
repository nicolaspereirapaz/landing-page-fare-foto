import test from "node:test";
import assert from "node:assert/strict";

import {
  ATTRIBUTION_TTL_MS,
  attributionRef,
  cartEventData,
  isValidPixelId,
  pickAttribution,
  productEventData,
} from "../js/tracking-core.js";
import { buildQuoteMessage } from "../js/core.js";

const NOW = Date.UTC(2026, 9, 1, 12);

test("reconhece visita vinda de anúncio da Meta pelas UTMs ou pelo fbclid", () => {
  assert.deepEqual(
    pickAttribution("?utm_source=facebook&utm_medium=paid&utm_campaign=Outubro Rosa 2026&utm_content=video1", "", NOW),
    { source: "meta", campaign: "Outubro Rosa 2026", content: "video1", at: NOW },
  );
  assert.deepEqual(pickAttribution("?fbclid=AbC123", "", NOW), { source: "meta", campaign: "", content: "", at: NOW });
  assert.equal(pickAttribution("?utm_source=ig", "", NOW).source, "meta");
  assert.equal(pickAttribution("?utm_source=google&utm_campaign=x", "", NOW).source, "google");
});

test("visita orgânica do Instagram/Facebook também é marcada; acesso direto não", () => {
  assert.equal(pickAttribution("", "https://l.instagram.com/", NOW).source, "instagram");
  assert.equal(pickAttribution("", "https://m.facebook.com/", NOW).source, "facebook");
  assert.equal(pickAttribution("", "", NOW), null);
  assert.equal(pickAttribution("", "https://www.farefoto.com.br/", NOW), null);
});

test("código curto da origem para a mensagem do WhatsApp", () => {
  assert.equal(attributionRef({ source: "meta", campaign: "", content: "", at: NOW }, NOW), "OR-META");
  assert.equal(attributionRef({ source: "meta", campaign: "Outubro Rosa 2026", content: "", at: NOW }, NOW), "OR-META-OUTUBRO-ROSA-2026");
  assert.equal(attributionRef({ source: "meta", campaign: "x".repeat(60), content: "", at: NOW }, NOW).length <= 32, true);
  assert.equal(attributionRef({ source: "instagram", campaign: "", content: "", at: NOW }, NOW), "OR-INSTAGRAM");
  assert.equal(attributionRef(null, NOW), null);
  // depois de 30 dias a origem expira
  assert.equal(attributionRef({ source: "meta", campaign: "", content: "", at: NOW - ATTRIBUTION_TTL_MS - 1 }, NOW), null);
});

test("dados do evento de produto (ViewContent/AddToCart) em reais", () => {
  const product = { id: "cf93", name: "Caneta", category: "Escrita", pricing: { unitSaleCents: 164, freightCents: 10000 } };
  assert.deepEqual(productEventData(product, 100), {
    content_ids: ["cf93"], content_name: "Caneta", content_category: "Escrita", content_type: "product",
    contents: [{ id: "cf93", quantity: 100 }], currency: "BRL", value: 264,
  });
  assert.deepEqual(productEventData({ id: "z", name: "Z", category: "", pricing: null }, 50).value, 0);
});

test("dados do evento do carrinho (InitiateCheckout/Lead) com total estimado", () => {
  const items = [
    { productId: "a", quantity: 100, pricing: { unitSaleCents: 164, freightCents: 10000 } },
    { productId: "b", quantity: 50, pricing: null },
  ];
  assert.deepEqual(cartEventData(items), {
    content_ids: ["a", "b"], content_type: "product",
    contents: [{ id: "a", quantity: 100 }, { id: "b", quantity: 50 }],
    num_items: 150, currency: "BRL", value: 264,
  });
});

test("só aceita ID de Pixel numérico", () => {
  assert.equal(isValidPixelId("123456789012345"), true);
  assert.equal(isValidPixelId(""), false);
  assert.equal(isValidPixelId("abc"), false);
});

test("a mensagem do WhatsApp leva o código da origem quando houver", () => {
  const items = [{ name: "Caneta", color: "Rosa", quantity: 100, pricing: { unitSaleCents: 164, freightCents: 10000 } }];
  assert.match(buildQuoteMessage({ name: "Ana" }, items, "OR-META"), /\n\nRef\.: OR-META$/);
  assert.doesNotMatch(buildQuoteMessage({ name: "Ana" }, items), /Ref\.:/);
});
