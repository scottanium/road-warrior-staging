// SHARED HELPERS (code). Loaded first; other files pick what they need from window.RW instead of each keeping its own copy.
//   Lg(key, default)  read JSON from localStorage (returns default if missing/broken)
//   Sg(key, value)    write JSON to localStorage, ignoring errors (private mode, quota)
//   SgStrict(k, v)    same write but lets errors through (used where the caller handles them)
//   esc(s)            escape text for HTML (null/undefined -> "")
// Do not rename storage keys here or anywhere: saved data on phones depends on them.
window.RW = (function () {
  const Lg = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const Sg = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const SgStrict = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  return { Lg, Sg, SgStrict, esc };
})();
