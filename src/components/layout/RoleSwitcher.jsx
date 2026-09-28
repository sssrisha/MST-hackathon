import React from 'react';
import clsx from 'clsx';
import { useRole } from '../../hooks/useRole.jsx';
import { ShieldCheck, UserCheck, HardHat } from 'lucide-react';

const roleIcons = {
  auditor: ShieldCheck,
  admin: UserCheck,
  contractor: HardHat
};

export function RoleSwitcher() {
  const { role, setRole, availableRoles } = useRole();

  return (
    <div className="flex items-center bg-[#0B1220] p-1 rounded-lg border border-[#1E2A44]">
      {availableRoles.map((r) => {
        const Icon = roleIcons[r.id] || ShieldCheck;
        const isActive = role === r.id;

        return (
          <button
            key={r.id}
            type="button"
            onClick={() => setRole(r.id)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
              isActive
                ? 'bg-[#1E2A44] text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#111A2E]/60'
            )}
            title={`Switch to ${r.label} perspective`}
          >
            <Icon className={clsx('w-3.5 h-3.5', isActive ? 'text-blue-400' : 'text-slate-400')} />
            <span>{r.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default RoleSwitcher;
