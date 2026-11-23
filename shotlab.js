// Shot Lab: to-scale table, drag balls, shot suggestions (approximate training aid), photo-to-layout.
(function(){
const R = 1.125; // ball radius, in (2.25 in ball, WPA)
const TABLES = { "7": { L: 78, W: 39, name: "7 ft (78x39 in, typical bar box; not regulated)" }, "8": { L: 88, W: 44, name: "8 ft (88x44 in)" }, "8p": { L: 92, W: 46, name: "8 ft pro / 8.5 ft (92x46 in, WPA 8 ft)" }, "9": { L: 100, W: 50, name: "9 ft (100x50 in, WPA)" }, "10": { L: 112, W: 56, name: "10 ft (112x56 in, oversize)" } };
const MOUTH = { corner: 4.5625, side: 5.0625 }; // WPA ranges 4.5-4.625 / 5-5.125 in (midpoints)
const COL = { 1: "#f5c518", 2: "#1e5bd8", 3: "#d32f2f", 4: "#6a1b9a", 5: "#ef6c00", 6: "#1b8f3a", 7: "#7b1f1f", 8: "#111" };
const ballCol = (n) => COL[n > 8 ? n - 8 : n] || "#9e9e9e";
const TIPS = [["Max low (≈1.5 tips low)", -1.25], ["1 tip low", -0.9], ["1/2 tip low", -0.45], ["Center", 0], ["1/2 tip high", 0.45], ["1 tip high", 0.9], ["Max high (≈1.5 tips high)", 1.25]];
const SPEEDS = [["Soft", 30], ["Medium", 55], ["Firm", 85], ["Power", 120]]; // in/s at the cue ball (rough)
const TIPMODES = { follow: { kc: 1, k0: 1, label: "Follow" }, stun: { kc: 0, k0: 0, label: "Stun" }, draw: { kc: -0.85, k0: -0.9, label: "Draw" } };
function strokeOf(){
  const d = LS("pt_lab_stroke", null) || {};
  const tip = (d.tip === "stun" || d.tip === "draw") ? d.tip : "follow";
  let v0 = +d.v0; if (!(v0 >= 15 && v0 <= 150)) v0 = 55;
  const side = (d.side === -1 || d.side === 1) ? d.side : 0;
  const tm = TIPMODES[tip];
  return { tip, v0, side, kc: tm.kc, k0: tm.k0, label: tm.label };
}
function setStroke(p){
  const cur = strokeOf();
  if (p){
    if (p.tip === "follow" || p.tip === "stun" || p.tip === "draw") cur.tip = p.tip;
    if (p.v0 != null && isFinite(+p.v0)) cur.v0 = Math.max(15, Math.min(150, +p.v0));
    if (p.side === -1 || p.side === 0 || p.side === 1) cur.side = p.side;
  }
  SS("pt_lab_stroke", { tip: cur.tip, v0: cur.v0, side: cur.side });
  return strokeOf();
}
function speedName(v){
  if (Math.abs(v - 30) <= 8) return "Soft";
  if (Math.abs(v - 55) <= 8) return "Medium";
  if (Math.abs(v - 85) <= 8) return "Firm";
  if (v >= 110) return "Power";
  return v + " in/s";
}
function strokeLabel(st){
  st = st || strokeOf();
  const tip = st.tip === "stun" ? "stun (90° tangent)" : st.tip === "draw" ? "draw" : "follow";
  const en = st.side < 0 ? " · left english" : st.side > 0 ? " · right english" : "";
  return tip + ", " + speedName(st.v0).toLowerCase() + " " + Math.round(st.v0) + " in/s" + en;
}
const MU_S = 0.2, MU_R = 0.012, G = 386, E_RAIL = 0.75; // sliding / rolling friction, gravity in/s^2, rail restitution (rough)
const PKNAME = { TL: "top-left corner", TS: "top side", TR: "top-right corner", BL: "bottom-left corner", BS: "bottom side", BR: "bottom-right corner" };
const PKIDS = ["TL", "TS", "TR", "BL", "BS", "BR"];
const RAILIDS = ["T", "B", "L", "R"];
const RAILNAME = { T: "top long rail", B: "bottom long rail", L: "left short rail", R: "right short rail" };
const SHOTTYPES = [["cut", "Cut"], ["bank", "Bank"], ["kick", "Kick"]];
const showGhost = () => LS("pt_lab_showGhost", true) !== false;
const setShowGhost = (v) => SS("pt_lab_showGhost", !!v);
const wantTarget = () => LS("pt_lab_wantTarget", true) !== false;
const setWantTarget = (v) => SS("pt_lab_wantTarget", !!v);
const FRAC = { 0: "", 1: "⅛", 2: "¼", 3: "⅜", 4: "½", 5: "⅝", 6: "¾", 7: "⅞" };
function tipsText(t){ const e = Math.round(Math.abs(t) * 8); const w = Math.floor(e / 8), f = FRAC[e % 8]; return (w ? String(w) : "") + f || "0"; }
function tipLabel(k0, side){
  const e = Math.round(Math.abs(k0) / 0.9 * 8);
  let v = e === 0 ? "Center ball (stun)" : tipsText(k0 / 0.9) + " tip " + (k0 > 0 ? "high (follow)" : "low (draw)");
  const se = Math.round(Math.abs(side) * 0.9 * 8);
  const en = se === 0 ? "" : tipsText(side * 0.9) + " tip " + (side < 0 ? "left" : "right") + " english";
  return { vert: v, english: en || "no english", full: v + (en ? " + " + en : "") };
}
function speedLabel(v0){
  const nm = speedName(v0);
  if (nm === "Soft" || nm === "Medium" || nm === "Firm" || nm === "Power") return { name: nm, text: nm + " (" + Math.round(v0) + " in/s ≈ " + (v0 * 0.0568).toFixed(1) + " mph)" };
  return { name: "Custom", text: Math.round(v0) + " in/s ≈ " + (v0 * 0.0568).toFixed(1) + " mph" };
}
// Map a solver stroke onto v24's Follow / Stun / Draw + Left / None / Right + speed slider (no second set of controls).
function tipModeOf(k0){ return k0 <= -0.45 ? "draw" : k0 >= 0.45 ? "follow" : "stun"; }
function strokeFromCand(c){
  if (!c) return strokeOf();
  const side = c.side <= -0.25 ? -1 : c.side >= 0.25 ? 1 : 0;
  return setStroke({ tip: tipModeOf(c.k0), v0: c.v0, side });
}
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const SS = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const cssVar = (n, fb) => { try { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb; } catch (e) { return fb; } };
const v2 = { add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]], mul: (a, s) => [a[0] * s, a[1] * s], dot: (a, b) => a[0] * b[0] + a[1] * b[1], len: (a) => Math.hypot(a[0], a[1]), norm: (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; } };

function pockets(T){ const { L, W } = T; return [["TL", [0, 0], "corner"], ["TS", [L / 2, -0.6], "side"], ["TR", [L, 0], "corner"], ["BL", [0, W], "corner"], ["BS", [L / 2, W + 0.6], "side"], ["BR", [L, W], "corner"]]; }
// aim point a little inside the pocket mouth center
function aimPoint(p, T){ const [id, c, k] = p; if (k === "side") return [c[0], c[1] < 1 ? 0.4 : T.W - 0.4]; const dx = c[0] === 0 ? 1 : -1, dy = c[1] === 0 ? 1 : -1; return [c[0] + dx * 0.9, c[1] + dy * 0.9]; }
function distSeg(p, a, b){ const ab = v2.sub(b, a), t = Math.max(0, Math.min(1, v2.dot(v2.sub(p, a), ab) / (v2.dot(ab, ab) || 1))); return [v2.len(v2.sub(p, v2.add(a, v2.mul(ab, t)))), t]; }

// Cue ball travel to contact: returns speed and spin ratio at contact (spin ratio 1 = natural roll)
function approach(v0, k0, d){ let v = v0, w = k0 * v0, s = 0; const dt = 0.002;
  while (s < d && v > 0.5){ const slip = v - w; if (Math.abs(slip) > 0.3){ const sg = Math.sign(slip); v -= sg * MU_S * G * dt; w += sg * 2.5 * MU_S * G * dt; } else { v -= MU_R * G * dt; w = v; } s += v * dt; }
  return { v: Math.max(v, 0), k: v > 0 ? w / v : 1, reached: s >= d }; }

// Simulate CB after contact: velocity Va (vector) and spin vector (velocity-equivalent) Ws. Rails reflect. Returns path points.
// v2 fix: one allocation-free physics core (same model and constants as before) so the target solver can run hundreds of shots quickly.
const _pkCache = {};
function pocketList(T){ const k = T.L + "x" + T.W; return _pkCache[k] || (_pkCache[k] = pockets(T).map(([id, c, kd]) => [c[0], c[1], (kd === "corner" ? MOUTH.corner : MOUTH.side) * 0.5, Math.pow((kd === "corner" ? MOUTH.corner : MOUTH.side) * 0.5, 2)])); }
function segDist(px, py, ax, ay, bx, by){ const abx = bx - ax, aby = by - ay, d = abx * abx + aby * aby || 1; const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / d)); return Math.hypot(px - (ax + abx * t), py - (ay + aby * t)); }
function simCore(sx, sy, vx, vy, wx, wy, T, side, opt){
  opt = opt || {}; const wantPts = !!opt.pts, others = opt.others || null; const pts = wantPts ? [[sx, sy]] : null; const pk = pocketList(T);
  const dt = 0.004, minX = R, maxX = T.L - R, minY = R, maxY = T.W - R, aMu = MU_S * G * dt, aSp = 2.5 * MU_S * G * dt, aR = MU_R * G * dt;
  let px = sx, py = sy, rails = 0, t = 0, npts = 1, lx = sx, ly = sy, kiss = null, scratch = false;
  const mark = (x, y) => { if (wantPts) pts.push([x, y]); if (others && !kiss) for (let i = 0; i < others.length; i++){ const q = others[i]; if (segDist(q[0], q[1], lx, ly, x, y) < 2 * R - 0.05){ kiss = [q[0], q[1]]; break; } } lx = x; ly = y; npts++; };
  while (t < 20){
    const slx = vx - wx, sly = vy - wy, sl = Math.sqrt(slx * slx + sly * sly);
    if (sl > 0.4){ const inv = 1 / sl, ux = slx * inv, uy = sly * inv; vx -= ux * aMu; vy -= uy * aMu; wx += ux * aSp; wy += uy * aSp; }
    else { const sp = Math.sqrt(vx * vx + vy * vy); if (sp < 0.6) break; const nv = Math.max(sp - aR, 0), f = nv / sp; vx *= f; vy *= f; wx = vx; wy = vy; }
    px += vx * dt; py += vy * dt; t += dt;
    let hit = false;
    if (px < minX || px > maxX){ px = px < minX ? minX : maxX; vx = -vx * E_RAIL; wx = -wx * 0.5; hit = true; }
    if (py < minY || py > maxY){ py = py < minY ? minY : maxY; vy = -vy * E_RAIL; wy = -wy * 0.5; hit = true; }
    if (hit){ rails++;
      if (side){ const sp = Math.sqrt(vx * vx + vy * vy); let ax, ay; if (Math.abs(vx) > Math.abs(vy)){ ax = vx / (Math.abs(vx) || 1); ay = 0; } else { ax = 0; ay = vy / (Math.abs(vy) || 1); } const k = side * 0.15 * sp; vx += ax * k; vy += ay * k; side *= 0.4; }
      mark(px, py); }
    if (npts < 400 && (t % 0.05) < dt) mark(px, py);
    for (let i = 0; i < pk.length; i++){ const dx = px - pk[i][0], dy = py - pk[i][1]; if (dx * dx + dy * dy < pk[i][3]){ scratch = true; break; } }
    if (scratch){ mark(px, py); return { pts, end: [px, py], rails, scratch: true, kiss }; }
  }
  mark(px, py); return { pts, end: [px, py], rails, scratch: false, kiss }; }
function simCB(start, Va, Ws, T, side, others){ return simCore(start[0], start[1], Va[0], Va[1], Ws[0], Ws[1], T, side || 0, { pts: true, others: others ? others.map((b) => [b.x, b.y]) : null }); }
function pocketedAt(p, T){ return pockets(T).some(([id, c, k]) => v2.len(v2.sub(p, c)) < (k === "corner" ? MOUTH.corner * 0.5 : MOUTH.side * 0.5)); }

// Cut-induced throw estimate (rough, after Dr. Dave TP A.14 trends): biggest near half-ball, slower = more, roll halves it
function throwDeg(cutDeg, speedIn, kAtContact){ const base = speedIn < 40 ? 5 : speedIn < 70 ? 3.8 : speedIn < 100 ? 2.8 : 2.2; const shape = Math.sin(Math.min(cutDeg, 89) * Math.PI / 180 * 2) ** 0.6; const rollF = kAtContact > 0.6 ? 0.5 : 1; return cutDeg < 1 ? 0 : base * shape * rollF; }

