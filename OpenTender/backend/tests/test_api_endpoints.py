import os
import unittest
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("JWT_SECRET", "api-test-jwt-secret-that-is-at-least-32-bytes")
os.environ.setdefault("BID_ENCRYPTION_KEY", "api-test-encryption-secret-at-least-32-bytes")

from database import Base
from models import (
    AuditEvent,
    Bid,
    BidRevealRecord,
    BlockchainTransaction,
    ReviewDecision,
    RiskAssessment,
    Tender,
    User,
    UserRoleGrant,
)
from routes.auth import get_profile, grant_additional_role, revoke_additional_role
from routes.bids import reveal_bid, submit_bid
from routes.tenders import create_tender, get_tender, list_tenders, update_tender
from routes.workflow import (
    close_bidding,
    close_reveal,
    create_review_decision,
    get_award,
    get_blockchain_transaction,
    list_audit_events,
    list_blockchain_transactions,
    list_decisions,
    list_reviews,
    list_risk_assessments,
    process_award,
    record_risk_assessment,
)
from schemas.bid import BidCreate, BidReveal
from schemas.tender import TenderCreate, TenderUpdate
from schemas.user import UserRoleGrantCreate
from schemas.workflow import AwardProcessRequest, ReviewDecisionCreate, RiskAssessmentCreate


