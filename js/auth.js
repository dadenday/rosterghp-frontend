/**
 * Auth Manager - login, logout, session persistence
 */
const auth = {
  init() {
    this.bindLoginForm();
    this.updateNav();
  },

  bindLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      const errorEl = document.getElementById('login-error');
      const btn = form.querySelector('button[type="submit"]');

      errorEl.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Signing in...';

      try {
        const data = await api.login(username, password);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = 'dashboard.html';
      } catch (err) {
        errorEl.textContent = err.message || 'Login failed';
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    });
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  },

  isLoggedIn() {
    return !!localStorage.getItem('token');
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  },

  updateNav() {
    const user = this.getUser();
    const navUser = document.getElementById('nav-user');
    if (navUser && user) {
      navUser.textContent = user.full_name || user.canonical_name;
    }
  },

  guard() {
    if (!this.isLoggedIn()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  },
};
