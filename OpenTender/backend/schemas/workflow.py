from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

HashValue = str


class UserRoleGrantCreate(BaseModel):
    role: Literal["reviewer", "admin", "auditor"]


class UserRoleGrantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    role: str
    granted_by_user_id: int | None
    is_active: bool
    granted_at: datetime


class BidRevealRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    bid_id: int
    revealed_by_user_id: int
    revealed_amount: Decimal
    revealed_at: datetime


class RiskAssessmentCreate(BaseModel):
    phase: Literal["pre_tender", "post_reveal"]
    status: Literal["pending", "completed", "failed"] = "completed"
    risk_score: int | None = Field(default=None, ge=0, le=100)
    report_hash: HashValue | None = Field(default=None, pattern=r"^(0x)?[0-9a-fA-F]{64}$")
    report_location: str | None = Field(default=None, max_length=500)
    summary: str | None = None
    metrics: dict[str, object] | None = None
    provider: str | None = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def completed_assessment_has_score(self):
        if self.status == "completed" and self.risk_score is None:
            raise ValueError("completed risk assessments require a score")
        return self


class RiskAssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tender_id: int
    phase: str
    status: str
    risk_score: int | None
    report_hash: str | None
    report_location: str | None
    summary: str | None
    metrics: dict[str, object] | None
    provider: str | None
    assessed_by_user_id: int | None
    created_at: datetime


class ReviewDecisionCreate(BaseModel):
    decision: Literal["approved", "rejected", "needs_changes", "freeze", "unfreeze"]
    notes: str | None = None
    evidence_hash: HashValue | None = Field(default=None, pattern=r"^(0x)?[0-9a-fA-F]{64}$")


class ReviewDecisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tender_id: int
    reviewer_user_id: int
    decision: str
    notes: str | None
    evidence_hash: str | None
    created_at: datetime


class DecisionRecordCreate(BaseModel):
    decision_type: Literal["award", "reject", "cancel"]
    proof_hash: HashValue | None = Field(default=None, pattern=r"^(0x)?[0-9a-fA-F]{64}$")
    details: dict[str, object] | None = None


class DecisionRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tender_id: int
    actor_user_id: int | None
    decision_type: str
    proof_hash: str | None
    details: dict[str, object] | None
    created_at: datetime


class AwardCreate(BaseModel):
    winning_bid_id: int = Field(gt=0)
    decision_record_id: int = Field(gt=0)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)


class AwardProcessRequest(BaseModel):
    proof_hash: HashValue | None = Field(default=None, pattern=r"^(0x)?[0-9a-fA-F]{64}$")
    details: dict[str, object] | None = None


class AwardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tender_id: int
    winning_bid_id: int
    decision_record_id: int
    awarded_by_user_id: int
    amount: Decimal
    awarded_at: datetime


class BlockchainTransactionCreate(BaseModel):
    bid_id: int | None = Field(default=None, gt=0)
    chain_id: int = Field(gt=0)
    contract_address: str | None = Field(default=None, pattern=r"^0x[0-9a-fA-F]{40}$")
    action: Literal[
        "tender_created",
        "bid_committed",
        "bid_revealed",
        "risk_recorded",
        "tender_frozen",
        "award_recorded",
        "decision_proof",
    ]
    status: Literal["pending", "submitted", "confirmed", "failed"] = "pending"
    transaction_hash: HashValue | None = Field(default=None, pattern=r"^0x[0-9a-fA-F]{64}$")
    block_number: int | None = Field(default=None, ge=0)
    block_hash: HashValue | None = Field(default=None, pattern=r"^0x[0-9a-fA-F]{64}$")
    confirmations: int = Field(default=0, ge=0)
    attempt_count: int = Field(default=0, ge=0)
    last_error: str | None = None

    @model_validator(mode="after")
    def submitted_transaction_has_hash(self):
        if self.status in {"submitted", "confirmed"} and self.transaction_hash is None:
            raise ValueError("submitted or confirmed transactions require a transaction hash")
        return self


class BlockchainTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tender_id: int
    bid_id: int | None
    submitted_by_user_id: int | None
    chain_id: int
    contract_address: str | None
    action: str
    status: str
    transaction_hash: str | None
    block_number: int | None
    block_hash: str | None
    confirmations: int
    attempt_count: int
    created_at: datetime
    updated_at: datetime


class AuditEventCreate(BaseModel):
    event_type: str = Field(min_length=1, max_length=64)
    payload: dict[str, object] | None = None
    previous_hash: HashValue | None = Field(default=None, pattern=r"^(0x)?[0-9a-fA-F]{64}$")
    event_hash: HashValue | None = Field(default=None, pattern=r"^(0x)?[0-9a-fA-F]{64}$")


class AuditEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tender_id: int
    actor_user_id: int | None
    event_type: str
    payload: dict[str, object] | None
    previous_hash: str | None
    event_hash: str | None
    created_at: datetime