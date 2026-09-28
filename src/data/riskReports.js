/**
 * Seed AI Risk Analysis Reports
 * Evaluated off-chain and logged to tamper-evident records.
 */
export const initialRiskReports = {
  T001: {
    tenderId: 'T001',
    riskScore: 18,
    riskLevel: 'LOW',
    status: 'LOW_RISK',
    summary: 'AI-assisted risk assessment indicates normal, competitive distribution.',
    factors: [
      {
        factor: 'Bid spread variance',
        points: 5,
        max: 25,
        percentage: 20,
        description: 'Healthy price dispersion (8.7% spread across 3 bidders).'
      },
      {
        factor: 'Submission timing correlation',
        points: 4,
        max: 25,
        percentage: 16,
        description: 'Submissions distributed normally across the active window.'
      },
      {
        factor: 'Supplier independence',
        points: 5,
        max: 25,
        percentage: 20,
        description: 'No shared corporate officers, beneficial owners, or digital footprints.'
      },
      {
        factor: 'Historical rotation index',
        points: 4,
        max: 25,
        percentage: 16,
        description: 'Standard historical win frequencies among participants.'
      }
    ]
  },
  T002: {
    tenderId: 'T002',
    riskScore: 84,
    riskLevel: 'HIGH',
    status: 'FROZEN',
    summary: 'Suspicious bidding pattern detected across 4 submitted proposals. Tender frozen for review.',
    factors: [
      {
        factor: 'Bid similarity',
        points: 25,
        max: 25,
        percentage: 100,
        description: 'Near-identical line-item cost structure and digital metadata signatures.'
      },
      {
        factor: 'Small bid spread',
        points: 25,
        max: 25,
        percentage: 100,
        description: 'Bid spread is within 0.5% (₹4,000 variance on ₹8,00,000 base).'
      },
      {
        factor: 'Repeated co-bidding',
        points: 20,
        max: 25,
        percentage: 80,
        description: 'Bidding group has co-participated in 14 municipal tenders over 12 months.'
      },
      {
        factor: 'Winner rotation',
        points: 14,
        max: 25,
        percentage: 56,
        description: 'Predictable cyclical award succession detected across preceding rounds.'
      }
    ]
  }
};
