-- DUGSI PRO 2026 - Students module hardening
-- Safe/idempotent migration applied to the active Supabase project.

create table if not exists public.dugsiga_student_audit (
  id uuid primary key default gen_random_uuid(),
  school_id text not null,
  student_id text not null,
  action text not null check (action in ('created','updated','archived','restored','deleted')),
  actor_email text,
  actor_role text,
  changed_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_dugsiga_student_audit_school_student
  on public.dugsiga_student_audit (school_id, student_id, created_at desc);

create index if not exists idx_dugsiga_student_audit_school_action
  on public.dugsiga_student_audit (school_id, action, created_at desc);

create unique index if not exists uq_dugsiga_students_school_national_id
  on public.dugsiga_students (school_id, lower(btrim(national_id)))
  where national_id is not null and btrim(national_id) <> '';

alter table public.dugsiga_student_audit enable row level security;
revoke all on table public.dugsiga_student_audit from public, anon, authenticated;
grant all on table public.dugsiga_student_audit to service_role;

drop policy if exists service_role_only on public.dugsiga_student_audit;
create policy service_role_only
  on public.dugsiga_student_audit
  for all
  to service_role
  using (true)
  with check (true);
