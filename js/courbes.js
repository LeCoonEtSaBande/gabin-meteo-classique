/** Courbe unique AROMEIFS et rendu SVG des six graphiques. */

const CURVE_SETS = ["AROMEIFS"];

const PALETTES = {
  temp: {
    AROMEHD: "#e6b422",
    ARPEGE: "#c45c26",
    IFS: "#5f8a2a",
  },
  wind: {
    AROMEHD: "#e6b422",
    ARPEGE: "#c45c26",
    IFS: "#5f8a2a",
  },
  dew: {
    AROMEHD: "#8fd4f0",
    ARPEGE: "#3a8fd0",
    IFS: "#1a4a8c",
  },
  precip: {
    AROMEHD: "#8fd4f0",
    ARPEGE: "#3a8fd0",
    IFS: "#1a4a8c",
  },
  pressure: {
    AROMEHD: "#ffc1c1",
    ARPEGE: "#f07070",
    IFS: "#d44545",
  },
  cloud: {
    AROMEHD: "#cfcfcf",
    ARPEGE: "#6e6e6e",
    IFS: "#3a3a3a",
  },
};

const MODEL_COLORS = PALETTES.temp;

const WX_CLOUD = "#6e6e6e";
const WX_PRECIP = "#3a8fd0";
const SUN_FILL = "#ffcc33";
const MEAN_STROKE = 1.94;
const GUST_STROKE = 1.13;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function modelColor(model, palette = "temp") {
  const colors = PALETTES[palette] || PALETTES.temp;
  return colors[model] || "#7a7a7a";
}

function mapsUrl(lat, lon) {
  const latText = String(lat ?? "").trim();
  const lonText = String(lon ?? "").trim();
  if (!latText || !lonText) return "";
  const latitude = Number(latText);
  const longitude = Number(lonText);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "";
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

function parseValidAt(raw) {
  const text = String(raw || "");
  const [datePart, timePart = "00:00"] = text.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute = 0] = timePart.split(":").map(Number);
  return {
    year,
    month,
    day,
    hour,
    minute,
    dayKey: datePart,
    ms: Date.UTC(year, month - 1, day, hour, minute || 0),
  };
}

