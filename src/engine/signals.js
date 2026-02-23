// ============================================================
// TraderPro — Combined Signal Decision Engine
// The brain: combines all 15 indicators into trading decisions
// ============================================================

import {
    SMA, EMA, RSI, MACD, BollingerBands, Stochastic,
    ADX, ATR, FibonacciRetracement, VWAP, IchimokuCloud,
    WilliamsR, CCI, OBV, ParabolicSAR
} from './indicators.js';

// Default indicator weights (configurable by user)
const DEFAULT_WEIGHTS = {
    rsi: 1.0,
    macd: 1.0,
    bollingerBands: 0.9,
    sma: 0.7,
    ema: 0.8,
    stochastic: 0.9,
    adx: 0.8,
    vwap: 0.7,
    ichimoku: 0.9,
    williamsR: 0.7,
    cci: 0.7,
    obv: 0.6,
    parabolicSar: 0.8,
    fibonacci: 0.6,
    atr: 0.5,
};

/**
 * Analyze a single indicator and return signal
 * @returns {{ signal: number, value: any, description: string }}
 * signal: +1 = BUY, -1 = SELL, 0 = NEUTRAL
 */
function analyzeRSI(closes) {
    const rsi = RSI(closes);
    const current = rsi[rsi.length - 1];
    if (current === null) return { signal: 0, value: null, description: 'Insufficient data' };
    let signal = 0, description = '';
    if (current < 30) { signal = 1; description = `Oversold (${current.toFixed(1)})`; }
    else if (current < 40) { signal = 0.5; description = `Approaching oversold (${current.toFixed(1)})`; }
    else if (current > 70) { signal = -1; description = `Overbought (${current.toFixed(1)})`; }
    else if (current > 60) { signal = -0.5; description = `Approaching overbought (${current.toFixed(1)})`; }
    else { signal = 0; description = `Neutral (${current.toFixed(1)})`; }
    return { signal, value: current, description, name: 'RSI' };
}

function analyzeMACD(closes) {
    const { macdLine, signal, histogram } = MACD(closes);
    const currentMacd = macdLine[macdLine.length - 1];
    const currentSignal = signal[signal.length - 1];
    const currentHist = histogram[histogram.length - 1];
    const prevHist = histogram[histogram.length - 2];
    if (currentMacd === null || currentSignal === null) return { signal: 0, value: null, description: 'Insufficient data', name: 'MACD' };
    let sig = 0, desc = '';
    if (currentMacd > currentSignal && prevHist !== null && currentHist > prevHist) {
        sig = 1; desc = 'Bullish crossover, momentum increasing';
    } else if (currentMacd > currentSignal) {
        sig = 0.5; desc = 'Above signal line';
    } else if (currentMacd < currentSignal && prevHist !== null && currentHist < prevHist) {
        sig = -1; desc = 'Bearish crossover, momentum decreasing';
    } else if (currentMacd < currentSignal) {
        sig = -0.5; desc = 'Below signal line';
    } else {
        sig = 0; desc = 'Neutral';
    }
    return { signal: sig, value: { macd: currentMacd, signal: currentSignal, histogram: currentHist }, description: desc, name: 'MACD' };
}

function analyzeBollingerBands(closes) {
    const { middle, upper, lower, bandwidth } = BollingerBands(closes);
    const price = closes[closes.length - 1];
    const up = upper[upper.length - 1];
    const lo = lower[lower.length - 1];
    const mid = middle[middle.length - 1];
    if (up === null) return { signal: 0, value: null, description: 'Insufficient data', name: 'Bollinger Bands' };
    const position = (price - lo) / (up - lo);
    let sig = 0, desc = '';
    if (position < 0.05) { sig = 1; desc = 'Price at lower band - potential bounce'; }
    else if (position < 0.2) { sig = 0.7; desc = 'Near lower band - oversold'; }
    else if (position > 0.95) { sig = -1; desc = 'Price at upper band - potential reversal'; }
    else if (position > 0.8) { sig = -0.7; desc = 'Near upper band - overbought'; }
    else { sig = 0; desc = `Mid-band (${(position * 100).toFixed(0)}%)`; }
    return { signal: sig, value: { upper: up, middle: mid, lower: lo, position }, description: desc, name: 'Bollinger Bands' };
}

