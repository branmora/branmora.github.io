// j and k through the ls -l lists of the page, one after another (spec 006; a topic view lists its
// projects after its posts and notes, spec 011). The selection is focus: j moves it to the next row's
// title link and k to the previous, so the row shows the accent bar the list draws on
// :focus-within, and Enter opens it as Enter opens any focused link. With focus outside the list,
// j starts at the first row and k at the last; at either end the key stops.
(function () {
  function start() {
    var lists = document.querySelectorAll("main .ls");
    if (!lists.length || !window.siteKeys) return;
    var hints = document.querySelectorAll("[data-list-keys]");
    for (var i = 0; i < hints.length; i++) hints[i].hidden = false;

    function rows() {
      var found = [];
      for (var l = 0; l < lists.length; l++) {
        found = found.concat(Array.prototype.filter.call(lists[l].children, function (li) { return li.querySelector("a[href]"); }));
      }
      return found;
    }

    function move(step) {
      var all = rows();
      if (!all.length) return;
      var at = -1;
      for (var i = 0; i < all.length; i++) if (all[i].contains(document.activeElement)) at = i;
      var next = at < 0 ? (step > 0 ? 0 : all.length - 1) : Math.min(all.length - 1, Math.max(0, at + step));
      var link = all[next].querySelector("a[href]");
      link.focus();
      link.scrollIntoView({ block: "nearest" });
    }

    window.siteKeys.bind(window.siteKeys.plain("j"), function () { move(1); });
    window.siteKeys.bind(window.siteKeys.plain("k"), function () { move(-1); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
