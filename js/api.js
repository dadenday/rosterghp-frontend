/**
 * API Client for RosterGHP Frontend
 *
 * Auto-discovers API endpoint via /api/config endpoint.
 * Fallback order:
 *   1. Hardcoded API_BASE_URL (for initial load)
 *   2. Discovered URL from /api/config
 *   3. localStorage cached URL
 *
 * Manual override: Set localStorage.setItem('apiBaseUrl', 'https://your-tunnel-url')
 * Clear cache: localStorage.removeItem('apiBaseUrl') or localStorage.removeItem('apiBaseUrlCache')
 */

// Cache version - increment to force all users to refresh cached URL
const API_CACHE_VERSION = 'v9';

// Initial hardcoded URL (updated by deploy script or manually)
const HARDCODED_API_URL = 'https://s2lcrgtjg3ox.shares.zrok.io';
const LOCAL_DEV_API_URL = 'http://127.0.0.1:8501';
const IS_LOCAL_FRONTEND = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
const IS_ZROK_HOST = window.location.hostname.endsWith('.shares.zrok.io');

// Try to get cached URL from localStorage first (with version check)
const CACHED_API_URL = (() => {
  const cached = localStorage.getItem('apiBaseUrl');
  const cacheVersion = localStorage.getItem('apiBaseUrlCache');
  if (cached && cacheVersion === API_CACHE_VERSION) {
    return cached;
  }
  // Cache miss or version mismatch - clear old cache
  localStorage.removeItem('apiBaseUrl');
  localStorage.removeItem('apiBaseUrlCache');
  return null;
})();

// Initial base URL (will be updated after config fetch)
let API_BASE_URL = CACHED_API_URL || (IS_LOCAL_FRONTEND ? LOCAL_DEV_API_URL : (IS_ZROK_HOST ? window.location.origin : HARDCODED_API_URL));

const api = {
  baseUrl: API_BASE_URL,

  /**
   * Initialize API client by fetching config from backend.
   * Updates baseUrl if tunnel_url is provided in config.
   * Call this once at app startup.
   */
  async init() {
    try {
      // Try to fetch config from current baseUrl
      const configUrl = `${this.baseUrl}/api/config`;
      const response = await fetch(configUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Config fetch failed: ${response.status}`);
      }

      const config = await response.json();

      if (config.tunnel_url && config.tunnel_url !== this.baseUrl) {
        console.log('[API] Discovered new tunnel URL:', config.tunnel_url);
        this.baseUrl = config.tunnel_url;
        localStorage.setItem('apiBaseUrl', config.tunnel_url);
        localStorage.setItem('apiBaseUrlCache', API_CACHE_VERSION);
        return { updated: true, url: config.tunnel_url };
      }

      return { updated: false, url: this.baseUrl };
    } catch (error) {
      console.warn('[API] Config fetch failed, using cached/hardcoded URL:', error.message);

      const fallbackUrl = this.baseUrl === LOCAL_DEV_API_URL ? HARDCODED_API_URL : LOCAL_DEV_API_URL;
      if (fallbackUrl && fallbackUrl !== this.baseUrl) {
        try {
          const response = await fetch(`${fallbackUrl}/api/config`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          if (response.ok) {
            this.baseUrl = fallbackUrl;
            localStorage.setItem('apiBaseUrl', fallbackUrl);
            localStorage.setItem('apiBaseUrlCache', API_CACHE_VERSION);
            return { updated: true, url: fallbackUrl, fallback: true };
          }
        } catch {
          // Keep the original failure path below.
        }
      }

      return { updated: false, url: this.baseUrl, error: error.message };
    }
  },

  /**
   * Manually set API base URL (for user override).
   * @param {string} url - New API base URL
   */
  setBaseUrl(url) {
    this.baseUrl = url;
    localStorage.setItem('apiBaseUrl', url);
    console.log('[API] Base URL set to:', url);
  },

  /**
   * Clear cached API URL (reset to hardcoded default).
   */
  clearCache() {
    localStorage.removeItem('apiBaseUrl');
    localStorage.removeItem('apiBaseUrlCache');
    this.baseUrl = HARDCODED_API_URL;
    console.log('[API] Cache cleared, using hardcoded URL:', HARDCODED_API_URL);
  },

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const token = localStorage.getItem('token');
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const isUrlEncoded = typeof URLSearchParams !== 'undefined' && options.body instanceof URLSearchParams;
    const isBlob = typeof Blob !== 'undefined' && options.body instanceof Blob;

    const defaults = {
      headers: {
        ...(options.body && !isFormData && !isUrlEncoded && !isBlob ? { 'Content-Type': 'application/json' } : {}),
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

  async ingest(file) {
    const formData = new FormData();
    formData.append('file', file, file.name || 'upload.xlsx');
    return this.request('/api/ingest', { method: 'POST', body: formData });
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

  // Inference confirmation
  confirmInferenceLink(rawRecordId, userId, reason = 'confirmed from admin raw-records view') {
    return this.post('/api/inference-links/confirm', {
      raw_record_id: rawRecordId,
      user_id: userId,
      reason,
    });
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
