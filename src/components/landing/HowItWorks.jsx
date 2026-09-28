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
    description: 'Revealed bids are checked against their original blockchain commitments.'
  },
  {
    step: '03',
    title: 'AI RISK ANALYSIS',
    icon: ScanSearch,
    description: 'AI looks for suspicious patterns such as bid similarity, small bid gaps, repeated co-bidding and winner rotation.'
  },
  {
    step: '04',
    title: 'AUDITABLE DECISION',
    icon: FileCheck2,
    description: 'High-risk tenders can be frozen for human review, and important events are recorded in a tamper-evident audit trail.'
  }
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
          How OpenTender Works
        </h2>
        <p className="text-sm sm:text-base text-slate-400">
          A four-stage lifecycle uniting client-side cryptography, machine learning, and immutable records.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STEPS.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.step}
              className="p-6 rounded-xl bg-[#111A2E] border border-[#1E2A44] flex flex-col justify-between"
            >
              <div>
                {/* Step header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-blue-400 tracking-wider">
                    {item.step}
                  </span>
                  <div className="w-9 h-9 rounded-md bg-[#0B1220] border border-[#1E2A44] flex items-center justify-center text-blue-400">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-white tracking-wide uppercase mb-2">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default HowItWorks;
