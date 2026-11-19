/*
 * 3D party-table scene for the Party Store: gold and pastel balloons on strings,
 * lit birthday candles, raymarched in one WebGL fragment shader. No library, no network, no inline code.
 * Drag or use left/right arrows to turn. Renders only while visible; one still frame for reduced motion.
 */
(function () {
  'use strict';

  var FRAG = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform float uYaw;',

    'float sdRoundCyl(vec3 p, float r, float h, float rr){',
    '  vec2 d = vec2(length(p.xz) - r + rr, abs(p.y) - h + rr);',
    '  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - rr;',
    '}',
    'float sdCapsule(vec3 p, vec3 a, vec3 b, float r){',
    '  vec3 pa = p - a, ba = b - a;',
    '  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);',
    '  return length(pa - ba * h) - r;',
    '}',

    // Materials: 0 table, 1 gold, 2 rose-gold, 3 ivory, 4 blush, 5 gold-deep, 6 string, 7 candle wax, 8 flame
    'float balloonY(float i){ return 0.55 + 0.18 * sin(uTime * 0.9 + i * 1.7); }',

    'vec2 scene(vec3 p){',
    '  float disk = max(length(p.xz) - 2.0, abs(p.y + 0.92) - 0.05);',
    '  vec2 res = vec2(disk, 0.0);',

    '  for (int i = 0; i < 5; i++) {',
    '    float fi = float(i);',
    '    float a = -0.95 + fi * 0.47;',
    '    vec3 c = vec3(sin(a) * 1.15, balloonY(fi) + 0.15, cos(a) * 0.55 - 0.15);',
    '    float d = length((p - c) * vec3(1.0, 0.88, 1.0)) - 0.34;',
    '    res = (d < res.x) ? vec2(d, fi + 1.0) : res;',
    '    float s = sdCapsule(p, c - vec3(0.0, 0.32, 0.0), vec3(c.x * 0.55, -0.9, c.z * 0.6), 0.007);',
    '    res = (s < res.x) ? vec2(s, 6.0) : res;',
    '  }',

    '  for (int j = 0; j < 3; j++) {',
    '    float fj = float(j);',
    '    vec3 base = vec3(-0.38 + fj * 0.38, -0.9, 0.22);',
    '    float cd = sdRoundCyl(p - (base + vec3(0.0, 0.26, 0.0)), 0.085, 0.26, 0.014);',
    '    res = (cd < res.x) ? vec2(cd, 7.0) : res;',
    '    float fl = length((p - (base + vec3(0.0, 0.58, 0.0))) * vec3(1.0, 0.6, 1.0)) - 0.05;',
    '    res = (fl < res.x) ? vec2(fl, 8.0) : res;',
    '  }',
    '  return res;',
    '}',

    'vec2 march(vec3 ro, vec3 rd){',
    '  float t = 0.0;',
    '  for (int i = 0; i < 72; i++) {',
    '    vec2 h = scene(ro + rd * t);',
    '    if (h.x < 0.0008 * t) return vec2(t, h.y);',
    '    t += h.x * 0.9;',
    '    if (t > 16.0) break;',
    '  }',
    '  return vec2(t, -1.0);',
    '}',

    'vec3 normalAt(vec3 p){',
    '  vec2 e = vec2(0.0012, -0.0012);',
    '  return normalize(',
    '    e.xyy * scene(p + e.xyy).x +',
    '    e.yyx * scene(p + e.yyx).x +',
    '    e.yxy * scene(p + e.yxy).x +',
    '    e.xxx * scene(p + e.xxx).x);',
    '}',

    'void main(){',
    '  vec2 uv = vUv * 2.0 - 1.0;',
    '  uv.x *= uRes.x / uRes.y;',
    '  float yaw = uYaw + 0.25 * sin(uTime * 0.2);',
    '  vec3 target = vec3(0.0, -0.1, 0.0);',
    '  vec3 ro = target + 3.7 * vec3(sin(yaw), 0.36, cos(yaw));',
    '  vec3 ww = normalize(target - ro);',
    '  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));',
    '  vec3 vv = cross(uu, ww);',
    '  vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.9 * ww);',

    '  vec3 col = vec3(0.0);',
    '  float alpha = 0.0;',

    // flame glow: closest approach of the view ray to each candle flame
    '  float glow = 0.0;',
    '  for (int j = 0; j < 3; j++) {',
    '    vec3 f = vec3(-0.38 + float(j) * 0.38, -0.34, 0.22);',
    '    vec3 w = f - ro;',
    '    float tc = dot(w, rd);',
    '    if (tc > 0.0) {',
    '      float dd = length(w - rd * tc);',
    '      glow += exp(-dd * 30.0) * 0.9 + exp(-dd * 7.0) * 0.22;',
    '    }',
    '  }',

    '  vec2 r = march(ro, rd);',
    '  if (r.y > -0.5) {',
    '    vec3 p = ro + rd * r.x;',
    '    vec3 n = normalAt(p);',
    '    vec3 V = -rd;',
    '    vec3 L = normalize(vec3(0.5, 0.9, 0.4));',
    '    vec3 H = normalize(L + V);',
    '    float dif = clamp(dot(n, L), 0.0, 1.0);',
    '    float sky = 0.5 + 0.5 * n.y;',
    '    vec3 refl = reflect(rd, n);',
    '    vec3 env = mix(vec3(0.62, 0.52, 0.46), vec3(1.0, 0.96, 0.88), smoothstep(-0.3, 0.8, refl.y));',
    '    float fres = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 3.0);',
    '    int mi = int(r.y + 0.5);',
    '    vec3 albedo = vec3(0.9);',
    '    float metal = 0.0; float shin = 40.0;',
    '    if (mi == 0) { albedo = vec3(0.98, 0.93, 0.86); }',
    '    else if (mi == 1) { albedo = vec3(1.00, 0.84, 0.46); metal = 0.55; shin = 140.0; }',
    '    else if (mi == 2) { albedo = vec3(0.98, 0.72, 0.64); metal = 0.55; shin = 140.0; }',
    '    else if (mi == 3) { albedo = vec3(0.97, 0.95, 0.92); metal = 0.6; shin = 120.0; }',
    '    else if (mi == 4) { albedo = vec3(0.95, 0.70, 0.78); metal = 0.5; shin = 120.0; }',
    '    else if (mi == 5) { albedo = vec3(0.92, 0.74, 0.36); metal = 0.55; shin = 140.0; }',
    '    else if (mi == 6) { albedo = vec3(0.30, 0.26, 0.24); }',
    '    else if (mi == 7) { albedo = vec3(0.98, 0.94, 0.86); }',
    '    else { col = vec3(1.0, 0.86, 0.55) * 1.3; alpha = 1.0; }',
    '    if (mi < 8) {',
    '      float sp = pow(clamp(dot(n, H), 0.0, 1.0), shin);',
    '      vec3 diffuse = albedo * (vec3(1.0, 0.95, 0.88) * dif * 0.95 + vec3(0.55, 0.55, 0.62) * 0.30 * sky + vec3(0.42, 0.32, 0.26) * 0.42);',
    '      vec3 metalCol = albedo * env * (0.55 + 0.6 * fres) + albedo * sp * 1.2;',
    '      col = mix(diffuse, metalCol, metal) + vec3(1.0, 0.85, 0.6) * sp * (1.0 - metal) * 0.35;',
    '      if (mi == 0) { col *= mix(0.9, 1.0, smoothstep(0.0, 1.6, length(p.xz))); }',
    '      alpha = 1.0;',
    '    }',
    '  }',
    // blend glow for flames and light spill
    '  col += vec3(1.0, 0.7, 0.35) * glow;',
    '  alpha = max(alpha, clamp(glow, 0.0, 1.0));',

    '  col *= 1.38;',
    '  col = col / (1.0 + col * 0.35);',
    '  col = pow(col, vec3(0.92));',
    '  gl_FragColor = vec4(col * alpha, alpha);',
    '}'
  ].join('\n');

  var VERT = 'attribute vec2 aPos; varying vec2 vUv;' +
    'void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }';

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
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(prog, 'uRes');
    var uTime = gl.getUniformLocation(prog, 'uTime');
    var uYaw = gl.getUniformLocation(prog, 'uYaw');

    var quality = touch ? 0.7 : 1.0;
    var maxDpr = touch ? 1.5 : 2.0;
    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      var dpr = Math.min(window.devicePixelRatio || 1, maxDpr) * quality;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    var yawTarget = 0, yawNow = 0, vel = 0, dragging = false, lastX = 0;
    canvas.addEventListener('pointerdown', function (e) {
      dragging = true; lastX = e.clientX; vel = 0;
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = (e.clientX - lastX) * 0.008;
      lastX = e.clientX; yawTarget += dx; vel = dx;
    });
    function endDrag() { dragging = false; }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')  { yawTarget -= 0.25; e.preventDefault(); }
      if (e.key === 'ArrowRight') { yawTarget += 0.25; e.preventDefault(); }
    });

    var start = performance.now(), visible = false, rafId = 0;
    function draw(now) {
      if (!dragging) { yawTarget += vel; vel *= 0.92; }
      yawNow += (yawTarget - yawNow) * 0.12;
      gl.uniform1f(uTime, reduce ? 0.6 : (now - start) / 1000);
      gl.uniform1f(uYaw, yawNow);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (visible && !reduce && !document.hidden) rafId = requestAnimationFrame(draw);
      else rafId = 0;
    }
    function loop() { if (!rafId) rafId = requestAnimationFrame(draw); }
    gl.clearColor(0, 0, 0, 0);
    draw(performance.now());
    canvas.classList.add('is-live');

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) loop();
      }, { threshold: 0.05 }).observe(canvas);
    } else { visible = true; loop(); }
    document.addEventListener('visibilitychange', function () { if (!document.hidden && visible) loop(); });
  }

  function boot() {
    var c = document.querySelector('canvas.party3d[data-scene="party"]');
    if (c) { try { init(c); } catch (e) { /* section stays usable */ } }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
