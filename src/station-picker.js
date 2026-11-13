export function initPicker(state, radio) {
  var picker = document.getElementById("picker");
  var listEl = document.getElementById("stationList");
  var metaEl = document.getElementById("meta");
  var closeBtn = document.getElementById("closePicker");
  var rows = [];

  function markRows() {
    rows.forEach(function (r, i) {
      var on = i === radio.getIdx();
      r.el.classList.toggle("on", on);
      r.now.textContent = on ? (radio.isWantPlay() ? "playing" : "selected") : "";
    });
  }

  function markupRows() {
    listEl.innerHTML = "";
    rows = [];
    state.stations.forEach(function (s, i) {
      var row = document.createElement("div");
      row.className = "row";
      row.setAttribute("role", "button");
      row.tabIndex = 0;

      var txt = document.createElement("div");
      txt.className = "txt";
      var n = document.createElement("div");
      n.className = "n";
      n.textContent = s.name;
      var b = document.createElement("div");
      b.className = "s";
      b.textContent = s.sub;
      txt.appendChild(n);
      txt.appendChild(b);

      var now = document.createElement("div");
      now.className = "now";
      now.textContent = "";

      row.appendChild(txt);
      row.appendChild(now);

      row.addEventListener("click", function (e) {
        e.stopPropagation();
        radio.selectStation(i, true);
        closePicker();
      });
      row.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          radio.selectStation(i, true);
          closePicker();
        }
      });
      listEl.appendChild(row);
      rows.push({ el: row, now: now });
    });
    markRows();
  }

  function openPicker() {
    markRows();
    picker.classList.add("open");
    if (metaEl) metaEl.setAttribute("aria-expanded", "true");
  }
  function closePicker() {
    picker.classList.remove("open");
    markRows();
    if (metaEl) metaEl.setAttribute("aria-expanded", "false");
  }

  function togglePicker() {
    if (picker.classList.contains("open")) closePicker();
    else openPicker();
  }

  metaEl.addEventListener("click", function (e) {
    e.stopPropagation();
    togglePicker();
  });
  metaEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      togglePicker();
    }
  });
  closeBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    closePicker();
  });
  picker.addEventListener("click", function (e) {
    if (e.target === picker) closePicker();
  });

  return {
    markupRows: markupRows,
    markRows: markRows,
    openPicker: openPicker,
    closePicker: closePicker,
    isOpen: function () {
      return picker.classList.contains("open");
    }
  };
}