function blockList(arr){
  const names = arr.map((b) => b.n ? String(b.n) : "?");
  if (!names.length) return "";
  if (names.length === 1) return "the " + names[0] + " ball";
  if (names.length === 2) return "the " + names[0] + " and " + names[1] + " balls";
  return "the " + names.slice(0, -1).join(", ") + " and " + names[names.length - 1] + " balls";
}
function evalPocket(p, O, C, others, T){
  const P = aimPoint(p, T), u = v2.norm(v2.sub(P, O)), Gb = v2.sub(O, v2.mul(u, 2 * R)), aim = v2.norm(v2.sub(Gb, C));
  const cut = Math.acos(Math.max(-1, Math.min(1, v2.dot(aim, u)))) * 180 / Math.PI;
  const blockOB = others.filter((b) => distSeg([b.x, b.y], O, P)[0] < 2 * R - 0.05);
  const blockCB = others.filter((b) => distSeg([b.x, b.y], C, Gb)[0] < 2 * R - 0.05);
  let angOK = true; if (p[2] === "side"){ const a = Math.abs(Math.atan2(Math.abs(u[1]), Math.abs(u[0])) * 180 / Math.PI); angOK = a > 35; }
  const gbOK = Gb[0] >= R - 0.2 && Gb[0] <= T.L - R + 0.2 && Gb[1] >= R - 0.2 && Gb[1] <= T.W - R + 0.2;
  let why = "";
  if (cut >= 85) why = "Not makeable: cut too thin";
  else if (!angOK) why = "Not makeable: the side pocket angle is too narrow";
  else if (!gbOK) why = "Not makeable: the ghost-ball position is off the table";
  else if (blockOB.length) why = "Shot not possible to this pocket: path blocked by " + blockList(blockOB);
  else if (blockCB.length) why = "Shot not possible to this pocket: cue-ball path blocked by " + blockList(blockCB);
  return { p, P, u, Gb, aim, cut, blockOB: blockOB.length, blockCB: blockCB.length, blockOBs: blockOB, blockCBs: blockCB, angOK, gbOK, why, dOP: v2.len(v2.sub(P, O)), dCG: v2.len(v2.sub(Gb, C)) };
}
function bestOf(list){ return list.slice().sort((a, b) => (a.cut + a.dOP * 0.3) - (b.cut + b.dOP * 0.3))[0]; }

function railsOf(T){
  return {
    T: { id: "T", axis: "y", line: R, lo: R, hi: T.L - R },
    B: { id: "B", axis: "y", line: T.W - R, lo: R, hi: T.L - R },
    L: { id: "L", axis: "x", line: R, lo: R, hi: T.W - R },
    R: { id: "R", axis: "x", line: T.L - R, lo: R, hi: T.W - R }
  };
}
function pocketOnRail(pid, railId){
  if (railId === "T") return pid === "TL" || pid === "TS" || pid === "TR";
  if (railId === "B") return pid === "BL" || pid === "BS" || pid === "BR";
  if (railId === "L") return pid === "TL" || pid === "BL";
  if (railId === "R") return pid === "TR" || pid === "BR";
  return false;
}
function mirrorPt(p, rail){ return rail.axis === "y" ? [p[0], 2 * rail.line - p[1]] : [2 * rail.line - p[0], p[1]]; }
function railIntersect(from, toward, rail){
  const dx = toward[0] - from[0], dy = toward[1] - from[1];
  const den = rail.axis === "y" ? dy : dx;
  if (Math.abs(den) < 1e-8) return null;
  const k = ((rail.axis === "y" ? rail.line - from[1] : rail.line - from[0])) / den;
  if (k <= 0.02 || k >= 0.998) return null;
  const hit = [from[0] + dx * k, from[1] + dy * k];
  const along = rail.axis === "y" ? hit[0] : hit[1];
  if (along < rail.lo + 2.3 || along > rail.hi - 2.3) return null;
  return hit;
}
function sideAngleOK(into, kind){
  if (kind !== "side") return true;
  const a = Math.abs(Math.atan2(Math.abs(into[1]), Math.abs(into[0])) * 180 / Math.PI);
  return a > 35;
}
function packShot(p, P, u, Gb, aim, C, others, T, extra){
  const cut = Math.acos(Math.max(-1, Math.min(1, v2.dot(aim, u)))) * 180 / Math.PI;
  const blockOB = extra.blockOB || [];
  const blockCB = extra.blockCB || [];
  const angOK = extra.angOK !== false;
  const gbOK = Gb[0] >= R - 0.2 && Gb[0] <= T.L - R + 0.2 && Gb[1] >= R - 0.2 && Gb[1] <= T.W - R + 0.2;
  const dOP = extra.dOP, dCG = extra.dCG;
  let why = "";
  if (extra.preWhy) why = extra.preWhy;
  else if (cut >= 85) why = "Not makeable: cut too thin";
  else if (!angOK) why = extra.angWhy || "Not makeable: the side pocket angle is too narrow";
  else if (!gbOK) why = "Not makeable: the ghost-ball position is off the table";
  else if (blockOB.length) why = "Shot not possible to this pocket: path blocked by " + blockList(blockOB);
  else if (blockCB.length) why = "Shot not possible to this pocket: cue-ball path blocked by " + blockList(blockCB);
  return Object.assign({ p, P, u, Gb, aim, cut, blockOB: blockOB.length, blockCB: blockCB.length, blockOBs: blockOB, blockCBs: blockCB, angOK, gbOK, why, dOP, dCG, type: extra.type || "cut" }, extra.more || {});
}
function evalBank(p, O, C, others, T, rail){
  const P = aimPoint(p, T), Mi = mirrorPt(P, rail), hit = railIntersect(O, Mi, rail);
  if (!hit) return packShot(p, P, [0, 0], O, [0, 0], C, others, T, { dOP: 0, dCG: 0, preWhy: "Not a makeable bank off the " + RAILNAME[rail.id] + " to that pocket", type: "bank", more: { hit: null, rail: rail.id, Mi } });
  const u = v2.norm(v2.sub(hit, O)), Gb = v2.sub(O, v2.mul(u, 2 * R)), aim = v2.norm(v2.sub(Gb, C));
  const blockOB = others.filter((b) => distSeg([b.x, b.y], O, hit)[0] < 2 * R - 0.05 || distSeg([b.x, b.y], hit, P)[0] < 2 * R - 0.05);
  const blockCB = others.filter((b) => distSeg([b.x, b.y], C, Gb)[0] < 2 * R - 0.05);
  return packShot(p, P, u, Gb, aim, C, others, T, { dOP: v2.len(v2.sub(hit, O)) + v2.len(v2.sub(P, hit)), dCG: v2.len(v2.sub(Gb, C)), blockOB, blockCB, angOK: sideAngleOK(v2.norm(v2.sub(P, hit)), p[2]), type: "bank", more: { hit, rail: rail.id, Mi } });
}
function evalKick(p, O, C, others, T, rail){
  const P = aimPoint(p, T), u = v2.norm(v2.sub(P, O)), Gb = v2.sub(O, v2.mul(u, 2 * R));
  const Mi = mirrorPt(Gb, rail), hit = railIntersect(C, Mi, rail);
  if (!hit) return packShot(p, P, u, Gb, v2.norm(v2.sub(Gb, C)), C, others, T, { dOP: v2.len(v2.sub(P, O)), dCG: 0, preWhy: "Not a makeable kick off the " + RAILNAME[rail.id] + " to that pocket", type: "kick", more: { hit: null, rail: rail.id, Mi } });
  const aim = v2.norm(v2.sub(Gb, hit));
  const blockOB = others.filter((b) => distSeg([b.x, b.y], O, P)[0] < 2 * R - 0.05);
  const blockCB = others.filter((b) => distSeg([b.x, b.y], C, hit)[0] < 2 * R - 0.05 || distSeg([b.x, b.y], hit, Gb)[0] < 2 * R - 0.05);
  const dRail = v2.len(v2.sub(hit, C)), dRest = v2.len(v2.sub(Gb, hit));
  return packShot(p, P, u, Gb, aim, C, others, T, { dOP: v2.len(v2.sub(P, O)), dCG: dRail + dRest, blockOB, blockCB, angOK: sideAngleOK(u, p[2]), type: "kick", more: { hit, rail: rail.id, Mi, dRail } });
}
function optionsFor(type, O, C, others, T, railId, pocketId){
  const all = [];
  if (type === "bank" || type === "kick"){
    const rails = railsOf(T), ev = type === "bank" ? evalBank : evalKick;
    const use = railId && rails[railId] ? [rails[railId]] : Object.values(rails);
    for (const rail of use) for (const p of pockets(T)){
      if (type === "bank" && pocketOnRail(p[0], rail.id)) continue;
      all.push(ev(p, O, C, others, T, rail));
    }
  } else {
    for (const p of pockets(T)) all.push(evalPocket(p, O, C, others, T));
  }
  const makeable = all.filter((x) => !x.why);
  let wanted = null;
  if (pocketId && pocketId !== "auto"){
    const atPk = (railId && (type === "bank" || type === "kick")) ? all.filter((x) => x.p[0] === pocketId && x.rail === railId) : all.filter((x) => x.p[0] === pocketId);
    wanted = bestOf(atPk.filter((x) => !x.why)) || atPk[0] || null;
  }
  return { all, makeable, wanted };
}
function leaveVel(pk, v0, k0, kc){
  if (!pk || !pk.Gb) return null;
  let a;
  if (pk.type === "kick" && pk.dRail != null){
    const a1 = approach(v0, k0, pk.dRail);
    if (!a1.reached || a1.v < 2) return null;
    a = approach(a1.v * E_RAIL, a1.k, Math.max(0.01, pk.dCG - pk.dRail));
  } else {
    a = approach(v0, k0, pk.dCG);
  }
  if (!a.reached || a.v < 2) return null;
  const k = (kc != null && isFinite(kc)) ? kc : a.k;
  const n = pk.u, t0 = v2.sub(pk.aim, v2.mul(n, v2.dot(pk.aim, n))); const tl0 = v2.len(t0); const tdir = tl0 > 1e-6 ? v2.mul(t0, 1 / tl0) : [0, 0];
  const cr = pk.cut * Math.PI / 180;
  return { a: { v: a.v, k: k, reached: a.reached }, Va: v2.mul(tdir, a.v * Math.sin(cr)), Ws: v2.mul(pk.aim, k * a.v) };
}
// Predicted CB landing for a rolling (default) or the v24 stroke (tip / speed / english, with optional contact-spin override). Independent of the target ring when the target is off.
function predictCB(pk, T, opt){
  opt = opt || strokeOf();
  const k0 = opt.k0 != null ? opt.k0 : 1, v0 = opt.v0 != null ? opt.v0 : 55, side = opt.side || 0;
  const kc = (opt.kc != null && isFinite(opt.kc)) ? opt.kc : null;
  const lv = leaveVel(pk, v0, k0, kc); if (!lv) return null;
  return { r: simCB(pk.Gb, lv.Va, lv.Ws, T, side, opt.others), k0, v0, side, kc: lv.a.k, tip: opt.tip || "" };
}

