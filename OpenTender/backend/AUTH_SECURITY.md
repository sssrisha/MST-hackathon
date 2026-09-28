# Authentication and Authorization

## Required Environment

Set these values in the backend process environment; do not commit them or put them in browser code:

- `JWT_SECRET`: signing key of at least 32 bytes. Changing it invalidates issued access tokens.
- `BID_ENCRYPTION_KEY`: encryption key of at least 32 bytes. Keep it stable or existing encrypted bid amounts cannot be decrypted.
- `ISSUER_REGISTRATION_KEY`: required to register an issuer; it must be at least 32 bytes. Keep it server-side and use a trusted operator/provisioning flow.
- `CORS_ORIGINS`: optional comma-separated list of exact HTTP(S) frontend origins, without paths. When unset, only the local Vite origins `http://localhost:5173` and `http://127.0.0.1:5173` are allowed. Wildcard origins are rejected.

The Python backend reads process environment variables; a `.env` file is not automatically loaded by the FastAPI entry point.

## Authentication Behavior

`POST /auth/register` accepts primary roles `issuer` and `bidder`; issuer registration additionally requires `issuer_registration_key`. Passwords are stored as bcrypt hashes of a SHA-256 prehash, never as plaintext. `POST /auth/login` returns a bearer token. Tokens use HS256, include a user ID subject and expiration, and are accepted only when signature, required claims, expiry, account existence, and active status validate. Access tokens expire after 60 minutes.

Send tokens in `Authorization: Bearer <token>`. The backend does not use cookies and CORS does not allow credentialed cookies. There is currently no logout endpoint or token-revocation store; a token remains usable until expiration unless its account is deactivated. No refresh tokens are issued.

## Roles and Protected Operations

The existing `users.role` remains `issuer` or `bidder`. Supplemental active grants may assign `reviewer`, `admin`, or `auditor`; route checks consider only active grants. Current protected operations are issuer tender creation, bidder bid submission, bidder-owned reveal, and tender-creator issuer access to bid lists. Admin grants do not implicitly grant issuer or bidder capabilities.

Risk review, freeze, and award routes are not currently registered in FastAPI. When implemented, they must require an active reviewer/admin grant as appropriate and validate tender ownership/state in the service layer. Supplemental-role provisioning has no public API endpoint and must be performed by a trusted administrative process.