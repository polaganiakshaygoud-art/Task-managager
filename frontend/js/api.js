// ============================================================
//  API & WebSocket client
// ============================================================

const BASE_URL = 'http://localhost:3000/api';
let wsConnection = null;
let wsHandlers = {};

// --- Token helpers ---
function getToken() { return localStorage.getItem('tm_token'); }
function setToken(t) { localStorage.setItem('tm_token', t); }
function removeToken() { localStorage.removeItem('tm_token'); }

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

// --- Core fetch wrapper ---
async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: authHeaders(),
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// --- Auth API ---
const Auth = {
  async register(username, email, password) {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
    setToken(data.token);
    return data.user;
  },

  async login(email, password) {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setToken(data.token);
    return data.user;
  },

  async me() {
    const data = await apiFetch('/auth/me');
    return data.user;
  },

  logout() {
    removeToken();
    disconnectWS();
  },
  async updateSettings(payload) {
    const data = await apiFetch('/auth/settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    return data.user;
  },
  async forgotPassword(email) {
    return apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },
  async resetPassword(email, code, newPassword) {
    return apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword })
    });
  },
  async googleLogin(idToken) {
    const data = await apiFetch('/auth/google-login', {
      method: 'POST',
      body: JSON.stringify({ idToken })
    });
    setToken(data.token);
    return data.user;
  }
};

// --- Config API ---
const Config = {
  async get() {
    return apiFetch('/config');
  }
};

// --- Tasks API ---
const Tasks = {
  async list(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const data = await apiFetch(`/tasks${params ? '?' + params : ''}`);
    return data.tasks;
  },

  async stats() {
    const data = await apiFetch('/tasks/stats');
    return data.stats;
  },

  async get(id) {
    const data = await apiFetch(`/tasks/${id}`);
    return data.task;
  },

  async create(payload) {
    const data = await apiFetch('/tasks', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data.task;
  },

  async update(id, payload) {
    const data = await apiFetch(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    return data.task;
  },

  async updateStatus(id, status) {
    const data = await apiFetch(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    return data.task;
  },

  async delete(id) {
    return apiFetch(`/tasks/${id}`, { method: 'DELETE' });
  }
};

// --- WebSocket ---
function connectWS(handlers = {}) {
  const token = getToken();
  if (!token) return;

  wsHandlers = handlers;
  const wsUrl = `ws://localhost:3000?token=${encodeURIComponent(token)}`;
  wsConnection = new WebSocket(wsUrl);

  wsConnection.onopen = () => {
    console.log('✅ WebSocket connected');
  };

  wsConnection.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (wsHandlers[msg.event]) wsHandlers[msg.event](msg.data);
    } catch {}
  };

  wsConnection.onclose = (e) => {
    console.log('WebSocket closed', e.code);
    // Auto-reconnect after 3s unless intentional close
    if (e.code !== 4001 && getToken()) {
      setTimeout(() => connectWS(wsHandlers), 3000);
    }
  };

  wsConnection.onerror = (err) => console.error('WS Error:', err);
}

function disconnectWS() {
  if (wsConnection) {
    wsConnection.onclose = null; // prevent reconnect
    wsConnection.close();
    wsConnection = null;
  }
}

window.API = { Auth, Tasks, Config, getToken, connectWS, disconnectWS };
