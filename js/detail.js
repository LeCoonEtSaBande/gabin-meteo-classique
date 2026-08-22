/** Panneau détails : specs, horizons et les six graphiques AROMEIFS. */

const ZONE_SPECS_URL = "assets/spots_specs/zones_specifications.csv";
const SPOT_SPECS_URL = "assets/spots_specs/spots_specifications.csv";
const AROME_URL = "data/processed/curves/AROMEIFS.csv";

const HORIZONS = [
  { days: 1, label: "Journée" },
  { days: 3, label: "3 jours" },
  { days: 5, label: "5 jours" },
];

const CHARTS = [
  {
    kind: "cloud",
    title: "Nébulosité",
    palette: "cloud",
    note: `<span class="chart-key"><i class="wx-sun"></i>soleil</span>`,
  },
  {
    kind: "precip",
    title: "Précipitations",
    palette: "precip",
    note: `<span class="chart-key"><i class="wx-precip"></i>pluie (mm)</span>`,
  },
  { kind: "temp", title: "Température", palette: "temp" },
  {
    kind: "wind",
    title: "Vent et rafales",
    palette: "wind",
    note: `<span class="chart-key-note">plein = vent moyen · pointillé = rafales</span>`,
  },
  { kind: "dew", title: "Point de rosée", palette: "dew" },
  { kind: "pressure", title: "Pression de surface", palette: "pressure" },
];

let horizonDays = 1;
let zoneSpecs = [];
let spotSpecs = [];
let curveIndex = { AROMEIFS: {} };
let detailReady = false;
let detailError = "";

function zoneSpecName(zoneKey) {
  const row = zoneSpecs.find((z) => z.zone_key === zoneKey);
  return (row && row.display_name) || "";
}

function specsForZone(zoneKey) {
  return spotSpecs.filter((spot) => spot.zone_key === zoneKey);
}

function seriesForSpot(spotKey, startDay) {
  return sliceHorizon(curveIndex.AROMEIFS[spotKey] || [], startDay, horizonDays);
}

function spotChartsHtml(spot, startDay) {
  const points = seriesForSpot(spot.spot_key, startDay);
  return CHARTS.map(
    (chart) => `<section class="spot-block" data-spot="${escapeHtml(spot.spot_key)}" data-kind="${chart.kind}">
      <h3 class="spot-chart-title">${escapeHtml(chart.title)}</h3>
      <div class="spot-chart" data-spot="${escapeHtml(spot.spot_key)}" data-kind="${chart.kind}">${buildChartSvg(chart.kind, points, startDay, horizonDays, 400)}</div>
      ${legendHtml(points, chart.note || "", chart.palette || "temp")}
    </section>`
  ).join("");
}

function spotMetaHtml(spot) {
  const req = (spot.display_wind_requirements || "").trim();
  const info = (spot.display_spot_infos || "").trim();
  return `<section class="spot-meta">
    ${info ? `<p class="spot-line spot-infos">${escapeHtml(info)}</p>` : ""}
    ${req ? `<p class="spot-line spot-reqs">${escapeHtml(req)}</p>` : ""}
  </section>`;
}

function spotCoordsHtml(spot) {
  const lat = (spot.Latitude_spot || "").trim();
  const lon = (spot.Longitude_spot || "").trim();
  if (!lat && !lon) return "";
  return `<section class="spot-coords">
    ${lat ? `<p>Latitude ${escapeHtml(lat)}</p>` : ""}
    ${lon ? `<p>Longitude ${escapeHtml(lon)}</p>` : ""}
  </section>`;
}

async function loadDetailAssets() {
  try {
    const [zonesRes, spotsRes, aromeRes] = await Promise.all([
      fetch(ZONE_SPECS_URL, { cache: "no-store" }),
      fetch(SPOT_SPECS_URL, { cache: "no-store" }),
      fetch(AROME_URL, { cache: "no-store" }),
    ]);
    if (!zonesRes.ok || !spotsRes.ok) throw new Error("Spécifications de spots introuvables");
    if (!aromeRes.ok) throw new Error("Courbe AROMEIFS introuvable");
    zoneSpecs = parseCsv(await zonesRes.text());
    spotSpecs = parseCsv(await spotsRes.text());
    const arome = indexCurves(parseCsv(await aromeRes.text()));
    curveIndex = { AROMEIFS: arome.AROMEIFS || {} };
    detailReady = true;
    detailError = "";
  } catch (error) {
    detailReady = false;
    detailError = error.message || String(error);
  }
}

