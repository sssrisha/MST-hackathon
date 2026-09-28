import React from 'react';
import { Shield } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="border-t border-[#1E2A44] bg-[#080E1A] py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#111A2E] border border-[#1E2A44] flex items-center justify-center text-blue-400 shadow-sm">
            <Shield className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <div className="font-semibold text-base text-white tracking-tight">
              Open<span className="text-blue-400">Tender</span>
            </div>
            <p className="text-xs text-slate-400">
              AI-assisted blockchain procurement.
            </p>
          </div>
        </div>

        {/* Muted verification tagline */}
        <div className="text-center md:text-right text-xs text-slate-400">
          <p className="font-medium text-slate-300">
            Tamper-evident procurement. Explainable risk detection.
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Designed for institutional transparency and fair bidding.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;
