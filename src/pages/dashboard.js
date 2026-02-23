// ============================================================
// TraderPro — Dashboard Page
// ============================================================

import { formatPrice, formatLargeNumber, CRYPTO_PAIRS } from '../engine/market.js';
import { getSignalClass, getBadgeClass } from '../engine/signals.js';
import { drawSparkline } from '../components/charts.js';
import { createSignalGauge, createConfidenceGauge, createRiskGauge, createSignalBar } from '../components/gauges.js';

export function renderDashboard(container, appState) {
    const { tickers, analyses, marketInfo, portfolio: port } = appState;
    const metrics = port.getMetrics();
    const selectedAnalysis = analyses[appState.selectedPair] || null;

    container.innerHTML = `
    <div class="page-enter">
      <!-- Stats Row -->
      <div class="grid-4" style="margin-bottom:var(--space-5)">
        <div class="card" id="stat-equity">
          <div class="card-title">Portfolio Value</div>
          <div class="stat-value" style="color:var(--accent-cyan)">$${formatLargeNumber(metrics.equity)}</div>
          <div class="stat-change ${metrics.totalReturn >= 0 ? 'positive' : 'negative'}">
            ${metrics.totalReturn >= 0 ? '+' : ''}${metrics.totalReturn.toFixed(2)}% all time
          </div>
        </div>
        <div class="card" id="stat-pnl">
          <div class="card-title">Total P&L</div>
          <div class="stat-value ${metrics.totalPnL >= 0 ? 'text-buy' : 'text-sell'}">
            ${metrics.totalPnL >= 0 ? '+' : ''}$${formatLargeNumber(Math.abs(metrics.totalPnL))}
          </div>
          <div class="stat-change" style="color:var(--text-tertiary)">${metrics.totalTrades} trades</div>
        </div>
        <div class="card" id="stat-winrate">
          <div class="card-title">Win Rate</div>
          <div class="stat-value" style="color:var(--color-hold)">${metrics.winRate.toFixed(1)}%</div>
          <div class="stat-change" style="color:var(--text-tertiary)">${metrics.winningTrades}W / ${metrics.losingTrades}L</div>
        </div>
        <div class="card" id="stat-positions">
          <div class="card-title">Open Positions</div>
          <div class="stat-value" style="color:var(--accent-primary)">${metrics.openPositions}</div>
          <div class="stat-change" style="color:var(--text-tertiary)">
            Unrealized: ${metrics.unrealizedPnL >= 0 ? '+' : ''}$${metrics.unrealizedPnL.toFixed(2)}
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="grid-2-1" style="margin-bottom:var(--space-5)">
        <!-- Asset Cards -->
        <div>
          <div class="card">
            <div class="card-header">
              <div class="card-title">Live Markets</div>
              <div class="badge badge-live"><span>REAL-TIME</span></div>
            </div>
            <div class="grid-2" id="asset-cards-grid" style="gap:var(--space-3)">
              ${renderAssetCards(tickers, analyses, marketInfo)}
            </div>
          </div>
        </div>

        <!-- Signal Summary -->
        <div style="display:flex;flex-direction:column;gap:var(--space-5)">
          <div class="card" style="text-align:center">
            <div class="card-header" style="justify-content:center">
              <div class="card-title">${appState.selectedPairDisplay || 'BTC/USDT'} Signal</div>
            </div>
            ${selectedAnalysis ? `
              <div class="signal-indicator ${getSignalClass(selectedAnalysis.decision)}" style="justify-content:center;margin-bottom:var(--space-4)">
                ${selectedAnalysis.decision}
              </div>
            ` : '<div class="signal-indicator signal-hold" style="justify-content:center;margin-bottom:var(--space-4)">ANALYZING...</div>'}
            <div class="flex justify-center gap-4" id="gauge-container"></div>
            ${selectedAnalysis ? `
              <div style="margin-top:var(--space-4)">
                <div class="card-title" style="margin-bottom:var(--space-2)">Indicator Consensus</div>
                <div id="signal-dots-container"></div>
              </div>
            ` : ''}
          </div>

          <!-- Equity Sparkline -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">Equity Curve</div>
            </div>
            <canvas id="equity-sparkline" style="width:100%;height:60px"></canvas>
          </div>
        </div>
      </div>

      <!-- Recent Trades -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Recent Trades</div>
          <span class="tag">${metrics.totalTrades} total</span>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Pair</th><th>Type</th><th>Entry</th><th>Exit</th><th>P&L</th><th>Duration</th><th>Signal</th>
              </tr>
            </thead>
            <tbody id="recent-trades-body">
              ${renderRecentTrades(port.getRecentTrades())}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

    // Render gauges
    if (selectedAnalysis) {
        const gaugeContainer = document.getElementById('gauge-container');
        if (gaugeContainer) {
            gaugeContainer.appendChild(createSignalGauge(selectedAnalysis.score, 130));
            gaugeContainer.appendChild(createConfidenceGauge(selectedAnalysis.confidence, 100));
            gaugeContainer.appendChild(createRiskGauge(selectedAnalysis.riskScore || 50, 100));
        }
        const dotsContainer = document.getElementById('signal-dots-container');
        if (dotsContainer) {
            dotsContainer.appendChild(createSignalBar(selectedAnalysis.indicators));
        }
    }

    // Render equity sparkline
    requestAnimationFrame(() => {
        const equityCanvas = document.getElementById('equity-sparkline');
        if (equityCanvas && port.equityHistory.length > 1) {
            drawSparkline(equityCanvas, port.equityHistory.map(e => e.equity), '#6366f1');
        }
    });

    // Render mini sparklines in asset cards
    requestAnimationFrame(() => {
        document.querySelectorAll('.asset-sparkline').forEach(canvas => {
            const symbol = canvas.dataset.symbol;
            const info = marketInfo[symbol];
            if (info && info.sparkline && info.sparkline.length > 0) {
                const change = info.priceChange24h || 0;
                drawSparkline(canvas, info.sparkline.slice(-48), change >= 0 ? '#00e676' : '#ff1744');
            }
        });
    });
}

function renderAssetCards(tickers, analyses, marketInfo) {
    if (!tickers || Object.keys(tickers).length === 0) {
        return '<div style="color:var(--text-muted);padding:var(--space-8);text-align:center;grid-column:1/-1">Loading market data...</div>';
    }
    return CRYPTO_PAIRS.slice(0, 6).map(pair => {
        const ticker = tickers[pair.symbol];
        const analysis = analyses[pair.symbol];
        if (!ticker) return '';
        const isPositive = ticker.priceChangePercent >= 0;
        return `
      <div class="card" style="padding:var(--space-4);cursor:pointer" 
           onclick="window.__traderProSelectPair && window.__traderProSelectPair('${pair.symbol}')">
        <div class="flex items-center justify-between" style="margin-bottom:var(--space-2)">
          <div>
            <div style="font-weight:var(--weight-bold);font-size:var(--text-sm)">${pair.base}</div>
            <div style="font-size:var(--text-xs);color:var(--text-tertiary)">${pair.display}</div>
          </div>
          ${analysis ? `<span class="badge ${getBadgeClass(analysis.score)}">${analysis.decision}</span>` : ''}
        </div>
        <div class="mono" style="font-size:var(--text-lg);font-weight:var(--weight-bold);color:${isPositive ? 'var(--color-buy)' : 'var(--color-sell)'}">
          $${formatPrice(ticker.price)}
        </div>
        <div class="flex items-center justify-between" style="margin-top:var(--space-1)">
          <span class="mono" style="font-size:var(--text-xs);color:${isPositive ? 'var(--color-buy)' : 'var(--color-sell)'}">
            ${isPositive ? '+' : ''}${ticker.priceChangePercent.toFixed(2)}%
          </span>
          <span style="font-size:var(--text-xs);color:var(--text-muted)">Vol: ${formatLargeNumber(ticker.quoteVolume)}</span>
        </div>
        <canvas class="asset-sparkline" data-symbol="${pair.symbol}" style="width:100%;height:30px;margin-top:var(--space-2)"></canvas>
      </div>
    `;
    }).join('');
}

function renderRecentTrades(trades) {
    if (!trades || trades.length === 0) {
        return '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:var(--space-8)">No trades yet — bot will execute when signals are strong</td></tr>';
    }
    return trades.map(t => {
        const isProfit = t.realizedPnL >= 0;
        const duration = formatDuration(t.duration);
        return `
      <tr>
        <td style="color:var(--text-primary);font-weight:600">${t.symbol}</td>
        <td><span class="badge ${t.type === 'LONG' ? 'badge-buy' : 'badge-sell'}">${t.type}</span></td>
        <td>$${formatPrice(t.entryPrice)}</td>
        <td>$${formatPrice(t.exitPrice)}</td>
        <td style="color:${isProfit ? 'var(--color-buy)' : 'var(--color-sell)'}">
          ${isProfit ? '+' : ''}$${t.realizedPnL.toFixed(2)}
          <span style="opacity:0.7">(${isProfit ? '+' : ''}${t.realizedPnLPercent.toFixed(2)}%)</span>
        </td>
        <td>${duration}</td>
        <td><span class="tag">${t.signal}</span></td>
      </tr>
    `;
    }).join('');
}

function formatDuration(ms) {
    if (!ms) return '—';
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
