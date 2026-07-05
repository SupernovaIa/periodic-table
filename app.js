// Render de la tabla periódica interactiva.

const tableEl   = document.getElementById("table");
const legendEl  = document.getElementById("legend");
const searchEl  = document.getElementById("search");
const detailEl  = document.getElementById("detail");
const overlayEl = document.getElementById("overlay");

let activeCategory = null; // filtro por leyenda

// --- Construir la tabla ---
function buildTable() {
  const frag = document.createDocumentFragment();

  // Marcadores de los bloques f dentro de la tabla principal
  frag.appendChild(makePlaceholder("57–71", 3, 6, "lanthanide"));
  frag.appendChild(makePlaceholder("89–103", 3, 7, "actinide"));

  for (const el of ELEMENTS) {
    frag.appendChild(makeCell(el));
  }
  tableEl.appendChild(frag);
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
  cell.setAttribute("aria-label", `${el.name}, número atómico ${el.n}`);
  cell.innerHTML = `
    <span class="num">${el.n}</span>
    <span class="sym">${el.s}</span>
    <span class="name">${el.name}</span>`;
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

// --- Leyenda con filtros ---
function buildLegend() {
  const frag = document.createDocumentFragment();
  for (const [key, label] of Object.entries(CATEGORIES)) {
    const item = document.createElement("div");
    item.className = "legend-item";
    item.dataset.cat = key;
    item.innerHTML = `
      <span class="legend-swatch" style="background:var(--c-${key})"></span>
      <span>${label}</span>`;
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

// --- Filtro combinado (búsqueda + categoría) ---
function applyFilters() {
  const q = searchEl.value.trim().toLowerCase();
  tableEl.querySelectorAll(".element:not(.f-placeholder)").forEach(cell => {
    const el = ELEMENTS.find(e => e.n === +cell.dataset.n);
    const matchesText = !q ||
      el.name.toLowerCase().includes(q) ||
      el.s.toLowerCase().includes(q) ||
      String(el.n) === q;
    const matchesCat = !activeCategory || el.cat === activeCategory;
    cell.classList.toggle("hidden", !(matchesText && matchesCat));
  });
}

searchEl.addEventListener("input", applyFilters);

// --- Panel de detalle ---
function fmt(value, unit = "") {
  return (value === null || value === undefined) ? "—" : `${value}${unit}`;
}

function openDetail(el) {
  detailEl.style.setProperty("--cat", `var(--c-${el.cat})`);
  detailEl.innerHTML = `
    <button class="detail-close" aria-label="Cerrar">✕</button>
    <span class="detail-badge">${CATEGORIES[el.cat]}</span>
    <div class="detail-head">
      <div class="detail-symbol"><span class="n">${el.n}</span>${el.s}</div>
      <div class="detail-title">
        <h2>${el.name}</h2>
        <div class="mass">Masa atómica: ${fmt(el.mass, " u")}</div>
      </div>
    </div>
    <p class="detail-about">${el.about}</p>
    <div class="detail-grid">
      <div class="stat"><div class="label">Estado (amb.)</div><div class="value">${fmt(el.phase)}</div></div>
      <div class="stat"><div class="label">Densidad</div><div class="value">${fmt(el.dens, " g/cm³")}</div></div>
      <div class="stat"><div class="label">Punto de fusión</div><div class="value">${fmt(el.melt, " °C")}</div></div>
      <div class="stat"><div class="label">Punto de ebullición</div><div class="value">${fmt(el.boil, " °C")}</div></div>
      <div class="stat"><div class="label">Electronegatividad</div><div class="value">${fmt(el.eneg)}</div></div>
      <div class="stat"><div class="label">Descubrimiento</div><div class="value">${fmt(el.year)}</div></div>
      <div class="stat wide"><div class="label">Configuración electrónica</div><div class="value">${el.cfg}</div></div>
      <div class="stat wide"><div class="label">Descubridor</div><div class="value">${el.disc}</div></div>
    </div>`;

  detailEl.querySelector(".detail-close").addEventListener("click", closeDetail);
  detailEl.hidden = false;
  overlayEl.hidden = false;
  detailEl.scrollTop = 0;
}

function closeDetail() {
  detailEl.hidden = true;
  overlayEl.hidden = true;
}

overlayEl.addEventListener("click", closeDetail);
document.addEventListener("keydown", e => { if (e.key === "Escape") closeDetail(); });

// --- Init ---
buildTable();
buildLegend();
