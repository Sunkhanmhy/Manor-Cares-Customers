import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import { GlassCard } from '../../components/GlassCard';
import { SkeletonCard } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { formatDateTime } from '../../lib/format';
import type { AppNotification, NotificationType } from '../../types/database';

const ICONS: Record<NotificationType, string> = {
  booking_confirmed: '📅',
  cleaner_assigned: '🧑‍🔧',
  service_reminder: '⏰',
  booking_completed: '✅',
  payment_received: '💳',
  invoice_generated: '🧾',
  support_update: '🎧',
  promotional: '🎉',
};

export function NotificationsPage() {
  const { profile } = useAuth();
  const { refreshUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyUnread, setOnlyUnread] = useState(false);

  async function load() {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false });
    setNotifications((data as AppNotification[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  async function markAsRead(id: number) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    refreshUnreadCount();
  }

  async function markAllAsRead() {
    if (!profile) return;
    await supabase.from('notifications').update({ is_read: true }).eq('profile_id', profile.id).eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    refreshUnreadCount();
  }

  const visible = onlyUnread ? notifications.filter((n) => !n.is_read) : notifications;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 640 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label className="checkbox-row" style={{ alignItems: 'center' }}>
          <input type="checkbox" checked={onlyUnread} onChange={(e) => setOnlyUnread(e.target.checked)} />
          Show unread only
        </label>
        <button className="btn btn-ghost" onClick={markAllAsRead} style={{ fontSize: '0.78125rem' }}>
          Mark all as read
        </button>
      </div>

      {visible.length === 0 ? (
        <GlassCard style={{ padding: 10 }}>
          <EmptyState icon="🔔" title="No notifications" message="You're all caught up!" />
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map((n) => (
            <GlassCard
              key={n.id}
              style={{
                padding: 16,
                display: 'flex',
                gap: 12,
                cursor: n.is_read ? 'default' : 'pointer',
                borderLeft: n.is_read ? undefined : '3px solid var(--clr-blue)',
              }}
              onClick={() => !n.is_read && markAsRead(n.id)}
            >
              <span className="icon">{ICONS[n.type] ?? '🔔'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ fontSize: '0.84375rem' }}>{n.title}</strong>
                  {!n.is_read && <span className="badge badge-blue">New</span>}
                </div>
                <p style={{ fontSize: '0.78125rem', color: 'var(--text-muted)', marginTop: 4 }}>{n.message}</p>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 6 }}>{formatDateTime(n.created_at)}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
