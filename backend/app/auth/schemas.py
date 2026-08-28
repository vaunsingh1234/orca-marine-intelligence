from pydantic import BaseModel, Field, field_validator, model_validator


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=1)
    email: str | None = None
    phone_number: str | None = None
    password: str = Field(min_length=1)

    @field_validator("full_name", "password")
    @classmethod
    def require_non_empty(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("This field is required")
        return stripped

    @field_validator("email", "phone_number")
    @classmethod
    def empty_to_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        return value.lower() if value else None

    @model_validator(mode="after")
    def require_email_or_phone(self) -> "RegisterRequest":
        if not self.email and not self.phone_number:
            raise ValueError("At least one of email or phone_number must be provided")
        return self


class LoginRequest(BaseModel):
    identifier: str = Field(min_length=1)
    password: str = Field(min_length=1)

    @field_validator("identifier", "password")
    @classmethod
    def require_non_empty(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("This field is required")
        return stripped


class AuthUserResponse(BaseModel):
    id: int
    full_name: str
    email: str | None
    phone_number: str | None
    is_verified: bool


class AuthSuccessResponse(BaseModel):
    status: str = "ok"
    user: AuthUserResponse
