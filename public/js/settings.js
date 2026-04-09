// ── Settings module ───────────────────────────────────────────────────────────
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    loadSettingsForm();

    document.getElementById('settingsForm').addEventListener('submit', async e => {
      e.preventDefault();
      const data = {};
      new FormData(e.target).forEach((v, k) => data[k] = v.trim());

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        App.settings = data;
        const ind = document.getElementById('settingsSaved');
        ind.style.display = 'inline';
        setTimeout(() => ind.style.display = 'none', 2500);
        showToast('Settings saved.', 'success');
      } else {
        showToast('Failed to save settings.', 'error');
      }
    });
  });

  function loadSettingsForm() {
    const form = document.getElementById('settingsForm');
    // Wait for App.settings to be loaded
    const tryFill = () => {
      if (Object.keys(App.settings).length === 0) { setTimeout(tryFill, 100); return; }
      form.querySelectorAll('input[name]').forEach(input => {
        if (App.settings[input.name] !== undefined) input.value = App.settings[input.name];
      });
    };
    tryFill();
  }
})();
