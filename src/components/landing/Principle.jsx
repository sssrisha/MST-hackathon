import React from 'react';
import { Cpu, ShieldCheck, UserCheck } from 'lucide-react';

export function Principle() {
  const pillars = [
    {
      title: 'AI ANALYZES',
      subtitle: 'Pattern & Reputation Intelligence',
      icon: Cpu,
      description: 'Evaluates risk scores, detects suspicious bidding patterns, and produces analytical recommendations.'
    },
    {
      title: 'BLOCKCHAIN ENFORCES',
      subtitle: 'Programmable Smart Contracts',
      icon: ShieldCheck,
      description: 'Enforces programmable procurement rules, controls escrow, locks performance bonds, and releases milestone payments.'
    },
    {
      title: 'HUMANS OVERSEE',
      subtitle: 'Oversight & Final Sign-Off',
      icon: UserCheck,
      description: 'Reviews high-risk flagged cases and provides authoritative human sign-off on frozen tenders.'
    }
  ];

  return (
    <section id="audit" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
      <div className="glass-panel rounded-[2rem] px-6 py-8 sm:px-10 sm:py-12">
        <div className="max-w-3xl text-left">
          <div className="section-label">Governance model</div>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
            AI analyzes. Blockchain enforces. Humans oversee.
          </h2>
        </div>

        <p className="mt-6 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
          AI never selects a winner; it produces an analytical recommendation. The procurement rule enforced by the smart contract executes deterministically, while humans review high-risk cases.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div key={pillar.title} className="rounded-[1.6rem] border border-white/8 bg-[#0b1220]/80 p-6">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#FF4A3D]/30 bg-[#FF4A3D]/[0.06] text-[#FF6B4A]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="section-label mb-2">{pillar.title}</div>
                <p className="text-lg font-semibold text-white">{pillar.subtitle}</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">{pillar.description}</p>
              </div>
            );
          })}
        </div>

        <p className="mt-8 border-t border-white/8 pt-6 text-xs uppercase tracking-[0.2em] text-slate-400">
          AI-assisted risk assessment does not prove wrongdoing. High-risk tenders are frozen for independent human review.
        </p>
      </div>
    </section>
  );
}

export default Principle;
