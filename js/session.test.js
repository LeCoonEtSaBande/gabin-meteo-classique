const test = require("node:test");
const assert = require("node:assert/strict");
const { slotDurationHours, clipSlot, isUsableSession, windArrowDeg } = require("./session.js");

test("10h-13h compte 3 heures", () => {
  assert.equal(slotDurationHours({ slot_start_h: 10, slot_end_h: 13 }), 3);
});

test("flèche : pointe vers où ça souffle, pas d'où ça vient", () => {
  assert.equal(windArrowDeg(0), 180);
  assert.equal(windArrowDeg(180), 0);
});

test("créneau recadré dans 7 h–22 h", () => {
  assert.deepEqual(clipSlot({ slot_start_h: 0, slot_end_h: 14 }), {
    start_h: 7,
    end_h: 14,
    label: "(07h-14h)",
  });
  assert.equal(isUsableSession({ slot_start_h: 21, slot_end_h: 23 }), false);
});
