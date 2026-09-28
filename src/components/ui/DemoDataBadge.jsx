import React from 'react';
import { Database } from 'lucide-react';
import clsx from 'clsx';

export function DemoDataBadge({ className = '' }) {
  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-amber-950/40 border border-amber-800/60 text-amber-300 shadow-sm select-none',
        className
      )}
      title="All blockchain states, transactions, and AI scores are simulated demo data."
    >
      <Database className="w-3 h-3 text-amber-400" />
      <span>Demo Data</span>
    </div>
  );
}

export default DemoDataBadge;
