import { createPortal } from 'react-dom';

import type { AppNotification } from '../../services/notificationService';
import { toRelativeTimeLabel } from './utils';

type NotificationDropdownPanelProps = {
  isOpen: boolean;
  unreadCount: number;
  notifications: AppNotification[];
  errorMessage: string;
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isMarkAllPending: boolean;
  isClearAllPending: boolean;
  anchorRect: DOMRect | null;
  onPanelMount?: (node: HTMLDivElement | null) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onNotificationClick: (notification: AppNotification) => void;
  onLoadMore: () => void;
};

const panelStyle = {
  background: 'var(--ink-2)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-xl)',
  boxShadow: 'var(--shadow-lg)',
} as const;

const readRowStyle = {
  background: 'var(--ink-1)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-md)',
} as const;

const unreadRowStyle = {
  background: 'rgba(40,151,255,0.08)',
  border: '1px solid rgba(40,151,255,0.4)',
  borderRadius: 'var(--r-md)',
} as const;

export function NotificationDropdownPanel({
  isOpen,
  unreadCount,
  notifications,
  errorMessage,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  isMarkAllPending,
  isClearAllPending,
  anchorRect,
  onPanelMount,
  onMarkAllRead,
  onClearAll,
  onNotificationClick,
  onLoadMore,
}: NotificationDropdownPanelProps) {
  if (!isOpen || !anchorRect || typeof document === 'undefined' || typeof window === 'undefined') {
    return null;
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const horizontalGutter = 8;
  const panelMaxWidth = 420;
  const panelWidth = Math.min(viewportWidth * 0.92, panelMaxWidth);
  const idealLeft = anchorRect.right - panelWidth;
  const left = Math.max(
    horizontalGutter,
    Math.min(idealLeft, viewportWidth - panelWidth - horizontalGutter),
  );
  const top = Math.min(
    anchorRect.bottom + 8,
    viewportHeight - horizontalGutter,
  );

  return createPortal(
    <div
      ref={onPanelMount}
      style={{ top, left, ...panelStyle }}
      className="fixed z-[120] w-[min(92vw,420px)] p-3"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="t-small c-1 font-semibold">Notifications</p>
        <div className="flex items-center gap-2">
          <span className="chip">
            {unreadCount} unread
          </span>
          <button
            type="button"
            disabled={notifications.length <= 0 || isClearAllPending}
            onClick={onClearAll}
            className="t-tiny rounded-[var(--r-sm)] px-2 py-1 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: 'var(--risk-bg)',
              color: 'var(--risk-300)',
              border: '1px solid rgba(239,68,68,0.4)',
            }}
          >
            {isClearAllPending ? 'Clearing...' : 'Clear all'}
          </button>
          <button
            type="button"
            disabled={unreadCount <= 0 || isMarkAllPending}
            onClick={onMarkAllRead}
            className="t-tiny rounded-[var(--r-sm)] px-2 py-1 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: 'var(--ink-3)',
              color: 'var(--haze-2)',
              border: '1px solid var(--ink-5)',
            }}
          >
            {isMarkAllPending ? 'Updating...' : 'Mark all read'}
          </button>
        </div>
      </div>

      {errorMessage ? (
        <p
          className="t-tiny mb-2 px-2 py-1"
          style={{
            background: 'var(--risk-bg)',
            color: 'var(--risk-300)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 'var(--r-sm)',
          }}
        >
          {errorMessage}
        </p>
      ) : null}
      {isLoading ? <p className="t-small c-3 py-3">Loading notifications...</p> : null}

      {!isLoading && notifications.length === 0 ? (
        <p className="t-small c-3 py-3">No notifications yet.</p>
      ) : (
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {notifications.map(notification => (
            <button
              key={notification.id}
              type="button"
              onClick={() => {
                onNotificationClick(notification);
              }}
              className="w-full px-3 py-2 text-left transition"
              style={notification.isRead ? readRowStyle : unreadRowStyle}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="t-small c-1 truncate font-semibold">{notification.title}</p>
                  <p className="t-small c-2 mt-1">{notification.message}</p>
                </div>
                {!notification.isRead ? (
                  <span
                    className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: 'var(--signal-400)' }}
                  />
                ) : null}
              </div>
              <p className="t-tiny c-3 mt-1">{toRelativeTimeLabel(notification.createdAt)}</p>
            </button>
          ))}
        </div>
      )}

      {hasNextPage ? (
        <button
          type="button"
          disabled={isFetchingNextPage}
          onClick={onLoadMore}
          className="t-tiny mt-3 w-full px-3 py-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: 'var(--ink-3)',
            color: 'var(--haze-2)',
            border: '1px solid var(--ink-5)',
            borderRadius: 'var(--r-sm)',
          }}
        >
          {isFetchingNextPage ? 'Loading more...' : 'Load more'}
        </button>
      ) : null}
    </div>,
    document.body,
  );
}
