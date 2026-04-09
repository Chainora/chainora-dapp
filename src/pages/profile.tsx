import { useEffect, useState } from 'react';

import { chainoraApiBase } from '../configs/api';
import { useAuthFetch } from '../hooks/useAuthFetch';

type ProfileResponse = {
  address: string;
  username: string;
  tCNR: string;
  kycStatus: string;
};

export function ProfilePage() {
  const { authFetch } = useAuthFetch();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);
      setError('');
      setNotice('');

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

        if (!cancelled) {
          setProfile(data);
          setUsername(data.username ?? '');
        }
      } catch (err) {
        if (!cancelled) {
          setProfile(null);
          setError(err instanceof Error ? err.message : 'Unable to load profile');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  const handleSave = async () => {
    const nextName = username.trim();
    if (!nextName) {
      setError('Username is required');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const response = await authFetch(`${chainoraApiBase}/v1/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: nextName }),
      });

      if (!response.ok) {
        throw new Error(`Save profile failed: ${response.status}`);
      }

      const raw = (await response.json()) as
        | ProfileResponse
        | { success?: boolean; data?: ProfileResponse };
      const data =
        raw && typeof raw === 'object' && 'data' in raw && raw.data
          ? (raw.data as ProfileResponse)
          : (raw as ProfileResponse);

      setProfile(data);
      setUsername(data.username ?? nextName);
      setNotice('Profile updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
      <p className="mt-2 text-slate-600">Manage your Chainora account profile.</p>

      {loading ? <p className="mt-6 text-sm text-slate-500">Loading profile...</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      {notice ? <p className="mt-4 text-sm text-emerald-600">{notice}</p> : null}

      {profile ? (
        <div className="mt-6 space-y-5">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Wallet</p>
            <p className="mt-1 text-sm font-medium text-slate-900 break-all">{profile.address}</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="username-input">
              Username
            </label>
            <input
              id="username-input"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              value={username}
              onChange={event => setUsername(event.target.value)}
              placeholder="Enter display name"
              maxLength={40}
            />
            <button
              type="button"
              className="mt-3 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-60"
              onClick={() => void handleSave()}
              disabled={saving || loading}
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">tCNR</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{profile.tCNR}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
              <p className="text-xs uppercase tracking-wider text-amber-700">KYC</p>
              <p className="mt-1 text-sm font-semibold text-amber-800">Coming soon (unavailable)</p>
              <p className="mt-1 text-xs text-amber-700">Status: {profile.kycStatus}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
