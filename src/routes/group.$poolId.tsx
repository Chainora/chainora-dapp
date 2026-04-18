import { createFileRoute } from '@tanstack/react-router';

import { GroupDetailPage } from '../pages/group-detail';

type GroupDetailSearch = {
  tab?: 'deposit';
};

export const Route = createFileRoute('/group/$poolId')({
  validateSearch: (search: Record<string, unknown>): GroupDetailSearch => {
    const rawTab = typeof search.tab === 'string' ? search.tab.trim().toLowerCase() : '';
    if (rawTab === 'deposit') {
      return { tab: 'deposit' };
    }
    return {};
  },
  component: GroupDetailRoute,
});

function GroupDetailRoute() {
  const { poolId } = Route.useParams();
  return <GroupDetailPage poolId={poolId} />;
}
