// Home's featured cards (spec 010, #153): each card's chart PNG wipes in, left to right, the first
// time it scrolls into view. Only images: home loads no chart code. Without this script, without
// IntersectionObserver, or with reduced motion, the charts are simply there.
(function () {
  if (!("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var charts = Array.prototype.slice.call(document.querySelectorAll("[data-featured] [data-reveal]"));
  if (!charts.length) return;
  var seen = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-revealed");
      seen.unobserve(entry.target);
    });
  }, { threshold: 0.35 });
  charts.forEach(function (chart) {
    chart.classList.add("is-waiting");
    seen.observe(chart);
  });
})();
