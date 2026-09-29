import os
import unittest
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from pydantic import ValidationError
from sqlalchemy import create_engine, event
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("JWT_SECRET", "database-test-jwt-secret-at-least-32-bytes")
os.environ.setdefault("BID_ENCRYPTION_KEY", "database-test-encryption-key-at-least-32-bytes")

from database import Base, commit_or_rollback
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
    UserRoleGrant,
)
from schemas.workflow import BlockchainTransactionCreate, RiskAssessmentCreate


class DatabaseLayerTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )

        @event.listens_for(self.engine, "connect")
        def enable_foreign_keys(connection, connection_record):
            cursor = connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine, autoflush=False)
        self.db = self.session_factory()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def create_user(self, email: str, role: str = "bidder") -> User:
        user = User(
            name=role.title(),
            email=email,
            hashed_password="test-hash-not-a-credential",
            role=role,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def create_tender(self, issuer: User) -> Tender:
        tender = Tender(
            title="Database test tender",
            description="In-memory relationship fixture",
            budget=Decimal("1000.00"),
            category="Testing",
            submission_deadline=datetime.now(timezone.utc) + timedelta(days=1),
            creator_id=issuer.id,
        )
        self.db.add(tender)
        self.db.commit()
        self.db.refresh(tender)
        return tender

    def create_bid(self, tender: Tender, bidder: User) -> Bid:
        bid = Bid(
            tender_id=tender.id,
            bidder_id=bidder.id,
            encrypted_amount="ciphertext-fixture",
            commitment_hash="a" * 64,
        )
        self.db.add(bid)
        self.db.commit()
        self.db.refresh(bid)
        return bid

    def test_workflow_records_and_relationships_round_trip(self):
        issuer = self.create_user("issuer@example.test", "issuer")
        bidder = self.create_user("bidder@example.test")
        reviewer = self.create_user("reviewer@example.test")
        tender = self.create_tender(issuer)
        bid = self.create_bid(tender, bidder)
        report_hash = "0x" + "1" * 64
        tx_hash = "0x" + "2" * 64

        role_grant = UserRoleGrant(
            user_id=reviewer.id,
            role="reviewer",
            granted_by_user_id=issuer.id,
        )
        assessment = RiskAssessment(
            tender_id=tender.id,
            phase="post_reveal",
            status="completed",
            risk_score=35,
            report_hash=report_hash,
            summary="Assessment fixture",
            metrics={"variance": 0.2},
            assessed_by_user_id=reviewer.id,
        )
        review = ReviewDecision(
            tender_id=tender.id,
            reviewer_user_id=reviewer.id,
            decision="freeze",
            notes="Manual review fixture",
            evidence_hash=report_hash,
        )
        decision = DecisionRecord(
            tender_id=tender.id,
            actor_user_id=issuer.id,
            decision_type="award",
            proof_hash=report_hash,
            details={"reason": "test fixture"},
        )
        self.db.add(decision)
        self.db.flush()
        award = Award(
            tender_id=tender.id,
            winning_bid_id=bid.id,
            decision_record_id=decision.id,
            awarded_by_user_id=issuer.id,
            amount=Decimal("900.00"),
        )
        transaction = BlockchainTransaction(
            tender_id=tender.id,
            bid_id=bid.id,
            submitted_by_user_id=issuer.id,
            chain_id=1687,
            contract_address="0x" + "3" * 40,
            action="award_recorded",
            status="confirmed",
            transaction_hash=tx_hash,
            block_number=42,
            block_hash="0x" + "4" * 64,
            confirmations=3,
        )
        event_record = AuditEvent(
            tender_id=tender.id,
            actor_user_id=issuer.id,
            event_type="AWARD_RECORDED",
            payload={"bid_id": bid.id},
            previous_hash="5" * 64,
            event_hash="6" * 64,
        )
        reveal_record = BidRevealRecord(
            bid_id=bid.id,
            revealed_by_user_id=bidder.id,
            revealed_amount=Decimal("900.00"),
        )
        self.db.add_all([role_grant, assessment, review, award, transaction, event_record, reveal_record])
        commit_or_rollback(self.db)

        self.assertEqual(tender.creator.email, issuer.email)
        self.assertEqual(tender.bids[0].bidder.email, bidder.email)
        self.assertEqual(tender.risk_assessments[0].assessor.email, reviewer.email)
        self.assertEqual(tender.review_decisions[0].reviewer.email, reviewer.email)
        self.assertEqual(tender.award.winning_bid.id, bid.id)
        self.assertEqual(tender.award.decision.decision_type, "award")
        self.assertEqual(tender.blockchain_transactions[0].transaction_hash, tx_hash)
        self.assertEqual(tender.audit_events[0].payload["bid_id"], bid.id)
        self.assertEqual(bid.reveal_records[0].revealed_amount, Decimal("900.00"))
        self.assertEqual(bidder.bid_reveals[0].bid_id, bid.id)
        self.assertEqual(reviewer.additional_roles[0].role, "reviewer")
        self.assertIsNotNone(award.awarded_at)
        self.assertEqual(award.amount, Decimal("900.00"))

    def test_existing_core_uniqueness_constraints_remain_enforced(self):
        issuer = self.create_user("unique-issuer@example.test", "issuer")
        bidder = self.create_user("unique-bidder@example.test")
        tender = self.create_tender(issuer)
        self.create_bid(tender, bidder)

        duplicate_user = User(
            name="Duplicate",
            email=issuer.email,
            hashed_password="test-hash",
            role="bidder",
        )
        self.db.add(duplicate_user)
        with self.assertRaises(IntegrityError):
            commit_or_rollback(self.db)
        self.assertEqual(self.db.query(User).filter_by(email=issuer.email).count(), 1)

        duplicate_bid = Bid(
            tender_id=tender.id,
            bidder_id=bidder.id,
            encrypted_amount="other-ciphertext",
            commitment_hash="b" * 64,
        )
        self.db.add(duplicate_bid)
        with self.assertRaises(IntegrityError):
            commit_or_rollback(self.db)
        self.assertEqual(self.db.query(Bid).filter_by(tender_id=tender.id).count(), 1)

    def test_role_grant_uniqueness_and_role_check(self):
        user = self.create_user("grant-user@example.test")
        self.db.add(UserRoleGrant(user_id=user.id, role="reviewer"))
        commit_or_rollback(self.db)

        self.db.add(UserRoleGrant(user_id=user.id, role="reviewer"))
        with self.assertRaises(IntegrityError):
            commit_or_rollback(self.db)

        self.db.add(UserRoleGrant(user_id=user.id, role="issuer"))
        with self.assertRaises(IntegrityError):
            commit_or_rollback(self.db)

    def test_assessment_constraints_reject_invalid_score_or_orphan_tender(self):
        issuer = self.create_user("assessment-issuer@example.test", "issuer")
        tender = self.create_tender(issuer)
        self.db.add(
            RiskAssessment(
                tender_id=tender.id,
                phase="pre_tender",
                status="completed",
                risk_score=101,
            )
        )
        with self.assertRaises(IntegrityError):
            commit_or_rollback(self.db)

        self.db.add(
            RiskAssessment(
                tender_id=99999,
                phase="pre_tender",
                status="completed",
                risk_score=50,
            )
        )
        with self.assertRaises(IntegrityError):
            commit_or_rollback(self.db)

    def test_award_and_chain_constraints(self):
        issuer = self.create_user("award-issuer@example.test", "issuer")
        bidder = self.create_user("award-bidder@example.test")
        tender = self.create_tender(issuer)
        bid = self.create_bid(tender, bidder)
        decision = DecisionRecord(
            tender_id=tender.id,
            actor_user_id=issuer.id,
            decision_type="award",
        )
        self.db.add(decision)
        self.db.flush()
        award = Award(
            tender_id=tender.id,
            winning_bid_id=bid.id,
            decision_record_id=decision.id,
            awarded_by_user_id=issuer.id,
            amount=Decimal("100.00"),
        )
        self.db.add(award)
        commit_or_rollback(self.db)

        second_award = Award(
            tender_id=tender.id,
            winning_bid_id=bid.id,
            decision_record_id=decision.id,
            awarded_by_user_id=issuer.id,
            amount=Decimal("100.00"),
        )
        self.db.add(second_award)
        with self.assertRaises(IntegrityError):
            commit_or_rollback(self.db)

        invalid_confirmed_tx = BlockchainTransaction(
            tender_id=tender.id,
            chain_id=1687,
            action="award_recorded",
            status="confirmed",
        )
        self.db.add(invalid_confirmed_tx)
        with self.assertRaises(IntegrityError):
            commit_or_rollback(self.db)

    def test_schema_validates_risk_and_transaction_state(self):
        with self.assertRaises(ValidationError):
            RiskAssessmentCreate(phase="pre_tender", status="completed")
        with self.assertRaises(ValidationError):
            BlockchainTransactionCreate(chain_id=1, action="bid_committed", status="confirmed")

        valid_tx = BlockchainTransactionCreate(
            chain_id=1,
            action="bid_committed",
            status="confirmed",
            transaction_hash="0x" + "a" * 64,
        )
        self.assertEqual(valid_tx.status, "confirmed")


if __name__ == "__main__":
    unittest.main()