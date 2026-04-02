import { Navigate, createFileRoute } from '@tanstack/react-router';

import { useAuth } from '../context/AuthContext';
import { DashboardPage } from '../pages/dashboard';

function ProtectedDashboard() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return <DashboardPage />;
}

export const Route = createFileRoute('/dashboard')({
  component: ProtectedDashboard,
});
