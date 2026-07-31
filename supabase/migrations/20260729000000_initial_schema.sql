-- Initial schema for FactoPro (Next.js + Supabase migration)
-- Recreates the schema of backend/app/models/*.py using native Postgres types.

create extension if not exists pgcrypto;

-- profiles: extends auth.users (1:1), replaces the old `users` table.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  company_name text,
  siret text,
  phone text,
  address text,
  logo_url text,
  vat_number text,
  iban text,
  bic text,
  default_vat_rate numeric(5, 2) not null default 20.0,
  payment_terms int not null default 30,
  plan text not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  pdf_color text not null default '#13283C',
  legal_mentions text,
  reminder_days jsonb not null default '[7,14,30]',
  reminder_repeat_days int not null default 30,
  micro_enterprise boolean not null default true,
  urssaf_period text not null default 'monthly',
  urssaf_rate numeric(5, 2) not null default 21.2,
  versement_liberatoire boolean not null default false,
  income_tax_rate numeric(5, 2) not null default 1.7,
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null default 'individual',
  name text not null,
  company_name text,
  email text,
  phone text,
  address text,
  siret text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  name text not null,
  description text,
  address text,
  status text not null default 'active',
  start_date date,
  end_date date,
  budget numeric(10, 2),
  notes text,
  created_at timestamptz not null default now()
);

create table public.project_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text,
  photos jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  unit text not null default 'u',
  unit_price numeric(10, 2) not null,
  vat_rate numeric(5, 2) not null default 10,
  category text,
  created_at timestamptz not null default now()
);

create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  kind text not null default 'percent',
  value numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  number text,
  status text not null default 'draft',
  title text,
  description text,
  items jsonb not null default '[]',
  subtotal numeric(10, 2) not null default 0,
  discount_amount numeric(10, 2) not null default 0,
  vat_amount numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  discount_kind text,
  discount_value numeric(10, 2),
  discount_label text,
  valid_until date,
  notes text,
  pdf_url text,
  sent_at timestamptz,
  accepted_at timestamptz,
  refused_at timestamptz,
  reminder_sent_at timestamptz,
  public_token uuid not null default gen_random_uuid(),
  signature_name text,
  accepted_ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotes_user_number_unique unique (user_id, number),
  constraint quotes_public_token_unique unique (public_token)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  quote_id uuid references public.quotes (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  parent_invoice_id uuid references public.invoices (id) on delete set null,
  kind text not null default 'invoice',
  number text,
  status text not null default 'draft',
  title text,
  items jsonb not null default '[]',
  subtotal numeric(10, 2) not null default 0,
  discount_amount numeric(10, 2) not null default 0,
  vat_amount numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  amount_paid numeric(10, 2) not null default 0,
  due_date date,
  payment_method text,
  notes text,
  pdf_url text,
  sent_at timestamptz,
  paid_at timestamptz,
  reminder_count int not null default 0,
  last_reminder_at timestamptz,
  deposit_deducted numeric(10, 2),
  deposit_reference text,
  created_at timestamptz not null default now(),
  constraint invoices_user_number_unique unique (user_id, number)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  amount numeric(10, 2) not null,
  payment_method text,
  paid_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  title text not null,
  kind text not null default 'rdv',
  "start" timestamptz not null,
  "end" timestamptz,
  all_day boolean not null default false,
  location text,
  notes text,
  reminder_minutes int,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  category text,
  label text not null,
  amount numeric(10, 2) not null,
  vat_amount numeric(10, 2),
  receipt_url text,
  date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.email_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null,
  email text not null,
  refresh_token text,
  access_token text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint email_accounts_user_id_unique unique (user_id)
);

-- Indexes on the foreign keys used for RLS / lookups.
create index clients_user_id_idx on public.clients (user_id);
create index projects_user_id_idx on public.projects (user_id);
create index projects_client_id_idx on public.projects (client_id);
create index project_logs_project_id_idx on public.project_logs (project_id);
create index catalog_items_user_id_idx on public.catalog_items (user_id);
create index discounts_user_id_idx on public.discounts (user_id);
create index quotes_user_id_idx on public.quotes (user_id);
create index invoices_user_id_idx on public.invoices (user_id);
create index invoices_quote_id_idx on public.invoices (quote_id);
create index payments_invoice_id_idx on public.payments (invoice_id);
create index appointments_user_id_idx on public.appointments (user_id);
create index expenses_user_id_idx on public.expenses (user_id);

-- Trigger: create a profile row automatically when a new auth.users row is inserted.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep quotes.updated_at current on every update.
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger quotes_set_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();
