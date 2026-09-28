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
  Building2,
  Scale,
  Users,
  Layers,
  History,
  Coins
} from 'lucide-react';

export function Sidebar() {
  const { role } = useRole();

  const navItemsByRole = {
    auditor: [
      {
        section: 'Oversight & Compliance',
        items: [
          { label: 'Auditor Dashboard', to: '/auditor', icon: LayoutDashboard },
          { label: 'Risk Analysis (T002)', to: '/auditor/risk-analysis', icon: ShieldAlert },
          { label: 'Decision Report (T001)', to: '/auditor/decision-report', icon: Scale },
          { label: 'Blockchain Ledger', to: '/auditor/blockchain', icon: ScrollText },
          { label: 'Audit Trail (T002)', to: '/audit/T002', icon: FileCheck2 }
        ]
      },
      {
        section: 'Registries & Exploration',
        items: [
          { label: 'Supplier Registry', to: '/suppliers', icon: Users },
          { label: 'Sample Tender (T001)', to: '/tenders/T001', icon: FileText }
        ]
      }
    ],
    admin: [
      {
        section: 'Procurement Authority',
        items: [
          { label: 'Admin Dashboard', to: '/admin', icon: LayoutDashboard },
          { label: 'Manage Tenders', to: '/admin/tenders', icon: FileText },
          { label: 'Create Tender', to: '/admin/tenders/create', icon: PlusCircle }
        ]
      },
      {
        section: 'Verification & Audit',
        items: [
          { label: 'Supplier Registry', to: '/suppliers', icon: Users },
          { label: 'Tender Overview (T001)', to: '/admin/tenders/T001', icon: FileText },
          { label: 'Audit Trail (T001)', to: '/audit/T001', icon: FileCheck2 }
        ]
      }
    ],
    contractor: [
      {
        section: 'Bidding Operations',
        items: [
          { label: 'Contractor Dashboard', to: '/contractor', icon: LayoutDashboard },
          { label: 'Browse Tenders', to: '/contractor/tenders', icon: FileText },
          { label: 'My Bids', to: '/contractor/bids', icon: History },
          { label: 'Reputation', to: '/contractor/reputation', icon: Users },
          { label: 'Profile', to: '/contractor/profile', icon: Building2 }
        ]
      },
      {
        section: 'Contracts & Payments',
        items: [
          { label: 'Active Contracts', to: '/contractor/contracts', icon: FileCheck2 },
          { label: 'Payments', to: '/contractor/payments', icon: Coins },
          { label: 'Supplier Registry', to: '/suppliers/TG-1042', icon: Users }
        ]
      }
    ]
  };

  const sections = navItemsByRole[role] || navItemsByRole.auditor;

  return (
    <aside className="w-12 md:w-64 bg-[#0B1220] border-r border-[#1E2A44] flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Role banner in sidebar */}
      <div className="hidden px-5 py-4 border-b border-[#1E2A44] bg-[#0E1626]/50 md:block">
        <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wider font-semibold">
          <Building2 className="w-3.5 h-3.5 text-[#FF6B4A]" />
          <span>Active Role</span>
        </div>
        <p className="text-sm font-medium text-white capitalize mt-0.5">
          {role} Workspace
        </p>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 px-1 py-4 space-y-6 overflow-y-auto md:px-3">
        {sections.map((sec, secIdx) => (
          <div key={secIdx} className="space-y-1">
            <h4 className="mb-2 hidden px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider md:block">
              {sec.section}
            </h4>
            {sec.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  title={item.label}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center justify-center gap-3 rounded-md px-2 py-2 text-xs font-medium transition-colors md:justify-start md:px-3',
                      isActive
                        ? 'bg-[#FF4B3E]/10 text-white border-l-2 border-[#FF4B3E] font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    )
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                  <span className="hidden md:inline">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}

        {/* Dev Gallery link */}
        <div className="pt-2 border-t border-[#1E2A44]/60">
          <h4 className="px-3 text-[10px] font-semibold text-amber-400/80 uppercase tracking-wider mb-1">
            Developer Preview
          </h4>
          <NavLink
            to="/dev/components"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors',
                isActive
                  ? 'bg-amber-950/40 text-amber-300 border-l-2 border-amber-500 font-semibold'
                  : 'text-amber-400/70 hover:text-amber-300 hover:bg-[#111A2E]'
              )
            }
          >
            <Layers className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Component Gallery</span>
          </NavLink>
        </div>
      </nav>

      {/* Trust & Verification note */}
      <div className="hidden p-4 border-t border-[#1E2A44] text-xs text-slate-400 leading-relaxed bg-[#0E1626]/40 md:block">
        <p className="font-medium text-slate-300 mb-0.5">Tamper-Evident Record</p>
        <p className="text-[11px] text-slate-400">
          AI analyzes. Blockchain enforces. Humans oversee.
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
