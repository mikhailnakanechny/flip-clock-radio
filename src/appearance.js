export var THEMES = [
  { id: "softblack", name: "Soft Black", sw: ["#1d1a16", "#e6e2d8", "#d9b26a"] },
  { id: "ivory", name: "Ivory", sw: ["#1a1713", "#faf8f5", "#c9a227"] },
  { id: "oatmeal", name: "Oatmeal", sw: ["#221c14", "#eae0c8", "#c8933f"] },
  { id: "midnight", name: "Midnight", sw: ["#1a1a1c", "#f2f2f4", "#39b7a8"] },
  { id: "paper", name: "Paper", sw: ["#f4f2ea", "#1b1b1f", "#b0562f"] },
  { id: "amber", name: "Amber CRT", sw: ["#1d1305", "#ffb347", "#ff9f1c"] },
  { id: "ocean", name: "Ocean", sw: ["#0d1a26", "#d8ecff", "#2ea8ff"] },
  { id: "forest", name: "Forest", sw: ["#0d1a10", "#dcf5e0", "#52c46a"] },
  { id: "rose", name: "Rose", sw: ["#1e0d15", "#ffe0ec", "#ff5c8a"] },
  { id: "mono", name: "Mono", sw: ["#0f0f0f", "#ffffff", "#ffffff"] }
];

export function initAppearance() {
  var themeSel = document.getElementById("themeSel");
  var fontSel = document.getElementById("fontSel");
  var theme = localStorage.getItem("fc.theme") || "softblack";

  var FS_DEFS = [];
  for (var fsPx = 12; fsPx <= 24; fsPx += 2) {
    FS_DEFS.push({ id: String(fsPx), name: fsPx + " px" });
  }
  var font = localStorage.getItem("fc.fs") || "12";
  var lastSelectAt = 0;

  function markThemes() {
    if (themeSel) themeSel.value = theme;
  }

  function applyTheme(id) {
    var valid = THEMES.some(function (t) {
      return t.id === id;
    });
    theme = valid ? id : "softblack";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("fc.theme", theme);
    markThemes();
  }

  function applyFont(id) {
    var valid = FS_DEFS.some(function (f) {
      return f.id === id;
    });
    font = valid ? id : "12";
    document.documentElement.style.setProperty("--fs", font + "px");
    localStorage.setItem("fc.fs", font);
    if (fontSel) fontSel.value = font;
  }

  function suppressBackdrop() {
    lastSelectAt = Date.now();
  }
  function backdropAllowed() {
    return Date.now() - lastSelectAt > 700;
  }

  THEMES.forEach(function (t) {
    var o = document.createElement("option");
    o.value = t.id;
    o.textContent = t.name;
    themeSel.appendChild(o);
  });
  FS_DEFS.forEach(function (f) {
    var o = document.createElement("option");
    o.value = f.id;
    o.textContent = f.name;
    fontSel.appendChild(o);
  });
  themeSel.addEventListener("change", function () {
    suppressBackdrop();
    applyTheme(themeSel.value);
  });
  fontSel.addEventListener("change", function () {
    suppressBackdrop();
    applyFont(fontSel.value);
  });
  markThemes();
  fontSel.value = font;
  applyTheme(theme);
  applyFont(font);

  return { markThemes: markThemes, backdropAllowed: backdropAllowed };
}