function analyzeSMA(closes) {
    const sma20 = SMA(closes, 20);
    const sma50 = SMA(closes, 50);
    const price = closes[closes.length - 1];
    const s20 = sma20[sma20.length - 1];
    const s50 = sma50[sma50.length - 1];
    if (s20 === null || s50 === null) return { signal: 0, value: null, description: 'Insufficient data', name: 'SMA Cross' };
    let sig = 0, desc = '';
    if (s20 > s50 && price > s20) { sig = 1; desc = 'Golden cross, price above'; }
    else if (s20 > s50) { sig = 0.5; desc = 'SMA20 > SMA50 (bullish)'; }
    else if (s20 < s50 && price < s20) { sig = -1; desc = 'Death cross, price below'; }
    else if (s20 < s50) { sig = -0.5; desc = 'SMA20 < SMA50 (bearish)'; }
    return { signal: sig, value: { sma20: s20, sma50: s50 }, description: desc, name: 'SMA Cross' };
}

function analyzeEMA(closes) {
    const ema12 = EMA(closes, 12);
    const ema26 = EMA(closes, 26);
    const price = closes[closes.length - 1];
    const e12 = ema12[ema12.length - 1];
    const e26 = ema26[ema26.length - 1];
    if (e12 === null || e26 === null) return { signal: 0, value: null, description: 'Insufficient data', name: 'EMA Cross' };
    let sig = 0, desc = '';
    if (e12 > e26 && price > e12) { sig = 1; desc = 'Bullish EMA cross, price above'; }
    else if (e12 > e26) { sig = 0.5; desc = 'EMA12 > EMA26'; }
    else if (e12 < e26 && price < e12) { sig = -1; desc = 'Bearish EMA cross, price below'; }
    else if (e12 < e26) { sig = -0.5; desc = 'EMA12 < EMA26'; }
    return { signal: sig, value: { ema12: e12, ema26: e26 }, description: desc, name: 'EMA Cross' };
}

function analyzeStochastic(highs, lows, closes) {
    const { k, d } = Stochastic(highs, lows, closes);
    const kVal = k[k.length - 1];
    const dVal = d[d.length - 1];
    if (kVal === null) return { signal: 0, value: null, description: 'Insufficient data', name: 'Stochastic' };
    let sig = 0, desc = '';
    if (kVal < 20 && dVal !== null && kVal > dVal) { sig = 1; desc = `Oversold bullish cross (%K: ${kVal.toFixed(1)})`; }
    else if (kVal < 20) { sig = 0.7; desc = `Oversold (%K: ${kVal.toFixed(1)})`; }
    else if (kVal > 80 && dVal !== null && kVal < dVal) { sig = -1; desc = `Overbought bearish cross (%K: ${kVal.toFixed(1)})`; }
    else if (kVal > 80) { sig = -0.7; desc = `Overbought (%K: ${kVal.toFixed(1)})`; }
    else { sig = 0; desc = `Neutral (%K: ${kVal.toFixed(1)})`; }
    return { signal: sig, value: { k: kVal, d: dVal }, description: desc, name: 'Stochastic' };
}

