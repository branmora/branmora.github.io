// The theme in use: the reader's saved choice, or the system's preference. Inlined in <head> so
// data-theme and data-contrast are on <html> before the body is parsed (first paint). Without
// JavaScript the stylesheet's media queries choose instead, and the theme toggle stays hidden.
(function () {
  var root = document.documentElement;
  var axes = {
    theme: { attr: "data-theme", query: "(prefers-color-scheme: dark)", on: "dark", off: "light" },
    contrast: { attr: "data-contrast", query: "(prefers-contrast: more)", on: "high", off: "standard" }
  };

  function saved(axis) {
    try { return localStorage.getItem(axis); } catch (e) { return null; }
  }

  function save(axis, value) {
    try {
      if (value === "system") localStorage.removeItem(axis);
      else localStorage.setItem(axis, value);
    } catch (e) { /* storage blocked: the choice lasts for this page only */ }
  }

  function system(axis) {
    var a = axes[axis];
    return window.matchMedia && window.matchMedia(a.query).matches ? a.on : a.off;
  }

  function apply() {
    for (var axis in axes) {
      var choice = saved(axis);
      var value = choice === axes[axis].on || choice === axes[axis].off ? choice : system(axis);
      root.setAttribute(axes[axis].attr, value);
    }
    var buttons = document.querySelectorAll("[data-set-theme], [data-set-contrast]");
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      var axisName = b.hasAttribute("data-set-theme") ? "theme" : "contrast";
      var current = saved(axisName) || "system";
      // A palette command is an option, which states its choice as checked rather than pressed.
      var state = b.getAttribute("role") === "option" ? "aria-checked" : "aria-pressed";
      b.setAttribute(state, String(b.getAttribute("data-set-" + axisName) === current));
    }
    // The header's toggle states the theme choice in words: its text is its accessible name.
    var choice = saved("theme") || "system";
    var toggles = document.querySelectorAll("[data-theme-toggle]");
    for (var j = 0; j < toggles.length; j++) {
      var t = toggles[j];
      t.setAttribute("data-theme-choice", choice);
      var value = t.querySelector(".value");
      if (value) value.textContent = t.getAttribute("data-label-" + choice);
    }
  }

  // Each press of the toggle moves to the next choice: light, dark, system, and round again.
  var cycle = ["light", "dark", "system"];

  apply();

  for (var name in axes) {
    if (window.matchMedia) {
      var list = window.matchMedia(axes[name].query);
      if (list.addEventListener) list.addEventListener("change", apply);
    }
  }

  // Another tab changed the choice.
  window.addEventListener("storage", apply);

  document.addEventListener("DOMContentLoaded", function () {
    document.addEventListener("click", function (event) {
      var toggle = event.target.closest && event.target.closest("[data-theme-toggle]");
      if (toggle) {
        var at = cycle.indexOf(saved("theme") || "system");
        save("theme", cycle[(at + 1) % cycle.length]);
        apply();
        return;
      }
      var b = event.target.closest && event.target.closest("[data-set-theme], [data-set-contrast]");
      if (!b) return;
      if (b.hasAttribute("data-set-theme")) save("theme", b.getAttribute("data-set-theme"));
      else save("contrast", b.getAttribute("data-set-contrast"));
      apply();
    });
    var shown = document.querySelectorAll("[data-theme-toggle]");
    for (var k = 0; k < shown.length; k++) shown[k].hidden = false;
    apply();
  });
})();
