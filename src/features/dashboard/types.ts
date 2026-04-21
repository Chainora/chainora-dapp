export type DashboardMode = 'public' | 'joined';

export type DashboardIconName = 'active' | 'recruiting' | 'contribution' | 'group';

export type DashboardFetchReason =
  | 'initial'
  | 'filter_change'
  | 'poll'
  | 'manual'
  | 'resume_visible';
