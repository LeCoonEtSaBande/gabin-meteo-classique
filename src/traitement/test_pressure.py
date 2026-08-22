"""Repli de la pression AROME par ARPEGE puis IFS."""

from __future__ import annotations

from datetime import datetime

from curves import HourPoint, splice_curve


def _pt(hour: int, model: str, pressure: float | None) -> HourPoint:
    return HourPoint(
        valid_at=datetime(2026, 8, 21, hour),
        source_model=model,
        wind_speed_kmh=10.0,
        wind_gusts_kmh=14.0,
        wind_dir_deg=180.0,
        temperature_c=18.0,
        precipitation_mm=0.0,
        cloud_cover_pct=40.0,
        dew_point_c=12.0,
        surface_pressure_hpa=pressure,
        pressure_source_model=model if pressure is not None else "",
        snowfall_cm=None,
        snow_source_model="",
        freezing_level_m=None,
        freeze_source_model="",
    )


def test_pressure_fill_arome_from_arpege() -> None:
    model_points = {
        "AROMEHD": [_pt(10, "AROMEHD", None), _pt(11, "AROMEHD", None)],
        "ARPEGE": [_pt(10, "ARPEGE", 1012.0), _pt(11, "ARPEGE", 1011.0), _pt(20, "ARPEGE", 1010.0)],
        "IFS": [_pt(10, "IFS", 1005.0), _pt(22, "IFS", 1000.0)],
    }
    curve = splice_curve(model_points, ("AROMEHD", "ARPEGE", "IFS"))
    arome = [p for p in curve if p.source_model == "AROMEHD"]
    assert arome[0].surface_pressure_hpa == 1012.0
    assert arome[0].pressure_source_model == "ARPEGE"
    assert arome[0].source_model == "AROMEHD"
    assert arome[1].surface_pressure_hpa == 1011.0
    arpege = [p for p in curve if p.source_model == "ARPEGE"]
    assert arpege[0].valid_at.hour == 20
    assert any(p.source_model == "IFS" and p.valid_at.hour == 22 for p in curve)


def test_pressure_fill_falls_back_to_ifs() -> None:
    model_points = {
        "AROMEHD": [_pt(10, "AROMEHD", None)],
        "ARPEGE": [],
        "IFS": [_pt(10, "IFS", 1001.5)],
    }
    curve = splice_curve(model_points, ("AROMEHD", "ARPEGE", "IFS"))
    assert curve[0].surface_pressure_hpa == 1001.5
    assert curve[0].pressure_source_model == "IFS"
    assert curve[0].source_model == "AROMEHD"


def test_snow_fill_arome_from_arpege() -> None:
    arome = HourPoint(
        valid_at=datetime(2026, 8, 21, 10),
        source_model="AROMEHD",
        wind_speed_kmh=10.0,
        wind_gusts_kmh=14.0,
        wind_dir_deg=180.0,
        temperature_c=18.0,
        precipitation_mm=0.0,
        cloud_cover_pct=40.0,
        dew_point_c=12.0,
        surface_pressure_hpa=1010.0,
        pressure_source_model="AROMEHD",
        snowfall_cm=None,
        freezing_level_m=2100.0,
        freeze_source_model="ICON",
    )
    arpege = HourPoint(
        valid_at=datetime(2026, 8, 21, 10),
        source_model="ARPEGE",
        wind_speed_kmh=10.0,
        wind_gusts_kmh=14.0,
        wind_dir_deg=180.0,
        temperature_c=18.0,
        precipitation_mm=0.0,
        cloud_cover_pct=40.0,
        dew_point_c=12.0,
        surface_pressure_hpa=1010.0,
        pressure_source_model="ARPEGE",
        snowfall_cm=1.4,
        snow_source_model="ARPEGE",
        freezing_level_m=2100.0,
        freeze_source_model="ICON",
    )
    curve = splice_curve(
        {"AROMEHD": [arome], "ARPEGE": [arpege], "IFS": []},
        ("AROMEHD", "ARPEGE", "IFS"),
    )
    assert curve[0].snowfall_cm == 1.4
    assert curve[0].snow_source_model == "ARPEGE"
    assert curve[0].freezing_level_m == 2100.0
    assert curve[0].freeze_source_model == "ICON"


if __name__ == "__main__":
    test_pressure_fill_arome_from_arpege()
    test_pressure_fill_falls_back_to_ifs()
    test_snow_fill_arome_from_arpege()
    print("ok")
