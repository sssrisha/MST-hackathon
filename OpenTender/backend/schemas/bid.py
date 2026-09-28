from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class BidCreate(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    nonce: str = Field(min_length=16, max_length=256)


class BidReveal(BaseModel):
    nonce: str = Field(min_length=16, max_length=256)


class BidResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tender_id: int
    bidder_id: int
    commitment_hash: str
    is_revealed: bool
    submitted_at: datetime
    amount: Decimal | None = None


class BidSubmitted(BaseModel):
    id: int
    commitment_hash: str
    message: str