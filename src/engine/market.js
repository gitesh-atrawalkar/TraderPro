// ============================================================
// TraderPro — Real-Time Market Data Engine
// Fetches live data from Binance & CoinGecko public APIs
// ============================================================

const BINANCE_REST = 'https://api.binance.com/api/v3';
const COINGECKO_REST = 'https://api.coingecko.com/api/v3';

// Available trading pairs
export const CRYPTO_PAIRS = [
    { symbol: 'BTCUSDT', display: 'BTC/USDT', base: 'BTC', quote: 'USDT', coingeckoId: 'bitcoin' },
    { symbol: 'ETHUSDT', display: 'ETH/USDT', base: 'ETH', quote: 'USDT', coingeckoId: 'ethereum' },
    { symbol: 'SOLUSDT', display: 'SOL/USDT', base: 'SOL', quote: 'USDT', coingeckoId: 'solana' },
    { symbol: 'BNBUSDT', display: 'BNB/USDT', base: 'BNB', quote: 'USDT', coingeckoId: 'binancecoin' },
    { symbol: 'XRPUSDT', display: 'XRP/USDT', base: 'XRP', quote: 'USDT', coingeckoId: 'ripple' },
    { symbol: 'ADAUSDT', display: 'ADA/USDT', base: 'ADA', quote: 'USDT', coingeckoId: 'cardano' },
    { symbol: 'DOGEUSDT', display: 'DOGE/USDT', base: 'DOGE', quote: 'USDT', coingeckoId: 'dogecoin' },
    { symbol: 'AVAXUSDT', display: 'AVAX/USDT', base: 'AVAX', quote: 'USDT', coingeckoId: 'avalanche-2' },
];

// Data cache
const cache = {
    candles: {},
    ticker: {},
    marketInfo: {},
    lastFetch: {},
};

const CACHE_DURATION = 10000; // 10 seconds for candle data
const MARKET_CACHE_DURATION = 60000; // 60 seconds for market info

/**
 * Fetch OHLCV candles from Binance
 * @param {string} symbol - e.g. 'BTCUSDT'
 * @param {string} interval - e.g. '1h', '4h', '1d'
 * @param {number} limit - number of candles
 */
export async function fetchCandles(symbol, interval = '1h', limit = 200) {
    const cacheKey = `${symbol}_${interval}_${limit}`;
    const now = Date.now();
    if (cache.candles[cacheKey] && (now - cache.lastFetch[cacheKey]) < CACHE_DURATION) {
        return cache.candles[cacheKey];
    }
    try {
        const url = `${BINANCE_REST}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Binance API error: ${response.status}`);
        const data = await response.json();
        const candles = data.map(k => ({
            time: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
            closeTime: k[6],
        }));
        cache.candles[cacheKey] = candles;
        cache.lastFetch[cacheKey] = now;
        return candles;
    } catch (err) {
        console.warn(`Failed to fetch candles for ${symbol}:`, err.message);
        return cache.candles[cacheKey] || generateFallbackCandles(limit);
    }
}

/**
 * Fetch current ticker price from Binance
 */
export async function fetchTickerPrice(symbol) {
    try {
        const url = `${BINANCE_REST}/ticker/24hr?symbol=${symbol}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Binance ticker error: ${response.status}`);
        const data = await response.json();
        return {
            symbol: data.symbol,
            price: parseFloat(data.lastPrice),
            priceChange: parseFloat(data.priceChange),
            priceChangePercent: parseFloat(data.priceChangePercent),
            highPrice: parseFloat(data.highPrice),
            lowPrice: parseFloat(data.lowPrice),
            volume: parseFloat(data.volume),
            quoteVolume: parseFloat(data.quoteVolume),
        };
    } catch (err) {
        console.warn(`Failed to fetch ticker for ${symbol}:`, err.message);
        return cache.ticker[symbol] || null;
    }
}

/**
 * Fetch all ticker prices at once
 */
