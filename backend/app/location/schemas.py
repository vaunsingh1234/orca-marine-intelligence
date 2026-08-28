from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LocationCreate(BaseModel):
    vessel_name: str = Field(min_length=1)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    location_name: str | None = None

    @field_validator("vessel_name")
    @classmethod
    def require_non_empty(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("This field is required")
        return stripped

    @field_validator("location_name")
    @classmethod
    def empty_to_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class LocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vessel_name: str
    latitude: float
    longitude: float
    location_name: str | None
    created_at: datetime
