import React from 'react';
import { Link } from 'react-router-dom';
import { Database, ShieldCheck, Wallet } from 'lucide-react';
import Hero from '../components/landing/Hero.jsx';
import RoleCards from '../components/landing/RoleCards.jsx';
import Principle from '../components/landing/Principle.jsx';
import LandingFooter from '../components/landing/LandingFooter.jsx';
import LandingShowcase from '../components/landing/LandingShowcase.jsx';
import { useState } from 'react';

export function Landing() {
  const [walletToast, setWalletToast] = useState(false);

  const showWalletToast = () => {
    setWalletToast(true);
    window.setTimeout(() => setWalletToast(false), 2600);
  };

  return (
    <div className="landing-root flex flex-col font-sans selection:bg-rose-500/40 selection:text-white">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#05060A]/75 px-4 backdrop-blur-xl sm:px-6 md:px-8">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            aria-label="TenderGuard Home"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-rose-400/25 bg-rose-500/5 text-[#FF4A3D]">
              <ShieldCheck className="h-[18px] w-[18px]" aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold tracking-[0.04em]">
              Tender<span className="text-[#FF5A45]">Guard</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Main Navigation">
            {[
              ['Product', 'product'],
              ['Intelligence', 'intelligence'],
              ['Lifecycle', 'lifecycle'],
              ['Audit', 'audit']
            ].map(([label, anchor]) => (
              <a
                key={anchor}
                href={`#${anchor}`}
                className="text-xs text-slate-400 transition-colors hover:text-white"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-[11px] text-slate-300">
              <Database className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              <span>Demo Data</span>
            </div>
            <button
              type="button"
              onClick={showWalletToast}
              aria-label="Connect Wallet"
              className="inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-400/5 px-3 py-2 text-[11px] font-medium text-slate-200 transition hover:border-blue-300/50 hover:bg-blue-400/10 sm:px-4"
            >
              <Wallet className="h-3.5 w-3.5 text-blue-300" aria-hidden="true" />
              <span className="hidden sm:inline">Connect Wallet</span>
            </button>
          </div>
        </div>
      </header>

      {walletToast && (
        <div className="fixed right-4 top-20 z-50 rounded-full border border-white/12 bg-[#15171D] px-4 py-3 text-sm text-white shadow-2xl" role="status">
          Wallet connection is a demo interaction
        </div>
      )}

      <main className="w-full flex-1">
        <Hero />
        <LandingShowcase />
        <RoleCards />
        <Principle />
      </main>

      <LandingFooter />
    </div>
  );
}

export default Landing;
