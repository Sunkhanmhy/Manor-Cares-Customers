# Layout Plan: Manor-Cares Customers

## 1) Executive Analysis

Manor-Cares Customers is a React + TypeScript single-page application focused on authenticated customer self-service for cleaning operations. It combines account onboarding, profile management, booking operations, payment recording, invoice visibility, support ticketing, notifications, and public metrics dashboards.

At a system level, the project follows a frontend-thin/backend-secure model:

- Frontend handles UX, form validation, and API orchestration.
- Supabase handles identity, authorization boundaries, data persistence, and server functions.
- Row Level Security (RLS) is the core authorization mechanism.

This is a strong architecture for early-to-mid stage SaaS because it minimizes backend maintenance while keeping data rules centralized in Postgres policies.

## 2) Framework and Runtime Stack

### Frontend

- React 19
- TypeScript
- Vite build system
- React Router for route composition and guarded navigation
- Context API for app-wide auth and notifications state
- Custom component primitives for glass-style UI cards, status indicators, icons, and toasts

### Backend Platform (Managed)

- Supabase Auth for user sessions
- Supabase Postgres for transactional domain data
- Supabase Storage for file assets (profile docs/images)
- Supabase Realtime channel for public metrics updates
- Supabase Edge Functions for privileged operations

### Build and Delivery

- `npm run build` triggers TypeScript project build + Vite production bundling
- Architecture supports static hosting with environment-driven configuration

## 3) High-Level Architecture

### Layered View

1. Presentation Layer (pages + components)
- Auth pages and dashboard pages render role-specific customer workflows.
- Shared UI primitives enforce consistent visual behavior.

2. Application Layer (contexts + helpers)
- Auth context coordinates session, profile hydration, and auth actions.
- Notification context maintains unread count polling behavior.
- Helper modules normalize identity and reduce duplicated Supabase query logic.

3. Integration Layer (Supabase clients)
- Primary client for operational data.
- Optional secondary client for public metrics project separation.

4. Data/Security Layer (Supabase/Postgres)
- Domain tables and relationships model the full customer lifecycle.
- Policies ensure user-scoped read/write access and admin-only boundaries.
- Triggers enforce generated values and immutable field rules.

## 4) Routing and Navigation Logic

The app uses a clean split:

- Public routes: sign-in, forgot password, reset password.
- Protected route wrapper: blocks dashboard access without active session.
- Nested dashboard routing: shared shell (sidebar + topbar) with child feature pages.

This route composition reduces duplication and keeps shell-level concerns (theme toggle, menu state, metrics route logging) centralized.

## 5) State Management Strategy

### Global State

- Auth context
  - Owns `session`, `user`, `profile`, `customerProfile`, and loading state.
  - Handles sign-in, sign-up, sign-out, password reset, password update.
  - Hydrates customer profile from Supabase using `user_id` linkage.

- Notifications context
  - Derives unread count from `notifications` table.
  - Polls at interval to keep topbar badge current.

- Toast provider
  - Global ephemeral feedback pipeline for async operations.

### Local Feature State

Each page manages its own form state and async lifecycle (loading/submitting/error) with `useState`, `useEffect`, and `useMemo` patterns.

This design is appropriate for current app size. If domain complexity expands significantly, a data cache layer (TanStack Query) would further improve consistency and stale-data control.

## 6) Domain and Data Model Logic

The schema models a normalized customer operations platform:

- Identity/Account: `profiles`, `customer_profiles`, `notification_preferences`
- Customer context: `addresses`
- Operations: `cleaning_services`, `bookings`
- Billing visibility: `payments`, `invoices`
- Experience loop: `service_reviews`, `support_tickets`, `support_ticket_messages`, `notifications`
- Growth utilities: invites + newsletter subscribers + pricing inquiries/plans

### Key Data Patterns

- User-to-profile is 1:1 via Auth user id.
- Customer profile extends core profile.
- Bookings and financial rows are customer-scoped for RLS simplicity.
- Notifications are profile-scoped for fast unread querying.

## 7) Identity Resolution Logic

A notable implementation detail is the email-scoped identity fallback helper:

- Normalizes auth email.
- Resolves corresponding `profileId` and `customerId` even when context is partially hydrated.
- Prevents feature pages from hard-failing if context hydration is delayed.

This improves reliability in real-world auth timing edge cases and prevents race-like UX failures.

## 8) Security and Authorization Architecture

Security posture is one of the strongest parts of this project.

### Strengths

