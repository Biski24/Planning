-- Seed local auth + planning demo

insert into public.teams (name)
values ('Agence 134')
on conflict do nothing;

with bastien_profile as (
  insert into public.profiles (full_name, role, team_id, calendar_feed_token)
  values (
    'Bastien',
    'admin',
    (select id from public.teams where name = 'Agence 134' limit 1),
    encode(gen_random_bytes(32), 'hex')
  )
  on conflict do nothing
  returning id
), existing_bastien as (
  select id from bastien_profile
  union all
  select id from public.profiles where full_name = 'Bastien' limit 1
)
select public.create_app_user(id, 'bastien', 'Test')
from existing_bastien
where not exists (select 1 from public.app_users where username = 'bastien');

with employee_profile as (
  insert into public.profiles (full_name, role, team_id, calendar_feed_token)
  values (
    'Employe Demo',
    'employee',
    (select id from public.teams where name = 'Agence 134' limit 1),
    encode(gen_random_bytes(32), 'hex')
  )
  on conflict do nothing
  returning id
), existing_employee as (
  select id from employee_profile
  union all
  select id from public.profiles where full_name = 'Employe Demo' limit 1
)
select public.create_app_user(id, 'demo', 'Test')
from existing_employee
where not exists (select 1 from public.app_users where username = 'demo');

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

insert into public.shifts (user_id, week_id, start_at, end_at, category, location, notes)
select
  p.id,
  w.id,
  (w.start_date + time '09:00')::timestamptz,
  (w.start_date + time '12:00')::timestamptz,
  'CALL',
  'Bureau',
  'Relances clients'
from public.weeks w
join public.planning_cycles c on c.id = w.cycle_id
join public.profiles p on p.full_name = 'Employe Demo'
where c.year = 2026 and c.cycle_number = 1
on conflict do nothing;
