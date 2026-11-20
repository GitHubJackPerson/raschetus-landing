/* Shared on every landing page: ad tags for signup attribution and Metrika goals on CTA clicks. */
(function () {
  'use strict';
  var COUNTER = 112116470;

  /* utm_* of the visit go into the st_utm cookie on .raschetus.ru, where the cabinet
     (mp.raschetus.ru) reads them at registration. Same JSON format as Nuxt useCookie. */
  try {
    var params = new URLSearchParams(window.location.search);
    var tags = {};
    ['source', 'medium', 'campaign', 'content', 'term'].forEach(function (f) {
      var v = (params.get('utm_' + f) || '').trim();
      if (v) tags[f] = v.slice(0, 100);
    });
    if (tags.source || tags.campaign) {
      var host = window.location.hostname;
      var domain = /(^|\.)raschetus\.ru$/.test(host) ? '; domain=.raschetus.ru' : '';
      document.cookie = 'st_utm=' + encodeURIComponent(JSON.stringify(tags))
        + '; max-age=' + (60 * 24 * 60 * 60) + '; path=/; samesite=lax' + domain
        + (window.location.protocol === 'https:' ? '; secure' : '');
    }
  } catch (e) { /* tags are optional: never break the page */ }

  /* The cabinet has no Metrika counter, so the signup intent is counted here, at the click. */
  document.addEventListener('click', function (ev) {
    var el = ev.target && ev.target.closest ? ev.target.closest('[data-cta]') : null;
    if (!el || typeof window.ym !== 'function') return;
    var cta = el.getAttribute('data-cta');
    var page = window.location.pathname;
    try {
      window.ym(COUNTER, 'reachGoal', 'cta_click', { cta: cta, page: page });
      if (cta === 'connect') window.ym(COUNTER, 'reachGoal', 'signup_click', { page: page });
    } catch (e) { /* analytics must not block navigation */ }
  }, true);
})();
