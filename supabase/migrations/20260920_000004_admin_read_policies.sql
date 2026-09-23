-- Admin read access for operational dashboards.
create policy "admin counselors read" on public.counselor_profiles
for select using (public.is_admin());

create policy "admin consultations read" on public.consultations
for select using (public.is_admin());

create policy "admin payments read" on public.payments
for select using (public.is_admin());

create policy "admin ratings read" on public.ratings
for select using (public.is_admin());

create policy "admin blocks read" on public.blocks
for select using (public.is_admin());

create policy "admin notification prefs read" on public.notification_preferences
for select using (public.is_admin());
