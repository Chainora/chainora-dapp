import { useChainora } from '../hooks/useChainora';

export function DashboardPage() {
  const { currentRound, isRoundLoading, isJoinPending, joinHui } = useChainora();

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Hui Dashboard</h1>
      <p className="mt-2 text-slate-600">Protected workspace for rounds, members, and contributions.</p>

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
