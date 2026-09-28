-- Additional nullable reviewer/update references needed for complete account deletion.

alter table public.reports drop constraint if exists reports_reviewed_by_fkey;
alter table public.reports
  add constraint reports_reviewed_by_fkey foreign key(reviewed_by) references public.profiles(id) on delete set null;

alter table public.app_settings drop constraint if exists app_settings_updated_by_fkey;
alter table public.app_settings
  add constraint app_settings_updated_by_fkey foreign key(updated_by) references public.profiles(id) on delete set null;
