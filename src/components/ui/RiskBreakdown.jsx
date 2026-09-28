import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Cpu, Info } from 'lucide-react';
import clsx from 'clsx';
import Card from './Card.jsx';

export function RiskBreakdown({
  factors = [],
  tenderId,
  collapsible = true,
  className = ''
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!factors || factors.length === 0) {
    return null;
  }

  return (
    <Card className={clsx('overflow-hidden', className)}>
      <div className="flex items-center justify-between pb-4 border-b border-[#1E2A44]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#0B1220] border border-[#1E2A44] flex items-center justify-center text-blue-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Risk Factor Contribution Breakdown</h4>
            <p className="text-[11px] text-slate-400">Explainable anomaly analysis per statistical vector</p>
          </div>
        </div>

        {collapsible && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-md hover:bg-[#1E2A44] text-slate-400 hover:text-white transition-colors"
            title={isExpanded ? 'Collapse factors' : 'Expand factors'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="pt-4 space-y-4">
          {factors.map((item, idx) => {
            const percentage = item.percentage ?? Math.round((item.points / (item.max || 25)) * 100);
            const isHighFactor = percentage >= 70;

            return (
              <div key={item.factor || idx} className="space-y-1.5 p-3 rounded-lg bg-[#0B1220]/60 border border-[#1E2A44]/60">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-200">{item.factor}</span>
                  <span className={clsx(
                    'font-mono font-semibold tabular-nums',
                    isHighFactor ? 'text-rose-400' : 'text-slate-300'
                  )}>
                    +{item.points} pts <span className="text-slate-500 font-normal">/ {item.max || 25} max</span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-[#111A2E] border border-[#1E2A44] overflow-hidden">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all duration-300',
                      isHighFactor ? 'bg-rose-500' : 'bg-blue-500'
                    )}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                  />
                </div>

                {item.description && (
                  <p className="text-[11px] text-slate-400 pt-0.5 leading-normal">
                    {item.description}
                  </p>
                )}
              </div>
            );
          })}

          <div className="pt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
            <Info className="w-3 h-3" />
            <span>Scores are evaluated off-chain by AI and committed to the tamper-evident record.</span>
          </div>
        </div>
      )}
    </Card>
  );
}

export default RiskBreakdown;