// ---------- Target solver (v2) ----------
// Searches tip height (1/8-tip steps), english (1/4 steps) and speed (1 in/s steps) with the app's own physics (leaveVel + simCB),
// then refines the best starting points, so the cue ball finishes as near the target as the model allows.
const K_STEP = 0.9 / 8, K_N = 11, V_LO = 15, V_HI = 120, S_STEP = 0.25, TIP_LIM = 1.28, RING_R = 2.2, SEEDS = 10;
const tipOK = (kn, sn) => Math.hypot(kn * K_STEP, 0.9 * sn * S_STEP) <= TIP_LIM + 1e-9;
const famOf = (kn) => kn <= -2 ? "draw" : kn >= 2 ? "follow" : "stun";
function solveTarget(pk, O, others, tgt, T, budgetMs){
  const t0 = Date.now(), oxy = others.map((b) => [b.x, b.y]), cache = new Map(), cr = pk.cut * Math.PI / 180;
  const run = (kn, v0, sn, wantPts) => {
    const k0 = kn * K_STEP, side = sn * S_STEP, lv = leaveVel(pk, v0, k0); if (!lv) return null;
    const a = lv.a, vOB = a.v * Math.cos(cr) * (5 / 7), dOB = vOB * vOB / (2 * MU_R * G), th = throwDeg(pk.cut, a.v, a.k), miss = pk.dOP * Math.tan(th * Math.PI / 180);
    const r = simCore(pk.Gb[0], pk.Gb[1], lv.Va[0], lv.Va[1], lv.Ws[0], lv.Ws[1], T, side, { pts: !!wantPts, others: oxy });
    let kiss = r.kiss; if (v2.len(v2.sub(r.end, O)) < 2 * R && pk.cut < 3 && k0 > 0) kiss = O;
    const dist = v2.len(v2.sub(r.end, tgt)), obShort = dOB < pk.dOP;
    const score = dist + (r.scratch ? 500 : 0) + (obShort ? 500 : 0) + (kiss ? 120 : 0) + Math.abs(sn) * 0.1 + r.rails * 0.25;
    return { kn, sn, k0, v0, side, r, kiss, dist, score, th, miss, obShort, kc: a.k, fam: famOf(kn) };
  };
  const ev = (kn, v0, sn) => {
    v0 = Math.round(v0);
    if (kn < -K_N || kn > K_N || sn < -4 || sn > 4 || v0 < V_LO || v0 > V_HI || !tipOK(kn, sn)) return null;
    const key = kn + "," + v0 + "," + sn; if (cache.has(key)) return cache.get(key);
    const e = run(kn, v0, sn, false); cache.set(key, e); return e;
  };
  const coarse = [];
  for (const kn of [-11, -9, -7, -5, -3, -1, 0, 1, 3, 5, 7, 9, 11]) for (const v of [15, 22, 30, 38, 47, 56, 66, 76, 86, 96, 106, 120]) for (const sn of [0, -4, -2, 2, 4]){ const e = ev(kn, v, sn); if (e) coarse.push(e); }
  for (const kn of [-11, -8, -4, 0, 4, 8, 11]) for (const v of [30, 55, 85, 120]) for (const sn of [0, -4, 4]){ const e = ev(kn, v, sn); if (e) coarse.push(e); } // the old preset grid is always included
  coarse.sort((a, b) => a.score - b.score);
  const seeds = [];
  for (const e of coarse){ if (seeds.length >= SEEDS) break; if (seeds.some((q) => v2.len(v2.sub(q.r.end, e.r.end)) < 2.5 || (Math.abs(q.kn - e.kn) <= 2 && Math.abs(q.v0 - e.v0) <= 12 && Math.abs(q.sn - e.sn) <= 2))) continue; seeds.push(e); }
  const moves = (dk, dv, ds) => [[dk, 0, 0], [-dk, 0, 0], [0, dv, 0], [0, -dv, 0], [dk, dv, 0], [dk, -dv, 0], [-dk, dv, 0], [-dk, -dv, 0], [0, 0, ds], [0, 0, -ds]];
  for (const sd of seeds){
    let cur = sd, evals = 0;
    for (const [dk, dv, ds] of [[2, 10, 2], [1, 5, 1], [1, 2, 1], [1, 1, 1]]){
      for (let pass = 0; pass < 10; pass++){
        let best = cur;
        for (const [a, b, c] of moves(dk, dv, ds)){ if (Date.now() - t0 > budgetMs) break; const e = ev(cur.kn + a, cur.v0 + b, cur.sn + c); evals++; if (e && e.score < best.score - 1e-9) best = e; }
        if (best === cur) break; cur = best;
      }
      if (evals > 140 || Date.now() - t0 > budgetMs) break;
    }
  }
  const all = Array.from(cache.values()).filter(Boolean); all.sort((a, b) => a.score - b.score);
  // Robustness: a stroke that only lands near the target by luck (landing jumps several inches when speed changes 3%) is demoted.
  const pool = [];
  for (const e of all){ if (pool.length >= 18) break; if (pool.some((q) => v2.len(v2.sub(q.r.end, e.r.end)) < 1.5)) continue; pool.push(e); }
  for (const e of pool){
    let sens = 0;
    for (const f of [0.97, 1.03]){ const q = run(e.kn, e.v0 * f, e.sn, false); sens += q ? Math.min(v2.len(v2.sub(q.r.end, e.r.end)), 40) : 40; }
    e.sens = sens / 2; e.rank = e.score + 0.05 * Math.min(e.sens, 20);
  }
  pool.sort((a, b) => a.rank - b.rank);
  const picks = [];
  for (const e of pool){
    if (picks.length >= 5) break;
    if (picks.some((q) => v2.len(v2.sub(q.r.end, e.r.end)) < 1.5 || (q.fam === e.fam && v2.len(v2.sub(q.r.end, e.r.end)) < 4))) continue;
    picks.push(e);
  }
  return picks.map((e) => { const f = run(e.kn, e.v0, e.sn, true), tl = tipLabel(f.k0, f.side), sl = speedLabel(f.v0); f.tip = tl.full; f.tipVert = tl.vert; f.tipEnglish = tl.english; f.speed = sl.text; f.speedName = sl.name; f.inRing = f.dist <= RING_R; f.evals = cache.size; f.sens = e.sens; f.steady = e.sens <= 3 ? "steady" : e.sens <= 8 ? "somewhat sensitive to speed" : "touchy: a small speed change moves the stop a lot"; return f; });
}

function analyze(L, T, opt){ // L: layout {cb, balls, ob, pocket, target, shotType, rail}; opt.want overrides the on/off switch (tests)
  const out = { ok: false, msg: "", cands: [], suggest: null, pred: null, want: true };
  if (!L.cb) { out.msg = "Place the cue ball."; return out; }
  const ob = L.balls.find((b) => b.n === L.ob) || L.balls[0];
  if (!ob) { out.msg = "Add a ball, then tap it to make it the object ball."; return out; }
  const O = [ob.x, ob.y], C = L.cb;
  const others = L.balls.filter((b) => b !== ob);
  const typ = (L.shotType === "bank" || L.shotType === "kick") ? L.shotType : "cut";
  const railId = L.rail && L.rail !== "auto" ? L.rail : null;
  const { all, makeable, wanted } = optionsFor(typ, O, C, others, T, railId, L.pocket);
  let pk = wanted || bestOf(makeable) || bestOf(all.filter((x) => x.cut < 85 && x.angOK && !x.why)) || bestOf(all.filter((x) => x.cut < 85 && x.angOK)) || all[0];
  out.pk = pk;
  if (pk && pk.why){
    out.msg = pk.why;
    const alt = bestOf(makeable.filter((x) => x !== pk));
    if (alt){ out.suggest = alt; out.msg += typ === "cut" ? (". Try the " + PKNAME[alt.p[0]] + ".") : (". Try the " + PKNAME[alt.p[0]] + " off the " + RAILNAME[alt.rail] + "."); }
    return out;
  }
  if (!pk){ out.msg = typ === "cut" ? "No makeable shot to that pocket." : ("No makeable " + typ + " with this setup."); return out; }
  out.ok = true;
  const want = opt && opt.want != null ? !!opt.want : wantTarget();
  out.want = want;
  if (!want){
    // Target off: predict where the cue ball ends for v24's tip / english / speed controls (or opt.manual in tests).
    const m = (opt && opt.manual) || strokeOf();
    out.manual = m;
    out.pred = predictCB(pk, T, Object.assign({ others }, m));
    return out;
  }
  const tgt = L.target || [T.L * 0.5, T.W * 0.5];
  out.cands = solveTarget(pk, O, others, tgt, T, (opt && opt.budgetMs) || 900);
  if (out.cands.length){ const c = out.cands[0]; out.pred = { r: c.r, k0: c.k0, v0: c.v0, side: c.side, kc: c.kc }; }
  return out; }

// ---------- UI ----------
let _akey = null, _ares = null;
function analyzeCached(){ const key = JSON.stringify([T.L, T.W, Lay.cb, Lay.balls, Lay.ob, Lay.pocket, Lay.shotType, Lay.rail, wantTarget() ? Lay.target : 0, wantTarget(), wantTarget() ? 0 : strokeOf()]); if (key !== _akey){ _ares = analyze(Lay, T); _akey = key; } return _ares; }
let T, Lay, sel = null, res = null, showIdx = 0, fsOn = false, pickOn = false, shotMsg = "", fsScrollY = 0, _redraw = null;
const defLayout = () => ({ size: "9", cb: [25, 25], balls: [{ n: 1, x: 70, y: 18 }], ob: 1, pocket: "auto", target: [60, 34], shotType: "cut", rail: "auto", name: "", notes: "" });
function load(){
  Lay = LS("pt_lab_cur", null) || defLayout();
  T = TABLES[Lay.size] || TABLES["9"];
  const savedPk = LS("pt_lab_pocket", null);
  if (savedPk === "auto" || (typeof savedPk === "string" && PKIDS.includes(savedPk))) Lay.pocket = savedPk;
  if (!Lay.pocket) Lay.pocket = "auto";
  const types = ["cut", "bank", "kick"];
  const savedTy = LS("pt_lab_shotType", null);
  if (!types.includes(Lay.shotType)) Lay.shotType = types.includes(savedTy) ? savedTy : "cut";
  const savedRail = LS("pt_lab_rail", null);
  if (!(Lay.rail === "auto" || RAILIDS.includes(Lay.rail))) Lay.rail = (savedRail === "auto" || RAILIDS.includes(savedRail)) ? savedRail : "auto";
}
function persist(){ SS("pt_lab_cur", Lay); SS("pt_lab_pocket", Lay.pocket || "auto"); SS("pt_lab_shotType", Lay.shotType || "cut"); SS("pt_lab_rail", Lay.rail || "auto"); }
const LOCKSVG = (on) => on ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.2" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10.5V8a4 4 0 0 1 7.7-1.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
const FSSVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3H4v5M15 3h5v5M9 21H4v-5M15 21h5v-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const isLocked = () => !!LS("pt_lab_lock", false);

function setPocket(id){
  Lay.pocket = id || "auto";
  showIdx = 0;
  persist();
}

function enterFS(){
  if (fsOn) return;
  fsOn = true;
  pickOn = true;
  fsScrollY = window.scrollY || 0;
  document.body.style.top = "-" + fsScrollY + "px";
  document.body.classList.add("labfs-on");
  const root = document.documentElement;
  const req = root.requestFullscreen || root.webkitRequestFullscreen;
  if (req) Promise.resolve(req.call(root)).catch(() => {});
  if (_redraw) _redraw();
}
function exitFS(){
  const was = fsOn;
  fsOn = false;
  pickOn = false;
  document.body.classList.remove("labfs-on");
  document.body.style.top = "";
  try {
    const ex = document.exitFullscreen || document.webkitExitFullscreen;
    if (ex && (document.fullscreenElement || document.webkitFullscreenElement)) ex.call(document);
  } catch (e) {}
  if (was) window.scrollTo(0, fsScrollY || 0);
  if (was && _redraw) _redraw();
}
function toggleFS(){ if (fsOn) exitFS(); else enterFS(); }

let fsWired = false;
function wireFSOnce(){
  if (fsWired) return;
  fsWired = true;
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && fsOn) { e.preventDefault(); exitFS(); } });
  const onFsChange = () => {
    if (!fsOn) return;
    if (!(document.fullscreenElement || document.webkitFullscreenElement)) {
      // Native FS closed (Esc / browser UI). Keep the CSS overlay unless we initiated exitFS already.
    }
  };
  document.addEventListener("fullscreenchange", onFsChange);
  document.addEventListener("webkitfullscreenchange", onFsChange);
  const tabs = document.getElementById("tabs");
  if (tabs) tabs.addEventListener("click", (e) => { if (fsOn && e.target.closest("[data-v]")) exitFS(); }, true);
  window.addEventListener("hashchange", () => { if (fsOn && location.hash.slice(1) !== "lab") exitFS(); });
}

function placeRack(kind){
  const d = 2 * R, dx = d * Math.sqrt(3) / 2, foot = [T.L * 3 / 4, T.W / 2];
  const rows = kind === 9 ? [1, 2, 3, 2, 1] : [1, 2, 3, 4, 5];
  const spots = [];
  for (let r = 0; r < rows.length; r++){
    const n = rows[r], y0 = foot[1] - (n - 1) * d / 2;
    for (let i = 0; i < n; i++) spots.push([foot[0] + r * dx, y0 + i * d]);
  }
  let nums;
  if (kind === 9) nums = [1, 2, 3, 4, 9, 5, 6, 7, 8];
  else {
    nums = new Array(15); nums[0] = 1; nums[4] = 8; nums[10] = 2; nums[14] = 15;
    const rest = [3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14];
    let j = 0; for (let i = 0; i < 15; i++) if (!nums[i]) nums[i] = rest[j++];
  }
  Lay.balls = spots.map((p, i) => ({ n: nums[i], x: Math.max(R, Math.min(T.L - R, p[0])), y: Math.max(R, Math.min(T.W - R, p[1])) }));
  Lay.cb = [T.L / 4, T.W / 2];
  Lay.ob = 1;
  Lay.target = [T.L * 0.5, T.W * 0.5];
  sel = null;
}

function freeSpot(){ for (let i = 0; i < 200; i++){ const p = [R + Math.random() * (T.L - 2 * R), R + Math.random() * (T.W - 2 * R)]; if ([Lay.cb, ...Lay.balls.map((b) => [b.x, b.y])].every((q) => !q || v2.len(v2.sub(p, q)) > 3 * R)) return p; } return [T.L / 2, T.W / 2]; }
function toggleBall(n){
  if (n === "cb"){
    if (Lay.cb) Lay.cb = null;
    else { const sp = freeSpot(); Lay.cb = sp; }
    sel = Lay.cb ? "cb" : null;
    persist(); return;
  }
  const i = Lay.balls.findIndex((x) => x.n === n);
  if (i >= 0){
    Lay.balls.splice(i, 1);
    if (sel && sel !== "cb" && sel.n === n) sel = null;
    if (Lay.ob === n) Lay.ob = Lay.balls[0] ? Lay.balls[0].n : null;
  } else {
    const sp = freeSpot();
    const b = { n, x: sp[0], y: sp[1] };
    Lay.balls.push(b);
    if (!Lay.ob) Lay.ob = n;
    sel = b;
  }
}

