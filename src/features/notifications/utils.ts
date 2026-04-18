import type { InfiniteData } from '@tanstack/react-query';

import type {
  AppNotification,
  NotificationListResponse,
} from '../../services/notificationService';

export type NotificationTab = 'deposit';

export type NotificationNavigationTarget = {
  poolId: string;
  tab?: NotificationTab;
};

export const toRelativeTimeLabel = (value: string): string => {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }

  const deltaSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (deltaSeconds < 60) {
    return 'just now';
  }
  if (deltaSeconds < 3600) {
    return `${Math.floor(deltaSeconds / 60)}m ago`;
  }
  if (deltaSeconds < 86400) {
    return `${Math.floor(deltaSeconds / 3600)}h ago`;
  }
  return `${Math.floor(deltaSeconds / 86400)}d ago`;
};

const normalizeNotificationTab = (rawTab: string): NotificationTab | undefined => {
  const normalized = rawTab.trim().toLowerCase();
  if (normalized === 'deposit') {
    return 'deposit';
  }
  return undefined;
};

const parseGroupTargetFromActionUrl = (rawActionUrl: string): NotificationNavigationTarget | null => {
  const actionUrl = rawActionUrl.trim();
  if (!actionUrl) {
    return null;
  }

  let pathname = actionUrl;
  let tab: NotificationTab | undefined;
  try {
    const parsedUrl = new URL(actionUrl, 'https://chainora.local');
    pathname = parsedUrl.pathname;
    tab = normalizeNotificationTab(parsedUrl.searchParams.get('tab') ?? '');
  } catch {
    const queryIndex = actionUrl.indexOf('?');
    pathname = queryIndex >= 0 ? actionUrl.slice(0, queryIndex) : actionUrl;
    if (queryIndex >= 0 && queryIndex + 1 < actionUrl.length) {
      const searchParams = new URLSearchParams(actionUrl.slice(queryIndex + 1));
      tab = normalizeNotificationTab(searchParams.get('tab') ?? '');
    }
  }

  const match = pathname.match(/^\/groups?\/([^/?#]+)/i);
  const poolId = match?.[1]?.trim() ?? '';
  if (!poolId) {
    return null;
  }

  return {
    poolId,
    tab,
  };
};

export const resolveNavigationTarget = (notification: AppNotification): NotificationNavigationTarget | null => {
  const directPoolId = notification.groupId?.trim() ?? '';
  const fromActionUrl = parseGroupTargetFromActionUrl(notification.actionUrl?.trim() ?? '');
  const resolvedPoolId = directPoolId || fromActionUrl?.poolId || '';
  if (!resolvedPoolId) {
    return null;
  }

  const defaultTab = notification.type === 'FUNDING_REMINDER' ? 'deposit' : undefined;
  return {
    poolId: resolvedPoolId,
    tab: fromActionUrl?.tab ?? defaultTab,
  };
};

export const shouldTryTokenRefresh = (runnerError: unknown): boolean => {
  if (!(runnerError instanceof Error)) {
    return false;
  }
  return /\b401\b|\b403\b/.test(runnerError.message);
};

export const updateNotificationReadStatus = (
  previous: InfiniteData<NotificationListResponse, string> | undefined,
  notificationId: string,
): InfiniteData<NotificationListResponse, string> | undefined => {
  if (!previous) {
    return previous;
  }

  let changed = false;
  const pages = previous.pages.map(page => ({
    ...page,
    items: page.items.map(item => {
      if (item.id !== notificationId || item.isRead) {
        return item;
      }
      changed = true;
      return { ...item, isRead: true };
    }),
  }));

  if (!changed) {
    return previous;
  }

  return {
    ...previous,
    pages,
  };
};

export const markAllPagesRead = (
  previous: InfiniteData<NotificationListResponse, string> | undefined,
): InfiniteData<NotificationListResponse, string> | undefined => {
  if (!previous) {
    return previous;
  }

  let changed = false;
  const pages = previous.pages.map(page => ({
    ...page,
    items: page.items.map(item => {
      if (item.isRead) {
        return item;
      }
      changed = true;
      return { ...item, isRead: true };
    }),
  }));

  if (!changed) {
    return previous;
  }

  return {
    ...previous,
    pages,
  };
};
