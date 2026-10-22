
alter table public.dugsiga_attendance
  drop constraint if exists dugsiga_attendance_status_valid,
  drop constraint if exists dugsiga_attendance_date_valid,
  drop constraint if exists dugsiga_attendance_session_valid;

alter table public.dugsiga_attendance
  add constraint dugsiga_attendance_status_valid
    check (status in ('Present','Absent','Late','Excused')),
  add constraint dugsiga_attendance_date_valid
    check (date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  add constraint dugsiga_attendance_session_valid
    check (session_type in ('before_break','after_break'));

create index if not exists idx_dugsiga_attendance_school_student_date
  on public.dugsiga_attendance (school_id, student_id, date desc);

create index if not exists idx_dugsiga_attendance_school_date_session
  on public.dugsiga_attendance (school_id, date, session_type);
