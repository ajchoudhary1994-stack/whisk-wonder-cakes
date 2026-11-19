/*
 * Lightweight 3D particle scene for the hero: pastel confetti floating in depth.
 * Single WebGL draw call per frame, pointer parallax, paused off-screen, static on reduced motion.
 * No library, no network, no inline code (CSP-safe).
 */
(function () {
  'use strict';

  var VERT = [
    'attribute vec3 aPos; attribute vec3 aCol; attribute float aSize; attribute float aSeed;',
    'uniform float uTime; uniform vec2 uRot; uniform float uAspect; uniform float uPixel;',
    'varying vec3 vCol; varying float vAlpha;',
    'mat3 rotY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.0,-s, 0.0,1.0,0.0, s,0.0,c); }',
    'mat3 rotX(float a){ float c=cos(a), s=sin(a); return mat3(1.0,0.0,0.0, 0.0,c,s, 0.0,-s,c); }',
    'void main(){',
    '  vec3 p = aPos;',
    '  p.y += sin(uTime * 0.7 + aSeed * 6.2831) * 0.06;',
    '  p = rotX(uRot.y * 0.35) * rotY(uTime * 0.08 + uRot.x * 0.6) * p;',
    '  float z = p.z + 3.4;',
    '  float s = 1.9 / z;',
    '  gl_Position = vec4(p.x * s / uAspect, p.y * s, 0.0, 1.0);',
    '  gl_PointSize = aSize * s * uPixel * 26.0;',
    '  vCol = aCol;',
    '  vAlpha = clamp((2.2 - abs(z - 3.4)) * 0.55, 0.15, 0.95);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision mediump float;',
    'varying vec3 vCol; varying float vAlpha;',
    'void main(){',
    '  vec2 d = gl_PointCoord - 0.5;',
    '  float r = length(d);',
    '  float a = smoothstep(0.5, 0.2, r) * vAlpha;',
    '  if (a < 0.01) discard;',
    '  float core = smoothstep(0.18, 0.0, r);',
    '  vec3 col = mix(vCol, vec3(1.0, 0.98, 0.93), core * 0.6);',
    '  gl_FragColor = vec4(col * a, a);',
    '}'
  ].join('\n');

  var PALETTE = [
    [0.969, 0.839, 0.875], // blush #F7D6DF
    [0.831, 0.686, 0.216], // gold #D4AF37
    [1.000, 0.992, 0.973], // ivory #FFFDF8
    [0.906, 0.686, 0.765], // blush deep #E7AFC3
    [0.431, 0.282, 0.259]  // brown-light #6E4842
  ];

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }

  function init(canvas) {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var touch = window.matchMedia('(pointer: coarse)').matches;
    var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'default' });
    if (!gl) return;
    var vs = compile(gl, gl.VERTEX_SHADER, VERT), fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aPos'); gl.bindAttribLocation(prog, 1, 'aCol');
    gl.bindAttribLocation(prog, 2, 'aSize'); gl.bindAttribLocation(prog, 3, 'aSeed');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    // Build particles: stride = 3 pos + 3 col + 1 size + 1 seed = 8 floats
    var N = touch ? 110 : 220;
    var data = new Float32Array(N * 8);
    for (var i = 0; i < N; i++) {
      var u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
      var r = Math.cbrt(Math.random()) * 2.4;
      var sq = Math.sqrt(1 - u * u);
      var o = i * 8;
      data[o] = r * sq * Math.cos(th);
      data[o + 1] = r * u * 0.8;
      data[o + 2] = r * sq * Math.sin(th);
      var c = PALETTE[(Math.random() * PALETTE.length) | 0];
      data[o + 3] = c[0]; data[o + 4] = c[1]; data[o + 5] = c[2];
      data[o + 6] = 0.5 + Math.random() * 0.9;
      data[o + 7] = Math.random();
    }
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    var stride = 8 * 4;
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 24);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, 28);

    var uTime = gl.getUniformLocation(prog, 'uTime');
    var uRot = gl.getUniformLocation(prog, 'uRot');
    var uAspect = gl.getUniformLocation(prog, 'uAspect');
    var uPixel = gl.getUniformLocation(prog, 'uPixel');

    var dpr = Math.min(window.devicePixelRatio || 1, touch ? 1.25 : 1.75);
    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uAspect, w / h);
      gl.uniform1f(uPixel, dpr);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Pointer parallax on the hero section (not the canvas, so text stays selectable)
    var host = canvas.parentElement;
    var tx = 0, ty = 0, rx = 0, ry = 0;
    if (!touch) {
      host.addEventListener('pointermove', function (e) {
        var b = host.getBoundingClientRect();
        tx = ((e.clientX - b.left) / b.width - 0.5) * 2;
        ty = ((e.clientY - b.top) / b.height - 0.5) * 2;
      });
      host.addEventListener('pointerleave', function () { tx = 0; ty = 0; });
    }

    gl.clearColor(0, 0, 0, 0);
    var visible = false, rafId = 0, start = performance.now();
    function draw(now) {
      rx += (tx - rx) * 0.05; ry += (ty - ry) * 0.05;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, reduce ? 0.0 : (now - start) / 1000);
      gl.uniform2f(uRot, rx, ry);
      gl.drawArrays(gl.POINTS, 0, N);
      if (visible && !reduce && !document.hidden) rafId = requestAnimationFrame(draw);
      else rafId = 0;
    }
    function loop() { if (!rafId) rafId = requestAnimationFrame(draw); }
    draw(performance.now());
    canvas.classList.add('is-live');

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) loop();
      }, { threshold: 0 }).observe(canvas);
    } else { visible = true; loop(); }
    document.addEventListener('visibilitychange', function () { if (!document.hidden && visible) loop(); });
  }

  function boot() {
    document.querySelectorAll('canvas.scene3d[data-scene="confetti"]').forEach(function (c) {
      try { init(c); } catch (e) { /* hero stays as the photo */ }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
