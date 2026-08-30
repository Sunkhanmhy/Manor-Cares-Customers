const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/** Calls the subscribe-newsletter Supabase Edge Function (REST POST) which stores the
 * subscriber and sends a confirmation email via Resend (server-side API key only). */
export async function subscribeToNewsletter(email: string): Promise<void> {
  const res = await fetch(`${supabaseUrl}/functions/v1/subscribe-newsletter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ email }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Could not subscribe. Please try again.');
  }
}
