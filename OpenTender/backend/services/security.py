import base64
import hashlib
import hmac
import os
import secrets

import bcrypt
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from jose import JWTError, jwt

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.getenv("JWT_SECRET", "")
BID_ENCRYPTION_SECRET = os.getenv("BID_ENCRYPTION_KEY", "")


def validate_security_config() -> None:
    missing = [
        name
        for name, value in (
            ("JWT_SECRET", JWT_SECRET),
            ("BID_ENCRYPTION_KEY", BID_ENCRYPTION_SECRET),
        )
        if len(value.encode("utf-8")) < 32
    ]
    if missing:
        raise RuntimeError(
            "Set these environment variables to secrets of at least 32 bytes: "
            + ", ".join(missing)
        )


def hash_password(password: str) -> str:
    password_digest = hashlib.sha256(password.encode("utf-8")).digest()
    return bcrypt.hashpw(password_digest, bcrypt.gensalt()).decode("ascii")


def verify_password(password: str, stored_hash: str) -> bool:
    password_digest = hashlib.sha256(password.encode("utf-8")).digest()
    try:
        return bcrypt.checkpw(password_digest, stored_hash.encode("ascii"))
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: int) -> str:
    from datetime import datetime, timedelta, timezone

    validate_security_config()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=60)
    return jwt.encode({"sub": str(user_id), "exp": expires_at}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"require_exp": True, "require_sub": True},
        )
        return int(payload["sub"])
    except (JWTError, KeyError, TypeError, ValueError):
        return None


def canonical_amount(amount: str) -> str:
    from decimal import Decimal

    return format(Decimal(amount).normalize(), "f")


def create_commitment(amount: str, nonce: str) -> str:
    message = f"{canonical_amount(amount)}:{nonce}".encode("utf-8")
    return hashlib.sha256(message).hexdigest()


def _encryption_key() -> bytes:
    validate_security_config()
    return hashlib.sha256(BID_ENCRYPTION_SECRET.encode("utf-8")).digest()


def encrypt_amount(amount: str) -> str:
    iv = secrets.token_bytes(12)
    ciphertext = AESGCM(_encryption_key()).encrypt(iv, amount.encode("utf-8"), None)
    return base64.urlsafe_b64encode(iv + ciphertext).decode("ascii")


def decrypt_amount(encrypted_amount: str) -> str:
    payload = base64.urlsafe_b64decode(encrypted_amount.encode("ascii"))
    return AESGCM(_encryption_key()).decrypt(payload[:12], payload[12:], None).decode("utf-8")


def commitment_matches(amount: str, nonce: str, expected_hash: str) -> bool:
    return hmac.compare_digest(create_commitment(amount, nonce), expected_hash)