function addDays(dayKey, days) {
  const p = parseValidAt(`${dayKey}T00:00`);
  const next = new Date(p.ms + days * 24 * 3600 * 1000);
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, "0");
  const d = String(next.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function sliceHorizon(points, startDay, nDays) {
  const start = parseValidAt(`${startDay}T00:00`).ms;
  const end = parseValidAt(`${addDays(startDay, nDays)}T00:00`).ms;
  return (points || []).filter((point) => {
    const ms = parseValidAt(point.valid_at).ms;
    return ms >= start && ms < end;
  });
}

function indexCurves(rows) {
  const out = { AROMEIFS: {} };
  for (const row of rows) {
    const set = row.curve_set;
    const spot = row.spot_key;
    if (!out[set] || !spot) continue;
    const mean = Number(row.wind_speed_10m_kmh);
    const gust = Number(row.wind_gusts_10m_kmh);
    const dir = Number(row.wind_direction_10m_deg);
    const precip = Number(row.precipitation_mm);
    const cloud = Number(row.cloud_cover_max_pct);
    const temp = Number(row.temperature_2m_c);
    const dew = Number(row.dew_point_2m_c);
    const pressure = Number(row.surface_pressure_hpa);
    out[set][spot] ||= [];
    out[set][spot].push({
      valid_at: row.valid_at,
      source_model: row.source_model,
      mean: Number.isFinite(mean) ? mean : 0,
      gust: Number.isFinite(gust) ? gust : 0,
      dir: Number.isFinite(dir) ? dir : 0,
      precip: Number.isFinite(precip) ? precip : 0,
      cloud: Number.isFinite(cloud) ? cloud : 0,
      temp: Number.isFinite(temp) ? temp : 0,
      dew: Number.isFinite(dew) ? dew : 0,
      pressure: Number.isFinite(pressure) ? pressure : null,
      pressure_source: row.pressure_source_model || row.source_model,
    });
  }
  for (const list of Object.values(out.AROMEIFS)) {
    list.sort((a, b) => parseValidAt(a.valid_at).ms - parseValidAt(b.valid_at).ms);
  }
  return out;
}

function xOf(point, startDay, nDays, x0, innerW) {
  const start = parseValidAt(`${startDay}T00:00`).ms;
  const span = nDays * 24 * 3600 * 1000;
  const t = parseValidAt(point.valid_at).ms - start;
  return x0 + (t / span) * innerW;
}

function lineSegments(points, startDay, nDays, x0, innerW, yOf) {
  const segs = [];
  let current = null;
  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const y = yOf(point);
    if (y == null) continue;
    const x = xOf(point, startDay, nDays, x0, innerW);
    if (!current || current.model !== point.source_model) {
      const prev = i > 0 ? points[i - 1] : null;
      const prevY = prev ? yOf(prev) : null;
      const startX = prev && prevY != null ? xOf(prev, startDay, nDays, x0, innerW) : x;
      const startY = prevY != null ? prevY : y;
      current = {
        model: point.source_model,
        d: `M ${startX.toFixed(1)} ${startY.toFixed(1)} L ${x.toFixed(1)} ${y.toFixed(1)}`,
      };
      segs.push(current);
    } else {
      current.d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }
  return segs;
}

function rangeFill(points, startDay, nDays, x0, innerW, yKt, color) {
  if (!points || points.length < 2) return "";
  const top = [];
  const bottom = [];
  for (const point of points) {
    const x = xOf(point, startDay, nDays, x0, innerW).toFixed(1);
    top.push(`${x},${yKt(point.gust).toFixed(1)}`);
    bottom.push(`${x},${yKt(point.mean).toFixed(1)}`);
  }
  bottom.reverse();
  return `<polygon points="${top.concat(bottom).join(" ")}" fill="${color}" fill-opacity="0.18"></polygon>`;
}

function niceMaxKmh(values) {
  const peak = Math.max(0, ...values);
  const padded = peak <= 0 ? 10 : peak;
  if (padded <= 20) return Math.max(10, Math.ceil(padded / 5) * 5);
  return Math.ceil(padded / 5) * 5;
}

function nicePrecipMax(values) {
  const peak = Math.max(0, ...values);
  if (peak <= 1) return 1;
  if (peak <= 2) return 2;
  if (peak <= 5) return 5;
  return Math.ceil(peak / 5) * 5;
}

function niceLinearRange(values, pad = 2, stepHint = 5) {
  const nums = values.filter((v) => Number.isFinite(v));
  if (!nums.length) return { min: 0, max: 10, step: 5 };
  let min = Math.min(...nums);
  let max = Math.max(...nums);
  if (min === max) {
    min -= pad;
    max += pad;
  } else {
    min -= pad;
    max += pad;
  }
  const span = max - min;
  const step = span <= 8 ? 1 : span <= 20 ? 2 : span <= 40 ? 5 : 10;
  min = Math.floor(min / step) * step;
  max = Math.ceil(max / step) * step;
  if (max === min) max = min + step;
  return { min, max, step: stepHint || step };
}

function subsample(points, stepHours) {
  if (stepHours <= 1) return points;
  return points.filter((point) => parseValidAt(point.valid_at).hour % stepHours === 0);
}

function arrowStep(nDays) {
  if (nDays <= 1) return 2;
  if (nDays <= 3) return 4;
  return 6;
}

function arrowRotation(dirDeg) {
  const deg = Number(dirDeg);
  if (!Number.isFinite(deg)) return 180;
  return (deg + 180) % 360;
}

function weekdayShort(dayKey) {
  const p = parseValidAt(`${dayKey}T00:00`);
  const utc = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const jours = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
  return `${jours[(utc.getUTCDay() + 6) % 7]} ${p.day}`;
}

function xTicks(startDay, nDays, x0, innerW) {
  const hours = [];
  const days = [];
  const noonDots = [];
  const dayBreaks = [];
  for (let d = 0; d < nDays; d += 1) {
    const day = addDays(startDay, d);
    days.push({
      x: xOf({ valid_at: `${day}T12:00` }, startDay, nDays, x0, innerW),
      label: weekdayShort(day),
    });
    if (nDays <= 1) {
      for (let hour = 0; hour < 24; hour += 3) {
        hours.push({
          x: xOf(
            { valid_at: `${day}T${String(hour).padStart(2, "0")}:00` },
            startDay,
            nDays,
            x0,
            innerW
          ),
          label: `${String(hour).padStart(2, "0")}h`,
        });
      }
    }
    if (nDays === 3) {
      noonDots.push({
        x: xOf({ valid_at: `${day}T12:00` }, startDay, nDays, x0, innerW),
      });
    }
    if (nDays >= 3 && d > 0) {
      dayBreaks.push({
        x: xOf({ valid_at: `${day}T00:00` }, startDay, nDays, x0, innerW),
      });
    }
  }
  return { hours, days, noonDots, dayBreaks };
}

function slotCaption(validAt, nDays) {
  const p = parseValidAt(validAt);
  const hour = `${String(p.hour).padStart(2, "0")}h`;
  if (nDays <= 1) return hour;
  return `${weekdayShort(p.dayKey)} ${hour}`;
}

function emptyChart(width, message = "Pas de courbe sur cet horizon") {
  return `<svg class="spot-svg" viewBox="0 0 ${width} 80" role="img">
    <text x="12" y="44" fill="#7a7a7a" font-size="12px">${escapeHtml(message)}</text>
  </svg>`;
}

function hourAxisMarkup(startDay, nDays, x0, x1, innerW, axisY, plotTop, plotBottom, ticks, height) {
  let hourAxis = `<line x1="${x0}" y1="${axisY}" x2="${x1}" y2="${axisY}" stroke="#2a2a2a"></line>`;
  if (nDays <= 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const x = xOf(
        { valid_at: `${startDay}T${String(hour).padStart(2, "0")}:00` },
        startDay,
        nDays,
        x0,
        innerW
      );
      hourAxis += `<line x1="${x.toFixed(1)}" y1="${axisY - 3}" x2="${x.toFixed(1)}" y2="${axisY + 3}" stroke="#8a8a8a" stroke-width="1"></line>
        <circle class="hour-dot" cx="${x.toFixed(1)}" cy="${axisY}" r="2.1" fill="#c4c4c4"></circle>`;
    }
  } else {
    for (const br of ticks.dayBreaks) {
      hourAxis += `<line class="day-break" x1="${br.x.toFixed(1)}" y1="${plotTop}" x2="${br.x.toFixed(1)}" y2="${plotBottom}" stroke="#3a3a3a" stroke-width="0.7"></line>
        <line x1="${br.x.toFixed(1)}" y1="${axisY - 5}" x2="${br.x.toFixed(1)}" y2="${axisY + 5}" stroke="#9a9a9a" stroke-width="1.1"></line>`;
    }
    for (const dot of ticks.noonDots) {
      hourAxis += `<circle class="noon-dot" cx="${dot.x.toFixed(1)}" cy="${axisY}" r="2.2" fill="#c4c4c4"></circle>`;
    }
  }
  const hourLabels = ticks.hours
    .map(
      (tick) =>
        `<text x="${tick.x.toFixed(1)}" y="${axisY + 12}" text-anchor="middle" fill="#7a7a7a" font-size="8px">${escapeHtml(tick.label)}</text>`
    )
    .join("");
  const dayLabels = ticks.days
    .map(
      (tick) =>
        `<text x="${tick.x.toFixed(1)}" y="${height - 4}" text-anchor="middle" fill="#b29f84" font-size="9px">${escapeHtml(tick.label)}</text>`
    )
    .join("");
  return hourAxis + hourLabels + dayLabels;
}

