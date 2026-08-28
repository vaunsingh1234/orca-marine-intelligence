from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.location.models import Location
from app.location.schemas import LocationCreate, LocationResponse

router = APIRouter(tags=["location"])


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_location(payload: LocationCreate, db: Session = Depends(get_db)) -> LocationResponse:
    location = Location(
        vessel_name=payload.vessel_name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        location_name=payload.location_name,
    )
    db.add(location)
    db.commit()
    db.refresh(location)
    return LocationResponse.model_validate(location)


@router.get("/")
def list_locations(db: Session = Depends(get_db)) -> list[LocationResponse]:
    rows = db.scalars(select(Location).order_by(Location.created_at.desc())).all()
    return [LocationResponse.model_validate(row) for row in rows]


@router.get("/{location_id}")
def get_location(location_id: int, db: Session = Depends(get_db)) -> LocationResponse:
    location = db.get(Location, location_id)
    if location is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    return LocationResponse.model_validate(location)


@router.delete("/{location_id}")
def delete_location(location_id: int, db: Session = Depends(get_db)) -> dict[str, object]:
    location = db.get(Location, location_id)
    if location is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    db.delete(location)
    db.commit()
    return {"status": "ok", "id": location_id}
