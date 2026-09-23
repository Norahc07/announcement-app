-- Staff Board schema
-- 1. Run this in the Supabase SQL editor (or via CLI).
-- 2. Create the first user in Authentication > Users (Ma'am Lorna).
--    The first profile is automatically assigned role = admin.
-- 3. Remaining teachers/AO should be created from /admin/users.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'ao', 'teacher')),
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete restrict,
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.announcement_attachments (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint not null default 0
);

create table public.reactions (
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('like', 'heart', 'important')),
  primary key (announcement_id, user_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.folders (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references public.folders (id) on delete cascade,
  name text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint not null default 0,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index announcements_feed_idx on public.announcements (pinned desc, created_at desc);
create index comments_announcement_idx on public.comments (announcement_id, created_at);
create index reactions_announcement_idx on public.reactions (announcement_id);
create index events_starts_idx on public.events (starts_at);
create index folders_parent_idx on public.folders (parent_id);
create index files_folder_idx on public.files (folder_id);

-- ---------------------------------------------------------------------------
-- Helpers (security definer to avoid RLS recursion)
-- ---------------------------------------------------------------------------

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'ao')
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

grant execute on function public.current_role() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Keep announcement.updated_at current
create or replace function public.touch_announcement()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger announcements_touch
before update on public.announcements
for each row execute function public.touch_announcement();

-- First auth user becomes admin; later users default to teacher unless metadata sets a role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_must boolean;
begin
  v_role := coalesce(
    new.raw_user_meta_data->>'role',
    case when exists (select 1 from public.profiles) then 'teacher' else 'admin' end
  );

  if v_role not in ('admin', 'ao', 'teacher') then
    v_role := 'teacher';
  end if;

  v_must := coalesce(
    (new.raw_user_meta_data->>'must_change_password')::boolean,
    exists (select 1 from public.profiles)
  );

  insert into public.profiles (id, full_name, email, role, must_change_password)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    v_role,
    v_must
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Only admin can change another person's role
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only the admin can change roles';
  end if;
  if new.email is distinct from old.email and not public.is_admin() then
    raise exception 'Only the admin can change emails';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
before update on public.profiles
for each row execute function public.protect_profile_role();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_attachments enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;
alter table public.events enable row level security;
alter table public.folders enable row level security;
alter table public.files enable row level security;

create policy "profiles_select_authenticated"
  on public.profiles for select to authenticated
  using (true);

create policy "profiles_update_self_or_admin"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy "announcements_select"
  on public.announcements for select to authenticated
  using (true);

create policy "announcements_staff_insert"
  on public.announcements for insert to authenticated
  with check (public.is_staff() and author_id = auth.uid());

create policy "announcements_staff_update"
  on public.announcements for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "announcements_staff_delete"
  on public.announcements for delete to authenticated
  using (public.is_staff());

create policy "attachments_select"
  on public.announcement_attachments for select to authenticated
  using (true);

create policy "attachments_staff_write"
  on public.announcement_attachments for insert to authenticated
  with check (public.is_staff());

create policy "attachments_staff_delete"
  on public.announcement_attachments for delete to authenticated
  using (public.is_staff());

create policy "reactions_select"
  on public.reactions for select to authenticated
  using (true);

create policy "reactions_own_write"
  on public.reactions for insert to authenticated
  with check (user_id = auth.uid());

create policy "reactions_own_update"
  on public.reactions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "reactions_own_delete"
  on public.reactions for delete to authenticated
  using (user_id = auth.uid());

create policy "comments_select"
  on public.comments for select to authenticated
  using (true);

create policy "comments_insert"
  on public.comments for insert to authenticated
  with check (author_id = auth.uid());

create policy "comments_delete_own_or_staff"
  on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.is_staff());

create policy "events_select"
  on public.events for select to authenticated
  using (true);

create policy "events_staff_insert"
  on public.events for insert to authenticated
  with check (public.is_staff() and created_by = auth.uid());

create policy "events_staff_update"
  on public.events for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "events_staff_delete"
  on public.events for delete to authenticated
  using (public.is_staff());

create policy "folders_select"
  on public.folders for select to authenticated
  using (true);

create policy "folders_staff_insert"
  on public.folders for insert to authenticated
  with check (public.is_staff() and created_by = auth.uid());

create policy "folders_staff_update"
  on public.folders for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "folders_staff_delete"
  on public.folders for delete to authenticated
  using (public.is_staff());

create policy "files_select"
  on public.files for select to authenticated
  using (true);

create policy "files_staff_insert"
  on public.files for insert to authenticated
  with check (public.is_staff() and uploaded_by = auth.uid());

create policy "files_staff_update"
  on public.files for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "files_staff_delete"
  on public.files for delete to authenticated
  using (public.is_staff());

-- ---------------------------------------------------------------------------
-- Storage: teachers can download, only staff can upload/replace/delete
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('announcement-attachments', 'announcement-attachments', false, 10485760),
  ('drive-files', 'drive-files', false, 26214400)
on conflict (id) do nothing;

create policy "announcement_attachments_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'announcement-attachments');

create policy "announcement_attachments_staff_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'announcement-attachments' and public.is_staff());

create policy "announcement_attachments_staff_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'announcement-attachments' and public.is_staff())
  with check (bucket_id = 'announcement-attachments' and public.is_staff());

create policy "announcement_attachments_staff_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'announcement-attachments' and public.is_staff());

create policy "drive_files_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'drive-files');

create policy "drive_files_staff_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'drive-files' and public.is_staff());

create policy "drive_files_staff_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'drive-files' and public.is_staff())
  with check (bucket_id = 'drive-files' and public.is_staff());

create policy "drive_files_staff_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'drive-files' and public.is_staff());
