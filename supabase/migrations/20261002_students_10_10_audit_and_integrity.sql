-- DUGSI PRO 2026 - Students module production hardening
-- Idempotent migration. Safe to re-run against an existing installation.

-- ---------------------------------------------------------------------------
-- 1) Student audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.dugsiga_student_audit (
  id uuid primary key default gen_random_uuid(),
  school_id text not null,
  student_id text not null,
  action text not null check (action in ('created','updated','archived','restored','deleted')),
  actor_email text,
  actor_role text,
  changed_fields jsonb not null default '{}'::jsonb,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.dugsiga_student_audit
  add column if not exists before_data jsonb,
  add column if not exists after_data jsonb;

create index if not exists idx_dugsiga_student_audit_school_student
  on public.dugsiga_student_audit (school_id, student_id, created_at desc);

create index if not exists idx_dugsiga_student_audit_school_action
  on public.dugsiga_student_audit (school_id, action, created_at desc);

create index if not exists idx_dugsiga_student_audit_school_created
  on public.dugsiga_student_audit (school_id, created_at desc);

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

-- ---------------------------------------------------------------------------
-- 2) Student schema compatibility + integrity
-- ---------------------------------------------------------------------------
alter table public.dugsiga_students
  add column if not exists emergency_contact text,
  add column if not exists updated_at timestamptz;

-- Convert legacy date-only updated_at values if this column was previously text.
-- This block only runs when the column is still text.
do $convert_updated$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'dugsiga_students'
      and column_name = 'updated_at'
      and data_type = 'text'
  ) then
    alter table public.dugsiga_students
      alter column updated_at drop default;

    alter table public.dugsiga_students
      alter column updated_at type timestamptz
      using (
        case
          when nullif(btrim(updated_at), '') is null then null
          when updated_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
            then (updated_at || 'T00:00:00+00')::timestamptz
          else updated_at::timestamptz
        end
      );
  end if;
end
$convert_updated$;

update public.dugsiga_students
set
  gender = coalesce(nullif(btrim(gender), ''), 'Male'),
  guardian_phone = coalesce(guardian_phone, ''),
  status = coalesce(nullif(btrim(status), ''), 'active'),
  updated_at = coalesce(updated_at, now())
where
  gender is null
  or btrim(gender) = ''
  or guardian_phone is null
  or status is null
  or btrim(status) = ''
  or updated_at is null;

alter table public.dugsiga_students
  alter column gender set default 'Male',
  alter column guardian_phone set default '',
  alter column status set default 'active',
  alter column updated_at set default now(),
  alter column gender set not null,
  alter column guardian_phone set not null,
  alter column status set not null,
  alter column updated_at set not null;

-- Drop only the constraints created by this migration so they can be rebuilt
-- deterministically after a future schema repair.
alter table public.dugsiga_students
  drop constraint if exists dugsiga_students_full_name_valid,
  drop constraint if exists dugsiga_students_class_valid,
  drop constraint if exists dugsiga_students_gender_valid,
  drop constraint if exists dugsiga_students_status_valid,
  drop constraint if exists dugsiga_students_guardian_phone_valid,
  drop constraint if exists dugsiga_students_guardian_phone_alt_valid,
  drop constraint if exists dugsiga_students_emergency_contact_valid,
  drop constraint if exists dugsiga_students_dob_valid,
  drop constraint if exists dugsiga_students_created_at_valid,
  drop constraint if exists dugsiga_students_section_length_valid,
  drop constraint if exists dugsiga_students_roll_length_valid,
  drop constraint if exists dugsiga_students_national_id_length_valid;

