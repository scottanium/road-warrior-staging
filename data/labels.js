// Library labels: categories, drill types, levels, platforms and the game list (the Library filters and the Instructors tab use these).
// CONTENT FILE (data only, no logic). Edit the entries below; the app code lives in the matching .js file.
const CAT = { fs: "Fundamentals / Stance & Bridge", st: "Stroke", ai: "Aiming", cb: "Cue Ball Control / Position", sp: "Speed Control", en: "English / Spin", bk: "Banks & Kicks", sa: "Safeties", br: "Break", pp: "Pattern Play / Run-outs", jm: "Jump / Masse", mg: "Mental Game / Pre-shot Routine", ps: "Practice Structure / Assessment", fg: "Fun Game" };
const TYP = { D: "Drill", T: "Tip", L: "Lesson", P: "Best practice", G: "Game" };
const LVL = { B: "Beginner", I: "Intermediate", E: "Expert", P: "Professional" };
const PLAT = { YT: "YouTube", W: "Website", PDF: "PDF handout", POD: "Podcast", FOR: "Forum (AZBilliards)", X: "X", IG: "Instagram", TT: "TikTok", FB: "Facebook" };
const GAMES = [
  { value: "fund", label: "Fundamentals (All Games)" }, { value: "8", label: "8-Ball" }, { value: "9", label: "9-Ball" }, { value: "10", label: "10-Ball" }, { value: "14", label: "Straight Pool / 14.1" }, { value: "1p", label: "One-Pocket" }, { value: "bank", label: "Bank Pool" }, { value: "snk", label: "Snooker" }, { value: "car", label: "Carom / 3-Cushion" }, { value: "fun", label: "Fun Drills & Games" }, { value: "reg", label: "Daily Training Regimen" }, { value: "ins", label: "Instructors" },
];
