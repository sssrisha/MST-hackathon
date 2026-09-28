import React from 'react';
import { Lock, Unlock, ShieldCheck, Wallet, AlertCircle, Coins } from 'lucide-react';
import clsx from 'clsx';
import Card from './Card.jsx';
import TransactionBadge from './TransactionBadge.jsx';

export function EscrowCard({
  escrow,
  className = ''
}) {
  if (!escrow) return null;

  const derived = escrow.derived || escrow;
  const rawLedger = escrow.rawLedger || escrow;
  const currency = derived.currency || 'MSTC';

  return (
    <Card className={clsx('overflow-hidden', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#1E2A44]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0B1220] border border-[#1E2A44] flex items-center justify-center text-blue-400">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Smart Contract Escrow Ledger</h4>
            <p className="text-[11px] text-slate-400">Programmable milestone release & performance bonds</p>
          </div>
        </div>

        {rawLedger.contractAddress && (
          <TransactionBadge hash={rawLedger.contractAddress} label="Escrow Contract" />
        )}
      </div>

      {/* Main Locked / Released Metrics Banner */}
      <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
        {/* Total Locked */}
        <div className="p-3.5 rounded-lg bg-[#0B1220] border border-blue-900/60">
          <div className="flex items-center gap-1.5 text-blue-400 mb-1">
            <Lock className="w-3.5 h-3.5" />
            <span className="text-[11px] uppercase font-semibold">Total Locked</span>
          </div>
          <div className="text-lg font-bold font-mono text-white tabular-nums">
            {derived.totalLocked} <span className="text-xs text-blue-300 font-normal">{currency}</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Escrow (70) + Bond (50)</span>
        </div>

        {/* Released Funds */}
        <div className="p-3.5 rounded-lg bg-[#0B1220] border border-emerald-900/60">
          <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
            <Unlock className="w-3.5 h-3.5" />
            <span className="text-[11px] uppercase font-semibold">Released</span>
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400 tabular-nums">
            {derived.released} <span className="text-xs text-slate-400 font-normal">{currency}</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Disbursed to winner</span>
        </div>

        {/* Performance Bond */}
        <div className="p-3.5 rounded-lg bg-[#0B1220] border border-[#1E2A44]">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] uppercase font-semibold">Performance Bond</span>
          </div>
          <div className="text-lg font-bold font-mono text-slate-200 tabular-nums">
            {derived.bondLocked} <span className="text-xs text-slate-500 font-normal">{currency}</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Locked until sign-off</span>
        </div>

        {/* Bid Deposits */}
        <div className="p-3.5 rounded-lg bg-[#0B1220] border border-[#1E2A44]">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <Wallet className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] uppercase font-semibold">Bid Deposits</span>
          </div>
          <div className="text-lg font-bold font-mono text-slate-200 tabular-nums">
            {derived.bidDeposits} <span className="text-xs text-slate-500 font-normal">{currency}</span>
          </div>
          <span className="text-[10px] text-emerald-400 block mt-0.5">
            {rawLedger.bidDepositsStatus === 'REFUNDED_TO_NON_WINNERS' ? 'Refunded to non-winners' : 'Held in contract'}
          </span>
        </div>
      </div>

      {/* Contract Verification Footnote */}
      <div className="p-3 rounded-lg bg-[#0E1626]/60 border border-[#1E2A44] flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          Escrow controlled by contract. MSTC is a testnet demo token.
        </span>
        <span className="text-[11px] font-mono text-slate-500">
          Authority Escrow: {derived.authorityEscrow} {currency}
        </span>
      </div>
    </Card>
  );
}

export default EscrowCard;
