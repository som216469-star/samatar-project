
create or replace function public.dugsiga_touch_student_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_dugsiga_students_updated_at on public.dugsiga_students;

create trigger trg_dugsiga_students_updated_at
before update on public.dugsiga_students
for each row
execute function public.dugsiga_touch_student_updated_at();

revoke all on function public.dugsiga_touch_student_updated_at() from public, anon, authenticated;
grant execute on function public.dugsiga_touch_student_updated_at() to service_role;
