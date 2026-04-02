import { useEffect, useState } from 'react';

import { chainoraApiBase } from '../configs/api';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { useChainora } from '../hooks/useChainora';

type MeResponse = {
  address: string;
  sessionId: string;
};

export function DashboardPage() {
  const { authFetch } = useAuthFetch();
  const { currentRound, isRoundLoading, isJoinPending, joinHui } = useChainora();
  const [identity, setIdentity] = useState<MeResponse | null>(null);
  const [identityError, setIdentityError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadIdentity = async () => {
      try {
        const response = await authFetch(`${chainoraApiBase}/v1/auth/me`);
        if (!response.ok) {
          throw new Error(`Load auth profile failed: ${response.status}`);
        }

        const raw = (await response.json()) as
          | MeResponse
          | { success?: boolean; data?: MeResponse };
        const data =
          raw && typeof raw === 'object' && 'data' in raw && raw.data
            ? (raw.data as MeResponse)
            : (raw as MeResponse);

        if (!cancelled) {
          setIdentity(data);
          setIdentityError('');
        }
      } catch (err) {
        if (!cancelled) {
          setIdentity(null);
          setIdentityError(err instanceof Error ? err.message : 'Failed to load auth profile');
        }
      }
    };

    void loadIdentity();

    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Hui Dashboard</h1>
      <p className="mt-2 text-slate-600">Protected workspace for rounds, members, and contributions.</p>

      <div className="mt-4 rounded-xl bg-slate-50 p-4">
        <p className="text-sm text-slate-500">Authenticated Wallet</p>
        <p className="mt-1 font-semibold text-slate-900">{identity?.address ?? 'Loading...'}</p>
        {identity?.sessionId ? <p className="mt-1 text-xs text-slate-500">Session: {identity.sessionId}</p> : null}
        {identityError ? <p className="mt-2 text-sm text-rose-600">{identityError}</p> : null}
      </div>

      <div className="mt-6 rounded-xl bg-slate-50 p-4">
        <p className="text-sm text-slate-500">Current Round</p>
        <p className="mt-1 text-xl font-semibold text-slate-900">
          {isRoundLoading ? 'Loading...' : (currentRound?.toString() ?? 'N/A')}
        </p>
      </div>

      <button
        type="button"
        className="mt-6 rounded-lg bg-sky-600 px-4 py-2 font-medium text-white transition hover:bg-sky-700 disabled:opacity-60"
        disabled={isJoinPending}
        onClick={() => void joinHui(1n)}
      >
        {isJoinPending ? 'Submitting...' : 'Join Hui (1 unit)'}
      </button>
    </section>
  );
}
