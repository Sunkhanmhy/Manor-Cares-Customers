-- =====================================================================
-- Manor Cares — Shared Supabase schema (Customer app + future Admin app)
-- Run this once against your Supabase project (SQL Editor or `supabase db push`).
-- Safe to re-run: uses IF NOT EXISTS / DO blocks for idempotency.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Helper: generic updated_at trigger
-- ---------------------------------------------------------------------
create or replace function public.trg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Private schema for internal RLS helper functions (not directly callable
-- by clients other than through policies that reference them).
-- ---------------------------------------------------------------------
create schema if not exists private;

-- =====================================================================
-- 1. profiles  (1:1 with auth.users)
-- =====================================================================
create table if not exists public.profiles (
  id bigint generated always as identity primary key,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  id_document_url text,
  career_status text,
  relationship_status text,
  avatar_url text,
  date_of_birth date,
  gender text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  role text not null default 'customer' check (role in ('customer', 'staff', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_user_id_idx on public.profiles (user_id);

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.trg_set_updated_at();

-- =====================================================================
-- 2. customer_profiles
-- =====================================================================
create sequence if not exists public.customer_number_seq start 1000;

create table if not exists public.customer_profiles (
  id bigint generated always as identity primary key,
  profile_id bigint not null unique references public.profiles (id) on delete cascade,
  customer_number text unique,
  preferred_contact_method text default 'email' check (preferred_contact_method in ('email', 'phone', 'sms')),
  customer_status text not null default 'active' check (customer_status in ('active', 'inactive', 'vip', 'suspended')),
  notes text,
  invited_by_profile_id bigint references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_profiles_profile_id_idx on public.customer_profiles (profile_id);

drop trigger if exists set_updated_at on public.customer_profiles;
create trigger set_updated_at before update on public.customer_profiles
  for each row execute function public.trg_set_updated_at();

create or replace function public.set_customer_number()
returns trigger
language plpgsql
as $$
begin
  if new.customer_number is null then
    new.customer_number := 'MC-' || lpad(nextval('public.customer_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_customer_number on public.customer_profiles;
create trigger trg_set_customer_number before insert on public.customer_profiles
  for each row execute function public.set_customer_number();

-- =====================================================================
-- 3. addresses
-- =====================================================================
create table if not exists public.addresses (
  id bigint generated always as identity primary key,
  profile_id bigint not null references public.profiles (id) on delete cascade,
  address_type text not null default 'home' check (address_type in ('home', 'work', 'other')),
  address_line text not null,
  city text not null,
  state text,
  country text not null,
  postal_code text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists addresses_profile_id_idx on public.addresses (profile_id);

drop trigger if exists set_updated_at on public.addresses;
create trigger set_updated_at before update on public.addresses
  for each row execute function public.trg_set_updated_at();

-- =====================================================================
-- 4. notification_preferences
-- =====================================================================
create table if not exists public.notification_preferences (
  id bigint generated always as identity primary key,
  profile_id bigint not null unique references public.profiles (id) on delete cascade,
  email_notifications boolean not null default true,
  sms_notifications boolean not null default false,
  marketing_notifications boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_preferences_profile_id_idx on public.notification_preferences (profile_id);

drop trigger if exists set_updated_at on public.notification_preferences;
create trigger set_updated_at before update on public.notification_preferences
  for each row execute function public.trg_set_updated_at();

-- =====================================================================
-- 5. cleaning_services (catalog, managed by admin app / service role)
-- =====================================================================
create table if not exists public.cleaning_services (
  id bigint generated always as identity primary key,
  name text not null unique,
  slug text not null unique,
  description text,
  base_price numeric(10, 2) not null default 0,
  price_unit text not null default 'flat' check (price_unit in ('flat', 'per_room', 'per_hour', 'per_sqft')),
  estimated_duration_minutes integer,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.cleaning_services;
create trigger set_updated_at before update on public.cleaning_services
  for each row execute function public.trg_set_updated_at();

-- =====================================================================
-- 6. bookings
-- =====================================================================
create sequence if not exists public.booking_number_seq start 1;

create table if not exists public.bookings (
  id bigint generated always as identity primary key,
  customer_id bigint not null references public.customer_profiles (id) on delete cascade,
  service_id bigint not null references public.cleaning_services (id),
  booking_number text unique,
  booking_date date not null,
  booking_time time not null,
  property_type text not null check (property_type in ('apartment', 'house', 'office', 'airbnb', 'other')),
  property_address text not null,
  number_of_rooms integer not null default 1,
  number_of_bathrooms integer not null default 1,
  additional_services text[],
  special_instructions text,
  estimated_price numeric(10, 2),
  final_price numeric(10, 2),
  assigned_staff text,
  booking_status text not null default 'pending' check (
    booking_status in ('pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled', 'rescheduled')
  ),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'partial', 'paid', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_customer_id_idx on public.bookings (customer_id);
create index if not exists bookings_service_id_idx on public.bookings (service_id);
create index if not exists bookings_status_idx on public.bookings (booking_status);

drop trigger if exists set_updated_at on public.bookings;
create trigger set_updated_at before update on public.bookings
  for each row execute function public.trg_set_updated_at();

create or replace function public.set_booking_number()
returns trigger
language plpgsql
as $$
begin
  if new.booking_number is null then
    new.booking_number := 'CLN-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.booking_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_booking_number on public.bookings;
create trigger trg_set_booking_number before insert on public.bookings
  for each row execute function public.set_booking_number();

-- =====================================================================
-- 7. payments
-- =====================================================================
create table if not exists public.payments (
  id bigint generated always as identity primary key,
  customer_id bigint not null references public.customer_profiles (id) on delete cascade,
  booking_id bigint references public.bookings (id) on delete set null,
  payment_reference text unique,
  amount numeric(10, 2) not null,
  currency text not null default 'NGN',
  payment_method text check (payment_method in ('card', 'bank_transfer', 'cash', 'wallet')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'successful', 'failed', 'refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payments_customer_id_idx on public.payments (customer_id);
create index if not exists payments_booking_id_idx on public.payments (booking_id);

-- =====================================================================
-- 8. invoices
-- =====================================================================
create sequence if not exists public.invoice_number_seq start 1;

create table if not exists public.invoices (
  id bigint generated always as identity primary key,
  customer_id bigint not null references public.customer_profiles (id) on delete cascade,
  booking_id bigint references public.bookings (id) on delete set null,
  invoice_number text unique,
  subtotal numeric(10, 2) not null default 0,
  discount numeric(10, 2) not null default 0,
  tax numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  currency text not null default 'NGN',
  status text not null default 'unpaid' check (status in ('unpaid', 'paid', 'overdue', 'void')),
  due_date date,
  created_at timestamptz not null default now()
);

create index if not exists invoices_customer_id_idx on public.invoices (customer_id);
create index if not exists invoices_booking_id_idx on public.invoices (booking_id);

create or replace function public.set_invoice_number()
returns trigger
language plpgsql
as $$
begin
  if new.invoice_number is null then
    new.invoice_number := 'INV-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.invoice_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_invoice_number on public.invoices;
create trigger trg_set_invoice_number before insert on public.invoices
  for each row execute function public.set_invoice_number();

-- =====================================================================
-- 9. service_reviews
-- =====================================================================
create table if not exists public.service_reviews (
  id bigint generated always as identity primary key,
  customer_id bigint not null references public.customer_profiles (id) on delete cascade,
  booking_id bigint not null references public.bookings (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  unique (booking_id)
);

create index if not exists service_reviews_customer_id_idx on public.service_reviews (customer_id);
create index if not exists service_reviews_booking_id_idx on public.service_reviews (booking_id);

-- =====================================================================
-- 10. support_tickets + support_ticket_messages
-- =====================================================================
create table if not exists public.support_tickets (
  id bigint generated always as identity primary key,
  customer_id bigint not null references public.customer_profiles (id) on delete cascade,
  booking_id bigint references public.bookings (id) on delete set null,
  subject text not null,
  description text not null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed')),
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_customer_id_idx on public.support_tickets (customer_id);

drop trigger if exists set_updated_at on public.support_tickets;
create trigger set_updated_at before update on public.support_tickets
  for each row execute function public.trg_set_updated_at();

create table if not exists public.support_ticket_messages (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references public.support_tickets (id) on delete cascade,
  profile_id bigint references public.profiles (id) on delete set null,
  sender_type text not null default 'customer' check (sender_type in ('customer', 'staff')),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_messages_ticket_id_idx on public.support_ticket_messages (ticket_id);

-- =====================================================================
-- 11. notifications
-- =====================================================================
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  profile_id bigint not null references public.profiles (id) on delete cascade,
  type text not null check (
    type in (
      'booking_confirmed', 'cleaner_assigned', 'service_reminder', 'booking_completed',
      'payment_received', 'invoice_generated', 'support_update', 'promotional'
    )
  ),
  title text not null,
  message text not null,
  is_read boolean not null default false,
  related_booking_id bigint references public.bookings (id) on delete set null,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Invites table (invite links for referral/invite-a-friend flows)
-- =====================================================================
create table if not exists public.invites (
  id bigint generated always as identity primary key,
  token text not null unique,
  inviter_profile_id bigint references public.profiles (id) on delete set null,
  invitee_email text,
  used boolean not null default false,
  used_by_profile_id bigint references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists invites_inviter_idx on public.invites (inviter_profile_id);

alter table public.invites enable row level security;

drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites for select to authenticated
  using (inviter_profile_id = private.current_profile_id() or private.is_admin());

drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites for insert to authenticated
  with check (inviter_profile_id = private.current_profile_id() or private.is_admin());

drop policy if exists invites_update on public.invites;
create policy invites_update on public.invites for update to authenticated
  using (inviter_profile_id = private.current_profile_id() or private.is_admin())
  with check (inviter_profile_id = private.current_profile_id() or private.is_admin());

-- =====================================================================
-- Price plans (admin-managed pricing plans for the Payments page)
-- =====================================================================
create table if not exists public.price_plans (
  id bigint generated always as identity primary key,
  name text not null,
  price numeric(12,2) not null,
  currency text not null default 'NGN',
  features text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.price_plans enable row level security;

drop policy if exists price_plans_select on public.price_plans;
create policy price_plans_select on public.price_plans for select to authenticated
  using (is_active = true or private.is_admin());

drop policy if exists price_plans_write on public.price_plans;
create policy price_plans_write on public.price_plans for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create index if not exists notifications_profile_id_idx on public.notifications (profile_id);
create index if not exists notifications_unread_idx on public.notifications (profile_id, is_read) where is_read = false;

-- Seed price plans
insert into public.price_plans (name, price, currency, features)
values
  ('Starter Plan', 59999, 'NGN', ARRAY[
    'Up to 1 bedroom, 1 kitchen', 'Maximum (1) restroom per visit', 'Standard cleaning checklist', 'Weekly or 4x-monthly visits', 'Eco-friendly products', 'Bespoke indoor cleaning', 'Shared cleaning team', 'Bespoke outdoor cleaning', 'Emergency addons cleaning'
  ]),
  ('Essential Plan', 99999, 'NGN', ARRAY[
    'Up to 2 bedrooms, 1 kitchen', 'Maximum (2) restrooms per visit', 'Standard cleaning checklist', 'Weekly or 4x-monthly visits', 'Eco-friendly products', 'Bespoke indoor cleaning', 'Dedicated cleaning team', 'Soft-upholsteries cleaning', 'Bespoke outdoor cleaning', 'Emergency addons cleaning'
  ]),
  ('Signature Plan', 199999, 'NGN', ARRAY[
    'Up to 4 bedrooms, 3 restrooms', 'Deep-clean checklist add-ons', 'Weekly or 4x-monthly visits', 'Eco-friendly products', 'Bespoke indoor sanitation', 'Hard-upholsteries cleaning', 'On-demand surface whitening', 'Bespoke outdoor sanitation', 'Emergency addons cleaning', 'Priority scheduling & maintenance'
  ]),
  ('Deluxe Plan', 299999, 'NGN', ARRAY[
    'Up to 5 bedrooms, 4 restrooms', 'Deep-clean checklist add-ons', 'Weekly or 4x-monthly visits', 'Eco-friendly products', 'Bespoke indoor sanitation', 'Hard-upholsteries cleaning', 'On-demand surface whitening', 'Bespoke outdoor sanitation', 'Emergency addons cleaning', 'Priority scheduling & maintenance'
  ]),
  ('Estate Plan', 399999, 'NGN', ARRAY[
    'Up to 7 bedrooms, 5 restrooms', 'Deep-clean checklist add-ons', 'Weekly or 4x-monthly visits', 'Eco-friendly products', 'Bespoke all-round sanitation', 'Deep upholsteries cleaning', 'On-demand surface whitening', 'Emergency addons cleaning', 'On-demand laundry addons services', 'Priority scheduling & maintenance'
  ]),
  ('Platinum Plan', 699999, 'NGN', ARRAY[
    'Unlimited bedrooms & restrooms', 'Deep-clean checklist add-ons', 'Bi-weekly or 8x-monthly visits', 'Eco-friendly products', 'Bespoke all-round sanitation', 'Deep upholsteries cleaning', 'On-demand surface whitening', 'Emergency addons cleaning', 'On-demand laundry addons services', 'Dedicated account manager'
  ])
on conflict (name) do nothing;

-- =====================================================================
-- Price enquiries (submitted by users for public properties)
-- =====================================================================
create table if not exists public.price_enquiries (
  id bigint generated always as identity primary key,
  customer_id bigint references public.customer_profiles (id) on delete set null,
  name text,
  email text,
  phone text,
  details text,
  created_at timestamptz not null default now()
);

alter table public.price_enquiries enable row level security;

drop policy if exists price_enquiries_select on public.price_enquiries;
create policy price_enquiries_select on public.price_enquiries for select to authenticated
  using (customer_id = private.current_customer_id() or private.is_admin());

drop policy if exists price_enquiries_insert on public.price_enquiries;
create policy price_enquiries_insert on public.price_enquiries for insert to authenticated
  with check (customer_id = private.current_customer_id() or customer_id is null);

-- =====================================================================
-- Private RLS helper functions (security definer, explicit auth.uid() check)
-- =====================================================================
create or replace function private.current_profile_id()
returns bigint
language sql
security definer
set search_path = ''
stable
as $$
  select id from public.profiles where user_id = (select auth.uid());
$$;

create or replace function private.current_customer_id()
returns bigint
language sql
security definer
set search_path = ''
stable
as $$
  select cp.id
  from public.customer_profiles cp
  join public.profiles p on p.id = cp.profile_id
  where p.user_id = (select auth.uid());
$$;

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where user_id = (select auth.uid()) and role in ('admin', 'staff')
  );
$$;

revoke execute on function private.current_profile_id() from public, anon, authenticated;
revoke execute on function private.current_customer_id() from public, anon, authenticated;
revoke execute on function private.is_admin() from public, anon, authenticated;
grant execute on function private.current_profile_id() to authenticated;
grant execute on function private.current_customer_id() to authenticated;
grant execute on function private.is_admin() to authenticated;

-- =====================================================================
-- handle_new_user: creates profile + customer_profile + address +
-- notification_preferences from auth.users.raw_user_meta_data
-- (populated by the client during supabase.auth.signUp()).
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := new.raw_user_meta_data;
  new_profile_id bigint;
  inviter_id bigint;
begin
  insert into public.profiles (
    user_id, first_name, last_name, email, phone, date_of_birth, gender
  ) values (
    new.id,
    coalesce(meta ->> 'first_name', ''),
    coalesce(meta ->> 'last_name', ''),
    new.email,
    meta ->> 'phone',
    nullif(meta ->> 'date_of_birth', '')::date,
    nullif(meta ->> 'gender', '')
  )
  returning id into new_profile_id;

  insert into public.customer_profiles (profile_id) values (new_profile_id);

  insert into public.notification_preferences (
    profile_id, email_notifications, sms_notifications, marketing_notifications
  ) values (
    new_profile_id,
    coalesce((meta ->> 'email_notifications')::boolean, true),
    coalesce((meta ->> 'sms_notifications')::boolean, false),
    coalesce((meta ->> 'marketing_notifications')::boolean, false)
  );

  if coalesce(meta ->> 'address_line', '') <> '' then
    insert into public.addresses (
      profile_id, address_type, address_line, city, state, country, postal_code, is_default
    ) values (
      new_profile_id, 'home',
      meta ->> 'address_line', meta ->> 'city', meta ->> 'state',
      coalesce(meta ->> 'country', ''), meta ->> 'postal_code', true
    );
  end if;

  -- If an invite token was supplied during signup, mark the invite used and populate invited_by
  if coalesce(meta ->> 'invite_token', '') <> '' then
    update public.invites set used = true, used_by_profile_id = new_profile_id
    where token = meta ->> 'invite_token' and used = false
    returning inviter_profile_id into inviter_id;
    -- set invited_by on the customer_profiles row we created
    update public.customer_profiles set invited_by_profile_id = inviter_id
      where profile_id = new_profile_id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.cleaning_services enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.invoices enable row level security;
alter table public.service_reviews enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
alter table public.notifications enable row level security;

-- profiles: own row only (+ admin/staff can view & update all)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id or private.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id or private.is_admin())
  with check ((select auth.uid()) = user_id or private.is_admin());

-- customer_profiles
drop policy if exists customer_profiles_select on public.customer_profiles;
create policy customer_profiles_select on public.customer_profiles for select to authenticated
  using (profile_id = private.current_profile_id() or private.is_admin());

drop policy if exists customer_profiles_update on public.customer_profiles;
create policy customer_profiles_update on public.customer_profiles for update to authenticated
  using (profile_id = private.current_profile_id() or private.is_admin())
  with check (profile_id = private.current_profile_id() or private.is_admin());

-- addresses
drop policy if exists addresses_select on public.addresses;
create policy addresses_select on public.addresses for select to authenticated
  using (profile_id = private.current_profile_id() or private.is_admin());

drop policy if exists addresses_insert on public.addresses;
create policy addresses_insert on public.addresses for insert to authenticated
  with check (profile_id = private.current_profile_id());

drop policy if exists addresses_update on public.addresses;
create policy addresses_update on public.addresses for update to authenticated
  using (profile_id = private.current_profile_id() or private.is_admin())
  with check (profile_id = private.current_profile_id() or private.is_admin());

drop policy if exists addresses_delete on public.addresses;
create policy addresses_delete on public.addresses for delete to authenticated
  using (profile_id = private.current_profile_id());

-- notification_preferences
drop policy if exists notification_preferences_select on public.notification_preferences;
create policy notification_preferences_select on public.notification_preferences for select to authenticated
  using (profile_id = private.current_profile_id() or private.is_admin());

drop policy if exists notification_preferences_update on public.notification_preferences;
create policy notification_preferences_update on public.notification_preferences for update to authenticated
  using (profile_id = private.current_profile_id())
  with check (profile_id = private.current_profile_id());

-- cleaning_services: readable by any authenticated user, writable only by admin/staff
drop policy if exists cleaning_services_select on public.cleaning_services;
create policy cleaning_services_select on public.cleaning_services for select to authenticated
  using (is_active = true or private.is_admin());

drop policy if exists cleaning_services_write on public.cleaning_services;
create policy cleaning_services_write on public.cleaning_services for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- bookings
drop policy if exists bookings_select on public.bookings;
create policy bookings_select on public.bookings for select to authenticated
  using (customer_id = private.current_customer_id() or private.is_admin());

drop policy if exists bookings_insert on public.bookings;
create policy bookings_insert on public.bookings for insert to authenticated
  with check (customer_id = private.current_customer_id());

drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings for update to authenticated
  using (customer_id = private.current_customer_id() or private.is_admin())
  with check (customer_id = private.current_customer_id() or private.is_admin());

-- payments (read-only for customers; writes come from admin/payment processing)
drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments for select to authenticated
  using (customer_id = private.current_customer_id() or private.is_admin());

drop policy if exists payments_write on public.payments;
create policy payments_write on public.payments for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- invoices (read-only for customers)
drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices for select to authenticated
  using (customer_id = private.current_customer_id() or private.is_admin());

drop policy if exists invoices_write on public.invoices;
create policy invoices_write on public.invoices for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- service_reviews
drop policy if exists service_reviews_select on public.service_reviews;
create policy service_reviews_select on public.service_reviews for select to authenticated
  using (customer_id = private.current_customer_id() or private.is_admin());

drop policy if exists service_reviews_insert on public.service_reviews;
create policy service_reviews_insert on public.service_reviews for insert to authenticated
  with check (customer_id = private.current_customer_id());

drop policy if exists service_reviews_update on public.service_reviews;
create policy service_reviews_update on public.service_reviews for update to authenticated
  using (customer_id = private.current_customer_id())
  with check (customer_id = private.current_customer_id());

-- support_tickets
drop policy if exists support_tickets_select on public.support_tickets;
create policy support_tickets_select on public.support_tickets for select to authenticated
  using (customer_id = private.current_customer_id() or private.is_admin());

drop policy if exists support_tickets_insert on public.support_tickets;
create policy support_tickets_insert on public.support_tickets for insert to authenticated
  with check (customer_id = private.current_customer_id());

drop policy if exists support_tickets_update on public.support_tickets;
create policy support_tickets_update on public.support_tickets for update to authenticated
  using (customer_id = private.current_customer_id() or private.is_admin())
  with check (customer_id = private.current_customer_id() or private.is_admin());

-- support_ticket_messages
drop policy if exists support_ticket_messages_select on public.support_ticket_messages;
create policy support_ticket_messages_select on public.support_ticket_messages for select to authenticated
  using (
    private.is_admin() or exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.customer_id = private.current_customer_id()
    )
  );

drop policy if exists support_ticket_messages_insert on public.support_ticket_messages;
create policy support_ticket_messages_insert on public.support_ticket_messages for insert to authenticated
  with check (
    private.is_admin() or exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.customer_id = private.current_customer_id()
    )
  );

-- notifications
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using (profile_id = private.current_profile_id() or private.is_admin());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using (profile_id = private.current_profile_id())
  with check (profile_id = private.current_profile_id());

drop policy if exists notifications_write_admin on public.notifications;
create policy notifications_write_admin on public.notifications for insert to authenticated
  with check (private.is_admin());

-- =====================================================================
-- newsletter_subscribers  (public marketing opt-in — not tied to auth.users)
-- =====================================================================
create table if not exists public.newsletter_subscribers (
  id bigint generated always as identity primary key,
  email text not null unique,
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

alter table public.newsletter_subscribers enable row level security;

-- Intentionally no client-facing policies: with RLS enabled and zero policies,
-- anon/authenticated clients get zero access. Only the subscribe-newsletter
-- Edge Function (using the service_role key, which bypasses RLS) may write here.

-- =====================================================================
-- Seed: cleaning services catalog
-- =====================================================================
insert into public.cleaning_services (name, slug, description, base_price, price_unit, estimated_duration_minutes, display_order)
values
  ('Standard Cleaning', 'standard-cleaning', 'Routine cleaning for everyday upkeep of your home.', 15000, 'flat', 120, 1),
  ('Deep Cleaning', 'deep-cleaning', 'Thorough top-to-bottom cleaning including hard-to-reach areas.', 30000, 'flat', 240, 2),
  ('Move-In Cleaning', 'move-in-cleaning', 'Get a new space spotless before you move in.', 35000, 'flat', 240, 3),
  ('Move-Out Cleaning', 'move-out-cleaning', 'Leave your old space spotless for inspection or handover.', 35000, 'flat', 240, 4),
  ('Office Cleaning', 'office-cleaning', 'Professional cleaning for offices and commercial spaces.', 25000, 'flat', 180, 5),
  ('Post-Construction Cleaning', 'post-construction-cleaning', 'Detailed cleanup after renovation or construction work.', 50000, 'flat', 360, 6),
  ('Airbnb Cleaning', 'airbnb-cleaning', 'Fast turnaround cleaning between short-let guest stays.', 20000, 'flat', 150, 7),
  ('Recurring Cleaning', 'recurring-cleaning', 'Scheduled weekly, bi-weekly or monthly cleaning plans.', 12000, 'flat', 120, 8),
  ('Special Event Cleaning', 'special-event-cleaning', 'Before/after cleaning for parties and events.', 28000, 'flat', 200, 9)
on conflict (slug) do nothing;
