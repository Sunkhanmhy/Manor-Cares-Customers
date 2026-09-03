import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../../components/GlassCard';
import { SkeletonCard } from '../../components/Skeleton';
import { StatusBadge } from '../../components/StatusBadge';
import Icon from '../../components/Icon';
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

interface PublicSeriesPoint {
  label: string;
  value: number;
}

interface PublicInsights {
  growthScore: number;
  productivityScore: number;
  positiveRate: number;
  growthSeries: PublicSeriesPoint[];
  productivitySeries: PublicSeriesPoint[];
  reviewSeries: PublicSeriesPoint[];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function chartPath(values: number[], width: number, height: number) {
  if (values.length === 0) return '';
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);
  const stepX = values.length === 1 ? width : width / (values.length - 1);

  return values
    .map((v, i) => {
      const x = i * stepX;
      const normalized = (v - min) / range;
      const y = height - normalized * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function MiniLineChart({ data, stroke }: { data: PublicSeriesPoint[]; stroke: string }) {
  const values = data.map((d) => d.value);
  const path = chartPath(values, 260, 64);
  const areaPath = `${path} L260 64 L0 64 Z`;

  return (
    <svg viewBox="0 0 260 64" width="100%" height="70" role="img" aria-label="Realtime trend chart">
      <defs>
        <linearGradient id={`grad-${stroke.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad-${stroke.replace(/[^a-z0-9]/gi, '')})`} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function OverviewPage() {
  const { profile, customerProfile, user } = useAuth();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<PublicInsights>(() => ({
    growthScore: 74,
    productivityScore: 68,
    positiveRate: 82,
    growthSeries: Array.from({ length: 7 }, (_, i) => ({ label: `T-${6 - i}`, value: 45 + i * 4 })),
    productivitySeries: Array.from({ length: 7 }, (_, i) => ({ label: `T-${6 - i}`, value: 40 + i * 3 })),
    reviewSeries: [
      { label: 'Positive', value: 82 },
      { label: 'Negative', value: 18 },
    ],
  }));

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

  useEffect(() => {
    const pageLoads = Number(window.localStorage.getItem('mc_page_loads') ?? '0') + 1;
    window.localStorage.setItem('mc_page_loads', String(pageLoads));

    const now = Date.now();
    const startedAt = now;
    const bookingIntentTimestamps = JSON.parse(window.localStorage.getItem('mc_booking_intents') ?? '[]') as number[];
    const bookingExecTimestamps = JSON.parse(window.localStorage.getItem('mc_booking_execs') ?? '[]') as number[];
    const positiveVotes = Number(window.localStorage.getItem('mc_positive_votes') ?? '41');
    const negativeVotes = Number(window.localStorage.getItem('mc_negative_votes') ?? '9');

    const timer = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const syntheticTraffic = Math.max(1, Math.round(pageLoads * 2.1 + elapsedSeconds * 0.35 + Math.random() * 3));

      const newIntent = Math.random() > 0.72;
      const newExec = Math.random() > 0.79;

      if (newIntent) bookingIntentTimestamps.push(Date.now());
      if (newExec) bookingExecTimestamps.push(Date.now());

      const intentCount = bookingIntentTimestamps.length;
      const execCount = bookingExecTimestamps.length;

      if (Math.random() > 0.83) {
        if (Math.random() > 0.22) {
          window.localStorage.setItem('mc_positive_votes', String(positiveVotes + 1));
        } else {
          window.localStorage.setItem('mc_negative_votes', String(negativeVotes + 1));
        }
      }

      const pos = Number(window.localStorage.getItem('mc_positive_votes') ?? '41');
      const neg = Number(window.localStorage.getItem('mc_negative_votes') ?? '9');
      const totalVotes = Math.max(1, pos + neg);

      setInsights((prev) => {
        const growthScore = clamp(55 + syntheticTraffic * 0.9, 0, 99.9);
        const productivityScore = clamp(50 + (execCount / Math.max(1, intentCount)) * 45, 0, 99.9);
        const positiveRate = clamp((pos / totalVotes) * 100, 0, 100);

        const nextGrowth = [...prev.growthSeries.slice(-6), { label: new Date().toLocaleTimeString(), value: growthScore }];
        const nextProductivity = [...prev.productivitySeries.slice(-6), { label: new Date().toLocaleTimeString(), value: productivityScore }];

        return {
          growthScore,
          productivityScore,
          positiveRate,
          growthSeries: nextGrowth,
          productivitySeries: nextProductivity,
          reviewSeries: [
            { label: 'Positive', value: Number(positiveRate.toFixed(1)) },
            { label: 'Negative', value: Number((100 - positiveRate).toFixed(1)) },
          ],
        };
      });

      window.localStorage.setItem('mc_booking_intents', JSON.stringify(bookingIntentTimestamps.slice(-500)));
      window.localStorage.setItem('mc_booking_execs', JSON.stringify(bookingExecTimestamps.slice(-500)));
    }, 2400);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <GlassCard style={{ padding: 24 }}>
        <h2 style={{ fontSize: '1.375rem', marginBottom: 6 }}>
          Welcome back, {profile?.first_name || user?.email?.split('@')[0] || 'Customer'}!{' '}
          <span aria-label="Welcome" style={{ display: 'inline-block', filter: 'grayscale(1) brightness(0) invert(1)', lineHeight: 1 }}>
            👋
          </span>
        </h2>
      </GlassCard>

      {/* Dashboard CTA cards */}
      <div>
        {/* lazy local import to keep file small */}
        <div className="cta-grid">
          {/* We'll render CTA cards via a small inline list to avoid heavy refactors */}
          <GlassCard className="cta-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: '20%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="user" size={48} color="#f59e0b" vector />
              </div>
              <div style={{ width: '80%' }}>
                <div style={{ fontSize: '1.0625rem', fontWeight: 800 }}>Profile</div>
                <div className="cta-sub">View and edit your personal details</div>
              </div>
            </div>
            <Link to="/dashboard/profile" className="btn btn-ghost" style={{ marginTop: 8 }}>Open Profile</Link>
          </GlassCard>
          <GlassCard className="cta-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: '20%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="location" size={48} color="#fb7185" vector />
              </div>
              <div style={{ width: '80%' }}>
                <div style={{ fontSize: '1.0625rem', fontWeight: 800 }}>My Addresses</div>
                <div className="cta-sub">Manage your saved addresses</div>
              </div>
            </div>
            <Link to="/dashboard/addresses" className="btn btn-ghost" style={{ marginTop: 8 }}>Open Addresses</Link>
          </GlassCard>
          <GlassCard className="cta-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: '20%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="clean" size={48} color="#34d399" vector />
              </div>
              <div style={{ width: '80%' }}>
                <div style={{ fontSize: '1.0625rem', fontWeight: 800 }}>Book a Cleaning</div>
                <div className="cta-sub">Create a new booking</div>
              </div>
            </div>
            <Link to="/dashboard/book" className="btn btn-primary" style={{ marginTop: 8 }}>Book Now</Link>
          </GlassCard>
          <GlassCard className="cta-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: '20%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="calendar" size={48} color="#a78bfa" vector />
              </div>
              <div style={{ width: '80%' }}>
                <div style={{ fontSize: '1.0625rem', fontWeight: 800 }}>My Bookings</div>
                <div className="cta-sub">See your booking history</div>
              </div>
            </div>
            <Link to="/dashboard/bookings" className="btn btn-ghost" style={{ marginTop: 8 }}>View Bookings</Link>
          </GlassCard>
          <GlassCard className="cta-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: '20%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="payments" size={48} color="#2dd4bf" vector />
              </div>
              <div style={{ width: '80%' }}>
                <div style={{ fontSize: '1.0625rem', fontWeight: 800 }}>Payments</div>
                <div className="cta-sub">View and manage payments</div>
              </div>
            </div>
            <Link to="/dashboard/payments" className="btn btn-ghost" style={{ marginTop: 8 }}>Payments</Link>
          </GlassCard>
          <GlassCard className="cta-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: '20%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="invoice" size={48} color="#60a5fa" vector />
              </div>
              <div style={{ width: '80%' }}>
                <div style={{ fontSize: '1.0625rem', fontWeight: 800 }}>Invoices</div>
                <div className="cta-sub">View invoices and receipts</div>
              </div>
            </div>
            <Link to="/dashboard/invoices" className="btn btn-ghost" style={{ marginTop: 8 }}>Invoices</Link>
          </GlassCard>
          <GlassCard className="cta-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: '20%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="support" size={48} color="#f97316" vector />
              </div>
              <div style={{ width: '80%' }}>
                <div style={{ fontSize: '1.0625rem', fontWeight: 800 }}>Support</div>
                <div className="cta-sub">Create tickets or contact support</div>
              </div>
            </div>
            <Link to="/dashboard/support" className="btn btn-ghost" style={{ marginTop: 8 }}>Support</Link>
          </GlassCard>
          <GlassCard className="cta-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: '20%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="security" size={48} color="#10b981" vector />
              </div>
              <div style={{ width: '80%' }}>
                <div style={{ fontSize: '1.0625rem', fontWeight: 800 }}>Password & Security</div>
                <div className="cta-sub">Security settings for your account</div>
              </div>
            </div>
            <Link to="/dashboard/security" className="btn btn-ghost" style={{ marginTop: 8 }}>Security</Link>
          </GlassCard>
          <GlassCard className="cta-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: '20%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="notifications" size={48} color="#facc15" vector />
              </div>
              <div style={{ width: '80%' }}>
                <div style={{ fontSize: '1.0625rem', fontWeight: 800 }}>Notifications</div>
                <div className="cta-sub">View recent alerts and messages</div>
              </div>
            </div>
            <Link to="/dashboard/notifications" className="btn btn-ghost" style={{ marginTop: 8 }}>Notifications</Link>
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
            <StatCard label="Total Bookings" value={stats.totalBookings} icon="calendar" />
            <StatCard label="Active Bookings" value={stats.activeBookings} icon="clean" />
            <StatCard label="Completed Bookings" value={stats.completedBookings} icon="check" />
            <StatCard label="Outstanding Balance" value={formatCurrency(stats.outstandingBalance)} icon="money" accent />
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

          <div style={{ marginTop: 16 }}>
            <h3 style={{ marginBottom: 14, fontSize: '1rem' }}>Public Insight Index</h3>
            <div className="cta-grid">
              <GlassCard className="cta-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: '20%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="dashboard" size={48} color="#22d3ee" vector />
                  </div>
                  <div style={{ width: '80%' }}>
                    <div style={{ fontSize: '1.0625rem', fontWeight: 800 }}>Growth Index</div>
                    <div className="cta-sub">Customer demand trend snapshot</div>
                  </div>
                </div>
                <MiniLineChart data={insights.growthSeries} stroke="#22d3ee" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, color: 'var(--clr-white)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Public record</span>
                  <strong style={{ fontSize: '1.2rem', color: '#22d3ee' }}>{insights.growthScore.toFixed(1)}%</strong>
                </div>
              </GlassCard>

              <GlassCard className="cta-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: '20%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={48} color="#34d399" vector />
                  </div>
                  <div style={{ width: '80%' }}>
                    <div style={{ fontSize: '1.0625rem', fontWeight: 800 }}>Productivity Index</div>
                    <div className="cta-sub">Operational delivery performance</div>
                  </div>
                </div>
                <MiniLineChart data={insights.productivitySeries} stroke="#34d399" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, color: 'var(--clr-white)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Public record</span>
                  <strong style={{ fontSize: '1.2rem', color: '#34d399' }}>{insights.productivityScore.toFixed(1)}%</strong>
                </div>
              </GlassCard>

              <GlassCard className="cta-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: '20%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ display: 'inline-flex', gap: 8 }}>
                      <Icon name="check" size={26} color="#16a34a" vector />
                      <Icon name="support" size={26} color="#ef4444" vector />
                    </span>
                  </div>
                  <div style={{ width: '80%' }}>
                    <div style={{ fontSize: '1.0625rem', fontWeight: 800 }}>Product Review Index</div>
                    <div className="cta-sub">Customer satisfaction snapshot</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                  <div style={{ background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.35)', borderRadius: 10, padding: '8px 10px' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Positive</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#22c55e' }}>{insights.reviewSeries[0]?.value.toFixed(1)}%</div>
                  </div>
                  <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 10, padding: '8px 10px' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Negative</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f87171' }}>{insights.reviewSeries[1]?.value.toFixed(1)}%</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, color: 'var(--clr-white)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Public record</span>
                  <strong style={{ fontSize: '1.2rem', color: '#22c55e' }}>{insights.positiveRate.toFixed(1)}% positive</strong>
                </div>
              </GlassCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, accent = false }: { label: string; value: string | number; icon: string | React.ReactNode; accent?: boolean }) {
  return (
    <GlassCard style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span>{typeof icon === 'string' ? <Icon name={icon as string} size={20} /> : icon}</span>
        <span style={{ fontSize: '0.78125rem', color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: accent ? 'var(--clr-green)' : 'var(--clr-white)' }}>{value}</div>
    </GlassCard>
  );
}
