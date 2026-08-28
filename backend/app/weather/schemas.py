from pydantic import BaseModel


class WeatherResponse(BaseModel):
    latitude: float
    longitude: float
    temperature_c: int
    condition: str
    weather_code: int
    wind_kmh: int | None
    wind_direction_deg: int | None
    wind_direction: str | None
    precipitation_mm: float | None
    location_id: int | None = None
    vessel_name: str | None = None
    location_name: str | None = None
