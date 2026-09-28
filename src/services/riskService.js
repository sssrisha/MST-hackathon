/**
 * TenderGuard AI Risk Analysis Service
 * 
 * Future FastAPI Route Mappings:
 * - getRiskReport(id) -> GET  /api/risk/:id
 */

import { initialRiskReports } from '../data/riskReports.js';
import { initialTenders } from '../data/tenders.js';

export const USE_MOCK = true;

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getRiskReport(tenderId) {
  await delay(350);
  const existing = initialRiskReports[tenderId];
  if (existing) {
    return { ...existing, mock: true };
  }

  const tender = initialTenders.find((t) => t.id === tenderId);
  const score = tender?.riskScore ?? 25;

  return {
    tenderId,
    riskScore: score,
    riskLevel: score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW',
    status: score >= 70 ? 'FROZEN' : 'LOW_RISK',
    summary:
      score >= 70
        ? 'Suspicious bidding pattern detected across submitted proposals. Tender frozen for review.'
        : 'AI-assisted risk assessment indicates normal, competitive distribution.',
    factors: [
      {
        factor: 'Bid spread variance',
        points: score >= 70 ? 25 : 5,
        max: 25,
        percentage: score >= 70 ? 100 : 20,
        description: score >= 70 ? 'Extremely tight spread indicating potential coordination.' : 'Normal price spread.'
      },
      {
        factor: 'Timing correlation',
        points: score >= 70 ? 20 : 4,
        max: 25,
        percentage: score >= 70 ? 80 : 16,
        description: 'Submission timing interval analysis.'
      }
    ],
    mock: true
  };
}
