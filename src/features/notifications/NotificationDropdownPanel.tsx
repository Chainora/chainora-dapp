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
  onMarkAllRead: () => void;
  onNotificationClick: (notification: AppNotification) => void;
  onLoadMore: () => void;
};

export function NotificationDropdownPanel({
  isOpen,
  unreadCount,
  notifications,
  errorMessage,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  isMarkAllPending,
  onMarkAllRead,
  onNotificationClick,
  onLoadMore,
}: NotificationDropdownPanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,420px)] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">Notifications</p>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {unreadCount} unread
          </span>
          <button
            type="button"
            disabled={unreadCount <= 0 || isMarkAllPending}
            onClick={onMarkAllRead}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isMarkAllPending ? 'Updating...' : 'Mark all read'}
          </button>
        </div>
      </div>

      {errorMessage ? <p className="mb-2 rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700">{errorMessage}</p> : null}
      {isLoading ? <p className="py-3 text-sm text-slate-500">Loading notifications...</p> : null}

      {!isLoading && notifications.length === 0 ? (
        <p className="py-3 text-sm text-slate-500">No notifications yet.</p>
      ) : (
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {notifications.map(notification => (
            <button
              key={notification.id}
              type="button"
              onClick={() => {
                onNotificationClick(notification);
              }}
              className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                notification.isRead
                  ? 'border-slate-200 bg-slate-50/60'
                  : 'border-sky-200 bg-sky-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{notification.title}</p>
                  <p className="mt-1 text-sm text-slate-700">{notification.message}</p>
                </div>
                {!notification.isRead ? (
                  <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500" />
                ) : null}
              </div>
              <p className="mt-1 text-xs text-slate-500">{toRelativeTimeLabel(notification.createdAt)}</p>
            </button>
          ))}
        </div>
      )}

      {hasNextPage ? (
        <button
          type="button"
          disabled={isFetchingNextPage}
          onClick={onLoadMore}
          className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isFetchingNextPage ? 'Loading more...' : 'Load more'}
        </button>
      ) : null}
    </div>
  );
}
