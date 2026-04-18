import { chainoraApiBase } from '../configs/api';

export type NotificationType = 'FUNDING_REMINDER' | 'GROUP_INVITE' | string;

export type AppNotification = {
  id: string;
  userAddress: string;
  type: NotificationType;
  title: string;
  message: string;
  groupId: string;
  actionUrl: string;
  isRead: boolean;
  createdAt: string;
};

export type NotificationListResponse = {
  items: AppNotification[];
  nextCursor?: string;
};

export type NotificationReadAllResponse = {
  updatedCount: number;
};

type Envelope<T> = T | { success?: boolean; data?: T };

const normalizeEnvelope = <T,>(raw: Envelope<T>): T => {
  if (raw && typeof raw === 'object' && 'data' in raw && (raw as { data?: T }).data) {
    return (raw as { data: T }).data;
  }
  return raw as T;
};

const withAccessToken = (accessToken: string, init?: RequestInit): RequestInit => ({
  ...init,
  headers: {
    ...(init?.headers ?? {}),
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
});

export const fetchNotifications = async (
  accessToken: string,
  options?: {
    limit?: number;
    cursor?: string;
  },
): Promise<NotificationListResponse> => {
  const limit = options?.limit ?? 50;
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (options?.cursor?.trim()) {
    params.set('cursor', options.cursor.trim());
  }

  const response = await fetch(
    `${chainoraApiBase}/v1/notifications?${params.toString()}`,
    withAccessToken(accessToken, { method: 'GET' }),
  );

  if (!response.ok) {
    throw new Error(`Load notifications failed: ${response.status}`);
  }

  const raw = (await response.json()) as Envelope<NotificationListResponse | AppNotification[]>;
  const data = normalizeEnvelope(raw);
  if (Array.isArray(data)) {
    return {
      items: data,
      nextCursor: '',
    };
  }
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    nextCursor: typeof data?.nextCursor === 'string' ? data.nextCursor : '',
  };
};

export const fetchUnreadNotificationCount = async (accessToken: string): Promise<number> => {
  const response = await fetch(
    `${chainoraApiBase}/v1/notifications/unread-count`,
    withAccessToken(accessToken, { method: 'GET' }),
  );

  if (!response.ok) {
    throw new Error(`Load unread notifications failed: ${response.status}`);
  }

  const raw = (await response.json()) as Envelope<{ count?: number }>;
  const data = normalizeEnvelope(raw);
  return Number(data?.count ?? 0);
};

export const markNotificationAsRead = async (
  accessToken: string,
  notificationId: string,
): Promise<AppNotification> => {
  const response = await fetch(
    `${chainoraApiBase}/v1/notifications/${encodeURIComponent(notificationId)}/read`,
    withAccessToken(accessToken, { method: 'PATCH' }),
  );

  if (!response.ok) {
    throw new Error(`Mark notification as read failed: ${response.status}`);
  }

  const raw = (await response.json()) as Envelope<AppNotification>;
  return normalizeEnvelope(raw);
};

export const markAllNotificationsAsRead = async (accessToken: string): Promise<NotificationReadAllResponse> => {
  const response = await fetch(
    `${chainoraApiBase}/v1/notifications/read-all`,
    withAccessToken(accessToken, { method: 'PATCH' }),
  );

  if (!response.ok) {
    throw new Error(`Mark all notifications as read failed: ${response.status}`);
  }

  const raw = (await response.json()) as Envelope<NotificationReadAllResponse>;
  const data = normalizeEnvelope(raw);
  return {
    updatedCount: Number(data?.updatedCount ?? 0),
  };
};
