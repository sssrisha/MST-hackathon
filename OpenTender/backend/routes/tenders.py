from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import commit_or_rollback, get_db
from models import AuditEvent, Bid, Tender, User
from routes.auth import get_current_user, user_has_role
from schemas.tender import TenderCreate, TenderResponse, TenderUpdate

router = APIRouter(prefix="/tenders", tags=["tenders"])
DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("", response_model=TenderResponse, status_code=status.HTTP_201_CREATED)
def create_tender(payload: TenderCreate, db: DatabaseSession, user: CurrentUser):
    if not user_has_role(db, user, "issuer"):
        raise HTTPException(status_code=403, detail="Only issuers can create tenders")
    deadline = payload.submission_deadline
    if deadline.tzinfo is None:
        raise HTTPException(status_code=422, detail="submission_deadline must include a timezone")
    if deadline <= datetime.now(timezone.utc):
        raise HTTPException(status_code=422, detail="submission_deadline must be in the future")

    tender = Tender(**payload.model_dump(), creator_id=user.id)
    db.add(tender)
    try:
        db.flush()
        db.add(
            AuditEvent(
                tender_id=tender.id,
                actor_user_id=user.id,
                event_type="TENDER_CREATED",
                payload={
                    "title": tender.title,
                    "category": tender.category,
                    "budget": str(tender.budget),
                },
            )
        )
        commit_or_rollback(db)
    except Exception:
        db.rollback()
        raise
    db.refresh(tender)
    return tender


@router.get("", response_model=list[TenderResponse])
def list_tenders(
    db: DatabaseSession,
    status_filter: Annotated[str | None, Query(alias="status", min_length=1, max_length=20)] = None,
    category: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    query = db.query(Tender)
    if status_filter is not None:
        query = query.filter(Tender.status == status_filter)
    if category is not None:
        query = query.filter(Tender.category == category)
    return query.order_by(Tender.created_at.desc(), Tender.id.desc()).offset(offset).limit(limit).all()


@router.get("/{tender_id}", response_model=TenderResponse)
def get_tender(tender_id: int, db: DatabaseSession):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if tender is None:
        raise HTTPException(status_code=404, detail="Tender not found")
    return tender


@router.patch("/{tender_id}", response_model=TenderResponse)
def update_tender(tender_id: int, payload: TenderUpdate, db: DatabaseSession, user: CurrentUser):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if tender is None:
        raise HTTPException(status_code=404, detail="Tender not found")
    if not user_has_role(db, user, "issuer") or tender.creator_id != user.id:
        raise HTTPException(status_code=403, detail="Only the tender issuer can update it")
    if tender.status != "open" or datetime.now(timezone.utc) >= tender.submission_deadline:
        raise HTTPException(status_code=409, detail="This tender can no longer be edited")
    if db.query(Bid.id).filter(Bid.tender_id == tender_id).first() is not None:
        raise HTTPException(status_code=409, detail="A tender with submitted bids cannot be edited")

    updates = payload.model_dump(exclude_unset=True)
    deadline = updates.get("submission_deadline")
    if deadline is not None:
        if deadline.tzinfo is None:
            raise HTTPException(status_code=422, detail="submission_deadline must include a timezone")
        if deadline <= datetime.now(timezone.utc):
            raise HTTPException(status_code=422, detail="submission_deadline must be in the future")

    try:
        for field_name, value in updates.items():
            setattr(tender, field_name, value)
        db.add(
            AuditEvent(
                tender_id=tender.id,
                actor_user_id=user.id,
                event_type="TENDER_UPDATED",
                payload={"fields": sorted(updates)},
            )
        )
        commit_or_rollback(db)
    except Exception:
        db.rollback()
        raise
    db.refresh(tender)
    return tender