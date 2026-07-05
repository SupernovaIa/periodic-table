// Interactive periodic table render + i18n (en / es).

const tableEl   = document.getElementById("table");
const legendEl  = document.getElementById("legend");
const searchEl  = document.getElementById("search");
const detailEl  = document.getElementById("detail");
const overlayEl = document.getElementById("overlay");
const langEl    = document.getElementById("lang");

let activeCategory = null;                 // legend filter
let openElement = null;                    // element shown in the panel, if any
let inlineEl = null;                       // inline detail card (central gap)
let lang = localStorage.getItem("lang") || "en";

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

  // Inline detail card that fills the empty top-center region of the table.
  inlineEl = document.createElement("div");
  inlineEl.className = "inline-detail";
  inlineEl.hidden = true;
  inlineEl.innerHTML = '<div class="inline-detail-inner"></div>';
  tableEl.appendChild(inlineEl);
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
  cell.addEventListener("click", () => openDetail(el));
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

function markSelected(el) {
  tableEl.querySelectorAll(".element.selected").forEach(c => c.classList.remove("selected"));
  if (el) {
    const cell = tableEl.querySelector(`.element[data-n="${el.n}"]`);
    if (cell) cell.classList.add("selected");
  }
}

const isWide = () => window.matchMedia("(min-width: 900px)").matches;

// Wide screens: a big image/orbital fills the central gap while the full data
// lives in the side drawer (no dimming overlay, so the central visual stays
// visible). Narrow screens: everything goes in the drawer, image included.
function openDetail(el) {
  openElement = el;
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
    ${media ? mediaBlock(el) : ""}
    <p class="detail-about">${t(el.about)}</p>
    ${statsHTML(el)}`;
  detailEl.querySelector(".detail-close").addEventListener("click", closeDetail);
  if (media) wireMedia(detailEl);
  detailEl.hidden = false;
  overlayEl.hidden = !overlay;
  detailEl.scrollTop = 0;
}

function closeDetail() {
  openElement = null;
  markSelected(null);
  detailEl.hidden = true;
  overlayEl.hidden = true;
  if (inlineEl) inlineEl.hidden = true;
}

overlayEl.addEventListener("click", closeDetail);
document.addEventListener("keydown", e => { if (e.key === "Escape") closeDetail(); });

// --- i18n / language ---
function applyLanguage() {
  const u = UI[lang];
  document.documentElement.lang = lang;
  document.getElementById("title").textContent = u.title;
  document.getElementById("subtitle").textContent = u.subtitle;
  searchEl.placeholder = u.search;
  document.getElementById("footer-text").textContent = u.footer;

  // Element cell names + aria labels
  tableEl.querySelectorAll(".element:not(.f-placeholder)").forEach(cell => {
    const el = ELEMENTS.find(e => e.n === +cell.dataset.n);
    cell.querySelector(".name").textContent = t(el.name);
    cell.setAttribute("aria-label", u.ariaElement(t(el.name), el.n));
  });

  // Legend labels
  legendEl.querySelectorAll(".legend-item").forEach(item => {
    item.querySelector(".legend-label").textContent = t(CATEGORIES[item.dataset.cat]);
  });

  // Language switch buttons
  langEl.querySelectorAll("button").forEach(b =>
    b.classList.toggle("active", b.dataset.lang === lang));

  // Re-render open panel in the new language
  if (openElement) openDetail(openElement);
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

// --- Init ---
buildTable();
buildLegend();
applyLanguage();
