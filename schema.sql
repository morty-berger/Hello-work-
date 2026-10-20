-- Hello Work profiles and authentication setup
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Internal helper used by the RLS policy. Keep it outside exposed public API schema.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_hello_work_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function private.is_hello_work_admin() from public, anon;
grant execute on function private.is_hello_work_admin() to authenticated;

-- Create a profile whenever a new auth user registers.
create or replace function public.handle_hello_work_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'member')
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_hello_work_new_user() from public, anon, authenticated;
drop trigger if exists on_hello_work_user_created on auth.users;
create trigger on_hello_work_user_created
after insert on auth.users
for each row execute procedure public.handle_hello_work_new_user();

grant select on public.profiles to authenticated;
revoke insert, delete on public.profiles from anon, authenticated;
revoke update on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;

drop policy if exists "Hello Work profiles select" on public.profiles;
create policy "Hello Work profiles select"
on public.profiles for select to authenticated
using (auth.uid() = id or (select private.is_hello_work_admin()));

drop policy if exists "Hello Work profiles update own name" on public.profiles;
create policy "Hello Work profiles update own name"
on public.profiles for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- To promote your first account, run this in the trusted SQL Editor after signing up:
-- update public.profiles set role = 'admin' where id = 'YOUR-USER-UUID';
