import { DEFAULT_STATIONS, defaultStations } from "./stations-data.js";
import {
  STATIONS_VERSION,
  loadStations,
  saveStations,
  mergeNewDefaults
} from "./stations-store.js";
import { CLOCK_DEFS, loadClock, saveClock } from "./clock-store.js";
import { initClock } from "./clock.js";
import { initRadio } from "./radio.js";
import { initPicker } from "./station-picker.js";
import { initAppearance } from "./appearance.js";
import { initPanels } from "./panels.js";

(function () {
  "use strict";

  var stations = loadStations(defaultStations);
  mergeNewDefaults(stations, DEFAULT_STATIONS);
  void STATIONS_VERSION;

  var CLOCK = loadClock();
  var state = { stations: stations };

  var pickerApi;
  var radio = initRadio(state, function () {
    if (pickerApi) pickerApi.markRows();
  });

  pickerApi = initPicker(state, radio);

  var clockApi = initClock(CLOCK, saveClock);
  clockApi.applyClock();
  clockApi.tick();
  setInterval(clockApi.tick, 1000);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      clockApi.applyClock();
      clockApi.tick();
    }
  });

  var appearance = initAppearance();

  var panels = initPanels({
    state: state,
    radio: radio,
    picker: pickerApi,
    appearance: appearance,
    clockState: CLOCK,
    CLOCK_DEFS: CLOCK_DEFS,
    applyClock: clockApi.applyClock,
    tick: clockApi.tick,
    saveStations: saveStations,
    defaultStations: defaultStations
  });
  void panels;

  radio.paint();
  radio.setState("idle");
  radio.hint.classList.add("show");

  var playerEl = document.getElementById("player");
  function syncBarHeight() {
    if (!playerEl) return;
    var h = playerEl.offsetHeight || 0;
    if (h > 0) document.documentElement.style.setProperty("--bar-h", h + "px");
  }
  syncBarHeight();
  window.addEventListener("resize", syncBarHeight);
  if (typeof ResizeObserver !== "undefined" && playerEl) {
    try {
      new ResizeObserver(syncBarHeight).observe(playerEl);
    } catch (e) {}
  }
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) syncBarHeight();
  });

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
    if (e.key === " " && e.target === document.body) {
      e.preventDefault();
      if (radio.isWantPlay()) radio.stop();
      else radio.start();
    }
  });

  /* Tap the clock: first tap starts the radio, later taps toggle fullscreen.
     On a 5" panel this is the only reliable hit target. */
  document.getElementById("stage").addEventListener("click", function () {
    if (!radio.isWantPlay()) {
      radio.start();
      return;
    }
    toggleFullscreen();
  });

  if (navigator.wakeLock && navigator.wakeLock.request) {
    navigator.wakeLock.request("screen").catch(function () {});
  }
})();
