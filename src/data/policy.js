/**
 * Single source of truth for TenderGuard selection policy weights.
 * Total must sum to exactly 100.
 */
export const DEFAULT_POLICY = {
  price: 35,
  supplierReputation: 25,
  pastPerformance: 15,
  onTimePerformance: 10,
  bidRisk: 10,
  experience: 5
};

export const POLICY_FACTORS = [
  {
    key: 'price',
    label: 'Price Competitiveness',
    weight: 35,
    description: 'Calculated relative to the lowest valid revealed bid: round(100 * lowestBid / bid).'
  },
  {
    key: 'supplierReputation',
    label: 'Supplier Reputation',
    weight: 25,
    description: 'Verifiable historical track record, completion rate, and dispute index.'
  },
  {
    key: 'pastPerformance',
    label: 'Past Performance',
    weight: 15,
    description: 'Average quality and technical delivery score from audited projects.'
  },
  {
    key: 'onTimePerformance',
    label: 'On-Time Performance',
    weight: 10,
    description: 'Percentage of project milestones completed on or ahead of schedule.'
  },
  {
    key: 'bidRisk',
    label: 'Bid Risk Profile',
    weight: 10,
    description: 'Off-chain AI risk assessment evaluating statistical collusion or anomaly metrics.'
  },
  {
    key: 'experience',
    label: 'Domain Experience',
    weight: 5,
    description: 'Years in active service and category volume qualification.'
  }
];
