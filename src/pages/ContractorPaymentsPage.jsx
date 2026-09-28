import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card.jsx';
import EscrowCard from '../components/ui/EscrowCard.jsx';
import * as contractorService from '../services/contractorService.js';

export function ContractorPaymentsPage() {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    async function load() {
      const data = await contractorService.getPayments();
      setPayments(data);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-[#FF6B4A] font-semibold">Payments</div>
        <h1 className="mt-2 text-3xl font-bold text-white">Escrow & disbursements</h1>
      </div>

      {payments.length === 0 ? (
        <Card><p className="text-slate-300">No payment records are available for this contractor yet.</p></Card>
      ) : (
        payments.map((payment) => (
          <EscrowCard key={payment.tenderId} escrow={{
            tenderId: payment.tenderId,
            contractAddress: payment.txHash,
            authorityEscrow: payment.locked,
            winnerPerformanceBond: payment.bond,
            bidDeposits: payment.locked,
            currency: 'MSTC',
            derived: {
              totalLocked: payment.locked,
              released: payment.totalReleased,
              bondLocked: payment.bond,
              bidDeposits: payment.locked,
              authorityEscrow: payment.locked,
              currency: 'MSTC'
            },
            rawLedger: {
              contractAddress: payment.txHash,
              bidDepositsStatus: 'LOCKED_IN_ESCROW'
            }
          }} />
        ))
      )}
    </div>
  );
}

export default ContractorPaymentsPage;
