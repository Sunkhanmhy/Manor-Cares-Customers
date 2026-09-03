import { createClient } from '@supabase/supabase-js';

const metricsSupabaseUrl = import.meta.env.VITE_METRICS_SUPABASE_URL as string | undefined;
const metricsSupabaseAnonKey = import.meta.env.VITE_METRICS_SUPABASE_ANON_KEY as string | undefined;

// Separate Supabase project for public analytics metrics only.
export const metricsSupabase = metricsSupabaseUrl && metricsSupabaseAnonKey
  ? createClient(metricsSupabaseUrl, metricsSupabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

export const metricsEnabled = Boolean(metricsSupabase);
