// The site's one keyboard listener (spec 006). Features bind keys here instead of listening on
// the document themselves, so every binding shares one guard: no key acts while the reader types
// in a field or while a modal dialog (the palette) is open. A binding made with whileTyping still
// acts in a field, as Cmd-K and Ctrl-K do.
window.siteKeys = (function () {
  var bindings = [];

  function typing(target) {
    return !!(target && target.closest && target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])"));
  }

  document.addEventListener("keydown", function (event) {
    if (event.defaultPrevented || event.altKey || event.isComposing) return;
    if (document.querySelector("dialog[open]")) return;
    var inField = typing(event.target);
    for (var i = 0; i < bindings.length; i++) {
      var b = bindings[i];
      if ((inField && !b.whileTyping) || !b.matches(event)) continue;
      if (b.run(event) !== false) event.preventDefault();
      return;
    }
  });

  return {
    // matches(event) says whether the key is this binding's; run(event) acts, and returns false
    // to leave the key to the browser.
    bind: function (matches, run, options) {
      bindings.push({ matches: matches, run: run, whileTyping: !!(options && options.whileTyping) });
    },
    // A plain key, with no Ctrl, Cmd, or Alt held.
    plain: function (key) {
      return function (event) { return event.key === key && !event.ctrlKey && !event.metaKey; };
    }
  };
})();
