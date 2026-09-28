from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class TenderCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    budget: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    category: str = Field(min_length=1, max_length=100)
    submission_deadline: datetime


class TenderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    budget: Decimal
    category: str
    submission_deadline: datetime
    status: str
    creator_id: int
    created_at: datetime