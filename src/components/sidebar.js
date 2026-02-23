// ============================================================
// TraderPro — Sidebar Component
// ============================================================

export function createSidebar(activePage, onNavigate) {
  const nav = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'signals', icon: '🎯', label: 'Trading Signals' },
    { id: 'portfolio', icon: '💼', label: 'Portfolio' },
    { id: 'news', icon: '📰', label: 'News Terminal' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <div class="sidebar-logo">📈</div>
      <div class="sidebar-brand-text">
        <div class="sidebar-brand-name">TraderPro</div>
        <div class="sidebar-brand-sub">Trading Intelligence</div>
      </div>
      <button class="menu-close" id="sidebar-close" style="display:none;margin-left:auto;background:none;border:none;color:var(--text-tertiary);font-size:1.5rem;cursor:pointer">×</button>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-section-label">Main</div>
      ${nav.map(item => `
        <div class="nav-item ${activePage === item.id ? 'active' : ''}" data-page="${item.id}" id="nav-${item.id}">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </div>
      `).join('')}
      <div class="nav-section-label" style="margin-top: auto;">System</div>
      <div class="nav-item" id="nav-bot-toggle">
        <span class="nav-icon">🤖</span>
        <span>Auto-Trade</span>
        <div class="toggle ${window.__traderProBotActive ? 'active' : ''}" id="bot-toggle" style="margin-left:auto"></div>
      </div>
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-status">
        <div class="status-dot connected" id="ws-status-dot"></div>
        <span id="ws-status-text">Connecting...</span>
      </div>
    </div>
  `;

  // Navigation event listeners
  sidebar.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      if (onNavigate) onNavigate(page);

      // Auto-close sidebar on mobile
      if (window.innerWidth <= 1024) {
        sidebar.classList.remove('active');
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) overlay.classList.remove('active');
      }
    });
  });

  // Close button for mobile
  const closeBtn = sidebar.querySelector('#sidebar-close');
  if (closeBtn) {
    if (window.innerWidth <= 1024) closeBtn.style.display = 'block';
    closeBtn.addEventListener('click', () => {
      sidebar.classList.remove('active');
      const overlay = document.querySelector('.sidebar-overlay');
      if (overlay) overlay.classList.remove('active');
    });
  }

  // Bot toggle
  const botToggle = sidebar.querySelector('#bot-toggle');
  const botToggleNav = sidebar.querySelector('#nav-bot-toggle');
  if (botToggleNav) {
    botToggleNav.addEventListener('click', (e) => {
      window.__traderProBotActive = !window.__traderProBotActive;
      botToggle.classList.toggle('active', window.__traderProBotActive);
    });
  }

  return sidebar;
}

/**
 * Update WebSocket connection status in sidebar
 */
export function updateConnectionStatus(status) {
  const dot = document.getElementById('ws-status-dot');
  const text = document.getElementById('ws-status-text');
  if (dot && text) {
    dot.className = `status-dot ${status}`;
    text.textContent = status === 'connected' ? 'Live Data' : status === 'connecting' ? 'Connecting...' : 'Disconnected';
  }
}
