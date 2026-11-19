/*
 * Motion layer for Whisk & Wonder Cakes.
 * Loaded after gsap, ScrollTrigger, Lenis and the existing site scripts.
 * - Lenis: smooth wheel scrolling on desktop; phones keep native touch scrolling.
 * - GSAP + ScrollTrigger: hero parallax and section-title reveals; magnetic CTA on fine pointers.
 * - Ambient WebGL gradient behind the delivery banner (paused when off-screen).
 * - Liquid logo intro (WebGL) on the preloader logo.
 * Everything here is progressive: if a library, WebGL or motion preference is missing, the site works as before.
 * No inline code, no eval, no network requests (CSP: script-src 'self').
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined';
  var hasST = typeof window.ScrollTrigger !== 'undefined';

  /* ---------- 1. Lenis smooth scroll ---------- */
  var lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new window.Lenis({
      lerp: 0.09,              // how quickly the scroll catches up (lower = smoother, more lag)
      smoothWheel: true,       // desktop wheel / trackpad only
      syncTouch: false,        // phones keep native momentum scrolling
      anchors: true            // in-page links (#cakes, #shop...) glide too
    });
    root.classList.add('has-lenis');

    // Stop smooth scrolling while a modal sets body overflow:hidden (lightbox, cart, info sheets).
    var lockObserver = new MutationObserver(function () {
      var locked = document.body.style.overflow === 'hidden';
      if (locked) lenis.stop(); else lenis.start();
    });
    lockObserver.observe(document.body, { attributes: true, attributeFilter: ['style'] });

    if (hasST) lenis.on('scroll', window.ScrollTrigger.update);
    if (hasGSAP) {
      window.gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    }
  }

  /* ---------- 0. Accessibility: deepen brand gold/rose text that sits on light backgrounds ---------- */
  function fixLightText() {
    var DARK = '.signature, .gallery, .delivery-banner, .hero, .plan-band, .made-for-you, .preloader, footer, .site-header, .cart-drawer, .info-modal, .lightbox, .mobile-menu';
    var FIX = { 'rgb(212, 175, 55)': 'ww-fix-gold', 'rgb(231, 175, 195)': 'ww-fix-rose' };
    document.querySelectorAll('body *').forEach(function (el) {
      if (!el.firstChild) return;
      if (!el.textContent || !el.textContent.trim()) return;
      var cls = FIX[getComputedStyle(el).color];
      if (cls && !el.closest(DARK)) el.classList.add(cls);
    });
  }
  fixLightText();
  // Some cards are rendered by other scripts after this file runs, so re-check once the page has settled.
  window.addEventListener('load', function () { setTimeout(fixLightText, 400); });

  if (!hasGSAP) return;                       // rest of the motion needs GSAP
  var gsap = window.gsap;
  if (hasST) gsap.registerPlugin(window.ScrollTrigger);
  if (reduceMotion) return;                   // respect the OS setting: no parallax, no tweens

  /* ---------- 2. Hero parallax (container, not the <img>, which already has a CSS zoom) ---------- */
  var heroMedia = document.querySelector('.hero-media');
  if (heroMedia && hasST) {
    gsap.to(heroMedia, {
      yPercent: 16,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  /* ---------- 3. Section titles: soft rise + fade as they enter ---------- */
  if (hasST) {
    gsap.utils.toArray('.section-title').forEach(function (el) {
      if (el.classList.contains('reveal')) return;   // already handled by the CSS reveal
      gsap.fromTo(el,
        { yPercent: 18, opacity: 0 },
        {
          yPercent: 0, opacity: 1, duration: 1.1, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        });
    });
  }

  /* ---------- 3b. Signature cake section: staggered copy + stage rise ---------- */
  var sig = document.querySelector('.signature');
  if (sig && hasST) {
    gsap.from('.sig-copy > :not(.section-title)', {
      y: 32, opacity: 0, duration: 1, stagger: 0.12, ease: 'power3.out',
      scrollTrigger: { trigger: sig, start: 'top 72%', once: true }
    });
    // (signature stage removed: the video is the section background)
  }

  /* ---------- 3c. 3D tilt on cards (fine pointers, only once a card is revealed) ---------- */
  if (finePointer) {
    gsap.utils.toArray('.party-card, .cat-card, .why-card').forEach(function (el) {
      var rX = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3.out' });
      var rY = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3.out' });
      gsap.set(el, { transformPerspective: 900 });
      el.addEventListener('pointermove', function (e) {
        if (!el.classList.contains('in-view')) return;
        var b = el.getBoundingClientRect();
        var nx = (e.clientX - b.left) / b.width - 0.5;
        var ny = (e.clientY - b.top) / b.height - 0.5;
        rY(nx * 9);
        rX(-ny * 7);
      });
      el.addEventListener('pointerleave', function () {
        gsap.to(el, {
          rotationX: 0, rotationY: 0, duration: 0.7, ease: 'power3.out',
          onComplete: function () { el.style.transform = ''; }   // hand transform back to the CSS hover
        });
      });
    });
  }

  /* ---------- 3d. Pointer spotlight on dark sections (desktop) ---------- */
  if (finePointer) {
    gsap.utils.toArray('.signature, .gallery, .delivery-banner').forEach(function (sec) {
      sec.addEventListener('pointermove', function (e) {
        var b = sec.getBoundingClientRect();
        sec.style.setProperty('--mx', (e.clientX - b.left) + 'px');
        sec.style.setProperty('--my', (e.clientY - b.top) + 'px');
      });
    });
  }

  /* ---------- 4. Magnetic CTA buttons (desktop only) ---------- */
  if (finePointer) {
    gsap.utils.toArray('.nav-cta, .hero-actions .btn-gold').forEach(function (btn) {
      var xTo = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3.out' });
      var yTo = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3.out' });
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.22);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.32);
      });
      btn.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
    });
  }

  /* ---------- 5. WebGL: shared helpers ---------- */
  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
    return s;
  }
  function program(gl, vsSrc, fsSrc) {
    var vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
    var fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    var p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
    return p;
  }
  function quad(gl) {
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  }
  var QUAD_VS = 'attribute vec2 aPos; varying vec2 vUv;' +
    'void main(){ vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); gl_Position = vec4(aPos, 0.0, 1.0); }';

  /* ---------- 6. Ambient gradient (delivery banner) ---------- */
  function startGradient(canvas) {
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return;
    var prog = program(gl, QUAD_VS,
      'precision mediump float;' +
      'varying vec2 vUv; uniform vec2 uRes; uniform float uT;' +
      'uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;' +
      'void main(){' +
      '  vec2 p = vUv * 2.0 - 1.0; p.x *= uRes.x / uRes.y;' +
      '  float t = uT * 0.15;' +
      '  p += 0.32 * vec2(sin(p.y * 1.6 + t * 1.2), cos(p.x * 1.8 - t));' +
      '  p += 0.20 * vec2(sin(p.y * 2.9 - t * 0.7), cos(p.x * 2.4 + t * 0.9));' +
      '  float m1 = 0.5 + 0.5 * sin(p.x * 1.2 + t * 0.8);' +
      '  float m2 = 0.5 + 0.5 * cos(p.y * 1.4 - t * 0.6 + p.x * 0.4);' +
      '  vec3 col = mix(uA, uB, m1);' +
      '  col = mix(col, uC, smoothstep(0.55, 0.98, m2) * 0.22);' +
      '  col *= 0.9 + 0.1 * vUv.y;' +
      '  gl_FragColor = vec4(col, 1.0);' +
      '}');
    if (!prog) return;
    gl.useProgram(prog);
    quad(gl);
    var uRes = gl.getUniformLocation(prog, 'uRes');
    var uT = gl.getUniformLocation(prog, 'uT');
    gl.uniform3f(gl.getUniformLocation(prog, 'uA'), 0.165, 0.102, 0.094);  // deep cocoa
    gl.uniform3f(gl.getUniformLocation(prog, 'uB'), 0.294, 0.180, 0.169);  // brand brown #4B2E2B
    gl.uniform3f(gl.getUniformLocation(prog, 'uC'), 0.831, 0.686, 0.216);  // brand gold #D4AF37

    var dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1 : 1.5);
    function size() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    }
    size();
    window.addEventListener('resize', size, { passive: true });

    var visible = false, running = false, start = performance.now(), raf = 0;
    function frame(now) {
      if (!visible || document.hidden) { running = false; return; }
      gl.uniform1f(uT, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(frame);
    }
    function play() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) play();
      }, { threshold: 0 }).observe(canvas);
    } else { visible = true; play(); }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) play(); });
    canvas.classList.add('is-live');
  }

  /* ---------- 7. Liquid logo intro (preloader) ---------- */
  function liquidLogo(img) {
    var canvas = document.createElement('canvas');
    canvas.className = 'liquid-logo';
    canvas.setAttribute('aria-hidden', 'true');
    var gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return;
    var prog = program(gl, QUAD_VS,
      'precision mediump float;' +
      'varying vec2 vUv; uniform sampler2D uTex; uniform float uP; uniform float uT;' +
      'void main(){' +
      '  float amp = 1.0 - uP;' +
      '  vec2 uv = vUv;' +
      '  float w = sin(uv.y * 18.0 + uT * 6.0) * 0.5 + sin(uv.x * 11.0 - uT * 4.0) * 0.5;' +
      '  uv += amp * 0.05 * vec2(w, cos(uv.x * 14.0 - uT * 5.0));' +
      '  vec4 c = texture2D(uTex, uv);' +
      '  float band = 1.0 - abs(uv.x + uv.y * 0.35 - (uP * 2.2 - 0.6));' +
      '  float s = smoothstep(0.0, 0.18, band);' +
      '  c.rgb += vec3(0.85, 0.68, 0.25) * s * 0.4 * c.a;' +
      '  c.rgb = min(c.rgb, vec3(c.a));' +
      '  gl_FragColor = c;' +
      '}');
    if (!prog) return;
    gl.useProgram(prog);
    quad(gl);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    var uP = gl.getUniformLocation(prog, 'uP');
    var uT = gl.getUniformLocation(prog, 'uT');
    var rect = img.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.left = rect.left + 'px';
    canvas.style.top = rect.top + 'px';
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);

    var parent = img.parentNode;
    parent.appendChild(canvas);
    img.classList.add('is-liquid');

    var DURATION = 1.4, t0 = performance.now();
    function ease(x) { return 1 - Math.pow(1 - x, 3); }
    function frame(now) {
      var k = Math.min(1, (now - t0) / 1000 / DURATION);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uP, ease(k));
      gl.uniform1f(uT, (now - t0) / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (k < 1) { requestAnimationFrame(frame); }
      else {
        // hand back to the crisp DOM logo
        canvas.remove();
        img.classList.remove('is-liquid');
      }
    }
    requestAnimationFrame(frame);
  }

  function initWebGL() {
    var gradients = document.querySelectorAll('canvas.shader-bg[data-shader="gradient"]');
    if (gradients.length) {
      // Wait for the canvas to have layout before reading its size.
      requestAnimationFrame(function () { gradients.forEach(startGradient); });
    }
    // preloader liquid logo now runs from js/liquid-logo.js
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initWebGL);
  else initWebGL();

  root.classList.add('motion-ready');
})();
