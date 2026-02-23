// ============================================================
// TraderPro — Technical Indicators Engine
// Pure mathematical implementations of 15 trading indicators
// ============================================================

/** Simple Moving Average */
export function SMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j];
    result.push(sum / period);
  }
  return result;
}

/** Exponential Moving Average */
export function EMA(data, period) {
  const result = [];
  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    if (i === period - 1) { result.push(ema); continue; }
    ema = (data[i] - ema) * multiplier + ema;
    result.push(ema);
  }
  return result;
}

/** Relative Strength Index */
export function RSI(closes, period = 14) {
  const result = [];
  let gains = 0, losses = 0;
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) { result.push(null); continue; }
    const change = closes[i] - closes[i - 1];
    if (i <= period) {
      if (change > 0) gains += change; else losses -= change;
      if (i < period) { result.push(null); continue; }
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
      continue;
    }
    const change_g = change > 0 ? change : 0;
    const change_l = change < 0 ? -change : 0;
    gains = (gains * (period - 1) + change_g) / period;
    losses = (losses * (period - 1) + change_l) / period;
    const rs = losses === 0 ? 100 : gains / losses;
    result.push(100 - 100 / (1 + rs));
  }
  return result;
}

/** MACD (Moving Average Convergence Divergence) */
export function MACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = EMA(closes, fastPeriod);
  const slowEMA = EMA(closes, slowPeriod);
  const macdLine = [];
  for (let i = 0; i < closes.length; i++) {
    if (fastEMA[i] === null || slowEMA[i] === null) { macdLine.push(null); continue; }
    macdLine.push(fastEMA[i] - slowEMA[i]);
  }
  const validMacd = macdLine.filter(v => v !== null);
  const signalEMA = EMA(validMacd, signalPeriod);
  const signal = [];
  let validIdx = 0;
  for (let i = 0; i < closes.length; i++) {
    if (macdLine[i] === null) { signal.push(null); continue; }
    signal.push(signalEMA[validIdx] || null);
    validIdx++;
  }
  const histogram = [];
  for (let i = 0; i < closes.length; i++) {
    if (macdLine[i] === null || signal[i] === null) { histogram.push(null); continue; }
    histogram.push(macdLine[i] - signal[i]);
  }
  return { macdLine, signal, histogram };
}

/** Bollinger Bands */
export function BollingerBands(closes, period = 20, stdDevMultiplier = 2) {
  const sma = SMA(closes, period);
  const upper = [], lower = [], bandwidth = [];
  for (let i = 0; i < closes.length; i++) {
    if (sma[i] === null) { upper.push(null); lower.push(null); bandwidth.push(null); continue; }
    let sumSqDiff = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumSqDiff += (closes[j] - sma[i]) ** 2;
    }
    const stdDev = Math.sqrt(sumSqDiff / period);
    upper.push(sma[i] + stdDevMultiplier * stdDev);
    lower.push(sma[i] - stdDevMultiplier * stdDev);
    bandwidth.push(stdDev * stdDevMultiplier * 2 / sma[i] * 100);
  }
  return { middle: sma, upper, lower, bandwidth };
}

/** Stochastic Oscillator */
export function Stochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
  const kValues = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < kPeriod - 1) { kValues.push(null); continue; }
    let highestHigh = -Infinity, lowestLow = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (highs[j] > highestHigh) highestHigh = highs[j];
      if (lows[j] < lowestLow) lowestLow = lows[j];
    }
    const range = highestHigh - lowestLow;
    kValues.push(range === 0 ? 50 : ((closes[i] - lowestLow) / range) * 100);
  }
  const validK = kValues.filter(v => v !== null);
  const dRaw = SMA(validK, dPeriod);
  const dValues = [];
  let idx = 0;
  for (let i = 0; i < closes.length; i++) {
    if (kValues[i] === null) { dValues.push(null); continue; }
    dValues.push(dRaw[idx] || null);
    idx++;
  }
  return { k: kValues, d: dValues };
}

