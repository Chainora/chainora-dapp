import { useMemo } from 'react';

import {
  resolveUserActionAvailability,
  type GroupStatus,
  type UserActionAvailability,
} from '../../../services/groupStatus';

type UseUserActionsParams = {
  groupStatus: GroupStatus;
  isViewerMember: boolean;
  isViewerActiveMember: boolean;
  isPublicRecruitment: boolean;
  hasOpenJoinRequest: boolean;
};

export type UseUserActionsResult = {
  availability: UserActionAvailability;
  canRequestJoin: boolean;
  requestJoinDisabledReason: string;
};

export const useUserActions = (params: UseUserActionsParams): UseUserActionsResult => {
  return useMemo(() => {
    const availability = resolveUserActionAvailability({
      groupStatus: params.groupStatus,
      isViewerMember: params.isViewerMember,
      isViewerActiveMember: params.isViewerActiveMember,
      isPublicRecruitment: params.isPublicRecruitment,
    });

    const canRequestJoin = availability.canRequestJoin && !params.hasOpenJoinRequest;
    let requestJoinDisabledReason = '';

    if (params.hasOpenJoinRequest) {
      requestJoinDisabledReason = 'You already submitted a join request. Wait for member votes before retrying.';
    } else if (!params.isPublicRecruitment) {
      requestJoinDisabledReason = 'This group is private. Members vote via invite proposals.';
    } else if (params.groupStatus !== 'forming') {
      requestJoinDisabledReason = 'Join requests are only available while the group is forming.';
    }

    return {
      availability,
      canRequestJoin,
      requestJoinDisabledReason,
    };
  }, [
    params.groupStatus,
    params.hasOpenJoinRequest,
    params.isPublicRecruitment,
    params.isViewerActiveMember,
    params.isViewerMember,
  ]);
};
