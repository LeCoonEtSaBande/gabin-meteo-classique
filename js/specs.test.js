const test = require("node:test");
const assert = require("node:assert/strict");
const { parseCsv } = require("./csv.js");
const fs = require("node:fs");
const path = require("node:path");

test("spots_specifications ne contient que Ferme de Sauze", () => {
  const csv = fs.readFileSync(
    path.join(__dirname, "..", "assets", "spots_specs", "spots_specifications.csv"),
    "utf8"
  );
  const rows = parseCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].spot_key, "ferme_de_sauze");
  assert.equal(rows[0].display_name, "Ferme de Sauze");
  assert.equal(rows[0].short_term_model, "AROMEHD");
  assert.equal(rows[0].AROMEHD_gridpoint_latitude, "45.09000");
  assert.equal(rows[0].AROMEHD_gridpoint_longitude, "4.71000");
  assert.equal(rows[0].AROMEHD_gridpoint_elevation, "467");
  assert.equal(rows[0].ARPEGE_gridpoint_latitude, "45.10000");
  assert.equal(rows[0].ARPEGE_gridpoint_longitude, "4.70000");
  assert.equal(rows[0].ARPEGE_gridpoint_elevation, "444");
  assert.equal(rows[0].IFS_gridpoint_latitude, "45.09666");
  assert.equal(rows[0].IFS_gridpoint_longitude, "4.75894");
  assert.equal(rows[0].IFS_gridpoint_elevation, "359");
  assert.equal(rows[0].ICONCH1_gridpoint_latitude, undefined);
});
