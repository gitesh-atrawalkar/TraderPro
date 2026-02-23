// ============================================================
// TraderPro — Price Ticker Component
// Scrolling ticker bar showing live prices
// ============================================================

import { formatPrice } from '../engine/market.js';

export function createTicker(tickerData) {
    const ticker = document.createElement('div');
    ticker.className = 'ticker-bar';
    ticker.id = 'price-ticker';

    const content = document.createElement('div');
    content.className = 'ticker-content';
    content.id = 'ticker-content';

    // Duplicate items for seamless scroll
    const items = renderTickerItems(tickerData);
    content.innerHTML = items + items;

    ticker.appendChild(content);
    return ticker;
}

export function updateTicker(tickerData) {
    const content = document.getElementById('ticker-content');
    if (!content) return;
    const items = renderTickerItems(tickerData);
    content.innerHTML = items + items;
}

function renderTickerItems(data) {
    if (!data || Object.keys(data).length === 0) {
        return '<span class="ticker-item" style="color:var(--text-muted)">Loading market data...</span>';
    }
    return Object.values(data).map(item => {
        const isPositive = item.priceChangePercent >= 0;
        const changeColor = isPositive ? 'var(--color-buy)' : 'var(--color-sell)';
        const sign = isPositive ? '+' : '';
        return `
      <span class="ticker-item">
        <span class="ticker-symbol">${item.base || item.symbol}</span>
        <span class="ticker-price" style="color:${changeColor}">$${formatPrice(item.price)}</span>
        <span class="ticker-change" style="color:${changeColor}">${sign}${item.priceChangePercent?.toFixed(2) || '0.00'}%</span>
      </span>
    `;
    }).join('');
}
