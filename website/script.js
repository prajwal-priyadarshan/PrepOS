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

// Header picks up a soft shadow once the page is actually scrolled, not
// sitting at the top with nothing to separate itself from.
(() => {
  var header = document.getElementById('site-header');
  if (!header) return;

  var ticking = false;
  function sync() {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
    ticking = false;
  }
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(sync);
    },
    { passive: true },
  );
  sync();
})();

// Scroll reveal: each [data-reveal] element fades and rises into place the
// first time it crosses into view, then is left alone - a page that keeps
// re-animating on every scroll back and forth reads as gimmicky, not fluid.
// Siblings under the same parent (a row of feature cards, a group of hero
// lines) are staggered automatically by their order, so nothing in the
// markup has to hand-author individual delays.
(() => {
  var targets = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  if (targets.length === 0) return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach((el) => {
      el.classList.add('is-visible');
    });
    return;
  }

  var seen = new Map(); // parent element -> how many of its children have been staggered so far
  targets.forEach((el) => {
    var parent = el.parentElement;
    var index = seen.get(parent) || 0;
    seen.set(parent, index + 1);
    el.style.setProperty('--d', `${Math.min(index * 70, 280)}ms`);
  });

  var observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
  );
  targets.forEach((el) => {
    observer.observe(el);
  });
})();
