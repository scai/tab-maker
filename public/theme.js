// Apply the theme before the page paints, including when offline.
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
let savedTheme;
try {
  savedTheme = localStorage.getItem('tab-maker-theme');
} catch (error) {
  // Theme switching remains available when browser storage is disabled.
}
if (savedTheme !== 'light' && savedTheme !== 'dark') savedTheme = null;

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#242824' : '#f5f4f1';
  const button = document.getElementById('toggle-theme');
  if (button) {
    button.setAttribute('aria-pressed', String(theme === 'dark'));
    button.textContent = theme === 'dark' ? '浅色模式' : '深色模式';
  }
}

applyTheme(savedTheme || (systemTheme.matches ? 'dark' : 'light'));
systemTheme.addEventListener('change', (event) => {
  if (!savedTheme) applyTheme(event.matches ? 'dark' : 'light');
});
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(document.documentElement.dataset.theme);
  document.getElementById('toggle-theme').addEventListener('click', () => {
    savedTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(savedTheme);
    try {
      localStorage.setItem('tab-maker-theme', savedTheme);
    } catch (error) {
      // Keep the selected theme for this session.
    }
  });
});
