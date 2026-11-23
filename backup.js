// Backup & restore: export all pt_* (and poolTrainer.*) localStorage, plus IndexedDB if any, to a JSON file.
(function () {
  const KIND = "road-warrior-backup";
  const APP = "The Road Warrior";
  const VER = 1;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = window.RW.esc; // shared helper (shared/util.js)

  function keepKey(k){
    return !!(k && (k.indexOf("pt_") === 0 || k.indexOf("poolTrainer.") === 0));
  }
  function parseMaybe(s){
    try { return JSON.parse(s); } catch (e) { return s; }
  }
  function stringify(v){
    return typeof v === "string" ? v : JSON.stringify(v);
  }

  function collectLS(){
    const out = {};
    for (let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if (!keepKey(k)) continue;
      out[k] = parseMaybe(localStorage.getItem(k));
    }
    return out;
  }

  async function collectIDB(){
    const out = {};
    if (!window.indexedDB || !indexedDB.databases) return out;
    let dbs = [];
    try { dbs = await indexedDB.databases(); } catch (e) { return out; }
    for (const info of dbs || []){
      if (!info || !info.name) continue;
      try {
        out[info.name] = await dumpDB(info.name, info.version);
      } catch (e) { out[info.name] = { error: "Could not read this database." }; }
    }
    return out;
  }
  function dumpDB(name, version){
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(name, version);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const names = [...db.objectStoreNames];
        if (!names.length){ db.close(); return resolve({ stores: {} }); }
        const tx = db.transaction(names, "readonly");
        const stores = {};
        let left = names.length;
        names.forEach((sn) => {
          const st = tx.objectStore(sn);
          const rec = { keyPath: st.keyPath, autoIncrement: !!st.autoIncrement, items: [] };
          const r = st.openCursor();
          r.onsuccess = (e) => {
            const c = e.target.result;
            if (c){ rec.items.push({ key: c.key, value: c.value }); c.continue(); }
            else { stores[sn] = rec; if (--left === 0){ db.close(); resolve({ stores }); } }
          };
          r.onerror = () => reject(r.error);
        });
      };
    });
  }

  async function build(){
    const local = collectLS();
    const idb = await collectIDB();
    return {
      app: APP,
      kind: KIND,
      version: VER,
      exported: new Date().toISOString(),
      localStorage: local,
      indexedDB: idb
    };
  }

  function countOf(ls){
    const n = (a) => Array.isArray(a) ? a.length : 0;
    const tests = ls.pt_tests && typeof ls.pt_tests === "object" ? Object.keys(ls.pt_tests).reduce((s, id) => s + n(ls.pt_tests[id]), 0) : 0;
    const testers = ls.pt_tests && typeof ls.pt_tests === "object" ? Object.keys(ls.pt_tests).length : 0;
    return {
      keys: Object.keys(ls).length,
      tests, testers,
      layouts: n(ls.pt_layouts),
      captures: n(ls.pt_tc_layouts),
      setups: n(ls.pt_tc_setups),
      history: n(ls.pt_thist),
      drills: n(ls.pt_drills),
      profile: !!(ls.pt_profile && (ls.pt_profile.fargo || ls.pt_profile.self || ls.pt_profile.useFargo != null)),
      plan: !!(ls.pt_aplan && ls.pt_aplan.days)
    };
  }

  function summaryHTML(data, label){
    const ls = data.localStorage || {};
    const c = countOf(ls);
    const when = data.exported ? new Date(data.exported) : null;
    const whenTxt = when && !isNaN(when) ? when.toLocaleString() : "unknown date";
    const bits = [];
    bits.push(`${c.keys} data key${c.keys === 1 ? "" : "s"}`);
    if (c.tests) bits.push(`${c.tests} test session${c.tests === 1 ? "" : "s"} (${c.testers} test${c.testers === 1 ? "" : "s"})`);
    if (c.layouts) bits.push(`${c.layouts} Shot Lab layout${c.layouts === 1 ? "" : "s"}`);
    if (c.drills) bits.push(`${c.drills} saved drill${c.drills === 1 ? "" : "s"}`);
    if (c.captures) bits.push(`${c.captures} table capture${c.captures === 1 ? "" : "s"}`);
    if (c.setups) bits.push(`${c.setups} camera setup${c.setups === 1 ? "" : "s"}`);
    if (c.history) bits.push(`${c.history} tournament histor${c.history === 1 ? "y" : "ies"}`);
    if (c.profile) bits.push("profile");
    if (c.plan) bits.push("adaptive plan");
    const idbN = data.indexedDB ? Object.keys(data.indexedDB).length : 0;
    if (idbN) bits.push(`${idbN} IndexedDB database${idbN === 1 ? "" : "s"}`);
    return `<div class="bk-sum"><div class="t">${esc(label || "Backup")}</div><div class="meta">Exported ${esc(whenTxt)} · format v${esc(data.version || "?")}</div><ul class="bk-list">${bits.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div>`;
  }

  function validate(raw){
    if (!raw || typeof raw !== "object") return "That file is not a valid backup.";
    if (raw.kind && raw.kind !== KIND) return "That file is not a Road Warrior backup.";
    if (!raw.kind && raw.app && String(raw.app).indexOf("Road Warrior") < 0) return "That file is not a Road Warrior backup.";
    if (!raw.localStorage || typeof raw.localStorage !== "object" || Array.isArray(raw.localStorage)) return "That backup has no localStorage data.";
    const keys = Object.keys(raw.localStorage);
    if (!keys.length) return "That backup is empty.";
    if (keys.some((k) => !keepKey(k))) return "That backup contains unexpected keys and was not applied.";
    if (raw.version != null && (typeof raw.version !== "number" || raw.version > VER + 5)) return "That backup is from a newer format this app doesn't understand yet.";
    return null;
  }

  function filename(){
    const d = new Date();
    const z = (n) => String(n).padStart(2, "0");
    return "road-warrior-backup-" + d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + ".json";
  }

  async function exportBackup(){
    const data = await build();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const name = filename();
    const file = new File([blob], name, { type: "application/json" });
    if (navigator.share && navigator.canShare){
      try {
        if (navigator.canShare({ files: [file] })){
          await navigator.share({ files: [file], title: name, text: APP + " backup" });
          return "shared";
        }
      } catch (e){ if (e && e.name === "AbortError") return "cancelled"; }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 8000);
    return "downloaded";
  }

  function clearOurs(){
    const keys = [];
    for (let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if (keepKey(k)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  }

  function mergeArrays(cur, inc){
    const a = Array.isArray(cur) ? cur.slice() : [];
    const b = Array.isArray(inc) ? inc : [];
    const seen = new Set(a.map((x) => JSON.stringify(x)));
    b.forEach((x) => { const k = JSON.stringify(x); if (!seen.has(k)){ seen.add(k); a.push(x); } });
    return a;
  }
  function mergeTests(cur, inc){
    const out = cur && typeof cur === "object" && !Array.isArray(cur) ? JSON.parse(JSON.stringify(cur)) : {};
    Object.keys(inc || {}).forEach((id) => {
      const add = Array.isArray(inc[id]) ? inc[id] : [];
      const have = Array.isArray(out[id]) ? out[id] : [];
      const seen = new Set(have.map((x) => JSON.stringify(x)));
      const next = have.slice();
      add.forEach((x) => { const k = JSON.stringify(x); if (!seen.has(k)){ seen.add(k); next.push(x); } });
      out[id] = next;
    });
    return out;
  }

  const ARRAY_KEYS = { pt_layouts: 1, pt_tc_layouts: 1, pt_tc_setups: 1, pt_thist: 1, pt_drills: 1, pt_money: 1 };

  function apply(data, mode){
    const inc = data.localStorage || {};
    if (mode === "replace") clearOurs();
    const cur = collectLS();
    Object.keys(inc).forEach((k) => {
      if (!keepKey(k)) return;
      let val = inc[k];
      if (mode === "merge"){
        if (k === "pt_tests") val = mergeTests(cur[k], inc[k]);
        else if (ARRAY_KEYS[k]) val = mergeArrays(cur[k], inc[k]);
        else if (Object.prototype.hasOwnProperty.call(cur, k)) return; // keep existing scalar
      }
      localStorage.setItem(k, stringify(val));
    });
    return true;
  }

  let pending = null;

  function render(_, e){
    const ex = e || esc;
    $("#title").textContent = "Backup & Restore";
    $("#headx").innerHTML = "";
    let h = `<div class="callout">Everything stays on this device until you export it. The file includes test scores, the make/miss history, your profile, plans, Shot Lab layouts, table captures, and other Road Warrior settings. Use it to move to a new phone or to keep a copy.</div>`;
    h += `<div class="card"><div class="t">Export</div><div class="meta">Creates a JSON file you can save or share (on iPhone, use the share sheet and Save to Files or AirDrop).</div><div class="row"><button type="button" class="btn" id="bk-export">Download backup</button></div><div class="meta" id="bk-expmsg"></div></div>`;
    h += `<div class="card"><div class="t">Import</div><div class="meta">Choose a backup file, preview what's in it, then merge it with what's already here or replace everything.</div><div class="row"><label class="btn ghost" id="bk-pick">Choose backup file<input type="file" id="bk-file" accept="application/json,.json" style="display:none"></label></div><div id="bk-preview"></div></div>`;
    $("#main").innerHTML = h;
    $("#bk-export").onclick = () => {
      const msg = $("#bk-expmsg");
      msg.textContent = "Preparing…";
      exportBackup().then((how) => {
        msg.textContent = how === "shared" ? "Share sheet opened." : how === "cancelled" ? "Share cancelled." : "Backup file ready. If it didn't download, check your browser's downloads or share the file from the prompt.";
      }).catch((err) => { msg.textContent = "Couldn't export: " + (err && err.message || err); });
    };
    $("#bk-file").onchange = (ev) => {
      const f = ev.target.files && ev.target.files[0];
      ev.target.value = "";
      if (!f) return;
      const reader = new FileReader();
      reader.onerror = () => { $("#bk-preview").innerHTML = `<div class="bad">Couldn't read that file.</div>`; };
      reader.onload = () => {
        let data;
        try { data = JSON.parse(reader.result); } catch (e) { $("#bk-preview").innerHTML = `<div class="bad">That file isn't valid JSON.</div>`; pending = null; return; }
        const err = validate(data);
        if (err){ $("#bk-preview").innerHTML = `<div class="bad">${ex(err)}</div>`; pending = null; return; }
        pending = data;
        let ph = summaryHTML(data, "This backup");
        ph += `<div class="row"><button type="button" class="btn" id="bk-merge">Merge with existing</button><button type="button" class="btn ghost" id="bk-replace">Replace all data</button></div><div class="meta">Merge keeps your current settings and adds any new scores, layouts and other lists from the file. Replace wipes Road Warrior data on this device and loads the file instead.</div>`;
        $("#bk-preview").innerHTML = ph;
        $("#bk-merge").onclick = () => goImport("merge");
        $("#bk-replace").onclick = () => goImport("replace");
      };
      reader.readAsText(f);
    };
  }

  function goImport(mode){
    if (!pending) return;
    const c = countOf(pending.localStorage || {});
    const msg = mode === "replace"
      ? "Replace all Road Warrior data on this device with this backup (" + c.keys + " keys, " + c.tests + " test sessions)? This cannot be undone except by importing another backup."
      : "Merge this backup into the data already on this device (" + c.keys + " keys, " + c.tests + " test sessions)? Existing settings stay; new scores and lists are added.";
    if (!confirm(msg)) return;
    try {
      apply(pending, mode);
      pending = null;
      alert("Import complete. The app will reload so everything is up to date.");
      location.reload();
    } catch (e){
      alert("Import failed: " + (e && e.message || e));
    }
  }

  window.Backup = { render, build, validate, apply, collectLS, countOf, summaryHTML, exportBackup, KIND };
})();
