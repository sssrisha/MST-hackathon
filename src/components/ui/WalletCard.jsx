import React, { useState } from 'react';
import { Wallet, Copy, Check, ShieldCheck, ArrowUpRight } from 'lucide-react';
import clsx from 'clsx';
import Card from './Card.jsx';
import { shortHash } from '../../utils/format.js';

export function WalletCard({
  walletAddress = '0xABCD12347890EFAB5678901234567890ABCD1234',
  balance = 500,
  currency = 'MSTC',
  roleLabel = 'Contractor Wallet',
  network = 'MST Testnet (Simulated)',
  className = ''
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <Card className={clsx('overflow-hidden', className)}>
      <div className="flex items-center justify-between pb-3.5 border-b border-[#1E2A44]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0B1220] border border-[#1E2A44] flex items-center justify-center text-blue-400">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">{roleLabel}</h4>
            <span className="text-[11px] text-slate-400">{network}</span>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/60 border border-emerald-800/80 text-emerald-300">
          CONNECTED
        </span>
      </div>

      <div className="pt-3.5 space-y-3 text-xs">
        {/* Balance Display */}
        <div className="p-3 rounded-lg bg-[#0B1220] border border-[#1E2A44] flex items-center justify-between">
          <span className="text-slate-400 text-xs">Testnet Balance</span>
          <div className="text-right">
            <span className="text-lg font-bold font-mono text-white tabular-nums">
              {balance} <span className="text-xs text-blue-400 font-normal">{currency}</span>
            </span>
            <span className="text-[10px] text-slate-500 block">Demo token, not real money</span>
          </div>
        </div>

        {/* Address Row */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B1220]/60 border border-[#1E2A44]/60">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-slate-500 font-semibold">Address</span>
            <span className="font-mono text-xs text-blue-300 select-all">
              {shortHash(walletAddress)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#111A2E] hover:bg-[#1E2A44] border border-[#1E2A44] text-slate-300 hover:text-white transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </Card>
  );
}

export default WalletCard;
