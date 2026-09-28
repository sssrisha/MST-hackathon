import React from 'react';
import { BarChart3, Scale, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import Card from './Card.jsx';

export function DecisionBreakdown({
  breakdown = [],
  finalScore = 0,
  supplierName,
  className = ''
}) {
  if (!breakdown || breakdown.length === 0) {
    return null;
  }

  return (
    <Card className={clsx('overflow-hidden', className)}>
      <div className="flex items-center justify-between pb-4 border-b border-[#1E2A44]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#0B1220] border border-[#1E2A44] flex items-center justify-center text-blue-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Policy Decision Breakdown</h4>
            {supplierName && (
              <p className="text-[11px] text-slate-400">Evaluated for: {supplierName}</p>
            )}
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Score</span>
          <span className="text-base font-bold font-mono text-emerald-400 tabular-nums">
            {Number(finalScore).toFixed(1)} / 100
          </span>
        </div>
      </div>

      <div className="pt-4 space-y-3.5">
        {breakdown.map((item) => (
          <div key={item.factor || item.label} className="space-y-1.5 p-3 rounded-lg bg-[#0B1220]/60 border border-[#1E2A44]/60">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-200">{item.label || item.factor}</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded bg-blue-950/50 border border-blue-900/60 text-blue-300 font-mono">
                  {item.weight}% weight
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-slate-400">raw: {item.subScore}</span>
                <span className="text-emerald-400 font-semibold tabular-nums">
                  +{Number(item.contribution).toFixed(2)} pts
                </span>
              </div>
            </div>

            {/* Contribution visual bar */}
            <div className="w-full h-1.5 rounded-full bg-[#111A2E] border border-[#1E2A44] overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${Math.min(100, item.subScore)}%` }}
              />
            </div>
          </div>
        ))}

        <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-[#1E2A44]">
          <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            Formula: score = sum(weight × subScore) / 100
          </span>
          <span className="font-mono text-xs text-slate-300">
            Sum: <strong className="text-white">{Number(finalScore).toFixed(1)}</strong>
          </span>
        </div>
      </div>
    </Card>
  );
}

export default DecisionBreakdown;
