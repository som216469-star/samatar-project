
create table if not exists public.dugsiga_attendance_audit (
  id uuid primary key default gen_random_uuid(),
  school_id text not null,
  attendance_date text not null,
  session_type text not null check (session_type in ('before_break','after_break')),
  student_id text not null,
  old_status text,
  new_status text not null check (new_status in ('Present','Absent','Late','Excused')),
  actor_email text,
  actor_role text,
  changed_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_dugsiga_attendance_audit_school_student_date
  on public.dugsiga_attendance_audit (school_id, student_id, attendance_date desc);

create index if not exists idx_dugsiga_attendance_audit_school_date
  on public.dugsiga_attendance_audit (school_id, attendance_date desc, session_type);

alter table public.dugsiga_attendance_audit enable row level security;
revoke all on table public.dugsiga_attendance_audit from public, anon, authenticated;
grant all on table public.dugsiga_attendance_audit to service_role;

drop policy if exists service_role_only on public.dugsiga_attendance_audit;
create policy service_role_only
  on public.dugsiga_attendance_audit
  for all
  to service_role
  using (true)
  with check (true);
