-- rls_audit.sql
-- Run in the Supabase SQL editor to list tables with RLS enabled and count policies.
-- This script emits NOTICE messages for quick manual inspection.

DO $$
DECLARE
  r record;
  tbl text;
  rls_enabled boolean;
  pol_count int;
  tables_to_check text[] := ARRAY[
    'profiles','customer_profiles','addresses','notification_preferences',
    'cleaning_services','bookings','payments','invoices','service_reviews',
    'support_tickets','support_ticket_messages','notifications','price_plans','price_enquiries'
  ];
BEGIN
  RAISE NOTICE 'Beginning RLS audit for % tables', array_length(tables_to_check,1);
  FOREACH tbl IN ARRAY tables_to_check LOOP
    SELECT relrowsecurity INTO rls_enabled FROM pg_class WHERE relname = tbl;
    SELECT count(*) INTO pol_count FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid WHERE c.relname = tbl;
    IF NOT rls_enabled THEN
      RAISE WARNING 'Table % does NOT have RLS enabled', tbl;
    ELSE
      IF pol_count = 0 THEN
        RAISE WARNING 'Table % has RLS enabled but ZERO policies', tbl;
      ELSE
        RAISE NOTICE 'Table %: RLS enabled, % policy(ies) present', tbl, pol_count;
      END IF;
    END IF;
  END LOOP;
END$$;

-- Additional checks: ensure helper functions exist and are executable by 'authenticated'
SELECT proname, proacl IS NOT NULL AS has_acl FROM pg_proc WHERE proname IN ('current_profile_id','current_customer_id','is_admin','is_staff');

-- End of audit script
