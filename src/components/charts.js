// ============================================================
// TraderPro — Charts Component (Canvas-based)
// Candlestick charts, line charts, sparklines
// ============================================================

/**
 * Draw a candlestick chart on a canvas element
 */
export function drawCandlestickChart(canvas, candles, options = {}) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;
    ctx.clearRect(0, 0, W, H);

    if (!candles || candles.length === 0) return;

    const displayCandles = candles.slice(-100);
    const padding = { top: 20, right: 60, bottom: 30, left: 10 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;

    // Find price range
    let minPrice = Infinity, maxPrice = -Infinity;
    for (const c of displayCandles) {
        if (c.low < minPrice) minPrice = c.low;
        if (c.high > maxPrice) maxPrice = c.high;
    }
    const priceRange = maxPrice - minPrice || 1;
    const pricePad = priceRange * 0.05;
    minPrice -= pricePad;
    maxPrice += pricePad;
    const totalRange = maxPrice - minPrice;

    const candleWidth = Math.max(2, (chartW / displayCandles.length) * 0.7);
    const gap = chartW / displayCandles.length;

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartH / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(W - padding.right, y);
        ctx.stroke();
        // Price labels
        const price = maxPrice - (totalRange / gridLines) * i;
        ctx.fillStyle = 'rgba(148,163,184,0.6)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(formatPriceLabel(price), W - padding.right + 5, y + 4);
    }

    // Volume bars
    const maxVol = Math.max(...displayCandles.map(c => c.volume));
    const volHeight = chartH * 0.15;
    for (let i = 0; i < displayCandles.length; i++) {
        const c = displayCandles[i];
        const x = padding.left + i * gap + gap / 2;
        const vh = (c.volume / maxVol) * volHeight;
        const bullish = c.close >= c.open;
        ctx.fillStyle = bullish ? 'rgba(0,230,118,0.12)' : 'rgba(255,23,68,0.12)';
        ctx.fillRect(x - candleWidth / 2, padding.top + chartH - vh, candleWidth, vh);
    }

    // Candles
    for (let i = 0; i < displayCandles.length; i++) {
        const c = displayCandles[i];
        const x = padding.left + i * gap + gap / 2;
        const bullish = c.close >= c.open;

        const highY = padding.top + ((maxPrice - c.high) / totalRange) * chartH;
        const lowY = padding.top + ((maxPrice - c.low) / totalRange) * chartH;
        const openY = padding.top + ((maxPrice - c.open) / totalRange) * chartH;
        const closeY = padding.top + ((maxPrice - c.close) / totalRange) * chartH;

        // Wick
        ctx.strokeStyle = bullish ? '#00e676' : '#ff1744';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Body
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(1, Math.abs(openY - closeY));
        ctx.fillStyle = bullish ? '#00e676' : '#ff1744';
        if (bullish) {
            ctx.fillStyle = 'rgba(0,230,118,0.8)';
        } else {
            ctx.fillStyle = 'rgba(255,23,68,0.8)';
        }
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    }

    // Current price line
    const lastCandle = displayCandles[displayCandles.length - 1];
    const lastY = padding.top + ((maxPrice - lastCandle.close) / totalRange) * chartH;
    const lastColor = lastCandle.close >= lastCandle.open ? '#00e676' : '#ff1744';
    ctx.strokeStyle = lastColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, lastY);
    ctx.lineTo(W - padding.right, lastY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current price badge
    ctx.fillStyle = lastColor;
    const badgeW = 55, badgeH = 18;
    ctx.fillRect(W - padding.right, lastY - badgeH / 2, badgeW, badgeH);
    ctx.fillStyle = lastCandle.close >= lastCandle.open ? '#000' : '#fff';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(formatPriceLabel(lastCandle.close), W - padding.right + badgeW / 2, lastY + 3.5);

    // Draw overlay indicators if provided
    if (options.overlays) {
        for (const overlay of options.overlays) {
            drawOverlayLine(ctx, overlay.data, displayCandles, overlay.color, overlay.opacity || 0.7,
                padding, chartW, chartH, minPrice, maxPrice, totalRange, gap);
        }
    }

    // Draw signal markers (BUY/SELL arrows on chart)
    if (options.signals && options.signals.length > 0) {
        drawSignalMarkers(ctx, options.signals, displayCandles, candles.length,
            padding, chartW, chartH, minPrice, maxPrice, totalRange, gap, candleWidth);
    }

    // Draw live price line if provided (pulsing line for real-time price)
    if (options.livePrice != null) {
        const liveY = padding.top + ((maxPrice - options.livePrice) / totalRange) * chartH;
        if (liveY >= padding.top && liveY <= padding.top + chartH) {
            // Pulsing live line
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 3]);
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(padding.left, liveY);
            ctx.lineTo(W - padding.right, liveY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;

            // Live price badge
            ctx.fillStyle = '#22d3ee';
            const liveBW = 55, liveBH = 16;
            ctx.fillRect(W - padding.right, liveY - liveBH / 2, liveBW, liveBH);
            ctx.fillStyle = '#000';
            ctx.font = 'bold 9px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(formatPriceLabel(options.livePrice), W - padding.right + liveBW / 2, liveY + 3);
        }
    }
}

