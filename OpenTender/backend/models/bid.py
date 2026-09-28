from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from database import Base


class Bid(Base):
    __tablename__ = "bids"
    __table_args__ = (UniqueConstraint("tender_id", "bidder_id", name="uq_bid_tender_bidder"),)

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id", ondelete="CASCADE"), nullable=False)
    bidder_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    encrypted_amount = Column(Text, nullable=False)
    commitment_hash = Column(String(64), nullable=False, index=True)
    is_revealed = Column(Boolean, nullable=False, default=False)
    submitted_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    tender = relationship("Tender", back_populates="bids")
    bidder = relationship("User", back_populates="bids")
    reveal_records = relationship("BidRevealRecord", back_populates="bid")
    award = relationship("Award", back_populates="winning_bid", uselist=False)
    blockchain_transactions = relationship("BlockchainTransaction", back_populates="bid")