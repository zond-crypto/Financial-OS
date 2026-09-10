create table if not exists public.app_data (
  id integer primary key check (id = 1),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- Required only when using the publishable key supplied for this project.
-- This exposes one shared app record publicly. Add Supabase Auth and user_id
-- row-level security before using this for multiple users or sensitive data.
alter table public.app_data enable row level security;

drop policy if exists "public read app data" on public.app_data;
create policy "public read app data"
  on public.app_data for select
  to anon, authenticated
  using (true);

drop policy if exists "public write app data" on public.app_data;
create policy "public write app data"
  on public.app_data for insert
  to anon, authenticated
  with check (id = 1);

 drop policy if exists "public update app data" on public.app_data;
create policy "public update app data"
  on public.app_data for update
  to anon, authenticated
  using (id = 1)
  with check (id = 1);

insert into public.app_data (id, payload)
values (1, '{"version":2,"settings":{"currency":"K"},"categories":{},"transactions":[],"debts":[],"budget":{},"goals":[],"recurring":[],"sinkingFunds":[],"accounts":[]}'::jsonb)
on conflict (id) do nothing;
