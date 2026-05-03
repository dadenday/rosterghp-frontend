/**
 * Main App Controller - initializes everything on dashboard
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Guard: redirect to login if not authenticated
  if (!auth.guard()) return;

  // Initialize API client (auto-discovers tunnel URL)
  try {
    const initResult = await api.init();
    if (initResult.updated) {
      console.log('[App] API URL updated:', initResult.url);
    }
  } catch (err) {
    console.warn('[App] API init failed, continuing with cached URL:', err);
  }

  // Init modules
  theme.init();
  auth.updateNav();
  roster.init();
  settings.init();

  // Bind logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => auth.logout());
  }

  // Show backend status
  api.get('/api/status')
    .then((status) => {
      const el = document.getElementById('backend-status');
      if (el) {
        el.textContent = `✅ Backend v${status.version}`;
        el.className = 'status-ok';
      }
    })
    .catch((err) => {
      const el = document.getElementById('backend-status');
      if (el) {
        el.textContent = `❌ Backend unreachable`;
        el.className = 'status-error';
      }
      console.error('Backend status check failed:', err);
    });
});
