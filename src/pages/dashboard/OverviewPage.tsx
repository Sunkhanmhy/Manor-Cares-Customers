import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../../components/GlassCard';
import { SkeletonCard } from '../../components/Skeleton';
import { StatusBadge } from '../../components/StatusBadge';
import Icon from '../../components/Icon';
import { formatCurrency, formatDate } from '../../lib/format';
import { fetchPublicMetricsEvents, logPublicMetric, metricsEnabled, subscribePublicMetrics } from '../../lib/publicMetrics';
import type { Booking } from '../../types/database';

interface OverviewStats {
  upcomingBooking: Booking | null;
  lastCompleted: Booking | null;
  outstandingBalance: number;
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
}

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

const ACTIVE_STATUSES = ['pending', 'confirmed', 'assigned', 'in_progress'];

const ICON_COLORS = {
  dashboard: '#22d3ee',
  user: '#f59e0b',
  location: '#fb7185',
  clean: '#34d399',
  calendar: '#a78bfa',
  payments: '#2dd4bf',
  invoice: '#60a5fa',
  support: '#f97316',
  notifications: '#facc15',
  security: '#10b981',
} as const;

const CTA_ITEMS = [
  { title: 'Profile', subtitle: 'View and edit your personal details', to: '/dashboard/profile', button: 'Open Profile', icon: 'user', color: ICON_COLORS.user },
  { title: 'My Addresses', subtitle: 'Manage your saved addresses', to: '/dashboard/addresses', button: 'Open Addresses', icon: 'location', color: ICON_COLORS.location },
  { title: 'Book a Cleaning', subtitle: 'Create a new booking', to: '/dashboard/book', button: 'Book Now', icon: 'clean', color: ICON_COLORS.clean, primary: true },
  { title: 'My Bookings', subtitle: 'See your booking history', to: '/dashboard/bookings', button: 'View Bookings', icon: 'calendar', color: ICON_COLORS.calendar },
  { title: 'Payments', subtitle: 'View and manage payments', to: '/dashboard/payments', button: 'Payments', icon: 'payments', color: ICON_COLORS.payments },
  { title: 'Invoices', subtitle: 'View invoices and receipts', to: '/dashboard/invoices', button: 'Invoices', icon: 'invoice', color: ICON_COLORS.invoice },
  { title: 'Support', subtitle: 'Create tickets or contact support', to: '/dashboard/support', button: 'Support', icon: 'support', color: ICON_COLORS.support },
  { title: 'Password & Security', subtitle: 'Security settings for your account', to: '/dashboard/security', button: 'Security', icon: 'security', color: ICON_COLORS.security },
  { title: 'Notifications', subtitle: 'View recent alerts and messages', to: '/dashboard/notifications', button: 'Notifications', icon: 'notifications', color: ICON_COLORS.notifications },
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgba(hex: string, alpha: number) {
  const cleaned = hex.replace('#', '');
  const bigint = Number.parseInt(cleaned.length === 3 ? cleaned.split('').map((s) => s + s).join('') : cleaned, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function pointsFromSeries(values: number[], width: number, height: number) {
  if (values.length === 0) return [] as Array<{ x: number; y: number }>;

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);
  const stepX = values.length === 1 ? width : width / (values.length - 1);

  return values.map((v, i) => {
    const x = i * stepX;
    const normalized = (v - min) / range;
    const y = height - normalized * height;
    return { x, y };
  });
}

function curvedPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const controlX = (current.x + next.x) / 2;
    path += ` Q ${current.x.toFixed(2)} ${current.y.toFixed(2)} ${controlX.toFixed(2)} ${((current.y + next.y) / 2).toFixed(2)}`;
  }

  const last = points[points.length - 1];
  path += ` T ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
  return path;
}

function MiniCurveChart({ data, stroke }: { data: PublicSeriesPoint[]; stroke: string }) {
  const values = data.map((d) => d.value);
  const points = pointsFromSeries(values, 260, 64);
  const path = curvedPath(points);
  const areaPath = `${path} L260 64 L0 64 Z`;
  const gradientId = `grad-${stroke.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg viewBox="0 0 260 64" width="100%" height="70" role="img" aria-label="Realtime curve chart">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function makeInsightsFromEvents(events: Array<{ metric_type: string; metric_value: number; created_at: string }>) {
  const buckets = 7;
  const bucketMs = 10 * 60 * 1000;
  const now = Date.now();
  const start = now - buckets * bucketMs;

  const usage = Array.from({ length: buckets }, () => 0);
  const requested = Array.from({ length: buckets }, () => 0);
  const executed = Array.from({ length: buckets }, () => 0);
  const positive = Array.from({ length: buckets }, () => 0);
  const negative = Array.from({ length: buckets }, () => 0);

  for (const event of events) {
    const ts = new Date(event.created_at).getTime();
    if (Number.isNaN(ts) || ts < start || ts > now) continue;

    const idx = clamp(Math.floor((ts - start) / bucketMs), 0, buckets - 1);
    const value = Number(event.metric_value) || 1;

    if (event.metric_type === 'usage') usage[idx] += value;
    if (event.metric_type === 'booking_requested') requested[idx] += value;
    if (event.metric_type === 'booking_executed') executed[idx] += value;
    if (event.metric_type === 'review_positive') positive[idx] += value;
    if (event.metric_type === 'review_negative') negative[idx] += value;
  }

  const maxUsage = Math.max(...usage, 1);
  const growthSeries = usage.map((value, i) => {
    const label = new Date(start + i * bucketMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return { label, value: clamp((value / maxUsage) * 100, 0, 100) };
  });

  const productivitySeries = requested.map((value, i) => {
    const label = new Date(start + i * bucketMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ratio = value > 0 ? (executed[i] / value) * 100 : i > 0 ? requested[i - 1] > 0 ? (executed[i - 1] / requested[i - 1]) * 100 : 0 : 0;
    return { label, value: clamp(ratio, 0, 100) };
  });

  const totalRequested = requested.reduce((sum, n) => sum + n, 0);
  const totalExecuted = executed.reduce((sum, n) => sum + n, 0);
  const totalPositive = positive.reduce((sum, n) => sum + n, 0);
  const totalNegative = negative.reduce((sum, n) => sum + n, 0);

  const positiveRate = totalPositive + totalNegative > 0
    ? clamp((totalPositive / (totalPositive + totalNegative)) * 100, 0, 100)
    : 50;

  const reviewSeries = [
    { label: 'Positive', value: Number(positiveRate.toFixed(1)) },
    { label: 'Negative', value: Number((100 - positiveRate).toFixed(1)) },
  ];

  const growthScore = Number((growthSeries.slice(-3).reduce((sum, s) => sum + s.value, 0) / 3).toFixed(1));
  const productivityScore = Number((totalRequested > 0 ? (totalExecuted / totalRequested) * 100 : 0).toFixed(1));

  return {
    growthScore,
    productivityScore: clamp(productivityScore, 0, 100),
    positiveRate: Number(positiveRate.toFixed(1)),
    growthSeries,
    productivitySeries,
    reviewSeries,
  } satisfies PublicInsights;
}

export function OverviewPage() {
  const { profile, customerProfile, user } = useAuth();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [voteSubmitting, setVoteSubmitting] = useState<'positive' | 'negative' | null>(null);
  const [metricsSyncing, setMetricsSyncing] = useState(false);

  const [insights, setInsights] = useState<PublicInsights>({
    growthScore: 0,
    productivityScore: 0,
    positiveRate: 50,
    growthSeries: Array.from({ length: 7 }, (_, i) => ({ label: `T-${6 - i}`, value: 0 })),
    productivitySeries: Array.from({ length: 7 }, (_, i) => ({ label: `T-${6 - i}`, value: 0 })),
    reviewSeries: [
      { label: 'Positive', value: 50 },
      { label: 'Negative', value: 50 },
    ],
  });

  const refreshPublicInsights = useCallback(async () => {
    if (!metricsEnabled) return;

    const sinceIso = new Date(Date.now() - 7 * 10 * 60 * 1000).toISOString();
    const events = await fetchPublicMetricsEvents(sinceIso, 4000);
    const next = makeInsightsFromEvents(events);
    setInsights(next);
  }, []);

  useEffect(() => {
    if (!customerProfile) {
      setStats({
        upcomingBooking: null,
        lastCompleted: null,
        outstandingBalance: 0,
        totalBookings: 0,
        activeBookings: 0,
        completedBookings: 0,
      });
      setLoading(false);
      return;
    }
    const customerId = customerProfile.id;

    let active = true;

    async function load() {
      const today = new Date().toISOString().slice(0, 10);

      const [upcomingRes, lastCompletedRes, invoicesRes, totalRes, activeRes, completedRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('*, cleaning_services(*)')
          .eq('customer_id', customerId)
          .gte('booking_date', today)
          .not('booking_status', 'in', '(cancelled,completed)')
          .order('booking_date', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('bookings')
          .select('*, cleaning_services(*)')
          .eq('customer_id', customerId)
          .eq('booking_status', 'completed')
          .order('booking_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('invoices').select('total, status').eq('customer_id', customerId).neq('status', 'paid').neq('status', 'void'),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('customer_id', customerId),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('customer_id', customerId).in('booking_status', ACTIVE_STATUSES),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('customer_id', customerId).eq('booking_status', 'completed'),
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

    void load();

    return () => {
      active = false;
    };
  }, [customerProfile]);

  useEffect(() => {
    if (!metricsEnabled) return;

    setMetricsSyncing(true);
    void logPublicMetric('usage', 1, { page: 'overview' });
    void refreshPublicInsights().finally(() => setMetricsSyncing(false));

    const unsubscribe = subscribePublicMetrics(() => {
      void refreshPublicInsights();
    });

    const poll = window.setInterval(() => {
      void refreshPublicInsights();
    }, 15000);

    return () => {
      unsubscribe();
      window.clearInterval(poll);
    };
  }, [refreshPublicInsights]);

  const statsCards = useMemo(
    () => [
      { label: 'Total Bookings', value: stats?.totalBookings ?? 0, icon: 'calendar' as const, color: ICON_COLORS.calendar },
      { label: 'Active Bookings', value: stats?.activeBookings ?? 0, icon: 'clean' as const, color: ICON_COLORS.clean },
      { label: 'Completed Bookings', value: stats?.completedBookings ?? 0, icon: 'dashboard' as const, color: ICON_COLORS.dashboard },
      { label: 'Outstanding Balance', value: formatCurrency(stats?.outstandingBalance ?? 0), icon: 'payments' as const, color: ICON_COLORS.payments },
    ],
    [stats]
  );

  async function submitReviewVote(kind: 'positive' | 'negative') {
    if (!metricsEnabled || voteSubmitting) return;

    setVoteSubmitting(kind);
    await logPublicMetric(kind === 'positive' ? 'review_positive' : 'review_negative', 1, { page: 'overview', actor: 'customer' });
    await refreshPublicInsights();
    setVoteSubmitting(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <GlassCard style={{ padding: 24 }}>
        <h2 style={{ fontSize: '1.375rem', marginBottom: 6 }}>
          Welcome back, {profile?.first_name || user?.email?.split('@')[0] || 'Customer'}{' '}
          <span aria-label="Welcome" style={{ display: 'inline-block', lineHeight: 1, color: '#f4c95d' }}>
            👋
          </span>
        </h2>
      </GlassCard>

      <div className="cta-grid">
        {CTA_ITEMS.map((item) => (
          <GlassCard
            key={item.to}
            className="cta-card"
            style={{
              padding: 18,
              background: `linear-gradient(145deg, ${hexToRgba(item.color, 0.18)}, ${hexToRgba(item.color, 0.05)})`,
              border: `1px solid ${hexToRgba(item.color, 0.45)}`,
            }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: '20%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={item.icon} size={48} color={item.color} vector />
              </div>
              <div style={{ width: '80%' }}>
                <div style={{ fontSize: '1.0625rem', fontWeight: 800 }}>{item.title}</div>
                <div className="cta-sub">{item.subtitle}</div>
              </div>
            </div>
            <Link
              to={item.to}
              className={`btn ${item.to === '/dashboard/book' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ marginTop: 8 }}
              onClick={() => {
                if (item.to === '/dashboard/book') {
                  void logPublicMetric('booking_requested', 1, { source: 'overview-card' });
                }
              }}
            >
              {item.button}
            </Link>
          </GlassCard>
        ))}
      </div>

      <GlassCard style={{ padding: 16, background: 'linear-gradient(145deg, rgba(34,211,238,0.12), rgba(16,185,129,0.08))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Public Insight Index</h3>
          <span className="badge badge-blue">{metricsEnabled ? (metricsSyncing ? 'Syncing metrics...' : 'Realtime public metrics') : 'Metrics DB not configured'}</span>
        </div>
      </GlassCard>

      <div className="cta-grid">
        <GlassCard className="cta-card" style={{ padding: 18, background: `linear-gradient(145deg, ${hexToRgba(ICON_COLORS.dashboard, 0.16)}, rgba(255,255,255,0.04))`, border: `1px solid ${hexToRgba(ICON_COLORS.dashboard, 0.42)}` }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: '20%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="dashboard" size={48} color={ICON_COLORS.dashboard} vector />
            </div>
            <div style={{ width: '80%' }}>
              <div style={{ fontSize: '1.0625rem', fontWeight: 800 }}>Growth Index</div>
              <div className="cta-sub">Realtime usage trend across all users</div>
            </div>
          </div>
          <MiniCurveChart data={insights.growthSeries} stroke={ICON_COLORS.dashboard} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Public record</span>
            <strong style={{ fontSize: '1.2rem', color: ICON_COLORS.dashboard }}>{insights.growthScore.toFixed(1)}%</strong>
          </div>
        </GlassCard>

        <GlassCard className="cta-card" style={{ padding: 18, background: `linear-gradient(145deg, ${hexToRgba(ICON_COLORS.clean, 0.16)}, rgba(255,255,255,0.04))`, border: `1px solid ${hexToRgba(ICON_COLORS.clean, 0.42)}` }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: '20%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="clean" size={48} color={ICON_COLORS.clean} vector />
            </div>
            <div style={{ width: '80%' }}>
              <div style={{ fontSize: '1.0625rem', fontWeight: 800 }}>Productivity Index</div>
              <div className="cta-sub">Booking request vs execution traffic</div>
            </div>
          </div>
          <MiniCurveChart data={insights.productivitySeries} stroke={ICON_COLORS.clean} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Public record</span>
            <strong style={{ fontSize: '1.2rem', color: ICON_COLORS.clean }}>{insights.productivityScore.toFixed(1)}%</strong>
          </div>
        </GlassCard>

        <GlassCard className="cta-card" style={{ padding: 18, background: `linear-gradient(145deg, ${hexToRgba(ICON_COLORS.support, 0.16)}, rgba(255,255,255,0.04))`, border: `1px solid ${hexToRgba(ICON_COLORS.support, 0.42)}` }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: '20%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ display: 'inline-flex', gap: 8 }}>
                <Icon name="check" size={26} color={ICON_COLORS.clean} vector />
                <Icon name="support" size={26} color={ICON_COLORS.support} vector />
              </span>
            </div>
            <div style={{ width: '80%' }}>
              <div style={{ fontSize: '1.0625rem', fontWeight: 800 }}>Product Review Index</div>
              <div className="cta-sub">Positive vs negative customer votes</div>
            </div>
          </div>
          <MiniCurveChart data={insights.reviewSeries} stroke={ICON_COLORS.support} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={voteSubmitting !== null || !metricsEnabled}
              onClick={() => void submitReviewVote('positive')}
              style={{ borderColor: hexToRgba(ICON_COLORS.clean, 0.45), color: ICON_COLORS.clean }}
            >
              <Icon name="check" size={16} color={ICON_COLORS.clean} vector /> Upvote
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={voteSubmitting !== null || !metricsEnabled}
              onClick={() => void submitReviewVote('negative')}
              style={{ borderColor: hexToRgba(ICON_COLORS.support, 0.45), color: ICON_COLORS.support }}
            >
              <Icon name="support" size={16} color={ICON_COLORS.support} vector /> Downvote
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Public record</span>
            <strong style={{ fontSize: '1.2rem', color: ICON_COLORS.clean }}>{insights.positiveRate.toFixed(1)}% positive</strong>
          </div>
        </GlassCard>
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
            {statsCards.map((item) => (
              <GlassCard
                key={item.label}
                style={{
                  padding: 18,
                  background: `linear-gradient(145deg, ${hexToRgba(item.color, 0.13)}, rgba(255,255,255,0.04))`,
                  border: `1px solid ${hexToRgba(item.color, 0.35)}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Icon name={item.icon} size={20} color={item.color} vector />
                  <span style={{ fontSize: '0.78125rem', color: 'var(--text-muted)' }}>{item.label}</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: item.color }}>{item.value}</div>
              </GlassCard>
            ))}
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
