
alter table public.dugsiga_students
  drop constraint if exists dugsiga_students_dob_valid,
  drop constraint if exists dugsiga_students_created_at_valid;

alter table public.dugsiga_students
  add constraint dugsiga_students_dob_valid
    check (
      date_of_birth is null
      or date_of_birth = ''
      or date_of_birth ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    ),
  add constraint dugsiga_students_created_at_valid
    check (
      created_at is null
      or created_at = ''
      or created_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    );
