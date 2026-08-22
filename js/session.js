/** Règles d'affichage quotidien. Créneau exploitable : ≥ 3 h dans la fenêtre 7 h–22 h. */

const MUTED = [90, 90, 90];

const TEMP_STOPS = [
  [-5, [230, 236, 242]],
  [0, [180, 210, 230]],
  [10, [40, 90, 160]],
  [20, [70, 150, 170]],
  [25, [196, 168, 90]],
  [30, [196, 168, 90]],
  [38, [224, 120, 48]],
  [40, [216, 48, 48]],
  [45, [200, 74, 212]],
];

const WIND_STOPS = [
  [0, MUTED],
  [15, MUTED],
  [17, [120, 140, 150]],
  [22, [60, 176, 67]],
  [28, [212, 176, 64]],
  [37, [232, 132, 32]],
  [56, [224, 48, 48]],
  [74, [200, 74, 212]],
];

const GUST_STOPS = [
  [0, MUTED],
  [22, MUTED],
  [28, [120, 140, 150]],
  [33, [60, 176, 67]],
  [41, [212, 176, 64]],
  [52, [232, 132, 32]],
  [65, [224, 48, 48]],
  [83, [200, 74, 212]],
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpRgb(a, b, t) {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}

function rgbCss(rgb) {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

function colorFromStops(value, stops) {
  if (value == null || Number.isNaN(value)) return rgbCss(MUTED);
  const minV = stops[0][0];
  const maxV = stops[stops.length - 1][0];
  const v = Math.min(maxV, Math.max(minV, value));
  for (let i = 1; i < stops.length; i += 1) {
    const [x1, c1] = stops[i - 1];
    const [x2, c2] = stops[i];
    if (v <= x2) {
      const t = x2 === x1 ? 0 : (v - x1) / (x2 - x1);
      return rgbCss(lerpRgb(c1, c2, t));
    }
  }
  return rgbCss(stops[stops.length - 1][1]);
}

const SLOT_WINDOW_START_H = 7;
const SLOT_WINDOW_END_H = 22;
const MIN_SLOT_HOURS = 3;

function slotDurationHours(day) {
  if (!day || day.slot_start_h == null || day.slot_end_h == null) return 0;
  return day.slot_end_h - day.slot_start_h;
}

function padHour(hour) {
  return String(hour).padStart(2, "0");
}

function clipSlot(day) {
  if (!day || day.slot_start_h == null || day.slot_end_h == null) return null;
  const start = Math.max(SLOT_WINDOW_START_H, Number(day.slot_start_h));
  const end = Math.min(SLOT_WINDOW_END_H, Number(day.slot_end_h));
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (end - start < MIN_SLOT_HOURS) return null;
  return {
    start_h: start,
    end_h: end,
    label: `(${padHour(start)}h-${padHour(end)}h)`,
  };
}

function windArrowDeg(fromDeg) {
  // Open-Meteo : 0° = vent qui vient du nord. Le glyphe pointe vers le haut à 0°.
  // La pointe doit aller où le vent souffle (vers = d'où + 180°).
  const from = Number(fromDeg);
  if (Number.isNaN(from)) return 0;
  return (from + 180) % 360;
}

function isUsableSession(day) {
  return clipSlot(day) != null;
}

function windColor(kmh) {
  return colorFromStops(kmh, WIND_STOPS);
}

function gustColor(kmh) {
  return colorFromStops(kmh, GUST_STOPS);
}

function tempColor(c) {
  return colorFromStops(c, TEMP_STOPS);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    slotDurationHours,
    clipSlot,
    isUsableSession,
    SLOT_WINDOW_START_H,
    SLOT_WINDOW_END_H,
    MIN_SLOT_HOURS,
    windArrowDeg,
    windColor,
    gustColor,
    tempColor,
    colorFromStops,
    WIND_STOPS,
    TEMP_STOPS,
    MUTED,
  };
}
