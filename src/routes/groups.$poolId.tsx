import { Navigate, createFileRoute } from '@tanstack/react-router';

type LegacyGroupSearch = {
  tab?: 'deposit';
};

export const Route = createFileRoute('/groups/$poolId')({
  validateSearch: (search: Record<string, unknown>): LegacyGroupSearch => {
    const rawTab = typeof search.tab === 'string' ? search.tab.trim().toLowerCase() : '';
    if (rawTab === 'deposit') {
      return { tab: 'deposit' };
    }
    return {};
  },
  component: LegacyGroupRedirect,
});

function LegacyGroupRedirect() {
  const { poolId } = Route.useParams();
  const { tab } = Route.useSearch();

  return (
    <Navigate
      to="/group/$poolId"
      params={{ poolId }}
      search={tab ? { tab } : {}}
      replace
    />
  );
}
