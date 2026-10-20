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

 
-- Admin-only directory endpoint. It returns the registered account emails and profile details.
-- The function checks administrator status before reading auth.users.
create or replace function public.admin_list_hello_work_users()
returns table (
  user_id uuid,
  email text,
  full_name text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_hello_work_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  return query
    select u.id, u.email::text, coalesce(p.full_name, ''), coalesce(p.role, 'member'), u.created_at
    from auth.users as u
    left join public.profiles as p on p.id = u.id
    order by u.created_at desc
    limit 500;
end;
$$;

revoke all on function public.admin_list_hello_work_users() from public, anon, authenticated;
grant execute on function public.admin_list_hello_work_users() to authenticated;


-- Sales pipeline: every opportunity is a project.
create table if not exists public.sales_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  customer_name text not null default '',
  contact_email text not null default '',
  estimated_value numeric(14,2),
  status text not null default 'lead' check (status in ('lead','sale','active','complete','lost')),
  notes text not null default '',
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.sales_projects enable row level security;
grant select, insert, update, delete on public.sales_projects to authenticated;
drop policy if exists "Signed-in team can view sales projects" on public.sales_projects;
create policy "Signed-in team can view sales projects" on public.sales_projects for select to authenticated using (true);
drop policy if exists "Signed-in team can create sales projects" on public.sales_projects;
create policy "Signed-in team can create sales projects" on public.sales_projects for insert to authenticated with check (created_by = (select auth.uid()));
drop policy if exists "Signed-in team can update sales projects" on public.sales_projects;
create policy "Signed-in team can update sales projects" on public.sales_projects for update to authenticated using (true) with check (true);
drop policy if exists "Signed-in team can delete sales projects" on public.sales_projects;
create policy "Signed-in team can delete sales projects" on public.sales_projects for delete to authenticated using (true);
create index if not exists sales_projects_status_created_idx on public.sales_projects (status, created_at desc);
create index if not exists sales_projects_title_search_idx on public.sales_projects using gin (to_tsvector('simple', title || ' ' || customer_name));


-- Shared projects can move between departments without creating duplicate records.
alter table public.sales_projects
  add column if not exists department text not null default 'sales'
  check (department in ('sales','operations','finance'));
create index if not exists sales_projects_department_created_idx
  on public.sales_projects (department, created_at desc);

-- Checklist items belong to the shared project record, not a particular department.
create table if not exists public.project_checklist_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.sales_projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240),
  is_done boolean not null default false,
  position integer not null default 0,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.project_checklist_items enable row level security;
grant select, insert, update, delete on public.project_checklist_items to authenticated;
drop policy if exists "Signed-in team can view project checklist" on public.project_checklist_items;
create policy "Signed-in team can view project checklist" on public.project_checklist_items
  for select to authenticated using (true);
drop policy if exists "Signed-in team can add project checklist" on public.project_checklist_items;
create policy "Signed-in team can add project checklist" on public.project_checklist_items
  for insert to authenticated with check (
    created_by = (select auth.uid()) and exists (
      select 1 from public.sales_projects p where p.id = project_id
    )
  );
drop policy if exists "Signed-in team can update project checklist" on public.project_checklist_items;
create policy "Signed-in team can update project checklist" on public.project_checklist_items
  for update to authenticated using (true) with check (
    exists (select 1 from public.sales_projects p where p.id = project_id)
  );
drop policy if exists "Signed-in team can delete project checklist" on public.project_checklist_items;
create policy "Signed-in team can delete project checklist" on public.project_checklist_items
  for delete to authenticated using (true);
create index if not exists project_checklist_items_project_position_idx
  on public.project_checklist_items (project_id, position, created_at);


-- Hello Work project workspace extensions: stable job number, operating details,
-- team conversation, task state, and an activity timeline.
alter table public.sales_projects
  add column if not exists project_number bigint generated by default as identity,
  add column if not exists site_address text not null default '',
  add column if not exists general_contractor text not null default '',
  add column if not exists scope_of_work text not null default '',
  add column if not exists bid_due_date date,
  add column if not exists target_start_date date,
  add column if not exists target_completion_date date,
  add column if not exists project_manager uuid references auth.users(id) on delete set null;
create unique index if not exists sales_projects_project_number_uidx on public.sales_projects(project_number);

create table if not exists public.project_messages (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.sales_projects(id) on delete cascade,
 author_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
 body text not null check (char_length(trim(body)) between 1 and 5000),
 is_task boolean not null default false,
 task_status text not null default 'open' check (task_status in ('open','completed')),
 assigned_to uuid references auth.users(id) on delete set null,
 due_date date,
 completed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint project_messages_non_task_open check (is_task or task_status = 'open')
);
alter table public.project_messages enable row level security;
grant select, insert, update, delete on public.project_messages to authenticated;
drop policy if exists "Team can view project messages" on public.project_messages;
create policy "Team can view project messages" on public.project_messages for select to authenticated using (exists(select 1 from public.sales_projects p where p.id=project_id));
drop policy if exists "Team can post project messages" on public.project_messages;
create policy "Team can post project messages" on public.project_messages for insert to authenticated with check (author_id=(select auth.uid()) and exists(select 1 from public.sales_projects p where p.id=project_id));
drop policy if exists "Team can update project messages" on public.project_messages;
create policy "Team can update project messages" on public.project_messages for update to authenticated using (exists(select 1 from public.sales_projects p where p.id=project_id)) with check (exists(select 1 from public.sales_projects p where p.id=project_id));
drop policy if exists "Team can delete project messages" on public.project_messages;
create policy "Team can delete project messages" on public.project_messages for delete to authenticated using (author_id=(select auth.uid()) and exists(select 1 from public.sales_projects p where p.id=project_id));
create index if not exists project_messages_project_created_idx on public.project_messages(project_id, created_at desc);
create index if not exists project_messages_open_tasks_idx on public.project_messages(project_id, task_status, due_date) where is_task=true;

create table if not exists public.project_activity (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.sales_projects(id) on delete cascade,
 actor_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
 event_type text not null,
 description text not null check (char_length(trim(description)) between 1 and 1000),
 created_at timestamptz not null default now()
);
alter table public.project_activity enable row level security;
grant select, insert on public.project_activity to authenticated;
drop policy if exists "Team can view project activity" on public.project_activity;
create policy "Team can view project activity" on public.project_activity for select to authenticated using (exists(select 1 from public.sales_projects p where p.id=project_id));
drop policy if exists "Team can log project activity" on public.project_activity;
create policy "Team can log project activity" on public.project_activity for insert to authenticated with check (actor_id=(select auth.uid()) and exists(select 1 from public.sales_projects p where p.id=project_id));
