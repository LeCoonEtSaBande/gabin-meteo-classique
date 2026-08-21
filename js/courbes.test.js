const test = require("node:test");
const assert = require("node:assert/strict");
const { parseCsv } = require("./csv.js");
const {
  mapsUrl,
  addDays,
  sliceHorizon,
  indexCurves,
  parseValidAt,
  arrowRotation,
  xTicks,
  slotCaption,
  pickNearestPoint,
  buildChartSvg,
  legendHtml,
  modelColor,
  PALETTES,
  MEAN_STROKE,
  SUN_FILL,
} = require("./courbes.js");

const SAMPLE = [
  {
    valid_at: "2026-08-20T10:00",
    source_model: "AROMEHD",
    mean: 12,
    gust: 18,
    dir: 40,
    precip: 0.4,
    cloud: 75,
    temp: 21,
    dew: 14,
    pressure: 1012.4,
    pressure_source: "ARPEGE",
  },
  {
    valid_at: "2026-08-20T11:00",
    source_model: "IFS",
    mean: 16,
    gust: 22,
    dir: 50,
    precip: 0,
    cloud: 20,
    temp: 22,
    dew: 13,
    pressure: 1011.0,
    pressure_source: "IFS",
  },
];

test("CSV conserve un point-virgule dans un champ quoté", () => {
  const rows = parseCsv(
    "spot_key;display_spot_infos\nroche_de_glun;\"Navigation au Nord du barage.;Se garer au parking\"\n"
  );
  assert.equal(rows.length, 1);
  assert.equal(
    rows[0].display_spot_infos,
    "Navigation au Nord du barage.;Se garer au parking"
  );
});

test("mapsUrl compose les coordonnées de mise à l'eau", () => {
  assert.equal(
    mapsUrl("44.87380121720323", "4.862811750639313"),
    "https://www.google.com/maps?q=44.87380121720323,4.862811750639313"
  );
  assert.equal(mapsUrl("", ""), "");
});

test("addDays avance l'horizon sans décalage de fuseau", () => {
  assert.equal(addDays("2026-08-20", 1), "2026-08-21");
  assert.equal(addDays("2026-08-20", 5), "2026-08-25");
});

test("sliceHorizon garde la journée puis 3 jours", () => {
  const points = [
    { valid_at: "2026-08-20T23:00", mean: 10 },
    { valid_at: "2026-08-21T00:00", mean: 11 },
    { valid_at: "2026-08-22T12:00", mean: 12 },
    { valid_at: "2026-08-23T00:00", mean: 13 },
  ];
  assert.equal(sliceHorizon(points, "2026-08-20", 1).length, 1);
  assert.deepEqual(
    sliceHorizon(points, "2026-08-20", 3).map((p) => p.valid_at),
    ["2026-08-20T23:00", "2026-08-21T00:00", "2026-08-22T12:00"]
  );
});

test("indexCurves lit AROMEIFS avec rosée et pression", () => {
  const indexed = indexCurves([
    {
      spot_key: "ferme_de_sauze",
      curve_set: "AROMEIFS",
      valid_at: "2026-08-20T00:00",
      source_model: "AROMEHD",
      wind_speed_10m_kn: "9.2",
      wind_gusts_10m_kn: "14",
      wind_direction_10m_deg: "20",
      precipitation_mm: "0",
      cloud_cover_max_pct: "10",
      dew_point_2m_c: "12.2",
      surface_pressure_hpa: "1011.4",
      pressure_source_model: "ARPEGE",
    },
  ]);
  assert.equal(indexed.AROMEIFS.ferme_de_sauze[0].dew, 12.2);
  assert.equal(indexed.AROMEIFS.ferme_de_sauze[0].pressure, 1011.4);
  assert.equal(indexed.AROMEIFS.ferme_de_sauze[0].pressure_source, "ARPEGE");
});

test("l'axe X : heures en journée, midi à 3 jours, coupures de jour à 5 jours", () => {
  const day = xTicks("2026-08-20", 1, 64, 300);
  assert.ok(day.hours.some((t) => t.label === "00h"));
  assert.ok(day.hours.some((t) => t.label === "12h"));
  assert.equal(day.noonDots.length, 0);
  const three = xTicks("2026-08-20", 3, 64, 300);
  assert.equal(three.hours.length, 0);
  assert.equal(three.noonDots.length, 3);
  assert.equal(three.dayBreaks.length, 2);
  const five = xTicks("2026-08-20", 5, 64, 300);
  assert.equal(five.noonDots.length, 0);
  assert.equal(five.dayBreaks.length, 4);
});

