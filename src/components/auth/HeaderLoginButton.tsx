import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useInterwovenKit } from '@initia/interwovenkit-react';
import { useDisconnect, useSignMessage } from 'wagmi';

import { chainoraApiBase } from '../../configs/api';
import { UserDetail } from '../UserDetail';
import { useAuth } from '../../context/AuthContext';
import { useConnectRelayWallet } from '../../hooks/useConnectRelayWallet';
import { createAuthSession, verifyAuthSession } from '../../services/authService';
import { Button } from '../ui/Button';

const normalizeLoginError = (raw: unknown): string => {
  const relayCode = typeof raw === 'object' && raw !== null && 'relayCode' in raw
    ? String((raw as { relayCode?: unknown }).relayCode ?? '').trim()
    : '';
  if (relayCode === 'LOGIN_SCAN_REQUIRED') {
    return 'Mobile wallet did not complete one-tap login. Please scan QR and tap card again.';
  }

  const providerCode = typeof raw === 'object' && raw !== null && 'code' in raw
    ? Number((raw as { code?: unknown }).code)
    : NaN;
  if (providerCode === 4001) {
    return 'Login was cancelled on mobile wallet.';
  }

  if (raw instanceof Error) {
    const message = raw.message.trim();
    if (/LOGIN_SCAN_REQUIRED/i.test(message)) {
      return 'Mobile wallet did not complete one-tap login. Please scan QR and tap card again.';
    }
    if (message) {
      return message;
    }
  }

  return 'Could not complete login. Please try again.';
};

export function HeaderLoginButton() {
  const { disconnect: interwovenDisconnect } = useInterwovenKit();
  const { disconnectAsync } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const connectRelayWallet = useConnectRelayWallet();
  const { address, username, avatarUrl, isAuthenticated, logout, setAuthenticated, syncProfile } = useAuth();
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);

  const avatarLabel = useMemo(() => {
    const trimmedUsername = username?.trim() ?? '';
    if (trimmedUsername) {
      return trimmedUsername.slice(0, 2).toUpperCase();
    }

    const trimmedAddress = address?.trim() ?? '';
    if (!trimmedAddress) {
      return 'AV';
    }

    return trimmedAddress.slice(2, 4).toUpperCase();
  }, [address, username]);

  const resolvedAvatarUrl = useMemo(() => avatarUrl.trim(), [avatarUrl]);

  const handleLogout = useCallback(async () => {
    try {
      interwovenDisconnect();
    } catch (disconnectError) {
      console.warn('[auth] interwoven disconnect on logout failed', disconnectError);
    }

    try {
      await disconnectAsync();
    } catch (disconnectError) {
      console.warn('[auth] wallet disconnect on logout failed', disconnectError);
    }

    logout();
  }, [disconnectAsync, interwovenDisconnect, logout]);

  const runLogin = useCallback(async (walletAddress: string) => {
    setLoading(true);
    console.info('[auth][dapp] login.start', { walletAddress });
    try {
      const session = await createAuthSession(chainoraApiBase);
      const message = `Sign this to login to Chainora: ${session.nonce}`;

      const signature = await signMessageAsync({
        account: walletAddress as `0x${string}`,
        message,
      });

      const verified = await verifyAuthSession(chainoraApiBase, {
        sessionId: session.sessionId,
        address: walletAddress,
        signature,
      });

      setAuthenticated({
        token: verified.token,
        refreshToken: verified.refreshToken,
        address: verified.address || walletAddress,
        username: verified.username ?? '',
      });
      console.info('[auth][dapp] login.success', {
        walletAddress,
        verifiedAddress: verified.address || walletAddress,
      });

      void syncProfile(true).catch(() => {
        // Best-effort profile sync after successful login.
      });
    } catch (loginError) {
      console.warn('[auth][dapp] login.failed', {
        walletAddress,
        message: normalizeLoginError(loginError),
      });
      setError(normalizeLoginError(loginError));
    } finally {
      setLoading(false);
    }
  }, [setAuthenticated, signMessageAsync, syncProfile]);

  const handleLogin = useCallback(async () => {
    setError('');

    try {
      const approvedAddress = await connectRelayWallet({
        mode: 'login',
      });
      await runLogin(approvedAddress);
    } catch (connectError) {
      setError(normalizeLoginError(connectError));
    }
  }, [connectRelayWallet, runLogin]);

  useEffect(() => {
    if (!isAvatarMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!avatarMenuRef.current) {
        return;
      }

      if (!avatarMenuRef.current.contains(event.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAvatarMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isAvatarMenuOpen]);

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <div className="relative" ref={avatarMenuRef}>
          <button
            type="button"
            className="t-tiny inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full font-semibold transition"
            style={{
              background: resolvedAvatarUrl
                ? 'var(--ink-2)'
                : 'linear-gradient(135deg, var(--signal-400), var(--arc-400))',
              border: '1px solid var(--ink-5)',
              color: resolvedAvatarUrl ? 'var(--haze-2)' : 'var(--ink-0)',
            }}
            aria-label="User menu"
            aria-haspopup="menu"
            aria-expanded={isAvatarMenuOpen}
            onClick={() => setIsAvatarMenuOpen(prev => !prev)}
          >
            {resolvedAvatarUrl ? (
              <img src={resolvedAvatarUrl} alt="User avatar" className="h-full w-full object-cover" />
            ) : (
              avatarLabel
            )}
          </button>

          {isAvatarMenuOpen ? (
            <div
              className="absolute right-0 top-full z-[150] mt-2 w-44 p-2"
              style={{
                background: 'var(--ink-2)',
                border: '1px solid var(--ink-5)',
                borderRadius: 'var(--r-md)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <Link
                to="/profile"
                className="t-small c-2 block rounded-[var(--r-sm)] px-3 py-2 font-medium transition"
                onClick={() => setIsAvatarMenuOpen(false)}
                onMouseEnter={event => {
                  event.currentTarget.style.background = 'var(--ink-3)';
                  event.currentTarget.style.color = 'var(--haze-1)';
                }}
                onMouseLeave={event => {
                  event.currentTarget.style.background = 'transparent';
                  event.currentTarget.style.color = 'var(--haze-2)';
                }}
              >
                Profile
              </Link>
              <button
                type="button"
                className="t-small c-2 mt-1 w-full rounded-[var(--r-sm)] px-3 py-2 text-left font-medium transition"
                onClick={() => {
                  setIsAvatarMenuOpen(false);
                  void handleLogout();
                }}
                onMouseEnter={event => {
                  event.currentTarget.style.background = 'var(--ink-3)';
                  event.currentTarget.style.color = 'var(--haze-1)';
                }}
                onMouseLeave={event => {
                  event.currentTarget.style.background = 'transparent';
                  event.currentTarget.style.color = 'var(--haze-2)';
                }}
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>

        <Link to="/profile" className="inline-flex">
          <UserDetail username={username} address={address} />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          void handleLogin();
        }}
        disabled={loading}
      >
        {loading ? 'Signing...' : 'Login with Chainora Card'}
      </Button>
      {error ? <p className="t-tiny c-risk font-medium">{error}</p> : null}
    </div>
  );
}
