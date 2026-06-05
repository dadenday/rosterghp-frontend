/**
 * Admin Manager - Raw Records Viewer
 */
const admin = {
  currentTab: 'SHIFT',

  async init() {
    this.bindEvents();
    await this.loadMonths();
  },

  bindEvents() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTab = btn.dataset.tab;
        this.loadRecords();
      });
    });

    // Filters
    document.getElementById('month-select').addEventListener('change', () => this.loadDays());
    document.getElementById('day-select').addEventListener('change', () => this.loadRecords());
    document.getElementById('refresh-btn').addEventListener('click', () => this.loadRecords());

    const tableBody = document.getElementById('table-body');
    if (tableBody) {
      tableBody.addEventListener('click', (event) => {
        const button = event.target.closest('[data-confirm-link]');
        if (!button) return;
        this.confirmLink(button.dataset.rawRecordId, button.dataset.userId, button);
      });
    }

    const ingestForm = document.getElementById('ingest-form');
    const ingestFile = document.getElementById('ingest-file');
    const ingestFileName = document.getElementById('ingest-file-name');

    if (ingestFile && ingestFileName) {
      ingestFile.addEventListener('change', () => {
        const file = ingestFile.files && ingestFile.files[0];
        ingestFileName.textContent = file ? file.name : 'Choose a workbook to upload.';
      });
    }

    if (ingestForm) {
      ingestForm.addEventListener('submit', (event) => {
        event.preventDefault();
        this.ingestWorkbook();
      });
    }
  },

  formatIngestSummary(result) {
    return {
      success: !!result?.success,
      filename: result?.filename || '',
      work_date: result?.work_date || '',
      edition_id: result?.edition_id ?? null,
      edition: result?.edition || null,
      record_count: result?.record_count ?? 0,
      persisted: result?.persisted || {},
      diagnostics_summary: result?.diagnostics_summary || {},
    };
  },

  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  renderValue(value) {
    if (value === null || value === undefined || value === '') return '—';
    if (Array.isArray(value)) {
      return value.length ? value.map((item) => this.escapeHtml(item)).join(', ') : '—';
    }
    if (typeof value === 'object') {
      return this.escapeHtml(JSON.stringify(value));
    }
    return this.escapeHtml(value);
  },

  renderStat(label, value) {
    return `
      <div class="ingest-stat">
        <span class="ingest-stat-label">${this.escapeHtml(label)}</span>
        <div class="ingest-stat-value">${this.renderValue(value)}</div>
      </div>
    `;
  },

  renderKeyValue(label, value) {
    return `
      <div class="ingest-kv">
        <span class="ingest-kv-label">${this.escapeHtml(label)}</span>
        <div class="ingest-kv-value">${this.renderValue(value)}</div>
      </div>
    `;
  },

  renderDecisionCard(decision, index) {
    const title = decision.sheet_name || decision.name || `Sheet ${index + 1}`;
    const details = [
      ['Candidate type', decision.candidate_type],
      ['Subtype', decision.flight_subtype],
      ['Accepted', decision.accepted],
      ['Reason', decision.reason],
      ['Date', decision.date || decision.work_date || decision.date_info?.date],
      ['Source file', decision.source_file],
      ['Sheet name', decision.sheet_name],
    ];

    return `
      <article class="ingest-decision">
        <div class="ingest-decision-title">${this.escapeHtml(title)}</div>
        <div class="ingest-kv-grid">
          ${details.map(([label, value]) => this.renderKeyValue(label, value)).join('')}
        </div>
      </article>
    `;
  },

  renderIngestSummaryHtml(summary) {
    const diagnostics = summary.diagnostics_summary || {};
    const extraction = diagnostics.extraction || {};
    const sheetDecisions = Array.isArray(diagnostics.sheet_decisions) ? diagnostics.sheet_decisions : [];
    const rejectedRows = Array.isArray(extraction.rejected_rows_preview) ? extraction.rejected_rows_preview : [];
    const suspiciousNames = Array.isArray(extraction.suspicious_names) ? extraction.suspicious_names : [];
    const rejectedRowsCount = extraction.rejected_rows_count ?? rejectedRows.length;
    const l1Rows = [
      ['Classification', diagnostics.classification],
      ['Reason', diagnostics.reason],
      ['Work date', diagnostics.date_info?.date || summary.work_date],
      ['Primary shift sheet', diagnostics.primary_shift_sheet],
      ['Primary flight sheet', diagnostics.primary_flight_sheet],
      ['Edition', summary.edition || summary.edition_id],
      ['Persisted', summary.persisted],
    ];

    return `
      <div class="ingest-summary">
        <div class="ingest-overview">
          ${this.renderStat('Result', summary.success ? 'Success' : 'Needs attention')}
          ${this.renderStat('Filename', summary.filename)}
          ${this.renderStat('Work date', summary.work_date)}
          ${this.renderStat('Record count', summary.record_count)}
          ${this.renderStat('Edition', summary.edition || summary.edition_id)}
        </div>

        <details class="ingest-details" open>
          <summary>L1 classification</summary>
          <div class="ingest-details-body">
            <div class="ingest-kv-grid">
              ${l1Rows.map(([label, value]) => this.renderKeyValue(label, value)).join('')}
            </div>
          </div>
        </details>

        <details class="ingest-details">
          <summary>Sheet decisions (${sheetDecisions.length})</summary>
          <div class="ingest-details-body">
            <div class="ingest-decision-list">
              ${sheetDecisions.length ? sheetDecisions.map((decision, index) => this.renderDecisionCard(decision, index)).join('') : '<div class="empty">No sheet decisions returned.</div>'}
            </div>
          </div>
        </details>

        <details class="ingest-details">
          <summary>L2 extraction</summary>
          <div class="ingest-details-body">
            <div class="ingest-kv-grid">
              ${this.renderKeyValue('Shift layout', extraction.shift_layout)}
              ${this.renderKeyValue('Flight column map', extraction.flight_column_map)}
              ${this.renderKeyValue('Stats', extraction.stats)}
              ${this.renderKeyValue('Rejected rows', rejectedRowsCount)}
            </div>

            <div class="ingest-subsection">
              <h4>Rejected rows preview</h4>
              ${rejectedRows.length ? rejectedRows.map((row) => `
                <div class="ingest-kv">
                  <span class="ingest-kv-label">${this.escapeHtml(row.reason || 'rejected row')}</span>
                  <div class="ingest-kv-value">${this.renderValue({
                    sheet: row.sheet_name,
                    row: row.row_number,
                    name: row.raw_name,
                    source_row: row.source_row,
                    source_columns: row.source_columns,
                  })}</div>
                </div>
              `).join('') : '<div class="empty">No rejected rows.</div>'}
            </div>

            <div class="ingest-subsection">
              <h4>Suspicious names</h4>
              <div class="ingest-chip-list">
                ${suspiciousNames.length ? suspiciousNames.map((name) => `<span class="ingest-chip">${this.escapeHtml(name)}</span>`).join('') : '<span class="ingest-chip">None</span>'}
              </div>
            </div>
          </div>
        </details>

        <details class="ingest-details">
          <summary>Raw diagnostics JSON</summary>
          <div class="ingest-details-body">
            <pre class="ingest-raw">${this.escapeHtml(JSON.stringify(summary, null, 2))}</pre>
          </div>
        </details>
      </div>
    `;
  },

  async ingestWorkbook() {
    const ingestFile = document.getElementById('ingest-file');
    const statusEl = document.getElementById('ingest-status');
    const resultEl = document.getElementById('ingest-result');
    const submitBtn = document.getElementById('ingest-submit');

    const file = ingestFile && ingestFile.files ? ingestFile.files[0] : null;
    if (!file) {
      if (statusEl) {
        statusEl.textContent = 'Please choose an .xlsx workbook first.';
        statusEl.className = 'status-msg status-error';
      }
      return;
    }

    if (statusEl) {
      statusEl.textContent = `Uploading ${file.name}...`;
      statusEl.className = 'status-msg';
    }
    if (resultEl) {
      resultEl.classList.add('hidden');
      resultEl.textContent = '';
    }
    if (submitBtn) submitBtn.disabled = true;

    try {
      const result = await api.ingest(file);
      const summary = this.formatIngestSummary(result);

      if (statusEl) {
        statusEl.textContent = result.success
          ? `Ingested ${summary.record_count} record(s) from ${summary.filename}.`
          : `Ingestion completed with issues for ${summary.filename || file.name}.`;
        statusEl.className = result.success ? 'status-msg status-ok' : 'status-msg status-error';
      }

      if (resultEl) {
        resultEl.innerHTML = this.renderIngestSummaryHtml(summary);
        resultEl.classList.remove('hidden');
      }

      await this.loadMonths();
      if (summary.work_date) {
        const monthSelect = document.getElementById('month-select');
        const daySelect = document.getElementById('day-select');
        const monthValue = String(summary.work_date).slice(0, 7);

        if (monthSelect && Array.from(monthSelect.options).some(opt => opt.value === monthValue)) {
          monthSelect.value = monthValue;
          await this.loadDays();

          if (daySelect && Array.from(daySelect.options).some(opt => opt.value === summary.work_date)) {
            daySelect.value = summary.work_date;
            await this.loadRecords();
          }
        }
      }
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = `Upload failed: ${err.message}`;
        statusEl.className = 'status-msg status-error';
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  },

  async loadMonths() {
    try {
      const data = await api.get('/api/admin/months');
      const select = document.getElementById('month-select');

      if (!data.months || data.months.length === 0) {
        select.innerHTML = '<option value="">-- No Data --</option>';
        return;
      }

      select.innerHTML = data.months
        .map(m => `<option value="${this.escapeHtml(m.value)}">${this.escapeHtml(m.label)}</option>`)
        .join('');
      this.loadDays();
    } catch (err) {
      console.error('[Admin] Failed to load months:', err);
      document.getElementById('month-select').innerHTML = '<option value="">-- Error Loading --</option>';
    }
  },

  async loadDays() {
    const month = document.getElementById('month-select').value;
    if (!month) return;

    try {
      const data = await api.get(`/api/admin/days?month=${encodeURIComponent(month)}`);
      const select = document.getElementById('day-select');
      select.innerHTML = '<option value="">-- Select Day --</option>' +
        data.days
          .map(d => `<option value="${this.escapeHtml(d)}">${this.escapeHtml(d)}</option>`)
          .join('');
    } catch (err) {
      console.error('[Admin] Failed to load days:', err);
    }
  },

  async confirmLink(rawRecordId, userId, button = null) {
    const statusEl = document.getElementById('roster-status');
    if (!rawRecordId || !userId) {
      if (statusEl) statusEl.textContent = 'Cannot confirm: missing raw record or user id.';
      return;
    }

    if (button) button.disabled = true;
    if (statusEl) statusEl.textContent = 'Confirming inference link...';

    try {
      const result = await api.confirmInferenceLink(
        Number(rawRecordId),
        Number(userId),
        'confirmed from admin raw-records view'
      );
      if (statusEl) {
        statusEl.textContent = `Confirmed raw record ${result.raw_record_id}; materialized ${result.materialized_count} row(s).`;
      }
      await this.loadRecords();
    } catch (err) {
      if (statusEl) statusEl.textContent = 'Confirm failed: ' + err.message;
      if (button) button.disabled = false;
    }
  },

  async loadRecords() {
    const date = document.getElementById('day-select').value;
    const statusEl = document.getElementById('roster-status');
    const tableBody = document.getElementById('table-body');
    const tableHeader = document.getElementById('table-header');

    if (!date) {
      statusEl.textContent = 'Please select a month and day to view raw records.';
      tableBody.innerHTML = '';
      tableHeader.innerHTML = '';
      return;
    }

    statusEl.textContent = 'Loading records...';
    tableBody.innerHTML = '';

    try {
      const data = await api.get(`/api/admin/raw-records?date=${encodeURIComponent(date)}&type=${encodeURIComponent(this.currentTab)}`);
      const records = data.records;

      if (!records || records.length === 0) {
        statusEl.textContent = `No ${this.currentTab} records found for ${date}.`;
        tableHeader.innerHTML = '';
        return;
      }

      statusEl.textContent = '';
      this.renderTable(records);
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
      console.error('[Admin] Failed to load records:', err);
    }
  },

  renderConfirmCell(record) {
    const link = record.inference_link || record.link || record;
    const status = link.status || record.link_status || '';
    const userId = link.user_id || record.user_id || record.linked_user_id;
    const rawRecordId = record.record_id || record.raw_record_id;
    const advisoryStatuses = ['AUTO_LINKED', 'CANDIDATE', 'SUGGESTED'];

    if (status === 'CONFIRMED') {
      return `<td><span class="link-status confirmed">CONFIRMED</span></td>`;
    }

    if (!advisoryStatuses.includes(status) || !userId || !rawRecordId) {
      return `<td>${this.escapeHtml(status || '—')}</td>`;
    }

    return `
      <td>
        <button
          type="button"
          class="confirm-link-btn"
          data-confirm-link="true"
          data-raw-record-id="${this.escapeHtml(rawRecordId)}"
          data-user-id="${this.escapeHtml(userId)}"
          title="Confirm this advisory link"
        >Confirm</button>
        <span class="link-status">${this.escapeHtml(status)}</span>
      </td>
    `;
  },

  renderTable(records) {
    const tableHeader = document.getElementById('table-header');
    const tableBody = document.getElementById('table-body');

    // Define columns based on tab
    let cols = [];
    if (this.currentTab === 'SHIFT') {
      cols = [
        { label: 'Name', key: 'raw_name' },
        { label: 'Time', fn: r => r.metadata.shift_time || '--' },
        { label: 'Code', fn: r => r.metadata.shift_code || '--' },
        { label: 'Zone', key: 'zone' },
        { label: 'Source', key: 'source_file' }
      ];
    } else {
      cols = [
        { label: 'Name', key: 'raw_name' },
        { label: 'Flight', fn: r => r.metadata.callsign || '--' },
        { label: 'Route', fn: r => r.metadata.route || '--' },
        { label: 'Bay', fn: r => r.metadata.bay || '--' },
        { label: 'Time', fn: r => `${r.metadata.time_open || ''}-${r.metadata.time_close || ''}` },
        { label: 'Zone', key: 'zone' },
        { label: 'Source', key: 'source_file' }
      ];
    }

    tableHeader.innerHTML = cols.map(c => `<th>${c.label}</th>`).join('') + '<th>Metadata</th><th>Link</th>';

    tableBody.innerHTML = records.map(r => {
      const cells = cols.map(c => {
        const val = c.fn ? c.fn(r) : r[c.key];
        return `<td>${this.escapeHtml(val || '')}</td>`;
      }).join('');

      const meta = JSON.stringify(r.metadata || {});
      return `<tr>${cells}<td class="metadata-cell" title="${this.escapeHtml(meta)}">${this.escapeHtml(meta)}</td>${this.renderConfirmCell(r)}</tr>`;
    }).join('');
  }
};
