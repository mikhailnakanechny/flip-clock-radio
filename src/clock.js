var MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function initClock(clock, saveClock) {
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

  var colon = document.getElementById("colon");
  var dateEl = document.getElementById("date");
  var secsEl = document.getElementById("secs");
  var lastMinute = -1;

  function setDigit(el, v) {
    if (el.textContent === v) return;
    if (el.dataset.init !== "1") {
      el.textContent = v;
      el.dataset.init = "1";
      return;
    }
    el.classList.remove("flip-in");
    el.classList.add("flip-out");
    setTimeout(function () {
      el.textContent = v;
      el.classList.remove("flip-out");
      el.classList.add("flip-in");
    }, 180);
  }

  function tick() {
    var now = new Date(),
      h = now.getHours(),
      m = now.getMinutes(),
      s = now.getSeconds();
    var h12 = clock.format === "12-hour";
    var hh = h12 ? h % 12 || 12 : h;

    if (m !== lastMinute) {
      lastMinute = m;
      var hs = (hh < 10 ? "0" : "") + hh;
      var ms = (m < 10 ? "0" : "") + m;
      setDigit(slots.h1, hs[0]);
      setDigit(slots.h2, hs[1]);
      setDigit(slots.m1, ms[0]);
      setDigit(slots.m2, ms[1]);
      var line = DAYS[now.getDay()] + " " + now.getDate() + " " + MONTHS[now.getMonth()];
      if (h12) line += " · " + (h < 12 ? "AM" : "PM");
      dateEl.textContent = line;
    }
    secsEl.textContent = (s < 10 ? ":0" : ":") + s;
    colon.classList.toggle("dim", s % 2 === 1);
    document.body.classList.toggle("night", h >= 23 || h < 7);
  }

  function applyClock() {
    document.body.classList.toggle("nodate", clock.date === "hidden");
    document.body.classList.toggle("showsecs", clock.seconds === "shown");
    document.body.classList.remove("size-large", "size-huge");
    if (clock.size === "large") document.body.classList.add("size-large");
    if (clock.size === "huge") document.body.classList.add("size-huge");
    saveClock(clock);
    lastMinute = -1; /* force the digits to re-render on the next tick */
  }

  return { tick: tick, applyClock: applyClock };
}
