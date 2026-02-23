// ============================================================
// TraderPro — Main Application Entry Point
// Wires engines, components, pages, and real-time data together
// ============================================================

import './styles/global.css';
import './styles/components.css';
import './styles/layout.css';

import { Router } from './router.js';
import { CRYPTO_PAIRS, fetchCandles, fetchAllTickers, fetchMarketInfo, BinanceWebSocket, extractCandleArrays } from './engine/market.js';
import { analyzeAll, DEFAULT_WEIGHTS } from './engine/signals.js';
import { fetchCryptoNews, calculateOverallSentiment } from './engine/news.js';
import { portfolio } from './engine/portfolio.js';
import { createSidebar, updateConnectionStatus } from './components/sidebar.js';
import { createHeader, updateHeaderPrice, updateHeaderPairLabel } from './components/header.js';
import { createTicker, updateTicker } from './components/ticker.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderSignals, redrawChart as redrawSignalsChart } from './pages/signals.js';
import { renderPortfolio } from './pages/portfolio.js';
import { renderNews } from './pages/news.js';
import { renderSettings } from './pages/settings.js';

// ============================================================
// Application State
// ============================================================
const appState = {
    selectedPair: 'BTCUSDT',
    selectedPairDisplay: 'BTC/USDT',
    interval: '1h',
    allPairs: CRYPTO_PAIRS,
    tickers: {},
    candles: {},
    analyses: {},
    marketInfo: {},
    news: [],
    portfolio,
    weights: { ...DEFAULT_WEIGHTS },
    wsConnected: false,
};

window.__traderProBotActive = false;

// ============================================================
// Router & Page Rendering
// ============================================================
const router = new Router();
let pageContainer = null;
let currentRenderedPage = null;

const pageTitles = {
    dashboard: 'Dashboard',
    signals: 'Trading Signals',
    portfolio: 'Portfolio',
    news: 'News Terminal',
    settings: 'Settings',
};

function renderPage(page) {
    if (!pageContainer) return;
    currentRenderedPage = page;

    // Update sidebar active state
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Update header title
    const titleEl = document.querySelector('.header-title');
    if (titleEl) titleEl.textContent = pageTitles[page] || 'TraderPro';

    // Render page
    switch (page) {
        case 'dashboard': renderDashboard(pageContainer, appState); break;
        case 'signals': renderSignals(pageContainer, appState); break;
        case 'portfolio': renderPortfolio(pageContainer, appState); break;
        case 'news': renderNews(pageContainer, appState); break;
        case 'settings': renderSettings(pageContainer, appState); break;
        default: renderDashboard(pageContainer, appState);
    }
}

// ============================================================
// Data Loading
// ============================================================
async function loadInitialData() {
    console.log('🚀 TraderPro initializing...');

    // Fetch all ticker data
    try {
        appState.tickers = await fetchAllTickers();
        updateTicker(appState.tickers);
        updateCurrentPriceHeader();
    } catch (e) { console.warn('Ticker fetch failed:', e); }

    // Fetch candles for selected pair
    try {
        const candles = await fetchCandles(appState.selectedPair, appState.interval, 200);
        appState.candles[appState.selectedPair] = candles;
        runAnalysis(appState.selectedPair);
    } catch (e) { console.warn('Candle fetch failed:', e); }

    // Fetch market info from CoinGecko
    try {
        appState.marketInfo = await fetchMarketInfo();
    } catch (e) { console.warn('Market info fetch failed:', e); }

    // Fetch news
    try {
        appState.news = await fetchCryptoNews();
    } catch (e) { console.warn('News fetch failed:', e); }

    // Load candles for all pairs (background)
    loadAllPairCandles();

    // Render current page
    renderPage(router.getCurrentPage());
}

async function loadAllPairCandles() {
    for (const pair of CRYPTO_PAIRS) {
        if (appState.candles[pair.symbol]) continue;
        try {
            const candles = await fetchCandles(pair.symbol, appState.interval, 200);
            appState.candles[pair.symbol] = candles;
            runAnalysis(pair.symbol);
            // Delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 300));
        } catch (e) { /* ignore */ }
    }
    // Re-render dashboard after all loaded
    if (currentRenderedPage === 'dashboard') renderPage('dashboard');
}

