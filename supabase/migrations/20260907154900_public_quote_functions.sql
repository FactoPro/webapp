-- Devis public (FAC-26) : lecture par token + acceptation / refus, sans auth.
-- Toutes SECURITY DEFINER, exécutables par anon (le token uuid fait office de secret).

drop function if exists public.get_public_quote(uuid);

-- Lecture : devis + identité de l'artisan émetteur (pour l'en-tête du document).
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
  discount_label text,
  vat_amount numeric,
  total numeric,
  valid_until date,
  notes text,
  pdf_url text,
  public_token uuid,
  issuer_name text,
  issuer_address text,
  issuer_siret text,
  issuer_vat_number text,
  issuer_iban text,
  issuer_bic text,
  issuer_logo_url text,
  issuer_legal_mentions text,
  issuer_pdf_color text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    q.id, q.number, q.status, q.title, q.description, q.items,
    q.subtotal, q.discount_amount, q.discount_label, q.vat_amount, q.total,
    q.valid_until, q.notes, q.pdf_url, q.public_token,
    coalesce(nullif(p.company_name, ''), trim(concat_ws(' ', p.first_name, p.last_name))) as issuer_name,
    p.address, p.siret, p.vat_number, p.iban, p.bic, p.logo_url, p.legal_mentions, p.pdf_color
  from public.quotes q
  join public.profiles p on p.id = q.user_id
  where q.public_token = p_token;
$function$;

revoke execute on function public.get_public_quote(uuid) from public;
grant execute on function public.get_public_quote(uuid) to anon, authenticated;

-- Acceptation : signature + IP. Échoue si le devis n'est plus « sent » (retry → erreur).
create or replace function public.accept_public_quote(
  p_token uuid,
  p_signature_name text,
  p_accepted_ip text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_status text;
begin
  select status into v_status from public.quotes where public_token = p_token;
  if v_status is null then
    raise exception 'quote_not_found' using errcode = 'no_data_found';
  end if;
  if v_status <> 'sent' then
    raise exception 'quote_not_pending' using errcode = 'invalid_parameter_value';
  end if;

  update public.quotes
  set status = 'accepted',
      accepted_at = now(),
      signature_name = p_signature_name,
      accepted_ip = p_accepted_ip
  where public_token = p_token;
end;
$function$;

-- Refus.
create or replace function public.refuse_public_quote(p_token uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_status text;
begin
  select status into v_status from public.quotes where public_token = p_token;
  if v_status is null then
    raise exception 'quote_not_found' using errcode = 'no_data_found';
  end if;
  if v_status <> 'sent' then
    raise exception 'quote_not_pending' using errcode = 'invalid_parameter_value';
  end if;

  update public.quotes
  set status = 'refused', refused_at = now()
  where public_token = p_token;
end;
$function$;

revoke execute on function public.refuse_public_quote(uuid) from public;
grant execute on function public.refuse_public_quote(uuid) to anon, authenticated;
