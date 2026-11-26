-- Run this in the Supabase SQL editor of your own project.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null,
  distance double precision not null default 0,
  duration double precision not null default 0,
  average_pace double precision,
  average_speed double precision,
  maximum_speed double precision,
  elevation_gain double precision,
  started_at timestamptz,
  finished_at timestamptz,
  video_url text,
  created_at timestamptz not null default now()
);
create table public.activity_records (
  id bigint generated always as identity primary key,
  activity_id uuid not null references public.activities(id) on delete cascade,
  elapsed_seconds double precision,
  distance double precision,
  pace double precision,
  speed double precision,
  elevation double precision,
  latitude double precision,
  longitude double precision,
  recorded_at timestamptz
);
grant select, insert, update, delete on public.profiles, public.activities, public.activity_records to authenticated;
grant all on public.profiles, public.activities, public.activity_records to service_role;
alter table public.profiles enable row level security;
alter table public.activities enable row level security;
alter table public.activity_records enable row level security;
create policy "own profile" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "own activities" on public.activities for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own records" on public.activity_records for all to authenticated
  using (exists (select 1 from public.activities a where a.id = activity_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.activities a where a.id = activity_id and a.user_id = auth.uid()));
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles(id, name) values (new.id, new.raw_user_meta_data->>'name'); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
