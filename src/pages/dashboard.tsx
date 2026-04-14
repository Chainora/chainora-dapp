import { Navigate } from '@tanstack/react-router';

import { UserDetail } from '../components/UserDetail';
import { useAuth } from '../context/AuthContext';
type GroupCard = {
  title: string;
  description: string;
  amount: string;
  members: string;
  cadence: string;
  round: string;
  progress: number;
  pool: string;
  tag: 'Recruiting' | 'Active';
};

const GROUPS: GroupCard[] = [
  {
    title: 'iUSDT Savings Circle - April',
    description: 'A beginner-friendly ROSCA group for monthly savings.',
    amount: '50 iUSDT',
    members: '8 members',
    cadence: 'Every 7 days',
    round: 'Round 1/8',
    progress: 13,
    pool: '0 iUSDT',
    tag: 'Recruiting',
  },
  {
    title: 'Community Fund - Q2',
    description: 'Trusted neighborhood savings with transparent payouts.',
    amount: '200 iUSDT',
    members: '10 members',
    cadence: 'Every 14 days',
    round: 'Round 1/10',
    progress: 10,
    pool: '0 iUSDT',
    tag: 'Recruiting',
  },
  {
    title: 'Elite Ring - Monthly',
    description: 'High-trust monthly ROSCA with predictable contribution cycles.',
    amount: '500 iUSDT',
    members: '12 members',
    cadence: 'Every 30 days',
    round: 'Round 1/12',
    progress: 8,
    pool: '0 iUSDT',
    tag: 'Recruiting',
  },
  {
    title: 'Gold Circle - Monthly',
    description: 'Premium group for verified members only.',
    amount: '1,000 iUSDT',
    members: '6 members',
    cadence: 'Every 30 days',
    round: 'Round 2/6',
    progress: 33,
    pool: '4,000 iUSDT',
    tag: 'Active',
  },
  {
    title: 'Hui Group 04 - Recruiting',
    description: 'Small five-member ROSCA group currently onboarding members.',
    amount: '100 iUSDT',
    members: '5 members',
    cadence: 'Every 30 days',
    round: 'Round 1/5',
    progress: 20,
    pool: '0 iUSDT',
    tag: 'Recruiting',
  },
  {
    title: 'Friends Circle - Quarter 2',
    description: 'Six members, one completed cycle, currently in cycle two.',
    amount: '200 iUSDT',
    members: '6 members',
    cadence: 'Every 30 days',
    round: 'Round 2/6',
    progress: 33,
    pool: '1,200 iUSDT',
    tag: 'Active',
  },
];

export function DashboardPage() {
  const { username, address, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <section className="mx-auto max-w-6xl space-y-7">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Account</p>
        <div className="mt-2">
          <UserDetail username={username} address={address} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Active Groups</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">0</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Total Contributed</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">0 iUSDT</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Recruiting</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">4</p>
        </article>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-slate-900">Savings Groups</h1>
        <button
          type="button"
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          + Create Group
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">Search groups...</div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1">
          <button type="button" className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-900">
            All
          </button>
          <button type="button" className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-50">
            Mine
          </button>
          <button type="button" className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-50">
            Recruiting
          </button>
        </div>
        <button type="button" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
          Filter
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {GROUPS.map(group => (
          <article key={group.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-bold text-slate-900">{group.title}</h3>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  group.tag === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {group.tag}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-500">{group.description}</p>

            <div className="mt-4 grid grid-cols-2 gap-y-2 text-sm text-slate-700">
              <p>{group.amount}</p>
              <p>{group.members}</p>
              <p>{group.cadence}</p>
              <p>{group.round}</p>
            </div>

            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-sm text-slate-500">
                <span>Progress</span>
                <span>{group.progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${group.progress}%` }} />
              </div>
            </div>

            <div className="mt-4 text-sm font-semibold text-slate-700">Pool: {group.pool}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
