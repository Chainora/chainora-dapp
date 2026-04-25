import { Link } from '@tanstack/react-router';

import { HeaderLoginButton } from '../auth/HeaderLoginButton';
import { NotificationBell } from './NotificationBell';

export function AppHeader() {
  return (
    <header
      className="sticky top-0 z-[140]"
      style={{
        background: 'rgba(5,7,13,0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--ink-5)',
      }}
    >
      <nav className="mx-auto flex w-full max-w-[1280px] items-center px-6 py-3 text-sm">
        <Link
          to="/"
          className="t-h4 c-1 flex items-center gap-2.5 font-extrabold transition"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}
          activeProps={{ style: { color: 'var(--signal-300)' } }}
        >
          <img
            src="https://media.base44.com/images/public/69d29468e773ef42abd4ce42/e1097b18b_logo2.png"
            alt="Chainora"
            className="h-8 w-8 rounded-[var(--r-md)] object-cover"
            style={{ boxShadow: '0 0 0 1px var(--ink-5)' }}
          />
          <span>Chainora</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <NotificationBell />
          <HeaderLoginButton />
        </div>
      </nav>
    </header>
  );
}
