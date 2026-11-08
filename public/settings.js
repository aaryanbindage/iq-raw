(() => {
  const status = document.getElementById('settingsStatus');
  const fields = { pattern: 'subtle', fontSize: '14', grid: 'on', lang: 'python', slot: '1', name: 'iq-raw' };
  for (const [key, fallback] of Object.entries(fields)) {
    const control = document.getElementById(key);
    try { control.value = localStorage.getItem('iqraw.' + key) ?? fallback; } catch { control.value = fallback; }
    if (control.tagName === 'SELECT' && !control.value) control.value = fallback;
    control.addEventListener('input', () => {
      try {
        localStorage.setItem('iqraw.' + key, control.value);
        status.textContent = 'Settings saved.';
      } catch { status.textContent = 'Browser storage is unavailable. Changes will last until you leave this page.'; }
      if (key === 'fontSize') document.documentElement.style.setProperty('--editor-size', control.value + 'px');
      if (key === 'pattern' || key === 'grid') document.documentElement.dataset[key] = control.value;
    });
  }
  const theme = document.getElementById('theme');
  const updatePreviews = () => {
    for (const button of document.querySelectorAll('[data-preview]')) {
      button.setAttribute('aria-pressed', String(button.dataset.preview === theme.value));
    }
  };
  for (const button of document.querySelectorAll('[data-preview]')) {
    button.addEventListener('click', () => {
      theme.value = button.dataset.preview;
      theme.dispatchEvent(new Event('change'));
    });
  }
  theme.addEventListener('change', updatePreviews);
  // theme.js initializes the selector at DOMContentLoaded.
  document.addEventListener('DOMContentLoaded', updatePreviews);
})();