function runAnalysis(symbol) {
    const candles = appState.candles[symbol];
    if (!candles || candles.length < 52) return;
    appState.analyses[symbol] = analyzeAll(candles, appState.weights);

    // Auto-trade if enabled
    if (window.__traderProBotActive) {
        const ticker = appState.tickers[symbol];
        if (ticker) {
            const result = portfolio.autoTrade(symbol, appState.analyses[symbol], ticker.price);
            if (result) {
                console.log(`🤖 Auto-trade [${symbol}]: ${result.action}`, result.trade);
            }
        }
    }
}

function updateCurrentPriceHeader() {
    const ticker = appState.tickers[appState.selectedPair];
    if (ticker) {
        updateHeaderPrice(ticker.price, ticker.priceChange, ticker.priceChangePercent);
    }
}

// ============================================================
// WebSocket for Real-Time Updates
// ============================================================
const ws = new BinanceWebSocket(
    CRYPTO_PAIRS.map(p => p.symbol),
    (data) => {
        if (data.type === 'connection') {
            appState.wsConnected = data.status === 'connected';
            updateConnectionStatus(data.status);
            return;
        }
        if (data.type === 'ticker') {
            // Update ticker cache
            const pair = CRYPTO_PAIRS.find(p => p.symbol === data.symbol);
            if (pair) {
                appState.tickers[data.symbol] = {
                    ...appState.tickers[data.symbol],
                    symbol: data.symbol,
                    display: pair.display,
                    base: pair.base,
                    price: data.price,
                    priceChange: data.priceChange,
                    priceChangePercent: data.priceChangePercent,
                    highPrice: data.highPrice,
                    lowPrice: data.lowPrice,
                    volume: data.volume,
                    quoteVolume: data.quoteVolume,
                };
            }

            // Update header price if this is the selected pair
            if (data.symbol === appState.selectedPair) {
                updateHeaderPrice(data.price, data.priceChange, data.priceChangePercent);

                // Real-time chart update — update last candle and redraw
                const pairCandles = appState.candles[appState.selectedPair];
                if (pairCandles && pairCandles.length > 0 && currentRenderedPage === 'signals') {
                    const lastCandle = pairCandles[pairCandles.length - 1];
                    lastCandle.close = data.price;
                    if (data.price > lastCandle.high) lastCandle.high = data.price;
                    if (data.price < lastCandle.low) lastCandle.low = data.price;

                    // Throttled redraw via rAF
                    if (!window.__chartRedrawPending) {
                        window.__chartRedrawPending = true;
                        requestAnimationFrame(() => {
                            redrawSignalsChart(pairCandles, appState);
                            window.__chartRedrawPending = false;
                        });
                    }
                }
            }

            // Update portfolio prices
            const priceMap = {};
            priceMap[data.symbol] = data.price;
            portfolio.updatePrices(priceMap);
        }
    }
);

// ============================================================
// Periodic Updates
// ============================================================
let updateInterval;
let tickerUpdateInterval;

function startUpdates() {
    // Re-fetch candles and re-analyze every 60s
    updateInterval = setInterval(async () => {
        try {
            const candles = await fetchCandles(appState.selectedPair, appState.interval, 200);
            appState.candles[appState.selectedPair] = candles;
            runAnalysis(appState.selectedPair);
            if (currentRenderedPage === 'signals' || currentRenderedPage === 'dashboard') {
                renderPage(currentRenderedPage);
            }
        } catch (e) { /* ignore */ }
    }, 60000);

    // Update ticker display every 3s
    tickerUpdateInterval = setInterval(() => {
        updateTicker(appState.tickers);
    }, 3000);

    // Refresh news every 2min
    setInterval(async () => {
        try {
            appState.news = await fetchCryptoNews();
            if (currentRenderedPage === 'news') renderPage('news');
        } catch (e) { /* ignore */ }
    }, 120000);

    // Refresh market info every 60s
    setInterval(async () => {
        try {
            appState.marketInfo = await fetchMarketInfo();
        } catch (e) { /* ignore */ }
    }, 60000);
}

