// Interactive periodic table render + i18n (en / es).

const tableEl         = document.getElementById("table");
const legendEl        = document.getElementById("legend");
const searchEl        = document.getElementById("search");
const detailEl        = document.getElementById("detail");
const overlayEl       = document.getElementById("overlay");
const langEl          = document.getElementById("lang");
const viewEl          = document.getElementById("view");
const particleTableEl = document.getElementById("particle-table");
const particleLegendEl = document.getElementById("particle-legend");
const colorbyEl       = document.getElementById("colorby");
const trendLegendEl   = document.getElementById("trend-legend");
const timelineEl      = document.getElementById("timeline");
const timelineToggle  = document.getElementById("timeline-toggle");
const timelineSlider  = document.getElementById("timeline-slider");
const timelineRange   = document.getElementById("timeline-range");
const timelineYearEl  = document.getElementById("timeline-year");
const timelineCountEl = document.getElementById("timeline-count");
const compareToggle   = document.getElementById("compare-toggle");
const comparePanel    = document.getElementById("compare-panel");
const compareInner    = document.getElementById("compare-inner");

let activeCategory = null;                 // legend filter
let colorMode = localStorage.getItem("colorMode") || "category"; // "category" or a property key
let timelineOn = false;                    // discovery-timeline dimming
let timelineYear = 2010;                   // reset from data in initTimeline()
let compareMode = false;                   // clicking cells adds them to the comparison
const COMPARE_MAX = 3;
let compareSet = [];                       // atomic numbers being compared, in pick order
let openElement = null;                    // element shown in the panel, if any
let openParticle = null;                   // particle shown in the panel, if any
let inlineEl = null;                       // central floating detail card
let orbStop = null;                        // stops the 3D particle animation
let lang = localStorage.getItem("lang") || "en";
let view = localStorage.getItem("view") || "elements";

// Resolve a possibly-bilingual field: returns field[lang] if it's an {en,es} object,
// otherwise the value itself (used for `disc`, which is often a plain proper name).
const t = v => (v && typeof v === "object" && ("en" in v || "es" in v)) ? (v[lang] ?? v.en) : v;

// --- Build the table ---
function buildTable() {
  const frag = document.createDocumentFragment();
  frag.appendChild(makePlaceholder("57–71", 3, 6, "lanthanide"));
  frag.appendChild(makePlaceholder("89–103", 3, 7, "actinide"));
  for (const el of ELEMENTS) frag.appendChild(makeCell(el));
  tableEl.appendChild(frag);

  // Central floating detail card. Lives on <body> (not inside a table) so it
  // shows regardless of which view's table is currently visible.
  inlineEl = document.createElement("div");
  inlineEl.className = "inline-detail";
  inlineEl.hidden = true;
  inlineEl.innerHTML = '<div class="inline-detail-inner"></div>';
  document.body.appendChild(inlineEl);
}

function makeCell(el) {
  const cell = document.createElement("button");
  cell.type = "button";
  cell.className = "element";
  cell.style.setProperty("--cat", `var(--c-${el.cat})`);
  cell.style.gridColumn = el.col;
  cell.style.gridRow = el.row;
  cell.dataset.n = el.n;
  cell.dataset.cat = el.cat;
  cell.innerHTML = `
    <span class="num">${el.n}</span>
    <span class="sym">${el.s}</span>
    <span class="name"></span>`;
  cell.addEventListener("click", () => onCellClick(el));
  return cell;
}

function makePlaceholder(text, col, row, cat) {
  const ph = document.createElement("div");
  ph.className = "element f-placeholder";
  ph.style.setProperty("--cat", `var(--c-${cat})`);
  ph.style.gridColumn = col;
  ph.style.gridRow = row;
  ph.innerHTML = `<span class="sym" style="font-size:.62rem">${text}</span>`;
  return ph;
}

// --- Legend with filters ---
function buildLegend() {
  const frag = document.createDocumentFragment();
  for (const key of Object.keys(CATEGORIES)) {
    const item = document.createElement("div");
    item.className = "legend-item";
    item.dataset.cat = key;
    item.innerHTML = `
      <span class="legend-swatch" style="background:var(--c-${key})"></span>
      <span class="legend-label"></span>`;
    item.addEventListener("click", () => toggleCategory(key, item));
    frag.appendChild(item);
  }
  legendEl.appendChild(frag);
}

function toggleCategory(cat, item) {
  const items = legendEl.querySelectorAll(".legend-item");
  if (activeCategory === cat) {
    activeCategory = null;
    items.forEach(i => i.classList.remove("dimmed"));
  } else {
    activeCategory = cat;
    items.forEach(i => i.classList.toggle("dimmed", i.dataset.cat !== cat));
  }
  applyFilters();
}

// --- Combined filter (search + category) ---
function applyFilters() {
  const q = searchEl.value.trim().toLowerCase();
  tableEl.querySelectorAll(".element:not(.f-placeholder)").forEach(cell => {
    const el = ELEMENTS.find(e => e.n === +cell.dataset.n);
    const matchesText = !q ||
      t(el.name).toLowerCase().includes(q) ||
      el.s.toLowerCase().includes(q) ||
      String(el.n) === q;
    const matchesCat = !activeCategory || el.cat === activeCategory;
    cell.classList.toggle("hidden", !(matchesText && matchesCat));
  });
}

searchEl.addEventListener("input", applyFilters);

