// CONTENT FILE: adaptive-plan tables (rating charts, skill-test definitions, drill text, plan video lists, warm-up steps, day sets).
// Edit values here; the engine, scoring and screens are in adaptive.js. Loaded BEFORE adaptive.js; exposes window.AdaptiveData.
window.AdaptiveData = (function(){
const BU = "https://billiarduniversity.org";
const BUDOC = (f) => BU + "/documents/" + f + ".pdf";
// BU Rating Comparisons chart (billiarduniversity.org/documents/BU_Rating_Comparisons.pdf). APA columns intentionally left out.
const BUCHART = [
  [185,200,"world-class pro",770,9999,"A++ / AAAA","10","≥ 2050","10"],
  [175,184,"semipro / pro",730,769,"A+ / AAA","10","2000–2049","10"],
  [165,174,"upper shortstop",690,729,"A / AA","9, 10","1950–1999","9, 10"],
  [155,164,"lower shortstop",650,689,"A- / A","9, 10","1875–1949","9, 10"],
  [140,154,"upper advanced",600,649,"B+","8, 9","1825–1874","8, 9"],
  [125,139,"mid advanced",550,599,"B","8, 9","1750–1824","6, 7"],
  [110,124,"lower advanced",500,549,"B-","7, 8","1700–1749","4, 5"],
  [95,109,"upper intermediate",450,499,"C+","7, 8","1625–1699","2, 3"],
  [70,94,"mid intermediate",400,449,"C","6, 7","1550–1624","1, 0, 1"],
  [55,69,"lower intermediate",350,399,"C-","5, 6","1500–1549","-2, -3"],
  [40,54,"upper beginner",300,349,"D+","4, 5","1425–1499","-4, -5"],
  [30,39,"mid beginner",250,299,"D","4, 5","1350–1424","-6, -7"],
  [20,29,"lower beginner",200,249,"D-","3, 4","1300–1349","-8, -9"],
  [0,19,"novice",0,199,"D--","2","< 1300","-10"]];
// Smooth BU total (out of 200) vs Fargo, through the middle of each band.
const BUPTS = [[100,10],[225,25],[275,35],[325,47],[375,62],[425,82],[475,102],[525,117],[575,132],[625,147],[670,160],[710,170],[750,180],[800,193]];
const LVN = { B: "Beginner", I: "Intermediate", E: "Expert", P: "Professional" };
const SELF_F = { B: 300, I: 425, E: 560, P: 700 };
const AREAS = {
  aimR: "Aiming: right cuts", aimL: "Aiming: left cuts", aim: "Aiming / pocketing", stroke: "Stroke", cbc: "Cue ball control (stop/follow/draw/speed)",
  pos: "Position", banks: "Banks", kicks: "Kicks", safe: "Safeties", brk: "Break", pat: "Patterns / run-outs", long: "Long shots", jm: "Jump / massé (optional)", mental: "Mental / pressure" };
const V = (l, id) => [l, id];
const AV = {
  aimR: [V("BU F1 progressive cut drill", "jHAJ9NQEvZg")], aimL: [V("BU F1 progressive cut drill", "jHAJ9NQEvZg")], aim: [V("BU F1 progressive cut drill", "jHAJ9NQEvZg")],
  stroke: [V("Mighty X (Margaret Fefilova Styer)", "Oj7lku_wO94"), V("How to stroke straight (Max Eberle)", "V2QO6J84GOc"), V("Up-downs (Joe Tucker)", "Ii_0HHIiK_c")],
  cbc: [V("Stop, follow and draw drill (Dr. Dave)", "xUA1lsGKEAc"), V("Stop shot (Jasmin Ouschan)", "ehjFxcW0Lz4"), V("How to master the draw shot (Dr. Dave)", "e8X15F-6w4s")],
  pos: [V("BU Exam I overview (wagon wheel, target drills)", "DIARJtj4WF8"), V("Top 10 pattern play principles (Dr. Dave)", "DMlQGu_pRNU")],
  banks: [V("Bank to all pockets (Dr. Dave)", "tVpfIgPC6F8"), V("How to make more bank shots (Niels Feijen)", "lCoIBHzy8YE")],
  kicks: [V("Kicking master class (Dr. Dave)", "RGnLsOXp2U4"), V("One-rail kicks (Sharivari)", "gti0C2gS6mI")],
  safe: [V("Big Brother Little Brother (Niels Feijen)", "9dAO28LIO3Q")],
  brk: [V("Break shot technique (Dr. Dave)", "Av2DNdWzziA"), V("Break training manual (Jasmin Ouschan)", "s27mZsTiXs8"), V("Break strategy 8/9/10-ball (Dr. Dave)", "jJXSs5KGx9k")],
  pat: [V("Top 10 pattern play principles (Dr. Dave)", "DMlQGu_pRNU"), V("Basic 9-ball pattern drill (Darren Appleton)", "GGm08omfgwA"), V("Equal Offense vs the ghost (Shortstop On Pool)", "VMHvv7toICw")],
  long: [V("How to shoot a long stop shot (FX Billiards)", "urWaiWeM7xE"), V("Long potting masterclass (Stephen Hendry)", "WUPpPKA8Oy0")],
  jm: [V("Jump shot: everything you need to know (Dr. Dave)", "NFd9tUgFbFE"), V("Massé and swerve shots (Dr. Dave)", "rIjchLs7p4c")],
  mental: [V("3 tools to deal with pressure (Niels Feijen)", "FmLIxmbPVv4"), V("3-step pre-shot routine (Jasmin Ouschan)", "VSHni6W1y6M")]
};
const DRILL = {
  aimR: "Right-cut ladder: BU F1 set up as a right cut, then 10 right and 10 left cuts from mirrored spots. Mark each miss thick or thin. Use the Right-Cut Fix checklist in Plan.",
  aimL: "Left-cut ladder: BU F1 set up as a left cut, then 10 left and 10 right cuts from mirrored spots. Mark each miss thick or thin.",
  aim: "Shot-making: Colenso-style pots (any 8 of the 16) or BU F6 pocketing; one attempt each, full pre-shot routine.",
  stroke: "Mighty X or up-downs, then 10 straight-back strokes (cue ball to the far rail and back to the tip).",
  cbc: "Stop / follow / draw / stun ladders (BU F2–F5). Then a speed ladder: stop the cue ball at each diamond in turn.",
  pos: "Wagon wheel (BU F7) and target drill (BU F8); then 3-ball run-outs with ball in hand.",
  banks: "Cross-side and cross-corner banks from 5 cue-ball spots; say thick/thin on each miss.",
  kicks: "One-rail kicks off the long rail (BU S6 setup), then two-rail kicks with the diamond system.",
  safe: "Big Brother Little Brother, then BU S5 hide-behind-target safeties.",
  brk: "10 breaks: score each on the BU S10 five points (no scratch, CB off rail, CB in center zone, ball made, 3+ balls up table).",
  pat: "Ghost games or Equal Offense: play out racks and plan the pattern before the first shot.",
  long: "Long straight-ins and long stop shots: cue ball near the head string, object ball near the foot spot.",
  jm: "Optional: 10 jumps over a blocker half a diamond away, then 10 small massé curves. Skip if your back or the room rules say no.",
  mental: "Pressure ladder: you must make 5 in a row of a medium cut before moving on; full pre-shot routine on every shot."
};
// Tests. basis: sourced = the source gives levels for this test; derived = the app maps a source's level bands to Fargo; estimate = app estimate only.
const TESTS = [
  { id: "f1r", area: "aimR", name: "BU F1 cut shot, set up as a RIGHT cut", max: 10, curve: "bu", basis: "derived", how: "Progressive drill, 10 shots. Start at CB position 4; move up one after a make, down one after a miss (stay at 1 or 7). Score = final position + 1 bonus per make at 7, max 10.", src: [["BU Exam I drills (PDF)", BUDOC("BU_Exam-I_Fundamentals")]], vids: [V("BU F1 progressive cut drill", "jHAJ9NQEvZg")] },
  { id: "f1l", area: "aimL", name: "BU F1 cut shot, set up as a LEFT cut", max: 10, curve: "bu", basis: "derived", how: "Same as above from the mirrored side of the table, so you can compare left and right.", src: [["BU Exam I drills (PDF)", BUDOC("BU_Exam-I_Fundamentals")]], vids: [V("BU F1 progressive cut drill", "jHAJ9NQEvZg")] },
  { id: "colr", area: "aimR", name: "Colenso test: right-cut half (8 pots)", max: 40, curve: "colenso", basis: "derived", how: "Shoot the 8 Colenso pots that cut to the right; 5 points per pot. Full test bands: C 30–44, B 45–59, A 60–69, pro 70–79 (out of 80).", src: [["Colenso test (Dr. Dave)", "/faq/drill/shot-making/"]], vids: [] },
  { id: "coll", area: "aimL", name: "Colenso test: left-cut half (8 pots)", max: 40, curve: "colenso", basis: "derived", how: "The 8 Colenso pots that cut to the left; 5 points per pot.", src: [["Colenso test (Dr. Dave)", "/faq/drill/shot-making/"]], vids: [] },
  { id: "f6", area: "aim", name: "BU F6 ball pocketing", max: 10, curve: "bu", basis: "derived", how: "10 fixed shots, one attempt each, no scratches. Score = balls pocketed.", src: [["BU Exam I drills (PDF)", BUDOC("BU_Exam-I_Fundamentals")]], vids: [V("BU Exam I overview", "DIARJtj4WF8")] },
  { id: "stk", area: "stroke", name: "Straight-stroke self-test", max: 10, curve: "bu", basis: "estimate", how: "Cue ball on the head spot. Shoot it straight up table to the foot rail at medium speed so it comes back to your tip. 10 shots; 1 point if it returns within one ball width of the starting line.", src: [], vids: [V("How to stroke straight (Max Eberle)", "V2QO6J84GOc")] },
  { id: "f2", area: "cbc", name: "BU F2 stop shot", max: 10, curve: "bu", basis: "derived", how: "Progressive (like F1). The OB must drop and the stopped CB must overlap the ghost-ball spot.", src: [["BU Exam I drills (PDF)", BUDOC("BU_Exam-I_Fundamentals")]], vids: [V("Stop shot (Jasmin Ouschan)", "ehjFxcW0Lz4")] },
  { id: "f3", area: "cbc", name: "BU F3 follow shot", max: 10, curve: "bu", basis: "derived", how: "Progressive. OB in, CB ends in or touching the paper target (8.5×11 frame).", src: [["BU Exam I drills (PDF)", BUDOC("BU_Exam-I_Fundamentals")]], vids: [V("Stop, follow and draw drill (Dr. Dave)", "xUA1lsGKEAc")] },
  { id: "f4", area: "cbc", name: "BU F4 draw shot", max: 10, curve: "bu", basis: "derived", how: "Progressive. OB in, CB center ends inside the 2×1-diamond box by the side pocket.", src: [["BU Exam I drills (PDF)", BUDOC("BU_Exam-I_Fundamentals")]], vids: [V("How to master the draw shot (Dr. Dave)", "e8X15F-6w4s")] },
  { id: "f5", area: "cbc", name: "BU F5 stun shot", max: 10, curve: "bu", basis: "derived", how: "Progressive. The target moves; positions 5–7 need a rebound off the end rail.", src: [["BU Exam I drills (PDF)", BUDOC("BU_Exam-I_Fundamentals")]], vids: [V("Stop, follow and draw drill (Dr. Dave)", "xUA1lsGKEAc")] },
  { id: "spd", area: "cbc", name: "Lag-speed self-test", max: 10, curve: "bu", basis: "estimate", how: "10 lags (head rail to foot rail and back). 1 point each time the cue ball stops within one ball width of the head rail without touching it twice.", src: [["How to win the lag (PoolDawg)", "https://www.pooldawg.com/article/starting-strong-how-to-win-the-lag/"]], vids: [V("NO LAG CAN STOP ME FROM WINNING (Slivovich)", "FMjdnBUrvS8")] },
  { id: "f7", area: "pos", name: "BU F7 wagon wheel", max: 20, curve: "bu", basis: "derived", how: "Score per the BU Exam I sheet (20 max).", src: [["BU Exam I drills (PDF)", BUDOC("BU_Exam-I_Fundamentals")], ["BU Exam I score sheet (PDF)", BUDOC("BU_Exam-I_Score_Sheet")]], vids: [V("BU Exam I overview", "DIARJtj4WF8")] },
  { id: "f8", area: "pos", name: "BU F8 target pocketing", max: 20, curve: "bu", basis: "derived", how: "Score per the BU Exam I sheet (20 max).", src: [["BU Exam I drills (PDF)", BUDOC("BU_Exam-I_Fundamentals")], ["BU Exam I score sheet (PDF)", BUDOC("BU_Exam-I_Score_Sheet")]], vids: [V("BU Exam I overview", "DIARJtj4WF8")] },
  { id: "bu1", area: "", name: "BU Exam I total (F1–F8)", max: 100, curve: "bu", basis: "derived", how: "Add F1–F8 (100 max). BU uses it to pick your Exam II level: 0–49 Bachelors, 50–69 Masters, 70–100 Doctorate. The BU chart rates Exam I + Exam II together (out of 200); this app assumes half of that.", src: [["BU exams page", BU + "/testing/exams/"], ["BU rating comparisons (PDF)", BU + "/documents/BU_Rating_Comparisons.pdf"]], vids: [V("BU Exam I overview", "DIARJtj4WF8")], overall: true },
  { id: "s7", area: "banks", name: "BU S7 bank shots (Bachelors)", max: 3, curve: "bu", basis: "derived", how: "CB in hand; bank each of 3 balls cross side. 1 point each.", src: [["BU Exam II Bachelors (PDF)", BUDOC("BU_Exam-II_Skills-Bachelors")]], vids: [V("Bank to all pockets (Dr. Dave)", "tVpfIgPC6F8")] },
  { id: "bk10", area: "banks", name: "10-bank self-test", max: 10, curve: "bu", basis: "estimate", how: "10 cross-side banks with ball in hand, different angles each time. 1 point per make.", src: [], vids: [V("How to make more bank shots (Niels Feijen)", "lCoIBHzy8YE")] },
  { id: "s6", area: "kicks", name: "BU S6 kick shots (Bachelors)", max: 3, curve: "bu", basis: "derived", how: "Kick at each of 3 OBs off the same long rail from the same CB spot. 1 point per legal hit (no scratch, ball to rail).", src: [["BU Exam II Bachelors (PDF)", BUDOC("BU_Exam-II_Skills-Bachelors")]], vids: [V("One-rail kicks (Sharivari)", "gti0C2gS6mI")] },
  { id: "s5", area: "safe", name: "BU S5 hide-behind-target safety", max: 6, curve: "bu", basis: "derived", how: "Two tries from each of 3 CB spots. 1 point per snooker that leaves the cluster inside the target.", src: [["BU Exam II Bachelors (PDF)", BUDOC("BU_Exam-II_Skills-Bachelors")]], vids: [V("Big Brother Little Brother (Niels Feijen)", "9dAO28LIO3Q")] },
  { id: "bu6", area: "safe", name: "BU Exam VI safety challenge (enter the score out of 100)", max: 100, curve: "bu", basis: "estimate", how: "20 safety layouts, 2 tries each (40 shots). Score = 2.5 × (40 − misses).", src: [["BU Exam VI safety challenge (PDF)", BUDOC("BU_Exam-VI_Safety_Challenge")]], vids: [V("Big Brother Little Brother (Niels Feijen)", "9dAO28LIO3Q")] },
  { id: "s10", area: "brk", name: "BU S10 break drill", max: 5, curve: "bu", basis: "derived", how: "3 breaks, each scored 0–5 (no scratch; CB not to a rail; CB stays in the center zone; ball made; 3+ balls up table). Score = the middle of the three.", src: [["BU Exam II Bachelors (PDF)", BUDOC("BU_Exam-II_Skills-Bachelors")]], vids: [V("Break shot technique (Dr. Dave)", "Av2DNdWzziA")] },
  { id: "s3", area: "pat", name: "BU S3 9-ball patterns", max: 10, curve: "bu", basis: "derived", how: "Three layouts; add the two lowest scores (10 max).", src: [["BU Exam II Bachelors (PDF)", BUDOC("BU_Exam-II_Skills-Bachelors")]], vids: [V("Basic 9-ball pattern drill (Darren Appleton)", "GGm08omfgwA")] },
  { id: "s4", area: "pat", name: "BU S4 8-ball patterns", max: 10, curve: "bu", basis: "derived", how: "Three layouts; add the two lowest scores (10 max).", src: [["BU Exam II Bachelors (PDF)", BUDOC("BU_Exam-II_Skills-Bachelors")]], vids: [V("Top 10 pattern play principles (Dr. Dave)", "DMlQGu_pRNU")] },
  { id: "eo", area: "pat", name: "Equal Offense (10 innings)", max: 200, curve: "bu", basis: "estimate", how: "10 innings, up to 20 points each (200 max). The source gives no level bands, so the benchmark here is an app estimate.", src: [["Equal Offense (Dr. Dave)", "/faq/drill/equal-offense/"]], vids: [V("Equal Offense vs the ghost (Shortstop On Pool)", "VMHvv7toICw")] },
  { id: "hq", area: "pat", name: "Hopkins Q-Skill (10 innings)", max: 200, curve: "hq", basis: "derived", how: "Score per the Hopkins Q-Skills rules. Bands: 30–60 D, 60–90 C, 90–120 B, 121–160 A, 160–180 AA, 180–200 AAA.", src: [["Hopkins Q-Skills (Dr. Dave)", "/faq/rating/hopkins-q-skills/"]], vids: [] },
  { id: "sp", area: "pat", name: "Straight-pool high run", max: 100, curve: "sp", basis: "derived", how: "Your best run in a practice session. Typical high runs by class: D 14 or less, C 28, B 35, A 56, pro 98.", src: [["Straight-pool high runs (Dr. Dave / AZB)", "/faq/rating/straight-pool/"]], vids: [] },
  { id: "lng", area: "long", name: "Long-shot self-test", max: 10, curve: "bu", basis: "estimate", how: "CB a diamond behind the head string, OB near the foot spot, 10 straight-ins and slight cuts into the corners. 1 point per make.", src: [], vids: [V("Long potting masterclass (Stephen Hendry)", "WUPpPKA8Oy0")] },
  { id: "s9", area: "jm", name: "BU S9 jump or massé", max: 3, curve: "bu", basis: "derived", optional: true, how: "3 attempts over or around a blocker. 1 point per pot without touching the blocker.", src: [["BU Exam II Bachelors (PDF)", BUDOC("BU_Exam-II_Skills-Bachelors")]], vids: [V("Jump shot (Dr. Dave)", "NFd9tUgFbFE")] },
  { id: "prs", area: "mental", name: "Pressure self-test: longest streak", max: 10, curve: "bu", basis: "estimate", how: "10 medium cuts set up the same way, full pre-shot routine on each. Score = your longest run of makes (10 max).", src: [], vids: [V("3 tools to deal with pressure (Niels Feijen)", "FmLIxmbPVv4")] }
];
const FARGO_LOOKUP = "https://fairmatch.fargorate.com/";
const BASIS = { sourced: "Sourced benchmark", derived: "Derived from a sourced chart", estimate: "App estimate" };
const DAYSETS = { 1: ["Sat"], 2: ["Tue","Sat"], 3: ["Mon","Wed","Fri"], 4: ["Mon","Tue","Thu","Fri"], 5: ["Mon","Tue","Wed","Thu","Fri"], 6: ["Mon","Tue","Wed","Thu","Fri","Sat"], 7: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] };
const GAMESN = { "8": "8-ball", "9": "9-ball", "10": "10-ball", sp: "straight pool", op: "one-pocket", bk: "bank pool", sn: "snooker", us: "UK 8-ball" };
const GAMEV = { "9": [V("Basic 9-ball pattern drill (Darren Appleton)", "GGm08omfgwA")], "10": [V("Basic 9-ball pattern drill (Darren Appleton)", "GGm08omfgwA")], "8": [V("Top 10 pattern play principles (Dr. Dave)", "DMlQGu_pRNU")], sp: [V("Equal Offense vs the ghost (Shortstop On Pool)", "VMHvv7toICw")], bk: [V("Bank to all pockets (Dr. Dave)", "tVpfIgPC6F8")] };
// ---------- Warm-up ----------
const WU = {
  steps: [
    ["stroke", "Stroke and speed", "Slow practice strokes, then lag-length speed shots: stop the cue ball near the far rail.", [V("Get-in-stroke drill (Corey Deuel)", "pLfJh_6YDVw")]],
    ["sfd", "Stop, follow, draw", "Short straight-ins: 3 stops, 3 follows, 3 draws. Feel the tip contact.", [V("Stop, follow and draw drill (Dr. Dave)", "xUA1lsGKEAc")]],
    ["long", "Long-shot alignment", "3–5 long straight-ins; check you stay down and finish straight.", [V("How to shoot a long stop shot (FX Billiards)", "urWaiWeM7xE")]],
    ["weak", "Light pass at your weakest area", "", []],
    ["conf", "Confidence shots", "Easy shots you like to make, at match speed, with your full pre-shot routine.", [V("3-step pre-shot routine (Jasmin Ouschan)", "VSHni6W1y6M")]],
    ["brk", "Break (if the room allows)", "2–3 breaks at 80–90% power; focus on a square hit and a cue ball that stays in the middle.", [V("Break shot technique (Dr. Dave)", "Av2DNdWzziA")]],
    ["lag", "Lag", "3 lags: aim to stop within a ball width of the head rail.", [V("NO LAG CAN STOP ME FROM WINNING (Slivovich)", "FMjdnBUrvS8")]]],
  mins: { 10: [2,2,1,1,1,2,1], 20: [3,4,3,3,2,3,2], 30: [5,5,4,5,4,4,3] }
};
// ---------- Ratings cards (no APA) ----------
const CSI = [[721,9999,"A++","10"],[650,720,"A+","9"],[600,649,"A","9"],[550,599,"A−","8"],[500,549,"B+","8"],[450,499,"B","7"],[400,449,"B−","6"],[350,399,"C+","5"],[300,349,"C","4"],[250,299,"D+","3"],[0,249,"D","2"]];
const UPLSTART = [[0,300,300],[301,350,350],[351,400,400],[401,450,450],[451,515,500],[516,550,550],[551,615,600],[616,650,650],[651,9999,700]];
return { BU, BUDOC, BUCHART, BUPTS, LVN, SELF_F, AREAS, V, AV, DRILL, TESTS, FARGO_LOOKUP, BASIS, DAYSETS, GAMESN, GAMEV, WU, CSI, UPLSTART };
})();