export async function fetchAllTickers() {
    try {
        const symbols = CRYPTO_PAIRS.map(p => p.symbol);
        const url = `${BINANCE_REST}/ticker/24hr`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Binance tickers error: ${response.status}`);
        const allData = await response.json();
        const result = {};
        for (const pair of CRYPTO_PAIRS) {
            const data = allData.find(d => d.symbol === pair.symbol);
            if (data) {
                result[pair.symbol] = {
                    symbol: pair.symbol,
                    display: pair.display,
                    base: pair.base,
                    price: parseFloat(data.lastPrice),
                    priceChange: parseFloat(data.priceChange),
                    priceChangePercent: parseFloat(data.priceChangePercent),
                    highPrice: parseFloat(data.highPrice),
                    lowPrice: parseFloat(data.lowPrice),
                    volume: parseFloat(data.volume),
                    quoteVolume: parseFloat(data.quoteVolume),
                };
                cache.ticker[pair.symbol] = result[pair.symbol];
            }
        }
        return result;
    } catch (err) {
        console.warn('Failed to fetch all tickers:', err.message);
        return cache.ticker;
    }
}

/**
 * Fetch market info from CoinGecko (market cap, etc.)
 */
export async function fetchMarketInfo() {
    const now = Date.now();
    if (cache.marketInfo._fetched && (now - cache.marketInfo._fetched) < MARKET_CACHE_DURATION) {
        return cache.marketInfo;
    }
    try {
        const ids = CRYPTO_PAIRS.map(p => p.coingeckoId).join(',');
        const url = `${COINGECKO_REST}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=true&price_change_percentage=1h,24h,7d`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`CoinGecko error: ${response.status}`);
        const data = await response.json();
        const result = { _fetched: now };
        for (const coin of data) {
            const pair = CRYPTO_PAIRS.find(p => p.coingeckoId === coin.id);
            if (pair) {
                result[pair.symbol] = {
                    marketCap: coin.market_cap,
                    marketCapRank: coin.market_cap_rank,
                    totalVolume: coin.total_volume,
                    circulatingSupply: coin.circulating_supply,
                    ath: coin.ath,
                    athChangePercent: coin.ath_change_percentage,
                    sparkline: coin.sparkline_in_7d?.price || [],
                    priceChange1h: coin.price_change_percentage_1h_in_currency,
                    priceChange24h: coin.price_change_percentage_24h_in_currency,
                    priceChange7d: coin.price_change_percentage_7d_in_currency,
                    image: coin.image,
                };
            }
        }
        cache.marketInfo = result;
        return result;
    } catch (err) {
        console.warn('Failed to fetch market info:', err.message);
        return cache.marketInfo;
    }
}

/**
 * WebSocket for real-time price streams
 */
export class BinanceWebSocket {
    constructor(symbols, onUpdate) {
        this.symbols = symbols;
        this.onUpdate = onUpdate;
        this.ws = null;
        this.reconnectTimer = null;
        this.isConnected = false;
    }

    connect() {
        const streams = this.symbols.map(s => `${s.toLowerCase()}@ticker`).join('/');
        const wsUrl = `wss://stream.binance.com:9443/ws/${streams}`;
        try {
            this.ws = new WebSocket(wsUrl);
            this.ws.onopen = () => {
                this.isConnected = true;
                console.log('🟢 Binance WebSocket connected');
                if (this.onUpdate) this.onUpdate({ type: 'connection', status: 'connected' });
            };
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (this.onUpdate) {
                        this.onUpdate({
                            type: 'ticker',
                            symbol: data.s,
                            price: parseFloat(data.c),
                            priceChange: parseFloat(data.p),
                            priceChangePercent: parseFloat(data.P),
                            highPrice: parseFloat(data.h),
                            lowPrice: parseFloat(data.l),
                            volume: parseFloat(data.v),
                            quoteVolume: parseFloat(data.q),
                        });
                    }
                } catch (e) { /* ignore parse errors */ }
            };
            this.ws.onerror = (err) => {
                console.warn('⚠️ Binance WebSocket error:', err);
                this.isConnected = false;
            };
            this.ws.onclose = () => {
                this.isConnected = false;
                console.log('🔴 Binance WebSocket disconnected, reconnecting in 5s...');
                if (this.onUpdate) this.onUpdate({ type: 'connection', status: 'disconnected' });
                this.reconnectTimer = setTimeout(() => this.connect(), 5000);
            };
        } catch (err) {
            console.warn('WebSocket connection failed:', err);
            this.reconnectTimer = setTimeout(() => this.connect(), 5000);
        }
    }

    disconnect() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        if (this.ws) { this.ws.close(); this.ws = null; }
        this.isConnected = false;
    }
}

/**
 * Fallback candle generator when APIs are unreachable
 */
function generateFallbackCandles(count) {
    const candles = [];
    let price = 50000 + Math.random() * 10000;
    const now = Date.now();
    for (let i = count - 1; i >= 0; i--) {
        const volatility = price * 0.015;
        const open = price;
        const change = (Math.random() - 0.48) * volatility;
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * volatility * 0.5;
        const low = Math.min(open, close) - Math.random() * volatility * 0.5;
        const volume = 100 + Math.random() * 1000;
        candles.push({ time: now - i * 3600000, open, high, low, close, volume });
        price = close;
    }
    return candles;
}

/**
 * Extract arrays from candle data for indicator calculations
 */
export function extractCandleArrays(candles) {
    return {
        opens: candles.map(c => c.open),
        highs: candles.map(c => c.high),
        lows: candles.map(c => c.low),
        closes: candles.map(c => c.close),
        volumes: candles.map(c => c.volume),
        times: candles.map(c => c.time),
    };
}

/**
 * Format price for display
 */
export function formatPrice(price, decimals = 2) {
    if (price === null || price === undefined) return '—';
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(decimals);
    if (price >= 0.01) return price.toFixed(4);
    return price.toFixed(6);
}

/**
 * Format large numbers (e.g., volume, market cap)
 */
export function formatLargeNumber(num) {
    if (!num) return '—';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}
