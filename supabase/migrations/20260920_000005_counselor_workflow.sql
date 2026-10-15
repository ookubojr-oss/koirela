-- Counselor application lifecycle.

create or replace function public.ensure_counselor_availability()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.counselor_availability(counselor_id,is_accepting)
  values(new.user_id,false)
  on conflict (counselor_id) do nothing;
  return new;
end;
$$;

drop trigger if exists counselor_profile_availability on public.counselor_profiles;
create trigger counselor_profile_availability
after insert on public.counselor_profiles
for each row execute procedure public.ensure_counselor_availability();

create or replace function public.admin_review_counselor(
  p_counselor_id uuid,
  p_status public.verification_status,
  p_qualification_label text default null
) returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;
  if p_status not in ('approved','rejected','pending') then raise exception 'Invalid review status'; end if;

  update public.counselor_profiles
  set verification_status=p_status,
      qualification_label=coalesce(p_qualification_label,qualification_label),
      updated_at=now()
  where user_id=p_counselor_id;

  update public.identity_verifications
  set status=p_status,
      reviewed_at=now()
  where counselor_id=p_counselor_id;

  if p_status <> 'approved' then
    update public.counselor_availability
    set is_accepting=false,updated_at=now()
    where counselor_id=p_counselor_id;
  end if;

  insert into public.admin_audit_logs(admin_id,action,target_type,target_id,metadata)
  values(
    auth.uid(),
    'review_counselor',
    'counselor',
    p_counselor_id::text,
    jsonb_build_object('status',p_status,'qualification_label',p_qualification_label)
  );
end;
$$;
