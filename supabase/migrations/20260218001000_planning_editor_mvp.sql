create extension if not exists pgcrypto with schema extensions;

alter table if exists public.profiles
  add column if not exists employee_id uuid null;

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null unique,
  type text not null default 'conseiller' check (type in ('conseiller','alternant','accueil')),
  team_id uuid null references public.teams(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'profiles'
      and constraint_name = 'profiles_employee_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_employee_id_fkey
      foreign key (employee_id) references public.employees(id) on delete set null;
  end if;
end $$;

create table if not exists public.need_slots (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  day_of_week int not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  category text not null check (category in ('VISIT','CALL','RDV','LEAD','ASYNC','MEETING','TRAINING','WFH','ABS')),
  required_count int not null default 0 check (required_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (week_id, day_of_week, start_time, category)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  day_of_week int not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  category text not null check (category in ('VISIT','CALL','RDV','LEAD','ASYNC','MEETING','TRAINING','WFH','ABS')),
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (week_id, employee_id, day_of_week, start_time)
);

create index if not exists idx_employees_is_active on public.employees(is_active);
create index if not exists idx_need_slots_week_day_time on public.need_slots(week_id, day_of_week, start_time);
create index if not exists idx_assignments_week_day_time on public.assignments(week_id, day_of_week, start_time);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_need_slots_updated_at on public.need_slots;
create trigger trg_need_slots_updated_at
before update on public.need_slots
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_assignments_updated_at on public.assignments;
create trigger trg_assignments_updated_at
before update on public.assignments
for each row execute procedure public.set_updated_at();

alter table public.employees enable row level security;
alter table public.need_slots enable row level security;
alter table public.assignments enable row level security;

drop policy if exists "employees_select_auth" on public.employees;
create policy "employees_select_auth" on public.employees
for select using (true);

drop policy if exists "employees_admin_mutation" on public.employees;
create policy "employees_admin_mutation" on public.employees
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "need_slots_select_auth" on public.need_slots;
create policy "need_slots_select_auth" on public.need_slots
for select using (true);

drop policy if exists "need_slots_admin_mutation" on public.need_slots;
create policy "need_slots_admin_mutation" on public.need_slots
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "assignments_select_auth" on public.assignments;
create policy "assignments_select_auth" on public.assignments
for select using (true);

drop policy if exists "assignments_admin_mutation" on public.assignments;
create policy "assignments_admin_mutation" on public.assignments
for all using (public.is_admin()) with check (public.is_admin());
