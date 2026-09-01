import { createClient } from 'jsr:@supabase/supabase-js@2';

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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { inviter_profile_id, invitee_email, expires_in_hours } = body;
  if (!inviter_profile_id) return json({ error: 'Missing inviter_profile_id' }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // generate a random token
  const token = crypto.getRandomValues(new Uint8Array(16)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
  const expires_at = expires_in_hours ? new Date(Date.now() + Number(expires_in_hours) * 3600 * 1000).toISOString() : null;

  try {
    const { error } = await supabase.from('invites').insert({ token, inviter_profile_id, invitee_email, expires_at });
    if (error) throw error;
    return json({ success: true, token });
  } catch (err) {
    console.error('create-invite error', err);
    return json({ error: 'Could not create invite' }, 500);
  }
});
