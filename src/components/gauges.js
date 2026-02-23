// ============================================================
// TraderPro — Gauge Components
// Animated circular gauges for signal strength and risk
// ============================================================

/**
 * Create an SVG circular gauge
 */
export function createGauge(value, max, label, colorFn, size = 140) {
    const radius = (size - 20) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.max(0, Math.min(1, value / max));
    const dashOffset = circumference * (1 - progress);
    const color = typeof colorFn === 'function' ? colorFn(value) : colorFn;

    const container = document.createElement('div');
    container.className = 'gauge';
    container.style.width = size + 'px';
    container.style.height = size + 'px';

    container.innerHTML = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}"
        fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8" />
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}"
        fill="none" stroke="${color}" stroke-width="8"
        stroke-linecap="round"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${dashOffset}"
        style="transition: stroke-dashoffset 1s ease, stroke 0.5s ease;"
      />
    </svg>
    <div class="gauge-value" style="color:${color}">${typeof value === 'number' ? Math.round(value) : value}</div>
    <div class="gauge-label">${label}</div>
  `;

    return container;
}

/**
 * Create a signal strength gauge (-1 to +1 mapped to 0-100)
 */
export function createSignalGauge(score, size = 160) {
    const normalized = ((score + 1) / 2) * 100;
    return createGauge(
        normalized, 100,
        score > 0.2 ? 'BULLISH' : score < -0.2 ? 'BEARISH' : 'NEUTRAL',
        (v) => {
            if (v > 65) return '#00e676';
            if (v > 55) return '#69f0ae';
            if (v < 35) return '#ff1744';
            if (v < 45) return '#ff5252';
            return '#ffab00';
        },
        size,
    );
}

/**
 * Create a confidence gauge
 */
export function createConfidenceGauge(confidence, size = 120) {
    return createGauge(
        confidence, 100, 'CONFIDENCE',
        (v) => {
            if (v > 70) return '#00e676';
            if (v > 50) return '#ffab00';
            return '#ff5252';
        },
        size,
    );
}

/**
 * Create a risk gauge
 */
export function createRiskGauge(riskScore, size = 120) {
    return createGauge(
        riskScore, 100, 'RISK',
        (v) => {
            if (v > 70) return '#ff1744';
            if (v > 40) return '#ffab00';
            return '#00e676';
        },
        size,
    );
}

/**
 * Create a horizontal signal bar
 */
export function createSignalBar(indicators) {
    const container = document.createElement('div');
    container.style.cssText = 'display:flex;gap:4px;align-items:center;flex-wrap:wrap;';

    for (const ind of indicators) {
        if (!ind || ind.value === null) continue;
        const dot = document.createElement('div');
        dot.className = 'tooltip';
        dot.setAttribute('data-tooltip', `${ind.name}: ${ind.description}`);
        dot.style.cssText = `
      width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;
      font-size:10px;font-weight:700;cursor:default;transition:all 0.2s ease;
      background:${ind.signal > 0.3 ? 'var(--color-buy-bg)' : ind.signal < -0.3 ? 'var(--color-sell-bg)' : 'rgba(120,144,156,0.1)'};
      color:${ind.signal > 0.3 ? 'var(--color-buy)' : ind.signal < -0.3 ? 'var(--color-sell)' : 'var(--color-neutral)'};
      border:1px solid ${ind.signal > 0.3 ? 'rgba(0,230,118,0.2)' : ind.signal < -0.3 ? 'rgba(255,23,68,0.2)' : 'rgba(120,144,156,0.15)'};
    `;
        dot.textContent = ind.signal > 0.3 ? 'B' : ind.signal < -0.3 ? 'S' : '—';
        dot.addEventListener('mouseenter', () => { dot.style.transform = 'scale(1.15)'; });
        dot.addEventListener('mouseleave', () => { dot.style.transform = 'scale(1)'; });
        container.appendChild(dot);
    }
    return container;
}
