-- Scope RLS policies to intended roles and cache auth helper evaluation per statement.
do $$
declare
  r record;
  stmt text;
  q text;
  c text;
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname='public'
  loop
    stmt := format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);

    if (r.tablename='counselor_profiles' and r.policyname='public approved counselors read')
       or (r.tablename='counselor_availability' and r.policyname='availability public read')
       or (r.tablename='app_settings' and r.policyname='public app settings read') then
      stmt := stmt || ' to anon, authenticated';
    else
      stmt := stmt || ' to authenticated';
    end if;

    if r.qual is not null then
      q := r.qual;
      q := replace(q, 'auth.uid()', '(select auth.uid())');
      q := replace(q, 'is_current_user_active()', '(select is_current_user_active())');
      q := replace(q, 'is_admin()', '(select is_admin())');

      if r.tablename='app_settings' and r.policyname='public app settings read' then
        q := '(key in (''maintenance'',''announcement''))';
      end if;

      stmt := stmt || ' using (' || q || ')';
    end if;

    if r.with_check is not null then
      c := r.with_check;
      c := replace(c, 'auth.uid()', '(select auth.uid())');
      c := replace(c, 'is_current_user_active()', '(select is_current_user_active())');
      c := replace(c, 'is_admin()', '(select is_admin())');
      stmt := stmt || ' with check (' || c || ')';
    end if;

    execute stmt;
  end loop;
end $$;
