-- Hotfix: PostgREST permission denied on shared tables (profiles/customer dashboard)
-- Date: 2026-09-04
--
-- Why: RLS policies only filter rows. PostgREST still requires SQL GRANT privileges
-- on tables/sequences for role `authenticated` before RLS can run.
--
-- Run this once in Supabase SQL Editor on the shared project.

begin;

grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.customer_profiles to authenticated;
grant select, insert, update, delete on table public.addresses to authenticated;
grant select, insert, update, delete on table public.notification_preferences to authenticated;
grant select on table public.cleaning_services to authenticated;
grant select, insert, update, delete on table public.bookings to authenticated;
grant select, insert, update, delete on table public.payments to authenticated;
grant select, insert, update, delete on table public.invoices to authenticated;
grant select, insert, update, delete on table public.service_reviews to authenticated;
grant select, insert, update, delete on table public.support_tickets to authenticated;
grant select, insert, update, delete on table public.support_ticket_messages to authenticated;
grant select, insert, update, delete on table public.notifications to authenticated;
grant select, insert, update, delete on table public.invites to authenticated;
grant select, insert, update, delete on table public.price_plans to authenticated;
grant select, insert, update, delete on table public.price_enquiries to authenticated;

grant usage, select on sequence public.customer_number_seq to authenticated;
grant usage, select on sequence public.booking_number_seq to authenticated;
grant usage, select on sequence public.invoice_number_seq to authenticated;

commit;

-- Optional validation checks
select has_schema_privilege('authenticated', 'public', 'USAGE') as authenticated_schema_usage;
select
  has_table_privilege('authenticated', 'public.profiles', 'SELECT') as profiles_select,
  has_table_privilege('authenticated', 'public.profiles', 'UPDATE') as profiles_update,
  has_table_privilege('authenticated', 'public.customer_profiles', 'SELECT') as customer_profiles_select,
  has_table_privilege('authenticated', 'public.customer_profiles', 'UPDATE') as customer_profiles_update;
