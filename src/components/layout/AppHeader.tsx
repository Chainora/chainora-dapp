import { Link } from '@tanstack/react-router';

import { HeaderLoginButton } from '../auth/HeaderLoginButton';
import { NotificationBell } from './NotificationBell';

export function AppHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center px-6 py-4 text-sm">
        <Link
          to="/"
          className="flex items-center gap-2.5 font-semibold text-slate-900"
          activeProps={{ className: 'flex items-center gap-2.5 text-sky-600 font-semibold' }}
        >
          <img
            src="https://media.base44.com/images/public/69d29468e773ef42abd4ce42/e1097b18b_logo2.png"
            alt="ICRosca"
            className="h-8 w-8 rounded-xl object-cover"
          />
          <span>ICRosca</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <NotificationBell />
          <HeaderLoginButton />
        </div>
      </nav>
    </header>
  );
}
