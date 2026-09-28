import React from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, User } from 'lucide-react';
import clsx from 'clsx';
import TransactionBadge from './TransactionBadge.jsx';
import { formatDateTime } from '../../utils/format.js';

export function AuditEvent({
  event,
  className = ''
}) {
  if (!event) return null;

  const isAlert = event.action?.includes('FROZEN') || event.action?.includes('FLAGGED');

  return (
    <div
      className={clsx(
        'p-3.5 rounded-lg bg-[#0B1220]/70 border border-[#1E2A44] space-y-2 text-xs',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <div className="flex items-center gap-2">
          {isAlert ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
          )}
          <span className="font-semibold text-white">
            {event.action?.replace(/_/g, ' ')}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#111A2E] border border-[#1E2A44] text-slate-400">
            {event.eventId}
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          {formatDateTime(event.timestamp)}
        </span>
      </div>

      <p className="text-slate-300 text-xs leading-relaxed">
        {event.details}
      </p>

      <div className="pt-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#1E2A44]/60 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-slate-500" />
          {event.actor} {event.actorRole && <span className="text-slate-500">({event.actorRole})</span>}
        </span>
        {event.txHash && <TransactionBadge hash={event.txHash} />}
      </div>
    </div>
  );
}

export default AuditEvent;
