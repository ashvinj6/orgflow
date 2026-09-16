-- Run this once in the Supabase SQL Editor for an existing OrgFlow database.

create table if not exists public.member_groups (
  id         uuid default gen_random_uuid() primary key,
  org_id     uuid references public.orgs on delete cascade not null,
  name       text not null check (char_length(trim(name)) > 0),
  created_by uuid references public.profiles on delete set null default auth.uid(),
  created_at timestamptz default now() not null,
  unique (org_id, name)
);

create table if not exists public.member_group_members (
  id          uuid default gen_random_uuid() primary key,
  group_id    uuid references public.member_groups on delete cascade not null,
  member_id   uuid not null,
  member_type text not null check (member_type in ('account', 'manual')),
  created_at  timestamptz default now() not null,
  unique (group_id, member_id, member_type)
);

alter table public.member_groups enable row level security;
alter table public.member_group_members enable row level security;

create policy "member_groups_select" on public.member_groups for select to authenticated
using (exists (select 1 from public.org_members where org_members.org_id = member_groups.org_id and org_members.user_id = auth.uid()));
create policy "member_groups_insert" on public.member_groups for insert to authenticated
with check (exists (select 1 from public.org_members where org_members.org_id = member_groups.org_id and org_members.user_id = auth.uid() and org_members.user_type = 'exec'));
create policy "member_groups_update" on public.member_groups for update to authenticated
using (exists (select 1 from public.org_members where org_members.org_id = member_groups.org_id and org_members.user_id = auth.uid() and org_members.user_type = 'exec'));
create policy "member_groups_delete" on public.member_groups for delete to authenticated
using (exists (select 1 from public.org_members where org_members.org_id = member_groups.org_id and org_members.user_id = auth.uid() and org_members.user_type = 'exec'));

create policy "member_group_members_select" on public.member_group_members for select to authenticated
using (exists (select 1 from public.member_groups join public.org_members on org_members.org_id = member_groups.org_id where member_groups.id = member_group_members.group_id and org_members.user_id = auth.uid()));
create policy "member_group_members_insert" on public.member_group_members for insert to authenticated
with check (exists (select 1 from public.member_groups join public.org_members on org_members.org_id = member_groups.org_id where member_groups.id = member_group_members.group_id and org_members.user_id = auth.uid() and org_members.user_type = 'exec'));
create policy "member_group_members_delete" on public.member_group_members for delete to authenticated
using (exists (select 1 from public.member_groups join public.org_members on org_members.org_id = member_groups.org_id where member_groups.id = member_group_members.group_id and org_members.user_id = auth.uid() and org_members.user_type = 'exec'));

create index if not exists member_groups_org_id_idx on public.member_groups (org_id);
create index if not exists member_group_members_group_id_idx on public.member_group_members (group_id);