// --- Trends: color the table by a numeric property (heatmap) ---
// Only properties already present in the data. Density spans ~5 orders of
// magnitude, so it uses a log scale; the rest read fine linearly.
// `min` overrides the low end of the color domain: gases are extreme low-density
// outliers that would otherwise squash every solid into the top of the ramp, so
// density is floored at 0.1 g/cm³ (all gases collapse to the min color and the
// solids, 0.5–22.6, spread across the whole gradient).
const TREND_PROPS = {
  eneg: { scale: "linear", unit: "" },
  dens: { scale: "log",    unit: " g/cm³", min: 0.1 },
  melt: { scale: "linear", unit: " °C" },
  boil: { scale: "linear", unit: " °C" },
  mass: { scale: "linear", unit: " u" }
};

// Sequential low→high ramp (indigo → teal → lime → amber). Kept distinct from
// the category hues; the gradient legend makes the mapping explicit.
const RAMP = [
  [0.00, [53, 70, 138]],
  [0.35, [42, 168, 176]],
  [0.65, [154, 210, 79]],
  [1.00, [255, 207, 92]]
];
function rampColor(x) {
  const c = Math.max(0, Math.min(1, x));
  for (let i = 1; i < RAMP.length; i++) {
    if (c <= RAMP[i][0]) {
      const [a0, ca] = RAMP[i - 1], [b0, cb] = RAMP[i];
      const f = (c - a0) / (b0 - a0 || 1);
      return ca.map((v, k) => Math.round(v + (cb[k] - v) * f));
    }
  }
  return RAMP[RAMP.length - 1][1];
}
const luminance = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

function trendDomain(key) {
  const cfg = TREND_PROPS[key];
  const vals = ELEMENTS.map(e => e[key]).filter(v => v != null);
  const dataLo = Math.min(...vals), dataHi = Math.max(...vals);
  const lo = cfg.min != null ? cfg.min : dataLo;
  const hi = cfg.max != null ? cfg.max : dataHi;
  // Flag when values fall outside the (overridden) domain, so the legend can
  // show "≤"/"≥" instead of implying the endpoint is the true extreme.
  return { lo, hi, scale: cfg.scale, clampLo: dataLo < lo, clampHi: dataHi > hi };
}

// Compact number for the gradient legend endpoints.
function fmtNum(v) {
  const a = Math.abs(v);
  if (a >= 1000) return String(Math.round(v));
  if (a >= 1)    return String(Math.round(v * 100) / 100);
  return String(v);
}

function renderTrendLegend() {
  const { lo, hi, clampLo, clampHi } = trendDomain(colorMode);
  const unit = TREND_PROPS[colorMode].unit;
  const name = colorMode === "mass" ? UI[lang].mass : UI[lang].labels[colorMode];
  const stops = RAMP.map(s => `rgb(${s[1].join(",")}) ${s[0] * 100}%`).join(",");
  const min = `${clampLo ? "≤" : ""}${fmtNum(lo)}${unit}`;
  const max = `${clampHi ? "≥" : ""}${fmtNum(hi)}${unit}`;
  trendLegendEl.innerHTML = `
    <span class="trend-name">${name}</span>
    <span class="trend-min">${min}</span>
    <span class="trend-bar" style="background:linear-gradient(90deg,${stops})"></span>
    <span class="trend-max">${max}</span>
    <span class="trend-nodata"><i></i>${UI[lang].noData}</span>`;
}

// Paint every element cell for the current color mode. In "category" mode the
// inline styles are cleared so the stylesheet's --cat coloring takes over again.
function applyColorMode() {
  const trend = colorMode !== "category" && view === "elements";
  legendEl.hidden = view !== "elements" || trend;
  trendLegendEl.hidden = !trend;
  colorbyEl.hidden = view !== "elements";
  colorbyEl.querySelectorAll("button").forEach(b =>
    b.classList.toggle("active", b.dataset.prop === colorMode));

  const cells = tableEl.querySelectorAll(".element:not(.f-placeholder)");
  if (!trend) {
    cells.forEach(cell => {
      cell.style.background = "";
      cell.style.borderColor = "";
      cell.classList.remove("on-light", "nodata");
    });
    return;
  }

  const { lo, hi, scale } = trendDomain(colorMode);
  const tx = v => scale === "log" ? Math.log(v) : v;
  const L = tx(lo), span = (tx(hi) - L) || 1;
  cells.forEach(cell => {
    const el = ELEMENTS.find(e => e.n === +cell.dataset.n);
    const v = el[colorMode];
    if (v == null) {
      cell.style.background = "var(--bg-soft)";
      cell.style.borderColor = "var(--border)";
      cell.classList.remove("on-light");
      cell.classList.add("nodata");
      return;
    }
    const rgb = rampColor((tx(v) - L) / span);
    cell.style.background = `rgb(${rgb.join(",")})`;
    cell.style.borderColor = "rgba(255,255,255,.16)";
    cell.classList.remove("nodata");
    cell.classList.toggle("on-light", luminance(rgb) > 0.55);
  });
  renderTrendLegend();
}

function setColorMode(mode) {
  colorMode = mode;
  localStorage.setItem("colorMode", mode);
  // Category filtering only makes sense in category mode; clear it on switch.
  if (mode !== "category" && activeCategory) {
    activeCategory = null;
    legendEl.querySelectorAll(".legend-item").forEach(i => i.classList.remove("dimmed"));
    applyFilters();
  }
  applyColorMode();
}

colorbyEl.querySelectorAll("button").forEach(b =>
  b.addEventListener("click", () => setColorMode(b.dataset.prop)));

