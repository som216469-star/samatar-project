
alter table public.dugsiga_student_audit
  add column if not exists before_data jsonb,
  add column if not exists after_data jsonb;

create index if not exists idx_dugsiga_student_audit_school_created
  on public.dugsiga_student_audit (school_id, created_at desc);
