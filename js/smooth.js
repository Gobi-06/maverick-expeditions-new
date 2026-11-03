// Smooth, inertia scrolling (Lenis) — desktop mouse/trackpad only.
// On iPhone, iPad and Android we keep the browser's native momentum scrolling,
// which is the smoothest possible on iOS and keeps rubber-band / swipe-back gestures.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desktop = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (reduce || !desktop || typeof Lenis === 'undefined') return;
  var lenis = new Lenis({
    duration: 1.2,
    easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
    smoothWheel: true,
    wheelMultiplier: 0.9,
    anchors: { offset: -76 },
  });
  window.lenis = lenis;
  function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
  var stage = document.getElementById('ringstage');
  if (stage) stage.setAttribute('data-lenis-prevent-touch', '');
})();
