/**
 * Theme Manager - dark/light mode with persistence
 */
const theme = {
  STORAGE_KEY: 'rosterghp-theme',

  init() {
    this.apply(this.get());
    this.bindToggle();
  },

  get() {
    return localStorage.getItem(this.STORAGE_KEY) || 'dark';
  },

  set(mode) {
    localStorage.setItem(this.STORAGE_KEY, mode);
    this.apply(mode);
  },

  apply(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.textContent = mode === 'dark' ? '☀️' : '🌙';
      btn.title = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }
  },

  toggle() {
    const next = this.get() === 'dark' ? 'light' : 'dark';
    this.set(next);
  },

  bindToggle() {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', () => this.toggle());
    }
  },
};
