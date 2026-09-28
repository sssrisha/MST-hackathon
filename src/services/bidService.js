import { getCurrentUser, hasDemoSession } from './authService.js';
import { getAllTenders, getAllBids, setStorageValue, getSecrets, setSecrets, getWalletLedger, setWalletLedger } from './mockDb.js';
import { makeBidCommitment } from '../utils/hash.js';

function delay(ms = 450) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeAmount(amount) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) return NaN;
  return numeric;
}

export async function submitSealedBid({ tenderId, amount, salt, wallet, doc }) {
  // Future FastAPI route: POST /api/bids/sealed
  await delay(1200);
  const user = getCurrentUser();
  if (!user) throw new Error('Login required');

  const tenders = getAllTenders();
  const tender = tenders.find((item) => item.id === tenderId);
  if (!tender) throw new Error('Tender not found');

  const numericAmount = normalizeAmount(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Bid amount must be a positive integer');
  }
  if (numericAmount > Number(tender.budget || 0)) {
    throw new Error('Bid amount exceeds the tender budget');
  }
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    throw new Error('Wallet address is required');
  }
  if (!salt || String(salt).trim().length < 8) {
    throw new Error('Salt must be at least 8 characters');
  }
  if (!['OPEN', 'SEALED'].includes(tender.status) || new Date(tender.deadline) <= new Date()) {
    throw new Error('This tender is not accepting sealed bids');
  }

  const bids = getAllBids();
  const existing = (bids[tenderId] || []).find((bid) => bid.contractorId === user.contractorId);
  if (existing) {
    throw new Error('You already submitted a bid for this tender');
  }

  const commitmentHash = makeBidCommitment({
    tenderId,
    wallet,
    amount: numericAmount,
    salt: String(salt)
  });

  const bidId = `B-${tenderId}-${user.contractorId}-${Date.now()}`;
  const timestamp = new Date().toISOString();
  const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

  const nextBid = {
    bidId,
    tenderId,
    contractorId: user.contractorId,
    supplierId: user.supplierId || user.contractorId,
    contractor: user.company || 'Anonymous contractor',
    amount: null,
    wallet: wallet.toLowerCase(),
    commitmentHash,
    salt: String(salt),
    submittedAt: timestamp,
    status: 'COMMITTED',
    doc: doc && typeof doc === 'object' ? {
      name: doc.name,
      size: Number(doc.size || 0),
      docHash: doc.docHash || null
    } : null,
    tx: {
      mock: true,
      txHash,
      block: Math.floor(Math.random() * 900 + 100),
      timestamp
    },
    mock: true
  };

  bids[tenderId] = [...(bids[tenderId] || []), nextBid];
  setStorageValue('tg.v1.bids', bids);

  const secrets = getSecrets();
  if (!secrets[user.contractorId]) secrets[user.contractorId] = {};
  secrets[user.contractorId][tenderId] = {
    amount: numericAmount,
    salt: String(salt),
    wallet: wallet.toLowerCase(),
    tenderId
  };
  setSecrets(secrets);

  const ledger = getWalletLedger();
  const baseAddress = wallet.toLowerCase();
  if (!ledger[baseAddress]) {
    ledger[baseAddress] = { balance: 250, locked: 0 };
  }
  ledger[baseAddress].locked = (ledger[baseAddress].locked || 0) + Number(tender.bidDeposit || 10);
  setWalletLedger(ledger);

  return {
    success: true,
    bid: nextBid,
    tx: nextBid.tx,
    message: 'Bid successfully committed on the demo network.'
  };
}

export async function revealBid({ bidId, amount, salt }) {
  // Future FastAPI route: POST /api/bids/reveal
  await delay(1600);
  const user = getCurrentUser();
  if (!user) throw new Error('Login required');

  const bids = getAllBids();
  const tenderMap = Object.values(bids).flat();
  const bid = tenderMap.find((entry) => entry.bidId === bidId && (entry.contractorId === user.contractorId || entry.supplierId === user.contractorId));
  if (!bid) throw new Error('Bid not found');

  const tenders = getAllTenders();
  const tender = tenders.find((entry) => entry.id === bid.tenderId);
  if (!tender) throw new Error('Tender not found');
  if (tender.status !== 'REVEAL') {
    return { verified: false, reason: 'Reveal opens after the bidding deadline', mock: true };
  }

  const numericAmount = Number(amount);
  const hash = makeBidCommitment({
    tenderId: bid.tenderId,
    wallet: bid.wallet,
    amount: numericAmount,
    salt: String(salt)
  });

  if (hash.toLowerCase() !== String(bid.commitmentHash).toLowerCase()) {
    return {
      verified: false,
      reason: 'Commitment mismatch',
      tx: null,
      mock: true
    };
  }

  const entry = tenderMap.find((item) => item.bidId === bidId);
  if (entry) {
    entry.amount = numericAmount;
    entry.revealedAt = new Date().toISOString();
    entry.status = 'VERIFIED';
    entry.tx = {
      mock: true,
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      block: Math.floor(Math.random() * 900 + 100),
      timestamp: new Date().toISOString()
    };
  }

  setStorageValue('tg.v1.bids', bids);

  return {
    verified: true,
    reason: 'Bid integrity verified.',
    tx: entry?.tx,
    amount: numericAmount,
    mock: true
  };
}

export function deriveBidStatus(bid, tender) {
  if (!bid) return 'COMMITTED';
  if (tender?.status === 'FROZEN' || tender?.status === 'HIGH_RISK') return 'UNDER_REVIEW';
  if (tender?.status === 'REVEAL' && bid.status === 'COMMITTED') return 'REVEAL_OPEN';
  if (bid.status === 'VERIFIED') return 'VERIFIED';
  if (bid.status === 'COMMITTED') return 'COMMITTED';
  if (tender?.status === 'AWARDED') return bid.amount ? 'AWARDED' : 'NOT_SELECTED';
  return 'COMMITTED';
}

export async function getMyBidsForCurrentContractor() {
  const user = getCurrentUser();
  if (!user) return [];

  const bids = Object.values(getAllBids()).flat();
  return bids.filter((bid) => bid.contractorId === user.contractorId || bid.supplierId === user.supplierId);
}

export default {
  submitSealedBid,
  revealBid,
  deriveBidStatus,
  getMyBidsForCurrentContractor
};
