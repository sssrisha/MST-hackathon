import React from 'react';
import { Lock, KeyRound, ScanSearch, FileCheck2 } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    title: 'SECURE BIDDING',
    icon: Lock,
    description: 'Contractors submit sealed bid commitments so prices remain confidential before the deadline.'
  },
  {
    step: '02',
    title: 'VERIFIED REVEAL',
    icon: KeyRound,
    description: 'Revealed bids are verified against stored cryptographic commitments on-chain.'
  },
  {
    step: '03',
    title: 'AI RISK ANALYSIS',
    icon: ScanSearch,
    description: 'AI looks for suspicious patterns such as bid similarity, small bid spread, repeated co-bidding, and winner rotation.'
  },
  {
    step: '04',
    title: 'PROGRAMMABLE DECISION',
    icon: FileCheck2,
    description: 'Smart contract rules execute deterministic policy scoring, and high-risk tenders are frozen for human review.'
  }
];

export function HowItWorks() {
  return (
    <section id="lifecycle" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
      <div className="mb-10 max-w-2xl">
        <div className="section-label">How it works</div>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
          Explainable execution at every stage.
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.step} className="card-hover glass-panel rounded-[1.8rem] p-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-300">{item.step}</span>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/8 text-blue-300">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>

              <h3 className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default HowItWorks;
