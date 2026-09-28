import os
import unittest
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("JWT_SECRET", "test-only-jwt-secret-that-is-at-least-32-bytes")
os.environ.setdefault("BID_ENCRYPTION_KEY", "test-only-bid-encryption-key-32-bytes")

from database import Base
from models import Bid, Tender, User
from routes.auth import get_current_user, login, register
from routes.bids import list_tender_bids, reveal_bid, submit_bid
from routes.tenders import create_tender, list_tenders
from schemas.bid import BidCreate, BidReveal
from schemas.tender import TenderCreate
from schemas.user import LoginRequest, UserCreate
from services.security import commitment_matches


class TenderWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine, autoflush=False)
        self.db = self.session_factory()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def create_user(self, email: str, role: str) -> User:
        user = User(
            name=role.title(),
            email=email,
            hashed_password="unused-in-route-test",
            role=role,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def create_tender(self, issuer: User, deadline: datetime | None = None) -> Tender:
        payload = TenderCreate(
            title="Test tender",
            description="Workflow test",
            budget=Decimal("5000.00"),
            category="Testing",
            submission_deadline=deadline or datetime.now(timezone.utc) + timedelta(hours=1),
        )
        response = create_tender(payload, self.db, issuer)
        return self.db.get(Tender, response.id)

    def test_registration_and_login_preserve_roles(self):
        bidder = register(
            UserCreate(name="Bidder", email="bidder@example.com", password="ValidPass123"),
            self.db,
        )
        self.assertEqual(bidder.role, "bidder")
        self.assertNotEqual(bidder.hashed_password, "ValidPass123")
        result = login(LoginRequest(email="bidder@example.com", password="ValidPass123"), self.db)
        self.assertEqual(result.user.role, "bidder")
        self.assertTrue(result.access_token)

    def test_public_registration_cannot_grant_issuer_role(self):
        with self.assertRaises(HTTPException) as error:
            register(
                UserCreate(
                    name="Untrusted issuer",
                    email="issuer@example.com",
                    password="ValidPass123",
                    role="issuer",
                ),
                self.db,
            )
        self.assertEqual(error.exception.status_code, 503)

    def test_issuer_registration_requires_configured_key(self):
        from unittest.mock import patch

        issuer_payload = UserCreate(
            name="Configured issuer",
            email="configured@example.com",
            password="ValidPass123",
            role="issuer",
            issuer_registration_key="c" * 32,
        )
        with patch.dict(os.environ, {"ISSUER_REGISTRATION_KEY": "c" * 32}):
            issuer = register(issuer_payload, self.db)
        self.assertEqual(issuer.role, "issuer")
        self.assertNotIn("issuer_registration_key", issuer.__dict__)

        issuer_login = login(
            LoginRequest(email="configured@example.com", password="ValidPass123"),
            self.db,
        )
        self.assertEqual(issuer_login.user.role, "issuer")

    def test_issuer_registration_rejects_weak_configured_key(self):
        from unittest.mock import patch

        payload = UserCreate(
            name="Weak key issuer",
            email="weak-key@example.com",
            password="ValidPass123",
            role="issuer",
            issuer_registration_key="r" * 32,
        )
        with patch.dict(os.environ, {"ISSUER_REGISTRATION_KEY": "short"}):
            with self.assertRaises(HTTPException) as error:
                register(payload, self.db)
        self.assertEqual(error.exception.status_code, 503)

    def test_security_config_rejects_missing_or_short_secrets(self):
        from unittest.mock import patch

        from services import security

        with patch.object(security, "JWT_SECRET", "too-short"), patch.object(
            security, "BID_ENCRYPTION_SECRET", "also-too-short"
        ):
            with self.assertRaises(RuntimeError):
                security.validate_security_config()

    def test_login_rejects_wrong_password(self):
        register(
            UserCreate(name="Bidder", email="login@example.com", password="ValidPass123"),
            self.db,
        )
        with self.assertRaises(HTTPException) as error:
            login(LoginRequest(email="login@example.com", password="WrongPass123"), self.db)
        self.assertEqual(error.exception.status_code, 401)

    def test_bearer_token_authenticates_user_and_rejects_invalid_token(self):
        user = register(
            UserCreate(name="Bidder", email="token@example.com", password="ValidPass123"),
            self.db,
        )
        result = login(LoginRequest(email="token@example.com", password="ValidPass123"), self.db)
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=result.access_token)
        self.assertEqual(get_current_user(credentials, self.db).id, user.id)

        invalid = HTTPAuthorizationCredentials(scheme="Bearer", credentials="not-a-valid-token")
        with self.assertRaises(HTTPException) as error:
            get_current_user(invalid, self.db)
        self.assertEqual(error.exception.status_code, 401)

    def test_non_utc_deadline_keeps_its_utc_instant(self):
        issuer = self.create_user("issuer@example.com", "issuer")
        supplied_deadline = datetime.now(timezone(timedelta(hours=5))) + timedelta(hours=3)
        tender = self.create_tender(issuer, supplied_deadline)
        persisted_deadline = tender.submission_deadline
        self.assertIsNotNone(persisted_deadline.tzinfo)
        self.assertEqual(
            persisted_deadline.astimezone(timezone.utc),
            supplied_deadline.astimezone(timezone.utc),
        )

    def test_utc_datetime_type_rejects_naive_db_values(self):
        from models.utc_datetime import UTCDateTime

        column_type = UTCDateTime()
        with self.assertRaises(ValueError):
            column_type.process_bind_param(datetime.now(), self.engine.dialect)

    def test_naive_or_past_deadlines_are_rejected(self):
        issuer = self.create_user("issuer@example.com", "issuer")
        now = datetime.now(timezone.utc)
        for deadline in (now.replace(tzinfo=None), now - timedelta(minutes=1)):
            with self.assertRaises(HTTPException) as error:
                self.create_tender(issuer, deadline)
            self.assertEqual(error.exception.status_code, 422)

    def test_sealed_bid_commitment_and_reveal_lifecycle(self):
        issuer = self.create_user("issuer@example.com", "issuer")
        bidder = self.create_user("bidder@example.com", "bidder")
        tender = self.create_tender(issuer)
        amount = Decimal("1234.50")
        nonce = "private-test-nonce-0123456789"

        submitted = submit_bid(tender.id, BidCreate(amount=amount, nonce=nonce), self.db, bidder)
        bid = self.db.get(Bid, submitted.id)
        self.assertTrue(commitment_matches("1234.50", nonce, submitted.commitment_hash))
        self.assertNotIn("1234.50", bid.encrypted_amount)
        self.assertNotIn("amount", submitted.model_dump())
        self.assertIsNone(list_tender_bids(tender.id, self.db, issuer)[0].amount)

        with self.assertRaises(HTTPException) as error:
            reveal_bid(bid.id, BidReveal(nonce=nonce), self.db, bidder)
        self.assertEqual(error.exception.status_code, 400)

        with self.assertRaises(HTTPException) as error:
            reveal_bid(bid.id, BidReveal(nonce="wrong-test-nonce-0123456789"), self.db, bidder)
        self.assertEqual(error.exception.status_code, 400)

        tender.submission_deadline = datetime.now(timezone.utc) - timedelta(seconds=1)
        self.db.commit()
        revealed = reveal_bid(bid.id, BidReveal(nonce=nonce), self.db, bidder)
        self.assertEqual(revealed.amount, amount)
        self.assertTrue(revealed.is_revealed)
        self.assertEqual(list_tender_bids(tender.id, self.db, issuer)[0].amount, amount)

    def test_expired_tender_rejects_bid_submission(self):
        issuer = self.create_user("issuer@example.com", "issuer")
        bidder = self.create_user("bidder@example.com", "bidder")
        tender = self.create_tender(issuer)
        tender.submission_deadline = datetime.now(timezone.utc) - timedelta(seconds=1)
        self.db.commit()
        with self.assertRaises(HTTPException) as error:
            submit_bid(tender.id, BidCreate(amount=Decimal("10"), nonce="a-private-nonce-12345"), self.db, bidder)
        self.assertEqual(error.exception.status_code, 400)

    def test_only_tender_owner_can_list_bids_and_duplicate_bids_fail(self):
        issuer = self.create_user("issuer@example.com", "issuer")
        other_issuer = self.create_user("other@example.com", "issuer")
        bidder = self.create_user("bidder@example.com", "bidder")
        tender = self.create_tender(issuer)
        payload = BidCreate(amount=Decimal("10"), nonce="a-private-nonce-12345")
        first_bid = submit_bid(tender.id, payload, self.db, bidder)

        with self.assertRaises(HTTPException) as error:
            list_tender_bids(tender.id, self.db, other_issuer)
        self.assertEqual(error.exception.status_code, 403)

        with self.assertRaises(HTTPException) as error:
            submit_bid(tender.id, payload, self.db, bidder)
        self.assertEqual(error.exception.status_code, 409)

        with self.assertRaises(HTTPException) as error:
            reveal_bid(first_bid.id, BidReveal(nonce=payload.nonce), self.db, other_issuer)
        self.assertEqual(error.exception.status_code, 403)

    def test_bidder_cannot_create_tender_and_issuer_cannot_submit_bid(self):
        issuer = self.create_user("issuer@example.com", "issuer")
        bidder = self.create_user("bidder@example.com", "bidder")
        tender_payload = TenderCreate(
            title="Role test",
            description="Role boundary",
            budget=Decimal("10.00"),
            category="Testing",
            submission_deadline=datetime.now(timezone.utc) + timedelta(hours=1),
        )

        with self.assertRaises(HTTPException) as error:
            create_tender(tender_payload, self.db, bidder)
        self.assertEqual(error.exception.status_code, 403)

        tender = self.create_tender(issuer)
        with self.assertRaises(HTTPException) as error:
            submit_bid(
                tender.id,
                BidCreate(amount=Decimal("1.00"), nonce="private-role-test-nonce"),
                self.db,
                issuer,
            )
        self.assertEqual(error.exception.status_code, 403)

    def test_list_tenders_returns_created_tender(self):
        issuer = self.create_user("issuer@example.com", "issuer")
        tender = self.create_tender(issuer)
        self.assertEqual([item.id for item in list_tenders(self.db)], [tender.id])


if __name__ == "__main__":
    unittest.main()