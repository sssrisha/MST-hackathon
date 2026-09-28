import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#05060A]/80 py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#0D0F14] border border-[#FF4A3D]/30 flex items-center justify-center text-[#FF4A3D] shadow-sm">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <div className="font-semibold text-base text-white tracking-tight flex items-center gap-1.5">
              Tender<span className="text-[#FF6B4A]">Guard</span>
            </div>
            <p className="text-xs text-slate-400">
              Autonomous, Data-Driven Procurement on MST.
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              (formerly OpenTender)
            </p>
          </div>
        </div>

        {/* Verification tagline */}
        <div className="text-center md:text-right text-xs text-slate-400">
          <p className="font-medium text-slate-300">
            AI analyzes. Blockchain enforces. Humans oversee.
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Designed for institutional transparency, explainable scoring, and verifiable escrow.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;
