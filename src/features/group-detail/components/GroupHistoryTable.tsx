import type { ApiGroupViewHistoryRow } from '../../../services/groupsService';
import { formatToken } from '../utils';

export function GroupHistoryTable({ rows }: { rows: ApiGroupViewHistoryRow[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-600">Phase History</h2>
        <span className="text-xs text-slate-500">{rows.length} rows</span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          No phase history recorded yet.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="px-2 py-2 font-semibold">Cycle</th>
                <th className="px-2 py-2 font-semibold">Period</th>
                <th className="px-2 py-2 font-semibold">Member</th>
                <th className="px-2 py-2 font-semibold">Contributed</th>
                <th className="px-2 py-2 font-semibold">Bid</th>
                <th className="px-2 py-2 font-semibold">Claimed</th>
                <th className="px-2 py-2 font-semibold">Claim Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={`${row.cycle}-${row.period}-${row.member}`} className="border-b border-slate-100">
                  <td className="px-2 py-2">{row.cycle}</td>
                  <td className="px-2 py-2">{row.period}</td>
                  <td className="px-2 py-2 font-mono">{row.member}</td>
                  <td className="px-2 py-2">{row.contributed ? 'Yes' : 'No'}</td>
                  <td className="px-2 py-2">{row.bidAmount === '0' ? '-' : formatToken(row.bidAmount)}</td>
                  <td className="px-2 py-2">{row.claimed ? 'Yes' : 'No'}</td>
                  <td className="px-2 py-2">{row.claimAmount === '0' ? '-' : formatToken(row.claimAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
