/**
 * TenderGuard Tender Lifecycle Service
 * 
 * Future FastAPI / Contract Route Mappings:
 * - getTenders()              -> GET  /api/tenders
 * - getTender(id)             -> GET  /api/tenders/:id
 * - createTender(data)        -> POST /api/tenders (MST contract: createTender())
 * - submitSealedBid(data)     -> POST /api/bids/sealed (MST contract: submitBidCommitment())
 * - revealBid(data)           -> POST /api/bids/reveal (MST contract: revealBid())
 * - getDecisionReport(id)     -> GET  /api/tenders/:id/decision
 */

import { initialTenders } from '../data/tenders.js';
import { initialBids } from '../data/bids.js';
import { initialDecisionReports } from '../data/decisionReports.js';
import { initialSuppliers } from '../data/suppliers.js';
import { DEFAULT_POLICY } from '../data/policy.js';
import { makeCommitment } from '../utils/hash.js';
import { computeDecision, validatePolicy } from '../utils/scoring.js';

export const USE_MOCK = true;

// In-memory runtime state
let memoryTenders = [...initialTenders];
let memoryBids = JSON.parse(JSON.stringify(initialBids));

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTenderRiskLevel(tender) {
  if (tender?.status === 'FROZEN') return 'UNDER_REVIEW';
  if (tender?.riskScore == null) return 'PENDING';
  if (tender.riskScore <= 39) return 'LOW';
  if (tender.riskScore <= 69) return 'MEDIUM';
  return 'HIGH';
}

export async function getTenders() {
  await delay(300);
  return memoryTenders.map((t) => ({ ...t }));
}

export async function getOpenTendersForContractor() {
  await delay(300);
  return memoryTenders.map((tender) => ({
    ...tender,
    sealedBidCount: (memoryBids[tender.id] || []).length,
    riskLevel: getTenderRiskLevel(tender),
    bids: undefined,
    winner: undefined,
    riskFactors: undefined,
    perSupplierBreakdown: undefined,
    statusReason: tender.status === 'FROZEN' ? 'Under review' : tender.statusReason
  }));
}

export async function getTenderForContractor(id) {
  await delay(300);
  const tender = memoryTenders.find((t) => t.id === id);
  if (!tender) return null;
  return {
    ...tender,
    sealedBidCount: (memoryBids[id] || []).length,
    riskLevel: getTenderRiskLevel(tender),
    bids: undefined,
    winner: undefined,
    riskFactors: undefined,
    perSupplierBreakdown: undefined
  };
}

export async function getTender(id) {
  await delay(300);
  const tender = memoryTenders.find((t) => t.id === id);
  if (!tender) return null;
  const bids = memoryBids[id] || [];
  return {
    ...tender,
    bids: bids.map((b) => ({ ...b }))
  };
}

export async function createTender(data) {
  await delay(450);

  // Validate policy if provided
  if (data.policy) {
    const validation = validatePolicy(data.policy);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
  }

  const newId = `T${String(memoryTenders.length + 1).padStart(3, '0')}`;
  const newTender = {
    id: newId,
    title: data.title || 'Untitled Tender',
    description: data.description || '',
    department: data.department || 'General Public Works',
    budget: Number(data.budget) || 0,
    deadline: data.deadline || new Date(Date.now() + 14 * 86400000).toISOString(),
    status: 'OPEN',
    bidCount: 0,
    riskScore: null,
    policy: data.policy || DEFAULT_POLICY,
    authorityEscrow: Number(data.authorityEscrow) || 100,
    winnerBond: Number(data.winnerBond) || 50,
    bidDeposit: Number(data.bidDeposit) || 40,
    createdAt: new Date().toISOString(),
    onChainRecordHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    mock: true
  };

  memoryTenders.unshift(newTender);
  memoryBids[newId] = [];

  return { ...newTender };
}

export async function submitSealedBid(data) {
  await delay(400);
  const { tenderId, contractor, supplierId, amount, salt, commitmentHash: providedHash } = data;
  const tender = memoryTenders.find((t) => t.id === tenderId);
  if (!tender) throw new Error('Tender not found');

  // Compute commitment if amount & salt provided, or use providedHash
  let commitmentHash = providedHash;
  if (!commitmentHash && amount && salt) {
    commitmentHash = await makeCommitment(amount, salt);
  }

  const bidId = `B-${tenderId}-${String((memoryBids[tenderId]?.length || 0) + 1)}`;
  const newBid = {
    bidId,
    tenderId,
    supplierId: supplierId || 'TG-1042',
    contractor: contractor || 'Anonymous Contractor',
    commitmentHash,
    submittedAt: new Date().toISOString(),
    status: 'SEALED',
    mock: true
  };

  if (!memoryBids[tenderId]) {
    memoryBids[tenderId] = [];
  }
  memoryBids[tenderId].push(newBid);
  tender.bidCount = memoryBids[tenderId].length;

  return {
    success: true,
    bid: newBid,
    mock: true,
    message: 'Cryptographic bid commitment recorded in tamper-evident record.'
  };
}

export async function revealBid(data) {
  await delay(450);
  const { tenderId, bidId, amount, salt } = data;
  const tenderBids = memoryBids[tenderId] || [];
  const bid = tenderBids.find((b) => b.bidId === bidId);
  if (!bid) {
    return { verified: false, reason: 'Bid record not found', mock: true };
  }

  // Verify commitment match
  const expectedHash = await makeCommitment(amount, salt);
  if (bid.commitmentHash && expectedHash.toLowerCase() !== bid.commitmentHash.toLowerCase()) {
    return {
      verified: false,
      reason: 'Commitment mismatch',
      calculatedHash: expectedHash,
      storedHash: bid.commitmentHash,
      mock: true
    };
  }

  bid.amount = Number(amount);
  bid.salt = salt;
  bid.revealedAt = new Date().toISOString();
  bid.status = 'VERIFIED';

  return {
    verified: true,
    bid: { ...bid },
    mock: true,
    message: 'Bid revealed and verified against stored cryptographic commitment.'
  };
}

export async function getDecisionReport(tenderId) {
  await delay(350);
  const tender = memoryTenders.find((t) => t.id === tenderId);
  if (!tender) return null;

  const decision = computeDecision(tenderId, tender.policy || DEFAULT_POLICY, memoryBids, initialSuppliers);
  const staticReport = initialDecisionReports[tenderId] || {
    tenderId,
    tenderTitle: tender.title,
    policyEnforcedBy: 'MST Smart Contract',
    explanation: decision.winner
      ? `${decision.winner.supplierName} achieved the top decision score (${decision.winner.decisionScore}) under policy rules.`
      : 'Evaluation pending bid reveal completion.',
    timestamp: new Date().toISOString(),
    status: tender.status
  };

  return {
    ...decision,
    ...staticReport,
    mock: true
  };
}
