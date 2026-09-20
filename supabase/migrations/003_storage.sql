insert into storage.buckets (id, name, public)
values
  ('avatars','avatars',true),
  ('verification-docs','verification-docs',false)
on conflict (id) do nothing;

create policy avatars_public_read
on storage.objects for select
using (bucket_id='avatars');

create policy avatars_self_insert
on storage.objects for insert
with check (
  bucket_id='avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy avatars_self_update
on storage.objects for update
using (
  bucket_id='avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id='avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy avatars_self_delete
on storage.objects for delete
using (
  bucket_id='avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy verification_self_insert
on storage.objects for insert
with check (
  bucket_id='verification-docs'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy verification_owner_or_admin_read
on storage.objects for select
using (
  bucket_id='verification-docs'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_admin()
  )
);

create policy verification_owner_or_admin_delete
on storage.objects for delete
using (
  bucket_id='verification-docs'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_admin()
  )
);
