from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from database import commit_or_rollback, get_db
from models import (
    AuditEvent,
    Award,
    Bid,
    BidRevealRecord,
    BlockchainTransaction,
    DecisionRecord,
    ReviewDecision,
    RiskAssessment,
    Tender,
    User,
)
from routes.auth import get_current_user, user_has_role
from schemas.tender import TenderResponse
from schemas.workflow import (
    AuditEventResponse,
    AwardProcessRequest,
    AwardResponse,
    BlockchainTransactionResponse,
    DecisionRecordResponse,
    ReviewDecisionCreate,
    ReviewDecisionResponse,
    RiskAssessmentCreate,
    RiskAssessmentResponse,
)

router = APIRouter(tags=["tender workflow"])
DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
PositiveTenderId = Annotated[int, Path(gt=0)]
PageLimit = Annotated[int, Query(ge=1, le=100)]
PageOffset = Annotated[int, Query(ge=0)]
SENSITIVE_VIEW_ROLES = ("reviewer", "admin", "auditor")


def _get_tender(db: Session, tender_id: int) -> Tender:
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if tender is None:
        raise HTTPException(status_code=404, detail="Tender not found")
    return tender


def _is_tender_issuer(db: Session, user: User, tender: Tender) -> bool:
    return user_has_role(db, user, "issuer") and tender.creator_id == user.id


def _can_view_tender_records(db: Session, user: User, tender: Tender) -> bool:
    return _is_tender_issuer(db, user, tender) or any(
        user_has_role(db, user, role) for role in SENSITIVE_VIEW_ROLES
    )


def _require_record_access(db: Session, user: User, tender: Tender) -> None:
    if not _can_view_tender_records(db, user, tender):
        raise HTTPException(status_code=403, detail="You cannot access this tender's protected records")


def _persist(db: Session) -> None:
    try:
        commit_or_rollback(db)
    except Exception:
        db.rollback()
        raise


def _deadline_passed(tender: Tender) -> bool:
    deadline = tender.submission_deadline
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) > deadline


@router.post("/tenders/{tender_id}/close-bidding", response_model=TenderResponse)
def close_bidding(tender_id: PositiveTenderId, db: DatabaseSession, user: CurrentUser):
    tender = _get_tender(db, tender_id)
    if not _is_tender_issuer(db, user, tender):
        raise HTTPException(status_code=403, detail="Only the tender issuer can close bidding")
    if tender.status != "open":
        raise HTTPException(status_code=409, detail="Tender is not open for bidding")
    if not _deadline_passed(tender):
        raise HTTPException(status_code=409, detail="Bidding cannot close before the submission deadline")

    tender.status = "closed"
    db.add(AuditEvent(
        tender_id=tender.id,
        actor_user_id=user.id,
        event_type="BIDDING_CLOSED",
        payload={"submission_deadline": tender.submission_deadline.isoformat()},
    ))
    _persist(db)
    db.refresh(tender)
    return tender


@router.post("/tenders/{tender_id}/close-reveal", response_model=TenderResponse)
def close_reveal(tender_id: PositiveTenderId, db: DatabaseSession, user: CurrentUser):
    tender = _get_tender(db, tender_id)
    if not _is_tender_issuer(db, user, tender):
        raise HTTPException(status_code=403, detail="Only the tender issuer can close the reveal stage")
    if tender.status not in {"open", "closed", "revealing"}:
        raise HTTPException(status_code=409, detail="Tender is not in a closable reveal stage")
    if not _deadline_passed(tender):
        raise HTTPException(status_code=409, detail="The reveal stage cannot close before bidding ends")

    tender.status = "under_review"
    db.add(AuditEvent(
        tender_id=tender.id,
        actor_user_id=user.id,
        event_type="REVEAL_STAGE_CLOSED",
    ))
    _persist(db)
    db.refresh(tender)
    return tender