function layout(width, plotH, options = {}) {
  const padL = options.padL ?? 52;
  const padR = options.padR ?? 52;
  const dirH = options.dirH ?? 0;
  const padB = 16;
  const axisH = 18;
  const dirY0 = 4;
  const plotTop = dirY0 + dirH + (dirH ? 6 : 4);
  const plotBottom = plotTop + plotH;
  const axisY = plotBottom + 3;
  const height = axisY + axisH + padB;
  const innerW = Math.max(40, width - padL - padR);
  const x0 = padL;
  const x1 = padL + innerW;
  return { padL, padR, plotH, dirH, plotTop, plotBottom, axisY, height, innerW, x0, x1, dirY0 };
}

function paintModelLine(points, startDay, nDays, x0, innerW, yOf, dashed, palette = "temp") {
  const segs = lineSegments(points, startDay, nDays, x0, innerW, yOf);
  const attrs = dashed
    ? ` stroke-dasharray="3 3" stroke-width="${GUST_STROKE}" opacity="0.92"`
    : ` stroke-width="${MEAN_STROKE}"`;
  return segs
    .map(
      (seg) =>
        `<path d="${seg.d}" fill="none" stroke="${modelColor(seg.model, palette)}"${attrs} stroke-linejoin="round" stroke-linecap="round"></path>`
    )
    .join("");
}

