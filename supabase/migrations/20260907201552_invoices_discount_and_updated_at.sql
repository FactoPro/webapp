-- Aligne `invoices` sur `quotes` pour la conversion devis → facture (FAC-28)
-- et l'édition ultérieure : on garde le détail de la remise (kind/value/label)
-- en plus du montant déjà figé, et on suit `updated_at`.

alter table public.invoices
  add column if not exists discount_kind text,
  add column if not exists discount_value numeric(10, 2),
  add column if not exists discount_label text,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();