function pickerHTML(esc){
  const used = new Set(Lay.balls.map((b) => b.n));
  const dark = (n) => [2, 4, 7, 8].includes(n > 8 ? n - 8 : n);
  const one = (key, label, col, st, on, isOb, isCue) => {
    const cls = `labball${on ? " on" : ""}${isOb ? " ob" : ""}${isCue ? " cue" : ""}${st ? " st" : !isCue ? " solid" : ""}`;
    const style = isCue ? "" : `--bc:${col};color:${dark(+key) ? "#fff" : "#000"}`;
    return `<button type="button" class="${cls}" data-add="${key}" aria-pressed="${on}" aria-label="${isCue ? "Cue ball" : "Ball " + label}${on ? " (on the table)" : ""}${isOb ? ", object ball" : ""}" style="${style}" title="Tap to add or remove. Long-press a ball on the table to make it the object ball.">${isCue ? "CB" : (st ? `<span class="labband"></span><span class="labn">${label}</span>` : label)}</button>`;
  };
  let h = `<div class="labpick labpick-dock" id="labpick"><div class="labpick-h"><b>Balls</b><button type="button" class="btn ghost" id="labrack9">9-ball rack</button><button type="button" class="btn ghost" id="labrack8">8-ball rack</button><button type="button" class="btn ghost" id="labclear">Clear table</button>${fsOn ? `<button type="button" class="btn ghost" id="labpickx">Hide</button>` : ""}</div>`;
  h += `<div class="labpick-togs">`;
  h += `<button type="button" class="btn ghost labpick-tog" id="lwantdock" aria-pressed="${wantTarget()}" aria-label="Desired cue ball location, currently ${wantTarget() ? "on" : "off"}">Target ring: ${wantTarget() ? "On" : "Off"}</button>`;
  h += `<button type="button" class="btn ghost labpick-tog" id="lghostdock" aria-pressed="${showGhost()}" aria-label="Cue-ball aim marker, currently ${showGhost() ? "on" : "off"}">Aim marker: ${showGhost() ? "On" : "Off"}</button>`;
  h += `</div><div class="labpick-row">${one("cb", "CB", "#fffef5", false, !!Lay.cb, false, true)}`;
  for (let n = 1; n <= 15; n++) h += one(String(n), String(n), ballCol(n), n > 8, used.has(n), Lay.ob === n, false);
  h += `</div><div class="meta labpick-help">Tap a chip to add or remove. Long-press a chip to set the object ball.</div></div>`;
  return h;
}

function svgTable(esc){
  const S = 10, rail = 4.5, L = T.L, W = T.W; const land = matchMedia("(orientation: landscape)").matches || window.innerWidth > 700;
  const vw = (L + 2 * rail) * S, vh = (W + 2 * rail) * S;
  const g = land ? `translate(${rail * S},${rail * S}) scale(${S})` : `translate(${vh - rail * S},${rail * S}) rotate(90) scale(${S})`;
  const lk = isLocked();
  const accent = cssVar("--accent", "#4cc38a");
  const warn = cssVar("--warn", "#ffd54f");
  const bad = cssVar("--bad", "#ff6b6b");
  const selPk = Lay.pocket && Lay.pocket !== "auto" ? Lay.pocket : null;
  let s = `<div class="labwrap ${land ? "land" : "port"}"><div class="labtbl"><svg id="labsvg" class="${lk ? "locked" : ""}" viewBox="0 0 ${land ? vw : vh} ${land ? vh : vw}" style="width:100%;height:auto;touch-action:pan-x pan-y pinch-zoom;display:block;border-radius:12px;background:#4a2c17" aria-label="Pool table${lk ? " (locked: balls can't be moved)" : ""}. Tap a pocket to aim at it.">`;
  s += `<g id="labg" transform="${g}"><rect x="0" y="0" width="${L}" height="${W}" fill="#1f6f43"/>`;
  for (let i = 1; i < 8; i++) s += `<circle cx="${L * i / 8}" cy="${-rail / 2}" r=".45" fill="#eee"/><circle cx="${L * i / 8}" cy="${W + rail / 2}" r=".45" fill="#eee"/>`;
  for (let i = 1; i < 4; i++) s += `<circle cx="${-rail / 2}" cy="${W * i / 4}" r=".45" fill="#eee"/><circle cx="${L + rail / 2}" cy="${W * i / 4}" r=".45" fill="#eee"/>`;
  s += `<line x1="${L / 4}" y1="0" x2="${L / 4}" y2="${W}" stroke="#ffffff22" stroke-width=".25"/><circle cx="${L * 3 / 4}" cy="${W / 2}" r=".4" fill="#ffffff55"/>`;
  for (const p of pockets(T)) {
    const mouthR = (p[2] === "corner" ? MOUTH.corner : MOUTH.side) / 2;
    const userOn = selPk === p[0];
    const autoOn = !selPk && res && res.pk && res.pk.p[0] === p[0];
    const ring = userOn ? accent : (autoOn ? warn : "none");
    s += `<circle cx="${p[1][0]}" cy="${p[1][1]}" r="${mouthR}" fill="#050505" stroke="${ring}" stroke-width="${userOn ? 0.55 : 0.4}"/>`;
    if (userOn) s += `<circle class="pk-ring" cx="${p[1][0]}" cy="${p[1][1]}" r="${mouthR + 1.15}" fill="none" stroke="${accent}" stroke-width=".6"/>`;
    s += `<circle data-pk="${p[0]}" cx="${p[1][0]}" cy="${p[1][1]}" r="6.5" fill="#000" fill-opacity="0" role="button" aria-label="${userOn ? "Clear " : "Aim at the "}${PKNAME[p[0]]}" tabindex="0"/>`;
  }
  if (res && res.pk){
    const pk = res.pk, good = res.ok, aimCol = good ? "#ffd54f" : bad, obCol = good ? "#81d4fa" : bad;
    const dashAim = good ? "" : ` stroke-dasharray="1.2 .7"`;
    const typ = pk.type || "cut";
    if (typ === "kick" && pk.hit){
      s += `<line id="labaim1" data-shot="kick" x1="${Lay.cb[0]}" y1="${Lay.cb[1]}" x2="${pk.hit[0]}" y2="${pk.hit[1]}" stroke="${aimCol}" stroke-width=".35"${dashAim}/><line id="labaim2" data-shot="kick" x1="${pk.hit[0]}" y1="${pk.hit[1]}" x2="${pk.Gb[0]}" y2="${pk.Gb[1]}" stroke="${aimCol}" stroke-width=".35"${dashAim}/>`;
    } else if (Lay.cb && pk.Gb){
      s += `<line id="labaim1" data-shot="${typ}" x1="${Lay.cb[0]}" y1="${Lay.cb[1]}" x2="${pk.Gb[0]}" y2="${pk.Gb[1]}" stroke="${aimCol}" stroke-width=".35"${dashAim}/>`;
    }
    if (typ === "bank" && pk.hit){
      s += `<line id="labbank1" data-shot="bank" x1="${pk.Gb[0] + pk.u[0] * 2 * R}" y1="${pk.Gb[1] + pk.u[1] * 2 * R}" x2="${pk.hit[0]}" y2="${pk.hit[1]}" stroke="${obCol}" stroke-width=".35"/><line id="labbank2" data-shot="bank" x1="${pk.hit[0]}" y1="${pk.hit[1]}" x2="${pk.P[0]}" y2="${pk.P[1]}" stroke="${obCol}" stroke-width=".35" stroke-dasharray="1 .6"/>`;
    } else if (pk.P && pk.u){
      s += `<line id="labobpath" data-shot="${typ}" x1="${pk.Gb[0] + pk.u[0] * 2 * R}" y1="${pk.Gb[1] + pk.u[1] * 2 * R}" x2="${pk.P[0]}" y2="${pk.P[1]}" stroke="${obCol}" stroke-width=".35" stroke-dasharray="1 .6"/>`;
    }
    if (pk.hit) s += `<circle id="labrailhit" data-shot="${typ}" cx="${pk.hit[0]}" cy="${pk.hit[1]}" r=".7" fill="${aimCol}" stroke="#111" stroke-width=".12"/>`;
    if (showGhost() && pk.Gb) s += `<circle id="labghost" cx="${pk.Gb[0]}" cy="${pk.Gb[1]}" r="${R}" fill="none" stroke="${good ? "#fff" : bad}" stroke-width=".2" stroke-dasharray=".6 .4"/>`;
    if (res.ok && !res.want && res.pred && res.pred.r){
      const pr = res.pred.r, col = "#80deea";
      s += `<polyline id="labpredpath" points="${pr.pts.map((q) => q[0].toFixed(2) + "," + q[1].toFixed(2)).join(" ")}" fill="none" stroke="${col}" stroke-width=".35" stroke-dasharray="1.1 .6"/>`;
      const rot = land ? "" : ` transform="rotate(-90 ${pr.end[0]} ${pr.end[1] - R - 1.3})"`;
      s += `<g id="labpred"><circle cx="${pr.end[0]}" cy="${pr.end[1]}" r="${R}" fill="#80deea22" stroke="${col}" stroke-width=".28" stroke-dasharray=".7 .45"/><text x="${pr.end[0]}" y="${pr.end[1] - R - 0.7}" font-size="1.35" text-anchor="middle" fill="${col}" font-family="system-ui" font-weight="700"${rot}>Predicted</text></g>`;
      if (pr.kiss) s += `<circle cx="${pr.kiss[0]}" cy="${pr.kiss[1]}" r="${R * 1.5}" fill="none" stroke="${bad}" stroke-width=".3" stroke-dasharray=".6 .4"/>`;
    }
    if (good && res.want) res.cands.forEach((c, i) => { if (i !== showIdx && showIdx !== -1) return; const col = ["#b9f6ca", "#ffab91", "#ce93d8", "#fff59d", "#80cbc4"][i]; s += `<polyline points="${c.r.pts.map((q) => q[0].toFixed(2) + "," + q[1].toFixed(2)).join(" ")}" fill="none" stroke="${col}" stroke-width="${i === showIdx ? .45 : .3}"/><circle cx="${c.r.end[0]}" cy="${c.r.end[1]}" r="${R}" fill="none" stroke="${col}" stroke-width=".3"/>`;
      if (Lay.target && (i === showIdx || (showIdx === -1 && i === 0))){ const er = c.dist > 0.6 ? `<line id="laberr" x1="${c.r.end[0]}" y1="${c.r.end[1]}" x2="${Lay.target[0]}" y2="${Lay.target[1]}" stroke="${col}" stroke-width=".25" stroke-dasharray=".5 .4"/>` : ""; const rotE = land ? "" : ` transform="rotate(-90 ${c.r.end[0]} ${c.r.end[1] + R + 3.4})"`; s += er + `<text id="laberrtxt" x="${c.r.end[0]}" y="${c.r.end[1] + R + 3.4}" font-size="1.3" text-anchor="middle" fill="${col}" font-family="system-ui" font-weight="700"${rotE}>${c.dist.toFixed(1)} in off</text>`; } });
  }
  if (Lay.target && wantTarget()) s += `<g data-drag="tgt"><circle cx="${Lay.target[0]}" cy="${Lay.target[1]}" r="2.2" fill="#ffffff18" stroke="#fff" stroke-width=".25" stroke-dasharray=".8 .5"/><path d="M${Lay.target[0] - 1},${Lay.target[1]} h2 M${Lay.target[0]},${Lay.target[1] - 1} v2" stroke="#fff" stroke-width=".25"/></g>`;
  for (const b of Lay.balls){ const c = ballCol(b.n), st = b.n > 8; s += `<g data-drag="b${Lay.balls.indexOf(b)}"><circle cx="${b.x}" cy="${b.y}" r="${R * 1.7}" fill="#000" fill-opacity="0"/>` + (st ? `<circle cx="${b.x}" cy="${b.y}" r="${R}" fill="#fafafa"/><clipPath id="cl${b.x | 0}_${b.y | 0}"><rect x="${b.x - R}" y="${b.y - R * .55}" width="${2 * R}" height="${R * 1.1}"/></clipPath><circle cx="${b.x}" cy="${b.y}" r="${R}" fill="${c}" clip-path="url(#cl${b.x | 0}_${b.y | 0})"/>` : `<circle cx="${b.x}" cy="${b.y}" r="${R}" fill="${b.n ? c : "#9e9e9e"}"/>`) + `<circle cx="${b.x}" cy="${b.y}" r="${R}" fill="none" stroke="${sel === b ? "#ffd54f" : b.n === Lay.ob ? "#fff" : "#0006"}" stroke-width="${sel === b || b.n === Lay.ob ? .35 : .12}"/><text x="${b.x}" y="${b.y + .42}" font-size="1.15" text-anchor="middle" fill="${b.n === 8 || b.n === 2 || b.n === 4 || b.n === 7 ? "#fff" : "#000"}" font-family="system-ui" font-weight="700" ${land ? "" : `transform="rotate(-90 ${b.x} ${b.y})"`}>${b.n || "?"}</text></g>`; }
  if (Lay.cb) s += `<g data-drag="cb"><circle cx="${Lay.cb[0]}" cy="${Lay.cb[1]}" r="${R * 1.7}" fill="#000" fill-opacity="0"/><circle cx="${Lay.cb[0]}" cy="${Lay.cb[1]}" r="${R}" fill="#fffef5" stroke="${sel === "cb" ? "#ffd54f" : "#0006"}" stroke-width=".2"/></g>`;
  s += `</g></svg></div>`;
  if (!fsOn){
    s += `<div class="labrail"><div class="labrail-btns">`;
    s += `<button type="button" id="lablock" class="lablock ${lk ? "on" : ""}" aria-pressed="${lk}" aria-label="${lk ? "Table locked. Tap to unlock and move balls" : "Table unlocked. Tap to lock so balls can't move"}">${LOCKSVG(lk)}<span>${lk ? "Locked" : "Unlocked"}</span></button>`;
    s += `<button type="button" id="labfsbtn" class="lablock" aria-label="Full screen">${FSSVG}<span>Full</span></button>`;
    s += `</div><div class="labgrip" aria-hidden="true"><span class="gl"></span><b>↕</b><span class="gt">Scroll</span><span class="gl"></span></div></div>`;
  }
  return s + `</div>`;
}

