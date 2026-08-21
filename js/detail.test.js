const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parseCsv } = require("./csv.js");

Object.assign(global, require("./courbes.js"));
const { CHARTS, spotMetaHtml } = require("./detail.js");

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
});

test("métadonnées du spot en tête de panneau, sans boutons", () => {
  const csv = fs.readFileSync(
    path.join(__dirname, "..", "assets", "spots_specs", "spots_specifications.csv"),
    "utf8"
  );
  const spot = parseCsv(csv)[0];
  const html = spotMetaHtml(spot);
  assert.match(html, /Bonne journée Papou/);
  assert.match(html, /Court terme très fiable/);
  assert.match(html, /Latitude 45\.09604610002097/);
  assert.match(html, /Longitude 4\.714684175474471/);
  assert.doesNotMatch(html, /Windguru|Webcam|Anémo|link-btn|Ferme de Sauze/);
});