function drawOverlayLine(ctx, data, candles, color, opacity, padding, chartW, chartH, minPrice, maxPrice, totalRange, gap) {
    ctx.strokeStyle = color;
    ctx.globalAlpha = opacity;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    const offset = data.length - candles.length;
    for (let i = 0; i < candles.length; i++) {
        const val = data[i + Math.max(0, offset)];
        if (val === null || val === undefined) continue;
        const x = padding.left + i * gap + gap / 2;
        const y = padding.top + ((maxPrice - val) / totalRange) * chartH;
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
}

/**
 * Draw BUY/SELL signal markers on the candlestick chart
 * BUY: green upward triangle below the candle low
 * SELL: red downward triangle above the candle high
 */
function drawSignalMarkers(ctx, signals, displayCandles, totalCandleCount, padding, chartW, chartH, minPrice, maxPrice, totalRange, gap, candleWidth) {
    const displayOffset = totalCandleCount - displayCandles.length;

    for (const sig of signals) {
        const displayIdx = sig.index - displayOffset;
        if (displayIdx < 0 || displayIdx >= displayCandles.length) continue;

        const candle = displayCandles[displayIdx];
        const x = padding.left + displayIdx * gap + gap / 2;
        const isBuy = sig.type === 'BUY';
        const markerSize = Math.max(6, Math.min(10, candleWidth * 0.9));
        const confOpacity = 0.6 + (sig.confidence / 100) * 0.4;

        if (isBuy) {
            // Green triangle pointing UP, placed below candle low
            const baseY = padding.top + ((maxPrice - candle.low) / totalRange) * chartH + markerSize + 4;
            ctx.globalAlpha = confOpacity;
            ctx.fillStyle = '#00e676';
            ctx.beginPath();
            ctx.moveTo(x, baseY - markerSize);          // tip (top)
            ctx.lineTo(x - markerSize / 2, baseY);       // bottom-left
            ctx.lineTo(x + markerSize / 2, baseY);       // bottom-right
            ctx.closePath();
            ctx.fill();

            // Glow shadow
            ctx.shadowColor = 'rgba(0,230,118,0.5)';
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            // BUY price label
            ctx.fillStyle = '#00e676';
            ctx.globalAlpha = 0.85;
            ctx.font = 'bold 8px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`B ${formatPriceLabel(sig.price)}`, x, baseY + 11);
        } else {
            // Red triangle pointing DOWN, placed above candle high
            const baseY = padding.top + ((maxPrice - candle.high) / totalRange) * chartH - markerSize - 4;
            ctx.globalAlpha = confOpacity;
            ctx.fillStyle = '#ff1744';
            ctx.beginPath();
            ctx.moveTo(x, baseY + markerSize);           // tip (bottom)
            ctx.lineTo(x - markerSize / 2, baseY);       // top-left
            ctx.lineTo(x + markerSize / 2, baseY);       // top-right
            ctx.closePath();
            ctx.fill();

            // Glow shadow
            ctx.shadowColor = 'rgba(255,23,68,0.5)';
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            // SELL price label
            ctx.fillStyle = '#ff1744';
            ctx.globalAlpha = 0.85;
            ctx.font = 'bold 8px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`S ${formatPriceLabel(sig.price)}`, x, baseY - 4);
        }
        ctx.globalAlpha = 1;
    }

    // Draw target/stop lines for the most recent signal in view
    const visibleSignals = signals.filter(s => {
        const di = s.index - displayOffset;
        return di >= 0 && di < displayCandles.length;
    });

    if (visibleSignals.length > 0) {
        const latest = visibleSignals[visibleSignals.length - 1];
        const latestX = padding.left + (latest.index - displayOffset) * gap + gap / 2;

        // Take-profit line (green dashed)
        if (latest.targetPrice >= minPrice && latest.targetPrice <= maxPrice) {
            const tpY = padding.top + ((maxPrice - latest.targetPrice) / totalRange) * chartH;
            ctx.strokeStyle = '#00e676';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 4]);
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.moveTo(latestX, tpY);
            ctx.lineTo(padding.left + chartW, tpY);
            ctx.stroke();
            ctx.setLineDash([]);
            // TP label
            ctx.fillStyle = '#00e676';
            ctx.globalAlpha = 0.7;
            ctx.font = '8px "JetBrains Mono", monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`TP ${formatPriceLabel(latest.targetPrice)}`, padding.left + chartW - 2, tpY - 3);
        }

        // Stop-loss line (red dashed)
        if (latest.stopPrice >= minPrice && latest.stopPrice <= maxPrice) {
            const slY = padding.top + ((maxPrice - latest.stopPrice) / totalRange) * chartH;
            ctx.strokeStyle = '#ff1744';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 4]);
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.moveTo(latestX, slY);
            ctx.lineTo(padding.left + chartW, slY);
            ctx.stroke();
            ctx.setLineDash([]);
            // SL label
            ctx.fillStyle = '#ff1744';
            ctx.globalAlpha = 0.7;
            ctx.font = '8px "JetBrains Mono", monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`SL ${formatPriceLabel(latest.stopPrice)}`, padding.left + chartW - 2, slY - 3);
        }

        ctx.globalAlpha = 1;
    }
}


