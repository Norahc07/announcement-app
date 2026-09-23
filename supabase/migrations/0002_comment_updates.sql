alter table public.comments
  add column if not exists updated_at timestamptz;

create policy "comments_update_own"
  on public.comments for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());
