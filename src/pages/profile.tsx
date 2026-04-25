import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from '@tanstack/react-router';
import { getAddress, isAddress } from 'viem';
import { useAccount, useSignMessage } from 'wagmi';

import { chainoraApiBase } from '../configs/api';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { useConnectRelayWallet } from '../hooks/useConnectRelayWallet';
import { useAuth } from '../context/AuthContext';
import { fetchChainoraBalance, fetchChainoraStablecoinBalance } from '../services/chainoraBalance';
import { uploadMediaImage } from '../services/mediaService';
import { updateAuthProfileAvatar } from '../services/profileService';
import {
  createUsernameRelayerPayload,
  submitUsernameRelayerRequest,
} from '../services/usernameRelayer';
import { Button } from '../components/ui/Button';
import { toInitAddress } from '../components/UserDetail';

type ProfileResponse = {
  address: string;
  username: string;
  avatarUrl: string;
  reputationScore?: string;
  tCNR: string;
  kycStatus: string;
};

const RELAYER_USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,20}$/;
const PLACEHOLDER_USERNAME = 'Chainora User';
const PROFILE_AUTH_ERROR_PATTERN = /Load profile failed:\s*(401|403)\b/;

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

const toFriendlyRelayerError = (raw: unknown, fallback: string): string => {
  const message = sanitizeRelayerErrorMessage(raw instanceof Error ? raw.message : String(raw ?? ''));
  if (!message) {
    return fallback;
  }

  const lower = message.toLowerCase();
  if (
    lower.includes('payload')
    || lower.includes('session')
    || lower.includes('status')
    || lower.includes('tx')
    || lower.includes('hash')
    || lower.includes('request failed')
  ) {
    return fallback;
  }

  return message;
};

