/* Loads heavy extras after the page is usable, so they do not slow the first view.
 * - Hero video: starts after the page has loaded (the poster image shows first). Skipped on Data Saver and reduced motion.
 * - Signature video: starts only when it scrolls into view.
 * - Wonder mascot (buddy.js + avatar): loaded after the page has loaded and the browser is idle.
 */
(function () {
  'use strict';
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var conn = navigator.connection || {};
  var saveData = !!conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
  var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 600); };

  function play(v) { var p = v.play(); if (p && p.catch) p.catch(function () { /* autoplay blocked: poster stays */ }); }

  function videos() {
    if (reduce || saveData) return;
    var hero = document.querySelector('.hero-video');
    if (hero) play(hero);
    var sig = document.querySelector('.sig-bg-video');
    if (!sig) return;
    if (!('IntersectionObserver' in window)) { play(sig); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { play(sig); } else { sig.pause(); }
      });
    }, { rootMargin: '200px 0px' });
    io.observe(sig);
  }

  function mascot() {
    if (reduce || saveData) return;
    try { import('./buddy.js').catch(function () { /* mascot is optional */ }); } catch (e) { /* old browser: no mascot */ }
  }

  function start() { videos(); idle(mascot); }
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
})();
