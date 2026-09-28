import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowRight,
  Box,
  Check,
  CircleDollarSign,
  ClipboardList,
  Database,
  Landmark,
  ShieldCheck,
  Target,
  Users
} from 'lucide-react';
import { getDecisionReport, getTenders } from '../../services/tenderService.js';
import StatusBadge from '../ui/StatusBadge.jsx';

const FEATURES = [
  {
    title: 'Supplier Intelligence',
    icon: Users,
    bullets: ['On-chain reputation scoring', 'Verified performance history', 'Risk assessment & supplier insights']
  },
  {
    title: 'Explainable Bid Selection',
    icon: Target,
    bullets: ['AI-driven multi-criteria analysis', 'Transparent scoring and reasoning', 'Eliminates unfair and biased selection']
  },
  {
    title: 'Blockchain Escrow',
    icon: Box,
    bullets: ['Smart contract enforced execution', 'Milestone-based payments', 'Automatic penalties for non-performance']
  }
];

const EXECUTION_STEPS = [
  { number: '01', title: 'Authority', detail: 'Creates Tender', icon: Landmark },
  { number: '02', title: 'MSTC Escrow', detail: 'Contract-controlled', icon: Database },
  { number: '03', title: 'Performance Bond', detail: 'Ensures Delivery', icon: ShieldCheck },
  { number: '04', title: 'Milestones', detail: 'Track Progress', icon: ClipboardList },
  { number: '05', title: 'Payment', detail: 'Released on Completion', icon: CircleDollarSign }
];

