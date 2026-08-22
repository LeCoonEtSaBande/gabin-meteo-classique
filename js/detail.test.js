const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parseCsv } = require("./csv.js");

Object.assign(global, require("./courbes.js"));
const { CHARTS, spotMetaHtml, spotCoordsHtml } = require("./detail.js");

test("titres température et rosée sans « 2 m »", () => {
  assert.equal(
    CHARTS.find((c) => c.kind === "temp").title,
    "Température"
  );
  assert.equal(
    CHARTS.find((c) => c.kind === "dew").title,
    "Point de rosée"
  );
  for (const chart of CHARTS) {
    assert.doesNotMatch(chart.title, /2 m/);
    assert.doesNotMatch(chart.note || "", /échelle droite/);
  }
  assert.deepEqual(
    CHARTS.map((c) => c.kind),
    ["precip", "cloud", "temp", "wind", "dew", "pressure"]
  );
});

test("métadonnées du spot en tête, coordonnées en bas", () => {
  const csv = fs.readFileSync(
    path.join(__dirname, "..", "assets", "spots_specs", "spots_specifications.csv"),
    "utf8"
  );
  const spot = parseCsv(csv)[0];
  const html = spotMetaHtml(spot);
  assert.match(html, /Bonne journée Papou/);
  assert.match(html, /Court terme très fiable/);
  assert.match(html, /Mise à jour quotidienne a 6h30 et 19h30/);
  assert.doesNotMatch(html, /Latitude|Longitude|Windguru|Webcam|Anémo|link-btn|Ferme de Sauze/);
  const coords = spotCoordsHtml(spot);
  assert.match(coords, /Latitude 45\.09604610002097/);
  assert.match(coords, /Longitude 4\.714684175474471/);
  assert.ok(coords.indexOf("Latitude") < coords.indexOf("Longitude"));
  assert.match(coords, /<\/p>\s*<p>/);
});
