// ============================================================
// TraderPro — Portfolio Page
// ============================================================

import { formatPrice, formatLargeNumber } from '../engine/market.js';
import { drawEquityCurve } from '../components/charts.js';

export function renderPortfolio(container, appState) {
  const { portfolio: port } = appState;
  const metrics = port.getMetrics();

  container.innerHTML = `
    <div class="page-enter">
      <!-- Key Metrics -->
      <div class="grid-6" style="margin-bottom:var(--space-5)">
        ${statCard('Equity', '$' + formatLargeNumber(metrics.equity), '--accent-cyan')}
        ${statCard('Total Return', (metrics.totalReturn >= 0 ? '+' : '') + metrics.totalReturn.toFixed(2) + '%', metrics.totalReturn >= 0 ? '--color-buy' : '--color-sell')}
        ${statCard('Win Rate', metrics.winRate.toFixed(1) + '%', '--color-hold')}
        ${statCard('Target Win Rate', '60.0%', '--accent-primary')}
        ${statCard('Sharpe Ratio', metrics.sharpeRatio.toFixed(2), '--accent-secondary')}
        ${statCard('Max Drawdown', metrics.maxDrawdown.toFixed(2) + '%', '--color-sell')}
        ${statCard('Profit Factor', metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2), '--accent-primary')}
      </div>

      <!-- Equity Curve -->
      <div class="card" style="margin-bottom:var(--space-5)">
        <div class="card-header">
          <div class="card-title">Equity Curve</div>
          <div class="flex gap-3">
            <div class="stat-box" style="text-align:right">
              <span class="stat-label">Balance</span>
              <span style="font-family:var(--font-mono);font-size:var(--text-sm);font-weight:600">$${formatLargeNumber(metrics.balance)}</span>
            </div>
            <div class="stat-box" style="text-align:right">
              <span class="stat-label">Unrealized P&L</span>
              <span style="font-family:var(--font-mono);font-size:var(--text-sm);font-weight:600;color:${metrics.unrealizedPnL >= 0 ? 'var(--color-buy)' : 'var(--color-sell)'}">
                ${metrics.unrealizedPnL >= 0 ? '+' : ''}$${metrics.unrealizedPnL.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        <canvas id="equity-chart" style="width:100%;height:250px"></canvas>
      </div>

      <div class="grid-2" style="margin-bottom:var(--space-5)">
        <!-- Open Positions -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Open Positions</div>
            <span class="tag">${port.positions.length}</span>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>Pair</th><th>Type</th><th>Entry</th><th>Current</th><th>P&L</th></tr></thead>
              <tbody>
                ${port.positions.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:var(--space-6)">No open positions</td></tr>' :
      port.positions.map(p => `
                    <tr>
                      <td style="color:var(--text-primary);font-weight:600">${p.symbol}</td>
                      <td><span class="badge ${p.type === 'LONG' ? 'badge-buy' : 'badge-sell'}">${p.type}</span></td>
                      <td>$${formatPrice(p.entryPrice)}</td>
                      <td>$${formatPrice(p.currentPrice)}</td>
                      <td style="color:${p.unrealizedPnL >= 0 ? 'var(--color-buy)' : 'var(--color-sell)'}">
                        ${p.unrealizedPnL >= 0 ? '+' : ''}$${p.unrealizedPnL.toFixed(2)}
                        (${p.unrealizedPnLPercent >= 0 ? '+' : ''}${p.unrealizedPnLPercent.toFixed(2)}%)
                      </td>
                    </tr>
                  `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Performance Breakdown -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Performance Breakdown</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:var(--space-4)">
            ${perfRow('Total Trades', metrics.totalTrades)}
            ${perfRow('Winning Trades', metrics.winningTrades, '--color-buy')}
            ${perfRow('Losing Trades', metrics.losingTrades, '--color-sell')}
            ${perfRow('Avg Win', '$' + metrics.avgWin.toFixed(2), '--color-buy')}
            ${perfRow('Avg Loss', '$' + metrics.avgLoss.toFixed(2), '--color-sell')}
            ${perfRow('Total P&L', (metrics.totalPnL >= 0 ? '+' : '') + '$' + metrics.totalPnL.toFixed(2), metrics.totalPnL >= 0 ? '--color-buy' : '--color-sell')}
          </div>
        </div>
      </div>

      <!-- Trade History -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Trade History</div>
          <span class="tag">${port.closedTrades.length} trades</span>
        </div>
        <div class="table-container" style="max-height:300px;overflow-y:auto">
          <table class="data-table">
            <thead><tr><th>Time</th><th>Pair</th><th>Type</th><th>Entry</th><th>Exit</th><th>P&L</th><th>%</th></tr></thead>
            <tbody>
              ${port.closedTrades.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:var(--space-6)">No trade history yet</td></tr>' :
      port.closedTrades.slice().reverse().map(t => `
                  <tr>
                    <td>${new Date(t.closeTime).toLocaleTimeString()}</td>
                    <td style="color:var(--text-primary);font-weight:600">${t.symbol}</td>
                    <td><span class="badge ${t.type === 'LONG' ? 'badge-buy' : 'badge-sell'}">${t.type}</span></td>
                    <td>$${formatPrice(t.entryPrice)}</td>
                    <td>$${formatPrice(t.exitPrice)}</td>
                    <td style="color:${t.realizedPnL >= 0 ? 'var(--color-buy)' : 'var(--color-sell)'}">
                      ${t.realizedPnL >= 0 ? '+' : ''}$${t.realizedPnL.toFixed(2)}
                    </td>
                    <td style="color:${t.realizedPnLPercent >= 0 ? 'var(--color-buy)' : 'var(--color-sell)'}">
                      ${t.realizedPnLPercent >= 0 ? '+' : ''}${t.realizedPnLPercent.toFixed(2)}%
                    </td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Draw equity curve
  requestAnimationFrame(() => {
    const canvas = document.getElementById('equity-chart');
    if (canvas) drawEquityCurve(canvas, port.equityHistory);
  });
}

function statCard(label, value, colorVar) {
  return `
    <div class="card" style="padding:var(--space-4);text-align:center">
      <div class="card-title" style="margin-bottom:var(--space-2)">${label}</div>
      <div class="mono" style="font-size:var(--text-lg);font-weight:var(--weight-bold);color:var(${colorVar})">${value}</div>
    </div>
  `;
}

function perfRow(label, value, colorVar) {
  return `
    <div class="flex justify-between items-center" style="padding:var(--space-2) 0;border-bottom:1px solid var(--bg-glass-border)">
      <span style="color:var(--text-tertiary);font-size:var(--text-sm)">${label}</span>
      <span class="mono" style="font-weight:var(--weight-semibold);font-size:var(--text-sm);${colorVar ? `color:var(${colorVar})` : ''}">${value}</span>
    </div>
  `;
}