// --- Discovery timeline: dim elements discovered after the chosen year ---
// Elements known since antiquity have year == null and are always "discovered".
// The numeric scale starts at 1600; the extra tick below it is the "antiquity"
// stop (only the pre-1600 elements are lit), avoiding a long dead zone at the
// start (nothing new was isolated between arsenic ~1250 and phosphorus 1669).
const TIMELINE_START = 1600;
function initTimeline() {
  const max = Math.max(...ELEMENTS.map(e => e.year).filter(y => y != null));
  timelineRange.min = TIMELINE_START - 1;   // leftmost tick = antiquity
  timelineRange.max = max;
  timelineRange.value = max;
  timelineYear = max;
}

function applyTimeline() {
  const active = timelineOn && view === "elements";
  timelineSlider.hidden = !active;
  timelineToggle.classList.toggle("active", timelineOn);
  timelineToggle.setAttribute("aria-pressed", String(timelineOn));

  const cells = tableEl.querySelectorAll(".element:not(.f-placeholder)");
  if (!active) {
    cells.forEach(c => c.classList.remove("future"));
    return;
  }
  let count = 0;
  cells.forEach(cell => {
    const el = ELEMENTS.find(e => e.n === +cell.dataset.n);
    const discovered = el.year == null || el.year <= timelineYear;
    cell.classList.toggle("future", !discovered);
    if (discovered) count++;
  });
  timelineYearEl.textContent = timelineYear < TIMELINE_START ? t(ANCIENT) : timelineYear;
  timelineCountEl.textContent = `${count} / ${ELEMENTS.length}`;
}

timelineToggle.addEventListener("click", () => { timelineOn = !timelineOn; applyTimeline(); });
timelineRange.addEventListener("input", () => { timelineYear = +timelineRange.value; applyTimeline(); });

// --- Compare: pin up to 3 elements and show their properties side by side ---
function onCellClick(el) {
  if (compareMode) toggleCompare(el);
  else openDetail(el);
}

function toggleCompare(el) {
  const i = compareSet.indexOf(el.n);
  if (i >= 0) compareSet.splice(i, 1);
  else {
    if (compareSet.length >= COMPARE_MAX) compareSet.shift();  // full — drop the oldest
    compareSet.push(el.n);
  }
  updateCompareSelection();
  renderCompare();
}

function updateCompareSelection() {
  tableEl.querySelectorAll(".element:not(.f-placeholder)").forEach(cell =>
    cell.classList.toggle("compare-selected", compareSet.includes(+cell.dataset.n)));
}

function renderCompare() {
  if (!compareSet.length) {
    compareInner.innerHTML = `<p class="compare-empty">${UI[lang].compareHint}</p>`;
    return;
  }
  const L = UI[lang].labels;
  const els = compareSet.map(n => ELEMENTS.find(e => e.n === n));
  const rows = [
    [UI[lang].mass, e => fmt(e.mass, " u")],
    [L.phase, e => t(PHASES[e.phase])],
    [L.dens, e => fmt(e.dens, " g/cm³")],
    [L.melt, e => fmt(e.melt, " °C")],
    [L.boil, e => fmt(e.boil, " °C")],
    [L.eneg, e => fmt(e.eneg)],
    [L.year, e => e.year == null ? t(ANCIENT) : e.year],
    [L.ox, e => oxHTML(e)],
    [L.cfg, e => e.cfg]
  ];
  const head = els.map(e => `
    <th style="--cat:var(--c-${e.cat})">
      <button class="compare-remove" data-n="${e.n}" aria-label="${UI[lang].close}">✕</button>
      <span class="compare-sym">${e.s}</span>
      <span class="compare-name">${t(e.name)}</span>
    </th>`).join("");
  const body = rows.map(([label, fn]) =>
    `<tr><th class="compare-rowlabel">${label}</th>${els.map(e => `<td>${fn(e)}</td>`).join("")}</tr>`).join("");
  compareInner.innerHTML = `
    <table class="compare-table">
      <thead><tr><th></th>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>`;
  compareInner.querySelectorAll(".compare-remove").forEach(btn =>
    btn.addEventListener("click", () => toggleCompare(ELEMENTS.find(e => e.n === +btn.dataset.n))));
}

function setCompareMode(on) {
  compareMode = on;
  compareToggle.classList.toggle("active", on);
  compareToggle.setAttribute("aria-pressed", String(on));
  if (on) closeDetail();
  else { compareSet = []; updateCompareSelection(); }
  comparePanel.hidden = !(on && view === "elements");
  renderCompare();
}

compareToggle.addEventListener("click", () => setCompareMode(!compareMode));

// --- Keyboard navigation: arrow keys move focus across the grid ---
// Roving tabindex: only one cell is tab-focusable at a time; arrows walk the
// grid by (row, col), skipping empty cells to the next real element.
const ARROWS = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
const cellByPos = new Map();

function indexCells() {
  cellByPos.clear();
  tableEl.querySelectorAll(".element:not(.f-placeholder)").forEach(cell => {
    const el = ELEMENTS.find(e => e.n === +cell.dataset.n);
    cellByPos.set(`${el.row},${el.col}`, cell);
    cell.tabIndex = -1;
  });
  const first = tableEl.querySelector('.element[data-n="1"]');
  if (first) first.tabIndex = 0;
}

