from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Tender, User
from routes.auth import get_current_user
from schemas.tender import TenderCreate, TenderResponse

router = APIRouter(prefix="/tenders", tags=["tenders"])
DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("", response_model=TenderResponse, status_code=status.HTTP_201_CREATED)
def create_tender(payload: TenderCreate, db: DatabaseSession, user: CurrentUser):
    if user.role != "issuer":
        raise HTTPException(status_code=403, detail="Only issuers can create tenders")
    deadline = payload.submission_deadline
    if deadline.tzinfo is None:
        raise HTTPException(status_code=422, detail="submission_deadline must include a timezone")
    if deadline <= datetime.now(timezone.utc):
        raise HTTPException(status_code=422, detail="submission_deadline must be in the future")

    tender = Tender(**payload.model_dump(), creator_id=user.id)
    db.add(tender)
    db.commit()
    db.refresh(tender)
    return tender


@router.get("", response_model=list[TenderResponse])
def list_tenders(db: DatabaseSession):
    return db.query(Tender).order_by(Tender.created_at.desc()).all()