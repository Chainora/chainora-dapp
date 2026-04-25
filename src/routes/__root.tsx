import { useEffect } from 'react';
import { Outlet, createRootRoute, useLocation } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import { AppHeader } from '../components/layout/AppHeader';
import { useAuth } from '../context/AuthContext';

function RootLayout() {
  const location = useLocation();
  const { isAuthenticated, syncProfile } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void syncProfile(false).catch(() => {
      // Best-effort profile refresh on navigation.
    });
  }, [isAuthenticated, location.pathname, syncProfile]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--ink-0)' }}>
      <AppHeader />

      <main className="mx-auto w-full max-w-[1280px] px-6 py-8">
        <Outlet />
      </main>

      <TanStackRouterDevtools position="bottom-right" />
    </div>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
