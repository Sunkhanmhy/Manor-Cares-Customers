# Supabase Security & RLS Audit — Manor Cares

Date: 2026-09-02

Summary
- Reviewed `supabase/schema.sql` and validated RLS helper functions, policies, triggers, and table definitions.
- Overall the schema is well-structured: helper functions `private.current_profile_id`, `private.current_customer_id`, `private.is_admin`, `private.is_staff` exist and are granted to `authenticated` only.
- Most tables have RLS enabled and policies scoped to `private.current_*` helpers and `private.is_admin()`.

Findings & Recommended Actions

1) Duplicate/fragmented SQL blocks
- `price_plans` and several `private.*` definitions appear multiple times in the file. This is harmless but confusing and risky when re-applying migrations.
- Recommendation: collapse duplicates and keep a single idempotent definition per object.

2) `id_document_url` storage exposure
- `profiles.id_document_url` currently stores a public URL via `supabase.storage.getPublicUrl` in the client code. This exposes uploaded ID documents publicly.
- Recommendation: use a protected bucket and serve files via signed URLs using `createSignedUrl()`. Remove any client-side use of `getPublicUrl` for sensitive uploads.

3) Newsletter subscribers table
- `newsletter_subscribers` has RLS enabled but intentionally no client-facing policies (comment indicates subscription endpoint uses service_role key). Ensure the Edge Function is the only writer; consider adding a restricted insert policy for a special supabase function role or keep as-is and confirm service_role is kept secret.

4) Storage & retention
- Define retention and lifecycle policies for `id-docs` bucket (retain for minimum required period, auto-delete after x days for failed verifications), and ensure encryption at rest is enforced by Supabase (default is fine).

5) Rate limiting & abuse protection
- No DB-level rate limiting. Add server-side rate limiting for actions like password reset, price_enquiries insert, and invites consumption (Edge Function or Postgres pg_cron to throttle/monitor). Also consider putting CAPTCHAs on public forms.

6) Tests & verification
- Provide SQL-based checks that can be run in CI to assert: RLS enabled on critical tables, helper functions exist and are executable by `authenticated`, and critical policies exist for each table.

Suggested SQL (file: `rls_audit.sql`) contains queries that warn if any expected table lacks RLS or has zero policies.

Next steps I can implement on request
- Consolidate `schema.sql` to remove duplicates and produce a clean, idempotent migration file.
- Implement `rls_audit.sql` into CI to fail builds when policies are missing.
- Update client code to use signed storage URLs and change bucket to protected.
- Add example Edge Function code for secure newsletter and invite consumption using service_role key.


