import time

import httpx

from app.weather.schemas import WeatherResponse

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
CACHE_TTL_SECONDS = 5 * 60
REQUEST_TIMEOUT_SECONDS = 8.0

_cache: dict[tuple[float, float], tuple[float, WeatherResponse]] = {}

_COMPASS = (
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
)


class WeatherUpstreamError(Exception):
    pass


def compass_from_degrees(degrees: float) -> str:
    index = round(degrees / 22.5) % 16
    return _COMPASS[index]


def condition_from_code(code: int) -> str:
    if code == 0:
        return "Clear"
    if code in (1, 2):
        return "Partly cloudy"
    if code == 3:
        return "Overcast"
    if code in (45, 48):
        return "Fog"
    if 51 <= code <= 57:
        return "Drizzle"
    if code in (61, 80):
        return "Light rain"
    if (63 <= code <= 67) or code in (81, 82):
        return "Rain"
    if (71 <= code <= 77) or code in (85, 86):
        return "Snow"
    if code >= 95:
        return "Thunderstorm"
    return "Cloudy"


def _cache_key(latitude: float, longitude: float) -> tuple[float, float]:
    return (round(latitude, 3), round(longitude, 3))


def fetch_weather(latitude: float, longitude: float) -> WeatherResponse:
    key = _cache_key(latitude, longitude)
    cached = _cache.get(key)
    now = time.monotonic()
    if cached and now - cached[0] < CACHE_TTL_SECONDS:
        return cached[1].model_copy()

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,precipitation",
        "timezone": "auto",
        "wind_speed_unit": "kmh",
    }
    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = client.get(FORECAST_URL, params=params)
            response.raise_for_status()
            payload = response.json()
    except httpx.HTTPError as exc:
        raise WeatherUpstreamError("Weather service is unavailable.") from exc

    current = payload.get("current") if isinstance(payload, dict) else None
    if not isinstance(current, dict):
        raise WeatherUpstreamError("Weather response was incomplete.")

    temperature = current.get("temperature_2m")
    weather_code = current.get("weather_code")
    if not isinstance(temperature, (int, float)) or not isinstance(weather_code, (int, float)):
        raise WeatherUpstreamError("Weather response was incomplete.")

    wind = current.get("wind_speed_10m")
    wind_dir = current.get("wind_direction_10m")
    rain = current.get("precipitation")

    result = WeatherResponse(
        latitude=latitude,
        longitude=longitude,
        temperature_c=round(float(temperature)),
        condition=condition_from_code(int(weather_code)),
        weather_code=int(weather_code),
        wind_kmh=round(float(wind)) if isinstance(wind, (int, float)) else None,
        wind_direction_deg=round(float(wind_dir)) if isinstance(wind_dir, (int, float)) else None,
        wind_direction=(
            compass_from_degrees(float(wind_dir)) if isinstance(wind_dir, (int, float)) else None
        ),
        precipitation_mm=round(float(rain), 1) if isinstance(rain, (int, float)) else None,
    )
    _cache[key] = (now, result)
    return result.model_copy()
