// CONFIG FILE: settings you may want to change without touching feature code. Loaded BEFORE tournaments.js. Exposes window.RWConfig.
// No passwords, keys or tokens belong here (this file is public on GitHub Pages).
window.RWConfig = {
  // Where the Tournaments tab starts until you set your own location.
  defaultLocation: { label: "Scottsburg, IN (town center)", lat: 38.6856, lon: -85.7702, src: "default" },
  // Public "published to web" CSV of the shared tournament sheet (read-only; the Tournaments tab's "Load shared events" button).
  sharedSheetCsv: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRs22Y2e5a5WU7NhcM_MHN8z8wm2_D5IWkwhhLpnbAj7q8LVKzKLXqKDMgVM758NN5Zse0PVE_h5UE3/pub?gid=0&single=true&output=csv",
  // Place lookup (Set location). Nominatim allows about 1 request per second per user; keep nominatimGapMs at 1000 or more.
  geocode: {
    cacheMax: 50,
    nominatimGapMs: 1000,
    zipUrl: "https://api.zippopotam.us/us/",
    nominatimUrl: "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us,ca&addressdetails=1&q=",
  },
};
