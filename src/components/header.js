// ============================================================
// TraderPro — Header Component
// ============================================================

import { formatPrice } from '../engine/market.js';

export function createHeader(title, selectedPair, onPairChange) {
  const header = document.createElement('header');
  header.className = 'app-header';
  header.innerHTML = `
    <div class="header-left">
      <button class="menu-toggle" id="hamburger-menu">☰</button>
      <h1 class="header-title">${title}</h1>
    </div>
    <div class="header-right">
      <div class="badge badge-live" id="header-live-badge">
        <span>LIVE</span>
      </div>
      <div class="stat-box" style="text-align:right">
        <span class="stat-label" id="header-pair-label">${selectedPair?.display || 'BTC/USDT'}</span>
        <span class="stat-value" id="header-price" style="font-size: var(--text-lg)">Loading...</span>
      </div>
      <div id="header-change" class="stat-change" style="font-family:var(--font-mono);font-size:var(--text-sm)">—</div>
    </div>
  `;
  return header;
}

/**
 * Update header price display
 */
export function updateHeaderPrice(price, change, changePercent) {
  const priceEl = document.getElementById('header-price');
  const changeEl = document.getElementById('header-change');
  if (priceEl) {
    priceEl.textContent = '$' + formatPrice(price);
    priceEl.style.color = change >= 0 ? 'var(--color-buy)' : 'var(--color-sell)';
  }
  if (changeEl) {
    const sign = change >= 0 ? '+' : '';
    changeEl.textContent = `${sign}${changePercent?.toFixed(2) || '0.00'}%`;
    changeEl.className = `stat-change ${change >= 0 ? 'positive' : 'negative'}`;
  }
}

export function updateHeaderPairLabel(display) {
  const lbl = document.getElementById('header-pair-label');
  if (lbl) lbl.textContent = display;
}
