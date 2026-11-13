export function initRadio(state, onStationChange) {
  var audio = new Audio();
  var idx = parseInt(localStorage.getItem("fc.station") || "0", 10) || 0;
  var wantPlay = false;

  var playBtn = document.getElementById("play");
  var prevBtn = document.getElementById("prev");
  var nextBtn = document.getElementById("next");
  var nameEl = document.getElementById("stationName");
  var subEl = document.getElementById("stationSub");
  var dot = document.getElementById("dot");
  var vol = document.getElementById("vol");
  var volSetting = document.getElementById("volumeSetting");
  var hint = document.getElementById("hint");

  var savedVol = parseInt(localStorage.getItem("fc.volume") || "70", 10);
  vol.value = savedVol;
  if (volSetting) volSetting.value = savedVol;
  audio.volume = savedVol / 100;

  function currentStation() {
    return state.stations[idx] || { name: "No stations", sub: "add one in Settings" };
  }

  function updateMetadata() {
    if (!("mediaSession" in navigator)) return;
    try {
      var s = currentStation();
      navigator.mediaSession.metadata = new MediaMetadata({
        title: s.name,
        artist: s.sub || "",
        album: "Radio"
      });
    } catch (e) {}
  }

  function paint() {
    var s = currentStation();
    nameEl.textContent = s.name;
    subEl.textContent = s.sub || "";
    document.title = "Flip Clock · " + s.name;
    if (onStationChange) onStationChange(idx, wantPlay);
    updateMetadata();
  }

  function setState(st) {
    dot.className = "dot" + (st === "live" ? " live" : st === "err" ? " err" : "");
    if (st === "live") {
      playBtn.innerHTML = "&#10074;&#10074;";
      playBtn.setAttribute("aria-label", "pause");
      hint.classList.remove("show");
      subEl.textContent = (state.stations[idx] || {}).sub || "";
      updateMetadata();
    } else {
      playBtn.innerHTML = "&#9654;";
      playBtn.setAttribute("aria-label", "play");
      if (st === "err") {
        subEl.textContent = "stream unreachable — try another station";
      } else if (st === "idle") {
        subEl.textContent = (state.stations[idx] || {}).sub || "";
      }
    }
  }

  function start() {
    wantPlay = true;
    if (!state.stations[idx]) {
      setState("idle");
      return;
    }
    audio.src = state.stations[idx].url;
    var p = audio.play();
    if (p && p.catch)
      p.catch(function () {
        setState("err");
        hint.classList.add("show");
      });
  }

  function stop() {
    wantPlay = false;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    setState("idle");
    subEl.textContent = (state.stations[idx] || {}).sub || "";
  }

  function selectStation(i, play) {
    idx = i;
    localStorage.setItem("fc.station", i);
    paint();
    if (wantPlay || play) start();
  }

  function prev() {
    if (!state.stations.length) return;
    idx = (idx - 1 + state.stations.length) % state.stations.length;
    localStorage.setItem("fc.station", idx);
    paint();
    if (wantPlay) start();
  }

  function next() {
    if (!state.stations.length) return;
    idx = (idx + 1) % state.stations.length;
    localStorage.setItem("fc.station", idx);
    paint();
    if (wantPlay) start();
  }

  playBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    if (wantPlay) stop();
    else start();
  });
  prevBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    prev();
  });
  nextBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    next();
  });
  vol.addEventListener("input", function () {
    audio.volume = vol.value / 100;
    if (volSetting) volSetting.value = vol.value;
    localStorage.setItem("fc.volume", vol.value);
  });
  if (volSetting) {
    volSetting.addEventListener("input", function () {
      vol.value = volSetting.value;
      audio.volume = volSetting.value / 100;
      localStorage.setItem("fc.volume", volSetting.value);
    });
  }

  audio.addEventListener("playing", function () {
    setState("live");
  });
  audio.addEventListener("waiting", function () {
    dot.className = "dot";
    if (wantPlay) subEl.textContent = "buffering…";
  });
  audio.addEventListener("pause", function () {
    if (!wantPlay) setState("idle");
  });
  audio.addEventListener("error", function () {
    setState("err");
  });
  audio.addEventListener("stalled", function () {
    dot.className = "dot";
    if (wantPlay) subEl.textContent = "buffering…";
  });

  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.setActionHandler("play", function () {
        start();
      });
      navigator.mediaSession.setActionHandler("pause", function () {
        stop();
      });
      navigator.mediaSession.setActionHandler("nexttrack", function () {
        next();
      });
      navigator.mediaSession.setActionHandler("previoustrack", function () {
        prev();
      });
    } catch (e) {}
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && wantPlay && audio.paused) start();
  });

  function getIdx() {
    return idx;
  }
  function setIdx(i) {
    idx = i;
  }
  function isWantPlay() {
    return wantPlay;
  }

  return {
    audio: audio,
    playBtn: playBtn,
    paint: paint,
    setState: setState,
    start: start,
    stop: stop,
    selectStation: selectStation,
    prev: prev,
    next: next,
    getIdx: getIdx,
    setIdx: setIdx,
    isWantPlay: isWantPlay,
    hint: hint
  };
}
