/**
 * Settings Panel - aliases, aircraft, user info
 */
const settings = {
  data: null,

  async init() {
    await this.load();
    this.bindEvents();
  },

  async load() {
    const panel = document.getElementById('settings-panel');
    if (!panel) return;

    try {
      this.data = await api.settings();
      this.render();
    } catch (err) {
      panel.innerHTML = `<div class="error">Failed to load settings: ${err.message}</div>`;
    }
  },

  render() {
    const panel = document.getElementById('settings-panel');
    if (!panel || !this.data) return;

    const aliases = this.data.aliases || {};
    const aliasList = Object.entries(aliases)
      .map(([key, val]) => `<div class="alias-item"><code>${key}</code> → <span>${val}</span></div>`)
      .join('') || '<div class="empty">No aliases configured</div>';

    const aircraft = this.data.aircraft || [];
    const aircraftList = aircraft.length > 0
      ? aircraft.map((a) => `<span class="tag">${a}</span>`).join(' ')
      : '<div class="empty">No aircraft configured</div>';

    panel.innerHTML = `
      <div class="settings-section">
        <h3>👤 User Info</h3>
        <div class="setting-row">
          <label>Full Name</label>
          <span>${this.data.full_name || '-'}</span>
        </div>
        <div class="setting-row">
          <label>Flight Sync</label>
          <span>${this.data.enable_flight_sync ? 'Enabled' : 'Disabled'}</span>
        </div>
        <div class="setting-row">
          <label>Page Size</label>
          <span>${this.data.page_size || 50}</span>
        </div>
      </div>

      <div class="settings-section">
        <h3>✈️ Aircraft</h3>
        <div class="tag-list">${aircraftList}</div>
      </div>

      <div class="settings-section">
        <h3>🔗 Aliases</h3>
        <div class="alias-list">${aliasList}</div>
      </div>
    `;
  },

  bindEvents() {
    const toggleBtn = document.getElementById('settings-toggle');
    const panel = document.getElementById('settings-panel');
    if (toggleBtn && panel) {
      toggleBtn.addEventListener('click', () => {
        const isHidden = panel.classList.toggle('hidden');
        toggleBtn.textContent = isHidden ? '⚙️ Settings' : '❌ Close';
      });
    }
  },
};
