import { DEFAULT_POLICY, POLICY_FACTORS } from '../data/policy.js';
import { initialSuppliers } from '../data/suppliers.js';
import { initialBids } from '../data/bids.js';

/**
 * Pure price score calculator.
 * Formula: round(100 * lowestBid / bid)
 * Integer in range [0, 100].
 */
export function priceScore(bid, lowestBid) {
  const numericBid = Number(bid);
  const numericLowest = Number(lowestBid);
  if (!numericBid || numericBid <= 0 || !numericLowest || numericLowest <= 0) {
    return 0;
  }
  return Math.round(100 * (numericLowest / numericBid));
}

/**
 * Evaluates risk level classification based on 0-100 risk score.
 */
export function riskLevel(score) {
  const num = Number(score) || 0;
  if (num <= 39) return 'LOW';
  if (num <= 69) return 'MEDIUM';
  return 'HIGH';
}

/**
 * Validates that policy weights total exactly 100.
 */
export function validatePolicy(weights) {
  if (!weights || typeof weights !== 'object') {
    return { valid: false, sum: 0, error: 'Policy weights must be an object' };
  }
  const sum = Object.values(weights).reduce((acc, val) => acc + (Number(val) || 0), 0);
  return {
    valid: sum === 100,
    sum,
    error: sum === 100 ? null : `Policy weights must sum to exactly 100 (current: ${sum})`
  };
}

/**
 * Pure function to compute transparent multi-factor procurement decision.
 * Returns { winner, ranking, perSupplierBreakdown, finalScore, tenderId, policy }
 */
export function computeDecision(
  tenderId,
  policyWeights = DEFAULT_POLICY,
  bidsMap = initialBids,
  suppliersList = initialSuppliers
) {
  const tenderBids = bidsMap[tenderId] || [];
  if (tenderBids.length === 0) {
    return {
      tenderId,
      policy: policyWeights,
      winner: null,
      ranking: [],
      perSupplierBreakdown: [],
      finalScore: 0
    };
  }

  // Find lowest bid amount among all valid bids
  const validBids = tenderBids.filter((b) => Number(b.amount) > 0);
  const lowestBid = validBids.length > 0
    ? Math.min(...validBids.map((b) => Number(b.amount)))
    : 0;

  const ranking = tenderBids.map((bid) => {
    const supplier =
      suppliersList.find((s) => s.id === bid.supplierId) ||
      suppliersList.find((s) => bid.contractor?.includes(s.name)) ||
      {
        id: bid.supplierId || 'UNKNOWN',
        name: bid.contractor || 'Unknown Contractor',
        reputation: 70,
        avgPerformance: 75,
        onTimePercentage: 80,
        bidRiskScore: 70,
        experienceScore: 60
      };

    const pScore = priceScore(bid.amount, lowestBid);
    const repScore = Math.round(Number(supplier.reputation) || 0);
    const pastPerfScore = Math.round(Number(supplier.avgPerformance) || 0);
    const onTimeScore = Math.round(Number(supplier.onTimePercentage) || 0);
    const bidRiskScore = Math.round(Number(supplier.bidRiskScore ?? bid.bidRiskScore ?? 80));
    const expScore = Math.round(Number(supplier.experienceScore) || 0);

    const subScores = {
      price: pScore,
      supplierReputation: repScore,
      pastPerformance: pastPerfScore,
      onTimePerformance: onTimeScore,
      bidRisk: bidRiskScore,
      experience: expScore
    };

    const breakdown = POLICY_FACTORS.map((factor) => {
      const weight = Number(policyWeights[factor.key]) || 0;
      const subScore = subScores[factor.key] ?? 0;
      const contribution = Math.round(((weight * subScore) / 100) * 100) / 100;

      return {
        factor: factor.key,
        label: factor.label,
        weight,
        subScore,
        contribution
      };
    });

    // decisionScore = round1(sum(weight * subScore) / 100)
    const weightedSum = Object.entries(policyWeights).reduce((sum, [key, weight]) => {
      const sScore = subScores[key] ?? 0;
      return sum + (Number(weight) * sScore);
    }, 0);

    const decisionScore = Math.round((weightedSum / 100) * 10) / 10;

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      contractor: bid.contractor,
      bidId: bid.bidId,
      bidAmount: bid.amount,
      priceScore: pScore,
      decisionScore,
      riskLevel: riskLevel(100 - bidRiskScore),
      breakdown,
      supplier
    };
  });

  // Sort descending by decision score
  ranking.sort((a, b) => b.decisionScore - a.decisionScore);

  const winner = ranking[0] || null;

  return {
    tenderId,
    policy: policyWeights,
    winner,
    ranking,
    perSupplierBreakdown: winner ? winner.breakdown : [],
    finalScore: winner ? winner.decisionScore : 0
  };
}
