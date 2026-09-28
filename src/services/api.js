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
