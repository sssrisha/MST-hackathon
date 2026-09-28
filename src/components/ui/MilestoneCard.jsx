import React from 'react';
import { CheckCircle2, Clock, PlayCircle, AlertCircle, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import Card from './Card.jsx';
import StatusBadge from './StatusBadge.jsx';
import TransactionBadge from './TransactionBadge.jsx';

export function MilestoneCard({
  milestone,
  onRelease,
  canRelease = false,
  className = ''
}) {
  if (!milestone) return null;

  const isReleased = milestone.status === 'RELEASED' || milestone.status === 'COMPLETED';
  const isInProgress = milestone.status === 'IN_PROGRESS';
  const isPending = milestone.status === 'PENDING';

  return (
    <Card className={clsx('overflow-hidden', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#1E2A44]">
        <div className="flex items-center gap-3">
          <div className={clsx(
            'w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs border shrink-0',
            isReleased
              ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-400'
              : isInProgress
              ? 'bg-amber-950/60 border-amber-700/80 text-amber-400'
              : 'bg-[#0B1220] border-[#1E2A44] text-slate-400'
          )}>
            {milestone.id}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">{milestone.title}</h4>
            <p className="text-[11px] text-slate-400">{milestone.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase text-slate-500 font-semibold block">Allocation</span>
            <span className="text-sm font-bold font-mono text-white tabular-nums">
              {milestone.amount} <span className="text-blue-400 font-normal text-xs">{milestone.currency || 'MSTC'}</span>
            </span>
          </div>

          <StatusBadge status={isReleased ? 'AWARDED' : isInProgress ? 'REVEAL' : 'DRAFT'} />
        </div>
      </div>

      <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[11px]">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Due: {milestone.dueDate || '—'}
          </span>
          {milestone.completedDate && (
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Released: {milestone.completedDate}
            </span>
          )}
        </div>

        {milestone.txHash && (
          <TransactionBadge hash={milestone.txHash} label="Disbursement Tx" />
        )}

        {canRelease && isInProgress && onRelease && (
          <button
            type="button"
            onClick={() => onRelease(milestone.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors"
          >
            <span>Release Payment</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </Card>
  );
}

export default MilestoneCard;
