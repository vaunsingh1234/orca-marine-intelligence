from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class VesselCreate(BaseModel):
    name: str = Field(min_length=1)
    vessel_type: str | None = None
    registration_number: str | None = None
    home_port: str | None = None

    @field_validator("name")
    @classmethod
    def require_non_empty(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("This field is required")
        return stripped

    @field_validator("vessel_type", "registration_number", "home_port")
    @classmethod
    def empty_to_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class VesselResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    vessel_type: str | None
    registration_number: str | None
    home_port: str | None
    created_at: datetime
