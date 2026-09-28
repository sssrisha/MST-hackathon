import React from 'react';
import { Award, CheckCircle, Scale } from 'lucide-react';
import clsx from 'clsx';
import Card from './Card.jsx';

export function DecisionScore({
  score = 0,
  winnerName,
  tenderTitle = 'Procurement Decision',
  rank = 1,
  className = ''
}) {
  const isWinner = rank === 1;

  return (
    <Card className={clsx('overflow-hidden', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#1E2A44]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
              Smart Contract Enforced Decision
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white">{tenderTitle}</h3>
          {winnerName && (
            <p className="text-xs text-slate-400 mt-0.5">
              Rank #{rank}: <span className="text-slate-200 font-medium">{winnerName}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Decision Score</span>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">
              {Number(score).toFixed(1)} <span className="text-xs text-slate-500 font-normal">/ 100</span>
            </div>
          </div>

          <div className={clsx(
            'w-12 h-12 rounded-xl flex items-center justify-center border shrink-0',
            isWinner
              ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-400'
              : 'bg-[#0B1220] border-[#1E2A44] text-slate-400'
          )}>
            {isWinner ? <Award className="w-6 h-6" /> : <Scale className="w-6 h-6" />}
          </div>
        </div>
      </div>

      <div className="pt-4 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          Deterministic policy aggregation
        </span>
        <span className="font-mono text-[11px] text-blue-400">
          Enforced by Smart Contract
        </span>
      </div>
    </Card>
  );
}

export default DecisionScore;
