import React from 'react';
import { Building2, Award, CheckCircle2, AlertOctagon, History, Clock } from 'lucide-react';
import clsx from 'clsx';
import Card from './Card.jsx';
import TransactionBadge from './TransactionBadge.jsx';

export function SupplierReputationCard({
  supplier,
  className = ''
}) {
  if (!supplier) return null;

  return (
    <Card className={clsx('overflow-hidden', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#1E2A44]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0B1220] border border-[#1E2A44] flex items-center justify-center text-blue-400 font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">{supplier.name}</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-950/60 border border-blue-900/60 text-blue-300">
                {supplier.id}
              </span>
            </div>
            <div className="mt-1">
              <TransactionBadge hash={supplier.walletAddress} label="On-Chain State" />
            </div>
          </div>
        </div>

        {/* Reputation Badge */}
        <div className="flex items-center gap-3 bg-[#0B1220] p-2.5 rounded-lg border border-[#1E2A44] shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Reputation</span>
            <span className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
              {supplier.reputation} <span className="text-xs text-slate-500 font-normal">/ 100</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Grid of Verified Statistics */}
      <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-[#0B1220]/60 border border-[#1E2A44]/60">
          <span className="text-slate-400 block text-[11px] mb-1">Track Record</span>
          <div className="font-semibold text-white font-mono tabular-nums">
            {supplier.completedContracts} <span className="text-slate-400 font-normal">/ {supplier.wonContracts} won</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">{supplier.yearsActive} yrs active</span>
        </div>

        <div className="p-3 rounded-lg bg-[#0B1220]/60 border border-[#1E2A44]/60">
          <span className="text-slate-400 block text-[11px] mb-1">On-Time Delivery</span>
          <div className="font-semibold text-emerald-400 font-mono tabular-nums">
            {supplier.onTimePercentage}%
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Audited delivery</span>
        </div>

        <div className="p-3 rounded-lg bg-[#0B1220]/60 border border-[#1E2A44]/60">
          <span className="text-slate-400 block text-[11px] mb-1">Avg Performance</span>
          <div className="font-semibold text-blue-400 font-mono tabular-nums">
            {supplier.avgPerformance} / 100
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Quality rating</span>
        </div>

        <div className="p-3 rounded-lg bg-[#0B1220]/60 border border-[#1E2A44]/60">
          <span className="text-slate-400 block text-[11px] mb-1">Disputes & Bonds</span>
          <div className="font-semibold text-slate-200 font-mono tabular-nums">
            {supplier.disputes} <span className="text-slate-500 font-normal">disp / {supplier.bondsLost} lost</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Value: {supplier.totalValue}</span>
        </div>
      </div>
    </Card>
  );
}

export default SupplierReputationCard;
