// Extras: sale-pings toast, "Us vs Others" reveal, and the order-success animation.
// Loaded before site-2.js. No libraries. Only transform and opacity are animated.
(function () {
  'use strict';
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- 1. Sale pings toast ---------- */
  var toastEl = document.getElementById('pingToast');
  var showSamples = toastEl && toastEl.getAttribute('data-show-samples') === 'true';
  var GAP_MIN = 6000, GAP_MAX = 9000, STAY = 4000, OUT = 350;
  var closed = false;
  try { closed = sessionStorage.getItem('ww-pings-closed') === '1'; } catch (e) { closed = false; }

  function timeAgo(iso) {
    var mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + ' min ago';
    var h = Math.round(mins / 60);
    if (h < 24) return h + (h === 1 ? ' hour' : ' hours') + ' ago';
    var d = Math.round(h / 24);
    return d + (d === 1 ? ' day' : ' days') + ' ago';
  }

  function startPings(entries) {
    var textEl = document.getElementById('pingText');
    var closeBtn = document.getElementById('pingClose');
    var timer = null, last = -1, stopped = false;

    function schedule(delay) {
      if (stopped) return;
      clearTimeout(timer);
      timer = setTimeout(show, delay);
    }
    function show() {
      if (stopped) return;
      if (document.hidden) { schedule(2000); return; }   // do not stack toasts in a background tab
      var i = Math.floor(Math.random() * entries.length);
      if (entries.length > 1 && i === last) i = (i + 1) % entries.length;
      last = i;
      var e = entries[i];
      textEl.textContent = '';
      var strong = document.createElement('strong');
      strong.textContent = e.name + ' from ' + e.city;
      textEl.appendChild(strong);
      textEl.appendChild(document.createTextNode(' just bought ' + e.product + ' '));
      var small = document.createElement('small');
      small.textContent = timeAgo(e.at);
      textEl.appendChild(small);

      toastEl.hidden = false;
      requestAnimationFrame(function () { requestAnimationFrame(function () { toastEl.classList.add('is-in'); }); });
      timer = setTimeout(hide, STAY);
    }
    function hide() {
      toastEl.classList.remove('is-in');
      timer = setTimeout(function () {
        toastEl.hidden = true;
        schedule(GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN) - STAY - OUT);
      }, OUT);
    }
    closeBtn.addEventListener('click', function () {
      stopped = true;
      clearTimeout(timer);
      toastEl.classList.remove('is-in');
      toastEl.hidden = true;
      try { sessionStorage.setItem('ww-pings-closed', '1'); } catch (err) { /* private mode: still hidden for this page */ }
    });
    schedule(4000 + Math.random() * 2000);   // first toast a few seconds after the page settles
  }

  if (toastEl && !closed) {
    fetch('data/sale-pings.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (all) {
        var entries = (Array.isArray(all) ? all : []).filter(function (e) {
          return e && e.name && e.city && e.product && e.at && (showSamples || e.sample !== true);
        });
        if (entries.length) { startPings(entries); }
      })
      .catch(function () { /* no data file: no toast, page unaffected */ });
  }

  /* ---------- 2. Us vs Others: rows reveal one by one ---------- */
  var table = document.getElementById('cmpTable');
  function revealRows() {
    var rows = table.querySelectorAll('tbody tr');
    rows.forEach(function (row, i) {
      setTimeout(function () {
        row.classList.add('is-in');
        var marks = row.querySelectorAll('.mk');
        marks.forEach(function (m) { m.classList.add(m.classList.contains('yes') ? 'pop' : 'shake'); });
      }, reduce ? 0 : i * 180);
    });
  }
  if (table) {
    if (!('IntersectionObserver' in window) || reduce) {
      table.querySelectorAll('tbody tr').forEach(function (r) { r.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries, obs) {
        if (entries[0].isIntersecting) { revealRows(); obs.disconnect(); }
      }, { threshold: 0.25 });
      io.observe(table);
    }
  }

  /* ---------- 3. Order success: spinner -> check -> confetti ---------- */
  var confettiCanvas = null;
  function confetti(originEl) {
    if (reduce) return;
    var r = originEl.getBoundingClientRect();
    if (!confettiCanvas) {
      confettiCanvas = document.createElement('canvas');
      confettiCanvas.className = 'fx-confetti';
      confettiCanvas.setAttribute('aria-hidden', 'true');
      document.body.appendChild(confettiCanvas);
    }
    var c = confettiCanvas, dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = window.innerWidth * dpr; c.height = window.innerHeight * dpr;
    var ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var colors = ['#D4AF37', '#ECD48C', '#4B2E2B', '#E7AFC3', '#F7D6DF', '#FFFDF8'];
    var ox = r.left + r.width / 2, oy = r.top + r.height / 2;
    var parts = [];
    for (var i = 0; i < 80; i++) {
      parts.push({
        x: ox, y: oy,
        vx: (Math.random() - 0.5) * 9, vy: -(Math.random() * 9 + 4),
        w: 5 + Math.random() * 5, h: 3 + Math.random() * 4,
        rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3,
        col: colors[i % colors.length]
      });
    }
    var start = performance.now(), DUR = 1200;
    (function frame(now) {
      var t = now - start;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      var alpha = t > DUR - 300 ? Math.max(0, (DUR - t) / 300) : 1;
      ctx.globalAlpha = alpha;
      parts.forEach(function (p) {
        p.vy += 0.32; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.col; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      if (t < DUR) { requestAnimationFrame(frame); }
      else { ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); c.remove(); confettiCanvas = null; }
    })(start);
  }

  window.WWFx = {
    spin: function (btn) {
      btn.dataset.label = btn.textContent;
      btn.classList.add('fx-loading');
      btn.setAttribute('aria-busy', 'true');
      btn.innerHTML = '<span class="fx-ring" aria-hidden="true"></span><span class="sr-only">Placing your order</span>';
    },
    reset: function (btn) {
      btn.classList.remove('fx-loading', 'fx-ok');
      btn.removeAttribute('aria-busy');
      if (btn.dataset.label) { btn.textContent = btn.dataset.label; }
      var m = btn.parentNode && btn.parentNode.querySelector('.fx-msg');
      if (m) { m.remove(); }
    },
    success: function (btn, message, done) {
      btn.classList.remove('fx-loading');
      btn.classList.add('fx-ok');
      btn.removeAttribute('aria-busy');
      btn.innerHTML = '<svg class="fx-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><span class="sr-only">Order placed</span>';
      var msg = document.createElement('p');
      msg.className = 'fx-msg';
      msg.setAttribute('role', 'status');
      msg.textContent = message;
      btn.insertAdjacentElement('afterend', msg);
      confetti(btn);
      setTimeout(done, reduce ? 300 : 1400);
    }
  };
})();
