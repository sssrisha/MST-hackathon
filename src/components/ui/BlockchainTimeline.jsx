import React from 'react';
import { CheckCircle2, Clock, ShieldAlert, Lock, Unlock, FileCheck, Coins } from 'lucide-react';
import clsx from 'clsx';
import Card from './Card.jsx';
import TransactionBadge from './TransactionBadge.jsx';
import { formatDateTime } from '../../utils/format.js';

export function BlockchainTimeline({
  events = [],
  title = 'Tamper-Evident Event Trail',
  className = ''
}) {
  if (!events || events.length === 0) {
    return null;
  }

  const actionIcons = {
    TENDER_REGISTERED: Coins,
    BIDS_SEALED: Lock,
    BIDS_REVEALED_AND_EVALUATED: FileCheck,
    AWARD_CONFIRMED: CheckCircle2,
    MILESTONE_RELEASED: Unlock,
    AI_ANOMALY_FLAGGED: ShieldAlert,
    TENDER_FROZEN: ShieldAlert
  };

  return (
    <Card className={clsx('overflow-hidden', className)}>
      <div className="pb-4 border-b border-[#1E2A44] flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-white">{title}</h4>
          <p className="text-[11px] text-slate-400">Verifiable state transitions anchored on-chain</p>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#0B1220] border border-[#1E2A44] text-blue-400">
          {events.length} Events Logged
        </span>
      </div>

      <div className="pt-4 relative">
        {/* Timeline vertical bar */}
        <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-[#1E2A44]" aria-hidden="true" />

        <div className="space-y-6 relative">
          {events.map((evt, idx) => {
            const Icon = actionIcons[evt.action] || CheckCircle2;
            const isAlert = evt.action.includes('FROZEN') || evt.action.includes('FLAGGED');

            return (
              <div key={evt.eventId || idx} className="flex items-start gap-4 text-xs pl-1">
                {/* Node icon */}
                <div
                  className={clsx(
                    'w-7 h-7 rounded-full flex items-center justify-center border shrink-0 z-10',
                    isAlert
                      ? 'bg-rose-950/80 border-rose-600 text-rose-400'
                      : 'bg-[#0B1220] border-blue-500 text-blue-400'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                {/* Event details */}
                <div className="flex-1 p-3 rounded-lg bg-[#0B1220]/60 border border-[#1E2A44]/60 space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {evt.action?.replace(/_/g, ' ')}
                      </span>
                      {evt.actorRole && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#111A2E] border border-[#1E2A44] text-slate-400 font-sans">
                          {evt.actorRole}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {formatDateTime(evt.timestamp)}
                    </span>
                  </div>

                  <p className="text-slate-300 text-xs leading-normal">
                    {evt.details}
                  </p>

                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-[#1E2A44]/40 text-[11px] text-slate-400">
                    <span>Actor: <strong className="text-slate-200">{evt.actor}</strong></span>
                    {evt.txHash && <TransactionBadge hash={evt.txHash} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

export default BlockchainTimeline;