function neighborCell(cell, key) {
  const el = ELEMENTS.find(e => e.n === +cell.dataset.n);
  let [row, col] = [el.row, el.col];
  const [dr, dc] = ARROWS[key];
  while (true) {
    row += dr; col += dc;
    if (row < 1 || row > 10 || col < 1 || col > 18) return null;
    const next = cellByPos.get(`${row},${col}`);
    if (next) return next;
  }
}

tableEl.addEventListener("keydown", e => {
  const cell = e.target;
  if (!cell.classList || !cell.classList.contains("element") || cell.classList.contains("f-placeholder")) return;
  if (!(e.key in ARROWS)) return;
  e.preventDefault();
  const next = neighborCell(cell, e.key);
  if (next) {
    cell.tabIndex = -1;
    next.tabIndex = 0;
    next.focus();
  }
});

// --- Bohr atomic model (computed from atomic number, aufbau order) ---
// Electrons per principal shell (n). Aufbau reproduces the standard Bohr counts
// (e.g. K -> 2,8,8,1). Minor ground-state exceptions (Cr, Cu…) are ignored — fine
// for a schematic diagram.
function electronShells(z) {
  const order = [[1,2],[2,2],[2,6],[3,2],[3,6],[4,2],[3,10],[4,6],[5,2],[4,10],
                 [5,6],[6,2],[4,14],[5,10],[6,6],[7,2],[5,14],[6,10],[7,6]];
  const shells = [0,0,0,0,0,0,0];
  let e = z;
  for (const [n, cap] of order) {
    if (e <= 0) break;
    const put = Math.min(cap, e);
    shells[n - 1] += put;
    e -= put;
  }
  return shells.filter(x => x > 0);
}

function bohrSVG(el) {
  const shells = electronShells(el.n);
  const size = 220, c = size / 2, maxR = c - 12;
  const step = maxR / (shells.length + 0.4);
  let rings = "", groups = "";
  shells.forEach((count, i) => {
    const r = step * (i + 1);
    rings += `<circle class="bohr-ring" cx="${c}" cy="${c}" r="${r.toFixed(1)}"/>`;
    let dots = "";
    for (let k = 0; k < count; k++) {
      const a = (2 * Math.PI * k / count) - Math.PI / 2;
      const x = c + r * Math.cos(a), y = c + r * Math.sin(a);
      dots += `<circle class="bohr-e" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4"/>`;
    }
    const dur = 18 + i * 6, dir = i % 2 ? "reverse" : "normal";
    groups += `<g class="bohr-shell" style="transform-origin:${c}px ${c}px;animation-duration:${dur}s;animation-direction:${dir}">${dots}</g>`;
  });
  return `<svg viewBox="0 0 ${size} ${size}" class="bohr" role="img" aria-label="Bohr model of ${t(el.name)}">
    ${rings}
    <circle class="bohr-nucleus" cx="${c}" cy="${c}" r="17"/>
    <text class="bohr-sym" x="${c}" y="${c}" text-anchor="middle" dominant-baseline="central">${el.s}</text>
    ${groups}
  </svg>`;
}

function mediaBlock(el) {
  const img = typeof IMAGES !== "undefined" ? IMAGES[el.n] : null;
  const diagram = `<div class="media-diagram">${bohrSVG(el)}</div>`;
  if (!img) {
    return `<div class="detail-media" data-mode="diagram">
      <div class="media-frame">${diagram}</div>
      <div class="media-bar"><span class="media-credit">${UI[lang].noPhoto}</span></div>
    </div>`;
  }
  return `<div class="detail-media" data-mode="photo">
    <div class="media-frame">
      <img class="media-photo" src="${img.file}" alt="${t(el.name)}" loading="lazy">
      ${diagram}
    </div>
    <div class="media-bar">
      <div class="media-toggle" role="group">
        <button type="button" data-mode="photo">${UI[lang].photo}</button>
        <button type="button" data-mode="diagram">${UI[lang].diagram}</button>
      </div>
      <span class="media-credit">${img.credit}</span>
    </div>
  </div>`;
}

// --- Detail content builders (shared by inline card and side drawer) ---
const fmt = (value, unit = "") =>
  (value === null || value === undefined) ? "—" : `${value}${unit}`;

// Signed oxidation-state label, e.g. +3, −2, 0. Uses a real minus sign.
const oxLabel = v => v > 0 ? `+${v}` : v < 0 ? `−${-v}` : "0";

// Oxidation states as chips, with the main (most common) one highlighted.
function oxHTML(el) {
  if (!el.ox || !el.ox.length) return "—";
  return `<span class="ox-list">${el.ox.map(v =>
    `<span class="ox-chip${v === el.oxm ? " ox-main" : ""}">${oxLabel(v)}</span>`
  ).join("")}</span>`;
}

function headHTML(el) {
  return `
    <span class="detail-badge">${t(CATEGORIES[el.cat])}</span>
    <div class="detail-head">
      <div class="detail-symbol"><span class="n">${el.n}</span>${el.s}</div>
      <div class="detail-title">
        <h2>${t(el.name)}</h2>
        <div class="mass">${UI[lang].mass}: ${fmt(el.mass, " u")}</div>
      </div>
    </div>`;
}

