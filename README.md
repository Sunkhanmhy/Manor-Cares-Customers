# Manor-Cares Customers

Customer-facing web app for Manor-Cares, built with React + TypeScript + Vite and backed by Supabase.

This app and the Manor-Cares Administrators app are separate frontends that share one Supabase backend.

## Architecture

- Frontend hosting: Railway
- Backend: Supabase (Auth, Postgres, Storage, Realtime, Edge Functions)
- Customer app repo: this repository
- Admin app repo: Manor-Cares Administrators (separate repository)
- Shared database model: one Supabase project, one Postgres database, one Auth tenant, strict RLS boundaries

## Critical Principles Before Deployment

1. Frontend apps must use only public anon keys.
2. Service-role keys are server-side only, never in browser code and never in Railway frontend variables.
3. All authorization is enforced by Supabase RLS, not by UI checks.
4. Schema ownership should be coordinated because both apps share one database.
5. Schema changes should be versioned and reviewed before applying to production.

## Step 1: Prepare Accounts and Tooling

1. Create or confirm access to Railway.
2. Create or confirm access to Supabase.
3. Install Node.js 22+ locally.
4. Install Supabase CLI.
5. Confirm you can build locally:

```bash
npm install
npm run build
```

## Step 2: Decide Supabase Project Topology

Use one of these options for metrics:

1. Recommended option: two Supabase projects
   - Project A: core customer and admin operational data
   - Project B: public metrics events
2. Alternative option: one Supabase project
   - Keep metrics in a separate table namespace and maintain strict policy review

This repository is already designed to support a dedicated metrics project via metrics environment variables.

## Step 3: Create or Select the Shared Supabase Project (Core Data)

1. Create or select the Supabase project that will be shared by:
   - Manor-Cares Customers
   - Manor-Cares Administrators
2. In Supabase dashboard, copy:
   - Project URL
   - Anon key
3. Keep service-role key private for backend-only operations.

## Step 4: Apply Core Schema for Customer App

1. Open SQL Editor in the shared Supabase project.
2. Run [supabase/schema.sql](supabase/schema.sql).
3. Confirm the script completes successfully.

What this script provides:

1. Core tables for profiles, customers, bookings, payments, invoices, support, reviews, notifications, pricing, invites, and newsletter.
2. Security helper functions in private schema.
3. Triggers for updated_at and identifiers.
4. Row Level Security enabled with policies for customer ownership and admin access boundaries.

## Step 5: Apply Admin Supplemental Schema in Correct Order

Because both apps share one database, apply schemas in this order:

1. Apply customer base schema from this repo first: [supabase/schema.sql](supabase/schema.sql).
2. Apply admin supplemental schema from the Manor-Cares Administrators repo second.
3. If you re-apply the customer base schema later, re-apply the admin supplemental schema afterward to ensure admin-specific objects and overrides remain intact.

Operational rule:

1. Treat customer schema as base layer.
2. Treat admin schema as extension layer.

## Step 6: Configure Storage Securely

1. Create bucket id-docs for identity documents.
2. Recommended: keep id-docs private.
3. Use signed URLs for read access.
4. Create a separate avatars bucket depending on your privacy model.

Security note:

1. If id-docs is public, document URLs become publicly accessible.
2. For production with personal documents, private bucket plus signed URLs is strongly recommended.

## Step 7: Configure Auth and Redirect URLs

In Supabase Authentication settings:

1. Set Site URL to production customer app domain.
2. Add Redirect URLs for:
   - Railway production domain
   - Railway preview domain if used
   - local development URL
3. Confirm reset password redirect route exists in app.
4. Configure SMTP provider for reliable production email delivery.

## Step 8: Configure Core RLS and Run an Audit

1. Verify RLS is enabled on all user-data tables.
2. Run [supabase/rls_audit.sql](supabase/rls_audit.sql) in SQL Editor.
3. Resolve any warnings before go-live.

Minimum checks to pass:

1. RLS enabled for critical tables.
2. Policies exist for select, insert, update, delete as expected.
3. Helper functions private.current_profile_id, private.current_customer_id, private.is_admin exist and have correct grants.

## Step 9: Configure Metrics Database

If using a dedicated metrics Supabase project:

1. Create a second Supabase project for metrics.
2. Run [supabase/public_metrics_schema.sql](supabase/public_metrics_schema.sql) in the metrics project.
3. Confirm metrics_events table exists.
4. Confirm policies allow required read and insert behavior for metrics ingestion and charting.

If using same project for metrics:

1. Still apply the metrics schema carefully.
2. Re-check policies so operational data cannot be exposed accidentally.
3. Keep metrics queries isolated from customer operational tables.

## Step 10: Configure Local Environment

Create .env for local development:

```bash
cp .env.example .env
```

Set values:

```env
VITE_SUPABASE_URL=https://<core-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<core-anon-key>
VITE_METRICS_SUPABASE_URL=https://<metrics-project-ref>.supabase.co
VITE_METRICS_SUPABASE_ANON_KEY=<metrics-anon-key>
```

