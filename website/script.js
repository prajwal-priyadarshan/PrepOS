// Mirrors the app's own theme toggle, scaled down: three states would be
// overkill for a marketing page, so this is just light/dark, following the
// system by default until the visitor picks one by hand.
(() => {
  var STORAGE_KEY = 'prepos-site-theme';
  var root = document.documentElement;
  var toggle = document.getElementById('theme-toggle');

  function systemPrefersDark() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function currentlyDark() {
    var explicit = root.getAttribute('data-theme');
    if (explicit === 'dark') return true;
    if (explicit === 'light') return false;
    return systemPrefersDark();
  }

  toggle.addEventListener('click', () => {
    var next = currentlyDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (_e) {
      // Private browsing, storage disabled - the toggle still works for
      // this visit, it just won't be remembered next time.
    }
  });
})();
