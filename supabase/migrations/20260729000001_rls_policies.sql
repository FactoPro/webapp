-- RLS policies: strict per-artisan isolation (user_id = auth.uid()),
-- replacing the application-level user_id filtering from FastAPI.

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.project_logs enable row level security;
alter table public.catalog_items enable row level security;
alter table public.discounts enable row level security;
alter table public.quotes enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.appointments enable row level security;
alter table public.expenses enable row level security;
alter table public.email_accounts enable row level security;

-- profiles: a user can only read/update their own profile row.
-- (insert is done by the on_auth_user_created trigger, which runs as
-- security definer and therefore bypasses RLS.)
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Generic owner policy factory: user_id = auth.uid() on all CRUD ops,
-- for every table that has a direct user_id column.
do $$
declare
  t text;
  owner_tables constant text[] := array[
    'clients', 'projects', 'project_logs', 'catalog_items', 'discounts',
    'quotes', 'invoices', 'appointments', 'expenses', 'email_accounts'
  ];
begin
  foreach t in array owner_tables loop
    execute format(
      'create policy "%1$s_select_own" on public.%1$s for select using (user_id = auth.uid())',
      t
    );
    execute format(
      'create policy "%1$s_insert_own" on public.%1$s for insert with check (user_id = auth.uid())',
      t
    );
    execute format(
      'create policy "%1$s_update_own" on public.%1$s for update using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
    execute format(
      'create policy "%1$s_delete_own" on public.%1$s for delete using (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- payments: no direct user_id column, ownership is via the parent invoice.
create policy "payments_select_own" on public.payments
  for select using (
    exists (
      select 1 from public.invoices
      where invoices.id = payments.invoice_id
        and invoices.user_id = auth.uid()
    )
  );
create policy "payments_insert_own" on public.payments
  for insert with check (
    exists (
      select 1 from public.invoices
      where invoices.id = payments.invoice_id
        and invoices.user_id = auth.uid()
    )
  );
create policy "payments_update_own" on public.payments
  for update using (
    exists (
      select 1 from public.invoices
      where invoices.id = payments.invoice_id
        and invoices.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.invoices
      where invoices.id = payments.invoice_id
        and invoices.user_id = auth.uid()
    )
  );
create policy "payments_delete_own" on public.payments
  for delete using (
    exists (
      select 1 from public.invoices
      where invoices.id = payments.invoice_id
        and invoices.user_id = auth.uid()
    )
  );

-- Public quote acceptance page: unauthenticated access by public_token only.
-- We deliberately do NOT add a blanket anon SELECT policy on quotes (that
-- would let anyone list every quote). Instead, expose a SECURITY DEFINER
-- RPC that returns only the columns needed by the public acceptance page
-- for a single quote, looked up by its (hard to guess) public_token.
create function public.get_public_quote(p_token uuid)
returns table (
  id uuid,
  number text,
  status text,
  title text,
  description text,
  items jsonb,
  subtotal numeric,
  discount_amount numeric,
  vat_amount numeric,
  total numeric,
  valid_until date,
  notes text,
  pdf_url text,
  public_token uuid
)
language sql
security definer
set search_path = public
stable
as $$
  select
    quotes.id, quotes.number, quotes.status, quotes.title, quotes.description,
    quotes.items, quotes.subtotal, quotes.discount_amount, quotes.vat_amount,
    quotes.total, quotes.valid_until, quotes.notes, quotes.pdf_url, quotes.public_token
  from public.quotes
  where quotes.public_token = p_token;
$$;

grant execute on function public.get_public_quote(uuid) to anon, authenticated;

-- Public quote signature: lets the public page record acceptance/refusal
-- without a session, still scoped strictly to the matching public_token.
create function public.accept_public_quote(
  p_token uuid,
  p_signature_name text,
  p_accepted_ip text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.quotes
  set status = 'accepted',
      accepted_at = now(),
      signature_name = p_signature_name,
      accepted_ip = p_accepted_ip
  where public_token = p_token
    and status = 'sent';
$$;

grant execute on function public.accept_public_quote(uuid, text, text) to anon, authenticated;
