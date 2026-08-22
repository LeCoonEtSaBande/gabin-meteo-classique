"""Modèles Open-Meteo, variables métier et chemins de la collecte."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

ROOT = Path(__file__).resolve().parents[2]
SPOTS_CSV = ROOT / "assets" / "spots_specs" / "spots_specifications.csv"
RAW_DIR = ROOT / "data" / "raw"

try:
    PARIS = ZoneInfo("Europe/Paris")
except ZoneInfoNotFoundError:
    import tzdata  # noqa: F401

    PARIS = ZoneInfo("Europe/Paris")

COLLECT_HOURS = (6, 19)

API_TIMEOUT_S = 60
PAUSE_BETWEEN_CALLS_S = 1.0
USER_AGENT = "gabin-meteo-classique-collecte/1.0"

# Variables demandées à l'API. La nébulosité stockée est le max des couches.
HOURLY_CORE = (
    "wind_speed_10m",
    "wind_gusts_10m",
    "wind_direction_10m",
    "temperature_2m",
    "precipitation",
    "dew_point_2m",
    "surface_pressure",
)
HOURLY_CLOUD = (
    "cloud_cover",
    "cloud_cover_low",
    "cloud_cover_mid",
    "cloud_cover_high",
)
HOURLY_ALL = HOURLY_CORE + HOURLY_CLOUD

# La pression AROME HD est souvent absente : on conserve les nulls (pas 0 hPa).
KEEP_NULL_COLUMNS = frozenset({"surface_pressure_hpa"})

FORECAST_COLUMNS = (
    "run_id",
    "fetched_at",
    "spot_key",
    "model_key",
    "grid_latitude",
    "grid_longitude",
    "grid_elevation_m",
    "valid_at",
    "wind_speed_10m_kmh",
    "wind_gusts_10m_kmh",
    "wind_direction_10m_deg",
    "temperature_2m_c",
    "precipitation_mm",
    "cloud_cover_max_pct",
    "dew_point_2m_c",
    "surface_pressure_hpa",
)

STATUS_COLUMNS = (
    "run_id",
    "fetched_at",
    "spot_key",
    "model_key",
    "status",
    "http_status",
    "error_message",
    "hours_written",
    "nulls_replaced_by_zero",
    "grid_latitude",
    "grid_longitude",
    "grid_elevation_m",
)


@dataclass(frozen=True)
class ModelSpec:
    key: str
    label: str
    endpoint: str
    openmeteo_name: str
    forecast_days: int
    resolution: str
    notes: str = ""


MODELS: dict[str, ModelSpec] = {
    "AROMEHD": ModelSpec(
        key="AROMEHD",
        label="AROME HD",
        endpoint="https://api.open-meteo.com/v1/meteofrance",
        openmeteo_name="arome_france_hd",
        forecast_days=3,
        resolution="0.01° (~1,3 km)",
        notes="Nébulosité totale souvent absente : max des couches. Pression absente.",
    ),
    "ARPEGE": ModelSpec(
        key="ARPEGE",
        label="ARPEGE Europe",
        endpoint="https://api.open-meteo.com/v1/meteofrance",
        openmeteo_name="arpege_europe",
        forecast_days=4,
        resolution="0.1° (~11 km)",
    ),
    "IFS": ModelSpec(
        key="IFS",
        label="IFS HRES",
        endpoint="https://api.open-meteo.com/v1/ecmwf",
        openmeteo_name="ecmwf_ifs",
        forecast_days=10,
        resolution="~9 km",
    ),
}

MODEL_ORDER = tuple(MODELS)
