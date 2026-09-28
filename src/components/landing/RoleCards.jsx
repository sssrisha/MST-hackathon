import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../../hooks/useRole.jsx';
import { Building2, HardHat, ShieldCheck, ArrowRight } from 'lucide-react';

export function RoleCards() {
  const navigate = useNavigate();
  const { setRole } = useRole();

  const rolesData = [
    {
      id: 'admin',
      title: 'Admin Workspace',
      flowRole: 'Creates tenders',
      icon: Building2,
      description: 'Create and manage procurement tenders, monitor bidding activity, and track tender status.',
      ctaText: 'Enter Admin Workspace',
      targetPath: '/admin'
    },
    {
      id: 'contractor',
      title: 'Contractor Portal',
      flowRole: 'Bids and reveals',
      icon: HardHat,
      description: 'Discover tenders, submit sealed bids, and securely reveal bids after the deadline.',
      ctaText: 'Enter Contractor Portal',
      targetPath: '/contractor'
    },
    {
      id: 'auditor',
      title: 'Auditor Workspace',
      flowRole: 'Reviews evidence and decides',
      icon: ShieldCheck,
      description: 'Analyze bidding patterns, inspect AI risk signals, and review blockchain audit trails.',
      ctaText: 'Enter Auditor Workspace',
      targetPath: '/auditor'
    }
  ];

  const handleRoleSelect = (roleId, targetPath) => {
    // 1. Set the role in RoleProvider
    setRole(roleId);
    // 2. Navigate to role home
    navigate(targetPath);
  };

  return (
    <section id="workspaces" className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
          Choose your workspace
        </h2>
        <p className="text-sm sm:text-base text-slate-400">
          Select your role to explore the OpenTender procurement workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {rolesData.map((roleItem) => {
          const Icon = roleItem.icon;

          return (
            <button
              key={roleItem.id}
              type="button"
              onClick={() => handleRoleSelect(roleItem.id, roleItem.targetPath)}
              className="group text-left flex flex-col justify-between p-6 sm:p-8 rounded-xl bg-[#111A2E] border border-[#1E2A44] hover:border-slate-500 hover:-translate-y-1 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]"
            >
              <div>
                {/* Header Icon + Role Line */}
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-lg bg-[#0B1220] border border-[#1E2A44] flex items-center justify-center text-blue-400 group-hover:text-blue-300 group-hover:border-slate-600 transition-colors">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider px-2 py-0.5 rounded bg-blue-950/40 border border-blue-900/60">
                    {roleItem.id}
                  </span>
                </div>

                {/* Title & Flow Role Line */}
                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-blue-100 transition-colors">
                  {roleItem.title}
                </h3>
                <p className="text-xs font-medium text-slate-400 mb-4">
                  {roleItem.flowRole}
                </p>

                {/* Description */}
                <p className="text-sm text-slate-300 leading-relaxed mb-6">
                  {roleItem.description}
                </p>
              </div>

              {/* Action Button Indicator */}
              <div className="pt-4 border-t border-[#1E2A44] flex items-center justify-between text-xs font-semibold text-blue-400 group-hover:text-blue-300">
                <span>{roleItem.ctaText}</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default RoleCards;
