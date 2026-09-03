import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import { GlassCard } from '../../components/GlassCard';
import { formatDateTime } from '../../lib/format';
import type { AppNotification, NotificationType } from '../../types/database';
import Icon from '../../components/Icon';
import { getNormalizedAuthEmail, resolveEmailScopedIdentity } from '../../lib/emailScopedIdentity';

const PAGE_SIZE = 15;
const ICONS: Record<NotificationType, string> = {
  booking_confirmed: 'calendar',
  cleaner_assigned: 'people',
  service_reminder: 'clock',
  booking_completed: 'check',
  payment_received: 'payments',
  invoice_generated: 'invoice',
  support_update: 'support',
  promotional: 'default',
};

export function NotificationsPage() {
  const { profile, user } = useAuth();
  const { refreshUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  async function load() {
    const identity = await resolveEmailScopedIdentity({
      email: getNormalizedAuthEmail(user?.email, profile?.email),
      fallbackProfileId: profile?.id ?? null,
    });

    if (!identity.profileId) return;

    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('profile_id', identity.profileId)
      .order('created_at', { ascending: false });
    setNotifications((data as AppNotification[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.email, user?.email]);

  useEffect(() => {
    if (!profile) return;

    const authEmail = getNormalizedAuthEmail(user?.email, profile?.email);
    if (!authEmail) return;

    let channelRef: ReturnType<typeof supabase.channel> | null = null;

    async function setup() {
      const identity = await resolveEmailScopedIdentity({
        email: authEmail,
        fallbackProfileId: profile?.id ?? null,
      });

      if (!identity.profileId) return;

      const channel = supabase
        .channel(`customer-notifications-${identity.profileId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `profile_id=eq.${identity.profileId}` },
          (payload) => {
            const incoming = payload.new as AppNotification | undefined;

            setNotifications((prev) => {
              if (payload.eventType === 'INSERT' && incoming) {
                return [incoming, ...prev.filter((item) => item.id !== incoming.id)];
              }
              if (payload.eventType === 'UPDATE' && incoming) {
                return prev.map((item) => (item.id === incoming.id ? { ...item, ...incoming } : item));
              }
              if (payload.eventType === 'DELETE') {
                return prev.filter((item) => item.id !== (payload.old as AppNotification).id);
              }
              return prev;
            });
          }
        )
        .subscribe();

      channelRef = channel;
    }

    void setup();

    return () => {
      if (channelRef) {
        void supabase.removeChannel(channelRef);
      }
    };
  }, [profile, profile?.email, user?.email]);

  async function markAsRead(id: number) {
    const identity = await resolveEmailScopedIdentity({
      email: getNormalizedAuthEmail(user?.email, profile?.email),
      fallbackProfileId: profile?.id ?? null,
    });
    if (!identity.profileId) return;

    await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('profile_id', identity.profileId);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    refreshUnreadCount();
  }

  async function markAllAsRead() {
    const identity = await resolveEmailScopedIdentity({
      email: getNormalizedAuthEmail(user?.email, profile?.email),
      fallbackProfileId: profile?.id ?? null,
    });
    if (!identity.profileId) return;

    await supabase.from('notifications').update({ is_read: true }).eq('profile_id', identity.profileId).eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    refreshUnreadCount();
  }

  const totalPages = Math.max(1, Math.ceil(notifications.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleNotifications = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return notifications.slice(start, start + PAGE_SIZE);
  }, [notifications, safePage]);

  useEffect(() => {
    setPage(1);
  }, [profile?.id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <GlassCard style={{ padding: 18 }} strong>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="notifications" size={18} />
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Account Activity</h3>
          </div>
          <button type="button" className="btn btn-ghost" style={{ padding: '7px 12px', fontSize: '0.75rem' }} onClick={() => void markAllAsRead()}>
            Mark all as read
          </button>
        </div>

        <div className="scroll-x">
          <table className="table-clean">
            <thead>
              <tr>
                <th>Type</th>
                <th>Title</th>
                <th>Message</th>
                <th>Received</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '18px 14px' }}>
                    Loading notifications…
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '18px 14px' }}>
                    No data available. Update your record, now!
                  </td>
                </tr>
              ) : (
                visibleNotifications.map((notification) => (
                  <tr key={notification.id} onClick={() => !notification.is_read && void markAsRead(notification.id)} style={{ cursor: notification.is_read ? 'default' : 'pointer' }}>
                    <td>
                      <span className="badge badge-blue">
                        <Icon name={ICONS[notification.type] ?? 'notifications'} size={12} />
                        {notification.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{notification.title}</td>
                    <td>{notification.message}</td>
                    <td>{formatDateTime(notification.created_at)}</td>
                    <td>
                      {notification.is_read ? <span className="badge badge-green">Read</span> : <span className="badge badge-amber">Unread</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          Page {safePage} of {totalPages}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-ghost" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Previous
          </button>
          <button type="button" className="btn btn-primary" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
