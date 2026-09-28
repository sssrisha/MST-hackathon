/**
 * Escrow and Milestone Balance Derivations
 * Pure calculations ensuring single-source-of-truth derived balances.
 */
export function deriveEscrow(ledger, milestonesList = []) {
  if (!ledger) {
    return {
      authorityEscrow: 0,
      winnerBond: 0,
      bidDeposits: 0,
      released: 0,
      escrowLocked: 0,
      bondLocked: 0,
      totalLocked: 0,
      atRisk: 0,
      currency: 'MSTC',
      milestonesCount: 0,
      milestoneStatusRollup: {
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0
      }
    };
  }

  const authorityEscrow = Number(ledger.authorityEscrow) || 0;
  const winnerBond = Number(ledger.winnerPerformanceBond) || 0;
  const bidDeposits = Number(ledger.bidDeposits) || 0;
  const currency = ledger.currency || 'MSTC';

  // Calculate released from completed/released milestones
  let released = 0;
  let inProgressAmount = 0;
  let pendingAmount = 0;
  let atRisk = 0;

  const rollup = {
    total: milestonesList.length,
    completed: 0,
    inProgress: 0,
    pending: 0
  };

  milestonesList.forEach((m) => {
    const amt = Number(m.amount) || 0;
    const status = String(m.status).toUpperCase();

    if (status === 'RELEASED' || status === 'COMPLETED') {
      released += amt;
      rollup.completed += 1;
    } else if (status === 'IN_PROGRESS' || status === 'ACTIVE') {
      inProgressAmount += amt;
      rollup.inProgress += 1;
    } else if (status === 'DISPUTED' || status === 'FAILED') {
      atRisk += amt;
    } else {
      pendingAmount += amt;
      rollup.pending += 1;
    }
  });

  const escrowLocked = Math.max(0, authorityEscrow - released);
  const bondLocked = winnerBond;
  const totalLocked = escrowLocked + bondLocked;

  return {
    authorityEscrow,
    winnerBond,
    bidDeposits,
    bidDepositsRefunded: !!ledger.bidDepositsRefunded,
    released,
    escrowLocked,
    bondLocked,
    totalLocked,
    atRisk,
    inProgressAmount,
    pendingAmount,
    currency,
    milestonesCount: milestonesList.length,
    milestoneStatusRollup: rollup
  };
}
