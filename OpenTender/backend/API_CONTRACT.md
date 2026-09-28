# OpenTender API Contract

Base URL: `http://127.0.0.1:8000`. JSON is used for request and response bodies. Protected endpoints require `Authorization: Bearer <access_token>` from `POST /auth/login`.

Before starting the app, set stable secrets in the backend process environment: `JWT_SECRET` and `BID_ENCRYPTION_KEY`, each at least 32 bytes. Changing either value invalidates existing access tokens or makes existing encrypted bid amounts unreadable. `ISSUER_REGISTRATION_KEY` is optional; issuer self-registration is disabled unless it is set to at least 32 bytes. Keep all three values out of source control and browser code.

## Endpoints

| Method and path | Required role | Request body | Success response |
|---|---|---|---|
| `GET /` | Public | None | `200` `{ "message": string, "status": string }` |
| `GET /health` | Public | None | `200` `{ "status": "healthy" }` (liveness only; does not check the database) |
| `POST /auth/register` | Public | `{ "name": string, "email": string, "password": string, "role"?: "issuer"\|"bidder", "issuer_registration_key"?: string }`; password is 8-128 characters. New registrations default to bidder. Issuer creation requires the configured issuer registration key as `issuer_registration_key` (minimum 32 characters). | `201` `{ "id": number, "name": string, "email": string, "role": string, "is_active": boolean }` |
| `POST /auth/login` | Public | `{ "email": string, "password": string }` | `200` `{ "access_token": string, "token_type": "bearer", "user": { "id": number, "name": string, "email": string, "role": string, "is_active": boolean } }` |
| `GET /tenders` | Public | None | `200` array of tender objects: `id`, `title`, `description`, `budget`, `category`, `submission_deadline`, `status`, `creator_id`, `created_at` |
| `POST /tenders` | Issuer | `{ "title": string, "description": string, "budget": number, "category": string, "submission_deadline": ISO-8601 datetime with timezone }` | `201` tender object as above |
| `POST /tenders/{tender_id}/bids` | Bidder | `{ "amount": number, "nonce": string }`; amount must be positive with at most two decimal places; nonce is 16-256 characters. | `201` `{ "id": number, "commitment_hash": string, "message": string }`; does not return amount |
| `GET /tenders/{tender_id}/bids` | Issuer who created that tender | None | `200` array of `{ "id": number, "tender_id": number, "bidder_id": number, "commitment_hash": string, "is_revealed": boolean, "submitted_at": datetime, "amount": number\|null }`; unrevealed amount is `null` |
| `POST /bids/{bid_id}/reveal` | Bid-owning bidder, after tender deadline | `{ "nonce": string }` | `200` bid object as above, now with `amount` |

## Common Errors

- `401`: missing, invalid, or expired bearer token; or invalid login credentials.
- `403`: wrong role, non-owner access, or invalid/missing issuer registration key.
- `503`: issuer registration is not configured, or its backend registration key is shorter than 32 bytes.
- `404`: tender or bid does not exist.
- `409`: duplicate email or a second bid from the same bidder on the same tender.
- `422`: invalid request body, invalid budget/amount, naive deadline, or deadline in the past.
- `400`: tender is closed/expired, reveal is early, or nonce does not match the commitment.

## Workflow Notes

- Login separately as each user. Paste the returned token into Swagger's **Authorize** dialog; replace it when switching between issuer and bidder.
- Configure `ISSUER_REGISTRATION_KEY` only in the trusted backend environment. Do not put this key in React/browser code; use an operator-controlled provisioning flow to create issuer accounts.
- A bid commitment is SHA-256 over UTF-8 bytes of `canonical_amount + ":" + nonce`. Canonical amount is the submitted decimal normalized without trailing fractional zeroes, e.g. `123.450` canonicalizes to `123.45`. Keep the nonce private until reveal.
- Amounts are encrypted in the local database; no AI prediction, blockchain transaction, or on-chain confirmation is currently implemented.
- There are no AI or blockchain service modules in this backend yet. The AI hook is `routes/tenders.py:create_tender`, after issuer/deadline validation and before `db.add(tender)`; a future AI service could provide optional classification or analysis there, with its result explicitly marked as advisory.
- The blockchain hook is `routes/bids.py:submit_bid`, immediately after `create_commitment(...)` computes the commitment and before `db.commit()`. A production integration should persist transaction state/receipt separately and handle chain failure/retries (preferably via an outbox/background worker); only the commitment hash, never the plaintext amount or nonce, should be sent on-chain. Current code makes no chain call and reports no transaction confirmation.
- Issuer registration requires `ISSUER_REGISTRATION_KEY` configured in the backend process. Never expose that value to a browser client; create issuer accounts through a trusted operator/tool.