/** Average Directional Index (ADX) */
export function ADX(highs, lows, closes, period = 14) {
  const trueRanges = [];
  const plusDM = [];
  const minusDM = [];
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) { trueRanges.push(0); plusDM.push(0); minusDM.push(0); continue; }
    const highDiff = highs[i] - highs[i - 1];
    const lowDiff = lows[i - 1] - lows[i];
    trueRanges.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ));
    plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
  }
  const smoothedTR = smoothWilder(trueRanges, period);
  const smoothedPlusDM = smoothWilder(plusDM, period);
  const smoothedMinusDM = smoothWilder(minusDM, period);
  const plusDI = [], minusDI = [], dx = [];
  for (let i = 0; i < closes.length; i++) {
    if (!smoothedTR[i] || smoothedTR[i] === 0) { plusDI.push(null); minusDI.push(null); dx.push(null); continue; }
    const pdi = (smoothedPlusDM[i] / smoothedTR[i]) * 100;
    const mdi = (smoothedMinusDM[i] / smoothedTR[i]) * 100;
    plusDI.push(pdi);
    minusDI.push(mdi);
    const diSum = pdi + mdi;
    dx.push(diSum === 0 ? 0 : Math.abs(pdi - mdi) / diSum * 100);
  }
  const validDx = dx.filter(v => v !== null);
  const adxRaw = SMA(validDx, period);
  const adxValues = [];
  let vi = 0;
  for (let i = 0; i < closes.length; i++) {
    if (dx[i] === null) { adxValues.push(null); continue; }
    adxValues.push(adxRaw[vi] || null);
    vi++;
  }
  return { adx: adxValues, plusDI, minusDI };
}

function smoothWilder(data, period) {
  const result = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    if (i < period) { sum += data[i]; result.push(i === period - 1 ? sum : 0); continue; }
    result.push(result[i - 1] - result[i - 1] / period + data[i]);
  }
  return result;
}

/** Average True Range (ATR) */
export function ATR(highs, lows, closes, period = 14) {
  const trueRanges = [];
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) { trueRanges.push(highs[i] - lows[i]); continue; }
    trueRanges.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ));
  }
  return SMA(trueRanges, period);
}

/** Fibonacci Retracement Levels */
export function FibonacciRetracement(high, low) {
  const diff = high - low;
  return {
    level0: high,
    level236: high - diff * 0.236,
    level382: high - diff * 0.382,
    level500: high - diff * 0.5,
    level618: high - diff * 0.618,
    level786: high - diff * 0.786,
    level1: low,
  };
}

/** Volume Weighted Average Price (VWAP) */
export function VWAP(highs, lows, closes, volumes) {
  const result = [];
  let cumPV = 0, cumVol = 0;
  for (let i = 0; i < closes.length; i++) {
    const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
    cumPV += typicalPrice * volumes[i];
    cumVol += volumes[i];
    result.push(cumVol === 0 ? closes[i] : cumPV / cumVol);
  }
  return result;
}

