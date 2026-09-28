import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../../hooks/useRole.jsx';
import { Lock, ScanSearch, ShieldCheck, Scale, ArrowRight, ShieldAlert } from 'lucide-react';

export function Hero() {
  const navigate = useNavigate();
  const { setRole } = useRole();

  const handleExploreClick = (e) => {
    e.preventDefault();
    const workspacesSection = document.getElementById('workspaces');
    if (workspacesSection) {
      workspacesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSampleReportClick = () => {
    // Set role to auditor and navigate to /auditor/risk/T002
    setRole('auditor');
    navigate('/auditor/risk/T002');
  };

  const flowNodes = [
    {
      title: 'SEALED BID',
      caption: 'Client-side salt & hash',
      icon: Lock
    },
    {
      title: 'AI RISK ANALYSIS',
      caption: 'Pattern & anomaly check',
      icon: ScanSearch
    },
    {
      title: 'BLOCKCHAIN AUDIT',
      caption: 'Tamper-evident log',
      icon: ShieldCheck
    },
    {
      title: 'TRANSPARENT DECISION',
      caption: 'Human review & award',
      icon: Scale
    }
  ];

  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-24 overflow-hidden">
      {/* Subtle radial blue tint behind hero */}
      <div
        className="pointer-events-none absolute inset-0 -top-24 bg-[radial-gradient(ellipse_60%_50%_at_50%_20%,rgba(59,130,246,0.12),transparent_70%)]"
        aria-hidden="true"
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#1E2A44] bg-[#111A2E]/80 text-xs font-medium text-slate-300 mb-6 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" aria-hidden="true" />
          <span>Procurement Integrity Layer</span>
        </div>

        {/* Brand H1 */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.08] mb-4">
          Open<span className="text-blue-500">Tender</span>
        </h1>

        {/* Tagline */}
        <p className="text-xl sm:text-2xl lg:text-3xl font-medium text-slate-200 max-w-3xl mx-auto tracking-tight mb-6">
          Bid privately. Detect suspicious patterns. Award transparently.
        </p>

        {/* Supporting description */}
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10 font-normal">
          AI-powered procurement with secure sealed bidding, intelligent risk detection, and a tamper-evident blockchain audit trail.
        </p>

        {/* CTA Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a
            href="#workspaces"
            onClick={handleExploreClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220] shadow-sm"
          >
            <span>Explore OpenTender</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </a>

          <button
            type="button"
            onClick={handleSampleReportClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#111A2E] hover:bg-[#1E2A44] border border-[#1E2A44] text-slate-200 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]"
          >
            <ShieldAlert className="w-4 h-4 text-blue-400" aria-hidden="true" />
            <span>View sample risk report</span>
          </button>
        </div>

        {/* Flow Visual: 4 Connected Nodes */}
        <div className="pt-8 border-t border-[#1E2A44]/70">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-6">
            End-to-End Cryptographic & AI Pipeline
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
            {flowNodes.map((node, index) => {
              const Icon = node.icon;
              return (
                <div
                  key={node.title}
                  className="relative flex flex-col items-center p-4 rounded-lg bg-[#111A2E]/60 border border-[#1E2A44] text-center"
                >
                  {/* Connector arrow on desktop between nodes */}
                  {index < flowNodes.length - 1 && (
                    <div
                      className="hidden lg:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 w-3 h-0.5 bg-[#1E2A44]"
                      aria-hidden="true"
                    />
                  )}

                  <div className="w-10 h-10 rounded-md bg-[#0B1220] border border-[#1E2A44] flex items-center justify-center text-blue-400 mb-3 shadow-inner">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>

                  <span className="text-xs font-semibold text-white tracking-wide uppercase mb-1">
                    {node.title}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {node.caption}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
