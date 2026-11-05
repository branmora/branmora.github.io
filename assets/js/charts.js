// Charts (spec 003): turns each chart spec on the page (a JSON file from gallery/charts/,
// inlined as <script data-chart-spec>) into an ECharts option for its preset, and draws it with
// the SVG renderer: the static canvases, 1200×1200 and 1080×1350, and the interactive view,
// which fits its container and adds tooltips, series toggles and zoom. On a post or note page
// (spec 005) it draws each figure's ready-made option ([data-chart-option]) in the same view.
//
// - Every size and color comes from the chart tokens, inlined as #chart-tokens. Options are
//   built from the light set of the page's contrast (data-contrast on <html>). On a dark page
//   (data-theme="dark") the interactive view maps each color to its dark counterpart by token
//   role and draws with the dark theme; the static canvases stay on light paper (DECISIONS/012).
// - Options are plain data, no functions, so the same option renders on a server.
// - Text is laid out for the canvas, not the screen: nothing is under the static text floor,
//   and the title block, plot and footer are measured so no text leaves the canvas.
(function () {
  "use strict";

  var main = document.querySelector("[data-chart-themes]");
  var tokensEl = document.getElementById("chart-tokens");
  if (!main || !tokensEl || !window.echarts) {
    // Without the library every figure keeps its PNG, so the charts count as drawn (fallen back).
    if (main) {
      var html = document.documentElement;
      var lvl0 = html.getAttribute("data-contrast") === "high" ? "high" : "standard";
      html.setAttribute("data-charts-drawn", html.getAttribute("data-theme") === "dark" ? "dark-" + lvl0 : lvl0);
    }
    return;
  }
  var T = JSON.parse(tokensEl.textContent);
  var themeUrls = JSON.parse(main.getAttribute("data-chart-themes"));
  var keys = JSON.parse(main.getAttribute("data-chart-keys"));
  var root = document.documentElement;

  function tok(path) {
    var v = T["chart." + path];
    if (v === undefined) throw new Error("no chart token " + path);
    return v;
  }

  // The light set of the page's contrast level: what every option is built from.
  function level() {
    return root.getAttribute("data-contrast") === "high" ? "high" : "standard";
  }

  // The set an interactive chart draws in: the light set, or its dark counterpart on a dark page.
  function pageLevel() {
    return root.getAttribute("data-theme") === "dark" ? "dark-" + level() : level();
  }

  // Light color -> the color of the same role in another set: chart.<group>.<from>.<role> is drawn
  // as chart.<group>.<to>.<role>. `scales` keeps only the scale groups (categorical, sequential,
  // diverging) when true, only the others when false, and every group when undefined.
  var SCALES = { categorical: true, sequential: true, diverging: true };
  var setMaps = {};
  function setMap(from, to, scales) {
    var name = from + ">" + to + ">" + scales;
    if (setMaps[name]) return setMaps[name];
    var map = {};
    Object.keys(T).forEach(function (key) {
      var parts = key.split(".");
      var i = parts.indexOf(from);
      if (i < 0 || typeof T[key] !== "string" || T[key].charAt(0) !== "#") return;
      if (scales !== undefined && !!SCALES[parts[1]] !== scales) return;
      parts[i] = to;
      var color = T[parts.join(".")];
      if (typeof color === "string") map[T[key].toLowerCase()] = color;
    });
    return (setMaps[name] = map);
  }

  // Light color -> dark color. The tokens map no light color to two dark ones
  // (tests/unit/test_chart_dark_map.py), so an option carrying only light-set token colors
  // has exactly one dark rendering in its own set's dark counterpart.
  function darkMap(light) {
    return setMap(light, "dark-" + light);
  }

  // A ready-made option is built from one light set, standard or high (CONTENT.md), which need not
  // be the page's. The set is the one most of its colors belong to only (the two sets share some
  // colors). Each color is drawn in the set the page draws in (`theme`, from pageLevel): from the
  // page's own light set, as it is or in its dark counterpart; from the other light set, as the
  // token of the same role in the page's set. Within a set one color can hold a role and a scale
  // step (the standard highlight is also a step of the purple ramp), so such a color is read as a
  // scale step when the option draws a scale (a visualMap, as a map does) and as a role otherwise.
  function lightSetOf(option, lvl) {
    var only = function (from, to) {
      var other = setMap(to, to);
      return Object.keys(setMap(from, from)).filter(function (c) { return !other[c]; });
    };
    var count = { standard: 0, high: 0 };
    var sets = { standard: only("standard", "high"), high: only("high", "standard") };
    (function walk(node) {
      if (typeof node === "string") {
        var c = node.toLowerCase();
        Object.keys(sets).forEach(function (s) { if (sets[s].indexOf(c) >= 0) count[s] += 1; });
      } else if (node && typeof node === "object") {
        Object.keys(node).forEach(function (k) { walk(node[k]); });
      }
    })(option);
    return count.standard === count.high ? lvl : (count.standard > count.high ? "standard" : "high");
  }

  function pageMap(option, lvl, theme) {
    var from = lightSetOf(option, lvl);
    if (from === lvl) return theme === lvl ? {} : darkMap(lvl);
    var scale = !!option.visualMap;
    var map = {};
    [setMap(from, theme, !scale), setMap(from, theme, scale)]
      .forEach(function (m) { Object.keys(m).forEach(function (c) { map[c] = m[c]; }); });
    return map;
  }

  function toDark(node, map) {
    if (typeof node === "string") return map[node.toLowerCase()] || node;
    if (Array.isArray(node)) return node.map(function (v) { return toDark(v, map); });
    if (node && typeof node === "object") {
      var out = {};
      Object.keys(node).forEach(function (k) { out[k] = toDark(node[k], map); });
      return out;
    }
    return node;
  }

  // --- Measuring text the way the canvas will draw it -------------------------------------

  var measure = document.createElement("canvas").getContext("2d");

  function font(weight, size, family) {
    return weight + " " + size + "px " + family;
  }

  function textWidth(text, f) {
    measure.font = f;
    return measure.measureText(text).width;
  }

  // Lines of a text wrapped at spaces to `max` px, greedily.
  function greedy(words, f, max) {
    var lines = [];
    var line = "";
    words.forEach(function (w) {
      var next = line ? line + " " + w : w;
      if (line && textWidth(next, f) > max) {
        lines.push(line);
        line = w;
      } else {
        line = next;
      }
    });
    lines.push(line);
    return lines;
  }

  // A text broken into lines with "\n", balanced like CSS text-wrap: balance: the same number of
  // lines as filling to `max` takes, at the narrowest width that still gives that number. Breaks
  // fall only at plain spaces, so a no-break space keeps "2015 = 100" together.
  function wrap(text, f, max) {
    var words = String(text).split(" ");
    var count = greedy(words, f, max).length;
    var lo = 0, hi = max;
    while (hi - lo > 1) {
      var mid = (lo + hi) / 2;
      if (greedy(words, f, mid).length > count) lo = mid; else hi = mid;
    }
    return greedy(words, f, hi).join("\n");
  }

  // The layout asks ECharts how tall a part is: a hidden chart of the canvas's size draws the
  // part alone, and the drawn text boxes give its exact height.
  function drawnHeight(W, H, option) {
    var probe = document.createElement("div");
    probe.style.cssText = "position:absolute;left:-100000px;top:0;width:" + W + "px;height:" + H + "px";
    document.body.appendChild(probe);
    var chart = echarts.init(probe, null, { renderer: "svg" });
    chart.setOption(Object.assign({ animation: false }, option));
    var origin = probe.getBoundingClientRect();
    var bottom = 0;
    [].forEach.call(probe.querySelectorAll("svg text"), function (t) {
      bottom = Math.max(bottom, t.getBoundingClientRect().bottom - origin.top);
    });
    chart.dispose();
    probe.remove();
    return bottom;
  }

  // 1,234.5 in both languages, with a typographic minus (DECISIONS/005). Without `digits`, the
  // number keeps the precision its data carries, as the table and the tooltip write it.
  function number(value, digits) {
    var places = digits === undefined ? { maximumFractionDigits: 20 } : { minimumFractionDigits: digits, maximumFractionDigits: digits };
    var s = Math.abs(value).toLocaleString("en-US", places);
    return value < 0 ? "−" + s : s;
  }

  // --- The parts every static canvas shares -----------------------------------------------

  function frame(spec, preset, lvl) {
    var W = tok("static." + preset + ".width");
    var H = tok("static." + preset + ".height");
    var m = tok("static.margin");
    var gap = tok("static.gap");
    var size = {
      title: tok("static.text.title"),
      subtitle: tok("static.text.subtitle"),
      label: tok("static.text.label"),
      axis: tok("static.text.axis"),
      footer: tok("static.text.footer")
    };
    var sans = tok("font.text");
    var mono = tok("font.footer");
    var ink = {
      text: tok("ink." + lvl + ".text"),
      muted: tok("ink." + lvl + ".muted"),
      grid: tok("ink." + lvl + ".grid"),
      baseline: tok("ink." + lvl + ".baseline")
    };
    var inner = W - 2 * m;
    var lh = { title: Math.round(size.title * 1.2), subtitle: Math.round(size.subtitle * 1.3), footer: Math.round(size.footer * 1.4) };
    var titleGap = Math.round(size.subtitle * 0.5);
    var title = [{
      text: wrap(spec.title, font(tok("weight.title"), size.title, sans), inner),
      subtext: wrap(spec.subtitle, font(tok("weight.text"), size.subtitle, sans), inner),
      left: m, top: m, padding: 0, itemGap: titleGap,
      textStyle: { color: ink.text, fontFamily: sans, fontSize: size.title, fontWeight: tok("weight.title"), lineHeight: lh.title },
      subtextStyle: { color: ink.muted, fontFamily: sans, fontSize: size.subtitle, fontWeight: tok("weight.text"), lineHeight: lh.subtitle }
    }];
    var top = drawnHeight(W, H, { title: title }) + gap;

    // The footer: key: value lines in the mono voice, stacked up from the bottom margin.
    var entries = [];
    ["n", "base", "method", "note"].forEach(function (key) {
      if (spec[key]) entries.push(keys[key] + ": " + spec[key]);
    });
    entries.push(keys.source + ": " + spec.source);
    var footStyle = function (text) {
      return { text: wrap(text, font(tok("weight.text"), size.footer, mono), inner), fill: ink.muted, fontFamily: mono,
               fontSize: size.footer, fontWeight: tok("weight.text"), lineHeight: lh.footer };
    };
    var heights = entries.map(function (text) {
      return Math.ceil(drawnHeight(W, H, { graphic: [{ type: "text", left: 0, top: 0, style: footStyle(text) }] }));
    });
    var footerH = heights.reduce(function (a, b) { return a + b; }, 0);
    var y = H - m - footerH;
    var graphic = entries.map(function (text, i) {
      var g = { type: "text", left: m, top: y, silent: true, style: footStyle(text) };
      y += heights[i];
      return g;
    });

    var s = tok("static.scale");
    return {
      W: W, H: H, m: m, gap: gap, size: size, sans: sans, ink: ink, inner: inner, s: s, pad: 16,
      plotTop: top, plotBottom: m + footerH + gap,
      rule: tok("mark.rule") * s,
      option: {
        backgroundColor: tok("surface." + lvl),
        animation: false,
        legend: { show: false },
        tooltip: { show: false },
        aria: { enabled: false },
        title: title,
        graphic: graphic
      }
    };
  }

  // --- The interactive view's frame --------------------------------------------------------
  // The title, subtitle and footer are HTML around the chart (only the static canvases become
  // PNGs), so the plot takes the whole container. Sizes are the interactive tokens; the zoom
  // slider, when there is one, sits under the plot.

  function interactiveFrame(spec, el, lvl, zoom) {
    var W = el.clientWidth;
    var m = tok("interactive.margin");
    var narrow = W < tok("interactive.narrow");
    var slider = zoom ? tok("interactive.slider") : 0;
    var H = Math.round(Math.min(Math.max(W * 0.66, tok("interactive.height.min")), tok("interactive.height.max"))) + (zoom ? slider + m : 0);
    var axis = tok("interactive.text.axis");
    var f = {
      W: W, H: H, m: m, gap: m, s: 1, pad: m, interactive: true, narrow: narrow, slider: slider,
      size: { label: narrow ? axis : tok("interactive.text.label"), axis: axis },
      sans: tok("font.text"),
      ink: {
        text: tok("ink." + lvl + ".text"), muted: tok("ink." + lvl + ".muted"),
        grid: tok("ink." + lvl + ".grid"), baseline: tok("ink." + lvl + ".baseline")
      },
      plotTop: m + axis, plotBottom: m + (zoom ? slider + m : 0),
      rule: tok("mark.rule"),
      option: { backgroundColor: tok("surface." + lvl), animation: false, aria: { enabled: false } }
    };
    // A kind may set its own height from its width (small multiples stack rows of panels).
    if (kinds[spec.kind].height) f.H = Math.round(kinds[spec.kind].height(spec, f));
    return f;
  }

  function axisText(f, color) {
    return { color: color || f.ink.muted, fontFamily: f.sans, fontSize: f.size.axis, fontWeight: tok("weight.text") };
  }

  function valueAxis(f, y, extra) {
    var a = {
      type: "value", min: y.min, max: y.max, interval: y.interval,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: Object.assign(axisText(f), { margin: f.pad }),
      // At zero the baseline is the line, so the gridline under it is left out.
      splitLine: { show: true, showMinLine: y.min !== 0, lineStyle: { color: f.ink.grid, width: f.rule } }
    };
    return Object.assign(a, extra || {});
  }

  function widest(texts, f) {
    return Math.max.apply(null, texts.map(function (t) { return textWidth(t, f); }));
  }

  function role(name, part, lvl) {
    return tok(name + "." + lvl + "." + part);
  }

  // --- The kinds ---------------------------------------------------------------------------

  var kinds = {};

  kinds.line = function (spec, f, lvl) {
    var labelFont = font(tok("weight.highlight"), f.size.label, f.sans);
    var axisFont = font(tok("weight.text"), f.size.axis, f.sans);
    var yLabels = [];
    for (var v = spec.y.min; v <= spec.y.max; v += spec.y.interval) yLabels.push(number(v));
    var left = f.m + widest(yLabels, axisFont) + f.pad;
    var right = f.m + widest(spec.series.map(function (s) { return s.name; }), labelFont) + f.pad;
    var zero = spec.y.min === 0;
    // Context first, so the highlight is drawn on top.
    var ordered = spec.series.filter(function (s) { return s.role !== "highlight"; })
      .concat(spec.series.filter(function (s) { return s.role === "highlight"; }));
    var o = f.option;
    o.grid = { left: left, right: right, top: f.plotTop, bottom: f.plotBottom + f.size.axis * 1.3 + f.pad * 1.5, containLabel: false };
    o.xAxis = {
      type: "category", data: spec.x, boundaryGap: false, z: 1,
      axisLine: { show: zero, lineStyle: { color: f.ink.baseline, width: f.rule } }, axisTick: { show: false },
      axisLabel: Object.assign(axisText(f), { margin: f.pad * 1.5, interval: (spec.xLabelEvery || 1) - 1 }),
      splitLine: { show: false }
    };
    o.yAxis = valueAxis(f, spec.y);
    o.series = ordered.map(function (s) {
      var lit = s.role === "highlight";
      var group = lit ? "highlight" : "context";
      return {
        type: "line", name: s.name, data: s.values, silent: true, symbol: "none", showSymbol: false,
        z: lit ? 3 : 2,
        lineStyle: { color: role(group, "mark", lvl), width: tok("mark.line." + (lit ? "highlight" : "context")) * f.s },
        itemStyle: { color: role(group, "mark", lvl) },
        emphasis: { disabled: true },
        endLabel: {
          show: true, formatter: "{a}", distance: f.pad, offset: [0, 0],
          color: role(group, "label", lvl), fontFamily: f.sans, fontSize: f.size.label,
          fontWeight: tok(lit ? "weight.highlight" : "weight.text")
        }
      };
    });
    return {
      option: o,
      // Direct labels must not collide: after a draw, spread the line ends apart. A label sits at
      // the last point in view (zoom moves it), and a hidden series leaves its place free.
      after: function (chart) {
        var current = chart.getOption();
        var zoom = (current.dataZoom || [])[0];
        var last = zoom && typeof zoom.endValue === "number" ? zoom.endValue : spec.x.length - 1;
        var selected = ((current.legend || [])[0] || {}).selected || {};
        var ends = o.series.map(function (s, i) {
          return { i: i, y: chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [last, s.data[last]])[1] };
        }).filter(function (e) { return selected[o.series[e.i].name] !== false; })
          .sort(function (a, b) { return a.y - b.y; });
        var step = f.size.label * 1.15;
        var placed = ends.map(function (e) { return e.y; });
        for (var k = 1; k < placed.length; k++) placed[k] = Math.max(placed[k], placed[k - 1] + step);
        return {
          series: o.series.map(function (s, i) {
            var at = ends.findIndex(function (e) { return e.i === i; });
            return { endLabel: { offset: [0, at < 0 ? 0 : placed[at] - ends[at].y] } };
          })
        };
      }
    };
  };

  kinds.bar = function (spec, f, lvl) {
    var nameFont = font(tok("weight.text"), f.size.axis, f.sans);
    var labels = spec.items.map(function (it) { return number(it.count) + " (" + number(it.share) + "%)"; });
    var labelFont = font(tok("weight.highlight"), f.size.label, f.sans);
    var o = f.option;
    var names = spec.items.map(function (it) { return it.name; });
    // On a narrow screen each name sits above its bar, so the bars keep the width to compare.
    var above = !!f.narrow;
    var gap = above ? 0.5 : 0.35;
    var band = (f.H - f.plotTop - f.plotBottom) / spec.items.length;
    o.grid = {
      left: above ? f.m : f.m + widest(names, nameFont) + f.pad * 1.5,
      right: f.m + widest(labels, labelFont) + f.pad,
      top: f.plotTop, bottom: f.plotBottom, containLabel: false
    };
    o.xAxis = { type: "value", min: 0, show: false };
    o.yAxis = {
      type: "category", inverse: true, data: names,
      axisLine: { show: true, lineStyle: { color: f.ink.baseline, width: f.rule } }, axisTick: { show: false },
      axisLabel: Object.assign(axisText(f, f.ink.text), above
        ? { inside: true, align: "left", verticalAlign: "bottom", margin: 0, padding: [0, 0, Math.round(band * (1 - gap) / 2) + 2, f.pad] }
        : { margin: f.pad * 1.5 }),
      splitLine: { show: false }
    };
    o.series = [{
      type: "bar", name: spec.table.head[1], silent: true, barCategoryGap: Math.round(gap * 100) + "%",
      emphasis: { disabled: true },
      data: spec.items.map(function (it, i) {
        var group = it.role === "highlight" ? "highlight" : "context";
        return {
          value: it.count,
          itemStyle: { color: role(group, "mark", lvl) },
          label: {
            show: true, position: "right", distance: f.pad, formatter: labels[i],
            color: role(group, "label", lvl), fontFamily: f.sans, fontSize: f.size.label,
            fontWeight: tok(group === "highlight" ? "weight.highlight" : "weight.text")
          }
        };
      })
    }];
    return { option: o };
  };

  kinds["dot-range"] = function (spec, f, lvl) {
    var nameFont = font(tok("weight.text"), f.size.axis, f.sans);
    var o = f.option;
    var point = tok("mark.point") * f.s * 1.25;
    o.grid = {
      left: f.m + widest(spec.rows.map(function (r) { return r.name; }), nameFont) + f.pad * 1.5,
      right: f.m + f.pad, top: f.plotTop, bottom: f.plotBottom + f.size.axis * 1.3 + f.pad, containLabel: false
    };
    o.xAxis = valueAxis(f, spec.x);
    o.yAxis = {
      type: "category", inverse: true, data: spec.rows.map(function (r) { return r.name; }), z: 1,
      // The category axis sits at the value axis's zero, so its line is the baseline there.
      axisLine: { show: spec.x.min === 0, lineStyle: { color: f.ink.baseline, width: f.rule } }, axisTick: { show: false },
      axisLabel: Object.assign(axisText(f, f.ink.text), { margin: f.pad * 1.5 }), splitLine: { show: false }
    };
    var ranges = spec.rows.map(function (r) {
      return [{ coord: [Math.min.apply(null, r.values), r.name] }, { coord: [Math.max.apply(null, r.values), r.name] }];
    });
    o.series = spec.groups.map(function (g, gi) {
      var group = g.role === "highlight" ? "highlight" : "context";
      var lowest = gi === 0;
      var series = {
        type: "scatter", name: g.name, silent: true, symbol: "circle", symbolSize: point,
        z: group === "highlight" ? 4 : 3,
        itemStyle: { color: role(group, "mark", lvl), opacity: 1 },
        emphasis: { disabled: true },
        data: spec.rows.map(function (r, i) {
          var item = { value: [r.values[gi], r.name] };
          if (i === 0) {
            // Name each group once, on the first row, beside its dot: color is never the only key.
            item.label = {
              show: true, formatter: g.name, position: r.values[gi] === Math.min.apply(null, r.values) ? "left" : "right",
              distance: f.pad, color: role(group, "label", lvl), fontFamily: f.sans, fontSize: f.size.label,
              fontWeight: tok(group === "highlight" ? "weight.highlight" : "weight.text")
            };
          }
          return item;
        })
      };
      if (lowest) {
        series.markLine = {
          silent: true, symbol: ["none", "none"], label: { show: false }, emphasis: { disabled: true },
          lineStyle: { color: role("context", "range", lvl), width: point * 0.5, type: "solid", opacity: 1 },
          data: ranges, z: 1
        };
      }
      return series;
    });
    return { option: o };
  };

  kinds.event = function (spec, f, lvl) {
    var axisFont = font(tok("weight.text"), f.size.axis, f.sans);
    var yLabels = [];
    for (var v = spec.y.min; v <= spec.y.max; v += spec.y.interval) yLabels.push(number(v));
    var last = spec.values.length - 1;
    var day = function (month) { return month + "-01"; };
    var year = 365 * 24 * 3600 * 1000;
    var o = f.option;
    var point = tok("mark.point") * f.s;
    var left = f.m + widest(yLabels, axisFont) + f.pad;
    var right = f.m + point;
    // The event's label reads to the right of its line, wrapped to the room left there.
    var t = function (month) { return Date.parse(day(month)); };
    var lineX = left + (f.W - left - right) * (t(spec.event.at) - t(spec.x[0])) / (t(spec.x[last]) - t(spec.x[0]));
    var eventText = wrap(spec.event.label, axisFont, f.W - f.m - lineX - f.pad);
    var eventLabelH = eventText.split("\n").length * Math.round(f.size.axis * 1.3) + f.pad;
    o.grid = {
      left: left, right: right,
      top: f.plotTop + eventLabelH, bottom: f.plotBottom + f.size.axis * 1.3 + f.pad * 1.5, containLabel: false
    };
    // A static canvas uses a time axis labelled by year (2022 … 2026). The interactive view uses
    // the months themselves, so its tooltip names the month as the table does (2026-10).
    var axisLine = { show: spec.y.min === 0, lineStyle: { color: f.ink.baseline, width: f.rule } };
    o.xAxis = f.interactive ? {
      type: "category", data: spec.x, boundaryGap: false, z: 1, axisLine: axisLine, axisTick: { show: false },
      axisLabel: Object.assign(axisText(f), { margin: f.pad * 1.5, interval: f.narrow ? 23 : 11 }),
      splitLine: { show: false }
    } : {
      type: "time", min: day(spec.x[0]), max: day(spec.x[last]), minInterval: year, maxInterval: year, z: 1,
      axisLine: axisLine, axisTick: { show: false },
      axisLabel: Object.assign(axisText(f), { margin: f.pad * 1.5, formatter: "{yyyy}", hideOverlap: true }),
      splitLine: { show: false }
    };
    var x = f.interactive ? function (i) { return spec.x[i]; } : function (i) { return day(spec.x[i]); };
    o.yAxis = valueAxis(f, spec.y);
    var mark = role("highlight", "mark", lvl);
    var width = tok("mark.line.highlight") * f.s;
    var complete = [], partial = [];
    spec.values.forEach(function (v, i) {
      if (i < last) complete.push([x(i), v]);
      if (i === last - 1) partial.push({ value: [x(i), v], symbol: "none" });
      if (i === last) partial.push({ value: [x(i), v] });
    });
    var annotation = role("annotation", "text", lvl);
    var text = { color: annotation, fontFamily: f.sans, fontSize: f.size.axis, fontWeight: tok("weight.text") };
    o.series = [
      {
        type: "line", name: spec.name, data: complete, silent: true, symbol: "none", showSymbol: false, z: 3,
        lineStyle: { color: mark, width: width }, itemStyle: { color: mark }, emphasis: { disabled: true },
        // The event: a graphite line with its date and name above the plot, reading to the right.
        markLine: {
          silent: true, symbol: ["none", "none"], emphasis: { disabled: true },
          lineStyle: { color: role("annotation", "line", lvl), width: tok("annotation.width") * f.s, type: "solid" },
          label: Object.assign({ show: true, position: "end", formatter: eventText, distance: f.pad, align: "left", lineHeight: Math.round(f.size.axis * 1.3) }, text),
          data: [{ xAxis: f.interactive ? spec.event.at : day(spec.event.at) }]
        }
      },
      {
        // The incomplete last period: a dashed segment ending in a hollow point, labelled. ECharts
        // draws "dashed" as a dash of four line widths and a gap of two, which is what the tokens
        // chart.annotation.incomplete.dash and .gap record for the highlight line (10px and 5px).
        type: "line", name: spec.name, data: partial, silent: true, z: 4,
        // ECharts fills an emptyCircle with #ffffff, which no dark set holds, so the interactive
        // view draws the hollow point as a circle filled with the chart surface and ringed in the
        // mark. The static canvases, always on light paper, keep emptyCircle and its 2px ring.
        symbol: f.interactive ? "circle" : "emptyCircle", symbolSize: point, showSymbol: true, showAllSymbol: true,
        lineStyle: { color: mark, width: width, type: "dashed" },
        itemStyle: f.interactive
          ? { color: tok("surface." + lvl), borderColor: mark, borderWidth: tok("mark.ring") }
          : { color: mark, borderWidth: tok("mark.ring") * f.s },
        emphasis: { disabled: true },
        label: Object.assign({ show: true, position: "bottom", distance: f.pad, align: "right", formatter: spec.incomplete.label }, text)
      }
    ];
    return { option: o };
  };

  // --- Choropleth map (spec 009, DECISIONS/013) --------------------------------------------------
  // The boundary file is already projected (Equal Earth), so ECharts draws it as plain coordinates
  // with aspectScale 1 and no projection function. It is fetched only when a figure carries its
  // URL in data-map (see ready()), and registered once. Members take the sequential scale in
  // seven classes, one token each; other land and the disputed areas keep the no-value gray
  // (chart.context.*.range), with no value, label or tooltip. Borders are a rule-wide gap in the
  // chart surface.

  var maps = {};

  function bounds(features) {
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    var walk = function (c) {
      if (typeof c[0] === "number") {
        b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1]);
        b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1]);
      } else c.forEach(walk);
    };
    features.forEach(function (f) { walk(f.geometry.coordinates); });
    return b;
  }

  function aspectOf(b) { return (b[2] - b[0]) / (b[3] - b[1]); }

  // A figure that draws a map names its boundary file (data-map) and the map: a spec's `map`, or,
  // for a piece's ready-made option, data-map-name (the name its map series draws).
  function registerMaps() {
    return Promise.all([].map.call(document.querySelectorAll("figure[data-map]"), function (figure) {
      var script = figure.querySelector("script[data-chart-spec]");
      var name = script ? JSON.parse(script.textContent).map : figure.getAttribute("data-map-name");
      return fetch(figure.getAttribute("data-map")).then(function (r) { return r.json(); }).then(function (geo) {
        if (maps[name]) return;
        echarts.registerMap(name, geo);
        var members = geo.features.filter(function (f) { return f.properties.iso_a3; });
        maps[name] = {
          bounds: bounds(geo.features),
          // The shorter side of the smallest member, in file units: what the zoom must reach.
          smallest: Math.min.apply(null, members.map(function (f) { var b = bounds([f]); return Math.min(b[2] - b[0], b[3] - b[1]); })),
          // Other land and the disputed areas: in the file with a name and no iso_a3.
          others: geo.features.filter(function (f) { return !f.properties.iso_a3; }).map(function (f) { return f.properties.name; })
        };
      });
    }));
  }

  // Where everything goes: the map and its key (seven classes and the no-value swatch). Static
  // canvases and wide screens put the key right of the map; below the side breakpoint the map is
  // stacked over it and the chart grows to fit. The map draws the region as it is, with no inset
  // or companion, so no state weighs more than its size; small states are reached by zooming the
  // interactive map.
  var MAP_SIDE = 610;
  var MAP_MIN_PX = 6;

  function mapLayout(spec, f) {
    var info = maps[spec.map];
    var aspect = aspectOf(info.bounds);
    var axisFont = font(tok("weight.text"), f.size.axis, f.sans);
    var lineH = Math.round(f.size.axis * 1.3);
    var classes = (spec.scale.max - spec.scale.min) / spec.scale.interval;
    // Each key row is one text line tall, its swatch as tall as the line, so ECharts' row and
    // the no-value row drawn below it share one pitch.
    var item = { w: Math.round(lineH * 1.2), h: lineH, gap: Math.round(f.size.axis * 0.3) };
    var labels = [];
    for (var k = 0; k < classes; k++) labels.push(number(spec.scale.min + k * spec.scale.interval) + "–" + number(spec.scale.min + (k + 1) * spec.scale.interval));
    var key = {
      labels: labels, item: item, textGap: Math.round(f.pad * 0.5), rowH: item.h + item.gap,
      w: item.w + Math.round(f.pad * 0.5) + widest(labels.concat([spec.noValue]), axisFont),
      h: (classes + 1) * (item.h + item.gap) - item.gap
    };
    var gap = f.pad * 2;
    var L = { aspect: aspect, key: key, lineH: lineH, side: !f.interactive || f.W >= MAP_SIDE };
    var plotH = f.H - f.plotTop - f.plotBottom;
    if (L.side) {
      // The map takes the plot's height, or the width the key leaves it.
      L.mapH = Math.min(plotH, (f.W - 2 * f.m - gap - key.w) / aspect);
      L.mapW = L.mapH * aspect;
      L.map = { left: f.m, top: f.plotTop + (plotH - L.mapH) / 2 };
      L.keyAt = { left: f.m + L.mapW + gap, top: f.plotTop + Math.max(0, (plotH - key.h) / 2) };
    } else {
      L.mapW = Math.min(f.W - 2 * f.m, tok("interactive.height.max") * aspect);
      L.mapH = L.mapW / aspect;
      L.map = { left: (f.W - L.mapW) / 2, top: f.plotTop };
      L.keyAt = { left: f.m, top: f.plotTop + L.mapH + gap };
      L.height = L.keyAt.top + key.h + f.plotBottom;
    }
    // The largest zoom is the one that brings the smallest member to MAP_MIN_PX across, and no
    // further, rounded up to a tenth.
    var scale = L.mapH / (info.bounds[3] - info.bounds[1]);
    L.maxZoom = Math.max(1, Math.ceil(MAP_MIN_PX / (info.smallest * scale) * 10) / 10);
    return L;
  }

  kinds.map = function (spec, f, lvl) {
    var L = mapLayout(spec, f);
    var o = f.option;
    var seq = function (k) { return tok("sequential." + lvl + "." + k); };
    var noValue = role("context", "range", lvl);
    var surface = tok("surface." + lvl);
    var text = { color: f.ink.text, fontFamily: f.sans, fontSize: f.size.axis, fontWeight: tok("weight.text") };
    o.series = [{
      type: "map", id: "main", name: spec.table.head[1], map: spec.map, aspectScale: 1, silent: true, z: 2,
      // Only the interactive view zooms and pans (see mapZoom), from its fit to L.maxZoom.
      roam: !!f.interactive, scaleLimit: { min: 1, max: L.maxZoom },
      selectedMode: false, showLegendSymbol: false, emphasis: { disabled: true }, select: { disabled: true }, label: { show: false },
      itemStyle: { areaColor: noValue, borderColor: surface, borderWidth: f.rule, opacity: 1 },
      layoutCenter: [L.map.left + L.mapW / 2, L.map.top + L.mapH / 2],
      layoutSize: L.aspect < 1 ? L.mapH : L.mapW,
      // Other land is listed with no value and no tooltip, so ECharts does not add it with an empty
      // one; the table names it under "no value".
      data: spec.values.map(function (v) { return { name: v.name, value: v.value }; })
        .concat(maps[spec.map].others.map(function (name) { return { name: name, tooltip: { show: false } }; }))
    }];
    var graphic = [];
    // The key: seven classes, highest on top, then the no-value swatch.
    var classes = L.key.labels.length;
    var pieces = L.key.labels.map(function (label, k) {
      var lo = spec.scale.min + k * spec.scale.interval, hi = lo + spec.scale.interval;
      var piece = { gte: lo, label: label, color: seq(k + 1) };
      if (k === classes - 1) piece.lte = hi; else piece.lt = hi;
      return piece;
    }).reverse();
    o.visualMap = [{
      type: "piecewise", show: true, orient: "vertical", align: "left", left: L.keyAt.left, top: L.keyAt.top, z: 5,
      pieces: pieces, itemWidth: L.key.item.w, itemHeight: L.key.item.h, itemGap: L.key.item.gap, padding: 0,
      itemSymbol: "rect", textGap: L.key.textGap, hoverLink: false, selectedMode: false,
      textStyle: text, outOfRange: { color: noValue }
    }];
    var swatchTop = L.keyAt.top + classes * L.key.rowH;
    graphic.push({
      type: "rect", left: L.keyAt.left, top: swatchTop, silent: true, z: 5,
      shape: { width: L.key.item.w, height: L.key.item.h }, style: { fill: noValue }
    });
    graphic.push({
      type: "text", left: L.keyAt.left + L.key.item.w + L.key.textGap, top: swatchTop, silent: true, z: 5,
      style: { text: spec.noValue, fill: f.ink.text, fontFamily: f.sans, fontSize: f.size.axis, fontWeight: tok("weight.text"), lineHeight: L.lineH }
    });
    // A map cannot clip to a box, so a zoomed map would run under the key. In the interactive view
    // an opaque sheet of the chart surface covers the key's side of the chart, above the map and
    // below the key, and takes the pointer there, so a hidden country shows no tooltip.
    if (f.interactive) {
      var sheet = L.side
        ? { x: L.keyAt.left - f.pad, y: 0, width: f.W - L.keyAt.left + f.pad, height: f.H }
        : { x: 0, y: L.keyAt.top - f.pad, width: f.W, height: f.H - L.keyAt.top + f.pad };
      graphic.unshift({ type: "rect", z: 3, silent: false, shape: sheet, style: { fill: surface } });
    }
    o.graphic = (o.graphic || []).concat(graphic);
    return { option: o };
  };

  // Below the side breakpoint the key sits under the map, so the chart is taller.
  kinds.map.height = function (spec, f) {
    var L = mapLayout(spec, f);
    return L.side ? f.H : L.height;
  };

  // --- Small multiples (spec 009) ----------------------------------------------------------------
  // One small line chart per series, each its own grid with its own axes, all on one scale. Each
  // panel draws its own series in the highlight, last, over every other series in the lightest
  // context gray (chart.context.*.range), and names it above the plot in the highlight label.
  // The panels reflow, never the text: three across on the square canvas and on wide screens, two
  // across on the portrait canvas and below chart.interactive.narrow. Value labels sit on the
  // first column only, and each time axis shows its first and last period, held inside the panel.

  function multiples(spec, f) {
    var axisFont = font(tok("weight.text"), f.size.axis, f.sans);
    var yLabels = [];
    for (var v = spec.y.min; v <= spec.y.max; v += spec.y.interval) yLabels.push(number(v));
    var n = spec.series.length;
    var cols = f.interactive ? (f.narrow ? 2 : 3) : (f.H > f.W ? 2 : 3);
    var rows = Math.ceil(n / cols);
    var labelW = widest(yLabels, axisFont) + f.pad;
    var colGap = f.pad * 2;
    var panelW = (f.W - 2 * f.m - labelW - (cols - 1) * colGap) / cols;
    var nameH = Math.round(f.size.label * 1.3);
    var nameGap = f.pad * 0.5;
    var xLabelH = f.size.axis * 1.3 + f.pad;
    var rowGap = f.pad * 1.5;
    var extra = nameH + nameGap + xLabelH;
    return {
      cols: cols, rows: rows, labelW: labelW, colGap: colGap, panelW: panelW, nameH: nameH, nameGap: nameGap,
      rowGap: rowGap, extra: extra,
      plotH: function (H) { return (H - f.plotTop - f.plotBottom - rows * extra - (rows - 1) * rowGap) / rows; }
    };
  }

  kinds["small-multiples"] = function (spec, f, lvl) {
    var g = multiples(spec, f);
    var plotH = g.plotH(f.H);
    var o = f.option;
    var last = spec.x.length - 1;
    var grids = [], xAxes = [], yAxes = [], series = [], names = [];
    spec.series.forEach(function (own, i) {
      var col = i % g.cols, row = Math.floor(i / g.cols);
      var left = f.m + g.labelW + col * (g.panelW + g.colGap);
      var top = f.plotTop + row * (g.extra + plotH + g.rowGap);
      grids.push({ left: left, top: top + g.nameH + g.nameGap, width: g.panelW, height: plotH, containLabel: false });
      xAxes.push({
        gridIndex: i, type: "category", data: spec.x, boundaryGap: false, z: 1,
        axisLine: { show: spec.y.min === 0, lineStyle: { color: f.ink.baseline, width: f.rule } }, axisTick: { show: false },
        axisLabel: Object.assign(axisText(f), { margin: f.pad, interval: last - 1, alignMinLabel: "left", alignMaxLabel: "right" }),
        splitLine: { show: false }
      });
      var y = valueAxis(f, spec.y, { gridIndex: i });
      y.axisLabel.show = col === 0;
      yAxes.push(y);
      // The panel's name, above its plot: the key to the highlighted line, so there is no legend.
      names.push({
        type: "text", left: left, top: top, silent: true,
        style: { text: own.name, fill: role("highlight", "label", lvl), fontFamily: f.sans, fontSize: f.size.label,
                 fontWeight: tok("weight.highlight"), lineHeight: g.nameH }
      });
      // Every other series first, in the lightest gray; the panel's own series last, on top.
      spec.series.filter(function (s) { return s !== own; }).concat([own]).forEach(function (s) {
        var lit = s === own;
        series.push({
          type: "line", name: s.name, data: s.values, xAxisIndex: i, yAxisIndex: i, silent: true,
          symbol: "none", showSymbol: false, z: lit ? 3 : 2, emphasis: { disabled: true },
          lineStyle: { color: lit ? role("highlight", "mark", lvl) : role("context", "range", lvl),
                       width: tok("mark.line." + (lit ? "highlight" : "context")) * f.s },
          itemStyle: { color: lit ? role("highlight", "mark", lvl) : role("context", "range", lvl) }
        });
      });
    });
    o.grid = grids;
    o.xAxis = xAxes;
    o.yAxis = yAxes;
    o.series = series;
    o.graphic = (o.graphic || []).concat(names);
    return { option: o };
  };

  // In the interactive view each panel's plot is about 0.6 times as tall as it is wide.
  kinds["small-multiples"].height = function (spec, f) {
    var g = multiples(spec, f);
    var plotH = g.panelW * 0.6;
    return f.plotTop + g.rows * (g.extra + plotH) + (g.rows - 1) * g.rowGap + f.plotBottom;
  };

  // --- Scatter with highlights (spec 009) ---------------------------------------------------------
  // Two measures per unit. Each group is a scatter series of {name, value: [x, y]} points: one
  // group in the highlight, drawn last, the rest in context gray. Points are opaque and ringed
  // in the chart surface, so overlaps stay apart without transparency making new colors. Only
  // the points the spec marks with a side ("left", "right", "top", "bottom") are named: the
  // author picks the points the title needs and the side that clears their neighbors.

  kinds.scatter = function (spec, f, lvl) {
    var axisFont = font(tok("weight.text"), f.size.axis, f.sans);
    var yLabels = [];
    for (var v = spec.y.min; v <= spec.y.max; v += spec.y.interval) yLabels.push(number(v));
    var lineH = Math.round(f.size.axis * 1.3);
    var o = f.option;
    var point = tok("mark.point") * f.s;
    o.grid = {
      left: f.m + widest(yLabels, axisFont) + f.pad, right: f.m + f.pad,
      // The y axis's name sits above the plot; the x axis's name under its labels.
      top: f.plotTop + lineH + f.pad,
      bottom: f.plotBottom + 2 * lineH + f.pad * 2.5, containLabel: false
    };
    var nameStyle = axisText(f);
    o.xAxis = valueAxis(f, spec.x, {
      name: spec.x.name, nameLocation: "middle", nameGap: f.pad * 2.5 + lineH, nameTextStyle: nameStyle
    });
    o.yAxis = valueAxis(f, spec.y, {
      name: spec.y.name, nameLocation: "end", nameGap: f.pad,
      nameTextStyle: Object.assign({ align: "left" }, nameStyle)
    });
    var ordered = spec.groups.filter(function (g) { return g.role !== "highlight"; })
      .concat(spec.groups.filter(function (g) { return g.role === "highlight"; }));
    o.series = ordered.map(function (g) {
      var lit = g.role === "highlight";
      var group = lit ? "highlight" : "context";
      var series = {
        type: "scatter", name: g.name, silent: true, symbol: "circle", symbolSize: point, z: lit ? 4 : 3,
        itemStyle: { color: role(group, "mark", lvl), borderColor: tok("surface." + lvl), borderWidth: tok("mark.ring") * f.s, opacity: 1 },
        emphasis: { disabled: true },
        data: g.points.map(function (pt) {
          var item = { name: pt.name, value: [pt.x, pt.y] };
          if (pt.label) {
            item.label = {
              show: true, position: pt.label, distance: f.pad * 0.75, formatter: pt.name,
              color: role(group, "label", lvl), fontFamily: f.sans, fontSize: f.size.label,
              fontWeight: tok(lit ? "weight.highlight" : "weight.text")
            };
          }
          return item;
        })
      };
      return series;
    });
    // Zero on a value axis that spans it is the baseline-ink rule, as on the estimate plots. It
    // is drawn by a series of its own, with no name and no data, so no group toggle hides it.
    if (spec.y.min < 0 && spec.y.max > 0) {
      o.series.push({
        type: "line", name: "", data: [], silent: true,
        markLine: {
          silent: true, symbol: ["none", "none"], emphasis: { disabled: true }, z: 1, label: { show: false },
          lineStyle: { color: f.ink.baseline, width: f.rule, type: "solid", opacity: 1 },
          data: [{ yAxis: 0 }]
        }
      });
    }
    return { option: o };
  };

  // --- Slope chart (spec 009) ------------------------------------------------------------------
  // Each group is a line series with two values, before and after. Every value is written at its
  // end (the value on the left; the value and the name on the right), so there is no value axis
  // and no gridline, as with bars. The value scale still starts at zero.

  // Places labels wanted at `ys` (pixels) so that neighbors are at least `step` apart, keeping
  // their order: pushed down from the top, then, if the last passes `bottom`, back up from it.
  // Returns each label's offset from where it was wanted.
  function spread(ys, step, top, bottom) {
    var order = ys.map(function (y, i) { return i; }).sort(function (a, b) { return ys[a] - ys[b]; });
    var placed = order.map(function (i) { return ys[i]; });
    for (var k = 0; k < placed.length; k++) placed[k] = Math.max(placed[k], k ? placed[k - 1] + step : top);
    for (k = placed.length - 1; k >= 0; k--) placed[k] = Math.min(placed[k], k < placed.length - 1 ? placed[k + 1] - step : bottom);
    var offsets = [];
    order.forEach(function (i, k) { offsets[i] = placed[k] - ys[i]; });
    return offsets;
  }

  kinds.slope = function (spec, f, lvl) {
    var suffix = spec.suffix || "";
    var show = function (v) { return number(v) + suffix; };
    var weightOf = function (g) { return tok(g.role === "highlight" ? "weight.highlight" : "weight.text"); };
    var lefts = spec.groups.map(function (g) { return show(g.values[0]); });
    var rights = spec.groups.map(function (g) { return show(g.values[1]) + " " + g.name; });
    var labelFont = font(tok("weight.highlight"), f.size.label, f.sans);
    var o = f.option;
    var point = tok("mark.point") * f.s;
    o.grid = {
      left: f.m + widest(lefts, labelFont) + f.pad + point / 2,
      right: f.m + widest(rights, labelFont) + f.pad + point / 2,
      top: f.plotTop + f.size.label * 0.6, bottom: f.plotBottom + f.size.axis * 1.3 + f.pad * 1.5 + f.size.label * 0.6,
      containLabel: false
    };
    o.xAxis = {
      type: "category", data: spec.x, boundaryGap: false, z: 1,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: Object.assign(axisText(f), { margin: f.pad * 1.5 + f.size.label * 0.6 }), splitLine: { show: false }
    };
    o.yAxis = { type: "value", min: spec.y.min, max: spec.y.max, show: false, splitLine: { show: false } };
    // Context first, so the highlight is drawn on top where lines cross.
    var ordered = spec.groups.filter(function (g) { return g.role !== "highlight"; })
      .concat(spec.groups.filter(function (g) { return g.role === "highlight"; }));
    var label = function (g, text, side, dy) {
      var group = g.role === "highlight" ? "highlight" : "context";
      return {
        show: true, position: side, distance: f.pad, formatter: text, offset: [0, dy || 0],
        color: role(group, "label", lvl), fontFamily: f.sans, fontSize: f.size.label, fontWeight: weightOf(g)
      };
    };
    var data = function (g, dy) {
      return [
        { value: g.values[0], label: label(g, show(g.values[0]), "left", dy && dy[0]) },
        { value: g.values[1], label: label(g, show(g.values[1]) + " " + g.name, "right", dy && dy[1]) }
      ];
    };
    o.series = ordered.map(function (g) {
      var lit = g.role === "highlight";
      var group = lit ? "highlight" : "context";
      var mark = role(group, "mark", lvl);
      return {
        type: "line", name: g.name, data: data(g), silent: true, z: lit ? 3 : 2,
        symbol: "circle", symbolSize: point, showSymbol: true, showAllSymbol: true,
        lineStyle: { color: mark, width: tok("mark.line." + (lit ? "highlight" : "context")) * f.s },
        itemStyle: { color: mark, borderColor: tok("surface." + lvl), borderWidth: tok("mark.ring") * f.s, opacity: 1 },
        emphasis: { disabled: true }
      };
    });
    return {
      option: o,
      // Labels at each end are spread apart, in order, after a draw; a hidden group frees its place.
      after: function (chart) {
        var selected = ((chart.getOption().legend || [])[0] || {}).selected || {};
        var shown = ordered.filter(function (g) { return selected[g.name] !== false; });
        var top = chart.convertToPixel({ yAxisIndex: 0 }, spec.y.max);
        var bottom = chart.convertToPixel({ yAxisIndex: 0 }, spec.y.min);
        var step = f.size.label * 1.15;
        var offsets = [0, 1].map(function (end) {
          var ys = shown.map(function (g) { return chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [end, g.values[end]])[1]; });
          return spread(ys, step, top, bottom);
        });
        return {
          series: ordered.map(function (g) {
            var at = shown.indexOf(g);
            return { data: data(g, at < 0 ? null : [offsets[0][at], offsets[1][at]]) };
          })
        };
      }
    };
  };

  // --- Estimates with intervals: coefficient and event-study plots (spec 009) -----------------
  // Both forms share one grammar. An estimate is a dot ringed in the chart surface; its interval
  // is a plain whisker (no caps) in the dot's color, drawn as a markLine segment so the option
  // stays plain data; zero, no effect, is a rule in the baseline ink, the darkest rule in the plot.
  // Each data item is [category, estimate, low, high] (coefficients: [estimate, category, ...]),
  // with named dimensions, so the default item tooltip lists the estimate and both bounds.

  function estimateParts(f, lvl) {
    return {
      point: tok("mark.point") * f.s * 1.25,
      width: tok("mark.line.highlight") * f.s,
      ring: tok("mark.ring") * f.s,
      surface: tok("surface." + lvl)
    };
  }

  function estimateSeries(spec, f, lvl, items, horizontal, extraMarks) {
    var p = estimateParts(f, lvl);
    var cat = horizontal ? 1 : 0, val = horizontal ? 0 : 1;
    var at = function (it, v) { var c = []; c[cat] = it.category; c[val] = v; return c; };
    var whiskers = items.filter(function (it) { return typeof it.low === "number"; }).map(function (it) {
      return [{ coord: at(it, it.low), lineStyle: { color: role(it.group, "mark", lvl), width: p.width, type: "solid", opacity: 1 } },
              { coord: at(it, it.high) }];
    });
    var zero = { lineStyle: { color: f.ink.baseline, width: f.rule, type: "solid", opacity: 1 } };
    zero[horizontal ? "xAxis" : "yAxis"] = 0;
    var head = spec.table.head;
    var dims = horizontal ? [head[1], head[0], head[2], head[3]] : [head[0], head[1], head[2], head[3]];
    return {
      type: "scatter", name: head[1], silent: true, symbol: "circle", symbolSize: p.point, z: 3,
      dimensions: dims.map(function (name, i) { return { name: name, type: i === cat ? "ordinal" : "float" }; }),
      encode: horizontal ? { x: 0, y: 1, tooltip: [0, 2, 3] } : { x: 0, y: 1, tooltip: [1, 2, 3] },
      emphasis: { disabled: true },
      data: items.map(function (it) {
        var value = at(it, it.estimate);
        if (typeof it.low === "number") { value[2] = it.low; value[3] = it.high; }
        var mark = role(it.group, "mark", lvl);
        var item = { value: value };
        if (it.hollow) {
          // The reference period: hollow, like the incomplete point (see kinds.event), and ringed
          // in graphite, since it marks the baseline of the estimates rather than an estimate.
          mark = role("annotation", "line", lvl);
          item.symbol = f.interactive ? "circle" : "emptyCircle";
          item.itemStyle = f.interactive
            ? { color: p.surface, borderColor: mark, borderWidth: p.ring, opacity: 1 }
            : { color: mark, borderWidth: p.ring, opacity: 1 };
        } else {
          item.itemStyle = { color: mark, borderColor: p.surface, borderWidth: p.ring, opacity: 1 };
        }
        if (it.label) item.label = it.label;
        return item;
      }),
      markLine: {
        silent: true, symbol: ["none", "none"], emphasis: { disabled: true }, z: 1, animation: false,
        label: { show: false },
        data: [zero].concat(extraMarks || [], whiskers)
      }
    };
  }

  kinds.coefficients = function (spec, f, lvl) {
    var nameFont = font(tok("weight.text"), f.size.axis, f.sans);
    var names = spec.rows.map(function (r) { return r.name; });
    var o = f.option;
    o.grid = {
      left: f.m + widest(names, nameFont) + f.pad * 1.5,
      right: f.m + f.pad, top: f.plotTop, bottom: f.plotBottom + f.size.axis * 1.3 + f.pad, containLabel: false
    };
    o.xAxis = valueAxis(f, spec.x);
    o.yAxis = {
      type: "category", inverse: true, data: names, z: 1,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: Object.assign(axisText(f, f.ink.text), { margin: f.pad * 1.5 }), splitLine: { show: false }
    };
    o.series = [estimateSeries(spec, f, lvl, spec.rows.map(function (r) {
      var lit = r.role === "highlight";
      return {
        category: r.name, estimate: r.estimate, low: r.low, high: r.high, group: lit ? "highlight" : "context",
        // The row the title is about carries its estimate, above its dot.
        label: lit ? {
          show: true, position: "top", distance: f.pad * 0.75, formatter: number(r.estimate),
          color: role("highlight", "label", lvl), fontFamily: f.sans, fontSize: f.size.label, fontWeight: tok("weight.highlight")
        } : undefined
      };
    }), true)];
    return { option: o };
  };

  kinds["event-study"] = function (spec, f, lvl) {
    var axisFont = font(tok("weight.text"), f.size.axis, f.sans);
    var yLabels = [];
    for (var v = spec.y.min; v <= spec.y.max; v += spec.y.interval) yLabels.push(number(v));
    // Periods are category names as the axis writes them (a hyphen-minus, like every ECharts
    // axis label); the table writes the typographic minus.
    var cats = spec.periods.map(function (p) { return String(p.period); });
    var start = cats.indexOf(String(spec.treatment));
    var o = f.option;
    var left = f.m + widest(yLabels, axisFont) + f.pad;
    var right = f.m + f.pad;
    // The treatment line runs through the treatment period, behind its interval; its label sits
    // above the plot and reads to its right, like an event line's. (A category axis rounds a
    // markLine's position to a period, so the line cannot sit between two periods.)
    var lineX = left + (f.W - left - right) * (start + 0.5) / cats.length;
    var lineH = Math.round(f.size.axis * 1.3);
    var startText = wrap(spec.label.treatment, axisFont, f.W - f.m - lineX - f.pad);
    o.grid = {
      left: left, right: right,
      top: f.plotTop + startText.split("\n").length * lineH + f.pad,
      bottom: f.plotBottom + f.size.axis * 1.3 + f.pad * 1.5, containLabel: false
    };
    o.xAxis = {
      type: "category", data: cats, boundaryGap: true, z: 1,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: Object.assign(axisText(f), { margin: f.pad * 1.5, interval: 0 }), splitLine: { show: false }
    };
    o.yAxis = valueAxis(f, spec.y);
    var text = { color: role("annotation", "text", lvl), fontFamily: f.sans, fontSize: f.size.axis, fontWeight: tok("weight.text") };
    var treatment = {
      xAxis: start,
      lineStyle: { color: role("annotation", "line", lvl), width: tok("annotation.width") * f.s, type: "solid", opacity: 1 },
      label: Object.assign({ show: true, position: "end", formatter: startText, distance: f.pad, align: "left", lineHeight: lineH }, text)
    };
    o.series = [estimateSeries(spec, f, lvl, spec.periods.map(function (p, i) {
      var ref = String(p.period) === String(spec.reference);
      return {
        category: cats[i], estimate: p.estimate, low: p.low, high: p.high,
        group: i >= start ? "highlight" : "context", hollow: ref,
        label: ref ? Object.assign({ show: true, position: "bottom", distance: f.pad * 0.75, formatter: spec.label.reference }, text) : undefined
      };
    }), false, [treatment])];
    return { option: o };
  };

  // --- Drawing ----------------------------------------------------------------------------------

  var ZOOMABLE = { line: true, event: true };
  // Charts whose tooltip follows the axis without zoom: each panel of small multiples lists every
  // country at the year under the pointer.
  var AXIS_TIP = { line: true, event: true, "small-multiples": true };

  // The interactive view adds what a screen can: a tooltip, series toggles (the figure's
  // buttons drive the hidden legend), and zoom on a time axis. Everything it shows is also in
  // the figure's table, and the options stay plain data.
  function interactive(built, spec, f, state) {
    var o = built.option;
    o.series.forEach(function (s) { s.silent = false; });
    o.tooltip = {
      show: true, confine: true, trigger: AXIS_TIP[spec.kind] ? "axis" : "item",
      axisPointer: { type: AXIS_TIP[spec.kind] ? "line" : "none" }
    };
    o.legend = { show: false, selected: state.selected };
    if (ZOOMABLE[spec.kind]) {
      o.dataZoom = [
        { type: "inside", xAxisIndex: 0, zoomOnMouseWheel: "shift", moveOnMouseWheel: false, moveOnMouseMove: false,
          start: state.zoom[0], end: state.zoom[1] },
        { type: "slider", xAxisIndex: 0, height: f.slider, left: o.grid.left, right: o.grid.right, bottom: f.m,
          showDetail: false, brushSelect: false, start: state.zoom[0], end: state.zoom[1] }
      ];
    }
    return built;
  }

  var states = new WeakMap();

  // --- Readiness (spec 015) -------------------------------------------------------------------
  //
  // <html data-charts-drawn="<level>"> says every chart on the page has rendered, or fallen back
  // to its PNG, for the page's chart level (pageLevel). It is removed when a change of theme or
  // contrast starts a redraw and set again, with the new level, once that redraw has rendered.
  // "Rendered" is ECharts' `finished` event: the chart has painted and nothing is left pending.
  // Nothing a reader sees depends on it.

  // Element -> { chart, done, finish }: the chart drawn into it last, and whether it has rendered.
  var drawings = new WeakMap();

  // A new chart in `el`, in the given theme, replacing any chart drawn there before. It listens
  // for `finished` before its first setOption, which may render at once.
  function fresh(el, theme) {
    var before = drawings.get(el);
    var old = echarts.getInstanceByDom(el);
    if (old) old.dispose();
    // A chart replaced before it rendered no longer holds anything up: its successor does.
    if (before) before.finish();
    var chart = echarts.init(el, "chart-" + theme, { renderer: "svg" });
    var drawing = { chart: chart };
    drawing.done = new Promise(function (resolve) {
      drawing.finish = function () {
        chart.off("finished", drawing.finish);
        resolve();
      };
    });
    chart.on("finished", drawing.finish);
    drawings.set(el, drawing);
    return chart;
  }

  // Resolves once the chart last drawn into `el` has rendered; at once when nothing was drawn there.
  function rendered(el) {
    var drawing = drawings.get(el);
    if (!drawing) return Promise.resolve();
    return drawing.done.then(function () {
      return drawings.get(el) === drawing ? undefined : rendered(el);
    });
  }

  var generation = 0;

  // Draw every chart and report the level once all have rendered; a later report supersedes it.
  function drawReported() {
    var mine = ++generation;
    var lvl = pageLevel();
    return drawAll().then(function () {
      if (mine === generation) root.setAttribute("data-charts-drawn", lvl);
    });
  }

  function draw(el) {
    var figure = el.closest("figure");
    var spec = JSON.parse(figure.querySelector("script[data-chart-spec]").textContent);
    var preset = el.closest("[data-preset]").getAttribute("data-preset");
    var lvl = level();
    var theme = lvl;
    var built;
    if (preset === "interactive") {
      var state = states.get(el) || { selected: {}, zoom: [0, 100] };
      states.set(el, state);
      var f = interactiveFrame(spec, el, lvl, ZOOMABLE[spec.kind]);
      el.style.height = f.H + "px";
      built = interactive(kinds[spec.kind](spec, f, lvl), spec, f, state);
      theme = pageLevel();
      if (theme !== lvl) built.option = toDark(built.option, darkMap(lvl));
      el.setAttribute("data-chart-theme", theme);
    } else {
      built = kinds[spec.kind](spec, frame(spec, preset, lvl), lvl);
    }
    var chart = fresh(el, theme);
    chart.setOption(built.option);
    // What `after` returns is built from the light set too, so it takes the same dark mapping.
    if (built.after && theme !== lvl) {
      var later = built.after;
      built.after = function (c) { return toDark(later(c), darkMap(lvl)); };
    }
    if (built.after) chart.setOption(built.after(chart));
    if (preset === "interactive") {
      var keep = states.get(el);
      chart.on("datazoom", function () {
        var z = chart.getOption().dataZoom[0];
        keep.zoom = [z.start, z.end];
        if (built.after) chart.setOption(built.after(chart));
      });
      chart.on("legendselectchanged", function (e) {
        keep.selected = e.selected;
        if (built.after) chart.setOption(built.after(chart));
      });
    }
    return chart;
  }

  // --- A ready-made option (a post's or note's figures.option) ------------------------------
  //
  // Drawn as it is, the way the interactive view draws a spec: the chart surface behind it, a
  // tooltip, the interactive height, and on a dark page each light-set color in its dark
  // counterpart with the dark theme (CONTENT.md, DECISIONS/012). Nothing else is added, so the
  // option linkedin-content-manager exports is the chart the page shows. The PNG beside it gives
  // way only once the chart has drawn, so a failed fetch or draw leaves the PNG in place.

  var options = {};

  function optionOf(el) {
    var url = el.getAttribute("data-chart-option");
    if (!options[url]) options[url] = fetch(url).then(function (r) {
      if (!r.ok) throw new Error("no option at " + url);
      return r.json();
    });
    return options[url];
  }

  function seriesOf(option) {
    var s = option.series || [];
    return Array.isArray(s) ? s : [s];
  }

  function drawOption(el) {
    return optionOf(el).then(function (source) {
      var frameEl = el.parentNode;
      var paper = frameEl.parentNode.querySelector(".figure-paper");
      frameEl.hidden = false;
      var lvl = level();
      var theme = pageLevel();
      var lines = seriesOf(source).length && seriesOf(source).every(function (s) { return s.type === "line"; });
      var option = JSON.parse(JSON.stringify(source));
      option.backgroundColor = tok("surface." + lvl);
      option.animation = false;
      option.aria = { enabled: false };
      option.tooltip = Object.assign({
        show: true, confine: true, trigger: lines ? "axis" : "item",
        axisPointer: { type: lines ? "line" : "none" }
      }, option.tooltip || {}, { show: true });
      option = toDark(option, pageMap(source, lvl, theme));
      option.backgroundColor = tok("surface." + theme);
      var W = el.clientWidth;
      el.style.height = Math.round(Math.min(Math.max(W * 0.66, tok("interactive.height.min")), tok("interactive.height.max"))) + "px";
      fresh(el, theme).setOption(option);
      el.setAttribute("data-chart-theme", theme);
      if (paper) paper.hidden = true;
    }).catch(function () {
      el.parentNode.hidden = true;
    });
  }

  // Draws every chart; resolves once each has rendered or, for a figure's option, fallen back.
  function drawAll() {
    var waits = [];
    [].forEach.call(document.querySelectorAll("[data-preset] [data-chart]"), function (el) {
      draw(el);
      waits.push(rendered(el));
    });
    [].forEach.call(document.querySelectorAll("[data-chart-option]"), function (el) {
      waits.push(drawOption(el).then(function () { return rendered(el); }));
    });
    return Promise.all(waits);
  }

  // Scale each canvas down to its frame on screen; the canvas itself keeps its full size.
  function fit() {
    [].forEach.call(document.querySelectorAll(".canvas-frame"), function (frameEl) {
      var box = frameEl.querySelector("[data-preset]");
      frameEl.style.setProperty("--canvas-scale", String(frameEl.clientWidth / box.offsetWidth));
    });
  }

  // An interactive chart fills its container's width and is laid out again when that changes.
  function watch(el) {
    var width = el.clientWidth;
    new ResizeObserver(function () {
      if (el.clientWidth !== width && el.clientWidth > 0) {
        width = el.clientWidth;
        draw(el);
      }
    }).observe(el.closest("[data-preset]"));
  }

  // A series toggle hides or shows one series by name, in the interactive chart of its figure.
  function toggles() {
    [].forEach.call(document.querySelectorAll("button[data-series-toggle]"), function (button) {
      button.hidden = false;
      button.addEventListener("click", function () {
        var el = button.closest("figure").querySelector("[data-preset='interactive'] [data-chart]");
        var chart = echarts.getInstanceByDom(el);
        var name = button.getAttribute("data-series-toggle");
        var shown = button.getAttribute("aria-pressed") !== "true";
        button.setAttribute("aria-pressed", String(shown));
        chart.dispatchAction({ type: "legendToggleSelect", name: name });
      });
    });
  }

  // The interactive map zooms by pinch and drag (roam), by its buttons, and by the wheel only with
  // Ctrl or ⌘: an unmodified wheel is stopped on its way down to the chart, in the capture phase,
  // and not prevented, so the page scrolls past the map. Reset draws the map again from its option.
  function mapZoom() {
    [].forEach.call(document.querySelectorAll("figure[data-map]"), function (figure) {
      var el = figure.querySelector("[data-preset='interactive'] [data-chart]");
      if (!el) return;
      el.addEventListener("wheel", function (e) {
        if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
      }, { capture: true });
      [].forEach.call(figure.querySelectorAll("button[data-map-zoom]"), function (button) {
        button.hidden = false;
        button.addEventListener("click", function () {
          var action = button.getAttribute("data-map-zoom");
          if (action === "reset") { draw(el); return; }
          // Around the center of the map as it is now shown.
          var chart = echarts.getInstanceByDom(el);
          var geo = chart.getModel().getSeriesByIndex(0).coordinateSystem;
          var box = geo.getBoundingRect();
          var center = geo.dataToPoint([box.x + box.width / 2, box.y + box.height / 2]);
          chart.dispatchAction({
            type: "geoRoam", componentType: "series", seriesId: "main", zoom: action === "in" ? 2 : 0.5,
            originX: center[0], originY: center[1]
          });
        });
      });
    });
  }

  function ready() {
    var faces = [
      font(tok("weight.title"), tok("static.text.title"), tok("font.text")),
      font(tok("weight.text"), tok("static.text.label"), tok("font.text")),
      font(tok("weight.text"), tok("static.text.footer"), tok("font.footer"))
    ];
    var fonts = document.fonts ? Promise.all(faces.map(function (f) { return document.fonts.load(f); })) : Promise.resolve();
    var themes = Promise.all(["standard", "high", "dark-standard", "dark-high"].map(function (lvl) {
      return fetch(themeUrls[lvl]).then(function (r) { return r.json(); }).then(function (theme) {
        echarts.registerTheme("chart-" + lvl, theme);
      });
    }));
    return Promise.all([fonts, themes, registerMaps()]);
  }

  ready().then(function () {
    fit();
    drawReported();
    toggles();
    mapZoom();
    if (window.ResizeObserver) {
      new ResizeObserver(fit).observe(main);
      [].forEach.call(document.querySelectorAll("[data-preset='interactive'] [data-chart]"), watch);
      [].forEach.call(document.querySelectorAll("[data-chart-option]"), function (el) {
        var width = el.clientWidth;
        new ResizeObserver(function () {
          if (el.clientWidth !== width && el.clientWidth > 0) {
            width = el.clientWidth;
            drawOption(el);
          }
        }).observe(el.parentNode);
      });
    }
    // A change of theme or contrast redraws every chart in place: the static canvases in the
    // light set of the new contrast, the interactive views in the page's own set.
    var current = pageLevel();
    new MutationObserver(function () {
      if (pageLevel() !== current) {
        current = pageLevel();
        root.removeAttribute("data-charts-drawn");
        drawReported();
      }
    }).observe(root, { attributes: true, attributeFilter: ["data-theme", "data-contrast"] });
  }, function () {
    // A theme, map, or font that never arrived leaves every figure's PNG in place: that is the
    // page's chart, so the charts count as drawn (as fallen back).
    root.setAttribute("data-charts-drawn", pageLevel());
  });
})();
