"""Tests des créneaux (retards cron, été 6h15 / hiver 5h15)."""

from __future__ import annotations

import unittest
from datetime import datetime

from config import PARIS
from schedule import already_collected_for_slot, current_slot_start


def paris(*args: int) -> datetime:
    return datetime(*args, tzinfo=PARIS)


class CurrentSlotStartTests(unittest.TestCase):
    def test_exact_slot_opening(self) -> None:
        now = paris(2026, 9, 7, 6, 15)
        self.assertEqual(current_slot_start(now), now.replace(second=0, microsecond=0))

    def test_before_morning_uses_yesterday_evening(self) -> None:
        now = paris(2026, 9, 7, 4, 0)
        self.assertEqual(current_slot_start(now), paris(2026, 9, 6, 19, 15))

    def test_observed_morning_delay_keeps_morning_slot(self) -> None:
        # Retard réel constaté le 07/09 : cron de 6h15 livré à 11h22.
        now = paris(2026, 9, 7, 11, 22)
        self.assertEqual(current_slot_start(now), paris(2026, 9, 7, 6, 15))

    def test_worst_observed_morning_delay_keeps_morning_slot(self) -> None:
        now = paris(2026, 9, 7, 12, 53)
        self.assertEqual(current_slot_start(now), paris(2026, 9, 7, 6, 15))

    def test_observed_evening_delay_keeps_evening_slot(self) -> None:
        # Retard réel constaté le 31/08 : cron de 19h15 livré à 23h54.
        now = paris(2026, 8, 31, 23, 54)
        self.assertEqual(current_slot_start(now), paris(2026, 8, 31, 19, 15))

    def test_winter_morning_opens_at_5h15(self) -> None:
        now = paris(2026, 1, 15, 5, 15)
        self.assertEqual(current_slot_start(now), now.replace(second=0, microsecond=0))

    def test_winter_evening_opens_at_18h15(self) -> None:
        now = paris(2026, 1, 15, 18, 20)
        self.assertEqual(current_slot_start(now), paris(2026, 1, 15, 18, 15))


class AlreadyCollectedTests(unittest.TestCase):
    def test_second_run_same_slot_is_skipped(self) -> None:
        slot = paris(2026, 9, 7, 6, 15)
        last = {"last_update_at": "2026-09-07T11:23:06+02:00"}
        self.assertTrue(already_collected_for_slot(slot, last))

    def test_evening_slot_after_morning_collect_is_not_skipped(self) -> None:
        slot = paris(2026, 9, 7, 19, 15)
        last = {"last_update_at": "2026-09-07T11:23:06+02:00"}
        self.assertFalse(already_collected_for_slot(slot, last))

    def test_yesterday_collect_does_not_block_today(self) -> None:
        slot = paris(2026, 9, 7, 6, 15)
        last = {"last_update_at": "2026-09-06T20:44:00+02:00"}
        self.assertFalse(already_collected_for_slot(slot, last))

    def test_missing_last_update_collects(self) -> None:
        self.assertFalse(already_collected_for_slot(paris(2026, 9, 7, 6, 15), None))

    def test_unparsable_last_update_collects(self) -> None:
        last = {"last_update_at": "pas une date"}
        self.assertFalse(already_collected_for_slot(paris(2026, 9, 7, 6, 15), last))


if __name__ == "__main__":
    unittest.main()
