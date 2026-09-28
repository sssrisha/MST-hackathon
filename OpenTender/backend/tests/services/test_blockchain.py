import os
import pytest
from unittest import mock

# Helper to import the freshly written module after env changes
def import_blockchain_module():
    import importlib, sys
    module_name = "services.blockchain"
    if module_name in sys.modules:
        del sys.modules[module_name]
    return importlib.import_module(module_name)

def test_missing_env_raises():
    # Ensure the variable is stripped for the test
    os.environ.pop("MST_RPC_URL", None)
    bc = import_blockchain_module()
    with pytest.raises(bc.MissingEnvError):
        bc.get_web3()

def test_is_rpc_available_returns_bool(monkeypatch):
    os.environ["MST_RPC_URL"] = "http://127.0.0.1:8545"
    bc = import_blockchain_module()
    # Mock Web3.isConnected()
    mock_w3 = mock.MagicMock()
    mock_w3.isConnected.return_value = True
    monkeypatch.setattr(bc, "get_web3", lambda: mock_w3)
    assert bc.is_rpc_available() is True
    mock_w3.isConnected.assert_called_once()

def test_commitment_hash_shape(monkeypatch):
    os.environ["MST_RPC_URL"] = "http://127.0.0.1:8545"
    bc = import_blockchain_module()
    # Mock underlying solidityKeccak to avoid real keccak calculation
    mock_w3 = mock.MagicMock()
    mock_w3.solidityKeccak.return_value = mock.Mock(hex=lambda: "0x" + "a" * 64)
    monkeypatch.setattr(bc, "get_web3", lambda: mock_w3)
    # Simple deterministic inputs
    tender_id = 1
    bidder = "0x1234567890abcdef1234567890abcdef12345678"
    amount = 1000
    nonce = bytes.fromhex("00" * 32)
    h = bc.commitment_hash(tender_id, bidder, amount, nonce)
    assert isinstance(h, str)
    assert h.startswith("0x") and len(h) == 66
    mock_w3.solidityKeccak.assert_called_once()
