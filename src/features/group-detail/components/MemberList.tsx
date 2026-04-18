import { MembersPanel } from '../../../components/group-detail/MembersPanel';
import type { MemberIdentityView } from '../../../components/group-detail/types';

export function MemberList({ members }: { members: MemberIdentityView[] }) {
  return <MembersPanel members={members} />;
}
