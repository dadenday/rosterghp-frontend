/**
 * Roster Renderer - month grid, filters, exports
 */
const roster = {
  currentMonth: '',
  currentUserId: null,
  entries: [],
  weekFilter: 'all', // all, 1, 2, 3, 4, 5

  async init() {
    await this.loadMonths();
    await this.loadUsers();
    this.bindEvents();
    await this.loadRoster();
  },

  async loadMonths() {
    const select = document.getElementById('month-select');
    if (!select) return;

    try {
      const data = await api.months();
      select.innerHTML = '';
      data.months.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m.value;
        opt.textContent = m.label;
        select.appendChild(opt);
      });

      const savedMonth = localStorage.getItem('rosterghp-month');
      if (savedMonth && data.months.find((m) => m.value === savedMonth)) {
        select.value = savedMonth;
      } else if (data.months.length > 0) {
        select.value = data.months[0].value;
      }

      this.currentMonth = select.value;
    } catch (err) {
      console.error('Failed to load months:', err);
    }
  },

  async loadUsers() {
    const select = document.getElementById('user-select');
    if (!select) return;

    try {
      const data = await api.users();
      const currentUser = auth.getUser();
      select.innerHTML = '<option value="">-- Me --</option>';

      data.users.forEach((u) => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.full_name;
        select.appendChild(opt);
      });

      const savedUser = localStorage.getItem('rosterghp-userid');
      if (savedUser) {
        select.value = savedUser;
        this.currentUserId = savedUser ? parseInt(savedUser) : null;
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  },

  async loadRoster() {
    const grid = document.getElementById('roster-grid');
    const status = document.getElementById('roster-status');
    if (!grid) return;

    grid.innerHTML = '<div class="loading">Loading roster...</div>';
    if (status) status.textContent = '';

    try {
      const data = await api.roster(this.currentMonth, this.currentUserId);
      this.entries = data.entries || [];
      this.render();
      if (status) {
        status.textContent = `${data.count} entries for ${data.month}`;
      }
    } catch (err) {
      grid.innerHTML = `<div class="error">Error: ${err.message}</div>`;
    }
  },

  render() {
    const grid = document.getElementById('roster-grid');
    if (!grid) return;

    let entries = this.entries;

    // Week filter
    if (this.weekFilter !== 'all') {
      entries = entries.filter((e) => {
        const day = parseInt(e.date?.split('-')[2], 10);
        if (isNaN(day)) return false;
        const weekNum = Math.ceil(day / 7);
        return weekNum === parseInt(this.weekFilter);
      });
    }

    if (entries.length === 0) {
      grid.innerHTML = '<div class="empty">No roster entries found.</div>';
      return;
    }

    grid.innerHTML = '';

    // Group by week for visual separation
    const weeks = {};
    entries.forEach((e) => {
      const day = parseInt(e.date?.split('-')[2], 10) || 0;
      const week = Math.ceil(day / 7);
      if (!weeks[week]) weeks[week] = [];
      weeks[week].push(e);
    });

    Object.keys(weeks)
      .sort((a, b) => a - b)
      .forEach((week) => {
        const weekGroup = document.createElement('div');
        weekGroup.className = 'week-group';

        const weekHeader = document.createElement('div');
        weekHeader.className = 'week-header';
        weekHeader.textContent = `Week ${week}`;
        weekGroup.appendChild(weekHeader);

        const weekGrid = document.createElement('div');
        weekGrid.className = 'week-grid';

        weeks[week].forEach((entry) => {
          const card = this.createCard(entry);
          weekGrid.appendChild(card);
        });

        weekGroup.appendChild(weekGrid);
        grid.appendChild(weekGroup);
      });
  },

  createCard(entry) {
    const card = document.createElement('div');
    card.className = 'roster-card';

    if (entry.is_off) card.classList.add('off');
    if (entry.is_edu) card.classList.add('edu');
    if (entry.flight_count > 0) card.classList.add('flight');

    const dateStr = entry.date_formatted || entry.date;
    const shiftDisplay = entry.shift_display || entry.shift_raw || '-';

    let flightsHtml = '';
    if (entry.flights && entry.flights.length > 0) {
      flightsHtml = `
        <div class="flights">
          ${entry.flights
            .map(
              (f) => `
            <span class="flight-badge">
              ${f.flight_number || ''} ${f.departure || ''}→${f.arrival || ''}
            </span>
          `
            )
            .join('')}
        </div>
      `;
    }

    card.innerHTML = `
      <div class="card-header">
        <span class="card-date">${dateStr}</span>
        <span class="card-zone">${entry.zone || ''}</span>
      </div>
      <div class="card-shift">${shiftDisplay}</div>
      ${flightsHtml}
    `;

    return card;
  },

  bindEvents() {
    const monthSelect = document.getElementById('month-select');
    if (monthSelect) {
      monthSelect.addEventListener('change', (e) => {
        this.currentMonth = e.target.value;
        localStorage.setItem('rosterghp-month', this.currentMonth);
        this.loadRoster();
      });
    }

    const userSelect = document.getElementById('user-select');
    if (userSelect) {
      userSelect.addEventListener('change', (e) => {
        this.currentUserId = e.target.value ? parseInt(e.target.value) : null;
        localStorage.setItem('rosterghp-userid', e.target.value);
        this.loadRoster();
      });
    }

    const weekSelect = document.getElementById('week-select');
    if (weekSelect) {
      weekSelect.addEventListener('change', (e) => {
        this.weekFilter = e.target.value;
        this.render();
      });
    }

    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadRoster());
    }

    const icalBtn = document.getElementById('export-ical');
    if (icalBtn) {
      icalBtn.addEventListener('click', () => this.download('ical'));
    }

    const csvBtn = document.getElementById('export-csv');
    if (csvBtn) {
      csvBtn.addEventListener('click', () => this.download('csv'));
    }
  },

  async download(type) {
    if (!this.currentMonth) {
      alert('Please select a month first');
      return;
    }
    try {
      await api.downloadExport(type, this.currentMonth, this.currentUserId);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  },
};
