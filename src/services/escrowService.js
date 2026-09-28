/**
 * TenderGuard Smart Contract Escrow & Execution Service
 * 
 * Future FastAPI / Contract Route Mappings:
 * - getEscrow(id)         -> GET  /api/escrow/:id (MST contract: getEscrowLedger())
 * - getMilestones(id)     -> GET  /api/escrow/:id/milestones (MST contract: getMilestones())
 * - releaseMilestone()    -> POST /api/escrow/:id/milestones/:mId/release (MST contract: releaseMilestonePayment())
 * - getTransactions(id)   -> GET  /api/transactions/:id (MST node/indexer query)
 * - getAuditEvents(id)    -> GET  /api/audit/:id (MST event logs)
 */

import { initialEscrows } from '../data/escrow.js';
import { initialMilestones } from '../data/milestones.js';
import { initialTransactions } from '../data/transactions.js';
import { initialAuditEvents } from '../data/auditEvents.js';
import { deriveEscrow } from '../utils/escrow.js';

export const USE_MOCK = true;

// In-memory runtime state
let memoryEscrows = JSON.parse(JSON.stringify(initialEscrows));
let memoryMilestones = JSON.parse(JSON.stringify(initialMilestones));
let memoryTransactions = [...initialTransactions];
let memoryAuditEvents = JSON.parse(JSON.stringify(initialAuditEvents));

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getEscrow(tenderId) {
  await delay(300);
  const rawLedger = memoryEscrows[tenderId] || {
    tenderId,
    contractAddress: '0x0000...0000',
    currency: 'MSTC',
    authorityEscrow: 0,
    winnerPerformanceBond: 0,
    bidDeposits: 0,
    milestonesTotal: 0
  };

  const milestonesList = memoryMilestones[tenderId] || [];
  const derived = deriveEscrow(rawLedger, milestonesList);

  return {
    tenderId,
    rawLedger,
    derived,
    mock: true
  };
}

export async function getMilestones(tenderId) {
  await delay(300);
  const list = memoryMilestones[tenderId] || [];
  return list.map((m) => ({ ...m, mock: true }));
}

export async function releaseMilestone(tenderId, milestoneId) {
  await delay(450);
  const list = memoryMilestones[tenderId] || [];
  const milestone = list.find((m) => m.id === milestoneId);
  if (!milestone) {
    throw new Error('Milestone not found');
  }

  const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
  milestone.status = 'RELEASED';
  milestone.completedDate = new Date().toISOString().split('T')[0];
  milestone.txHash = txHash;
  milestone.txHashShort = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;

  // Record audit event
  const auditList = memoryAuditEvents[tenderId] || [];
  auditList.push({
    eventId: `EVT-${tenderId}-${auditList.length + 1}`,
    action: 'MILESTONE_RELEASED',
    actor: 'Smart Contract Payment Escrow',
    actorRole: 'Smart Contract',
    timestamp: new Date().toISOString(),
    txHash,
    details: `Milestone ${milestone.id} (${milestone.title}) released. ${milestone.amount} ${milestone.currency} disbursed.`,
    verified: true
  });
  memoryAuditEvents[tenderId] = auditList;

  // Re-derive escrow
  const rawLedger = memoryEscrows[tenderId];
  const derived = deriveEscrow(rawLedger, list);

  return {
    success: true,
    milestone: { ...milestone },
    derivedEscrow: derived,
    txHash,
    mock: true
  };
}

export async function getTransactions(tenderId) {
  await delay(300);
  if (tenderId) {
    return memoryTransactions
      .filter((tx) => tx.tenderId === tenderId)
      .map((tx) => ({ ...tx, mock: true }));
  }
  return memoryTransactions.map((tx) => ({ ...tx, mock: true }));
}

export async function getAuditEvents(tenderId) {
  await delay(300);
  const events = memoryAuditEvents[tenderId] || [];
  return events.map((evt) => ({ ...evt, mock: true }));
}
