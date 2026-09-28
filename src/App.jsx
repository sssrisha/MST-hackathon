import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { RoleProvider } from './hooks/useRole.jsx';
import AppShell from './components/layout/AppShell.jsx';
import Landing from './pages/Landing.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import CreateTenderPage from './pages/CreateTenderPage.jsx';
import TenderDetailsPage from './pages/TenderDetailsPage.jsx';
import ContractorDashboardPage from './pages/ContractorDashboardPage.jsx';
import SubmitBidPage from './pages/SubmitBidPage.jsx';
import RevealBidPage from './pages/RevealBidPage.jsx';
import AuditorDashboardPage from './pages/AuditorDashboardPage.jsx';
import RiskAnalysisPage from './pages/RiskAnalysisPage.jsx';
import AuditTrailPage from './pages/AuditTrailPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <RoleProvider>
        <Routes>
          {/* Landing page renders outside AppShell */}
          <Route path="/" element={<Landing />} />

          {/* Internal role dashboards and audit pages render inside AppShell */}
          <Route
            element={
              <AppShell>
                <Outlet />
              </AppShell>
            }
          >
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/create" element={<CreateTenderPage />} />
            <Route path="/tenders/:id" element={<TenderDetailsPage />} />
            <Route path="/contractor" element={<ContractorDashboardPage />} />
            <Route path="/contractor/bid/:id" element={<SubmitBidPage />} />
            <Route path="/contractor/reveal/:id" element={<RevealBidPage />} />
            <Route path="/auditor" element={<AuditorDashboardPage />} />
            <Route path="/auditor/risk/:id" element={<RiskAnalysisPage />} />
            <Route path="/audit/:id" element={<AuditTrailPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </RoleProvider>
    </BrowserRouter>
  );
}
