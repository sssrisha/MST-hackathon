import React, { useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import TransactionBadge from '../components/ui/TransactionBadge.jsx';
import RiskScoreCard from '../components/ui/RiskScoreCard.jsx';
import RiskBreakdown from '../components/ui/RiskBreakdown.jsx';
import DecisionScore from '../components/ui/DecisionScore.jsx';
import DecisionBreakdown from '../components/ui/DecisionBreakdown.jsx';
import ProcurementPolicy from '../components/ui/ProcurementPolicy.jsx';
import SupplierReputationCard from '../components/ui/SupplierReputationCard.jsx';
import EscrowCard from '../components/ui/EscrowCard.jsx';
import MilestoneCard from '../components/ui/MilestoneCard.jsx';
import BlockchainTimeline from '../components/ui/BlockchainTimeline.jsx';
import AuditEvent from '../components/ui/AuditEvent.jsx';
import WalletCard from '../components/ui/WalletCard.jsx';
import DemoDataBadge from '../components/ui/DemoDataBadge.jsx';

import * as tenderService from '../services/tenderService.js';
import * as supplierRegistry from '../services/supplierRegistry.js';
import * as riskService from '../services/riskService.js';
import * as escrowService from '../services/escrowService.js';

export function DevComponentsPage() {
  const [data, setData] = useState({
    supplierA: null,
    riskT002: null,
    riskT001: null,
    decisionT001: null,
    escrowT001: null,
    milestonesT001: [],
    auditEventsT001: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      try {
        const [sup, r2, r1, dec1, esc1, mls1, evts1] = await Promise.all([
          supplierRegistry.getSupplier('TG-1042'),
          riskService.getRiskReport('T002'),
          riskService.getRiskReport('T001'),
          tenderService.getDecisionReport('T001'),
          escrowService.getEscrow('T001'),
          escrowService.getMilestones('T001'),
          escrowService.getAuditEvents('T001')
        ]);
        setData({
          supplierA: sup,
          riskT002: r2,
          riskT001: r1,
          decisionT001: dec1,
          escrowT001: esc1,
          milestonesT001: mls1,
          auditEventsT001: evts1
        });
      } catch (e) {
        console.error('Failed loading dev components data', e);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  return (
    <div className="space-y-8 pb-16">
      {/* Dev Header */}
      <div className="p-4 rounded-lg bg-amber-950/30 border border-amber-800/60 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-900/60 px-2 py-0.5 rounded">
            DEV ONLY
          </span>
          <h2 className="text-lg font-bold text-white mt-1">Component Gallery & Visual Verification</h2>
          <p className="text-xs text-amber-300/80">
            Rendered with unified domain model & pure calculators (TenderGuard Foundation).
          </p>
        </div>
        <DemoDataBadge />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading service fixtures...</div>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Transaction & Demo Badges */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              1. Badges & Micro-Components
            </h3>
            <Card>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <TransactionBadge hash="0x3f7a8b19c4d8e52a901f44c8b3e21078d123456789abcdef0123456789abcdef" label="Tender Hash" />
                <TransactionBadge hash="0x1a8f9c20194827dbf820c78a19d20c3829471b83e0192837461928374619b401" label="Milestone Tx" />
                <DemoDataBadge />
              </div>
            </Card>
          </section>

          {/* Section 2: Wallet Card & Supplier Reputation Card */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                2. Wallet Card
              </h3>
              <WalletCard />
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                3. Supplier Reputation Card (TG-1042)
              </h3>
              {data.supplierA && <SupplierReputationCard supplier={data.supplierA} />}
            </div>
          </section>

          {/* Section 3: Risk Assessment Components */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              4. AI Risk Assessment & Factor Breakdown (T002 Suspicious Scenario)
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {data.riskT002 && (
                <RiskScoreCard
                  score={data.riskT002.riskScore}
                  title="Smart City Road Project (T002)"
                  summary={data.riskT002.summary}
                />
              )}
              {data.riskT002 && (
                <RiskBreakdown
                  factors={data.riskT002.factors}
                  tenderId="T002"
                />
              )}
            </div>
          </section>

          {/* Section 4: Decision Score & Breakdown */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              5. Decision Score & Policy Breakdown (T001 Municipal School Renovation)
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {data.decisionT001 && (
                <DecisionScore
                  score={data.decisionT001.finalScore}
                  winnerName={data.decisionT001.winner?.supplierName}
                  tenderTitle="Municipal School Renovation (T001)"
                  rank={1}
                />
              )}
              {data.decisionT001 && (
                <DecisionBreakdown
                  breakdown={data.decisionT001.perSupplierBreakdown}
                  finalScore={data.decisionT001.finalScore}
                  supplierName={data.decisionT001.winner?.supplierName}
                />
              )}
            </div>
          </section>

          {/* Section 5: Procurement Policy */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              6. Procurement Policy Specification
            </h3>
            <ProcurementPolicy />
          </section>

          {/* Section 6: Escrow & Milestones */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              7. Escrow Ledger & Milestone Cards (T001)
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                {data.escrowT001 && <EscrowCard escrow={data.escrowT001} />}
              </div>
              <div className="lg:col-span-2 space-y-3">
                {data.milestonesT001.map((m) => (
                  <MilestoneCard key={m.id} milestone={m} />
                ))}
              </div>
            </div>
          </section>

          {/* Section 7: Blockchain Timeline & Single Audit Event */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              8. Blockchain Timeline & Audit Trail (T001)
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <BlockchainTimeline events={data.auditEventsT001} />
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase">Single Event Item</h4>
                {data.auditEventsT001[0] && (
                  <AuditEvent event={data.auditEventsT001[0]} />
                )}
                {data.auditEventsT001[3] && (
                  <AuditEvent event={data.auditEventsT001[3]} />
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default DevComponentsPage;
