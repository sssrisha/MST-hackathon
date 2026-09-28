import React, { useEffect, useState } from 'react';
import Placeholder from '../components/ui/Placeholder.jsx';
import * as escrowService from '../services/escrowService.js';

export function AuditorBlockchainPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      escrowService.getTransactions(),
      escrowService.getAuditEvents('T001'),
      escrowService.getAuditEvents('T002')
    ]).then(([txs, evts1, evts2]) => {
      setData({
        transactions: txs,
        auditTrailT001: evts1,
        auditTrailT002: evts2
      });
    });
  }, []);

  return (
    <Placeholder
      title="Blockchain Ledger & Event Explorer"
      description="Inspect all on-chain smart contract transactions, cryptographic state transitions, and tamper-evident event trails."
      data={data}
    />
  );
}

export default AuditorBlockchainPage;
