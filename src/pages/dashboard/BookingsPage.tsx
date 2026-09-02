import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../lib/toast';
import { GlassCard } from '../../components/GlassCard';
import { SkeletonCard } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { formatCurrency, formatDate, formatTime } from '../../lib/format';
import type { Booking, BookingStatus } from '../../types/database';

const FILTERS: Array<{ label: string; value: BookingStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

export function BookingsPage() {
  const { customerProfile } = useAuth();
  const toast = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all');
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);

  async function load() {
    if (!customerProfile) return;
    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select('*, cleaning_services(*)')
      .eq('customer_id', customerProfile.id)
      .order('booking_date', { ascending: false });
    setBookings((data as Booking[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerProfile]);

  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.booking_status === filter);

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const { error } = await supabase.from('bookings').update({ booking_status: 'cancelled' }).eq('id', cancelTarget.id);
      if (error) throw error;
      toast.success('Booking cancelled.');
      setCancelTarget(null);
      load();
    } catch {
      toast.error('We could not cancel this booking.');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`btn ${filter === f.value ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '7px 14px', fontSize: '0.78125rem' }}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Link to="/dashboard/book" className="btn btn-primary">
          + New Booking
        </Link>
      </div>

      {loading ? (
        <div className="card-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard style={{ padding: 10 }}>
          <EmptyState icon="📅" title="No bookings found" message="Book your first cleaning service to see it listed here." />
        </GlassCard>
      ) : (
        <div className="card-grid">
          {filtered.map((booking) => (
            <GlassCard key={booking.id} style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{booking.booking_number}</p>
                  <h3 style={{ fontSize: '0.9375rem' }}>{booking.cleaning_services?.name}</h3>
                </div>
                <StatusBadge status={booking.booking_status} kind="booking" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                <span><span className="icon">📅</span> {formatDate(booking.booking_date)} · {formatTime(booking.booking_time)}</span>
                <span><span className="icon">📍</span> {booking.property_address}</span>
                <span><span className="icon">👥</span> {booking.assigned_staff ?? 'Not yet assigned'}</span>
                <span><span className="icon">💰</span> {formatCurrency(booking.final_price ?? booking.estimated_price)}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusBadge status={booking.payment_status} kind="payment" />
                {['pending', 'confirmed'].includes(booking.booking_status) && (
                  <button
                    className="btn btn-danger"
                    style={{ padding: '7px 12px', fontSize: '0.78125rem', marginLeft: 'auto' }}
                    onClick={() => setCancelTarget(booking)}
                  >
                    Cancel
                  </button>
                )}
              </div>
              {booking.special_instructions && (
                <p style={{ fontSize: '0.78125rem', color: 'var(--text-muted)', marginTop: 10, fontStyle: 'italic' }}>
                  “{booking.special_instructions}”
                </p>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel Booking"
        message={`Are you sure you want to cancel booking ${cancelTarget?.booking_number}?`}
        confirmLabel="Cancel Booking"
        danger
        busy={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
