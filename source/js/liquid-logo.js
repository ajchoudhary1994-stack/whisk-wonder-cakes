/*
 * Liquid logo intro for the preloader.
 * Uses the liquid-metal fragment shader from the liquid-logo project (fragment-shader.glsl), run on plain WebGL
 * (no three.js). The shader is bundled as text at build time. Runs about 2 seconds, then hands over to the crisp logo.
 */
import FRAG from '../shaders/liquid-logo.glsl';

(function () {
  'use strict';
  var img = document.querySelector('.preloader-logo');
  if (!img) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var touch = window.matchMedia('(pointer: coarse)').matches;

  function start() {
    var rect = img.getBoundingClientRect();
    if (!rect.width) return;
    var canvas = document.createElement('canvas');
    canvas.className = 'liquid-logo';
    canvas.setAttribute('aria-hidden', 'true');
    var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false });
    if (!gl) return;

    function compile(type, src) {
      var sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh);
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    }
    var vs = compile(gl.VERTEX_SHADER, 'attribute vec2 aVertexPosition; void main(){ gl_Position = vec4(aVertexPosition, 0.0, 1.0); }');
    var fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'aVertexPosition');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    // Logo texture
    var tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Parameters: the liquid-logo project's default values
    var U = function (n) { return gl.getUniformLocation(prog, n); };
    var dpr = Math.min(window.devicePixelRatio || 1, touch ? 1 : 1.5);
    canvas.style.left = rect.left + 'px';
    canvas.style.top = rect.top + 'px';
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.uniform2f(U('u_resolution'), canvas.width, canvas.height);
    gl.uniform1f(U('u_speed'), 2.2);
    gl.uniform1f(U('u_iterations'), touch ? 8 : 13);
    gl.uniform1f(U('u_scale'), 0.05);
    gl.uniform1f(U('u_dotFactor'), 0.1);
    gl.uniform1f(U('u_vOffset'), 6.4);
    gl.uniform1f(U('u_intensityFactor'), 0.23);
    gl.uniform1f(U('u_expFactor'), 0.6);
    gl.uniform3f(U('u_colorFactors'), 0.0, 0.0, 0.0);
    gl.uniform1f(U('u_colorShift'), 0.0);
    gl.uniform1f(U('u_dotMultiplier'), 0.3);
    gl.uniform1f(U('u_noiseIntensity'), 4.0);
    gl.uniform1i(U('u_logoTexture'), 0);
    gl.uniform1f(U('u_logoOpacity'), 1.0);
    gl.uniform1f(U('u_logoScale'), 1.0);
    gl.uniform1f(U('u_logoAspectRatio'), img.naturalWidth / img.naturalHeight || 1);
    gl.uniform1f(U('u_logoInteractStrength'), 0.4);
    gl.uniform1i(U('u_logoBlendMode'), 0);

    var uTime = U('u_time');
    var parent = img.parentNode;
    parent.appendChild(canvas);
    img.classList.add('is-liquid');

    var t0 = performance.now(), DURATION = 2200;
    function frame(now) {
      var t = now - t0;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, t / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (t < DURATION) requestAnimationFrame(frame);
      else { canvas.remove(); img.classList.remove('is-liquid'); }
    }
    requestAnimationFrame(frame);
  }

  try {
    if (img.complete && img.naturalWidth) start();
    else img.addEventListener('load', start, { once: true });
  } catch (e) { /* the plain logo stays */ }
})();
