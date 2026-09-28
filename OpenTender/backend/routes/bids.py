from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import Bid, Tender, User
from routes.auth import get_current_user
from schemas.bid import BidCreate, BidResponse, BidReveal, BidSubmitted
from services.security import commitment_matches, create_commitment, decrypt_amount, encrypt_amount

router = APIRouter(tags=["bids"])
DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def _deadline_has_passed(deadline: datetime) -> bool:
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) > deadline


@router.post(
    "/tenders/{tender_id}/bids",
    response_model=BidSubmitted,
    status_code=status.HTTP_201_CREATED,
)
def submit_bid(tender_id: int, payload: BidCreate, db: DatabaseSession, user: CurrentUser):
    if user.role != "bidder":
        raise HTTPException(status_code=403, detail="Only bidders can submit bids")
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if tender is None:
        raise HTTPException(status_code=404, detail="Tender not found")
    if tender.status != "open" or _deadline_has_passed(tender.submission_deadline):
        raise HTTPException(status_code=400, detail="This tender is no longer accepting bids")

    amount = format(payload.amount, "f")
    commitment_hash = create_commitment(amount, payload.nonce)
    bid = Bid(
        tender_id=tender.id,
        bidder_id=user.id,
        encrypted_amount=encrypt_amount(amount),
        commitment_hash=commitment_hash,
    )
    db.add(bid)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="You have already bid on this tender")
    db.refresh(bid)
    return BidSubmitted(
        id=bid.id,
        commitment_hash=bid.commitment_hash,
        message="Bid stored. Keep your nonce private; it is required to reveal your bid after the deadline.",
    )


@router.get("/tenders/{tender_id}/bids", response_model=list[BidResponse])
def list_tender_bids(tender_id: int, db: DatabaseSession, user: CurrentUser):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if tender is None:
        raise HTTPException(status_code=404, detail="Tender not found")
    if user.role != "issuer" or tender.creator_id != user.id:
        raise HTTPException(status_code=403, detail="Only the tender issuer can view its bids")

    bids = db.query(Bid).filter(Bid.tender_id == tender_id).order_by(Bid.submitted_at).all()
    return [
        BidResponse(
            id=bid.id,
            tender_id=bid.tender_id,
            bidder_id=bid.bidder_id,
            commitment_hash=bid.commitment_hash,
            is_revealed=bid.is_revealed,
            submitted_at=bid.submitted_at,
            amount=Decimal(decrypt_amount(bid.encrypted_amount)) if bid.is_revealed else None,
        )
        for bid in bids
    ]


@router.post("/bids/{bid_id}/reveal", response_model=BidResponse)
def reveal_bid(bid_id: int, payload: BidReveal, db: DatabaseSession, user: CurrentUser):
    bid = db.query(Bid).filter(Bid.id == bid_id).first()
    if bid is None:
        raise HTTPException(status_code=404, detail="Bid not found")
    if bid.bidder_id != user.id or user.role != "bidder":
        raise HTTPException(status_code=403, detail="Only the bidder can reveal this bid")
    if not _deadline_has_passed(bid.tender.submission_deadline):
        raise HTTPException(status_code=400, detail="Bids can only be revealed after the deadline")

    amount = decrypt_amount(bid.encrypted_amount)
    if not commitment_matches(amount, payload.nonce, bid.commitment_hash):
        raise HTTPException(status_code=400, detail="Nonce does not match this bid commitment")
    bid.is_revealed = True
    db.commit()
    db.refresh(bid)
    return BidResponse(
        id=bid.id,
        tender_id=bid.tender_id,
        bidder_id=bid.bidder_id,
        commitment_hash=bid.commitment_hash,
        is_revealed=True,
        submitted_at=bid.submitted_at,
        amount=Decimal(amount),
    )