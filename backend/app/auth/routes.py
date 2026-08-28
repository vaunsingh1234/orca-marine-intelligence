from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.schemas import AuthSuccessResponse, AuthUserResponse, LoginRequest, RegisterRequest
from app.auth.security import hash_password, verify_password
from app.db import get_db
from app.users.models import User

router = APIRouter(tags=["auth"])


def _invalid_credentials() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
    )


def _user_payload(user: User) -> AuthSuccessResponse:
    return AuthSuccessResponse(
        user=AuthUserResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            phone_number=user.phone_number,
            is_verified=user.is_verified,
        )
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthSuccessResponse:
    if payload.email:
        existing = db.scalar(select(User).where(User.email == payload.email))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            )
    if payload.phone_number:
        existing = db.scalar(select(User).where(User.phone_number == payload.phone_number))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this phone number already exists",
            )

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        phone_number=payload.phone_number,
        password_hash=hash_password(payload.password),
        is_verified=False,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email or phone number already exists",
        ) from None
    db.refresh(user)
    return _user_payload(user)


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthSuccessResponse:
    identifier = payload.identifier
    user = db.scalar(
        select(User).where(
            or_(
                User.email == identifier.lower(),
                User.phone_number == identifier,
            )
        )
    )
    if (
        user is None
        or not user.password_hash
        or not verify_password(payload.password, user.password_hash)
    ):
        raise _invalid_credentials()
    return _user_payload(user)