function strokeHTML(esc, opt){
  opt = opt || {};
  const st = strokeOf();
  const on = (cond) => cond ? " on" : "";
  const wrap = opt.compact ? "labfs-stroke" : "labstroke";
  let h = `<div class="${wrap}" id="labstroke">`;
  h += `<div class="labstroke-row"><span class="meta">Tip</span>${[["follow","Follow"],["stun","Stun"],["draw","Draw"]].map(([k, l]) => `<button type="button" class="btn ghost${on(st.tip === k)}" data-ltip="${k}">${l}</button>`).join("")}</div>`;
  h += `<div class="labstroke-row"><span class="meta">English</span>${[[-1,"Left"],[0,"None"],[1,"Right"]].map(([k, l]) => `<button type="button" class="btn ghost${on(st.side === k)}" data-lside="${k}">${l}</button>`).join("")}</div>`;
  h += `<div class="labstroke-row"><span class="meta">Speed</span>${[["30","Soft"],["55","Medium"],["85","Firm"]].map(([k, l]) => `<button type="button" class="btn ghost${on(Math.abs(st.v0 - +k) <= 8)}" data-lspd="${k}">${l}</button>`).join("")}</div>`;
  h += `<label class="labstroke-sl"><input type="range" id="lspd" min="20" max="120" step="1" value="${Math.round(st.v0)}" aria-label="Cue-ball speed in inches per second"><span id="lspdv">${Math.round(st.v0)} in/s</span></label>`;
  if (!opt.compact) h += `<div class="meta">Stun leaves along the 90° tangent; follow bends the path forward, draw bends it back. Speed sets how far the cue ball travels, including rail rebounds. English changes the rebound angle off a cushion.</div>`;
  return h + `</div>`;
}
function wireStroke(redraw){
  document.querySelectorAll("[data-ltip]").forEach((b) => b.onclick = () => { setStroke({ tip: b.dataset.ltip }); if (redraw) redraw(); });
  document.querySelectorAll("[data-lside]").forEach((b) => b.onclick = () => { setStroke({ side: +b.dataset.lside }); if (redraw) redraw(); });
  document.querySelectorAll("[data-lspd]").forEach((b) => b.onclick = () => { setStroke({ v0: +b.dataset.lspd }); if (redraw) redraw(); });
  const sl = document.getElementById("lspd"), lab = document.getElementById("lspdv");
  if (sl) sl.oninput = () => { setStroke({ v0: +sl.value }); if (lab) lab.textContent = sl.value + " in/s"; };
  if (sl) sl.onchange = () => { if (redraw) redraw(); };
}

function readoutHTML(esc){
  if (!res) return "";
  if (!res.ok) return `<div class="callout labshot-msg" id="labshotmsg">${esc(res.msg)}</div>`;
  const pk = res.pk, usedOb = (Lay.balls.find((b) => b.n === Lay.ob) || Lay.balls[0] || {}).n || Lay.ob;
  const typ = pk.type || "cut";
  const title = typ === "bank" ? `Bank: ball ${usedOb} off the ${RAILNAME[pk.rail] || "rail"} to the ${PKNAME[pk.p[0]]}`
    : typ === "kick" ? `Kick: cue ball off the ${RAILNAME[pk.rail] || "rail"}, ball ${usedOb} to the ${PKNAME[pk.p[0]]}`
    : `Shot: ball ${usedOb} to the ${PKNAME[pk.p[0]]}`;
  let h = `<div class="card labshot-msg"><div class="t">${title}</div><div class="meta">${typ === "cut" ? "Cut" : "Hit"} angle <b>${pk.cut.toFixed(1)}°</b> · ball-hit fraction ≈ ${(1 - Math.sin(pk.cut * Math.PI / 180)).toFixed(2)} · CB path ${(pk.dCG / 12).toFixed(1)} ft · OB path ${(pk.dOP / 12).toFixed(1)} ft</div>`;
  if (pk.blockCB) h += `<div class="bad">⚠ Cue ball path to the ghost ball is blocked</div>`;
  if (pk.blockOB) h += `<div class="bad">⚠ Object ball path to the pocket is blocked</div>`;
  h += `</div>`;
  if (res.want){
    const c = res.cands[0];
    if (!c){ h += `<div class="callout" id="labreco">No tip height, english or speed gets the cue ball to the object ball cleanly for this shot. Try another pocket.</div>`; }
    else {
      const near = c.dist <= 1 ? "right on your target" : c.inRing ? "inside your target ring" : "";
      h += `<div class="card reco" id="labreco"><div class="t">Best stroke for your target</div><div class="desc"><b>Tip:</b> ${esc(c.tipVert)}<br><b>English:</b> ${esc(c.tipEnglish)}<br><b>Speed:</b> ${esc(c.speed)}</div><div class="meta" id="labrecoerr">Predicted stop: <b>${c.dist.toFixed(1)} in</b> (${(c.dist / 12).toFixed(1)} ft) from your target${near ? " · " + near : ""} · ${c.r.rails} rail${c.r.rails === 1 ? "" : "s"}${c.sens != null ? " · " + c.steady : ""}</div>`;
      if (!c.inRing) h += `<div class="meta">This is the closest the model can get: no tip height, english or speed in range lands nearer for this pocket and cue ball position. Try another pocket or move the target.</div>`;
      if (c.r.scratch) h += `<div class="bad">⚠ Scratch risk</div>`;
      if (c.kiss) h += `<div class="bad">⚠ Possible kiss / contact with another ball</div>`;
      if (c.obShort) h += `<div class="bad">⚠ Object ball may not reach the pocket at this speed</div>`;
      h += `<div class="row"><button type="button" class="btn ghost" data-use="0">Try it in manual mode</button></div></div>`;
    }
  } else if (res.pred && res.pred.r){
    const e = res.pred.r, m = res.manual || strokeOf();
    const dx = e.end[0], dy = e.end[1];
    h += `<div class="card" id="labpredcard"><div class="t">Where the cue ball will end up</div><div class="desc">${esc(strokeLabel(m))}</div><div class="meta">Predicted stop (cyan ball): about ${(dx / 12).toFixed(1)} ft from the left short rail and ${(dy / 12).toFixed(1)} ft from the top long rail${e.scratch ? " · ⚠ scratch" : e.rails ? ` · ${e.rails} rail${e.rails === 1 ? "" : "s"}` : " · no rails"}.</div>${e.kiss && !e.scratch ? `<div class="bad">⚠ Possible kiss / contact with another ball</div>` : ""}</div>`;
  } else if (!res.want){
    h += `<div class="callout" id="labpredcard">With this stroke the cue ball does not reach the object ball. Add speed.</div>`;
  }
  return h;
}

function fsBarHTML(esc){
  const lk = isLocked();
  let h = `<div class="labfs-bar">`;
  h += `<button type="button" class="btn" id="labsnap">Screenshot</button>`;
  h += `<button type="button" class="btn" id="labadd" aria-pressed="${pickOn}">${pickOn ? "Hide balls" : "Balls"}</button>`;
  h += `<button type="button" id="lablock" class="btn lablock-fs ${lk ? "on" : ""}" aria-pressed="${lk}">${lk ? "Unlock" : "Lock"}</button>`;
  h += `<button type="button" class="btn" id="labfsx">Exit full screen</button>`;
  h += `</div>`;
  if (window.TableCapture) h += `<div class="labfs-sub"><button type="button" class="btn ghost" id="labproj">📽 Project on table</button></div>`;
  h += `<div class="labfs-sub"><button type="button" class="btn ghost" id="lwantbtn" aria-pressed="${wantTarget()}">${wantTarget() ? "Target: On" : "Target: Off"}</button></div>`;
  h += `<div class="labfs-sub"><button type="button" class="btn ghost" id="lghostbtn" aria-pressed="${showGhost()}">${showGhost() ? "Hide aim marker" : "Show aim marker"}</button>${SHOTTYPES.map(([k, l]) => `<button type="button" class="btn ghost ${Lay.shotType === k ? "on" : ""}" data-ltype="${k}">${l}</button>`).join("")}</div>`;
  if (!wantTarget()) h += strokeHTML(esc, { compact: true });
  if ((Lay.shotType === "bank" || Lay.shotType === "kick")) h += `<div class="labfs-sub"><button type="button" class="btn ghost" id="lrailauto">Auto rail</button><span class="meta">${Lay.rail && Lay.rail !== "auto" ? "Banking off the " + RAILNAME[Lay.rail] + "." : "Rail: Auto (nearest sensible)."}</span></div>`;
  if (Lay.pocket && Lay.pocket !== "auto") h += `<div class="labfs-sub"><button type="button" class="btn ghost" id="lpkauto">Auto pocket</button><span class="meta">Aiming at the ${PKNAME[Lay.pocket]}. Tap that pocket again for Auto.</span></div>`;
  if (shotMsg) h += `<div class="meta labfs-status" id="labsnapmsg">${esc(shotMsg)}</div>`;
  return h;
}

async function captureTable(){
  const svg = document.getElementById("labsvg");
  if (!svg) throw new Error("No table to capture");
  const clone = svg.cloneNode(true);
  clone.querySelectorAll("[data-pk]").forEach((c) => { if (c.getAttribute("fill-opacity") === "0") c.remove(); });
  const vb = (clone.getAttribute("viewBox") || "0 0 100 100").trim().split(/[\s,]+/).map(Number);
  const w = vb[2], h = vb[3], scale = 3;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(Math.round(w * scale)));
  clone.setAttribute("height", String(Math.round(h * scale)));
  const xml = new XMLSerializer().serializeToString(clone);
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error("Could not render the table image")); img.src = url; });
  const cv = document.createElement("canvas");
  cv.width = Math.round(w * scale); cv.height = Math.round(h * scale);
  cv.getContext("2d").drawImage(img, 0, 0);
  const blob = await new Promise((res) => cv.toBlob(res, "image/png"));
  if (!blob) throw new Error("Could not make a PNG");
  const file = new File([blob], "road-warrior-shot.png", { type: "image/png" });
  if (navigator.share && navigator.canShare){
    try {
      if (navigator.canShare({ files: [file] })){
        await navigator.share({ files: [file], title: "Shot Lab", text: "Road Warrior shot" });
        return "Screenshot shared.";
      }
    } catch (e){ if (e && e.name === "AbortError") return ""; }
  }
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = href; a.download = "road-warrior-shot.png"; document.body.appendChild(a); a.click(); a.remove();
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) window.open(href, "_blank");
  else setTimeout(() => URL.revokeObjectURL(href), 4000);
  return ios ? "Screenshot ready. Press and hold the image to save it to Photos." : "Screenshot saved.";
}

