from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import relationship

from database import Base


class UserRoleGrant(Base):
    __tablename__ = "user_role_grants"
    __table_args__ = (
        UniqueConstraint("user_id", "role", name="uq_user_role_grant"),
        CheckConstraint(
            "role IN ('reviewer', 'admin', 'auditor')",
            name="ck_user_role_grant_role",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)
    granted_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    is_active = Column(Boolean, nullable=False, default=True, server_default=text("1"))
    granted_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    user = relationship("User", foreign_keys=[user_id], back_populates="additional_roles")
    granted_by = relationship("User", foreign_keys=[granted_by_user_id])


class BidRevealRecord(Base):
    __tablename__ = "bid_reveal_records"
    __table_args__ = (CheckConstraint("revealed_amount > 0", name="ck_revealed_amount_positive"),)

    id = Column(Integer, primary_key=True, index=True)
    bid_id = Column(Integer, ForeignKey("bids.id", ondelete="CASCADE"), nullable=False, index=True)
    revealed_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    revealed_amount = Column(Numeric(12, 2), nullable=False)
    revealed_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    bid = relationship("Bid", back_populates="reveal_records")
    revealed_by = relationship("User", foreign_keys=[revealed_by_user_id], back_populates="bid_reveals")


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"
    __table_args__ = (
        CheckConstraint(
            "phase IN ('pre_tender', 'post_reveal')",
            name="ck_risk_assessment_phase",
        ),
        CheckConstraint(
            "status IN ('pending', 'completed', 'failed')",
            name="ck_risk_assessment_status",
        ),
        CheckConstraint(
            "risk_score IS NULL OR risk_score BETWEEN 0 AND 100",
            name="ck_risk_assessment_score",
        ),
        CheckConstraint(
            "status != 'completed' OR risk_score IS NOT NULL",
            name="ck_completed_risk_has_score",
        ),
        CheckConstraint(
            "report_hash IS NULL OR length(report_hash) IN (64, 66)",
            name="ck_risk_report_hash_length",
        ),
        Index("ix_risk_assessments_tender_phase", "tender_id", "phase", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id", ondelete="RESTRICT"), nullable=False)
    phase = Column(String(20), nullable=False)
    status = Column(String(20), nullable=False, default="completed", server_default="completed")
    risk_score = Column(Integer)
    report_hash = Column(String(66))
    report_location = Column(String(500))
    summary = Column(Text)
    metrics = Column(JSON)
    provider = Column(String(100))
    assessed_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    tender = relationship("Tender", back_populates="risk_assessments")
    assessor = relationship("User", foreign_keys=[assessed_by_user_id], back_populates="risk_assessments")


class ReviewDecision(Base):
    __tablename__ = "review_decisions"
    __table_args__ = (
        CheckConstraint(
            "decision IN ('approved', 'rejected', 'needs_changes', 'freeze', 'unfreeze')",
            name="ck_review_decision_value",
        ),
        CheckConstraint(
            "evidence_hash IS NULL OR length(evidence_hash) IN (64, 66)",
            name="ck_review_evidence_hash_length",
        ),
        Index("ix_review_decisions_tender_created", "tender_id", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id", ondelete="RESTRICT"), nullable=False)
    reviewer_user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    decision = Column(String(20), nullable=False)
    notes = Column(Text)
    evidence_hash = Column(String(66))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    tender = relationship("Tender", back_populates="review_decisions")
    reviewer = relationship("User", foreign_keys=[reviewer_user_id], back_populates="review_decisions")


class DecisionRecord(Base):
    __tablename__ = "decision_records"
    __table_args__ = (
        CheckConstraint(
            "decision_type IN ('award', 'reject', 'cancel')",
            name="ck_decision_record_type",
        ),
        CheckConstraint(
            "proof_hash IS NULL OR length(proof_hash) IN (64, 66)",
            name="ck_decision_proof_hash_length",
        ),
        Index("ix_decision_records_tender_created", "tender_id", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id", ondelete="RESTRICT"), nullable=False)
    actor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    decision_type = Column(String(20), nullable=False)
    proof_hash = Column(String(66))
    details = Column(JSON)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    tender = relationship("Tender", back_populates="decision_records")
    actor = relationship("User", foreign_keys=[actor_user_id], back_populates="decision_records")
    award = relationship("Award", back_populates="decision", uselist=False)


class Award(Base):
    __tablename__ = "awards"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_award_positive_amount"),
    )

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id", ondelete="RESTRICT"), nullable=False, unique=True)
    winning_bid_id = Column(Integer, ForeignKey("bids.id", ondelete="RESTRICT"), nullable=False, unique=True)
    decision_record_id = Column(
        Integer,
        ForeignKey("decision_records.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
    )
    awarded_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    awarded_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    tender = relationship("Tender", back_populates="award")
    winning_bid = relationship("Bid", back_populates="award")
    decision = relationship("DecisionRecord", back_populates="award")
    awarded_by = relationship("User", foreign_keys=[awarded_by_user_id], back_populates="awards")


class BlockchainTransaction(Base):
    __tablename__ = "blockchain_transactions"
    __table_args__ = (
        UniqueConstraint("chain_id", "transaction_hash", name="uq_chain_transaction_hash"),
        CheckConstraint(
            "action IN ('tender_created', 'bid_committed', 'bid_revealed', 'risk_recorded', 'tender_frozen', 'award_recorded', 'decision_proof')",
            name="ck_blockchain_transaction_action",
        ),
        CheckConstraint(
            "status IN ('pending', 'submitted', 'confirmed', 'failed')",
            name="ck_blockchain_transaction_status",
        ),
        CheckConstraint(
            "transaction_hash IS NULL OR length(transaction_hash) = 66",
            name="ck_blockchain_transaction_hash_length",
        ),
        CheckConstraint(
            "contract_address IS NULL OR length(contract_address) = 42",
            name="ck_blockchain_contract_address_length",
        ),
        CheckConstraint(
            "block_hash IS NULL OR length(block_hash) = 66",
            name="ck_blockchain_block_hash_length",
        ),
        CheckConstraint("confirmations >= 0", name="ck_blockchain_confirmations_nonnegative"),
        CheckConstraint("attempt_count >= 0", name="ck_blockchain_attempts_nonnegative"),
        CheckConstraint(
            "status NOT IN ('submitted', 'confirmed') OR transaction_hash IS NOT NULL",
            name="ck_submitted_transaction_has_hash",
        ),
        Index("ix_blockchain_transactions_tender_status", "tender_id", "status"),
    )

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id", ondelete="RESTRICT"), nullable=False)
    bid_id = Column(Integer, ForeignKey("bids.id", ondelete="SET NULL"))
    submitted_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    chain_id = Column(BigInteger, nullable=False)
    contract_address = Column(String(42))
    action = Column(String(30), nullable=False)
    status = Column(String(20), nullable=False, default="pending", server_default="pending")
    transaction_hash = Column(String(66))
    block_number = Column(BigInteger)
    block_hash = Column(String(66))
    confirmations = Column(Integer, nullable=False, default=0, server_default="0")
    attempt_count = Column(Integer, nullable=False, default=0, server_default="0")
    last_error = Column(Text)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    tender = relationship("Tender", back_populates="blockchain_transactions")
    bid = relationship("Bid", back_populates="blockchain_transactions")
    submitted_by = relationship("User", foreign_keys=[submitted_by_user_id])


class AuditEvent(Base):
    __tablename__ = "audit_events"
    __table_args__ = (
        CheckConstraint(
            "event_hash IS NULL OR length(event_hash) IN (64, 66)",
            name="ck_audit_event_hash_length",
        ),
        CheckConstraint(
            "previous_hash IS NULL OR length(previous_hash) IN (64, 66)",
            name="ck_audit_previous_hash_length",
        ),
        Index("ix_audit_events_tender_created", "tender_id", "created_at"),
        UniqueConstraint("event_hash", name="uq_audit_event_hash"),
    )

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id", ondelete="RESTRICT"), nullable=False)
    actor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    event_type = Column(String(64), nullable=False)
    payload = Column(JSON)
    previous_hash = Column(String(66))
    event_hash = Column(String(66))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    tender = relationship("Tender", back_populates="audit_events")
    actor = relationship("User", foreign_keys=[actor_user_id], back_populates="audit_events")