// Public REST endpoint: POST { email } -> stores the subscriber and sends a
// confirmation email via Resend. Deploy with:
//   supabase functions deploy subscribe-newsletter
// Then set the Resend secret (never exposed to the browser):
//   supabase secrets set RESEND_API_KEY=re_xxx

import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let email: unknown;
  try {
    ({ email } = await req.json());
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
    return json({ error: 'Please enter a valid email address.' }, 400);
  }
  const normalizedEmail = email.trim().toLowerCase();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { error: dbError } = await supabase.from('newsletter_subscribers').upsert(
    {
      email: normalizedEmail,
      status: 'subscribed',
      subscribed_at: new Date().toISOString(),
      unsubscribed_at: null,
    },
    { onConflict: 'email' }
  );

  if (dbError) {
    console.error('subscribe-newsletter db error:', dbError);
    return json({ error: 'Could not subscribe. Please try again.' }, 500);
  }

  if (RESEND_API_KEY) {
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Manor-Cares <newsletter@manor-cares.com>',
          to: [normalizedEmail],
          subject: "You're subscribed to Manor-Cares updates",
          html: "<p>Thanks for subscribing! You'll now receive Manor-Cares news, offers and cleaning tips in your inbox.</p><p>You can unsubscribe at any time.</p>",
        }),
      });
      if (!resendRes.ok) console.error('Resend API error:', await resendRes.text());
    } catch (err) {
      // Subscription already succeeded in the DB — don't fail the request over email delivery.
      console.error('Resend request failed:', err);
    }
  }

  return json({ success: true });
});
