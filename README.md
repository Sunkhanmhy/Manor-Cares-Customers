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
