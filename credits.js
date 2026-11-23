// Credits page: disclaimer plus every creator whose video is used in the app.
(function () {
// Creator data lives in data/credits.js (window.CreditsData).
const { CONTACT_EMAIL, CANON, ID_CREATOR, APA_YT, EXTRA_LINKS } = window.CreditsData;
function toCanon(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (CANON[s]) return CANON[s];
  const hit = Object.keys(CANON).find((n) => n.toLowerCase() === s.toLowerCase());
  if (hit) return CANON[hit];
  if (/^dr\.?\s*dave\b/i.test(s)) return "Dr. Dave Alciatore";
  if (/^(NV\s|VEPS\s|VEPP\s|HAPS\b|BU Vol)/i.test(s)) return "Dr. Dave Alciatore";
  return s;
}

function ytEmbedUrl(id, start) {
  let u = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id);
  if (start) u += "?start=" + Number(start);
  return u;
}

function mailto(subject, body) {
  return "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
}
function requestMailto(name) {
  return mailto("Road Warrior credits request: " + name, "Hi, I'm " + name + " (or represent them). Please remove / change: ...");
}
function genericMailto() {
  return mailto("Road Warrior credits request", "Hi, I'm a creator listed in The Road Warrior (or represent one). Please remove / change: ...");
}

function linkLabel(url) {
  const u = String(url);
  if (/youtube\.com|youtu\.be/i.test(u)) return "YouTube";
  if (/facebook\.com/i.test(u)) return "Facebook";
  if (/instagram\.com/i.test(u)) return "Instagram";
  if (/tiktok\.com/i.test(u)) return "TikTok";
  if (/(?:\/\/|\.)x\.com|twitter\.com/i.test(u)) return "X";
  if (/spotify\.com|podcasts\.apple/i.test(u)) return "Podcast";
  if (/forums\.azbilliards/i.test(u)) return "Forum";
  return "Website";
}

function isYTId(s) {
  return typeof s === "string" && s && !s.startsWith("http") && !s.startsWith("/") && s.length >= 8 && s.length <= 15;
}

function addName(set, raw) {
  if (!raw) return;
  if (/\s\/\s/.test(raw)) { String(raw).split(/\s\/\s/).forEach((p) => addName(set, p)); return; }
  const c = toCanon(raw);
  if (c) set.add(c);
}

function walkVids(item, onVid) {
  if (!item) return;
  if (Array.isArray(item) && typeof item[0] === "string") {
    const [lab, src, t, kind] = item;
    if (kind === "read" || kind === "none" || kind === "rest") return;
    if (src) onVid(src, lab);
    return;
  }
  if (Array.isArray(item)) { item.forEach((x) => walkVids(x, onVid)); return; }
  if (typeof item === "object") Object.values(item).forEach((x) => walkVids(x, onVid));
}

function collect() {
  const names = new Set();
  const idMap = new Map();
  function remember(id, creator) {
    if (!isYTId(id) || !creator) return;
    if (!idMap.has(id)) idMap.set(id, creator);
  }
  (typeof DATA !== "undefined" ? DATA : []).forEach((e) => {
    if (e[6] === "YT") { addName(names, e[5]); remember(e[9], e[5]); }
  });
  (typeof XD !== "undefined" ? XD : []).forEach((e) => {
    if (e[4] === "YT") { addName(names, e[3]); remember(e[7], e[3]); }
  });
  (typeof RC !== "undefined" ? RC : []).forEach((e) => {
    if (e[3] === "YT") { addName(names, e[2]); remember(e[6], e[2]); }
  });

  function fromTitle(src, lab) {
    if (!isYTId(src) && !/youtube\.com|youtu\.be/i.test(String(src || ""))) return;
    let id = src;
    const mUrl = String(src).match(/(?:youtu\.be\/|[?&]v=)([A-Za-z0-9_-]{11})/);
    if (mUrl) id = mUrl[1];
    if (idMap.has(id)) { addName(names, idMap.get(id)); return; }
    const paren = String(lab || "").match(/\(([^)]+)\)\s*$/);
    if (paren) { addName(names, paren[1]); return; }
    if (ID_CREATOR[id]) { addName(names, ID_CREATOR[id]); return; }
    if (/VEPS|VEPP|\bNV\s|HAPS|BU Vol/i.test(String(lab || ""))) addName(names, "Dr. Dave Alciatore");
  }

  if (typeof STEPV !== "undefined") walkVids(STEPV, fromTitle);
  if (typeof BENCHV !== "undefined") walkVids(BENCHV, fromTitle);
  if (typeof PROGV !== "undefined") walkVids(PROGV, fromTitle);
  if (typeof BACKNV !== "undefined") walkVids(BACKNV, fromTitle);
  if (typeof LONGERV !== "undefined") walkVids(LONGERV, fromTitle);
  if (typeof CHECK !== "undefined") walkVids(CHECK, fromTitle);
  if (typeof BACKV !== "undefined") walkVids(BACKV, fromTitle);
  if (typeof GEO !== "undefined") {
    GEO.forEach((g) => {
      walkVids(g[7], fromTitle);
      (g[6] || []).forEach((pair) => { if (pair && pair[1]) fromTitle(pair[1], pair[0]); });
    });
  }
  const A = window.Adaptive || {};
  if (A.TESTS) A.TESTS.forEach((t) => walkVids(t.vids, fromTitle));
  walkVids(A.AV, fromTitle);
  walkVids(A.GAMEV, fromTitle);
  walkVids(A.WU, fromTitle);

  const dir = typeof DIRECTORY !== "undefined" ? DIRECTORY : [];
  const byCanon = new Map();
  dir.forEach((d) => {
    const c = toCanon(d[0]);
    if (!c || !names.has(c)) return;
    if (!byCanon.has(c)) byCanon.set(c, []);
    byCanon.get(c).push(d);
  });

  function linksFor(name) {
    const out = [];
    const seen = new Set();
    function push(label, url) {
      if (!url || seen.has(url)) return;
      seen.add(url);
      out.push({ label: label, url: url });
    }
    (byCanon.get(name) || []).forEach((d) => push(linkLabel(d[3]), d[3]));
    (EXTRA_LINKS[name] || []).forEach((l) => push(l.label, l.url));
    const hasYT = out.some((l) => /youtube/i.test(l.label) || /youtube\.com|youtu\.be/i.test(l.url));
    if (!hasYT) push("YouTube search", "https://www.youtube.com/results?search_query=" + encodeURIComponent(name));
    return { links: out, searchOnly: !hasYT };
  }

  function descFor(name) {
    const rows = byCanon.get(name) || [];
    if (!rows.length) return "";
    const exact = rows.find((d) => toCanon(d[0]) === name && d[0].length <= name.length + 8) || rows[0];
    const prefer = rows.find((d) => d[0] === name) || rows.find((d) => /YouTube/i.test(d[2] || "") && (d[1] || "").length > 20) || exact;
    const t = (prefer && prefer[1]) || "";
    if (/verified via/i.test(t)) return (rows.find((d) => d[1] && !/verified via/i.test(d[1])) || prefer)[1] || "";
    return t;
  }

  return [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })).map((name) => {
    const L = linksFor(name);
    return { name: name, desc: descFor(name), links: L.links, searchOnly: L.searchOnly };
  });
}

