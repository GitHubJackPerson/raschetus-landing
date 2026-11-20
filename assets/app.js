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

  /* ---------- Chat animation ---------- */
  /* html.anim is set in <head> only when prefers-reduced-motion is off.
     For each dialog scrolling into view we stage a chat exchange:
     the question is typed out, Расчётус "thinks" (dots), then types the
     answer title, and the body prints in. Runs once per dialog. */
  if (root.classList.contains('anim')) {
    var dialogs = document.querySelectorAll('.dialog');

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            io.unobserve(entries[i].target);
            stage(entries[i].target);
          }
        }
      }, { rootMargin: '0px 0px -14% 0px', threshold: 0.2 });
      for (var d = 0; d < dialogs.length; d++) io.observe(dialogs[d]);

      // Safety net: stage any dialog already in view on load, so the first
      // exchange animates even if the IO initial callback is delayed.
      window.addEventListener('load', function () {
        for (var i = 0; i < dialogs.length; i++) {
          var r = dialogs[i].getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) stage(dialogs[i]);
        }
      });
    } else {
      revealAll(); // No IO support — show everything without staging.
    }
  }

  function revealAll() {
    var i, els;
    els = document.querySelectorAll('.dialog .msg');
    for (i = 0; i < els.length; i++) els[i].classList.add('in');
    els = document.querySelectorAll('.msg--service .answer-desc, .msg--service .panel');
    for (i = 0; i < els.length; i++) els[i].classList.add('show');
  }

  /* Type an element's own text out character by character. */
  function typewrite(el, speed, done) {
    if (!el) { if (done) done(); return; }
    var full = el.getAttribute('data-tw');
    if (full === null) { full = el.textContent; el.setAttribute('data-tw', full); }
    el.textContent = '';
    el.classList.add('tw');
    var i = 0;
    (function step() {
      el.textContent = full.slice(0, i);
      if (i++ < full.length) {
        setTimeout(step, speed);
      } else {
        el.classList.remove('tw');
        if (done) done();
      }
    })();
  }

  function stage(dialog) {
    if (dialog.__staged) return;
    dialog.__staged = true;
    var seller  = dialog.querySelector('.msg--seller');
    var service = dialog.querySelector('.msg--service');
    var q       = dialog.querySelector('.question');
    var title   = dialog.querySelector('.answer-title');
    var desc    = dialog.querySelector('.answer-desc');
    var panel   = dialog.querySelector('.panel');

    if (seller) seller.classList.add('in');

    // 1) type the seller question
    typewrite(q, 24, function () {
      if (!service) return;

      // 2) Расчётус "thinks" — typing dots
      var typing = document.createElement('div');
      typing.className = 'typing';
      typing.setAttribute('aria-hidden', 'true');
      typing.innerHTML = '<div class="typing__bubble"><span></span><span></span><span></span></div>';
      service.parentNode.insertBefore(typing, service);
      setTimeout(function () { typing.classList.add('in'); }, 120);

      // 3) remove dots, print the answer
      setTimeout(function () {
        if (typing.parentNode) typing.parentNode.removeChild(typing);
        service.classList.add('in');
        typewrite(title, 20, function () {
          if (desc)  desc.classList.add('show');
          if (panel) panel.classList.add('show');
        });
      }, 1200);
    });
  }
})();
