/**
 * Seed Bids for TenderGuard
 * Preserves cryptographic commitment hashes and mock reveal states.
 */
export const initialBids = {
  T001: [
    {
      bidId: 'B-T001-A',
      tenderId: 'T001',
      supplierId: 'TG-1042',
      contractorId: 'TG-1042',
      contractor: 'Contractor A (Apex Infra Ltd)',
      amount: 920000,
      commitmentHash: '0xa11f938c20194827dbf820c78a19d20c3829471b83e019283746192837461928',
      salt: '9f8e7d6c5b4a3120',
      submittedAt: '2026-09-05T11:20:00Z',
      revealedAt: '2026-09-12T14:00:00Z',
      status: 'AWARDED',
      bidRiskScore: 91
    },
    {
      bidId: 'B-T001-B',
      tenderId: 'T001',
      supplierId: 'TG-1077',
      contractor: 'Contractor B (BuildWell Corp)',
      amount: 840000,
      commitmentHash: '0xb22f938c20194827dbf820c78a19d20c3829471b83e019283746192837461929',
      salt: '8e7d6c5b4a31209f',
      submittedAt: '2026-09-06T09:15:00Z',
      revealedAt: '2026-09-12T14:10:00Z',
      status: 'VERIFIED',
      bidRiskScore: 60
    },
    {
      bidId: 'B-T001-C',
      tenderId: 'T001',
      supplierId: 'TG-1093',
      contractor: 'Contractor C (Civic Foundation Ltd)',
      amount: 880000,
      commitmentHash: '0xc33f938c20194827dbf820c78a19d20c3829471b83e019283746192837461930',
      salt: '7d6c5b4a31209f8e',
      submittedAt: '2026-09-07T16:45:00Z',
      revealedAt: '2026-09-12T14:22:00Z',
      status: 'VERIFIED',
      bidRiskScore: 88
    }
  ],
  T002: [
    {
      bidId: 'B-T002-A',
      tenderId: 'T002',
      supplierId: 'TG-1042',
      contractorId: 'TG-1042',
      contractor: 'Contractor A (Apex Infra Ltd)',
      amount: 800000,
      commitmentHash: '0xe55f938c20194827dbf820c78a19d20c3829471b83e019283746192837461932',
      salt: '5b4a31209f8e7d6c',
      submittedAt: '2026-09-15T09:00:00Z',
      revealedAt: '2026-09-22T10:05:00Z',
      status: 'FLAGGED_FOR_REVIEW'
    },
    {
      bidId: 'B-T002-B',
      tenderId: 'T002',
      supplierId: 'TG-1077',
      contractor: 'Contractor B (BuildWell Corp)',
      amount: 804000,
      commitmentHash: '0xf66f938c20194827dbf820c78a19d20c3829471b83e019283746192837461933',
      salt: '4a31209f8e7d6c5b',
      submittedAt: '2026-09-15T09:03:00Z',
      revealedAt: '2026-09-22T10:07:00Z',
      status: 'FLAGGED_FOR_REVIEW'
    },
    {
      bidId: 'B-T002-C',
      tenderId: 'T002',
      supplierId: 'TG-1093',
      contractor: 'Contractor C (Civic Foundation Ltd)',
      amount: 802500,
      commitmentHash: '0x177f938c20194827dbf820c78a19d20c3829471b83e019283746192837461934',
      salt: '31209f8e7d6c5b4a',
      submittedAt: '2026-09-15T09:05:00Z',
      revealedAt: '2026-09-22T10:10:00Z',
      status: 'FLAGGED_FOR_REVIEW'
    },
    {
      bidId: 'B-T002-D',
      tenderId: 'T002',
      supplierId: 'TG-1099',
      contractor: 'Contractor D (City Line Civil)',
      amount: 801500,
      commitmentHash: '0x288f938c20194827dbf820c78a19d20c3829471b83e019283746192837461935',
      salt: '209f8e7d6c5b4a31',
      submittedAt: '2026-09-15T09:06:00Z',
      revealedAt: '2026-09-22T10:12:00Z',
      status: 'FLAGGED_FOR_REVIEW'
    }
  ],
  T005: [
    {
      bidId: 'B-T005-demo',
      tenderId: 'T005',
      supplierId: 'TG-1042',
      contractorId: 'TG-1042',
      contractor: 'ABC Infrastructure Pvt Ltd',
      amount: null,
      commitmentHash: '0x4f8b2b51a31bf66eb83f8515e2f16f4e4d3b0d1a1d9d2a0d5c9d8e5b8e1d2f1',
      salt: 'ab12cd34ef56gh78',
      submittedAt: '2026-10-05T11:30:00Z',
      status: 'COMMITTED',
      bidRiskScore: 91,
      wallet: '0xabcd12347890efab5678901234567890abcd1234'
    }
  ]
};