- No service role key in browser runtime.
- Browser only uses anon key.
- RLS enabled across core customer tables.
- Helper functions in private schema encapsulate ownership checks.
- Trigger-based guards prevent unauthorized mutation of sensitive profile fields.

### Edge Function Separation

Privileged or cross-cutting operations (invite creation, newsletter persistence + email dispatch) are handled server-side in Edge Functions with service-role credentials.

This separation is correct and aligns with zero-trust frontend principles.

## 9) Feature Logic Walkthrough

### Authentication and Onboarding

- Sign-in supports remember-me storage strategy (local vs session storage).
- Sign-up writes auth metadata expected by database trigger pipeline.
- Password reset flows are route-integrated and production-friendly.

### Profile Management

- Profile form aggregates personal details + extended customer info.
- Save pipeline updates `profiles` and `customer_profiles` with normalized payloads.
- Address synchronization updates or creates default home address.
- Upload flow sends profile images/doc URLs via storage and persists URL references.

### Booking Operations

- Supports private and public/commercial booking form variants.
- Auto-fills customer identity/address values where possible.
- Writes bookings scoped to resolved customer id.
- Includes status update operations (cancel/rebook/delete) with customer scoping.

### Payments and Invoices

- Payment page includes calculator logic and payment record insertion.
- Invoice/payment listing is scoped to customer ownership.

### Support and Reviews

- Support ticket creation with structured details in description payload.
- Service review submit path linked to existing booking context.

### Notifications

- Notification listing page supports read state transitions.
- Global unread badge stays synchronized through periodic refresh.

### Public Metrics Dashboard

- Optional secondary Supabase project is used for aggregate public events.
- Realtime subscription + polling fallback updates visual insight cards.
- Metric categories include usage, booking funnel, and sentiment votes.

## 10) UI and Design System Architecture

The UI follows a reusable glass-surface system:

- Theme variables in global CSS (`dark` + `light` runtime switch)
- Shared component primitives:
  - `GlassCard`
  - `Icon`/`Icon3D`
  - `StatusBadge`
  - `Spinner` and skeleton loaders

The dashboard shell architecture cleanly separates:

- structural navigation (sidebar)
- context actions (topbar)
- feature content (nested routes)

This separation keeps feature pages focused on business logic rather than frame composition.

## 11) Operational and Reliability Considerations

### Positives

- Defensive null checks around identity and profile readiness.
- Consistent async UX feedback with toasts.
- Production build currently passes.

### Risks / Gaps to Watch

1. Data-fetch consistency
- Most pages fetch directly inside components. As count grows, refresh coordination may become harder.

2. Polling overhead
- Unread notifications rely on interval polling. Realtime or event-driven invalidation could reduce needless queries.

3. Error observability
- Console logging exists, but there is no centralized monitoring pipeline in frontend runtime.

4. Test coverage
- Architecture is currently code-centric with limited explicit test infrastructure visible.

## 12) Recommended Architecture Evolution (Senior-Level Roadmap)

### Near-Term (High ROI)

1. Introduce query/cache abstraction
- Adopt TanStack Query for standardized loading, retries, invalidation, and deduplication.

2. Add schema-safe API layer
- Generate typed query wrappers for Supabase tables to reduce runtime field mismatch risk.

3. Harden storage strategy
- Move sensitive document buckets to private + signed URL retrieval if not already private in production.

4. Add analytics/observability
- Integrate Sentry or equivalent for frontend runtime error tracing.

### Mid-Term

1. Domain service modules
- Move page-level query/mutation logic into domain services for testability and reuse.

2. Test pyramid
- Unit tests for payload builders/validators.
- Integration tests for route guards and critical customer flows.
- E2E smoke for auth, booking create, profile save, support submit.

3. Performance tuning
- Code-split heavy dashboard routes.
- Lazy-load chart-intensive modules.

### Long-Term

1. Introduce BFF (if needed)
- If business rules outgrow SQL policy complexity, introduce a thin backend-for-frontend for orchestration while preserving RLS for hard boundaries.

2. Multi-app schema governance
- Maintain explicit migration ownership and contract checks between customer and admin apps sharing the same database.

## 13) Current Architecture Verdict

From a senior full-stack perspective, this project is architecturally solid for its current product stage:

- Correct use of managed backend services.
- Strong authorization boundary placement in database policies.
- Clean route/layout composition.
- Practical, maintainable React patterns.

The next major leverage point is not a rewrite; it is systematic hardening:

- data-fetch standardization,
- stronger observability,
- and formalized testing.

With those improvements, this codebase can scale safely in both feature volume and production reliability.
