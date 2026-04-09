import { Navigate, createFileRoute } from '@tanstack/react-router';

import { useAuth } from '../context/AuthContext';
import { ProfilePage } from '../pages/profile';

function ProtectedProfile() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return <ProfilePage />;
}

export const Route = createFileRoute('/profile')({
  component: ProtectedProfile,
});