function svgCursorPoint(svg, event) {
  const src = event.touches && event.touches[0] ? event.touches[0] : event;
  const pt = svg.createSVGPoint();
  pt.x = src.clientX;
  pt.y = src.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  return pt.matrixTransform(ctm.inverse());
}

function chartTipHtml(kind, point, nDays) {
  const hour = slotCaption(point.valid_at, nDays);
  const model = `AROMEIFS · ${point.source_model}`;
  if (kind === "cloud") {
    const cloud = Math.round(point.cloud);
    const sun = Math.max(0, 100 - cloud);
    return `<div class="chart-tip-hour">${escapeHtml(hour)}</div>
      <div>Nuages ${cloud} %</div>
      <div>Soleil ${sun} %</div>
      <div class="chart-tip-model">${escapeHtml(model)}</div>`;
  }
  if (kind === "precip") {
    return `<div class="chart-tip-hour">${escapeHtml(hour)}</div>
      <div>${point.precip.toFixed(1)} mm</div>
      <div class="chart-tip-model">${escapeHtml(model)}</div>`;
  }
  if (kind === "temp") {
    return `<div class="chart-tip-hour">${escapeHtml(hour)}</div>
      <div>${point.temp.toFixed(1)} °C</div>
      <div class="chart-tip-model">${escapeHtml(model)}</div>`;
  }
  if (kind === "dew") {
    return `<div class="chart-tip-hour">${escapeHtml(hour)}</div>
      <div>${point.dew.toFixed(1)} °C</div>
      <div class="chart-tip-model">${escapeHtml(model)}</div>`;
  }
  if (kind === "pressure") {
    const psrc = point.pressure_source && point.pressure_source !== point.source_model
      ? `pression ${point.pressure_source}`
      : model;
    const val = Number.isFinite(point.pressure) ? `${point.pressure.toFixed(1)} hPa` : "—";
    return `<div class="chart-tip-hour">${escapeHtml(hour)}</div>
      <div>${escapeHtml(val)}</div>
      <div class="chart-tip-model">${escapeHtml(psrc)}</div>`;
  }
  const rot = arrowRotation(point.dir);
  return `<div class="chart-tip-hour">${escapeHtml(hour)}</div>
    <div class="chart-tip-wind">
      <svg class="chart-tip-arrow" viewBox="0 0 10 14" aria-hidden="true" style="transform:rotate(${rot}deg)">
        <path d="M5 0 L10 14 L5 10 L0 14 Z" fill="currentColor"></path>
      </svg>
      <span>${Math.round(point.mean)} km/h</span>
      <span class="chart-tip-gust">raf. ${Math.round(point.gust)}</span>
    </div>
    <div class="chart-tip-model">${escapeHtml(model)}</div>`;
}

function placeChartTip(tip, event) {
  const src = event.touches && event.touches[0] ? event.touches[0] : event;
  const pad = 12;
  const w = tip.offsetWidth || 140;
  const h = tip.offsetHeight || 56;
  let x = src.clientX + pad;
  let y = src.clientY - h - 8;
  if (x + w > window.innerWidth - 8) x = src.clientX - w - pad;
  if (y < 8) y = src.clientY + pad;
  tip.style.left = `${Math.max(8, x)}px`;
  tip.style.top = `${Math.max(8, y)}px`;
}

function bindChartPointer(container, payload, options = {}) {
  const svg = container.querySelector(".spot-svg");
  if (!svg) return;
  let tip = container.querySelector(".chart-tip");
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "chart-tip";
    tip.hidden = true;
    container.appendChild(tip);
  }
  const geom = JSON.parse(svg.getAttribute("data-geom") || "{}");
  const showTip = (event) => {
    const pt = svgCursorPoint(svg, event);
    if (!pt) return;
    const hit = pickNearestPoint(payload.points, payload.startDay, payload.nDays, geom, pt.x);
    if (!hit) {
      tip.hidden = true;
      return;
    }
    tip.innerHTML = chartTipHtml(payload.kind, hit, payload.nDays);
    tip.hidden = false;
    placeChartTip(tip, event);
  };
  const hideTip = () => {
    tip.hidden = true;
  };
  svg.addEventListener("mousemove", showTip);
  svg.addEventListener("mouseleave", hideTip);
  svg.addEventListener("touchstart", showTip, { passive: true });
  svg.addEventListener("touchmove", showTip, { passive: true });
  svg.addEventListener("touchend", hideTip);
  if (options.fullscreen) {
    svg.style.cursor = "zoom-in";
    svg.addEventListener("click", (event) => {
      event.preventDefault();
      openChartLightbox(payload);
    });
  }
}

