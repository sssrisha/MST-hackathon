import os
from typing import Optional

from web3 import Web3
from web3.exceptions import ProviderConnectionError

# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------
class MissingEnvError(RuntimeError):
    """Raised when a required environment variable is missing."""
    pass

class RPCConnectionError(RuntimeError):
    """Raised when the RPC endpoint cannot be reached."""
    pass

# ---------------------------------------------------------------------------
# Internal singleton holder for the Web3 instance
# ---------------------------------------------------------------------------
_web3_instance: Optional[Web3] = None

def _get_rpc_url() -> str:
    """Return the MST RPC URL from the environment or raise an error.

    The variable must be set in a .env file (see .env.example).
    """
    rpc_url = os.getenv("MST_RPC_URL")
    if not rpc_url:
        raise MissingEnvError(
            "MST_RPC_URL not set. Create a .env file based on .env.example and supply a valid RPC endpoint."
        )
    return rpc_url

def get_web3() -> Web3:
    """Return a cached Web3 instance.

    The first call creates the instance using the URL from ``MST_RPC_URL``.
    Subsequent calls reuse the same object, which is cheap and avoids
    reconnecting on every request.
    """
    global _web3_instance
    if _web3_instance is None:
        rpc = _get_rpc_url()
        _web3_instance = Web3(Web3.HTTPProvider(rpc))
    return _web3_instance

def is_rpc_available() -> bool:
    """Check whether the configured RPC endpoint is reachable.

    Returns ``True`` if the provider reports a connection, otherwise ``False``.
    Any internal exception (missing env var, connection error) results in ``False``.
    """
    try:
        w3 = get_web3()
        return w3.isConnected()
    except (MissingEnvError, ProviderConnectionError):
        return False


def commitment_hash(
    tender_id: int,
    bidder: str,
    amount: int,
    nonce: bytes,
) -> str:
    """Generate the sealed‑bid commitment hash.

    The Solidity counterpart (to be implemented in ``TenderGuard.sol``) will be:
    ``keccak256(abi.encodePacked(tenderId, bidder, amount, nonce))``.
    The argument order and types **must** stay in sync between the two
    implementations. If the contract later changes the order, this helper
    must be updated accordingly.

    Args:
        tender_id: Unique numeric identifier for the tender (uint256).
        bidder:    Ethereum address of the bidder (hex string with ``0x`` prefix).
        amount:    Bid amount in the smallest token unit (uint256).
        nonce:     A securely generated 32‑byte value (bytes).

    Returns:
        Hex string (0x‑prefixed, 66 characters) representing the keccak256 hash.
    """
    if not isinstance(nonce, (bytes, bytearray)):
        raise TypeError("nonce must be a bytes object of length 32")
    if len(nonce) != 32:
        raise ValueError("nonce must be exactly 32 bytes long")

    w3 = get_web3()
    # ``solidityKeccak`` expects the ``bytes32`` argument as a hex string.
    nonce_hex = "0x" + nonce.hex()
    return w3.solidityKeccak(
        ["uint256", "address", "uint256", "bytes32"],
        [tender_id, bidder, amount, nonce_hex],
    ).hex()
