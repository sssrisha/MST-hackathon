export const TENDER_STATUSES = [
  'DRAFT',
  'OPEN',
  'SEALED',
  'CLOSED',
  'REVEAL',
  'ANALYZING',
  'LOW_RISK',
  'HIGH_RISK',
  'AWARDED',
  'FROZEN',
  'AUDITED'
];

export const STATUS_META = {
  DRAFT: {
    status: 'DRAFT',
    label: 'Draft',
    color: 'gray',
    description: 'Tender specification is being drafted and not yet published.'
  },
  OPEN: {
    status: 'OPEN',
    label: 'Open for Bidding',
    color: 'blue',
    description: 'Accepting sealed cryptographic bid commitments from verified contractors.'
  },
  SEALED: {
    status: 'SEALED',
    label: 'Bids Sealed',
    color: 'blue',
    description: 'Bidding closed; cryptographic commitments recorded in tamper-evident record.'
  },
  CLOSED: {
    status: 'CLOSED',
    label: 'Closed',
    color: 'gray',
    description: 'Bidding window concluded; awaiting opening of reveal phase.'
  },
  REVEAL: {
    status: 'REVEAL',
    label: 'Reveal Phase',
    color: 'amber',
    description: 'Contractors are revealing bid values and verification salts.'
  },
  ANALYZING: {
    status: 'ANALYZING',
    label: 'Analyzing',
    color: 'amber',
    description: 'AI-assisted risk assessment and bid distribution analysis in progress.'
  },
  LOW_RISK: {
    status: 'LOW_RISK',
    label: 'Low Risk',
    color: 'green',
    description: 'AI-assisted risk assessment indicates healthy and competitive bid distribution.'
  },
  HIGH_RISK: {
    status: 'HIGH_RISK',
    label: 'High Risk',
    color: 'red',
    description: 'Suspicious bidding pattern detected; human review required.'
  },
  AWARDED: {
    status: 'AWARDED',
    label: 'Awarded',
    color: 'green',
    description: 'Contract successfully awarded and registered on tamper-evident record.'
  },
  FROZEN: {
    status: 'FROZEN',
    label: 'Frozen for Review',
    color: 'red',
    description: 'Tender frozen for review by authorized compliance and audit personnel.'
  },
  AUDITED: {
    status: 'AUDITED',
    label: 'Audited',
    color: 'green',
    description: 'Full procurement cycle independently verified with complete audit trail.'
  }
};

export function getStatusMeta(status) {
  if (!status) {
    return {
      status: 'UNKNOWN',
      label: 'Unknown',
      color: 'gray',
      description: 'Status unavailable.'
    };
  }
  return (
    STATUS_META[status] || {
      status,
      label: status.replace(/_/g, ' '),
      color: 'gray',
      description: 'Status specification.'
    }
  );
}

export function getRiskLevel(score) {
  const numericScore = Number(score) || 0;
  if (numericScore <= 39) {
    return {
      level: 'LOW',
      label: 'Low Risk',
      color: 'green',
      score: numericScore,
      description: 'AI-assisted risk assessment indicates normal variance.'
    };
  }
  if (numericScore <= 69) {
    return {
      level: 'MEDIUM',
      label: 'Medium Risk',
      color: 'amber',
      score: numericScore,
      description: 'Moderate variance identified; observation recommended.'
    };
  }
  return {
    level: 'HIGH',
    label: 'High Risk',
    color: 'red',
    score: numericScore,
    description: 'Suspicious bidding pattern detected; human review required.'
  };
}