function buildCloudChart(points, startDay, nDays, width = 400) {
  if (!points.length) return emptyChart(width);
  const L = layout(width, 92, { padL: 58, padR: 58 });
  const ticks = xTicks(startDay, nDays, L.x0, L.innerW);
  const hourW = L.innerW / (nDays * 24);
  const yCloud = (pct) => L.plotBottom - (Math.max(0, Math.min(100, pct)) / 100) * L.plotH;
  const sunTicks = [
    { sun: 0, cloud: 100 },
    { sun: 25, cloud: 75 },
    { sun: 50, cloud: 50 },
    { sun: 75, cloud: 25 },
    { sun: 100, cloud: 0 },
  ];
  const cloudTicks = [0, 25, 50, 75, 100];
  let bars = `<rect class="sun-bg" x="${L.x0}" y="${L.plotTop}" width="${L.innerW}" height="${L.plotH}" fill="${SUN_FILL}" opacity="0.55"></rect>`;
  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const x = xOf(point, startDay, nDays, L.x0, L.innerW);
    const next = points[i + 1];
    const w = next ? Math.max(1, xOf(next, startDay, nDays, L.x0, L.innerW) - x) : hourW;
    const yTop = yCloud(point.cloud);
    const ch = L.plotBottom - yTop;
    bars += `<rect x="${x.toFixed(1)}" y="${yTop.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(0, ch).toFixed(1)}" fill="${modelColor(point.source_model, "cloud")}" opacity="0.92">
      <title>Nuages ${Math.round(point.cloud)} %</title>
    </rect>`;
  }
  const left = cloudTicks
    .map((pct) => {
      const y = yCloud(pct);
      return `<line x1="${L.x0}" y1="${y.toFixed(1)}" x2="${L.x1}" y2="${y.toFixed(1)}" stroke="#2a2a2a" stroke-width="0.4"></line>
        <text class="wx-tick" x="${L.x0 - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" fill="${WX_CLOUD}" font-size="8px">${pct}%</text>`;
    })
    .join("");
  const right = sunTicks
    .map((tick) => {
      const y = yCloud(tick.cloud);
      return `<text class="wx-tick" x="${L.x1 + 6}" y="${(y + 3).toFixed(1)}" text-anchor="start" fill="${SUN_FILL}" font-size="8px">${tick.sun}%</text>`;
    })
    .join("");
  const midY = (L.plotTop + L.plotBottom) / 2;
  const geom = { kind: "cloud", x0: L.x0, innerW: L.innerW, plotTop: L.plotTop, plotBottom: L.plotBottom, startDay, nDays, width, height: L.height };
  return `<svg class="spot-svg" viewBox="0 0 ${width} ${L.height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Nébulosité" data-geom="${escapeHtml(JSON.stringify(geom))}">
    <rect x="0" y="0" width="${width}" height="${L.height}" fill="transparent"></rect>
    ${left}
    ${bars}
    ${right}
    <text class="wx-unit" transform="translate(11 ${midY.toFixed(1)}) rotate(-90)" text-anchor="middle" fill="${WX_CLOUD}" font-size="6.5px">Nuages</text>
    <text class="wx-unit" transform="translate(${width - 11} ${midY.toFixed(1)}) rotate(-90)" text-anchor="middle" fill="${SUN_FILL}" font-size="6.5px">Soleil</text>
    ${hourAxisMarkup(startDay, nDays, L.x0, L.x1, L.innerW, L.axisY, L.plotTop, L.plotBottom, ticks, L.height)}
  </svg>`;
}

