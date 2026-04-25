import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { useAuth } from '../../context/AuthContext';
import {
  clearAllNotifications,
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationListResponse,
} from '../../services/notificationService';
import { NotificationDropdownPanel } from '../../features/notifications/NotificationDropdownPanel';
import {
  markAllPagesRead,
  resolveNavigationTarget,
  shouldTryTokenRefresh,
  updateNotificationReadStatus,
} from '../../features/notifications/utils';

const NOTIFICATION_POLL_INTERVAL_MS = 10_000;
const NOTIFICATION_PAGE_SIZE = 20;

export function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    isAuthenticated,
    token,
    refreshSession,
    address,
    logout,
  } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const triggerWrapRef = useRef<HTMLDivElement | null>(null);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const [floatingPanelNode, setFloatingPanelNode] = useState<HTMLDivElement | null>(null);
  const [panelAnchorRect, setPanelAnchorRect] = useState<DOMRect | null>(null);
  const tokenRef = useRef(token);
  const refreshSessionRef = useRef(refreshSession);
  const logoutRef = useRef(logout);
  const previousUnreadCountRef = useRef<number | null>(null);
  const prefetchingRef = useRef(false);
  const viewerAddress = address.trim().toLowerCase();
  const notificationUnreadCountKey = useMemo(
    () => ['notifications', 'unread-count', viewerAddress] as const,
    [viewerAddress],
  );
  const notificationListKey = useMemo(
    () => ['notifications', 'list', viewerAddress] as const,
    [viewerAddress],
  );

  const updatePanelAnchor = useCallback(() => {
    const triggerRect = triggerButtonRef.current?.getBoundingClientRect() ?? null;
    setPanelAnchorRect(triggerRect);
  }, []);

  useEffect(() => {
    tokenRef.current = token;
    refreshSessionRef.current = refreshSession;
    logoutRef.current = logout;
  }, [logout, refreshSession, token]);

  const withTokenRefresh = useCallback(async <T,>(runner: (accessToken: string) => Promise<T>): Promise<T> => {
    const currentToken = tokenRef.current.trim();
    if (!currentToken) {
      throw new Error('No access token');
    }

    try {
      return await runner(currentToken);
    } catch (runnerError) {
      if (!shouldTryTokenRefresh(runnerError)) {
        throw runnerError;
      }
      let nextToken = '';
      try {
        nextToken = await refreshSessionRef.current();
      } catch {
        logoutRef.current();
        throw new Error('Session expired. Please login again.');
      }
      if (!nextToken.trim()) {
        logoutRef.current();
        throw new Error('Session expired. Please login again.');
      }
      tokenRef.current = nextToken;
      return runner(nextToken);
    }
  }, []);

  const fetchNotificationPage = useCallback(async (cursor = ''): Promise<NotificationListResponse> => {
    return withTokenRefresh(nextToken => fetchNotifications(nextToken, {
      limit: NOTIFICATION_PAGE_SIZE,
      cursor: cursor || undefined,
    }));
  }, [withTokenRefresh]);

  const prefetchFirstPage = useCallback(async () => {
    if (!isAuthenticated || prefetchingRef.current) {
      return;
    }
    prefetchingRef.current = true;
    try {
      await queryClient.fetchInfiniteQuery({
        queryKey: notificationListKey,
        initialPageParam: '',
        queryFn: ({ pageParam }) => fetchNotificationPage(typeof pageParam === 'string' ? pageParam : ''),
        getNextPageParam: (page: NotificationListResponse) => page.nextCursor?.trim() || undefined,
      });
    } finally {
      prefetchingRef.current = false;
    }
  }, [fetchNotificationPage, isAuthenticated, queryClient]);

  const unreadCountQuery = useQuery({
    queryKey: notificationUnreadCountKey,
    enabled: isAuthenticated,
    queryFn: () => withTokenRefresh(nextToken => fetchUnreadNotificationCount(nextToken)),
    staleTime: 3_000,
    refetchInterval: () => {
      if (typeof document !== 'undefined' && document.hidden) {
        return false;
      }
      return NOTIFICATION_POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: false,
    retry: 1,
  });

  const notificationsQuery = useInfiniteQuery({
    queryKey: notificationListKey,
    enabled: isAuthenticated && isOpen,
    initialPageParam: '',
    queryFn: ({ pageParam }) => fetchNotificationPage(typeof pageParam === 'string' ? pageParam : ''),
    getNextPageParam: (page: NotificationListResponse) => page.nextCursor?.trim() || undefined,
    staleTime: 8_000,
    retry: 1,
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return withTokenRefresh(nextToken => markNotificationAsRead(nextToken, notificationId));
    },
    onSuccess: (updatedItem, notificationId) => {
      queryClient.setQueryData<InfiniteData<NotificationListResponse, string> | undefined>(
        notificationListKey,
        previous => updateNotificationReadStatus(previous, notificationId),
      );
      if (!updatedItem.isRead) {
        return;
      }
      queryClient.setQueryData<number | undefined>(
        notificationUnreadCountKey,
        previous => Math.max(0, Number(previous ?? 0) - 1),
      );
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => withTokenRefresh(nextToken => markAllNotificationsAsRead(nextToken)),
    onSuccess: () => {
      queryClient.setQueryData<InfiniteData<NotificationListResponse, string> | undefined>(
        notificationListKey,
        previous => markAllPagesRead(previous),
      );
      queryClient.setQueryData<number>(notificationUnreadCountKey, 0);
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => withTokenRefresh(nextToken => clearAllNotifications(nextToken)),
    onSuccess: () => {
      queryClient.setQueryData<InfiniteData<NotificationListResponse, string>>(
        notificationListKey,
        {
          pages: [{ items: [], nextCursor: '' }],
          pageParams: [''],
        },
      );
      queryClient.setQueryData<number>(notificationUnreadCountKey, 0);
    },
  });

  useEffect(() => {
    if (!isAuthenticated) {
      previousUnreadCountRef.current = null;
      return;
    }

    const currentUnreadCount = Number(unreadCountQuery.data ?? 0);
    const previousUnreadCount = previousUnreadCountRef.current;
    previousUnreadCountRef.current = currentUnreadCount;

    if (previousUnreadCount === null || previousUnreadCount === currentUnreadCount) {
      return;
    }

    if (isOpen) {
      void queryClient.invalidateQueries({ queryKey: notificationListKey });
      return;
    }

    void prefetchFirstPage();
  }, [
    isAuthenticated,
    isOpen,
    notificationListKey,
    prefetchFirstPage,
    queryClient,
    unreadCountQuery.data,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePanelAnchor();
    const onViewportChange = () => {
      updatePanelAnchor();
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      const insideTrigger = Boolean(triggerWrapRef.current?.contains(target));
      const insidePanel = Boolean(floatingPanelNode?.contains(target));
      if (!insideTrigger && !insidePanel) {
        setIsOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onEscape);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onEscape);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [floatingPanelNode, isOpen, updatePanelAnchor]);

  const unreadCount = Number(unreadCountQuery.data ?? 0);
  const notifications = useMemo(() => (
    notificationsQuery.data?.pages.flatMap(page => page.items) ?? []
  ), [notificationsQuery.data]);

  const errorMessage = useMemo(() => {
    if (unreadCountQuery.error instanceof Error) {
      return unreadCountQuery.error.message;
    }
    if (notificationsQuery.error instanceof Error) {
      return notificationsQuery.error.message;
    }
    if (markReadMutation.error instanceof Error) {
      return markReadMutation.error.message;
    }
    if (markAllReadMutation.error instanceof Error) {
      return markAllReadMutation.error.message;
    }
    if (clearAllMutation.error instanceof Error) {
      return clearAllMutation.error.message;
    }
    return '';
  }, [
    clearAllMutation.error,
    markAllReadMutation.error,
    markReadMutation.error,
    notificationsQuery.error,
    unreadCountQuery.error,
  ]);

  const unreadBadge = useMemo(() => {
    if (unreadCount <= 0) {
      return null;
    }

    const label = unreadCount > 99 ? '99+' : String(unreadCount);
    return (
      <span
        className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
        style={{ background: 'var(--risk-500)' }}
      >
        {label}
      </span>
    );
  }, [unreadCount]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative" ref={triggerWrapRef}>
      <button
        ref={triggerButtonRef}
        type="button"
        onClick={() => {
          setIsOpen(previous => !previous);
          if (!isOpen) {
            void prefetchFirstPage();
          }
        }}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full transition"
        style={{
          background: 'var(--ink-2)',
          border: '1px solid var(--ink-5)',
          color: 'var(--haze-2)',
        }}
        onMouseEnter={event => {
          event.currentTarget.style.background = 'var(--ink-3)';
          event.currentTarget.style.color = 'var(--haze-1)';
          event.currentTarget.style.borderColor = 'rgba(40,151,255,0.4)';
        }}
        onMouseLeave={event => {
          event.currentTarget.style.background = 'var(--ink-2)';
          event.currentTarget.style.color = 'var(--haze-2)';
          event.currentTarget.style.borderColor = 'var(--ink-5)';
        }}
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9 17a3 3 0 0 0 6 0" />
        </svg>
        {unreadBadge}
      </button>

      <NotificationDropdownPanel
        isOpen={isOpen}
        unreadCount={unreadCount}
        notifications={notifications}
        errorMessage={errorMessage}
        isLoading={notificationsQuery.isLoading}
        hasNextPage={Boolean(notificationsQuery.hasNextPage)}
        isFetchingNextPage={notificationsQuery.isFetchingNextPage}
        isMarkAllPending={markAllReadMutation.isPending}
        isClearAllPending={clearAllMutation.isPending}
        anchorRect={panelAnchorRect}
        onPanelMount={setFloatingPanelNode}
        onMarkAllRead={() => {
          void markAllReadMutation.mutateAsync();
        }}
        onClearAll={() => {
          void clearAllMutation.mutateAsync();
        }}
        onNotificationClick={notification => {
          void (async () => {
            if (!notification.isRead) {
              try {
                await markReadMutation.mutateAsync(notification.id);
              } catch {
                // Keep navigation responsive even when mark-read fails.
              }
            }

            setIsOpen(false);
            const navigationTarget = resolveNavigationTarget(notification);
            if (navigationTarget) {
              void navigate({
                to: '/group/$poolId',
                params: { poolId: navigationTarget.poolId },
                search: navigationTarget.tab ? { tab: navigationTarget.tab } : {},
              });
              return;
            }

            const target = notification.actionUrl?.trim() ?? '';
            if (/^https?:\/\//i.test(target)) {
              window.location.assign(target);
            }
          })();
        }}
        onLoadMore={() => {
          void notificationsQuery.fetchNextPage();
        }}
      />
    </div>
  );
}