function formatAmount(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

function formatBudgetCr(amount) {
  return `₹${(Number(amount || 0) / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr`;
}

function ScoreRing({ score, selected }) {
  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const stroke = selected ? '#FF4A3D' : '#94A3B8';
  const offset = circumference * (1 - Number(score || 0) / 100);

  return (
    <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64" role="img" aria-label={`Final score ${score} out of 100`}>
      <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="4" />
      <circle cx="32" cy="32" r={radius} fill="none" stroke={stroke} strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      <text x="32" y="36" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" className="rotate-90" style={{ transformOrigin: '32px 32px' }}>{score}</text>
    </svg>
  );
}

function FeatureCards() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8" aria-label="TenderGuard capabilities">
      <div className="grid gap-4 md:grid-cols-3">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <article key={feature.title} className="card-hover glass-panel rounded-2xl p-5 sm:p-6">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#FF4A3D]/35 bg-[#FF4A3D]/[0.06] text-[#FF6B4A]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <ArrowDownRight className="h-4 w-4 text-slate-500" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold text-white">{feature.title}</h2>
              <ul className="mt-5 space-y-3">
                {feature.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2.5 text-sm leading-5 text-slate-400">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B4A]" aria-hidden="true" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function BidComparison({ decision }) {
  const ranking = [...(decision?.ranking || [])].sort((first, second) => first.contractor.localeCompare(second.contractor));
  const winnerId = decision?.winner?.supplierId;

  return (
    <div className="glass-panel min-w-0 rounded-2xl p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">Bid Comparison</div>
          <div className="mt-1 text-xs text-slate-500">T001 · Municipal School Renovation</div>
        </div>
        <Link to="/auditor/decision-report" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-[#FF6B4A]">
          View Full Analysis <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {!decision ? (
        <div className="grid gap-3 md:grid-cols-3" aria-label="Loading T001 decision report">
          {[1, 2, 3].map((item) => <div key={item} className="h-64 animate-pulse rounded-xl bg-white/[0.035]" />)}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {ranking.map((bid, index) => {
            const selected = bid.supplierId === winnerId;
            return (
              <article key={bid.supplierId} className={`rounded-xl border p-3.5 ${selected ? 'border-[#FF4A3D]/55 bg-[#FF4A3D]/[0.045]' : 'border-white/8 bg-black/15'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Contractor {String.fromCharCode(65 + index)}</div>
                    <h3 className="mt-1 min-h-10 text-sm font-semibold leading-5 text-white">{bid.supplierName}</h3>
                  </div>
                  {selected && <span className="shrink-0 rounded-full border border-emerald-700/50 bg-emerald-950/50 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Selected</span>}
                </div>

                <div className="my-4 flex items-center gap-3">
                  <ScoreRing score={bid.decisionScore} selected={selected} />
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Final Score</div>
                    <div className={`mt-1 text-xl font-semibold tabular-nums ${selected ? 'text-[#FF6B4A]' : 'text-white'}`}>{Number(bid.decisionScore).toFixed(1)}</div>
                  </div>
                </div>

                <dl className="space-y-2 border-t border-white/8 pt-3 text-xs">
                  <div className="flex justify-between gap-2"><dt className="text-slate-500">Bid Amount</dt><dd className="text-right tabular-nums text-slate-200">{formatAmount(bid.bidAmount)}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-slate-500">Reputation</dt><dd className="text-slate-200">{bid.supplier.reputation}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-slate-500">Performance</dt><dd className="text-slate-200">{bid.supplier.avgPerformance}%</dd></div>
                  <div className="flex items-center justify-between gap-2"><dt className="text-slate-500">Risk</dt><dd><StatusBadge status={bid.riskLevel} size="xs" className="rounded-full" /></dd></div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-[10px] leading-5 text-slate-500">AI recommendation. Human review required. Selection follows the programmable procurement rule.</p>
    </div>
  );
}

function DecisionSection({ decision }) {
  return (
    <section id="intelligence" className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:px-8 lg:py-24">
      <div>
        <div className="section-label">AI-driven decisions</div>
        <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.045em] text-white sm:text-5xl">Every decision has <span className="text-[#FF6B4A]">a reason.</span></h2>
        <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">TenderGuard analyzes price, reputation, performance, and risk to identify the most suitable contractor, with full transparency.</p>
        <Link to="/auditor/decision-report" className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm text-slate-200 transition hover:border-[#FF6B4A]/50 hover:text-white">
          See How It Works <ArrowRight className="h-4 w-4 text-[#FF6B4A]" aria-hidden="true" />
        </Link>
      </div>
      <BidComparison decision={decision} />
    </section>
  );
}

function LifecycleSection() {
  return (
    <section id="lifecycle" className="border-y border-white/8 bg-white/[0.012]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
          <div>
            <div className="section-label">On-chain execution</div>
            <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.045em] text-white">From tender to <span className="text-[#FF6B4A]">trusted execution.</span></h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">Smart contracts enforce procurement rules, keep escrow controlled by contract, and release milestone payments based on verified progress.</p>
            <Link to="/auditor/blockchain" className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm text-slate-200 transition hover:border-[#FF6B4A]/50 hover:text-white">
              Explore Lifecycle <ArrowRight className="h-4 w-4 text-[#FF6B4A]" aria-hidden="true" />
            </Link>
          </div>

          <ol className="grid gap-4 md:grid-cols-5 md:gap-2">
            {EXECUTION_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <li key={step.number} className="landing-step relative flex items-center gap-4 md:flex-col md:items-center md:text-center">
                  <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#FF4A3D]/40 bg-[#0D0F14] text-[#FF6B4A]">
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </div>
                  <div className="relative z-10">
                    <div className="text-[9px] font-semibold tracking-[0.2em] text-[#FF6B4A]">{step.number}</div>
                    <div className="mt-1 text-xs font-semibold text-white">{step.title}</div>
                    <div className="mt-1 text-[10px] leading-4 text-slate-500">{step.detail}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

function TenderMap({ tenders }) {
  const tenderRows = tenders.slice(0, 4);
  const markerTenders = tenders.slice(0, 5);

  return (
    <section id="tender-map" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="section-label">Procurement intelligence map</div>
          <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.045em] text-white sm:text-5xl">See procurement as a <span className="text-[#FF6B4A]">living system.</span></h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">Explore tender status, risk indicators, bidder participation, and project progress. The location view is an illustrative seed-data preview, not a live geographic map.</p>
        </div>
        <Link to="/map" className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm text-slate-200 transition hover:border-[#FF6B4A]/50 hover:text-white">
          Open Tender Map <ArrowRight className="h-4 w-4 text-[#FF6B4A]" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-panel rounded-2xl p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Tender activity · India</h3>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.15em] text-slate-500">Illustrative locations</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
            <div className="relative mx-auto flex min-h-[300px] w-full max-w-[220px] items-center justify-center rounded-xl border border-white/6 bg-black/20 p-3 sm:mx-0">
              <svg className="h-[270px] w-full" viewBox="0 0 220 300" role="img" aria-label="Schematic India-shaped tender activity illustration, not geographically precise">
                <path d="M83 14 111 27 126 47 147 57 153 78 172 91 164 111 179 127 161 145 157 164 142 176 150 194 136 211 127 235 112 252 103 279 89 263 84 242 68 226 72 207 55 190 61 171 47 154 54 137 42 118 49 99 40 81 54 64 57 43 72 34Z" fill="rgba(255,255,255,.025)" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" strokeLinejoin="round" />
                {markerTenders.map((tender, index) => <circle key={tender.id} className="landing-map-dot" cx={82 + index * 7} cy={67 + index * 34} r="4.2" fill="#FF4A3D" style={{ animationDelay: `${index * 0.24}s` }} />)}
              </svg>
              <span className="absolute bottom-2 text-center text-[9px] uppercase tracking-[0.12em] text-slate-600">Schematic only · Not to scale</span>
            </div>

            <div className="space-y-2">
              {markerTenders.map((tender) => (
                <div key={tender.id} className="rounded-xl border border-white/8 bg-black/15 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[#FF4A3D] shadow-[0_0_12px_rgba(255,74,61,.45)]" />
                      <span className="text-[10px] font-semibold tracking-[0.12em] text-[#FF8A72]">{tender.id}</span>
                      <span className="truncate text-xs font-medium text-white">{tender.location || 'Location not listed'}</span>
                    </div>
                    <StatusBadge status={tender.riskLevel || 'PENDING'} size="xs" className="shrink-0 rounded-full" />
                  </div>
                  <div className="mt-1.5 pl-4 text-[10px] leading-4 text-slate-500">{tender.title} · {formatBudgetCr(tender.budget)} · {tender.bidCount} bidders</div>
                </div>
              ))}
              {!markerTenders.length && <p className="py-8 text-center text-xs text-slate-500">Tender locations will appear when service data is available.</p>}
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Live Tenders</h3>
            <Link to="/admin/tenders" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-[#FF6B4A]">View All <ArrowRight className="h-3 w-3" aria-hidden="true" /></Link>
          </div>
          <div className="space-y-1">
            {tenderRows.map((tender) => (
              <div key={tender.id} className="grid grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-2 border-t border-white/6 py-3">
                <span className="text-[10px] font-semibold text-slate-500">{tender.id}</span>
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-slate-200">{tender.title}</div>
                  <div className="mt-1 text-[10px] text-slate-500">{tender.location || 'Location not listed'}</div>
                </div>
                <StatusBadge status={tender.riskLevel || 'PENDING'} size="xs" className="rounded-full" />
              </div>
            ))}
            {!tenderRows.length && <p className="py-8 text-center text-xs text-slate-500">No tender records are available.</p>}
          </div>
          <p className="mt-2 border-t border-white/6 pt-3 text-[10px] text-slate-600">Risk is an off-chain AI-assisted assessment. Status data is demo data.</p>
        </div>
      </div>
    </section>
  );
}

export function LandingShowcase() {
  const [data, setData] = useState({ tenders: [], decision: null });

  useEffect(() => {
    let active = true;
    Promise.all([getTenders(), getDecisionReport('T001')]).then(([tenders, decision]) => {
      if (active) setData({ tenders, decision });
    });
    return () => { active = false; };
  }, []);

  return (
    <>
      <FeatureCards />
      <DecisionSection decision={data.decision} />
      <LifecycleSection />
      <TenderMap tenders={data.tenders} />
    </>
  );
}

export default LandingShowcase;