import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import Hero from '../components/landing/Hero.jsx';
import RoleCards from '../components/landing/RoleCards.jsx';
import RiskPreview from '../components/landing/RiskPreview.jsx';
import HowItWorks from '../components/landing/HowItWorks.jsx';
import Principle from '../components/landing/Principle.jsx';
import LandingFooter from '../components/landing/LandingFooter.jsx';

export function Landing() {
  return (
    <div className="min-h-screen bg-[#0B1220] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. Slim Top Bar */}
      <header className="h-16 border-b border-[#1E2A44] bg-[#0B1220]/90 backdrop-blur sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
        {/* Brand Wordmark */}
        <Link
          to="/"
          className="flex items-center gap-2.5 text-white hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          aria-label="OpenTender Home"
        >
          <div className="w-8 h-8 rounded-md bg-[#111A2E] border border-[#1E2A44] flex items-center justify-center text-blue-400 shadow-sm">
            <Shield className="w-4 h-4" aria-hidden="true" />
          </div>
          <span className="font-semibold text-base tracking-tight text-white flex items-center">
            Open<span className="text-blue-500">Tender</span>
          </span>
        </Link>

        {/* Anchor Links (hidden on mobile) */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Landing Page Navigation">
          <a
            href="#workspaces"
            className="text-xs font-medium text-slate-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-2 py-1"
          >
            Workspaces
          </a>
          <a
            href="#how-it-works"
            className="text-xs font-medium text-slate-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-2 py-1"
          >
            How it works
          </a>
        </nav>
      </header>

      {/* Main Content Landmark */}
      <main className="flex-1 w-full">
        {/* 2. Hero Section */}
        <Hero />

        {/* 3. Role Selection */}
        <RoleCards />

        {/* 4. Risk Preview */}
        <RiskPreview />

        {/* 5. How It Works */}
        <HowItWorks />

        {/* 6. Principle Governance Model */}
        <Principle />
      </main>

      {/* 7. Landing Footer */}
      <LandingFooter />
    </div>
  );
}

export default Landing;
