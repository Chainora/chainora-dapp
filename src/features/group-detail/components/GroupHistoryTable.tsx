import type { ApiGroupViewHistoryRow } from '../../../services/groupsService';
import { formatToken } from '../utils';

export function GroupHistoryTable({ rows }: { rows: ApiGroupViewHistoryRow[] }) {
  return (
    <section className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="t-label">Phase History</h2>
        <span className="t-tiny c-3">{rows.length} rows</span>
      </div>

      {rows.length === 0 ? (
        <p
          className="t-tiny c-3 mt-3 px-3 py-2"
          style={{
            background: 'var(--ink-1)',
            border: '1px solid var(--ink-5)',
            borderRadius: 'var(--r-md)',
          }}
        >
          No phase history recorded yet.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="t-tiny min-w-full text-left c-2">
            <thead>
              <tr className="t-label" style={{ borderBottom: '1px solid var(--ink-5)' }}>
                <th className="px-2 py-2">Cycle</th>
                <th className="px-2 py-2">Period</th>
                <th className="px-2 py-2">Member</th>
                <th className="px-2 py-2">Contributed</th>
                <th className="px-2 py-2">Bid</th>
                <th className="px-2 py-2">Claimed</th>
                <th className="px-2 py-2">Claim Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr
                  key={`${row.cycle}-${row.period}-${row.member}`}
                  style={{ borderBottom: '1px solid var(--ink-5)' }}
                >
                  <td className="t-num px-2 py-2">{row.cycle}</td>
                  <td className="t-num px-2 py-2">{row.period}</td>
                  <td className="t-mono c-3 px-2 py-2">{row.member}</td>
                  <td className="px-2 py-2">{row.contributed ? 'Yes' : 'No'}</td>
                  <td className="t-mono px-2 py-2">{row.bidAmount === '0' ? '-' : formatToken(row.bidAmount)}</td>
                  <td className="px-2 py-2">{row.claimed ? 'Yes' : 'No'}</td>
                  <td className="t-mono px-2 py-2">{row.claimAmount === '0' ? '-' : formatToken(row.claimAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
