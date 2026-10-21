
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
     and coalesce(old.status, 'active') = coalesce(new.status, 'active') then
    return new;
  end if;

  lock_key := hashtextextended(coalesce(new.school_id, '') || '|' || coalesce(new.class, ''), 0);
  perform pg_advisory_xact_lock(lock_key);

  select capacity
    into class_capacity
  from public.dugsiga_classes
  where school_id = new.school_id
    and lower(btrim(class_name)) = lower(btrim(new.class))
  order by id
  limit 1;

  if class_capacity is null or class_capacity <= 0 then
    return new;
  end if;

  select count(*)::integer
    into active_student_count
  from public.dugsiga_students s
  where s.school_id = new.school_id
    and lower(btrim(s.class)) = lower(btrim(new.class))
    and coalesce(s.status, 'active') <> 'archived'
    and s.id <> new.id;

  if active_student_count + 1 > class_capacity then
    raise exception using
      errcode = '23514',
      message = format(
        'Class capacity exceeded for %s. Capacity: %s, active students: %s.',
        new.class,
        class_capacity,
        active_student_count
      );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_dugsiga_students_class_capacity on public.dugsiga_students;
create trigger trg_dugsiga_students_class_capacity
before insert or update of class, status on public.dugsiga_students
for each row
execute function public.dugsiga_enforce_student_class_capacity();

revoke all on function public.dugsiga_enforce_student_class_capacity() from public, anon, authenticated;
grant execute on function public.dugsiga_enforce_student_class_capacity() to service_role;
