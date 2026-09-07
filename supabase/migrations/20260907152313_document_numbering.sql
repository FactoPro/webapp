-- Compteurs séquentiels par (utilisateur, type de document, année).
-- Utilisé pour la numérotation légale DEV-YYYY-NNN (devis), FAC-YYYY-NNN, etc.
create table public.document_counters (
  user_id uuid not null references public.profiles (id) on delete cascade,
  doc_type text not null,
  year int not null,
  last_seq int not null default 0,
  primary key (user_id, doc_type, year)
);

alter table public.document_counters enable row level security;
-- Aucune policy : la table n'est accessible que via la fonction SECURITY DEFINER.

-- Renvoie le prochain numéro « <prefix>-<année>-<NNN> » pour l'utilisateur courant.
-- L'upsert atomique + le verrou de ligne garantissent l'absence de collision
-- même sous forte concurrence.
create function public.next_document_number(p_doc_type text, p_prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year int := extract(year from (now() at time zone 'Europe/Paris'))::int;
  v_seq int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.document_counters (user_id, doc_type, year, last_seq)
  values (auth.uid(), p_doc_type, v_year, 1)
  on conflict (user_id, doc_type, year)
    do update set last_seq = document_counters.last_seq + 1
  returning last_seq into v_seq;

  return p_prefix || '-' || v_year::text || '-' || lpad(v_seq::text, 3, '0');
end;
$$;

revoke execute on function public.next_document_number(text, text) from public, anon;
grant execute on function public.next_document_number(text, text) to authenticated;
