-- TurboWatch shared backend. Run this entire file in the Supabase SQL editor.
-- The browser uses the public anon/publishable key and every write is checked by RLS.
-- Never expose a service-role key to the browser.
begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  avatar text not null default '',
  bio text not null default '' check (char_length(bio) <= 240),
  cover text not null default '',
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  media_type text not null check (media_type in ('image', 'video')),
  media_url text not null check (media_url ~ '^https?://'),
  thumbnail text not null default '' check (thumbnail = '' or thumbnail ~ '^https?://'),
  category text not null check (char_length(btrim(category)) between 1 and 60),
  tags text[] not null default '{}' check (cardinality(tags) <= 12),
  aspect text not null default 'landscape' check (aspect in ('portrait', 'landscape', 'square')),
  duration text,
  views integer not null default 0 check (views >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.reposts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.saved_posts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (char_length(btrim(text)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  description text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.board_posts (
  board_id uuid not null references public.boards(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (board_id, post_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (char_length(btrim(text)) between 1 and 2000),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create table if not exists public.message_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  peer_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, peer_id),
  check (user_id <> peer_id)
);

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_creator_idx on public.posts(creator_id);
create index if not exists comments_post_idx on public.comments(post_id, created_at);
create index if not exists post_likes_post_idx on public.post_likes(post_id);
create index if not exists follows_following_idx on public.follows(following_id);
create index if not exists messages_recipient_idx on public.messages(recipient_id, created_at);
create index if not exists messages_sender_idx on public.messages(sender_id, created_at);
create index if not exists board_posts_post_idx on public.board_posts(post_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, username)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), 'New creator'), 60),
    lower(left(regexp_replace(coalesce(new.raw_user_meta_data ->> 'name', 'creator'), '[^a-zA-Z0-9_]', '', 'g'), 10))
      || '_' || left(replace(new.id::text, '-', ''), 12)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for accounts created before this schema was applied.
insert into public.profiles (id, name, username)
select id,
  left(coalesce(nullif(btrim(raw_user_meta_data ->> 'name'), ''), 'New creator'), 60),
  lower(left(regexp_replace(coalesce(raw_user_meta_data ->> 'name', 'creator'), '[^a-zA-Z0-9_]', '', 'g'), 10))
    || '_' || left(replace(id::text, '-', ''), 12)
from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.reposts enable row level security;
alter table public.saved_posts enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.boards enable row level security;
alter table public.board_posts enable row level security;
alter table public.messages enable row level security;
alter table public.message_reads enable row level security;

revoke all on public.profiles, public.posts, public.post_likes, public.reposts,
  public.saved_posts, public.comments, public.follows, public.boards,
  public.board_posts, public.messages, public.message_reads from anon, authenticated;
grant select on public.profiles, public.posts, public.post_likes, public.reposts,
  public.comments, public.follows to anon, authenticated;
grant select on public.saved_posts, public.boards, public.board_posts,
  public.messages, public.message_reads to authenticated;
grant update (name, username, avatar, bio, cover) on public.profiles to authenticated;
grant insert, delete on public.posts, public.post_likes, public.reposts,
  public.saved_posts, public.comments, public.follows, public.boards,
  public.board_posts to authenticated;
grant insert on public.messages to authenticated;
grant insert, update on public.message_reads to authenticated;
-- Upsert is used only for the caller's saved posts and board memberships.
grant update on public.saved_posts, public.board_posts to authenticated;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (true);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select using (true);
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated
  with check (creator_id = (select auth.uid()));
drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete to authenticated
  using (creator_id = (select auth.uid()));

drop policy if exists post_likes_read on public.post_likes;
create policy post_likes_read on public.post_likes for select using (true);
drop policy if exists post_likes_insert on public.post_likes;
create policy post_likes_insert on public.post_likes for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists post_likes_delete on public.post_likes;
create policy post_likes_delete on public.post_likes for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists reposts_read on public.reposts;
create policy reposts_read on public.reposts for select using (true);
drop policy if exists reposts_insert on public.reposts;
create policy reposts_insert on public.reposts for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists reposts_delete on public.reposts;
create policy reposts_delete on public.reposts for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists saved_posts_owner on public.saved_posts;
create policy saved_posts_owner on public.saved_posts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments for select using (true);
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated
  with check (creator_id = (select auth.uid()));
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete to authenticated
  using (creator_id = (select auth.uid()));

drop policy if exists follows_read on public.follows;
create policy follows_read on public.follows for select using (true);
drop policy if exists follows_insert on public.follows;
create policy follows_insert on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()) and following_id <> (select auth.uid()));
drop policy if exists follows_delete on public.follows;
create policy follows_delete on public.follows for delete to authenticated
  using (follower_id = (select auth.uid()));

