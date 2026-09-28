import React from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useRole } from '../../hooks/useRole.jsx';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  FileCheck2,
  ShieldAlert,
  Send,
  Eye,
  ScrollText,
  Building2
} from 'lucide-react';

export function Sidebar() {
  const { role } = useRole();

  const navItemsByRole = {
    auditor: [
      {
        section: 'Oversight & Compliance',
        items: [
          { label: 'Auditor Dashboard', to: '/auditor', icon: LayoutDashboard },
          { label: 'Risk Analysis (T002)', to: '/auditor/risk/T002', icon: ShieldAlert },
          { label: 'Blockchain Audit Trail', to: '/audit/T002', icon: ScrollText }
        ]
      },
      {
        section: 'General Exploration',
        items: [
          { label: 'Sample Tender (T001)', to: '/tenders/T001', icon: FileText }
        ]
      }
    ],
    admin: [
      {
        section: 'Procurement Authority',
        items: [
          { label: 'Admin Dashboard', to: '/admin', icon: LayoutDashboard },
          { label: 'Create Tender', to: '/admin/create', icon: PlusCircle }
        ]
      },
      {
        section: 'Verification & Audit',
        items: [
          { label: 'Tender Overview (T001)', to: '/tenders/T001', icon: FileText },
          { label: 'Audit Trail (T001)', to: '/audit/T001', icon: FileCheck2 }
        ]
      }
    ],
    contractor: [
      {
        section: 'Bidding Operations',
        items: [
          { label: 'Contractor Dashboard', to: '/contractor', icon: LayoutDashboard },
          { label: 'Submit Sealed Bid (T002)', to: '/contractor/bid/T002', icon: Send },
          { label: 'Reveal Bid (T001)', to: '/contractor/reveal/T001', icon: Eye }
        ]
      },
      {
        section: 'Tenders',
        items: [
          { label: 'Browse Tender (T001)', to: '/tenders/T001', icon: FileText }
        ]
      }
    ]
  };

  const sections = navItemsByRole[role] || navItemsByRole.auditor;

  return (
    <aside className="w-64 bg-[#0B1220] border-r border-[#1E2A44] flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Role banner in sidebar */}
      <div className="px-5 py-4 border-b border-[#1E2A44] bg-[#0E1626]/50">
        <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wider font-semibold">
          <Building2 className="w-3.5 h-3.5 text-blue-400" />
          <span>Active Role</span>
        </div>
        <p className="text-sm font-medium text-white capitalize mt-0.5">
          {role} Workspace
        </p>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {sections.map((sec, secIdx) => (
          <div key={secIdx} className="space-y-1">
            <h4 className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {sec.section}
            </h4>
            {sec.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-[#1E2A44] text-white border-l-2 border-blue-500 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#111A2E]'
                    )
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Trust & Verification note */}
      <div className="p-4 border-t border-[#1E2A44] text-xs text-slate-400 leading-relaxed bg-[#0E1626]/40">
        <p className="font-medium text-slate-300 mb-0.5">Tamper-Evident Record</p>
        <p className="text-[11px] text-slate-400">
          All tender states, bids, and actions are logged to a verifiable event trail.
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
