"""Assemblage de la courbe unique AROMEIFS (AROMEHD → ARPEGE → IFS)."""

from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import datetime
from io import StringIO

from config import CURVE_SETS, PRESSURE_FALLBACK_MODELS
from io_raw import load_forecasts_csv


@dataclass(frozen=True)
class HourPoint:
    valid_at: datetime
    source_model: str
    wind_speed_kt: float
    wind_gusts_kt: float
    wind_dir_deg: float
    temperature_c: float
    precipitation_mm: float
    cloud_cover_pct: float
    dew_point_c: float
    surface_pressure_hpa: float | None
    pressure_source_model: str = ""

    @property
    def hour_of_day(self) -> float:
        return self.valid_at.hour + self.valid_at.minute / 60.0 + self.valid_at.second / 3600.0

    @property
    def day_key(self) -> str:
        return self.valid_at.strftime("%Y-%m-%d")


def parse_valid_at(raw: str) -> datetime:
    text = (raw or "").strip()
    if not text:
        raise ValueError("valid_at vide")
    if text.endswith("Z"):
        text = text[:-1]
    return datetime.fromisoformat(text)


def _as_float(raw: str | None) -> float:
    text = (raw or "").strip()
    if not text:
        return 0.0
    return float(text)


def _as_optional_float(raw: str | None) -> float | None:
    text = (raw or "").strip()
    if not text:
        return None
    return float(text)


def _wind_knots(row: dict[str, str], mean: bool) -> float:
    """Lit le vent déjà en nœuds (colonnes _kn)."""
    key = "wind_speed_10m_kn" if mean else "wind_gusts_10m_kn"
    return _as_float(row.get(key))


def load_raw_points() -> dict[tuple[str, str], list[HourPoint]]:
    """Index (spot_key, model_key) → points horaires triés."""
    text = load_forecasts_csv()
    grouped: dict[tuple[str, str], list[HourPoint]] = {}
    reader = csv.DictReader(StringIO(text), delimiter=";")
    for row in reader:
        spot = (row.get("spot_key") or "").strip()
        model = (row.get("model_key") or "").strip()
        if not spot or not model:
            continue
        try:
            valid_at = parse_valid_at(row.get("valid_at") or "")
        except ValueError:
            continue
        pressure = _as_optional_float(row.get("surface_pressure_hpa"))
        point = HourPoint(
            valid_at=valid_at,
            source_model=model,
            wind_speed_kt=_wind_knots(row, mean=True),
            wind_gusts_kt=_wind_knots(row, mean=False),
            wind_dir_deg=_as_float(row.get("wind_direction_10m_deg")),
            temperature_c=_as_float(row.get("temperature_2m_c")),
            precipitation_mm=_as_float(row.get("precipitation_mm")),
            cloud_cover_pct=_as_float(row.get("cloud_cover_max_pct")),
            dew_point_c=_as_float(row.get("dew_point_2m_c")),
            surface_pressure_hpa=pressure,
            pressure_source_model=model if pressure is not None else "",
        )
        grouped.setdefault((spot, model), []).append(point)

    for points in grouped.values():
        points.sort(key=lambda item: item.valid_at)
    return grouped


def _pressure_lookup(model_points: dict[str, list[HourPoint]]) -> dict[tuple[str, datetime], tuple[float, str]]:
    """(modèle, échéance) → (pression, modèle source) pour le repli AROME."""
    index: dict[tuple[str, datetime], tuple[float, str]] = {}
    for model in PRESSURE_FALLBACK_MODELS:
        for point in model_points.get(model) or []:
            if point.surface_pressure_hpa is None:
                continue
            index[(model, point.valid_at)] = (point.surface_pressure_hpa, model)
    return index


def _fill_pressure(
    point: HourPoint,
    lookup: dict[tuple[str, datetime], tuple[float, str]],
) -> tuple[float | None, str]:
    if point.surface_pressure_hpa is not None:
        return point.surface_pressure_hpa, point.pressure_source_model or point.source_model
    for model in PRESSURE_FALLBACK_MODELS:
        hit = lookup.get((model, point.valid_at))
        if hit:
            return hit
    return None, ""


def splice_curve(model_points: dict[str, list[HourPoint]], models: tuple[str, ...]) -> list[HourPoint]:
    """Garde le court terme jusqu'à son horizon, puis le modèle suivant, etc."""
    lookup = _pressure_lookup(model_points)
    curve: list[HourPoint] = []
    cutoff: datetime | None = None
    for model in models:
        points = model_points.get(model) or []
        if cutoff is not None:
            points = [point for point in points if point.valid_at > cutoff]
        if not points:
            continue
        for point in points:
            pressure, psrc = _fill_pressure(point, lookup)
            curve.append(
                HourPoint(
                    valid_at=point.valid_at,
                    source_model=model,
                    wind_speed_kt=point.wind_speed_kt,
                    wind_gusts_kt=point.wind_gusts_kt,
                    wind_dir_deg=point.wind_dir_deg,
                    temperature_c=point.temperature_c,
                    precipitation_mm=point.precipitation_mm,
                    cloud_cover_pct=point.cloud_cover_pct,
                    dew_point_c=point.dew_point_c,
                    surface_pressure_hpa=pressure,
                    pressure_source_model=psrc,
                )
            )
        cutoff = points[-1].valid_at
    return curve


def build_all_curves(
    raw: dict[tuple[str, str], list[HourPoint]],
    spot_keys: list[str],
) -> dict[str, dict[str, list[HourPoint]]]:
    """curve_set → spot_key → courbe splicée."""
    result: dict[str, dict[str, list[HourPoint]]] = {name: {} for name in CURVE_SETS}
    for spot_key in spot_keys:
        by_model = {
            model: raw.get((spot_key, model), [])
            for models in CURVE_SETS.values()
            for model in models
        }
        for set_name, models in CURVE_SETS.items():
            result[set_name][spot_key] = splice_curve(by_model, models)
    return result
