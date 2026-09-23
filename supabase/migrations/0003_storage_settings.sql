create table public.app_settings (
  id integer primary key default 1 check (id = 1),
  last_export_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

alter table public.app_settings enable row level security;

create policy "settings_admin_select"
  on public.app_settings for select to authenticated
  using (public.is_admin());

create policy "settings_admin_update"
  on public.app_settings for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "settings_admin_insert"
  on public.app_settings for insert to authenticated
  with check (public.is_admin());
