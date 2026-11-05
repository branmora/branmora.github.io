// Interaction for components. Everything here is an enhancement: without JavaScript the
// content it touches is already readable and reachable.
(function () {
  // Figure blocks: the view links become tabs, and only the chosen view shows.
  function tabs(figure) {
    var links = Array.prototype.slice.call(figure.querySelectorAll("[data-view]"));
    var panels = figure.querySelectorAll("[data-panel]");
    if (!links.length || !panels.length) return;
    var nav = links[0].parentNode;
    nav.setAttribute("role", "tablist");
    figure.setAttribute("data-tabbed", "");

    function select(view, focus) {
      links.forEach(function (link) {
        var on = link.getAttribute("data-view") === view;
        link.setAttribute("aria-selected", String(on));
        link.setAttribute("tabindex", on ? "0" : "-1");
        if (on && focus) link.focus();
      });
      for (var i = 0; i < panels.length; i++) {
        panels[i].hidden = panels[i].getAttribute("data-panel") !== view;
      }
    }

    links.forEach(function (link, i) {
      var panel = figure.querySelector("[data-panel='" + link.getAttribute("data-view") + "']");
      link.setAttribute("role", "tab");
      if (panel) {
        link.setAttribute("aria-controls", panel.id);
        panel.setAttribute("role", "tabpanel");
      }
      link.addEventListener("click", function (event) {
        event.preventDefault();
        select(link.getAttribute("data-view"), false);
      });
      link.addEventListener("keydown", function (event) {
        var step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
        if (event.key === "Home") step = -i;
        if (event.key === "End") step = links.length - 1 - i;
        if (step === undefined) return;
        event.preventDefault();
        var next = links[(i + step + links.length) % links.length];
        select(next.getAttribute("data-view"), true);
      });
    });
    select(links[0].getAttribute("data-view"), false);
  }

  function start() {
    var figures = document.querySelectorAll("[data-figure]");
    for (var i = 0; i < figures.length; i++) tabs(figures[i]);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
