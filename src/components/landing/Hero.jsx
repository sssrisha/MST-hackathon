import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../../hooks/useRole.jsx';
import { ArrowRight, Box, BrainCircuit, Building2, Database, Package, Play, Users } from 'lucide-react';
import { getTenders } from '../../services/tenderService.js';
import { getSuppliers } from '../../services/supplierRegistry.js';

const HERO_NODES = [
  { name: 'Authority', detail: 'Creates Tender', icon: Building2, position: 'top' },
  { name: 'AI Intelligence', detail: 'Detects Patterns', icon: BrainCircuit, position: 'upper-right' },
  { name: 'Milestones & Payment', detail: 'Releases on Performance', icon: Package, position: 'lower-right' },
  { name: 'Escrow', detail: 'Contract-controlled', icon: Database, position: 'bottom' },
  { name: 'Blockchain', detail: 'Enforces Rules', icon: Box, position: 'lower-left' },
  { name: 'Suppliers', detail: 'Bid Privately', icon: Users, position: 'upper-left' }
];

export function Hero() {
  const navigate = useNavigate();
  const { setRole } = useRole();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([getTenders(), getSuppliers()]).then(([tenders, suppliers]) => {
      if (active) {
        setStats({
          tenderCount: tenders.length,
          totalBudget: tenders.reduce((sum, tender) => sum + Number(tender.budget || 0), 0),
          supplierCount: suppliers.filter((supplier) => supplier.verifiedOnChain).length
        });
      }
    });
    return () => { active = false; };
  }, []);

  const handleLiveDemoClick = () => {
    setRole('auditor');
    navigate('/auditor/decision-report');
  };

  return (
    <section className="relative overflow-hidden pb-16 pt-12 sm:pt-16 lg:pb-24" id="product">
      <div className="pointer-events-none absolute -top-20 left-1/3 h-[420px] w-[620px] rounded-full bg-[#FF4A3D]/[0.09] blur-[100px]" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-6 lg:px-8">
        <div className="relative z-10">
          <div className="mb-6 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.28em] text-slate-400">
            <span className="h-px w-10 bg-[#FF4A3D]" aria-hidden="true" />
            Autonomous Procurement on MST
          </div>

          <h1 className="text-[3.6rem] font-semibold leading-[0.88] tracking-[-0.055em] sm:text-7xl lg:text-[5rem] xl:text-[5.5rem]">
            <span className="block text-white">Tender</span>
            <span className="block bg-gradient-to-r from-[#FF4A3D] to-[#FF8A54] bg-clip-text text-transparent">Guard</span>
          </h1>

          <p className="mt-6 max-w-xl text-xl font-medium leading-snug text-slate-400 sm:text-2xl">
            <span className="text-white">Bid privately.</span>{' '}
            <span className="text-[#FF6B4A]">Detect suspicious patterns.</span>{' '}
            <span className="text-white">Award transparently.</span>
          </p>

          <p className="mt-5 max-w-lg text-sm leading-7 text-slate-400 sm:text-base">
            AI-powered procurement with secure sealed bidding, intelligent risk detection, and a tamper-evident blockchain audit trail.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#workspaces" className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF4A3D] to-[#FF6B4A] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(255,74,61,0.2)] transition hover:brightness-110">
              Explore Procurement <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <button type="button" onClick={handleLiveDemoClick} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.025] px-6 py-3.5 text-sm font-medium text-slate-200 transition hover:border-rose-400/35 hover:bg-white/[0.05]">
              <Play className="h-4 w-4 text-[#FF6B4A]" aria-hidden="true" /> View Live Demo
            </button>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-5 border-t border-white/10 pt-6">
            <div><strong className="text-xl font-semibold text-[#FF6B4A]">{stats ? stats.tenderCount : '—'}</strong><span className="ml-2 text-xs text-slate-400">Tenders Tracked</span></div>
            <div><strong className="text-xl font-semibold text-[#FF6B4A]">{stats ? `₹${(stats.totalBudget / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr` : '—'}</strong><span className="ml-2 text-xs text-slate-400">Total Procurement Value</span></div>
            <div><strong className="text-xl font-semibold text-[#FF6B4A]">{stats ? stats.supplierCount : '—'}</strong><span className="ml-2 text-xs text-slate-400">Verified Suppliers</span></div>
          </div>
        </div>

        <div className="relative mx-auto h-[440px] w-full max-w-[640px] sm:h-[520px]" aria-label="TenderGuard procurement system diagram">
          <div className="landing-orbit" aria-hidden="true" />
          <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF4A3D]/[0.08] blur-3xl sm:h-72 sm:w-72" aria-hidden="true" />

          <svg className="landing-cube-glow absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 sm:h-56 sm:w-56" viewBox="0 0 240 240" role="img" aria-label="Layered data block representing procurement records">
            <defs>
              <linearGradient id="cubeStroke" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#FF6B4A" stopOpacity=".82" /><stop offset="1" stopColor="#FF4A3D" stopOpacity=".25" /></linearGradient>
              <filter id="cubeBlur"><feGaussianBlur stdDeviation="7" /></filter>
            </defs>
            <rect x="55" y="42" width="128" height="132" rx="20" fill="#FF4A3D" fillOpacity=".17" filter="url(#cubeBlur)" />
            <rect x="39" y="72" width="135" height="122" rx="19" fill="#111216" stroke="url(#cubeStroke)" strokeWidth="1.5" transform="rotate(-8 106 133)" />
            <rect x="53" y="57" width="135" height="122" rx="19" fill="#14151B" stroke="url(#cubeStroke)" strokeWidth="1.5" transform="rotate(5 120 118)" />
            <rect x="49" y="46" width="135" height="122" rx="19" fill="#17171D" stroke="url(#cubeStroke)" strokeWidth="1.8" />
            <path d="M78 88h77M78 108h54M78 128h66" stroke="#FF6B4A" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round" />
            <circle cx="163" cy="145" r="5" fill="#FF6B4A" />
          </svg>

          {HERO_NODES.map((node) => {
            const Icon = node.icon;
            return (
              <div key={node.name} className={`absolute z-10 flex w-[100px] flex-col items-center text-center sm:w-[128px] landing-node-${node.position}`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#FF4A3D]/45 bg-[#0D0F14] text-[#FF6B4A] shadow-[0_0_24px_rgba(255,74,61,0.12)] sm:h-11 sm:w-11">
                  <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
                </div>
                <span className="mt-2 text-[8px] font-semibold uppercase leading-tight tracking-[0.14em] text-white sm:text-[9px]">{node.name}</span>
                <span className="mt-1 text-[8px] leading-tight text-slate-400 sm:text-[9px]">{node.detail}</span>
              </div>
            );
          })}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-[#0D0F14]/85 px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-slate-500">
            Tamper-evident record
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
