/* How we work: four animated scenes (choose, order, bake, deliver). Built with GSAP timelines
   and inline SVG, no photos. Each scene plays when it is shown; the choice flows into the WhatsApp order. */
(function () {
  'use strict';
  var flow = document.getElementById('flow');
  if (!flow || !window.gsap) return;
  var gsap = window.gsap;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var panels = [].slice.call(flow.querySelectorAll('.fl-panel'));
  var steps = [].slice.call(flow.querySelectorAll('.flow-steps li'));
  var choices = [].slice.call(flow.querySelectorAll('.fl-choice'));
  var back = document.getElementById('flBack');
  var next = document.getElementById('flNext');
  var replay = document.getElementById('flReplay');
  var bubble = document.getElementById('flBubble');
  var tick = document.getElementById('flTick');
  var pickName = document.getElementById('flPickName');
  var waBtn = document.getElementById('flWa');
  var timer = document.getElementById('flTimer');
  var bakeText = document.getElementById('flBakeText');
  var bar = flow.querySelector('.fl-bar span');
  var scoot = document.getElementById('flScoot');
  var bagCake = document.getElementById('flBagCake');
  var check = document.getElementById('flCheck');
  var tickPath = document.getElementById('flTick2');
  var delivText = document.getElementById('flDelivText');
  var step = 1, picked = 'Birthday cake', tl = null, auto = false;
  var HOLD = 1.4;   // seconds each scene stays on screen after it finishes
  var WA = 'https://wa.me/919459755408?text=';

  function killTl() { if (tl) { tl.kill(); tl = null; } }
  function stopAuto() { auto = false; }

  function setPicked(name) {
    picked = name;
    pickName.textContent = name;
    var msg = "Hi Whisk & Wonder, I'd like to order the " + name;
    waBtn.setAttribute('href', WA + encodeURIComponent(msg));
  }

  /* ---------- scene 1: choose ---------- */
  function sceneChoose() {
    var items = choices;
    if (reduce) return;
    tl = gsap.timeline();
    tl.fromTo(items, { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.12, ease: 'power3.out' });
    tl.to({}, { duration: HOLD + 1 });
    items.forEach(function (b) {
      var svg = b.querySelector('svg');
      gsap.to(svg, { y: -4, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: Math.random() * 0.6 });
    });
  }

  /* ---------- scene 2: order on the phone ---------- */
  function sceneOrder() {
    var msg = "I'd like the " + picked + ", please.";
    bubble.textContent = '';
    tick.style.opacity = 0;
    if (reduce) { bubble.textContent = msg; tick.style.opacity = 1; return; }
    var p = { n: 0 };
    tl = gsap.timeline();
    tl.fromTo('.fl-screen', { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' });
    tl.to(p, { n: msg.length, duration: 1.6, ease: 'none', onUpdate: function () { bubble.textContent = msg.slice(0, Math.round(p.n)); } }, '+=0.2');
    tl.to(tick, { opacity: 1, duration: 0.3 }, '+=0.2');
    tl.fromTo(waBtn, { scale: 1 }, { scale: 1.06, duration: 0.35, yoyo: true, repeat: 3, ease: 'sine.inOut' }, '+=0.2');
    tl.to({}, { duration: HOLD });
  }

  /* ---------- scene 3: we bake it ---------- */
  function sceneBake() {
    var layers = [].slice.call(document.querySelectorAll('.fl-oven .ly'));
    var glow = document.querySelector('.fl-glow');
    var steam = [].slice.call(document.querySelectorAll('.fl-steam'));
    var msgs = ['Mixing the batter', 'Baking in the oven', 'Cooling and finishing', 'Decorating by hand', 'Ready for delivery'];
    timer.textContent = '00:00:00';
    bakeText.textContent = msgs[0];
    bar.style.transform = 'scaleX(0)';
    if (reduce) { timer.textContent = '03:00:00'; bakeText.textContent = msgs[4]; bar.style.transform = 'scaleX(1)'; return; }
    var t = { v: 0 };
    tl = gsap.timeline();
    tl.fromTo(layers, { y: -36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.28, ease: 'back.out(1.3)' });
    tl.to(glow, { opacity: 0.35, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 4 }, 0);
    tl.fromTo(steam, { opacity: 0, y: 4 }, { opacity: 1, y: -6, duration: 1.2, stagger: 0.2, repeat: 4, yoyo: true, ease: 'sine.inOut' }, 0.4);
    tl.to(bar, { scaleX: 1, duration: 4.2, ease: 'none' }, 0.2);
    tl.to(t, { v: 180, duration: 4.2, ease: 'none', onUpdate: function () {
      var total = Math.floor(t.v * 60), h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), sec = total % 60;
      timer.textContent = [h, m, sec].map(function (x) { return String(x).padStart(2, '0'); }).join(':');
      bakeText.textContent = msgs[Math.min(3, Math.floor(t.v / 45))];
    } }, 0.2);
    tl.call(function () { bakeText.textContent = msgs[4]; }, null, 4.4);
    tl.to(layers, { y: -2, duration: 0.4, yoyo: true, repeat: 1, ease: 'sine.inOut' }, '>');
    tl.to({}, { duration: HOLD });
  }

  /* ---------- scene 4: delivered ---------- */
  function sceneDeliver() {
    bagCake.textContent = '';
    check.style.opacity = 0;
    delivText.textContent = 'On the way to you.';
    if (reduce) { check.style.opacity = 1; delivText.textContent = 'Delivered fresh to your door.'; return; }
    var len = tickPath.getTotalLength ? tickPath.getTotalLength() : 30;
    gsap.set(tickPath, { strokeDasharray: len, strokeDashoffset: len });
    gsap.set(scoot, { x: -40 });
    tl = gsap.timeline();
    tl.to(scoot, { x: 120, duration: 2.2, ease: 'power2.inOut' });
    tl.to(scoot, { y: -3, duration: 0.18, yoyo: true, repeat: 5, ease: 'sine.inOut' }, '<');
    tl.to(check, { opacity: 1, duration: 0.2 });
    tl.fromTo(check, { scale: 0.4, transformOrigin: '300px 46px' }, { scale: 1, duration: 0.5, ease: 'back.out(1.8)' }, '<');
    tl.to(tickPath, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' });
    tl.call(function () { delivText.textContent = 'Delivered fresh to your door.'; });
    tl.to({}, { duration: HOLD });
  }

  var scenes = { 1: sceneChoose, 2: sceneOrder, 3: sceneBake, 4: sceneDeliver };

  function show(n) {
    killTl();
    step = n;
    flow.setAttribute('data-step', n);
    panels.forEach(function (p) { p.hidden = Number(p.getAttribute('data-p')) !== n; });
    steps.forEach(function (li, i) {
      li.classList.toggle('is-on', i + 1 === n);
      li.classList.toggle('is-done', i + 1 < n);
    });
    back.disabled = n === 1;
    next.disabled = false;
    next.textContent = n === 4 ? 'Start again' : 'Next';
    if (n === 2) setPicked(picked);
    scenes[n]();
    if (tl) {
      tl.eventCallback('onComplete', function () { if (auto && step < 4) show(step + 1); else auto = false; });
    } else if (auto) {
      // reduced motion: no timeline, so wait a moment and move on
      setTimeout(function () { if (auto && step < 4) show(step + 1); else auto = false; }, 1800);
    }
  }

  choices.forEach(function (btn) {
    btn.addEventListener('click', function () {
      stopAuto();
      choices.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); b.classList.remove('is-picked'); });
      btn.setAttribute('aria-pressed', 'true'); btn.classList.add('is-picked');
      setPicked(btn.getAttribute('data-cake'));
      if (!reduce) gsap.fromTo(btn, { scale: 0.92 }, { scale: 1, duration: 0.5, ease: 'back.out(2)' });
    });
  });
  next.addEventListener('click', function () { stopAuto(); show(step < 4 ? step + 1 : 1); });
  back.addEventListener('click', function () { stopAuto(); if (step > 1) show(step - 1); });
  // Watch again: the whole journey from choosing the cake to delivery, played in order
  replay.addEventListener('click', function () { auto = true; show(1); });
  steps.forEach(function (li) {
    li.addEventListener('click', function () { stopAuto(); show(Number(li.getAttribute('data-s'))); });
  });

  setPicked(picked);
  show(1);
})();
