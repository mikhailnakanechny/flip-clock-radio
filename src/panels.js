export function initPanels(deps) {
  var settingsEl = document.getElementById("settings");
  var cfgBtn = document.getElementById("cfg");
  var closeSetBtn = document.getElementById("closeSettings");
  var stationsPanel = document.getElementById("stationsPanel");
  var manageList = document.getElementById("manageList");
  var stationCount = document.getElementById("stationCount");
  var openStationsRow = document.getElementById("openStations");
  var closeStationsBtn = document.getElementById("closeStations");
  var newName = document.getElementById("newName");
  var newUrl = document.getElementById("newUrl");
  var addBtn = document.getElementById("addStation");
  var restoreBtn = document.getElementById("restoreStations");
  var clockList = document.getElementById("clockList");
  var clockRows = [];

  function openSettings() {
    deps.picker.closePicker();
    deps.appearance.markThemes();
    settingsEl.classList.add("open");
  }
  function closeSettings() {
    settingsEl.classList.remove("open");
  }
  function openStationsPanel() {
    closeSettings();
    deps.picker.closePicker();
    renderManage();
    stationsPanel.classList.add("open");
  }
  function closeStationsPanel() {
    stationsPanel.classList.remove("open");
  }

  function refreshStationsUi() {
    if (stationCount) {
      stationCount.textContent =
        deps.state.stations.length + (deps.state.stations.length === 1 ? " station" : " stations");
    }
    if (deps.radio.getIdx() >= deps.state.stations.length)
      deps.radio.setIdx(Math.max(0, deps.state.stations.length - 1));
    deps.picker.markupRows();
    deps.radio.paint();
  }

  function renderManage() {
    manageList.innerHTML = "";
    if (!deps.state.stations.length) {
      var empty = document.createElement("div");
      empty.className = "s";
      empty.style.cssText = "padding:1.6vh 0;color:var(--dim)";
      empty.textContent = "No stations left. Add one below, or restore the defaults.";
      manageList.appendChild(empty);
      return;
    }
    deps.state.stations.forEach(function (st, i) {
      var row = document.createElement("div");
      row.className = "row";

      var txt = document.createElement("div");
      txt.className = "txt";
      var n = document.createElement("div");
      n.className = "n";
      n.textContent = st.name;
      var sub = document.createElement("div");
      sub.className = "s";
      sub.textContent = st.sub || String(st.url).replace(/^https?:\/\//, "");
      txt.appendChild(n);
      txt.appendChild(sub);

      var del = document.createElement("button");
      del.className = "del";
      del.innerHTML = "&#10005;";
      del.setAttribute("aria-label", "remove " + st.name);
      del.addEventListener("click", function (e) {
        e.stopPropagation();
        removeStation(i);
      });

      row.appendChild(txt);
      row.appendChild(del);
      manageList.appendChild(row);
    });
  }

  function removeStation(i) {
    var wasCurrent = i === deps.radio.getIdx();
    var wasPlaying = deps.radio.isWantPlay();
    deps.state.stations.splice(i, 1);
    deps.saveStations(deps.state.stations);
    if (i < deps.radio.getIdx()) deps.radio.setIdx(deps.radio.getIdx() - 1);
    if (deps.radio.getIdx() >= deps.state.stations.length)
      deps.radio.setIdx(Math.max(0, deps.state.stations.length - 1));
    refreshStationsUi();
    renderManage();
    if (wasCurrent) {
      if (wasPlaying && deps.state.stations.length) deps.radio.start();
      else deps.radio.stop();
    }
  }

  function addStation() {
    var name = (newName.value || "").trim();
    var url = (newUrl.value || "").trim();
    if (!/^https?:\/\/\S+/i.test(url)) {
      newUrl.focus();
      return;
    }
    deps.state.stations.push({
      name:
        name ||
        String(url)
          .replace(/^https?:\/\/(www\.)?/i, "")
          .split("/")[0],
      sub: "custom",
      url: url
    });
    deps.saveStations(deps.state.stations);
    newName.value = "";
    newUrl.value = "";
    refreshStationsUi();
    renderManage();
  }

  function restoreStations() {
    deps.state.stations.length = 0;
    var defaults = deps.defaultStations();
    defaults.forEach(function (s) {
      deps.state.stations.push(s);
    });
    deps.saveStations(deps.state.stations);
    deps.radio.setIdx(0);
    refreshStationsUi();
    renderManage();
  }

  cfgBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    if (settingsEl.classList.contains("open")) closeSettings();
    else openSettings();
  });
  closeSetBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    closeSettings();
  });
  settingsEl.addEventListener("click", function (e) {
    if (e.target === settingsEl && deps.appearance.backdropAllowed()) closeSettings();
  });

  openStationsRow.addEventListener("click", function (e) {
    e.stopPropagation();
    openStationsPanel();
  });
  if (openStationsRow) {
    openStationsRow.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        openStationsPanel();
      }
    });
  }
  closeStationsBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    closeStationsPanel();
  });
  stationsPanel.addEventListener("click", function (e) {
    if (e.target === stationsPanel) closeStationsPanel();
  });
  addBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    addStation();
  });
  restoreBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    restoreStations();
  });

  function markClockRows() {
    clockRows.forEach(function (r) {
      r.now.textContent = String(deps.clockState[r.def.id]).replace("-", " ");
    });
  }

  function buildClockRows() {
    deps.CLOCK_DEFS.forEach(function (d) {
      var row = document.createElement("div");
      row.className = "row";
      row.tabIndex = 0;
      row.setAttribute("role", "button");

      var txt = document.createElement("div");
      txt.className = "txt";
      var n = document.createElement("div");
      n.className = "n";
      n.textContent = d.name;
      txt.appendChild(n);

      var val = document.createElement("div");
      val.className = "now";

      row.appendChild(txt);
      row.appendChild(val);
      row.addEventListener("click", function (e) {
        e.stopPropagation();
        var i = d.values.indexOf(deps.clockState[d.id]);
        deps.clockState[d.id] = d.values[(i + 1) % d.values.length];
        deps.applyClock();
        markClockRows();
        deps.tick();
      });
      row.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          var i = d.values.indexOf(deps.clockState[d.id]);
          deps.clockState[d.id] = d.values[(i + 1) % d.values.length];
          deps.applyClock();
          markClockRows();
          deps.tick();
        }
      });
      clockList.appendChild(row);
      clockRows.push({ def: d, now: val });
    });
    markClockRows();
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      deps.picker.closePicker();
      closeSettings();
      closeStationsPanel();
    }
    if (e.key === "c" || e.key === "C") {
      if (settingsEl.classList.contains("open")) closeSettings();
      else openSettings();
    }
  });

  buildClockRows();
  refreshStationsUi();

  return {
    closeSettings: closeSettings,
    closeStationsPanel: closeStationsPanel,
    markClockRows: markClockRows,
    refreshStationsUi: refreshStationsUi
  };
}
