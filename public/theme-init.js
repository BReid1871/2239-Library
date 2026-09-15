// Applies a stored theme preference before first paint, so a returning user
// who picked light/dark doesn't see a flash of the other theme. Loaded via a
// synchronous <script> tag in <head>, ahead of shared.css. When no
// preference is stored, this does nothing and the site keeps following the
// OS theme live via the prefers-color-scheme media query in shared.css.
(function () {
  try {
    var stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
    }
  } catch { /* localStorage unavailable (e.g. private browsing) */ }
})();
