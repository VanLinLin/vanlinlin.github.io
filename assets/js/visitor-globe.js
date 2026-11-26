/* Cumulative visitor globe — see _includes/visitor-globe.html.
   Dotted (hex) continents; visited countries glow by cumulative visits (log scale),
   animated arcs fly from every visitor country to Albany, NY; pulse rings on the
   top countries; hover/click tooltips; chips under the stats fly the camera there.
   globe.gl (~1.9 MB) is fetched only when the card comes near the viewport. */
(function () {
  "use strict";
  var root = document.getElementById("vglobe");
  if (!root) return;

  var stage = document.getElementById("vglobe-stage");
  var loading = document.getElementById("vglobe-loading");
  var tip = document.getElementById("vglobe-tip");
  var html = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var data = {};
  try { data = JSON.parse(document.getElementById("vglobe-data").textContent || "{}"); } catch (e) { data = {}; }
  var rows = (data.all && data.all.length ? data.all : (data.top || []).map(function (c) {
    return { c: c.code, n: c.name, v: c.visits };
  }));
  var total = data.total_pageviews || rows.reduce(function (s, r) { return s + r.v; }, 0);
  var visits = {}, rank = {}, names = {};
  rows.forEach(function (r, i) { visits[r.c] = r.v; rank[r.c] = i + 1; names[r.c] = r.n; });
  var maxV = rows.length ? rows[0].v : 1;

  var HOME = { lat: 42.686, lng: -73.824, label: "Albany, NY" };
  var START = { lat: 28, lng: -40, altitude: 1.85 };

  function flag(code) {
    if (!/^[A-Z]{2}$/.test(code || "")) return "";
    return String.fromCodePoint(0x1f1e6 + code.charCodeAt(0) - 65, 0x1f1e6 + code.charCodeAt(1) - 65);
  }
  function weight(v) { return v ? Math.log(1 + v) / Math.log(1 + maxV) : 0; }
  function shortName(code, geoName) {
    var a = names[code] || geoName || code, b = geoName || a;
    return a.length <= b.length ? a : b;   /* "Jordan" beats "Hashemite Kingdom of Jordan" */
  }

  /* ---------- colours follow the light/dark tokens ---------- */
  function hexToRgb(h) {
    h = (h || "").trim().replace("#", "");
    if (h.length === 3) h = h.replace(/(.)/g, "$1$1");
    var n = parseInt(h, 16);
    return isNaN(n) ? [88, 166, 255] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  var C = {};
  function readColors() {
    var cs = getComputedStyle(html);
    var v = function (k) { return cs.getPropertyValue(k).trim(); };
    var dark = html.getAttribute("data-theme") === "dark";
    C = {
      dark: dark,
      a: hexToRgb(v("--accent")),
      b: hexToRgb(v("--accent-2")),
      sphere: dark ? "#0f1622" : "#e9eef7",
      dim: dark ? "rgba(130,145,170,0.16)" : "rgba(72,86,110,0.20)",
      sel: dark ? "#ffffff" : "#0f172a"
    };
  }
  function mix(t, alpha) {
    var r = Math.round(C.a[0] + (C.b[0] - C.a[0]) * t);
    var g = Math.round(C.a[1] + (C.b[1] - C.a[1]) * t);
    var b = Math.round(C.a[2] + (C.b[2] - C.a[2]) * t);
    return "rgba(" + r + "," + g + "," + b + "," + (alpha == null ? 1 : alpha) + ")";
  }

  /* ---------- lazy load ---------- */
  function loadScript(src) {
    return new Promise(function (ok, fail) {
      if (window.Globe) return ok();
      var s = document.createElement("script");
      s.src = src; s.async = true; s.crossOrigin = "anonymous";
      s.onload = ok; s.onerror = fail;
      document.head.appendChild(s);
    });
  }
  function webglOK() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }
  function fail(msg) {
    loading.innerHTML = msg || "Globe unavailable in this browser.";
    loading.classList.add("is-error");
  }

  var started = false;
  function start() {
    if (started) return;
    started = true;
    if (!webglOK()) return fail();
    Promise.all([
      loadScript(root.getAttribute("data-lib")),
      fetch(root.getAttribute("data-geo")).then(function (r) { return r.json(); })
    ]).then(function (res) { init(res[1]); })
      .catch(function () { fail("Globe failed to load."); });
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(); }
    }, { rootMargin: "400px 0px" });
    io.observe(root);
  } else {
    start();
  }

  /* ---------- the globe ---------- */
  var globe, features = [], byCode = {}, selected = null, hovered = null, spinning = !reduceMotion, resumeTimer;

  function init(geo) {
    readColors();
    features = geo.features || [];
    features.forEach(function (f) { byCode[f.properties.c] = f.properties; });
    (geo.extra || []).forEach(function (p) { if (!byCode[p.c]) byCode[p.c] = p; });

    var visited = rows.filter(function (r) { return byCode[r.c]; }).map(function (r) {
      var p = byCode[r.c];
      return { c: r.c, v: r.v, w: weight(r.v), lat: p.lat, lng: p.lng };
    });
    /* a light column per visited country (tiny ones like Taiwan or Singapore vanish in the dot grid) */
    var dots = visited;
    var arcs = visited.filter(function (d) { return d.c !== "US"; }).map(function (d, i) {
      return { c: d.c, w: d.w, startLat: d.lat, startLng: d.lng, endLat: HOME.lat, endLng: HOME.lng,
               t: 2200 + ((i * 7919) % 2600) };
    });
    var rings = visited.slice(0, 5).concat([{ c: "HOME", w: 1, lat: HOME.lat, lng: HOME.lng }]);

    loading.remove();
    globe = Globe({ animateIn: !reduceMotion })(stage)
      .width(stage.clientWidth).height(stage.clientHeight)
      .backgroundColor("rgba(0,0,0,0)")
      .showAtmosphere(true).atmosphereAltitude(0.17)
      .hexPolygonsData(features)
      .hexPolygonResolution(3).hexPolygonMargin(0.42).hexPolygonUseDots(true)
      .hexPolygonCurvatureResolution(3)
      .hexPolygonAltitude(altitudeOf())
      .hexPolygonsTransitionDuration(reduceMotion ? 0 : 400)
      .onHexPolygonHover(function (f) { hovered = f ? f.properties.c : null; showTip(hovered); stage.style.cursor = hovered && visits[hovered] ? "pointer" : ""; })
      .onHexPolygonClick(function (f) { if (visits[f.properties.c]) fly(f.properties.c); })
      .pointsData(dots).pointLat("lat").pointLng("lng")
      .pointAltitude(function (d) { return 0.015 + 0.3 * d.w * d.w; })
      .pointRadius(function (d) { return 0.28 + 0.32 * d.w; }).pointResolution(12)
      .pointsTransitionDuration(reduceMotion ? 0 : 1200)
      .onPointHover(function (d) { hovered = d ? d.c : null; showTip(hovered); })
      .onPointClick(function (d) { fly(d.c); })
      .arcsData(arcs)
      .arcStroke(function (d) { return 0.18 + 0.55 * d.w; })
      .arcAltitudeAutoScale(0.42)
      .arcDashLength(0.35).arcDashGap(1.6).arcDashInitialGap(function (d) { return (d.t % 1000) / 500; })
      .arcDashAnimateTime(function (d) { return reduceMotion ? 0 : d.t; })
      .ringsData(rings).ringLat("lat").ringLng("lng")
      .ringMaxRadius(function (d) { return d.c === "HOME" ? 3.2 : 2 + 3 * d.w; })
      .ringPropagationSpeed(reduceMotion ? 0 : 1.6)
      .ringRepeatPeriod(function (d) { return reduceMotion ? 0 : (d.c === "HOME" ? 1100 : 1700); })
      .htmlElementsData([HOME]).htmlLat("lat").htmlLng("lng").htmlAltitude(0.02)
      .htmlElement(function () {
        var el = document.createElement("div");
        el.className = "vglobe__home";
        el.innerHTML = '<span class="vglobe__home-pin"></span><span class="vglobe__home-label">Van @ UAlbany</span>';
        return el;
      });
    paint();

    var ctl = globe.controls();
    ctl.enableZoom = false;          /* no wheel hijack: zoom with the buttons */
    ctl.autoRotate = spinning;
    ctl.autoRotateSpeed = 0.55;
    ctl.addEventListener("start", function () { pauseFor(5000); });
    /* touch screens: a finger on the globe must still scroll the page,
       so no drag-rotate there (auto-spin, taps, chips and buttons still work) */
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
      ctl.enableRotate = false;
      var cv = globe.renderer().domElement;
      cv.style.touchAction = "pan-y";
      root.classList.add("is-touch");
    }
    globe.pointOfView(START, 0);

    stage.addEventListener("pointermove", placeTip);
    stage.addEventListener("pointerleave", function () { hovered = null; showTip(selected); });

    if ("ResizeObserver" in window) {
      new ResizeObserver(function () { globe.width(stage.clientWidth).height(stage.clientHeight); }).observe(stage);
    }
    new MutationObserver(function () { readColors(); paint(); })
      .observe(html, { attributes: true, attributeFilter: ["data-theme"] });

    /* pause rendering while off-screen */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) globe.resumeAnimation(); else globe.pauseAnimation(); });
      }).observe(root);
    }
    root.classList.add("is-ready");
  }

  /* a fresh accessor each time, so globe.gl re-evaluates the raised country */
  function altitudeOf() {
    return function (f) {
      var c = f.properties.c;
      if (c === selected) return 0.045;
      return visits[c] ? 0.006 + 0.022 * weight(visits[c]) : 0.003;
    };
  }

  function paint() {
    if (!globe) return;
    var mat = globe.globeMaterial();
    if (mat && mat.color) mat.color.set(C.sphere);
    if (mat && "shininess" in mat) mat.shininess = 6;
    globe.atmosphereColor(mix(0.35, 1))
      .hexPolygonColor(function (f) {
        var c = f.properties.c;
        if (c === selected) return C.sel;
        var v = visits[c];
        return v ? mix(1 - weight(v), 0.8 + 0.2 * weight(v)) : C.dim;
      })
      .pointColor(function (d) { return d.c === selected ? C.sel : mix(1 - d.w, 0.95); })
      .arcColor(function (d) { return [mix(1, 0), mix(1 - d.w, 0.5 + 0.5 * d.w), mix(0, 0.9)]; })
      .ringColor(function (d) {
        return function (t) { return d.c === "HOME" ? mix(0, 1 - t) : mix(0.6, (1 - t) * 0.8); };
      });
  }

  /* ---------- interaction ---------- */
  function pauseFor(ms) {
    if (!globe) return;
    globe.controls().autoRotate = false;
    clearTimeout(resumeTimer);
    if (spinning && ms) resumeTimer = setTimeout(function () { if (spinning) globe.controls().autoRotate = true; }, ms);
  }

  function fly(code) {
    var p = byCode[code];
    if (!globe || !p) return;
    selected = code;
    pauseFor(9000);
    globe.pointOfView({ lat: p.lat, lng: p.lng, altitude: 1.55 }, reduceMotion ? 0 : 1300);
    paint();
    globe.hexPolygonAltitude(altitudeOf());   /* re-evaluate the raised country */
    showTip(code, true);
    Array.prototype.forEach.call(document.querySelectorAll(".js-globe-fly"), function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-code") === code);
    });
  }

  function showTip(code, pinned) {
    if (!code && selected && !pinned) code = selected;
    var v = visits[code];
    if (!code || !byCode[code] && !v) { tip.hidden = true; return; }
    var p = byCode[code] || {};
    var name = shortName(code, p.n);
    tip.innerHTML = v
      ? '<span class="vglobe__tip-flag">' + flag(code) + '</span><b>' + name + '</b>' +
        '<span class="vglobe__tip-row"><b class="vglobe__tip-n">' + v.toLocaleString("en-US") + '</b> visits · ' +
        (v / total * 100).toFixed(v / total < 0.01 ? 1 : 0) + '% · #' + rank[code] + ' of ' + rows.length + '</span>'
      : '<span class="vglobe__tip-flag">' + flag(code) + '</span><b>' + name + '</b><span class="vglobe__tip-row">no visits yet — be the first 👋</span>';
    tip.classList.toggle("is-pinned", !!(pinned || code === selected) && code !== hovered);
    tip.hidden = false;
  }

  function placeTip(e) {
    if (tip.hidden || !hovered) return;
    var r = root.getBoundingClientRect();
    var x = e.clientX - r.left + 14, y = e.clientY - r.top + 14;
    x = Math.min(x, r.width - tip.offsetWidth - 8);
    y = Math.min(y, r.height - tip.offsetHeight - 8);
    tip.style.left = x + "px"; tip.style.top = y + "px";
    tip.classList.remove("is-pinned");
  }

  root.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest(".vglobe__btn");
    if (!btn || !globe) return;
    var act = btn.getAttribute("data-act"), pov = globe.pointOfView();
    if (act === "in" || act === "out") {
      var alt = Math.max(0.9, Math.min(4, pov.altitude * (act === "in" ? 0.72 : 1.38)));
      globe.pointOfView({ lat: pov.lat, lng: pov.lng, altitude: alt }, reduceMotion ? 0 : 500);
      pauseFor(6000);
    } else if (act === "home") {
      selected = null; paint(); globe.hexPolygonAltitude(altitudeOf()); tip.hidden = true;
      Array.prototype.forEach.call(document.querySelectorAll(".js-globe-fly"), function (b) { b.classList.remove("is-active"); });
      globe.pointOfView(START, reduceMotion ? 0 : 1000);
      if (spinning) pauseFor(1200);
    } else if (act === "spin") {
      spinning = !spinning;
      clearTimeout(resumeTimer);
      globe.controls().autoRotate = spinning;
      btn.setAttribute("aria-pressed", spinning ? "true" : "false");
      btn.innerHTML = '<i class="fas fa-' + (spinning ? "pause" : "play") + '" aria-hidden="true"></i>';
    }
  });

  /* chips under the numbers: fly there (start loading if the globe is not up yet) */
  Array.prototype.forEach.call(document.querySelectorAll(".js-globe-fly"), function (b) {
    b.addEventListener("click", function () {
      var code = b.getAttribute("data-code");
      if (globe) return fly(code);
      start();
      var wait = setInterval(function () { if (globe) { clearInterval(wait); fly(code); } }, 150);
      setTimeout(function () { clearInterval(wait); }, 15000);
    });
  });

})();
