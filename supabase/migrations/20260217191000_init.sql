create extension if not exists pgcrypto;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'employee' check (role in ('admin', 'manager', 'employee')),
  team_id uuid null references public.teams(id) on delete set null,
  calendar_feed_token text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.planning_cycles (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  cycle_number int not null,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique(year, cycle_number)
);

create table if not exists public.weeks (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.planning_cycles(id) on delete cascade,
  iso_week_number int not null,
  start_date date not null,
  end_date date not null,
  unique(cycle_id, iso_week_number)
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_id uuid not null references public.weeks(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  category text not null check (category in ('VISIT', 'CALL', 'LEAD', 'ADMIN', 'ABS', 'WFH')),
  location text null,
  notes text null,
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

create index if not exists idx_profiles_team_id on public.profiles(team_id);
create index if not exists idx_shifts_user_id on public.shifts(user_id);
create index if not exists idx_shifts_week_id on public.shifts(week_id);
create index if not exists idx_weeks_cycle_id on public.weeks(cycle_id);

create or replace function public.generate_calendar_token()
returns text
language sql
as $$
  select encode(gen_random_bytes(32), 'hex');
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, calendar_feed_token)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'employee',
    public.generate_calendar_token()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.current_user_team_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.team_id from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'manager', false);
$$;

create or replace function public.enforce_profile_update_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if auth.uid() is null or auth.uid() <> old.id then
    raise exception 'Not allowed to update this profile';
  end if;

  if new.role <> old.role
    or new.team_id is distinct from old.team_id
    or new.calendar_feed_token <> old.calendar_feed_token
    or new.created_at <> old.created_at
    or new.id <> old.id then
    raise exception 'Only full_name can be updated by non-admin user';
  end if;

  return new;
end;
$$;

create trigger trg_profiles_update_guard
  before update on public.profiles
  for each row execute procedure public.enforce_profile_update_permissions();

alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.planning_cycles enable row level security;
alter table public.weeks enable row level security;
alter table public.shifts enable row level security;

create policy "teams_select_authenticated"
on public.teams
for select
using (auth.role() = 'authenticated');

create policy "teams_admin_mutation"
on public.teams
for all
using (public.is_admin())
with check (public.is_admin());

create policy "cycles_select_authenticated"
on public.planning_cycles
for select
using (auth.role() = 'authenticated');

create policy "cycles_admin_mutation"
on public.planning_cycles
for all
using (public.is_admin())
with check (public.is_admin());

create policy "weeks_select_authenticated"
on public.weeks
for select
using (auth.role() = 'authenticated');

create policy "weeks_admin_mutation"
on public.weeks
for all
using (public.is_admin())
with check (public.is_admin());

create policy "profiles_select_self_admin_manager_team"
on public.profiles
for select
using (
  id = auth.uid()
  or public.is_admin()
  or (
    public.is_manager()
    and team_id is not null
    and team_id = public.current_user_team_id()
  )
);

create policy "profiles_update_self_or_admin"
on public.profiles
for update
using (
  id = auth.uid()
  or public.is_admin()
)
with check (
  id = auth.uid()
  or public.is_admin()
);

create policy "shifts_select_by_role"
on public.shifts
for select
using (
  user_id = auth.uid()
  or public.is_admin()
  or (
    public.is_manager()
    and exists (
      select 1
      from public.profiles p
      where p.id = shifts.user_id
        and p.team_id = public.current_user_team_id()
    )
  )
);

create policy "shifts_admin_insert"
on public.shifts
for insert
with check (public.is_admin());

create policy "shifts_admin_update"
on public.shifts
for update
using (public.is_admin())
with check (public.is_admin());

create policy "shifts_admin_delete"
on public.shifts
for delete
using (public.is_admin());
