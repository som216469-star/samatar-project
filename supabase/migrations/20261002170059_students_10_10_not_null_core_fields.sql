
alter table public.dugsiga_students
  alter column gender set default 'Male',
  alter column guardian_phone set default '',
  alter column status set default 'active',
  alter column gender set not null,
  alter column guardian_phone set not null,
  alter column status set not null;