class TenderApiEndpointTests(unittest.TestCase):
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
        self.db = sessionmaker(bind=self.engine, autoflush=False)()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def create_user(self, email: str, role: str = "bidder", extra_roles: tuple[str, ...] = ()) -> User:
        user = User(
            name=role.title(),
            email=email,
            hashed_password="test-fixture-hash",
            role=role,
        )
        self.db.add(user)
        self.db.flush()
        for extra_role in extra_roles:
            self.db.add(UserRoleGrant(user_id=user.id, role=extra_role))
        self.db.commit()
        self.db.refresh(user)
        return user

    def create_tender(
        self,
        issuer: User,
        *,
        title: str = "Route test tender",
        category: str = "Testing",
    ) -> Tender:
        return create_tender(
            TenderCreate(
                title=title,
                description="Isolated route test",
                budget=Decimal("1000.00"),
                category=category,
                submission_deadline=datetime.now(timezone.utc) + timedelta(days=1),
            ),
            self.db,
            issuer,
        )

    def add_bid(self, tender: Tender, bidder: User, amount: str, nonce: str):
        return submit_bid(
            tender.id,
            BidCreate(amount=Decimal(amount), nonce=nonce),
            self.db,
            bidder,
        )

    def test_profile_and_admin_role_grant_lifecycle(self):
        admin = self.create_user("api-admin@example.test", extra_roles=("admin",))
        target = self.create_user("api-target@example.test")
        non_admin = self.create_user("api-nonadmin@example.test")

        profile = get_profile(self.db, target)
        self.assertEqual(profile.roles, ["bidder"])

        with self.assertRaises(HTTPException) as error:
            grant_additional_role(target.id, UserRoleGrantCreate(role="reviewer"), self.db, non_admin)
        self.assertEqual(error.exception.status_code, 403)

        reviewer_grant = grant_additional_role(
            target.id,
            UserRoleGrantCreate(role="reviewer"),
            self.db,
            admin,
        )
        self.assertTrue(reviewer_grant.is_active)
        self.assertEqual(get_profile(self.db, target).roles, ["bidder", "reviewer"])
        revoke_additional_role(target.id, "reviewer", self.db, admin)
        self.assertEqual(get_profile(self.db, target).roles, ["bidder"])

        with self.assertRaises(HTTPException) as error:
            revoke_additional_role(admin.id, "admin", self.db, admin)
        self.assertEqual(error.exception.status_code, 409)

        with self.assertRaises(HTTPException) as error:
            grant_additional_role(99999, UserRoleGrantCreate(role="auditor"), self.db, admin)
        self.assertEqual(error.exception.status_code, 404)

    def test_tender_detail_update_filters_pagination_and_owner_checks(self):
        issuer = self.create_user("api-issuer@example.test", "issuer")
        other_issuer = self.create_user("api-other-issuer@example.test", "issuer")
        bidder = self.create_user("api-bidder@example.test")
        first = self.create_tender(issuer, title="First", category="Roads")
        second = self.create_tender(issuer, title="Second", category="Water")

        self.assertEqual(get_tender(first.id, self.db).title, "First")
        self.assertEqual([t.category for t in list_tenders(self.db, category="Roads")], ["Roads"])
        self.assertEqual(len(list_tenders(self.db, limit=1, offset=0)), 1)
        with self.assertRaises(HTTPException) as error:
            get_tender(99999, self.db)
        self.assertEqual(error.exception.status_code, 404)

        with self.assertRaises(HTTPException) as error:
            update_tender(first.id, TenderUpdate(title="Unauthorized"), self.db, other_issuer)
        self.assertEqual(error.exception.status_code, 403)

        updated = update_tender(first.id, TenderUpdate(title="Updated title"), self.db, issuer)
        self.assertEqual(updated.title, "Updated title")
        with self.assertRaises(HTTPException) as error:
            update_tender(second.id, TenderUpdate(title="Bid tender"), self.db, issuer)
        self.assertEqual(error.exception.status_code, 409)

        self.add_bid(first, bidder, "25.00", "a-private-route-nonce-00001")
        with self.assertRaises(HTTPException) as error:
            update_tender(first.id, TenderUpdate(title="After bid"), self.db, issuer)
        self.assertEqual(error.exception.status_code, 409)

    def test_bidding_and_reveal_close_transitions(self):
        issuer = self.create_user("close-issuer@example.test", "issuer")
        other_issuer = self.create_user("close-other@example.test", "issuer")
        tender = self.create_tender(issuer)

        with self.assertRaises(HTTPException) as error:
            close_bidding(tender.id, self.db, other_issuer)
        self.assertEqual(error.exception.status_code, 403)
        with self.assertRaises(HTTPException) as error:
            close_bidding(tender.id, self.db, issuer)
        self.assertEqual(error.exception.status_code, 409)

        tender.submission_deadline = datetime.now(timezone.utc) - timedelta(seconds=1)
        self.db.commit()
        self.assertEqual(close_bidding(tender.id, self.db, issuer).status, "closed")
        with self.assertRaises(HTTPException) as error:
            close_bidding(tender.id, self.db, issuer)
        self.assertEqual(error.exception.status_code, 409)

        self.assertEqual(close_reveal(tender.id, self.db, issuer).status, "under_review")
        with self.assertRaises(HTTPException) as error:
            close_reveal(tender.id, self.db, issuer)
        self.assertEqual(error.exception.status_code, 409)

    def test_risk_assessment_recording_and_confidential_retrieval(self):
        issuer = self.create_user("risk-issuer@example.test", "issuer")
        other_issuer = self.create_user("risk-other@example.test", "issuer")
        bidder = self.create_user("risk-bidder@example.test")
        reviewer = self.create_user("risk-reviewer@example.test", extra_roles=("reviewer",))
        tender = self.create_tender(issuer)

        assessment = record_risk_assessment(
            tender.id,
            RiskAssessmentCreate(phase="pre_tender", risk_score=25, summary="Operator-supplied result"),
            self.db,
            issuer,
        )
        self.assertEqual(assessment.risk_score, 25)
        self.assertEqual(len(list_risk_assessments(tender.id, self.db, reviewer)), 1)
        with self.assertRaises(HTTPException) as error:
            list_risk_assessments(tender.id, self.db, other_issuer)
        self.assertEqual(error.exception.status_code, 403)
        with self.assertRaises(HTTPException) as error:
            record_risk_assessment(
                tender.id,
                RiskAssessmentCreate(phase="pre_tender", risk_score=26),
                self.db,
                other_issuer,
            )
        self.assertEqual(error.exception.status_code, 403)
        with self.assertRaises(HTTPException) as error:
            record_risk_assessment(
                tender.id,
                RiskAssessmentCreate(phase="post_reveal", risk_score=70),
                self.db,
                issuer,
            )
        self.assertEqual(error.exception.status_code, 409)
        with self.assertRaises(HTTPException) as error:
            list_risk_assessments(tender.id, self.db, bidder)
        self.assertEqual(error.exception.status_code, 403)

    def test_reviewer_freeze_and_review_access(self):
        issuer = self.create_user("review-issuer@example.test", "issuer")
        bidder = self.create_user("review-bidder@example.test")
        reviewer = self.create_user("reviewer@example.test", extra_roles=("reviewer",))
        tender = self.create_tender(issuer)

        with self.assertRaises(HTTPException) as error:
            create_review_decision(
                tender.id,
                ReviewDecisionCreate(decision="freeze"),
                self.db,
                bidder,
            )
        self.assertEqual(error.exception.status_code, 403)

        decision = create_review_decision(
            tender.id,
            ReviewDecisionCreate(decision="freeze", notes="Manual freeze"),
            self.db,
            reviewer,
        )
        self.assertEqual(decision.decision, "freeze")
        self.assertEqual(self.db.get(Tender, tender.id).status, "frozen")
        self.assertEqual(len(list_reviews(tender.id, self.db, reviewer)), 1)
        with self.assertRaises(HTTPException) as error:
            create_review_decision(
                tender.id,
                ReviewDecisionCreate(decision="unfreeze"),
                self.db,
                reviewer,
            )
        self.assertEqual(error.exception.status_code, 409)

    def test_award_selects_lowest_revealed_bid_and_records_decision(self):
        issuer = self.create_user("award-issuer@example.test", "issuer")
        bidder_one = self.create_user("award-bidder-one@example.test")
        bidder_two = self.create_user("award-bidder-two@example.test")
        other_issuer = self.create_user("award-other-issuer@example.test", "issuer")
        tender = self.create_tender(issuer)
        bid_one = self.add_bid(tender, bidder_one, "90.00", "first-award-nonce-0000001")
        bid_two = self.add_bid(tender, bidder_two, "70.00", "second-award-nonce-000002")
        for bid_id, bidder, amount in (
            (bid_one.id, bidder_one, Decimal("90.00")),
            (bid_two.id, bidder_two, Decimal("70.00")),
        ):
            bid = self.db.get(Bid, bid_id)
            bid.is_revealed = True
            self.db.add(BidRevealRecord(bid_id=bid_id, revealed_by_user_id=bidder.id, revealed_amount=amount))
        tender.status = "under_review"
        self.db.commit()

        with self.assertRaises(HTTPException) as error:
            process_award(tender.id, AwardProcessRequest(), self.db, other_issuer)
        self.assertEqual(error.exception.status_code, 403)

        award = process_award(
            tender.id,
            AwardProcessRequest(proof_hash="a" * 64, details={"method": "lowest revealed bid"}),
            self.db,
            issuer,
        )
        self.assertEqual(award.winning_bid_id, bid_two.id)
        self.assertEqual(award.amount, Decimal("70.00"))
        self.assertEqual(self.db.get(Tender, tender.id).status, "awarded")
        self.assertEqual(get_award(tender.id, self.db, issuer).id, award.id)
        self.assertEqual(list_decisions(tender.id, self.db, issuer)[0].proof_hash, "a" * 64)
        self.assertTrue(any(event.event_type == "AWARD_RECORDED" for event in list_audit_events(tender.id, self.db, issuer)))
        with self.assertRaises(HTTPException) as error:
            process_award(tender.id, AwardProcessRequest(), self.db, issuer)
        self.assertEqual(error.exception.status_code, 409)

    def test_blockchain_status_is_read_only_and_scoped(self):
        issuer = self.create_user("chain-issuer@example.test", "issuer")
        stranger = self.create_user("chain-stranger@example.test")
        tender = self.create_tender(issuer)
        tx = BlockchainTransaction(
            tender_id=tender.id,
            chain_id=1687,
            action="bid_committed",
            status="pending",
        )
        self.db.add(tx)
        self.db.commit()
        self.db.refresh(tx)

        self.assertEqual(list_blockchain_transactions(tender.id, self.db, issuer)[0].status, "pending")
        self.assertEqual(get_blockchain_transaction(tx.id, self.db, issuer).transaction_hash, None)
        with self.assertRaises(HTTPException) as error:
            get_blockchain_transaction(tx.id, self.db, stranger)
        self.assertEqual(error.exception.status_code, 403)
        with self.assertRaises(HTTPException) as error:
            get_blockchain_transaction(99999, self.db, issuer)
        self.assertEqual(error.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()