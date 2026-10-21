
create or replace function public.dugsiga_enforce_student_class_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  class_capacity integer;
  active_student_count integer;
  lock_key bigint;
begin
  if coalesce(new.status, 'active') = 'archived' then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and coalesce(old.class, '') = coalesce(new.class, '')
     and coalesce(old.section, '') = coalesce(new.section, '')
     and coalesce(old.status, 'active') = coalesce(new.status, 'active') then
    return new;
  end if;

  lock_key := hashtextextended(
    coalesce(new.school_id, '') || '|' ||
    lower(btrim(coalesce(new.class, ''))) || '|' ||
    lower(btrim(coalesce(new.section, ''))),
    0
  );
  perform pg_advisory_xact_lock(lock_key);

  select c.capacity
    into class_capacity
  from public.dugsiga_classes c
  where c.school_id = new.school_id
    and lower(btrim(c.class_name)) = lower(btrim(new.class))
    and (
      lower(btrim(coalesce(c.section, ''))) = lower(btrim(coalesce(new.section, '')))
      or coalesce(c.section, '') = ''
    )
  order by
    case when lower(btrim(coalesce(c.section, ''))) = lower(btrim(coalesce(new.section, ''))) then 0 else 1 end,
    c.id
  limit 1;

  if class_capacity is null or class_capacity <= 0 then
    return new;
  end if;

  select count(*)::integer
    into active_student_count
  from public.dugsiga_students s
  where s.school_id = new.school_id
    and lower(btrim(s.class)) = lower(btrim(new.class))
    and lower(btrim(coalesce(s.section, ''))) = lower(btrim(coalesce(new.section, '')))
    and coalesce(s.status, 'active') <> 'archived'
    and s.id <> new.id;

  if active_student_count + 1 > class_capacity then
    raise exception using
      errcode = '23514',
      message = format(
        'Class capacity exceeded for %s%s. Capacity: %s, active students: %s.',
        new.class,
        case when nullif(btrim(coalesce(new.section, '')), '') is null then '' else ' / ' || btrim(new.section) end,
        class_capacity,
        active_student_count
      );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_dugsiga_students_class_capacity on public.dugsiga_students;
create trigger trg_dugsiga_students_class_capacity
before insert or update of class, section, status on public.dugsiga_students
for each row
execute function public.dugsiga_enforce_student_class_capacity();

revoke all on function public.dugsiga_enforce_student_class_capacity() from public, anon, authenticated;
grant execute on function public.dugsiga_enforce_student_class_capacity() to service_role;
