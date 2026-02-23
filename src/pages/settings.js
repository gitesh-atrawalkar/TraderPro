// ============================================================
// TraderPro — Settings Page
// ============================================================

import { DEFAULT_WEIGHTS } from '../engine/signals.js';
import { CRYPTO_PAIRS } from '../engine/market.js';

export function renderSettings(container, appState) {
    const weights = appState.weights || { ...DEFAULT_WEIGHTS };

    const indicatorNames = {
        rsi: 'RSI (Relative Strength Index)',
        macd: 'MACD',
        bollingerBands: 'Bollinger Bands',
        sma: 'SMA Crossover',
        ema: 'EMA Crossover',
        stochastic: 'Stochastic Oscillator',
        adx: 'ADX (Trend Strength)',
        vwap: 'VWAP',
        ichimoku: 'Ichimoku Cloud',
        williamsR: 'Williams %R',
        cci: 'CCI (Commodity Channel)',
        obv: 'OBV (On-Balance Volume)',
        parabolicSar: 'Parabolic SAR',
        fibonacci: 'Fibonacci Levels',
        atr: 'ATR (Volatility)',
    };

    container.innerHTML = `
    <div class="page-enter">
      <div class="grid-2" style="gap:var(--space-6)">
        <!-- Indicator Weights -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Indicator Weights</div>
            <button class="btn btn-ghost" id="reset-weights" style="font-size:var(--text-xs)">Reset Defaults</button>
          </div>
          <p style="font-size:var(--text-xs);color:var(--text-tertiary);margin-bottom:var(--space-4)">
            Adjust the weight of each indicator in the combined trading signal. Higher weight = more influence on the final decision.
          </p>
          <div style="display:flex;flex-direction:column;gap:var(--space-4)">
            ${Object.entries(weights).map(([key, val]) => `
              <div>
                <div class="flex justify-between items-center" style="margin-bottom:var(--space-1)">
                  <label style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${indicatorNames[key] || key}</label>
                  <span class="mono" style="font-size:var(--text-xs);color:var(--accent-primary)" id="weight-val-${key}">${val.toFixed(1)}</span>
                </div>
                <input type="range" class="range-slider" id="weight-${key}" min="0" max="2" step="0.1" value="${val}" />
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Right Column -->
        <div style="display:flex;flex-direction:column;gap:var(--space-5)">
          <!-- Bot Settings -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">Trading Bot Settings</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:var(--space-4)">
              <div class="flex justify-between items-center">
                <div>
                  <div style="font-size:var(--text-sm);font-weight:var(--weight-semibold)">Auto-Trade</div>
                  <div style="font-size:var(--text-xs);color:var(--text-tertiary)">Automatically execute trades based on signals</div>
                </div>
                <div class="toggle ${window.__traderProBotActive ? 'active' : ''}" id="settings-bot-toggle"></div>
              </div>
              <div>
                <div class="flex justify-between items-center" style="margin-bottom:var(--space-1)">
                  <label style="font-size:var(--text-sm);font-weight:var(--weight-medium)">Min Confidence (%)</label>
                  <span class="mono" style="font-size:var(--text-xs);color:var(--accent-primary)" id="min-conf-val">60</span>
                </div>
                <input type="range" class="range-slider" id="min-confidence" min="30" max="90" step="5" value="60" />
              </div>
              <div>
                <div class="flex justify-between items-center" style="margin-bottom:var(--space-1)">
                  <label style="font-size:var(--text-sm);font-weight:var(--weight-medium)">Risk Per Trade (%)</label>
                  <span class="mono" style="font-size:var(--text-xs);color:var(--accent-primary)" id="risk-per-trade-val">2</span>
                </div>
                <input type="range" class="range-slider" id="risk-per-trade" min="0.5" max="10" step="0.5" value="2" />
              </div>
            </div>
          </div>

          <!-- Data Settings -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">Data Sources</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:var(--space-3)">
              <div class="flex items-center gap-3" style="padding:var(--space-3);border-radius:var(--radius-md);background:var(--bg-glass)">
                <div class="status-dot connected"></div>
                <div>
                  <div style="font-size:var(--text-sm);font-weight:var(--weight-semibold)">Binance API</div>
                  <div style="font-size:var(--text-xs);color:var(--text-tertiary)">Real-time prices & OHLCV data</div>
                </div>
              </div>
              <div class="flex items-center gap-3" style="padding:var(--space-3);border-radius:var(--radius-md);background:var(--bg-glass)">
                <div class="status-dot connected"></div>
                <div>
                  <div style="font-size:var(--text-sm);font-weight:var(--weight-semibold)">CoinGecko API</div>
                  <div style="font-size:var(--text-xs);color:var(--text-tertiary)">Market cap, ranking & sparklines</div>
                </div>
              </div>
              <div class="flex items-center gap-3" style="padding:var(--space-3);border-radius:var(--radius-md);background:var(--bg-glass)">
                <div class="status-dot connected"></div>
                <div>
                  <div style="font-size:var(--text-sm);font-weight:var(--weight-semibold)">CryptoCompare News</div>
                  <div style="font-size:var(--text-xs);color:var(--text-tertiary)">Real-time news & sentiment</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Active Pairs -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">Active Trading Pairs</div>
            </div>
            <div class="flex" style="flex-wrap:wrap;gap:var(--space-2)">
              ${CRYPTO_PAIRS.map(p => `
                <span class="tag" style="padding:6px 12px;cursor:pointer;background:rgba(99,102,241,0.15);color:var(--accent-primary);border:1px solid rgba(99,102,241,0.2)">${p.display}</span>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

    // Weight slider listeners
    Object.keys(weights).forEach(key => {
        const slider = document.getElementById(`weight-${key}`);
        const valEl = document.getElementById(`weight-val-${key}`);
        if (slider && valEl) {
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                valEl.textContent = val.toFixed(1);
                if (appState.weights) appState.weights[key] = val;
            });
        }
    });

    // Reset weights
    const resetBtn = document.getElementById('reset-weights');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            Object.entries(DEFAULT_WEIGHTS).forEach(([key, val]) => {
                const slider = document.getElementById(`weight-${key}`);
                const valEl = document.getElementById(`weight-val-${key}`);
                if (slider) slider.value = val;
                if (valEl) valEl.textContent = val.toFixed(1);
                if (appState.weights) appState.weights[key] = val;
            });
        });
    }

    // Bot toggle
    const botToggle = document.getElementById('settings-bot-toggle');
    if (botToggle) {
        botToggle.addEventListener('click', () => {
            window.__traderProBotActive = !window.__traderProBotActive;
            botToggle.classList.toggle('active', window.__traderProBotActive);
        });
    }

    // Min confidence slider
    const confSlider = document.getElementById('min-confidence');
    const confVal = document.getElementById('min-conf-val');
    if (confSlider && confVal) {
        confSlider.addEventListener('input', (e) => { confVal.textContent = e.target.value; });
    }

    // Risk per trade slider
    const riskSlider = document.getElementById('risk-per-trade');
    const riskVal = document.getElementById('risk-per-trade-val');
    if (riskSlider && riskVal) {
        riskSlider.addEventListener('input', (e) => { riskVal.textContent = e.target.value; });
    }
}