function statsHTML(el) {
  const L = UI[lang].labels;
  return `
    <div class="detail-grid">
      <div class="stat"><div class="label">${L.phase}</div><div class="value">${t(PHASES[el.phase])}</div></div>
      <div class="stat"><div class="label">${L.dens}</div><div class="value">${fmt(el.dens, " g/cm³")}</div></div>
      <div class="stat"><div class="label">${L.melt}</div><div class="value">${fmt(el.melt, " °C")}</div></div>
      <div class="stat"><div class="label">${L.boil}</div><div class="value">${fmt(el.boil, " °C")}</div></div>
      <div class="stat"><div class="label">${L.eneg}</div><div class="value">${fmt(el.eneg)}</div></div>
      <div class="stat"><div class="label">${L.year}</div><div class="value">${fmt(el.year)}</div></div>
      <div class="stat wide"><div class="label">${L.ox}</div><div class="value">${oxHTML(el)}</div></div>
      <div class="stat wide"><div class="label">${L.cfg}</div><div class="value">${el.cfg}</div></div>
      <div class="stat wide"><div class="label">${L.disc}</div><div class="value">${t(el.disc)}</div></div>
    </div>`;
}

function wireMedia(scope) {
  const media = scope.querySelector(".detail-media");
  if (!media) return;
  media.querySelectorAll(".media-toggle button").forEach(btn =>
    btn.addEventListener("click", () => { media.dataset.mode = btn.dataset.mode; }));
}

function clearSelected() {
  document.querySelectorAll(".selected").forEach(c => c.classList.remove("selected"));
}
function markSelected(el) {
  clearSelected();
  if (el) {
    const cell = tableEl.querySelector(`.element[data-n="${el.n}"]`);
    if (cell) cell.classList.add("selected");
  }
}

const isWide = () => window.matchMedia("(min-width: 900px)").matches;

// Wide screens: a big image/orbital fills the central gap while the full data
// lives in the side drawer (no dimming overlay, so the central visual stays
// visible). Narrow screens: everything goes in the drawer, image included.
// --- Deep link: reflect the open element in the URL hash (#Fe) ---
function elementFromHash(hash = location.hash) {
  const h = decodeURIComponent(hash.replace(/^#/, "")).trim();
  if (!h) return null;
  return ELEMENTS.find(e => e.s.toLowerCase() === h.toLowerCase())
      || ELEMENTS.find(e => String(e.n) === h) || null;
}
function setHash(symbol) {
  history.replaceState(null, "", symbol ? `#${symbol}` : location.pathname + location.search);
}
function openFromHash(hash = location.hash) {
  const el = elementFromHash(hash);
  if (!el) return;
  if (view !== "elements") setView("elements");
  openDetail(el);
}
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
  return new Promise((resolve, reject) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); resolve(); } catch (e) { reject(e); }
    document.body.removeChild(ta);
  });
}
function copyElementLink(btn) {
  const label = btn.querySelector("span");
  copyText(location.href).finally(() => {
    label.textContent = UI[lang].copied;
    btn.classList.add("copied");
    setTimeout(() => { label.textContent = UI[lang].copyLink; btn.classList.remove("copied"); }, 1600);
  });
}

window.addEventListener("hashchange", () => {
  const el = elementFromHash();
  if (el) openFromHash();
  else if (openElement) closeDetail();
});

function openDetail(el) {
  openElement = el;
  openParticle = null;
  setHash(el.s);
  markSelected(el);
  if (isWide()) {
    renderCentralMedia(el);
    renderDrawer(el, { media: false, overlay: true });
  } else {
    if (inlineEl) inlineEl.hidden = true;
    renderDrawer(el, { media: true, overlay: true });
  }
}

function renderCentralMedia(el) {
  stopOrb();
  const img = typeof IMAGES !== "undefined" ? IMAGES[el.n] : null;
  const inner = inlineEl.querySelector(".inline-detail-inner");
  inner.style.setProperty("--cat", `var(--c-${el.cat})`);
  inner.innerHTML = `
    <div class="cmedia" data-mode="${img ? "photo" : "diagram"}">
      ${img ? `<img class="media-photo" src="${img.file}" alt="${t(el.name)}">` : ""}
      <div class="media-diagram">${bohrSVG(el)}</div>
      <div class="cmedia-caption">
        <span class="cm-sym">${el.s}</span>
        <span class="cm-name">${t(el.name)}</span>
      </div>
      ${img ? `<div class="cmedia-toggle">
        <button type="button" data-mode="photo">${UI[lang].photo}</button>
        <button type="button" data-mode="diagram">${UI[lang].diagram}</button>
      </div>` : ""}
      ${img
        ? `<div class="cmedia-credit">${img.credit}</div>`
        : `<div class="cmedia-note">${UI[lang].noPhoto}</div>`}
    </div>`;
  const cm = inner.querySelector(".cmedia");
  cm.querySelectorAll(".cmedia-toggle button").forEach(btn =>
    btn.addEventListener("click", () => { cm.dataset.mode = btn.dataset.mode; }));
  inlineEl.hidden = false;
}

function renderDrawer(el, { media = true, overlay = true } = {}) {
  detailEl.style.setProperty("--cat", `var(--c-${el.cat})`);
  detailEl.innerHTML = `
    <button class="detail-close" aria-label="${UI[lang].close}">✕</button>
    ${headHTML(el)}
    <button class="detail-share" type="button">🔗 <span>${UI[lang].copyLink}</span></button>
    ${media ? mediaBlock(el) : ""}
    <p class="detail-about">${t(el.about)}</p>
    ${statsHTML(el)}`;
  detailEl.querySelector(".detail-close").addEventListener("click", closeDetail);
  detailEl.querySelector(".detail-share").addEventListener("click", e => copyElementLink(e.currentTarget));
  if (media) wireMedia(detailEl);
  detailEl.hidden = false;
  overlayEl.hidden = !overlay;
  detailEl.scrollTop = 0;
}

