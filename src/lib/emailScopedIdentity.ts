import { supabase } from './supabaseClient';

export interface EmailScopedIdentity {
  email: string;
  profileId: number | null;
  customerId: number | null;
}

function normalizeEmail(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

export function getNormalizedAuthEmail(primary?: string | null, secondary?: string | null) {
  return normalizeEmail(primary || secondary);
}

export async function resolveEmailScopedIdentity(args: {
  email?: string | null;
  fallbackProfileId?: number | null;
  fallbackCustomerId?: number | null;
}): Promise<EmailScopedIdentity> {
  const email = normalizeEmail(args.email);
  if (!email) {
    return {
      email: '',
      profileId: args.fallbackProfileId ?? null,
      customerId: args.fallbackCustomerId ?? null,
    };
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id, email')
    .ilike('email', email)
    .maybeSingle();

  const profileId = profileRow?.id ?? args.fallbackProfileId ?? null;

  if (!profileId) {
    return {
      email,
      profileId: null,
      customerId: args.fallbackCustomerId ?? null,
    };
  }

  const { data: customerRow } = await supabase
    .from('customer_profiles')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle();

  return {
    email,
    profileId,
    customerId: customerRow?.id ?? args.fallbackCustomerId ?? null,
  };
}
