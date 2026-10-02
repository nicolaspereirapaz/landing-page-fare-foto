// Medição da campanha: Pixel da Meta, Microsoft Clarity e origem da visita.
// O Pixel e o Clarity só carregam depois que o visitante aceita os cookies (LGPD).
// Sem IDs configurados abaixo, nada externo é carregado e nenhum aviso aparece.
import { attributionRef, cartEventData, isValidPixelId, pickAttribution, productEventData } from './tracking-core.js';

/** ID do Pixel da Meta (Gerenciador de Eventos → Fontes de dados). Só números. */
export const META_PIXEL_ID = '1573158924086279';
/** ID do projeto no Microsoft Clarity (clarity.microsoft.com → Configurações). */
export const CLARITY_ID = '';

const ORIGIN_KEY = 'farefoto-or-origem-v1';
const CONSENT_KEY = 'farefoto-cookies-v1';

const hasPixel = isValidPixelId(META_PIXEL_ID);
const hasClarity = /^[a-z0-9]{6,20}$/i.test(CLARITY_ID);
const pending = [];
let loaded = false;

function storage() {
  try { return window.localStorage; } catch { return null; }
}

/** Guarda de onde veio a visita (último clique em anúncio/rede social vence). */
function captureOrigin() {
  const origin = pickAttribution(location.search, document.referrer, Date.now());
  if (origin) storage()?.setItem(ORIGIN_KEY, JSON.stringify(origin));
}

function readOrigin() {
  try { return JSON.parse(storage()?.getItem(ORIGIN_KEY) ?? 'null'); } catch { return null; }
}

/** Código curto da origem (ex.: OR-META) para a mensagem do WhatsApp; null se não houver. */
export function originRef() {
  return attributionRef(readOrigin(), Date.now());
}

function loadPixel() {
  /* eslint-disable */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  window.fbq('init', META_PIXEL_ID);
  window.fbq('track', 'PageView');
}

function loadClarity() {
  /* eslint-disable */
  (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,'clarity','script',CLARITY_ID);
  /* eslint-enable */
  window.clarity('consent');
  const ref = originRef();
  if (ref) window.clarity('set', 'origem', ref);
}

function loadTrackers() {
  if (loaded) return;
  loaded = true;
  if (hasPixel) loadPixel();
  if (hasClarity) loadClarity();
  while (pending.length) send(...pending.shift());
}

function send(event, data, custom) {
  if (hasPixel && window.fbq) window.fbq(custom ? 'trackCustom' : 'track', event, data);
  if (hasClarity && window.clarity) window.clarity('event', event);
}

/** Envia um evento; antes do aceite fica na fila e sai assim que o visitante aceitar. */
function track(event, data = {}, custom = false) {
  if (!hasPixel && !hasClarity) return;
  if (loaded) send(event, data, custom);
  else pending.push([event, data, custom]);
}

export const trackViewProduct = (product, quantity) => track('ViewContent', productEventData(product, quantity));
export const trackAddToCart = (product, quantity) => track('AddToCart', productEventData(product, quantity));
export const trackCheckout = (items) => track('InitiateCheckout', cartEventData(items));
export const trackLead = (items) => track('Lead', { ...cartEventData(items), content_name: 'Orçamento Outubro Rosa' });
export const trackContact = () => track('Contact', { content_name: 'WhatsApp — outro brinde' });

/** Dá um instante para o evento sair antes de trocar de página (WhatsApp). */
export function afterTracking(callback) {
  if (loaded && (hasPixel || hasClarity)) window.setTimeout(callback, 350);
  else callback();
}

function showConsentBanner() {
  const bar = document.createElement('div');
  bar.className = 'or-consent';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Aviso de cookies');
  bar.innerHTML = `
    <p>Usamos cookies para medir nossos anúncios e melhorar o site. Você pode recusar sem perder nada da navegação.</p>
    <div class="or-consent-actions">
      <button type="button" class="or-consent-no" data-consent="denied">Recusar</button>
      <button type="button" class="or-consent-yes" data-consent="granted">Aceitar</button>
    </div>`;
  bar.addEventListener('click', (event) => {
    const choice = event.target.closest('[data-consent]')?.dataset.consent;
    if (!choice) return;
    storage()?.setItem(CONSENT_KEY, choice);
    bar.remove();
    if (choice === 'granted') loadTrackers();
    else pending.length = 0;
  });
  document.body.append(bar);
}

captureOrigin();
if (hasPixel || hasClarity) {
  const consent = storage()?.getItem(CONSENT_KEY);
  if (consent === 'granted') loadTrackers();
  else if (consent !== 'denied') showConsentBanner();
}
