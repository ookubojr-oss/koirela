-- Account deletion hardening and refund bookkeeping.

alter table public.payments
  add column if not exists provider_refund_id text,
  add column if not exists refunded_payment_intent_id text;

create unique index if not exists payments_provider_refund_id_idx
on public.payments(provider_refund_id)
where provider_refund_id is not null;

create unique index if not exists payments_refunded_intent_idx
on public.payments(refunded_payment_intent_id)
where refunded_payment_intent_id is not null;

-- Preserve legally/operationally required transaction records without retaining
-- a deleted account identifier.
alter table public.consultations drop constraint if exists consultations_user_id_fkey;
alter table public.consultations drop constraint if exists consultations_counselor_id_fkey;
alter table public.consultations alter column user_id drop not null;
alter table public.consultations alter column counselor_id drop not null;
alter table public.consultations
  add constraint consultations_user_id_fkey foreign key(user_id) references public.profiles(id) on delete set null;
alter table public.consultations
  add constraint consultations_counselor_id_fkey foreign key(counselor_id) references public.counselor_profiles(user_id) on delete set null;

alter table public.payments drop constraint if exists payments_payer_id_fkey;
alter table public.payments alter column payer_id drop not null;
alter table public.payments
  add constraint payments_payer_id_fkey foreign key(payer_id) references public.profiles(id) on delete set null;

alter table public.messages drop constraint if exists messages_sender_id_fkey;
alter table public.messages alter column sender_id drop not null;
alter table public.messages
  add constraint messages_sender_id_fkey foreign key(sender_id) references public.profiles(id) on delete set null;

alter table public.reports drop constraint if exists reports_reporter_id_fkey;
alter table public.reports drop constraint if exists reports_counselor_id_fkey;
alter table public.reports alter column reporter_id drop not null;
alter table public.reports
  add constraint reports_reporter_id_fkey foreign key(reporter_id) references public.profiles(id) on delete set null;
alter table public.reports
  add constraint reports_counselor_id_fkey foreign key(counselor_id) references public.counselor_profiles(user_id) on delete set null;

alter table public.moderation_events drop constraint if exists moderation_events_counselor_id_fkey;
alter table public.moderation_events drop constraint if exists moderation_events_reviewed_by_fkey;
alter table public.moderation_events alter column counselor_id drop not null;
alter table public.moderation_events
  add constraint moderation_events_counselor_id_fkey foreign key(counselor_id) references public.counselor_profiles(user_id) on delete set null;
alter table public.moderation_events
  add constraint moderation_events_reviewed_by_fkey foreign key(reviewed_by) references public.profiles(id) on delete set null;

alter table public.admin_audit_logs drop constraint if exists admin_audit_logs_admin_id_fkey;
alter table public.admin_audit_logs alter column admin_id drop not null;
alter table public.admin_audit_logs
  add constraint admin_audit_logs_admin_id_fkey foreign key(admin_id) references public.profiles(id) on delete set null;

alter table public.payouts drop constraint if exists payouts_counselor_id_fkey;
alter table public.payouts alter column counselor_id drop not null;
alter table public.payouts
  add constraint payouts_counselor_id_fkey foreign key(counselor_id) references public.counselor_profiles(user_id) on delete set null;
