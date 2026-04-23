-- ─────────────────────────────────────────────────────────────────
-- OrgFlow — Supabase Schema
-- Run this entire file in the Supabase SQL Editor (single paste)
-- ─────────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════════
-- 1. CREATE ALL TABLES FIRST
-- ══════════════════════════════════════════════════════════════════

create table public.profiles (
  id         uuid references auth.users on delete cascade primary key,
  name       text        not null,
  email      text        not null,
  user_type  text        not null check (user_type in ('org', 'member')),
  created_at timestamptz default now() not null
);

create table public.orgs (
  id               uuid default gen_random_uuid() primary key,
  name             text not null,
  exec_join_code   text not null unique,
  member_join_code text not null unique,
  created_at       timestamptz default now() not null
);

create table public.org_members (
  id        uuid default gen_random_uuid() primary key,
  org_id    uuid references public.orgs     on delete cascade not null,
  user_id   uuid references public.profiles on delete cascade not null,
  role      text not null default 'Member',
  user_type text not null check (user_type in ('exec', 'member')),
  joined_at timestamptz default now() not null,
  unique (org_id, user_id)
);

create table public.events (
  id               uuid default gen_random_uuid() primary key,
  org_id           uuid references public.orgs on delete cascade not null,
  title            text    not null,
  type             text    not null default 'General Meeting',
  date             date    not null,
  time             text,
  location         text,
  description      text,
  track_attendance     boolean default false not null,
  attendance_code      text,
  end_time             text,
  requirement_category text,
  point_value          integer default 1 not null,
  created_at           timestamptz default now() not null
);

create table public.attendance_records (
  id            uuid default gen_random_uuid() primary key,
  event_id      uuid references public.events   on delete cascade not null,
  org_id        uuid references public.orgs     on delete cascade not null,
  user_id       uuid references public.profiles on delete set null,
  user_name     text not null,
  user_email    text,
  source        text not null default 'code'
                  check (source in ('code', 'manual', 'session', 'late')),
  checked_in_at timestamptz default now() not null,
  unique (event_id, user_id)
);

create table public.checkin_sessions (
  id          uuid default gen_random_uuid() primary key,
  event_id    uuid references public.events on delete cascade not null,
  event_title text not null,
  org_id      uuid references public.orgs   on delete cascade not null,
  code        text not null,
  created_at  timestamptz default now() not null,
  expires_at  timestamptz not null,
  active      boolean default true not null
);

create table public.manual_members (
  id         uuid default gen_random_uuid() primary key,
  org_id     uuid references public.orgs on delete cascade not null,
  name       text not null,
  email      text,
  role       text default 'Member',
  committee  text,
  major      text,
  join_date  date default current_date,
  created_at timestamptz default now() not null
);

create table public.notes (
  id          uuid default gen_random_uuid() primary key,
  org_id      uuid references public.orgs     on delete cascade not null,
  author_id   uuid references public.profiles on delete set null,
  author_name text,
  title       text not null,
  content     text,
  category    text,
  created_at  timestamptz default now() not null
);

-- ══════════════════════════════════════════════════════════════════
-- 2. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ══════════════════════════════════════════════════════════════════

alter table public.profiles          enable row level security;
alter table public.orgs              enable row level security;
alter table public.org_members       enable row level security;
alter table public.events            enable row level security;
alter table public.attendance_records enable row level security;
alter table public.checkin_sessions  enable row level security;
alter table public.manual_members    enable row level security;
alter table public.notes             enable row level security;

-- ══════════════════════════════════════════════════════════════════
-- 3. POLICIES (all tables exist now, cross-references are safe)
-- ══════════════════════════════════════════════════════════════════

-- profiles
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

create policy "profiles_insert" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

create policy "profiles_update" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- orgs
create policy "orgs_select" on public.orgs
  for select to authenticated using (true);

create policy "orgs_insert" on public.orgs
  for insert to authenticated with check (true);

create policy "orgs_update" on public.orgs
  for update to authenticated
  using (exists (
    select 1 from public.org_members
    where org_members.org_id = orgs.id
      and org_members.user_id = auth.uid()
      and org_members.user_type = 'exec'
  ));

-- org_members
create policy "org_members_select" on public.org_members
  for select to authenticated using (true);

create policy "org_members_insert" on public.org_members
  for insert to authenticated with check (user_id = auth.uid());

-- events
create policy "events_select" on public.events
  for select to authenticated
  using (exists (
    select 1 from public.org_members
    where org_members.org_id = events.org_id
      and org_members.user_id = auth.uid()
  ));

