import React from 'react';
import { Cpu, ShieldCheck, UserCheck } from 'lucide-react';

export function Principle() {
  const pillars = [
    {
      title: 'AI',
      subtitle: 'Pattern & Anomaly Detection',
      icon: Cpu,
      description: 'Detects suspicious bidding patterns and explains why.'
    },
    {
      title: 'BLOCKCHAIN',
      subtitle: 'Tamper-Evident Ledger',
      icon: ShieldCheck,
      description: 'Verifies bid commitments and keeps a tamper-evident record of key events.'
    },
    {
      title: 'HUMAN REVIEW',
      subtitle: 'Oversight & Accountability',
      icon: UserCheck,
      description: 'Makes the final procurement decision.'
    }
  ];

  return (
    <section className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6">
      <div className="p-8 sm:p-12 rounded-2xl bg-[#111A2E]/80 border border-[#1E2A44] text-center">
        {/* Headline */}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight mb-4">
          AI detects. Blockchain verifies. Humans decide.
        </h2>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto mb-12">
          A balanced governance framework ensuring cryptographic integrity and explainable intelligence without removing human judgment.
        </p>

        {/* 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-8">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="p-6 rounded-xl bg-[#0B1220] border border-[#1E2A44] flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-[#111A2E] border border-[#1E2A44] flex items-center justify-center text-blue-400 mb-4">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-xs font-mono font-bold text-blue-400 tracking-wider uppercase mb-1">
                    {pillar.title}
                  </h3>
                  <p className="text-sm font-semibold text-white mb-2">
                    {pillar.subtitle}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Muted disclaimer line */}
        <p className="text-xs text-slate-400 border-t border-[#1E2A44] pt-6 font-medium">
          AI-assisted risk assessment does not prove wrongdoing.
        </p>
      </div>
    </section>
  );
}

export default Principle;
