from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import relationship

from database import Base
from models.utc_datetime import UTCDateTime


class Tender(Base):
    __tablename__ = "tenders"
    __table_args__ = (CheckConstraint("budget > 0", name="ck_tender_positive_budget"),)

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    budget = Column(Numeric(12, 2), nullable=False)
    category = Column(String(100), nullable=False)
    submission_deadline = Column(UTCDateTime(), nullable=False)
    status = Column(String(20), nullable=False, default="open")
    creator_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    creator = relationship("User", back_populates="tenders")
    bids = relationship("Bid", back_populates="tender")
    risk_assessments = relationship("RiskAssessment", back_populates="tender")
    review_decisions = relationship("ReviewDecision", back_populates="tender")
    decision_records = relationship("DecisionRecord", back_populates="tender")
    award = relationship("Award", back_populates="tender", uselist=False)
    blockchain_transactions = relationship("BlockchainTransaction", back_populates="tender")
    audit_events = relationship("AuditEvent", back_populates="tender")