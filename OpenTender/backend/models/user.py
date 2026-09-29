from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, Integer, String, func
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role IN ('issuer', 'bidder')", name="ck_user_role"),)

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="bidder")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    tenders = relationship("Tender", back_populates="creator")
    bids = relationship("Bid", back_populates="bidder")
    bid_reveals = relationship(
        "BidRevealRecord",
        foreign_keys="BidRevealRecord.revealed_by_user_id",
        back_populates="revealed_by",
    )
    additional_roles = relationship(
        "UserRoleGrant",
        foreign_keys="UserRoleGrant.user_id",
        back_populates="user",
    )
    risk_assessments = relationship(
        "RiskAssessment",
        foreign_keys="RiskAssessment.assessed_by_user_id",
        back_populates="assessor",
    )
    review_decisions = relationship(
        "ReviewDecision",
        foreign_keys="ReviewDecision.reviewer_user_id",
        back_populates="reviewer",
    )
    decision_records = relationship(
        "DecisionRecord",
        foreign_keys="DecisionRecord.actor_user_id",
        back_populates="actor",
    )
    awards = relationship(
        "Award",
        foreign_keys="Award.awarded_by_user_id",
        back_populates="awarded_by",
    )
    audit_events = relationship(
        "AuditEvent",
        foreign_keys="AuditEvent.actor_user_id",
        back_populates="actor",
    )