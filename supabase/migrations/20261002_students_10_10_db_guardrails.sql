-- DUGSI PRO 2026 - Students DB guardrails
-- Enforces class/section integrity and makes student audit append-only.

create or replace function public.dugsiga_validate_student_class_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  class_count integer;
  section_rows integer;
  clean_class text;
  clean_section text;
begin
  clean_class := lower(btrim(coalesce(new.class, '')));
  clean_section := lower(btrim(coalesce(new.section, '')));

  if clean_class = '' then
    raise exception using errcode = '23514', message = 'Student class is required.';
  end if;

  select count(*)::integer,
         count(*) filter (where btrim(coalesce(c.section, '')) <> '')::integer
    into class_count, section_rows
  from public.dugsiga_classes c
  where c.school_id = new.school_id
    and lower(btrim(coalesce(c.class_name, ''))) = clean_class;

  if class_count = 0 then
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
        message = format('Student section does not exist: %s / %s.', new.class, new.section);
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_dugsiga_students_class_assignment on public.dugsiga_students;
create trigger trg_dugsiga_students_class_assignment
before insert or update of school_id, class, section on public.dugsiga_students
for each row execute function public.dugsiga_validate_student_class_assignment();

create or replace function public.dugsiga_student_audit_immutable()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  raise exception using
    errcode = '42501',
    message = 'Student audit records are append-only.';
end;
$function$;

drop trigger if exists trg_dugsiga_student_audit_immutable on public.dugsiga_student_audit;
create trigger trg_dugsiga_student_audit_immutable
before update or delete on public.dugsiga_student_audit
for each row execute function public.dugsiga_student_audit_immutable();

revoke execute on function public.dugsiga_validate_student_class_assignment() from public, anon, authenticated;
revoke execute on function public.dugsiga_student_audit_immutable() from public, anon, authenticated;
