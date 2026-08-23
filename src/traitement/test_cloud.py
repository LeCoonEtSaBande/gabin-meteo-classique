"""Nébulosité display et repli AROME → ARPEGE."""

from __future__ import annotations

from datetime import datetime

from cloud import cloud_cover_display, needs_cloud_fallback
from curves import HourPoint, splice_curve


def test_cloud_cover_display_total() -> None:
    assert cloud_cover_display(75.0, 0.0, 0.0, 100.0) == 75.0


def test_cloud_cover_display_layers() -> None:
    assert cloud_cover_display(None, 80.0, 20.0, 10.0) == 80.0
    assert cloud_cover_display(None, 0.0, 0.0, 63.0) == 15.75


def test_needs_cloud_fallback() -> None:
    assert needs_cloud_fallback(None, 0.0, 0.0, 63.0) is True
    assert needs_cloud_fallback(19.0, 0.0, 0.0, 19.0) is False
    assert needs_cloud_fallback(None, 30.0, 0.0, 90.0) is False


def _pt(
    hour: int,
    model: str,
    *,
    total: float | None = None,
    low: float | None = None,
    mid: float | None = None,
    high: float | None = None,
    display: float | None = None,
) -> HourPoint:
    disp = display if display is not None else cloud_cover_display(total, low, mid, high)
    return HourPoint(
        valid_at=datetime(2026, 8, 21, hour),
        source_model=model,
        wind_speed_kmh=10.0,
        wind_gusts_kmh=14.0,
        wind_dir_deg=180.0,
        temperature_c=18.0,
        precipitation_mm=0.0,
        cloud_cover_display_pct=disp,
        dew_point_c=12.0,
        surface_pressure_hpa=1010.0,
        cloud_cover_total_pct=total,
        cloud_cover_low_pct=low,
        cloud_cover_mid_pct=mid,
        cloud_cover_high_pct=high,
        cloud_cover_source_model=model,
    )


def test_cloud_fill_arome_from_arpege() -> None:
    model_points = {
        "AROMEHD": [_pt(10, "AROMEHD", total=None, low=0.0, mid=0.0, high=80.0)],
        "ARPEGE": [_pt(10, "ARPEGE", total=35.0, low=0.0, mid=0.0, high=35.0)],
        "IFS": [],
    }
    curve = splice_curve(model_points, ("AROMEHD", "ARPEGE", "IFS"))
    assert curve[0].source_model == "AROMEHD"
    assert curve[0].cloud_cover_display_pct == 35.0
    assert curve[0].cloud_cover_source_model == "ARPEGE"


if __name__ == "__main__":
    test_cloud_cover_display_total()
    test_cloud_cover_display_layers()
    test_needs_cloud_fallback()
    test_cloud_fill_arome_from_arpege()
    print("ok")
