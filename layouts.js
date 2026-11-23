// Drill layouts renderer for the practice plan, adaptive blocks and warm-up (drawing, zoom, send-to-Shot-Lab). See data/layouts.js for the content.
// CONTENT (layout list E, AI_NOTE, image/link helpers, rack geometry) lives in data/layouts.js (window.LayoutData); this file only draws it.
(function(){
const { E, AI_NOTE, DD, BUD, R, L, W, rk } = window.LayoutData;
const BY = {}; E.forEach((e) => e.keys.forEach((k) => BY[k] = e));
const COL = { 1: "#f5c518", 2: "#1e5bd8", 3: "#d32f2f", 4: "#6a1b9a", 5: "#ef6c00", 6: "#1b8f3a", 7: "#7b1f1f", 8: "#111" };
const col = (n) => COL[n > 8 ? n - 8 : n] || "#9e9e9e";
function svg(e){ const rail = 4.5; let s = `<svg viewBox="${-rail} ${-rail} ${L + 2 * rail} ${W + 2 * rail}" style="width:100%;height:auto;display:block;border-radius:10px;background:#4a2c17" role="img" aria-label="${e.name} layout (AI-generated)">`;
  s += `<rect x="0" y="0" width="${L}" height="${W}" fill="#1f6f43"/>`;
  for (let i = 1; i < 8; i++) s += `<circle cx="${L * i / 8}" cy="${-rail / 2}" r=".45" fill="#eee"/><circle cx="${L * i / 8}" cy="${W + rail / 2}" r=".45" fill="#eee"/>`;
  for (let i = 1; i < 4; i++) s += `<circle cx="${-rail / 2}" cy="${W * i / 4}" r=".45" fill="#eee"/><circle cx="${L + rail / 2}" cy="${W * i / 4}" r=".45" fill="#eee"/>`;
  s += `<line x1="25" y1="0" x2="25" y2="${W}" stroke="#ffffff33" stroke-width=".25"/><circle cx="75" cy="25" r=".4" fill="#ffffff66"/>`;
  [[0, 0, 4.56], [50, -0.6, 5.06], [L, 0, 4.56], [0, W, 4.56], [50, W + 0.6, 5.06], [L, W, 4.56]].forEach(([x, y, m]) => s += `<circle cx="${x}" cy="${y}" r="${m / 2}" fill="#050505"/>`);
  e.balls.forEach((b) => { const c = col(b.n); s += b.n > 8 ? `<circle cx="${b.x}" cy="${b.y}" r="${R}" fill="#fafafa"/><rect x="${b.x - R}" y="${b.y - R * .5}" width="${2 * R}" height="${R}" fill="${c}"/>` : `<circle cx="${b.x}" cy="${b.y}" r="${R}" fill="${c}"/>`;
    s += `<circle cx="${b.x}" cy="${b.y}" r="${R * .55}" fill="#fff"/><text x="${b.x}" y="${b.y + .42}" font-size="1.1" text-anchor="middle" font-family="Arial" font-weight="700" fill="#111">${b.n}</text>`; });
  if (e.cb) s += `<circle cx="${e.cb[0]}" cy="${e.cb[1]}" r="${R}" fill="#fffef5" stroke="#0006" stroke-width=".2"/><text x="${e.cb[0]}" y="${e.cb[1] - 1.8}" font-size="1.6" text-anchor="middle" fill="#fff" font-family="Arial">CB (ball in hand)</text>`;
  return s + `</svg>`; }
function labOf(e){ if (!e.lab) return null; if (e.lab !== true) return e.lab;
  return { size: "9", cb: e.cb.slice(), balls: e.balls.map((b) => ({ n: b.n, x: b.x, y: b.y })), ob: e.balls[0].n, pocket: "auto", target: null, name: e.name + " (AI-drawn layout)", notes: AI_NOTE }; }
const esc = window.RW.esc; // shared helper (shared/util.js)
function block(e){
  if (e.kind === "video") return `<div class="lay"><div class="meta">📐 Layout: see video.</div></div>`;
  let h = `<div class="lay"><div class="t">📐 ${esc(e.name)}</div>${e.how ? `<div class="how">▶ ${esc(e.how)}</div>` : ""}`;
  if (e.kind === "img") h += `<button class="layimg" data-layzoom="${e.id}" aria-label="Enlarge the ${esc(e.name)} diagram"><img src="${e.img}" alt="${esc(e.name)} ball layout" loading="lazy"></button><div class="credit">${esc(e.credit)} <a href="${esc(e.src)}" target="_blank" rel="noopener">Source</a></div>`;
  else if (e.kind === "link") h += `<a class="btn ghost2" href="${esc(e.src)}" target="_blank" rel="noopener">📄 See layout at source: ${esc(e.srcName)}</a>`;
  else if (e.kind === "svg") h += `<button class="layimg" data-layzoom="${e.id}" aria-label="Enlarge the ${esc(e.name)} diagram">${svg(e)}</button><div class="meta">${esc(e.note)}</div><div class="disc">${AI_NOTE}</div>`;
  else if (e.kind === "none") h += `<div class="meta">${esc(e.layout)}</div>`;
  if (labOf(e)) h += `<button class="btn ghost" data-laylab="${e.id}">Load in Shot Lab</button>`;
  return h + `</div>`;
}
function forList(list){ if (!list || !list.length) return ""; const seen = new Set(); let h = "";
  list.forEach((v) => { const e = BY[v[1]]; if (!e || seen.has(e.id) || (e.kind === "video" && seen.has("vid"))) return; seen.add(e.id); h += block(e); });
  return h; }
function zoom(id){ const e = E.find((x) => x.id === id); if (!e) return;
  const o = document.createElement("div"); o.className = "layzoom"; o.setAttribute("role", "dialog"); o.setAttribute("aria-label", e.name + " diagram");
  o.innerHTML = `<div class="lz-in">${e.kind === "svg" ? svg(e) : `<img src="${e.img}" alt="${esc(e.name)} ball layout">`}<div class="credit">${e.kind === "svg" ? AI_NOTE : esc(e.credit)}</div><button class="btn">Close</button></div>`;
  o.onclick = (ev) => { if (ev.target === o || ev.target.tagName === "BUTTON") o.remove(); }; document.body.appendChild(o); }
document.addEventListener("click", (ev) => {
  const z = ev.target.closest && ev.target.closest("[data-layzoom]"); if (z) { ev.preventDefault(); zoom(z.dataset.layzoom); return; }
  const b = ev.target.closest && ev.target.closest("[data-laylab]"); if (b) { const e = E.find((x) => x.id === b.dataset.laylab); const lay = e && labOf(e); if (!lay) return;
    try { localStorage.setItem("pt_lab_cur", JSON.stringify(lay)); } catch (x) {} if (window.PT_goLab) window.PT_goLab(); }
});
window.Layouts = { E, BY, forList, block, svg, AI_NOTE, counts: () => { const c = { img: 0, link: 0, svg: 0, none: 0, video: 0 }; E.forEach((e) => c[e.kind] += e.kind === "video" ? e.keys.length : 1); return c; } };
})();

