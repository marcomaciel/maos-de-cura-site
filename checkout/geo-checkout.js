/**
 * geo-checkout.js — Módulo de checkout multi-país
 *
 * Detecta o país do visitante e exibe o checkout correspondente.
 * Suporta BR (BRL), Europa (EUR) e Internacional (USD).
 *
 * Estratégia de detecção:
 *   1. Tenta Cloudflare trace (gratuito, rápido, sem limite, country-only)
 *   2. Fallback: ipapi.co (gratuito até 1k req/dia, retorna country + continent)
 *   3. Default em caso de falha total: EU
 *
 * Como usar:
 *   1. Inclua este script na página: <script src="/shared/checkout/geo-checkout.js" defer></script>
 *   2. Crie os blocos HTML com IDs: #checkout-loading, #checkout-br, #checkout-eu, #checkout-intl
 *   3. O script roda automaticamente no DOMContentLoaded
 *
 * Eventos disparados (capture pra Meta Pixel / GA4):
 *   - 'checkout:shown' → { region: 'br' | 'eu' | 'intl' }
 *
 * Customização:
 *   Para mudar a lista de países considerados "Europa", edite EUROPEAN_COUNTRIES.
 *   Para desativar o checkout INTL (e mandar todo não-BR pra EU), defina ENABLE_INTL_CHECKOUT = false.
 */

(function () {
  'use strict';

  // ============================================================
  // CONFIG
  // ============================================================

  // Lista de países considerados Europa (códigos ISO 3166-1 alpha-2).
  // Inclui UE + Reino Unido + Suíça + Noruega + Islândia + microstates.
  // Manutenção esperada: ~1 país por década. Última mudança relevante:
  // Croácia entrou no euro em 2023.
  const EUROPEAN_COUNTRIES = [
    'PT', 'ES', 'FR', 'DE', 'IT', 'NL', 'BE', 'LU', 'AT', 'IE',
    'DK', 'SE', 'FI', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'GR',
    'HR', 'SI', 'EE', 'LV', 'LT', 'CY', 'MT', 'GB', 'CH', 'NO',
    'IS', 'LI', 'AD', 'MC', 'SM', 'VA',
  ];

  // Se true: visitantes fora de BR e Europa caem em #checkout-intl (USD).
  // Se false: todo visitante fora do BR cai em #checkout-eu.
  const ENABLE_INTL_CHECKOUT = true;

  // IDs dos blocos HTML que o script controla.
  const ELEMENT_IDS = {
    loading: 'checkout-loading',
    br: 'checkout-br',
    eu: 'checkout-eu',
    intl: 'checkout-intl',
  };

  // ============================================================
  // DETECTORES
  // ============================================================

  async function getCountryFromCloudflare() {
    const response = await fetch('https://cloudflare.com/cdn-cgi/trace', {
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Cloudflare trace unavailable');

    const text = await response.text();
    const lines = text.split('\n');
    const locationLine = lines.find((line) => line.startsWith('loc='));
    if (!locationLine) throw new Error('Country not found in Cloudflare trace');

    return locationLine.replace('loc=', '').trim().toUpperCase();
  }

async function getCountryFromIpApi() {
  const response = await fetch('/cdn-cgi/trace', { cache: 'no-store' });
  if (!response.ok) throw new Error('cdn-cgi/trace fallback unavailable');

  const text = await response.text();
  const match = text.match(/loc=([A-Z]{2})/);
  return match ? match[1].toUpperCase() : null;
}

  // ============================================================
  // SHOW CHECKOUT
  // ============================================================

  function classifyCountry(countryCode) {
    if (countryCode === 'BR') return 'br';
    if (EUROPEAN_COUNTRIES.includes(countryCode)) return 'eu';
    return ENABLE_INTL_CHECKOUT ? 'intl' : 'eu';
  }

  function showCheckout(region) {
    const loading = document.getElementById(ELEMENT_IDS.loading);
    const br = document.getElementById(ELEMENT_IDS.br);
    const eu = document.getElementById(ELEMENT_IDS.eu);
    const intl = document.getElementById(ELEMENT_IDS.intl);

    if (loading) loading.classList.add('hidden');
    if (br) br.classList.toggle('hidden', region !== 'br');
    if (eu) eu.classList.toggle('hidden', region !== 'eu');
    if (intl) intl.classList.toggle('hidden', region !== 'intl');

    // Dispara evento customizado pra tracking (Meta Pixel, GA4, etc).
    // Capture com: document.addEventListener('checkout:shown', (e) => { ... e.detail.region ... });
    document.dispatchEvent(new CustomEvent('checkout:shown', {
      detail: { region },
    }));
  }

  // ============================================================
  // ORCHESTRATOR
  // ============================================================

  async function detectCountryAndShowCheckout() {
    let countryCode = null;

    try {
      countryCode = await getCountryFromCloudflare();
    } catch (cloudflareError) {
      try {
        countryCode = await getCountryFromIpApi();
      } catch (ipapiError) {
        countryCode = null;
      }
    }

    const region = countryCode ? classifyCountry(countryCode) : 'eu';
    showCheckout(region);
  }

  // Auto-init no DOMContentLoaded.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', detectCountryAndShowCheckout);
  } else {
    detectCountryAndShowCheckout();
  }
})();
