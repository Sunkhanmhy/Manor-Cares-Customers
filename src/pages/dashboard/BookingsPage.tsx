import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../lib/toast';
import { GlassCard } from '../../components/GlassCard';
import Icon from '../../components/Icon';
import { formatDate, formatTime } from '../../lib/format';
import { getNormalizedAuthEmail, resolveEmailScopedIdentity } from '../../lib/emailScopedIdentity';
import type { Booking, BookingStatus } from '../../types/database';

const FILTERS: Array<{ label: string; value: BookingStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const PRIVATE_TYPES = new Set(['apartment', 'house', 'airbnb']);
const PUBLIC_TYPES = new Set(['office', 'other']);

export function BookingsPage() {
  const { customerProfile, profile, user } = useAuth();
  const toast = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<Record<number, boolean>>({});
  const [actionBusy, setActionBusy] = useState<'cancel' | 'delete' | 'rebook' | null>(null);

  async function load() {
    const identity = await resolveEmailScopedIdentity({
      email: getNormalizedAuthEmail(user?.email, profile?.email),
      fallbackProfileId: profile?.id ?? null,
      fallbackCustomerId: customerProfile?.id ?? null,
    });

    if (!identity.customerId) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('customer_id', identity.customerId)
      .order('created_at', { ascending: false });
    setBookings((data as Booking[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerProfile?.id, profile?.id, profile?.email, user?.email]);

  const rowsByType = useMemo(() => {
    const privateBookings = bookings.filter((booking) => PRIVATE_TYPES.has(booking.property_type));
    const publicBookings = bookings.filter((booking) => PUBLIC_TYPES.has(booking.property_type));

    const applyFilter = (items: Booking[]) =>
      filter === 'all' ? items : items.filter((item) => item.booking_status === filter);

    return {
      privateBookings: applyFilter(privateBookings),
      publicBookings: applyFilter(publicBookings),
    };
  }, [bookings, filter]);

  const allSelected =
    rowsByType.privateBookings.length + rowsByType.publicBookings.length > 0 &&
    [...rowsByType.privateBookings, ...rowsByType.publicBookings].every((booking) => selectedIds[booking.id]);

  function toggleSelected(id: number) {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleSelectAll() {
    const visibleIds = [...rowsByType.privateBookings, ...rowsByType.publicBookings].map((booking) => booking.id);
    if (!visibleIds.length) return;

    const next = visibleIds.reduce<Record<number, boolean>>((acc, id) => {
      acc[id] = !allSelected;
      return acc;
    }, {});

    setSelectedIds((prev) => ({ ...prev, ...next }));
  }

  async function updateBookingStatus(ids: number[], nextStatus: BookingStatus | 'deleted') {
    if (!ids.length) return;

    const identity = await resolveEmailScopedIdentity({
      email: getNormalizedAuthEmail(user?.email, profile?.email),
      fallbackProfileId: profile?.id ?? null,
      fallbackCustomerId: customerProfile?.id ?? null,
    });

    if (!identity.customerId) {
      toast.error('Your account is not ready yet. Please refresh and try again.');
      return;
    }

    setActionBusy(nextStatus === 'deleted' ? 'delete' : nextStatus === 'cancelled' ? 'cancel' : 'rebook');

    try {
      if (nextStatus === 'deleted') {
        const { error } = await supabase.from('bookings').delete().in('id', ids).eq('customer_id', identity.customerId);
        if (error) throw error;
        toast.success('Selected bookings deleted.');
      } else {
        const { error } = await supabase.from('bookings').update({ booking_status: nextStatus }).in('id', ids).eq('customer_id', identity.customerId);
        if (error) throw error;
        toast.success(nextStatus === 'cancelled' ? 'Selected bookings cancelled.' : 'Selected bookings rebooked.');
      }

      setSelectedIds({});
      await load();
    } catch {
      toast.error('We could not update the selected bookings.');
    } finally {
      setActionBusy(null);
    }
  }

  async function handleRowAction(id: number, action: 'cancel' | 'delete' | 'rebook') {
    const identity = await resolveEmailScopedIdentity({
      email: getNormalizedAuthEmail(user?.email, profile?.email),
      fallbackProfileId: profile?.id ?? null,
      fallbackCustomerId: customerProfile?.id ?? null,
    });

    if (!identity.customerId) {
      toast.error('Your account is not ready yet. Please refresh and try again.');
      return;
    }

    const target = bookings.find((booking) => booking.id === id);
    if (!target) return;

    try {
      if (action === 'delete') {
        const { error } = await supabase.from('bookings').delete().eq('id', id).eq('customer_id', identity.customerId);
        if (error) throw error;
        toast.success('Booking deleted.');
      } else if (action === 'cancel') {
        const { error } = await supabase.from('bookings').update({ booking_status: 'cancelled' }).eq('id', id).eq('customer_id', identity.customerId);
        if (error) throw error;
        toast.success('Booking cancelled.');
      } else {
        const { error } = await supabase.from('bookings').update({ booking_status: 'pending' }).eq('id', id).eq('customer_id', identity.customerId);
        if (error) throw error;
        toast.success('Booking rebooked and moved back to pending.');
      }

      await load();
    } catch {
      toast.error('We could not complete that booking action.');
    }
  }

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;

  function renderTable(title: string, sectionBookings: Booking[], isPrivate: boolean) {
    const visibleSelectedCount = sectionBookings.filter((booking) => selectedIds[booking.id]).length;

    return (
      <GlassCard style={{ padding: 18, minHeight: 240 }} strong>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name={isPrivate ? 'home' : 'office'} size={18} color={isPrivate ? '#60a5fa' : '#2dd4bf'} vector />
            <h3 style={{ margin: 0, fontSize: '1rem' }}>{title}</h3>
          </div>
          {sectionBookings.length > 0 && (
            <span className="badge badge-gray">{visibleSelectedCount} selected</span>
          )}
        </div>

        {sectionBookings.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '7px 12px', fontSize: '0.75rem' }}
              onClick={() => updateBookingStatus(sectionBookings.map((booking) => booking.id), 'cancelled')}
              disabled={actionBusy !== null || !visibleSelectedCount}
            >
              {actionBusy === 'cancel' ? 'Cancelling…' : 'Cancel Selected'}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              style={{ padding: '7px 12px', fontSize: '0.75rem' }}
              onClick={() => updateBookingStatus(sectionBookings.map((booking) => booking.id), 'deleted')}
              disabled={actionBusy !== null || !visibleSelectedCount}
            >
              {actionBusy === 'delete' ? 'Deleting…' : 'Delete Selected'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '7px 12px', fontSize: '0.75rem' }}
              onClick={() => updateBookingStatus(sectionBookings.map((booking) => booking.id), 'pending')}
              disabled={actionBusy !== null || !visibleSelectedCount}
            >
              {actionBusy === 'rebook' ? 'Rebooking…' : 'Rebook Selected'}
            </button>
          </div>
        )}

        <div className="scroll-x">
          <table className="table-clean">
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <input
                    type="checkbox"
                    checked={sectionBookings.length > 0 && sectionBookings.every((booking) => selectedIds[booking.id])}
                    onChange={toggleSelectAll}
                    aria-label={`Select all ${title.toLowerCase()} bookings`}
                  />
                </th>
                <th>S/No.</th>
                <th>Property Description</th>
                <th>Date Created</th>
                <th>Time Created</th>
              </tr>
            </thead>
            <tbody>
              {sectionBookings.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '18px 14px' }}>
                    No data available. Update your record, now!
                  </td>
                </tr>
              ) : (
                sectionBookings.map((booking, index) => (
                  <Fragment key={booking.id}>
                    <tr>
                      <td data-label="Select">
                        <input
                          type="checkbox"
                          checked={!!selectedIds[booking.id]}
                          onChange={() => toggleSelected(booking.id)}
                          aria-label={`Select booking ${booking.booking_number}`}
                        />
                      </td>
                      <td data-label="S/No.">{index + 1}</td>
                      <td data-label="Property Description">
                        <div style={{ fontWeight: 700 }}>{booking.property_type}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{booking.property_address}</div>
                      </td>
                      <td data-label="Date Created">{formatDate(booking.created_at || booking.booking_date)}</td>
                      <td data-label="Time Created">{formatTime(booking.created_at || booking.booking_time)}</td>
                    </tr>
                    <tr className="row-actions">
                      <td colSpan={5}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {booking.booking_status !== 'cancelled' && (
                            <button type="button" className="btn btn-ghost" style={{ padding: '7px 10px', fontSize: '0.71875rem' }} onClick={() => void handleRowAction(booking.id, 'cancel')}>
                              Cancel
                            </button>
                          )}
                          <button type="button" className="btn btn-danger" style={{ padding: '7px 10px', fontSize: '0.71875rem' }} onClick={() => void handleRowAction(booking.id, 'delete')}>
                            Delete
                          </button>
                          <button type="button" className="btn btn-primary" style={{ padding: '7px 10px', fontSize: '0.71875rem' }} onClick={() => void handleRowAction(booking.id, 'rebook')}>
                            Rebook
                          </button>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <GlassCard style={{ padding: 16, background: '#000000' }} strong>
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
      </GlassCard>

      {loading ? (
        <div className="grid-2" style={{ gap: 18 }}>
          {Array.from({ length: 2 }).map((_, index) => (
            <GlassCard key={index} style={{ padding: 18 }} strong>
              <div style={{ height: 18, width: '50%', background: 'rgba(255,255,255,0.08)', borderRadius: 999, marginBottom: 18 }} />
              <div style={{ height: 120, borderRadius: 12, background: 'rgba(255,255,255,0.04)' }} />
            </GlassCard>
          ))}
        </div>
      ) : (
        <div className="grid-2" style={{ gap: 18 }}>
          {renderTable('Private Property List', rowsByType.privateBookings, true)}
          {renderTable('Public Property List', rowsByType.publicBookings, false)}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
        <Icon name="check" size={14} color="#22c55e" vector />
        <span>{selectedCount} booking(s) selected</span>
      </div>
    </div>
  );
}