function analyzeADX(highs, lows, closes) {
    const { adx, plusDI, minusDI } = ADX(highs, lows, closes);
    const adxVal = adx[adx.length - 1];
    const pdi = plusDI[plusDI.length - 1];
    const mdi = minusDI[minusDI.length - 1];
    if (adxVal === null || pdi === null) return { signal: 0, value: null, description: 'Insufficient data', name: 'ADX' };
    let sig = 0, desc = '';
    if (adxVal > 25 && pdi > mdi) { sig = 1; desc = `Strong uptrend (ADX: ${adxVal.toFixed(1)})`; }
    else if (adxVal > 25 && pdi < mdi) { sig = -1; desc = `Strong downtrend (ADX: ${adxVal.toFixed(1)})`; }
    else if (adxVal > 20 && pdi > mdi) { sig = 0.3; desc = `Weak uptrend (ADX: ${adxVal.toFixed(1)})`; }
    else if (adxVal > 20 && pdi < mdi) { sig = -0.3; desc = `Weak downtrend (ADX: ${adxVal.toFixed(1)})`; }
    else { sig = 0; desc = `No trend (ADX: ${adxVal.toFixed(1)})`; }
    return { signal: sig, value: { adx: adxVal, plusDI: pdi, minusDI: mdi }, description: desc, name: 'ADX' };
}

function analyzeVWAP(highs, lows, closes, volumes) {
    const vwap = VWAP(highs, lows, closes, volumes);
    const vwapVal = vwap[vwap.length - 1];
    const price = closes[closes.length - 1];
    if (!vwapVal) return { signal: 0, value: null, description: 'Insufficient data', name: 'VWAP' };
    const deviation = ((price - vwapVal) / vwapVal) * 100;
    let sig = 0, desc = '';
    if (deviation > 2) { sig = -0.5; desc = `Price ${deviation.toFixed(1)}% above VWAP - overextended`; }
    else if (deviation > 0.5) { sig = 0.3; desc = `Price above VWAP - bullish`; }
    else if (deviation < -2) { sig = 0.5; desc = `Price ${Math.abs(deviation).toFixed(1)}% below VWAP - undervalued`; }
    else if (deviation < -0.5) { sig = -0.3; desc = `Price below VWAP - bearish`; }
    else { sig = 0; desc = 'Price at VWAP'; }
    return { signal: sig, value: vwapVal, description: desc, name: 'VWAP' };
}

function analyzeIchimoku(highs, lows, closes) {
    const { tenkan, kijun, senkouA, senkouB } = IchimokuCloud(highs, lows, closes);
    const price = closes[closes.length - 1];
    const t = tenkan[tenkan.length - 1];
    const k = kijun[kijun.length - 1];
    const sa = senkouA[senkouA.length - 1];
    const sb = senkouB[senkouB.length - 1];
    if (t === null || k === null) return { signal: 0, value: null, description: 'Insufficient data', name: 'Ichimoku' };
    let sig = 0, desc = '';
    const cloudTop = sa !== null && sb !== null ? Math.max(sa, sb) : null;
    const cloudBottom = sa !== null && sb !== null ? Math.min(sa, sb) : null;
    if (t > k && cloudTop && price > cloudTop) { sig = 1; desc = 'Strong buy - above cloud, TK cross'; }
    else if (cloudTop && price > cloudTop) { sig = 0.5; desc = 'Above cloud - bullish'; }
    else if (t < k && cloudBottom && price < cloudBottom) { sig = -1; desc = 'Strong sell - below cloud, bearish TK'; }
    else if (cloudBottom && price < cloudBottom) { sig = -0.5; desc = 'Below cloud - bearish'; }
    else { sig = 0; desc = 'In cloud - indecision'; }
    return { signal: sig, value: { tenkan: t, kijun: k, senkouA: sa, senkouB: sb }, description: desc, name: 'Ichimoku' };
}

function analyzeWilliamsR(highs, lows, closes) {
    const wr = WilliamsR(highs, lows, closes);
    const val = wr[wr.length - 1];
    if (val === null) return { signal: 0, value: null, description: 'Insufficient data', name: 'Williams %R' };
    let sig = 0, desc = '';
    if (val > -20) { sig = -1; desc = `Overbought (${val.toFixed(1)})`; }
    else if (val > -30) { sig = -0.5; desc = `Approaching overbought (${val.toFixed(1)})`; }
    else if (val < -80) { sig = 1; desc = `Oversold (${val.toFixed(1)})`; }
    else if (val < -70) { sig = 0.5; desc = `Approaching oversold (${val.toFixed(1)})`; }
    else { sig = 0; desc = `Neutral (${val.toFixed(1)})`; }
    return { signal: sig, value: val, description: desc, name: 'Williams %R' };
}

