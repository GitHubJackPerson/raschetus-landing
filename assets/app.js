/* Расчётус — landing interactions
   1) Theme toggle (persisted in localStorage, no flash).
   2) Scroll-driven "day progress": highlights passed hours and moves the marker.
   Matches the original prototype's logic: a moment counts as "passed"
   once its top crosses 55% of the viewport height. */
(function () {
  'use strict';

  var root = document.documentElement;

  /* ---------- Theme ---------- */
  var toggle = document.getElementById('themeToggle');
  function glyph() { return root.classList.contains('light') ? '◑' : '◐'; }
  if (toggle) {
    toggle.textContent = glyph();
    toggle.addEventListener('click', function () {
      root.classList.toggle('light');
      try { localStorage.setItem('rsh-theme', root.classList.contains('light') ? 'light' : 'dark'); } catch (e) {}
      toggle.textContent = glyph();
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', root.classList.contains('light') ? '#ffffff' : '#0e1110');
    });
  }

  /* ---------- Day progress ---------- */
  var moments = Array.prototype.slice.call(document.querySelectorAll('[data-moment]'));
  var labels  = document.querySelectorAll('#hourLabels span');
  var fill    = document.getElementById('progressFill');
  var dot     = document.getElementById('progressDot');
  var total   = moments.length || 1;
  var at = -1;
  var raf = 0;

  function tick() {
    raf = 0;
    var line = window.innerHeight * 0.55;
    var n = 0;
    for (var i = 0; i < moments.length; i++) {
      if (moments[i].getBoundingClientRect().top < line) {
        n = Math.max(n, +moments[i].getAttribute('data-moment') + 1);
      }
    }
    if (n === at) return;
    at = n;
    for (var j = 0; j < labels.length; j++) {
      labels[j].classList.toggle('on', j < at);
    }
    var pct = Math.round(at / total * 100) + '%';
    if (fill) fill.style.width = pct;
    if (dot)  dot.style.left = pct;
  }

  function onScroll() { if (!raf) raf = requestAnimationFrame(tick); }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  tick();
})();
