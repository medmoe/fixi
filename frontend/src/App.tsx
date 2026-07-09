import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastHost } from './components/ToastHost';
import { AuthInitializer } from './features/auth/components/AuthInitializer';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { ProfilePage } from './features/profile/pages/ProfilePage';
import { JobsPage } from './features/jobs/pages/JobsPage';
import { WorkersPage } from './features/workers/pages/WorkersPage';
import { JobDetailPage } from './features/jobs/pages/JobDetailPage';
import { useAppSelector } from './hooks/useAppSelector';

const RootRedirect = () => {
  const isAuthed = useAppSelector((state) => Boolean(state.auth.accessToken && state.auth.user));
  const role = useAppSelector((state) => state.auth.user?.role_type);
  if (!isAuthed) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={role === 'handyman' ? '/jobs' : '/app'} replace />;
};

const App = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthInitializer />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs"
          element={
            <ProtectedRoute>
              <JobsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs/:jobId"
          element={
            <ProtectedRoute>
              <JobDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workers"
          element={
            <ProtectedRoute>
              <WorkersPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastHost />
    </BrowserRouter>
  );
};

export default App;
