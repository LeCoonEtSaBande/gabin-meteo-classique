const test = require("node:test");
const assert = require("node:assert/strict");
const { parseCsv } = require("./csv.js");
const fs = require("node:fs");
const path = require("node:path");

test("spots_specifications ne contient que Portes-lès-Valence", () => {
  const csv = fs.readFileSync(
    path.join(__dirname, "..", "assets", "spots_specs", "spots_specifications.csv"),
    "utf8"
  );
  const rows = parseCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].spot_key, "portes_les_valence");
  assert.equal(rows[0].short_term_model, "AROMEHD");
  assert.ok(rows[0].AROMEHD_gridpoint_latitude);
  assert.ok(rows[0].ARPEGE_gridpoint_latitude);
  assert.ok(rows[0].IFS_gridpoint_latitude);
  assert.equal(rows[0].ICONCH1_gridpoint_latitude, undefined);
});
