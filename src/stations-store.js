export var STATIONS_VERSION = 3;

export function loadStations(defaultStations) {
  try {
    var saved = JSON.parse(localStorage.getItem("fc.stations"));
    if (Array.isArray(saved)) return saved;
  } catch (e) {}
  return defaultStations();
}

export function saveStations(stations) {
  localStorage.setItem("fc.stations", JSON.stringify(stations));
}

export function mergeNewDefaults(stations, defaultStationDefs) {
  try {
    if (localStorage.getItem("fc.stationsV") === String(STATIONS_VERSION)) return stations;
    defaultStationDefs.forEach(function (d) {
      if (d.since !== STATIONS_VERSION) return;
      var present = stations.some(function (s) {
        return s.url === d.url;
      });
      if (!present) stations.push({ name: d.name, sub: d.sub, url: d.url });
    });
    localStorage.setItem("fc.stationsV", String(STATIONS_VERSION));
    saveStations(stations);
  } catch (e) {}
  return stations;
}
