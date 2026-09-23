alter table public.reactions
  drop constraint if exists reactions_type_check;

alter table public.reactions
  add constraint reactions_type_check
  check (type in ('like', 'heart', 'wow', 'haha', 'angry', 'important'));