function buildPrecipChart(points, startDay, nDays, width = 400) {
  if (!points.length) return emptyChart(width);
  const L = layout(width, 78, { padL: 44, padR: 18 });
  const ticks = xTicks(startDay, nDays, L.x0, L.innerW);
  const hourW = L.innerW / (nDays * 24);
  const precipMax = nicePrecipMax(points.map((p) => p.precip));
  const yPrecip = (mm) => L.plotBottom - (Math.max(0, mm) / precipMax) * L.plotH;
  const gridVals = [0, precipMax / 2, precipMax];
  const grid = gridVals
    .map((mm) => {
      const y = yPrecip(mm);
      const label = Number.isInteger(mm) ? String(mm) : mm.toFixed(1);
      return `<line x1="${L.x0}" y1="${y.toFixed(1)}" x2="${L.x1}" y2="${y.toFixed(1)}" stroke="#2a2a2a" stroke-width="0.4"></line>
        <text class="wx-tick" x="${L.x0 - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" fill="${WX_PRECIP}" font-size="8px">${label}</text>`;
    })
    .join("");
  let bars = "";
  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    if (point.precip <= 0) continue;
    const x = xOf(point, startDay, nDays, L.x0, L.innerW);
    const next = points[i + 1];
    const w = next ? Math.max(1, xOf(next, startDay, nDays, L.x0, L.innerW) - x) : hourW;
    const barW = Math.max(1.4, w * 0.55);
    const yBar = yPrecip(point.precip);
    const ph = L.plotBottom - yBar;
    bars += `<rect x="${(x + w * 0.22).toFixed(1)}" y="${yBar.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(0.8, ph).toFixed(1)}" fill="${modelColor(point.source_model, "precip")}" opacity="0.92">
      <title>Pluie ${point.precip.toFixed(1)} mm</title>
    </rect>`;
  }
  const midY = (L.plotTop + L.plotBottom) / 2;
  const geom = { kind: "precip", x0: L.x0, innerW: L.innerW, plotTop: L.plotTop, plotBottom: L.plotBottom, precipMax, startDay, nDays, width, height: L.height };
  return `<svg class="spot-svg" viewBox="0 0 ${width} ${L.height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Précipitations" data-geom="${escapeHtml(JSON.stringify(geom))}">
    <rect x="0" y="0" width="${width}" height="${L.height}" fill="transparent"></rect>
    ${grid}
    ${bars}
    <text class="wx-unit" transform="translate(11 ${midY.toFixed(1)}) rotate(-90)" text-anchor="middle" fill="${WX_PRECIP}" font-size="6.5px">Pluie (mm)</text>
    ${hourAxisMarkup(startDay, nDays, L.x0, L.x1, L.innerW, L.axisY, L.plotTop, L.plotBottom, ticks, L.height)}
  </svg>`;
}

