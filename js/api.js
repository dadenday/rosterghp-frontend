/**
 * API Client for RosterGHP Frontend
 *
 * Configure API_BASE_URL to point at your backend tunnel.
 * Examples:
 *   - Local dev:  'http://127.0.0.1:8501'
 *   - Cloudflare: 'https://abc123.trycloudflare.com'
 *   - playit.gg:  'https://yourname.playit.gg:1234'
 */
const API_BASE_URL = 'https://demonstrated-opens-difficulties-arranged.trycloudflare.com';

const api = {
  baseUrl: API_BASE_URL,

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const token = localStorage.getItem('token');

    const defaults = {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    };

    const response = await fetch(url, { ...defaults, ...options, headers: { ...defaults.headers, ...options.headers } });

    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'index.html';
      return;
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    if (response.status === 204) return null;

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  },

  get(path) {
    return this.request(path, { method: 'GET' });
  },

  post(path, body) {
    return this.request(path, { method: 'POST', body: JSON.stringify(body) });
  },

  // Auth
  login(username, password) {
    return this.post('/api/auth/login', { username, password });
  },

  me() {
    return this.get('/api/auth/me');
  },

  // Roster
  months() {
    return this.get('/api/roster/months');
  },

  roster(month, userId = null) {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (userId) params.append('user_id', userId);
    return this.get(`/api/roster?${params.toString()}`);
  },

  // Users
  users() {
    return this.get('/api/users');
  },

  // Settings
  settings() {
    return this.get('/api/settings');
  },

  // Exports (returns Blob via fetch directly)
  async downloadExport(type, month, userId = null) {
    const params = new URLSearchParams();
    params.append('month', month);
    if (userId) params.append('user_id', userId);
    const url = `${this.baseUrl}/api/export/${type}?${params.toString()}`;
    const token = localStorage.getItem('token');

    const response = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });

    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = 'index.html';
      return;
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `roster_${month}.${type === 'ical' ? 'ics' : 'csv'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  },
};
