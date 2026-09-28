/**
 * TenderGuard Unified API Service (Bridge / Compatibility Layer)
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

import * as tenderService from './tenderService.js';
import * as riskService from './riskService.js';
import * as escrowService from './escrowService.js';

const BLOCKCHAIN_API_BASE = import.meta.env.VITE_BLOCKCHAIN_API_URL || 'http://127.0.0.1:3001';

async function blockchainRequest(path) {
  let response;
  try {
    response = await fetch(`${BLOCKCHAIN_API_BASE}${path}`, {
      headers: { Accept: 'application/json' }
    });
  } catch {
    throw new Error('Unable to connect to the local blockchain backend.');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || `Blockchain API request failed (${response.status}).`);
  }
  return data;
}

export async function getBlockchainHealth() {
  const data = await blockchainRequest('/health');
  return {
    connected: data?.status === 'healthy' || data?.status === 'ok' || Boolean(data?.connected),
    ...data
  };
}

export function getTenderSummary(tenderId) {
  return blockchainRequest(`/api/blockchain/tenders/${encodeURIComponent(tenderId)}/summary`);
}

export function getDemoTender() {
  return blockchainRequest('/api/blockchain/demo/tender');
}

export const USE_MOCK = true;

export async function getTenders() {
  return tenderService.getTenders();
}

export async function getTender(id) {
  return tenderService.getTender(id);
}

export async function createTender(data) {
  return tenderService.createTender(data);
}

export async function submitBid(data) {
  return tenderService.submitSealedBid(data);
}

export async function revealBid(data) {
  return tenderService.revealBid(data);
}

export async function getRiskAnalysis(id) {
  return riskService.getRiskReport(id);
}

export async function getAuditTrail(id) {
  return escrowService.getAuditEvents(id);
}
