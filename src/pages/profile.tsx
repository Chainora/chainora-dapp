import { type ChangeEvent, useCallback, useEffect, useState } from 'react';
import { Navigate } from '@tanstack/react-router';

import { chainoraApiBase } from '../configs/api';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { fetchChainoraBalance, fetchChainoraStablecoinBalance } from '../services/chainoraBalance';
import { buildQrImageUrl, buildQrPayload } from '../services/qrFlow';
import { uploadMediaImage } from '../services/mediaService';
import { updateAuthProfileAvatar } from '../services/profileService';
import { createUsernameRelayerPayload, openUsernameRelayerSocket } from '../services/usernameRelayer';
import { toInitAddress } from '../components/UserDetail';

type ProfileResponse = {
  address: string;
  username: string;
  avatarUrl: string;
  tCNR: string;
  kycStatus: string;
};

const RELAYER_USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,20}$/;
const PLACEHOLDER_USERNAME = 'Chainora User';

const normalizeProfileUsername = (value: string | undefined): string => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.toLowerCase() === PLACEHOLDER_USERNAME.toLowerCase()) {
    return '';
  }
  return trimmed;
};

const sanitizeRelayerErrorMessage = (raw: string): string => {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) {
    return '';
  }

  const usageIndex = trimmed.indexOf('Usage:');
  if (usageIndex > 0) {
    return trimmed.slice(0, usageIndex).trim();
  }

  return trimmed;
};

