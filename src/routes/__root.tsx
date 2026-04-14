import { useEffect } from 'react';
import { Link, Outlet, createRootRoute, useLocation } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import { HeaderLoginButton } from '../components/auth/HeaderLoginButton';
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
    <div className="min-h-screen bg-chainora-bg">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center px-6 py-4 text-sm">
          <Link to="/" className="flex items-center gap-2.5 font-semibold text-slate-900" activeProps={{ className: 'flex items-center gap-2.5 text-sky-600 font-semibold' }}>
            <img
              src="https://media.base44.com/images/public/69d29468e773ef42abd4ce42/e1097b18b_logo2.png"
              alt="ICRosca"
              className="h-8 w-8 rounded-xl object-cover"
            />
            <span>ICRosca</span>
          </Link>
          <div className="ml-auto">
            <HeaderLoginButton />
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>

      <TanStackRouterDevtools position="bottom-right" />
    </div>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