create policy "events_insert" on public.events
  for insert to authenticated
  with check (exists (
    select 1 from public.org_members
    where org_members.org_id = events.org_id
      and org_members.user_id = auth.uid()
      and org_members.user_type = 'exec'
  ));

create policy "events_delete" on public.events
  for delete to authenticated
  using (exists (
    select 1 from public.org_members
    where org_members.org_id = events.org_id
      and org_members.user_id = auth.uid()
      and org_members.user_type = 'exec'
  ));

-- attendance_records
create policy "attendance_select" on public.attendance_records
  for select to authenticated
  using (exists (
    select 1 from public.org_members
    where org_members.org_id = attendance_records.org_id
      and org_members.user_id = auth.uid()
  ));

create policy "attendance_insert" on public.attendance_records
  for insert to authenticated
  with check (exists (
    select 1 from public.org_members
    where org_members.org_id = attendance_records.org_id
      and org_members.user_id = auth.uid()
  ));

create policy "attendance_delete" on public.attendance_records
  for delete to authenticated
  using (exists (
    select 1 from public.org_members
    where org_members.org_id = attendance_records.org_id
      and org_members.user_id = auth.uid()
      and org_members.user_type = 'exec'
  ));

-- checkin_sessions
create policy "sessions_select" on public.checkin_sessions
  for select to authenticated
  using (exists (
    select 1 from public.org_members
    where org_members.org_id = checkin_sessions.org_id
      and org_members.user_id = auth.uid()
  ));

create policy "sessions_insert" on public.checkin_sessions
  for insert to authenticated
  with check (exists (
    select 1 from public.org_members
    where org_members.org_id = checkin_sessions.org_id
      and org_members.user_id = auth.uid()
      and org_members.user_type = 'exec'
  ));

create policy "sessions_update" on public.checkin_sessions
  for update to authenticated
  using (exists (
    select 1 from public.org_members
    where org_members.org_id = checkin_sessions.org_id
      and org_members.user_id = auth.uid()
      and org_members.user_type = 'exec'
  ));

-- manual_members
create policy "manual_members_select" on public.manual_members
  for select to authenticated
  using (exists (
    select 1 from public.org_members
    where org_members.org_id = manual_members.org_id
      and org_members.user_id = auth.uid()
  ));

create policy "manual_members_insert" on public.manual_members
  for insert to authenticated
  with check (exists (
    select 1 from public.org_members
    where org_members.org_id = manual_members.org_id
      and org_members.user_id = auth.uid()
      and org_members.user_type = 'exec'
  ));

create policy "manual_members_delete" on public.manual_members
  for delete to authenticated
  using (exists (
    select 1 from public.org_members
    where org_members.org_id = manual_members.org_id
      and org_members.user_id = auth.uid()
      and org_members.user_type = 'exec'
  ));

-- notes
create policy "notes_select" on public.notes
  for select to authenticated
  using (exists (
    select 1 from public.org_members
    where org_members.org_id = notes.org_id
      and org_members.user_id = auth.uid()
  ));

create policy "notes_insert" on public.notes
  for insert to authenticated
  with check (exists (
    select 1 from public.org_members
    where org_members.org_id = notes.org_id
      and org_members.user_id = auth.uid()
      and org_members.user_type = 'exec'
  ));

create policy "notes_update" on public.notes
  for update to authenticated
  using (exists (
    select 1 from public.org_members
    where org_members.org_id = notes.org_id
      and org_members.user_id = auth.uid()
      and org_members.user_type = 'exec'
  ));

create policy "notes_delete" on public.notes
  for delete to authenticated
  using (exists (
    select 1 from public.org_members
    where org_members.org_id = notes.org_id
      and org_members.user_id = auth.uid()
      and org_members.user_type = 'exec'
  ));

-- ══════════════════════════════════════════════════════════════════
-- 4. REALTIME + INDEXES
-- ══════════════════════════════════════════════════════════════════

alter table public.attendance_records replica identity full;
alter publication supabase_realtime add table public.attendance_records;

create index on public.org_members (org_id);
create index on public.org_members (user_id);
create index on public.events (org_id);
create index on public.attendance_records (event_id);
create index on public.attendance_records (org_id);
create index on public.checkin_sessions (event_id);
create index on public.checkin_sessions (org_id);
create index on public.notes (org_id);
create index on public.manual_members (org_id);
