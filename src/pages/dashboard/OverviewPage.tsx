import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../../components/GlassCard';
import { SkeletonCard } from '../../components/Skeleton';
import { StatusBadge } from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../lib/format';
import type { Booking } from '../../types/database';

interface OverviewStats {
  upcomingBooking: Booking | null;
  lastCompleted: Booking | null;
  outstandingBalance: number;
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
}

const ACTIVE_STATUSES = ['pending', 'confirmed', 'assigned', 'in_progress'];

export function OverviewPage() {
  const { profile, customerProfile } = useAuth();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerProfile) return;
    let active = true;

    async function load() {
      const today = new Date().toISOString().slice(0, 10);

      const [upcomingRes, lastCompletedRes, invoicesRes, totalRes, activeRes, completedRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('*, cleaning_services(*)')
          .eq('customer_id', customerProfile!.id)
          .gte('booking_date', today)
          .not('booking_status', 'in', '(cancelled,completed)')
          .order('booking_date', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('bookings')
          .select('*, cleaning_services(*)')
          .eq('customer_id', customerProfile!.id)
          .eq('booking_status', 'completed')
          .order('booking_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('invoices').select('total, status').eq('customer_id', customerProfile!.id).neq('status', 'paid').neq('status', 'void'),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('customer_id', customerProfile!.id),
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customerProfile!.id)
          .in('booking_status', ACTIVE_STATUSES),
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customerProfile!.id)
          .eq('booking_status', 'completed'),
      ]);

      if (!active) return;

      const outstandingBalance = (invoicesRes.data ?? []).reduce((sum, inv) => sum + Number(inv.total), 0);

      setStats({
        upcomingBooking: (upcomingRes.data as Booking | null) ?? null,
        lastCompleted: (lastCompletedRes.data as Booking | null) ?? null,
        outstandingBalance,
        totalBookings: totalRes.count ?? 0,
        activeBookings: activeRes.count ?? 0,
        completedBookings: completedRes.count ?? 0,
      });
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [customerProfile]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <GlassCard style={{ padding: 24 }}>
        <h2 style={{ fontSize: '1.375rem', marginBottom: 6 }}>Welcome back, {profile?.first_name}! 👋</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.84375rem' }}>
          Customer #{customerProfile?.customer_number ?? '—'} · Account status:{' '}
          <span style={{ color: 'var(--clr-green)', fontWeight: 600 }}>{customerProfile?.customer_status ?? 'active'}</span>
        </p>
      </GlassCard>

      {/* Dashboard CTA cards */}
      <div>
        {/* lazy local import to keep file small */}
        <div className="cta-grid">
          {/* We'll render CTA cards via a small inline list to avoid heavy refactors */}
          <GlassCard className="cta-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="icon">👤</span>
              <div>
                <div className="cta-title">Profile</div>
                <div className="cta-sub">View and edit your personal details</div>
              </div>
            </div>
            <a href="/dashboard/profile" className="btn btn-ghost" style={{ marginTop: 8 }}>Open Profile</a>
          </GlassCard>
          <GlassCard className="cta-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="icon">📍</span>
              <div>
                <div className="cta-title">My Addresses</div>
                <div className="cta-sub">Manage your saved addresses</div>
              </div>
            </div>
            <a href="/dashboard/addresses" className="btn btn-ghost" style={{ marginTop: 8 }}>Open Addresses</a>
          </GlassCard>
          <GlassCard className="cta-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="icon">🧽</span>
              <div>
                <div className="cta-title">Book a Cleaning</div>
                <div className="cta-sub">Create a new booking</div>
              </div>
            </div>
            <a href="/dashboard/book" className="btn btn-primary" style={{ marginTop: 8 }}>Book Now</a>
          </GlassCard>
          <GlassCard className="cta-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="icon">📅</span>
              <div>
                <div className="cta-title">My Bookings</div>
                <div className="cta-sub">See your booking history</div>
              </div>
            </div>
            <a href="/dashboard/bookings" className="btn btn-ghost" style={{ marginTop: 8 }}>View Bookings</a>
          </GlassCard>
          <GlassCard className="cta-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="icon">💳</span>
              <div>
                <div className="cta-title">Payments</div>
                <div className="cta-sub">View and manage payments</div>
              </div>
            </div>
            <a href="/dashboard/payments" className="btn btn-ghost" style={{ marginTop: 8 }}>Payments</a>
          </GlassCard>
          <GlassCard className="cta-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="icon">🧾</span>
              <div>
                <div className="cta-title">Invoices</div>
                <div className="cta-sub">View invoices and receipts</div>
              </div>
            </div>
            <a href="/dashboard/invoices" className="btn btn-ghost" style={{ marginTop: 8 }}>Invoices</a>
          </GlassCard>
          <GlassCard className="cta-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="icon">🎧</span>
              <div>
                <div className="cta-title">Support</div>
                <div className="cta-sub">Create tickets or contact support</div>
              </div>
            </div>
            <a href="/dashboard/support" className="btn btn-ghost" style={{ marginTop: 8 }}>Support</a>
          </GlassCard>
          <GlassCard className="cta-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="icon">⚙️</span>
              <div>
                <div className="cta-title">Settings</div>
                <div className="cta-sub">App preferences & account settings</div>
              </div>
            </div>
            <a href="/dashboard/settings" className="btn btn-ghost" style={{ marginTop: 8 }}>Settings</a>
          </GlassCard>
          <GlassCard className="cta-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="icon">🔒</span>
              <div>
                <div className="cta-title">Password & Security</div>
                <div className="cta-sub">Security settings for your account</div>
              </div>
            </div>
            <a href="/dashboard/security" className="btn btn-ghost" style={{ marginTop: 8 }}>Security</a>
          </GlassCard>
          <GlassCard className="cta-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="icon">🔔</span>
              <div>
                <div className="cta-title">Notifications</div>
                <div className="cta-sub">View recent alerts and messages</div>
              </div>
            </div>
            <a href="/dashboard/notifications" className="btn btn-ghost" style={{ marginTop: 8 }}>Notifications</a>
          </GlassCard>
        </div>
      </div>

      {loading || !stats ? (
        <div className="stat-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <StatCard label="Total Bookings" value={stats.totalBookings} icon="📅" />
            <StatCard label="Active Bookings" value={stats.activeBookings} icon="🧽" />
            <StatCard label="Completed Bookings" value={stats.completedBookings} icon="✅" />
            <StatCard label="Outstanding Balance" value={formatCurrency(stats.outstandingBalance)} icon="💰" accent />
          </div>

          <div className="card-grid">
            <GlassCard style={{ padding: 20 }}>
              <h3 style={{ fontSize: '0.9375rem', marginBottom: 14 }}>Upcoming Cleaning</h3>
              {stats.upcomingBooking ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.84375rem' }}>
                  <strong>{stats.upcomingBooking.cleaning_services?.name}</strong>
                  <span>{formatDate(stats.upcomingBooking.booking_date)} at {stats.upcomingBooking.booking_time}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{stats.upcomingBooking.property_address}</span>
                  <StatusBadge status={stats.upcomingBooking.booking_status} kind="booking" />
                </div>
              ) : (
                <p style={{ fontSize: '0.84375rem', color: 'var(--text-muted)' }}>No upcoming cleanings scheduled.</p>
              )}
              <Link to="/dashboard/book" className="btn btn-primary" style={{ marginTop: 16 }}>
                Book a Cleaning
              </Link>
            </GlassCard>

            <GlassCard style={{ padding: 20 }}>
              <h3 style={{ fontSize: '0.9375rem', marginBottom: 14 }}>Last Completed Service</h3>
              {stats.lastCompleted ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.84375rem' }}>
                  <strong>{stats.lastCompleted.cleaning_services?.name}</strong>
                  <span>{formatDate(stats.lastCompleted.booking_date)}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{stats.lastCompleted.property_address}</span>
                </div>
              ) : (
                <p style={{ fontSize: '0.84375rem', color: 'var(--text-muted)' }}>No completed services yet.</p>
              )}
              <Link to="/dashboard/bookings" className="btn btn-ghost" style={{ marginTop: 16 }}>
                View All Bookings
              </Link>
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, accent = false }: { label: string; value: string | number; icon: string; accent?: boolean }) {
  return (
    <GlassCard style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span className="icon">{icon}</span>
        <span style={{ fontSize: '0.78125rem', color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: accent ? 'var(--clr-green)' : 'var(--clr-white)' }}>{value}</div>
    </GlassCard>
  );
}