function closeChartLightbox() {
  const box = document.getElementById("chart-lightbox");
  if (!box) return;
  box.hidden = true;
  document.body.classList.remove("has-lightbox");
  const stage = document.getElementById("chart-lightbox-stage");
  if (stage) stage.innerHTML = "";
}

function openChartLightbox(payload) {
  const box = document.getElementById("chart-lightbox");
  const stage = document.getElementById("chart-lightbox-stage");
  if (!box || !stage) return;
  const svg = buildChartSvg(payload.kind, payload.points, payload.startDay, payload.nDays, 400);
  stage.innerHTML = `<h3 class="chart-lightbox-title">${escapeHtml(payload.title || "")}</h3>
    <div class="chart-lightbox-chart">${svg}</div>`;
  box.hidden = false;
  document.body.classList.add("has-lightbox");
  bindChartPointer(stage.querySelector(".chart-lightbox-chart"), payload, { fullscreen: false });
}

function bindLightboxOnce() {
  const box = document.getElementById("chart-lightbox");
  if (!box || box.dataset.bound) return;
  box.dataset.bound = "1";
  box.querySelector(".chart-lightbox-close").addEventListener("click", closeChartLightbox);
  box.addEventListener("click", (event) => {
    if (event.target === box) closeChartLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeChartLightbox();
  });
}

function renderZoneDetail({ selectedZone, dayKey, fallbackLabel, viewMode }) {
  const empty = document.getElementById("detail-empty");
  const body = document.getElementById("detail-body");
  const title = document.getElementById("detail-title");
  const soon = document.getElementById("soon");
  const pane = document.getElementById("detail");
  const scrollTop = body ? body.scrollTop : 0;
  pane.classList.add("is-open");

  if (viewMode === "buoys") {
    title.textContent = "Balise";
    empty.hidden = true;
    body.hidden = true;
    soon.hidden = false;
    return;
  }

  soon.hidden = true;
  const spots = selectedZone ? specsForZone(selectedZone) : spotSpecs;
  const zoneName = zoneSpecName(selectedZone) || fallbackLabel || (spots[0] && spots[0].display_name) || "Prévisions";
  title.textContent = zoneName;

  if (!detailReady) {
    empty.hidden = true;
    body.hidden = false;
    body.innerHTML = `<p class="detail-status">${escapeHtml(detailError || "Chargement des courbes…")}</p>`;
    return;
  }

  if (!spots.length) {
    empty.hidden = false;
    empty.textContent = "Aucun spot à afficher.";
    body.hidden = true;
    return;
  }

  empty.hidden = true;
  body.hidden = false;
  const horizon = HORIZONS.map(
    (h) =>
      `<button type="button" class="horizon-btn${h.days === horizonDays ? " is-active" : ""}" data-horizon="${h.days}">${h.label}</button>`
  ).join("");

  body.innerHTML = `
    ${spots.map((spot) => spotMetaHtml(spot)).join("")}
    <div class="horizon-bar" role="tablist" aria-label="Horizon de prévision">${horizon}</div>
    <div class="charts">${spots.map((spot) => spotChartsHtml(spot, dayKey)).join("")}</div>
    ${spots.map((spot) => spotCoordsHtml(spot)).join("")}`;

  body.querySelectorAll("[data-horizon]").forEach((btn) => {
    btn.addEventListener("click", () => {
      horizonDays = Number(btn.dataset.horizon) || 1;
      renderZoneDetail({ selectedZone, dayKey, fallbackLabel, viewMode });
    });
  });

  body.querySelectorAll(".spot-chart").forEach((el) => {
    const key = el.dataset.spot;
    const kind = el.dataset.kind;
    const spot = spots.find((item) => item.spot_key === key);
    const chart = CHARTS.find((item) => item.kind === kind);
    if (!spot || !chart) return;
    const payload = {
      kind,
      points: seriesForSpot(key, dayKey),
      startDay: dayKey,
      nDays: horizonDays,
      title: `${spot.display_name} — ${chart.title}`,
    };
    bindChartPointer(el, payload, { fullscreen: true });
  });

  body.scrollTop = scrollTop;
  bindLightboxOnce();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    HORIZONS,
    CHARTS,
    spotMetaHtml,
    spotCoordsHtml,
    specsForZone,
    zoneSpecName,
  };
}
