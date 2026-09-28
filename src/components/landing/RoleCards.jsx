import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../../hooks/useRole.jsx';
import { isAuthenticated } from '../../services/authService.js';
import { Building2, HardHat, ShieldCheck, ArrowRight } from 'lucide-react';

export function RoleCards() {
  const navigate = useNavigate();
  const { setRole } = useRole();

  const rolesData = [
    {
      id: 'admin',
      title: 'Admin Workspace',
      flowRole: 'Creates tenders & defines policy',
      icon: Building2,
      description: 'Create procurement tenders, configure programmable selection policies, and monitor bidding lifecycle operations.',
      ctaText: 'Enter Admin Workspace',
      targetPath: '/admin'
    },
    {
      id: 'contractor',
      title: 'Contractor Portal',
      flowRole: 'Bids, reveals & tracks escrow',
      icon: HardHat,
      description: 'Discover tenders, submit cryptographic sealed bids, reveal commitments securely, and track milestone disbursements.',
      ctaText: 'Enter Contractor Portal',
      targetPath: '/contractor'
    },
    {
      id: 'auditor',
      title: 'Auditor Workspace',
      flowRole: 'Reviews evidence & unfreezes awards',
      icon: ShieldCheck,
      description: 'Inspect AI pattern risk signals, examine deterministic decision score breakdowns, and audit tamper-evident timelines.',
      ctaText: 'Enter Auditor Workspace',
      targetPath: '/auditor'
    }
  ];

  const handleRoleSelect = (roleId, targetPath) => {
    setRole(roleId);
    if (roleId === 'contractor') {
      navigate(isAuthenticated() ? targetPath : '/contractor/login');
      return;
    }
    navigate(targetPath);
  };

  return (
    <section id="workspaces" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
      <div className="mb-10 max-w-2xl">
        <div className="section-label">Choose your workspace</div>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">Control every layer of procurement.</h2>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {rolesData.map((roleItem) => {
          const Icon = roleItem.icon;

          return (
            <button
              key={roleItem.id}
              type="button"
              onClick={() => handleRoleSelect(roleItem.id, roleItem.targetPath)}
              className="card-hover glass-panel group text-left rounded-[1.8rem] p-6 sm:p-8 text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#FF4A3D]/30 bg-[#FF4A3D]/[0.06] text-[#FF6B4A]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                  {roleItem.id}
                </span>
              </div>

              <h3 className="mt-6 text-2xl font-semibold text-white">{roleItem.title}</h3>
              <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">{roleItem.flowRole}</p>
              <p className="mt-5 text-sm leading-7 text-slate-300">{roleItem.description}</p>

              <div className="mt-7 flex items-center justify-between border-t border-white/8 pt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FF8A72]">
                <span>{roleItem.ctaText}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default RoleCards;