window.renderLab = function($, esc, save, st){
  load();
  wireFSOnce();
  $("#title").textContent = "Shot Lab";
  $("#headx").innerHTML = `<div class="chips">${[["table","Table"],["photo","📷 Photo"],["cap","🎥 Capture"],["saved","Drills"]].map(([k, l]) => `<button class="chip ${(st.labtab || "table") === k ? "on" : ""}" data-lt="${k}">${l}</button>`).join("")}</div>`;
  document.querySelectorAll("[data-lt]").forEach((b) => b.onclick = () => { st.labtab = b.dataset.lt; window.renderLab($, esc, save, st); });
  const tab = st.labtab || "table";
  if (tab !== "table" && fsOn) { fsOn = false; pickOn = false; document.body.classList.remove("labfs-on"); document.body.style.top = ""; try { const ex = document.exitFullscreen || document.webkitExitFullscreen; if (ex && (document.fullscreenElement || document.webkitFullscreenElement)) ex.call(document); } catch (e) {} }
  if (tab !== "cap" && window.TableCapture) window.TableCapture.stop();
  if (tab === "cap" && window.TableCapture) return window.TableCapture.render($, esc, st, save);
  if (tab === "photo") return window.PhotoLab($, esc, () => { st.labtab = "table"; window.renderLab($, esc, save, st); }, (lay) => { Lay = Object.assign(defLayout(), lay); T = TABLES[Lay.size]; persist(); });
  if (tab === "saved") return renderSaved($, esc, save, st);
  const draw = () => {
    if (Lay.balls.length && !Lay.balls.some((b) => b.n === Lay.ob)) Lay.ob = Lay.balls[0].n;
    res = analyzeCached();
    let h = `<div class="callout warnc"><b>Approximate training aid, not a physics simulator.</b> Paths use simple friction, rail-bounce and throw models from published trends (Dr. Dave TPs); real cloth, balls, cushions and your stroke will differ. Use it to plan, then test on the table.</div>`;
    h += `<div class="row"><select id="lsize">${Object.entries(TABLES).map(([k, t]) => `<option value="${k}" ${Lay.size === k ? "selected" : ""}>${t.name}</option>`).join("")}</select><select id="ltype" aria-label="Shot type">${SHOTTYPES.map(([k, l]) => `<option value="${k}" ${Lay.shotType === k ? "selected" : ""}>Shot: ${l}</option>`).join("")}</select><select id="lpk"><option value="auto">Pocket: Auto</option>${pockets(T).map((p) => `<option value="${p[0]}" ${Lay.pocket === p[0] ? "selected" : ""}>Pocket: ${PKNAME[p[0]]}</option>`).join("")}</select>${(Lay.shotType === "bank" || Lay.shotType === "kick") ? `<select id="lrail" aria-label="Bank rail"><option value="auto" ${Lay.rail === "auto" ? "selected" : ""}>Rail: Auto</option>${RAILIDS.map((r) => `<option value="${r}" ${Lay.rail === r ? "selected" : ""}>Rail: ${RAILNAME[r]}</option>`).join("")}</select>` : ""}</div>`;
    h += `<label class="tog big" id="lwantlab"><input type="checkbox" id="lwant" ${wantTarget() ? "checked" : ""}> Desired cue ball location</label><div class="meta" id="lwantmsg">${wantTarget() ? "ON: drag the dashed target ring to where you want the cue ball to stop. The lab searches tip height, english and speed and recommends the stroke that lands closest." : "OFF: no target. Set your own tip, english and speed with the controls below and the lab shows where the cue ball will stop."}</div>`;
    h += `<label class="tog big" id="lghostlab"><input type="checkbox" id="lghost" ${showGhost() ? "checked" : ""}> Show cue-ball aim marker</label><div class="meta">${showGhost() ? "The dashed white circle at the object ball is where the cue ball's center should be at contact." : "Aim marker hidden."}</div>`;
    if (!wantTarget()) h += strokeHTML(esc);
    h += `<div id="tblwrap" class="${fsOn ? "labfs-overlay" : ""}">`;
    if (fsOn) h += fsBarHTML(esc) + `<div class="labfs-stage">`;
    h += svgTable(esc);
    if (fsOn) h += `</div>` + readoutHTML(esc);
    if (!fsOn || pickOn) h += pickerHTML(esc);
    h += `</div>`;
    if (!fsOn){
      h += readoutHTML(esc);
      h += `<div class="meta">Drag the cue ball and balls${wantTarget() ? " and the dashed target ring (where you want the cue ball to finish)" : ""}. Choose Cut, Bank or Kick, then tap a pocket (and a rail, or leave Rail on Auto). Tap a ball to make it the object ball. To scroll, drag the strip beside the table, the brown rail or the felt, or lock the table with the padlock. Rotate the phone for a bigger landscape table.</div>`;
    }
    if (sel && sel !== "cb") h += `<div class="card"><b>Selected: ball ${sel.n || "?"}</b><div class="row"><button class="btn" id="mkob">Make object ball</button><select id="setn"><option value="">Set number…</option>${[...Array(15)].map((_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}</select><button class="btn ghost" id="delb">Remove</button></div></div>`;
    if (res.ok && res.want){
      if (!res.cands.length) h += `<div class="callout">No candidate reaches the object ball cleanly. Try another pocket.</div>`;
      else h += `<div class="meta">Other strokes that also finish near your target (tap one to see its path):</div>`;
      h += res.cands.map((c, i) => `<div class="card cand ${i === showIdx ? "on" : ""}" data-ci="${i}"><div class="t">${i + 1}. ${esc(c.tip)} · ${esc(c.speed)}</div><div class="meta">Predicted stop <b>${(c.dist).toFixed(1)} in</b> from your target${c.inRing ? " (inside the ring)" : ""} · ${c.r.rails} rail${c.r.rails === 1 ? "" : "s"} · cue ball arrives with ${c.kc > 0.8 ? "natural roll" : c.kc > 0.2 ? "some follow" : c.kc > -0.2 ? "stun (no spin)" : "draw"} · ${esc(c.steady)}</div><div class="meta">Throw estimate ≈ ${c.th.toFixed(1)}° (≈ ${c.miss.toFixed(1)} in at the pocket) - aim a touch thicker${c.side ? "; sidespin also squirts and throws, adjust" : ""}</div>${c.r.scratch ? `<div class="bad">⚠ Scratch risk</div>` : ""}${c.kiss ? `<div class="bad">⚠ Possible kiss / contact with another ball</div>` : ""}${c.obShort ? `<div class="bad">⚠ Object ball may not reach the pocket at this speed</div>` : ""}<div class="row"><button type="button" class="btn ghost" data-use="${i}">Try it in manual mode</button></div></div>`).join("");
      h += `<div class="row"><button class="btn ghost" id="showall">${showIdx === -1 ? "Show one path" : "Show all paths"}</button></div>`;
    }
    h += `<div class="card"><div class="t">Save as drill</div><div class="meta">Stores the balls, shot type, rail, pocket, and the current tip / speed / english. Open it later from the Drills tab.</div><input type="text" id="lname" placeholder="Name (e.g. 'Right cut, stun to the side')" value="${esc(Lay.name || "")}"><textarea id="lnotes" placeholder="Notes">${esc(Lay.notes || "")}</textarea><div class="row"><button class="btn" id="lsave">Save drill</button><button class="btn ghost" id="lreset">Reset table</button></div></div>`;
    h += `<details><summary>How the suggestions work</summary><div class="inner desc">Ghost ball and cut angle from simple geometry. Bank and kick shots use mirror-image (equal-angle) aim across the chosen rail, with the table's real size; Rail: Auto picks the shortest clean one-rail path. After contact the cue ball keeps the tangent part of its speed and its spin; friction bends it from the tangent line (stun) toward the 30° roll line or back for draw (the trisect and 30° rules come out of this). The Predicted marker (target OFF) uses the tip, speed and english you set with the Follow / Stun / Draw, english and speed controls, and can bounce off the rails. Stun leaves along the 90° tangent; follow and draw bend the path after contact; speed sets travel distance; sidespin changes the rebound off a cushion. Rails bounce with a restitution of ${E_RAIL}, so rebound angles come out wider than the approach (TP 6.3). Throw uses a rough 0-5° estimate (largest near half-ball and at slow speed). Desired cue ball location: when ON, the lab runs the same physics over a grid of tip heights (1/8-tip steps), english (1/4 steps) and speeds (15-120 in/s, the app's Soft to Power range), then refines the best starting points one small step at a time, and ranks strokes by how close the cue ball stops to your target (scratches, kisses, an object ball that can't reach the pocket, extra rails and strokes whose landing swings a lot with a 3% speed change are all penalised). When OFF there is no target: you set the stroke with the existing tip / english / speed controls and the Predicted ball shows where the cue ball stops. This is a training aid, not a physics simulator: cloth, cushions, throw, and spin transfer on banks will differ on a real table.</div></details>`;
    $("#main").innerHTML = h; wire();
  };
  _redraw = draw;
  const wire = () => {
    const lsize = $("#lsize"); if (lsize) lsize.onchange = (e) => { Lay.size = e.target.value; T = TABLES[Lay.size]; const cl = (p) => [Math.min(p[0], T.L - R), Math.min(p[1], T.W - R)]; if (Lay.cb) Lay.cb = cl(Lay.cb); if (Lay.target) Lay.target = cl(Lay.target); Lay.balls.forEach((b) => { [b.x, b.y] = cl([b.x, b.y]); }); persist(); draw(); };
    const ltype = $("#ltype"); if (ltype) ltype.onchange = (e) => { Lay.shotType = e.target.value; persist(); draw(); };
    document.querySelectorAll("[data-ltype]").forEach((b) => b.onclick = () => { Lay.shotType = b.dataset.ltype; persist(); draw(); });
    const lrail = $("#lrail"); if (lrail) lrail.onchange = (e) => { Lay.rail = e.target.value; persist(); draw(); };
    const rauto = $("#lrailauto"); if (rauto) rauto.onclick = () => { Lay.rail = "auto"; persist(); draw(); };
    const lpk = $("#lpk"); if (lpk) lpk.onchange = (e) => { setPocket(e.target.value); draw(); };
    const auto = $("#lpkauto"); if (auto) auto.onclick = () => { setPocket("auto"); draw(); };
    const wt = $("#lwant"); if (wt) wt.onchange = (e) => { setWantTarget(e.target.checked); showIdx = 0; draw(); };
    const wtb = $("#lwantbtn"); if (wtb) wtb.onclick = () => { setWantTarget(!wantTarget()); showIdx = 0; draw(); };
    const wtd = $("#lwantdock"); if (wtd) wtd.onclick = () => { setWantTarget(!wantTarget()); showIdx = 0; draw(); };
    document.querySelectorAll("[data-use]").forEach((b) => b.onclick = (ev) => { ev.stopPropagation(); const c = res && res.cands[+b.dataset.use]; if (!c) return; strokeFromCand(c); setWantTarget(false); draw(); });
    const gh = $("#lghost"); if (gh) gh.onchange = (e) => { setShowGhost(e.target.checked); draw(); };
    const ghbtn = $("#lghostbtn"); if (ghbtn) ghbtn.onclick = () => { setShowGhost(!showGhost()); draw(); };
    const ghd = $("#lghostdock"); if (ghd) ghd.onclick = () => { setShowGhost(!showGhost()); draw(); };
    wireStroke(draw);
    const mk = $("#mkob"); if (mk) mk.onclick = () => { Lay.ob = sel.n; persist(); draw(); };
    const sn = $("#setn"); if (sn) sn.onchange = (e) => { const n = +e.target.value; const o = Lay.balls.find((b) => b.n === n && b !== sel); if (o) o.n = 0; sel.n = n; persist(); draw(); };
    const db = $("#delb"); if (db) db.onclick = () => { Lay.balls.splice(Lay.balls.indexOf(sel), 1); if (Lay.ob === sel.n) Lay.ob = Lay.balls[0] ? Lay.balls[0].n : null; sel = null; persist(); draw(); };
    document.querySelectorAll(".cand").forEach((c) => c.onclick = () => { showIdx = +c.dataset.ci; draw(); });
    const sa = $("#showall"); if (sa) sa.onclick = () => { showIdx = showIdx === -1 ? 0 : -1; draw(); };
    $("#lsave").onclick = () => { Lay.name = $("#lname").value.trim() || ("Drill " + new Date().toLocaleString()); Lay.notes = $("#lnotes").value; persist(); const all = allDrills(); all.unshift(currentDrill(Lay.name, Lay.notes)); saveDrills(all); alert("Saved drill: " + Lay.name + ". Find it under Drills."); };
    $("#lreset").onclick = () => { Lay = defLayout(); T = TABLES["9"]; sel = null; persist(); draw(); };
    const fsbtn = $("#labfsbtn"); if (fsbtn) fsbtn.onclick = () => enterFS();
    const fsx = $("#labfsx"); if (fsx) fsx.onclick = () => exitFS();
    const pj = $("#labproj"); if (pj) pj.onclick = () => window.TableCapture.projectShotLab(Lay);
    const addb = $("#labadd"); if (addb) addb.onclick = () => { pickOn = !pickOn; draw(); };
    const pickx = $("#labpickx"); if (pickx) pickx.onclick = () => { pickOn = false; draw(); };
    const rack9 = $("#labrack9"); if (rack9) rack9.onclick = () => { placeRack(9); persist(); draw(); };
    const rack8 = $("#labrack8"); if (rack8) rack8.onclick = () => { placeRack(8); persist(); draw(); };
    const clr = $("#labclear"); if (clr) clr.onclick = () => { Lay.balls = []; Lay.ob = null; sel = null; persist(); draw(); };
    let holdT = null, held = false;
    document.querySelectorAll("#labpick [data-add]").forEach((b) => {
      const go = (long) => {
        const key = b.dataset.add === "cb" ? "cb" : +b.dataset.add;
        if (long && key !== "cb"){
          const ball = Lay.balls.find((x) => x.n === key);
          if (ball){ Lay.ob = key; sel = ball; persist(); draw(); return; }
        }
        toggleBall(key); persist(); draw();
      };
      b.onclick = () => { if (held) { held = false; return; } go(false); };
      b.addEventListener("pointerdown", () => { held = false; clearTimeout(holdT); holdT = setTimeout(() => { held = true; go(true); }, 480); });
      const cancel = () => { clearTimeout(holdT); };
      b.addEventListener("pointerup", cancel); b.addEventListener("pointerleave", cancel); b.addEventListener("pointercancel", cancel);
    });
    const snap = $("#labsnap"); if (snap) snap.onclick = () => { shotMsg = ""; captureTable().then((m) => { shotMsg = m || ""; if (shotMsg && _redraw) _redraw(); }).catch((err) => { shotMsg = err && err.message ? err.message : "Screenshot failed."; if (_redraw) _redraw(); }); };
    const svg = $("#labsvg"), g = $("#labg"); let drag = null, el = null, moved = false, start = null, cur = null, pkTap = null;
    const toModel = (ev) => { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; const q = pt.matrixTransform(g.getScreenCTM().inverse()); return [q.x, q.y]; };
    const posOf = (d) => d === "cb" ? Lay.cb : d === "tgt" ? Lay.target : [Lay.balls[+d.slice(1)].x, Lay.balls[+d.slice(1)].y];
    // iOS: only a touch that starts on a ball (table unlocked) is claimed; everything else scrolls the page, including pocket taps.
    const onBall = (ev) => !isLocked() && ev.target && ev.target.closest && ev.target.closest("[data-drag]");
    const onPk = (ev) => ev.target && ev.target.closest && ev.target.closest("[data-pk]");
    svg.addEventListener("touchstart", (ev) => { if (onBall(ev)) ev.preventDefault(); }, { passive: false });
    svg.addEventListener("touchmove", (ev) => { if (drag) ev.preventDefault(); }, { passive: false });
    const lkbtn = $("#lablock"); if (lkbtn) lkbtn.onclick = () => { SS("pt_lab_lock", !isLocked()); if (isLocked()) sel = null; draw(); };
    svg.addEventListener("pointerdown", (ev) => {
      if (onBall(ev)){
        pkTap = null; el = ev.target.closest("[data-drag]"); drag = el.dataset.drag; moved = false; start = toModel(ev); cur = posOf(drag).slice(); svg.setPointerCapture(ev.pointerId); ev.preventDefault(); return;
      }
      el = null; drag = null;
      const pkEl = onPk(ev);
      if (pkEl) pkTap = { id: pkEl.dataset.pk, x: ev.clientX, y: ev.clientY };
      else pkTap = null;
    });
    svg.addEventListener("pointermove", (ev) => {
      if (pkTap && Math.hypot(ev.clientX - pkTap.x, ev.clientY - pkTap.y) > 14) pkTap = null;
      if (!drag) return; const m = toModel(ev), o = posOf(drag); if (!moved && Math.hypot(m[0] - start[0], m[1] - start[1]) < 0.8) return; moved = true;
      cur = [Math.max(R, Math.min(T.L - R, o[0] + m[0] - start[0])), Math.max(R, Math.min(T.W - R, o[1] + m[1] - start[1]))];
      el.setAttribute("transform", `translate(${cur[0] - o[0]},${cur[1] - o[1]})`);
    });
    const up = (ev) => {
      if (pkTap && ev && Math.hypot((ev.clientX || pkTap.x) - pkTap.x, (ev.clientY || pkTap.y) - pkTap.y) < 14){
        const id = pkTap.id; pkTap = null;
        setPocket(Lay.pocket === id ? "auto" : id);
        persist(); draw(); return;
      }
      pkTap = null;
      if (!drag) return; const d = drag; drag = null;
      if (moved) { if (d === "cb") Lay.cb = cur; else if (d === "tgt") Lay.target = cur; else { const b = Lay.balls[+d.slice(1)]; b.x = cur[0]; b.y = cur[1]; } }
      else if (d !== "tgt"){
        if (d === "cb") sel = "cb";
        else { sel = Lay.balls[+d.slice(1)]; if (sel && sel.n) Lay.ob = sel.n; }
      }
      persist(); draw();
    };
    svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", up);
  };
  draw();
  window.onorientationchange = () => { if (st.view === "lab") draw(); };
};

