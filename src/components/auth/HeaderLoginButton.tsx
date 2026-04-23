import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useInterwovenKit } from '@initia/interwovenkit-react';
import { useAccount, useSignMessage } from 'wagmi';

import { chainoraApiBase } from '../../configs/api';
import { UserDetail } from '../UserDetail';
import { useAuth } from '../../context/AuthContext';
import {
  createAuthSession,
  verifyAuthSession,
} from '../../services/authService';
import { Button } from '../ui/Button';

type WalletLoginState =
  | 'idle'
  | 'connecting'
  | 'awaiting_wallet_scan'
  | 'awaiting_wallet_approval'
  | 'awaiting_card'
  | 'broadcasting'
  | 'confirmed'
  | 'error';

const resolveLoginStatusMessage = (state: WalletLoginState): string => {
  switch (state) {
    case 'connecting':
      return 'Opening wallet connector...';
    case 'awaiting_wallet_scan':
      return 'Scan the QR code with Chainora Wallet.';
    case 'awaiting_wallet_approval':
      return 'Approve the session in Chainora Wallet.';
    case 'awaiting_card':
      return 'Approve the signature and tap your card in Chainora Wallet.';
    case 'broadcasting':
      return 'Finalizing sign-in...';
    case 'confirmed':
      return 'Sign-in complete.';
    case 'error':
      return 'Could not complete sign-in.';
    default:
      return '';
  }
};

export function HeaderLoginButton() {
  const { address: walletAddress, isConnected, status: accountStatus } = useAccount();
  const { openConnect, openWallet, openBridge } = useInterwovenKit();
  const { signMessageAsync } = useSignMessage();
  const { address, username, avatarUrl, isAuthenticated, logout, setAuthenticated, syncProfile } = useAuth();
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [status, setStatus] = useState<WalletLoginState>('idle');
  const [error, setError] = useState('');
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);
  const isWorking = status !== 'idle' && status !== 'confirmed' && status !== 'error';

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
  const statusMessage = resolveLoginStatusMessage(status);

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

  const connectWallet = useCallback(() => {
    setError('');
    setStatus('connecting');
    openConnect();
  }, [openConnect]);

  const startWalletLogin = useCallback(async () => {
    if (!walletAddress) {
      connectWallet();
      return;
    }

    setError('');
    setStatus('awaiting_wallet_approval');

    try {
      const session = await createAuthSession(chainoraApiBase);
      const message = `Sign this to login to Chainora: ${session.nonce}`;

      setStatus('awaiting_card');
      const signature = await signMessageAsync({
        account: walletAddress,
        message,
      });

      setStatus('broadcasting');
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

      void syncProfile(true).catch(() => {
        // Best-effort profile sync.
      });

      setStatus('confirmed');
      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          setStatus(current => (current === 'confirmed' ? 'idle' : current));
        }, 1_500);
      }
    } catch (loginError) {
      console.warn('[login] startWalletLogin: failed', loginError);
      const message = loginError instanceof Error ? loginError.message : 'Could not complete sign-in.';
      setError(message);
      setStatus('error');
    }
  }, [connectWallet, setAuthenticated, signMessageAsync, syncProfile, walletAddress]);

  useEffect(() => {
    if (!isConnected || !walletAddress) {
      return;
    }

    if (status !== 'connecting' && status !== 'awaiting_wallet_scan') {
      return;
    }

    void startWalletLogin();
  }, [isConnected, startWalletLogin, status, walletAddress]);

  useEffect(() => {
    if (status !== 'connecting' || isConnected) {
      return;
    }

    if (accountStatus === 'connecting' || accountStatus === 'reconnecting') {
      setStatus(current => (current === 'connecting' ? 'awaiting_wallet_scan' : current));
    }
  }, [accountStatus, isConnected, status]);

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-600"
          onClick={() => openWallet()}
        >
          Wallet
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-600"
          onClick={() => openBridge()}
        >
          Bridge
        </button>

        <div className="relative" ref={avatarMenuRef}>
          <button
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 text-xs font-semibold text-slate-600 transition hover:border-sky-300 ${resolvedAvatarUrl ? 'bg-white' : 'bg-gradient-to-br from-slate-100 to-slate-200'}`}
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
            <div className="absolute right-0 top-full z-[150] mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <Link
                to="/profile"
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setIsAvatarMenuOpen(false)}
              >
                Profile
              </Link>
              <button
                type="button"
                className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                onClick={() => {
                  setIsAvatarMenuOpen(false);
                  logout();
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
        onClick={() => {
          void startWalletLogin();
        }}
        disabled={isWorking}
        className="bg-gradient-to-r from-sky-600 to-cyan-500 text-white hover:from-sky-500 hover:to-cyan-400 disabled:opacity-70"
      >
        {isWorking ? 'Processing...' : 'Login with Chainora Card'}
      </Button>
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
      {!error && statusMessage ? <p className="text-xs text-slate-500">{statusMessage}</p> : null}
    </div>
  );
}
