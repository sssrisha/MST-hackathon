import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { RoleProvider, useRole } from './hooks/useRole.jsx';
import AppShell from './components/layout/AppShell.jsx';
import Landing from './pages/Landing.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import { isAuthenticated } from './services/authService.js';

// Core Dashboard Pages
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import CreateTenderPage from './pages/CreateTenderPage.jsx';
import TenderDetailsPage from './pages/TenderDetailsPage.jsx';
import ContractorDashboardPage from './pages/ContractorDashboardPage.jsx';
import SubmitBidPage from './pages/SubmitBidPage.jsx';
import RevealBidPage from './pages/RevealBidPage.jsx';
import AuditorDashboardPage from './pages/AuditorDashboardPage.jsx';
import RiskAnalysisPage from './pages/RiskAnalysisPage.jsx';
import AuditTrailPage from './pages/AuditTrailPage.jsx';

// Phase Foundations & New Route Pages
import AdminTendersPage from './pages/AdminTendersPage.jsx';
import ContractorTendersPage from './pages/ContractorTendersPage.jsx';
import ContractorBidsPage from './pages/ContractorBidsPage.jsx';
import ContractorProfilePage from './pages/ContractorProfilePage.jsx';
import ContractorContractsPage from './pages/ContractorContractsPage.jsx';
import ContractorPaymentsPage from './pages/ContractorPaymentsPage.jsx';
import DecisionReportPage from './pages/DecisionReportPage.jsx';
import AuditorBlockchainPage from './pages/AuditorBlockchainPage.jsx';
import SuppliersListPage from './pages/SuppliersListPage.jsx';
import SupplierDetailsPage from './pages/SupplierDetailsPage.jsx';
import DevComponentsPage from './pages/DevComponentsPage.jsx';
import Placeholder from './components/ui/Placeholder.jsx';

function ContractorRoute() {
  const location = useLocation();
  const authenticated = isAuthenticated();

  if (!authenticated) {
    return <Navigate to="/contractor/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

function RedirectToSubmit() {
  const { id } = useParams();
  return <Navigate to={id ? `/contractor/tenders/${id}/submit` : '/contractor/tenders'} replace />;
}

function RedirectToReveal() {
  const { id } = useParams();
  return <Navigate to={id ? `/contractor/bids/${id}/reveal` : '/contractor/bids'} replace />;
}

function AppRoutes() {
  const { setRole } = useRole();
  const location = useLocation();

  React.useEffect(() => {
    if (location.pathname.startsWith('/contractor')) setRole('contractor');
    else if (location.pathname.startsWith('/admin')) setRole('admin');
    else if (location.pathname.startsWith('/auditor')) setRole('auditor');
  }, [location.pathname, setRole]);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/contractor/login" element={<LoginPage />} />
      <Route path="/contractor/signup" element={<SignupPage />} />

      <Route
        element={
          <AppShell>
            <Outlet />
          </AppShell>
        }
      >
        <Route path="/map" element={<Placeholder title="Tender Map" description="The interactive tender map is planned for a later phase. This preview uses illustrative seed locations only." />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/tenders" element={<AdminTendersPage />} />
        <Route path="/admin/create" element={<CreateTenderPage />} />
        <Route path="/admin/tenders/create" element={<CreateTenderPage />} />
        <Route path="/admin/tenders/:id" element={<TenderDetailsPage />} />

        <Route element={<ContractorRoute />}>
          <Route path="/contractor" element={<ContractorDashboardPage />} />
          <Route path="/contractor/tenders" element={<ContractorTendersPage />} />
          <Route path="/contractor/tenders/:id" element={<TenderDetailsPage />} />
          <Route path="/contractor/tenders/:id/submit" element={<SubmitBidPage />} />
          <Route path="/contractor/bids" element={<ContractorBidsPage />} />
          <Route path="/contractor/bids/:bidId/reveal" element={<RevealBidPage />} />
          <Route path="/contractor/reputation" element={<ContractorDashboardPage />} />
          <Route path="/contractor/profile" element={<ContractorProfilePage />} />
          <Route path="/contractor/contracts" element={<ContractorContractsPage />} />
          <Route path="/contractor/payments" element={<ContractorPaymentsPage />} />
        </Route>

        <Route path="/auditor" element={<AuditorDashboardPage />} />
        <Route path="/auditor/risk-analysis" element={<RiskAnalysisPage />} />
        <Route path="/auditor/risk/:id" element={<RiskAnalysisPage />} />
        <Route path="/auditor/decision-report" element={<DecisionReportPage />} />
        <Route path="/auditor/decision-report/:id" element={<DecisionReportPage />} />
        <Route path="/auditor/blockchain" element={<AuditorBlockchainPage />} />
        <Route path="/audit/:id" element={<AuditTrailPage />} />

        <Route path="/tenders/:id" element={<TenderDetailsPage />} />
        <Route path="/suppliers" element={<SuppliersListPage />} />
        <Route path="/suppliers/:id" element={<SupplierDetailsPage />} />
        <Route path="/dev/components" element={<DevComponentsPage />} />
      </Route>

      <Route path="/contractor/bid/:id" element={<RedirectToSubmit />} />
      <Route path="/contractor/reveal/:id" element={<RedirectToReveal />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RoleProvider>
        <AppRoutes />
      </RoleProvider>
    </BrowserRouter>
  );
}
