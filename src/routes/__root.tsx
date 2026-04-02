import { Link, Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

function RootLayout() {
  return (
    <div className="min-h-screen bg-chainora-bg">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center gap-5 px-6 py-4 text-sm">
          <Link to="/" className="font-semibold text-slate-900" activeProps={{ className: 'text-sky-600 font-semibold' }}>
            Chainora
          </Link>
          <Link to="/auth" className="text-slate-600" activeProps={{ className: 'text-sky-600 font-semibold' }}>
            QR Login
          </Link>
          <Link to="/dashboard" className="text-slate-600" activeProps={{ className: 'text-sky-600 font-semibold' }}>
            Dashboard
          </Link>
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