export function ProfilePage() {
  const { isAuthenticated, setAvatarUrl } = useAuth();
  const { authFetch } = useAuthFetch();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [registerUsername, setRegisterUsername] = useState('');
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshingProfile, setRefreshingProfile] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [chainoraBalance, setChainoraBalance] = useState('0.0000');
  const [stablecoinBalance, setStablecoinBalance] = useState('0.0000');
  const [stablecoinSymbol, setStablecoinSymbol] = useState(import.meta.env.VITE_CHAINORA_CONTRIBUTION_SYMBOL?.trim() || 'tcUSD');
  const [stablecoinAddress, setStablecoinAddress] = useState('');
  const [stablecoinError, setStablecoinError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [relayerSessionId, setRelayerSessionId] = useState('');
  const [relayerQrPayload, setRelayerQrPayload] = useState('');
  const [relayerWsState, setRelayerWsState] = useState('idle');
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const hasUsername = Boolean(normalizeProfileUsername(profile?.username));
  const tcnrSymbol = (import.meta.env.VITE_CHAINORA_CURRENCY_SYMBOL?.trim() || 'tCNR').toUpperCase();
  const isAwaitingCardScan = relayerWsState === 'awaiting_card_scan';

  const refreshProfile = useCallback(
    async (showGlobalLoading: boolean, clearMessages: boolean) => {
      if (showGlobalLoading) {
        setLoading(true);
      } else {
        setRefreshingProfile(true);
      }
      if (clearMessages) {
        setError('');
        setNotice('');
      }

      try {
        const response = await authFetch(`${chainoraApiBase}/v1/auth/profile`);
        if (!response.ok) {
          throw new Error(`Load profile failed: ${response.status}`);
        }

        const raw = (await response.json()) as
          | ProfileResponse
          | { success?: boolean; data?: ProfileResponse };

        const data =
          raw && typeof raw === 'object' && 'data' in raw && raw.data
            ? (raw.data as ProfileResponse)
            : (raw as ProfileResponse);

        setProfile(data);
        setAvatarUrl(data.avatarUrl?.trim() || '');
        if (normalizeProfileUsername(data.username)) {
          setRegisterUsername('');
          setShowRegisterForm(false);
        }
      } catch (err) {
        setProfile(null);
        setError(err instanceof Error ? err.message : 'Unable to load profile');
      } finally {
        if (showGlobalLoading) {
          setLoading(false);
        } else {
          setRefreshingProfile(false);
        }
      }
    },
    [authFetch, setAvatarUrl],
  );

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file for avatar.');
      return;
    }

    setUploadingAvatar(true);
    setError('');
    setNotice('Uploading avatar...');

    try {
      const upload = await uploadMediaImage(authFetch, file, 'avatar');
      const updatedProfile = await updateAuthProfileAvatar(authFetch, upload.url);
      setProfile(prev => ({
        ...(prev ?? updatedProfile),
        ...updatedProfile,
        avatarUrl: updatedProfile.avatarUrl || upload.url,
      }));
      setAvatarUrl(updatedProfile.avatarUrl || upload.url);
      setNotice('Avatar updated successfully.');
    } catch (err) {
      setNotice('');
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void refreshProfile(true, true);
  }, [isAuthenticated, refreshProfile]);

  useEffect(() => {
    if (!relayerSessionId) {
      return;
    }

    const ws = openUsernameRelayerSocket(
      relayerSessionId,
      event => {
        if (event.status === 'registered') {
          setNotice(`Username registered on-chain. Tx: ${event.txHash ?? 'unknown'}`);
          if (event.username) {
            setProfile(prev => (prev ? { ...prev, username: event.username as string } : prev));
            setRegisterUsername('');
            setShowRegisterForm(false);
          }
          void refreshProfile(false, false);
          setRelayerSessionId('');
          setRelayerQrPayload('');
          setRelayerWsState('closed');
          setIsQrDialogOpen(false);
          return;
        }

        if (event.status === 'failed') {
          const relayerError = sanitizeRelayerErrorMessage(event.error ?? 'Relayer registration failed');
          setError(`Relayer error: ${relayerError}`);
          setRelayerSessionId('');
          setRelayerQrPayload('');
          setRelayerWsState('closed');
        }
      },
      state => {
        setRelayerWsState(state);
      },
    );

    return () => {
      ws.close();
    };
  }, [refreshProfile, relayerSessionId]);

  useEffect(() => {
    if (!profile?.address) {
      return;
    }

    let cancelled = false;

    const loadBalance = async () => {
      setLoadingBalance(true);
      try {
        const [nativeBalanceResult, stablecoinBalanceResult] = await Promise.allSettled([
          fetchChainoraBalance(profile.address),
          fetchChainoraStablecoinBalance(profile.address),
        ]);

        if (cancelled) {
          return;
        }

        if (nativeBalanceResult.status === 'fulfilled') {
          setChainoraBalance(nativeBalanceResult.value.formatted);
        } else {
          setChainoraBalance('0.0000');
        }

        if (stablecoinBalanceResult.status === 'fulfilled') {
          setStablecoinBalance(stablecoinBalanceResult.value.formatted);
          setStablecoinSymbol(stablecoinBalanceResult.value.symbol || (import.meta.env.VITE_CHAINORA_CONTRIBUTION_SYMBOL?.trim() || 'tcUSD'));
          setStablecoinAddress(stablecoinBalanceResult.value.tokenAddress);
          setStablecoinError('');
        } else {
          setStablecoinBalance('0.0000');
          setStablecoinAddress('');
          const reason = stablecoinBalanceResult.reason;
          setStablecoinError(reason instanceof Error ? reason.message : 'Unable to load stablecoin balance.');
        }
      } catch {
        if (!cancelled) {
          setChainoraBalance('0.0000');
          setStablecoinBalance('0.0000');
          setStablecoinError('Unable to load stablecoin balance.');
        }
      } finally {
        if (!cancelled) {
          setLoadingBalance(false);
        }
      }
    };

    void loadBalance();

    return () => {
      cancelled = true;
    };
  }, [profile?.address]);

  useEffect(() => {
    if (normalizeProfileUsername(profile?.username)) {
      setShowRegisterForm(false);
    }
  }, [profile?.username]);

  const handleRegisterUsername = async () => {
    if (!profile?.address) {
      setError('Wallet address is unavailable');
      return;
    }

    if (hasUsername) {
      setError('This wallet already has a username on-chain.');
      return;
    }

    const nextName = registerUsername.trim();
    if (!RELAYER_USERNAME_PATTERN.test(nextName)) {
      setError('Username must be 3-20 chars and only use letters, numbers, underscore, dot, or dash');
      return;
    }

    setIsQrDialogOpen(true);
    setRegistering(true);
    setError('');
    setNotice('');

    try {
      const payload = await createUsernameRelayerPayload(profile.address.trim(), nextName);
      const qrPayload = buildQrPayload({
        feature: payload.feature,
        apiBase: chainoraApiBase,
        data: {
          sessionId: payload.sessionId,
          address: payload.address,
          username: payload.username,
          message: payload.message,
        },
      });

      setRelayerSessionId(payload.sessionId);
      setRelayerQrPayload(qrPayload);
      setNotice('Scan QR with native app and tap card to sign free registration');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create relayer payload');
    } finally {
      setRegistering(false);
    }
  };

  const closeQrDialog = () => {
    setIsQrDialogOpen(false);
    setRelayerSessionId('');
    setRelayerQrPayload('');
    setRelayerWsState('idle');
    setRegistering(false);
  };

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
      <p className="mt-2 text-slate-600">Manage your Chainora account profile.</p>

      {loading ? <p className="mt-6 text-sm text-slate-500">Loading profile...</p> : null}
      {!loading && refreshingProfile ? <p className="mt-6 text-sm text-slate-500">Syncing profile...</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      {notice ? <p className="mt-4 text-sm text-emerald-600">{notice}</p> : null}

      {profile ? (
        <div className="mt-6 space-y-5">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Avatar</p>
            <div className="mt-3 flex items-center gap-4">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Profile avatar" className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-200" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                  No avatar
                </div>
              )}
              <div className="space-y-2">
                <label className="inline-flex cursor-pointer items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700">
                  {uploadingAvatar ? 'Uploading...' : 'Upload avatar'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingAvatar}
                    onChange={event => {
                      void handleAvatarChange(event);
                    }}
                  />
                </label>
                <p className="text-xs text-slate-500">Image will be auto-resized and compressed before upload.</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Wallet</p>
            <p className="mt-1 text-sm font-medium text-slate-900 break-all">{toInitAddress(profile.address).toUpperCase() || profile.address}</p>
            <p className="mt-1 text-xs text-slate-500 break-all">EVM: {profile.address}</p>
          </div>

          <div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Username</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {normalizeProfileUsername(profile.username) || 'Not registered yet'}
              </p>
            </div>

            <button
              type="button"
              className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
              onClick={() => {
                setError('');
                setNotice('');
                setShowRegisterForm(true);
              }}
              disabled={loading || hasUsername || showRegisterForm}
            >
              Register Username
            </button>
            <p className="mt-1 text-xs text-slate-600">
              {hasUsername ? 'This account already has an on-chain username.' : 'Available for accounts without username.'}
            </p>

            {showRegisterForm && !hasUsername ? (
              <div className="mt-3 flex items-center gap-2">
                <input
                  id="username-input"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  value={registerUsername}
                  onChange={event => setRegisterUsername(event.target.value)}
                  placeholder="Enter username"
                  maxLength={20}
                  disabled={registering}
                />
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-sky-600 text-lg font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
                  onClick={() => {
                    void handleRegisterUsername();
                  }}
                  disabled={registering || !registerUsername.trim()}
                  aria-label="Confirm username registration"
                >
                  {registering ? '…' : '✓'}
                </button>
              </div>
            ) : null}

          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">tCNR</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {loadingBalance ? 'Loading...' : `${chainoraBalance} ${tcnrSymbol}`}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
              <p className="text-xs uppercase tracking-wider text-emerald-700">{stablecoinSymbol}</p>
              <p className="mt-1 text-xl font-semibold text-emerald-800">
                {loadingBalance ? 'Loading...' : stablecoinError ? 'Unavailable' : `${stablecoinBalance} ${stablecoinSymbol}`}
              </p>
              {stablecoinError ? (
                <p className="mt-1 text-xs text-emerald-700">{stablecoinError}</p>
              ) : stablecoinAddress ? (
                <p className="mt-1 text-xs text-emerald-700 break-all">Token: {stablecoinAddress}</p>
              ) : null}
            </div>
            <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
              <p className="text-xs uppercase tracking-wider text-amber-700">KYC</p>
              <p className="mt-1 text-sm font-semibold text-amber-800">Coming soon (unavailable)</p>
              <p className="mt-1 text-xs text-amber-700">Status: {profile.kycStatus}</p>
            </div>
          </div>
        </div>
      ) : null}

      {isQrDialogOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/55 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-sky-500">Username Registration</p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">Scan and sign with your card</h2>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close username registration dialog"
                onClick={closeQrDialog}
              >
                x
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Session Status</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{registering ? 'creating_session' : relayerWsState}</p>
              {relayerSessionId ? <p className="mt-1 text-xs text-slate-500">Session: {relayerSessionId}</p> : null}
              <p className="mt-2 text-sm font-semibold text-sky-700">{isAwaitingCardScan ? 'pls scan card to register username' : 'scan qr to continue'}</p>
            </div>

            <div className="mt-5 grid min-h-[280px] place-items-center">
              {isAwaitingCardScan ? (
                <div className="flex h-[260px] w-[260px] items-center justify-center rounded-xl bg-sky-50 p-4 text-center text-sm font-semibold text-sky-700 ring-1 ring-sky-200">
                  pls scan card to register username
                </div>
              ) : relayerQrPayload ? (
                <img
                  src={buildQrImageUrl(relayerQrPayload, 280)}
                  alt="Username registration QR"
                  className="h-[260px] w-[260px] rounded-xl object-contain ring-1 ring-slate-200"
                />
              ) : (
                <div className="flex h-[260px] w-[260px] items-center justify-center rounded-xl bg-slate-100 text-center text-sm text-slate-500">
                  {registering ? 'Preparing QR...' : 'Unable to create QR'}
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={closeQrDialog}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void handleRegisterUsername();
                }}
                disabled={registering || isAwaitingCardScan || !registerUsername.trim() || hasUsername}
              >
                {registering ? 'Refreshing...' : 'Refresh QR'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
