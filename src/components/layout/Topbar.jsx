import React from 'react';
import { Link } from 'react-router-dom';
import RoleSwitcher from './RoleSwitcher.jsx';
import DemoDataBadge from '../ui/DemoDataBadge.jsx';
import { Shield, Sparkles } from 'lucide-react';

export function Topbar() {
  return (
    <header className="h-16 border-b border-[#1E2A44] bg-[#0B1220] sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      {/* Brand Wordmark */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 text-white hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded-md bg-[#111A2E] border border-[#1E2A44] flex items-center justify-center text-blue-400 shadow-sm">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-base tracking-tight text-white flex items-center">
              Tender<span className="text-blue-400">Guard</span>
            </span>
          </div>
        </Link>
        <span className="hidden md:inline-flex text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded border border-[#1E2A44] bg-[#111A2E] text-slate-400">
          Autonomous, Data-Driven Procurement on MST
        </span>
      </div>

      {/* Center / Right controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Global Demo Data Indicator */}
        <DemoDataBadge className="hidden sm:inline-flex" />

        {/* Role Switcher */}
        <RoleSwitcher />

        {/* Demo Mode Button (Disabled Placeholder) */}
        <button
          type="button"
          disabled
          className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#111A2E] border border-[#1E2A44] text-slate-500 cursor-not-allowed select-none"
          title="Demo Mode scenario runner will be activated in later phase"
        >
          <Sparkles className="w-3.5 h-3.5 text-slate-500" />
          <span>Demo Mode</span>
        </button>
      </div>
    </header>
  );
}

export default Topbar;
