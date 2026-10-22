
alter table public.dugsiga_students
  drop constraint if exists dugsiga_students_emergency_contact_valid;

alter table public.dugsiga_students
  add constraint dugsiga_students_emergency_contact_valid
  check (
    emergency_contact is null
    or emergency_contact = ''
    or emergency_contact ~ '^[+0-9()[:space:].-]{7,60}$'
  );
