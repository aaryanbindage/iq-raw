// Apply the saved theme before the page paints, including the Blockly canvas.
(() => {
  const choices = ['system', 'light', 'dark', 'midnight', 'contrast'];
  const system = matchMedia('(prefers-color-scheme: dark)');
  let preference = 'system';
  try {
    const saved = localStorage.getItem('iqraw.theme');
    if (choices.includes(saved)) preference = saved;
  } catch { /* storage blocked */ }

  const apply = () => {
    document.documentElement.dataset.theme = preference === 'system'
      ? (system.matches ? 'dark' : 'light') : preference;
  };
  apply();
  system.addEventListener('change', apply);

  document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('theme');
    select.value = preference;
    select.addEventListener('change', () => {
      preference = choices.includes(select.value) ? select.value : 'system';
      apply();
      try { localStorage.setItem('iqraw.theme', preference); } catch { /* storage blocked */ }
    });
  });
})();
