/**
 * Seed On-Chain Transactions for TenderGuard
 * All entries carry mock: true indicators until live MST integration.
 */
export const initialTransactions = [
  {
    txHash: '0x3f7a8b19c4d8e52a901f44c8b3e21078d123456789abcdef0123456789abcdef',
    txHashShort: '0x3f7a...cdef',
    action: 'CREATE_TENDER',
    tenderId: 'T001',
    blockNumber: 1849201,
    timestamp: '2026-09-01T10:00:00Z',
    from: '0xAuthority9284102948201948',
    to: '0x71C25e24b7a1f5926c920194827dbf820c78a19d',
    value: '100 MSTC',
    status: 'CONFIRMED_ON_RECORD',
    mock: true
  },
  {
    txHash: '0xa11f938c20194827dbf820c78a19d20c3829471b83e019283746192837461928',
    txHashShort: '0xa11f...1928',
    action: 'SUBMIT_COMMITMENT',
    tenderId: 'T001',
    blockNumber: 1849540,
    timestamp: '2026-09-05T11:20:00Z',
    from: '0xABCD12347890EFAB5678901234567890ABCD1234',
    to: '0x71C25e24b7a1f5926c920194827dbf820c78a19d',
    value: '0 MSTC',
    status: 'CONFIRMED_ON_RECORD',
    mock: true
  },
  {
    txHash: '0x1a8f9c20194827dbf820c78a19d20c3829471b83e0192837461928374619b401',
    txHashShort: '0x1a8f...b401',
    action: 'RELEASE_MILESTONE_1',
    tenderId: 'T001',
    blockNumber: 1853400,
    timestamp: '2026-10-28T14:30:00Z',
    from: '0x71C25e24b7a1f5926c920194827dbf820c78a19d',
    to: '0xABCD12347890EFAB5678901234567890ABCD1234',
    value: '30 MSTC',
    status: 'CONFIRMED_ON_RECORD',
    mock: true
  }
];
