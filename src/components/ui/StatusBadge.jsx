import React from 'react';
import clsx from 'clsx';
import { getStatusMeta } from '../../utils/status.js';

export function StatusBadge({ status, size = 'sm', className = '' }) {
  const meta = getStatusMeta(status);

  const colorStyles = {
    green: 'bg-emerald-950/50 text-emerald-400 border-emerald-700/50',
    amber: 'bg-amber-950/50 text-amber-400 border-amber-700/50',
    red: 'bg-rose-950/50 text-rose-400 border-rose-700/50',
    blue: 'bg-blue-950/50 text-blue-400 border-blue-700/50',
    gray: 'bg-slate-800/50 text-slate-300 border-slate-700/60'
  };

  const dotStyles = {
    green: 'bg-emerald-400',
    amber: 'bg-amber-400',
    red: 'bg-rose-400',
    blue: 'bg-blue-400',
    gray: 'bg-slate-400'
  };

  const sizeStyles = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm'
  };

  const selectedColor = colorStyles[meta.color] || colorStyles.gray;
  const selectedDot = dotStyles[meta.color] || dotStyles.gray;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-md border tracking-wide select-none',
        selectedColor,
        sizeStyles[size] || sizeStyles.sm,
        className
      )}
      title={meta.description}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', selectedDot)} />
      {meta.label}
    </span>
  );
}

export default StatusBadge;
