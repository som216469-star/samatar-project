
alter table public.dugsiga_students
  drop constraint if exists dugsiga_students_updated_at_valid,
  alter column updated_at drop default;

alter table public.dugsiga_students
  alter column updated_at type timestamptz
  using (
    case
      when nullif(btrim(updated_at), '') is null then null
      when updated_at ~ '^\d{4}-\d{2}-\d{2}$' then (updated_at || 'T00:00:00+00')::timestamptz
      else updated_at::timestamptz
    end
  );

update public.dugsiga_students
set updated_at = coalesce(updated_at, now())
where updated_at is null;

alter table public.dugsiga_students
  alter column updated_at set default now(),
  alter column updated_at set not null;

create index if not exists idx_dugsiga_students_school_updated_at
  on public.dugsiga_students (school_id, updated_at desc);