function uid(){ return "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function layoutToDrill(l){
  return {
    id: l.id || uid(),
    name: l.name || "Untitled drill",
    notes: l.notes || "",
    date: l.date || new Date().toISOString(),
    size: l.size || "9",
    cb: l.cb, balls: (l.balls || []).map((b) => ({ n: b.n, x: b.x, y: b.y })),
    ob: l.ob, pocket: l.pocket || "auto", target: l.target,
    shotType: l.shotType || "cut", rail: l.rail || "auto",
    stroke: l.stroke || null
  };
}
function migrateDrills(){
  const cur = LS("pt_drills", []);
  const old = LS("pt_layouts", []);
  if (!old.length) return cur;
  const have = new Set(cur.map((d) => (d.name || "") + "|" + (d.date || "")));
  old.forEach((l) => {
    const rec = layoutToDrill(l);
    const k = rec.name + "|" + rec.date;
    if (!have.has(k)){ have.add(k); cur.push(rec); }
  });
  SS("pt_drills", cur);
  SS("pt_layouts", []);
  return cur;
}
function allDrills(){ return migrateDrills(); }
function saveDrills(all){ SS("pt_drills", all); }
function currentDrill(name, notes){
  return layoutToDrill(Object.assign(JSON.parse(JSON.stringify(Lay)), { name: name, notes: notes || "", date: new Date().toISOString(), id: uid(), stroke: strokeOf() }));
}
function loadDrill(d){
  if (!d) return;
  Lay = Object.assign(defLayout(), {
    size: d.size || "9", cb: d.cb, balls: (d.balls || []).map((b) => ({ n: b.n, x: b.x, y: b.y })),
    ob: d.ob, pocket: d.pocket || "auto", target: d.target,
    shotType: d.shotType || "cut", rail: d.rail || "auto",
    name: d.name || "", notes: d.notes || ""
  });
  T = TABLES[Lay.size] || TABLES["9"];
  if (d.stroke) { setStroke(d.stroke); setWantTarget(false); }
  persist();
}

function renderSaved($, esc, save, st){
  const all = allDrills();
  let h = `<div class="callout">Save a shot from the Table tab — balls, pocket, Cut/Bank/Kick, rail, and the current tip/speed/english — then load it back, project it, or open it in Table Capture.</div>`;
  h += `<div class="row"><button class="btn" id="exp">Export drills (JSON)</button><label class="btn ghost" style="display:inline-flex;align-items:center;justify-content:center">Import JSON<input type="file" id="imp" accept="application/json,.json" style="display:none"></label></div>`;
  if (!all.length) h += `<div class="callout">No drills yet. Set up a shot on the Table tab and tap Save as drill.</div>`;
  all.forEach((l, i) => {
    const typ = (l.shotType === "bank" || l.shotType === "kick") ? l.shotType[0].toUpperCase() + l.shotType.slice(1) : "Cut";
    const stroke = l.stroke ? strokeLabel(Object.assign({ tip: "follow", v0: 55, side: 0 }, l.stroke)) : "";
    h += `<div class="card" data-drill="${esc(l.id)}"><div class="t">${esc(l.name)}</div><div class="meta">${l.date ? esc(new Date(l.date).toLocaleString()) : ""} · ${esc(TABLES[l.size] ? TABLES[l.size].name : l.size)} · ${typ}${(l.rail && l.rail !== "auto") ? " off the " + RAILNAME[l.rail] : ""} · ${(l.balls || []).length} object ball(s)${stroke ? " · " + esc(stroke) : ""}</div>`;
    if (l.notes) h += `<div class="desc">${esc(l.notes)}</div>`;
    h += `<div class="row"><button class="btn" data-ld="${i}">Load in Shot Lab</button><button class="btn ghost" data-dup="${i}">Duplicate</button></div>`;
    h += `<div class="row"><button class="btn ghost" data-ren="${i}">Rename</button><button class="btn ghost" data-del="${i}">Delete</button></div>`;
    h += `<div class="row"><button class="btn ghost" data-proj="${i}">📽 Project</button><button class="btn ghost" data-cap="${i}">Open in Capture</button></div></div>`;
  });
  $("#main").innerHTML = h;
  const goTable = (d) => { loadDrill(d); st.labtab = "table"; window.renderLab($, esc, save, st); };
  document.querySelectorAll("[data-ld]").forEach((b) => b.onclick = () => goTable(all[+b.dataset.ld]));
  document.querySelectorAll("[data-dup]").forEach((b) => b.onclick = () => {
    const src = all[+b.dataset.dup], copy = layoutToDrill(JSON.parse(JSON.stringify(src)));
    copy.id = uid(); copy.name = (src.name || "Drill") + " copy"; copy.date = new Date().toISOString();
    all.unshift(copy); saveDrills(all); renderSaved($, esc, save, st);
  });
  document.querySelectorAll("[data-ren]").forEach((b) => b.onclick = () => {
    const d = all[+b.dataset.ren]; const n = prompt("Rename this drill:", d.name || "");
    if (n == null) return; d.name = n.trim() || d.name; saveDrills(all); renderSaved($, esc, save, st);
  });
  document.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => { if (confirm("Delete this drill?")) { all.splice(+b.dataset.del, 1); saveDrills(all); renderSaved($, esc, save, st); } });
  document.querySelectorAll("[data-proj]").forEach((b) => b.onclick = () => {
    const d = all[+b.dataset.proj]; loadDrill(d);
    if (window.TableCapture && TableCapture.projectShotLab) TableCapture.projectShotLab(Lay);
  });
  document.querySelectorAll("[data-cap]").forEach((b) => b.onclick = () => {
    const d = all[+b.dataset.cap]; loadDrill(d);
    if (window.TableCapture && TableCapture.openLayout) TableCapture.openLayout(TableCapture.fromShotLab(Lay));
    st.labtab = "cap"; window.renderLab($, esc, save, st);
  });
  $("#exp").onclick = () => { const blob = new Blob([JSON.stringify({ app: "Road Warrior drills", version: 1, drills: all }, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "road-warrior-drills.json"; document.body.appendChild(a); a.click(); a.remove(); };
  $("#imp").onchange = (e) => { const f = e.target.files[0]; if (!f) return; f.text().then((txt) => { try { const j = JSON.parse(txt); const arr = Array.isArray(j) ? j : j.drills || j.layouts || [j]; const ok = arr.filter((l) => l && l.balls && l.size).map(layoutToDrill); saveDrills(ok.concat(allDrills())); alert("Imported " + ok.length + " drill(s)."); renderSaved($, esc, save, st); } catch (err) { alert("That file isn't a drill or Shot Lab JSON export."); } }); };
}

window.ShotLab = { analyze, predictCB, solveTarget, leaveVel, wantTarget, setWantTarget, tipLabel, speedLabel, strokeFromCand, tipModeOf, MU_R, G, TABLES, pockets, R, approach, simCB, evalPocket, evalBank, evalKick, PKNAME, RAILNAME, RAILIDS, showGhost, setShowGhost, captureTable, strokeOf, setStroke, strokeHTML, wireStroke, strokeLabel, TIPMODES, SPEEDS, allDrills, saveDrills, loadDrill, currentDrill, layoutToDrill };
})();
// ---------- Photo to layout (all on-device; nothing is uploaded) ----------
(function(){
function solve(A, b){ const n = b.length; for (let i = 0; i < n; i++){ let m = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r; [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]]; for (let r = i + 1; r < n; r++){ const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; } } const x = Array(n).fill(0); for (let i = n - 1; i >= 0; i--){ let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; } return x; }
// homography H mapping src points -> dst points (4 pairs)
function homog(src, dst){ const A = [], b = []; for (let i = 0; i < 4; i++){ const [x, y] = src[i], [u, v] = dst[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); } const h = solve(A, b); return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1]; }
const apply = (H, x, y) => { const w = H[6] * x + H[7] * y + H[8]; return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]; };
// warp: out image (L*ppi x W*ppi) sampling the source via H (model inches -> source px)
function warp(src, sw, sh, H, L, W, ppi){ const ow = Math.round(L * ppi), oh = Math.round(W * ppi), out = new Uint8ClampedArray(ow * oh * 4);
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++){ const [sx, sy] = apply(H, (x + 0.5) / ppi, (y + 0.5) / ppi); const ix = sx | 0, iy = sy | 0, o = (y * ow + x) * 4;
    if (ix < 0 || iy < 0 || ix >= sw - 1 || iy >= sh - 1){ out[o + 3] = 255; continue; } const fx = sx - ix, fy = sy - iy;
    for (let c = 0; c < 3; c++){ const i0 = (iy * sw + ix) * 4 + c; out[o + c] = (src[i0] * (1 - fx) + src[i0 + 4] * fx) * (1 - fy) + (src[i0 + sw * 4] * (1 - fx) + src[i0 + sw * 4 + 4] * fx) * fy; } out[o + 3] = 255; }
  return { data: out, w: ow, h: oh }; }