alter table public.dugsiga_students
  add constraint dugsiga_students_full_name_valid
    check (char_length(btrim(full_name)) between 1 and 160),
  add constraint dugsiga_students_class_valid
    check (char_length(btrim(class)) between 1 and 120),
  add constraint dugsiga_students_gender_valid
    check (gender in ('Male','Female')),
  add constraint dugsiga_students_status_valid
    check (status in ('active','inactive','archived')),
  add constraint dugsiga_students_guardian_phone_valid
    check (guardian_phone = '' or guardian_phone ~ '^[+0-9()[:space:].-]{7,30}$'),
  add constraint dugsiga_students_guardian_phone_alt_valid
    check (
      guardian_phone_alt is null
      or guardian_phone_alt = ''
      or guardian_phone_alt ~ '^[+0-9()[:space:].-]{7,30}$'
    ),
  add constraint dugsiga_students_emergency_contact_valid
    check (
      emergency_contact is null
      or emergency_contact = ''
      or emergency_contact ~ '^[+0-9()[:space:].-]{7,60}$'
    ),
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
    ),
  add constraint dugsiga_students_section_length_valid
    check (section is null or char_length(section) <= 50),
  add constraint dugsiga_students_roll_length_valid
    check (roll_number is null or char_length(roll_number) <= 50),
  add constraint dugsiga_students_national_id_length_valid
    check (national_id is null or char_length(national_id) <= 80);

-- ---------------------------------------------------------------------------
-- 3) Student uniqueness + search/performance indexes
-- ---------------------------------------------------------------------------
drop index if exists public.uq_dugsiga_students_school_roll;

create unique index if not exists uq_dugsiga_students_school_class_section_roll
  on public.dugsiga_students (
    school_id,
    lower(btrim(class)),
    lower(btrim(coalesce(section,''))),
    lower(btrim(roll_number))
  )
  where roll_number is not null and btrim(roll_number) <> '';

create unique index if not exists uq_dugsiga_students_school_national_id
  on public.dugsiga_students (school_id, lower(btrim(national_id)))
  where national_id is not null and btrim(national_id) <> '';

create index if not exists idx_dugsiga_students_school_status_class
  on public.dugsiga_students (school_id, status, class);

create index if not exists idx_dugsiga_students_school_search_name
  on public.dugsiga_students (school_id, lower(full_name));

create index if not exists idx_dugsiga_students_school_class_name
  on public.dugsiga_students (school_id, lower(class), lower(full_name));

create index if not exists idx_dugsiga_students_school_updated_at
  on public.dugsiga_students (school_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- 4) Student -> class/section guardrail
-- ---------------------------------------------------------------------------
create or replace function public.dugsiga_validate_student_class_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $student_class$
declare
  clean_class text := lower(btrim(coalesce(new.class, '')));
  clean_section text := lower(btrim(coalesce(new.section, '')));
  class_rows integer := 0;
  section_rows integer := 0;
begin
  if clean_class = '' then
    raise exception using
      errcode = '23514',
      message = 'Student class is required.';
  end if;

  select
    count(*)::integer,
    count(*) filter (where btrim(coalesce(c.section, '')) <> '')::integer
  into class_rows, section_rows
  from public.dugsiga_classes c
  where c.school_id = new.school_id
    and lower(btrim(coalesce(c.class_name, ''))) = clean_class;

  if class_rows = 0 then
    raise exception using
      errcode = '23514',
      message = format('Student class does not exist: %s.', new.class);
  end if;

  if section_rows > 0 then
    if clean_section = '' then
      raise exception using
        errcode = '23514',
        message = format('Student section is required for class: %s.', new.class);
    end if;

    if not exists (
      select 1
      from public.dugsiga_classes c
      where c.school_id = new.school_id
        and lower(btrim(coalesce(c.class_name, ''))) = clean_class
        and lower(btrim(coalesce(c.section, ''))) = clean_section
    ) then
      raise exception using
        errcode = '23514',
        message = format(
          'Student section does not exist: %s / %s.',
          new.class,
          new.section
        );
    end if;
  end if;

  return new;
end;
$student_class$;

drop trigger if exists trg_dugsiga_students_class_assignment on public.dugsiga_students;
create trigger trg_dugsiga_students_class_assignment
before insert or update of school_id, class, section on public.dugsiga_students
for each row
execute function public.dugsiga_validate_student_class_assignment();