function closeDetail() {
  openElement = null;
  openParticle = null;
  stopOrb();
  clearSelected();
  detailEl.hidden = true;
  overlayEl.hidden = true;
  if (inlineEl) inlineEl.hidden = true;
  setHash(null);
}

overlayEl.addEventListener("click", closeDetail);
document.addEventListener("keydown", e => { if (e.key === "Escape") closeDetail(); });

// --- Standard Model (particles) view ---
function buildParticleTable() {
  const frag = document.createDocumentFragment();
  for (const p of PARTICLES) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "particle";
    cell.style.setProperty("--cat", `var(--pc-${p.cat})`);
    cell.style.gridColumn = p.col;
    cell.style.gridRow = p.span ? `${p.row} / ${p.row + p.span}` : p.row;
    if (p.span) cell.style.aspectRatio = "auto";
    cell.dataset.pid = p.id;
    cell.innerHTML = `
      <span class="p-charge">${p.charge}</span>
      <span class="p-spin">${p.spin}</span>
      <span class="p-sym">${p.s}</span>
      <span class="p-name"></span>
      <span class="p-mass">${p.mass}</span>`;
    cell.addEventListener("click", () => openParticleDetail(p));
    frag.appendChild(cell);
  }
  particleTableEl.appendChild(frag);
}

function buildParticleLegend() {
  const frag = document.createDocumentFragment();
  for (const key of Object.keys(PARTICLE_CATEGORIES)) {
    const item = document.createElement("div");
    item.className = "legend-item static";
    item.dataset.cat = key;
    item.innerHTML = `
      <span class="legend-swatch" style="background:var(--pc-${key})"></span>
      <span class="legend-label"></span>`;
    frag.appendChild(item);
  }
  particleLegendEl.appendChild(frag);
}

function openParticleDetail(p) {
  openParticle = p;
  openElement = null;
  clearSelected();
  const cell = particleTableEl.querySelector(`.particle[data-pid="${p.id}"]`);
  if (cell) cell.classList.add("selected");
  if (isWide()) {
    renderParticleCentral(p);
    renderParticleDrawer(p, { overlay: true });
  } else {
    if (inlineEl) inlineEl.hidden = true;
    renderParticleDrawer(p, { overlay: true });
  }
}

function renderParticleCentral(p) {
  stopOrb();
  const inner = inlineEl.querySelector(".inline-detail-inner");
  inner.style.setProperty("--cat", `var(--pc-${p.cat})`);
  inner.innerHTML = `
    <div class="pmedia">
      <div class="porb-wrap">
        <canvas class="porb"></canvas>
        <span class="porb-sym">${p.s}</span>
      </div>
      <div class="pmedia-name">${t(p.name)}</div>
      <span class="detail-badge">${t(PARTICLE_CATEGORIES[p.cat])}</span>
    </div>`;
  inlineEl.hidden = false;
  const color = getComputedStyle(document.documentElement)
    .getPropertyValue(`--pc-${p.cat}`).trim() || "#b57edc";
  orbStop = startParticleOrb(inner.querySelector(".porb"), orbConfig(p, color));
}

function stopOrb() {
  if (orbStop) { orbStop(); orbStop = null; }
}

// Parse a mass string ("2.2 MeV/c²", "1.28 GeV/c²", "0", "< 1 eV/c²") into MeV.
function massMeV(str) {
  if (!str || str.trim() === "0") return 0;
  const m = str.match(/([\d.]+)\s*(eV|keV|MeV|GeV|TeV)/i);
  if (!m) return 0;
  const factor = { ev: 1e-6, kev: 1e-3, mev: 1, gev: 1e3, tev: 1e6 }[m[2].toLowerCase()];
  return parseFloat(m[1]) * factor;
}
function chargeMag(charge) {
  if (!charge || charge === "0") return 0;
  if (charge.includes("⅔")) return 0.667;
  if (charge.includes("⅓")) return 0.333;
  return 1; // ±1, −1, +1
}

// Map a particle's physics to distinct orb visuals: size & density ~ mass,
// speed ~ 1/mass, wobble ~ charge, motion style ~ category.
function orbConfig(p, color) {
  const m = massMeV(p.mass);
  const logm = m > 0 ? Math.log10(m) : -7;                       // massless -> lowest
  const massNorm = Math.max(0, Math.min(1, (logm + 6) / (5.3 + 6)));
  const q = chargeMag(p.charge);
  const spin = p.spin === "1" ? 1 : p.spin === "0" ? 0 : 0.5;
  const massless = m === 0;
  return {
    color,
    count: Math.round(130 + massNorm * 250),                     // denser = heavier
    radius: 0.24 + massNorm * 0.13,                              // bigger = heavier
    spin: 0.30 + (1 - massNorm) * 0.55 + (massless ? 0.35 : 0),  // lighter = faster
    wobbleAmp: 0.05 + q * 0.07 + (spin === 1 ? 0.04 : 0),
    wobbleFreq: 1.3 + (1 - massNorm) * 2.4,                      // lighter = jitterier
    style: p.cat,
    alpha: (p.cat === "lepton" && q === 0) ? 0.5 : 1,           // neutrinos faint
    dot: 0.85 + massNorm * 0.8                                   // heavier = fatter points
  };
}