function hsv(r, g, b){ r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d){ if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, mx ? d / mx : 0, mx]; }
function inv3(H){ const [a,b,c,d,e,f,g,h,i] = H, A = e*i-f*h, B = -(d*i-f*g), C = d*h-e*g, det = a*A + b*B + c*C; return [A/det, -(b*i-c*h)/det, (b*f-c*e)/det, B/det, (a*i-c*g)/det, -(a*f-c*d)/det, C/det, -(a*h-b*g)/det, (a*e-b*d)/det]; }
// Detect balls in the ORIGINAL photo (a sphere stays round in a photo, its footprint on the cloth does not), then map to table inches.
function detect(src, sw, sh, H, T, R){ const data = src, Hi = inv3(H), L = T.L, W = T.W;
  const inTable = (x, y, m) => { const q = apply(Hi, x, y); return q[0] > m && q[0] < L - m && q[1] > m && q[1] < W - m ? q : null; };
  const pk = [[0,0],[L/2,0],[L,0],[0,W],[L/2,W],[L,W]], nearPocket = (q) => pk.some((p) => Math.hypot(q[0]-p[0], q[1]-p[1]) < 3.2);
  // local scale: singular values of the model->image Jacobian
  const jac = (q) => { const e = 0.5, p0 = apply(H, q[0], q[1]), px = apply(H, q[0]+e, q[1]), py = apply(H, q[0], q[1]+e); const a = (px[0]-p0[0])/e, b = (py[0]-p0[0])/e, c = (px[1]-p0[1])/e, d = (py[1]-p0[1])/e;
    const s1 = a*a+b*b+c*c+d*d, s2 = Math.sqrt(Math.max(0, (a*a+b*b-c*c-d*d)**2 + 4*(a*c+b*d)**2)); const smax = Math.sqrt((s1+s2)/2), smin = Math.sqrt(Math.max(0,(s1-s2)/2));
    // image direction of the most foreshortened table direction
    const ang = 0.5*Math.atan2(2*(a*b+c*d), a*a+c*c-b*b-d*d) + Math.PI/2; const dv = [a*Math.cos(ang)+b*Math.sin(ang), c*Math.cos(ang)+d*Math.sin(ang)]; const dl = Math.hypot(dv[0], dv[1]) || 1; let u = [dv[0]/dl, dv[1]/dl]; if (u[1] < 0) u = [-u[0], -u[1]];
    return { smax, smin, u }; };
  const rs = [], gs = [], bs = []; const st = Math.max(2, Math.round(Math.sqrt(sw*sh)/300));
  for (let y = 0; y < sh; y += st) for (let x = 0; x < sw; x += st){ if (!inTable(x, y, 2)) continue; const o = (y*sw+x)*4; rs.push(data[o]); gs.push(data[o+1]); bs.push(data[o+2]); }
  const med = (a) => a.sort((p, q) => p - q)[a.length >> 1]; const cr = med(rs), cg = med(gs), cb = med(bs), cs = cr+cg+cb+1, cv = Math.max(cr, cg, cb) + 1;
  const mask = new Uint8Array(sw*sh); let minX = sw, maxX = 0, minY = sh, maxY = 0;
  for (const [x, y] of [[0,0],[L,0],[L,W],[0,W]].map((q) => apply(H, q[0], q[1]))){ minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  minX = Math.max(1, minX|0); minY = Math.max(1, minY|0); maxX = Math.min(sw-2, Math.ceil(maxX)); maxY = Math.min(sh-2, Math.ceil(maxY));
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++){ if (!inTable(x, y, 0.3)) continue; const o = (y*sw+x)*4, r = data[o], g = data[o+1], b = data[o+2], s = r+g+b+1, v = Math.max(r, g, b);
    const chroma = Math.abs(r/s-cr/cs) + Math.abs(g/s-cg/cs) + Math.abs(b/s-cb/cs);
    if ((chroma > 0.16 && v > cv*0.45) || v > cv*1.45 || v < cv*0.3) mask[y*sw+x] = 1; }
  const er = new Uint8Array(sw*sh); for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++){ const i = y*sw+x; er[i] = mask[i] && mask[i-1] && mask[i+1] && mask[i-sw] && mask[i+sw] ? 1 : 0; }
  const lab = new Int32Array(sw*sh), balls = []; let id = 0;
  for (let y0 = minY; y0 <= maxY; y0++) for (let x0 = minX; x0 <= maxX; x0++){ const i0 = y0*sw+x0; if (!er[i0] || lab[i0]) continue; id++; const stk = [i0], px = []; lab[i0] = id;
    while (stk.length){ const j = stk.pop(); px.push(j); const x = j % sw; for (const k of [j-1, j+1, j-sw, j+sw]){ if (lab[k] || !er[k]) continue; if (Math.abs((k % sw) - x) > 1) continue; lab[k] = id; stk.push(k); } }
    let sx = 0, sy = 0; for (const j of px){ sx += j % sw; sy += (j / sw) | 0; } const cx = sx/px.length, cy = sy/px.length; const q = apply(Hi, cx, cy); if (!q) continue;
    const J = jac(q), re = R * J.smax, A1 = Math.PI * re * re; const area = px.length; if (area < 0.35*A1 || re < 2.5) continue;
    let n = Math.max(1, Math.round(area / (A1 * 0.85))); if (n > 18) continue;
    let mnx = 1e9, mxx = -1, mny = 1e9, mxy = -1; for (const j of px){ const x = j % sw, y = (j / sw) | 0; mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mny = Math.min(mny, y); mxy = Math.max(mxy, y); }
    const bw = mxx-mnx+1, bh = mxy-mny+1; if (Math.min(bw, bh) < re*1.2) continue;
    { let sxx = 0, syy = 0, sxy = 0; for (const j of px){ const dx = (j % sw) - cx, dy = ((j / sw) | 0) - cy; sxx += dx*dx; syy += dy*dy; sxy += dx*dy; } sxx /= area; syy /= area; sxy /= area; const tr = sxx + syy, dt = Math.sqrt(Math.max(0, (sxx-syy)**2/4 + sxy*sxy)); const smin = Math.sqrt(Math.max(0, tr/2 - dt)), smaj = Math.sqrt(tr/2 + dt);
      if (4*smin < re*1.3) continue; // thinner than about 2/3 of a ball: cue stick, chalk line, glare
      if (n <= 3 && smaj > 3.2*smin && 4*smaj > 2*re*(n+1)) continue; } // long streak (motion blur) rather than touching balls
    let cs2 = []; if (n === 1) cs2 = [[cx, cy]]; else { for (let k = 0; k < n; k++){ const t = (k+0.5)/n; cs2.push([mnx + bw*t, mny + bh*(bw > bh ? 0.5 : t)]); }
      for (let it = 0; it < 15; it++){ const acc = cs2.map(() => [0,0,0]); for (const j of px){ const x = j % sw, y = (j / sw) | 0; let bi = 0, bd = 1e18; cs2.forEach((c, ci) => { const dd = (c[0]-x)**2 + (c[1]-y)**2; if (dd < bd){ bd = dd; bi = ci; } }); acc[bi][0] += x; acc[bi][1] += y; acc[bi][2]++; } cs2 = acc.map((a, ci) => a[2] ? [a[0]/a[2], a[1]/a[2]] : cs2[ci]); } }
    for (const [x, y] of cs2){ const qq = apply(Hi, x, y), Jb = jac(qq), rb = R*Jb.smax, obl = 1 - Jb.smin/Jb.smax;
      // the sphere's center sits R above the cloth; shift toward the camera (down the foreshortened direction) to estimate the contact point
      const contact = apply(Hi, x + Jb.u[0]*rb*obl*0.9, y + Jb.u[1]*rb*obl*0.9); if (nearPocket(contact)) continue;
      balls.push({ grp: n, ix: x, iy: y, ir: rb, x: Math.max(R, Math.min(L-R, contact[0])), y: Math.max(R, Math.min(W-R, contact[1])) }); } }
  for (const b of balls){ let wht = 0, drk = 0, col = 0, tot = 0, hx = 0, hy = 0, vs = 0; const rr = b.ir*0.7;
    for (let y = Math.round(b.iy-rr); y <= b.iy+rr; y++) for (let x = Math.round(b.ix-rr); x <= b.ix+rr; x++){ if ((x-b.ix)**2 + (y-b.iy)**2 > rr*rr || x < 0 || y < 0 || x >= sw || y >= sh) continue; const o = (y*sw+x)*4; const [Hh, S, V] = hsv(data[o], data[o+1], data[o+2]); tot++;
      if (S < 0.28 && V > 0.6) wht++; else if (V < 0.22) drk++; else if (S > 0.35){ col++; hx += Math.cos(Hh*Math.PI/180); hy += Math.sin(Hh*Math.PI/180); vs += V; } }
    tot = tot || 1; b.white = wht/tot; b.dark = drk/tot; b.col = col/tot; b.hue = (Math.atan2(hy, hx)*180/Math.PI + 360) % 360; b.val = col ? vs/col : 0; }
  let cue = null; const cs3 = (b) => b.white - (b.grp > 1 ? 0.25 : 0); for (const b of balls) if (b.white > 0.35 && b.col < 0.45 && (!cue || cs3(b) > cs3(cue))) cue = b;
  const guesses = [];
  for (const b of balls){ if (b === cue) continue; let n = 0, conf = 0;
    if (b.dark > 0.45 && b.col < 0.2) { n = 8; conf = b.dark; }
    else if (b.col > 0.2){ const hh = b.hue; let base = hh >= 340 || hh < 14 ? (b.val < 0.5 ? 7 : 3) : hh < 38 ? 5 : hh < 70 ? 1 : hh < 170 ? 6 : hh < 255 ? 2 : 4; const stripe = b.white > 0.2; n = base + (stripe ? 8 : 0); conf = b.col; }
    guesses.push([conf, b, n]); }
  guesses.sort((a, b) => b[0] - a[0]); const used = new Set(); for (const [c, b, n] of guesses){ if (n && !used.has(n)) { b.n = n; used.add(n); } else b.n = 0; }
  return { balls, cue, cloth: [cr, cg, cb] }; }
window.PhotoCore = { homog, apply, warp, detect, inv3 };

window.PhotoLab = function($, esc, back, setLayout){
  const S = window.ShotLab; let size = "9", img = null, cv = null, pts = [], det = null, warped = null;
  $("#main").innerHTML = `<div class="callout"><b>Photo to layout.</b> Take or pick a photo of the table (overhead is best, an angle works). Everything runs on your phone; the photo is never uploaded. Then tap the 4 corner pockets in order going around the table: 1 and 2 along a long rail, then 3 and 4.</div>
  <div class="row"><select id="psize">${Object.entries(S.TABLES).map(([k, t]) => `<option value="${k}" ${k === size ? "selected" : ""}>${t.name}</option>`).join("")}</select><label class="btn" style="display:inline-flex;align-items:center;justify-content:center">📷 Take / choose photo<input type="file" id="pfile" accept="image/*" capture="environment" style="display:none"></label></div>
  <div id="pstep" class="meta"></div><div id="pwrap" style="position:relative"></div><div id="pres"></div>`;
  $("#psize").onchange = (e) => { size = e.target.value; if (pts.length === 4) run(); };
  $("#pfile").onchange = (e) => { const f = e.target.files[0]; if (!f) return; const u = URL.createObjectURL(f); const im = new Image(); im.onload = () => { img = im; pts = []; det = null; showPhoto(); }; im.src = u; };
  function showPhoto(){ const mx = 1600, sc = Math.min(1, mx / Math.max(img.width, img.height)); cv = document.createElement("canvas"); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc); cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height); cv.style.cssText = "width:100%;height:auto;border-radius:10px;touch-action:manipulation"; $("#pwrap").innerHTML = ""; $("#pwrap").appendChild(cv); redrawMarks(); cv.onclick = (ev) => { if (pts.length >= 4) return; const r = cv.getBoundingClientRect(); pts.push([(ev.clientX - r.left) * cv.width / r.width, (ev.clientY - r.top) * cv.height / r.height]); redrawMarks(); if (pts.length === 4) run(); }; }
  function redrawMarks(){ const c = cv.getContext("2d"); c.drawImage(img, 0, 0, cv.width, cv.height); c.lineWidth = Math.max(2, cv.width / 300); pts.forEach((p, i) => { c.strokeStyle = "#ffd54f"; c.beginPath(); c.arc(p[0], p[1], cv.width / 60, 0, 7); c.stroke(); c.fillStyle = "#ffd54f"; c.font = `${Math.round(cv.width / 30)}px system-ui`; c.fillText(String(i + 1), p[0] + cv.width / 50, p[1]); if (i) { c.beginPath(); c.moveTo(...pts[i - 1]); c.lineTo(...p); c.stroke(); } });
    $("#pstep").innerHTML = pts.length < 4 ? `Tap corner pocket ${pts.length + 1} of 4 ${pts.length ? `<button class="btn ghost" id="pundo">Undo</button>` : ""}` : `<button class="btn ghost" id="pundo">Redo corners</button>`; const u = $("#pundo"); if (u) u.onclick = () => { pts = pts.length === 4 ? [] : pts.slice(0, -1); det = null; $("#pres").innerHTML = ""; redrawMarks(); }; }
  function run(){ const T = S.TABLES[size], ppi = 8, src = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height);
    // corners 1-2 along a long rail: model (0,0),(L,0),(L,W),(0,W); if the user tapped along a short rail first, rotate
    const d01 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), d12 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]); const P = d01 >= d12 * 0.6 ? pts : [pts[1], pts[2], pts[3], pts[0]];
    const H = homog([[0, 0], [T.L, 0], [T.L, T.W], [0, T.W]], P); warped = warp(src.data, cv.width, cv.height, H, T.L, T.W, ppi); det = detect(src.data, cv.width, cv.height, H, T, S.R); det.balls.forEach((b) => { b.px = b.x * ppi; b.py = b.y * ppi; });
    const oc = document.createElement("canvas"); oc.width = warped.w; oc.height = warped.h; const c = oc.getContext("2d"); c.putImageData(new ImageData(warped.data, warped.w, warped.h), 0, 0); c.lineWidth = 2;
    det.balls.forEach((b) => { c.strokeStyle = b === det.cue ? "#fff" : b.n ? "#ffd54f" : "#ff5252"; c.beginPath(); c.arc(b.px, b.py, S.R * ppi + 2, 0, 7); c.stroke(); c.fillStyle = "#fff"; c.font = "bold 13px system-ui"; c.fillText(b === det.cue ? "CB" : b.n || "?", b.px + 10, b.py - 10); });
    oc.style.cssText = "width:100%;height:auto;border-radius:10px;margin-top:8px";
    const nb = det.balls.length - (det.cue ? 1 : 0), unl = det.balls.filter((b) => b !== det.cue && !b.n).length;
    $("#pres").innerHTML = `<h3>Top-down view</h3><div class="meta">Found ${det.balls.length} ball(s): ${det.cue ? "cue ball found" : "no cue ball found (add it on the table)"}, ${nb} object ball(s), ${unl} without a number guess (shown as "?"). Number guesses come from color and can be wrong; fix them on the table by tapping a ball.</div>`;
    $("#pres").appendChild(oc);
    const row = document.createElement("div"); row.innerHTML = `<label class="meta" style="display:block;margin:8px 0"><input type="checkbox" id="psave"> Keep a small copy of this top-down photo with the layout (stored only on this phone)</label><div class="row"><button class="btn" id="puse">Use this layout</button></div>`; $("#pres").appendChild(row);
    $("#puse").onclick = () => { const balls = det.balls.filter((b) => b !== det.cue).map((b) => ({ n: b.n || 0, x: b.x, y: b.y })); const firstN = balls.find((b) => b.n); const lay = { size, cb: det.cue ? [det.cue.x, det.cue.y] : [T.L * 0.25, T.W * 0.5], balls, ob: firstN ? firstN.n : null, pocket: "auto", target: [T.L / 2, T.W / 2], name: "From photo " + new Date().toLocaleDateString(), notes: "" };
      if ($("#psave").checked) { const sc = document.createElement("canvas"); sc.width = 400; sc.height = Math.round(400 * warped.h / warped.w); sc.getContext("2d").drawImage(oc, 0, 0, sc.width, sc.height); lay.photo = sc.toDataURL("image/jpeg", 0.6); }
      setLayout(lay); back(); }; }
};
})();
