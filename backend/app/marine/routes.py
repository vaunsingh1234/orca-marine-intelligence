from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.marine.models import Vessel
from app.marine.schemas import VesselCreate, VesselResponse

router = APIRouter(tags=["marine"])


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_vessel(payload: VesselCreate, db: Session = Depends(get_db)) -> VesselResponse:
    if payload.registration_number:
        existing = db.scalar(
            select(Vessel).where(Vessel.registration_number == payload.registration_number)
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A vessel with this registration number already exists",
            )

    vessel = Vessel(
        name=payload.name,
        vessel_type=payload.vessel_type,
        registration_number=payload.registration_number,
        home_port=payload.home_port,
    )
    db.add(vessel)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A vessel with this registration number already exists",
        ) from None
    db.refresh(vessel)
    return VesselResponse.model_validate(vessel)


@router.get("/")
def list_vessels(db: Session = Depends(get_db)) -> list[VesselResponse]:
    rows = db.scalars(select(Vessel).order_by(Vessel.created_at.desc())).all()
    return [VesselResponse.model_validate(row) for row in rows]


@router.get("/{vessel_id}")
def get_vessel(vessel_id: int, db: Session = Depends(get_db)) -> VesselResponse:
    vessel = db.get(Vessel, vessel_id)
    if vessel is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vessel not found")
    return VesselResponse.model_validate(vessel)


@router.delete("/{vessel_id}")
def delete_vessel(vessel_id: int, db: Session = Depends(get_db)) -> dict[str, object]:
    vessel = db.get(Vessel, vessel_id)
    if vessel is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vessel not found")
    db.delete(vessel)
    db.commit()
    return {"status": "ok", "id": vessel_id}
