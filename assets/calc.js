/* ============================================================
   Расчётус — калькулятор прибыли (/calculator/)
   Все формулы — на сервере (POST /api/v1/public/unit-calc).
   Здесь только сбор формы, автокомплит и отрисовка ответа.
   ============================================================ */
(function () {
  'use strict';

  /* API base: прод по умолчанию; ?api=… — для проверки на тест-стенде */
  var API = 'https://mp.raschetus.ru/api/v1';
  try {
    var qApi = new URLSearchParams(location.search).get('api');
    if (qApi) API = qApi.replace(/\/+$/, '');
  } catch (e) {}

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Тема (как на главной) ---------- */
  var themeBtn = $('themeToggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var root = document.documentElement;
      var light = root.classList.toggle('light');
      try { localStorage.setItem('rsh-theme', light ? 'light' : 'dark'); } catch (e) {}
    });
  }

  /* ---------- Форматирование ---------- */
  var fmtRub = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
  var fmtInt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
  function rub(v) { return fmtRub.format(v) + ' ₽'; }
  function pct(v) { return fmtRub.format(v) + '%'; }
  function num(el) {
    var v = parseFloat(String(el.value).replace(',', '.'));
    return isFinite(v) ? v : null;
  }

  /* ---------- Автокомплит типа товара ---------- */
  var typeInput = $('fType');
  var typeDrop = $('typeDrop');
  var typeField = typeInput.closest('.calc-field--type');
  var chosen = null; /* {main_category, category, product_type} */
  var acTimer = null;
  var acAbort = null;

  function closeDrop() { typeDrop.hidden = true; typeDrop.innerHTML = ''; }

  function renderDrop(items) {
    typeDrop.innerHTML = '';
    if (!items.length) {
      var d = document.createElement('div');
      d.className = 'calc-type-empty';
      d.textContent = 'Ничего не нашлось — попробуйте другое слово';
      typeDrop.appendChild(d);
    } else {
      items.forEach(function (it) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'calc-type-opt';
        b.innerHTML = '<span></span><small></small>';
        b.firstChild.textContent = it.product_type;
        b.lastChild.textContent = it.main_category + ' · ' + it.category;
        b.addEventListener('click', function () {
          chosen = it;
          typeInput.value = it.product_type;
          typeField.classList.add('ok');
          $('typeHint').textContent = it.main_category + ' · ' + it.category;
          closeDrop();
        });
        typeDrop.appendChild(b);
      });
    }
    typeDrop.hidden = false;
  }

  typeInput.addEventListener('input', function () {
    chosen = null;
    typeField.classList.remove('ok');
    $('typeHint').textContent = 'Выберите тип из подсказки — от него зависит комиссия Ozon';
    var q = typeInput.value.trim();
    clearTimeout(acTimer);
    if (q.length < 2) { closeDrop(); return; }
    acTimer = setTimeout(function () {
      if (acAbort) acAbort.abort();
      acAbort = new AbortController();
      fetch(API + '/public/unit-calc/types?q=' + encodeURIComponent(q), {
        signal: acAbort.signal,
        headers: { Accept: 'application/json' }
      })
        .then(function (r) { return r.ok ? r.json() : { data: [] }; })
        .then(function (j) { renderDrop(j.data || []); })
        .catch(function () { /* abort/сеть — молча */ });
    }, 250);
  });

  document.addEventListener('click', function (e) {
    if (!typeDrop.hidden && !typeDrop.contains(e.target) && e.target !== typeInput) closeDrop();
  });
  typeInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDrop();
  });

  /* ---------- Налоговые поля ---------- */
  var taxRegime = $('fTaxRegime');
  var taxRate = $('fTaxRate');
  var vatRate = $('fVatRate');
  var TAX_DEFAULTS = { usn_income: 6, usn_income_expense: 15, osno: 25 };
  taxRegime.addEventListener('change', function () {
    var r = taxRegime.value;
    var off = r === 'none';
    taxRate.disabled = off;
    vatRate.disabled = off;
    if (!off && TAX_DEFAULTS[r] != null) taxRate.value = TAX_DEFAULTS[r];
  });

  /* ---------- Сбор и отправка ---------- */
  var form = $('calcForm');
  var errBox = $('calcError');
  var btn = $('calcBtn');
  var resultEl = $('calcResult');

  function showError(msg) {
    errBox.textContent = msg;
    errBox.hidden = false;
  }

  function buildPayload() {
    var p = {
      price: num($('fPrice')),
      cost_price: num($('fCost')),
      product_type: (chosen ? chosen.product_type : typeInput.value).trim(),
      scheme: $('fScheme').value,
      buyout_pct: num($('fBuyout')),
      returns_pct: num($('fReturns')),
      drr_pct: num($('fDrr')),
      spp_pct: num($('fSpp')),
      turnover_days: num($('fTurnover')),
      insurance_enabled: $('fInsurance').checked,
      target_margin_pct: num($('fTargetMargin')),
      target_roi_annual_pct: num($('fTargetRoi'))
    };
    if (chosen) p.category = chosen.category;

    var vol = num($('fVol'));
    if (vol && vol > 0) {
      p.volume_l = vol;
    } else {
      p.length_cm = num($('fLen'));
      p.width_cm = num($('fWid'));
      p.height_cm = num($('fHei'));
    }

    if (taxRegime.value !== 'none') {
      p.tax_regime = taxRegime.value;
      p.tax_rate_pct = num(taxRate);
      p.vat_rate_pct = num(vatRate);
    }

    var batch = num($('fBatch'));
    var batchDays = num($('fBatchDays'));
    if (batch && batchDays) { p.batch_units = batch; p.target_turnover_days = batchDays; }
    var monthly = num($('fMonthly'));
    if (monthly && monthly > 0) p.target_monthly_profit = monthly;

    /* null-поля не шлём */
    Object.keys(p).forEach(function (k) { if (p[k] === null || p[k] === '') delete p[k]; });
    return p;
  }

  function validate(p) {
    if (!p.price || p.price < 1) return 'Укажите цену продажи.';
    if (p.cost_price == null) return 'Укажите себестоимость.';
    if (!p.product_type || p.product_type.length < 2) return 'Укажите тип товара и выберите его из подсказки.';
    var hasVol = p.volume_l && p.volume_l > 0;
    var hasDims = p.length_cm && p.width_cm && p.height_cm;
    if (!hasVol && !hasDims) return 'Укажите габариты упаковки (Д × Ш × В) или объём в литрах — от них зависит тариф логистики.';
    return null;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errBox.hidden = true;

    var payload = buildPayload();
    var v = validate(payload);
    if (v) { showError(v); return; }

    btn.disabled = true;
    btn.textContent = 'Считаем…';

    fetch(API + '/public/unit-calc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); })
      .then(function (res) {
        if (res.status === 200 && res.body && res.body.data) {
          render(res.body.data, payload);
          try { if (typeof ym === 'function') ym(112116470, 'reachGoal', 'calc_done'); } catch (e2) {}
          return;
        }
        var b = res.body || {};
        if (b.error === 'product_type_not_found') {
          showError('Тип товара не найден в справочнике Ozon — начните вводить название и выберите вариант из подсказки.');
        } else if (b.error === 'tariffs_not_resolved') {
          showError('Не удалось подобрать тариф логистики — проверьте габариты или объём товара.');
        } else if (b.errors) {
          var first = Object.keys(b.errors)[0];
          showError(b.errors[first][0]);
        } else if (res.status === 429) {
          showError('Слишком много расчётов подряд — подождите минуту и попробуйте снова.');
        } else {
          showError('Не удалось выполнить расчёт. Попробуйте ещё раз чуть позже.');
        }
      })
      .catch(function () {
        showError('Нет связи с сервером расчёта. Проверьте интернет и попробуйте снова.');
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = 'Рассчитать прибыль';
      });
  });

  /* ---------- Рендер результата ---------- */
  function kpiCard(label, value, cls, note) {
    return '<div class="calc-kpi"><div class="calc-kpi__label">' + label + '</div>' +
      '<div class="calc-kpi__value ' + (cls || '') + '">' + value + '</div>' +
      (note ? '<div class="calc-kpi__note">' + note + '</div>' : '') + '</div>';
  }

  function targetRow(label, value, isNa) {
    return '<div class="calc-target"><span class="calc-target__label">' + label + '</span>' +
      '<span class="calc-target__value' + (isNa ? ' na' : '') + '">' + value + '</span></div>';
  }

  function funnelCell(numHtml, cap, cls) {
    return '<div class="calc-funnel__cell"><div class="calc-funnel__num ' + (cls || '') + '">' + numHtml + '</div>' +
      '<div class="calc-funnel__cap">' + cap + '</div></div>';
  }

  function render(d, payload) {
    var pu = d.per_unit;
    var posNeg = function (v) { return v >= 0 ? 'pos' : 'neg'; };

    /* KPI */
    $('kpiGrid').innerHTML =
      kpiCard('Прибыль с единицы', rub(pu.profit), posNeg(pu.profit), 'после всех расходов' + (payload.tax_regime ? ' и налога' : '')) +
      kpiCard('Маржинальность', pct(pu.margin_pct), posNeg(pu.margin_pct), 'от цены продажи') +
      kpiCard('ROI на вложенное', pct(pu.roi_pct), posNeg(pu.roi_pct), 'прибыль ÷ себестоимость') +
      kpiCard('ROI годовых', pct(pu.roi_annual_pct), posNeg(pu.roi_annual_pct), 'при обороте ' + (d.targets && d.targets.price_for_roi_annual ? d.targets.price_for_roi_annual.turnover_days : payload.turnover_days || 30) + ' дн');

    /* Meta */
    var meta = [];
    meta.push('Комиссия Ozon: <b>' + pct(d.inputs.commission_pct) + '</b>');
    meta.push('Логистика: <b>' + rub(d.inputs.logistics_tariff) + '</b>');
    if (payload.spp_pct) meta.push('Цена для покупателя (с СПП): <b>' + rub(pu.price_buyer) + '</b>');
    $('calcMeta').innerHTML = meta.join('<span aria-hidden="true"> · </span>');

    /* Waterfall */
    var priceAbs = Math.abs((d.waterfall[0] && d.waterfall[0].value) || payload.price || 1);
    var wfHtml = d.waterfall.map(function (row) {
      var isPrice = row.key === 'price';
      var isProfit = row.key === 'profit';
      var w = Math.max(1.5, Math.min(100, Math.abs(row.value) / priceAbs * 100));
      var barCls = isPrice ? 'price' : (isProfit ? (row.value >= 0 ? 'profit-pos' : 'profit-neg') : 'exp');
      var valCls = isPrice ? '' : (row.value >= 0 ? 'pos' : 'neg');
      var valText = (row.value > 0 && !isPrice ? '+' : '') + rub(row.value);
      return '<div class="calc-wf__row' + (isProfit ? ' total' : '') + '">' +
        '<span class="calc-wf__label">' + row.label + '</span>' +
        '<span class="calc-wf__track"><span class="calc-wf__bar ' + barCls + '" style="width:' + w.toFixed(1) + '%"></span></span>' +
        '<span class="calc-wf__val ' + valCls + '">' + valText + '</span></div>';
    }).join('');
    $('waterfall').innerHTML = wfHtml;

    /* Targets */
    var t = d.targets || {};
    var NA = 'недостижимо до 500 000 ₽';
    var rows = [];
    rows.push(targetRow('Мин. цена безубыточности',
      t.breakeven_price != null ? rub(t.breakeven_price) : NA, t.breakeven_price == null));
    if (t.price_for_margin) {
      rows.push(targetRow('Цена для маржи ' + pct(t.price_for_margin.target_margin_pct),
        t.price_for_margin.price != null ? rub(t.price_for_margin.price) : NA, t.price_for_margin.price == null));
    }
    if (t.price_for_roi_annual) {
      rows.push(targetRow('Цена для ' + pct(t.price_for_roi_annual.target_roi_annual_pct) + ' годовых (оборот ' + t.price_for_roi_annual.turnover_days + ' дн)',
        t.price_for_roi_annual.price != null ? rub(t.price_for_roi_annual.price) : NA, t.price_for_roi_annual.price == null));
    }
    rows.push(targetRow('Макс. себестоимость при этой цене',
      t.max_cost_price != null ? rub(t.max_cost_price) : '—', t.max_cost_price == null));
    rows.push(targetRow('Макс. ДРР при этой цене',
      t.max_drr_pct != null ? pct(t.max_drr_pct) : '—', t.max_drr_pct == null));
    if (t.turnover && t.turnover.extra_day_cost_per_unit) {
      rows.push(targetRow('Цена лишнего дня оборота',
        rub(t.turnover.extra_day_cost_per_unit) + ' / ед·день', false));
    }
    if (t.turnover && t.turnover.pace_for_turnover) {
      var pf = t.turnover.pace_for_turnover;
      rows.push(targetRow('Темп для партии ' + fmtInt.format(pf.batch_units) + ' шт за ' + fmtInt.format(pf.target_turnover_days) + ' дн',
        fmtRub.format(pf.units_per_day) + ' шт/день', false));
    }
    if (t.pace_for_monthly_profit) {
      rows.push(targetRow('Темп для прибыли ' + rub(t.pace_for_monthly_profit.target_monthly_profit) + ' в месяц',
        fmtRub.format(t.pace_for_monthly_profit.units_per_day) + ' шт/день', false));
    }
    $('targetsGrid').innerHTML = rows.join('');

    /* Funnel per 100 orders */
    var f = d.per_100_orders;
    $('funnelGrid').innerHTML =
      funnelCell(fmtInt.format(f.orders), 'заказов') +
      funnelCell(fmtRub.format(f.buyouts), 'выкупят (' + pct(payload.buyout_pct || 90) + ')') +
      funnelCell(fmtRub.format(f.kept), 'останется после возвратов') +
      funnelCell(rub(f.profit), 'прибыль итого', posNeg(f.profit));

    /* Disclaimer */
    $('calcDisclaimer').textContent =
      'Расчёт ориентировочный, по официальным тарифам Ozon от ' + (d.tariffs_actual_at || '—') +
      ' (комиссия типа товара, логистика по литражу — базовые тарифы, доставка до места выдачи, обратная логистика, обработка невыкупа/возврата' +
      (payload.insurance_enabled === false ? '' : ', страхование запасов') +
      '). Фактические условия зависят от кластера отгрузки, акций и вашего договора с Ozon.';

    resultEl.hidden = false;
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
})();