Then run:

```bash
npm run dev
```





## Step 11: Deploy Supabase Edge Functions

This repository includes functions under [supabase/functions](supabase/functions).

1. Authenticate CLI:

```bash
supabase login
```

1. Link project:

```bash
supabase link --project-ref <core-project-ref>
```

1. Set function secrets server-side:

```bash
supabase secrets set SUPABASE_URL="https://<core-project-ref>.supabase.co" SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

1. Deploy functions:

```bash
supabase functions deploy create-invite --project-ref <core-project-ref>
supabase functions deploy subscribe-newsletter --project-ref <core-project-ref>
```

1. Validate logs:

```bash
supabase functions logs create-invite --project-ref <core-project-ref>
supabase functions logs subscribe-newsletter --project-ref <core-project-ref>
```

## Step 12: Create Railway Service for Customers App

1. In Railway, create a new project from GitHub.
2. Select this repository and target branch.
3. Configure build command:

```bash
npm install && npm run build
```

1. Configure start command:

```bash
npm run preview -- --host 0.0.0.0 --port $PORT
```

1. Set Railway environment variables:

```env
VITE_SUPABASE_URL=https://<core-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<core-anon-key>
VITE_METRICS_SUPABASE_URL=https://<metrics-project-ref>.supabase.co
VITE_METRICS_SUPABASE_ANON_KEY=<metrics-anon-key>
```

Do not set service-role keys in this Railway frontend service.

## Step 13: Deploy Railway Service for Admin App

Deploy the Manor-Cares Administrators app as a separate Railway service.

Shared backend requirements:

1. Point both apps to the same core Supabase project URL.
2. Use anon keys in frontend only.
3. Keep admin privileged operations behind backend or Edge Functions.

## Step 14: Post-Deploy Validation (Customer + Admin Shared DB)

Run these checks after both apps are deployed:

1. Customer signup creates auth user and related profile rows.
2. Customer can read and update only own records.
3. Customer cannot read another customer data via API calls.
4. Admin can access authorized operational data according to admin roles.
5. Payments and invoices respect intended write restrictions.
6. Support tickets and notifications flow correctly.
7. Metrics charts load and new metrics events are recorded.

## Step 15: Security Hardening Checklist

1. Enable MFA for Supabase org users who have production access.
2. Rotate service-role key if exposure is suspected.
3. Keep id-docs private and use signed URLs.
4. Ensure no service-role key is present in client bundles.
5. Review [supabase/security_audit_report.md](supabase/security_audit_report.md) and close open recommendations.
6. Re-run [supabase/rls_audit.sql](supabase/rls_audit.sql) after every schema change.
7. Restrict who can apply production SQL migrations.
8. Keep auth redirect URLs minimal and explicit.

## Step 16: Change Management for Shared Schema

Because customer and admin apps share one database, use this policy:

1. All schema changes go through pull request review.
2. Stage changes in a staging Supabase project first.
3. Run automated and manual RLS verification before production.
4. Apply migrations during defined windows.
5. Maintain a rollback script for every production schema change.

## Step 17: Recommended Deployment Order (Production)

1. Backup database.
2. Apply customer base schema.
3. Apply admin supplemental schema.
4. Run RLS audit.
5. Deploy or update Edge Functions.
6. Deploy customer app on Railway.
7. Deploy admin app on Railway.
8. Execute smoke tests for both apps.
9. Monitor logs and auth errors for first 24 hours.

## Step 18: Quick Troubleshooting

1. Permission denied on table write:
   - Likely RLS policy mismatch.
   - Verify auth session, customer mapping, and policy conditions.
2. Signup works but dashboard is empty:
   - Check trigger-generated profile and customer rows.
3. Password reset email not received:
   - Check Supabase SMTP configuration and redirect URLs.
4. Metrics not updating:
   - Verify metrics env variables and metrics project schema.
5. Admin app lost privileges after base schema re-run:
   - Re-apply admin supplemental schema.

## Useful Commands

```bash
# Build locally
npm run build

# Run locally
npm run dev

# Supabase CLI auth and link
supabase login
supabase link --project-ref <core-project-ref>

# Deploy functions
supabase functions deploy create-invite --project-ref <core-project-ref>
supabase functions deploy subscribe-newsletter --project-ref <core-project-ref>

# View function logs
supabase functions logs create-invite --project-ref <core-project-ref>
supabase functions logs subscribe-newsletter --project-ref <core-project-ref>
```

## Files Referenced in This Guide

- [supabase/schema.sql](supabase/schema.sql)
- [supabase/public_metrics_schema.sql](supabase/public_metrics_schema.sql)
- [supabase/rls_audit.sql](supabase/rls_audit.sql)
- [supabase/security_audit_report.md](supabase/security_audit_report.md)
- [supabase/functions/create-invite/index.ts](supabase/functions/create-invite/index.ts)
- [supabase/functions/subscribe-newsletter/index.ts](supabase/functions/subscribe-newsletter/index.ts)
