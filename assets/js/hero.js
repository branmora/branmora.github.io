// Home's hero (spec 010, #151): the sentence's last words rotate through the topics that have
// something filed. Without this script, or with reduced motion, the first topic shows and the
// others stay `hidden`, so the sentence never changes. With motion allowed the words take turns
// every few seconds: the resting ones are `aria-hidden` and out of the tab order, so assistive
// technology reads one sentence and is not told of each change (no live region).
//
// The sentence and the live visual move together (spec 016, #175): the row of the shown topic
// (`[data-live] [data-topic]`) carries `data-current`, and the live visual carries `data-linked`, so
// the other rows dim. Pointing at a row's name or one of its marks, or focusing a mark, sets the
// sentence to that row's topic and holds it; leaving resumes the rotation (after a focus hold, from
// the topic shown before it). The rotation pauses
// only while the reader points at or focuses the sentence, and while the page is hidden.
(function () {
  var EVERY = 3500;
  var hero = document.querySelector("[data-hero]");
  var rotor = hero && hero.querySelector("[data-rotating]");
  if (!rotor) return;
  var words = Array.prototype.slice.call(rotor.querySelectorAll("a[data-word]"));
  if (words.length < 2) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var line = rotor.closest(".hero-line") || rotor;
  var live = hero.querySelector("[data-live]");
  var rows = live ? Array.prototype.slice.call(live.querySelectorAll("[data-topic]")) : [];
  var current = 0;
  var timer = null;
  var held = { pointer: false, focus: false, row: null, rowFocus: null };
  var before = -1; // the topic shown before focus entered the rows
  var skip = -1; // the topic just held, which the next step passes over

  function mark() {
    var topic = words[current].getAttribute("data-word");
    rows.forEach(function (r) { r.toggleAttribute("data-current", r.getAttribute("data-topic") === topic); });
  }

  function rest(word, on) {
    word.hidden = false;
    if (on) {
      word.removeAttribute("aria-hidden");
      word.removeAttribute("tabindex");
    } else {
      word.setAttribute("aria-hidden", "true");
      word.setAttribute("tabindex", "-1");
    }
  }

  function settle() {
    rotor.classList.remove("is-rolling");
    Array.prototype.forEach.call(rotor.querySelectorAll(".hero-ghost"), function (g) { g.remove(); });
    words.forEach(function (w) { w.classList.remove("is-arriving"); });
  }

  function step() {
    var next = (current + 1) % words.length;
    if (next === skip && words.length > 2) next = (next + 1) % words.length;
    skip = -1;
    go(next);
  }

  function go(to) {
    if (to === current || to < 0) return;
    settle();
    var old = words[current];
    current = to;
    var next = words[current];
    var ghost = document.createElement("span");
    ghost.className = "hero-ghost";
    ghost.setAttribute("aria-hidden", "true");
    ghost.textContent = old.textContent;
    rest(old, false);
    rest(next, true);
    rotor.classList.add("is-rolling");
    rotor.appendChild(ghost);
    void next.offsetWidth; // restart the arrival if this word arrived before
    next.classList.add("is-arriving");
    next.addEventListener("animationend", settle, { once: true });
    mark();
  }

  function running() {
    return !reduce.matches && !held.pointer && !held.focus && !held.row && !held.rowFocus && !document.hidden;
  }

  function update() {
    if (running() && !timer) {
      timer = setInterval(step, EVERY);
    } else if (!running() && timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function start() {
    words.forEach(function (w, i) { rest(w, i === current); });
    if (live) live.setAttribute("data-linked", "");
    mark();
    update();
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    settle();
    words.forEach(function (w, i) {
      w.removeAttribute("aria-hidden");
      w.removeAttribute("tabindex");
      w.hidden = i !== current;
    });
    if (live) live.removeAttribute("data-linked");
    rows.forEach(function (r) { r.removeAttribute("data-current"); });
  }

  // The row under the pointer or focus: its name or one of its marks, never the axis or the gaps.
  function rowOf(target) {
    var part = target && target.closest && target.closest(".live-topic, .live-mark");
    return part ? part.closest("[data-topic]") : null;
  }

  function hold(row) {
    if (!row || reduce.matches) return;
    var topic = row.getAttribute("data-topic");
    go(words.findIndex(function (w) { return w.getAttribute("data-word") === topic; }));
  }

  line.addEventListener("pointerenter", function () { held.pointer = true; update(); });
  line.addEventListener("pointerleave", function () { held.pointer = false; update(); });
  line.addEventListener("focusin", function () { held.focus = true; update(); });
  line.addEventListener("focusout", function (e) {
    if (!line.contains(e.relatedTarget)) { held.focus = false; update(); }
  });
  if (live) {
    live.addEventListener("pointerover", function (e) {
      var row = rowOf(e.target);
      if (row === held.row) return;
      held.row = row;
      hold(row);
      update();
    });
    live.addEventListener("pointerleave", function () { held.row = null; update(); });
    live.addEventListener("focusin", function (e) {
      var row = rowOf(e.target);
      if (row && !held.rowFocus) before = current;
      held.rowFocus = row;
      hold(row);
      update();
    });
    // Leaving the rows by keyboard returns the sentence to the topic it showed before, whose link
    // the reader has already passed in the tab order. The rotation resumes from there, passing over
    // the topic just held, which the reader has seen.
    live.addEventListener("focusout", function (e) {
      if (rowOf(e.relatedTarget)) return;
      held.rowFocus = null;
      if (before >= 0 && !held.row && before !== current) { skip = current; go(before); }
      before = -1;
      update();
    });
  }
  document.addEventListener("visibilitychange", update);
  reduce.addEventListener("change", function () { if (reduce.matches) stop(); else start(); });

  if (!reduce.matches) start();
})();
