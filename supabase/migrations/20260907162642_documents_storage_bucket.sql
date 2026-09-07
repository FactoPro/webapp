-- Bucket pour les PDF générés (devis, plus tard factures / avoirs).
-- Public : les URLs contiennent un segment aléatoire non devinable et le PDF
-- devis est de toute façon partagé via la page publique (public_token).
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

create policy "documents_public_read"
  on storage.objects for select
  using (bucket_id = 'documents');

create policy "documents_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "documents_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "documents_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
