-- Read-only installation check. Run in the intended Supabase project's SQL
-- editor before applying setup. These queries do not return account content,
-- credentials, messages, or posts, and do not change schema or access rules.

select required.table_name,
       to_regclass('public.' || required.table_name) is not null as installed,
       coalesce(c.relrowsecurity, false) as row_level_security
from unnest(array[
  'profiles', 'posts', 'post_likes', 'reposts', 'saved_posts', 'comments',
  'follows', 'boards', 'board_posts', 'messages', 'message_reads'
]) as required(table_name)
left join pg_class c on c.oid = to_regclass('public.' || required.table_name)
order by required.table_name;

select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name in ('profiles', 'posts', 'messages')
order by table_name, ordinal_position;

select tgname as signup_trigger, pg_get_triggerdef(oid) as definition
from pg_trigger
where tgrelid = 'auth.users'::regclass
  and not tgisinternal and tgname = 'on_auth_user_created';

select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename in (
  'profiles', 'posts', 'post_likes', 'reposts', 'saved_posts', 'comments',
  'follows', 'boards', 'board_posts', 'messages', 'message_reads'
)
order by tablename, policyname;

select tablename
from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
order by tablename;

select id, public, file_size_limit
from storage.buckets where id = 'media';
