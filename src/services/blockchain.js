/**
 * MOCK. Replaced by MST integration later.
 * 
 * Note: These are simulated stubs for tamper-evident record operations.
 * Do NOT make any claims of live blockchain connectivity until MST contract integration.
 */

function generateMockTxHash() {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

function delay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createTenderOnChain(tenderData) {
  await delay(350);
  return {
    mock: true,
    txHash: generateMockTxHash(),
    timestamp: new Date().toISOString(),
    action: 'CREATE_TENDER',
    tenderId: tenderData?.id || 'T000',
    status: 'CONFIRMED_ON_RECORD'
  };
}

export async function submitBidCommitment(tenderId, commitmentHash) {
  await delay(350);
  return {
    mock: true,
    txHash: generateMockTxHash(),
    timestamp: new Date().toISOString(),
    action: 'SUBMIT_COMMITMENT',
    tenderId,
    commitmentHash,
    status: 'CONFIRMED_ON_RECORD'
  };
}

export async function revealBid(tenderId, bidId, amount, salt) {
  await delay(350);
  return {
    mock: true,
    txHash: generateMockTxHash(),
    timestamp: new Date().toISOString(),
    action: 'REVEAL_BID',
    tenderId,
    bidId,
    amount,
    salt,
    status: 'VERIFIED_ON_RECORD'
  };
}

export async function getTransaction(txHash) {
  await delay(250);
  return {
    mock: true,
    txHash: txHash || generateMockTxHash(),
    timestamp: new Date().toISOString(),
    confirmations: 12,
    recordType: 'Tamper-Evident Ledger Entry'
  };
}

export async function getTenderState(tenderId) {
  await delay(250);
  return {
    mock: true,
    tenderId,
    txHash: generateMockTxHash(),
    timestamp: new Date().toISOString(),
    isSealed: true,
    isFrozen: false
  };
}
