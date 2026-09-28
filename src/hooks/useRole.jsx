/* oxlint-disable react/only-export-components */
import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RoleContext = createContext(null);

export const ROLES = [
  { id: 'auditor', label: 'Auditor', homeRoute: '/auditor' },
  { id: 'admin', label: 'Admin', homeRoute: '/admin' },
  { id: 'contractor', label: 'Contractor', homeRoute: '/contractor' }
];

export function RoleProvider({ children }) {
  // Default role: auditor, strictly in-memory (no localStorage / sessionStorage)
  const [role, setRoleState] = useState('auditor');
  const navigate = useNavigate();

  const setRole = (newRole) => {
    setRoleState(newRole);
    const target = ROLES.find((r) => r.id === newRole);
    if (target) {
      navigate(target.homeRoute);
    }
  };

  return (
    <RoleContext.Provider value={{ role, setRole, availableRoles: ROLES }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
