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

create table public.member_groups (
  id         uuid default gen_random_uuid() primary key,
  org_id     uuid references public.orgs on delete cascade not null,
  name       text not null check (char_length(trim(name)) > 0),
  created_by uuid references public.profiles on delete set null default auth.uid(),
  created_at timestamptz default now() not null,
  unique (org_id, name)
);

-- A group can include both signed-in accounts and manually added roster entries.
-- member_type identifies which roster source member_id belongs to.
create table public.member_group_members (
  id          uuid default gen_random_uuid() primary key,
  group_id    uuid references public.member_groups on delete cascade not null,
  member_id   uuid not null,
  member_type text not null check (member_type in ('account', 'manual')),
  created_at  timestamptz default now() not null,
  unique (group_id, member_id, member_type)
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
alter table public.member_groups     enable row level security;
alter table public.member_group_members enable row level security;
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

-- member groups: everyone in the org can view; only execs can manage
create policy "member_groups_select" on public.member_groups
  for select to authenticated
  using (exists (
    select 1 from public.org_members
    where org_members.org_id = member_groups.org_id
      and org_members.user_id = auth.uid()
  ));

create policy "member_groups_insert" on public.member_groups
  for insert to authenticated
  with check (exists (
    select 1 from public.org_members
    where org_members.org_id = member_groups.org_id
      and org_members.user_id = auth.uid()
      and org_members.user_type = 'exec'
  ));

create policy "member_groups_update" on public.member_groups
  for update to authenticated
  using (exists (
    select 1 from public.org_members
    where org_members.org_id = member_groups.org_id
      and org_members.user_id = auth.uid()
      and org_members.user_type = 'exec'
  ));

create policy "member_groups_delete" on public.member_groups
  for delete to authenticated
  using (exists (
    select 1 from public.org_members
    where org_members.org_id = member_groups.org_id
      and org_members.user_id = auth.uid()
      and org_members.user_type = 'exec'
  ));

create policy "member_group_members_select" on public.member_group_members
  for select to authenticated
  using (exists (
    select 1 from public.member_groups
    join public.org_members on org_members.org_id = member_groups.org_id
    where member_groups.id = member_group_members.group_id
      and org_members.user_id = auth.uid()
  ));

create policy "member_group_members_insert" on public.member_group_members
  for insert to authenticated
  with check (exists (
    select 1 from public.member_groups
    join public.org_members on org_members.org_id = member_groups.org_id
    where member_groups.id = member_group_members.group_id
      and org_members.user_id = auth.uid()
      and org_members.user_type = 'exec'
  ));

create policy "member_group_members_delete" on public.member_group_members
  for delete to authenticated
  using (exists (
    select 1 from public.member_groups
    join public.org_members on org_members.org_id = member_groups.org_id
    where member_groups.id = member_group_members.group_id
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
create index on public.member_groups (org_id);
create index on public.member_group_members (group_id);

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

-- Preserve groups created by the other branch, including membership types.
-- Keep the legacy tables intact; the merged app uses groups/group_members.
-- The guard also allows section 5 to run on databases without legacy tables.
do $$
begin
  if to_regclass('public.member_groups') is not null then
    insert into public.groups (id, org_id, name, created_at)
      select id, org_id, name, created_at from public.member_groups
      on conflict (id) do nothing;
  end if;
  if to_regclass('public.member_group_members') is not null then
    insert into public.group_members (group_id, member_id, member_type, created_at)
      select group_id, member_id,
        case when member_type = 'account' then 'real' else member_type end,
        created_at
      from public.member_group_members
      on conflict (group_id, member_id) do nothing;
  end if;
end $$;

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

-- Avoid a groups -> group_members -> groups SELECT-policy cycle.
-- This helper only answers whether the current user is an exec for this group.
create or replace function public.is_group_exec(target_group_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.groups g
    join public.org_members om on om.org_id = g.org_id
    where g.id = target_group_id
      and om.user_id = auth.uid()
      and om.user_type = 'exec'
  );
$$;
revoke all on function public.is_group_exec(uuid) from public;
grant execute on function public.is_group_exec(uuid) to authenticated;

-- group_members: execs manage all rows; a real member can read their
-- own membership rows (needed to know which groups they're in).
drop policy if exists "group_members_select" on public.group_members;
create policy "group_members_select" on public.group_members
  for select to authenticated
  using (
    member_id = auth.uid()
    or public.is_group_exec(group_id)
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
    or (group_id is null and exists (
      select 1 from public.org_members
      where org_members.org_id = participation_requirements.org_id
        and org_members.user_id = auth.uid()
    ))
    or exists (
      select 1 from public.group_members
      where group_members.group_id = participation_requirements.group_id
        and group_members.member_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════════════════════════════
-- 6. ADMIN ACCESS (migration — run this whole section once)
--
-- Marks one account (by email) as an OrgFlow admin and gives it
-- READ-ONLY visibility into every org's data, so it can preview any
-- org as an exec or a member for beta testing. Admin access never
-- grants insert/update/delete — those stay restricted to real
-- org_members rows, so previewing can't corrupt real org data.
-- ══════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

update public.profiles
  set is_admin = true
  where email = 'ashvin.jayanthi@gmail.com';

-- profiles / orgs / org_members already use `using (true)` selects,
-- i.e. any authenticated user can already read every row — no change
-- needed there. Everything below is scoped to org_members, so each
-- gets an `or` branch that passes for the admin account.

drop policy if exists events_select on public.events;
create policy events_select on public.events for select to authenticated
  using (
    exists (
      select 1 from public.org_members
      where org_members.org_id = events.org_id
        and org_members.user_id = auth.uid()
    )
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

drop policy if exists attendance_select on public.attendance_records;
create policy attendance_select on public.attendance_records for select to authenticated
  using (
    exists (
      select 1 from public.org_members
      where org_members.org_id = attendance_records.org_id
        and org_members.user_id = auth.uid()
    )
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

drop policy if exists sessions_select on public.checkin_sessions;
create policy sessions_select on public.checkin_sessions for select to authenticated
  using (
    exists (
      select 1 from public.org_members
      where org_members.org_id = checkin_sessions.org_id
        and org_members.user_id = auth.uid()
    )
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

drop policy if exists manual_members_select on public.manual_members;
create policy manual_members_select on public.manual_members for select to authenticated
  using (
    exists (
      select 1 from public.org_members
      where org_members.org_id = manual_members.org_id
        and org_members.user_id = auth.uid()
    )
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

drop policy if exists notes_select on public.notes;
create policy notes_select on public.notes for select to authenticated
  using (
    exists (
      select 1 from public.org_members
      where org_members.org_id = notes.org_id
        and org_members.user_id = auth.uid()
    )
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups for select to authenticated
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
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members for select to authenticated
  using (
    member_id = auth.uid()
    or public.is_group_exec(group_id)
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

drop policy if exists participation_requirements_select on public.participation_requirements;
create policy participation_requirements_select on public.participation_requirements for select to authenticated
  using (
    exists (
      select 1 from public.org_members
      where org_members.org_id = participation_requirements.org_id
        and org_members.user_id = auth.uid()
        and org_members.user_type = 'exec'
    )
    or (group_id is null and exists (
      select 1 from public.org_members
      where org_members.org_id = participation_requirements.org_id
        and org_members.user_id = auth.uid()
    ))
    or exists (
      select 1 from public.group_members
      where group_members.group_id = participation_requirements.group_id
        and group_members.member_id = auth.uid()
    )
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

-- ══════════════════════════════════════════════════════════════════
-- 7. ADMIN MEMBER MANAGEMENT (migration — run this whole section once)
--
-- Lets the admin account add and remove members while previewing an
-- org, so beta-testing can actually fix roster issues on the spot.
-- Deliberately scoped to members only — every other table (events,
-- notes, requirements, groups, attendance) stays read-only for admin.
-- ══════════════════════════════════════════════════════════════════

drop policy if exists manual_members_insert on public.manual_members;
create policy manual_members_insert on public.manual_members for insert to authenticated
  with check (
    exists (
      select 1 from public.org_members
      where org_members.org_id = manual_members.org_id
        and org_members.user_id = auth.uid()
        and org_members.user_type = 'exec'
    )
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

drop policy if exists manual_members_delete on public.manual_members;
create policy manual_members_delete on public.manual_members for delete to authenticated
  using (
    exists (
      select 1 from public.org_members
      where org_members.org_id = manual_members.org_id
        and org_members.user_id = auth.uid()
        and org_members.user_type = 'exec'
    )
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

drop policy if exists org_members_delete on public.org_members;
create policy org_members_delete on public.org_members for delete to authenticated
  using (
    (
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
    )
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );
