create table if not exists public.week_needs (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  category text not null check (category in ('VISIT', 'CALL', 'LEAD', 'ADMIN', 'ABS', 'WFH')),
  required_count int not null check (required_count >= 0),
  comment text null,
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

create index if not exists idx_week_needs_week_id on public.week_needs(week_id);
create index if not exists idx_week_needs_start_at on public.week_needs(start_at);

alter table public.week_needs enable row level security;

drop policy if exists "week_needs_select_authenticated" on public.week_needs;
create policy "week_needs_select_authenticated"
on public.week_needs
for select
using (true);

drop policy if exists "week_needs_admin_mutation" on public.week_needs;
create policy "week_needs_admin_mutation"
on public.week_needs
for all
using (public.is_admin())
with check (public.is_admin());
