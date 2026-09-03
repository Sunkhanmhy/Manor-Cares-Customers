import { metricsEnabled, metricsSupabase } from './metricsSupabaseClient';

export type MetricEventType = 'usage' | 'booking_requested' | 'booking_executed' | 'review_positive' | 'review_negative';

export interface MetricEventRow {
  id: number;
  metric_type: MetricEventType;
  metric_value: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export async function logPublicMetric(metricType: MetricEventType, metricValue = 1, metadata?: Record<string, unknown>) {
  if (!metricsSupabase) return false;

  const { error } = await metricsSupabase.from('metrics_events').insert({
    metric_type: metricType,
    metric_value: metricValue,
    metadata: metadata ?? null,
  });

  return !error;
}

export async function fetchPublicMetricsEvents(sinceIso: string, limit = 3000) {
  if (!metricsSupabase) return [] as MetricEventRow[];

  const { data } = await metricsSupabase
    .from('metrics_events')
    .select('id, metric_type, metric_value, metadata, created_at')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: true })
    .limit(limit);

  return (data as MetricEventRow[] | null) ?? [];
}

export function subscribePublicMetrics(onChange: () => void) {
  if (!metricsSupabase) return () => {};

  const channel = metricsSupabase.channel('public-metrics-live');
  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'metrics_events' }, onChange)
    .subscribe();

  return () => {
    void channel.unsubscribe();
  };
}

export { metricsEnabled };
