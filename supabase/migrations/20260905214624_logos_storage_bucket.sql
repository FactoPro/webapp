-- Bucket public pour les logos d'artisan (affichés sur devis / factures / PDF).
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Lecture publique (le logo apparaît sur des documents partagés).
create policy "logos_public_read"
  on storage.objects for select
  using (bucket_id = 'logos');

-- Chaque utilisateur ne peut écrire que dans son propre dossier: logos/<uid>/...
create policy "logos_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "logos_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "logos_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
