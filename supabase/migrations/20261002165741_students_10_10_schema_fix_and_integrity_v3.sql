
alter table public.dugsiga_students
  add column if not exists updated_at text;

update public.dugsiga_students
set updated_at = coalesce(nullif(btrim(updated_at), ''), nullif(btrim(created_at), ''), to_char(current_date, 'YYYY-MM-DD'))
where updated_at is null or btrim(updated_at) = '';

alter table public.dugsiga_students
  alter column updated_at set default to_char(current_date, 'YYYY-MM-DD');

alter table public.dugsiga_students
  add constraint dugsiga_students_full_name_valid
    check (char_length(btrim(full_name)) between 1 and 160),
  add constraint dugsiga_students_class_valid
    check (char_length(btrim(class)) between 1 and 120),
  add constraint dugsiga_students_gender_valid
    check (gender is null or gender in ('Male','Female')),
  add constraint dugsiga_students_status_valid
    check (status is null or status in ('active','inactive','archived')),
  add constraint dugsiga_students_guardian_phone_valid
    check (guardian_phone is null or guardian_phone = '' or guardian_phone ~ '^[+0-9()[:space:].-]{7,30}$'),
  add constraint dugsiga_students_guardian_phone_alt_valid
    check (guardian_phone_alt is null or guardian_phone_alt = '' or guardian_phone_alt ~ '^[+0-9()[:space:].-]{7,30}$'),
  add constraint dugsiga_students_dob_valid
    check (date_of_birth is null or date_of_birth = '' or date_of_birth ~ '^\d{4}-\d{2}-\d{2}$'),
  add constraint dugsiga_students_created_at_valid
    check (created_at is null or created_at = '' or created_at ~ '^\d{4}-\d{2}-\d{2}$'),
  add constraint dugsiga_students_updated_at_valid
    check (updated_at is null or updated_at = '' or updated_at ~ '^\d{4}-\d{2}-\d{2}$'),
  add constraint dugsiga_students_section_length_valid
    check (section is null or char_length(section) <= 50),
  add constraint dugsiga_students_roll_length_valid
    check (roll_number is null or char_length(roll_number) <= 50),
  add constraint dugsiga_students_national_id_length_valid
    check (national_id is null or char_length(national_id) <= 80);

drop index if exists public.uq_dugsiga_students_school_roll;

create unique index if not exists uq_dugsiga_students_school_class_section_roll
  on public.dugsiga_students (
    school_id,
    lower(btrim(class)),
    lower(btrim(coalesce(section,''))),
    lower(btrim(roll_number))
  )
  where roll_number is not null and btrim(roll_number) <> '';

create index if not exists idx_dugsiga_students_school_status_class
  on public.dugsiga_students (school_id, status, class);

create index if not exists idx_dugsiga_students_school_updated_at
  on public.dugsiga_students (school_id, updated_at);
