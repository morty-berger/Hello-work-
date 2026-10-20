-- Hello Work profile table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'member' check (role in ('member','admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Create a profile whenever a new auth user is registered.
create or replace function public.handle_new_user()
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Members can see and edit only their own profile fields. The trigger/default keeps role at member;
-- this update policy intentionally excludes role changes by limiting grants below.
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

drop policy if exists "Members read own profile; admins read all" on public.profiles;
create policy "Members read own profile; admins read all"
on public.profiles for select to authenticated
using (
  auth.uid() = id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "Members update own name" on public.profiles;
create policy "Members update own name"
on public.profiles for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Admin role is assigned manually by the project owner in the Supabase SQL Editor.
-- Example after a user's profile exists:
-- update public.profiles set role = 'admin' where id = 'YOUR-USER-UUID';
