"""Assemblage de la courbe unique AROMEIFS (AROMEHD → ARPEGE → IFS)."""

from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import datetime
from io import StringIO

from cloud import cloud_cover_display, is_high_only_layers
from config import CURVE_SETS, PRESSURE_FALLBACK_MODELS, SNOW_FALLBACK_MODELS
from io_raw import load_forecasts_csv


@dataclass(frozen=True)
class HourPoint:
    valid_at: datetime
    source_model: str
    wind_speed_kmh: float
    wind_gusts_kmh: float
    wind_dir_deg: float
    temperature_c: float
    precipitation_mm: float
    cloud_cover_display_pct: float
    dew_point_c: float
    surface_pressure_hpa: float | None
    pressure_source_model: str = ""
    snowfall_cm: float | None = None
    snow_source_model: str = ""
    freezing_level_m: float | None = None
    freeze_source_model: str = ""
    cloud_cover_total_pct: float | None = None
    cloud_cover_low_pct: float | None = None
    cloud_cover_mid_pct: float | None = None
    cloud_cover_high_pct: float | None = None
    cloud_cover_source_model: str = ""

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


def _wind_kmh(row: dict[str, str], mean: bool) -> float:
    """Lit le vent déjà en km/h (colonnes _kmh)."""
    key = "wind_speed_10m_kmh" if mean else "wind_gusts_10m_kmh"
    return _as_float(row.get(key))


def _cloud_layers_from_row(row: dict[str, str]) -> tuple[float | None, float | None, float | None, float | None]:
    return (
        _as_optional_float(row.get("cloud_cover_pct")),
        _as_optional_float(row.get("cloud_cover_low_pct")),
        _as_optional_float(row.get("cloud_cover_mid_pct")),
        _as_optional_float(row.get("cloud_cover_high_pct")),
    )


def _has_cloud_layers(row: dict[str, str]) -> bool:
    return any(
        (row.get(name) or "").strip()
        for name in (
            "cloud_cover_pct",
            "cloud_cover_low_pct",
            "cloud_cover_mid_pct",
            "cloud_cover_high_pct",
        )
    )


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
        snow = _as_optional_float(row.get("snowfall_cm"))
        freeze = _as_optional_float(row.get("freezing_level_height_m"))
        total, low, mid, high = _cloud_layers_from_row(row)
        if _has_cloud_layers(row):
            if model == "AROMEHD" and is_high_only_layers(total, low, mid, high):
                low, mid = 0.0, 0.0
                display = cloud_cover_display(None, low, mid, high)
            else:
                display = cloud_cover_display(total, low, mid, high)
        else:
            display = _as_float(row.get("cloud_cover_max_pct"))
        point = HourPoint(
            valid_at=valid_at,
            source_model=model,
            wind_speed_kmh=_wind_kmh(row, mean=True),
            wind_gusts_kmh=_wind_kmh(row, mean=False),
            wind_dir_deg=_as_float(row.get("wind_direction_10m_deg")),
            temperature_c=_as_float(row.get("temperature_2m_c")),
            precipitation_mm=_as_float(row.get("precipitation_mm")),
            cloud_cover_display_pct=display,
            dew_point_c=_as_float(row.get("dew_point_2m_c")),
            surface_pressure_hpa=pressure,
            pressure_source_model=model if pressure is not None else "",
            snowfall_cm=snow,
            snow_source_model=model if snow is not None else "",
            freezing_level_m=freeze,
            freeze_source_model=(row.get("freeze_source_model") or "").strip()
            or (model if freeze is not None else ""),
            cloud_cover_total_pct=total,
            cloud_cover_low_pct=low,
            cloud_cover_mid_pct=mid,
            cloud_cover_high_pct=high,
            cloud_cover_source_model=model,
        )
        grouped.setdefault((spot, model), []).append(point)

    for points in grouped.values():
        points.sort(key=lambda item: item.valid_at)
    return grouped


def _optional_lookup(
    model_points: dict[str, list[HourPoint]],
    models: tuple[str, ...],
    attr: str,
    source_attr: str,
) -> dict[tuple[str, datetime], tuple[float, str]]:
    index: dict[tuple[str, datetime], tuple[float, str]] = {}
    for model in models:
        for point in model_points.get(model) or []:
            value = getattr(point, attr)
            if value is None:
                continue
            source = getattr(point, source_attr) or model
            index[(model, point.valid_at)] = (value, source)
    return index


def _fill_optional(
    point: HourPoint,
    lookup: dict[tuple[str, datetime], tuple[float, str]],
    models: tuple[str, ...],
    attr: str,
    source_attr: str,
) -> tuple[float | None, str]:
    value = getattr(point, attr)
    if value is not None:
        return value, getattr(point, source_attr) or point.source_model
    for model in models:
        hit = lookup.get((model, point.valid_at))
        if hit:
            return hit
    return None, ""


def _pressure_lookup(model_points: dict[str, list[HourPoint]]) -> dict[tuple[str, datetime], tuple[float, str]]:
    """(modèle, échéance) → (pression, modèle source) pour le repli AROME."""
    return _optional_lookup(
        model_points, PRESSURE_FALLBACK_MODELS, "surface_pressure_hpa", "pressure_source_model"
    )


def _fill_pressure(
    point: HourPoint,
    lookup: dict[tuple[str, datetime], tuple[float, str]],
) -> tuple[float | None, str]:
    return _fill_optional(
        point, lookup, PRESSURE_FALLBACK_MODELS, "surface_pressure_hpa", "pressure_source_model"
    )


def splice_curve(model_points: dict[str, list[HourPoint]], models: tuple[str, ...]) -> list[HourPoint]:
    """Garde le court terme jusqu'à son horizon, puis le modèle suivant, etc."""
    pressure_lookup = _pressure_lookup(model_points)
    snow_lookup = _optional_lookup(
        model_points, SNOW_FALLBACK_MODELS, "snowfall_cm", "snow_source_model"
    )
    curve: list[HourPoint] = []
    cutoff: datetime | None = None
    for model in models:
        points = model_points.get(model) or []
        if cutoff is not None:
            points = [point for point in points if point.valid_at > cutoff]
        if not points:
            continue
        for point in points:
            pressure, psrc = _fill_pressure(point, pressure_lookup)
            snow, ssrc = _fill_optional(
                point, snow_lookup, SNOW_FALLBACK_MODELS, "snowfall_cm", "snow_source_model"
            )
            curve.append(
                HourPoint(
                    valid_at=point.valid_at,
                    source_model=model,
                    wind_speed_kmh=point.wind_speed_kmh,
                    wind_gusts_kmh=point.wind_gusts_kmh,
                    wind_dir_deg=point.wind_dir_deg,
                    temperature_c=point.temperature_c,
                    precipitation_mm=point.precipitation_mm,
                    cloud_cover_display_pct=point.cloud_cover_display_pct,
                    dew_point_c=point.dew_point_c,
                    surface_pressure_hpa=pressure,
                    pressure_source_model=psrc,
                    snowfall_cm=snow,
                    snow_source_model=ssrc,
                    freezing_level_m=point.freezing_level_m,
                    freeze_source_model=point.freeze_source_model,
                    cloud_cover_source_model=point.cloud_cover_source_model or model,
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
