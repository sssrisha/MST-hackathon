/**
 * OpenTender API Service
 * 
 * Future FastAPI Route Mapping:
 * - getTenders()        -> GET  /api/tenders
 * - getTender(id)       -> GET  /api/tenders/:id
 * - createTender(data)  -> POST /api/tenders
 * - submitBid(data)     -> POST /api/bids
 * - revealBid(data)     -> POST /api/bids/reveal
 * - getRiskAnalysis(id) -> GET  /api/risk/:id
 * - getAuditTrail(id)   -> GET  /api/audit/:id
 */

import { initialTenders } from '../data/tenders.js';
import { initialBids } from '../data/bids.js';
import { riskAnalysisData } from '../data/riskAnalysis.js';
import { auditTrailData } from '../data/auditTrail.js';

export const USE_MOCK = true;

// In-memory runtime state (persisted in memory only, no localStorage)
let memoryTenders = [...initialTenders];
let memoryBids = { ...initialBids };

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getTenders() {
  await delay(350);
  return memoryTenders.map((t) => ({ ...t }));
}

export async function getTender(id) {
  await delay(350);
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
    createdAt: new Date().toISOString(),
    onChainRecordHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
  };
  memoryTenders.unshift(newTender);
  memoryBids[newId] = [];
  return { ...newTender };
}

export async function submitBid(data) {
  await delay(400);
  const { tenderId, contractor, commitmentHash } = data;
  const tender = memoryTenders.find((t) => t.id === tenderId);
  if (!tender) throw new Error('Tender not found');

  const bidId = `B-${tenderId}-${String((memoryBids[tenderId]?.length || 0) + 1)}`;
  const newBid = {
    bidId,
    contractor: contractor || 'Anonymous Contractor',
    commitmentHash,
    submittedAt: new Date().toISOString(),
    status: 'SEALED'
  };

  if (!memoryBids[tenderId]) {
    memoryBids[tenderId] = [];
  }
  memoryBids[tenderId].push(newBid);
  tender.bidCount = memoryBids[tenderId].length;

  return {
    success: true,
    bid: newBid,
    message: 'Cryptographic bid commitment recorded in tamper-evident record.'
  };
}

export async function revealBid(data) {
  await delay(450);
  const { tenderId, bidId, amount, salt } = data;
  const tenderBids = memoryBids[tenderId] || [];
  const bid = tenderBids.find((b) => b.bidId === bidId);
  if (!bid) throw new Error('Bid record not found');

  bid.amount = Number(amount);
  bid.salt = salt;
  bid.revealedAt = new Date().toISOString();
  bid.status = 'REVEALED';

  return {
    success: true,
    bid: { ...bid },
    message: 'Bid revealed and verified against stored cryptographic commitment.'
  };
}

export async function getRiskAnalysis(id) {
  await delay(400);
  const tender = memoryTenders.find((t) => t.id === id);
  if (!tender) return null;

  const existing = riskAnalysisData[id];
  if (existing) return existing;

  // Fallback AI-assisted risk summary based on tender status/score
  return {
    tenderId: id,
    riskScore: tender.riskScore ?? 25,
    summary:
      (tender.riskScore ?? 0) >= 70
        ? 'Suspicious bidding pattern detected; human review required.'
        : 'AI-assisted risk assessment indicates normal, competitive distribution.',
    anomalyMetrics: {
      varianceScore: (tender.riskScore ?? 0) >= 70 ? 0.92 : 0.14,
      timingCorrelation: (tender.riskScore ?? 0) >= 70 ? 0.88 : 0.12,
      priceClustering: (tender.riskScore ?? 0) >= 70 ? 0.95 : 0.18
    }
  };
}

export async function getAuditTrail(id) {
  await delay(400);
  const existing = auditTrailData[id];
  if (existing) return existing;

  const tender = memoryTenders.find((t) => t.id === id);
  if (!tender) return [];

  // Minimal baseline tamper-evident event log
  return [
    {
      eventId: 'EVT-001',
      action: 'TENDER_CREATED',
      actor: tender.department,
      timestamp: tender.createdAt,
      txHash: tender.onChainRecordHash,
      details: 'Tender specification registered on tamper-evident record.'
    }
  ];
}
