/* Black Friday bar above the header on every landing page; hides itself after the promo ends. */
(function () {
  'use strict';
  // Promo window is fixed by the billing campaign (payments 16-30.11 MSK).
  var END = new Date('2026-11-30T23:59:59+03:00').getTime();
  var KEY = 'bf2026_bar_closed';
  if (Date.now() > END) return;
  try { if (window.sessionStorage.getItem(KEY) === '1') return; } catch (e) { /* storage may be blocked */ }

  var HREF = 'https://mp.raschetus.ru/register?utm_source=site&utm_medium=banner&utm_campaign=bf2026';

  var css = ''
    + '.bf-bar{position:relative;z-index:41;background:var(--lime);color:var(--on-lime);font-size:14px;line-height:1.35}'
    + '.bf-bar__in{max-width:var(--maxw);margin:0 auto;padding:9px 48px 9px 20px;display:flex;align-items:center;justify-content:center;gap:6px 14px;flex-wrap:wrap;text-align:center}'
    + '.bf-bar b{font-weight:700}'
    + '.bf-bar__cta{display:inline-flex;align-items:center;padding:4px 12px;border-radius:999px;background:var(--on-lime);color:var(--lime);font-weight:600;white-space:nowrap}'
    + '.bf-bar__cta:hover{color:#fff}'
    + '.bf-bar__x{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:32px;height:32px;border:0;border-radius:6px;background:transparent;color:inherit;font-size:20px;line-height:1;cursor:pointer;opacity:.7}'
    + '.bf-bar__x:hover{opacity:1;background:rgba(0,0,0,.08)}'
    + '.bf-bar__long{display:inline}.bf-bar__short{display:none}'
    + '@media (max-width:640px){.bf-bar{font-size:13px}.bf-bar__in{padding:7px 40px 7px 12px;gap:4px 10px}.bf-bar__cta{padding:3px 10px}.bf-bar__long{display:none}.bf-bar__short{display:inline}}';

  function mount() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var bar = document.createElement('div');
    bar.className = 'bf-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Акция Чёрная пятница');
    bar.innerHTML = '<div class="bf-bar__in">'
      + '<span class="bf-bar__long"><b>Чёрная пятница до 30 ноября:</b> при оплате года — второй год в подарок.</span>'
      + '<span class="bf-bar__short"><b>Чёрная пятница до 30.11:</b> второй год в подарок</span>'
      + '<a class="bf-bar__cta" data-cta="bf_bar" href="' + HREF + '">Попробовать →</a>'
      + '</div>'
      + '<button class="bf-bar__x" type="button" aria-label="Закрыть">×</button>';
    bar.querySelector('.bf-bar__x').addEventListener('click', function () {
      bar.remove();
      try { window.sessionStorage.setItem(KEY, '1'); } catch (e) { /* closing still works without storage */ }
    });
    document.body.insertBefore(bar, document.body.firstChild);
  }

  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