function disclaimerHTML(esc) {
  const tos = "https://www.youtube.com/t/terms";
  const priv = "https://policies.google.com/privacy";
  const mail = "mailto:" + CONTACT_EMAIL;
  return `<div class="t" style="margin-bottom:8px">Credits</div>
<p>The Road Warrior is a free, independent training tool. The videos in this app are created and owned by the creators listed below. They are hosted on YouTube and played through YouTube's standard embedded player, subject to YouTube's Terms of Service (<a href="${tos}" target="_blank" rel="noopener">${tos}</a>) and Google's Privacy Policy (<a href="${priv}" target="_blank" rel="noopener">${priv}</a>). No videos are copied, downloaded, or hosted by this app.</p>
<p>The Road Warrior is not affiliated with, sponsored by, or endorsed by YouTube, Google, or any creator listed here. All names, channel names, logos, and trademarks belong to their respective owners and are used only to identify and credit them.</p>
<p>If you're a creator listed here and would like your videos or name removed, or something changed, email <a href="${mail}">${esc(CONTACT_EMAIL)}</a> and we'll handle it promptly.</p>
<p class="meta">Embedded YouTube videos are provided by Google and may use cookies under Google's Privacy Policy.</p>`;
}

function cardHTML(c, esc) {
  const links = c.links.map((l) => `<a class="btn ghost" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("");
  return `<div class="card"><div class="t">${esc(c.name)}</div>
    ${c.desc ? `<div class="desc">${esc(c.desc)}</div>` : ""}
    <div class="credit-links">${links}</div>
    <div class="meta"><a class="credit-req" href="${esc(requestMailto(c.name))}">Request removal or changes</a></div></div>`;
}

function lineHTML() {
  return `<p class="credline">Videos are embedded from YouTube and belong to their creators. Not affiliated with or endorsed by any creator. <a href="#credits" data-go="credits">See Credits</a>.</p>`;
}

function render($, esc) {
  const list = collect();
  $("#title").textContent = "Credits";
  $("#headx").innerHTML = "";
  $("#main").innerHTML = `<div class="card credits-intro">${disclaimerHTML(esc)}
    <div class="row"><a class="btn" href="${esc(genericMailto())}">Creators: request removal or changes</a></div></div>
    <div class="count">${list.length} creators</div>${list.map((c) => cardHTML(c, esc)).join("")}`;
}

window.Credits = { render: render, collect: collect, lineHTML: lineHTML, embedUrl: ytEmbedUrl, CONTACT_EMAIL: CONTACT_EMAIL };
})();