test("nébulosité : fond soleil, échelles nuages et soleil inversée, 75 % soleil", () => {
  const svg = buildChartSvg("cloud", SAMPLE, "2026-08-20", 1, 400);
  assert.match(svg, /class="sun-bg"/);
  assert.match(svg, new RegExp(SUN_FILL));
  assert.match(svg, />Nuages</);
  assert.match(svg, />Soleil</);
  assert.match(svg, />0%</);
  assert.match(svg, />25%</);
  assert.match(svg, />50%</);
  assert.match(svg, />75%</);
  assert.match(svg, />100%</);
  assert.equal((svg.match(/>75%</g) || []).length, 2);
  assert.match(svg, /class="hour-dot"/);
  assert.equal((svg.match(/class="hour-dot"/g) || []).length, 24);
  assert.match(svg, new RegExp(PALETTES.cloud.AROMEHD));
  assert.match(svg, new RegExp(PALETTES.cloud.IFS));
});

test("pluie en mm, température, rosée, pression et vent", () => {
  assert.match(buildChartSvg("precip", SAMPLE, "2026-08-20", 1, 400), /Pluie \(mm\)/);
  assert.match(buildChartSvg("temp", SAMPLE, "2026-08-20", 1, 400), /°C/);
  assert.match(buildChartSvg("dew", SAMPLE, "2026-08-20", 1, 400), /°C/);
  assert.match(buildChartSvg("pressure", SAMPLE, "2026-08-20", 1, 400), /hPa/);
  const wind = buildChartSvg("wind", SAMPLE, "2026-08-20", 1, 400);
  assert.match(wind, /AROMEIFS/);
  assert.match(wind, /class="kt-8"/);
  assert.match(wind, new RegExp(`stroke-width="${MEAN_STROKE}"`));
  assert.match(wind, /rotate\(220\)/);
});

test("3 jours : midi marqué ; 5 jours : seulement les jours", () => {
  const three = buildChartSvg("wind", SAMPLE, "2026-08-20", 3, 400);
  assert.match(three, /class="noon-dot"/);
  assert.doesNotMatch(three, /class="hour-dot"/);
  const five = buildChartSvg("cloud", SAMPLE, "2026-08-20", 5, 400);
  assert.doesNotMatch(five, /class="noon-dot"/);
  assert.equal((five.match(/class="day-break"/g) || []).length, 4);
});

test("le survol choisit le créneau le plus proche", () => {
  assert.equal(slotCaption("2026-08-20T14:00", 1), "14h");
  assert.equal(slotCaption("2026-08-21T09:00", 3), "ven. 21 09h");
  const geom = { x0: 80, innerW: 240 };
  const hit = pickNearestPoint(SAMPLE, "2026-08-20", 1, geom, 80 + (10 / 24) * 240);
  assert.equal(hit.valid_at, "2026-08-20T10:00");
  assert.equal(arrowRotation(hit.dir), 220);
});

test("légende des modèles suit la palette du graphique", () => {
  const legend = legendHtml(SAMPLE, `<span class="chart-key-note">plein = vent moyen</span>`, "wind");
  assert.match(legend, /AROMEHD/);
  assert.match(legend, /IFS/);
  assert.match(legend, /vent moyen/);
  assert.match(legend, new RegExp(PALETTES.wind.AROMEHD));
  assert.match(legend, new RegExp(PALETTES.wind.IFS));
});

test("température, rosée et pression ont des palettes distinctes", () => {
  assert.notEqual(modelColor("AROMEHD", "temp"), modelColor("ARPEGE", "temp"));
  assert.notEqual(modelColor("ARPEGE", "temp"), modelColor("IFS", "temp"));
  assert.equal(modelColor("AROMEHD", "temp"), modelColor("AROMEHD", "wind"));
  assert.match(buildChartSvg("temp", SAMPLE, "2026-08-20", 1, 400), new RegExp(PALETTES.temp.AROMEHD));
  assert.match(buildChartSvg("dew", SAMPLE, "2026-08-20", 1, 400), new RegExp(PALETTES.dew.AROMEHD));
  assert.match(buildChartSvg("pressure", SAMPLE, "2026-08-20", 1, 400), new RegExp(PALETTES.pressure.AROMEHD));
  assert.match(buildChartSvg("precip", SAMPLE, "2026-08-20", 1, 400), new RegExp(PALETTES.precip.AROMEHD));
});

test("parseValidAt lit l'heure civile sans Date locale", () => {
  const p = parseValidAt("2026-08-20T14:00");
  assert.equal(p.hour, 14);
  assert.equal(p.dayKey, "2026-08-20");
});
