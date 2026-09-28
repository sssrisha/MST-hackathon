/**
 * Tamper-Evident Audit Trail Events for TenderGuard
 * Represents chronologically ordered verifiable events.
 */
export const initialAuditEvents = {
  T001: [
    {
      eventId: 'EVT-001-1',
      action: 'TENDER_REGISTERED',
      actor: 'Municipal Corporation Public Works',
      actorRole: 'Authority Admin',
      timestamp: '2026-09-01T10:00:00Z',
      txHash: '0x3f7a8b19c4d8e52a901f44c8b3e21078d123456789abcdef0123456789abcdef',
      details: 'Tender specification published with 100 MSTC escrow deposit.',
      verified: true
    },
    {
      eventId: 'EVT-001-2',
      action: 'BIDS_SEALED',
      actor: 'Smart Contract Engine',
      actorRole: 'Protocol',
      timestamp: '2026-09-10T18:00:00Z',
      txHash: '0x88f19c20194827dbf820c78a19d20c3829471b83e01928374619283746192841',
      details: 'Bidding window closed. 3 cryptographic bid commitments registered.',
      verified: true
    },
    {
      eventId: 'EVT-001-3',
      action: 'BIDS_REVEALED_AND_EVALUATED',
      actor: 'Smart Contract Engine',
      actorRole: 'Protocol',
      timestamp: '2026-09-12T14:30:00Z',
      txHash: '0x22c19c20194827dbf820c78a19d20c3829471b83e01928374619283746192899',
      details: 'Cryptographic salts verified. Policy scoring algorithm computed winner: TG-1042 (91.4 score).',
      verified: true
    },
    {
      eventId: 'EVT-001-4',
      action: 'AWARD_CONFIRMED',
      actor: 'Procurement Oversight Committee',
      actorRole: 'Auditor',
      timestamp: '2026-09-12T15:00:00Z',
      txHash: '0x33d19c20194827dbf820c78a19d20c3829471b83e01928374619283746192811',
      details: 'Risk score 18 (LOW) validated. Contract awarded to Apex Infra Ltd. 50 MSTC performance bond locked.',
      verified: true
    },
    {
      eventId: 'EVT-001-5',
      action: 'MILESTONE_RELEASED',
      actor: 'Chief Municipal Engineer',
      actorRole: 'Auditor',
      timestamp: '2026-10-28T14:30:00Z',
      txHash: '0x1a8f9c20194827dbf820c78a19d20c3829471b83e0192837461928374619b401',
      details: 'Milestone M1 (Site Preparation) approved. 30 MSTC disbursed to supplier.',
      verified: true
    }
  ],
  T002: [
    {
      eventId: 'EVT-002-1',
      action: 'TENDER_REGISTERED',
      actor: 'Smart Cities Mission Infrastructure',
      actorRole: 'Authority Admin',
      timestamp: '2026-09-10T10:00:00Z',
      txHash: '0x9c4e2a8b3f17d5e6901f88c7b4e32098a56789bcdef0123456789abcdef01234',
      details: 'Tender specification published with 100 MSTC escrow deposit.',
      verified: true
    },
    {
      eventId: 'EVT-002-2',
      action: 'AI_ANOMALY_FLAGGED',
      actor: 'TenderGuard AI Risk Engine',
      actorRole: 'AI Analytics',
      timestamp: '2026-09-22T10:15:00Z',
      txHash: '0x55e2a8b3f17d5e6901f88c7b4e32098a56789bcdef0123456789abcdef01299',
      details: 'AI risk assessment score 84 (HIGH). Multiple anomalous collusion factors detected.',
      verified: true
    },
    {
      eventId: 'EVT-002-3',
      action: 'TENDER_FROZEN',
      actor: 'Smart Contract Enforcement Rule',
      actorRole: 'Protocol',
      timestamp: '2026-09-22T10:16:00Z',
      txHash: '0x66f2a8b3f17d5e6901f88c7b4e32098a56789bcdef0123456789abcdef01200',
      details: 'Automated contract freeze activated. Award disbursements halted pending human auditor review.',
      verified: true
    }
  ]
};
