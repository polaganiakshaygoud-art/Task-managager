// ============================================================
//  App Router & Bootstrap
// ============================================================

const AppRouter = {
  currentView: null,

  initTheme() {
    const saved = localStorage.getItem('taskflow-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  },

  async init() {
    this.initTheme();
    // Check existing auth
    const token = API.getToken();
    if (token) {
      try {
        const user = await API.Auth.me();
        this.navigateTo('dashboard', user);
      } catch {
        API.Auth.logout();
        this.navigateTo('auth');
      }
    } else {
      this.navigateTo('auth');
    }
  },

  navigateTo(view, data = null) {
    this.currentView = view;
    document.getElementById('app').innerHTML = '';

    if (view === 'auth') {
      renderAuthPage();
    } else if (view === 'dashboard') {
      renderDashboard(data);
    }
  }
};

window.AppRouter = AppRouter;

// Boot when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  AppRouter.init();
});

// --- Theme Management ---
function initTheme() {
  const saved = localStorage.getItem('taskflow-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('taskflow-theme', next);
}

window.toggleTheme = toggleTheme;

// WebSocket indicator pulse
setInterval(() => {
  const ind = document.getElementById('ws-indicator');
  if (!ind) return;
  // Will be set by WS connection
}, 1000);
