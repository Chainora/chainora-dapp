import { Navigate, createFileRoute } from '@tanstack/react-router';
import { useAccount } from 'wagmi';

import { DashboardPage } from '../pages/dashboard';

function ProtectedDashboard() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return <Navigate to="/auth" />;
  }

  return <DashboardPage />;
}

export const Route = createFileRoute('/dashboard')({
  component: ProtectedDashboard,
});
