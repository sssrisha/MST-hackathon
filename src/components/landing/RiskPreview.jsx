import React from 'react';
import { AlertTriangle, ShieldAlert, Cpu } from 'lucide-react';

const RISK_FACTORS = [
  { factor: 'Bid similarity', points: 25, max: 25, percentage: 100 },
  { factor: 'Small bid spread', points: 25, max: 25, percentage: 100 },
  { factor: 'Repeated co-bidding', points: 20, max: 25, percentage: 80 },
  { factor: 'Winner rotation', points: 14, max: 25, percentage: 56 }
];

export function RiskPreview() {
  return (
    <section className="py-16 md:py-24 max-w-4xl mx-auto px-4 sm:px-6">
      <div className="text-center max-w-xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-950/40 border border-blue-900/60 text-blue-400 text-xs font-semibold mb-3">
          <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Explainable Intelligence</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
          Explainable, not a black box
        </h2>
        <p className="text-sm text-slate-400">
          Clear, deterministic risk signals help auditors identify anomalies and understand exactly why a tender was flagged.
        </p>
      </div>

      {/* High-Impact Teaser Card */}
      <div className="rounded-xl bg-[#111A2E] border border-[#1E2A44] overflow-hidden shadow-sm">
        {/* Card Header */}
        <div className="p-6 sm:p-7 border-b border-[#1E2A44] bg-[#0E1626]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Sample scenario, illustrative demo data
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white">
              Smart City Road Project
            </h3>
            <p className="text-xs text-slate-400">
              Suspicious bidding pattern detected across 4 submitted proposals
            </p>
          </div>

          {/* Risk Score Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-bold tracking-wide shrink-0">
            <ShieldAlert className="w-4 h-4 text-rose-400" aria-hidden="true" />
            <span>84 / 100 HIGH RISK</span>
          </div>
        </div>

        {/* Card Body: 4 Factor Rows */}
        <div className="p-6 sm:p-7 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Risk Factor Contribution Breakdown
          </p>

          <div className="space-y-3.5">
            {RISK_FACTORS.map((item) => (
              <div key={item.factor} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-200">{item.factor}</span>
                  <span className="font-mono text-slate-300 font-semibold tabular-nums">
                    +{item.points} pts
                  </span>
                </div>
                {/* Thin progress bar */}
                <div className="w-full h-1.5 rounded-full bg-[#0B1220] border border-[#1E2A44] overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-300"
                    style={{ width: `${item.percentage}%` }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Red-outlined "Award frozen for review" notification */}
          <div className="mt-6 pt-4 border-t border-[#1E2A44]">
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg border border-rose-800/60 bg-rose-950/30 text-rose-300 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
              <span>
                <strong>Tender frozen for review:</strong> Automatic disbursement held pending independent oversight review.
              </span>
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="px-6 py-3.5 bg-[#0A101D] border-t border-[#1E2A44] flex items-center justify-between text-xs text-slate-400">
          <span>AI recommendation. Human review required.</span>
          <span className="text-[11px] text-slate-400">Deterministic scoring model</span>
        </div>
      </div>
    </section>
  );
}

export default RiskPreview;
