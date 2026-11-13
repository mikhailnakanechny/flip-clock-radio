(function () {
  "use strict";

  var DEFAULT_STATIONS = [
    { name: "FIP",             sub: "eclectic · Radio France", url: "https://icecast.radiofrance.fr/fip-midfi.mp3" },
    { name: "FIP Rock",        sub: "rock · Radio France",      url: "https://icecast.radiofrance.fr/fiprock-midfi.mp3", since: 3 },
    { name: "FIP Jazz",        sub: "jazz · Radio France",      url: "https://icecast.radiofrance.fr/fipjazz-midfi.mp3", since: 3 },
    { name: "Radio Paradise",  sub: "eclectic · rock",         url: "https://stream.radioparadise.com/mp3-128" },
    { name: "Groove Salad",    sub: "chill · SomaFM",          url: "https://ice1.somafm.com/groovesalad-128-mp3" },
    { name: "Drone Zone",      sub: "ambient · SomaFM",        url: "https://ice1.somafm.com/dronezone-128-mp3" },
    { name: "Lush",            sub: "vocal chill · SomaFM",    url: "https://ice1.somafm.com/lush-128-mp3" },
    { name: "Left Coast 70s",  sub: "rock · SomaFM",           url: "https://ice1.somafm.com/seventies-128-mp3", since: 3 },
    { name: "Sonic Universe",  sub: "avant jazz · SomaFM",     url: "https://ice1.somafm.com/sonicuniverse-128-mp3", since: 3 },
    { name: "DEF CON Radio",   sub: "electronic · SomaFM",     url: "https://ice1.somafm.com/defcon-128-mp3" },
    { name: "Christmas Lounge",sub: "seasonal · SomaFM",       url: "https://ice1.somafm.com/christmas-128-mp3" }
  ];

  /* The live list: a saved copy overrides the built-ins, so users can add,
     remove or reorder stations without editing the file. */
  function defaultStations() {
    return DEFAULT_STATIONS.map(function (s) { return { name: s.name, sub: s.sub, url: s.url }; });
  }
  var stations = (function () {
    try {
      var saved = JSON.parse(localStorage.getItem("fc.stations"));
      if (Array.isArray(saved)) return saved;
    } catch (e) {}
    return defaultStations();
  })();

  function saveStations() {
    localStorage.setItem("fc.stations", JSON.stringify(stations));
  }

  /* Stations shipped in a later version are merged into an existing saved list
     once, so an update shows up without wiping the user's own additions or
     deletions. Bump STATIONS_VERSION and tag new entries with `since`. */
  var STATIONS_VERSION = 3;
  (function mergeNewDefaults() {
    try {
      if (localStorage.getItem("fc.stationsV") === String(STATIONS_VERSION)) return;
      DEFAULT_STATIONS.forEach(function (d) {
        if (d.since !== STATIONS_VERSION) return;
        var present = stations.some(function (s) { return s.url === d.url; });
        if (!present) stations.push({ name: d.name, sub: d.sub, url: d.url });
      });
      localStorage.setItem("fc.stationsV", String(STATIONS_VERSION));
      saveStations();
    } catch (e) {}
  })();


  /* ---------- clock preferences ---------- */
  var CLOCK_DEFS = [
    { id:"format",  name:"Time format", values:["24-hour", "12-hour"] },
    { id:"date",    name:"Date line",   values:["shown", "hidden"] },
    { id:"size",    name:"Card size",   values:["normal", "large", "huge"], def:"huge" },
    { id:"seconds", name:"Seconds",     values:["hidden", "shown"] }
  ];
  var CLOCK = (function () {
    try { return JSON.parse(localStorage.getItem("fc.clock") || "{}"); } catch (e) { return {}; }
  })();
  /* defaults v2: huge cards replaced normal as the default. Existing installs
     get it once; a deliberate large/huge choice is left alone. */
  if (CLOCK.v !== 2) {
    if (!CLOCK.size || CLOCK.size === "normal") CLOCK.size = "huge";
    CLOCK.v = 2;
  }
  CLOCK_DEFS.forEach(function (d) {
    if (d.values.indexOf(CLOCK[d.id]) === -1) CLOCK[d.id] = d.def || d.values[0];
  });

  /* ---------- clock ---------- */
  function makeGroup(host) {
    var card = document.createElement("div");
    card.className = "card";
    var d = document.createElement("div");
    d.className = "digit";
    d.textContent = "0";
    card.appendChild(d);
    host.appendChild(card);
    return d;
  }
  var slots = {
    h1: makeGroup(document.getElementById("h1")),
    h2: makeGroup(document.getElementById("h2")),
    m1: makeGroup(document.getElementById("m1")),
    m2: makeGroup(document.getElementById("m2"))
  };

  var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  var colon = document.getElementById("colon");
  var dateEl = document.getElementById("date");
  var secsEl = document.getElementById("secs");
  var lastMinute = -1;

  function setDigit(el, v) {
    if (el.textContent === v) return;
    if (el.dataset.init !== "1") { el.textContent = v; el.dataset.init = "1"; return; }
    el.classList.remove("flip-in");
    el.classList.add("flip-out");
    setTimeout(function () {
      el.textContent = v;
      el.classList.remove("flip-out");
      el.classList.add("flip-in");
    }, 180);
  }

  function tick() {
    var now = new Date(), h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
    var h12 = CLOCK.format === "12-hour";
    var hh = h12 ? (h % 12 || 12) : h;

    if (m !== lastMinute) {
      lastMinute = m;
      var hs = (hh < 10 ? "0" : "") + hh;
      var ms = (m < 10 ? "0" : "") + m;
      setDigit(slots.h1, hs[0]); setDigit(slots.h2, hs[1]);
      setDigit(slots.m1, ms[0]); setDigit(slots.m2, ms[1]);
      var line = DAYS[now.getDay()] + " " + now.getDate() + " " + MONTHS[now.getMonth()];
      if (h12) line += " \u00b7 " + (h < 12 ? "AM" : "PM");
      dateEl.textContent = line;
    }
    secsEl.textContent = (s < 10 ? ":0" : ":") + s;
    colon.classList.toggle("dim", s % 2 === 1);
    document.body.classList.toggle("night", h >= 23 || h < 7);
  }
  tick();
  setInterval(tick, 1000);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) { lastMinute = -1; tick(); }
  });

  /* ---------- radio ---------- */
  var audio    = new Audio();
  var idx      = parseInt(localStorage.getItem("fc.station") || "0", 10) || 0;
  var wantPlay = false;

  var playBtn  = document.getElementById("play");
  var prevBtn  = document.getElementById("prev");
  var nextBtn  = document.getElementById("next");
  var nameEl   = document.getElementById("stationName");
  var subEl    = document.getElementById("stationSub");
  var dot      = document.getElementById("dot");
  var vol      = document.getElementById("vol");
  var hint     = document.getElementById("hint");

  var savedVol = parseInt(localStorage.getItem("fc.volume") || "70", 10);
  vol.value = savedVol;
  audio.volume = savedVol / 100;

  function paint() {
    var s = stations[idx] || { name: "No stations", sub: "add one in Settings" };
    nameEl.textContent = s.name;
    subEl.textContent  = s.sub;
    document.title = "Flip Clock · " + s.name;
    try { markRows(); } catch (e) {}
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({ title: s.name, artist: s.sub, album: "Radio" });
      } catch (e) {}
    }
  }

  function setState(state) {
    dot.className = "dot" + (state === "live" ? " live" : state === "err" ? " err" : "");
    if (state === "live") {
      playBtn.innerHTML = "&#10074;&#10074;";
      playBtn.setAttribute("aria-label", "pause");
      hint.classList.remove("show");
      subEl.textContent = (stations[idx] || {}).sub || "";
    } else {
      playBtn.innerHTML = "&#9654;";
      playBtn.setAttribute("aria-label", "play");
      if (state === "err") subEl.textContent = "stream unreachable — try another station";
    }
  }

  function start() {
    wantPlay = true;
    if (!stations[idx]) { setState("idle"); return; }
    audio.src = stations[idx].url;
    var p = audio.play();
    if (p && p.catch) p.catch(function () { setState("err"); hint.classList.add("show"); });
  }

  function stop() {
    wantPlay = false;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    setState("idle");
    subEl.textContent = (stations[idx] || {}).sub || "";
  }

  playBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    if (wantPlay) stop(); else start();
  });
  prevBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    if (!stations.length) return;
    idx = (idx - 1 + stations.length) % stations.length;
    localStorage.setItem("fc.station", idx);
    paint();
    if (wantPlay) start();
  });
  nextBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    if (!stations.length) return;
    idx = (idx + 1) % stations.length;
    localStorage.setItem("fc.station", idx);
    paint();
    if (wantPlay) start();
  });
  vol.addEventListener("input", function () {
    audio.volume = vol.value / 100;
    localStorage.setItem("fc.volume", vol.value);
  });

  audio.addEventListener("playing", function () { setState("live"); });
  audio.addEventListener("waiting", function () { dot.className = "dot"; });
  audio.addEventListener("pause",   function () { if (!wantPlay) setState("idle"); });
  audio.addEventListener("error",   function () { setState("err"); });
  audio.addEventListener("stalled", function () { dot.className = "dot"; });

  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.setActionHandler("play",  function () { start(); });
      navigator.mediaSession.setActionHandler("pause", function () { stop(); });
      navigator.mediaSession.setActionHandler("nexttrack",     function () { nextBtn.click(); });
      navigator.mediaSession.setActionHandler("previoustrack", function () { prevBtn.click(); });
    } catch (e) {}
  }

  /* ---------- station picker ---------- */
  var picker     = document.getElementById("picker");
  var listEl     = document.getElementById("stationList");
  var metaEl     = document.getElementById("meta");
  var closeBtn   = document.getElementById("closePicker");
  var rows       = [];

  function markupRows() {
    listEl.innerHTML = "";
    rows = [];
    stations.forEach(function (s, i) {
      var row = document.createElement("div");
      row.className = "row";
      row.setAttribute("role", "button");
      row.tabIndex = 0;

      var txt = document.createElement("div");
      txt.className = "txt";
      var n = document.createElement("div"); n.className = "n"; n.textContent = s.name;
      var b = document.createElement("div"); b.className = "s"; b.textContent = s.sub;
      txt.appendChild(n); txt.appendChild(b);

      var now = document.createElement("div");
      now.className = "now"; now.textContent = "";

      row.appendChild(txt); row.appendChild(now);

      row.addEventListener("click", function (e) {
        e.stopPropagation();
        selectStation(i, true);
        closePicker();
      });
      listEl.appendChild(row);
      rows.push({ el: row, now: now });
    });
    markRows();
  }

  function markRows() {
    rows.forEach(function (r, i) {
      var on = i === idx;
      r.el.classList.toggle("on", on);
      r.now.textContent = on ? (wantPlay ? "playing" : "selected") : "";
    });
  }

  function selectStation(i, play) {
    idx = i;
    localStorage.setItem("fc.station", i);
    paint();
    if (wantPlay || play) start(); else markRows();
  }

  function openPicker() {
    markRows();
    picker.classList.add("open");
    markRows();
  }
  function closePicker() {
    picker.classList.remove("open");
    markRows();
  }

  metaEl.addEventListener("click", function (e) {
    e.stopPropagation();
    if (picker.classList.contains("open")) closePicker(); else openPicker();
  });
  closeBtn.addEventListener("click", function (e) { e.stopPropagation(); closePicker(); });
  picker.addEventListener("click", function (e) {
    if (e.target === picker) closePicker();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closePicker();
  });

  markupRows();

  /* ---------- settings / themes ---------- */
  var THEMES = [
    { id:"softblack", name:"Soft Black", sw:["#1d1a16","#e6e2d8","#d9b26a"] },
    { id:"ivory",     name:"Ivory",      sw:["#1a1713","#faf8f5","#c9a227"] },
    { id:"oatmeal",   name:"Oatmeal",    sw:["#221c14","#eae0c8","#c8933f"] },
    { id:"midnight", name:"Midnight",  sw:["#1a1a1c","#f2f2f4","#39b7a8"] },
    { id:"paper",    name:"Paper",     sw:["#f4f2ea","#1b1b1f","#b0562f"] },
    { id:"amber",    name:"Amber CRT", sw:["#1d1305","#ffb347","#ff9f1c"] },
    { id:"ocean",    name:"Ocean",     sw:["#0d1a26","#d8ecff","#2ea8ff"] },
    { id:"forest",   name:"Forest",    sw:["#0d1a10","#dcf5e0","#52c46a"] },
    { id:"rose",     name:"Rose",      sw:["#1e0d15","#ffe0ec","#ff5c8a"] },
    { id:"mono",     name:"Mono",      sw:["#0f0f0f","#ffffff","#ffffff"] }
  ];

  var settingsEl  = document.getElementById("settings");
  var cfgBtn      = document.getElementById("cfg");
  var closeSetBtn = document.getElementById("closeSettings");
  var themeSel    = document.getElementById("themeSel");
  var fontSel     = document.getElementById("fontSel");
  var theme       = localStorage.getItem("fc.theme") || "softblack";

  /* Interface text is a real px size, not a multiplier: 12 px default,
     +2 px per step. It scales the UI text only, never the clock digits
     (card size controls those). */
  var FS_DEFS = [];
  for (var fsPx = 12; fsPx <= 24; fsPx += 2) {
    FS_DEFS.push({ id:String(fsPx), name:fsPx + " px" });
  }
  var font = localStorage.getItem("fc.fs") || "12";

  function markThemes() { if (themeSel) themeSel.value = theme; }

  function applyTheme(id) {
    var valid = THEMES.some(function (t) { return t.id === id; });
    theme = valid ? id : "softblack";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("fc.theme", theme);
    markThemes();
  }

  function applyFont(id) {
    var valid = FS_DEFS.some(function (f) { return f.id === id; });
    font = valid ? id : "12";
    document.documentElement.style.setProperty("--fs", font + "px");
    localStorage.setItem("fc.fs", font);
    if (fontSel) fontSel.value = font;
  }

  function buildSelects() {
    THEMES.forEach(function (t) {
      var o = document.createElement("option");
      o.value = t.id; o.textContent = t.name;
      themeSel.appendChild(o);
    });
    FS_DEFS.forEach(function (f) {
      var o = document.createElement("option");
      o.value = f.id; o.textContent = f.name;
      fontSel.appendChild(o);
    });
    themeSel.addEventListener("change", function () { suppressBackdrop(); applyTheme(themeSel.value); });
    fontSel.addEventListener("change", function () { suppressBackdrop(); applyFont(fontSel.value); });
    markThemes();
    fontSel.value = font;
  }

  /* The Android select dialog closes with a tap that can land on our backdrop
     and shut the panel immediately, so ignore backdrop clicks for a moment
     after a dropdown changes. */
  var lastSelectAt = 0;
  function suppressBackdrop() { lastSelectAt = Date.now(); }

  function openSettings() { closePicker(); markThemes(); settingsEl.classList.add("open"); }
  function closeSettings() { settingsEl.classList.remove("open"); }

  cfgBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    if (settingsEl.classList.contains("open")) closeSettings(); else openSettings();
  });
  closeSetBtn.addEventListener("click", function (e) { e.stopPropagation(); closeSettings(); });
  settingsEl.addEventListener("click", function (e) {
    if (e.target === settingsEl && Date.now() - lastSelectAt > 700) closeSettings();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeSettings();
    if (e.key === "c" || e.key === "C") {
      if (settingsEl.classList.contains("open")) closeSettings(); else openSettings();
    }
  });

  buildSelects();
  applyTheme(theme);
  applyFont(font);

  /* ---------- station management ---------- */
  var stationsPanel    = document.getElementById("stationsPanel");
  var manageList       = document.getElementById("manageList");
  var stationCount     = document.getElementById("stationCount");
  var openStationsRow  = document.getElementById("openStations");
  var closeStationsBtn = document.getElementById("closeStations");
  var newName          = document.getElementById("newName");
  var newUrl           = document.getElementById("newUrl");
  var addBtn           = document.getElementById("addStation");
  var restoreBtn       = document.getElementById("restoreStations");

  function refreshStationsUi() {
    if (stationCount) {
      stationCount.textContent = stations.length + (stations.length === 1 ? " station" : " stations");
    }
    if (idx >= stations.length) idx = Math.max(0, stations.length - 1);
    markupRows();
    paint();
    markRows();
  }

  function renderManage() {
    manageList.innerHTML = "";
    if (!stations.length) {
      var empty = document.createElement("div");
      empty.className = "s";
      empty.style.cssText = "padding:1.6vh 0;color:var(--dim)";
      empty.textContent = "No stations left. Add one below, or restore the defaults.";
      manageList.appendChild(empty);
      return;
    }
    stations.forEach(function (st, i) {
      var row = document.createElement("div");
      row.className = "row";

      var txt = document.createElement("div"); txt.className = "txt";
      var n = document.createElement("div"); n.className = "n"; n.textContent = st.name;
      var sub = document.createElement("div"); sub.className = "s";
      sub.textContent = st.sub || String(st.url).replace(/^https?:\/\//, "");
      txt.appendChild(n); txt.appendChild(sub);

      var del = document.createElement("button");
      del.className = "del";
      del.innerHTML = "&#10005;";
      del.setAttribute("aria-label", "remove " + st.name);
      del.addEventListener("click", function (e) {
        e.stopPropagation();
        removeStation(i);
      });

      row.appendChild(txt); row.appendChild(del);
      manageList.appendChild(row);
    });
  }

  function removeStation(i) {
    var wasCurrent = i === idx;
    var wasPlaying = wantPlay;
    stations.splice(i, 1);
    saveStations();
    if (i < idx) idx--;
    if (idx >= stations.length) idx = Math.max(0, stations.length - 1);
    refreshStationsUi();
    renderManage();
    if (wasCurrent) {
      if (wasPlaying && stations.length) start();
      else stop();
    }
  }

  function addStation() {
    var name = (newName.value || "").trim();
    var url  = (newUrl.value || "").trim();
    if (!/^https?:\/\/\S+/i.test(url)) { newUrl.focus(); return; }
    stations.push({
      name: name || String(url).replace(/^https?:\/\/(www\.)?/i, "").split("/")[0],
      sub: "custom",
      url: url
    });
    saveStations();
    newName.value = "";
    newUrl.value = "";
    refreshStationsUi();
    renderManage();
  }

  function restoreStations() {
    stations = defaultStations();
    saveStations();
    idx = 0;
    refreshStationsUi();
    renderManage();
  }

  function openStationsPanel() {
    closeSettings();
    closePicker();
    renderManage();
    stationsPanel.classList.add("open");
  }
  function closeStationsPanel() { stationsPanel.classList.remove("open"); }

  openStationsRow.addEventListener("click", function (e) { e.stopPropagation(); openStationsPanel(); });
  closeStationsBtn.addEventListener("click", function (e) { e.stopPropagation(); closeStationsPanel(); });
  stationsPanel.addEventListener("click", function (e) {
    if (e.target === stationsPanel) closeStationsPanel();
  });
  addBtn.addEventListener("click", function (e) { e.stopPropagation(); addStation(); });
  restoreBtn.addEventListener("click", function (e) { e.stopPropagation(); restoreStations(); });

  refreshStationsUi();

  /* ---------- clock option rows ---------- */
  var clockList  = document.getElementById("clockList");
  var clockRows  = [];

  function markClockRows() {
    clockRows.forEach(function (r) {
      r.now.textContent = String(CLOCK[r.def.id]).replace("-", " ");
    });
  }

  function applyClock() {
    document.body.classList.toggle("nodate",   CLOCK.date === "hidden");
    document.body.classList.toggle("showsecs", CLOCK.seconds === "shown");
    document.body.classList.remove("size-large", "size-huge");
    if (CLOCK.size === "large") document.body.classList.add("size-large");
    if (CLOCK.size === "huge")  document.body.classList.add("size-huge");
    localStorage.setItem("fc.clock", JSON.stringify(CLOCK));
    lastMinute = -1;          /* force the digits to re-render on the next tick */
    markClockRows();
  }

  function buildClockRows() {
    CLOCK_DEFS.forEach(function (d) {
      var row = document.createElement("div");
      row.className = "row"; row.tabIndex = 0; row.setAttribute("role", "button");

      var txt = document.createElement("div"); txt.className = "txt";
      var n = document.createElement("div"); n.className = "n"; n.textContent = d.name;
      txt.appendChild(n);

      var val = document.createElement("div"); val.className = "now";

      row.appendChild(txt); row.appendChild(val);
      row.addEventListener("click", function (e) {
        e.stopPropagation();
        var i = d.values.indexOf(CLOCK[d.id]);
        CLOCK[d.id] = d.values[(i + 1) % d.values.length];
        applyClock();
        tick();
      });
      clockList.appendChild(row);
      clockRows.push({ def: d, now: val });
    });
    markClockRows();
  }

  buildClockRows();
  applyClock();
  tick();

  paint();
  setState("idle");
  hint.classList.add("show");

  /* ---------- fullscreen ---------- */
  var fsBtn = document.getElementById("fs");

  function toggleFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen().catch(function () {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      return;
    }
    var el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(function () {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }

  function paintFsIcon() {
    var on = !!(document.fullscreenElement || document.webkitFullscreenElement);
    fsBtn.setAttribute("aria-label", on ? "exit fullscreen" : "fullscreen");
    fsBtn.style.opacity = on ? "0.55" : "1";
  }

  fsBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    toggleFullscreen();
  });
  document.addEventListener("fullscreenchange", paintFsIcon);
  document.addEventListener("webkitfullscreenchange", paintFsIcon);
  document.addEventListener("keydown", function (e) {
    if (e.key === "f" || e.key === "F") toggleFullscreen();
    if (e.key === " " && e.target === document.body) { e.preventDefault(); if (wantPlay) stop(); else start(); }
  });

  /* Tap the clock: first tap starts the radio, later taps toggle fullscreen.
     On a 5" panel this is the only reliable hit target. */
  document.getElementById("stage").addEventListener("click", function () {
    if (!wantPlay) { start(); return; }
    toggleFullscreen();
  });

  /* resume after an accidental pause when the page is still meant to be playing */
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && wantPlay && audio.paused) start();
  });

  if (navigator.wakeLock && navigator.wakeLock.request) {
    navigator.wakeLock.request("screen").catch(function () {});
  }
})();
