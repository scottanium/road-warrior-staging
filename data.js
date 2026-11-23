// Library helpers (code only). The content tables live in data/labels.js, data/library.js and data/plan-days.js,
// which index.html loads BEFORE this file.
const DD = "https://drdavepoolinfo.com";
const url = (s) => (s.startsWith("http") ? s : s.startsWith("/") ? DD + s : "https://www.youtube.com/watch?v=" + s);

const GL = Object.fromEntries(GAMES.map((g) => [g.value, g.label]));
