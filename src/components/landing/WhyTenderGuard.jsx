import React from 'react';
import { Cpu, ShieldCheck, Scale } from 'lucide-react';

export function WhyTenderGuard() {
  const stages = [
    { num: '01', title: 'Create', text: 'Tender created', accent: 'from-blue-500/20 to-transparent' },
    { num: '02', title: 'Discover', text: 'Suppliers participate', accent: 'from-cyan-500/20 to-transparent' },
    { num: '03', title: 'Analyze', text: 'AI evaluates bids and supplier history', accent: 'from-amber-500/20 to-transparent' },
    { num: '04', title: 'Select', text: 'Explainable procurement scoring', accent: 'from-blue-500/20 to-transparent' },
    { num: '05', title: 'Execute', text: 'Smart contracts enforce rules', accent: 'from-green-500/20 to-transparent' },
    { num: '06', title: 'Settle', text: 'Milestone-based escrow payments', accent: 'from-gold-500/20 to-transparent' }
  ];

  const cards = [
    {
      title: 'AI ANALYTICS',
      subtitle: 'Pattern & Reputation Intelligence',
      icon: Cpu,
      description: 'Detect suspicious bidding patterns and analyze supplier performance.'
    },
    {
      title: 'BLOCKCHAIN EXECUTION',
      subtitle: 'Programmable Contract Rules',
      icon: ShieldCheck,
      description: 'Smart contracts enforce deposits, bonds, escrow, payments and penalties.'
    },
    {
      title: 'EXPLAINABLE PROCUREMENT',
      subtitle: 'Transparent Mathematical Policy',
      icon: Scale,
      description: 'Every selection can be traced to a predefined scoring policy.'
    }
  ];

  return (
    <section id="intelligence" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
      <div className="mb-12 max-w-3xl">
        <div className="section-label">Procurement reimagined</div>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
          From tender<br />to trusted execution.
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stages.map((stage) => (
          <div key={stage.num} className="card-hover glass-panel relative overflow-hidden rounded-[1.6rem] p-5">
            <div className={`absolute inset-0 bg-gradient-to-br ${stage.accent}`} aria-hidden="true" />
            <div className="relative">
              <div className="mb-8 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{stage.num}</span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300">{stage.title}</span>
              </div>
              <div className="text-3xl font-semibold text-white">{stage.title}</div>
              <div className="mt-3 text-sm text-slate-300">{stage.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="card-hover glass-panel rounded-[1.6rem] p-6">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/8 text-blue-300">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="section-label mb-2">{card.title}</div>
              <p className="text-lg font-semibold text-white">{card.subtitle}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{card.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default WhyTenderGuard;
