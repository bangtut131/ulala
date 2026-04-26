import React, { useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import JobVacancies from './pages/JobVacancies';
import AdminVacancies from './pages/AdminVacancies';
import CandidateForm from './pages/CandidateForm';
import DiscDisclaimer from './pages/DiscDisclaimer';
import DiscTest from './pages/DiscTest';
import DiscInstruction from './pages/DiscInstruction';
import AptitudeDisclaimer from './pages/AptitudeDisclaimer';
import AptitudeInstruction from './pages/AptitudeInstruction';
import AptitudeTest from './pages/AptitudeTest';
import Completion from './pages/Completion';
import AdminDashboard from './pages/AdminDashboard';
import CandidateDetail from './pages/CandidateDetail';
import PortalDashboard from './pages/PortalDashboard';
import AdminManpower from './pages/AdminManpower';
import AdminKanban from './pages/AdminKanban';
import AdminSLA from './pages/AdminSLA';
import AdminSettings from './pages/AdminSettings';
import Welcome from './pages/Welcome';
import AdminLogin from './pages/AdminLogin';
import PortalLogin from './pages/PortalLogin';
import PortalRegister from './pages/PortalRegister';
import AdminEmployees from './pages/AdminEmployees';
import EmployeeDetail from './pages/EmployeeDetail';
import OnboardingLogin from './pages/OnboardingLogin';
import OnboardingPortal from './pages/OnboardingPortal';
import ExitForm from './pages/ExitForm';
import useAutoLogout from './hooks/useAutoLogout';
import InactivityWarning from './components/InactivityWarning';

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login', { replace: true });
  }, [navigate]);

  const { showWarning, remainingSeconds, stayActive } = useAutoLogout({
    timeoutMs: INACTIVITY_TIMEOUT,
    onLogout: handleLogout,
    tokenKey: 'adminToken'
  });

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      {children}
      {showWarning && (
        <InactivityWarning
          remainingSeconds={remainingSeconds}
          onStayActive={stayActive}
        />
      )}
    </div>
  );
};

const ProtectedPortalRoute = ({ children }) => {
  const token = localStorage.getItem('portalToken');
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    localStorage.removeItem('portalToken');
    localStorage.removeItem('portalUser');
    navigate('/portal/login', { replace: true });
  }, [navigate]);

  const { showWarning, remainingSeconds, stayActive } = useAutoLogout({
    timeoutMs: INACTIVITY_TIMEOUT,
    onLogout: handleLogout,
    tokenKey: 'portalToken'
  });

  if (!token) {
    return <Navigate to="/portal/login" replace />;
  }
  return (
    <div className="min-h-screen bg-slate-50">
      {children}
      {showWarning && (
        <InactivityWarning
          remainingSeconds={remainingSeconds}
          onStayActive={stayActive}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/careers" element={<JobVacancies />} />
        <Route path="/apply" element={<Welcome />} />
        <Route path="/apply/form" element={<CandidateForm />} />
        <Route path="/test-disclaimer" element={<DiscDisclaimer />} />
        <Route path="/test-instruction" element={<DiscInstruction />} />
        <Route path="/test" element={<DiscTest />} />
        <Route path="/test-aptitude-disclaimer" element={<AptitudeDisclaimer />} />
        <Route path="/test-aptitude-instruction" element={<AptitudeInstruction />} />
        <Route path="/test-aptitude" element={<AptitudeTest />} />
        <Route path="/complete" element={<Completion />} />

        {/* Division Portal */}
        <Route path="/portal/login" element={<PortalLogin />} />
        <Route path="/portal/register" element={<PortalRegister />} />
        <Route path="/portal" element={
          <ProtectedPortalRoute>
            <PortalDashboard />
          </ProtectedPortalRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/manpower" element={
          <ProtectedRoute>
            <AdminManpower />
          </ProtectedRoute>
        } />
        <Route path="/admin/vacancies" element={
          <ProtectedRoute>
            <AdminVacancies />
          </ProtectedRoute>
        } />
        <Route path="/admin/kanban" element={
          <ProtectedRoute>
            <AdminKanban />
          </ProtectedRoute>
        } />
        <Route path="/admin/candidate/:id" element={
          <ProtectedRoute>
            <CandidateDetail />
          </ProtectedRoute>
        } />
        <Route path="/admin/settings" element={
          <ProtectedRoute>
            <AdminSettings />
          </ProtectedRoute>
        } />
        <Route path="/admin/sla" element={
          <ProtectedRoute>
            <AdminSLA />
          </ProtectedRoute>
        } />
        <Route path="/admin/employees" element={
          <ProtectedRoute>
            <AdminEmployees />
          </ProtectedRoute>
        } />
        <Route path="/admin/employees/:id" element={
          <ProtectedRoute>
            <EmployeeDetail />
          </ProtectedRoute>
        } />

        {/* Onboarding Portal */}
        <Route path="/onboarding/login" element={<OnboardingLogin />} />
        <Route path="/onboarding" element={<OnboardingPortal />} />
        <Route path="/onboarding/exit" element={<ExitForm />} />
      </Routes>
    </Router>
  );
}

export default App;
