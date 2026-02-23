// ============================================================
// TraderPro — News Terminal Page
// ============================================================

import { getSentimentClass, getSentimentLabel, calculateOverallSentiment } from '../engine/news.js';

export function renderNews(container, appState) {
    const { news } = appState;
    const overall = calculateOverallSentiment(news);

    container.innerHTML = `
    <div class="page-enter">
      <!-- Sentiment Overview -->
      <div class="grid-4" style="margin-bottom:var(--space-5)">
        <div class="card" style="padding:var(--space-4);text-align:center">
          <div class="card-title" style="margin-bottom:var(--space-2)">Overall Sentiment</div>
          <div style="font-size:var(--text-2xl);font-weight:var(--weight-extrabold);color:${sentimentColor(overall.score)}">
            ${overall.label}
          </div>
          <div class="mono" style="font-size:var(--text-sm);color:var(--text-tertiary);margin-top:var(--space-1)">
            Score: ${(overall.score * 100).toFixed(0)}%
          </div>
        </div>
        ${sentimentStatCard('Bullish', news.filter(n => n.sentiment > 0.2).length, '--color-buy')}
        ${sentimentStatCard('Neutral', news.filter(n => Math.abs(n.sentiment) <= 0.2).length, '--color-neutral')}
        ${sentimentStatCard('Bearish', news.filter(n => n.sentiment < -0.2).length, '--color-sell')}
      </div>

      <!-- Sentiment Bar -->
      <div class="card" style="margin-bottom:var(--space-5)">
        <div class="card-header">
          <div class="card-title">Sentiment Distribution</div>
        </div>
        <div style="display:flex;gap:2px;height:24px;border-radius:var(--radius-sm);overflow:hidden">
          ${renderSentimentBar(news)}
        </div>
        <div class="flex justify-between" style="margin-top:var(--space-2);font-size:var(--text-xs);color:var(--text-tertiary)">
          <span>🐻 Bearish</span>
          <span>🐂 Bullish</span>
        </div>
      </div>

      <!-- News Feed -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Live News Feed</div>
          <span class="badge badge-live"><span>LIVE</span></span>
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-3);max-height:600px;overflow-y:auto">
          ${news.length === 0 ? '<div style="text-align:center;color:var(--text-muted);padding:var(--space-8)">Loading news...</div>' :
            news.map(article => renderNewsItem(article)).join('')}
        </div>
      </div>
    </div>
  `;
}

function sentimentStatCard(label, count, colorVar) {
    return `
    <div class="card" style="padding:var(--space-4);text-align:center">
      <div class="card-title" style="margin-bottom:var(--space-2)">${label} Articles</div>
      <div class="mono" style="font-size:var(--text-2xl);font-weight:var(--weight-bold);color:var(${colorVar})">${count}</div>
    </div>
  `;
}

function sentimentColor(score) {
    if (score > 0.2) return 'var(--color-buy)';
    if (score < -0.2) return 'var(--color-sell)';
    return 'var(--color-hold)';
}

function renderSentimentBar(news) {
    if (!news || news.length === 0) return '<div style="flex:1;background:var(--bg-tertiary)"></div>';
    const sorted = [...news].sort((a, b) => a.sentiment - b.sentiment);
    return sorted.map(n => {
        const color = n.sentiment > 0.2 ? 'var(--color-buy)' : n.sentiment < -0.2 ? 'var(--color-sell)' : 'var(--color-neutral)';
        const opacity = Math.abs(n.sentiment) * 0.8 + 0.2;
        return `<div style="flex:1;background:${color};opacity:${opacity}" title="${n.title}"></div>`;
    }).join('');
}

function renderNewsItem(article) {
    const timeAgo = getTimeAgo(article.publishedAt);
    return `
    <div class="news-item">
      <div class="news-sentiment-bar ${article.sentimentClass}"></div>
      <div style="flex:1;min-width:0">
        <div class="flex items-center justify-between" style="margin-bottom:var(--space-1)">
          <a href="${article.url}" target="_blank" rel="noopener" style="font-weight:var(--weight-semibold);font-size:var(--text-sm);color:var(--text-primary);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;max-width:80%">
            ${article.title}
          </a>
          <span class="badge ${article.sentiment > 0.2 ? 'badge-buy' : article.sentiment < -0.2 ? 'badge-sell' : 'badge-neutral'}" style="flex-shrink:0">
            ${article.sentimentLabel}
          </span>
        </div>
        ${article.body ? `<p style="font-size:var(--text-xs);color:var(--text-tertiary);margin-bottom:var(--space-2);line-height:1.4;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${article.body}</p>` : ''}
        <div class="flex items-center gap-3">
          <span style="font-size:10px;color:var(--text-muted)">${article.source || 'News'}</span>
          <span style="font-size:10px;color:var(--text-muted)">•</span>
          <span style="font-size:10px;color:var(--text-muted)">${timeAgo}</span>
          <span style="font-size:10px;color:var(--text-muted)">•</span>
          <span style="font-size:10px;color:${sentimentColor(article.sentiment)};font-weight:600">
            Impact: ${Math.abs(article.sentiment * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  `;
}

function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
