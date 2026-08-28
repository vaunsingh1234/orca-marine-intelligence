from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.location.models import Location
from app.weather.open_meteo import WeatherUpstreamError, fetch_weather
from app.weather.schemas import WeatherResponse

router = APIRouter(tags=["weather"])


@router.get("")
def weather_by_coordinates(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
) -> WeatherResponse:
    return _load_weather(latitude, longitude)


@router.get("/location/{location_id}")
def weather_by_location(
    location_id: int,
    db: Session = Depends(get_db),
) -> WeatherResponse:
    location = db.get(Location, location_id)
    if location is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    weather = _load_weather(location.latitude, location.longitude)
    weather.location_id = location.id
    weather.vessel_name = location.vessel_name
    weather.location_name = location.location_name
    return weather


def _load_weather(latitude: float, longitude: float) -> WeatherResponse:
    try:
        return fetch_weather(latitude, longitude)
    except WeatherUpstreamError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc) or "Weather service is unavailable.",
        ) from exc
