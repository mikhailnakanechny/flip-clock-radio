export var CLOCK_DEFS = [
  { id: "format", name: "Time format", values: ["24-hour", "12-hour"] },
  { id: "date", name: "Date line", values: ["shown", "hidden"] },
  { id: "size", name: "Card size", values: ["normal", "large", "huge"], def: "huge" },
  { id: "seconds", name: "Seconds", values: ["hidden", "shown"] }
];

export function loadClock() {
  var clock;
  try {
    clock = JSON.parse(localStorage.getItem("fc.clock") || "{}");
  } catch (e) {
    clock = {};
  }
  /* defaults v2: huge cards replaced normal as the default. Existing installs
     get it once; a deliberate large/huge choice is left alone. */
  if (clock.v !== 2) {
    if (!clock.size || clock.size === "normal") clock.size = "huge";
    clock.v = 2;
  }
  CLOCK_DEFS.forEach(function (d) {
    if (d.values.indexOf(clock[d.id]) === -1) clock[d.id] = d.def || d.values[0];
  });
  return clock;
}

export function saveClock(clock) {
  localStorage.setItem("fc.clock", JSON.stringify(clock));
}
