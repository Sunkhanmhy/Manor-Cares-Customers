# Manor-Cares — Customer Portal

A premium glassmorphism **customer/user web application** for the Manor-Cares house cleaning
services platform. This is an independent frontend project (React + TypeScript + Vite) that
talks directly to a shared **Supabase** project (Auth + Postgres + REST) — it does **not** run
its own backend or database.

> The Administration application is a **separate, independent project** that connects to the
> *same* Supabase project. Both apps share one Postgres database, one Auth system and one set of
> Row Level Security policies — access is controlled entirely by Supabase Auth + RLS, never by
> the frontend.

## 1. Tech stack

- React 19 + TypeScript + Vite
- React Router (client-side routing, protected routes)
- `@supabase/supabase-js` — Auth, Postgres REST, session management
- Plain CSS (no UI framework) implementing the glassmorphism design system

## 2. Project structure

```
supabase/schema.sql        # Full DB schema, triggers, functions and RLS policies (run once in Supabase)
src/lib/supabaseClient.ts  # Supabase client (anon key only, "remember me" aware storage)
src/context/               # AuthContext (session/profile) + NotificationsContext (unread count)
src/components/            # Shared glass UI kit (cards, badges, spinner, skeleton, dialogs...)
src/pages/auth/            # Split-screen Sign In / Create Account, Forgot/Reset Password
src/pages/dashboard/        # Sidebar dashboard: overview, profile, addresses, bookings,
                            # payments, invoices, reviews, support, notifications, settings, security
src/types/database.ts      # TypeScript types mirroring the SQL schema
```

## 3. Setup

### 3.1 Create the Supabase project & schema

1. Create a Supabase project (or reuse the existing one shared with the Admin app).
2. Open the SQL Editor and run the entire contents of [`supabase/schema.sql`](supabase/schema.sql).
   It is idempotent and safe to re-run. It creates:
   - `profiles`, `customer_profiles`, `addresses`, `notification_preferences`
   - `cleaning_services` (seeded with 9 services), `bookings`, `payments`, `invoices`,
     `service_reviews`, `support_tickets`, `support_ticket_messages`, `notifications`
   - A trigger on `auth.users` that automatically creates the `profiles` /
     `customer_profiles` / `notification_preferences` / (optional) `addresses` rows on sign-up,
     reading from `raw_user_meta_data` (populated by this app's registration form).
   - Row Level Security on every table so a customer can only ever read/write their **own**
     records. `staff`/`admin` roles (used by the separate Admin app) can see everything.

### 3.2 Configure environment variables

```bash
cp .env.example .env
```

Fill in your project's values (Project Settings → API in the Supabase dashboard):

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<public anon key>
```

Only the **anon/public** key is ever used here — never the `service_role` key, database
password, or any other secret. `.env` is gitignored.

### 3.3 Configure Supabase Auth redirect URLs

In **Authentication → URL Configuration**, add this app's origin (e.g. `http://localhost:5173`
for local dev, plus your production domain) to the Redirect URLs allow-list, and make sure
`/reset-password` is reachable — the "Forgot password" email links here.

### 3.4 Run the app

```bash
npm install
npm run dev
```

## 4. Security notes

- Auth is handled exclusively by Supabase Auth (`supabase.auth.*`); passwords are never stored
  or handled by this app directly.
- Every table has RLS enabled; policies key off `auth.uid()` via `profiles.user_id`, so even if
  application code has a bug, the database itself blocks cross-customer access.
- The frontend never holds a service-role key, DB password, or other server secret.
- Auth/DB errors are translated to friendly, generic messages (see `mapAuthError` in
  `src/context/AuthContext.tsx`) — raw Postgres/Supabase errors are never shown to customers.
- "Remember me" controls whether the session token is kept in `localStorage` (persists across
  browser restarts) or `sessionStorage` (cleared when the tab closes).

## 5. Build

```bash
npm run build
```










See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## 6. Deployment & Supabase operations — step-by-step guide

This section contains explicit, copy-pasteable steps for the operations you asked for: applying the SQL schema, creating the `id-docs` storage bucket, setting secrets, and deploying Edge Functions. Follow the steps that match your comfort level: either run them locally with the Supabase CLI, or use the Supabase Console web UI.

Important safety notes before you begin:
- Never paste your `service_role` key in public chat or commit it to source control.
- When asked to set secrets, use the `supabase secrets` command or the Project Settings → API → Service key area.