revoke all on function public.dugsiga_validate_student_class_assignment() from public, anon, authenticated;
grant execute on function public.dugsiga_validate_student_class_assignment() to service_role;

-- ---------------------------------------------------------------------------
-- 5) Student class capacity guardrail
-- ---------------------------------------------------------------------------
create or replace function public.dugsiga_enforce_student_class_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $student_capacity$
declare
  class_capacity integer;
  active_student_count integer;
  lock_key bigint;
  class_section text;
begin
  if lower(coalesce(new.status, 'active')) = 'archived' then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and lower(coalesce(old.class, '')) = lower(coalesce(new.class, ''))
     and lower(coalesce(old.section, '')) = lower(coalesce(new.section, ''))
     and lower(coalesce(old.status, 'active')) = lower(coalesce(new.status, 'active')) then
    return new;
  end if;

  select c.capacity, btrim(coalesce(c.section, ''))
  into class_capacity, class_section
  from public.dugsiga_classes c
  where c.school_id = new.school_id
    and lower(btrim(c.class_name)) = lower(btrim(new.class))
    and (
      lower(btrim(coalesce(c.section, ''))) = lower(btrim(coalesce(new.section, '')))
      or btrim(coalesce(c.section, '')) = ''
    )
  order by
    case
      when lower(btrim(coalesce(c.section, ''))) = lower(btrim(coalesce(new.section, '')))
        then 0 else 1
    end,
    c.id
  limit 1;

  if class_capacity is null or class_capacity <= 0 then
    return new;
  end if;

  lock_key := hashtextextended(
    coalesce(new.school_id, '') || '|' ||
    lower(btrim(coalesce(new.class, ''))) || '|' ||
    lower(btrim(coalesce(class_section, ''))),
    0
  );
  perform pg_advisory_xact_lock(lock_key);

  select count(*)::integer
  into active_student_count
  from public.dugsiga_students s
  where s.school_id = new.school_id
    and lower(btrim(s.class)) = lower(btrim(new.class))
    and lower(coalesce(s.status, 'active')) <> 'archived'
    and (
      class_section = ''
      or lower(btrim(coalesce(s.section, ''))) = lower(class_section)
    )
    and s.id <> new.id;

  if active_student_count + 1 > class_capacity then
    raise exception using
      errcode = '23514',
      message = format(
        'Class capacity exceeded for %s%s. Capacity: %s, active students: %s.',
        new.class,
        case when class_section = '' then '' else ' / ' || class_section end,
        class_capacity,
        active_student_count
      );
  end if;

  return new;
end;
$student_capacity$;

drop trigger if exists trg_dugsiga_students_class_capacity on public.dugsiga_students;
create trigger trg_dugsiga_students_class_capacity
before insert or update of class, section, status on public.dugsiga_students
for each row
execute function public.dugsiga_enforce_student_class_capacity();

revoke all on function public.dugsiga_enforce_student_class_capacity() from public, anon, authenticated;
grant execute on function public.dugsiga_enforce_student_class_capacity() to service_role;

-- ---------------------------------------------------------------------------
-- 6) Student audit append-only protection
-- ---------------------------------------------------------------------------
create or replace function public.dugsiga_student_audit_immutable()
returns trigger
language plpgsql
security definer
set search_path = public
as $student_audit$
begin
  raise exception using
    errcode = '42501',
    message = 'Student audit records are append-only.';
end;
$student_audit$;

drop trigger if exists trg_dugsiga_student_audit_immutable on public.dugsiga_student_audit;
create trigger trg_dugsiga_student_audit_immutable
before update or delete on public.dugsiga_student_audit
for each row
execute function public.dugsiga_student_audit_immutable();

revoke all on function public.dugsiga_student_audit_immutable() from public, anon, authenticated;
grant execute on function public.dugsiga_student_audit_immutable() to service_role;
