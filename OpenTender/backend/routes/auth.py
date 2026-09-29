import hmac
import os
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Path, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import commit_or_rollback, get_db
from models import User, UserRoleGrant
from schemas.user import AuthResponse, LoginRequest, UserCreate, UserProfileResponse, UserResponse
from schemas.workflow import UserRoleGrantCreate, UserRoleGrantResponse
from services.security import create_access_token, decode_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["authentication"])
bearer_scheme = HTTPBearer(auto_error=False)
DatabaseSession = Annotated[Session, Depends(get_db)]


def user_has_role(db: Session, user: User, role: str) -> bool:
    if user.role == role:
        return True
    return (
        db.query(UserRoleGrant.id)
        .filter(
            UserRoleGrant.user_id == user.id,
            UserRoleGrant.role == role,
            UserRoleGrant.is_active.is_(True),
        )
        .first()
        is not None
    )


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
        commit_or_rollback(db)
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
    token = (
        credentials.credentials
        if credentials is not None and credentials.scheme.lower() == "bearer"
        else None
    )
    user_id = decode_access_token(token) if token else None
    user = db.query(User).filter(User.id == user_id).first() if user_id is not None else None
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/me", response_model=UserProfileResponse)
def get_profile(db: DatabaseSession, user: CurrentUser):
    additional_roles = [
        grant.role
        for grant in db.query(UserRoleGrant)
        .filter(UserRoleGrant.user_id == user.id, UserRoleGrant.is_active.is_(True))
        .order_by(UserRoleGrant.role)
        .all()
    ]
    return UserProfileResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        roles=sorted({user.role, *additional_roles}),
    )


@router.put("/users/{user_id}/roles", response_model=UserRoleGrantResponse)
def grant_additional_role(
    user_id: Annotated[int, Path(gt=0)],
    payload: UserRoleGrantCreate,
    db: DatabaseSession,
    actor: CurrentUser,
):
    if not user_has_role(db, actor, "admin"):
        raise HTTPException(status_code=403, detail="Only administrators can grant supplemental roles")
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")

    grant = (
        db.query(UserRoleGrant)
        .filter(UserRoleGrant.user_id == user_id, UserRoleGrant.role == payload.role)
        .first()
    )
    if grant is not None and grant.is_active:
        return grant
    if grant is None:
        grant = UserRoleGrant(
            user_id=user_id,
            role=payload.role,
            granted_by_user_id=actor.id,
            is_active=True,
        )
        db.add(grant)
    else:
        grant.is_active = True
        grant.granted_by_user_id = actor.id
    try:
        commit_or_rollback(db)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="This role grant already exists")
    db.refresh(grant)
    return grant


@router.delete("/users/{user_id}/roles/{role}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_additional_role(
    user_id: Annotated[int, Path(gt=0)],
    role: Annotated[Literal["reviewer", "admin", "auditor"], Path()],
    db: DatabaseSession,
    actor: CurrentUser,
):
    if not user_has_role(db, actor, "admin"):
        raise HTTPException(status_code=403, detail="Only administrators can revoke supplemental roles")
    grant = (
        db.query(UserRoleGrant)
        .filter(
            UserRoleGrant.user_id == user_id,
            UserRoleGrant.role == role,
            UserRoleGrant.is_active.is_(True),
        )
        .first()
    )
    if grant is None:
        raise HTTPException(status_code=404, detail="Active role grant not found")
    if role == "admin":
        admin_count = (
            db.query(UserRoleGrant.id)
            .filter(UserRoleGrant.role == "admin", UserRoleGrant.is_active.is_(True))
            .count()
        )
        if admin_count <= 1:
            raise HTTPException(status_code=409, detail="Cannot revoke the last active administrator")
    grant.is_active = False
    commit_or_rollback(db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)