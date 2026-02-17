create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  username text not null unique,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (char_length(username) >= 2)
);

create index if not exists idx_app_users_profile_id on public.app_users(profile_id);
create index if not exists idx_app_users_username on public.app_users(lower(username));

alter table public.app_users enable row level security;

create policy "app_users_admin_only"
on public.app_users
for all
using (public.is_admin())
with check (public.is_admin());

create or replace function public.create_app_user(
  p_profile_id uuid,
  p_username text,
  p_password text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.app_users (profile_id, username, password_hash)
  values (
    p_profile_id,
    lower(trim(p_username)),
    crypt(p_password, gen_salt('bf'))
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.set_app_user_password(
  p_username text,
  p_password text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.app_users
  set password_hash = crypt(p_password, gen_salt('bf'))
  where username = lower(trim(p_username));
$$;

create or replace function public.authenticate_app_user(
  p_username text,
  p_password text
)
returns table (profile_id uuid, role text)
language sql
security definer
set search_path = public
as $$
  select p.id as profile_id, p.role
  from public.app_users au
  join public.profiles p on p.id = au.profile_id
  where au.username = lower(trim(p_username))
    and au.is_active = true
    and au.password_hash = crypt(p_password, au.password_hash)
  limit 1;
$$;