### 6.1 Prerequisites

- Node.js (18+) and npm installed.
- `supabase` CLI installed globally (recommended):

```bash
npm install -g supabase
```

- You must have an active Supabase project and be able to access its Project URL and keys (anon and service_role). To deploy functions you'll need the `service_role` key as a secret — keep it safe.

### 6.2 Local environment variables

Create a local env file for the frontend (only needs anon/public keys):

```bash
cp .env.example .env
# Edit .env and set:
# VITE_SUPABASE_URL=https://<project-ref>.supabase.co
# VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

For server-side operations (Edge Functions deployment, schema apply), you'll use the Supabase CLI and `supabase secrets` for the service role - see below.

### 6.3 Option A — Apply SQL schema using the Supabase Console (recommended if unfamiliar with CLI)

1. Open your Supabase project dashboard in the browser.
2. Open **SQL Editor** → New query.
3. Copy the full contents of `supabase/schema.sql` from this repo and paste into the editor.
4. Click **RUN**. The SQL is idempotent and safe to re-run.

What this does:
- Creates/updates all application tables, triggers, helper functions, RLS policies, and seeds `price_plans`.

### 6.4 Option B — Apply SQL schema using the Supabase CLI (advanced)

1. Login with the CLI:

```bash
supabase login
```

2. Link the repo to your project (replace `<project-ref>` — you can find this in Project Settings → API):

```bash
supabase link --project-ref <project-ref>
```

3. Push the SQL file. Recent `supabase` CLI versions have `db push` for migrations; if unavailable, use the SQL editor instead.

```bash
supabase db push --file supabase/schema.sql
```

If `db push` is not available, run the SQL via psql using the connection string (not recommended unless you know what you're doing).

### 6.5 Create the `id-docs` storage bucket

Decision: Do you want uploaded ID documents to be public or private?
- Recommended: Private (use signed URLs) for PII/ID documents.

Using the Console (recommended):

1. In Supabase dashboard → Storage → Create new bucket.
2. Name: `id-docs` (must match the bucket referenced in the app).
3. Public: NO (leave private).
4. CORS: default is fine for browser uploads via the official `@supabase/supabase-js` SDK.

Using the CLI:

```bash
supabase storage create-bucket id-docs --public false
```

Client code notes (in this repo):
- The Profile upload currently calls `supabase.storage.from('id-docs').upload(...)` and then uses `getPublicUrl()`. If you create a private bucket, change the upload flow to use signed URLs or the client-side `createSignedUrl()` for downloads. Example (server-side or function):

```ts
// To generate a signed URL server-side (Edge Function with service role):
const { data } = await supabaseAdmin.storage.from('id-docs').createSignedUrl(path, 60 * 60);
// returns data.signedUrl
```

Or client-side: keep bucket public (not recommended for ID docs).

### 6.6 Deploy Edge Functions (create-invite)

This repo includes `supabase/functions/create-invite/index.ts`. The function requires the service-role key to create invites.

1. Ensure you're logged in via the CLI and linked to the correct project (see 6.4).
2. Add the service role secret to the project (do not expose it in the frontend):

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<SERVICE_ROLE_KEY>" SUPABASE_URL="https://<project-ref>.supabase.co"
```

3. Deploy the function:

```bash
supabase functions deploy create-invite --project-ref <project-ref>
```

4. (Optional) Inspect function logs while testing:

```bash
supabase functions logs create-invite --project-ref <project-ref>
```

Notes:
- When your Edge Function needs to access Supabase with elevated privileges, use the secret `SUPABASE_SERVICE_ROLE_KEY` via `Deno.env.get()` (the function code in this repo already expects this).

### 6.7 Price enquiries & payments notes

- The SQL schema includes a `price_enquiries` table for public property enquiries. The frontend `PaymentsPage` writes to this table with the currently-authenticated customer_id or null (guest). RLS policies allow inserts where `customer_id` equals the current customer or is null.
- The `payments` and `invoices` tables are typically guarded by RLS that restricts write operations to service-role or admin roles. For real payment gateway integration or invoice creation, implement a server-side endpoint (Edge Function) that:
  1. Authenticates the request (e.g. verify session or call with service role in a queued job).
  2. Creates `payments`/`invoices` using the service role key.

Example Edge Function snippet (insert invoice securely):

```ts
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
await supabaseAdmin.from('invoices').insert({ customer_id, invoice_number, total, currency, due_date });
```

### 6.8 Verify everything locally

