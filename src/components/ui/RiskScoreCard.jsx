import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import Card from './Card.jsx';
import { getRiskLevel } from '../../utils/status.js';

export function RiskScoreCard({
  score = 0,
  title = 'AI Risk Assessment',
  summary,
  showNotice = true,
  className = ''
}) {
  const risk = getRiskLevel(score);

  const isHigh = risk.level === 'HIGH';
  const isMedium = risk.level === 'MEDIUM';

  const badgeStyles = {
    LOW: 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300',
    MEDIUM: 'bg-amber-950/60 border-amber-800/80 text-amber-300',
    HIGH: 'bg-rose-950/60 border-rose-800/80 text-rose-300'
  };

  const Icon = isHigh ? ShieldAlert : isMedium ? AlertTriangle : ShieldCheck;

  return (
    <Card className={clsx('overflow-hidden', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#1E2A44]">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Off-Chain AI Analytics
          </span>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>

        <div
          className={clsx(
            'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-sm font-bold tracking-wide shrink-0',
            badgeStyles[risk.level]
          )}
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span className="font-mono tabular-nums">{score} / 100</span>
          <span>{risk.level} RISK</span>
        </div>
      </div>

      <div className="pt-4 space-y-3">
        <p className="text-sm text-slate-300 leading-relaxed">
          {summary || risk.description}
        </p>

        {showNotice && isHigh && (
          <div className="p-3.5 rounded-lg border border-rose-800/70 bg-rose-950/30 text-rose-300 text-xs flex items-start gap-2.5 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-rose-200">Tender frozen for review:</strong> Automatic disbursement held pending human auditor sign-off. AI recommendation. Human review required.
            </div>
          </div>
        )}

        {showNotice && !isHigh && (
          <div className="p-3 rounded-lg border border-[#1E2A44] bg-[#0E1626]/50 text-slate-400 text-xs flex items-center justify-between">
            <span>Deterministic AI risk model</span>
            <span className="text-slate-500 font-mono text-[11px]">Recorded On-Chain</span>
          </div>
        )}
      </div>
    </Card>
  );
}

export default RiskScoreCard;
