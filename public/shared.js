// Shared helpers used by index.html, notes.html, and arrays.html. Depends on
// reference-data.js being loaded first. Each export is attached to `window`
// (rather than declared with `var`/`function`) because this file is consumed
// only by other pages' inline scripts — a top-level declaration never
// referenced within this file would otherwise trip eslint's no-unused-vars.

window.PURPOSES = ReferenceData.PURPOSES;
window.RUNES = ReferenceData.RUNES;
window.IGNORES = ReferenceData.IGNORES;
window.TIER_COLORS = ReferenceData.TIER_COLORS;
window.COMPONENTS = ReferenceData.COMPONENTS; // built-in reference components
window.getTier = ReferenceData.getTier;

window.api = async function(method, url, body) {
  var opts = { method: method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  var res = await fetch(url, opts);
  var data = null;
  if (res.status !== 204) {
    try { data = await res.json(); } catch { data = null; }
  }
  if (!res.ok) {
    var err = new Error((data && data.error) || ('Request failed: ' + res.status));
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
};

window.debounce = function(fn, ms) {
  var t;
  return function() {
    var args = arguments, ctx = this;
    clearTimeout(t);
    t = setTimeout(function() { fn.apply(ctx, args); }, ms);
  };
};

window.esc = function(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
};

window.getRune = function(name) {
  for (var i = 0; i < window.RUNES.length; i++) { if (window.RUNES[i].name === name) return window.RUNES[i]; }
  return null;
};

// Theme: 'light'/'dark' once the user picks one explicitly (persisted and
// applied via a data-theme attribute, see shared.css); otherwise follows the
// OS setting live, matching prior behavior.
window.getEffectiveTheme = function() {
  var stored = null;
  try { stored = localStorage.getItem('theme'); } catch { /* unavailable */ }
  if (stored === 'light' || stored === 'dark') return stored;
  return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
};

window.setTheme = function(theme) {
  try { localStorage.setItem('theme', theme); } catch { /* unavailable */ }
  document.documentElement.setAttribute('data-theme', theme);
};

// Renders the top nav bar shared by all three pages. `localKeys` lists which
// items are in-page tabs on the current page (handled by `onTabClick`); every
// other item is a plain link to the page that owns it.
window.renderNav = function(containerId, activeKey, localKeys, onTabClick) {
  var items = [
    { key: 'add',    label: 'Add Ritual', href: 'index.html' },
    { key: 'notes',  label: 'Notes',      href: 'notes.html' },
    { key: 'comps',  label: 'Components', href: 'index.html#comps' },
    { key: 'arrays', label: 'Arrays',     href: 'arrays.html' }
  ];
  var el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';
  items.forEach(function(item) {
    var isLocal = localKeys.indexOf(item.key) >= 0;
    var node = document.createElement(isLocal ? 'div' : 'a');
    node.id = 'tab-' + item.key;
    node.className = 'tab' + (activeKey === item.key ? ' active' : '');
    node.textContent = item.label;
    if (isLocal) node.onclick = function() { onTabClick(item.key); };
    else node.href = item.href;
    el.appendChild(node);
  });

  var toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'theme-toggle';
  var updateToggle = function() {
    var isDark = window.getEffectiveTheme() === 'dark';
    toggle.textContent = isDark ? '☀' : '🌙';
    toggle.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    toggle.setAttribute('aria-label', toggle.title);
  };
  toggle.onclick = function() {
    window.setTheme(window.getEffectiveTheme() === 'dark' ? 'light' : 'dark');
    updateToggle();
  };
  updateToggle();
  el.appendChild(toggle);
};
