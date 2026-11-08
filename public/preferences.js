// Shared visual preferences, applied before either page paints.
(() => {
  const read = (key, fallback) => {
    try { return localStorage.getItem('iqraw.' + key) ?? fallback; } catch { return fallback; }
  };
  const fontSize = Number(read('fontSize', '14'));
  document.documentElement.style.setProperty('--editor-size', (fontSize >= 12 && fontSize <= 22 ? fontSize : 14) + 'px');
  document.documentElement.dataset.pattern = read('pattern', 'subtle') === 'off' ? 'off' : 'subtle';
  document.documentElement.dataset.grid = read('grid', 'on') === 'off' ? 'off' : 'on';
})();