function buildLineChart(points, startDay, nDays, width, options) {
  const key = options.key;
  const usable = points.filter((p) => Number.isFinite(p[key]));
  if (!usable.length) return emptyChart(width);
  const L = layout(width, options.plotH || 92, { padL: 44, padR: 18 });
  const ticks = xTicks(startDay, nDays, L.x0, L.innerW);
  const range = options.range || niceLinearRange(usable.map((p) => p[key]));
  const yOfVal = (v) => L.plotBottom - ((v - range.min) / (range.max - range.min)) * L.plotH;
  const yOf = (p) => (Number.isFinite(p[key]) ? yOfVal(p[key]) : null);
  const gridVals = [];
  for (let v = range.min; v <= range.max + 1e-6; v += range.step) gridVals.push(v);
  const grid = gridVals
    .map((v) => {
      const y = yOfVal(v);
      const label = Number.isInteger(v) ? String(v) : v.toFixed(1);
      return `<line class="kt-grid" x1="${L.x0}" y1="${y.toFixed(1)}" x2="${L.x1}" y2="${y.toFixed(1)}" stroke="#2a2a2a" stroke-width="0.45"></line>
        <text x="${L.x0 - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" fill="#7a7a7a" font-size="8px">${label}</text>`;
    })
    .join("");
  const unitY = L.plotTop + 8;
  const geom = {
    kind: "line",
    key,
    x0: L.x0,
    innerW: L.innerW,
    plotTop: L.plotTop,
    plotBottom: L.plotBottom,
    min: range.min,
    max: range.max,
    startDay,
    nDays,
    width,
    height: L.height,
  };
  return `<svg class="spot-svg" viewBox="0 0 ${width} ${L.height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeHtml(options.label)}" data-geom="${escapeHtml(JSON.stringify(geom))}">
    <rect x="0" y="0" width="${width}" height="${L.height}" fill="transparent"></rect>
    ${grid}
    <text x="${L.x0 - 6}" y="${unitY}" text-anchor="end" fill="#7a7a7a" font-size="8px">${escapeHtml(options.unit)}</text>
    ${paintModelLine(usable, startDay, nDays, L.x0, L.innerW, yOf, false, options.palette)}
    ${hourAxisMarkup(startDay, nDays, L.x0, L.x1, L.innerW, L.axisY, L.plotTop, L.plotBottom, ticks, L.height)}
  </svg>`;
}

function buildTempChart(points, startDay, nDays, width = 400) {
  return buildLineChart(points, startDay, nDays, width, {
    key: "temp",
    label: "Température",
    unit: "°C",
    palette: "temp",
    plotH: 92,
    range: niceLinearRange(points.map((p) => p.temp), 2, null),
  });
}

function buildDewChart(points, startDay, nDays, width = 400) {
  return buildLineChart(points, startDay, nDays, width, {
    key: "dew",
    label: "Point de rosée",
    unit: "°C",
    palette: "dew",
    plotH: 92,
    range: niceLinearRange(points.map((p) => p.dew), 2, null),
  });
}

function buildPressureChart(points, startDay, nDays, width = 400) {
  const values = points.map((p) => p.pressure).filter((v) => Number.isFinite(v));
  const range = niceLinearRange(values, 2, 5);
  if (range.step < 2) range.step = 2;
  return buildLineChart(points, startDay, nDays, width, {
    key: "pressure",
    label: "Pression",
    unit: "hPa",
    palette: "pressure",
    plotH: 92,
    range,
  });
}

