import hmac
import os
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas.user import AuthResponse, LoginRequest, UserCreate, UserResponse
from services.security import create_access_token, decode_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["authentication"])
bearer_scheme = HTTPBearer(auto_error=False)
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: DatabaseSession):
    if payload.role == "issuer":
        configured_key = os.getenv("ISSUER_REGISTRATION_KEY")
        if not configured_key:
            raise HTTPException(status_code=503, detail="Issuer registration is not configured")
        if len(configured_key.encode("utf-8")) < 32:
            raise HTTPException(status_code=503, detail="Issuer registration is misconfigured")
        if not payload.issuer_registration_key or not hmac.compare_digest(
            payload.issuer_registration_key, configured_key
        ):
            raise HTTPException(status_code=403, detail="Invalid issuer registration key")

    user = User(
        name=payload.name,
        email=str(payload.email).lower(),
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    db.refresh(user)
    return user


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: DatabaseSession):
    user = db.query(User).filter(User.email == str(payload.email).lower()).first()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account is inactive")
    return AuthResponse(access_token=create_access_token(user.id), user=user)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: DatabaseSession,
) -> User:
    user_id = decode_access_token(credentials.credentials) if credentials else None
    user = db.query(User).filter(User.id == user_id).first() if user_id is not None else None
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user