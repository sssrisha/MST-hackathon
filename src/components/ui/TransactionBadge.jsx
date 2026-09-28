import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { shortHash } from '../../utils/format.js';

export function TransactionBadge({
  hash,
  label,
  showDemoPill = true,
  className = ''
}) {
  const [copied, setCopied] = useState(false);

  if (!hash) {
    return <span className="text-xs text-slate-500 font-mono">—</span>;
  }

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const displayHash = shortHash(hash);

  return (
    <div className={clsx('inline-flex items-center gap-1.5 font-mono text-xs', className)}>
      {label && <span className="text-slate-400 font-sans text-[11px]">{label}:</span>}
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0B1220] border border-[#1E2A44] text-slate-300 hover:border-slate-500 transition-colors">
        <span className="font-mono select-all text-blue-300" title={hash}>
          {displayHash}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy cryptographic hash"
          className="p-0.5 text-slate-400 hover:text-white transition-colors focus:outline-none"
          title={copied ? 'Copied!' : 'Copy hash'}
        >
          {copied ? (
            <Check className="w-3 h-3 text-emerald-400" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      </div>

      {showDemoPill && (
        <span
          className="px-1.5 py-0.2 rounded text-[10px] font-sans font-semibold bg-amber-950/60 text-amber-400 border border-amber-800/60 tracking-wider"
          title="Simulated testnet hash (Demo Data)"
        >
          DEMO
        </span>
      )}
    </div>
  );
}

export default TransactionBadge;
