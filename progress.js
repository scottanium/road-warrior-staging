// Progress charts for Skill Tests: make % over time, streaks, recent sessions. Offline, no libraries.
(function () {
  const SELK = "pt_prog_sel";
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = window.RW.esc; // shared helper (shared/util.js)
  const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const SS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  function tests(){ return (window.Adaptive && Adaptive.TESTS) || []; }
  function testById(id){ return tests().find((t) => t.id === id); }
  function shortName(t, id){ return t ? t.name.replace(", set up as a ", " ").split(" (")[0] : (id || ""); }
  function norm(t, raw){ if (window.Adaptive && Adaptive.norm) return Adaptive.norm(t, raw); return t && t.max ? Math.max(0, Math.min(100, Math.round(raw / t.max * 100))) : 0; }
  function scores(){ return (window.Adaptive && Adaptive.scores) ? Adaptive.scores() : LS("pt_tests", {}); }

  function endingStreak(taps){
    let n = 0;
    if (!taps) return 0;
    for (let i = taps.length - 1; i >= 0 && taps[i] === "M"; i--) n++;
    return n;
  }
  function bestStreak(taps){
    let cur = 0, best = 0;
    (taps || []).forEach((x) => { if (x === "M") { cur++; if (cur > best) best = cur; } else cur = 0; });
    return best;
  }

  function sessions(filterId){
    const sc = scores(), out = [];
    Object.keys(sc).forEach((id) => {
      if (filterId && filterId !== "all" && id !== filterId) return;
      const t = testById(id);
      (sc[id] || []).forEach((r, i) => {
        const taps = r.taps && r.taps.length ? r.taps : null;
        const made = r.made != null ? r.made : (taps ? taps.filter((x) => x === "M").length : null);
        const attempts = r.attempts != null ? r.attempts : (taps ? taps.length : null);
        const pct = attempts ? Math.round(made / attempts * 100) : null;
        const best = r.streak != null ? r.streak : (taps ? bestStreak(taps) : null);
        const cur = taps ? endingStreak(taps) : null;
        out.push({ id, name: shortName(t, id) || id, d: r.d || "", raw: r.raw, score: t ? norm(t, r.raw) : null, made, attempts, pct, best, cur, taps, i });
      });
    });
    out.sort((a, b) => (a.d || "").localeCompare(b.d || "") || a.i - b.i);
    return out;
  }

  function statsOf(rows){
    const withPct = rows.filter((r) => r.pct != null);
    const withScore = rows.filter((r) => r.score != null);
    const withStreak = rows.filter((r) => r.best != null);
    const last = rows[rows.length - 1];
    const lastTaps = [...rows].reverse().find((r) => r.cur != null);
    return {
      n: rows.length,
      hasPct: withPct.length > 0,
      lastPct: last && last.pct != null ? last.pct : null,
      lastScore: last && last.score != null ? last.score : null,
      avgPct: withPct.length ? Math.round(withPct.reduce((s, r) => s + r.pct, 0) / withPct.length) : null,
      bestStreak: withStreak.length ? Math.max.apply(null, withStreak.map((r) => r.best || 0)) : null,
      currentStreak: lastTaps ? lastTaps.cur : null,
      lastName: last ? last.name : "",
      lastDate: last ? last.d : ""
    };
  }

  function chartSeries(rows, key){
    // one point per session; same-day sessions stay as separate points in order
    return rows.filter((r) => r[key] != null).map((r) => ({ x: r.d, y: r[key], label: r.name }));
  }

  function svgChart(pts, ylabel){
    if (!pts.length) return "";
    const W = 320, H = 140, padL = 28, padR = 8, padT = 10, padB = 22;
    const iw = W - padL - padR, ih = H - padT - padB;
    const ys = pts.map((p) => p.y);
    let ymin = 0, ymax = 100;
    if (ys.length && Math.max.apply(null, ys) <= 10 && Math.min.apply(null, ys) >= 0) { ymax = 10; }
    const xOf = (i) => padL + (pts.length === 1 ? iw / 2 : i * iw / (pts.length - 1));
    const yOf = (v) => padT + ih - ((v - ymin) / (ymax - ymin || 1)) * ih;
    const acc = "var(--accent)", line = "var(--line)", sub = "var(--sub)", text = "var(--text)";
    let s = `<svg class="prog-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ylabel)} over ${pts.length} session${pts.length === 1 ? "" : "s"}">`;
    [0, 50, 100].forEach((g) => {
      const y = yOf(ymax === 10 ? g / 10 : g);
      if (ymax === 10 && g === 50) return;
      const lab = ymax === 10 ? (g === 100 ? "10" : "0") : String(g);
      if (g === 50 && ymax !== 10 || g === 0 || g === 100) {
        s += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="${line}" stroke-width="1"/>`;
        s += `<text x="${padL - 4}" y="${y + 3}" text-anchor="end" font-size="9" fill="${sub}">${lab}</text>`;
      }
    });
    const d = pts.map((p, i) => (i ? "L" : "M") + xOf(i).toFixed(1) + " " + yOf(p.y).toFixed(1)).join(" ");
    s += `<path d="${d}" fill="none" stroke="${acc}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    pts.forEach((p, i) => {
      s += `<circle cx="${xOf(i).toFixed(1)}" cy="${yOf(p.y).toFixed(1)}" r="3.2" fill="${acc}"/>`;
    });
    const ticks = pts.length === 1 ? [0] : pts.length === 2 ? [0, 1] : [0, Math.round((pts.length - 1) / 2), pts.length - 1];
    const seen = {};
    ticks.forEach((i) => {
      const lab = fmtDate(pts[i].x);
      if (seen[lab] && i !== 0 && i !== pts.length - 1) return;
      seen[lab] = 1;
      const anchor = i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle";
      s += `<text x="${xOf(i).toFixed(1)}" y="${H - 6}" text-anchor="${anchor}" font-size="9" fill="${sub}">${esc(lab)}</text>`;
    });
    s += `</svg>`;
    return s;
  }

  function fmtDate(d){
    if (!d) return "";
    const p = String(d).split("-");
    if (p.length === 3) return (+p[1]) + "/" + (+p[2]);
    return d;
  }

  function selOf(){ const v = LS(SELK, "all"); return v || "all"; }

  function inner(filterId, mode){
    const allIds = {};
    sessions(null).forEach((r) => { allIds[r.id] = r.name; });
    const ids = Object.keys(allIds).sort((a, b) => allIds[a].localeCompare(allIds[b]));
    const rows = sessions(filterId === "all" ? null : filterId);
    const st = statsOf(rows);
    mode = mode || (st.hasPct ? "pct" : "score");
    if (mode === "pct" && !st.hasPct) mode = "score";
    let h = `<div class="t">Progress</div>`;
    if (!rows.length){
      h += `<div class="meta">Save a test score, or log makes and misses with the counter, to see make percentage, streaks and recent sessions here.</div>`;
      return h;
    }
    h += `<div class="row prog-tools"><select id="prog-sel" aria-label="Progress test">${`<option value="all"${filterId === "all" ? " selected" : ""}>All tests</option>`}${ids.map((id) => `<option value="${esc(id)}"${id === filterId ? " selected" : ""}>${esc(allIds[id])}</option>`).join("")}</select>`;
    if (st.hasPct) h += `<div class="chips prog-mode">${[["pct", "Make %"], ["score", "Score"]].map(([k, l]) => `<button type="button" class="chip${mode === k ? " on" : ""}" data-prog-mode="${k}">${l}</button>`).join("")}</div>`;
    h += `</div>`;
    const bits = [];
    bits.push(`${st.n} session${st.n === 1 ? "" : "s"}`);
    if (st.lastPct != null) bits.push(`latest make ${st.lastPct}%`);
    else if (st.lastScore != null) bits.push(`latest ${st.lastScore}/100`);
    if (st.avgPct != null && st.n > 1) bits.push(`avg ${st.avgPct}%`);
    if (st.bestStreak != null) bits.push(`best streak ${st.bestStreak}`);
    if (st.currentStreak != null) bits.push(`current streak ${st.currentStreak}`);
    h += `<div class="prog-stats">${bits.map((b) => `<span>${esc(b)}</span>`).join("")}</div>`;
    const key = mode === "pct" ? "pct" : "score";
    const pts = chartSeries(rows, key);
    const ylabel = mode === "pct" ? "Make percentage" : "Score (0–100)";
    if (pts.length) h += `<div class="prog-chart">${svgChart(pts, ylabel)}</div>`;
    else h += `<div class="meta">No ${mode === "pct" ? "make/miss" : "score"} points to chart yet.</div>`;
    const recent = rows.slice().reverse().slice(0, 8);
    h += `<div class="t" style="margin-top:8px">Recent sessions</div>`;
    h += `<ul class="prog-list">${recent.map((r) => {
      let line = `${fmtDate(r.d)} · ${esc(r.name)}`;
      if (r.attempts) line += ` · ${r.made}/${r.attempts} (${r.pct}%)`;
      else if (r.score != null) line += ` · ${r.score}/100`;
      if (r.best != null) line += ` · streak ${r.best}`;
      return `<li>${line}</li>`;
    }).join("")}</ul>`;
    return h;
  }

  function html(){
    return `<div class="card" id="prog">${inner(selOf())}</div>`;
  }

  function wire(root, redraw){
    const box = root || document;
    const sel = $("#prog-sel", box);
    if (sel) sel.onchange = () => {
      SS(SELK, sel.value || "all");
      const card = $("#prog", box);
      if (card) { card.innerHTML = inner(sel.value); wire(box, redraw); }
    };
    box.querySelectorAll("[data-prog-mode]").forEach((b) => b.onclick = () => {
      const card = $("#prog", box);
      if (card) { card.innerHTML = inner(selOf(), b.dataset.progMode); wire(box, redraw); }
    });
  }

  window.TestProgress = { html, wire, sessions, statsOf };
})();
