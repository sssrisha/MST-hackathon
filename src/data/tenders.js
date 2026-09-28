/**
 * Seed Tenders for TenderGuard
 * Maintains full backwards compatibility with initial data schema.
 */
export const initialTenders = [
  {
    id: 'T001',
    title: 'Municipal School Renovation',
    description: 'Structural retrofitting, electrical upgrades, and interior renewal for civic school complex.',
    department: 'Municipal Corporation Public Works',
    budget: 1000000,
    deadline: '2026-10-15T18:00:00Z',
    status: 'AWARDED',
    phase: 'AWARDED',
    bidCount: 3,
    riskScore: 18,
    riskLevel: 'LOW',
    contractAwardee: 'Contractor A (Apex Infra Ltd)',
    winnerSupplierId: 'TG-1042',
    awardedAmount: 920000,
    authorityEscrow: 100,
    winnerBond: 50,
    bidDeposit: 10,
    performanceBond: 50,
    location: 'Bengaluru',
    milestones: [
      { id: 'M1', title: 'Site Preparation', amount: 30, status: 'RELEASED' },
      { id: 'M2', title: 'Foundation', amount: 20, status: 'IN_PROGRESS' },
      { id: 'M3', title: 'Final Completion', amount: 50, status: 'PENDING' }
    ],
    createdAt: '2026-09-01T10:00:00Z',
    onChainRecordHash: '0x3f7a8b19c4d8e52a901f44c8b3e21078d123456789abcdef0123456789abcdef'
  },
  {
    id: 'T002',
    title: 'Smart City Road Project',
    description: 'Arterial road construction, stormwater drainage, and smart sensor grid installation.',
    department: 'Smart Cities Mission Infrastructure',
    budget: 1000000,
    deadline: '2026-10-20T18:00:00Z',
    status: 'FROZEN',
    phase: 'FROZEN',
    bidCount: 4,
    riskScore: 84,
    riskLevel: 'HIGH',
    statusReason: 'Suspicious bidding pattern detected; human review required.',
    createdAt: '2026-09-10T10:00:00Z',
    onChainRecordHash: '0x9c4e2a8b3f17d5e6901f88c7b4e32098a56789bcdef0123456789abcdef01234'
  },
  {
    id: 'T003',
    title: 'Road Infrastructure Project',
    description: 'Road widening, maintenance, and drainage works for urban corridor expansion.',
    department: 'Infrastructure',
    budget: 24000000,
    deadline: '2026-10-12T18:00:00Z',
    status: 'OPEN',
    phase: 'OPEN',
    bidCount: 0,
    riskScore: null,
    riskLevel: 'PENDING',
    location: 'Bengaluru',
    bidDeposit: 10,
    performanceBond: 50,
    milestones: [
      { id: 'M1', title: 'Site Survey', amount: 25, status: 'PENDING' },
      { id: 'M2', title: 'Road Works', amount: 40, status: 'PENDING' },
      { id: 'M3', title: 'Handover', amount: 35, status: 'PENDING' }
    ],
    createdAt: '2026-10-01T10:00:00Z',
    onChainRecordHash: '0x2b7c8d9e0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6'
  },
  {
    id: 'T004',
    title: 'Water Pipeline Rehabilitation',
    description: 'Rehabilitate aging pipelines, valves, and district metering points for water supply continuity.',
    department: 'Infrastructure',
    budget: 16000000,
    deadline: '2026-11-18T18:00:00Z',
    status: 'OPEN',
    phase: 'OPEN',
    bidCount: 1,
    riskScore: null,
    riskLevel: 'PENDING',
    location: 'Mysuru',
    bidDeposit: 10,
    performanceBond: 50,
    milestones: [
      { id: 'M1', title: 'Inspection', amount: 20, status: 'PENDING' },
      { id: 'M2', title: 'Replacement', amount: 35, status: 'PENDING' },
      { id: 'M3', title: 'Testing', amount: 45, status: 'PENDING' }
    ],
    createdAt: '2026-10-03T10:00:00Z',
    onChainRecordHash: '0x3d7c9e1b2a3d4f5e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7'
  },
  {
    id: 'T005',
    title: 'Public Building Retrofit',
    description: 'Energy-retrofit works including facade improvements, systems upgrades, and safety modernization.',
    department: 'Infrastructure',
    budget: 18000000,
    deadline: '2026-10-08T18:00:00Z',
    status: 'REVEAL',
    phase: 'REVEAL',
    bidCount: 1,
    riskScore: null,
    riskLevel: 'PENDING',
    location: 'Hubballi',
    bidDeposit: 10,
    performanceBond: 50,
    milestones: [
      { id: 'M1', title: 'Assessment', amount: 15, status: 'PENDING' },
      { id: 'M2', title: 'Retrofit', amount: 35, status: 'PENDING' },
      { id: 'M3', title: 'Commissioning', amount: 50, status: 'PENDING' }
    ],
    createdAt: '2026-10-05T10:00:00Z',
    onChainRecordHash: '0x4e8d0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8'
  }
];
