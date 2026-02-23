// ============================================================
// TraderPro — Trading Signals Page
// Deep indicator analysis with candlestick chart + signal markers
// ============================================================

import { formatPrice } from '../engine/market.js';
import { getSignalClass, getBadgeClass, generateChartSignals } from '../engine/signals.js';
import { SMA, EMA, BollingerBands } from '../engine/indicators.js';
import { drawCandlestickChart } from '../components/charts.js';
import { createSignalGauge, createConfidenceGauge, createRiskGauge } from '../components/gauges.js';

// Cache for signal markers so we don't recompute on every redraw
let cachedSignals = { pair: null, interval: null, markers: [] };

export function renderSignals(container, appState) {
  const { candles, analyses, selectedPair, selectedPairDisplay } = appState;
  const analysis = analyses[selectedPair];
  const pairCandles = candles[selectedPair] || [];

  // Compute signal markers (cached)
  if (cachedSignals.pair !== selectedPair || cachedSignals.interval !== appState.interval) {
    cachedSignals.pair = selectedPair;
    cachedSignals.interval = appState.interval;
    cachedSignals.markers = generateChartSignals(pairCandles, appState.weights);
  }

  // Count recent signals for display
  const recentSignals = cachedSignals.markers.slice(-10);
  const recentBuys = recentSignals.filter(s => s.type === 'BUY');
  const recentSells = recentSignals.filter(s => s.type === 'SELL');

  container.innerHTML = `
    <div class="page-enter">
      <!-- Pair Selection -->
      <div class="flex items-center justify-between" style="margin-bottom:var(--space-5)">
        <div class="flex items-center gap-4">
          <h2 style="font-size:var(--text-2xl);font-weight:var(--weight-extrabold)">${selectedPairDisplay}</h2>
          ${analysis ? `
            <div class="signal-indicator ${getSignalClass(analysis.decision)}" style="padding:var(--space-2) var(--space-4);font-size:var(--text-sm)">
              ${analysis.decision}
            </div>
          ` : ''}
          <div class="flex gap-2" style="margin-left:var(--space-3)">
            <span class="badge badge-buy" style="font-size:10px">▲ ${recentBuys.length} Buys</span>
            <span class="badge badge-sell" style="font-size:10px">▼ ${recentSells.length} Sells</span>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-ghost" id="toggle-signals-btn" style="padding:6px 12px;font-size:var(--text-xs);border:1px solid var(--accent-primary);border-radius:var(--radius-md)" data-active="true">
            📍 Signals
          </button>
          <select id="pair-selector" class="btn btn-ghost" style="padding:6px 12px;background:var(--bg-tertiary);border-radius:var(--radius-md);font-size:var(--text-sm)">
            ${appState.allPairs.map(p => `<option value="${p.symbol}" ${p.symbol === selectedPair ? 'selected' : ''}>${p.display}</option>`).join('')}
          </select>
          <select id="interval-selector" class="btn btn-ghost" style="padding:6px 12px;background:var(--bg-tertiary);border-radius:var(--radius-md);font-size:var(--text-sm)">
            <option value="1m" ${appState.interval === '1m' ? 'selected' : ''}>1M</option>
            <option value="5m" ${appState.interval === '5m' ? 'selected' : ''}>5M</option>
            <option value="15m" ${appState.interval === '15m' ? 'selected' : ''}>15M</option>
            <option value="1h" ${appState.interval === '1h' ? 'selected' : ''}>1H</option>
            <option value="4h" ${appState.interval === '4h' ? 'selected' : ''}>4H</option>
            <option value="1d" ${appState.interval === '1d' ? 'selected' : ''}>1D</option>
            <option value="1w" ${appState.interval === '1w' ? 'selected' : ''}>1W</option>
          </select>
        </div>
      </div>

      <!-- Chart & Gauges -->
      <div class="grid-3-1" style="margin-bottom:var(--space-5)">
        <div class="card" style="padding:var(--space-4)">
          <div class="card-header">
            <div class="card-title">
              Price Chart
              <span id="live-indicator" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#00e676;margin-left:8px;animation:pulse 2s infinite;vertical-align:middle"></span>
              <span style="font-size:10px;color:var(--text-muted);margin-left:4px;font-weight:400">LIVE</span>
            </div>
            <div class="flex gap-2">
              <button class="tag" id="overlay-sma" data-active="true" style="cursor:pointer">SMA</button>
              <button class="tag" id="overlay-ema" data-active="false" style="cursor:pointer">EMA</button>
              <button class="tag" id="overlay-bb" data-active="false" style="cursor:pointer">BB</button>
            </div>
          </div>
          <canvas id="main-chart" style="width:100%;height:400px"></canvas>
        </div>
        
        <div style="display:flex;flex-direction:column;gap:var(--space-5)">
          <div class="card" style="text-align:center">
            <div class="card-title" style="margin-bottom:var(--space-3)">Signal Strength</div>
            <div id="signal-gauge-container" style="display:flex;justify-content:center"></div>
          </div>
          <div class="card" style="text-align:center">
            <div class="card-title" style="margin-bottom:var(--space-3)">Confidence</div>
            <div id="confidence-gauge-container" style="display:flex;justify-content:center"></div>
          </div>
          <div class="card" style="text-align:center">
            <div class="card-title" style="margin-bottom:var(--space-3)">Risk Level</div>
            <div id="risk-gauge-container" style="display:flex;justify-content:center"></div>
          </div>
        </div>
      </div>

      <!-- Recent Signal Markers Summary -->
      ${recentSignals.length > 0 ? `
      <div class="card" style="margin-bottom:var(--space-5)">
        <div class="card-header">
          <div class="card-title">Recent Chart Signals</div>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Entry Price</th>
                <th>Take Profit</th>
                <th>Stop Loss</th>
                <th>Confidence</th>
                <th>R:R Ratio</th>
              </tr>
            </thead>
            <tbody>
              ${recentSignals.slice().reverse().map(sig => {
    const rr = Math.abs(sig.targetPrice - sig.price) / Math.abs(sig.stopPrice - sig.price);
    return `
                <tr>
                  <td><span class="badge ${sig.type === 'BUY' ? 'badge-buy' : 'badge-sell'}">${sig.type === 'BUY' ? '▲' : '▼'} ${sig.type}</span></td>
                  <td class="mono">${formatPriceLabel(sig.price)}</td>
                  <td class="mono text-buy">${formatPriceLabel(sig.targetPrice)}</td>
                  <td class="mono text-sell">${formatPriceLabel(sig.stopPrice)}</td>
                  <td>${sig.confidence}%</td>
                  <td class="mono" style="color:${rr >= 1.5 ? 'var(--color-buy)' : 'var(--color-hold)'}">${rr.toFixed(1)}:1</td>
                </tr>`;
  }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      ` : ''}

      <!-- Indicator Breakdown Table -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Indicator Breakdown (${analysis ? analysis.indicators.filter(i => i.value !== null).length : 0} Active)</div>
          <div class="flex gap-3">
            <span class="badge badge-buy">${analysis ? analysis.buyCount : 0} Buy</span>
            <span class="badge badge-neutral">${analysis ? analysis.neutralCount : 0} Neutral</span>
            <span class="badge badge-sell">${analysis ? analysis.sellCount : 0} Sell</span>
          </div>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Indicator</th>
                <th>Signal</th>
                <th>Value</th>
                <th>Description</th>
                <th>Weight</th>
                <th>Contribution</th>
              </tr>
            </thead>
            <tbody>
              ${analysis ? renderIndicatorRows(analysis.indicators) : '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:var(--space-8)">Loading analysis...</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Render chart with signal markers
  requestAnimationFrame(() => {
    const chartCanvas = document.getElementById('main-chart');
    if (chartCanvas && pairCandles.length > 0) {
      redrawChart(pairCandles, appState);
    }
  });

  // Render gauges
  if (analysis) {
    const sg = document.getElementById('signal-gauge-container');
    const cg = document.getElementById('confidence-gauge-container');
    const rg = document.getElementById('risk-gauge-container');
    if (sg) sg.appendChild(createSignalGauge(analysis.score, 110));
    if (cg) cg.appendChild(createConfidenceGauge(analysis.confidence, 100));
    if (rg) rg.appendChild(createRiskGauge(analysis.riskScore || 50, 100));
  }

  // Toggle overlays
  ['sma', 'ema', 'bb'].forEach(id => {
    const btn = document.getElementById(`overlay-${id}`);
    if (btn) {
      btn.addEventListener('click', () => {
        const isActive = btn.dataset.active === 'true';
        btn.dataset.active = (!isActive).toString();
        btn.style.background = !isActive ? 'var(--accent-primary)' : '';
        btn.style.color = !isActive ? 'white' : '';
        redrawChart(pairCandles, appState);
      });
      // Initialize active state visuals
      if (btn.dataset.active === 'true') {
        btn.style.background = 'var(--accent-primary)';
        btn.style.color = 'white';
      }
    }
  });

  // Toggle signal markers button
  const toggleSigBtn = document.getElementById('toggle-signals-btn');
  if (toggleSigBtn) {
    toggleSigBtn.style.background = 'var(--accent-primary)';
    toggleSigBtn.style.color = 'white';
    toggleSigBtn.addEventListener('click', () => {
      const isActive = toggleSigBtn.dataset.active === 'true';
      toggleSigBtn.dataset.active = (!isActive).toString();
      toggleSigBtn.style.background = !isActive ? 'var(--accent-primary)' : '';
      toggleSigBtn.style.color = !isActive ? 'white' : '';
      redrawChart(pairCandles, appState);
    });
  }

  // Pair selector
  const pairSelector = document.getElementById('pair-selector');
  if (pairSelector) {
    pairSelector.addEventListener('change', (e) => {
      cachedSignals.pair = null; // Invalidate cache
      if (window.__traderProSelectPair) window.__traderProSelectPair(e.target.value);
    });
  }

  // Interval selector
  const intervalSelector = document.getElementById('interval-selector');
  if (intervalSelector) {
    intervalSelector.addEventListener('change', (e) => {
      cachedSignals.interval = null; // Invalidate cache
      if (window.__traderProChangeInterval) window.__traderProChangeInterval(e.target.value);
    });
  }
}

/**
 * Redraw chart with current overlays, signal markers, and live price
 */
function redrawChart(candles, appState) {
  const chartCanvas = document.getElementById('main-chart');
  if (!chartCanvas || !candles || candles.length === 0) return;

  const closes = candles.map(c => c.close);
  const overlays = [];

  const smaBtn = document.getElementById('overlay-sma');
  const emaBtn = document.getElementById('overlay-ema');
  const bbBtn = document.getElementById('overlay-bb');

  if (smaBtn?.dataset.active === 'true') {
    overlays.push({ data: SMA(closes, 20), color: '#6366f1', opacity: 0.6 });
    overlays.push({ data: SMA(closes, 50), color: '#f97316', opacity: 0.6 });
  }
  if (emaBtn?.dataset.active === 'true') {
    overlays.push({ data: EMA(closes, 12), color: '#22d3ee', opacity: 0.6 });
    overlays.push({ data: EMA(closes, 26), color: '#ec4899', opacity: 0.6 });
  }
  if (bbBtn?.dataset.active === 'true') {
    const bb = BollingerBands(closes);
    overlays.push({ data: bb.upper, color: '#8b5cf6', opacity: 0.4 });
    overlays.push({ data: bb.lower, color: '#8b5cf6', opacity: 0.4 });
    overlays.push({ data: bb.middle, color: '#8b5cf6', opacity: 0.3 });
  }

  // Signal markers
  const sigBtn = document.getElementById('toggle-signals-btn');
  const showSignals = sigBtn?.dataset.active === 'true';
  const signals = showSignals ? cachedSignals.markers : [];

  // Live price from WebSocket
  const ticker = appState.tickers[appState.selectedPair];
  const livePrice = ticker ? ticker.price : null;

  drawCandlestickChart(chartCanvas, candles, { overlays, signals, livePrice });
}

// Export redrawChart so main.js can call it for live updates
export { redrawChart, cachedSignals };

function formatPriceLabel(price) {
  if (price >= 10000) return price.toFixed(0);
  if (price >= 1000) return price.toFixed(1);
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(6);
}

function renderIndicatorRows(indicators) {
  return indicators.map(ind => {
    if (!ind || ind.value === null) return '';
    const signalLabel = ind.signal > 0.3 ? 'BUY' : ind.signal < -0.3 ? 'SELL' : 'NEUTRAL';
    const badgeClass = getBadgeClass(ind.signal);
    const contribution = (ind.signal * ind.weight).toFixed(2);
    let valueStr = '—';
    if (typeof ind.value === 'number') {
      valueStr = ind.value.toFixed(2);
    } else if (ind.value && typeof ind.value === 'object') {
      const keys = Object.keys(ind.value);
      const firstVal = ind.value[keys[0]];
      if (typeof firstVal === 'number') valueStr = firstVal.toFixed(2);
    }
    return `
      <tr>
        <td style="color:var(--text-primary);font-weight:600;font-family:var(--font-ui)">${ind.name}</td>
        <td><span class="badge ${badgeClass}">${signalLabel}</span></td>
        <td>${valueStr}</td>
        <td style="font-family:var(--font-ui);max-width:200px;overflow:hidden;text-overflow:ellipsis">${ind.description}</td>
        <td>${ind.weight?.toFixed(1) || '1.0'}</td>
        <td style="color:${parseFloat(contribution) > 0 ? 'var(--color-buy)' : parseFloat(contribution) < 0 ? 'var(--color-sell)' : 'var(--text-muted)'}">
          ${parseFloat(contribution) > 0 ? '+' : ''}${contribution}
        </td>
      </tr>
    `;
  }).join('');
}