function analyzeCCI(highs, lows, closes) {
    const cci = CCI(highs, lows, closes);
    const val = cci[cci.length - 1];
    if (val === null) return { signal: 0, value: null, description: 'Insufficient data', name: 'CCI' };
    let sig = 0, desc = '';
    if (val > 200) { sig = -1; desc = `Extremely overbought (${val.toFixed(0)})`; }
    else if (val > 100) { sig = -0.5; desc = `Overbought (${val.toFixed(0)})`; }
    else if (val < -200) { sig = 1; desc = `Extremely oversold (${val.toFixed(0)})`; }
    else if (val < -100) { sig = 0.5; desc = `Oversold (${val.toFixed(0)})`; }
    else { sig = 0; desc = `Neutral (${val.toFixed(0)})`; }
    return { signal: sig, value: val, description: desc, name: 'CCI' };
}

function analyzeOBV(closes, volumes) {
    const obv = OBV(closes, volumes);
    const current = obv[obv.length - 1];
    const prev5 = obv[obv.length - 6] || obv[0];
    if (!current) return { signal: 0, value: null, description: 'Insufficient data', name: 'OBV' };
    const trend = current - prev5;
    const priceChange = closes[closes.length - 1] - closes[closes.length - 6];
    let sig = 0, desc = '';
    if (trend > 0 && priceChange > 0) { sig = 0.7; desc = 'Volume confirms uptrend'; }
    else if (trend > 0 && priceChange <= 0) { sig = 0.5; desc = 'Bullish divergence - volume rising'; }
    else if (trend < 0 && priceChange < 0) { sig = -0.7; desc = 'Volume confirms downtrend'; }
    else if (trend < 0 && priceChange >= 0) { sig = -0.5; desc = 'Bearish divergence - volume falling'; }
    else { sig = 0; desc = 'Neutral volume'; }
    return { signal: sig, value: current, description: desc, name: 'OBV' };
}

function analyzeParabolicSAR(highs, lows, closes) {
    const sar = ParabolicSAR(highs, lows);
    const currentSar = sar[sar.length - 1];
    const prevSar = sar[sar.length - 2];
    const price = closes[closes.length - 1];
    if (!currentSar) return { signal: 0, value: null, description: 'Insufficient data', name: 'Parabolic SAR' };
    let sig = 0, desc = '';
    if (price > currentSar && (prevSar && closes[closes.length - 2] <= prevSar)) {
        sig = 1; desc = 'Bullish SAR flip';
    } else if (price > currentSar) {
        sig = 0.5; desc = 'Uptrend (SAR below price)';
    } else if (price < currentSar && (prevSar && closes[closes.length - 2] >= prevSar)) {
        sig = -1; desc = 'Bearish SAR flip';
    } else if (price < currentSar) {
        sig = -0.5; desc = 'Downtrend (SAR above price)';
    }
    return { signal: sig, value: currentSar, description: desc, name: 'Parabolic SAR' };
}

function analyzeFibonacci(highs, lows, closes) {
    const lookback = Math.min(100, closes.length);
    let high = -Infinity, low = Infinity;
    for (let i = closes.length - lookback; i < closes.length; i++) {
        if (highs[i] > high) high = highs[i];
        if (lows[i] < low) low = lows[i];
    }
    const fib = FibonacciRetracement(high, low);
    const price = closes[closes.length - 1];
    let sig = 0, desc = '';
    const position = (price - low) / (high - low);
    if (position < 0.236) { sig = 0.8; desc = 'Near 100% retracement - strong support'; }
    else if (position < 0.382) { sig = 0.5; desc = 'Between 78.6%-61.8% retracement'; }
    else if (position > 0.786) { sig = -0.5; desc = 'Near swing high - potential resistance'; }
    else if (Math.abs(position - 0.618) < 0.05) { sig = 0.3; desc = 'At golden ratio (61.8%) - key level'; }
    else { sig = 0; desc = `Position: ${(position * 100).toFixed(1)}%`; }
    return { signal: sig, value: fib, description: desc, name: 'Fibonacci' };
}

