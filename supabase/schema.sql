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

-- Any exec can remove a regular member; removing a fellow exec
-- (e.g. a duplicate account) is restricted to President/Vice President.
create policy "org_members_delete" on public.org_members
  for delete to authenticated
  using (
    user_id <> auth.uid()
    and exists (
      select 1 from public.org_members as requester
      where requester.org_id = org_members.org_id
        and requester.user_id = auth.uid()
        and requester.user_type = 'exec'
        and (
          org_members.user_type <> 'exec'
          or requester.role in ('President', 'Vice President')
        )
    )
  );

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

-- ══════════════════════════════════════════════════════════════════
-- 5. GROUPS (migration — run this whole section against an existing DB)
--
-- Lets execs organize members into named groups (e.g. "Fall 2025") and
-- scope a participation requirement to just one group. A member only
-- sees a group-scoped requirement if they're in that group; execs see
-- everything. Run this entire section once in the Supabase SQL Editor.
-- ══════════════════════════════════════════════════════════════════

create table if not exists public.groups (
  id         uuid default gen_random_uuid() primary key,
  org_id     uuid references public.orgs on delete cascade not null,
  name       text not null,
  created_at timestamptz default now() not null
);

-- member_id points at either profiles.id (member_type = 'real') or
-- manual_members.id (member_type = 'manual') — no FK since it can
-- reference either table, same pattern manual_members already uses.
create table if not exists public.group_members (
  id          uuid default gen_random_uuid() primary key,
  group_id    uuid references public.groups on delete cascade not null,
  member_id   uuid not null,
  member_type text not null check (member_type in ('real', 'manual')),
  created_at  timestamptz default now() not null,
  unique (group_id, member_id)
);

alter table public.groups        enable row level security;
alter table public.group_members enable row level security;

-- groups: execs in the org see every group; a member only sees a group
-- they're actually in (so they can show its name next to a requirement).
drop policy if exists "groups_select" on public.groups;
create policy "groups_select" on public.groups
  for select to authenticated
  using (
    exists (
      select 1 from public.org_members
      where org_members.org_id = groups.org_id
        and org_members.user_id = auth.uid()
        and org_members.user_type = 'exec'
    )
    or exists (
      select 1 from public.group_members
      where group_members.group_id = groups.id
        and group_members.member_id = auth.uid()
    )
  );

drop policy if exists "groups_insert" on public.groups;
create policy "groups_insert" on public.groups
  for insert to authenticated
  with check (exists (
    select 1 from public.org_members
    where org_members.org_id = groups.org_id
      and org_members.user_id = auth.uid()
      and org_members.user_type = 'exec'
  ));

drop policy if exists "groups_update" on public.groups;
create policy "groups_update" on public.groups
  for update to authenticated
  using (exists (
    select 1 from public.org_members
    where org_members.org_id = groups.org_id
      and org_members.user_id = auth.uid()
      and org_members.user_type = 'exec'
  ));

drop policy if exists "groups_delete" on public.groups;
create policy "groups_delete" on public.groups
  for delete to authenticated
  using (exists (
    select 1 from public.org_members
    where org_members.org_id = groups.org_id
      and org_members.user_id = auth.uid()
      and org_members.user_type = 'exec'
  ));

-- group_members: execs manage all rows; a real member can read their
-- own membership rows (needed to know which groups they're in).
drop policy if exists "group_members_select" on public.group_members;
create policy "group_members_select" on public.group_members
  for select to authenticated
  using (
    member_id = auth.uid()
    or exists (
      select 1 from public.groups
      join public.org_members on org_members.org_id = groups.org_id
      where groups.id = group_members.group_id
        and org_members.user_id = auth.uid()
        and org_members.user_type = 'exec'
    )
  );

drop policy if exists "group_members_insert" on public.group_members;
create policy "group_members_insert" on public.group_members
  for insert to authenticated
  with check (exists (
    select 1 from public.groups
    join public.org_members on org_members.org_id = groups.org_id
    where groups.id = group_members.group_id
      and org_members.user_id = auth.uid()
      and org_members.user_type = 'exec'
  ));

drop policy if exists "group_members_delete" on public.group_members;
create policy "group_members_delete" on public.group_members
  for delete to authenticated
  using (exists (
    select 1 from public.groups
    join public.org_members on org_members.org_id = groups.org_id
    where groups.id = group_members.group_id
      and org_members.user_id = auth.uid()
      and org_members.user_type = 'exec'
  ));

create index if not exists groups_org_id_idx on public.groups (org_id);
create index if not exists group_members_group_id_idx on public.group_members (group_id);
create index if not exists group_members_member_id_idx on public.group_members (member_id);

-- Requirements can now optionally be scoped to one group. Null group_id
-- keeps today's behavior (visible to the whole org). If the group is
-- later deleted, the requirement just reverts to org-wide (set null,
-- not cascaded — the requirement itself isn't destroyed).
alter table public.participation_requirements
  add column if not exists group_id uuid references public.groups on delete set null;

create index if not exists participation_requirements_group_id_idx on public.participation_requirements (group_id);

-- Replace whatever SELECT policy participation_requirements currently
-- has (its name isn't tracked in this file) so group-scoped rows are
-- actually hidden from non-members instead of just being additive.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'participation_requirements' and cmd = 'SELECT'
  loop
    execute format('drop policy %I on public.participation_requirements', pol.policyname);
  end loop;
end $$;

create policy "participation_requirements_select" on public.participation_requirements
  for select to authenticated
  using (
    exists (
      select 1 from public.org_members
      where org_members.org_id = participation_requirements.org_id
        and org_members.user_id = auth.uid()
        and org_members.user_type = 'exec'
    )
    or group_id is null
    or exists (
      select 1 from public.group_members
      where group_members.group_id = participation_requirements.group_id
        and group_members.member_id = auth.uid()
    )
  );
