/*
 * Gallery as a 3D cylinder: the existing gallery items are placed on a ring with CSS 3D transforms.
 * Drag (mouse or touch) or use the arrow keys to turn it; the front item snaps into place.
 * Clicking a side item brings it to the front; clicking the front item opens the existing lightbox.
 * Falls back to the normal grid without JS, without GSAP, or with reduced motion.
 * No library beyond GSAP (already loaded), no network, no inline code.
 */
(function () {
  'use strict';

  var grid = document.getElementById('galleryGrid');
  if (!grid || !window.gsap) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var items = Array.prototype.slice.call(grid.querySelectorAll('.gallery-item'));
  var N = items.length;
  if (N < 3) return;

  var caption = document.getElementById('galleryCaption');
  var section = grid.closest('.gallery') || grid.parentNode;
  var step = 360 / N;
  var S = { rot: 0 };             // current rotation in degrees
  var W = 220, R = 240, H = 300;  // card width, ring radius, ring height (set in layout)
  var lastIndex = -1;

  // Give the ring a nice size for the screen.
  function layout() {
    var cw = grid.clientWidth || 320;
    W = Math.max(150, Math.min(260, cw * 0.44));
    R = W / (2 * Math.tan(Math.PI / N)) * 1.12;
    H = W * 1.3;
    grid.style.height = H + 'px';
    items.forEach(function (el) {
      el.style.width = W + 'px';
      el.style.height = W + 'px';
    });
    render();
  }

  // Index of the item at the front (rotation normalised to 0..360).
  function frontIndex() {
    var k = Math.round(-S.rot / step) % N;
    return (k + N) % N;
  }

  var queued = false;
  function render() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; paint(); });
  }
  function paint() {
    for (var i = 0; i < N; i++) {
      var a = i * step + S.rot;
      var rad = a * Math.PI / 180;
      var depth = (Math.cos(rad) + 1) / 2;         // 1 at front, 0 at back
      var el = items[i];
      el.style.transform = 'translate(-50%, -50%) rotateY(' + a.toFixed(2) + 'deg) translateZ(' + R.toFixed(1) + 'px)';
      el.style.opacity = (0.28 + 0.72 * depth).toFixed(3);
      el.style.zIndex = Math.round(depth * 100);
    }
    var f = frontIndex();
    if (f !== lastIndex && caption) {
      lastIndex = f;
      caption.textContent = items[f].getAttribute('data-name') || '';
      var tag = items[f].getAttribute('data-tag');
      if (tag) caption.textContent += '  \u00b7  ' + tag;
    }
    items.forEach(function (el, i) { el.classList.toggle('is-front', i === f); });
  }

  // Turn the ring to the nearest item, smoothly.
  function snapTo(target) {
    gsap.killTweensOf(S);
    gsap.to(S, { rot: target, duration: 0.9, ease: 'power3.out', onUpdate: render });
  }
  function snapNearest(extra) {
    var t = Math.round((S.rot + (extra || 0)) / step) * step;
    snapTo(t);
  }
  function turnBy(steps) { snapTo(Math.round(S.rot / step) * step + steps * step); }

  // The 'Have a design in mind?' card is not a photo: move it below the ring so it is not placed in 3D.
  var cta = grid.querySelector('.gallery-cta');
  if (cta && caption) caption.parentNode.insertBefore(cta, caption.nextSibling);
  else if (cta) grid.parentNode.insertBefore(cta, grid.nextSibling);

  // Enable the 3D layout
  grid.classList.add('is-ring');
  layout();
  window.addEventListener('resize', layout, { passive: true });

  /* ---- Drag to turn ---- */
  var dragging = false, moved = false, startX = 0, lastX = 0, vel = 0, lastT = 0;
  grid.addEventListener('pointerdown', function (e) {
    dragging = true; moved = false; startX = lastX = e.clientX; vel = 0; lastT = performance.now();
    grid.classList.add('is-dragging');
    gsap.killTweensOf(S);
  });
  grid.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX;
    if (Math.abs(e.clientX - startX) > 6) moved = true;
    lastX = e.clientX;
    S.rot += dx * 0.22;
    var now = performance.now();
    vel = dx * 0.22 / Math.max(1, now - lastT) * 16;   // degrees per frame-ish
    lastT = now;
    render();
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    grid.classList.remove('is-dragging');
    snapNearest(vel * 14);
  }
  grid.addEventListener('pointerup', endDrag);
  grid.addEventListener('pointercancel', endDrag);
  grid.addEventListener('pointerleave', function () { if (dragging) endDrag(); });

  /* ---- Clicks: drag = no click; side item = bring to front; front item = open lightbox ---- */
  grid.addEventListener('click', function (e) {
    if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; return; }
    var item = e.target.closest ? e.target.closest('.gallery-item') : null;
    if (!item) return;
    var i = items.indexOf(item);
    if (i !== frontIndex()) {
      e.stopPropagation(); e.preventDefault();
      var diff = ((i - frontIndex()) % N + N) % N;
      if (diff > N / 2) diff -= N;
      turnBy(-diff);
    }
  }, true);

  /* ---- Keyboard: arrows turn the ring when focus is in the gallery ---- */
  grid.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); turnBy(1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); turnBy(-1); }
  });

  // Make sure the caption region exists and is visible in ring mode.
  if (caption) caption.classList.add('is-on');
  if (section) section.classList.add('has-gallery-ring');
})();
