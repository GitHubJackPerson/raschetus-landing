/* ============================================================
   Расчётус — брендовый видеоплеер (vanilla, без зависимостей).
   Авто-инициализация всех <div class="rp" data-src [data-poster] [data-title]>.
   play/pause · прогресс (drag + hover-time) · громкость · скорость · fullscreen
   Клавиши (когда плеер в фокусе/hover): Space K — play, ← → — ±5с,
   ↑ ↓ — громкость, M — mute, F — fullscreen.
   ============================================================ */
(function () {
  "use strict";

  var SVG = {
    play:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    volHi: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4zm12.5 3a4.5 4.5 0 00-2.5-4.03v8.06A4.5 4.5 0 0016.5 12zM14 3.23v2.06a7 7 0 010 13.42v2.06A9 9 0 0014 3.23z"/></svg>',
    volLo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4zm12.5 3a4.5 4.5 0 00-2.5-4.03v8.06A4.5 4.5 0 0016.5 12z"/></svg>',
    mute:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4zm15.5 3l2.2-2.2-1.4-1.4L18 10.6 15.8 8.4l-1.4 1.4L16.6 12l-2.2 2.2 1.4 1.4L18 13.4l2.2 2.2 1.4-1.4L19.5 12z"/></svg>',
    full:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5v2H6v3H4zm11-5h5v5h-2V6h-3V4zM6 15v3h3v2H4v-5h2zm12 3v-3h2v5h-5v-2h3z"/></svg>',
    exit:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7V4h2v5H4V7h3zm8-3h2v3h3v2h-5V4zM4 15h5v5H7v-3H4v-2zm11 5v-5h5v2h-3v3h-2z"/></svg>'
  };
  var SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    t = Math.floor(t);
    var m = Math.floor(t / 60), s = t % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function fsElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function Player(root) {
    this.root = root;
    this.src = root.getAttribute("data-src");
    this.poster = root.getAttribute("data-poster") || "";
    this.title = root.getAttribute("data-title") || "Видео";
    if (!this.src) return;
    this.build();
    this.bind();
  }

  Player.prototype.build = function () {
    var r = this.root;
    r.setAttribute("tabindex", "0");
    r.setAttribute("role", "region");
    r.setAttribute("aria-label", this.title);

    var v = el("video", "rp__video");
    v.playsInline = true; v.setAttribute("playsinline", ""); v.preload = "none";
    if (this.poster) v.poster = this.poster;
    v.setAttribute("aria-label", this.title);
    this.video = v;

    var spin = el("div", "rp__spin");

    var big = el("button", "rp__big",
      '<span class="rp__big-ic">' + SVG.play + "</span>");
    big.type = "button";
    big.setAttribute("aria-label", "Смотреть: " + this.title);
    this.big = big;

    var grad = el("div", "rp__gradient");

    var bar = el("div", "rp__bar");

    // progress
    var track = el("div", "rp__track");
    track.setAttribute("role", "slider");
    track.setAttribute("aria-label", "Перемотка");
    track.setAttribute("aria-valuemin", "0");
    var rail = el("div", "rp__rail",
      '<div class="rp__buffered"></div><div class="rp__played"></div>');
    var knob = el("div", "rp__knob");
    var hoverTime = el("div", "rp__hover-time", "0:00");
    track.appendChild(rail); track.appendChild(knob); track.appendChild(hoverTime);
    this.track = track; this.buffered = rail.querySelector(".rp__buffered");
    this.played = rail.querySelector(".rp__played"); this.knob = knob; this.hoverTime = hoverTime;

    // controls row
    var controls = el("div", "rp__controls");

    var playBtn = el("button", "rp__btn", SVG.play);
    playBtn.type = "button"; playBtn.setAttribute("aria-label", "Воспроизвести");
    this.playBtn = playBtn;

    var time = el("div", "rp__time", "<b>0:00</b> / 0:00");
    this.time = time;

    var vol = el("div", "rp__vol");
    var volBtn = el("button", "rp__btn", SVG.volHi);
    volBtn.type = "button"; volBtn.setAttribute("aria-label", "Звук");
    var volSlider = el("div", "rp__vol-slider",
      '<div class="rp__vol-fill"></div><div class="rp__vol-knob"></div>');
    volSlider.setAttribute("role", "slider"); volSlider.setAttribute("aria-label", "Громкость");
    vol.appendChild(volBtn); vol.appendChild(volSlider);
    this.volBtn = volBtn; this.volSlider = volSlider;
    this.volFill = volSlider.querySelector(".rp__vol-fill");
    this.volKnob = volSlider.querySelector(".rp__vol-knob");

    var spring = el("div", "rp__spring");

    var speedWrap = el("div", "rp__speed-wrap");
    var speedBtn = el("button", "rp__speed", "1×");
    speedBtn.type = "button"; speedBtn.setAttribute("aria-haspopup", "true");
    speedBtn.setAttribute("aria-label", "Скорость воспроизведения");
    var menu = el("div", "rp__menu");
    SPEEDS.forEach(function (s) {
      var b = el("button", null, (s === 1 ? "1×" : (String(s).replace(".", ",") + "×")));
      b.type = "button"; b.setAttribute("data-speed", String(s));
      b.setAttribute("aria-checked", s === 1 ? "true" : "false");
      menu.appendChild(b);
    });
    speedWrap.appendChild(speedBtn); speedWrap.appendChild(menu);
    this.speedBtn = speedBtn; this.menu = menu;

    var fullBtn = el("button", "rp__btn", SVG.full);
    fullBtn.type = "button"; fullBtn.setAttribute("aria-label", "На весь экран");
    this.fullBtn = fullBtn;

    controls.appendChild(playBtn);
    controls.appendChild(time);
    controls.appendChild(vol);
    controls.appendChild(spring);
    controls.appendChild(speedWrap);
    controls.appendChild(fullBtn);

    bar.appendChild(track);
    bar.appendChild(controls);

    r.appendChild(v);
    r.appendChild(spin);
    r.appendChild(grad);
    r.appendChild(big);
    r.appendChild(bar);
  };

  Player.prototype.bind = function () {
    var self = this, v = this.video, r = this.root;

    // первый запуск: подгружаем src лениво
    this.big.addEventListener("click", function () { self.start(); });

    this.playBtn.addEventListener("click", function () { self.toggle(); });
    v.addEventListener("click", function () { if (self.started) self.toggle(); });
    v.addEventListener("dblclick", function () { self.toggleFullscreen(); });

    v.addEventListener("play", function () {
      r.classList.add("is-playing"); self.playBtn.innerHTML = SVG.pause;
      self.playBtn.setAttribute("aria-label", "Пауза"); self.scheduleHide();
    });
    v.addEventListener("pause", function () {
      r.classList.remove("is-playing"); self.playBtn.innerHTML = SVG.play;
      self.playBtn.setAttribute("aria-label", "Воспроизвести"); self.show();
    });
    v.addEventListener("ended", function () { self.show(); });
    v.addEventListener("waiting", function () { r.classList.add("is-loading"); });
    v.addEventListener("playing", function () { r.classList.remove("is-loading"); });
    v.addEventListener("loadedmetadata", function () {
      self.track.setAttribute("aria-valuemax", String(Math.floor(v.duration || 0)));
      self.renderTime();
    });
    v.addEventListener("timeupdate", function () { self.renderProgress(); self.renderTime(); });
    v.addEventListener("progress", function () { self.renderBuffered(); });
    v.addEventListener("volumechange", function () { self.renderVolume(); });

    // прогресс: drag + hover
    this.attachDrag(this.track, function (p) { if (v.duration) v.currentTime = p * v.duration; });
    this.track.addEventListener("mousemove", function (e) {
      var p = self.ratio(self.track, e.clientX);
      self.hoverTime.textContent = fmt(p * (v.duration || 0));
      self.hoverTime.style.left = (p * 100) + "%";
    });

    // громкость
    this.volBtn.addEventListener("click", function () { self.toggleMute(); });
    this.attachDrag(this.volSlider, function (p) { v.muted = false; v.volume = Math.max(0, Math.min(1, p)); });

    // скорость
    this.speedBtn.addEventListener("click", function (e) {
      e.stopPropagation(); self.menu.classList.toggle("is-open");
    });
    this.menu.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-speed]"); if (!b) return;
      self.setSpeed(parseFloat(b.getAttribute("data-speed")));
      self.menu.classList.remove("is-open");
    });
    document.addEventListener("click", function (e) {
      if (!self.root.contains(e.target)) self.menu.classList.remove("is-open");
    });

    // fullscreen
    this.fullBtn.addEventListener("click", function () { self.toggleFullscreen(); });
    document.addEventListener("fullscreenchange", function () { self.onFsChange(); });
    document.addEventListener("webkitfullscreenchange", function () { self.onFsChange(); });

    // авто-скрытие панели
    r.addEventListener("mousemove", function () { self.show(); self.scheduleHide(); });
    r.addEventListener("mouseleave", function () { if (!v.paused) self.hide(); });
    r.addEventListener("touchstart", function () { self.show(); self.scheduleHide(); }, { passive: true });

    // клавиши
    r.addEventListener("keydown", function (e) { self.onKey(e); });
  };

  Player.prototype.ratio = function (elm, clientX) {
    var b = elm.getBoundingClientRect();
    return b.width ? Math.max(0, Math.min(1, (clientX - b.left) / b.width)) : 0;
  };

  Player.prototype.attachDrag = function (elm, onMove) {
    var self = this, dragging = false;
    function move(e) {
      var x = (e.touches ? e.touches[0].clientX : e.clientX);
      onMove(self.ratio(elm, x));
    }
    function down(e) {
      dragging = true; self.root.classList.add("is-scrubbing");
      move(e); e.preventDefault();
      document.addEventListener("mousemove", move);
      document.addEventListener("touchmove", move, { passive: false });
      document.addEventListener("mouseup", up);
      document.addEventListener("touchend", up);
    }
    function up() {
      dragging = false; self.root.classList.remove("is-scrubbing");
      document.removeEventListener("mousemove", move);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("mouseup", up);
      document.removeEventListener("touchend", up);
    }
    elm.addEventListener("mousedown", down);
    elm.addEventListener("touchstart", down, { passive: false });
  };

  Player.prototype.start = function () {
    if (!this.started) {
      this.started = true;
      this.root.classList.add("is-started");
      this.video.src = this.src;
    }
    this.video.play();
    this.root.focus({ preventScroll: true });
  };
  Player.prototype.toggle = function () {
    if (!this.started) return this.start();
    if (this.video.paused) this.video.play(); else this.video.pause();
  };
  Player.prototype.setSpeed = function (s) {
    this.video.playbackRate = s;
    this.speedBtn.textContent = (s === 1 ? "1×" : (String(s).replace(".", ",") + "×"));
    this.menu.querySelectorAll("button[data-speed]").forEach(function (b) {
      b.setAttribute("aria-checked", parseFloat(b.getAttribute("data-speed")) === s ? "true" : "false");
    });
  };
  Player.prototype.toggleMute = function () { this.video.muted = !this.video.muted; };
  Player.prototype.toggleFullscreen = function () {
    var r = this.root;
    if (fsElement()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else if (r.requestFullscreen) {
      r.requestFullscreen();
    } else if (r.webkitRequestFullscreen) {
      r.webkitRequestFullscreen();
    } else if (this.video.webkitEnterFullscreen) {
      this.video.webkitEnterFullscreen(); // iOS Safari
    }
  };
  Player.prototype.onFsChange = function () {
    var inFs = fsElement() === this.root;
    this.fullBtn.innerHTML = inFs ? SVG.exit : SVG.full;
    this.fullBtn.setAttribute("aria-label", inFs ? "Выйти из полноэкранного" : "На весь экран");
  };

  Player.prototype.show = function () { this.root.classList.add("is-active"); };
  Player.prototype.hide = function () {
    this.menu.classList.remove("is-open");
    this.root.classList.remove("is-active");
  };
  Player.prototype.scheduleHide = function () {
    var self = this;
    clearTimeout(this._hideT);
    this._hideT = setTimeout(function () {
      // прячем панель только во время воспроизведения; hover/mousemove снова её покажет
      if (!self.video.paused && !self.menu.classList.contains("is-open")) self.hide();
    }, 2600);
  };

  Player.prototype.renderProgress = function () {
    var v = this.video, p = v.duration ? v.currentTime / v.duration : 0;
    this.played.style.width = (p * 100) + "%";
    this.knob.style.left = (p * 100) + "%";
    this.track.setAttribute("aria-valuenow", String(Math.floor(v.currentTime || 0)));
  };
  Player.prototype.renderBuffered = function () {
    var v = this.video;
    if (v.buffered && v.buffered.length && v.duration) {
      this.buffered.style.width = (v.buffered.end(v.buffered.length - 1) / v.duration * 100) + "%";
    }
  };
  Player.prototype.renderTime = function () {
    this.time.innerHTML = "<b>" + fmt(this.video.currentTime) + "</b> / " + fmt(this.video.duration);
  };
  Player.prototype.renderVolume = function () {
    var v = this.video, val = v.muted ? 0 : v.volume;
    this.volFill.style.width = (val * 100) + "%";
    this.volKnob.style.left = (val * 100) + "%";
    this.volBtn.innerHTML = v.muted || val === 0 ? SVG.mute : (val < 0.5 ? SVG.volLo : SVG.volHi);
    this.volSlider.setAttribute("aria-valuenow", String(Math.round(val * 100)));
  };

  Player.prototype.onKey = function (e) {
    var v = this.video, k = e.key;
    if (k === " " || k === "k" || k === "K" || k === "Spacebar") { e.preventDefault(); this.toggle(); }
    else if (k === "ArrowLeft")  { e.preventDefault(); if (this.started) v.currentTime = Math.max(0, v.currentTime - 5); }
    else if (k === "ArrowRight") { e.preventDefault(); if (this.started) v.currentTime = Math.min(v.duration || 0, v.currentTime + 5); }
    else if (k === "ArrowUp")    { e.preventDefault(); v.muted = false; v.volume = Math.min(1, v.volume + 0.1); }
    else if (k === "ArrowDown")  { e.preventDefault(); v.muted = false; v.volume = Math.max(0, v.volume - 0.1); }
    else if (k === "m" || k === "M" || k === "ь") { this.toggleMute(); }
    else if (k === "f" || k === "F" || k === "а") { this.toggleFullscreen(); }
    else return;
    this.show(); this.scheduleHide();
  };

  function init(ctx) {
    (ctx || document).querySelectorAll(".rp[data-src]:not([data-rp-ready])").forEach(function (r) {
      r.setAttribute("data-rp-ready", "1");
      new Player(r);
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else { init(); }
  window.RaschetusPlayer = { init: init };
})();
