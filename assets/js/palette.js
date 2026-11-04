// The command palette (spec 006): /, Cmd-K, and Ctrl-K open it; Esc closes it and returns focus to
// where it was. Its input is a combobox over one listbox: the pieces Pagefind finds in this page's
// language, then the commands. The arrow keys move the selection, Enter or a click runs it.
// Pagefind's script and index are imported on the first opening, never before.
(function () {
  var MAX_RESULTS = 8;

  function start() {
    var dialog = document.querySelector("[data-palette]");
    if (!dialog || typeof dialog.showModal !== "function") return;
    var input = dialog.querySelector("input");
    var list = dialog.querySelector("[role='listbox']");
    var status = dialog.querySelector("[data-palette-status]");
    var commands = Array.prototype.slice.call(list.querySelectorAll("[data-palette-command]"));
    var returnTo = null;
    var pagefind = null;
    var asked = 0;

    var openers = document.querySelectorAll("[data-palette-open]");
    for (var i = 0; i < openers.length; i++) {
      openers[i].hidden = false;
      openers[i].addEventListener("click", function (event) { open(event.currentTarget); });
    }

    function options() {
      return Array.prototype.slice.call(list.querySelectorAll("[role='option']")).filter(function (o) {
        return !o.parentNode.hidden;
      });
    }

    function select(option) {
      var all = list.querySelectorAll("[role='option']");
      for (var i = 0; i < all.length; i++) all[i].removeAttribute("aria-selected");
      if (!option) {
        input.removeAttribute("aria-activedescendant");
        return;
      }
      option.setAttribute("aria-selected", "true");
      input.setAttribute("aria-activedescendant", option.id);
      option.scrollIntoView({ block: "nearest" });
    }

    function selected() {
      var id = input.getAttribute("aria-activedescendant");
      return id ? document.getElementById(id) : null;
    }

    function move(step) {
      var all = options();
      if (!all.length) return;
      var at = all.indexOf(selected());
      select(all[at < 0 ? (step > 0 ? 0 : all.length - 1) : (at + step + all.length) % all.length]);
    }

    function loadPagefind() {
      if (!pagefind) {
        pagefind = import(dialog.getAttribute("data-pagefind")).then(function (pf) {
          return Promise.resolve(pf.options({ baseUrl: dialog.getAttribute("data-base") })).then(function () {
            pf.init();
            return pf;
          });
        });
        pagefind.catch(function () { /* reported when a search needs it */ });
      }
      return pagefind;
    }

    function say(text) {
      status.textContent = text;
      status.hidden = !text;
    }

    function clearResults() {
      var old = list.querySelectorAll("[data-palette-result]");
      for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
    }

    function filterCommands(query) {
      var q = query.toLowerCase();
      commands.forEach(function (li) {
        li.hidden = q !== "" && li.textContent.toLowerCase().indexOf(q) < 0;
      });
    }

    function showResults(found) {
      clearResults();
      var first = commands[0];
      found.forEach(function (data, i) {
        var li = document.createElement("li");
        li.setAttribute("role", "none");
        li.setAttribute("data-palette-result", "");
        var a = document.createElement("a");
        a.setAttribute("role", "option");
        a.setAttribute("tabindex", "-1");
        a.id = "palette-result-" + i;
        a.href = data.url;
        var kind = document.createElement("span");
        kind.className = "ls-kind";
        kind.textContent = (data.meta && data.meta.kind) || "";
        var title = document.createElement("span");
        title.className = "palette-title";
        title.textContent = (data.meta && data.meta.title) || data.url;
        a.appendChild(kind);
        a.appendChild(document.createTextNode(" "));
        a.appendChild(title);
        li.appendChild(a);
        list.insertBefore(li, first);
      });
    }

    function search() {
      var query = input.value.trim();
      var ticket = ++asked;
      filterCommands(query);
      if (!query) {
        clearResults();
        say("");
        select(options()[0]);
        return;
      }
      say(dialog.getAttribute("data-searching"));
      select(options()[0]);
      loadPagefind().then(function (pf) {
        return pf.search(query);
      }).then(function (search) {
        if (ticket !== asked) return null;
        return Promise.all(search.results.slice(0, MAX_RESULTS).map(function (r) { return r.data(); }));
      }).then(function (found) {
        if (!found || ticket !== asked) return;
        showResults(found);
        say(found.length ? "" : dialog.getAttribute("data-no-match").replace("{query}", query));
        select(options()[0]);
      }, function () {
        if (ticket !== asked) return;
        clearResults();
        say(dialog.getAttribute("data-unavailable"));
        select(options()[0]);
      });
    }

    function open(from) {
      if (dialog.open) return;
      returnTo = from || document.activeElement;
      input.value = "";
      clearResults();
      filterCommands("");
      say("");
      dialog.showModal();
      input.focus();
      select(options()[0]);
      loadPagefind();
    }

    function close() {
      if (dialog.open) dialog.close();
    }

    dialog.addEventListener("close", function () {
      var back = returnTo;
      returnTo = null;
      if (back && back.focus && document.contains(back)) back.focus();
    });

    // A click on the scrim, outside the palette, closes it.
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) close();
    });

    // A command runs, then the palette closes; a link navigates as links do.
    list.addEventListener("click", function (event) {
      var option = event.target.closest && event.target.closest("[role='option']");
      if (option && option.tagName === "BUTTON") close();
    });

    input.addEventListener("input", search);

    dialog.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        move(event.key === "ArrowDown" ? 1 : -1);
      } else if (event.key === "Enter" && event.target === input) {
        var option = selected();
        if (!option) return;
        event.preventDefault();
        option.click();
      }
    });

    // The keys that open it, through the site's one key listener (keys.js). Cmd-K and Ctrl-K
    // work from a field too; / is text there.
    var keys = window.siteKeys;
    if (keys) {
      keys.bind(function (event) {
        return (event.metaKey || event.ctrlKey) && !event.shiftKey && (event.key === "k" || event.key === "K");
      }, function () { open(); }, { whileTyping: true });
      keys.bind(keys.plain("/"), function () { open(); });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
