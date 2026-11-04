// Home's live visual (spec 010, #152): the dot plot is whole without this script. With it, the
// marks spring into place left to right once, unless the reader prefers reduced motion, and
// pointing at or focusing a mark shows a tooltip with its date or years and its title. The
// tooltip is aria-hidden: each mark's link is already named by its title.
(function () {
  var live = document.querySelector("[data-live]");
  if (!live) return;
  var marks = Array.prototype.slice.call(live.querySelectorAll(".live-mark"));
  var tip = live.querySelector(".live-tip");
  if (!marks.length) return;
  // The tooltip below replaces the browser's own, which the title attribute gives without script.
  marks.forEach(function (m) { m.removeAttribute("title"); });

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var dots = marks.map(function (m) { return { mark: m, x: m.querySelector(".live-dot").getBoundingClientRect().left }; });
    dots.sort(function (a, b) { return a.x - b.x; });
    dots.forEach(function (d, i) { d.mark.style.setProperty("--live-order", String(i)); });
    live.classList.add("is-springing");
    var last = dots[dots.length - 1].mark.querySelector(".live-shape");
    last.addEventListener("animationend", function () { live.classList.remove("is-springing"); }, { once: true });
  }

  var shown = null;
  function show(mark) {
    if (!tip) return;
    if (shown) shown.classList.remove("is-shown");
    shown = mark;
    mark.classList.add("is-shown");
    tip.querySelector(".live-when").textContent = mark.getAttribute("data-when");
    tip.querySelector(".live-title").textContent = mark.getAttribute("aria-label");
    tip.hidden = false;
    var box = live.getBoundingClientRect();
    var dot = mark.querySelector(".live-dot").getBoundingClientRect();
    var cx = dot.left + dot.width / 2 - box.left;
    var left = Math.max(0, Math.min(cx - tip.offsetWidth / 2, box.width - tip.offsetWidth));
    var top = dot.top - box.top - tip.offsetHeight - 8;
    if (top < 0) top = dot.bottom - box.top + 8;
    tip.style.left = left + "px";
    tip.style.top = top + "px";
  }
  function hide(mark) {
    if (mark && mark !== shown) return;
    if (shown) shown.classList.remove("is-shown");
    shown = null;
    if (tip) tip.hidden = true;
  }
  marks.forEach(function (mark) {
    mark.addEventListener("pointerenter", function () { show(mark); });
    mark.addEventListener("pointerleave", function () { hide(mark); });
    mark.addEventListener("focus", function () { show(mark); });
    mark.addEventListener("blur", function () { hide(mark); });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") hide(); });
})();
