const test = require("node:test");
const assert = require("node:assert/strict");
const { parseCsv } = require("./csv.js");
const fs = require("node:fs");
const path = require("node:path");

const csv = fs.readFileSync(
  path.join(__dirname, "..", "assets", "spots_specs", "spots_specifications.csv"),
  "utf8"
);
const rows = parseCsv(csv);
const byKey = Object.fromEntries(rows.map((row) => [row.spot_key, row]));

test("spots_specifications contient Sauze, Lyon, Hyères et Méribel", () => {
  assert.equal(rows.length, 4);
  assert.equal(byKey.ferme_de_sauze.display_name, "Ferme de Sauze");
  assert.equal(byKey.ferme_de_sauze.display_spot_infos, "Bonne journée Papou");
  assert.equal(
    byKey.ferme_de_sauze.display_wind_requirements,
    "AROMEHD = Court terme très fiable\nARPEGE = Moyen terme/fiable\nIFS = Long terme peu fiable\n\nMise à jour quotidienne a 6h30 et 19h30"
  );
  assert.equal(byKey.ferme_de_sauze.Latitude_spot, "45.09604610002097");
  assert.equal(byKey.ferme_de_sauze.AROMEHD_gridpoint_latitude, "45.09000");
  assert.equal(byKey.ferme_de_sauze.link_windguru, undefined);
});

test("grilles Lyon, Hyères et Méribel", () => {
  assert.equal(byKey.lyon.display_name, "Lyon");
  assert.equal(byKey.lyon.display_spot_infos, "Mise à jour quotidienne a 6h30 et 19h30");
  assert.equal(byKey.lyon.display_wind_requirements, "");
  assert.equal(byKey.lyon.Latitude_spot, "45.77551201707018");
  assert.equal(byKey.lyon.AROMEHD_gridpoint_latitude, "45.78000");
  assert.equal(byKey.lyon.AROMEHD_gridpoint_longitude, "4.85000");
  assert.equal(byKey.lyon.AROMEHD_gridpoint_elevation, "172");
  assert.equal(byKey.lyon.ARPEGE_gridpoint_latitude, "45.80000");
  assert.equal(byKey.lyon.IFS_gridpoint_latitude, "45.79965");

  assert.equal(byKey.hyeres.display_name, "Hyères");
  assert.equal(byKey.hyeres.Latitude_spot, "43.110398512370985");
  assert.equal(byKey.hyeres.AROMEHD_gridpoint_latitude, "43.11000");
  assert.equal(byKey.hyeres.ARPEGE_gridpoint_longitude, "6.10000");
  assert.equal(byKey.hyeres.IFS_gridpoint_longitude, "6.16990");

  assert.equal(byKey.meribel.display_name, "Méribel");
  assert.equal(byKey.meribel.Latitude_spot, "45.389240869404695");
  assert.equal(byKey.meribel.AROMEHD_gridpoint_elevation, "2023");
  assert.equal(byKey.meribel.ARPEGE_gridpoint_elevation, "1815");
  assert.equal(byKey.meribel.IFS_gridpoint_elevation, "2108");
});