// ============================================================
// Global Functions (for inline event handlers)
// ============================================================
window.__traderProSelectPair = (symbol) => {
    const pair = CRYPTO_PAIRS.find(p => p.symbol === symbol);
    if (!pair) return;
    appState.selectedPair = symbol;
    appState.selectedPairDisplay = pair.display;
    updateHeaderPairLabel(pair.display);
    updateCurrentPriceHeader();

    // Load candles if not cached
    if (!appState.candles[symbol]) {
        fetchCandles(symbol, appState.interval, 200).then(candles => {
            appState.candles[symbol] = candles;
            runAnalysis(symbol);
            renderPage(currentRenderedPage);
        });
    } else {
        renderPage(currentRenderedPage);
    }
};

window.__traderProChangeInterval = async (interval) => {
    appState.interval = interval;
    try {
        const candles = await fetchCandles(appState.selectedPair, interval, 200);
        appState.candles[appState.selectedPair] = candles;
        runAnalysis(appState.selectedPair);
        renderPage(currentRenderedPage);
    } catch (e) { console.warn('Interval change failed:', e); }
};

// ============================================================
// App Initialization
// ============================================================
let initialized = false;

function initApp() {
    if (initialized) return;
    initialized = true;

    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = '';

    // Build layout
    const sidebar = createSidebar(router.getCurrentPage(), (page) => {
        router.navigate(page);
    });

    const mainWrapper = document.createElement('div');
    mainWrapper.className = 'main-wrapper';

    const header = createHeader(
        pageTitles[router.getCurrentPage()] || 'Dashboard',
        CRYPTO_PAIRS[0]
    );

    const ticker = createTicker(appState.tickers);

    // Sidebar Overlay for Mobile
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    pageContainer = document.createElement('main');
    pageContainer.className = 'page-content';
    pageContainer.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:var(--space-4)">
      <div style="font-size:3rem;animation:float 2s ease-in-out infinite">📈</div>
      <div style="font-size:var(--text-lg);font-weight:var(--weight-bold);color:var(--text-primary)">Initializing TraderPro...</div>
      <div style="font-size:var(--text-sm);color:var(--text-tertiary)">Connecting to live market data</div>
      <div style="width:200px;height:4px;background:var(--bg-tertiary);border-radius:var(--radius-full);overflow:hidden;margin-top:var(--space-2)">
        <div style="width:30%;height:100%;background:var(--gradient-primary);border-radius:var(--radius-full);animation:shimmer 1.5s infinite"></div>
      </div>
    </div>
  `;

    mainWrapper.appendChild(header);
    mainWrapper.appendChild(ticker);
    mainWrapper.appendChild(pageContainer);
    app.appendChild(sidebar);
    app.appendChild(mainWrapper);

    // Sidebar Toggle Logic
    const hamburger = header.querySelector('#hamburger-menu');
    const closeBtn = sidebar.querySelector('#sidebar-close');

    const toggleSidebar = (force) => {
        const isActive = force !== undefined ? force : !sidebar.classList.contains('active');
        sidebar.classList.toggle('active', isActive);
        overlay.classList.toggle('active', isActive);
    };

    if (hamburger) hamburger.addEventListener('click', () => toggleSidebar(true));
    if (closeBtn) closeBtn.addEventListener('click', () => toggleSidebar(false));
    overlay.addEventListener('click', () => toggleSidebar(false));

    // Resize listener for mobile/desktop transitions
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024) {
            toggleSidebar(false);
            if (closeBtn) closeBtn.style.display = 'none';
        } else {
            if (closeBtn) closeBtn.style.display = 'block';
        }
    });

    // Register routes
    ['dashboard', 'signals', 'portfolio', 'news', 'settings'].forEach(page => {
        router.register(page, renderPage);
    });

    // Connect WebSocket
    ws.connect();

    // Load data and render
    loadInitialData().catch(err => console.error('Data load error:', err));

    // Start periodic updates
    startUpdates();

    console.log('✅ TraderPro initialized');
}

// Start the app — use a single reliable entry point
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