export function ProfilePage() {
  const { isAuthenticated, setAvatarUrl } = useAuth();
  const { authFetch } = useAuthFetch();
  const connectRelayWallet = useConnectRelayWallet();
  const { address: walletAddressRaw } = useAccount();
  const { signMessageAsync } = useSignMessage();
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
  const hasUsername = Boolean(normalizeProfileUsername(profile?.username));
  const tcnrSymbol = (import.meta.env.VITE_CHAINORA_CURRENCY_SYMBOL?.trim() || 'tCNR').toUpperCase();
  const connectedWalletAddress = useMemo(() => {
    if (!walletAddressRaw || !isAddress(walletAddressRaw)) {
      return null;
    }
    return getAddress(walletAddressRaw);
  }, [walletAddressRaw]);

  const reputationLabel = useMemo(() => {
    const raw = String(profile?.reputationScore ?? '0').trim();
    if (!raw) {
      return '0';
    }

    const asNumber = Number(raw);
    if (Number.isFinite(asNumber)) {
      return Math.floor(asNumber).toLocaleString();
    }

    return raw;
  }, [profile?.reputationScore]);

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
        const message = err instanceof Error ? err.message : 'Unable to load profile';
        if (PROFILE_AUTH_ERROR_PATTERN.test(message)) {
          setProfile(null);
        }
        setError(message);
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
      setError('This wallet already has a username.');
      return;
    }

    const nextName = registerUsername.trim();
    if (!RELAYER_USERNAME_PATTERN.test(nextName)) {
      setError('Username must be 3-20 chars and only use letters, numbers, underscore, dot, or dash');
      return;
    }

    let relayAddress = connectedWalletAddress;
    try {
      relayAddress = await connectRelayWallet({
        mode: 'default',
      });
    } catch (connectError) {
      setError(toFriendlyRelayerError(connectError, 'Could not connect wallet. Please try again.'));
      return;
    }

    if (!relayAddress) {
      setError('Wallet connected but address is unavailable. Please try again.');
      return;
    }

    const rawProfileAddress = profile.address.trim();
    if (!rawProfileAddress || !isAddress(rawProfileAddress)) {
      setError('Profile wallet address is invalid. Please refresh and try again.');
      return;
    }

    let profileAddress: `0x${string}`;
    try {
      profileAddress = getAddress(rawProfileAddress);
    } catch {
      setError('Profile wallet address is invalid. Please refresh and try again.');
      return;
    }

    if (relayAddress.toLowerCase() !== profileAddress.toLowerCase()) {
      setError('Connected wallet does not match profile wallet.');
      return;
    }

    setRegistering(true);
    setError('');
    setNotice('Preparing username request...');

    try {
      const payload = await createUsernameRelayerPayload(profileAddress, nextName);
      setNotice('Approve username signature in native app...');
      const signature = await signMessageAsync({
        account: relayAddress,
        message: payload.message,
      });

      const submitted = await submitUsernameRelayerRequest({
        sessionId: payload.sessionId,
        address: payload.address,
        username: payload.username,
        signature,
      });

      setNotice(
        submitted.txHash?.trim()
          ? `Username registered successfully. Tx: ${submitted.txHash}`
          : 'Username registered successfully.',
      );
      setRegisterUsername('');
      setShowRegisterForm(false);
      await refreshProfile(false, false);
    } catch (err) {
      setNotice('');
      setError(toFriendlyRelayerError(err, 'Could not register username. Please try again.'));
    } finally {
      setRegistering(false);
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <section className="card-raised mx-auto w-full max-w-3xl p-8">
      <h1 className="t-h2 c-1" style={{ fontFamily: 'var(--font-display)' }}>
        Profile
      </h1>
      <p className="t-body c-2 mt-2">Manage your Chainora account profile.</p>

      {loading ? <p className="t-small c-3 mt-6">Loading profile...</p> : null}
      {!loading && refreshingProfile ? <p className="t-small c-3 mt-6">Syncing profile...</p> : null}
      {error ? <p className="t-small c-risk mt-4">{error}</p> : null}
      {notice ? <p className="t-small c-ok mt-4">{notice}</p> : null}

      {profile ? (
        <div className="mt-6 space-y-5">
          <div className="card p-4">
            <p className="t-label">Avatar</p>
            <div className="mt-3 flex items-center gap-4">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt="Profile avatar"
                  className="h-20 w-20 rounded-full object-cover"
                  style={{ boxShadow: '0 0 0 2px var(--ink-5)' }}
                />
              ) : (
                <div
                  className="t-tiny c-3 flex h-20 w-20 items-center justify-center rounded-full font-semibold"
                  style={{ background: 'var(--ink-3)', border: '1px solid var(--ink-5)' }}
                >
                  No avatar
                </div>
              )}
              <div className="space-y-2">
                <label className="btn btn-signal btn-sm cursor-pointer">
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
                <p className="t-tiny c-3">Image will be auto-resized and compressed before upload.</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <p className="t-label">Wallet</p>
            <p className="t-small c-1 t-mono mt-1 break-all font-medium">
              {toInitAddress(profile.address).toUpperCase() || profile.address}
            </p>
            <p className="t-tiny c-3 t-mono mt-1 break-all">EVM: {profile.address}</p>
          </div>

          <div>
            <div className="card p-4">
              <p className="t-label">Username</p>
              <p className="t-small c-1 mt-1 font-medium">
                {normalizeProfileUsername(profile.username) || 'Not registered yet'}
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              className="mt-3"
              onClick={() => {
                setError('');
                setNotice('');
                setShowRegisterForm(true);
              }}
              disabled={loading || hasUsername || showRegisterForm}
            >
              Register Username
            </Button>
            <p className="t-tiny c-3 mt-1">
              {hasUsername ? 'This account already has a username.' : 'Available for accounts without username.'}
            </p>

            {showRegisterForm && !hasUsername ? (
              <div className="mt-3 flex items-center gap-2">
                <input
                  id="username-input"
                  className="input flex-1"
                  value={registerUsername}
                  onChange={event => setRegisterUsername(event.target.value)}
                  placeholder="Enter username"
                  maxLength={20}
                  disabled={registering}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void handleRegisterUsername();
                  }}
                  disabled={registering || !registerUsername.trim()}
                  aria-label="Confirm username registration"
                >
                  {registering ? '…' : '✓'}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-4">
              <p className="t-label">tCNR</p>
              <p className="t-mono c-1 mt-1 text-xl font-semibold">
                {loadingBalance ? 'Loading...' : `${chainoraBalance} ${tcnrSymbol}`}
              </p>
            </div>
            <div
              className="p-4"
              style={{
                background: 'rgba(40,151,255,0.08)',
                border: '1px solid rgba(40,151,255,0.4)',
                borderRadius: 'var(--r-xl)',
              }}
            >
              <p className="t-label" style={{ color: 'var(--signal-300)' }}>Reputation</p>
              <p className="t-num c-1 mt-1 text-xl font-semibold" style={{ color: 'var(--signal-200)' }}>
                {reputationLabel}
              </p>
            </div>
            <div
              className="p-4"
              style={{
                background: 'var(--ok-bg)',
                border: '1px solid rgba(16,185,129,0.4)',
                borderRadius: 'var(--r-xl)',
              }}
            >
              <p className="t-label" style={{ color: 'var(--ok-300)' }}>{stablecoinSymbol}</p>
              <p className="t-mono mt-1 text-xl font-semibold" style={{ color: 'var(--ok-300)' }}>
                {loadingBalance ? 'Loading...' : stablecoinError ? 'Unavailable' : `${stablecoinBalance} ${stablecoinSymbol}`}
              </p>
              {stablecoinError ? (
                <p className="t-tiny mt-1" style={{ color: 'var(--ok-300)' }}>{stablecoinError}</p>
              ) : stablecoinAddress ? (
                <p className="t-tiny t-mono mt-1 break-all" style={{ color: 'var(--ok-300)' }}>
                  Token: {stablecoinAddress}
                </p>
              ) : null}
            </div>
            <div
              className="p-4"
              style={{
                background: 'var(--warn-bg)',
                border: '1px solid rgba(245,158,11,0.4)',
                borderRadius: 'var(--r-xl)',
              }}
            >
              <p className="t-label" style={{ color: 'var(--warn-300)' }}>KYC</p>
              <p className="t-small mt-1 font-semibold" style={{ color: 'var(--warn-300)' }}>
                Coming soon (unavailable)
              </p>
              <p className="t-tiny mt-1" style={{ color: 'var(--warn-300)' }}>Status: {profile.kycStatus}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
