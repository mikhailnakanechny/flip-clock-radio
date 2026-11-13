export var DEFAULT_STATIONS = [
  {
    name: "FIP",
    sub: "eclectic · Radio France",
    url: "https://icecast.radiofrance.fr/fip-midfi.mp3"
  },
  {
    name: "FIP Rock",
    sub: "rock · Radio France",
    url: "https://icecast.radiofrance.fr/fiprock-midfi.mp3",
    since: 3
  },
  {
    name: "FIP Jazz",
    sub: "jazz · Radio France",
    url: "https://icecast.radiofrance.fr/fipjazz-midfi.mp3",
    since: 3
  },
  {
    name: "Radio Paradise",
    sub: "eclectic · rock",
    url: "https://stream.radioparadise.com/mp3-128"
  },
  {
    name: "Groove Salad",
    sub: "chill · SomaFM",
    url: "https://ice1.somafm.com/groovesalad-128-mp3"
  },
  { name: "Drone Zone", sub: "ambient · SomaFM", url: "https://ice1.somafm.com/dronezone-128-mp3" },
  { name: "Lush", sub: "vocal chill · SomaFM", url: "https://ice1.somafm.com/lush-128-mp3" },
  {
    name: "Left Coast 70s",
    sub: "rock · SomaFM",
    url: "https://ice1.somafm.com/seventies-128-mp3",
    since: 3
  },
  {
    name: "Sonic Universe",
    sub: "avant jazz · SomaFM",
    url: "https://ice1.somafm.com/sonicuniverse-128-mp3",
    since: 3
  },
  {
    name: "DEF CON Radio",
    sub: "electronic · SomaFM",
    url: "https://ice1.somafm.com/defcon-128-mp3"
  },
  {
    name: "Christmas Lounge",
    sub: "seasonal · SomaFM",
    url: "https://ice1.somafm.com/christmas-128-mp3"
  }
];

export function defaultStations() {
  return DEFAULT_STATIONS.map(function (s) {
    return { name: s.name, sub: s.sub, url: s.url };
  });
}