// 3D "particle": a sphere of points that rotates and pulses, tuned per particle.
// No libraries — just projection + requestAnimationFrame.
function startParticleOrb(canvas, cfg) {
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, r.width * dpr);
    canvas.height = Math.max(1, r.height * dpr);
  };
  resize();

  // Points on a sphere (Fibonacci lattice), with a per-point wobble phase whose
  // pattern depends on the particle category.
  const N = cfg.count, pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const rad = Math.sqrt(Math.max(0, 1 - y * y));
    const th = golden * i;
    let ph;
    if (cfg.style === "scalar-boson") ph = 0;                    // synchronized breathing
    else if (cfg.style === "gauge-boson") ph = y * Math.PI * 3;  // vertical ripple / wave
    else ph = i * 0.7;                                           // scattered
    pts.push({ x: Math.cos(th) * rad, y, z: Math.sin(th) * rad, ph });
  }

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let raf = 0, t0 = null;

  function draw(t) {
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * cfg.radius;
    ctx.clearRect(0, 0, w, h);
    const ay = t * cfg.spin, ax = Math.sin(t * 0.3) * 0.35;
    const cY = Math.cos(ay), sY = Math.sin(ay), cX = Math.cos(ax), sX = Math.sin(ax);
    const drawn = [];
    for (const p of pts) {
      const wob = 1 + cfg.wobbleAmp * Math.sin(t * cfg.wobbleFreq + p.ph);
      const x = p.x * wob, y = p.y * wob, z = p.z * wob;
      const x1 = x * cY - z * sY, z1 = x * sY + z * cY;          // rotate Y
      const y1 = y * cX - z1 * sX, z2 = y * sX + z1 * cX;        // rotate X
      const persp = 1 / (1.7 - z2 * 0.6);
      drawn.push({ sx: cx + x1 * R * persp, sy: cy + y1 * R * persp, z: z2 });
    }
    drawn.sort((a, b) => a.z - b.z);                              // back-to-front
    for (const d of drawn) {
      const depth = (d.z + 1) / 2;                                // 0..1
      ctx.globalAlpha = (0.22 + depth * 0.78) * cfg.alpha;
      ctx.fillStyle = cfg.color;
      ctx.beginPath();
      ctx.arc(d.sx, d.sy, (1.1 + depth * 2.4) * cfg.dot * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function frame(ts) {
    if (t0 == null) t0 = ts;
    draw((ts - t0) / 1000);
    raf = requestAnimationFrame(frame);
  }
  if (reduced) draw(0); else raf = requestAnimationFrame(frame);

  const onResize = () => resize();
  window.addEventListener("resize", onResize);
  return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
}

function renderParticleDrawer(p, { overlay = true } = {}) {
  const L = PARTICLE_UI[lang].labels;
  detailEl.style.setProperty("--cat", `var(--pc-${p.cat})`);
  detailEl.innerHTML = `
    <button class="detail-close" aria-label="${UI[lang].close}">✕</button>
    <span class="detail-badge">${t(PARTICLE_CATEGORIES[p.cat])}</span>
    <div class="detail-head">
      <div class="detail-symbol detail-symbol--particle">${p.s}</div>
      <div class="detail-title">
        <h2>${t(p.name)}</h2>
        <div class="mass">${L.mass}: ${p.mass}</div>
      </div>
    </div>
    <p class="detail-about">${t(p.about)}</p>
    <div class="detail-grid">
      <div class="stat"><div class="label">${L.type}</div><div class="value">${t(PARTICLE_CATEGORIES[p.cat])}</div></div>
      <div class="stat"><div class="label">${L.gen}</div><div class="value">${p.gen ?? "—"}</div></div>
      <div class="stat"><div class="label">${L.charge}</div><div class="value">${p.charge}</div></div>
      <div class="stat"><div class="label">${L.spin}</div><div class="value">${p.spin}</div></div>
      <div class="stat"><div class="label">${L.year}</div><div class="value">${p.year}</div></div>
      <div class="stat"><div class="label">${L.mass}</div><div class="value">${p.mass}</div></div>
      <div class="stat wide"><div class="label">${L.role}</div><div class="value">${t(p.role)}</div></div>
    </div>`;
  detailEl.querySelector(".detail-close").addEventListener("click", closeDetail);
  detailEl.hidden = false;
  overlayEl.hidden = !overlay;
  detailEl.scrollTop = 0;
}

function updateHeader() {
  const particles = view === "particles";
  document.getElementById("title").textContent = particles ? PARTICLE_UI[lang].title : UI[lang].title;
  document.getElementById("subtitle").textContent = particles ? PARTICLE_UI[lang].subtitle : UI[lang].subtitle;
  document.getElementById("footer-text").textContent = particles ? PARTICLE_UI[lang].footer : UI[lang].footer;
}

function applyView() {
  const particles = view === "particles";
  tableEl.hidden = particles;
  particleTableEl.hidden = !particles;
  document.querySelector(".search-box").hidden = particles;
  legendEl.hidden = particles;
  particleLegendEl.hidden = !particles;
  viewEl.querySelectorAll("button").forEach(b =>
    b.classList.toggle("active", b.dataset.view === view));
  closeDetail();
  updateHeader();
  applyColorMode();
  timelineEl.hidden = view !== "elements";
  applyTimeline();
  comparePanel.hidden = !(compareMode && view === "elements");
}

function setView(next) {
  if (next === view) return;
  view = next;
  localStorage.setItem("view", view);
  applyView();
}

viewEl.querySelectorAll("button").forEach(b =>
  b.addEventListener("click", () => setView(b.dataset.view)));

// --- i18n / language ---
function applyLanguage() {
  const u = UI[lang];
  document.documentElement.lang = lang;
  updateHeader();
  searchEl.placeholder = u.search;

  // Element cell names + aria labels
  tableEl.querySelectorAll(".element:not(.f-placeholder)").forEach(cell => {
    const el = ELEMENTS.find(e => e.n === +cell.dataset.n);
    cell.querySelector(".name").textContent = t(el.name);
    cell.setAttribute("aria-label", u.ariaElement(t(el.name), el.n));
  });

  // Element legend labels
  legendEl.querySelectorAll(".legend-item").forEach(item => {
    item.querySelector(".legend-label").textContent = t(CATEGORIES[item.dataset.cat]);
  });

  // Particle cell names + aria labels
  particleTableEl.querySelectorAll(".particle").forEach(cell => {
    const p = PARTICLES.find(x => x.id === cell.dataset.pid);
    cell.querySelector(".p-name").textContent = t(p.name);
    cell.setAttribute("aria-label", t(p.name));
  });

  // Particle legend labels
  particleLegendEl.querySelectorAll(".legend-item").forEach(item => {
    item.querySelector(".legend-label").textContent = t(PARTICLE_CATEGORIES[item.dataset.cat]);
  });

  // View switch buttons
  viewEl.querySelector('[data-view="elements"]').textContent = PARTICLE_UI[lang].elements;
  viewEl.querySelector('[data-view="particles"]').textContent = PARTICLE_UI[lang].particles;

  // Color-by control (label + pill names) and, if active, the gradient legend
  document.getElementById("colorby-label").textContent = u.colorBy;
  colorbyEl.querySelectorAll("button").forEach(b => {
    b.textContent = u.trends[b.dataset.prop];
  });
  if (colorMode !== "category" && view === "elements") renderTrendLegend();

  // Timeline control
  timelineToggle.textContent = u.timeline;
  document.getElementById("timeline-upto").textContent = u.upTo;

  // Compare control
  compareToggle.textContent = u.compare;
  if (compareMode) renderCompare();

  // Language switch buttons
  langEl.querySelectorAll("button").forEach(b =>
    b.classList.toggle("active", b.dataset.lang === lang));

  // Re-render the open panel in the new language
  if (openElement) openDetail(openElement);
  else if (openParticle) openParticleDetail(openParticle);
}

function setLanguage(next) {
  if (next === lang) return;
  lang = next;
  localStorage.setItem("lang", lang);
  applyLanguage();
  applyFilters();
}

langEl.querySelectorAll("button").forEach(b =>
  b.addEventListener("click", () => setLanguage(b.dataset.lang)));

// --- Galactic background: twinkling stars + a few wandering glowing particles ---
function startCosmos() {
  const canvas = document.createElement("canvas");
  canvas.id = "cosmos";
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const palette = ["#6ea8ff", "#8ec5ff", "#c48bff", "#4fd8c4"];
  let W = 0, H = 0, stars = [], orbs = [];

  function build() {
    W = canvas.width = Math.floor(window.innerWidth * dpr);
    H = canvas.height = Math.floor(window.innerHeight * dpr);
    const n = Math.min(180, Math.round((window.innerWidth * window.innerHeight) / 11000));
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: (Math.random() * 1.1 + 0.4) * dpr,
      a: Math.random() * 0.5 + 0.25,
      tw: Math.random() * 0.9 + 0.3, ph: Math.random() * 6.283,
      vx: (Math.random() - 0.5) * 0.05 * dpr, vy: (Math.random() - 0.5) * 0.05 * dpr
    }));
    orbs = Array.from({ length: 9 }, () => {
      const ang = Math.random() * 6.283, sp = (Math.random() * 0.18 + 0.05) * dpr;
      return {
        x: Math.random() * W, y: Math.random() * H,
        r: (Math.random() * 3 + 1.6) * dpr,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        c: palette[Math.floor(Math.random() * palette.length)],
        pulse: Math.random() * 6.283
      };
    });
  }
  build();

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wrap = p => {
    if (p.x < -30) p.x = W + 30; else if (p.x > W + 30) p.x = -30;
    if (p.y < -30) p.y = H + 30; else if (p.y > H + 30) p.y = -30;
  };

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      s.x += s.vx; s.y += s.vy; wrap(s);
      ctx.globalAlpha = Math.max(0, s.a * (0.55 + 0.45 * Math.sin(t * s.tw + s.ph)));
      ctx.fillStyle = "#dbe6ff";
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
    }
    for (const o of orbs) {
      o.x += o.vx; o.y += o.vy; wrap(o);
      const pr = o.r * (1 + 0.18 * Math.sin(t * 0.8 + o.pulse));
      const glow = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, pr * 7);
      glow.addColorStop(0, o.c + "cc");
      glow.addColorStop(0.4, o.c + "40");
      glow.addColorStop(1, o.c + "00");
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(o.x, o.y, pr * 7, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = o.c;
      ctx.beginPath(); ctx.arc(o.x, o.y, pr, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  let t0 = null;
  function frame(ts) { if (t0 == null) t0 = ts; draw((ts - t0) / 1000); requestAnimationFrame(frame); }
  if (reduced) draw(0); else requestAnimationFrame(frame);
  window.addEventListener("resize", () => { build(); if (reduced) draw(0); });
}

// --- Init ---
startCosmos();
buildTable();
buildLegend();
buildParticleTable();
buildParticleLegend();
initTimeline();
indexCells();
const initialHash = location.hash;   // capture before applyView() clears it
applyLanguage();
applyView();
openFromHash(initialHash);
