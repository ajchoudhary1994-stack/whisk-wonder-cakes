/*
 * Party store: a party popper on the left keeps firing confetti while the section is on screen,
 * and gold and pastel balloons float up gently behind the cards. Runs only while the section is visible.
 * Reduced motion: no effects. Plain canvas 2D, no library.
 */
(function () {
  'use strict';
  var section = document.getElementById('party');
  var canvas = section && section.querySelector('canvas.party-fx');
  if (!canvas || !canvas.getContext) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var ctx = canvas.getContext('2d');
  var touch = window.matchMedia('(pointer: coarse)').matches;
  var dpr = Math.min(window.devicePixelRatio || 1, touch ? 1.25 : 1.5);
  var W = 0, H = 0, visible = false, running = false;
  var COLORS = ['#D4AF37', '#ECD48C', '#F7D6DF', '#E7AFC3', '#FFFDF8', '#B8860B'];
  var confetti = [], balloons = [];
  var viewBottom = 0;   // bottom edge of the visible part of the section, in canvas coordinates

  function size() {
    // the canvas is pinned to the screen, so it covers the viewport
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!balloons.length) makeBalloons();
  }

  function makeBalloons() {
    var n = touch ? 6 : 9;
    for (var i = 0; i < n; i++) {
      balloons.push({
        x: (i + 0.5) / n * W + (Math.random() - 0.5) * 40,
        y: H + Math.random() * H * 0.6,
        r: 16 + Math.random() * 12,
        speed: 18 + Math.random() * 16,
        sway: Math.random() * 6.28,
        color: COLORS[(Math.random() * 5) | 0]
      });
    }
  }

  // Party popper from the bottom-left, fired again and again while the section is on screen
  function burst() {
    var sx = W * 0.1, sy = Math.max(40, viewBottom - 6);   // bottom-left of what is visible on screen
    for (var i = 0; i < (touch ? 60 : 110); i++) {
      var ang = -Math.PI / 2 - 0.15 + Math.random() * 0.9;   // up and to the right
      var v = 380 + Math.random() * 420;
      confetti.push({
        x: sx, y: sy,
        vx: Math.cos(ang) * v, vy: Math.sin(ang) * v,
        w: 4 + Math.random() * 4, h: 8 + Math.random() * 6,
        rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 12,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        life: 2.6 + Math.random() * 1.2
      });
    }
  }

  function drawBalloon(b, t) {
    var x = b.x + Math.sin(t * 0.9 + b.sway) * 14;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(x, b.y, b.r * 0.88, b.r, 0, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.22, b.r * 0.14, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(x, b.y + b.r);
    ctx.quadraticCurveTo(x + 10, b.y + b.r + 30, x - 4, b.y + b.r + 60);
    ctx.strokeStyle = 'rgba(75,46,43,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  var last = 0, t = 0, nextBurst = 0;
  function frame(now) {
    if (!visible) { running = false; return; }
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now; t += dt;
    ctx.clearRect(0, 0, W, H);
    // the lowest point of this section that is on screen, in canvas coordinates
    var secBottom = Math.min(window.innerHeight, section.getBoundingClientRect().bottom);
    viewBottom = Math.max(0, Math.min(H, secBottom - canvas.getBoundingClientRect().top));

    if (t >= nextBurst && viewBottom > 40) { burst(); nextBurst = t + 1.6 + Math.random() * 1.2; }

    for (var i = 0; i < balloons.length; i++) {
      var b = balloons[i];
      b.y -= b.speed * dt;
      if (b.y < -b.r * 3) { b.y = viewBottom + b.r * 2; b.x = Math.random() * W; }
      drawBalloon(b, t);
    }

    for (var j = confetti.length - 1; j >= 0; j--) {
      var c = confetti[j];
      c.vy += 900 * dt;             // gravity
      c.vx *= 0.99;
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.rot += c.vr * dt;
      c.life -= dt;
      if (c.life <= 0 || c.y > H + 20) { confetti.splice(j, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.min(1, c.life);
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
    }

    requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true; last = performance.now();
    requestAnimationFrame(frame);
  }

  size();
  window.addEventListener('resize', size, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', size, { passive: true });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) {
        start();
      }
    }, { threshold: 0.15 }).observe(section);
  } else {
    visible = true; start();
  }
})();
