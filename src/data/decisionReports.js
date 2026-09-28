/**
 * Seed Decision Reports
 * Stores metadata and contextual explanations for procurement award decisions.
 */
export const initialDecisionReports = {
  T001: {
    tenderId: 'T001',
    tenderTitle: 'Municipal School Renovation',
    policyEnforcedBy: 'MST Smart Contract (0x71C...49A1)',
    explanation:
      'Supplier A (Apex Infra Ltd) achieved the highest overall decision score (91.4) despite submitting the highest initial bid (₹9,20,000), as superior verifiable reputation (91) and past performance (92) weighted higher under the smart contract procurement policy.',
    timestamp: '2026-09-12T15:00:00Z',
    status: 'AWARDED'
  }
};
