/*
 * Signature cake: the cake is built layer by layer, on a loop, while it is on screen.
 * GSAP timeline + ScrollTrigger (pauses off-screen). Reduced motion shows the finished cake.
 */
(function () {
  'use strict';
  var root = document.getElementById('assemble');
  if (!root || !window.gsap) return;
  var steps = [].slice.call(document.querySelectorAll('#assembleSteps li'));
  var layers = [].slice.call(root.querySelectorAll('.lay'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsap = window.gsap;

  if (reduce) {
    gsap.set(layers, { opacity: 1, y: 0 });
    steps.forEach(function (li) { li.classList.add('is-done'); });
    return;
  }

  function setStep(k) {
    steps.forEach(function (li, i) {
      li.classList.toggle('is-on', i === k);
      li.classList.toggle('is-done', i < k);
    });
  }

  var tl = gsap.timeline({ repeat: -1, repeatDelay: 1.6, paused: true });
  tl.set(root, { opacity: 1 });
  tl.set(layers, { opacity: 0, y: -90 });
  tl.call(setStep, [0]);
  layers.forEach(function (layer, i) {
    tl.call(setStep, [i], '+=0.25')
      .to(layer, { opacity: 1, y: 0, duration: 0.85, ease: 'back.out(1.4)' }, '<');
  });
  tl.call(setStep, [steps.length]);
  tl.to(root, { opacity: 0.0, duration: 0.6, delay: 1.1, ease: 'power2.in' });

  if (window.ScrollTrigger) {
    window.ScrollTrigger.create({
      trigger: '#signature',
      start: 'top 85%',
      end: 'bottom 15%',
      onToggle: function (self) { if (self.isActive) tl.play(); else tl.pause(); }
    });
  } else {
    tl.play();
  }
})();
