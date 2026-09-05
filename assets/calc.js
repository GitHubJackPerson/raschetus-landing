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

  /* ---------- Попап «Как пользоваться» ---------- */
  var helpEl = $('calcHelp');
  var helpBtn = $('calcHelpBtn');
  if (helpEl && helpBtn) {
    helpBtn.addEventListener('click', function () { helpEl.hidden = false; });
    helpEl.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close')) helpEl.hidden = true;
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !helpEl.hidden) helpEl.hidden = true;
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
    $('typeHint').textContent = '';
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
  function kpiCard(label, value, cls, note, tip) {
    return '<div class="calc-kpi" data-tip="' + tip + '"><div class="calc-kpi__label">' + label + '</div>' +
      '<div class="calc-kpi__value ' + (cls || '') + '">' + value + '</div>' +
      (note ? '<div class="calc-kpi__note">' + note + '</div>' : '') + '</div>';
  }

  function targetCard(cap, value, isNa, status, statusCls, tip) {
    return '<div class="calc-target" data-tip="' + tip + '">' +
      '<span class="calc-target__cap">' + cap + '</span>' +
      '<span class="calc-target__value' + (isNa ? ' na' : '') + '">' + value + '</span>' +
      (status ? '<span class="calc-target__status ' + (statusCls || '') + '">' + status + '</span>' : '') +
      '</div>';
  }

  function render(d, payload) {
    var pu = d.per_unit;
    var posNeg = function (v) { return v >= 0 ? 'pos' : 'neg'; };
    var turnoverDays = (d.targets && d.targets.price_for_roi_annual ? d.targets.price_for_roi_annual.turnover_days : payload.turnover_days) || 30;

    /* KPI */
    $('kpiGrid').innerHTML =
      kpiCard('Прибыль с единицы', rub(pu.profit), posNeg(pu.profit),
        'после всех расходов' + (payload.tax_regime ? ' и налога' : ''),
        'Цена минус все расходы: себестоимость, комиссия и логистика Ozon, невыкупы и возвраты, реклама, хранение, страхование' + (payload.tax_regime ? ', налог' : '')) +
      kpiCard('Маржинальность', pct(pu.margin_pct), posNeg(pu.margin_pct), 'от цены продажи',
        'Прибыль ÷ цена продажи × 100%. Какая доля цены остаётся вам') +
      kpiCard('ROI на вложенное', pct(pu.roi_pct), posNeg(pu.roi_pct), 'прибыль ÷ себестоимость',
        'Сколько приносит каждый вложенный в закупку рубль за один оборот') +
      kpiCard('ROI годовых', pct(pu.roi_annual_pct), posNeg(pu.roi_annual_pct), 'при обороте ' + turnoverDays + ' дн',
        'ROI × (365 ÷ оборот в днях) — доходность вложенных денег в пересчёте на год');

    /* Meta — только цена покупателя при СПП */
    if (payload.spp_pct) {
      $('calcMeta').innerHTML = 'Цена для покупателя (с СПП): <b>' + rub(pu.price_buyer) + '</b>';
      $('calcMeta').hidden = false;
    } else {
      $('calcMeta').hidden = true;
    }

    /* Waterfall: цена → расходы по убыванию суммы → прибыль */
    var priceRow = null, profitRow = null, expenses = [];
    d.waterfall.forEach(function (row) {
      if (row.key === 'price') priceRow = row;
      else if (row.key === 'profit') profitRow = row;
      else expenses.push(row);
    });
    expenses.sort(function (a, b) { return Math.abs(b.value) - Math.abs(a.value); });
    var ordered = [priceRow].concat(expenses, [profitRow]).filter(Boolean);

    /* pct и batch_value приходят с сервера — фронт только рендерит */
    var hasBatch = ordered.some(function (r) { return r.batch_value != null; });
    var batchUnits = num($('fBatch'));

    var wfHtml = '<div class="calc-wf__row head"><span></span><span></span>' +
      '<span>на штуку</span><span class="calc-wf__pct">%</span>' +
      (hasBatch ? '<span class="calc-wf__batch">партия ' + (batchUnits ? fmtInt.format(batchUnits) + ' шт' : '') + '</span>' : '') +
      '</div>';
    wfHtml += ordered.map(function (row) {
      var isPrice = row.key === 'price';
      var isProfit = row.key === 'profit';
      var w = Math.max(1.5, Math.min(100, row.pct != null ? row.pct : 0));
      var barCls = isPrice ? 'price' : (isProfit ? (row.value >= 0 ? 'profit-pos' : 'profit-neg') : 'exp');
      var valCls = isPrice ? '' : (row.value >= 0 ? 'pos' : 'neg');
      var valText = (row.value > 0 && !isPrice ? '+' : '') + rub(row.value);
      var pctText = row.pct != null ? fmtRub.format(row.pct) + '%' : '';
      var batchText = row.batch_value != null ? rub(row.batch_value) : '';
      return '<div class="calc-wf__row' + (isProfit ? ' total' : '') + '">' +
        '<span class="calc-wf__label">' + row.label + '</span>' +
        '<span class="calc-wf__track"><span class="calc-wf__bar ' + barCls + '" style="width:' + w.toFixed(1) + '%"></span></span>' +
        '<span class="calc-wf__val ' + valCls + '">' + valText + '</span>' +
        '<span class="calc-wf__pct">' + pctText + '</span>' +
        (hasBatch ? '<span class="calc-wf__batch">' + batchText + '</span>' : '') +
        '</div>';
    }).join('');
    var wfEl = $('waterfall');
    wfEl.classList.toggle('calc-wf--batch', hasBatch);
    wfEl.innerHTML = wfHtml;

    /* Контрольные точки */
    var t = d.targets || {};
    var NA = 'недостижимо до 500 000 ₽';
    var cards = [];

    var price = payload.price;
    var cost = payload.cost_price;
    var drr = payload.drr_pct || 0;

    if (t.breakeven_price != null) {
      var beOk = price >= t.breakeven_price;
      cards.push(targetCard('Точка безубыточности', rub(t.breakeven_price), false,
        beOk ? 'ваша цена ' + rub(price) + ' — выше ✓' : 'ваша цена ' + rub(price) + ' — ниже, вы в минусе',
        beOk ? 'ok' : 'bad',
        'Минимальная цена продажи, при которой прибыль на единицу равна нулю'));
    } else {
      cards.push(targetCard('Точка безубыточности', '—', true, NA, 'bad',
        'Минимальная цена продажи, при которой прибыль на единицу равна нулю'));
    }

    if (t.price_for_margin) {
      var pm = t.price_for_margin;
      var pmOk = pm.price != null && price >= pm.price;
      cards.push(targetCard('Цена для маржи ' + pct(pm.target_margin_pct),
        pm.price != null ? rub(pm.price) : '—', pm.price == null,
        pm.price == null ? NA : (pmOk ? 'уже достигнуто ✓' : 'сейчас ' + rub(price)),
        pm.price == null ? 'bad' : (pmOk ? 'ok' : ''),
        'Цена продажи, при которой маржинальность достигнет ' + pct(pm.target_margin_pct)));
    }

    if (t.turnover_for_roi_annual) {
      var tr2 = t.turnover_for_roi_annual;
      var trTip = 'За сколько дней должна продаваться единица при этой цене, чтобы вложенные деньги приносили ' + pct(tr2.target_roi_annual_pct) + ' годовых';
      if (tr2.max_days != null && tr2.max_days >= 1) {
        var trOk = tr2.current_days <= tr2.max_days;
        cards.push(targetCard('Оборот для ' + pct(tr2.target_roi_annual_pct) + ' годовых',
          'до ' + fmtInt.format(tr2.max_days) + ' дн', false,
          trOk ? 'у вас ' + tr2.current_days + ' дн ✓' : 'у вас ' + tr2.current_days + ' дн — медленнее',
          trOk ? 'ok' : 'bad', trTip));
      } else {
        cards.push(targetCard('Оборот для ' + pct(tr2.target_roi_annual_pct) + ' годовых', '—', true,
          'при этой цене прибыль ≤ 0', 'bad', trTip));
      }
    }

    if (t.max_cost_price != null) {
      var mcOk = cost <= t.max_cost_price;
      cards.push(targetCard('Макс. себестоимость', rub(t.max_cost_price), false,
        mcOk ? 'запас ' + rub(Math.max(0, t.max_cost_price - cost)) + ' ✓'
             : 'у вас ' + rub(cost) + ' — дороже',
        mcOk ? 'ok' : 'bad',
        'Максимальная закупочная цена, при которой вы не уходите в минус при этой цене продажи'));
    }

    if (t.max_drr_pct != null) {
      var mdOk = drr <= t.max_drr_pct;
      cards.push(targetCard('Макс. ДРР', pct(t.max_drr_pct), false,
        mdOk ? 'у вас ' + pct(drr) + ' ✓' : 'у вас ' + pct(drr) + ' — реклама съедает прибыль',
        mdOk ? 'ok' : 'bad',
        'Максимальная доля рекламных расходов от выручки, при которой прибыль ещё не уходит в минус'));
    }

    if (t.turnover && t.turnover.extra_day_cost_per_unit) {
      cards.push(targetCard('Лишний день оборота', rub(t.turnover.extra_day_cost_per_unit), false,
        'за единицу в день', '',
        'Во сколько обходится каждый лишний день на складе: хранение, страхование и замороженные в товаре деньги'));
    }

    if (t.turnover && t.turnover.pace_for_turnover) {
      var pf = t.turnover.pace_for_turnover;
      cards.push(targetCard('Темп для партии', fmtRub.format(pf.units_per_day) + ' шт/день', false,
        fmtInt.format(pf.batch_units) + ' шт за ' + fmtInt.format(pf.target_turnover_days) + ' дн', '',
        'Сколько штук в день нужно продавать, чтобы партия обернулась за целевой срок'));
    }

    if (t.pace_for_monthly_profit) {
      var pm2 = t.pace_for_monthly_profit;
      cards.push(targetCard('Темп для цели в месяц', fmtRub.format(pm2.units_per_day) + ' шт/день', false,
        'цель ' + rub(pm2.target_monthly_profit) + '/мес', '',
        'Темп продаж для целевой прибыли в месяц при текущей прибыли с единицы'));
    }

    $('targetsGrid').innerHTML = cards.join('');

    resultEl.hidden = false;
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
})();