function buildWindChart(points, startDay, nDays, width = 400) {
  if (!points.length) return emptyChart(width);
  const dirH = 22;
  const L = layout(width, 132, { padL: 44, padR: 18, dirH });
  const ticks = xTicks(startDay, nDays, L.x0, L.innerW);
  const maxKmh = niceMaxKmh(points.flatMap((p) => [p.mean, p.gust]));
  const yKmh = (kmh) => L.plotBottom - (kmh / maxKmh) * L.plotH;
  const step = maxKmh <= 40 ? 5 : 10;
  const gridValues = [];
  for (let kmh = 0; kmh <= maxKmh; kmh += step) gridValues.push(kmh);
  const grid = gridValues
    .map((kmh) => {
      const y = yKmh(kmh);
      return `<line class="kt-grid" x1="${L.x0}" y1="${y.toFixed(1)}" x2="${L.x1}" y2="${y.toFixed(1)}" stroke="#2a2a2a" stroke-width="0.45"></line>
        <text x="${L.x0 - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" fill="#7a7a7a" font-size="8px">${kmh}</text>`;
    })
    .join("");
  const stepHours = arrowStep(nDays);
  const arrows = subsample(points, stepHours)
    .map((point) => {
      const x = xOf(point, startDay, nDays, L.x0, L.innerW);
      const col = modelColor(point.source_model, "wind");
      const y = L.dirY0 + 12;
      return `<g transform="translate(${x.toFixed(1)},${y}) rotate(${arrowRotation(point.dir)})">
        <path d="M0 -5.5 L3.2 5.5 L0 3.2 L-3.2 5.5 Z" fill="${col}"></path>
      </g>`;
    })
    .join("");
  const geom = {
    kind: "wind",
    x0: L.x0,
    innerW: L.innerW,
    plotTop: L.plotTop,
    plotBottom: L.plotBottom,
    maxKmh,
    startDay,
    nDays,
    width,
    height: L.height,
  };
  return `<svg class="spot-svg" viewBox="0 0 ${width} ${L.height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Vent et rafales" data-geom="${escapeHtml(JSON.stringify(geom))}">
    <rect x="0" y="0" width="${width}" height="${L.height}" fill="transparent"></rect>
    ${arrows}
    ${grid}
    <text x="${L.x0 - 6}" y="${L.plotTop + 8}" text-anchor="end" fill="#7a7a7a" font-size="8px">km/h</text>
    ${rangeFill(points, startDay, nDays, L.x0, L.innerW, yKmh, "#8a8a8a")}
    ${paintModelLine(points, startDay, nDays, L.x0, L.innerW, (p) => yKmh(p.gust), true, "wind")}
    ${paintModelLine(points, startDay, nDays, L.x0, L.innerW, (p) => yKmh(p.mean), false, "wind")}
    ${hourAxisMarkup(startDay, nDays, L.x0, L.x1, L.innerW, L.axisY, L.plotTop, L.plotBottom, ticks, L.height)}
  </svg>`;
}

const CHART_BUILDERS = {
  cloud: buildCloudChart,
  precip: buildPrecipChart,
  temp: buildTempChart,
  wind: buildWindChart,
  dew: buildDewChart,
  pressure: buildPressureChart,
};

function buildChartSvg(kind, points, startDay, nDays, width = 400) {
  const builder = CHART_BUILDERS[kind];
  if (!builder) return emptyChart(width);
  return builder(points, startDay, nDays, width);
}

function pickNearestPoint(points, startDay, nDays, geom, svgX) {
  if (!points || !points.length || !geom?.innerW) return null;
  const start = parseValidAt(`${startDay}T00:00`).ms;
  const span = nDays * 24 * 3600 * 1000;
  const tMs = start + ((svgX - geom.x0) / geom.innerW) * span;
  let nearest = points[0];
  let nearestD = Infinity;
  for (const point of points) {
    const d = Math.abs(parseValidAt(point.valid_at).ms - tMs);
    if (d < nearestD) {
      nearestD = d;
      nearest = point;
    }
  }
  return nearest;
}

function legendHtml(points, note, palette = "temp") {
  const usedModels = [...new Set((points || []).map((p) => p.source_model))];
  const prefix = palette === "cloud" ? "Nuages " : "";
  const keys = usedModels
    .map((model) => {
      const col = modelColor(model, palette);
      return `<span class="chart-key"><i style="background:${col}"></i>${escapeHtml(prefix + model)}</span>`;
    })
    .join("");
  return `<div class="chart-legend">
    ${keys}
    ${note || ""}
  </div>`;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CURVE_SETS,
    PALETTES,
    MODEL_COLORS,
    escapeHtml,
    modelColor,
    mapsUrl,
    parseValidAt,
    addDays,
    sliceHorizon,
    indexCurves,
    arrowRotation,
    nicePrecipMax,
    xTicks,
    slotCaption,
    pickNearestPoint,
    buildChartSvg,
    buildCloudChart,
    buildPrecipChart,
    buildTempChart,
    buildWindChart,
    buildDewChart,
    buildPressureChart,
    legendHtml,
    niceMaxKmh,
    MEAN_STROKE,
    GUST_STROKE,
    SUN_FILL,
  };
}