@router.get("/tenders/{tender_id}/risk-assessments", response_model=list[RiskAssessmentResponse])
def list_risk_assessments(
    tender_id: PositiveTenderId,
    db: DatabaseSession,
    user: CurrentUser,
    limit: PageLimit = 20,
    offset: PageOffset = 0,
):
    tender = _get_tender(db, tender_id)
    _require_record_access(db, user, tender)
    return (
        db.query(RiskAssessment)
        .filter(RiskAssessment.tender_id == tender_id)
        .order_by(RiskAssessment.created_at.desc(), RiskAssessment.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.post(
    "/tenders/{tender_id}/risk-assessments",
    response_model=RiskAssessmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def record_risk_assessment(
    tender_id: PositiveTenderId,
    payload: RiskAssessmentCreate,
    db: DatabaseSession,
    user: CurrentUser,
):
    tender = _get_tender(db, tender_id)
    if not _is_tender_issuer(db, user, tender):
        raise HTTPException(status_code=403, detail="Only the tender issuer can record risk assessments")
    if payload.phase == "pre_tender":
        has_bids = db.query(Bid.id).filter(Bid.tender_id == tender_id).first() is not None
        if tender.status != "open" or has_bids:
            raise HTTPException(status_code=409, detail="Pre-tender assessment is closed")
    elif tender.status not in {"under_review", "frozen"}:
        raise HTTPException(status_code=409, detail="Post-reveal assessment requires a closed reveal stage")

    assessment = RiskAssessment(
        tender_id=tender.id,
        assessed_by_user_id=user.id,
        **payload.model_dump(),
    )
    db.add(assessment)
    try:
        db.flush()
        db.add(AuditEvent(
            tender_id=tender.id,
            actor_user_id=user.id,
            event_type="RISK_ASSESSMENT_RECORDED",
            payload={
                "assessment_id": assessment.id,
                "phase": assessment.phase,
                "status": assessment.status,
                "risk_score": assessment.risk_score,
                "report_hash": assessment.report_hash,
            },
        ))
        _persist(db)
    except Exception:
        db.rollback()
        raise
    db.refresh(assessment)
    return assessment


@router.get("/tenders/{tender_id}/reviews", response_model=list[ReviewDecisionResponse])
def list_reviews(
    tender_id: PositiveTenderId,
    db: DatabaseSession,
    user: CurrentUser,
    limit: PageLimit = 20,
    offset: PageOffset = 0,
):
    tender = _get_tender(db, tender_id)
    _require_record_access(db, user, tender)
    return (
        db.query(ReviewDecision)
        .filter(ReviewDecision.tender_id == tender_id)
        .order_by(ReviewDecision.created_at.desc(), ReviewDecision.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.post(
    "/tenders/{tender_id}/reviews",
    response_model=ReviewDecisionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_review_decision(
    tender_id: PositiveTenderId,
    payload: ReviewDecisionCreate,
    db: DatabaseSession,
    user: CurrentUser,
):
    tender = _get_tender(db, tender_id)
    if not user_has_role(db, user, "reviewer"):
        raise HTTPException(status_code=403, detail="An active reviewer role is required")
    if tender.status == "awarded":
        raise HTTPException(status_code=409, detail="An awarded tender cannot be reviewed or frozen")
    if payload.decision == "unfreeze":
        raise HTTPException(status_code=409, detail="The TenderGuard contract has no unfreeze operation")
    if payload.decision == "freeze":
        if tender.status == "frozen":
            raise HTTPException(status_code=409, detail="Tender is already frozen")
        tender.status = "frozen"
    elif tender.status != "under_review":
        raise HTTPException(status_code=409, detail="Review decisions require the under-review state")

    decision = ReviewDecision(
        tender_id=tender.id,
        reviewer_user_id=user.id,
        **payload.model_dump(),
    )
    db.add(decision)
    try:
        db.flush()
        db.add(AuditEvent(
            tender_id=tender.id,
            actor_user_id=user.id,
            event_type="REVIEW_DECISION_RECORDED",
            payload={"review_id": decision.id, "decision": decision.decision},
        ))
        _persist(db)
    except Exception:
        db.rollback()
        raise
    db.refresh(decision)
    return decision


@router.get("/tenders/{tender_id}/decisions", response_model=list[DecisionRecordResponse])
def list_decisions(
    tender_id: PositiveTenderId,
    db: DatabaseSession,
    user: CurrentUser,
    limit: PageLimit = 20,
    offset: PageOffset = 0,
):
    tender = _get_tender(db, tender_id)
    _require_record_access(db, user, tender)
    return (
        db.query(DecisionRecord)
        .filter(DecisionRecord.tender_id == tender_id)
        .order_by(DecisionRecord.created_at.desc(), DecisionRecord.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/tenders/{tender_id}/award", response_model=AwardResponse)
def get_award(tender_id: PositiveTenderId, db: DatabaseSession, user: CurrentUser):
    tender = _get_tender(db, tender_id)
    _require_record_access(db, user, tender)
    award = db.query(Award).filter(Award.tender_id == tender_id).first()
    if award is None:
        raise HTTPException(status_code=404, detail="Award not found")
    return award


@router.post("/tenders/{tender_id}/award", response_model=AwardResponse, status_code=status.HTTP_201_CREATED)
def process_award(
    tender_id: PositiveTenderId,
    payload: AwardProcessRequest,
    db: DatabaseSession,
    user: CurrentUser,
):
    tender = _get_tender(db, tender_id)
    if not _is_tender_issuer(db, user, tender):
        raise HTTPException(status_code=403, detail="Only the tender issuer can process the award")
    if tender.status == "frozen":
        raise HTTPException(status_code=409, detail="A frozen tender cannot be awarded")
    if tender.status != "under_review":
        raise HTTPException(status_code=409, detail="Tender must be under review before award")
    if db.query(Award.id).filter(Award.tender_id == tender_id).first() is not None:
        raise HTTPException(status_code=409, detail="Tender already has an award")

    candidate = (
        db.query(Bid, BidRevealRecord)
        .join(BidRevealRecord, BidRevealRecord.bid_id == Bid.id)
        .filter(Bid.tender_id == tender_id, Bid.is_revealed.is_(True), BidRevealRecord.revealed_amount > 0)
        .order_by(BidRevealRecord.revealed_amount.asc(), Bid.submitted_at.asc(), Bid.id.asc())
        .first()
    )
    if candidate is None:
        raise HTTPException(status_code=409, detail="No valid revealed bids are available")
    winning_bid, reveal_record = candidate
    decision = DecisionRecord(
        tender_id=tender.id,
        actor_user_id=user.id,
        decision_type="award",
        proof_hash=payload.proof_hash,
        details=payload.details,
    )
    db.add(decision)
    try:
        db.flush()
        award = Award(
            tender_id=tender.id,
            winning_bid_id=winning_bid.id,
            decision_record_id=decision.id,
            awarded_by_user_id=user.id,
            amount=Decimal(reveal_record.revealed_amount),
        )
        db.add(award)
        tender.status = "awarded"
        db.add(AuditEvent(
            tender_id=tender.id,
            actor_user_id=user.id,
            event_type="AWARD_RECORDED",
            payload={"award_bid_id": winning_bid.id, "amount": str(award.amount)},
        ))
        _persist(db)
    except Exception:
        db.rollback()
        raise
    db.refresh(award)
    return award


@router.get("/tenders/{tender_id}/audit-events", response_model=list[AuditEventResponse])
def list_audit_events(
    tender_id: PositiveTenderId,
    db: DatabaseSession,
    user: CurrentUser,
    limit: PageLimit = 50,
    offset: PageOffset = 0,
):
    tender = _get_tender(db, tender_id)
    _require_record_access(db, user, tender)
    return (
        db.query(AuditEvent)
        .filter(AuditEvent.tender_id == tender_id)
        .order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get(
    "/tenders/{tender_id}/blockchain-transactions",
    response_model=list[BlockchainTransactionResponse],
)
def list_blockchain_transactions(
    tender_id: PositiveTenderId,
    db: DatabaseSession,
    user: CurrentUser,
    tx_status: Annotated[Literal["pending", "submitted", "confirmed", "failed"] | None, Query(alias="status")] = None,
    limit: PageLimit = 50,
    offset: PageOffset = 0,
):
    tender = _get_tender(db, tender_id)
    _require_record_access(db, user, tender)
    query = db.query(BlockchainTransaction).filter(BlockchainTransaction.tender_id == tender_id)
    if tx_status is not None:
        query = query.filter(BlockchainTransaction.status == tx_status)
    return (
        query.order_by(BlockchainTransaction.created_at.desc(), BlockchainTransaction.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/blockchain-transactions/{transaction_id}", response_model=BlockchainTransactionResponse)
def get_blockchain_transaction(
    transaction_id: Annotated[int, Path(gt=0)],
    db: DatabaseSession,
    user: CurrentUser,
):
    transaction = db.query(BlockchainTransaction).filter(BlockchainTransaction.id == transaction_id).first()
    if transaction is None:
        raise HTTPException(status_code=404, detail="Blockchain transaction record not found")
    _require_record_access(db, user, transaction.tender)
    return transaction