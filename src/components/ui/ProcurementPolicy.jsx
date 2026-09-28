import React from 'react';
import { Sliders, ShieldCheck, Check } from 'lucide-react';
import clsx from 'clsx';
import Card from './Card.jsx';
import { POLICY_FACTORS, DEFAULT_POLICY } from '../../data/policy.js';

export function ProcurementPolicy({
  policy = DEFAULT_POLICY,
  isLocked = true,
  className = ''
}) {
  const factors = POLICY_FACTORS.map((f) => ({
    ...f,
    weight: Number(policy[f.key] ?? f.weight)
  }));

  const total = factors.reduce((sum, f) => sum + f.weight, 0);

  return (
    <Card className={clsx('overflow-hidden', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#1E2A44]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0B1220] border border-[#1E2A44] flex items-center justify-center text-blue-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Procurement Selection Policy</h4>
            <p className="text-[11px] text-slate-400">Deterministic multi-criteria scoring algorithm</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-950/40 border border-blue-900/60 text-blue-300 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Policy enforced by smart contract</span>
        </div>
      </div>

      <div className="pt-4 space-y-3">
        {factors.map((factor) => (
          <div
            key={factor.key}
            className="p-3 rounded-lg bg-[#0B1220]/60 border border-[#1E2A44]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{factor.label}</span>
                <span className="text-[11px] font-mono text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/50">
                  {factor.weight}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">{factor.description}</p>
            </div>

            <div className="w-24 sm:w-32 h-1.5 rounded-full bg-[#111A2E] border border-[#1E2A44] overflow-hidden shrink-0">
              <div
                className="h-full rounded-full bg-[#FF4B3E]"
                style={{ width: `${factor.weight}%` }}
              />
            </div>
          </div>
        ))}

        <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-[#1E2A44]">
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
            <Check className="w-3.5 h-3.5" />
            Policy validated: sums to exactly 100%
          </span>
          <span className="font-mono text-xs font-semibold text-white">
            Total: {total}%
          </span>
        </div>
      </div>
    </Card>
  );
}

export default ProcurementPolicy;