/**
 * Draw a sparkline (mini line chart)
 */
export function drawSparkline(canvas, data, color = '#6366f1', fillColor = null) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;
    ctx.clearRect(0, 0, W, H);

    if (!data || data.length < 2) return;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pad = 4;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const points = [];
    for (let i = 0; i < data.length; i++) {
        const x = pad + (i / (data.length - 1)) * (W - pad * 2);
        const y = pad + ((max - data[i]) / range) * (H - pad * 2);
        points.push({ x, y });
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Fill gradient
    if (fillColor !== false) {
        const gradient = ctx.createLinearGradient(0, 0, 0, H);
        gradient.addColorStop(0, (fillColor || color).replace(')', ',0.2)').replace('rgb', 'rgba'));
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.lineTo(W - pad, H);
        ctx.lineTo(pad, H);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    // End dot
    const last = points[points.length - 1];
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Draw an equity curve
 */
export function drawEquityCurve(canvas, equityHistory) {
    if (!equityHistory || equityHistory.length < 2) return;
    const data = equityHistory.map(e => e.equity);
    const positive = data[data.length - 1] >= data[0];
    drawSparkline(canvas, data, positive ? '#00e676' : '#ff1744');
}

function formatPriceLabel(price) {
    if (price >= 10000) return price.toFixed(0);
    if (price >= 1000) return price.toFixed(1);
    if (price >= 1) return price.toFixed(2);
    if (price >= 0.01) return price.toFixed(4);
    return price.toFixed(6);
}
