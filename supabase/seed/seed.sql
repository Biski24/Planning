-- Optional seed script. Run after creating users in Supabase Auth.
-- Replace UUIDs/emails with existing auth.users IDs in your environment.

insert into public.teams (name)
values ('Agence 134')
on conflict do nothing;

-- Example: promote an existing auth user to admin
-- update public.profiles
-- set role = 'admin', full_name = 'Admin Demo', team_id = (select id from public.teams where name = 'Agence 134' limit 1)
-- where id = '00000000-0000-0000-0000-000000000000';

-- Example: employee demo
-- update public.profiles
-- set role = 'employee', full_name = 'Employé Demo', team_id = (select id from public.teams where name = 'Agence 134' limit 1)
-- where id = '11111111-1111-1111-1111-111111111111';

-- Create active cycle + 4 weeks example
with inserted_cycle as (
  insert into public.planning_cycles (year, cycle_number, start_date, end_date, is_active)
  values (2026, 1, '2026-01-26', '2026-02-22', true)
  on conflict (year, cycle_number) do update set is_active = excluded.is_active
  returning id
)
insert into public.weeks (cycle_id, iso_week_number, start_date, end_date)
select c.id, w.iso_week_number, w.start_date, w.end_date
from inserted_cycle c,
(
  values
    (5, '2026-01-26'::date, '2026-02-01'::date),
    (6, '2026-02-02'::date, '2026-02-08'::date),
    (7, '2026-02-09'::date, '2026-02-15'::date),
    (8, '2026-02-16'::date, '2026-02-22'::date)
) as w(iso_week_number, start_date, end_date)
on conflict (cycle_id, iso_week_number) do nothing;

-- Example shifts (uncomment and set real profile IDs)
-- insert into public.shifts (user_id, week_id, start_at, end_at, category, location, notes)
-- select
--   '11111111-1111-1111-1111-111111111111'::uuid,
--   w.id,
--   (w.start_date + time '09:00')::timestamptz,
--   (w.start_date + time '12:00')::timestamptz,
--   'CALL',
--   'Bureau',
--   'Relances clients'
-- from public.weeks w
-- join public.planning_cycles c on c.id = w.cycle_id
-- where c.year = 2026 and c.cycle_number = 1;
