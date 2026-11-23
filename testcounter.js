// Tap make/miss counter for Skill Tests. Mid-test state in localStorage; final score
// is saved through Adaptive.saveTestScore so the adaptive plan updates the same way as typing a score.
(function () {
  const KEY = "pt_tally";
  const COOL = 240;
  const PROG = { f1r: 1, f1l: 1, f2: 1, f3: 1, f4: 1, f5: 1 };
  const MAKES = { f6: 1, stk: 1, spd: 1, bk10: 1, lng: 1, s7: 1, s6: 1, s9: 1, s5: 1 };
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

  const ldAll = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } };
  const svAll = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };
  const load = (id) => { const r = ldAll()[id]; return r && Array.isArray(r.taps) ? r : { taps: [] }; };
  const save = (id, taps) => {
    const all = ldAll();
    if (!taps || !taps.length) delete all[id];
    else all[id] = { taps: taps, at: Date.now() };
    svAll(all);
  };
  const clear = (id) => { const all = ldAll(); delete all[id]; svAll(all); };
  const idsInProgress = () => Object.keys(ldAll()).filter((id) => (ldAll()[id].taps || []).length);

  function spec(t) {
    if (!t) return null;
    if (PROG[t.id]) return { attempts: 10, mode: "progressive", autoScore: true };
    if (t.id === "colr" || t.id === "coll") return { attempts: 8, mode: "points", pts: 5, autoScore: true };
    if (t.id === "bu6") return { attempts: 40, mode: "points", pts: 2.5, autoScore: true };
    if (t.id === "prs") return { attempts: 10, mode: "streak", autoScore: true };
    if (MAKES[t.id]) return { attempts: t.max, mode: "makes", pts: 1, autoScore: true };
    return { attempts: 0, mode: "makes", pts: 1, autoScore: false };
  }

  function progressive(taps) {
    let pos = 4, bonus = 0;
    (taps || []).forEach((x) => {
      if (x === "M") { if (pos === 7) bonus++; else pos++; }
      else if (pos > 1) pos--;
    });
    return { pos: pos, bonus: bonus, raw: Math.min(10, pos + bonus) };
  }

  function streaks(taps) {
    let cur = 0, best = 0;
    (taps || []).forEach((x) => { if (x === "M") { cur++; if (cur > best) best = cur; } else cur = 0; });
    return { current: cur, best: best };
  }

  function madeOf(taps) { return (taps || []).filter((x) => x === "M").length; }

  function scoreOf(t, taps) {
    const sp = spec(t);
    const n = (taps || []).length, made = madeOf(taps), st = streaks(taps);
    let raw = made;
    if (sp.mode === "progressive") raw = progressive(taps).raw;
    else if (sp.mode === "points") raw = made * (sp.pts || 1);
    else if (sp.mode === "streak") raw = st.best;
    else raw = made * (sp.pts || 1);
    if (raw > t.max) raw = t.max;
    if (raw < 0) raw = 0;
    return { raw: raw, made: made, attempts: n, streak: st.best, current: st.current, sp: sp };
  }

  function fmtHist(taps) {
    return (taps || []).map((x) => x === "M" ? "✓" : "✗").join(" ");
  }

  function extraOf(t, taps) {
    const s = scoreOf(t, taps);
    return { taps: taps.slice(), made: s.made, attempts: s.attempts, streak: s.streak };
  }

  // ---- wake lock (fail silently) ----
  let WL = null;
  const lockOn = async () => {
    if (!("wakeLock" in navigator) || WL || document.hidden) return;
    try {
      WL = await navigator.wakeLock.request("screen");
      WL.addEventListener("release", () => { WL = null; });
    } catch (e) { WL = null; }
  };
  const lockOff = async () => { try { if (WL) await WL.release(); } catch (e) {} WL = null; };
  function pinHead() {
    const h = document.querySelector("header");
    const px = h ? Math.round(h.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty("--tests-head-h", px + "px");
  }
  function syncWake() {
    const active = idsInProgress().length && window.PT_curView && PT_curView() === "tests";
    if (active) lockOn(); else lockOff();
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) syncWake(); });
  window.addEventListener("hashchange", syncWake);
  window.addEventListener("resize", pinHead);

  function buzz(kind) {
    try {
      if (!navigator.vibrate) return;
      navigator.vibrate(kind === "miss" ? 18 : kind === "undo" ? 8 : 12);
    } catch (e) {}
  }

  function html(t, esc) {
    if (!t) return "";
    return `<div class="tally" data-tally="${esc(t.id)}">
      <div class="tally-btns">
        <button type="button" class="tally-make" data-tally-act="make">MAKE</button>
        <button type="button" class="tally-miss" data-tally-act="miss">MISS</button>
      </div>
      <div class="tally-stat" data-tally-stat aria-live="polite"></div>
      <div class="meta tally-sub" data-tally-sub></div>
      <div class="tally-hist" data-tally-hist aria-label="Attempt history"></div>
      <div class="row tally-acts">
        <button type="button" class="btn ghost" data-tally-act="undo">Undo</button>
        <button type="button" class="btn ghost" data-tally-act="reset">Reset</button>
        <button type="button" class="btn" data-tally-act="save">Save</button>
      </div>
      <div class="tally-done" hidden data-tally-done>
        <div class="t" data-tally-done-msg></div>
        <div class="row" style="margin-top:8px">
          <button type="button" class="btn" data-tally-act="confirm">Save this score</button>
          <button type="button" class="btn ghost" data-tally-act="keep">Not yet</button>
        </div>
      </div>
    </div>`;
  }

  function statText(t, taps) {
    const s = scoreOf(t, taps), n = taps.length, left = s.sp.attempts ? Math.max(0, s.sp.attempts - n) : null;
    const pct = n ? Math.round(s.made / n * 100) : 0;
    let main = n ? `Made ${s.made} / ${n}` : "No shots yet — tap MAKE or MISS after each attempt.";
    if (n) main += ` · ${pct}%`;
    if (left != null) main += n ? (left ? ` · ${left} left` : " · done") : ` · ${s.sp.attempts} attempts`;
    let sub = "";
    if (s.sp.mode === "progressive") {
      const p = progressive(taps);
      sub = n ? `Position ${p.pos} of 7${p.bonus ? " · " + p.bonus + " bonus at 7" : ""} · running score ${p.raw} / ${t.max}.` : "Progressive: start at position 4. A make moves you up, a miss down. Score is the final position plus a bonus for each make at 7.";
    } else if (s.sp.mode === "points") {
      sub = n ? `Score ${s.raw} / ${t.max} (${s.sp.pts} point${s.sp.pts === 1 ? "" : "s"} per make).` : `${s.sp.attempts} shots, ${s.sp.pts} point${s.sp.pts === 1 ? "" : "s"} per make, ${t.max} max.`;
    } else if (s.sp.mode === "streak") {
      sub = n ? `Current streak ${s.current} · best ${s.streak}. Score is your longest run of makes (${s.streak} / ${t.max}).` : "Score is your longest run of makes in these 10 shots.";
    } else if (s.sp.autoScore) {
      sub = n ? `Score ${s.raw} / ${t.max}.` : `1 point per make, ${s.sp.attempts} shots, ${t.max} max.`;
    } else {
      sub = "This test's official score may not be a simple make count. Use the counter as a log, then enter the score below.";
    }
    if (n && (s.sp.mode === "makes" || s.sp.mode === "points" || s.sp.mode === "progressive")) {
      if (s.current) sub += (sub ? " · " : "") + `Streak ${s.current}` + (s.streak && s.streak !== s.current ? ` (best ${s.streak})` : "");
      else if (s.streak) sub += (sub ? " · " : "") + `Best streak ${s.streak}`;
    }
    return { main: main, sub: sub };
  }

  function doneMsg(t, taps) {
    const s = scoreOf(t, taps);
    if (s.sp.mode === "progressive") {
      const p = progressive(taps);
      return `Finished ${taps.length} shots. Ended at position ${p.pos}${p.bonus ? " with " + p.bonus + " bonus at 7" : ""}. Save ${s.raw} / ${t.max}?`;
    }
    if (s.sp.mode === "streak") return `Finished ${taps.length} shots. Longest streak ${s.streak}. Save ${s.raw} / ${t.max}?`;
    const pct = taps.length ? Math.round(s.made / taps.length * 100) : 0;
    return `Finished ${taps.length} shots: ${s.made} made (${pct}%). Save ${s.raw} / ${t.max}?`;
  }

  let lastTap = 0;

  function paint(el, t) {
    if (!el || !t) return;
    const taps = load(t.id).taps;
    const s = scoreOf(t, taps);
    const st = statText(t, taps);
    const stat = $("[data-tally-stat]", el);
    const sub = $("[data-tally-sub]", el);
    const hist = $("[data-tally-hist]", el);
    const done = $("[data-tally-done]", el);
    const dmsg = $("[data-tally-done-msg]", el);
    const saveBtn = $("[data-tally-act='save']", el);
    const undoBtn = $("[data-tally-act='undo']", el);
    const makeBtn = $("[data-tally-act='make']", el);
    const missBtn = $("[data-tally-act='miss']", el);
    if (stat) stat.textContent = st.main;
    if (sub) sub.textContent = st.sub;
    if (hist) hist.textContent = taps.length ? fmtHist(taps) : "";
    const atEnd = s.sp.autoScore && s.sp.attempts && taps.length >= s.sp.attempts;
    if (done) done.hidden = !atEnd;
    if (dmsg && atEnd) dmsg.textContent = doneMsg(t, taps);
    if (saveBtn) {
      saveBtn.disabled = !taps.length;
      saveBtn.textContent = s.sp.autoScore && taps.length ? "Save " + s.raw + "/" + t.max : "Fill in score";
    }
    if (undoBtn) undoBtn.disabled = !taps.length;
    const lockTap = atEnd;
    if (makeBtn) makeBtn.disabled = lockTap;
    if (missBtn) missBtn.disabled = lockTap;
    el.classList.toggle("tally-on", !!taps.length);
    el.classList.toggle("tally-end", atEnd);
  }

  function testById(id) {
    const T = (window.Adaptive && Adaptive.TESTS) || [];
    return T.find((x) => x.id === id);
  }

  function commit(id, taps, el) {
    const t = testById(id);
    if (!t) return;
    const s = scoreOf(t, taps);
    if (!s.sp.autoScore) {
      const inp = document.querySelector(`[data-tin="${id}"]`);
      const det = inp && inp.closest("details");
      if (det) det.open = true;
      if (inp && s.made <= t.max) { inp.value = s.raw; inp.focus(); }
      return;
    }
    if (!window.Adaptive || !Adaptive.saveTestScore) return;
    if (!Adaptive.saveTestScore(id, s.raw, extraOf(t, taps))) return;
    clear(id);
    syncWake();
    if (typeof commit.refresh === "function") commit.refresh(id);
  }

  function act(id, kind, el) {
    const t = testById(id);
    if (!t) return;
    let taps = load(id).taps.slice();
    const s0 = scoreOf(t, taps);
    if (kind === "make" || kind === "miss") {
      if (s0.sp.autoScore && s0.sp.attempts && taps.length >= s0.sp.attempts) return;
      const now = Date.now();
      if (now - lastTap < COOL) return;
      lastTap = now;
      taps.push(kind === "make" ? "M" : "X");
      save(id, taps);
      buzz(kind);
      paint(el, t);
      syncWake();
      return;
    }
    if (kind === "undo") {
      if (!taps.length) return;
      taps.pop();
      save(id, taps);
      buzz("undo");
      paint(el, t);
      syncWake();
      return;
    }
    if (kind === "reset") {
      if (!taps.length) return;
      if (!confirm("Reset the make/miss count for this test? The shots you've already tapped will be cleared.")) return;
      clear(id);
      paint(el, t);
      syncWake();
      return;
    }
    if (kind === "keep") {
      const done = $("[data-tally-done]", el);
      if (done) done.hidden = true;
      return;
    }
    if (kind === "save" || kind === "confirm") {
      if (!taps.length) return;
      if (kind === "save" && s0.sp.autoScore && s0.sp.attempts && taps.length < s0.sp.attempts) {
        if (!confirm("You've logged " + taps.length + " of " + s0.sp.attempts + " shots. Save a score of " + s0.raw + " / " + t.max + " now?")) return;
      }
      commit(id, taps, el);
    }
  }

  function wire(root, opts) {
    opts = opts || {};
    if (opts.refresh) commit.refresh = opts.refresh;
    const box = root || document;
    pinHead();
    $$("[data-tally]", box).forEach((el) => {
      const t = testById(el.dataset.tally);
      if (!t) return;
      paint(el, t);
      el.onclick = (e) => {
        const b = e.target.closest("[data-tally-act]");
        if (!b || b.disabled) return;
        act(el.dataset.tally, b.dataset.tallyAct, el);
      };
    });
    syncWake();
  }

  function take(id) {
    const t = testById(id);
    const taps = load(id).taps;
    if (!t || !taps.length) return null;
    const ex = extraOf(t, taps);
    clear(id);
    syncWake();
    return ex;
  }

  window.TestCounter = { KEY, spec, scoreOf, progressive, streaks, load, save, clear, html, wire, take, idsInProgress, fmtHist, syncWake };
})();