1. Start the app locally with `npm run dev` and sign up a test user.
2. In Supabase Console → Auth → Users, ensure the new user exists.
3. In Supabase Console → Storage → id-docs, verify uploaded files appear (if bucket is public). If private, verify the signed URL flow works.
4. Test the `create-invite` function by invoking it from the CLI or building a small curl/postman request to its endpoint once deployed.

### 6.9 Useful TL;DR commands

```bash
# Login and link
supabase login
supabase link --project-ref <project-ref>

# Apply schema via CLI (if available)
supabase db push --file supabase/schema.sql

# Create private storage bucket
supabase storage create-bucket id-docs --public false

# Set secrets (service role)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<SERVICE_ROLE_KEY>" SUPABASE_URL="https://<project-ref>.supabase.co"

# Deploy functions
supabase functions deploy create-invite --project-ref <project-ref>

# View function logs
supabase functions logs create-invite --project-ref <project-ref>

# Build frontend
npm install
npm run build
```

### 6.10 Troubleshooting

- If a client-side write to `payments` or `invoices` fails with a permission error, it's an RLS rule: move that insert into an Edge Function which uses the service role key.
- If file uploads fail with CORS or 403: check bucket `public` setting and CORS rules in Storage. Prefer private buckets and signed URLs for downloads.
- If Edge Function deployment fails, ensure the `supabase` CLI version is recent and you are linked to the correct project-ref.

### 6.11 Next steps you can ask me to do

- I can generate a ready-to-run Edge Function to create invoices/payments with the expected payload (if you want server-side invoice creation done for you).
- I can patch the ProfilePage to use signed download URLs for private `id-docs` buckets (recommended).
- I can finish wiring any remaining right-pane forms to backend functions that safely handle RLS (payments, invoices).

---

If you want, I can now produce the exact CLI commands for your environment (replace <project-ref> and paste secrets). Tell me whether you prefer me to (A) produce the commands for you to run locally, or (B) that you will provide the `SUPABASE_SERVICE_ROLE_KEY` here so I can deploy from this environment (only do B if you trust this environment and want me to run the commands).

## 7. Deploying this app on Railway (step-by-step)

This app is a static React + Vite frontend that talks to a shared Supabase project (Auth + Postgres + Storage + Edge Functions). Railway will host the static frontend; Supabase hosts the backend. Follow these exact steps to publish to Railway and ensure sign-up, email verification, login, and dashboard access work.

7.1 Prerequisites
- A Railway account and access to Railway project(s).
- GitHub repository connected to Railway for automatic deploys.
- A Supabase project (shared with the Admin app) with the schema applied as described above.
- SMTP settings configured in Supabase Auth (for email verification) or use Supabase's built-in email provider if available.

7.2 Prepare the repo for production
1. Ensure `supabase/schema.sql` has been applied to your Supabase project (see section 3.1).
2. Confirm `/src/lib/supabaseClient.ts` uses only the anon/public key in client builds.
3. Do NOT embed `service_role` or any other secrets in the frontend. Service-role keys belong to server/Edge Functions only.

7.3 Railway: create project & connect repo
1. Log into Railway and create a new project → Deploy from GitHub.
2. Select this repository and the branch to deploy (e.g. `main`).
3. Railway will ask Build Command and Publish Directory. Use:

Build command: `npm install && npm run build`
Publish directory: `dist`

4. Under Railway Environment Variables, add the production values (see 7.4).

7.4 Required environment variables (Railway)
Set these in Railway's project Settings → Variables. Replace placeholders with your Supabase project values.

- `VITE_SUPABASE_URL` = https://<project-ref>.supabase.co
- `VITE_SUPABASE_ANON_KEY` = <your-anon-key>
- `PUBLIC_SITE_URL` = https://<your-railway-domain> (use Railway subdomain or custom domain)

Important: Do NOT add `SUPABASE_SERVICE_ROLE_KEY` to the frontend env; only set that in Supabase Edge Function secrets or a server-side environment.

7.5 Configure Supabase Auth for production
1. In Supabase → Authentication → Settings:
  - Set **Site URL** to your production `PUBLIC_SITE_URL`.
  - Add the Railway site URL to **Redirect URLs** and **Allowed Domains**.
  - Enable Email Confirmations (if desired) and configure SMTP under **Settings → Email → SMTP** if you want to use your own mail provider (SendGrid, Mailgun, etc.).
