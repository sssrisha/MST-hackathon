/**
 * Escrow Ledgers for TenderGuard
 * Raw on-chain escrow deposits and lockups.
 * All derived balances (released, locked, atRisk) MUST be computed via deriveEscrow().
 */
export const initialEscrows = {
  T001: {
    tenderId: 'T001',
    contractAddress: '0x71C25e24b7a1f5926c920194827dbf820c78a19d',
    contractAddressShort: '0x71C...49A1',
    currency: 'MSTC',
    authorityEscrow: 100,
    winnerPerformanceBond: 50,
    bidDeposits: 40,
    bidDepositsRefunded: true,
    bidDepositsStatus: 'REFUNDED_TO_NON_WINNERS',
    milestonesTotal: 100,
    createdAt: '2026-09-01T10:00:00Z',
    lastUpdated: '2026-10-28T14:30:00Z'
  },
  T002: {
    tenderId: 'T002',
    contractAddress: '0x99B35e24b7a1f5926c920194827dbf820c78a22e',
    contractAddressShort: '0x99B...a22e',
    currency: 'MSTC',
    authorityEscrow: 100,
    winnerPerformanceBond: 0,
    bidDeposits: 40,
    bidDepositsRefunded: false,
    bidDepositsStatus: 'LOCKED_IN_ESCROW',
    milestonesTotal: 100,
    createdAt: '2026-09-10T10:00:00Z',
    lastUpdated: '2026-09-22T10:15:00Z'
  }
};