/** Ichimoku Cloud */
export function IchimokuCloud(highs, lows, closes, tenkanPeriod = 9, kijunPeriod = 26, senkouBPeriod = 52) {
  const tenkan = [], kijun = [], senkouA = [], senkouB = [], chikou = [];
  const calcMidpoint = (arr, start, end) => {
    let hi = -Infinity, lo = Infinity;
    for (let i = start; i <= end; i++) {
      if (arr === highs && highs[i] > hi) hi = highs[i];
      if (arr === lows && lows[i] < lo) lo = lows[i];
    }
    return (hi + lo) / 2;
  };
  for (let i = 0; i < closes.length; i++) {
    if (i >= tenkanPeriod - 1) {
      let hi = -Infinity, lo = Infinity;
      for (let j = i - tenkanPeriod + 1; j <= i; j++) { hi = Math.max(hi, highs[j]); lo = Math.min(lo, lows[j]); }
      tenkan.push((hi + lo) / 2);
    } else tenkan.push(null);
    if (i >= kijunPeriod - 1) {
      let hi = -Infinity, lo = Infinity;
      for (let j = i - kijunPeriod + 1; j <= i; j++) { hi = Math.max(hi, highs[j]); lo = Math.min(lo, lows[j]); }
      kijun.push((hi + lo) / 2);
    } else kijun.push(null);
    if (tenkan[i] !== null && kijun[i] !== null) {
      senkouA.push((tenkan[i] + kijun[i]) / 2);
    } else senkouA.push(null);
    if (i >= senkouBPeriod - 1) {
      let hi = -Infinity, lo = Infinity;
      for (let j = i - senkouBPeriod + 1; j <= i; j++) { hi = Math.max(hi, highs[j]); lo = Math.min(lo, lows[j]); }
      senkouB.push((hi + lo) / 2);
    } else senkouB.push(null);
    chikou.push(closes[i]);
  }
  return { tenkan, kijun, senkouA, senkouB, chikou };
}

/** Williams %R */
export function WilliamsR(highs, lows, closes, period = 14) {
  const result = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let highestHigh = -Infinity, lowestLow = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      highestHigh = Math.max(highestHigh, highs[j]);
      lowestLow = Math.min(lowestLow, lows[j]);
    }
    const range = highestHigh - lowestLow;
    result.push(range === 0 ? -50 : ((highestHigh - closes[i]) / range) * -100);
  }
  return result;
}

/** Commodity Channel Index (CCI) */
export function CCI(highs, lows, closes, period = 20) {
  const typicalPrices = closes.map((c, i) => (highs[i] + lows[i] + c) / 3);
  const sma = SMA(typicalPrices, period);
  const result = [];
  for (let i = 0; i < closes.length; i++) {
    if (sma[i] === null) { result.push(null); continue; }
    let meanDev = 0;
    for (let j = i - period + 1; j <= i; j++) {
      meanDev += Math.abs(typicalPrices[j] - sma[i]);
    }
    meanDev /= period;
    result.push(meanDev === 0 ? 0 : (typicalPrices[i] - sma[i]) / (0.015 * meanDev));
  }
  return result;
}

/** On-Balance Volume (OBV) */
export function OBV(closes, volumes) {
  const result = [volumes[0] || 0];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) result.push(result[i - 1] + volumes[i]);
    else if (closes[i] < closes[i - 1]) result.push(result[i - 1] - volumes[i]);
    else result.push(result[i - 1]);
  }
  return result;
}

/** Parabolic SAR */
export function ParabolicSAR(highs, lows, afStart = 0.02, afMax = 0.2) {
  if (highs.length < 2) return [];
  const result = [];
  let isUpTrend = true;
  let sar = lows[0];
  let ep = highs[0];
  let af = afStart;
  result.push(sar);
  for (let i = 1; i < highs.length; i++) {
    const prevSar = sar;
    sar = prevSar + af * (ep - prevSar);
    if (isUpTrend) {
      sar = Math.min(sar, lows[i - 1], i > 1 ? lows[i - 2] : lows[i - 1]);
      if (lows[i] < sar) {
        isUpTrend = false;
        sar = ep;
        ep = lows[i];
        af = afStart;
      } else {
        if (highs[i] > ep) { ep = highs[i]; af = Math.min(af + afStart, afMax); }
      }
    } else {
      sar = Math.max(sar, highs[i - 1], i > 1 ? highs[i - 2] : highs[i - 1]);
      if (highs[i] > sar) {
        isUpTrend = true;
        sar = ep;
        ep = highs[i];
        af = afStart;
      } else {
        if (lows[i] < ep) { ep = lows[i]; af = Math.min(af + afStart, afMax); }
      }
    }
    result.push(sar);
  }
  return result;
}