function analyzeATR(highs, lows, closes) {
    const atr = ATR(highs, lows, closes);
    const current = atr[atr.length - 1];
    const prev = atr[atr.length - 10] || atr.find(v => v !== null);
    const price = closes[closes.length - 1];
    if (!current) return { signal: 0, value: null, description: 'Insufficient data', name: 'ATR' };
    const atrPercent = (current / price) * 100;
    const trend = prev ? (current - prev) / prev * 100 : 0;
    let sig = 0, desc = '';
    if (atrPercent > 5) { sig = 0; desc = `Extremely high volatility (${atrPercent.toFixed(2)}%)`; }
    else if (trend > 20) { sig = 0; desc = `Volatility expanding (${atrPercent.toFixed(2)}%)`; }
    else if (trend < -20) { sig = 0; desc = `Volatility contracting (${atrPercent.toFixed(2)}%)`; }
    else { sig = 0; desc = `Normal volatility (${atrPercent.toFixed(2)}%)`; }
    return { signal: sig, value: current, description: desc, name: 'ATR', atrPercent };
}

/**
 * Run ALL indicators and produce combined signal
 */
export function analyzeAll(candles, weights = DEFAULT_WEIGHTS) {
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);

    if (closes.length < 52) {
        return {
            decision: 'HOLD',
            confidence: 0,
            score: 0,
            indicators: [],
            risk: 'Unknown',
            error: 'Insufficient data (need at least 52 candles)',
        };
    }

    const indicators = [
        { ...analyzeRSI(closes), weight: weights.rsi },
        { ...analyzeMACD(closes), weight: weights.macd },
        { ...analyzeBollingerBands(closes), weight: weights.bollingerBands },
        { ...analyzeSMA(closes), weight: weights.sma },
        { ...analyzeEMA(closes), weight: weights.ema },
        { ...analyzeStochastic(highs, lows, closes), weight: weights.stochastic },
        { ...analyzeADX(highs, lows, closes), weight: weights.adx },
        { ...analyzeVWAP(highs, lows, closes, volumes), weight: weights.vwap },
        { ...analyzeIchimoku(highs, lows, closes), weight: weights.ichimoku },
        { ...analyzeWilliamsR(highs, lows, closes), weight: weights.williamsR },
        { ...analyzeCCI(highs, lows, closes), weight: weights.cci },
        { ...analyzeOBV(closes, volumes), weight: weights.obv },
        { ...analyzeParabolicSAR(highs, lows, closes), weight: weights.parabolicSar },
        { ...analyzeFibonacci(highs, lows, closes), weight: weights.fibonacci },
        { ...analyzeATR(highs, lows, closes), weight: weights.atr },
    ];

    // Calculate weighted score
    let totalWeight = 0;
    let weightedScore = 0;
    let agreementCount = 0;
    let buyCount = 0, sellCount = 0, neutralCount = 0;

    for (const ind of indicators) {
        if (ind.value === null) continue;
        weightedScore += ind.signal * ind.weight;
        totalWeight += ind.weight;
        if (ind.signal > 0.3) buyCount++;
        else if (ind.signal < -0.3) sellCount++;
        else neutralCount++;
    }

    const normalizedScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
    const majoritySignal = buyCount > sellCount ? buyCount : sellCount;
    const totalSignals = buyCount + sellCount + neutralCount;
    const confidence = totalSignals > 0 ? (majoritySignal / totalSignals) * 100 : 0;

    // Determine decision
    let decision;
    if (normalizedScore > 0.5) decision = 'STRONG BUY';
    else if (normalizedScore > 0.2) decision = 'BUY';
    else if (normalizedScore < -0.5) decision = 'STRONG SELL';
    else if (normalizedScore < -0.2) decision = 'SELL';
    else decision = 'HOLD';

    // Risk assessment
    const atrResult = indicators.find(i => i.name === 'ATR');
    const bbResult = indicators.find(i => i.name === 'Bollinger Bands');
    const adxResult = indicators.find(i => i.name === 'ADX');
    let riskLevel = 'Medium';
    let riskScore = 50;
    if (atrResult && atrResult.atrPercent) {
        riskScore = Math.min(100, atrResult.atrPercent * 20);
    }
    if (riskScore > 70) riskLevel = 'High';
    else if (riskScore < 30) riskLevel = 'Low';

    return {
        decision,
        confidence: Math.round(confidence),
        score: normalizedScore,
        indicators,
        risk: riskLevel,
        riskScore: Math.round(riskScore),
        buyCount,
        sellCount,
        neutralCount,
        timestamp: Date.now(),
    };
}