2. Test a sign-up on a staging domain to verify the verification email is received. If emails do not arrive, configure SMTP properly and test again.

7.6 Storage & file uploads (ID documents and avatars)
1. Create two buckets in Supabase Storage:
  - `avatars` (public or private depending on your UX)
  - `id-docs` (RECOMMENDED: private)
2. If `id-docs` is private, implement signed URL downloads in the frontend or a small Edge Function to return signed URLs. The profile upload flow in this repo may need adjustment: private buckets must use `createSignedUrl()` for reads.

7.7 Domain & redirect rules
1. If you use a custom domain on Railway, add it in Railway and then add the domain to Supabase Auth Redirect URLs.
2. Verify `/reset-password` and other Auth callback paths work (test the reset / sign-in flow).

7.8 Verify sign-up and login flows (manual test checklist)
1. Open the Railway-deployed site in an incognito browser.
2. Click Create Account, fill details, and submit. Expect: a success message instructing to confirm email.
3. Check the test recipient mailbox for the verification email. Click the verification link and confirm you return to the site and are able to log in.
4. After verification, log in. Expect: redirect to the dashboard and access to personal pages (Profile, Bookings, Payments, Notifications).
5. In Supabase Console → Auth → Users, confirm `confirmed_at` timestamp is populated for that user.

7.9 Shared DB considerations (Customer + Admin apps)
- Both apps must point to the same `VITE_SUPABASE_URL` and use their own anon keys (same project) in the frontend.
- The Admin app must keep `service_role` keyed flows in server/Edge Functions only. Admin UI should never embed service_role in its client bundle.
- Coordinate with the Admin app to avoid clobbering role or permission conventions. The RLS model in `supabase/schema.sql` enforces role boundaries — ensure Admin app respects them.

7.10 Styling: Force Font Awesome icons to white and set global font sizing
Add the following CSS to `src/index.css` (or your global stylesheet) to force Font Awesome icons to white and enforce a consistent responsive base font size across desktop/tablet/mobile. This keeps icons visible on dark glassmorphism cards and standardizes typography.

/* Force Font Awesome icons white */
.fa, .fas, .far, .fal, .fab, [class^="fa-"], svg[class*="fa-"] {
  color: #ffffff !important;
  fill: #ffffff !important;
  stroke: #ffffff !important;
}

/* Ensure any icon SVGs use currentColor */
svg.icon, svg.fa-icon { color: #ffffff !important; fill: currentColor !important; }

/* Global responsive base font-size (default desktop = 16px) */
:root { --base-font-size: 16px; }
html { font-size: var(--base-font-size); }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 1rem; line-height: 1.4; }

/* Slight downscaling on smaller viewports to keep layout balanced */
@media (max-width: 1200px) { html { font-size: 15px; } }
@media (max-width: 768px) { html { font-size: 14px; } }

Notes:
- Replace any component-local `font-size` values (px) with `rem` where practical so sizes scale with the root font-size. For example, `font-size: 14px` -> `font-size: 0.875rem`.
- Ensure icons/SVGs use `currentColor` so the global color rules apply. If a component hardcodes `fill` or `stroke`, change it to `fill: currentColor`.

7.11 Accessibility & responsive checks
- Test the site at desktop/tablet/mobile breakpoints; the `html` font-size adjustments above will reduce text scale naturally.
- Use browser devtools to audit color contrast and ensure white icons are visible against the card backgrounds.

7.12 Post-deploy verification checklist (final)
1. Sign up, verify email, log in, and confirm dashboard access.
2. Create a booking flow (if permitted) and confirm it shows under Bookings.
3. Upload an avatar (and an ID document if testing private bucket) and confirm read/download behavior using signed URLs if private.
4. Confirm payments/invoices routes that require admin/service role are blocked from the client (permission errors expected). Those operations must be done via Edge Functions.
5. Confirm support ticket creation and message posting works for the logged-in customer and that `sender_type` cannot be `staff` from the client.

7.13 Need help? I can:
- Generate a `security-tests.sql` file with the authorization tests (run on staging).
- Patch `src/index.css` and any components that hardcode icon color/font sizes to follow the new global policy.
- Build an Edge Function to return signed URLs for private `id-docs` downloads.

---

After this patch, I'll mark the README task done and can produce `security-tests.sql` or patch the CSS files directly if you want. Which do you want next: (A) `security-tests.sql`, (B) a PR that updates `src/index.css` and major components to follow the typography/icon rules, or (C) both?