drop policy if exists boards_owner on public.boards;
create policy boards_owner on public.boards for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists board_posts_owner on public.board_posts;
create policy board_posts_owner on public.board_posts for all to authenticated
  using (exists (select 1 from public.boards b where b.id = board_id and b.user_id = (select auth.uid())))
  with check (exists (select 1 from public.boards b where b.id = board_id and b.user_id = (select auth.uid())));

-- Private messages are visible only to their sender and recipient.
-- Clients cannot forge a sender, edit message contents, or read other conversations.
drop policy if exists messages_participants_read on public.messages;
create policy messages_participants_read on public.messages for select to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));
drop policy if exists messages_sender_insert on public.messages;
create policy messages_sender_insert on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and recipient_id <> (select auth.uid()));

drop policy if exists message_reads_owner on public.message_reads;
create policy message_reads_owner on public.message_reads for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Keep save state and collection membership atomic. SECURITY INVOKER means
-- these functions retain the caller's RLS restrictions and cannot edit another
-- account's collections. ON CONFLICT also handles concurrent first saves.
create or replace function public.set_post_saved(target_post_id uuid, should_save boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  saved_board_id uuid;
begin
  if caller_id is null then raise exception 'Sign in to save a post.'; end if;
  if should_save then
    insert into public.saved_posts (user_id, post_id) values (caller_id, target_post_id)
      on conflict (user_id, post_id) do nothing;
    insert into public.boards (user_id, name) values (caller_id, 'Saved')
      on conflict (user_id, name) do nothing;
    select id into saved_board_id from public.boards where user_id = caller_id and name = 'Saved';
    insert into public.board_posts (board_id, post_id) values (saved_board_id, target_post_id)
      on conflict (board_id, post_id) do nothing;
  else
    delete from public.board_posts bp where bp.post_id = target_post_id
      and exists (select 1 from public.boards b where b.id = bp.board_id and b.user_id = caller_id);
    delete from public.saved_posts where user_id = caller_id and post_id = target_post_id;
  end if;
end;
$$;

create or replace function public.save_post_to_board(target_post_id uuid, target_board_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare caller_id uuid := auth.uid();
begin
  if caller_id is null then raise exception 'Sign in to save a post.'; end if;
  if not exists (select 1 from public.boards where id = target_board_id and user_id = caller_id) then
    raise exception 'This collection is not available.';
  end if;
  insert into public.saved_posts (user_id, post_id) values (caller_id, target_post_id)
    on conflict (user_id, post_id) do nothing;
  insert into public.board_posts (board_id, post_id) values (target_board_id, target_post_id)
    on conflict (board_id, post_id) do nothing;
end;
$$;

revoke execute on function public.set_post_saved(uuid, boolean) from public, anon;
revoke execute on function public.save_post_to_board(uuid, uuid) from public, anon;
grant execute on function public.set_post_saved(uuid, boolean) to authenticated;
grant execute on function public.save_post_to_board(uuid, uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
        'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists media_public_read on storage.objects;
create policy media_public_read on storage.objects for select
  using (bucket_id = 'media');
drop policy if exists media_owner_insert on storage.objects;
create policy media_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists media_owner_delete on storage.objects;
create policy media_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- INSERT events on messages honor participant RLS. Private collection tables
-- stay out of Realtime: DELETE events can expose composite keys despite RLS.
-- Own mutations refresh collections directly instead.
do $$
declare table_name text;
begin
  foreach table_name in array array['saved_posts', 'boards', 'board_posts', 'message_reads']
  loop
    if exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime drop table public.%I', table_name);
    end if;
  end loop;
  foreach table_name in array array['profiles', 'posts', 'post_likes', 'reposts',
    'comments', 'follows', 'messages']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;

commit;