/**
 * Get signal class name for CSS
 */
export function getSignalClass(decision) {
    switch (decision) {
        case 'STRONG BUY': return 'signal-strong-buy';
        case 'BUY': return 'signal-buy';
        case 'STRONG SELL': return 'signal-strong-sell';
        case 'SELL': return 'signal-sell';
        default: return 'signal-hold';
    }
}

/**
 * Get badge class for CSS
 */
export function getBadgeClass(signal) {
    if (signal > 0.3) return 'badge-buy';
    if (signal < -0.3) return 'badge-sell';
    return 'badge-neutral';
}

/**
 * Generate BUY/SELL signal markers for chart overlay
 * Walks through candle history computing signals at each point
 * Detects transitions and generates markers with price targets
 */
export function generateChartSignals(candles, weights = DEFAULT_WEIGHTS, minLookback = 52) {
    if (!candles || candles.length < minLookback + 10) return [];

    const markers = [];
    let prevDecision = 'HOLD';
    const step = 3; // Evaluate every 3 candles for performance

    for (let i = minLookback; i < candles.length; i += step) {
        const slice = candles.slice(0, i + 1);
        const result = analyzeAll(slice, weights);

        // Detect signal transitions (e.g., HOLD→BUY or BUY→SELL)
        const isBuy = result.decision === 'BUY' || result.decision === 'STRONG BUY';
        const isSell = result.decision === 'SELL' || result.decision === 'STRONG SELL';
        const wasBuy = prevDecision === 'BUY' || prevDecision === 'STRONG BUY';
        const wasSell = prevDecision === 'SELL' || prevDecision === 'STRONG SELL';

        if (isBuy && !wasBuy) {
            const candle = candles[i];
            const atr = result.indicators.find(ind => ind.name === 'ATR');
            const atrVal = (atr && typeof atr.value === 'number') ? atr.value : candle.close * 0.02;
            markers.push({
                index: i,
                type: 'BUY',
                price: candle.close,
                candle,
                confidence: result.confidence,
                score: result.score,
                targetPrice: candle.close + atrVal * 2,   // Take profit
                stopPrice: candle.close - atrVal * 1.5,   // Stop loss
                timestamp: candle.openTime || candle.time || Date.now(),
            });
        } else if (isSell && !wasSell) {
            const candle = candles[i];
            const atr = result.indicators.find(ind => ind.name === 'ATR');
            const atrVal = (atr && typeof atr.value === 'number') ? atr.value : candle.close * 0.02;
            markers.push({
                index: i,
                type: 'SELL',
                price: candle.close,
                candle,
                confidence: result.confidence,
                score: result.score,
                targetPrice: candle.close - atrVal * 2,
                stopPrice: candle.close + atrVal * 1.5,
                timestamp: candle.openTime || candle.time || Date.now(),
            });
        }

        prevDecision = result.decision;
    }

    return markers;
}

export { DEFAULT_WEIGHTS };
